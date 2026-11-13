#!/usr/bin/env bash
# MeteredPay — judge-owned-instance replay (NEAR TESTNET ONLY, zero cost).
#
# The judge deploys the SAME frozen wasm from this repo to their OWN
# testnet account, inits it with their OWN seller key, and runs the
# buyer end-to-end with ZERO builder keys. Nothing in this script
# uses a builder account, builder key, or builder service: the
# contract account, the seller account, and the buyer account are
# all created by the judge (faucet-funded), the seller API runs on
# the judge's own machine with the judge's own seller key, and the
# wasm is verified by SHA-256 before deploy and by on-chain code
# hash after deploy.
#
# This is the proof behind README §2.6: a judge does NOT need the
# demonstrator seller (tedious-sea.testnet) or any builder key to
# replay the bundle — they can deploy their own instance of the
# frozen contract and run the same buyer flow against it. The
# frozen contract (apathetic-party.testnet) remains the canonical
# judge-replay target; this script is the stronger, key-free
# alternative for a judge who wants zero trust in the builder.
#
# Proved end-to-end 13 Nov 2026 (manual run, same steps as this
# script): judge contract mp-judge-w6.testnet, judge seller
# mp-judge-seller.testnet, buyer mp-judge-buyer.testnet, replay
# mode, exit 0, FINAL STATE ASSERTED 0.5 / 0 / 0.2 / 0.3 / 0.2.
# Deploy tx HBWdw57zuk5mPe6TPLZ4rZTwGc8AkDDHiWNBF3gGw8Ui; run log
# buyer/runs/replay-mp-judge-buyer.testnet-2026-11-13T09-32-42.jsonl.
#
#   ./replay-judge-owned.sh [--contract <name>.testnet]
#                           [--seller <name>.testnet]
#                           [--buyer <name>.testnet]
#                           [--mode demo|replay] [--port 8788]
#
# Defaults generate fresh mp-judge-* names. If --contract names an
# account that already has the frozen code deployed, the deploy is
# skipped and the existing instance is verified instead (code hash
# + get_seller must match the requested seller); a re-run then
# reuses the instance with a fresh buyer. Requires: Node 24+,
# near-cli-rs 0.30.1, curl, python3. No mainnet, no real money.
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
RPC_URL="${RPC_URL:-https://rpc.testnet.near.org}"
FROZEN_WASM_SHA="c54ae8e9d657338ccc695d32689fac322aaa1d77b90fd90e0ed63f86decbb3b0"
WASM="target/near/meteredpay.wasm"
PRICE_YOCTO="100000000000000000000000" # 0.1 testnet NEAR/call
TIMEOUT_SECONDS="600"
MODE="replay"
PORT="8788"
CONTRACT=""
SELLER=""
BUYER=""

usage() { sed -n '2,30p' "$0"; exit "${1:-0}"; }
while [ $# -gt 0 ]; do
  case "$1" in
    --contract) CONTRACT="$2"; shift 2 ;;
    --seller) SELLER="$2"; shift 2 ;;
    --buyer) BUYER="$2"; shift 2 ;;
    --mode) MODE="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    -h|--help) usage 0 ;;
    *) echo "Unknown option: $1" >&2; usage 1 ;;
  esac
done
[ "$MODE" = "demo" ] || [ "$MODE" = "replay" ] || { echo "--mode must be demo or replay" >&2; exit 2; }
SUFFIX="$(tr -dc 'a-z0-9' < /dev/urandom | head -c 6)"
[ -n "$CONTRACT" ] || CONTRACT="mp-judge-${SUFFIX}.testnet"
[ -n "$SELLER" ] || SELLER="mp-judge-seller-${SUFFIX}.testnet"
[ -n "$BUYER" ] || BUYER="mp-judge-buyer-${SUFFIX}.testnet"
SELLER_URL="http://127.0.0.1:${PORT}"
echo "== MeteredPay judge-owned-instance replay (TESTNET ONLY) =="
echo "Contract (judge-owned): $CONTRACT | Seller (judge-owned): $SELLER | Buyer: $BUYER | Mode: $MODE"
echo "No builder key, token, or permission is used anywhere in this script."

