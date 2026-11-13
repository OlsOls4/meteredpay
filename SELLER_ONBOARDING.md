# MeteredPay — Seller onboarding quickstart (testnet only)

## The honest truth first (read this before anything else)

You **cannot** receive a deduction from the frozen contract
`apathetic-party.testnet`. It registers exactly one seller at init
(`tedious-sea.testnet`) and has no register-seller method, no
`set_seller`, and no onboarding step — see
`seller-api/SELLER_SPEC.md` Appendix A1. **You need a fresh
contract instance** of your own, deployed from the same wasm, with
your key registered at init. That is the whole runbook below: same
code, new instance, your seller. Testnet only, zero real cost.

What you get at the end: your own contract instance paying your
seller 0.1 testnet NEAR per buyer-verified successful call, proven
end-to-end with a fresh buyer. What you do NOT get: a listing, a
marketplace, or any buyer — you bring your own buyers, and the
frozen contract's judges replay against the frozen instance, not
yours.

## Prerequisites

- Node 24, near-cli-rs 0.30.1, Rust + `cargo near` with the
  `wasm32-unknown-unknown` target (see README §2.3, `prep/08`).
- A testnet deployer account funded from the faucet (pays testnet
  gas + storage for the deploy; testnet NEAR has no real-world
  value). Its key must be in `~/.near-credentials/testnet/`.
- Your seller account's key in
  `~/.near-credentials/testnet/<your-seller>.testnet.json` — never
  print it, never commit it.

## Step 0 — Self-check against the spec vectors (do this first)

Before you deploy or test live, prove your canonicalisation and
signature verification match the spec's worked examples
(`SELLER_SPEC.md` Appendix A2):

```bash
cd seller-api
node check-vectors.mjs
# Exit 0 only if every check passes: example-001 hash recomputes
# and its seller attestation verifies against the registered key;
# example-003 error attestation verifies, and fails as a success
# attestation (the one-field / two-format trap).
```

If any check fails, stop — a mismatch here becomes an on-chain
`Invalid seller signature` rejection with no further diagnosis.

## Step 1 — Build the wasm and check its hash

```bash
cargo near build non-reproducible-wasm   # never bare `cargo near build`
sha256sum target/near/meteredpay.wasm
# Must be c54ae8e9d657338ccc695d32689fac322aaa1d77b90fd90e0ed63f86decbb3b0
# (the frozen contract's wasm hash). A different hash means you are
# deploying different code — stop.
```

## Step 2 — Create your contract account

```bash
export PATH="$HOME/.cargo/bin:$PATH"   # adjust if your near binary lives elsewhere
near account create-account sponsor-by-faucet-service <your-contract>.testnet \
  autogenerate-new-keypair --signature-scheme ed25519 save-to-legacy-keychain \
  network-config testnet create
# Record the creation tx hash in full. Do NOT reuse apathetic-party.testnet:
# it is already initialised and re-init is rejected on-chain.
```

## Step 3 — Deploy your instance, registering your seller at init

```bash
near contract deploy <your-contract>.testnet \
  use-file target/near/meteredpay.wasm \
  with-init-call init json-args '{"seller_account_id": "<your-seller>.testnet", "seller_public_key": "ed25519:<your seller public key>", "price_per_call": "100000000000000000000000", "call_timeout_seconds": "600"}' \
  prepaid-gas '100.000 TeraGas' attached-deposit '0 NEAR' \
  network-config testnet sign-with-keychain send 2>&1 | tee deploy.log
```

Gotchas (learned on the frozen deploy): `U128`/`U64` init args MUST
be JSON strings (`"100000000000000000000000"`, `"600"`), not bare
numbers. `sign-as` is NOT a valid step in this chain. Record the
deploy tx hash in full — the frozen deploy's hash was lost to
truncated CLI output; do not repeat that.

## Step 4 — Verify your instance on-chain (gate — do not skip)

```bash
near contract call-function as-read-only <your-contract>.testnet get_seller \
  json-args '{}' network-config testnet now
```

Gate: `get_seller` must return exactly your init values — your
seller account id, your seller public key, price
`100000000000000000000000`, timeout `600`. Any mismatch = stop.
Also confirm the on-chain code hash matches the wasm SHA-256 from
Step 1.

