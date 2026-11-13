// MeteredPay — demonstrator seller API (days 8-9).
//
// A deterministic, single-price, single-service demonstrator seller.
// It is NOT a marketplace and NOT a live service with independent
// sellers. It serves one service ("meteredpay-schema-validate": a
// deterministic JSON schema-validation service) in three
// demonstrator-only modes:
//
//   scenario "success" (default): HTTP 200, status "success" — the
//     document validated against a fixed built-in schema.
//   scenario "fail":                HTTP 200, status "failed", with a
//                                   seller-signed error attestation.
//   scenario "timeout":             no response for 40 s (the buyer
//                                   waits 30 s, then claims timeout).
//
// POST /call input is { schema, document }: `schema` names one of the
// fixed built-in schemas (quote, payment-instruction, invoice — see
// SCHEMAS below and SELLER_SPEC.md); `document` is the JSON document
// to validate. The output is valid/invalid + an error list (field +
// reason per error) + the SHA-256 of the canonical input. Pure, no
// dependencies, no network calls, deterministic: the same document
// always validates the same way.
//
// A document that FAILS validation is a seller failure, not a paid
// success: the seller returns status "failed", error_code
// VALIDATION_FAILED, with the full error list and a seller-signed
// error attestation; the buyer submits a failure claim with that
// evidence and the held amount is released, never deducted. A
// validation that passes is a successful service call and its output
// (valid + the schema result) is what the buyer pays for.
//
// The seller NEVER calls the contract and can NEVER mark its own calls
// successful: deduction needs the buyer's payer-signed receipt, and
// the seller signature below is only an attestation ("I served this
// response for this call"). See ../prep/04-architecture.md §3 and
// SELLER_SPEC.md for the open spec a third party would implement.
//
// Response-hash rule (prep/04 §3.2, frozen): response_hash is the hex
// SHA-256 of the canonical body (keys sorted, no whitespace) containing
// call_id, status, output (or error_code/error_message), seller_account_id
// and price_per_call_yocto. The hash and signature are NOT part of the
// hashed body. The buyer recomputes the hash before signing anything.
//
// Keys: the seller signing key is read at startup from the NEAR
// credential file (env SELLER_KEY_PATH, default
// ~/.near-credentials/testnet/tedious-sea.testnet.json) and is never
// printed, logged, or written anywhere. Price/seller are confirmed
// against the frozen testnet contract at startup via a read-only RPC
// view; if the RPC is unreachable, env PRICE_YOCTO (default = the
// frozen 0.1 testnet NEAR) is used and the startup log says so.
//
// Run:  node server.mjs            (listens on 127.0.0.1:8787)
// Env:  PORT, HOST, SELLER_ACCOUNT_ID, SELLER_KEY_PATH, SELLER_KEY_JSON,
//       CONTRACT_ID, PRICE_YOCTO, RPC_URL. No dependencies; Node >= 18.
//       SELLER_KEY_JSON (hosted mode, e.g. a Render env var) holds the
//       whole credential-file JSON; see the key-loading code below.
//       On Render set HOST=0.0.0.0 (PORT comes from Render's $PORT).
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalStringify, successBody, errorBody, responseHash, sellerAttestationMessage, sellerErrorMessage } from '../shared/canonical.mjs';
import { ed25519Sign, loadTestnetKey } from '../shared/ed25519.mjs';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8787);
const CONTRACT_ID = process.env.CONTRACT_ID || 'apathetic-party.testnet';
const SELLER_ACCOUNT_ID = process.env.SELLER_ACCOUNT_ID || 'tedious-sea.testnet';
const RPC_URL = process.env.RPC_URL || 'https://rpc.testnet.near.org';
const FROZEN_PRICE_YOCTO = '100000000000000000000000'; // 0.1 testnet NEAR
const BUYER_WAIT_MS = 30_000; // prep/04 §3.4 / glossary §7; timeout mode waits 40 s
const TIMEOUT_DELAY_MS = 40_000;

// --- contract confirmation (read-only view, retry once) -------------------
async function rpcView(method, args) {
  const body = JSON.stringify({
    jsonrpc: '2.0', id: 'meteredpay-seller', method: 'query',
    params: {
      request_type: 'call_function', account_id: CONTRACT_ID,
      method_name: method, args_base64: Buffer.from(JSON.stringify(args), 'utf8').toString('base64'),
      finality: 'final',
    },
  });
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(RPC_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(60_000) });
      const j = await res.json();
      if (!j.result || !j.result.result) throw new Error('RPC view returned no result: ' + JSON.stringify(j).slice(0, 200));
      return JSON.parse(Buffer.from(j.result.result).toString('utf8'));
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