# --- prerequisite checks ----------------------------------------------------
command -v node >/dev/null || { echo "Node not found. Install Node 24 (https://nodejs.org, LTS)." >&2; exit 1; }
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 24 ] || { echo "Node 24+ required (found $NODE_MAJOR)." >&2; exit 1; }
command -v near >/dev/null || { echo "near-cli not found. Install near-cli-rs 0.30.1 (see replay.sh for the install commands)." >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 not found (needed for the code-hash check)." >&2; exit 1; }
command -v curl >/dev/null || { echo "curl not found." >&2; exit 1; }
[ -d buyer/node_modules ] || { echo "Installing buyer dependencies (npm install)..."; (cd buyer && npm install) || { echo "npm install failed." >&2; exit 1; }; }
echo "Node: $(node --version) | near-cli: $(near --version 2>&1 | head -n 1)"

# --- step 1: the wasm must be the frozen wasm, byte for byte --------------
[ -f "$WASM" ] || { echo "Wasm not found at $WASM. Build it first: cargo near build non-reproducible-wasm (never bare 'cargo near build')." >&2; exit 1; }
SHA="$(sha256sum "$WASM" | cut -d' ' -f1)"
echo "Wasm SHA-256: $SHA"
[ "$SHA" = "$FROZEN_WASM_SHA" ] || { echo "STOP: wasm SHA-256 differs from the frozen wasm ($FROZEN_WASM_SHA). The code has changed since the freeze — do not deploy." >&2; exit 1; }
echo "Wasm matches the frozen wasm."

# --- step 2: judge-owned accounts (faucet-funded) ---------------------------
mkaccount() {
  local acct="$1"
  local keyfile="$HOME/.near-credentials/testnet/${acct}.json"
  if [ -f "$keyfile" ]; then echo "Account $acct already exists locally ($keyfile) — reusing it."; return 0; fi
  echo "== Creating faucet-funded testnet account $acct =="
  near account create-account sponsor-by-faucet-service "$acct" \
    autogenerate-new-keypair --signature-scheme ed25519 save-to-legacy-keychain network-config testnet create \
    || { echo "Account creation failed for $acct." >&2; exit 1; }
  [ -f "$keyfile" ] || { echo "Account created but key not at $keyfile." >&2; exit 1; }
}
mkaccount "$CONTRACT"
mkaccount "$SELLER"
SELLER_PUB="$(python3 -c "import json; print(json.load(open('$HOME/.near-credentials/testnet/${SELLER}.json'))['public_key'])")"
echo "Judge seller public key: $SELLER_PUB"

# --- step 3: deploy the frozen wasm + init, or verify an existing deploy ---
code_hash_hex() {
  curl -s -m 20 "$RPC_URL" -H 'Content-Type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":\"codehash\",\"method\":\"query\",\"params\":{\"request_type\":\"view_account\",\"account_id\":\"$1\",\"finality\":\"final\"}}" \
  | python3 -c "
import json,sys
B58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
h=json.load(sys.stdin)['result']['code_hash']
n=0
for ch in h: n=n*58+B58.index(ch)
print(n.to_bytes(32,'big').hex())"
}
EXISTING_SHA="$(code_hash_hex "$CONTRACT" 2>/dev/null || true)"
if [ "$EXISTING_SHA" = "$FROZEN_WASM_SHA" ]; then
  echo "Contract $CONTRACT already has the frozen code deployed (code hash matches) — skipping deploy, verifying registration."
else
  [ -z "$EXISTING_SHA" ] || [ "$EXISTING_SHA" = "0000000000000000000000000000000000000000000000000000000000000000" ] \
    || { echo "STOP: $CONTRACT already has DIFFERENT code deployed (code hash $EXISTING_SHA). Use a fresh --contract name." >&2; exit 1; }
  echo "== Deploying frozen wasm to $CONTRACT (init: seller $SELLER, price 0.1, timeout 600 s) =="
  near contract deploy "$CONTRACT" \
    use-file "$WASM" \
    with-init-call init json-args '{"seller_account_id": "'"$SELLER"'", "seller_public_key": "'"$SELLER_PUB"'", "price_per_call": "'"$PRICE_YOCTO"'", "call_timeout_seconds": "'"$TIMEOUT_SECONDS"'"}' \
    prepaid-gas '100.000 TeraGas' attached-deposit '0 NEAR' \
    network-config testnet sign-with-keychain send 2>&1 | tee "/tmp/meteredpay-judge-deploy-${SUFFIX}.log" \
    || { echo "Deploy failed — see /tmp/meteredpay-judge-deploy-${SUFFIX}.log." >&2; exit 1; }
  DEPLOY_TX="$(grep -m1 'Transaction ID' "/tmp/meteredpay-judge-deploy-${SUFFIX}.log" | sed 's/.*Transaction ID: *//;s/ *$//')"
  echo "Deploy tx: ${DEPLOY_TX:-not captured (see log)}"
  [ "$(code_hash_hex "$CONTRACT")" = "$FROZEN_WASM_SHA" ] || { echo "STOP: on-chain code hash does not match the frozen wasm after deploy." >&2; exit 1; }
  echo "On-chain code hash matches the frozen wasm."
fi
SELLER_ONCHAIN="$(near contract call-function as-read-only "$CONTRACT" get_seller json-args '{}' network-config testnet now 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin)['seller_account_id'])" 2>/dev/null || true)"
[ "$SELLER_ONCHAIN" = "$SELLER" ] || { echo "STOP: get_seller on $CONTRACT returned '${SELLER_ONCHAIN:-?}', expected $SELLER." >&2; exit 1; }
echo "Contract $CONTRACT registered seller: $SELLER (price 0.1, timeout 600 s)."