## Step 5 — Run your seller API against your instance

```bash
cd seller-api
SELLER_ACCOUNT_ID=<your-seller>.testnet \
  SELLER_KEY_PATH=$HOME/.near-credentials/testnet/<your-seller>.testnet.json \
  CONTRACT_ID=<your-contract>.testnet PORT=8787 \
  node server.mjs
# Expected first output: "[seller] contract <your-contract>.testnet
#   confirmed: seller=<your-seller>.testnet price=100000000000000000000000
#   yoctoNEAR timeout=600s"
# The server REFUSES to start if your key differs from the key
# registered on-chain — that is the spec working, not a bug.
```

The spec vectors are tied to the frozen contract's registered
seller (`tedious-sea.testnet`): against your own instance your
seller's signatures will differ, and the vector checks will
(correctly) fail — that is the check working, not a bug. Prove spec
conformance once, against the frozen seller, before going live
(Step 0); against your own instance, prove it with the buyer run
in Step 6 instead — a deduction to your seller is the live proof.

## Step 6 — Prove it end-to-end with a fresh buyer

```bash
cd buyer
node buyer.mjs --buyer <fresh-buyer>.testnet --mode demo --tag demo
# With CONTRACT_ID=<your-contract>.testnet SELLER_ACCOUNT_ID=<your-seller>.testnet
# in the environment. Expected final state: deposit 0.5 / held 0 /
# spent 0.2 / available 0.3 / cap 0.2, and your seller earned 0.2.
# (Or run ./replay.sh against your instance — same flow, one command.)
```

## Step 7 — Getting paid: withdraw your earnings

`withdraw()` pays exactly your `earned` balance to you, the registered
seller, and only to you. It takes no arguments and needs no attached
deposit. Rules (read from `src/lib.rs`, proven live on instance B,
13 Nov 2026 — full proof: `seller-api/WITHDRAW_PROOF.md`):

- Seller-only: any other caller is rejected ("Only the seller can withdraw").
- All at once: it pays exactly `earned`, sets `earned` to 0, and adds the
  amount to `withdrawn`. There is no partial withdraw.
- A second withdraw with `earned` at 0 is rejected ("Nothing to withdraw").

```bash
export PATH="$HOME/.cargo/bin:$PATH"
near contract call-function as-transaction <your-contract>.testnet withdraw \
  json-args '{}' prepaid-gas '100.000 TeraGas' attached-deposit '0 NEAR' \
  sign-as <your-seller>.testnet network-config testnet sign-with-keychain send
# Check the result afterwards (a Promise return carries no JSON value):
# near contract call-function as-transaction <your-contract>.testnet get_seller_balance \
#   json-args '{"seller": "<your-seller>.testnet"}' prepaid-gas '100.000 TeraGas' \
#   attached-deposit '0 NEAR' sign-as <your-seller>.testnet network-config testnet sign-with-keychain send
```

Live example (instance B, 13 Nov 2026): seller `mp-seller2.testnet`
withdrew its 0.2 earned — tx
https://testnet.nearblocks.io/txns/AYuTEzgJneJ9kVPJ9cWftR8BFvHpsuM1AJcasguRjcr5
— and its balance went earned 0.2 → **0**, withdrawn 0 → **0.2**; the
seller wallet received 0.2 testnet NEAR minus ~0.0002 gas.

## After you are live

- Your instance is yours: the frozen contract stays the
  judge-replay target and is untouched by anything you do here.
- One contract instance = one seller, fixed at init, forever. A
  second seller needs a second instance — see
  `MULTI_SELLER_RUNBOOK.md` (executed 6 Nov 2026 for exactly this)
  and `MULTI_SELLER_APPENDIX.md` for the proof pattern.
- No shared buyer deposit across sellers exists in this code (that
  needs a code change, runbook Path B) — do not promise it.
- Buyer dishonesty is NOT solved by this contract: a buyer can claim
  failure after a genuine success. Your only evidence is your
  retained signed success attestation — keep it (see
  `DISHONEST_BUYER_DEMO.md` for a demonstrated case).
- Unspent buyer deposit has no buyer withdraw in v1 — tell your
  buyers that before they deposit.