let priceYocto = process.env.PRICE_YOCTO || FROZEN_PRICE_YOCTO;
let sellerPublicKey = null;
try {
  const seller = await rpcView('get_seller', {});
  if (seller.seller_account_id !== SELLER_ACCOUNT_ID) throw new Error(`Contract seller ${seller.seller_account_id} != ${SELLER_ACCOUNT_ID}`);
  if (process.env.PRICE_YOCTO && process.env.PRICE_YOCTO !== seller.price_per_call) throw new Error(`PRICE_YOCTO env ${process.env.PRICE_YOCTO} != contract price ${seller.price_per_call}`);
  priceYocto = seller.price_per_call;
  sellerPublicKey = seller.seller_public_key;
  console.log(`[seller] contract ${CONTRACT_ID} confirmed: seller=${SELLER_ACCOUNT_ID} price=${priceYocto} yoctoNEAR timeout=${seller.call_timeout_seconds}s`);
} catch (e) {
  console.log(`[seller] WARNING: could not confirm contract via RPC (${e.message}); starting with configured price=${priceYocto} yoctoNEAR — verify against the contract before demoing.`);
}

let keyPath = process.env.SELLER_KEY_PATH || join(homedir(), '.near-credentials', 'testnet', SELLER_ACCOUNT_ID + '.json');
let tempKeyDir = null; // SELLER_KEY_JSON temp dir (F8, Wave 6): deleted once the key is in memory.
if (process.env.SELLER_KEY_JSON) {
  // Hosted mode (e.g. a Render env var): the whole credential-file JSON
  // arrives as an env var. Write it to a mode-600 temp file at startup
  // and use that path; the key content is never logged. Key-handling
  // note: seller-api/RENDER_HOSTING.md.
  tempKeyDir = mkdtempSync(join(tmpdir(), 'meteredpay-seller-key-'));
  keyPath = join(tempKeyDir, SELLER_ACCOUNT_ID + '.json');
  writeFileSync(keyPath, process.env.SELLER_KEY_JSON, { mode: 0o600 });
  console.log('[seller] seller key loaded from SELLER_KEY_JSON env var (mode-600 temp file; key never logged)');
}
let sellerKey;
try {
  sellerKey = loadTestnetKey(SELLER_ACCOUNT_ID, keyPath);
} finally {
  // F8 (Wave 6): the temp file held the seller's private key on disk
  // and was never deleted. The key is now in memory (or startup has
  // failed), so remove the temp file + directory immediately.
  if (tempKeyDir) rmSync(tempKeyDir, { recursive: true, force: true });
}
if (sellerPublicKey && sellerKey.publicKey !== sellerPublicKey) {
  throw new Error('Seller credential public key does not match the key registered on the contract — refusing to start.');
}
console.log(`[seller] signing as ${SELLER_ACCOUNT_ID} (${sellerKey.publicKey})`);

