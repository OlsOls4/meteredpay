// MeteredPay — A2 worked-vector self-check (SELLER_SPEC.md Appendix A2).
//
// Verifies YOUR canonicalisation + signature verification against the
// spec's worked examples before you test live:
//   example-001 — success (quote "hello"): recompute response_hash
//     from the canonical body, verify the seller attestation against
//     the seller key registered on-chain.
//   example-003 — failure (quote document {"text": 42}):
//     recompute the error response_hash, verify the seller ERROR
//     attestation — and check the trap: the same signature must FAIL
//     against the SUCCESS message format (one field, two formats).
//
// Usage:
//   node check-vectors.mjs [--contract apathetic-party.testnet]
//                          [--api http://127.0.0.1:8787]
// Without --api: static vector checks only. With --api: also POSTs
// the two example requests to a running local seller and compares
// its response_hash + seller_signature to the spec vectors.
// Exit 0 only if every check passes. No keys are read or printed;
// the seller public key comes from the contract's get_seller view
// (RPC), with the repo-recorded key as fallback if the RPC is down.
//
// Testnet only. No transaction is sent.
import { responseHash, canonicalStringify, sellerAttestationMessage, sellerErrorMessage } from '../shared/canonical.mjs';
import { ed25519Verify } from '../shared/ed25519.mjs';

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const CONTRACT = opt('contract', 'apathetic-party.testnet');
const API = opt('api', null);
const RPC_URL = process.env.RPC_URL || 'https://rpc.testnet.near.org';
// Repo-recorded registered seller key (SELLER_SPEC.md / MULTI_SELLER_RUNBOOK.md).
// Used ONLY as a fallback if the RPC cannot be reached; the RPC value wins.
const KNOWN_SELLER_KEY = 'ed25519:6zG7yLp2jqHxfkXfYgsL1ZXSf2NVQoRRaib6im72ubnm';

// --- Spec vectors (SELLER_SPEC.md Appendix A2, verbatim) --------------------
const EX001_BODY = '{"call_id":"example-001","output":{"char_count":5,"errors":[],"excerpt":"hello","input_sha256":"3935cabae82f6d46515380701ce5b14dd960d89cbff179777fab791f67d7e683","schema":"quote","service":"meteredpay-schema-validate","valid":true,"word_count":1},"price_per_call_yocto":"100000000000000000000000","seller_account_id":"tedious-sea.testnet","status":"success"}';
const EX001_HASH = '2635b45d484208aa7c46bd921c94904fc95244a510dd966f27f9ae3c27685841';
const EX001_SIG = 'u8tIAgDZZejCwGK30Wu5rOZwjYokBoqWAd4oPy0BhtTvaY31aKMecIeutbpMyYhaKgTKhUwJ/GBu0FKO2msSCw==';
const EX003_BODY = '{"call_id":"example-003","error_code":"VALIDATION_FAILED","error_message":"Document failed schema \'quote\': 1 error(s) — text: required: document.text must be a string","price_per_call_yocto":"100000000000000000000000","seller_account_id":"tedious-sea.testnet","status":"failed"}';
const EX003_HASH = '54008fe79a248051b22b5518ac267494af0abc7befd8a5ed8edcd0c4f06e1ec0';
const EX003_SIG = 'wO1LwfN6unc0Oqlb/pq1S+qVAMaVcn7kLEssY+CQ7vTvh0ZMP/HnRfVKmGN/WhtX2fwWxVK/6Qu6XMuSC1erAA==';

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
}

