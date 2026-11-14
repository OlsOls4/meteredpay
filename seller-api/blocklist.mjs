// MeteredPay — blocked-buyers list (post-submission council, 14 Nov 2026).
//
// seller-api/blocked-buyers.json is a COMMITTED file naming buyers the
// demonstrator seller refuses to serve (e.g. a buyer caught claiming
// failure after a genuine success — see seller-audit.mjs and
// DISHONEST_BUYER_DEMO.md). The seller checks this list in POST /call
// BEFORE any chain call or any work: a blocked buyer gets a refusal
// response and the server touches nothing on-chain for them.
//
// Format: {"_comment": "...", "blocked": ["<buyer>.testnet", ...]}.
// A bare JSON array is also accepted. Starts empty.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BLOCKED_BUYERS_PATH = process.env.BLOCKED_BUYERS_PATH
  || join(dirname(fileURLToPath(import.meta.url)), 'blocked-buyers.json');

/** Load the blocked set. Missing/unparseable file => empty set (with a
 *  warning on stderr); the server must not die because the list is absent. */
export function loadBlockedBuyers(path = BLOCKED_BUYERS_PATH) {
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'));
    const list = Array.isArray(raw) ? raw : raw.blocked;
    if (!Array.isArray(list)) return new Set();
    return new Set(list.filter((b) => typeof b === 'string'));
  } catch (e) {
    if (e.code !== 'ENOENT') console.error(`[seller] WARNING: could not read blocked-buyers list at ${path} (${e.message}) — treating as empty.`);
    return new Set();
  }
}

export function isBlocked(buyer, blocked = loadBlockedBuyers()) {
  return blocked.has(buyer);
}
