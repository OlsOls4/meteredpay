# MeteredPay — INTERNAL BUILD NOTES (days 1–3, contract)

INTERNAL ONLY. This is NOT the submission README. The submission README
(days 12–13) is written separately and checked against the day-1
glossary. Nothing in this file is user-facing copy.

## Status

- Contract: `src/lib.rs`, single seller, single price, testnet only.
- Repo: local git only, NO remote, NOT pushed, NOT public. Repo-local
  git identity: user.name "Olly McBride", user.email
  ollymcbride4@gmail.com (his submission repo; chosen so a later push
  attributes to Olly — flag to Olly before any push, which still needs
  his explicit approval).
- No secrets in this repo. Keys live only in ~/.near-credentials/
  (legacy keychain files) and are never copied here. No submission
  payload anywhere in this repo.

## Accounts (NEAR testnet only, zero cost)

- Contract account: apathetic-party.testnet (created 2026-11-01,
  creation tx 55cCqHwAc67rFNJk94YR55TCjqxc2ZZG2eA5uoC9z8Bf, 10 testnet
  NEAR). NOT the prep toy account (heavenly-hook.testnet /
  talented-texture.testnet were never reused).
- Seller account: tedious-sea.testnet (created 2026-11-01, creation tx
  7SZnrdxdgugrdEoSYFQXYnyyQBAKZ8KmyZSqPRgRX8Wh, 10 testnet NEAR),
  public key ed25519:6zG7yLp2jqHxfkXfYgsL1ZXSf2NVQoRRaib6im72ubnm.
- Buyer test accounts: created as needed for edge tests; see
  "Testnet edge-test results" below. Each verified on-chain
  (view_account RPC) before use.

## Frozen parameters

- price_per_call: 0.1 testnet NEAR = 100000000000000000000000 yoctoNEAR.
- call_timeout_seconds: 600 (backstop; buyer wait is 30 s in the buyer
  script, days 4–5).
- call_timeout_seconds bounds fixed at build time: 60–86400 s.
  Anything outside is rejected at init.
- Seller public key is stored at init (init arg `seller_public_key`,
  "ed25519:<base58>"), validated at init. This is an extension of
  prep/04's 3-arg init: without it the contract could not really
  verify the seller attestation on-chain.

## Frozen signature message formats (canonical — days 4–5 buyer script
## MUST use exactly these; do not change after the day 10–11 freeze)

- len(p) = UTF-8 byte length of p, decimal, no padding.
- Seller attestation (UTF-8 bytes):
  `meteredpay-v1-seller|<len(call_id)>:<call_id>|<len(response_hash)>:<response_hash>`
- Buyer success (UTF-8 bytes):
  `meteredpay-v1-buyer-success|<len(call_id)>:<call_id>|<len(response_hash)>:<response_hash>|<len(price_yocto)>:<price_yocto>|<len(seller_account_id)>:<seller_account_id>`
  where price_yocto is the decimal yocto string of price_per_call
  (100000000000000000000000). Because the signed price is
  price_per_call, a claim for any other price fails verification.
- Seller error attestation (for submit_failure evidence, UTF-8 bytes):
  `meteredpay-v1-seller-error|<len(call_id)>:<call_id>|<len(seller_error_hash)>:<seller_error_hash>`
- Signatures: base64 (standard alphabet, with padding) of the raw
  64-byte ed25519 signature. response_hash: 64 hex chars (SHA-256 hex).
- Buyer signature is verified against env::signer_account_pk(), i.e.
  the key that signed the submit_success transaction. The buyer MUST
  sign the message with an ed25519 key (all faucet accounts are).
  The seller signature is verified against the key stored at init.
- Verification is real: env::ed25519_verify on-chain. No string
  comparison, no backdoor, no admin override, no seller-only path.

## Deviations from prep/04 (deliberate, documented)

1. init takes a 4th arg, seller_public_key (see above).
2. expire_call takes (buyer_account_id, call_id), not just (call_id):
   calls are keyed per buyer, so a third-party expiry (which prep/04
   explicitly allows) is impossible without naming the buyer.
3. Empty call_id is refused with reason `invalid_call_id`, not
   `duplicate_call_id`: prep/04 groups the non-empty check under the
   duplicate check, but an empty id is not a duplicate and a distinct
   reason is more auditable. Still a successful transaction with an
   on-chain refusal record; balances unchanged.
4. submit_failure with reason `timeout` resolves to
   `timeout-refunded` (test 4); other reasons resolve to
   `failed-refunded` (test 2). Prep/04's method list has no separate
   timeout method; the timeout claim IS submit_failure(reason=timeout).
