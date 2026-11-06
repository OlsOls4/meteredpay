#!/usr/bin/env bash
# MeteredPay — one-command judge replay (NEAR TESTNET ONLY, zero cost).
#
# Full replay: checks Node + near-cli, creates a faucet-funded testnet
# buyer account if needed, starts the demonstrator seller API, runs the
# demo against the frozen contract (apathetic-party.testnet), prints the
# elapsed wall-clock time, and asserts the frozen final state:
#   deposit 0.5 / held 0 / spent 0.2 / available 0.3 / cap 0.2
#
# Every run uses a FRESH faucet buyer: a re-run with the same --buyer
# does not reuse the previous account (demo mode throws on an existing
# deposit, and --allow-existing would double-deposit 0.5 and break the
# frozen final state). If the named buyer's key already exists locally,
# the script derives a fresh buyer name from it and creates that
# account instead — the buyer actually used is printed below and in
# the run log. Re-running ./replay.sh therefore always works.
#
#   ./replay.sh [--buyer <name>.testnet] [--mode demo|replay]
#
# Verify-only: no toolchain install, no new account, no seller. Checks
# every transaction hash in a recorded run log against the testnet RPC
# and reports each tx's on-chain status. Needs only curl + python3.
#
#   ./replay.sh verify-only [--log buyer/runs/<file>.jsonl]
#                           [--buyer <buyer>.testnet]
#
# Expected wall-clock (measured 5 Nov 2026, clean-env run in this VM):
#   full replay 240 s (~4 min) once Node + near-cli are installed
#   (faucet account creation ~10 s + demo itself ~230 s: 10 contract
#   calls + one 30 s timeout wait; testnet block times vary, so allow
#   up to ~6 min). verify-only ~30-60 s for a demo run log (42 s
#   measured for an 11-tx demo run log).
# First run on a clean machine: 15–45 min including toolchain install
# (Node 24, near-cli-rs 0.30.1, Rust for the cargo install route) —
# the 240 s figure above is the replay itself, after the toolchain
# is installed. Do not quote the replay as "~5 minutes" all-in.
# If near-cli is not installed, the script stops with install
# instructions instead of failing obscurely halfway through.
# Account creation uses near-cli's scriptable faucet form (trailing
# `create` answers the confirm), so the whole replay runs headless.
# Nothing here touches mainnet, spends real money, or needs a charged
# key/service.
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
CONTRACT="apathetic-party.testnet"
RPC_URL="${RPC_URL:-https://rpc.testnet.near.org}"
SELLER_URL="${SELLER_URL:-http://127.0.0.1:8787}"
MODE="demo"
BUYER=""
SKIP_ACCOUNT=0
LOG=""

usage() {
  sed -n '2,20p' "$0"
  exit "${1:-0}"
}

# --- verify-only ------------------------------------------------------------
verify_only() {
  command -v curl >/dev/null || { echo "verify-only needs curl (not found)." >&2; exit 1; }
  command -v python3 >/dev/null || { echo "verify-only needs python3 (not found)." >&2; exit 1; }
  if [ -z "$LOG" ]; then
    LOG="$(ls -t buyer/runs/demo-*.jsonl 2>/dev/null | head -n 1)"
    [ -n "$LOG" ] || { echo "No demo run log found in buyer/runs/. Pass --log <file>." >&2; exit 1; }
  fi
  [ -f "$LOG" ] || { echo "Run log not found: $LOG" >&2; exit 1; }
  if [ -z "$BUYER" ]; then
    # Buyer is the middle segment of demo-<buyer>-<timestamp>.jsonl
    BUYER="$(basename "$LOG" | sed -E 's/^demo-(.*)-[0-9]{4}-[0-9]{2}-[0-9]{2}T.*\.jsonl$/\1/')"
  fi
  echo "Verify-only: checking recorded txs in $LOG against $RPC_URL"
  echo "Buyer (tx signer): $BUYER"
  echo "No toolchain install, no new account, no seller needed."
  TXS="$(python3 -c "
import json,sys
seen=[]
for line in open('$LOG'):
    try: row=json.loads(line)
    except Exception: continue
    tx=row.get('tx')
    if tx and tx not in seen: seen.append(tx)
print('\n'.join(seen))")"
  [ -n "$TXS" ] || { echo "No tx hashes in $LOG." >&2; exit 1; }
  echo "$TXS" | wc -l | xargs echo "Transactions to check:"
  START=$SECONDS
  FAIL=0
  while IFS= read -r TX; do
    [ -n "$TX" ] || continue
    RESP="$(curl -s -m 15 "$RPC_URL" -H 'Content-Type: application/json' \
      -d "{\"jsonrpc\":\"2.0\",\"id\":\"verify\",\"method\":\"tx\",\"params\":[\"$TX\",\"$BUYER\"]}")"
    STATUS="$(printf '%s' "$RESP" | python3 -c "
import json,sys
try:
    r=json.load(sys.stdin)
    st=r.get('result',{}).get('status',{})
    print('OK' if 'SuccessValue' in st else ('FAILURE' if 'Failure' in st else 'UNKNOWN'))
except Exception:
    print('RPC-ERROR')")"
    echo "  $STATUS  https://testnet.nearblocks.io/txns/$TX"
    [ "$STATUS" = "OK" ] || FAIL=$((FAIL+1))
  done <<EOF
$TXS
EOF
  echo "Elapsed: $((SECONDS-START))s"
  if [ "$FAIL" -eq 0 ]; then echo "VERIFY-ONLY OK: every recorded tx succeeded on-chain."; exit 0; fi
  echo "VERIFY-ONLY: $FAIL tx(s) did not verify as OK (see above)." >&2; exit 1
}

