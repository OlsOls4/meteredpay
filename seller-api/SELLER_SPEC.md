# MeteredPay — Seller API spec (open spec, implemented by `server.mjs`)

Status: days 4–5 implementation of prep/04 §3, conformance appendix
added days 6–7, service upgraded days 8–9 from the word-count quote
to deterministic JSON schema validation (`meteredpay-schema-validate`,
§POST /call and Appendix A2). Any third party can implement a seller against the
same frozen contract by implementing this spec — the demo seller in
`server.mjs` is one such implementation, in demonstrator mode. It is
a demonstrator service, not a live seller listing, and there are no
independent sellers in the demo. **Read Appendix A1 first: the frozen
contract registers exactly one seller at init and has no
register-seller method, so a third-party seller implementing this spec
cannot receive a deduction from THIS contract — the spec is the interface for a
redeploy / future multi-seller version.**

Contract (NEAR testnet, frozen): `apathetic-party.testnet`
Seller (registered on-chain): `tedious-sea.testnet`
Price: `100000000000000000000000` yoctoNEAR (0.1 testnet NEAR) per
successful call, fixed at contract init. There is no set-price.
Transport: HTTP on localhost for the local run (`http://127.0.0.1:8787`
by default), HTTPS when hosted. Auth: none — the contract, not the
API, is the trust boundary.

## Endpoints

### `GET /health`
`{ "status": "ok", "seller_account_id": "<testnet id>",
"price_per_call_yocto": "<string>", "service": "<name>",
"mode": "demonstrator" }`
Confirm the seller and price match the contract before any money moves.

### `POST /call`
Request (JSON):
- `call_id` (string, required): must match the call the buyer already
  requested on-chain (`request_call`). The seller echoes it; it does
  not create a contract call.
- `buyer_account_id` (string, required): the payer's testnet account.
- `input` (object, required): the service input. This demonstrator
  takes `{ "schema": "<name>", "document": { ... } }`: `schema` names
  one of the fixed built-in schemas below; `document` is the JSON
  document to validate. The schemas are fixed before the freeze
  (days 8–9) and are the same in `server.mjs` and this spec:
  - `quote` — `document: { "text": "<max 5000 chars>" }`. Output:
    `word_count`, `char_count`, `excerpt` (first 140 chars).
  - `payment-instruction` — `document: { "payee":
    "<name>.testnet", "amount_yocto": "<digits > 0>", "memo"?:
    "<max 280 chars>" }`. Output echoes the validated instruction.
  - `invoice` — `document: { "invoice_id": "<1–64 chars>",
    "amount_yocto": "<digits > 0>", "currency": "NEAR",
    "due_date": "<YYYY-MM-DD, a real calendar date>" }`. Output
    echoes the validated invoice.
  All three schemas are strict: an unknown top-level field is a
  validation error, so the same document always validates the same
  way. A third-party seller may define its own schemas — but the
  schemas, and the canonicalisation below, must be fixed and
  documented before the freeze.
  Legacy alias: the bare `{ "text": "..." }` shape (days 4–5) is
  still accepted and means the `quote` schema with
  `document: { "text": "..." }`. New callers must send
  `{ "schema", "document" }`.
- `scenario` (string, demonstrator-only, optional): `"success"` |
  `"fail"` | `"timeout"`. Exists ONLY so the demo is deterministic.
  A real third-party seller ignores it and returns its real result.

Success response (HTTP 200, JSON):
`call_id`, `status: "success"`, `output` (the service result),
`response_hash`, `seller_signature`, `seller_account_id`,
`price_per_call_yocto`. A successful validation output is
`{ "service": "meteredpay-schema-validate", "schema": "<name>",
"valid": true, "errors": [], "input_sha256": "<hex SHA-256 of the
canonical { schema, document } input>", ...schema result }`.

Failure response (HTTP 200, `status: "failed"`):
`call_id`, `status: "failed"`, `error_code`, `error_message`,
`response_hash` (of the error body), `seller_signature` (over that
hash), `seller_account_id`, `price_per_call_yocto`. A failure response
never carries a success hash or success signature. A failure with no
seller error attestation is still a failure — the buyer submits a
failure claim with no seller evidence.

A document that FAILS validation is a failure response, not a paid
success: `error_code` is `VALIDATION_FAILED`, `error_message` names
the schema, the error count, and the first error, and the full error
list rides along as the unhashed wire field `errors` (each
`{ "field", "reason" }`). The buyer submits a failure claim with the
seller error attestation and the held amount is released, never
deducted. A validation that passes is a successful service call: its
output (`valid: true` + the schema result) is what the buyer pays for.

