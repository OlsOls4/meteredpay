# Render hosted-seller proof log (wave 5 experiment)

**STATUS (8 Nov 2026): BLOCKED — NO PROOF YET.**
Gate 0 (Render's own-pages terms) PASSED — see
`RENDER_HOSTING.md`. Gate 1 (deploy) is BLOCKED: no Render account
exists and no deploy URL exists, so the pinger has never run and no
latencies have been recorded. Nothing in this file is evidence of a
working hosted seller until the tables below are filled from real
runs. Do not cite a hosted seller until Gate 2 passes in full.

## Gate 2 acceptance (all must hold)

- 48 h of `/health` pings every 5 min (≈576 runs), each <2 s,
  **zero** cold starts (a cold start shows as tens of seconds).
- One full buyer demo run against the hosted seller (fresh faucet
  buyer; same deposit/cap/final-state assertions as the canonical
  run), with all transaction hashes linked below.
- Fallback line published in README/dashboard (proposed, not yet
  published — another worker owns those files).
- Pinger keeps running through ~25 Nov (hackathon Q-012 "ideally").

## 48 h warm-proof

| Window (UTC) | Pings | <2 s | Cold starts (>10 s) | Max latency | Notes |
|---|---|---|---|---|---|
| _(not started — deploy URL needed)_ | | | | | |

Per-run latency log (from GitHub Actions runs; link each day's run):

- _(none yet)_

## Hosted demo run (fresh buyer, frozen contract)

- Date (UTC): _(not run)_
- Hosted seller URL: _(none)_
- Buyer account: _(none)_
- Deposit tx: _(none)_
- Success call tx (deduction): _(none)_
- Fail call tx (release): _(none)_
- Timeout call tx (release): _(none)_
- Final state assertions (spent / released / balances): _(none)_

## Fallback line (proposed — publish only if Gate 2 passes)

> If the seller is cold, the first call may take ~60 s; retry — a
> timed-out call releases the hold, never deducts.

## Stale-footer note (for the README/dashboard worker)

If this experiment ever passes Gate 2, the S3 receipt footers
("no independent seller has run against the contract") go stale
and need the v3.2 footer patch. Until then, do not touch them.