5. withdraw() returns a transfer Promise, not a JSON struct: a
   Promise return carries no JSON value. Amount/balance are read via
   get_seller_balance after the transfer.
6. set_budget_cap requires an existing deposit (panics otherwise):
   allowing a cap before any deposit would poison the first-deposit
   cap default (cap would stay at the pre-deposit value).
7. Terminology: contract status `paid` = "Requested — price held"
   (glossary §1). Never "paid to the seller" in any copy.

## 18 fixes from prep/06 applied on day 1

C1 refund = held released, never deducted; C2 release only on buyer
claim or backstop expiry (no auto-refund); C3 price fixed at init, no
Set-price; C4 judge replay is the live proof, no seeded browser wallet
moving money; C5 Chain Signatures cut — plain testnet NEAR withdraw
only, nothing added after freeze except a critical security fix;
C6 five-number balances (deposit, held, spent, available, budget_cap)
with available = deposit − spent − held; C7 gas stated separately
(wallet balance differs by testnet gas, shown on the explorer);
C8 frozen replay script = deposit D, cap 2×price, two successes, third
refused (no mode button staging a refusal); C9 timeout in README step
6 (buyer wait 30 s, backstop 600 s); C10 cap rejection wording
("Budget cap cannot exceed your deposit" /
"Budget cap cannot be below what you have already spent"); C11 no red,
amber + words only; C12 terminology table above; C13 no LLM/reasoning
wording; C14 single X caption = prep/03 §4 (days 12–13); C15 no example
figures (0.5 in prep/01 is EXAMPLE ONLY, never ships); C16 name
tentative until submission (MeteredPay → PayOnProof → new name;
CallMeter REMOVED — direct collision, glossary §11 wins over prep/06's
mention); C17 rows truncated + copy + explorer link, detail full +
copy + explorer link; C18 one dashboard app, five views; cut order
SLA, multi-seller UI, Chain Signatures, dashboard polish; fallback
triggers day 7 / day 9 per glossary §12.

## Build

- Toolchain: rustc/cargo 1.99.1, cargo-near 0.22.0, near-cli-rs
  0.30.1, wasm32-unknown-unknown target, Node 24, near-api-js 7.4.0
  (test harness only, in ../test-tools, NOT in this repo).
- Build ONLY with: `cargo near build non-reproducible-wasm`
  (never bare `cargo near build`).
- Sandbox integration tests are known-broken in this VM: NOT used.
  Unit tests in src/lib.rs run under `cargo test` (mock env, real
  ed25519_verify) and everything else is proven on testnet.
- Unit tests: 24/24 pass (including a real unit-test fix found by
  the tests: duplicate refusals used to return the original paid
  record; record_refusal now always returns a `refused` outcome for
  the request itself without overwriting the stored call).
- Wasm SHA-256 (deployed): c54ae8e9d657338ccc695d32689fac322aaa1d77b90fd90e0ed63f86decbb3b0
  (bs58 EH9ZtfU7FbRNSFTDUqTZoE9gQ7jRQ5Qb7cWDoMuBRRGB; matches the
  on-chain code_hash). Size 173,928 bytes. An earlier build
  (362ccf74…, 174,057 bytes) was superseded by the record_refusal
  fix and was never deployed.
- Deploy: `near contract deploy apathetic-party.testnet use-file
  target/near/meteredpay.wasm with-init-call init ...` succeeded
  with init (seller tedious-sea.testnet, seller key above, price
  100000000000000000000000, timeout "600"). First deploy attempt
  failed on init arg encoding (U64 must be a JSON string, not the
  integer 600) and rolled back cleanly (code_hash stayed empty);
  the retry with "600" succeeded. Init verified on-chain via
  get_seller (returns exactly the init values). Re-init is rejected
  on-chain: "The contract has already been initialized".
- Deploy tx hash GAP (honest): the deploy CLI output was truncated
  (tail -12) before the tx hash was recorded, and the nearblocks
  account page returned 403 (not retried). Deployment + init are
  still proven on-chain (code_hash matches the wasm, get_seller
  returns init values). Every test tx below HAS its hash recorded.
  The day 12–13 team can link the deploy tx from the account page
  when explorer access works. All test tx links below use
  https://testnet.nearblocks.io/txns/<hash>.

## Testnet edge-test results (all on apathetic-party.testnet)

Amounts are yoctoNEAR strings; 0.1 testnet NEAR =
100000000000000000000000. A failed contract call is a REJECTION
(balances unchanged); a refusal is a SUCCESSFUL transaction with an
on-chain refusal record. Buyer A = superficial-trousers.testnet
(deposit 2 NEAR: two 1 NEAR deposits, one per phase-0 run — see the
t5 note below; cap ended at 1 NEAR). Buyer B =
unhealthy-shoes.testnet (deposit 0.5). Buyer C =
forgetful-credit.testnet (never deposited). Seller =
tedious-sea.testnet.

