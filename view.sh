#!/bin/bash
# view <method> <json-args> — read-only contract view via testnet RPC (no TTY prompts).
METHOD="$1"; ARGS="${2:-{}}"
B64=$(printf '%s' "$ARGS" | base64 -w0)
curl -s -m 90 https://rpc.testnet.near.org -H 'Content-Type: application/json' -d "{\"jsonrpc\":\"2.0\",\"id\":\"x\",\"method\":\"query\",\"params\":{\"request_type\":\"call_function\",\"account_id\":\"apathetic-party.testnet\",\"method_name\":\"$METHOD\",\"args_base64\":\"$B64\",\"finality\":\"final\"}}" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if 'error' in d: print('RPC ERROR:', json.dumps(d['error'])[:500]); sys.exit(1)
print(bytes(d['result']['result']).decode())
"
