// MeteredPay — third-party seller DRY RUN (days 6-7).
//
// An INDEPENDENT implementation written from SELLER_SPEC.md alone.
// It does NOT copy ../seller-api/server.mjs. It reuses only the
// spec-referenced shared helpers (canonical hash + ed25519), as the
// spec permits. Service: "dryrun-reverse" — word count + reversed
// excerpt. Failure is INPUT-driven (text starting "FAIL:"), never a
// scenario field: a real seller ignores scenario.
//
// REGISTRATION TRUTH: the frozen contract registers exactly one seller
// (tedious-sea.testnet) at init. This seller's key is NOT registered.
// Spec-literal behaviour: REFUSE TO START unless the dry-run-only
// override DRYRUN_ALLOW_UNREGISTERED_KEY=1 is set. With the override
// the seller serves well-formed responses, but no success claim made
// from them can ever deduct on the frozen contract — the contract
// rejects it with "Invalid seller signature". That refusal IS the
// dry-run evidence. Nothing here fakes a paid third-party sale.
//
// Keys: fresh ed25519 keypair, generated on first start, stored OUTSIDE
// the repo (default ~/.meteredpay-dryrun-seller-key.json). Never
// printed, never committed. Run: node server.mjs (see README.md).
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { successBody, errorBody, responseHash, sellerAttestationMessage, sellerErrorMessage } from '../shared/canonical.mjs';
import { ed25519Sign, ed25519Verify, loadTestnetKey } from '../shared/ed25519.mjs';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8788);
const CONTRACT_ID = process.env.CONTRACT_ID || 'apathetic-party.testnet';
const SELLER_ACCOUNT_ID = process.env.SELLER_ACCOUNT_ID || 'dryrun-seller.testnet';
const RPC_URL = process.env.RPC_URL || 'https://rpc.testnet.fastnear.com';
const PRICE_YOCTO = '100000000000000000000000'; // 0.1 testnet NEAR (frozen contract price)
const KEY_PATH = process.env.DRYRUN_SELLER_KEY_PATH || join(homedir(), '.meteredpay-dryrun-seller-key.json');
const ALLOW_UNREGISTERED = process.env.DRYRUN_ALLOW_UNREGISTERED_KEY === '1';

// --- keypair (generated once, stored outside the repo) -----------------
// Stored in the legacy NEAR credential shape ({account_id, public_key,
// private_key}) so the shared loadTestnetKey loader can read it.
import { KeyPair } from 'near-api-js';
function loadOrCreateKey() {
  if (existsSync(KEY_PATH)) return loadTestnetKey(SELLER_ACCOUNT_ID, KEY_PATH);
  const kp = KeyPair.fromRandom('ed25519');
  writeFileSync(KEY_PATH, JSON.stringify({ account_id: SELLER_ACCOUNT_ID, public_key: kp.getPublicKey().toString(), private_key: kp.toString() }, null, 2) + '\n', { mode: 0o600 });
  console.log('[dryrun] generated fresh seller keypair (public key ' + kp.getPublicKey().toString() + '), stored at ' + KEY_PATH);
  return loadTestnetKey(SELLER_ACCOUNT_ID, KEY_PATH);
}
const key = loadOrCreateKey();
const seedBytes = key.seedBytes;
const publicKey = key.publicKey;

