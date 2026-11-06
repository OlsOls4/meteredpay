# MeteredPay

Seller-side pay-per-call on NEAR testnet — pay only for successful
agent API calls, with over-budget calls refused on-chain and failed
calls released (held amount released, never deducted).

**NEAR TESTNET ONLY. No production-network funds move in this demo.
No intent-based settlement is used. Testnet NEAR has no real-world
value.**

- Demo dashboard: `dashboard/` (static; open `dashboard/index.html`
  or serve it — see §2.3)
- Contract on the testnet explorer:
  https://testnet.nearblocks.io/address/apathetic-party.testnet
- Seller-API spec: `seller-api/SELLER_SPEC.md`
- Glossary (frozen wording): `GLOSSARY.md`
- Video / X demo post: video recorded 5 Nov 2026; X demo post drafted,
  to be published by the human team lead before submission
  (draft: `X-CAPTION-DRAFT.md`, 256 chars)

## 2.1 Problem

Agent services are sold as subscriptions: the buyer pays for time
whether the call worked or not. A buyer that lets an agent call
charged APIs freely risks paying for failures and for calls beyond
its budget.
MeteredPay moves that enforcement into a testnet contract: deduction
happens only on a buyer-verified success receipt, the budget is a
contract cap, and a failed call is released — held amount released,
never deducted.

The x402 distinction (corrected — see Council wave 3, R1, and final
council, researchers F-R1b): x402 lets agents pay for APIs, and its
newer `auth-capture` scheme can hold funds in escrow — but the
guarantee lives outside any contract the payer can verify and replay.
x402's `authorization` flow (the default, preferred) settles only
after the resource handler succeeds, and `auth-capture` holds funds
in escrow with capture, void, or refund needing the seller's consent,
relayed by a facilitator — the party being paid decides whether it
gets paid. MeteredPay inverts that: the seller cannot mark its own
calls successful; only the buyer's verified, signed success receipt
triggers a deduction. Neither x402 scheme puts the success condition
in a contract the payer can verify and replay. Agent
Market holds job payments until a human accepts the work — but that
is a marketplace with disputes and a fee, not a per-call primitive.
Spend Guard, built in this same hackathon, caps what an agent may
spend — but it pays for failures inside the cap. MeteredPay is the
missing primitive: a NEAR contract where success itself is the
payment trigger. The buyer prepays, the contract deducts 0.1 testnet
NEAR only on a buyer-verified, payer-signed success receipt, releases
the hold on failure or timeout, and refuses over-budget calls
on-chain — and a judge can replay all four outcomes on the same
frozen testnet contract with a fresh deposit in ~5 minutes once
Node 24 and near-cli are installed (replay.sh full run measured
240 s); a first clean-machine replay is 15–45 min including
toolchain install. The claim
is the bundle — buyer-verified hash, payer-signed receipt, on-chain
cap refusal, buyer-claimed release, a 600 s backstop, and a
dispute-audit view — never the single word "success-conditional"
alone.

## 2.2 What it is

- **Buyer agent:** prepays testnet NEAR into the contract, sets a
  budget cap.
- **Seller agent API:** one deterministic JSON schema-validation
  service (`meteredpay-schema-validate`: validates a document
  against a fixed built-in schema — `quote`,
  `payment-instruction`, `invoice` — and returns valid/invalid +
  an error list + the SHA-256 of the canonical input), with success
  and fail modes, one fixed price per call (0.1 testnet NEAR). A
  document that fails validation is a failure, never a paid success.
  (Days 8–9 upgrade. The canonical recorded run in §2.5 is the
  freeze1011 run of 5 Nov 21:06 UTC on this schema-validation service
  with the failure-claiming buyer — same frozen contract, same final
  state 0.5 / 0 / 0.2 / 0.3 / 0.2.)
- **Contract:** holds the deposit, deducts per successful call, logs
  the call hash, refuses over-budget calls, refunds failed calls by
  releasing the hold, rejects double-claims. Frozen contract:
  `apathetic-party.testnet`.
- **Dashboard:** balance, budget, price per call, call log, explorer
  links, judge replay steps. Read-only — it never signs and never
  sends a transaction.

```
buyer → seller API → success receipt (buyer-verified, payer-signed)
        → contract deducts 0.1 testnet NEAR
     or timeout / no receipt → buyer submits a failure/timeout claim
        → contract releases the held amount (never deducted)
     or over budget → contract refuses before any deduction
```

## 2.3 How to run it locally

### Prerequisites

- **Node 24** (buyer script + seller API; built with Node 24.22.1).
  Install from https://nodejs.org (LTS) or with nvm:
  `nvm install 24 && nvm use 24`.
