// MeteredPay — seller attestation audit (post-submission council, 14 Nov 2026).
// Read-only RPC views; no keys, no transactions.
//
//   node seller-api/seller-audit.mjs
//     [--log seller-api/attestations.jsonl] [--seed seller-api/attestations-seed.jsonl]
//     [--check <buyer>.testnet:<call_id> ...] [--contract apathetic-party.testnet]
//     [--seller tedious-sea.testnet]
//
// Reads the retained success attestations (the runtime log and/or the
// committed seed) and, for each one, (a) VERIFIES the seller signature
// with ed25519 against the seller's on-chain access key(s) (fetched
// read-only via view_access_key_list — the key is what the contract
// registered, so a signature that checks out here is the seller's own),
// and (b) queries get_call on-chain. Three outcomes per attestation:
//
//   VERIFIED   — the signature checks out against an on-chain seller
//                key. Only a VERIFIED attestation can contradict the
//                on-chain record.
//   UNVERIFIED — the signature does NOT check out (wrong/rotated key,
//                or no signature retained). Reported as such, NEVER as
//                a MISMATCH: an unverified attestation proves nothing.
//   MISMATCH   — a VERIFIED retained success attestation contradicts
//                the on-chain record (call resolved failed-refunded /
//                timeout-refunded, or a different response hash) —
//                i.e. the buyer claimed failure after a genuine
//                success (see DISHONEST_BUYER_DEMO.md). The audit
//                DETECTS dishonesty; it does not prevent it.
//   CLEAN      — no contradiction (verified success matches on-chain,
//                or a refunded call with no retained attestation).
//
// --check <buyer>:<call_id> checks a specific call against the
// retained attestations: a refunded call with NO retained success
// attestation is CLEAN (no contradiction — a genuine failure looks
// exactly like this on-chain). Exit 0 when everything is clean (an
// UNVERIFIED attestation alone does not fail the audit — it is
// reported, not counted as a mismatch), 1 when any MISMATCH is
// found, 2 on usage/RPC error.
//
// Seed provenance note: DISHONEST_BUYER_DEMO.md lists the
// dishonest-001 response_hash and seller_signature but NO timestamp;
// the seed's timestamp (2026-11-08T09:17:06.536Z) is the time of the
// seller-attestation-verified step in the canonical run log
// buyer/runs/dishonest-mp-dishonest-wdvw4o.testnet-2026-11-08T09-16-24.jsonl.
// That seed attestation was verified live against tedious-sea.testnet's
// on-chain key (ed25519:6zG7yLp2jqHxfkXfYgsL1ZXSf2NVQoRRaib6im72ubnm)
// on 14 Nov 2026: signature VALID.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ed25519Verify } from '../shared/ed25519.mjs';
import { sellerAttestationMessage } from '../shared/canonical.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const multi = (name) => {
  const out = [];
  for (let i = 0; i < argv.length; i++) if (argv[i] === '--' + name && argv[i + 1]) out.push(argv[i + 1]);
  return out;
};
const CONTRACT = opt('contract', process.env.CONTRACT_ID || 'apathetic-party.testnet');
const SELLER = opt('seller', process.env.SELLER_ACCOUNT_ID || 'tedious-sea.testnet');
const RPC_URL = process.env.RPC_URL || 'https://rpc.testnet.near.org';
const LOG = opt('log', join(HERE, 'attestations.jsonl'));
const SEED = opt('seed', join(HERE, 'attestations-seed.jsonl'));
const CHECKS = multi('check');

function readAttestations(path, label) {
  if (!existsSync(path)) { console.log(`Note: ${label} not found at ${path} — skipping.`); return []; }
  const rows = [];
  for (const [n, line] of readFileSync(path, 'utf8').split('\n').entries()) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); }
    catch { console.error(`WARNING: ${label} line ${n + 1} is not valid JSON — skipped.`); }
  }
  console.log(`${label}: ${rows.length} attestation(s) from ${path}`);
  return rows;
}

async function rpcView(method, args) {
  const body = JSON.stringify({
    jsonrpc: '2.0', id: 'meteredpay-seller-audit', method: 'query',
    params: {
      request_type: 'call_function', account_id: CONTRACT,
      method_name: method, args_base64: Buffer.from(JSON.stringify(args), 'utf8').toString('base64'),
      finality: 'final',
    },
  });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(RPC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(60_000) });
      const j = await res.json();
      if (!j.result || !j.result.result) throw new Error('RPC view returned no result: ' + JSON.stringify(j).slice(0, 200));
      return JSON.parse(Buffer.from(j.result.result).toString('utf8'));
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