// --- Registered seller key (on-chain wins) ----------------------------------
let sellerKey = KNOWN_SELLER_KEY;
let keySource = 'repo-recorded fallback';
try {
  const res = await fetch(RPC_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'k', method: 'query', params: { request_type: 'call_function', account_id: CONTRACT, method_name: 'get_seller', args_base64: Buffer.from('{}').toString('base64'), finality: 'final' } }),
    signal: AbortSignal.timeout(15000),
  });
  const j = await res.json();
  const seller = JSON.parse(Buffer.from(j.result.result).toString('utf8'));
  if (seller.seller_public_key) { sellerKey = seller.seller_public_key; keySource = `on-chain get_seller (${CONTRACT})`; }
} catch (e) {
  console.log(`NOTE: RPC unreachable (${String(e.message).slice(0, 80)}) — using repo-recorded seller key as fallback.`);
}
console.log(`Seller key (${keySource}): ${sellerKey}`);
if (sellerKey !== KNOWN_SELLER_KEY) console.log(`NOTE: on-chain key differs from the repo-recorded key — vectors below are for the frozen contract's registered seller; they will FAIL against a different seller, as they should.`);

// --- Static vector checks ----------------------------------------------------
const h1 = responseHash(JSON.parse(EX001_BODY));
check('example-001 response_hash recomputes', h1 === EX001_HASH, `recomputed ${h1}`);
check('example-001 canonical body is already canonical', canonicalStringify(JSON.parse(EX001_BODY)) === EX001_BODY);
check('example-001 seller attestation verifies', ed25519Verify(sellerKey, sellerAttestationMessage('example-001', EX001_HASH), EX001_SIG));
check('example-001 signature does NOT verify as an error attestation', !ed25519Verify(sellerKey, sellerErrorMessage('example-001', EX001_HASH), EX001_SIG));

const h3 = responseHash(JSON.parse(EX003_BODY));
check('example-003 response_hash recomputes', h3 === EX003_HASH, `recomputed ${h3}`);
check('example-003 canonical body is already canonical', canonicalStringify(JSON.parse(EX003_BODY)) === EX003_BODY);
check('example-003 seller ERROR attestation verifies', ed25519Verify(sellerKey, sellerErrorMessage('example-003', EX003_HASH), EX003_SIG));
check('example-003 signature does NOT verify as a success attestation (the trap)', !ed25519Verify(sellerKey, sellerAttestationMessage('example-003', EX003_HASH), EX003_SIG));

// --- Optional live check against a running local seller -----------------------
if (API) {
  console.log(`Live check against seller API ${API} …`);
  try {
    const post = async (body) => (await fetch(API + '/call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) })).json();
    const r1 = await post({ call_id: 'example-001', buyer_account_id: 'example-buyer.testnet', input: { schema: 'quote', document: { text: 'hello' } }, scenario: 'success' });
    check('live example-001 response_hash matches spec', r1.response_hash === EX001_HASH, `got ${r1.response_hash}`);
    check('live example-001 seller_signature matches spec', r1.seller_signature === EX001_SIG);
    const r3 = await post({ call_id: 'example-003', buyer_account_id: 'example-buyer.testnet', input: { schema: 'quote', document: { text: 42 } }, scenario: 'success' });
    check('live example-003 is a failure, never a paid success', r3.status === 'failed' && r3.error_code === 'VALIDATION_FAILED');
    check('live example-003 response_hash matches spec', r3.response_hash === EX003_HASH, `got ${r3.response_hash}`);
    check('live example-003 seller_signature matches spec', r3.seller_signature === EX003_SIG);
  } catch (e) {
    check(`live seller reachable at ${API}`, false, String(e.message).slice(0, 120));
  }
} else {
  console.log('Skipping live check (no --api given). Run with --api http://127.0.0.1:8787 once your seller is up.');
}

if (failures === 0) { console.log('\nCHECK-VECTORS OK: all checks passed. Your canonicalisation and signature verification match the spec — safe to test live.'); process.exit(0); }
console.log(`\nCHECK-VECTORS FAILED: ${failures} check(s) failed. Do NOT test live until they pass — a mismatch here becomes an on-chain "Invalid seller signature" rejection with no further diagnosis (see SELLER_SPEC.md, "Common mistakes").`);
process.exit(1);