- Test 11 (seller-only success) PASS. Claim as buyer A with the
  seller's signature in the buyer slot → rejected "Invalid buyer
  signature", call stayed `paid`, balances identical before/after.
  Seller calling directly → rejected "Call not found". Cleanup
  releases: 4wHJvMcUoKwYLiJaToidYF8vzBhTDUN6f8vRHHAngoTy,
  46Lwv9D12pMbUYCUyoMWUa3JCcS8BvwRWwCwxDAc6mys.
- Test 3 (double-claim) PASS. Genuine success tx
  FtZx88fznGooXXZabbh6eUxEBoGPNqio17j4ekrE2RZF →
  `success-deducted`, spent 0.1, seller earned 0.1. Replayed receipt
  → rejected "Call is not in paid state", balances unchanged.
- Test 1 (over-budget) PASS. Cap set to 0.3 (tx
  Dq7Cp5pa849fHw1JPaCXDaRKstpT24myHpbigkULVXJC); t1a paid (tx
  p1KmEnLQFR4qRGocWmV5CbarpazokfPmg2b2W8TPDMt); t1b refused
  `over_budget` (tx 2faK6843KbzURmThcK7K4BdD6obkz7T9FM6jGrZb3vk2,
  successful tx, refusal record, balances unchanged). t1a released
  (tx EvvegVNwN4Z78G9Y5X2vabjfuv8gatxDTad41Z51HHFg).
- Test 16 (cap below deposit) PASS. t16a success (tx
  3vBbcWdMxUVYDjCwBuitMjJr8SWK1KUhFS9kwqrSvTLo), spent 0.2,
  spent+held = cap 0.3; t16b refused `over_budget` (tx
  56BHrWBkAXit8cRChaBbPXiBPtmUV1m8sEqujG7pCpDZ) even though the
  2 NEAR deposit alone would cover it. Balances unchanged.
- Test 2 (failed release) PASS. Cap raised to 1.0 (tx
  HAiM3wJn1R9wSrBTo6b2fXc2fL7qmbFZAVMQehzcdCph); t2-fail
  `failed-refunded` with real seller error signature (tx
  D3N2gsUakJnrC2gE26xj36LZaQH666LoQPFfgjW4A4C3), held released,
  spent and seller earned unchanged.
- Test 4 (timeout, fast claim) PASS. t4-timeout →
  `timeout-refunded` (tx 8CUsh16cPHA8oVTeRPdydB74JyMjSxZfTAMudYK7kEwa),
  held released, spent unchanged.
- Test 5 (backstop expiry) PASS, both halves. Expire before the
  600 s deadline → rejected "Call has not expired yet", call stayed
  `paid`. After the deadline, third party (buyer B) expire_call →
  `timeout-refunded` (tx 7C72vYNfthZJpCiQXN7dHwYDu1UriNWQJaikfHkXX5CE),
  held 0.1 → 0, spent unchanged.
- Test 6 (partial result) PASS. t6-partial treated as failure →
  `failed-refunded` (tx 3wLnmfvoQasaNhjMdeu2wPVE75awR7f46hyiCisZ7sVx),
  full hold released, spent unchanged: NO partial deduction exists.
- Test 7 (replayed receipt) PASS. t3-double's receipt submitted for
  t7-replay → rejected "Invalid buyer signature", t7 stayed `paid`;
  released afterwards (tx rS85SmR6crRWBN6bA1gtSPedWmBWpQ9dp59FjwjZsgP).
- Test 8 (wrong seller) PASS. Attestation signed by buyer B's key →
  rejected "Invalid seller signature", call stayed `paid`; released
  afterwards (tx B7j5BL48KVZowMKWHpdWab5nhdGtK7f1vZDvnEoUkNUM).
- Test 9 (zero deposit) PASS. Buyer C request → refused
  `insufficient_deposit` (tx CBwgGcR9GQsBTTyv9nfk8oN7nkP3YmZGrPEYChtDyYVo,
  successful tx), all C balances zero before and after.
- Test 10 (wrong buyer) PASS. Buyer B claiming A's call → rejected
  "Call not found", A's call stayed `paid`, both buyers' balances
  unchanged; A released afterwards (tx
  QafuinKAVEorGmHDms6zUXXX8FvcP4hUDf92M6xarSU).
