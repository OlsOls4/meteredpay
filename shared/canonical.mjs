// MeteredPay — shared helpers for the seller API and the buyer script.
//
// Canonicalisation (prep/04 §3.2, frozen): the JSON object containing
// call_id, status, output (or error body), seller_account_id and
// price_per_call_yocto, serialised with keys sorted (recursively), no
// extra whitespace, UTF-8. response_hash = hex SHA-256 of that body.
// The hash/signature fields themselves are NEVER part of the hashed body.
//
// Signature message formats (frozen, BUILD_NOTES.md — do not change):
//   seller attestation: meteredpay-v1-seller|<len(call_id)>:<call_id>|<len(response_hash)>:<response_hash>
//   seller error:       meteredpay-v1-seller-error|<len(call_id)>:<call_id>|<len(hash)>:<hash>
//   buyer success:      meteredpay-v1-buyer-success|<len(call_id)>:<call_id>|<len(response_hash)>:<response_hash>|<len(price_yocto)>:<price_yocto>|<len(seller_account_id)>:<seller_account_id>
// len(p) = UTF-8 byte length of p, decimal, no padding.
// Signatures are base64 (standard alphabet, with padding) of the raw
// 64-byte ed25519 signature.
import { createHash } from 'node:crypto';

/** JSON with object keys sorted recursively, no whitespace. */
export function canonicalStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalStringify).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify(value[k])).join(',') + '}';
}

/** hex-encoded SHA-256 of the canonical body. */
export function responseHash(canonicalBody) {
  return createHash('sha256').update(canonicalStringify(canonicalBody), 'utf8').digest('hex');
}

const lp = (parts) => parts.map((p) => Buffer.byteLength(p, 'utf8') + ':' + p).join('|');

export function sellerAttestationMessage(callId, hash) {
  return 'meteredpay-v1-seller|' + lp([callId, hash]);
}

export function sellerErrorMessage(callId, hash) {
  return 'meteredpay-v1-seller-error|' + lp([callId, hash]);
}

export function buyerSuccessMessage(callId, hash, priceYocto, sellerAccountId) {
  return 'meteredpay-v1-buyer-success|' + lp([callId, hash, priceYocto, sellerAccountId]);
}

/** Canonical success body (the object that is hashed). */
export function successBody({ callId, output, sellerAccountId, priceYocto }) {
  return { call_id: callId, output, price_per_call_yocto: priceYocto, seller_account_id: sellerAccountId, status: 'success' };
}

/** Canonical failure/error body (the object that is hashed). */
export function errorBody({ callId, errorCode, errorMessage, sellerAccountId, priceYocto }) {
  return { call_id: callId, error_code: errorCode, error_message: errorMessage, price_per_call_yocto: priceYocto, seller_account_id: sellerAccountId, status: 'failed' };
}