No endpoint returns a contract transaction, a deduction, or a payment
confirmation. The API returns a service result; only the contract
moves money, and only after the buyer submits a payer-signed receipt.

## Response-hash rule (frozen)

Canonical body: the JSON object containing `call_id`, `status`,
`output` (success) or `error_code` + `error_message` (failure),
`seller_account_id`, and `price_per_call_yocto`, serialised with keys
sorted recursively, no extra whitespace, UTF-8 (see
`../shared/canonical.mjs: canonicalStringify`).

`response_hash` = hex-encoded SHA-256 of that canonical body.

The buyer, before signing anything, recomputes the hash from the body
it actually received and rejects the response if it does not match
(`invalid_response`). The contract checks the hash in the claim matches
the hash in the seller attestation; it cannot recompute the API body —
that is the oracle limit, stated honestly in the README.

## Signatures (frozen formats)

- Seller attestation (success): the seller signs, with its testnet key,
  the UTF-8 message
  `meteredpay-v1-seller|<len(call_id)>:<call_id>|<len(response_hash)>:<response_hash>`
  where `len(p)` is the UTF-8 byte length of `p`, decimal, no padding.
  It attests "I served this response for this call". It does NOT attest
  "pay me", and alone it authorises nothing.
- Seller error attestation (failure): the seller signs
  `meteredpay-v1-seller-error|<len(call_id)>:<call_id>|<len(seller_error_hash)>:<seller_error_hash>`
  where `seller_error_hash` is the `response_hash` of the failure
  response. The buyer passes this hash + signature as the evidence in
  `submit_failure`; if supplied, the contract verifies it on-chain.
- Buyer success receipt: the buyer signs
  `meteredpay-v1-buyer-success|<len(call_id)>:<call_id>|<len(response_hash)>:<response_hash>|<len(price_yocto)>:<price_yocto>|<len(seller_account_id)>:<seller_account_id>`
  with the payer's key. This is the only authorisation to deduct, and
  it is verified on-chain against the key that signed the transaction.
- All signatures are base64 (standard alphabet, with padding) of the
  raw 64-byte ed25519 signature.

## Timeout rule

Buyer-side wait: 30 seconds (frozen). No response within the wait is
a timeout, not a success — the buyer submits a timeout failure claim
(`submit_failure` with `failure_reason: "timeout"`), which releases
the held amount. Backstop: if the buyer submits nothing, the call
stays held until `proposed_at + 600 s`, after which `expire_call`
releases it. A call can never be held forever.

## Timeout / failure honesty notes

- A failed call was never deducted: its price was held, then released.
  Always write "Refunded — held amount released, never deducted",
  with the release-transaction link. A release happens only on a buyer
  failure/timeout claim or backstop expiry; the contract never releases
  a hold on its own, and that claim step must be shown.
- Buyer dishonesty is NOT solved: a buyer could claim failure after a
  genuine success. The design protects the buyer from paying for
  failure; it does not protect the seller from a dishonest buyer.
- All payments are NEAR testnet faucet tokens with no monetary value.
  Label TESTNET on every payment surface. Never describe a testnet
  payment as income or as settlement with real-world value.

## Run it (local)

```
node server.mjs            # http://127.0.0.1:8787
curl http://127.0.0.1:8787/health
curl -X POST http://127.0.0.1:8787/call -H 'Content-Type: application/json' \
  -d '{"call_id":"demo-1","buyer_account_id":"<buyer>.testnet","input":{"schema":"quote","document":{"text":"hello MeteredPay"}},"scenario":"success"}'
# An invalid document (failure, never deducted):
curl -X POST http://127.0.0.1:8787/call -H 'Content-Type: application/json' \
  -d '{"call_id":"demo-2","buyer_account_id":"<buyer>.testnet","input":{"schema":"quote","document":{"text":42}},"scenario":"success"}'
```

Env: `PORT` (default 8787), `HOST` (default 127.0.0.1),
`SELLER_ACCOUNT_ID` (default tedious-sea.testnet), `SELLER_KEY_PATH`
(default `~/.near-credentials/testnet/<seller>.json`),
`CONTRACT_ID` (default apathetic-party.testnet), `PRICE_YOCTO`
(only as a fallback if the RPC is unreachable at startup — the
contract price always wins when the RPC answers), `RPC_URL`.
No dependencies; Node >= 18. Keys are read from the credential file
at runtime and never printed or committed.

