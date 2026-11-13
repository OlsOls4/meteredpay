# Attack Suite — live on-chain proof (Wave 6, 13 Nov 2026)

The two attacks a security judge asks about first — a seller-only
success claim and a buyer-only success claim — were previously proven
only in mock-env unit tests (`src/lib.rs`:
`seller_only_success_rejected`, `buyer_only_success_rejected`). This
appendix closes that gap **on-chain**, against the frozen contract,
with a third (forged-error) attack added.

## Run

- Date: 13 Nov 2026, ~09:21–09:24 UTC.
- Contract: `apathetic-party.testnet` (frozen; seller
  `tedious-sea.testnet`, 0.1 testnet NEAR/call, 600 s timeout).
- Buyer: fresh faucet account `mp-attack-w6c.testnet` (created
  `sponsor-by-faucet-service`; account-creation tx not captured —
  the faucet creation output was filtered to the success line only.
  The buyer's on-chain activity is fully covered by the setup and
  attack txs below).
- Seller API: demonstrator `seller-api/server.mjs` on localhost
  (127.0.0.1:8787), confirmed at startup against the frozen contract.
- Script: `buyer/attack-suite.mjs` (new, Wave 6). Run log:
  `buyer/runs/attack-mp-attack-w6c.testnet-2026-11-13T09-21-51.jsonl`.
- Setup: deposit 0.5, cap 0.5 (three 0.1 holds fit:
  spent+held+price ≤ cap).

Note on the buyer account: the first clean-run attempt used buyer
`mp-attack-w6b.testnet`, whose attacks A and B were also rejected
on-chain (A `HFT9pU8BfuStHCDyvCQcQidQWy3kHzeQYgWHeh85ZrBa`,
B `HMCtj9VE2dJgJdDXscxYefhuKbGLikRPV5d8x8GZMXKP`) before a
script bug in attack C aborted that run. The run below is the
complete, single-buyer proof (w6c); the w6b A/B rejections are
independent corroboration, not the cited proof.

## Method

Each attack first requests a real call (0.1 held, status `paid`),
then submits a forged claim against it. The forged claim is sent
with `throwOnFailure: false` so the failed outcome — including its
tx hash — is returned instead of thrown; each rejected tx is then
re-checked with an RPC `tx` query, which must show status
`Failure` containing the expected panic string. After each attack
the script asserts the call is still `paid` and balances are
unchanged from immediately after the request (the rejected claim
itself moves nothing).

- **(a) Seller-only success claim.** The seller API serves a genuine
  signed success for `attack-a-001`; the buyer submits
  `submit_success` with the genuine seller signature **and that
  same seller signature in the buyer-signature slot** — i.e. the
  payer never authorised. The contract verifies the buyer
  authorisation first, against the key that signed the transaction.
- **(b) Buyer-only success claim.** The buyer signs the correct
  buyer-success message for `attack-b-001` with its own key, but
  submits that buyer signature **in the seller-signature slot** —
  i.e. the seller never attested. The contract verifies the seller
  attestation second, against the seller key registered at init.
- **(c) Forged-error claim.** The buyer builds a well-formed
  seller-error body for `attack-c-001`, computes its real response
  hash, and signs the seller-error message **with the buyer's own
  key** — a forged attestation from the wrong key — then submits
  `submit_failure` with `failure_reason: seller_error` and that
  hash + signature.

## Results — all three rejected on-chain

| Attack | Call | Rejected tx | On-chain panic (verbatim) |
|---|---|---|---|
| (a) Seller-only success claim | `attack-a-001` | https://testnet.nearblocks.io/txns/956D3ivyYzfU2fGrWfiroLxdShV913y267fz5E4Jbb1S | `Invalid buyer signature` |
| (b) Buyer-only success claim | `attack-b-001` | https://testnet.nearblocks.io/txns/F3nW5SYcmssBEuYW16Arz4og4Rz4282SumCesgUWJphJ | `Invalid seller signature` |
| (c) Forged seller-error claim | `attack-c-001` | https://testnet.nearblocks.io/txns/D85xPbcHqeN4MK4kLM18kf1vFcko2pZt6bQJZwNJ9cUV | `Invalid seller error signature` |

Each rejected tx was re-checked with an RPC `tx` query (signer
`mp-attack-w6c.testnet`, receiver `apathetic-party.testnet`):
status `Failure`, `ActionError kind FunctionCallError
ExecutionError "Smart contract panicked: <panic above>"`. The
script exits 0 only if all three RPC re-checks match — it did.

Setup / request txs (same run, all `SuccessValue`):

| Step | Tx |
|---|---|
| Deposit 0.5 | https://testnet.nearblocks.io/txns/GkzBpfoe8tYxngg5R8qAh8cVHtotgZ7b5xSn1hnmje3 |
| Set cap 0.5 | https://testnet.nearblocks.io/txns/DZAsSUXeowD6Qg1B4Az6MEAwUAvQXRQWJxhUEe2NFpv9 |
| Request attack-a-001 | https://testnet.nearblocks.io/txns/FUtWRUh7K6hpC9zvnAmKWKtTTN942KDFGNRoniwjna8K |
| Request attack-b-001 | https://testnet.nearblocks.io/txns/A2m3puj9XXuvNMmwyadyawzr1rpFLayJtm8jA52HkVGp |
| Request attack-c-001 | https://testnet.nearblocks.io/txns/BbyoCqymXtq3xPtc5mEoZcKNu8ZVEZqNMqyf5BNQe6Ko |

## State after the attacks — nothing moved

Final buyer balances (asserted by the script, `get_buyer_balance`):
deposit **0.5** / held **0.3** / spent **0** / available **0.2** /
cap **0.5**. All three calls remain `paid` — their 0.1 each is still
held, never deducted, never released. Seller balance on the frozen
contract unchanged by the attacks: earned **4.2**, withdrawn **0.2**
(live RPC, 13 Nov 2026).

What this proves, and what it does not:

- Proves: neither signature alone can deduct. A seller-only claim
  fails buyer verification; a buyer-only claim fails seller
  verification; a forged error attestation fails seller-error
  verification. The deduction path requires both a real on-chain
  `ed25519_verify` of the seller attestation and a real on-chain
  `ed25519_verify` of the payer authorisation, exactly as the
  contract states.
- Does not prove: buyer honesty. A buyer that receives a genuine
  success can still claim failure instead of paying — that is
  detected, not prevented (see README §2.5b / §2.7 and
  `DISHONEST_BUYER_DEMO.md`).

## Exact one-row text for README §2.5b (for the copy worker — paste verbatim)

> **Single-signature attacks rejected on-chain (13 Nov 2026).** Fresh buyer `mp-attack-w6c.testnet`, frozen contract: seller-only success claim rejected — https://testnet.nearblocks.io/txns/956D3ivyYzfU2fGrWfiroLxdShV913y267fz5E4Jbb1S (`Invalid buyer signature`); buyer-only success claim rejected — https://testnet.nearblocks.io/txns/F3nW5SYcmssBEuYW16Arz4og4Rz4282SumCesgUWJphJ (`Invalid seller signature`); forged seller-error claim rejected — https://testnet.nearblocks.io/txns/D85xPbcHqeN4MK4kLM18kf1vFcko2pZt6bQJZwNJ9cUV (`Invalid seller error signature`). All three calls stayed `paid`, balances unchanged (deposit 0.5 / held 0.3 / spent 0 / available 0.2 / cap 0.5). Full proof: `ATTACK_SUITE_APPENDIX.md`.
