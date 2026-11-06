# MeteredPay — multi-seller redeploy runbook (RUN 6 Nov 2026)

**Status: RUN 6 Nov 2026 — see `MULTI_SELLER_APPENDIX.md` for the
proof.** This runbook was the specified path from the frozen
single-seller contract to a two-seller deployment, and it was
executed as written except for the corrections in the appendix
(§6 buyer command now includes `SELLER_ACCOUNT_ID`; NearBlocks
account-txns endpoint unreliable — verify hashes via RPC `tx`).
The frozen contract `apathetic-party.testnet`, its Test 19 /
freeze / stranger-replay evidence, the video, and the dashboard all
stay exactly as they are. Testnet only. Zero real cost.

## 0. The one-seller truth — read this first

`src/lib.rs` `init` takes exactly **one** seller:

```rust
pub fn init(
    seller_account_id: AccountId,
    seller_public_key: String,
    price_per_call: U128,
    call_timeout_seconds: U64,
) -> Self
```

There is no seller list, no `register_seller`, no `set_seller`.
One contract instance = one seller, fixed at init, forever.
So "two sellers at init" in this runbook means **two contract
instances deployed from the same wasm, each initialised with one
seller** — not one contract holding two sellers. Anyone telling you
a single redeployed instance of this code holds two sellers is
wrong; the deploy in §4 would fail or, worse, silently register
only the first.

- **Path A (this runbook, same code):** two instances, same wasm,
  one seller each. No code change.
- **Path B (NOT this runbook, code change):** extend `init` and the
  contract state to a seller list, add unit tests, and re-prove
  everything. That is future work, not a redeploy — do not attempt
  it by editing init args; it needs a design change first (§8).

The two sellers:

| # | Seller account | Public key | Key file (NEVER in the repo) |
|---|---|---|---|
| 1 | `tedious-sea.testnet` (registered on the frozen contract) | `ed25519:6zG7yLp2jqHxfkXfYgsL1ZXSf2NVQoRRaib6im72ubnm` | `~/.near-credentials/testnet/tedious-sea.testnet.json` |
| 2 | `mp-seller2.testnet` (**ready, NOT registered anywhere**) | `ed25519:BoVrSvynnQ9Y1bKszwQaBhGA6DiKefwVtNy7KGfDSNze` | `~/.near-credentials/testnet/mp-seller2.testnet.json` |

Seller 2 was created 5 Nov 2026 via the faucet flow
(tx `DniVcFtkuWyS49Wg91pT1BYys7zpDvdoxiaXwiWdbQMb`,
10 testnet NEAR) and verified on-chain the same day
(`view_access_key` returns FullAccess for its key; balance 10
testnet NEAR; 1 full-access key). Full config (public info only):
`seller-api/second-seller.json`. Its key lives only in
`~/.near-credentials/` — never print it, never commit it.

Both sellers charge the same price (0.1 testnet NEAR per
successful call) and the same timeout (600 s), and both run the
same service (`meteredpay-schema-validate`, schemas `quote`,
`payment-instruction`, `invoice`) under the same open spec
(`seller-api/SELLER_SPEC.md`).

## 1. Prerequisites

- Same toolchain as the frozen build: Node 24, near-cli-rs
  0.30.1 (`~/.cargo/bin/near`), Rust + `cargo near`, the
  `wasm32-unknown-unknown` target (see README §2.3, `prep/08`).
- A testnet deployer account funded from the faucet (it pays
  testnet gas + storage for two deploys; testnet NEAR has no
  real-world value). The deployer needs its key in
  `~/.near-credentials/testnet/` (keychain sign-in).