- Test 12 (mismatched hash) PASS. Seller signed hash H1, claim used
  H2 → rejected "Invalid seller signature", call stayed `paid`;
  released afterwards (tx Ejcbo53mv2beQDjkih87dhFPA4S74RSA85nDaAdSH2q7).
- Test 13 (success after failure) PASS. Genuine success receipt for
  failed-refunded t2-fail → rejected "Call is not in paid state".
- Test 14 (failure/expire after success) PASS. Failure claim and
  expire_call on success-deducted t3-double → both rejected "Call
  is not in paid state"; seller earned unchanged.
- Test 15 (duplicate call id) PASS. Second request for t15a →
  refused `duplicate_call_id` (tx
  CyFrFAGECcsCsM7ykytnt6Kjws5FnRFghk5eG4Dkb6Fx, successful tx,
  balances unchanged). The stored call record stays `paid` by
  design (a duplicate refusal never overwrites the original call);
  the refusal itself is the on-chain refusal record, visible in
  list_refusals. Released afterwards (tx
  ErgQTkjxuK2NCpKUr924ehwQEi222Nw6zTtVykgWQft).
- Test 17 (second-buyer isolation) PASS. B deposited 0.5 (tx
  AVAfNbxob3a3vP96YosUjah3ULaU4hrnoi3am98HFft8); A's request+release
  left B identical (tx BSi8eH1wP2ZMiy35LMmyZJf9c6FAzbHk9WSaZQddXYrv);
  B's own call (held 0.1) left A identical; B released (tx
  7tb74xEEit3Q8a7gQqJdNdh4AEBFERp6R51Sps4FLnYN).
- Test 18 (withdrawal beyond earned) PASS. Non-seller withdraw →
  rejected "Only the seller can withdraw". Seller withdraw (tx
  91GvLehVGvhNtzNrCCd3YhsudmApyFfJ7WVHw2fBmjKq) moved exactly 0.2
  (earned 0.2 → 0, withdrawn 0.2); seller wallet balance after ≈
  10.1995 NEAR (10 + 0.2 − gas) confirms the transfer landed.
  Second withdraw → rejected "Nothing to withdraw".
- Budget-cap rejections (bonus) PASS. Cap 3 NEAR (> 2 NEAR deposit)
  → "Budget cap cannot exceed your deposit"; cap 0.1 (< spent 0.2)
  → "Budget cap cannot be below what you have already spent".
- Test 19 REHEARSAL (harness-level only) PASS. Fresh buyer D =
  worthless-wrench.testnet (creation tx
  CqJHsBpZZXdow1ptGDKnHnLjS6CPi1YXBauqjwXiwwUh) followed the
  frozen replay script: deposit 0.5 (tx
  FiSvhhZsjTZszTmL39PYb4AMTuMrM6jVW9YYQhvkrELf), cap 0.2 (tx
  Dp8MrAXVwQRQGvjTrhsg6W4athE4J5FymHhfta377GHu), success 1 (tx
  3532zwfYwt5z2uaBvjexMPkoNL6eJLQ8dVQ8QmnRVey5), success 2 (tx
  qwpXUa3w2V7gKsooyzewrDRyDG1mqx6wpqhBwiN3Nwn), third request
  refused (tx AWc9cV6GQ77JzHCQCe5KxGcW8RqnHajDb6w3A8u4Pkef).

Final on-chain state (verified by views): buyer A deposit 2, held 0,
spent 0.2, available 1.8, cap 1.0 (invariant holds: 2 − 0.2 − 0 =
1.8); buyer B 0.5/0/0/0.5/0.5; buyer C all zero; buyer D 0.5/0/0.2
spent/0.3 available/0.2 cap; seller earned 0.2 (rehearsal), withdrawn
0.2. Contract account ≈ 12.797 NEAR (10 + 3.0 deposits − 0.2
withdraw − gas/storage).

