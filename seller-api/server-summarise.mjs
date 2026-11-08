// MeteredPay — second service: deterministic extractive summariser
// (`meteredpay-summarise`), seller-side variant for instance C.
//
// A deterministic, single-price, single-service demonstrator seller.
// It serves ONE service: extractive summarisation of a long text.
// Extractive means the summary is made only of sentences copied
// verbatim from the input — nothing is generated, paraphrased, or
// invented. Deterministic means the same input always produces the
// same summary: sentences are scored by a fixed word-frequency rule
// (see summarise() below), ties break towards the earlier sentence,
// and the top 3 are returned in original order. NO quality claim is
// made: this is a metering demonstrator, not a claim that the
// summary is good.
//
//   scenario "success" (default): HTTP 200, status "success" — the
//     top-3 sentences + word counts + input SHA-256.
//   scenario "fail":                HTTP 200, status "failed", with a
//                                   seller-signed error attestation.
//   scenario "timeout":             no response for 40 s (the buyer
//                                   waits 30 s, then claims timeout).
//
// POST /call input is { text: string } (or the { schema: "summarise",
// document: { text } } shape, accepted for symmetry with the
// schema-validate seller). Success requires at least 4 sentences
// AND at least 40 words; anything shorter/empty is a seller failure
// (error_code INPUT_TOO_SHORT) — a DIFFERENT failure mode from
// schema validation, and the one the buyer demo exercises. A failed
// call is never a paid success: the buyer submits a failure claim
// with the seller-signed error attestation and the held amount is
// released, never deducted.
//
// The buyer-verifiable receipt flow is IDENTICAL to the
// schema-validate seller (shared/canonical.mjs): response_hash is
// the hex SHA-256 of the canonical body (keys sorted, no whitespace)
// containing call_id, status, output (or error_code/error_message),
// seller_account_id and price_per_call_yocto. The contract cannot
// tell jobs apart — it only checks the two signatures and the hash —
// and that is the point: the same metering primitive prices a
// second, different service.
//
// The seller NEVER calls the contract and can NEVER mark its own
// calls successful: deduction needs the buyer's payer-signed
// receipt, and the seller signature below is only an attestation
// ("I served this response for this call"). See SELLER_SPEC.md for
// the open spec.
//
// Keys: the seller signing key is read at startup from the NEAR
// credential file (env SELLER_KEY_PATH, default
// ~/.near-credentials/testnet/mp-seller2.testnet.json) and is never
// printed, logged, or written anywhere. Price/seller are confirmed
// against the testnet contract at startup via a read-only RPC view.
//
// Run (instance C, port 8789 — the frozen seller keeps 8787):
//   cd seller-api && SELLER_ACCOUNT_ID=mp-seller2.testnet \
//     CONTRACT_ID=mp-meteredpay-c.testnet PORT=8789 node server-summarise.mjs
// Env:  PORT, HOST, SELLER_ACCOUNT_ID, SELLER_KEY_PATH, CONTRACT_ID,
//       PRICE_YOCTO, RPC_URL. No dependencies; Node >= 18.
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { canonicalStringify, successBody, errorBody, responseHash, sellerAttestationMessage, sellerErrorMessage } from '../shared/canonical.mjs';
import { ed25519Sign, loadTestnetKey } from '../shared/ed25519.mjs';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 8789);
const CONTRACT_ID = process.env.CONTRACT_ID || 'mp-meteredpay-c.testnet';
const SELLER_ACCOUNT_ID = process.env.SELLER_ACCOUNT_ID || 'mp-seller2.testnet';
const RPC_URL = process.env.RPC_URL || 'https://rpc.testnet.near.org';
const FROZEN_PRICE_YOCTO = '50000000000000000000000'; // 0.05 testnet NEAR (instance C)
const BUYER_WAIT_MS = 30_000; // prep/04 §3.4 / glossary §7; timeout mode waits 40 s
const TIMEOUT_DELAY_MS = 40_000;
const MIN_SENTENCES = 4;
const MIN_WORDS = 40;
const TOP_N = 3;

