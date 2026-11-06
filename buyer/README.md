# MeteredPay — buyer script

The payer's agent. Drives the demo against the frozen testnet
contract (`apathetic-party.testnet`) and the demonstrator seller API
(`../seller-api/server.mjs`, default `http://127.0.0.1:8787`).

## Run

Start the seller API first (`node ../seller-api/server.mjs`), then,
with a FRESH testnet buyer account (keys in
`~/.near-credentials/testnet/<buyer>.json`):

```
# Demo moment: success deducts, failure releases the held amount,
# timeout releases the held amount, second success deducts,
# over-budget request refused on-chain.
node buyer.mjs --buyer <buyer>.testnet --mode demo --tag demo

# Frozen replay script (glossary §6): deposit, cap 2x price,
# two successes, third call refused.
node buyer.mjs --buyer <buyer>.testnet --mode replay --tag replay

# Single call: one call only, machine-readable JSON on stdout
# (human progress lines go to stderr). Default: a valid quote
# document, expected outcome success-deducted.
node buyer.mjs --buyer <buyer>.testnet --mode single --tag single
# Other scenarios: --scenario fail | timeout. Other schemas:
# --schema payment-instruction --document '{"payee":"alice.testnet","amount_yocto":"1000000000000000000000000"}'
# An invalid document (e.g. --document '{"text":42}') is a seller
# failure: outcome failed-refunded, failure_reason seller_error,
# with the seller's { field, reason } error list in the JSON.
```

