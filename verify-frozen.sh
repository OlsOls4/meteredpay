#!/usr/bin/env bash
# MeteredPay — one-command frozen-provenance check (post-submission
# council, 14 Nov 2026). Read-only: no keys, no transactions.
#
#   ./verify-frozen.sh
#
# Checks, each printed PASS/FAIL:
#   1. The local wasm (target/near/meteredpay.wasm, falling back to
#      wasm/meteredpay.wasm) SHA-256-matches the frozen wasm.
#   2. The live on-chain code hash of apathetic-party.testnet
#      (view_account via RPC) matches the frozen deploy.
# If no wasm file exists locally, prints the build command instead of
# failing cryptically. Exit 0 only if both checks PASS.
set -u
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
CONTRACT="apathetic-party.testnet"
RPC_URL="${RPC_URL:-https://rpc.testnet.near.org}"
FROZEN_WASM_SHA="c54ae8e9d657338ccc695d32689fac322aaa1d77b90fd90e0ed63f86decbb3b0"
FROZEN_CODE_HASH="EH9ZtfU7FbRNSFTDUqTZoE9gQ7jRQ5Qb7cWDoMuBRRGB"

echo "== MeteredPay frozen-provenance check (TESTNET ONLY, read-only) =="
echo "Contract: $CONTRACT"

FAIL=0
WASM=""
for CANDIDATE in target/near/meteredpay.wasm wasm/meteredpay.wasm; do
  if [ -f "$CANDIDATE" ]; then WASM="$CANDIDATE"; break; fi
done
if [ -z "$WASM" ]; then
  echo "FAIL  wasm: no wasm file found locally (looked for target/near/meteredpay.wasm and wasm/meteredpay.wasm)."
  echo "      Build it first: cargo near build non-reproducible-wasm (never bare 'cargo near build')."
  echo "      Or place a verified copy of the frozen wasm at wasm/meteredpay.wasm."
  FAIL=1
else
  SHA="$(sha256sum "$WASM" | cut -d' ' -f1)"
  echo "Wasm: $WASM"
  echo "SHA-256: $SHA"
  if [ "$SHA" = "$FROZEN_WASM_SHA" ]; then
    echo "PASS  wasm SHA-256 matches the frozen wasm."
  else
    echo "FAIL  wasm SHA-256 differs from the frozen wasm ($FROZEN_WASM_SHA)."
    FAIL=1
  fi
fi

command -v curl >/dev/null || { echo "FAIL  code hash: curl not found (needed for the RPC view)." >&2; exit 1; }
command -v python3 >/dev/null || { echo "FAIL  code hash: python3 not found (needed to parse the RPC view)." >&2; exit 1; }
LIVE_HASH="$(curl -s -m 20 "$RPC_URL" -H 'Content-Type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":\"verify-frozen\",\"method\":\"query\",\"params\":{\"request_type\":\"view_account\",\"account_id\":\"$CONTRACT\",\"finality\":\"final\"}}" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['result']['code_hash'])" 2>/dev/null || true)"
echo "Live code hash ($CONTRACT): ${LIVE_HASH:-<no answer>}"
if [ "$LIVE_HASH" = "$FROZEN_CODE_HASH" ]; then
  echo "PASS  live code hash matches the frozen deploy."
elif [ -z "$LIVE_HASH" ]; then
  echo "FAIL  code hash: RPC gave no answer for view_account $CONTRACT (network/RPC error, not a mismatch proof)."
  FAIL=1
else
  echo "FAIL  live code hash differs from the frozen deploy ($FROZEN_CODE_HASH)."
  FAIL=1
fi

if [ "$FAIL" -eq 0 ]; then echo "VERIFY-FROZEN PASS: local wasm and live on-chain code both match the frozen build."; exit 0; fi
echo "VERIFY-FROZEN FAIL: see above." >&2; exit 1