# --- arg parsing ------------------------------------------------------------
if [ "${1:-}" = "verify-only" ]; then
  shift
  while [ $# -gt 0 ]; do
    case "$1" in
      --log) LOG="$2"; shift 2 ;;
      --buyer) BUYER="$2"; shift 2 ;;
      -h|--help) usage 0 ;;
      *) echo "Unknown verify-only option: $1" >&2; usage 1 ;;
    esac
  done
  verify_only
fi
while [ $# -gt 0 ]; do
  case "$1" in
    --buyer) BUYER="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --skip-account) SKIP_ACCOUNT=1; shift ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown option: $1" >&2; usage 1 ;;
  esac
done
[ "$MODE" = "demo" ] || [ "$MODE" = "replay" ] || { echo "--mode must be demo or replay" >&2; exit 2; }
if [ -z "$BUYER" ]; then
  SUFFIX="$(tr -dc 'a-z0-9' < /dev/urandom | head -c 6)"
  BUYER="mp-replay-${SUFFIX}.testnet"
  echo "No --buyer given; using generated buyer $BUYER"
fi
KEYFILE="$HOME/.near-credentials/testnet/${BUYER}.json"

# --- F2: a re-run must use a FRESH faucet buyer ------------------------------
# Demo/replay mode throws on an existing deposit (buyer.mjs: "already
# has a deposit ... Use a fresh buyer account"), and --allow-existing
# would double-deposit 0.5 and break the frozen final state — so
# reusing the named buyer can never work. If the named buyer's key
# already exists locally, derive a fresh buyer name from it and
# create that account instead. (With --skip-account the caller
# explicitly asked to reuse an existing account, so leave it alone;
# buyer.mjs will fail clearly if that buyer already deposited.)
if [ -f "$KEYFILE" ] && [ "$SKIP_ACCOUNT" -eq 0 ]; then
  BASE="${BUYER%.testnet}"
  SUFFIX="$(tr -dc 'a-z0-9' < /dev/urandom | head -c 6)"
  FRESH_BUYER="${BASE}-r${SUFFIX}.testnet"
  echo "Buyer $BUYER already exists locally ($KEYFILE) — a demo/replay re-run cannot reuse it (existing deposit)."
  echo "Using fresh faucet buyer $FRESH_BUYER instead (same frozen final state expected)."
  BUYER="$FRESH_BUYER"
  KEYFILE="$HOME/.near-credentials/testnet/${BUYER}.json"
fi

# --- prerequisite checks ----------------------------------------------------
echo "== MeteredPay one-command replay (TESTNET ONLY) =="
echo "Contract: $CONTRACT | Mode: $MODE | Buyer: $BUYER"
echo "== Checks =="
if ! command -v node >/dev/null; then
  echo "Node not found. Install Node 24 (https://nodejs.org, LTS) or: nvm install 24 && nvm use 24" >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
echo "Node: $(node --version)"
if [ "$NODE_MAJOR" -lt 24 ]; then echo "Node 24+ required (found $NODE_MAJOR)." >&2; exit 1; fi
if ! command -v near >/dev/null; then
  echo "near-cli not found. Install near-cli-rs 0.30.1 first:" >&2
  echo "  cargo install near-cli-rs --version 0.30.1   # needs Rust" >&2
  echo "  # or download the release binary (no Rust needed) from the v0.30.1 release page:" >&2
  echo "  #   https://github.com/near/near-cli-rs/releases/tag/v0.30.1" >&2
  echo "  # Linux x86_64 binary:" >&2
  echo "  #   https://github.com/near/near-cli-rs/releases/download/v0.30.1/near-cli-rs-x86_64-unknown-linux-gnu.tar.gz" >&2
  echo "Then re-run ./replay.sh. (Low-bandwidth alternative: ./replay.sh verify-only — curl + python3 only.)" >&2
  exit 1