Notes on the phase-0 runs: the first phase-0 harness run was
reported "aborted" by the tool after its deposit tx, but evidently
kept running long enough to also create t5-backstop (its
proposed_at predates the second run's request by ~90 s). The second
run's t5 "request" (tx HE3jRTNQFbDbJmswnJmqAvxKxQQk6Ug7XQpKe9CooPjS)
was therefore a duplicate_call_id REFUSAL (on-chain refusal record
present), not a creation — the stored t5 call stayed `paid` until
the test-5 expiry. Test 5's evidence is unaffected. Buyer A's
deposit is 2 NEAR (1 + 1) because both runs deposited; cap defaulted
to 1 NEAR on the first deposit and did not move on the second.

## Explicitly GATED (not claimed as passing)

- Full day-7 judge replay (test 19 as a gate): the harness-level
  rehearsal above is NOT the day-7 gate. The gate needs the days 4–5
  buyer script + README do-X-see-Y steps, run by a fresh buyer on
  this frozen contract. Gated because the buyer script does not exist
  yet.

## Days 6–7 (2026-11-06) — glossary, dashboard, README, judge replay, dry run

### Decisions recorded (do not re-open without Olly)

1. **One-signature failure shape wins (Council P1-3, decided).** The
   implemented single-field shape stands: failure responses carry ONE
   signature field, `seller_signature`, holding the seller-ERROR
   attestation (`meteredpay-v1-seller-error` message). prep/04 §3.1
   and §3.3 were amended 6 Nov to match the code; SELLER_SPEC.md and
   the buyer/server code were already consistent. Amending prep/04
   was cheaper than re-proving the failure path in code. Verified:
   SELLER_SPEC + server.mjs + buyer.mjs + prep/04 all agree; the
   dry-run seller (seller-api-dryrun/) follows the reconciled shape.
2. **Arity deviations reconciled in the same pass (Council days 8–9
   list, pulled forward where they touch the spec):** init takes 4
   args incl. `seller_public_key` (prep/04 §2.3 amended);
   `expire_call` takes `(buyer_account_id, call_id)` (amended); empty
   `call_id` → `invalid_call_id` (amended); `get_seller` also returns
   `seller_public_key` (amended). All match the deployed contract.
3. **Seller-registration truth (Council P1-4):** stated in
   SELLER_SPEC.md intro + Appendix A1 — the frozen contract registers
   exactly ONE seller at init; no register/set-seller method exists;
   a third party implementing the spec perfectly still cannot receive
   a deduction from THIS contract. The spec is the interface for a
   redeploy / future multi-seller version.
4. **Glossary (Council P1-5):** one glossary only — `GLOSSARY.md`,
   reconciling the Council draft with `day1-glossary.md` (both in the
   goal's hidden_files). No second competing glossary was created.
   Banned-word grep (6 Nov) over README, X caption, dashboard,
   SELLER_SPEC, seller-api/README, buyer/README returns zero for:
   auto-refund, automatic refund, real payment, revenue, marketplace,
   customers, pilots, savings, mainnet, Intents, LLM, "remaining",
   "users". Two justified exceptions, both denials, both frozen
   wording: (a) the TESTNET banner "TESTNET — no real money. Testnet
   NEAR has no real-world value." (prep/02 global rule 1, mandated
   verbatim by the glossary); (b) the glossary's own "Never write"
   denylist, which names the banned words in order to ban them, plus
   the verbatim contract error "Call is not in paid state" quoted in
   README §2.5 Step 5 and the `paid` status key in code. Internal
   logs (this file, DAYS4-5-RUNLOG.md) predate the glossary and are
   not user-facing copy.
5. **RPC endpoint (Council P1-10):** dashboard + docs pin FastNear
   testnet RPC `https://rpc.testnet.fastnear.com` as primary, with
   `https://rpc.testnet.near.org` as fallback and retries (2 attempts
   per endpoint). Verified 6 Nov: FastNear returns `get_seller`
   correctly. The deprecated `view.sh` curl helper stays as-is
   (rate-limited during days 4–5 verification); buyer/seller/dashboard
   use near-api-js / fetch with retries instead.
6. **Journey 0 = read-only playback (Council P1-7):** S1 renders four
   already-settled transactions (success, fail-release, timeout-release,
   refusal) from static data; zero contract calls. Verified by
   `node dashboard/verify.mjs` (playback render makes zero fetch
   calls) and by serving the dashboard locally (all assets 200).
7. **Hosting (Council §5.4):** dashboard is deployment-ready for
   GitHub Pages (static, relative paths, no secrets) — see
   `dashboard/DEPLOY.md`. NOT deployed; GitHub Pages needs a public
   repo, which needs Olly's explicit approval (day 13, human-only).
   No hosting account created. Seller API stays localhost-only
   (`127.0.0.1:8787`, single config value `SELLER_URL` in
   `dashboard/config.js`); the dashboard shows an unreachable banner
   when it is not running.
8. **Timeout-for-video decision (Council P3-5):** 5-second settled-row
   beat — never film the 30 s live wait; the timeout outcome is shown
   as a settled release row (S1/S3) and documented in README Step 6.
   (Final call is the days 12–13 team's; this is the recommendation.)

### Files added/changed days 6–7

- `GLOSSARY.md` (new, frozen terminology).
- `dashboard/` (new): `index.html`, `app.js`, `config.js`,
  `styles.css`, `DEPLOY.md`, `verify.mjs` (headless check, PASS).
- `README.md` (rewritten as the submission README, prep/03 §2 order,
  frozen numbers, do-X-see-Y Steps 1–6 incl. timeout, judge replay
  sheet, tracks agents/business/defi/open — lead agents+open).
- `LICENSE` (MIT, new). `X-CAPTION-DRAFT.md` (new, draft only —
  Olly publishes). `seller-api/SELLER_SPEC.md` (+ Appendix A1–A3
  with a real worked example: example-001 success hash
  `88a55836…` + failure hash `1607da52…`, computed with the real
  registered seller key). `seller-api-dryrun/` (independent seller
  from the spec alone — see its README for the honest result).
- `prep/04-architecture.md` (outside the repo — the ONE permitted
  edit): §3.1/§3.3 one-field failure shape, §2.3 init 4 args,
  expire_call 2 args, invalid_call_id, get_seller seller_public_key.
- `seller-api/README.md`, `buyer/README.md`: banned-word denials
  reworded (no literal banned tokens in user-facing copy).

### Test 19 — REAL judge replay (6 Nov, fresh buyer test19-judge.testnet)

Run by the README §2.5 steps only (demo mode), exit 0. Buyer created
via the testnet helper API (near-cli-rs faucet flow needs an
interactive terminal — README §2.3 now says so). Deposit 0.5, cap 0.2.
Success 1 deducted (`CZ7ZxXaD7dkcWo9S1xUphRSRVFii4tR79qiZK8cATAkT`),
fail released (`UQWVcyQpQcn3TWpU9T7zzRnv929LAmEeS2vBc8Poyy5`),
timeout released (`6QDDY5gnKc3eUUmejSJNdcU5pJYHMnogmeXSqVvCuc2T`),
success 2 deducted (`3AYdiZpn4wT5qPnFUwpea1zuDZ4Vy7spgkhe9yU4WWSV`),
third refused `over_budget`
(`59Z7vr1EYvwYQZoSdd2jQPNM1g149CXYPLG5dALH77AC`). Deposit tx
`3qr733n4C7m75LKSfqQqMBk17mAcY3wocp7gXyco1Mtu`. All six txs verified
on-chain via FastNear RPC (`tx` method; nearblocks pages return 403
to curl, so links were verified via RPC instead). Final:
0.5/0/0.2/0.3/0.2. Run log:
`buyer/runs/demo-test19-judge.testnet-2026-11-05T19-45-55.jsonl`.
Seller earned is now 1.0 (was 0.8), withdrawn 0.2.

### Third-party seller dry run (6 Nov, buyer dryrun-buyer.testnet)

Independent seller in `seller-api-dryrun/` (service `dryrun-reverse`,
input-driven failure, no scenario field). Key
`ed25519:31ggWNoVikWC1KvtmgDps4GPz4o3Drbd89tbCLCeWrBW` (stored outside
the repo at `~/.meteredpay-dryrun-seller-key.json`). Results, all
honest, no paid third-party sale faked:
- Spec-literal startup: REFUSED to start (exit 3) — key not registered
  on-chain. The spec's startup rule working as written.
- Success attempt: response hash + attestation verified LOCALLY
  against the dry-run key; `submit_success` REJECTED on-chain with
  "Invalid seller signature". Captured rejection tx (second attempt):
  `4T3sSqEp9pb5RJvt9aZ8KF3UiX5tfC3etsojCDzEETdT` — RPC `tx` query
  confirms status Failure, "Smart contract panicked: Invalid seller
  signature". Call stayed `paid` (held); balances unchanged. (First
  attempt's rejection hash was not captured — near-api-js throws
  without it; recovered for the second attempt via the block-hash →
  chunk scan. Method recorded in the day 6–7 run log.)
- Failure attempt: failure response verified locally; failure claim
  (reason `seller_error`, NO seller evidence — foreign evidence would
  be rejected) succeeded on-chain:
  `2Gv8joJsLeffLiw7o8hb6JDD8KMYdhBoYjj5E2KcwL7j` →
  `failed-refunded`, hold released, never deducted.
- Final: deposit 0.5 / held 0 / spent 0 / available 0.5 / cap 0.2.
  Seller earned unchanged at 1.0. A full paid dry run is IMPOSSIBLE on
  the frozen contract (registration truth) — stated in
  `seller-api-dryrun/README.md` and README §2.7.
- Run log: `seller-api-dryrun/runs/dryrun-dryrun-buyer.testnet-2026-11-05T19-52-32.jsonl`.

## Days 4–5 (2026-11-05) — seller API + buyer script: DONE, proven on testnet

Full evidence: DAYS4-5-RUNLOG.md. Contract NOT redeployed, NOT
changed. New code (local git only, no remote/push/public):
`shared/` (canonical hash + ed25519, selftest 9/9 incl. the
contract's own unit-test signature vector), `seller-api/server.mjs`
(zero-dep demonstrator seller, GET /health, POST /call,
scenario success/fail/timeout; confirms seller + price against the
frozen contract at startup), `buyer/buyer.mjs` (demo + frozen-replay
modes; verifies response hash + seller signature before signing
anything; five-number balances after every step; run logs in
`buyer/runs/*.jsonl`).

Proof run 1 (demo, fresh buyer good-example.testnet, creation tx
FbpGJTdn5qn9VFeB94q5XKmQF3Kq73YY9fC9c1Zs362K): deposit 0.5, cap 0.2;
success demo-success-001 deducts (JDmqNR3sqJ274wj12FRjg5FJwMDnxakpAeZr8RuVSkwg);
failure demo-fail-001 releases held amount (BX3Emksn2UxigMRSdYUzQ8oqoSpjJMnWpKddT4BWQAgj);
timeout demo-timeout-001 releases held amount after 30 s wait
(3XorTaigTfzfzzQvfKB9oX1k8NEESpFXYcPQUZphDvCy); success
demo-success-002 deducts (BZRSwq2SdtYA7RaQ6NSPUA8Kp5yVkfvzs4t3NYpmzKZj);
over-budget demo-overbudget-001 refused `over_budget`
(7zW3UAva9vjiGjxx7DuEZ8D9uFTEdVZ2xiCMhXpTStu2). Final: 0.5/0/0.2/0.3/0.2.

Proof run 2 (frozen replay, fresh buyer new-kitty.testnet, creation
tx 7uvySWSx5eFBE7xgFTqQMPVDmH7sJaxgt165EXhPd1Nc): deposit 0.5, cap
0.2, two successes (7ktvjNonyU9WPaW9EvDPxaBif4kgaPV4U4zDVPyi9vcD,
Fqb16xy2eDPmTstVadTqxLhxFoNm4Joi4CDa4kRGUJnV), third refused
(HfDhB5W7qnGmDU8izPAj9EexCTemSUeVxiuoKhnRuoGx). Final: same 0.5/0/0.2/0.3/0.2.
This is the day-7 judge-replay SHAPE proven end-to-end; the gate
itself still needs the README do-X-see-Y steps (days 12–13).

Bugs/artefacts: (1) NEAR credential private keys are base58 of the
64-byte secret (seed+pubkey) — loader fixed to take the first 32
bytes as seed. (2) Demo-run shell pipeline exit 1 was `tee` failing
to open its log file, not the buyer script (it printed DEMO COMPLETE
and exited 0; its own .jsonl log is complete). (3) `view.sh` was
rate-limited by the deprecated RPC endpoint during verification;
near-api-js with retries was used instead.

Parallel run (NOT this agent's): fresh buyer day45-buyer.testnet
(credential 09:50, 1 min before good-example) ran the same demo
shape concurrently — 2 successes, 1 fail, 1 timeout, 1 refusal.
Reconciliation: 10 successes ever × 0.1 = 1.0 earned ever − 0.2
withdrawn (test 18) = 0.8 current earned, matching the on-chain
read exactly. No contamination; each buyer's balances match only
its own calls. Confirm with whoever launched it (possible
duplicate kickoff). Seller earned (0.8) was NOT withdrawn in this run.

- Full day-7 judge replay (test 19 as a gate): the harness-level
  rehearsal above is NOT the day-7 gate. The gate needs the days 4–5
  buyer script + README do-X-see-Y steps, run by a fresh buyer on
  this frozen contract. The buyer script now EXISTS and the replay
  mode is proven; only the README steps are missing.
- Third-party seller dry run (prep/06 Part 2 fix 3): needs an
  independent implementer using only the seller spec. Not done;
  scheduled before the freeze, not in days 1–3.
- Dashboard/explorer surfacing (days 6–7): explorer links exist for
  every tx above, but no dashboard displays them yet.
- Anything needing the days 4–5 seller API / buyer script (real API
  response hashes, seller-service modes): the testnet hashes above
  are SHA-256 of fixed test strings, signed with the real seller and
  buyer keys — the signature machinery is proven, but the API-body
  canonicalisation (§3.2) is fixed by the seller implementation, not
  by these tests.
- No UI, README, video, X draft, repo-public, or submission work was
  done in this repo (forbidden at this stage). The only README here
  is an internal pointer to this file.

## Days 4–5 — seller API + buyer script (2026-11-05, testnet-proven)

- Layout: `seller-api/server.mjs` + `seller-api/SELLER_SPEC.md`
  (demonstrator seller, Node http, no dependencies);
  `buyer/buyer.mjs` (+ `buyer/package.json`, near-api-js 7.4.0);
  `shared/canonical.mjs` (canonical JSON, SHA-256, frozen
  signature messages), `shared/ed25519.mjs` (sign/verify,
  credential loading), `shared/selftest.mjs` (9/9 PASS, incl.
  verification against this contract's own unit-test vectors).
  A duplicate implementation briefly written under `common/` +
  `seller/` during days 4–5 was deleted the same day, leaving
  this single layout.
- Seller service: `meteredpay-demo-quote` — deterministic
  word/char count + excerpt of a short text. No LLM, no external
  call. Scenarios success / fail / timeout are demonstrator-only.
  The seller confirms the contract via RPC at startup and
  refuses to start if its credential key differs from the key
  registered on-chain. It never calls the contract.
- Buyer script modes: `demo` (deposit -> success deducts -> fail
  releases -> timeout releases -> success deducts -> over-budget
  refused) and `replay` (frozen replay: deposit, cap 2x price,
  two successes, third refused). It verifies the response hash
  and seller signature before signing anything, asserts the
  five-number invariant after every step, and exits non-zero on
  any mismatch. Keys are read from ~/.near-credentials at runtime
  and never printed or committed.
- Documented deviation (not a blocker): the failure response
  carries ONE signature field, `seller_signature`, holding the
  seller-ERROR attestation (meteredpay-v1-seller-error message);
  prep/04 §3.1 describes both an attestation signature and a
  separate seller-error signature. Server, buyer, and
  SELLER_SPEC.md are mutually consistent on the single-field
  shape, and submit_failure evidence verifies on-chain.
  Reconcile before the freeze if a third-party seller is expected
  to follow prep/04 literally.
- Review findings: M1 note, M3 tx-hash capture, L7 ed25519-only
  buyer key, L8 fresh call_id per step are in the buyer script.
  M2 local cap < spent+held check is NOT in the buyer script
  (contract allows it with grandfathering). M4 additive tests
  and M5 deploy-hash recovery remain days 8–9 / 12–13 work.
- Proof (testnet, contract apathetic-party.testnet, price 0.1):
  Run 1, buyer good-example.testnet, deposit 0.5 / cap 0.2:
  success-001 deducted (JDmqNR3sqJ274wj12FRjg5FJwMDnxakpAeZr8RuVSkwg),
  fail-001 released (BX3Emksn2UxigMRSdYUzQ8oqoSpjJMnWpKddT4BWQAgj),
  timeout-001 released (3XorTaigTfzfzzQvfKB9oX1k8NEESpFXYcPQUZphDvCy),
  success-002 deducted (BZRSwq2SdtYA7RaQ6NSPUA8Kp5yVkfvzs4t3NYpmzKZj),
  overbudget-001 refused over_budget (7zW3UAva9vjiGjxx7DuEZ8D9uFTEdVZ2xiCMhXpTStu2).
  Run 2 (independent verification, fresh buyer
  day45-buyer.testnet, same seller API): success-001 deducted
  (558Zvkpmmbz4xq5m3Dj9HS4MwRUhdPabpGYf6tVTwyZV),
  fail-001 released (8gMP5YYdoNauEhsA3HvQowoUvAP9hn3R2J1wNSomPVDV),
  timeout-001 released (6nhyLzz4PPiTZQurusBSxT7JbqREzMCq3cxPGMiDdnZT),
  success-002 deducted (Hu3gM3V2c4jFBBdVj9WK3T5qbLr6TiWxa599HpzeGP54),
  overbudget-001 refused over_budget (4oDWmzoZWJAiwUxfRcBjPW2YDsPVAgTm8igBzkxcg6oL).
  Both runs ended deposit 0.5 / held 0 / spent 0.2 / available
  0.3 / cap 0.2, invariant holding. Transcripts:
  buyer/runs/demo-good-example.testnet-2026-11-05T09-51-57.jsonl,
  buyer/runs/replay-new-kitty.testnet-2026-11-05T09-56-28.jsonl
  (replay mode), buyer/runs/demo-day45-buyer.testnet-2026-11-05T09-56-36.jsonl.
  Full day 4–5 log (incl. the parallel-build note and seller
  earned reconciliation 0.8 / withdrawn 0.2): the goal's
  hidden_files/day45-run-log.md.
- Gated items now unblocked: end-to-end buyer script + seller
  API with real response hashes (days 4–5). Still gated:
  day-7 judge replay (test 19, README steps + fresh buyer),
  third-party seller dry run before the freeze, dashboard
  (days 6–7).