// --- deterministic schema-validation service --------------------------
// Fixed built-in schemas (frozen days 8-9 — do not extend without
// updating SELLER_SPEC.md, README §2.2, the dashboard copy, and the
// worked example). Each validator returns { valid, errors, result }:
// errors is [{ field, reason }]; result is the schema-specific output
// for a valid document. Unknown top-level fields are errors: the
// schemas are strict, so the same document always validates the same
// way and a typo'd field is caught, not ignored.
const SERVICE_NAME = 'meteredpay-schema-validate';
function fieldError(field, reason) { return { field, reason }; }
function isPlainObject(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function unknownFieldErrors(doc, known) {
  return Object.keys(doc).filter((k) => !known.includes(k))
    .map((k) => fieldError(k, `unknown field for this schema (known fields: ${known.join(', ')})`));
}
function validAmountYocto(v) {
  return typeof v === 'string' && /^\d+$/.test(v) && BigInt(v) > 0n;
}
const SCHEMAS = {
  // quote: a short text to measure. result: word/char count + excerpt.
  quote: {
    description: 'document { text: string (max 5000 chars) }',
    validate(doc) {
      if (!isPlainObject(doc)) return { valid: false, errors: [fieldError('(document)', 'document must be a JSON object')] };
      const errors = [...unknownFieldErrors(doc, ['text'])];
      if (typeof doc.text !== 'string') errors.push(fieldError('text', 'required: document.text must be a string'));
      else if (doc.text.length > 5000) errors.push(fieldError('text', 'must be at most 5000 characters'));
      if (errors.length) return { valid: false, errors };
      const words = doc.text.trim() === '' ? 0 : doc.text.trim().split(/\s+/).length;
      return { valid: true, errors: [], result: { word_count: words, char_count: [...doc.text].length, excerpt: doc.text.slice(0, 140) } };
    },
  },
  // payment-instruction: who to pay, how much, optional memo.
  'payment-instruction': {
    description: 'document { payee: "<name>.testnet", amount_yocto: "<digits>", memo?: string (max 280 chars) }',
    validate(doc) {
      if (!isPlainObject(doc)) return { valid: false, errors: [fieldError('(document)', 'document must be a JSON object')] };
      const errors = [...unknownFieldErrors(doc, ['payee', 'amount_yocto', 'memo'])];
      if (typeof doc.payee !== 'string' || !/^[a-z0-9][a-z0-9._-]*\.testnet$/.test(doc.payee)) errors.push(fieldError('payee', 'required: must be a testnet account id (e.g. alice.testnet)'));
      if (!validAmountYocto(doc.amount_yocto)) errors.push(fieldError('amount_yocto', 'required: must be a string of digits greater than zero'));
      if (doc.memo !== undefined && (typeof doc.memo !== 'string' || doc.memo.length > 280)) errors.push(fieldError('memo', 'must be a string of at most 280 characters'));
      if (errors.length) return { valid: false, errors };
      return { valid: true, errors: [], result: { payee: doc.payee, amount_yocto: doc.amount_yocto, memo: doc.memo ?? null } };
    },
  },
  // invoice: a bill to validate before paying it.
  invoice: {
    description: 'document { invoice_id: string (1-64 chars), amount_yocto: "<digits>", currency: "NEAR", due_date: "YYYY-MM-DD" }',
    validate(doc) {
      if (!isPlainObject(doc)) return { valid: false, errors: [fieldError('(document)', 'document must be a JSON object')] };
      const errors = [...unknownFieldErrors(doc, ['invoice_id', 'amount_yocto', 'currency', 'due_date'])];
      if (typeof doc.invoice_id !== 'string' || doc.invoice_id.length < 1 || doc.invoice_id.length > 64) errors.push(fieldError('invoice_id', 'required: must be a string of 1-64 characters'));
      if (!validAmountYocto(doc.amount_yocto)) errors.push(fieldError('amount_yocto', 'required: must be a string of digits greater than zero'));
      if (doc.currency !== 'NEAR') errors.push(fieldError('currency', 'required: must be exactly "NEAR"'));
      if (typeof doc.due_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(doc.due_date) || Number.isNaN(Date.parse(doc.due_date + 'T00:00:00Z')) || new Date(doc.due_date + 'T00:00:00Z').toISOString().slice(0, 10) !== doc.due_date) errors.push(fieldError('due_date', 'required: must be a valid calendar date "YYYY-MM-DD"'));
      if (errors.length) return { valid: false, errors };
      return { valid: true, errors: [], result: { invoice_id: doc.invoice_id, amount_yocto: doc.amount_yocto, currency: 'NEAR', due_date: doc.due_date } };
    },
  },
};
/** SHA-256 hex of the canonical { schema, document } input. */
function inputSha256(schema, document) {
  return createHash('sha256').update(canonicalStringify({ schema, document }), 'utf8').digest('hex');
}

// --- HTTP helpers ----------------------------------------------------------
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

// --- server -----------------------------------------------------------------
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, { status: 'ok', seller_account_id: SELLER_ACCOUNT_ID, price_per_call_yocto: priceYocto, service: SERVICE_NAME, schemas: Object.keys(SCHEMAS), mode: 'demonstrator' });
  }
  if (req.method === 'GET' && url.pathname === '/') {
    return sendJson(res, 200, { service: 'MeteredPay demonstrator seller (testnet only)', seller_account_id: SELLER_ACCOUNT_ID, price_per_call_yocto: priceYocto, endpoints: ['GET /health', 'POST /call'], schemas: Object.keys(SCHEMAS), spec: 'SELLER_SPEC.md' });
  }
  if (req.method !== 'POST' || url.pathname !== '/call') {
    return sendJson(res, 404, { status: 'failed', error_code: 'NOT_FOUND', error_message: 'Unknown endpoint. See SELLER_SPEC.md.' });
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, 400, { status: 'failed', error_code: 'BAD_REQUEST', error_message: 'Request body must be JSON.' });
  }
  const { call_id, buyer_account_id, input, scenario = 'success' } = body || {};
  if (typeof call_id !== 'string' || call_id === '' || typeof buyer_account_id !== 'string' || buyer_account_id === '') {
    return sendJson(res, 400, { status: 'failed', error_code: 'BAD_REQUEST', error_message: 'call_id and buyer_account_id are required strings.' });
  }
  // Resolve the service input to { schema, document }. The canonical
  // shape is { schema, document }; the bare { text } shape is a legacy
  // alias for the quote schema (days 4-5 callers) and is documented
  // as such in SELLER_SPEC.md.
  let schema = null;
  let document = null;
  if (input && typeof input.schema === 'string' && Object.prototype.hasOwnProperty.call(input, 'document')) {
    schema = input.schema;
    document = input.document;
  } else if (input && typeof input.text === 'string' && !('schema' in input) && !('document' in input)) {
    schema = 'quote';
    document = { text: input.text };
  } else {
    return sendJson(res, 400, { status: 'failed', error_code: 'BAD_REQUEST', error_message: 'input must be { schema, document } (or legacy { text } for the quote schema).' });
  }
  if (!Object.prototype.hasOwnProperty.call(SCHEMAS, schema)) {
    return sendJson(res, 400, { status: 'failed', error_code: 'BAD_REQUEST', error_message: `unknown schema '${schema}' (known schemas: ${Object.keys(SCHEMAS).join(', ')}).` });
  }
  if (!['success', 'fail', 'timeout'].includes(scenario)) {
    return sendJson(res, 400, { status: 'failed', error_code: 'BAD_REQUEST', error_message: 'scenario must be success, fail, or timeout (demonstrator-only).' });
  }
  console.log(`[seller] /call call_id=${call_id} buyer=${buyer_account_id} scenario=${scenario} schema=${schema}`);

  if (scenario === 'timeout') {
    // Demonstrator-only: hold the connection past the buyer's 30 s wait.
    // The buyer aborts and submits a timeout claim; the hold is then
    // released on-chain. Never respond after the wait with a success.
    await new Promise((r) => setTimeout(r, TIMEOUT_DELAY_MS));
    if (res.writableEnded || req.destroyed) return;
    return sendJson(res, 200, { status: 'failed', error_code: 'TIMEOUT_TOO_LATE', error_message: 'Response arrived after the buyer wait — treat as timeout, do not pay.' });
  }

  if (scenario === 'fail') {
    const err = errorBody({ callId: call_id, errorCode: 'DEMO_SELLER_ERROR', errorMessage: 'Demonstrator seller failed this call on purpose (scenario=fail).', sellerAccountId: SELLER_ACCOUNT_ID, priceYocto });
    const hash = responseHash(err);
    const sig = ed25519Sign(sellerKey.seedBytes, sellerErrorMessage(call_id, hash));
    return sendJson(res, 200, { call_id, status: 'failed', error_code: err.error_code, error_message: err.error_message, response_hash: hash, seller_signature: sig, seller_account_id: SELLER_ACCOUNT_ID, price_per_call_yocto: priceYocto });
  }

  const validation = SCHEMAS[schema].validate(document);
  const sha = inputSha256(schema, document);
  if (!validation.valid) {
    // A document that fails validation is a seller failure, not a
    // paid success: the buyer claims failure with this attestation
    // and the held amount is released, never deducted. The full
    // error list rides along unhashed (it is the service output);
    // the hashed error body is error_code + error_message only.
    const first = validation.errors[0];
    const message = `Document failed schema '${schema}': ${validation.errors.length} error(s) — ${first.field}: ${first.reason}`;
    const err = errorBody({ callId: call_id, errorCode: 'VALIDATION_FAILED', errorMessage: message, sellerAccountId: SELLER_ACCOUNT_ID, priceYocto });
    const hash = responseHash(err);
    const sig = ed25519Sign(sellerKey.seedBytes, sellerErrorMessage(call_id, hash));
    return sendJson(res, 200, { call_id, status: 'failed', error_code: err.error_code, error_message: err.error_message, errors: validation.errors, input_sha256: sha, response_hash: hash, seller_signature: sig, seller_account_id: SELLER_ACCOUNT_ID, price_per_call_yocto: priceYocto });
  }

  const output = { service: SERVICE_NAME, schema, valid: true, errors: [], input_sha256: sha, ...validation.result };
  const canonical = successBody({ callId: call_id, output, sellerAccountId: SELLER_ACCOUNT_ID, priceYocto });
  const hash = responseHash(canonical);
  const sig = ed25519Sign(sellerKey.seedBytes, sellerAttestationMessage(call_id, hash));
  return sendJson(res, 200, { call_id, status: 'success', output, response_hash: hash, seller_signature: sig, seller_account_id: SELLER_ACCOUNT_ID, price_per_call_yocto: priceYocto });
});

server.listen(PORT, HOST, () => {
  console.log(`[seller] MeteredPay demonstrator seller listening on http://${HOST}:${PORT} (testnet only, contract ${CONTRACT_ID})`);
});