- **near-cli-rs 0.30.1** (testnet account creation + contract calls).
  Install: `cargo install near-cli-rs --version 0.30.1`
  (needs Rust; or download the release binary from the near-cli-rs
  releases page).
- **A testnet account funded from the faucet.** Create one free with
  the faucet-sponsored flow (testnet only):
  ```bash
  near account create-account sponsor-by-faucet-service <buyer>.testnet \
    autogenerate-new-keypair save-to-legacy-keychain
  ```
  This writes the key to `~/.near-credentials/testnet/<buyer>.json`,
  which the buyer script reads. The faucet funds the new account with
  testnet NEAR. The command is interactive — run it in a terminal, not
  in a script. Alternative: create an account at
  https://testnet.mynearwallet.com and fund it from
  https://near-faucet.io.
- Your wallet needs faucet testnet NEAR **beyond the 0.5 deposit**:
  every contract call costs testnet gas (100 Tgas per call, roughly
  0.001–0.01 testnet NEAR per call). The faucet-sponsored flow funds
  a new account with **10 testnet NEAR** (verified: a learning
  account created the same way held ~9.999 after a deploy; see
  prep/08). The demo's total gas budget is the 0.5 deposit plus gas
  for ~11 contract calls (deposit, cap, 3 requests, 2 deductions,
  2 releases, 1 refusal) — roughly 0.01–0.11 testnet NEAR of gas, so
  ~0.51–0.61 total against the 10 NEAR grant: you will not run out
  of testnet NEAR. Testnet NEAR has no real-world value.
- No charged key, account, or service is needed. Zero cost.

### Commands

```bash
git clone https://github.com/OlsOls4/meteredpay && cd meteredpay
cd seller-api && node server.mjs              # demonstrator seller on http://127.0.0.1:8787
# Expected first output: "[seller] contract apathetic-party.testnet confirmed: seller=tedious-sea.testnet price=100000000000000000000000 yoctoNEAR timeout=600s"
# (in a second terminal)
cd buyer && npm install                       # near-api-js 7.4.0 (already in buyer/node_modules if cloned with it)
node buyer.mjs --buyer <buyer>.testnet --mode demo --tag demo
# Expected: "=== DEMO COMPLETE (TESTNET ONLY) ===" and exit 0
#   Buyer <buyer>.testnet: deposit=0.5000 testnet NEAR held=0.0000 spent=0.2000 available=0.3000 cap=0.2000
cd .. && python3 -m http.server 8080   # open http://127.0.0.1:8080/dashboard/
# Serve from the REPO ROOT (not from dashboard/): the footer links to
# ../GLOSSARY.md and ../README.md resolve to /GLOSSARY.md and
# /README.md, which return 200 only when the repo root is served.
# Serving from dashboard/ itself leaves both footer links 404.
# Or open dashboard/index.html directly — the recorded run (S1) renders with zero network requests.
```

Note: `--api` selects the seller endpoint only — the frozen contract
pays only `tedious-sea.testnet`; pointing it at a third-party seller
URL yields released `invalid_response` claims, never a deduction
(see `buyer/README.md`).

Local-run fallback: if the hosted dashboard is down, the same flow
runs entirely locally against the same frozen contract with the
commands above. The dashboard also works from static files alone.

### Troubleshooting

- Seller not running: start the seller first (`cd seller-api &&
  node server.mjs`) — the buyer fails fast if `http://127.0.0.1:8787`
  is down; check it answers with `curl http://127.0.0.1:8787/health`.
- Faucet failure: if `sponsor-by-faucet-service` fails, create the
  account at https://testnet.mynearwallet.com and fund it from
  https://near-faucet.io instead.
- near-cli install failure: `cargo install near-cli-rs --version
  0.30.1` needs Rust; without it, download the release binary from
  the near-cli-rs releases page.
- Wrong Node version: the buyer needs Node 24 (`node --version`);
  use `nvm install 24 && nvm use 24` if yours is older.
- Buyer key not found: the buyer reads
  `~/.near-credentials/testnet/<buyer>.json` — re-run the faucet
  flow in §2.3 if that file is missing.

## 2.4 The money rules (the contract, in plain language)

1. Deposit first; the contract never deducts more than the deposit.
2. A call is charged only when the buyer verifies the response hash
   and submits a payer-signed success receipt.
3. The seller can never mark its own calls successful and receive a
   deduction.
4. A failed call, or a call with no receipt before timeout, is
   released: the held amount is released, never deducted.
5. A call that would exceed the budget is refused on-chain; the
   balance does not change.
6. The same success receipt cannot be claimed twice (double-claim
   test, Step 7).

