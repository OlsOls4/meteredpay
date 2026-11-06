// MeteredPay — self-test for shared/canonical.mjs + shared/ed25519.mjs.
// No network, no keys on disk needed. Run: node selftest.mjs
// Checks the frozen signature formats against the contract's own unit
// test vectors (repo/src/lib.rs) and the canonical hash rule.
import { createHash, generateKeyPairSync, createPrivateKey, createPublicKey, randomBytes } from 'node:crypto';
import { canonicalStringify, responseHash, sellerAttestationMessage, buyerSuccessMessage } from './canonical.mjs';
import { ed25519Sign, ed25519Verify, base58Decode } from './ed25519.mjs';

let failures = 0;
const check = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) failures++; };

// 1. Canonical stringify: keys sorted recursively, no whitespace.
check('canonical keys sorted', canonicalStringify({ b: 1, a: { d: 4, c: 3 } }) === '{"a":{"c":3,"d":4},"b":1}');

// 2. responseHash = SHA-256 hex of the canonical body.
const body = { call_id: 'x', status: 'success', output: { a: 1 }, seller_account_id: 's.testnet', price_per_call_yocto: '100' };
const manual = createHash('sha256').update(canonicalStringify(body), 'utf8').digest('hex');
check('responseHash matches manual SHA-256', responseHash(body) === manual && /^[0-9a-f]{64}$/.test(manual));

// 3. Contract unit-test vector (src/lib.rs): seller attestation for
//    test-call-1 / hash 3ed59d9f... signed by seller key
//    ed25519:9fUAHL9mAz4jRU4VvLpfzhs4ojyia1orLyujCKmRqFhD.
const SELLER_PUB = 'ed25519:9fUAHL9mAz4jRU4VvLpfzhs4ojyia1orLyujCKmRqFhD';
const HASH = '3ed59d9f6e32da0f3c9784f5f1f178565b7627537b7be4314d2fcfe2d284f912';
const SELLER_SIG = 'GOnGsxqSF2AJjCrPbl0MZdGTJx5ZZM9i5wqcMyKPu6Mbn/gXzM7g4TX3mNHJCCrA663qj0/a0bM9V/JU0uWuAg==';
const msg = sellerAttestationMessage('test-call-1', HASH);
check('seller message format', msg === 'meteredpay-v1-seller|11:test-call-1|64:' + HASH);
check('verify contract test vector (seller sig)', ed25519Verify(SELLER_PUB, msg, SELLER_SIG));
check('verify rejects wrong message', !ed25519Verify(SELLER_PUB, sellerAttestationMessage('test-call-2', HASH), SELLER_SIG));
check('buyer message format', buyerSuccessMessage('test-call-1', HASH, '100000000000000000000000', 'seller.testnet') ===
  'meteredpay-v1-buyer-success|11:test-call-1|64:' + HASH + '|24:100000000000000000000000|14:seller.testnet');

// 4. Sign/verify round-trip with a fresh ephemeral keypair (never saved).
const seed = randomBytes(32);
const priv = createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]), format: 'der', type: 'pkcs8' });
const pubRaw = createPublicKey(priv).export({ format: 'der', type: 'spki' }).subarray(-32);
const ALPH = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
let n = BigInt('0x' + pubRaw.toString('hex'));
let enc = '';
while (n > 0n) { enc = ALPH[Number(n % 58n)] + enc; n /= 58n; }
const pubStr = 'ed25519:' + enc;
const sig = ed25519Sign(seed, 'hello meteredpay');
check('sign/verify round-trip', ed25519Verify(pubStr, 'hello meteredpay', sig));
check('round-trip rejects tampered message', !ed25519Verify(pubStr, 'hello meteredpay!', sig));
check('base58 decode round-trip', base58Decode(pubStr.replace('ed25519:', '')).equals(pubRaw));

if (failures) { console.error(`${failures} self-test(s) FAILED`); process.exit(1); }
console.log('All shared self-tests passed.');