// --- contract confirmation (read-only view, retry once) -------------------
async function rpcView(method, args) {
  const body = JSON.stringify({
    jsonrpc: '2.0', id: 'meteredpay-summarise', method: 'query',
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

const keyPath = process.env.SELLER_KEY_PATH || join(homedir(), '.near-credentials', 'testnet', SELLER_ACCOUNT_ID + '.json');
const sellerKey = loadTestnetKey(SELLER_ACCOUNT_ID, keyPath);
if (sellerPublicKey && sellerKey.publicKey !== sellerPublicKey) {
  throw new Error('Seller credential public key does not match the key registered on the contract — refusing to start.');
}
console.log(`[seller] signing as ${SELLER_ACCOUNT_ID} (${sellerKey.publicKey})`);

// --- deterministic extractive summariser ----------------------------------
// Fixed rule, frozen for this service — do not tune without updating
// SECOND_SERVICE_APPENDIX.md and the worked example there.
//   1. Split the text into sentences on . ! ? followed by whitespace
//      (or end of text). Sentences are kept verbatim, trimmed.
//   2. Tokenise on lowercase [a-z0-9'] runs; drop the fixed stopword
//      list below. Count each remaining word's frequency over the
//      whole input.
//   3. Sentence score = sum of the frequencies of its non-stopwords.
//      Ties break towards the earlier sentence (lower index wins).
//   4. Take the TOP_N highest-scoring sentences, return them in
//      original input order.
// No model, no network, no randomness, no time dependence: the same
// input always yields the same summary. No quality claim: a
// high-frequency sentence is not necessarily a good summary.
const SERVICE_NAME = 'meteredpay-summarise';
const STOPWORDS = new Set((
  'a an the and or but if then else when at by for with about against between into through during before after above below to from up down in out on off over under again further once here there all any both each few more most other some such no nor not only own same so than too very can will just should now is am are was were be been being have has had having do does did doing would could ought i you he she it we they me him her us them my your his its our their this that these those as of'
).split(' '));

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 0);
}
function wordsOf(sentence) {
  return (sentence.toLowerCase().match(/[a-z0-9']+/g) || []).filter((w) => !STOPWORDS.has(w));
}
/** Pure function: { sentences, summary, scores } — exported for tests. */
export function summarise(text) {
  const sentences = splitSentences(text);
  const inputWordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const freq = new Map();
  const perSentence = sentences.map((s) => {
    const ws = wordsOf(s);
    for (const w of ws) freq.set(w, (freq.get(w) || 0) + 1);
    return ws;
  });
  const scored = sentences.map((sentence, index) => ({
    index,
    sentence,
    score: perSentence[index].reduce((sum, w) => sum + (freq.get(w) || 0), 0),
  }));
  const top = [...scored]
    .sort((a, b) => (b.score - a.score) || (a.index - b.index))
    .slice(0, TOP_N)
    .sort((a, b) => a.index - b.index);
  return {
    sentences,
    sentence_count: sentences.length,
    input_word_count: inputWordCount,
    summary: top.map((t) => t.sentence),
    sentence_scores: top.map((t) => ({ sentence_index: t.index, score: t.score })),
    summary_word_count: top.reduce((n, t) => n + t.sentence.split(/\s+/).length, 0),
  };
}
/** SHA-256 hex of the canonical { text } input. */
function inputSha256(text) {
  return createHash('sha256').update(canonicalStringify({ text }), 'utf8').digest('hex');
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
    return sendJson(res, 200, { status: 'ok', seller_account_id: SELLER_ACCOUNT_ID, price_per_call_yocto: priceYocto, service: SERVICE_NAME, method: 'extractive', deterministic: true, mode: 'demonstrator' });
  }
  if (req.method === 'GET' && url.pathname === '/') {
    return sendJson(res, 200, { service: 'MeteredPay demonstrator seller: deterministic extractive summariser (testnet only)', seller_account_id: SELLER_ACCOUNT_ID, price_per_call_yocto: priceYocto, endpoints: ['GET /health', 'POST /call'], method: 'extractive', deterministic: true, min_sentences: MIN_SENTENCES, min_words: MIN_WORDS, top_n: TOP_N, spec: 'SECOND_SERVICE_APPENDIX.md' });
  }
  if (req.method !== 'POST' || url.pathname !== '/call') {
    return sendJson(res, 404, { status: 'failed', error_code: 'NOT_FOUND', error_message: 'Unknown endpoint. See SECOND_SERVICE_APPENDIX.md.' });
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
  // Resolve the service input to a plain text string. The canonical
  // shape is { text }; the { schema: "summarise", document: { text } }
  // shape is accepted for symmetry with the schema-validate seller.
  let text = null;
  if (input && typeof input.text === 'string' && !('schema' in input) && !('document' in input)) {
    text = input.text;
  } else if (input && input.schema === 'summarise' && input.document && typeof input.document.text === 'string') {
    text = input.document.text;
  } else {
    return sendJson(res, 400, { status: 'failed', error_code: 'BAD_REQUEST', error_message: 'input must be { text } (or { schema: "summarise", document: { text } }).' });
  }
  if (!['success', 'fail', 'timeout'].includes(scenario)) {
    return sendJson(res, 400, { status: 'failed', error_code: 'BAD_REQUEST', error_message: 'scenario must be success, fail, or timeout (demonstrator-only).' });
  }
  console.log(`[seller] /call call_id=${call_id} buyer=${buyer_account_id} scenario=${scenario} service=${SERVICE_NAME} text_chars=${[...text].length}`);

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

  // The service's own failure mode: input too short/empty. This is a
  // seller failure, not a paid success — the buyer claims failure
  // with this attestation and the held amount is released, never
  // deducted.
  const result = summarise(text);
  const sha = inputSha256(text);
  if (result.sentence_count < MIN_SENTENCES || result.input_word_count < MIN_WORDS) {
    const message = `Input too short for extractive summary: need at least ${MIN_SENTENCES} sentences and ${MIN_WORDS} words, got ${result.sentence_count} sentence(s) and ${result.input_word_count} word(s).`;
    const err = errorBody({ callId: call_id, errorCode: 'INPUT_TOO_SHORT', errorMessage: message, sellerAccountId: SELLER_ACCOUNT_ID, priceYocto });
    const hash = responseHash(err);
    const sig = ed25519Sign(sellerKey.seedBytes, sellerErrorMessage(call_id, hash));
    return sendJson(res, 200, { call_id, status: 'failed', error_code: err.error_code, error_message: err.error_message, sentence_count: result.sentence_count, input_word_count: result.input_word_count, input_sha256: sha, response_hash: hash, seller_signature: sig, seller_account_id: SELLER_ACCOUNT_ID, price_per_call_yocto: priceYocto });
  }

  const output = { service: SERVICE_NAME, method: 'extractive', deterministic: true, summary: result.summary, sentence_scores: result.sentence_scores, sentence_count: result.sentence_count, input_word_count: result.input_word_count, summary_word_count: result.summary_word_count, input_sha256: sha };
  const canonical = successBody({ callId: call_id, output, sellerAccountId: SELLER_ACCOUNT_ID, priceYocto });
  const hash = responseHash(canonical);
  const sig = ed25519Sign(sellerKey.seedBytes, sellerAttestationMessage(call_id, hash));
  return sendJson(res, 200, { call_id, status: 'success', output, response_hash: hash, seller_signature: sig, seller_account_id: SELLER_ACCOUNT_ID, price_per_call_yocto: priceYocto });
});

server.listen(PORT, HOST, () => {
  console.log(`[seller] MeteredPay demonstrator summariser listening on http://${HOST}:${PORT} (testnet only, contract ${CONTRACT_ID})`);
});
