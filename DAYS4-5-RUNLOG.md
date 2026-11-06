# MeteredPay — Days 4–5 run log (seller API + buyer script)

Run date: 2026-11-05 (Thu). Contract FROZEN from days 1–3 — NOT
redeployed, NOT changed. Contract: `apathetic-party.testnet`, seller
`tedious-sea.testnet`, price 0.1 testnet NEAR
(`100000000000000000000000` yocto), timeout 600 s.
All payments below are NEAR testnet faucet tokens with no monetary
value. Explorer base: `https://testnet.nearblocks.io/txns/<hash>`.

## What was built

- `shared/canonical.mjs` — canonical JSON (keys sorted recursively,
  no whitespace) + SHA-256 response hash + frozen signature-message
  formats (seller attestation, seller error, buyer success).
- `shared/ed25519.mjs` — pure-Node ed25519 sign/verify (no deps).
  Keys are read from `~/.near-credentials/testnet/<acct>.json` at
  runtime and never printed or committed.
- `shared/selftest.mjs` — 9/9 pass, including verification of the
  contract's own unit-test seller-signature vector (src/lib.rs).
- `seller-api/server.mjs` (+ `SELLER_SPEC.md`, `README.md`) — zero-
  dependency demonstrator seller (`meteredpay-demo-quote`: word/char
  count + excerpt). `GET /health`, `POST /call` with demonstrator-only
  `scenario` success/fail/timeout. Confirms seller + price against
  the frozen contract at startup via read-only RPC. The seller never
  calls the contract and cannot mark its own calls successful.
- `buyer/buyer.mjs` (+ `package.json`, `README.md`) — the payer's
  agent (near-api-js). Demo mode + replay mode (frozen replay script).
  Before signing anything it recomputes the response hash and
  verifies the seller signature against the contract-registered key.
  Five-number balances after every step; exit 0 only if every step
  asserts. Run logs: `buyer/runs/*.jsonl`.

Bug found and fixed during local testing: NEAR credential private
keys are base58 of the 64-byte secret key (32-byte seed + 32-byte
public key), not a bare 32-byte seed. `loadTestnetKey` now takes the
first 32 bytes as the seed. The self-test caught nothing (it used a
bare seed); the seller server failed to start until fixed. Verified
after the fix by independent hash + signature recomputation
(success and failure responses both verified).

## Proof run 1 — demo mode, fresh buyer good-example.testnet

Buyer created 2026-11-05, creation tx
`FbpGJTdn5qn9VFeB94q5XKmQF3Kq73YY9fC9c1Zs362K`.
Run log: `buyer/runs/demo-good-example.testnet-2026-11-05T09-51-57.jsonl`.
Deposit 0.5, cap 0.2 (testnet NEAR). Price 0.1/call.

| Step | Call | Tx | Result |
|---|---|---|---|
| Deposit 0.5 | — | `34re5zCZER8Z4Hy2E4jBUWbKYK2Y1XcXcUuwpF5gou24` | deposit 0.5, cap default 0.5 |
| Set cap 0.2 | — | `DQcwefqeUHfGuVq5C7CuCFKi5sGXYF6N6Km3fCXnsQdy` | cap 0.2 |
| Request | demo-success-001 | `2PY7ZGtuBZSXN9mFeKPxMJcwP2WjFcSfinxgmq9FKPXM` | paid (0.1 held) |
| Success deducts | demo-success-001 | `JDmqNR3sqJ274wj12FRjg5FJwMDnxakpAeZr8RuVSkwg` | success-deducted, spent 0.1 |
| Request | demo-fail-001 | `E2Fd7cNPBxHQjpj9TTT4Ja1pkBVk2qVjhG45yxyuECgy` | paid (0.1 held) |
| Failure releases | demo-fail-001 | `BX3Emksn2UxigMRSdYUzQ8oqoSpjJMnWpKddT4BWQAgj` | failed-refunded — held amount released, never deducted; spent still 0.1 |
| Request | demo-timeout-001 | `825avsqwF7RAv7auc5wFDEaLCEjqeMvvgykGhA6N141A` | paid (0.1 held) |
| Timeout releases | demo-timeout-001 | `3XorTaigTfzfzzQvfKB9oX1k8NEESpFXYcPQUZphDvCy` | timeout-refunded after 30 s buyer wait — held amount released, never deducted |
| Request | demo-success-002 | `DULdLAwwx3SK89jG9m1Dp9VLDburfuorpGToknZc3v7a` | paid (0.1 held) |
| Success deducts | demo-success-002 | `BZRSwq2SdtYA7RaQ6NSPUA8Kp5yVkfvzs4t3NYpmzKZj` | success-deducted, spent 0.2 |
| Over-budget refused | demo-overbudget-001 | `7zW3UAva9vjiGjxx7DuEZ8D9uFTEdVZ2xiCMhXpTStu2` | refused, reason `over_budget` (verbatim), balances unchanged |

