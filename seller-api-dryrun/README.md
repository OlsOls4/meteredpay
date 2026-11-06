# MeteredPay — third-party seller dry run (days 6–7)

**Status: DRY RUN, not a live seller.** An independent seller
implementation written from `../seller-api/SELLER_SPEC.md` alone —
it does NOT copy `../seller-api/server.mjs` logic. It reuses only the
spec-referenced shared helpers (`../shared/canonical.mjs`,
`../shared/ed25519.mjs`), as the spec permits.

## The honest result (read this first)

The frozen contract `apathetic-party.testnet` registers exactly ONE
seller at init (`tedious-sea.testnet`) and has no register-seller
method. **This dry-run seller cannot be paid by the frozen contract,
and the dry run proves exactly that:**

1. **Startup, spec-literal:** with no override, this seller REFUSES
   to start against the frozen contract — its key is not the key
   registered on-chain (spec Appendix A3, "Startup" row). That refusal
   is the spec working as written.
2. **Success path, shape proven, payment refused on-chain:** with the
   dry-run-only override `DRYRUN_ALLOW_UNREGISTERED_KEY=1`, the seller
   serves a well-formed success response (canonical hash + seller
   attestation verify locally against its own key). The buyer's
   `submit_success` is then REJECTED on-chain with "Invalid seller
   signature" — the call stays held, balances unchanged. The
   API/signature/hash shape is proven end-to-end up to the exact
   on-chain refusal the registration truth predicts.
3. **Failure path, hold released on-chain:** the seller's failure
   response (error attestation, verified locally) is submitted as a
   failure claim WITHOUT seller evidence — foreign evidence would be
   rejected on-chain ("Invalid seller error signature"), so the honest
   claim carries none. The claim succeeds: the hold is released,
   never deducted.

A full paid dry run is IMPOSSIBLE on the frozen contract for the
reason above — no third-party seller can be paid by it. Nothing here
fakes one. The spec is the interface for a redeploy / future
multi-seller version (SELLER_SPEC.md Appendix A1).

## What this seller is

- Service `dryrun-reverse`: word count + reversed excerpt of a short
  text. A different service from the demonstrator's word-count quote,
  written from the spec alone.
- Failure is input-driven, not scenario-driven: input text starting
  with `FAIL:` returns a failure response (`DRYRUN_SELLER_ERROR`).
  There is NO `scenario` field — a real seller ignores it.
- Signing key: a fresh ed25519 keypair generated on first start and
  stored OUTSIDE the repo at `~/.meteredpay-dryrun-seller-key.json`
  (override with `DRYRUN_SELLER_KEY_PATH`). Never printed, never
  committed.

## Run it

```bash
# 1. Spec-literal startup refusal (no override):
node server.mjs            # exits non-zero: key not registered on-chain
# 2. Dry-run override (shape test only — still cannot be paid):
DRYRUN_ALLOW_UNREGISTERED_KEY=1 node server.mjs   # http://127.0.0.1:8788
curl http://127.0.0.1:8788/health
# 3. Drive it against the frozen contract (fresh buyer, testnet only):
node dryrun.mjs --buyer <buyer>.testnet
```

Env: `PORT` (default 8788), `HOST` (default 127.0.0.1),
`CONTRACT_ID` (default apathetic-party.testnet),
`SELLER_ACCOUNT_ID` (default dryrun-seller.testnet — a label only;
it is NOT registered on-chain), `RPC_URL`, `DRYRUN_SELLER_KEY_PATH`,
`DRYRUN_ALLOW_UNREGISTERED_KEY=1` (dry-run-only override).
No dependencies for the server; the driver needs near-api-js
(`npm install` in this directory).