fi
echo "near-cli: $(near --version 2>&1 | head -n 1)"
if [ ! -d buyer/node_modules ]; then
  echo "Installing buyer dependencies (npm install)..."
  (cd buyer && npm install) || { echo "npm install failed." >&2; exit 1; }
fi

# --- buyer account (faucet-funded, interactive) -----------------------------
if [ ! -f "$KEYFILE" ]; then
  if [ "$SKIP_ACCOUNT" -eq 1 ]; then
    echo "No key at $KEYFILE and --skip-account given — cannot run." >&2; exit 1
  fi
  echo "== Creating faucet-funded testnet account $BUYER =="
  echo "(Scriptable faucet form — no prompts expected. Alternative: create an"
  echo " account at https://testnet.mynearwallet.com and fund it from"
  echo " https://near-faucet.io, then re-run with --buyer <that>.testnet.)"
  # Scriptable form (near-cli itself prints this as the re-runnable
  # command): the trailing `create` answers the final confirm prompt,
  # so this works headless. The README's shorter form omits it and
  # prompts instead — it needs a TTY and fails on non-TTY stdin with
  # "The input device is not a TTY". If this still prompts in your
  # terminal, just press Enter at each prompt (defaults are correct).
  near account create-account sponsor-by-faucet-service "$BUYER" \
    autogenerate-new-keypair --signature-scheme ed25519 save-to-legacy-keychain network-config testnet create \
    || { echo "Account creation failed — see above. This flow needs an interactive terminal (a non-TTY stdin fails with 'The input device is not a TTY'). Re-run ./replay.sh in a terminal once the account exists." >&2; exit 1; }
  [ -f "$KEYFILE" ] || { echo "Account created but key not at $KEYFILE — check ~/.near-credentials/testnet/." >&2; exit 1; }
else
  echo "Buyer key found: $KEYFILE (reusing existing account — --skip-account given; demo/replay mode still requires a fresh buyer with no deposit, and buyer.mjs will fail clearly if this buyer already deposited)."
fi

# --- seller API --------------------------------------------------------------
SELLER_STARTED=0
if ! curl -s -m 5 "$SELLER_URL/health" >/dev/null 2>&1; then
  echo "== Starting demonstrator seller API ($SELLER_URL) =="
  (cd seller-api && node server.mjs > /tmp/meteredpay-seller.log 2>&1 & echo $! > /tmp/meteredpay-seller.pid)
  SELLER_STARTED=1
  for _ in $(seq 1 30); do
    curl -s -m 5 "$SELLER_URL/health" >/dev/null 2>&1 && break
    sleep 1
  done
  curl -s -m 5 "$SELLER_URL/health" >/dev/null 2>&1 \
    || { echo "Seller API did not come up — see /tmp/meteredpay-seller.log." >&2; exit 1; }
fi
echo "Seller API healthy: $(curl -s -m 5 "$SELLER_URL/health")"
cleanup() {
  if [ "$SELLER_STARTED" -eq 1 ] && [ -f /tmp/meteredpay-seller.pid ]; then
    kill "$(cat /tmp/meteredpay-seller.pid)" 2>/dev/null || true
    rm -f /tmp/meteredpay-seller.pid
  fi
}
trap cleanup EXIT

# --- run ---------------------------------------------------------------------
echo "== Running demo (mode $MODE) — expect ~3-4 min, incl. one 30 s timeout wait =="
START=$SECONDS
(cd buyer && node buyer.mjs --buyer "$BUYER" --mode "$MODE" --tag replay)
STATUS=$?
ELAPSED=$((SECONDS-START))
echo "== Replay finished in ${ELAPSED}s (exit $STATUS) =="
if [ "$STATUS" -ne 0 ]; then
  echo "Buyer run failed (exit $STATUS). See the output above." >&2
  exit "$STATUS"
fi
echo "Expected final state: deposit 0.5 / held 0 / spent 0.2 / available 0.3 / cap 0.2 (testnet NEAR)."
echo "REPLAY OK in ${ELAPSED}s."
echo ""
echo "Dashboard — open it to inspect this replay (buyer $BUYER):"
echo "  Local: http://127.0.0.1:8080/dashboard/"
echo "  Serve it from the repo root first: python3 -m http.server 8080"
echo "  (Hosted GitHub Pages dashboard: NOT deployed yet — needs the"
echo "  repo-public approval; see dashboard/DEPLOY.md.)"
