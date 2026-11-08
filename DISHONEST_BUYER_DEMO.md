# Dishonest-buyer demonstration (deliberate cheat, testnet only)

**Date:** 8 Nov 2026. **Contract (frozen):** `apathetic-party.testnet`.
**Seller (registered on-chain):** `tedious-sea.testnet`, 0.1 testnet NEAR/call.
**Buyer (fresh faucet account):** `mp-dishonest-wdvw4o.testnet`.
**Call:** `dishonest-001`. **Run log:**
`buyer/runs/dishonest-mp-dishonest-wdvw4o.testnet-2026-11-08T09-16-24.jsonl`.

## What was done

The buyer requested a call, the seller served a **genuine signed
success**, and the buyer then deliberately submitted
`submit_failure` with **no evidence** (`failure_reason:
"seller_error"`, `seller_error_hash: null`,
`seller_error_signature: null`) — the designed no-evidence failure
path (`src/lib.rs` accepts `(None, None)` seller evidence). No
contract or seller code was changed.

| Step | Tx |
|---|---|
| Deposit 0.5 | https://testnet.nearblocks.io/txns/3DQCHY2QSX5XYGL2TxxPyVU5kRyMC7LxLdgy2iJQymrR |
| Set cap 0.2 | https://testnet.nearblocks.io/txns/D9v2UeaNzXKDCd53zaHH4suKDBsB4QTQKsJGXjZmodDx |
| Request `dishonest-001` (0.1 held) | https://testnet.nearblocks.io/txns/DLoUhuQDEBDP4WwXKmVRi8A6Sf1XNrFj2arok9qu7nAa |
| **Failure claim (the cheat)** | https://testnet.nearblocks.io/txns/6VDzYRot7ZnhKcaR6EZGi3M4f5dPtBy7X6eZNYXfd8wB |

Every tx above was re-checked with an RPC `tx` query (signer
`mp-dishonest-wdvw4o.testnet`): all `SuccessValue`, receiver
`apathetic-party.testnet`, methods `deposit` / `set_budget_cap` /
`request_call` / `submit_failure`.

## Side-by-side: the mismatch

### A. The seller's retained signed success attestation (off-chain)

The seller served a genuine success for `dishonest-001`
(`meteredpay-schema-validate`, `quote` schema, `valid: true`,
`word_count: 12`, `char_count: 85`):

- `response_hash`:
  `316b7bb3f0fc8f0fa013848d7edf20301745cb18aa8c02ba9df5b9612eeb42b8`
- `seller_signature`:
  `F2/CgzUQtm3oBmKliNKVlQ4ydwRO4Iz/RmCM+JdvRUYh2wHPOzgYwjJ7g47mtx6rGHR1lIKgCAYFa3Y/abSsAg==`
- Attestation message (frozen format):
  `meteredpay-v1-seller|13:dishonest-001|64:316b7bb3f0fc8f0fa013848d7edf20301745cb18aa8c02ba9df5b9612eeb42b8`

**Verified locally** against the seller key registered on-chain
(`ed25519:6zG7yLp2jqHxfkXfYgsL1ZXSf2NVQoRRaib6im72ubnm`, from
`get_seller`), recomputing the hash from the canonical body with
`shared/canonical.mjs` and verifying the signature with
`shared/ed25519.mjs`:

- response hash recomputed from the received body: **matches**
  (`316b7bb3…eb42b8` = stated `response_hash`)
- seller signature over the attestation message: **VALID**

### B. The on-chain record for the same call

- `get_call` for `dishonest-001`: status **`failed-refunded`**,
  `failure_reason: "seller_error"`, no seller evidence stored
  (the contract stores no attestation for failure claims).
- Failure-claim tx:
  https://testnet.nearblocks.io/txns/6VDzYRot7ZnhKcaR6EZGi3M4f5dPtBy7X6eZNYXfd8wB
  (RPC `tx` query: `SuccessValue`, method `submit_failure`).
- Final buyer balances: deposit 0.5 / held 0 / spent **0** /
  available 0.5 / cap 0.2. The seller earned **nothing** for a
  genuine success — the 0.1 hold was released, never deducted.

## What this proves — and what it does not

**MISMATCH, labelled:** the seller attestation (A) says a genuine
success was served and is cryptographically verifiable against the
registered seller key; the on-chain record (B) says the call failed
and was refunded. Both are true at once. The disagreement is
**detectable** — but only by comparing the seller's retained
attestation with the on-chain record. On-chain data alone cannot
tell a genuine failure from this cheat, because `submit_failure`
stores no seller attestation for failure claims.

This is exactly what the README already says: the dispute-audit
view **detects, does not prevent** buyer dishonesty. Buyer
dishonesty is NOT solved: a buyer can claim failure after a genuine
success, and the seller is not paid. What this run adds is the
demonstration — the attestation and the contradictory on-chain
record, side by side, for the same `call_id`, instead of a
disclosure alone.

## How to re-verify

1. RPC `tx` query for the failure tx (signer
   `mp-dishonest-wdvw4o.testnet`):
   `curl https://rpc.testnet.near.org -d '{"jsonrpc":"2.0","id":"v","method":"tx","params":["6VDzYRot7ZnhKcaR6EZGi3M4f5dPtBy7X6eZNYXfd8wB","mp-dishonest-wdvw4o.testnet"]}'`
   — expect `SuccessValue`, method `submit_failure`.
2. `get_call` for buyer `mp-dishonest-wdvw4o.testnet`, call
   `dishonest-001` — expect status `failed-refunded`.
3. Recompute the hash and verify the signature from the values in
   §A with `shared/canonical.mjs` (`responseHash` over the
   canonical success body) and `shared/ed25519.mjs`
   (`ed25519Verify` against the registered key above) — expect
   hash match + signature valid.