Options: `--api URL` (default http://127.0.0.1:8787),
`--deposit 0.5` / `--cap 0.2` (testnet NEAR), `--tag <prefix>`
(call-ID prefix, unique per buyer), `--allow-existing` (demo/replay
only — single mode reuses an existing deposit, see below),
`--scenario success|fail|timeout` (single mode only, default
`success`), `--schema quote|payment-instruction|invoice` (single
mode only, default `quote`), `--document '<json>'` (single mode
only — the document to validate; default is a valid quote document),
`--skip-setup` (skip the script's deposit + cap and assert a manual
near-cli deposit/cap already matches — README §2.5 Step 1).
Env: `CONTRACT_ID`, `SELLER_ACCOUNT_ID`, `RPC_URL`.

> **Warning: `--api` picks the HTTP endpoint, not the seller.** The
> frozen contract only ever pays `tedious-sea.testnet` (the seller
> registered on the contract). Pointing `--api` at a third-party
> seller's URL does not pay that seller: their signature fails
> verification against the on-chain registered seller key, the buyer
> submits an `invalid_response` failure claim, and the hold is
> released, never deducted. Every call "works" and refunds — nothing
> is lost, but nothing is paid either.
>
> **Guard (U-F5): the buyer now says so explicitly.** Before any
> seller call it reads the registered seller from the contract
> (`get_seller`) and probes the endpoint's `GET /health` for the
> seller that endpoint claims to be. Single-mode JSON always carries
> `seller_registered` (`true` = endpoint seller matches the
> registered seller; `false` = the endpoint names a different seller;
> `null` = the endpoint could not be checked — no `/health`, or
> unreachable at probe time), plus `registered_seller_account_id`
> and, when known, `endpoint_seller_account_id`. A `false` means the
> call was claimed `invalid_response` and the hold was released, never
> deducted — check this field before assuming a call paid anyone.
> The probe is best-effort and never fatal: an endpoint with no
> `/health` still works, it just reports `null` until its first
> response names a seller (every seller response is checked too).

## Single mode: repeat calls (top-up-aware)

Single mode reuses an existing deposit: it deposits only the
shortfall to `--deposit` (0.5 by default) and sets the cap only if
it differs from `--cap` — a repeat call never double-deposits and
never needs `--allow-existing` / `--skip-setup`. Each run uses a
unique call ID (`<tag>-single-<timestamp>-<nonce>`), so repeat
calls with the same buyer/tag never collide on-chain. Three
consecutive `--mode single` calls with the same buyer all exit 0:
the first two deduct (spent 0.1, then 0.2); the third is refused
on-chain once spent reaches the 0.2 cap, and single mode reports
that as an asserted outcome (`"outcome": "refused",
"refusal_reason": "over_budget"`, exit 0, balances unchanged)
instead of crashing — the deposit stays 0.5 throughout. To buy
more calls after the cap is reached, pass a higher `--cap`
(explicit buyer choice; the cap is a per-buyer setting, not frozen
contract state). Demo and replay modes are unchanged: they still
require a fresh buyer (or `--allow-existing`, which double-deposits
— do not use it for a re-run you want to compare against the frozen
numbers).

## One-command judge replay (`../replay.sh`)

```bash
./replay.sh [--buyer <name>.testnet] [--mode demo|replay]
# Checks Node 24+ and near-cli-rs 0.30.1, creates a faucet-funded
# testnet buyer account if needed (scriptable form — no prompts),
# starts the demonstrator seller if it is not already running,
# runs the demo, prints the elapsed time, expects the frozen final
# state deposit 0.5 / held 0 / spent 0.2 / available 0.3 / cap 0.2,
# and prints the local dashboard URL to inspect the replay.
# Every run uses a FRESH faucet buyer: re-running with the same
# --buyer derives a fresh buyer name instead of reusing the previous
# account (demo mode throws on an existing deposit, and
# --allow-existing would double-deposit 0.5 and break the frozen
# final state). Re-running ./replay.sh therefore always works.

./replay.sh verify-only [--log buyer/runs/<file>.jsonl] [--buyer <buyer>.testnet]
# No toolchain install, no new account, no seller: checks every tx
# hash in a recorded run log against the testnet RPC (curl + python3
# only) and reports each tx's on-chain status. Defaults to the
# newest demo run log in buyer/runs/.
```

Expected wall-clock, measured 5 Nov 2026 in this VM: full replay
**240 s (~4 min)** once Node + near-cli are installed (faucet
account creation ~10 s + demo itself ~230 s: 10 contract calls +
one 30 s timeout wait; testnet block times vary, so allow up to
~6 min). Verify-only took **42 s** for an 11-tx demo run log.
A first replay on a clean machine is **15–45 min including
toolchain install** (Node 24, near-cli-rs 0.30.1, Rust for the
`cargo install` route) — the 240 s figure is the replay itself once
the toolchain is installed, not the all-in first-run time.
Installing near-cli takes longer the first time (`cargo install
near-cli-rs --version 0.30.1`, needs Rust; or the release binary —
no Rust needed — from the v0.30.1 release page:
https://github.com/near/near-cli-rs/releases/tag/v0.30.1, e.g. the
Linux x86_64 binary
https://github.com/near/near-cli-rs/releases/download/v0.30.1/near-cli-rs-x86_64-unknown-linux-gnu.tar.gz;
macOS/Windows binaries are on the same release page). If near-cli
is missing, `replay.sh` stops with install instructions instead of
failing halfway. The faucet
account-creation step needs no terminal: `replay.sh` uses the
scriptable form (`... network-config testnet create`); the shorter
README form prompts and fails on non-TTY stdin with "The input
device is not a TTY".

## Single mode: exit codes and JSON shape

Exit codes: `0` — the call completed and its on-chain outcome is
asserted (this includes a failure-claim outcome: a tampered response
or an invalid document correctly ends `failed-refunded`, never
deducted, and still exits 0). `1` — the run failed unexpectedly
(a contract call failed, a claim was rejected, the seller was
unreachable in a way no claim could cover); stdout carries one JSON
object `{ "mode": "single", "buyer", "ok": false, "error":
{ "code": "RUN_FAILED", "message" } }`. `2` — usage error
(missing `--buyer`, bad `--mode`/`--scenario`).

Success JSON (stdout, one object, one line): `{ "mode": "single",
"buyer", "ok": true, "call_id", "scenario", "schema", "outcome":
"success-deducted" | "failed-refunded" | "timeout-refunded" |
"refused", "seller_registered": true | false | null (U-F5 --api
guard — see the `--api` warning above; `false` means the endpoint
named a seller other than the registered `tedious-sea.testnet` and
the call was claimed `invalid_response`, hold released, never
deducted), "registered_seller_account_id": "tedious-sea.testnet",
"endpoint_seller_account_id"? (present when the endpoint named a
seller), "failure_reason"? ("seller_error" | "invalid_response" |
"timeout"), "error_code"? , "error_message"? , "seller_errors"?
(the seller's `{ field, reason }` list, invalid-document calls),
"response_hash"? , "seller_output"? (the validated seller output
for a success call — the result you paid for, e.g. the
schema-validation `{ "service", "schema", "valid": true,
"word_count", ... }` object), "refusal_reason"? (`"over_budget"`,
refused calls), "tx", "link", "balances": { "deposit", "held",
"spent", "available", "cap" } (formatted testnet NEAR strings),
"seller_earned", "run_log" }`. Parse stdout as JSON; anything on
stderr is human progress, never the result.

## Integrating the buyer into an agent (U-F6)

`buyer.mjs` is a CLI script, not an importable module: importing it
runs the CLI (top-level argument parsing, buyer-key load, contract
calls), so there is no `import { buy } from './buyer.mjs'` to offer.
Making it importable would mean restructuring those top-level side
effects, which risks the frozen demo flow for no new proof — so the
supported integration is shell-out + parse the single-mode JSON.
One paid call, with the guard check, cap-raise, and retry:

```js
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);

async function paidCall({ buyer, document, cap = '0.2' }) {
  // Single mode is top-up-aware: it reuses the deposit and raises
  // the cap only if it differs, so repeat calls need no setup flags.
  const args = ['buyer/buyer.mjs', '--buyer', buyer, '--mode', 'single',
    '--tag', 'agent', '--cap', cap,
    '--schema', 'quote', '--document', JSON.stringify(document)];
  const { stdout } = await run('node', args, { timeout: 120_000 });
  const r = JSON.parse(stdout); // stdout is exactly one JSON object
  if (!r.ok) throw new Error(`buyer failed: ${r.error?.message}`);
  // U-F5 guard: never treat a call as paid unless the endpoint was
  // the registered seller. false = claimed invalid_response, hold
  // released, never deducted — do NOT retry against that endpoint.
  if (r.seller_registered === false)
    throw new Error(`seller not registered: endpoint is ${r.endpoint_seller_account_id}, contract pays ${r.registered_seller_account_id}`);
  if (r.outcome === 'success-deducted') return r.seller_output; // the result you paid for
  if (r.outcome === 'refused' && r.refusal_reason === 'over_budget') {
    // Budget exhausted, balances unchanged. Raise the cap (explicit
    // buyer choice — the cap is a per-buyer setting, not frozen
    // contract state) and retry once with the higher cap.
    return paidCall({ buyer, document, cap: String(Number(cap) + 0.2) });
  }
  // failed-refunded / timeout-refunded: hold released, never
  // deducted. Retry only if the failure was transient (timeout or
  // seller_error on a healthy seller); an invalid_response with
  // seller_registered true means the response itself was bad.
  throw new Error(`call not paid: outcome=${r.outcome} failure_reason=${r.failure_reason ?? 'n/a'}`);
}
```

Notes: run from the repo root (the script reads the buyer key from
`~/.near-credentials/testnet/<buyer>.json` and writes its run log to
`buyer/runs/`); exit 0 covers every asserted outcome including
`failed-refunded` and `refused`, so check `outcome`, not the exit
code, to know whether you paid. A `--scenario fail | timeout` run
is the way to exercise the failure paths before wiring this into a
live agent loop.

## What it proves, and how

Before signing anything, the buyer recomputes the seller response
hash from the canonical body it actually received and verifies the
seller signature against the seller key registered on the contract.
Only then does it sign the payer authorisation and submit
`submit_success`. Either signature alone is rejected on-chain.

**A response that fails verification never strands the hold.**
If the seller response is a non-success, has the wrong seller or
price, a mismatched hash, or a bad signature — or the seller request
fails outright — the buyer submits `submit_failure` with
`failure_reason: "invalid_response"` instead of throwing, and the
held amount is released (`failed-refunded`). A 30 s wait with no
receipt is a `timeout` claim instead. Exception: a FAILED response
whose seller error attestation verifies (e.g. `VALIDATION_FAILED`
for an invalid document) is claimed as `seller_error` WITH that
evidence — it is a seller-attested failure, not an invalid response.
The demo and replay modes rely on this too: every held call is
either deducted on a verified success receipt or released on a
failure claim.

Note on single-mode scenarios: `--scenario fail` makes the seller
fail on purpose (`DEMO_SELLER_ERROR`) BEFORE validating the
document, so an invalid document only reaches validation with
`--scenario success` — that is the run that proves the
`VALIDATION_FAILED` path end-to-end (failed response, valid seller
error attestation, `seller_error` claim with evidence, hold
released).

The buyer calls the seller's JSON schema-validation service
(`meteredpay-schema-validate`, see `../seller-api/SELLER_SPEC.md`):
demo/single inputs are `{ "schema": "quote", "document":
{ "text": ... } }`.

Each step prints the five-number balance (deposit, held, spent,
available, budget_cap; `available = deposit − spent − held`) and the
explorer link for its transaction. A run log is written to
`runs/<mode>-<buyer>-<timestamp>.jsonl` (tx hashes + explorer links
only, no keys). Exit 0 only if every step asserts.

## Money wording (frozen)

A "refund" is a RELEASE of a held amount, never deducted money
returned: write "Refunded — held amount released, never deducted",
with the release-transaction link. A release happens only on a buyer
failure/timeout claim or backstop expiry; the contract never releases
a hold on its own. Buyer dishonesty is NOT solved (a buyer could claim failure
after success) — say so in the FAQ, do not hide it. All payments
are NEAR testnet faucet tokens with no monetary value.
