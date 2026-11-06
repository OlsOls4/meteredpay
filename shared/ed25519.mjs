// MeteredPay — ed25519 helpers (pure Node.js, no dependencies).
//
// Keys are read from the standard NEAR credential files
// (~/.near-credentials/testnet/<account>.json) into memory and NEVER
// printed, logged, or written anywhere. Only the public key (which is
// public on-chain) may appear in output.
//
// Private keys in those files are "ed25519:<base58 of the 32-byte seed>".
// Signing uses Node's built-in Ed25519 via a PKCS#8 DER wrapper built
// from the raw seed; verification uses an SPKI DER wrapper built from
// the raw 32-byte public key.
import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function base58Decode(s) {
  let n = 0n;
  for (const ch of s) {
    const i = BASE58.indexOf(ch);
    if (i < 0) throw new Error('Invalid base58 character');
    n = n * 58n + BigInt(i);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  let bytes = Buffer.from(hex, 'hex');
  // Preserve leading zero bytes encoded as '1'.
  let leading = 0;
  for (const ch of s) { if (ch === '1') leading++; else break; }
  if (leading > 0) bytes = Buffer.concat([Buffer.alloc(leading), bytes]);
  return bytes;
}

const PKCS8_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');
const SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function privateKeyObject(seedBytes) {
  return createPrivateKey({ key: Buffer.concat([PKCS8_PREFIX, seedBytes]), format: 'der', type: 'pkcs8' });
}

function publicKeyObject(pubBytes) {
  return createPublicKey({ key: Buffer.concat([SPKI_PREFIX, pubBytes]), format: 'der', type: 'spki' });
}

/** Sign a UTF-8 message with a 32-byte ed25519 seed. Returns base64 signature. */
export function ed25519Sign(seedBytes, message) {
  return sign(null, Buffer.from(message, 'utf8'), privateKeyObject(seedBytes)).toString('base64');
}

/** Verify a base64 ed25519 signature over a UTF-8 message. pubKeyStr is "ed25519:<base58>". */
export function ed25519Verify(pubKeyStr, message, signatureB64) {
  const raw = pubKeyStr.replace(/^ed25519:/, '');
  const pubBytes = base58Decode(raw);
  const sig = Buffer.from(signatureB64, 'base64');
  if (sig.length !== 64) return false;
  return verify(null, Buffer.from(message, 'utf8'), publicKeyObject(pubBytes), sig);
}

/**
 * Load a testnet account's keypair from its credential file.
 * Returns { accountId, publicKey, privateKeyString, seedBytes }.
 * The seed/private key must never be logged; callers must only ever
 * print accountId / publicKey.
 */
export function loadTestnetKey(accountId, keyPath) {
  const path = keyPath || join(homedir(), '.near-credentials', 'testnet', accountId + '.json');
  const j = JSON.parse(readFileSync(path, 'utf8'));
  const privateKeyString = j.private_key;
  if (!privateKeyString || !privateKeyString.startsWith('ed25519:')) {
    throw new Error(`No ed25519 private_key in credential file for ${accountId}`);
  }
  // NEAR credential private keys are base58 of the 64-byte secret key
  // (32-byte seed + 32-byte public key); the seed is the first 32 bytes.
  // A bare 32-byte seed is also accepted.
  const decoded = base58Decode(privateKeyString.replace(/^ed25519:/, ''));
  let seedBytes;
  if (decoded.length === 64) seedBytes = decoded.subarray(0, 32);
  else if (decoded.length === 32) seedBytes = decoded;
  else throw new Error(`Credential private key for ${accountId} decoded to ${decoded.length} bytes, expected 32 or 64`);
  return {
    accountId,
    publicKey: j.public_key,
    privateKeyString,
    seedBytes,
  };
}