// --- contract confirmation (read-only view) ----------------------------
async function rpcView(method, args) {
  const body = JSON.stringify({
    jsonrpc: '2.0', id: 'meteredpay-dryrun', method: 'query',
    params: {
      request_type: 'call_function', account_id: CONTRACT_ID,
      method_name: method, args_base64: Buffer.from(JSON.stringify(args), 'utf8').toString('base64'),
      finality: 'final',
    },
  });
  const res = await fetch(RPC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(30000) });
  const j = await res.json();
  if (!j.result || !j.result.result) throw new Error('RPC view returned no result');
  return JSON.parse(Buffer.from(j.result.result).toString('utf8'));
}
const seller = await rpcView('get_seller', {});
if (seller.price_per_call !== PRICE_YOCTO) throw new Error('Contract price ' + seller.price_per_call + ' != dry-run price ' + PRICE_YOCTO + ' — refusing to start.');
if (seller.seller_public_key !== publicKey) {
  const msg = 'Credential key ' + publicKey + ' differs from the key registered on-chain (' + seller.seller_public_key + '). This seller cannot be paid by the frozen contract.';
  if (!ALLOW_UNREGISTERED) {
    console.error('[dryrun] REFUSING TO START: ' + msg);
    console.error('[dryrun] This is the spec-literal startup rule (SELLER_SPEC.md Appendix A3).');
    console.error('[dryrun] To run the shape-only dry run, set DRYRUN_ALLOW_UNREGISTERED_KEY=1.');
    process.exit(3);
  }
  console.log('[dryrun] WARNING (dry-run-only override): ' + msg);
  console.log('[dryrun] Serving well-formed responses anyway. No success claim from this seller can deduct on the frozen contract.');
} else {
  console.log('[dryrun] contract confirmed: this key IS registered on-chain.');
}
console.log('[dryrun] signing as ' + SELLER_ACCOUNT_ID + ' (' + publicKey + ') — NOT the registered seller');

// --- service: reverse + word count --------------------------------------
function reverseService(text) {
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  return {
    service: 'dryrun-reverse',
    input_text: text,
    word_count: words,
    char_count: [...text].length,
    reversed_excerpt: [...text].reverse().join('').slice(0, 140),
  };
}
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size > 65536) { reject(new Error('Body too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + req.headers.host);
  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, { status: 'ok', seller_account_id: SELLER_ACCOUNT_ID, price_per_call_yocto: PRICE_YOCTO, service: 'dryrun-reverse', mode: 'demonstrator' });
  }
  if (req.method !== 'POST' || url.pathname !== '/call') {
    return sendJson(res, 404, { status: 'failed', error_code: 'NOT_FOUND', error_message: 'Unknown endpoint. See SELLER_SPEC.md.' });
  }
  let body;
  try { body = JSON.parse(await readBody(req)); } catch {
    return sendJson(res, 400, { status: 'failed', error_code: 'BAD_REQUEST', error_message: 'Request body must be JSON.' });
  }
  const { call_id, buyer_account_id, input } = body || {};
  if (typeof call_id !== 'string' || call_id === '' || typeof buyer_account_id !== 'string' || buyer_account_id === '') {
    return sendJson(res, 400, { status: 'failed', error_code: 'BAD_REQUEST', error_message: 'call_id and buyer_account_id are required strings.' });
  }
  if (!input || typeof input.text !== 'string' || input.text.length > 5000) {
    return sendJson(res, 400, { status: 'failed', error_code: 'BAD_REQUEST', error_message: 'input.text is required (string, max 5000 chars).' });
  }
  console.log('[dryrun] /call call_id=' + call_id + ' buyer=' + buyer_account_id);
  if (input.text.startsWith('FAIL:')) {
    const err = errorBody({ callId: call_id, errorCode: 'DRYRUN_SELLER_ERROR', errorMessage: 'Dry-run seller failed this call (input started with FAIL:).', sellerAccountId: SELLER_ACCOUNT_ID, priceYocto: PRICE_YOCTO });
    const hash = responseHash(err);
    const sig = ed25519Sign(seedBytes, sellerErrorMessage(call_id, hash));
    return sendJson(res, 200, { call_id, status: 'failed', error_code: err.error_code, error_message: err.error_message, response_hash: hash, seller_signature: sig, seller_account_id: SELLER_ACCOUNT_ID, price_per_call_yocto: PRICE_YOCTO });
  }
  const output = reverseService(input.text);
  const canonical = successBody({ callId: call_id, output, sellerAccountId: SELLER_ACCOUNT_ID, priceYocto: PRICE_YOCTO });
  const hash = responseHash(canonical);
  const sig = ed25519Sign(seedBytes, sellerAttestationMessage(call_id, hash));
  return sendJson(res, 200, { call_id, status: 'success', output, response_hash: hash, seller_signature: sig, seller_account_id: SELLER_ACCOUNT_ID, price_per_call_yocto: PRICE_YOCTO });
});
server.listen(PORT, HOST, () => {
  console.log('[dryrun] MeteredPay dry-run seller listening on http://' + HOST + ':' + PORT + ' (testnet only, contract ' + CONTRACT_ID + ')');
});