## Appendix — conformance (added 6 Nov 2026, days 6–7)

### A1. Registration truth (read first)

The frozen contract `apathetic-party.testnet` registers exactly ONE
seller, once, at init (`tedious-sea.testnet`, price 0.1 testnet NEAR,
timeout 600 s). There is no register-seller method, no `set_seller`,
and no onboarding step. **A third party implementing this spec
cannot receive a deduction from the frozen contract** — its key is not the one
stored at init. This spec is the interface for a redeployed contract
or a future multi-seller version, and for the demonstrator seller
itself. Do not promise same-contract onboarding. Price is fixed at
contract init; there is no set-price. New sellers start here:
`../SELLER_ONBOARDING.md` (deploy-your-own-instance runbook).

### A2. Worked example (verify your implementation against this before testing live)

Service: `meteredpay-schema-validate` (days 8–9; the days 4–5
word-count quote is superseded — the recorded 5 Nov demo run used
it, the live service no longer does). All values below were computed
with the real registered seller key (`tedious-sea.testnet`) from the
canonical bodies shown; recompute them with
`../shared/canonical.mjs` + `../shared/ed25519.mjs` before trusting
them. `input_sha256` is the SHA-256 hex of the canonical
`{ schema, document }` input (keys sorted, no whitespace, UTF-8).

Request: `POST /call` with
`{"call_id": "example-001", "buyer_account_id": "example-buyer.testnet",
"input": {"schema": "quote", "document": {"text": "hello"}}, "scenario": "success"}`
(scenario is demonstrator-only; a real seller ignores it).

Success — canonical body (keys sorted recursively, no whitespace,
UTF-8):
`{"call_id":"example-001","output":{"char_count":5,"errors":[],"excerpt":"hello","input_sha256":"3935cabae82f6d46515380701ce5b14dd960d89cbff179777fab791f67d7e683","schema":"quote","service":"meteredpay-schema-validate","valid":true,"word_count":1},"price_per_call_yocto":"100000000000000000000000","seller_account_id":"tedious-sea.testnet","status":"success"}`

`response_hash` = SHA-256 hex of that canonical body:
`2635b45d484208aa7c46bd921c94904fc95244a510dd966f27f9ae3c27685841`

Exact success response JSON (fields in wire order; verify the hash
and signature against it):
```json
{"call_id":"example-001","status":"success","output":{"service":"meteredpay-schema-validate","schema":"quote","valid":true,"errors":[],"input_sha256":"3935cabae82f6d46515380701ce5b14dd960d89cbff179777fab791f67d7e683","word_count":1,"char_count":5,"excerpt":"hello"},"response_hash":"2635b45d484208aa7c46bd921c94904fc95244a510dd966f27f9ae3c27685841","seller_signature":"u8tIAgDZZejCwGK30Wu5rOZwjYokBoqWAd4oPy0BhtTvaY31aKMecIeutbpMyYhaKgTKhUwJ/GBu0FKO2msSCw==","seller_account_id":"tedious-sea.testnet","price_per_call_yocto":"100000000000000000000000"}
```

Payment-instruction — request with
`{"call_id": "example-002", "buyer_account_id": "example-buyer.testnet",
"input": {"schema": "payment-instruction", "document": {"payee": "alice.testnet", "amount_yocto": "2500000000000000000000000", "memo": "Invoice 7"}}, "scenario": "success"}`.
Canonical body:
`{"call_id":"example-002","output":{"amount_yocto":"2500000000000000000000000","errors":[],"input_sha256":"e720547a81d5246d04266e5389d0f5ba67570241c7145e9da9f7988c672ab899","memo":"Invoice 7","payee":"alice.testnet","schema":"payment-instruction","service":"meteredpay-schema-validate","valid":true},"price_per_call_yocto":"100000000000000000000000","seller_account_id":"tedious-sea.testnet","status":"success"}`

`response_hash`:
`809111ad1886b3884cbc20f4cbd32703ea942beef9de8499a3bc7340969b03bc`

Seller signature:
`4j16nB54rP6vBRVexJNtzxKRV95dM0YlPnurBuDwFdznKbcdfODaV6pb8Kt8t8l+jftRRmLIX7bTKTAwDxy8AA==`