# --- step 4: the judge's own seller API -------------------------------------
SELLER_STARTED=0
if ! curl -s -m 5 "$SELLER_URL/health" >/dev/null 2>&1; then
  echo "== Starting judge seller API ($SELLER_URL) with the judge's own key =="
  # exec: the background job's PID ($!) must BE node, not a wrapper
  # subshell — otherwise the EXIT trap kills the wrapper and the
  # seller leaks (found 13 Nov 2026: a leftover judge seller on
  # 8788 survived the script's cleanup for exactly this reason).
  (cd seller-api && exec env CONTRACT_ID="$CONTRACT" SELLER_ACCOUNT_ID="$SELLER" PORT="$PORT" node server.mjs > "/tmp/meteredpay-judge-seller-${SUFFIX}.log" 2>&1 & echo $! > "/tmp/meteredpay-judge-seller-${SUFFIX}.pid")
  SELLER_STARTED=1
  for _ in $(seq 1 30); do
    curl -s -m 5 "$SELLER_URL/health" >/dev/null 2>&1 && break
    sleep 1
  done
  curl -s -m 5 "$SELLER_URL/health" >/dev/null 2>&1 \
    || { echo "Judge seller API did not come up — see /tmp/meteredpay-judge-seller-${SUFFIX}.log." >&2; exit 1; }
fi
echo "Judge seller API healthy: $(curl -s -m 5 "$SELLER_URL/health")"
cleanup() {
  if [ "$SELLER_STARTED" -eq 1 ] && [ -f "/tmp/meteredpay-judge-seller-${SUFFIX}.pid" ]; then
    kill "$(cat "/tmp/meteredpay-judge-seller-${SUFFIX}.pid")" 2>/dev/null || true
    rm -f "/tmp/meteredpay-judge-seller-${SUFFIX}.pid"
  fi
}
trap cleanup EXIT

# --- step 5: fresh buyer + buyer run against the judge-owned instance -------
BUYER_KEYFILE="$HOME/.near-credentials/testnet/${BUYER}.json"
if [ -f "$BUYER_KEYFILE" ]; then
  BASE="${BUYER%.testnet}"
  FRESH_BUYER="${BASE}-r${SUFFIX}.testnet"
  echo "Buyer $BUYER already exists locally — using fresh faucet buyer $FRESH_BUYER instead."
  BUYER="$FRESH_BUYER"
  BUYER_KEYFILE="$HOME/.near-credentials/testnet/${BUYER}.json"
fi
if [ ! -f "$BUYER_KEYFILE" ]; then
  echo "== Creating faucet-funded testnet buyer $BUYER =="
  near account create-account sponsor-by-faucet-service "$BUYER" \
    autogenerate-new-keypair --signature-scheme ed25519 save-to-legacy-keychain network-config testnet create \
    || { echo "Buyer account creation failed." >&2; exit 1; }
fi
echo "== Running buyer ($MODE) against the judge-owned instance $CONTRACT =="
START=$SECONDS
(cd buyer && CONTRACT_ID="$CONTRACT" SELLER_ACCOUNT_ID="$SELLER" node buyer.mjs --buyer "$BUYER" --mode "$MODE" --tag judge --api "$SELLER_URL")
STATUS=$?
ELAPSED=$((SECONDS-START))
echo "== Buyer run finished in ${ELAPSED}s (exit $STATUS) =="
if [ "$STATUS" -ne 0 ]; then
  echo "Buyer run failed (exit $STATUS). See the output above." >&2
  exit "$STATUS"
fi
echo "== Asserting frozen final state on the judge-owned instance (deposit 0.5 / held 0 / spent 0.2 / available 0.3 / cap 0.2) =="
(cd buyer && node assert-final-state.mjs --buyer "$BUYER" --contract "$CONTRACT") || { echo "Final-state assertion FAILED — this replay did NOT reproduce the frozen final state." >&2; exit 1; }
echo ""
echo "JUDGE-OWNED REPLAY OK in ${ELAPSED}s."
echo "  Contract (judge-owned): $CONTRACT (code hash = frozen wasm SHA-256 $FROZEN_WASM_SHA)"
echo "  Seller (judge-owned):   $SELLER"
echo "  Buyer:                  $BUYER"
echo "  Deploy tx:              ${DEPLOY_TX:-reused existing deploy}"
echo "  Run log:                buyer/runs/${MODE}-${BUYER}-*.jsonl"
echo "No builder key, token, or permission was used."
