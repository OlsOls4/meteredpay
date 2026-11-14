// MeteredPay — seller attestation log (post-submission council, 14 Nov 2026).
//
// One JSON object per line, same format as the committed seed
// (seller-api/attestations-seed.jsonl):
//   {"call_id","buyer","response_hash","seller_signature","timestamp"}
// The log is RUNTIME data (seller-api/attestations.jsonl, gitignored,
// never committed): it is the seller's retained record of every signed
// success attestation it issued, so a later audit can compare it with
// the on-chain record and DETECT a buyer who claimed failure after a
// genuine success (see DISHONEST_BUYER_DEMO.md). Appending never logs
// the seller's private key — only the five fields above — and never
// changes the signed response bytes: the append happens after signing
// and is independent of the HTTP response.
import { appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ATTESTATION_LOG_PATH = process.env.ATTESTATION_LOG_PATH
  || join(dirname(fileURLToPath(import.meta.url)), 'attestations.jsonl');

/** Append one attestation line. Throws on I/O error; callers that must
 *  not fail the HTTP response catch it. Never writes key material. */
export function appendAttestation(entry, logPath = ATTESTATION_LOG_PATH) {
  const { call_id, buyer, response_hash, seller_signature, timestamp } = entry;
  if (typeof call_id !== 'string' || typeof buyer !== 'string'
    || typeof response_hash !== 'string' || typeof seller_signature !== 'string'
    || typeof timestamp !== 'string') {
    throw new Error('appendAttestation: all of call_id, buyer, response_hash, seller_signature, timestamp must be strings');
  }
  appendFileSync(logPath, JSON.stringify({ call_id, buyer, response_hash, seller_signature, timestamp }) + '\n', 'utf8');
}