Invalid document — same quote request with
`"input": {"schema": "quote", "document": {"text": 42}}` and
`call_id` `example-003`. The seller returns a FAILURE (never a paid
success). Canonical error body:
`{"call_id":"example-003","error_code":"VALIDATION_FAILED","error_message":"Document failed schema 'quote': 1 error(s) — text: required: document.text must be a string","price_per_call_yocto":"100000000000000000000000","seller_account_id":"tedious-sea.testnet","status":"failed"}`

`response_hash`:
`54008fe79a248051b22b5518ac267494af0abc7befd8a5ed8edcd0c4f06e1ec0`

Exact failure response JSON (the `errors` list and `input_sha256`
are unhashed wire fields — the error attestation covers the hashed
error body above only):
```json
{"call_id":"example-003","status":"failed","error_code":"VALIDATION_FAILED","error_message":"Document failed schema 'quote': 1 error(s) — text: required: document.text must be a string","errors":[{"field":"text","reason":"required: document.text must be a string"}],"input_sha256":"6ff36288f0f5a45adb5ca4726afdb89a050c1ae4b0bd95d5a28d903d9bb00d72","response_hash":"54008fe79a248051b22b5518ac267494af0abc7befd8a5ed8edcd0c4f06e1ec0","seller_signature":"wO1LwfN6unc0Oqlb/pq1S+qVAMaVcn7kLEssY+CQ7vTvh0ZMP/HnRfVKmGN/WhtX2fwWxVK/6Qu6XMuSC1erAA==","seller_account_id":"tedious-sea.testnet","price_per_call_yocto":"100000000000000000000000"}
```

Failure (demonstrator) — same request as the quote success with
`"scenario": "fail"`. Canonical body:
`{"call_id":"example-001","error_code":"DEMO_SELLER_ERROR","error_message":"Demonstrator seller failed this call on purpose (scenario=fail).","price_per_call_yocto":"100000000000000000000000","seller_account_id":"tedious-sea.testnet","status":"failed"}`

`response_hash`:
`1607da52bb3a8364ad17a369af11e473fa115875e87fd7c0e66d731b763d9cda`

Exact failure response JSON:
```json
{"call_id":"example-001","status":"failed","error_code":"DEMO_SELLER_ERROR","error_message":"Demonstrator seller failed this call on purpose (scenario=fail).","response_hash":"1607da52bb3a8364ad17a369af11e473fa115875e87fd7c0e66d731b763d9cda","seller_signature":"XQS3fc7ATtv89nH/G4IHWfq2ygQCo9FeHxTnTdNusFuSW/8t4DbB7TG7hJj5Av5kVqUj/Ft0dNikWbYAr4+nAw==","seller_account_id":"tedious-sea.testnet","price_per_call_yocto":"100000000000000000000000"}
```

Signature messages (len = UTF-8 byte length, decimal, no padding;
signatures are base64 of the raw 64-byte ed25519 signature):
- Seller attestation: `meteredpay-v1-seller|<len(call_id)>:<call_id>|<len(response_hash)>:<response_hash>`
- Seller error attestation: `meteredpay-v1-seller-error|<len(call_id)>:<call_id>|<len(seller_error_hash)>:<seller_error_hash>`
- Buyer success: `meteredpay-v1-buyer-success|<len(call_id)>:<call_id>|<len(response_hash)>:<response_hash>|<len(price_yocto)>:<price_yocto>|<len(seller_account_id)>:<seller_account_id>`
- **Failure responses carry ONE signature field, `seller_signature`,
  holding the seller-ERROR attestation.** The same field name carries
  two different message formats (success vs error), distinguished by
  context (`status`). This is the implemented shape (reconciled
  6 Nov 2026; prep/04 §3.1 amended to match).

## Common mistakes (read before implementing)

**The one-field / two-format signature trap.** `seller_signature`
is a single field, but it carries two different signed messages
depending on `status`:

- `status: "success"` → the seller attestation:
  `meteredpay-v1-seller|<len(call_id)>:<call_id>|<len(response_hash)>:<response_hash>`
- `status: "failed"` → the seller ERROR attestation:
  `meteredpay-v1-seller-error|<len(call_id)>:<call_id>|<len(seller_error_hash)>:<seller_error_hash>`
  (where `seller_error_hash` is the failure response's
  `response_hash`)

The field name gives no hint which format was signed — only the
`status` context does. The common mistake is to sign (or verify)
one format while the other applies: e.g. taking a failure
response's `seller_signature` and submitting it as the success
attestation in `submit_success`, or verifying a success signature
against the error message. The signature is a valid ed25519
signature over the wrong message, so it verifies locally against
that message — and the contract rejects it on-chain with
`Invalid seller signature`, with no further diagnosis. The error
string alone cannot tell you whether the key was wrong or the
format was wrong: check the format first.

