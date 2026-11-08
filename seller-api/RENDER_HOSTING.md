# Hosted seller on Render — experiment note (wave 5)

**STATUS (8 Nov 2026): EXPERIMENTAL — NOT DEPLOYED, NOT CLAIMED.**
Gate 0 (Render's own-pages terms) PASSED. Gate 1 (deploy) is
**BLOCKED, not failed**: no Render account exists for this project
and none can be created by an agent — deploying needs a human-gated
Render sign-up (or a browser agent with Olly's Google sign-in) plus
the `SELLER_KEY_JSON` env var set in the Render dashboard. No deploy
URL exists, no pinger has ever run, no proof log entries exist. Do
not cite a hosted seller anywhere (README, dashboard, submission)
until `RENDER_PROOF_LOG.md` shows a passed 48 h warm-proof and a
full hosted demo run.

## What is ready (all local, committed)

- `seller-api/server.mjs` accepts the seller key as env var
  `SELLER_KEY_JSON` (whole credential-file JSON). Verified locally
  8 Nov 2026: `/health` 200 and a signed `/call` success against
  the frozen contract, key never logged. Local file path
  (`SELLER_KEY_PATH`, default `~/.near-credentials/testnet/`) is
  unchanged and still the default.
- `render.yaml` (repo root): Render Blueprint for one free web
  service, `seller-api/` as root, `node server.mjs`, `HOST=0.0.0.0`.
- `.github/workflows/keep-alive.yml`: pings `/health` every 5 min.
  It no-ops until repo variable `SELLER_HEALTH_URL` is set, so it is
  safe to merge now and can never ping a wrong URL.
- `seller-api/RENDER_PROOF_LOG.md`: empty proof-log skeleton for
  Gate 2.

## Key handling (testnet key only)

- The seller key is the **testnet** key for `tedious-sea.testnet`.
  It is low-value (testnet NEAR only) but is still never committed,
  never logged, never pasted into a file in this repo.
- Path to Render: paste the *contents* of
  `~/.near-credentials/testnet/tedious-sea.testnet.json` into the
  Render dashboard as a **secret env var** named `SELLER_KEY_JSON`
  on the `meteredpay-seller` service. That is the only place the key
  lives outside `~/.near-credentials/`.
- At startup `server.mjs` writes that JSON to a mode-600 temp file
  under the OS temp dir and loads it from there; the temp dir is
  per-boot (Render's filesystem is ephemeral, so nothing persists
  across restarts). The startup log prints only
  `seller key loaded from SELLER_KEY_JSON env var (mode-600 temp
  file; key never logged)` plus the seller's *public* key (already
  on-chain). The server refuses to start if the key's public key
  does not match the key registered on the frozen contract.
- Rotation/revocation: the key is a full-access testnet key for the
  seller account. If it ever leaks, rotate by replacing the key on
  `tedious-sea.testnet` and re-registering the new public key — that
  needs a **contract change** (`set_seller` does not exist; the
  seller is fixed at init), so a leak would mean deploying a new
  instance. Treat the Render env var as sensitive accordingly.

## Render free-tier terms (Gate 0 — Render's own pages, 8 Nov 2026)

- Free web service **spins down after 15 min without inbound
  traffic** (HTTP or WebSocket); spins back up on the next request
  in **about one minute**. Sources:
  <https://render.com/docs/free> and <https://render.com/docs/faq>
  ("Free web service instances spin down if they receive no
  incoming traffic for 15 consecutive minutes. These services take
  about a minute to spin back up when they next receive a request.")
- **750 free instance hours per workspace per calendar month**;
  exhausted hours suspend all free web services until the next
  month. One always-warm service burns ~720–744 h/month — the whole
  allowance, and a second always-warm free service would exceed it.
  Source: <https://render.com/docs/free>.
- **Bandwidth** counts against the workspace's monthly included
  amount; without a payment method, exceeding it suspends all free
  services for the remainder of the month. Render's own pages do
  not state the GB figure in the text fetchable here; independent
  secondary sources that cite `render.com/pricing` converge on
  **5 GB/month** on the $0 Hobby workspace (then $0.15/GB with a
  card, suspension without one). Our traffic (a ~200-byte `/health`
  ping every 5 min + demo calls) is kilobytes per month — three
  orders of magnitude inside even 5 GB. No contradiction with
  Render's own pages was found.
- **Keep-alive pinging is not prohibited on any Render page
  retrievable.** The docs define spin-down purely by inbound
  traffic; Render's ToS page (`render.com/terms`) is JS-rendered
  and returned no text to a text fetch, so the ToS/AUP wording was
  not directly verified — but no Render doc states a ban, and a
  secondary read of the ToS (last modified 10 Jul 2026) reports it
  does not mention free instances or set a personal-use limit.
  Keep-alive is therefore **tolerated, not guaranteed**: Render
  also states it "might restart a Free web service at any time",
  and free instances are "not for production applications".
- Free web service: 512 MB RAM, 0.1 CPU, single instance, no
  persistent disk, no shell access, ephemeral filesystem.
  Source: <https://render.com/docs/free>.

## Deploy steps (human-gated — the one blocked step)

1. Sign up / sign in at <https://dashboard.render.com> (Olly's
   Google sign-in; no card — Hobby workspace is $0).
2. New → Web Service → connect this repo (or use `render.yaml`
   Blueprint deploy). Plan: **Free**. Region: nearest (Frankfurt).
3. Set env vars in the dashboard: `HOST=0.0.0.0`,
   `SELLER_ACCOUNT_ID=tedious-sea.testnet`,
   `CONTRACT_ID=apathetic-party.testnet`, and secret
   `SELLER_KEY_JSON` = contents of the testnet credential file.
   (`PORT` is supplied by Render.)
4. Deploy; confirm `GET <url>/health` returns 200 with
   `seller_account_id: tedious-sea.testnet` and the frozen price.
5. In the GitHub repo → Settings → Variables → Actions, set
   `SELLER_HEALTH_URL` to `<url>/health`. The pinger starts on its
   next 5-min tick; that starts the 48 h Gate 2 clock.
6. Fill `RENDER_PROOF_LOG.md` from the Actions runs, then run one
   full buyer demo against the hosted URL.

## Honest risk (carried, not hidden)

A lapsed pinger (Actions outage, workflow disabled, Render
restart, hours exhausted) = ~60 s cold start > 30 s buyer wait =
a visible timeout in front of a judge. It is SAFE (the hold is
released, nothing is deducted) but it is a failed live claim. The
pinger must keep running through ~25 Nov (hackathon Q-012
"ideally"). The recorded/local path stays intact throughout, so
the entry degrades to today's state, never below it. If the 48 h
proof fails, this whole experiment is CUT: remove `render.yaml`
and the workflow, or leave them marked experimental-not-claimed,
and claim nothing.