Five numbers, always together, labelled "testnet NEAR": Deposited,
Held, Spent, Available, Budget cap. Invariant:
`available = deposit − spent − held`. These are contract balances.
Your wallet balance will differ by testnet gas paid for your own
transactions, shown separately on the explorer.

**30 s vs 600 s:** the buyer waits 30 s for a seller receipt
(`BUYER_WAIT_MS`); if none arrives it submits a timeout claim at
once. The 600 s backstop (`call_timeout_seconds`) is the contract
deadline after which anyone may call `expire_call` to release a hold
the buyer never claimed. A call can never be held forever.

## 2.5 Do-X-see-Y steps (the core of the README)

Setup values (frozen): contract `apathetic-party.testnet`, price per
call **0.1 testnet NEAR**, demo deposit **0.5 testnet NEAR**, budget
cap **0.2 testnet NEAR**, seller API `http://127.0.0.1:8787`
(demonstrator seller, local) — or a hosted seller URL in
`dashboard/config.js`. Start the seller first (§2.3), then run the
buyer script with a fresh testnet account. One command runs Steps
1–6 below in order (demo mode); the frozen replay script
(`--mode replay`) runs deposit, two successes, refusal only.

Toolchain for every step below: Node 24 (see §2.3 Prerequisites) —
the same Node 24 the buyer script and seller API are built with.

**Canonical replay.** The steps below, the dashboard (S1 playback and
S5 steps), and `dashboard/frozen-run.json` all describe ONE run: the
freeze1011 run of 5 Nov 2026 21:06 UTC, fresh buyer
`freeze1011-buyer.testnet`, on the frozen contract with the
schema-validation seller (`meteredpay-schema-validate`) and the
failure-claiming buyer — Test 19 shape: success → fail → timeout →
success → refusal. Run log:
`buyer/runs/demo-freeze1011-buyer.testnet-2026-11-05T21-06-50.jsonl`.
Every transaction hash below is copied verbatim from that log; the two
success response hashes were re-proven by recomputing them from the
deterministic demo inputs with `shared/canonical.mjs`. The steps are in
execution order, identical to dashboard S5.

**A second, separate recorded run.** The video's recorded run used
buyer `mp-video05.testnet` on the same contract — a separate run,
documented in `video/video-run-log.md`, not the canonical replay. Its
hashes differ from the ones below; that is expected, not a
contradiction.

**Step 1 — Deposit.**
- Do: `node buyer/buyer.mjs --buyer <buyer>.testnet --mode demo --tag demo`
  (the script deposits 0.5 and sets cap 0.2 first).
- Or deposit and set the cap yourself with near-cli (copy-pasteable,
  testnet only — verified with a real manual run, days 8–9):
  ```bash
  near contract call-function as-transaction apathetic-party.testnet deposit json-args '{}' prepaid-gas '100.0 TeraGas' attached-deposit '0.5 NEAR' sign-as <buyer>.testnet network-config testnet sign-with-keychain send
  near contract call-function as-transaction apathetic-party.testnet set_budget_cap json-args '{"budget_cap": "200000000000000000000000"}' prepaid-gas '100.0 TeraGas' attached-deposit '0 NEAR' sign-as <buyer>.testnet network-config testnet sign-with-keychain send
  ```
  (Replace `<buyer>.testnet` with your fresh testnet account; the
  key must be in `~/.near-credentials/testnet/` — the faucet flow in
  §2.3 writes it there. Then run the calls with
  `node buyer/buyer.mjs --buyer <buyer>.testnet --mode demo --tag demo --skip-setup`,
  which skips the script's own deposit/cap and asserts the manual
  ones match 0.5 / 0.2.)
- See: balance shows deposited 0.5, held 0, spent 0, available 0.5,
  cap 0.2.
- Proof: deposit and cap transactions on the explorer (canonical run:
  https://testnet.nearblocks.io/txns/CtfwLvXzcF6bMW4TaQgA8gk8hjKBaSJU9zF3ekDjuzdD
  and https://testnet.nearblocks.io/txns/GhjJCVkPf3YL38ZBJTemmdjHo4dZup7Cd3hH8nPesqHN
  — your run has its own hashes).

**Step 2 — Success deducts.**
- Do: one success call (the demo script does this first).
- See: call log shows one SUCCEEDED entry; spent rises by exactly
  0.1; available falls to 0.4.