async function rpcViewAccessKeyList(accountId) {
  const body = JSON.stringify({
    jsonrpc: '2.0', id: 'meteredpay-seller-audit-keys', method: 'query',
    params: { request_type: 'view_access_key_list', account_id: accountId, finality: 'final' },
  });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(RPC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(60_000) });
      const j = await res.json();
      if (!j.result || !Array.isArray(j.result.keys)) throw new Error('RPC view_access_key_list returned no keys: ' + JSON.stringify(j).slice(0, 200));
      return j.result.keys.map((k) => k.public_key).filter(Boolean);
    } catch (e) {
      if (attempt === 3) throw e;
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

// Verify one retained attestation against the seller's on-chain keys.
// Returns { verified: true, key } or { verified: false, reason }.
function verifyAttestation(att, sellerKeys) {
  if (!att || typeof att.response_hash !== 'string' || typeof att.seller_signature !== 'string') {
    return { verified: false, reason: 'no seller_signature/response_hash retained' };
  }
  const message = sellerAttestationMessage(att.call_id, att.response_hash);
  for (const key of sellerKeys) {
    try {
      if (ed25519Verify(key, message, att.seller_signature)) return { verified: true, key };
    } catch {
      // Bad key/signature encoding — try the next key, if any.
    }
  }
  return { verified: false, reason: `signature does not verify against any on-chain key of ${SELLER}` };
}

const ex = (buyer) => `https://testnet.nearblocks.io/address/${buyer}`;
const REFUNDED = new Set(['failed-refunded', 'timeout-refunded']);

const attestations = [
  ...readAttestations(SEED, 'seed'),
  ...readAttestations(LOG, 'attestation log'),
];
const byKey = new Map(attestations.map((a) => [`${a.buyer}:${a.call_id}`, a]));

const targets = new Map(); // "buyer:call_id" -> attestation-or-null
for (const a of attestations) targets.set(`${a.buyer}:${a.call_id}`, a);
for (const c of CHECKS) {
  const i = c.indexOf(':');
  if (i <= 0) { console.error(`--check needs <buyer>.testnet:<call_id>, got '${c}'.`); process.exit(2); }
  const key = c;
  if (!targets.has(key)) targets.set(key, null);
}

let sellerKeys;
try {
  sellerKeys = await rpcViewAccessKeyList(SELLER);
} catch (e) {
  console.error(`RPC-ERROR: could not fetch on-chain access keys for seller ${SELLER}: ${e.message}`);
  console.error('Without the seller key the audit cannot verify any signature — refusing to report MISMATCH/CLEAN on unverified attestations.');
  process.exit(2);
}
if (sellerKeys.length === 0) {
  console.error(`RPC-ERROR: seller ${SELLER} has no on-chain access keys — nothing to verify signatures against.`);
  process.exit(2);
}
console.log(`Seller ${SELLER}: ${sellerKeys.length} on-chain access key(s): ${sellerKeys.join(', ')}`);

let mismatches = 0;
let clean = 0;
let unverified = 0;
for (const [key, att] of targets) {
  const [buyer, callId] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
  // Signature verification comes first: only a VERIFIED attestation
  // can contradict the on-chain record. An UNVERIFIED attestation is
  // reported as such and never counted as a MISMATCH.
  const ver = att ? verifyAttestation(att, sellerKeys) : null;
  let onchain;
  try {
    onchain = await rpcView('get_call', { buyer_account_id: buyer, call_id: callId });
  } catch (e) {
    console.error(`RPC-ERROR  call_id=${callId} buyer=${buyer}: ${e.message}`);
    process.exit(2);
  }
  if (!onchain) {
    if (att && ver.verified) {
      mismatches++;
      console.log(`MISMATCH  call_id=${callId} buyer=${buyer} signature=VERIFIED (no on-chain record; retained verified attestation exists) ${ex(buyer)}`);
    } else if (att) {
      unverified++;
      console.log(`UNVERIFIED  call_id=${callId} buyer=${buyer} (${ver.reason}; no on-chain record) — not counted as MISMATCH ${ex(buyer)}`);
    } else {
      clean++;
      console.log(`NOT-FOUND  call_id=${callId} buyer=${buyer} (no on-chain record; retained attestation absent) ${ex(buyer)}`);
    }
    continue;
  }
  const status = onchain.status;
  if (att && !ver.verified) {
    unverified++;
    console.log(`UNVERIFIED  call_id=${callId} buyer=${buyer} retained_attestation_hash=${att.response_hash} on_chain_status=${status} (${ver.reason}) — signature does not check out, so this is NOT a MISMATCH ${ex(buyer)}`);
  } else if (att && REFUNDED.has(status)) {
    mismatches++;
    console.log(`MISMATCH  call_id=${callId} buyer=${buyer} signature=VERIFIED retained_attestation_hash=${att.response_hash} on_chain_status=${status} ${ex(buyer)}`);
    console.log(`          Seller served a genuine signed success, but the call resolved ${status} on-chain (buyer claimed failure/timeout).`);
  } else if (att && status === 'success-deducted' && onchain.response_hash && onchain.response_hash !== att.response_hash) {
    mismatches++;
    console.log(`MISMATCH  call_id=${callId} buyer=${buyer} signature=VERIFIED retained_attestation_hash=${att.response_hash} on_chain_status=${status} on_chain_response_hash=${onchain.response_hash} ${ex(buyer)}`);
  } else if (att && status === 'success-deducted') {
    clean++;
    console.log(`CLEAN  call_id=${callId} buyer=${buyer} signature=VERIFIED on_chain_status=${status} (retained attestation matches the on-chain success) ${ex(buyer)}`);
  } else if (!att && REFUNDED.has(status)) {
    clean++;
    console.log(`CLEAN  call_id=${callId} buyer=${buyer} on_chain_status=${status} (no retained success attestation — no contradiction) ${ex(buyer)}`);
  } else {
    clean++;
    console.log(`CLEAN  call_id=${callId} buyer=${buyer} on_chain_status=${status} ${ex(buyer)}`);
  }
}

console.log(`\nAudit summary: ${mismatches} MISMATCH(es), ${clean} clean, ${unverified} UNVERIFIED, ${targets.size} call(s) checked on ${CONTRACT} (seller ${SELLER}).`);
if (unverified > 0) {
  console.log('UNVERIFIED means a retained attestation signature did not check out against the seller\'s on-chain key — it proves nothing either way and was NOT counted as a MISMATCH. Check for a rotated seller key (--seller <account>) or a corrupted log line.');
}
if (mismatches > 0) {
  console.log('MISMATCH means a VERIFIED retained seller success attestation contradicts the on-chain record — detectable buyer dishonesty (see DISHONEST_BUYER_DEMO.md). Consider adding the buyer to seller-api/blocked-buyers.json.');
  process.exit(1);
}
console.log('No contradiction between retained VERIFIED attestations and the on-chain record.');
process.exit(0);