**Failing test vector (real, from the repo's evidence).** The
days 6–7 third-party dry run (`seller-api-dryrun/`, buyer
`dryrun-buyer.testnet`, call `dry-success-001`) shows exactly what
this rejection looks like on-chain: the dry-run seller's response
hash `171967f768b47c8315e1e7cb1caa343836d373aedd6ab4fa3e8d47e6e2aafebe`
verified locally against the dry-run key, and `submit_success` was
rejected on-chain with `Invalid seller signature` — rejection
transaction
`https://testnet.nearblocks.io/txns/4T3sSqEp9pb5RJvt9aZ8KF3UiX5tfC3etsojCDzEETdT`
(RPC `tx` query confirms status Failure, "Smart contract panicked:
Invalid seller signature"); the call stayed `paid` (held) and
balances were unchanged. (In that run the cause was the key itself:
the dry-run key was not the registered seller key. A format mix-up
produces the same error string — which is the point: never read the
cause off the error alone.) Run log:
`seller-api-dryrun/runs/dryrun-dryrun-buyer.testnet-2026-11-05T19-52-32.jsonl`.

**Check before you test live.** Verify both worked examples in
Appendix A2 with `../shared/canonical.mjs` +
`../shared/ed25519.mjs`: the success response for `example-001`
carries a signature over the seller-attestation message, and the
failure response for `example-003` (`seller_signature`
`wO1LwfN6unc0Oqlb/pq1S+qVAMaVcn7kLEssY+CQ7vTvh0ZMP/HnRfVKmGN/WhtX2fwWxVK/6Qu6XMuSC1erAA==`)
carries a signature over the seller-ERROR message. If you verify
the `example-003` signature against the success message (or vice
versa), verification fails — that is the trap, caught locally
instead of on-chain.

All values above were computed with the real registered seller
key (`tedious-sea.testnet`) from the canonical bodies shown; recompute
them with `../shared/canonical.mjs` + `../shared/ed25519.mjs` before
trusting them.

### A3. Decision table (no guessing)

| Question | Answer |
|---|---|
| Failure transport | HTTP 200 with `status: "failed"` for a seller error. HTTP 400 only for malformed requests (`BAD_REQUEST`); 404 for unknown routes. A 4xx/5xx is treated by the buyer as failure, never success. |
| Error codes | `DEMO_SELLER_ERROR` (seller failure), `VALIDATION_FAILED` (document failed a fixed schema — full `{field, reason}` list in the unhashed `errors` wire field), `BAD_REQUEST`, `NOT_FOUND`, `TIMEOUT_TOO_LATE` (seller responded after the buyer's 30 s wait — the buyer has already aborted; never render as success). Map to contract `failure_reason`: seller error → `seller_error`; hash/signature mismatch → `invalid_response`; no response in 30 s → `timeout`. |
| Timeout (seller side) | Hold the connection; the buyer aborts at 30 s. If you respond after that, the buyer ignores it. Do not return a late success. |
| Startup | Refuse to start if your credential key differs from the key registered on-chain, or if the contract price cannot be confirmed and no trusted fallback exists. Warn-and-start on a stale price is not acceptable. |
| Body | `Content-Type: application/json` required; body cap 65,536 bytes; input `{ "schema": "<quote \| payment-instruction \| invoice>", "document": { ... } }` for the demonstrator (legacy bare `{ "text": "..." }` still accepted as the quote schema). |
| Validation | Deterministic, pure, no network calls: the same document always validates the same way. A document that fails validation returns `status: "failed"` / `VALIDATION_FAILED` (never a paid success); a document that passes returns `status: "success"` with `valid: true` and the schema result. Every success output carries `input_sha256` (SHA-256 hex of the canonical `{ schema, document }` input). |
| `call_id` | Echo it; do not create a contract call. The seller does not verify on-chain state before serving; the contract is the trust boundary. |
| `/health` | `{"status": "ok", "seller_account_id", "price_per_call_yocto", "service", "mode": "demonstrator"}`. `service` is any short name; third-party mode is still `"demonstrator"` until a non-demo deployment exists. |
| Seller never… | …calls the contract, …marks its own calls successful, …receives a deduction by returning a response. Only a buyer-verified, payer-signed success receipt deducts. Buyer dishonesty is NOT solved: a buyer could claim failure after a genuine success. |
