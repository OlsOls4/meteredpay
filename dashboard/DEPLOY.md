# MeteredPay dashboard — deploy (GitHub Pages, hosting-ready, NOT deployed)

**Status: deployment-ready, NOT deployed (5 Nov 2026).** Deploying to
GitHub Pages on a free account requires a PUBLIC repo. Making this repo
public needs Olly's explicit approval — a human-only step on day 13.
Do not deploy until that approval is given. No hosting account has been
created (no Render/Fly/Vercel signup — Vercel is forbidden: unresolved
security anomaly, 5 Nov 2026).

## What is ready

- Static only: `index.html`, `app.js`, `config.js`, `styles.css`. No
  build step, no dependencies, no secrets, no private keys.
- Relative paths throughout (`./styles.css`, `./config.js`,
  `./../GLOSSARY.md`, `./../README.md`), so the dashboard works at any
  base path, including a GitHub Pages project site
  (`https://<user>.github.io/<repo>/dashboard/`).
- Seller API URL is a single config value: `SELLER_URL` in
  `dashboard/config.js` (default `http://127.0.0.1:8787`). Point it at
  a hosted seller when one exists; the dashboard shows a banner when
  the seller is unreachable and keeps working from contract reads.
- Contract reads use public testnet RPC with retries and fallback
  (FastNear primary, `rpc.testnet.near.org` fallback).

## Local run (works now, no approval needed)

```bash
cd <repo-root>            # the directory containing README.md
python3 -m http.server 8080
# open http://127.0.0.1:8080/dashboard/
```

Serve from the REPO ROOT, not from `dashboard/`: the footer links
to `../GLOSSARY.md` and `../README.md` resolve to `/GLOSSARY.md`
and `/README.md`, which return 200 only when the repo root is
served. Serving from `dashboard/` itself leaves both footer links
404 (fixed days 8–9, F6).

Or open `index.html` directly from the filesystem — the recorded
demo run (S1 Journey 0) renders with zero network requests; live
balances (S2/S4/S5) need network access to the testnet RPC.

Start the demonstrator seller for the live seller-health check:

```bash
cd ../seller-api && node server.mjs   # http://127.0.0.1:8787
```

## GitHub Pages deploy (GATED — needs Olly's repo-public approval, day 13)

1. Olly approves making the repo public (human-only).
2. Make the repo public on GitHub (human or approved push).
3. Repo → Settings → Pages → Source: Deploy from a branch → branch
   `master` (the local branch is `master`, not `main`), folder `/ (root)`.
4. Wait for the Pages build; open
   `https://olsols4.github.io/meteredpay/dashboard/` and check S1 renders
   the recorded run, S2 loads a buyer balance, S5 shows the replay steps.
5. If the seller is still localhost-only, S4 shows the seller-unreachable
   banner — that is expected and honest. A hosted seller is a separate
   decision (see below); the dashboard does not need it to prove the
   contract loop.
6. Keep the Pages site live through judging (16–18 Nov), ideally to
   25 Nov.

## Seller API hosting (NOT decided, NOT done)

Today the seller runs on `127.0.0.1:8787` only. A hosted dashboard
cannot reach it, so S4 shows the unreachable banner until a hosted
seller exists. Hosting the seller needs a free host and Olly's
Google sign-in for the account — a human decision, not taken here.
The judge replay does not depend on it: the replay runs locally
against the same frozen contract (README §2.3, §2.5).