- Two fresh testnet accounts for the new contract instances,
  e.g. `mp-meteredpay-a.testnet` and `mp-meteredpay-b.testnet`
  (faucet flow, §4 step 1). Do NOT reuse
  `apathetic-party.testnet`: it is already initialised and
  re-init is rejected on-chain ("The contract has already been
  initialized"). Do NOT deploy over the frozen contract.
- Seller 2's key file must exist at
  `~/.near-credentials/testnet/mp-seller2.testnet.json`. If it is
  missing, seller 2 is not ready — stop and recreate the account
  (then its account id / public key change, and this runbook's
  §0 table must be updated).

## 2. Build the same code — and prove it is the same code

```bash
cd repo
cargo near build non-reproducible-wasm   # never bare `cargo near build`
sha256sum target/near/meteredpay.wasm
```

**Gate:** the SHA-256 MUST be
`c54ae8e9d657338ccc695d32689fac322aaa1d77b90fd90e0ed63f86decbb3b0`
(the frozen wasm, `BUILD_NOTES.md`). If it differs, the code has
changed since the freeze — STOP. This runbook is a same-code
redeploy; a different hash means you are deploying different
code and §7 must be re-planned, not just re-run.

## 3. What "two sellers" costs in testnet NEAR

- Two contract-account creations: faucet-funded (free, 10
  testnet NEAR each from the faucet flow).
- Two deploys + two init calls: testnet gas only (order
  0.01–0.1 testnet NEAR each, same as the frozen deploy).
- Two Test 19 re-runs (§7): 0.5 deposit + ~0.01–0.11 gas per
  buyer, per instance, from faucet-funded fresh buyers.
- No mainnet, no real money, no charged service at any step.

## 4. Deploy — two instances, same wasm, one seller each

### Step 1 — create the two contract accounts

```bash
export PATH="$HOME/.cargo/bin:$PATH"
near account create-account sponsor-by-faucet-service mp-meteredpay-a.testnet \
  autogenerate-new-keypair --signature-scheme ed25519 save-to-legacy-keychain \
  network-config testnet create
near account create-account sponsor-by-faucet-service mp-meteredpay-b.testnet \
  autogenerate-new-keypair --signature-scheme ed25519 save-to-legacy-keychain \
  network-config testnet create
```

Record both creation tx hashes. (If the faucet flow fails, create
at https://testnet.mynearwallet.com and fund from
https://near-faucet.io instead — README §2.3.)

### Step 2 — deploy instance A (seller 1, tedious-sea.testnet)

```bash
near contract deploy mp-meteredpay-a.testnet \
  use-file target/near/meteredpay.wasm \
  with-init-call init json-args '{"seller_account_id": "tedious-sea.testnet", "seller_public_key": "ed25519:6zG7yLp2jqHxfkXfYgsL1ZXSf2NVQoRRaib6im72ubnm", "price_per_call": "100000000000000000000000", "call_timeout_seconds": "600"}' \
  prepaid-gas '100.000 TeraGas' attached-deposit '0 NEAR' \
  network-config testnet sign-with-keychain send
```

### Step 3 — deploy instance B (seller 2, mp-seller2.testnet)

```bash
near contract deploy mp-meteredpay-b.testnet \
  use-file target/near/meteredpay.wasm \
  with-init-call init json-args '{"seller_account_id": "mp-seller2.testnet", "seller_public_key": "ed25519:BoVrSvynnQ9Y1bKszwQaBhGA6DiKefwVtNy7KGfDSNze", "price_per_call": "100000000000000000000000", "call_timeout_seconds": "600"}' \
  prepaid-gas '100.000 TeraGas' attached-deposit '0 NEAR' \
  network-config testnet sign-with-keychain send
```

**Gotchas (all learned on the frozen deploy, `BUILD_NOTES.md`):**

- `U128` and `U64` init args MUST be JSON strings
  (`"100000000000000000000000"`, `"600"`), not bare numbers.
  The frozen deploy's first attempt used integer `600`, failed,
  and rolled back cleanly (code hash stayed empty) — a failed
  init is recoverable, but record the failure and retry with
  strings.
- `sign-as` is NOT a valid step in this chain — after
  `attached-deposit` the next step is `network-config` directly;
  the signer is the keychain account.
- Gas is written as `'100.000 TeraGas'` (the CLI echoes it back
  as `'100.0 Tgas'`).
- **Record the deploy tx hash for each instance in full.**
  The frozen deploy's hash was lost to truncated CLI output —
  do not repeat that: capture the whole output to a file
  (`... send 2>&1 | tee deploy-a.log`).

### Step 4 — verify each instance on-chain

For each instance (`mp-meteredpay-a.testnet`,
`mp-meteredpay-b.testnet`):

```bash
near contract call-function as-read-only <instance>.testnet get_seller \
  json-args '{}' network-config testnet now
```

**Gate:** `get_seller` must return exactly the init values —
seller account id, seller public key, price
`100000000000000000000000`, timeout `600`. Any mismatch = stop,
do not proceed to §5. Also confirm the on-chain code hash
matches the wasm SHA-256 from §2 (explorer account page or RPC
`view_code`).

## 5. Run the two seller APIs (different ports, different contracts)

The seller server takes its contract from the environment — no
code change needed (`seller-api/server.mjs`, `CONTRACT_ID` env).
Run both at once, in separate terminals:

```bash
# Terminal 1 — seller 1 against instance A (default port 8787)
cd seller-api && SELLER_ACCOUNT_ID=tedious-sea.testnet \
  CONTRACT_ID=mp-meteredpay-a.testnet \
  node server.mjs
# Expected first output: "[seller] contract mp-meteredpay-a.testnet
#   confirmed: seller=tedious-sea.testnet price=100000000000000000000000
#   yoctoNEAR timeout=600s"

# Terminal 2 — seller 2 against instance B (port 8788)
cd seller-api && SELLER_ACCOUNT_ID=mp-seller2.testnet \
  SELLER_KEY_PATH=$HOME/.near-credentials/testnet/mp-seller2.testnet.json \
  CONTRACT_ID=mp-meteredpay-b.testnet PORT=8788 \
  node server.mjs
# Expected first output: "[seller] contract mp-meteredpay-b.testnet
#   confirmed: seller=mp-seller2.testnet price=100000000000000000000000
#   yoctoNEAR timeout=600s"
```

**Gate:** if a seller's key does not match the key registered
on-chain for its `CONTRACT_ID`, the server refuses to start —
that is the spec's startup rule working as written
(`SELLER_SPEC.md` Appendix A3), not a bug. A seller started
against the WRONG contract (e.g. seller 2 against the frozen
`apathetic-party.testnet`) will refuse: seller 2 is not
registered there.

## 6. Run a buyer against each instance

The buyer script also takes its contract from the environment
(`buyer/buyer.mjs`, `CONTRACT_ID` env) and its seller from
`--api`:

```bash
# Buyer vs instance A / seller 1 (fresh faucet buyer each run)
CONTRACT_ID=mp-meteredpay-a.testnet \
  node buyer/buyer.mjs --buyer <fresh-buyer-a>.testnet --mode demo --tag redeploy-a
# Buyer vs instance B / seller 2 — point --api at port 8788 AND
# set SELLER_ACCOUNT_ID (buyer.mjs:87 defaults to tedious-sea.testnet
# and throws before any transaction if it does not match the contract's
# registered seller — correction found 6 Nov 2026, see appendix)
CONTRACT_ID=mp-meteredpay-b.testnet SELLER_ACCOUNT_ID=mp-seller2.testnet \
  node buyer/buyer.mjs --buyer <fresh-buyer-b>.testnet --mode demo --tag redeploy-b \
  --api http://127.0.0.1:8788
```

A buyer pointed at the wrong seller URL for its contract gets
released `invalid_response` claims, never a deduction
(README §2.3 note) — the contract pays only its registered
seller.

## 7. Test 19 re-run checklist — per instance, from scratch

Test 19 is the real judge replay (README §2.5 steps only, fresh
buyer, demo mode, exit 0 — `BUILD_NOTES.md` "Test 19"). It must
be re-run **separately for each new instance**; a pass on
instance A says nothing about instance B. Per instance:

- [ ] Fresh faucet buyer (never reuse a buyer that already
      deposited — demo mode throws on an existing deposit).
- [ ] Deposit 0.5, cap 0.2 (script does this first in demo mode).
- [ ] Success 1 deducts exactly 0.1 (spent 0.1, available 0.4).
- [ ] Fail releases: no deduction, balances unchanged
      (spent still 0.1, available still 0.4).
- [ ] Timeout releases after the 30 s buyer wait: no deduction,
      balances unchanged.
- [ ] Success 2 deducts exactly 0.1 (spent 0.2, available 0.3).
- [ ] Third success refused on-chain, reason `over_budget`
      verbatim; balances unchanged.
- [ ] Final state verified on-chain via `get_buyer_balance`:
      **deposit 0.5 / held 0 / spent 0.2 / available 0.3 /
      cap 0.2**.
- [ ] Every tx hash captured with its explorer link, and
      re-checked (e.g. `./replay.sh verify-only` once it is
      pointed at the new contract — see §8; until then, RPC `tx`
      queries).
- [ ] Optional but recommended: double-claim edge test
      (resubmit the success receipt — contract must reject it,
      "Call is not in paid state", balances unchanged).
- [ ] Negative check: a success receipt signed by the OTHER
      seller's key must be rejected on-chain ("Invalid seller
      signature") — this is what proves the two instances are
      really separate sellers, not one seller twice.
- [ ] Run log saved under `buyer/runs/` with the instance name
      in the tag (e.g. `--tag redeploy-a`), so the two instances'
      evidence never gets mixed up.

**Estimated effort:** the frozen Test 19 + freeze re-run +
stranger replay took a day each in practice; budget **2–3 days**
to re-prove both instances, re-record the video, and update the
docs (§8). Do not claim multi-seller is proven until both
instances pass this checklist with recorded tx hashes.

## 8. What a redeploy invalidates — update all of it, or claim nothing

A new contract address breaks every piece of evidence tied to
`apathetic-party.testnet`. Nothing below survives a redeploy
un-updated:

| Artifact | What breaks | Must be redone |
|---|---|---|
| `replay.sh` + README §2.5 tables | Default contract is the frozen one; all 11 recorded tx hashes belong to it | Point at the new instance(s) (or add a contract flag), re-run full replay + verify-only, record new tx tables per instance |
| Video (2-min demo + 30 s teaser) | Shows the frozen contract address, its tx hashes, and its final-state arithmetic | **Re-record** against the new instance(s); the old video proves the old contract only |
| Dashboard (`dashboard/config.js`) | Hardcodes `CONTRACT_ID: 'apathetic-party.testnet'` | New config per instance (or a contract switcher); re-run `dashboard/verify.mjs` |
| `seller-api/server.mjs` defaults | Default `CONTRACT_ID` is the frozen contract | Run with `CONTRACT_ID` env per §5 (no code change needed) |
| `buyer/buyer.mjs` defaults | Default `CONTRACT_ID` is the frozen contract | Run with `CONTRACT_ID` env per §6 (no code change needed) |
| README §2.5 freeze + stranger replay | Their tx tables and buyer names are frozen-contract evidence | New freeze re-run + new independent stranger replay, per instance |
| `seller-api-dryrun/` | Its "cannot be paid by the frozen contract" result is frozen-contract-specific | Re-run the dry-run analysis against the new instance(s) |
| Submission idea text | Names `apathetic-party.testnet` as the frozen contract | Update the contract address(es) and re-count characters (20–2000) |
| X caption / demo post | Links the old video + contract | New post only after the new video is recorded (human publishes) |

Until every row is redone, the honest claim stays what it is
today: a single-seller metering primitive, proven on the frozen
contract, with a specified (not deployed) multi-seller path.

## 9. Path B — a true multi-seller contract (future work, NOT this runbook)

If one contract must hold several sellers (shared buyer deposit
across sellers, one dashboard, one replay), the code has to
change: `init` takes a seller list, state stores a seller map,
`request_call` / `submit_success` / `submit_failure` resolve the
seller per call, `get_seller` becomes `get_sellers`, and the
seller-balance view becomes per-seller. That needs a design note,
new unit tests (24/24 must stay green plus new seller-list
tests), a fresh wasm hash, and the full §7 checklist on the new
contract — treat it as a new build, not a redeploy. Do not start
it inside the hackathon window without the human's explicit
decision: it invalidates the same evidence as Path A plus the
contract code itself.

## 10. What this runbook does NOT authorise

- No mainnet deployment, no mainnet spend, no real money.
- No publishing the repo, no submission, no X post — those are
  human-only gates (see the submission payload draft).
- No editing the frozen contract or its evidence to "match" a
  redeploy — the frozen contract's records stay as they are.
- No secret material in the repo: keys live only in
  `~/.near-credentials/`; if a key ever lands in a file under
  this repo, delete the file, rotate the key, and re-verify.