Final buyer balance: deposit 0.5, held 0, spent 0.2, available 0.3,
cap 0.2 — invariant `available = deposit − spent − held` held at
every step. The script printed `=== DEMO COMPLETE ===` and exited
0; the shell pipeline reported exit 1 only because the `tee`
wrapper failed to open its log file (`runs/` did not exist yet when
tee started). That is a harness artifact, not a demo failure — the
buyer script's own `.jsonl` run log is complete, including the
`final` row.

## Proof run 2 — replay mode (frozen script), fresh buyer new-kitty.testnet

Buyer created 2026-11-05, creation tx
`7uvySWSx5eFBE7xgFTqQMPVDmH7sJaxgt165EXhPd1Nc`.
Run log: `buyer/runs/replay-new-kitty.testnet-2026-11-05T09-56-28.jsonl`.
Deposit 0.5, cap 0.2 (= 2 × price), two successes, third refused —
the frozen replay script (glossary §6), i.e. the day-7 judge-replay
shape (test 19) run end-to-end with the real seller API + buyer script.

| Step | Tx | Result |
|---|---|---|
| Deposit 0.5 | `2SFi68TfEiBVMxN7CRXyfirTnsSCnvBAxS5isoeiPTwe` | deposit 0.5 |
| Set cap 0.2 | `9vKfWT6ukVNC3NDiK3gkz5s8aiP15obQ6YNZoSJ2gdKm` | cap 0.2 |
| Request replay-success-1 | `D6kWPsJsn8JDehC1Fm4UtFMGtaDhHQRc7pprygFc2sqW` | paid (held) |
| Success 1 deducts | `7ktvjNonyU9WPaW9EvDPxaBif4kgaPV4U4zDVPyi9vcD` | success-deducted, spent 0.1 |
| Request replay-success-2 | `8VXCW1A14fjTifHMiyGzy8A9qFyJLbMgood7oimfNd41` | paid (held) |
| Success 2 deducts | `Fqb16xy2eDPmTstVadTqxLhxFoNm4Joi4CDa4kRGUJnV` | success-deducted, spent 0.2 |
| Third refused | `HfDhB5W7qnGmDU8izPAj9EexCTemSUeVxiuoKhnRuoGx` | refused `over_budget`, balances unchanged |

Final: deposit 0.5, held 0, spent 0.2, available 0.3, cap 0.2.

## Independent on-chain verification (after both runs)

Read back via RPC views (near-api-js, retried; the `view.sh`
curl helper was rate-limited by the deprecated RPC endpoint
during this check — known flakiness, not a contract issue):

- good-example.testnet: deposit 0.5, held 0, spent 0.2, available
  0.3, cap 0.2. Calls: demo-success-001/002 success-deducted,
  demo-fail-001 failed-refunded, demo-timeout-001 timeout-refunded,
  demo-overbudget-001 refused.
- new-kitty.testnet: identical balances. Calls: replay-success-1/2
  success-deducted, replay-third refused.
- superficial-trousers.testnet (days 1–3 buyer A): deposit 2, held 0,
  spent 0.2, available 1.8, cap 1.0 — unchanged by days 4–5.
- worthless-wrench.testnet (days 1–3 rehearsal buyer D): deposit 0.5,
  held 0, spent 0.2, available 0.3, cap 0.2 — unchanged.
- Seller: earned 0.8, withdrawn 0.2 (testnet NEAR).

## Accounting note — a parallel days 4–5 run (NOT mine)

While this run was in progress, a second fresh buyer account
`day45-buyer.testnet` (credential file dated 2026-11-05 09:50, one
minute before good-example.testnet) ran the same demo shape on the
same contract: d45-success-001/002 success-deducted, d45-fail-001
failed-refunded, d45-timeout-001 timeout-refunded, d45-overbudget-001
refused; deposit 0.5, spent 0.2, cap 0.2. That run is NOT this
agent's work and its code/logs are not in this repo (at least not
under these paths).

Full reconciliation — successes ever on the contract: buyer A 2
(t3-double, t16a) + buyer D 2 + day45-buyer 2 + good-example 2 +
new-kitty 2 = 10 × 0.1 = 1.0 earned ever; withdrawn 0.2 (days 1–3
test 18) → current earned 0.8. Matches the on-chain read exactly.
No double deduction, no cross-buyer contamination: every buyer's
balances match only its own calls. The contract handled two
concurrent demo runs correctly. The parallel run should be
confirmed with whoever launched it (possible duplicate kickoff).

## Still gated / not done

- Day-7 judge replay gate (test 19 as a gate with README do-X-see-Y
  steps, run by a fresh buyer): the replay MODE is now proven
  end-to-end, but the README steps do not exist yet (days 12–13).
- Third-party seller dry run (prep/06 Part 2 fix 3): not done;
  scheduled before the freeze.
- Dashboard (days 6–7): no dashboard displays these explorer links
  yet. The tx links above are the raw evidence for it.
- Seller withdrawal of the earned balance: NOT withdrawn in this
  run (earned is left on the contract; `withdraw()` remains
  testnet-NEAR-only, per the freeze).
- No mainnet anything, no repo made public, no X post, no
  submission. No secrets in this repo.