- Proof: request and deduction transactions (canonical run:
  https://testnet.nearblocks.io/txns/8UKh7z4zhkhPfPnQhwAi3iajynijjmLMbewDPqSVGgE
  and https://testnet.nearblocks.io/txns/BD3fkPVQNBBPjroxS85y3Bam2GK87TxDKSiFMVehC3Zd).
  Response hash `58aa417c4bd47cec7d786f9381fb8a54aeb08585933b06f692afe2fab19b65be`.

**Step 3 — Fail releases.**
- Do: one fail call (the demo script does this second).
- See: call log shows one FAILED entry; balance is unchanged from
  the end of Step 2; spent still 0.1, available still 0.4. The buyer
  submits a failure claim; that claim releases the hold. There is no
  deduction transaction for this call.
- Proof: request and release transactions (canonical run:
  https://testnet.nearblocks.io/txns/3fJJUvQj37xgym8Ra9tW6geBt99mwU735JFvifDvmmWu
  and https://testnet.nearblocks.io/txns/3a6juX9uJHB5fr2C9emqfR82jJD8nijCnb4k1TPwQo9e).

**Step 4 — Timeout releases.**
- Do: one timeout call (the demo script does this third); wait 30 s.
- See: call log shows FAILED — no receipt received: held amount
  released, never deducted; balances unchanged; spent still 0.1.
- Proof: request and release transactions (canonical run:
  https://testnet.nearblocks.io/txns/EKjUSkPVXvVHe8VcZArjMMJF1cG1dGNeiPnmLWHdhMkU
  and https://testnet.nearblocks.io/txns/C2EXM52zH62Y4JZ6ZaqF6DCo2tXuhW369dYhTKnStycB).

**Step 5 — Success deducts again.**
- Do: one more success call (the demo script does this fourth).
- See: call log shows a second SUCCEEDED entry; spent rises to 0.2
  (= cap), available falls to 0.3. Spent now 0.2 = cap — the next call
  will be refused.
- Proof: request and deduction transactions (canonical run:
  https://testnet.nearblocks.io/txns/4rzhEpkJGUgSNupKXXdFWHtkfCzywzTNoxF9kZeL1rnL
  and https://testnet.nearblocks.io/txns/C34RNjN1r2MJmona6ZRYNEc6UdrVwQYTaoRdXFvkYGUb).
  Response hash `c8516657a12d2deaaf405c73174f6f8a4a6cd728b4bf4d53c7b9b9f9e8102dfd`.

**Step 6 — Over budget refused.**
- Do: one more success call after spent reaches the 0.2 cap (the
  demo script does this last).
- See: call log shows one REFUSED entry with the reason
  `over_budget` (verbatim); balance is unchanged; no seller call is made.
- Proof: refusal transaction (canonical run:
  https://testnet.nearblocks.io/txns/ESem4KumVHwC7FfT6TT2aqrcsi4R1jGfFt66LhDTZ2qm).
  This is a successful transaction with an on-chain refusal record —
  not a failed transaction.

**Step 7 (appendix) — Double-claim is rejected.**
- Do: resubmit the success receipt from Step 2 (see
  `BUILD_NOTES.md`, test 3 — the buyer script does not offer this as
  a button; it is an edge test, not a normal buyer action).
- See: contract rejects it; balance is unchanged; the call stays
  `success-deducted`.
- Proof: rejection transaction (recorded run, days 8–9 capture with
  buyer `dblclaim89-buyer.testnet`; genuine success
  https://testnet.nearblocks.io/txns/J38Yv44yYzPb4fEPMCwuvppPfeKZRFPwMcaLvqZwdram,
  replayed receipt rejected:
  https://testnet.nearblocks.io/txns/BDjGCqN7LWPqEuhgL523YLAgAy2M4MZvAFrtpK9qTiRU
  — on-chain status Failure, "Smart contract panicked: Call is not
  in paid state", balances unchanged). The days 1–3 test-3 replay was
  rejected the same way ("Call is not in paid state"); its rejection
  tx hash was not captured at the time, so the days 8–9 capture above
  is the linked proof.

Final state after the demo run: deposit 0.5 / held 0 / spent 0.2 /
available 0.3 / cap 0.2.

**Canonical replay — transaction table (freeze1011 run, 5 Nov 2026
21:06 UTC).** The same run as the step proofs above, in one table;
`dashboard/frozen-run.json` is the machine-readable form of it.

| Step | Tx |
|---|---|
| Deposit 0.5 | https://testnet.nearblocks.io/txns/CtfwLvXzcF6bMW4TaQgA8gk8hjKBaSJU9zF3ekDjuzdD |
| Set cap 0.2 | https://testnet.nearblocks.io/txns/GhjJCVkPf3YL38ZBJTemmdjHo4dZup7Cd3hH8nPesqHN |
| Request success-001 | https://testnet.nearblocks.io/txns/8UKh7z4zhkhPfPnQhwAi3iajynijjmLMbewDPqSVGgE |
| Success deducts | https://testnet.nearblocks.io/txns/BD3fkPVQNBBPjroxS85y3Bam2GK87TxDKSiFMVehC3Zd |
| Request fail-001 | https://testnet.nearblocks.io/txns/3fJJUvQj37xgym8Ra9tW6geBt99mwU735JFvifDvmmWu |
| Failure releases | https://testnet.nearblocks.io/txns/3a6juX9uJHB5fr2C9emqfR82jJD8nijCnb4k1TPwQo9e |
| Request timeout-001 | https://testnet.nearblocks.io/txns/EKjUSkPVXvVHe8VcZArjMMJF1cG1dGNeiPnmLWHdhMkU |
| Timeout releases | https://testnet.nearblocks.io/txns/C2EXM52zH62Y4JZ6ZaqF6DCo2tXuhW369dYhTKnStycB |
| Request success-002 | https://testnet.nearblocks.io/txns/4rzhEpkJGUgSNupKXXdFWHtkfCzywzTNoxF9kZeL1rnL |
| Success deducts | https://testnet.nearblocks.io/txns/C34RNjN1r2MJmona6ZRYNEc6UdrVwQYTaoRdXFvkYGUb |
| Over-budget refused | https://testnet.nearblocks.io/txns/ESem4KumVHwC7FfT6TT2aqrcsi4R1jGfFt66LhDTZ2qm |

This run is the proof that the days 8–9 changes did not break the
judge replay: same contract, same steps, same final state. Final
balances verified on-chain via `get_buyer_balance`: deposit 0.5 /
held 0 / spent 0.2 / available 0.3 / cap 0.2. Seller earned 2.0
testnet NEAR (cumulative across all buyers), withdrawn 0.2.

**Replay wall-clock (measured 5 Nov 2026).** Full replay
(`./replay.sh`) measured **240 s (~4 min)** once Node + near-cli
are installed (faucet account creation ~10 s + demo itself
~230 s: 10 contract calls + one 30 s timeout wait; allow up to
~6 min for testnet block times). Verify-only
(`./replay.sh verify-only`) took **42 s** for an 11-tx demo run
log. A first replay on a clean machine is **15–45 min including
toolchain install** (Node 24, near-cli-rs 0.30.1, Rust for the
`cargo install` route) — the 240 s figure is the replay itself,
not the all-in first-run time.

**Independent stranger replay (5 Nov 2026 23:32 UTC).** A replay
run with only the README as written and `./replay.sh` — fresh faucet
buyer, no `--buyer`, no manual buyer-script invocation, no builder
help, no prior account state (the seller was not running; the script
started it). Fresh buyer `mp-replay-dll6s7.testnet`, plain
`./replay.sh` with no arguments, exit 0, `REPLAY OK in 240s`.
Final balances verified on-chain via `get_buyer_balance`:
deposit 0.5 / held 0 / spent 0.2 / available 0.3 / cap 0.2.
All 11 txs re-checked with `./replay.sh verify-only`: 11/11 OK
(48 s). Run log:
`buyer/runs/demo-mp-replay-dll6s7.testnet-2026-11-05T23-32-03.jsonl`.
(Note: run on the build VM with the toolchain already installed, so
240 s is the replay itself — a first clean-machine replay is
15–45 min including toolchain install, as above.)

| Step | Tx |
|---|---|
| Deposit 0.5 | https://testnet.nearblocks.io/txns/4v5ibtC4kY37XgKcxCGCLUSYkp7FdsC6PtvgHKezRmJq |
| Set cap 0.2 | https://testnet.nearblocks.io/txns/2uR8a19aMKZrsTybXaz6rxiQgBx7eDi34qjRcuyzYFPw |
| Request success-001 | https://testnet.nearblocks.io/txns/BzpoMdoTFz8UUtac8W5VfkiAGy529UEd3kT2YbsJv1d3 |
| Success deducts | https://testnet.nearblocks.io/txns/4xxJxRdCD1AS5Fs2atgRTbbzgQzRoAgaLdBdvD6hM7KK |
| Request fail-001 | https://testnet.nearblocks.io/txns/5hyD6qrzhvfF7GKjeFfnMH6jL4DYLyfMK71LmRbTMcQJ |
| Failure releases | https://testnet.nearblocks.io/txns/8iP2G6pBGnwuurazLkNpHxqAfetUDHxoeFdet8PRWdu1 |
| Request timeout-001 | https://testnet.nearblocks.io/txns/4YoWgSuPgU1BtKw8iDc9Fg8RCkVFTFeJZDzhKmuwQi8g |
| Timeout releases | https://testnet.nearblocks.io/txns/2HRjWMmvHtRj3C6MZKQsdanjTZzNP6NAMZE4TPP7TN1z |
| Request success-002 | https://testnet.nearblocks.io/txns/12uFL8zppUQibecKxPvssWrSz5Sou4eR6w1DCdzji6ve |
| Success deducts | https://testnet.nearblocks.io/txns/JB3rWtYrmdFs2oHwNSmtVKQcW4AiMSHkWzaHG3ThdKvM |
| Over-budget refused | https://testnet.nearblocks.io/txns/FGWkKswnS8KnRUZthB29BfjKS4UjnRX3WupfasfDxWA |

This is the proof a judge can reproduce the demo from the README
instructions alone, with no builder involvement: same contract, same
steps, same final state, a fresh buyer.

## 2.6 Judge replay (during 16–18 Nov judging)

- The frozen contract is `apathetic-party.testnet` and stays live on
  testnet. The same text is on dashboard S5.
- A judge needs only: a testnet account (faucet-funded, §2.3), this
  repo, and Steps 1–6 above. No key, token, or permission from the
  builder. The dashboard is read-only; the buyer script runs locally
  with the judge's own key.
- Fresh-buyer path: run the buyer script with a fresh testnet account
  and repeat Steps 2–6. The contract state is per-buyer, so one
  judge's replay does not disturb another's.
- If the hosted dashboard is unavailable, run locally per §2.3
  against the same `apathetic-party.testnet`.
- What a successful replay proves: the same contract, not a fresh
  redeploy, still enforces the bundle — deduction only on a
  buyer-verified, payer-signed success receipt, releases on
  failure/timeout, and on-chain refusals.
- Keep the demo live through judging (16–18 Nov).

## 2.7 "What is NOT claimed" honesty box

- Testnet only. No production-network NEAR, stablecoin, or fiat moves
  in this demo.
- The seller is a demonstrator service built for this hackathon, not a
  live seller listing with independent sellers. The seller-API spec is
  public so a third party could run a seller, but none has yet — and
  the frozen contract registers exactly one seller at init, so a
  third-party seller implementing the spec cannot receive a deduction
  from THIS contract (see `seller-api/SELLER_SPEC.md` Appendix A1).
- Multi-seller is NOT live on the frozen contract: it registers
  exactly one seller (`tedious-sea.testnet`). But two sellers ARE
  now proven paid on parallel instances of the same wasm, deployed
  and proven end-to-end 6 Nov 2026 — `mp-meteredpay-a.testnet`
  (seller `tedious-sea.testnet`) and `mp-meteredpay-b.testnet`
  (seller `mp-seller2.testnet`, its first-ever paid deduction).
  Full evidence in `MULTI_SELLER_APPENDIX.md`; the runbook
  (`MULTI_SELLER_RUNBOOK.md`) was executed, not just specified.
  The frozen contract remains the judge-replay target, and no
  single contract holds two sellers — a shared-deposit
  multi-seller contract would need a code change (runbook Path B),
  not done.
- No intent-based settlement is used in the demo path. No cross-chain
  settlement is claimed.
- No language-model component, charged API, or charged hosting is used
  in the default demo path. The agent logic is deterministic contract
  rules plus local verification.
- No claimed adoption figures exist or are claimed.
- Buyer dishonesty is NOT solved: a buyer could claim failure after a
  genuine success. The design protects the buyer from paying for
  failure; it does not protect the seller from a dishonest buyer. The
  dashboard S5 dispute-audit view detects disagreement between the
  seller attestation and the buyer claim; it does not prevent it.
- The prize payout address on the submission form is a
  production-network NEAR account supplied by the human team lead.
  It is not used by the demo.
- Deploy transaction: not recorded (known gap). The deployment is
  proven by the on-chain code hash matching the built wasm SHA-256
  `c54ae8e9d657338ccc695d32689fac322aaa1d77b90fd90e0ed63f86decbb3b0`
  (see `BUILD_NOTES.md`); do not link a wrong transaction as the
  deploy. Recovery was attempted once more on 5 Nov 2026 (freeze
  prep): the testnet explorer account page returned 403, and the
  explorer API account endpoints (`/v1/account/apathetic-party.testnet/txns`,
  `/activities`, `/receipts`) all returned empty arrays — the
  indexer is not serving this account's history. No further recovery
  attempt is planned; the position above stands.

## 2.8 Repo map

- `src/` — contract source (Rust), unit tests (`cargo test --lib`).
  Build only with `cargo near build non-reproducible-wasm`.
- `seller-api/` — deterministic demonstrator seller API (`server.mjs`,
  zero dependencies) + open spec (`SELLER_SPEC.md`).
- `buyer/` — buyer script (`buyer.mjs`, `demo` and `replay` modes)
  + run logs in `buyer/runs/*.jsonl` (tx hashes + explorer links only).
- `shared/` — canonical JSON / SHA-256 / ed25519 helpers + self-test.
- `dashboard/` — static dashboard (S1–S5), `DEPLOY.md`,
  `verify.mjs` (headless check: `node dashboard/verify.mjs`).
- `seller-api-dryrun/` — independent third-party seller written from
  the spec alone (days 6–7 dry run; see its README).
- `MULTI_SELLER_RUNBOOK.md` — the specified redeploy path to two
  sellers: two contract instances from the same wasm, one seller
  each, with the Test 19 re-run checklist. EXECUTED 6 Nov 2026 —
  see `MULTI_SELLER_APPENDIX.md` for the proof.
- `MULTI_SELLER_APPENDIX.md` — the executed multi-seller
  successor (proven 6 Nov 2026): `mp-meteredpay-a.testnet` and
  `mp-meteredpay-b.testnet`, every tx hash with explorer links.
- `seller-api/second-seller.json` — second seller
  (`mp-seller2.testnet`, public key only, no private key material):
  now registered at init on `mp-meteredpay-b.testnet` and proven
  paid there 6 Nov 2026.
- `GLOSSARY.md` — frozen terminology. `BUILD_NOTES.md` — internal
  build record (frozen parameters, signature formats, testnet
  results). `DAYS4-5-RUNLOG.md` — days 4–5 proof run.
- `LICENSE` — MIT.

## 2.9 Tracks and NEAR fit

Each line below quotes the organiser's published track description,
then states what MeteredPay honestly carries against it. Track order
is agents, open, business, security, defi — agents first, defi last.

- `agents` — "Build agents that earn, spend, negotiate, hire other
  agents and pay for APIs, compute or data — with crypto directly or
  through NEAR Intents." MeteredPay: one agent earns (seller) and one
  spends (buyer) for API calls, and payment is tied to a delivered
  result. No Intents are used.
- `open` — "Have an idea that refuses to fit a category? Explore new
  ways for money, intelligence and ownership to work together."
  MeteredPay: success-only
  metering as a new way for agent services to charge — a
  single-seller metering primitive: the buyer prepays, the contract
  deducts only on a buyer-verified success receipt, releases the hold
  on failure, and refuses over-budget calls on-chain. The multi-seller
  successor is proven, not just specified: the same wasm deployed as
  two parallel instances, one seller each, both proven end-to-end
  6 Nov 2026 — see `MULTI_SELLER_APPENDIX.md`.
- `business` — "Build AI-native businesses with treasury, sales,
  procurement, cross-chain payments via NEAR Intents and revenue
  sharing. Humans only set the constraints." MeteredPay has no
  business, no treasury, no revenue sharing, and no Intents — the
  most it honestly carries is one clause: agent-service monetisation,
  price per successful call, no subscription lock-in.
- `security` — "Build spending limits, policy engines, sandboxed
  wallets, reputation and scam detection. Give AI money without
  giving it the keys to everything." MeteredPay carries only the
  first item, in its narrow form: the contract enforces the buyer's
  spending limit — a call past it is refused on-chain, and a
  deduction needs the buyer's signed success receipt. No policy
  engine, no sandboxed wallet, no reputation or scam detection, no
  function-call keys, and no prompt-injection defence are claimed.
- `defi` — "Build exchanges, perps, lending, vaults and trading
  agents that settle across chains through NEAR Intents. Deep liquidity,
  no custodian, nobody to switch it off." MeteredPay
  is only a settlement primitive here: an on-chain escrow-like
  deposit with contract-enforced metering, release and refusal. No
  trading, lending, or intent-based execution is used or claimed.

### Related work — outcome-gating vs attempt-gating

"Spending limits" is now table stakes: several entries in this
hackathon cap what an agent may spend. MeteredPay differs by
mechanism, not by having a cap: it gates payment on the OUTCOME of
the call, not on the ATTEMPT. A capped attempt still pays for a
failure; a MeteredPay call pays only when the buyer verifies a signed
success receipt.

- NEAR Agent Spend Guard (same hackathon): attempt-gating — a Rust
  contract holding native NEAR with receiver allowlists, per-tx/daily
  caps, approval thresholds, pause, and a function-call key scoped to
  `spend`. Its `spend` transfers on attempt, with no success
  verification, no receipt, and no refund-on-failure. MeteredPay has
  no function-call keys and no prompt-injection demo; what it has
  instead is the layer Spend Guard lacks: deduction only on a
  buyer-verified success receipt, with the hold released on failure.
- Veto-cluster (Veto, Semilla1 Guard, Allowance, LeashPay — names
  from the organiser build log): named only; their mechanisms are
  unverified here, so no mechanism claim is made about them.
- MPP-NEAR: a 402 rail — pay per call, settles the quoted price, with
  no outcome condition on whether the call succeeded.
- PingPay: lets agents pay x402 paywalls in USDC on Base, settling to
  a NEAR recipient via Intents — a rail, not a success condition.
- OutLayer: policy/custody (TEE + MPC) on mainnet; MPP-NEAR is powered
  by it. MeteredPay is testnet-only and puts no custody or policy
  engine between buyer and contract.
- Agent Market: job escrow — payment held until a human accepts the
  work, a marketplace with disputes and a fee, not a per-call
  primitive.

No rival above is claimed to do anything unverified; where a mechanism
could not be verified (Veto-cluster), that is stated, not assumed.
Rival repo URLs are not repeated here — none was verified in this
pass, and no URL is invented.

The x402 distinction: x402's `authorization` flow settles only after
success and `auth-capture` holds funds in escrow with capture, void,
or refund needing the seller's consent, relayed by a facilitator —
the party being paid decides whether it gets paid. MeteredPay inverts
that: the seller cannot mark its own calls successful; only the
buyer's verified, signed success receipt triggers a deduction.
Neither x402 scheme puts the success condition in a contract the
payer can verify and replay. MeteredPay's
claim is the bundle, not the single word "success-conditional":
buyer-verified hash, payer-signed receipt, on-chain cap refusal,
buyer-claimed release, a 600 s backstop, and a dispute-audit view.

Why testnet: the demo must be replayable by judges at $0, and
intent-based execution has no testnet, so it is excluded rather
than faked.

## 2.10 Limitations and future work (honest, short)

- Single seller, single price. Multi-seller discovery, dynamic
  pricing, and SLA penalties were cut deliberately.
- The success receipt relies on the buyer verifying the response hash;
  a buyer that signs blindly defeats its own protection.
- The frozen contract has no register-seller method; third-party
  sellers need a redeploy or a future multi-seller version.
- Future work (not claimed as done): independent sellers via the
  public spec — the redeploy runbook (`MULTI_SELLER_RUNBOOK.md`)
  was EXECUTED 6 Nov 2026 as a parallel appendix (two instances,
  one seller each, both proven end-to-end; see
  `MULTI_SELLER_APPENDIX.md`). What is still future work is a
  single contract holding several sellers with a shared buyer
  deposit (runbook Path B, a code change). Also:
  seller withdrawal polish, production-network deployment
  only with the human's explicit confirmation and funding decision.
- Future work (not integrated): MeteredPay as the per-call settlement
  primitive a $1/call Agent Market-style agent would need — an agent
  charging per call could settle each call through this contract
  instead of holding job payments until a human accepts them. No
  integration with Agent Market exists or is claimed; this is future
  work, not integrated.

## 2.11 Multi-seller successor (appendix, proven 6 Nov 2026)

The frozen contract registers exactly one seller, so "two sellers"
here means two contract instances deployed from the same wasm, each
initialised with one seller. Both were deployed and proven end-to-end
on NEAR testnet 6 Nov 2026, $0, no mainnet — full evidence (every tx
hash with explorer links) in `MULTI_SELLER_APPENDIX.md`:

- `mp-meteredpay-a.testnet` — seller `tedious-sea.testnet`,
  deploy+init tx `EXnxJ3Jne2qZf7ZbAypmxi7LUTAgJ8AZJ5R8UDyd1D3V`.
  Fresh buyer `mp-l1a-buyer.testnet`, final 0.5/0/0.2/0.3/0.2.
- `mp-meteredpay-b.testnet` — seller `mp-seller2.testnet`,
  deploy+init tx `8J3X5o4PRgmW3ZnYW5ncF7HEKPPQ56mLAieCMRsWZsa2`.
  Fresh buyer `mp-l1b-buyer.testnet`, final 0.5/0/0.2/0.3/0.2 —
  the first deduction ever paid to `mp-seller2.testnet`.
- Same wasm on all three contracts (frozen + both successors):
  SHA-256 `c54ae8e9d657338ccc695d32689fac322aaa1d77b90fd90e0ed63f86decbb3b0`.
  A success receipt signed by the other seller's key was rejected
  on-chain on both instances ("Invalid seller signature"), proving
  the two instances are really separate sellers.
- The frozen contract `apathetic-party.testnet` is untouched and
  remains the judge-replay target (§2.5, §2.6). No buyer deposit is
  shared across sellers — that needs a code change (runbook Path B),
  not done.
