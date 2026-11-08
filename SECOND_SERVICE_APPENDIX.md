# MeteredPay — second service appendix (PROVEN 8 Nov 2026)

**Status: DEPLOYED + PROVEN on NEAR testnet, 8 Nov 2026.**
This appendix records a second service of a different kind —
a deterministic extractive summariser — proven end-to-end on a
third contract instance deployed from the same wasm. It is an
appendix only: the frozen contract `apathetic-party.testnet` is
untouched and remains the judge-replay target (README §2.5), and
the multi-seller appendix (`MULTI_SELLER_APPENDIX.md`) is
untouched. Nothing in this file changes the frozen entry, its
Test 19 evidence, its video, or its dashboard.

## What "second service" means here — read this first

The contract (`src/lib.rs`, frozen) knows nothing about services.
It registers exactly one seller at init, one price per call, one
timeout, and it pays only on a buyer-verified, payer-signed
success receipt: the buyer recomputes the seller response hash
from the canonical body, verifies the seller attestation, and only
then signs. The contract checks the two signatures and the hash —
it cannot recompute the API body and cannot tell one job from
another. So "a second service" here means **a different seller
API serving a different job, metered by the same receipt flow on
a new instance of the same contract** — not a contract change.
The same metering primitive prices a second, different service,
and that is the point. Anyone claiming the contract distinguishes
services, or that this instance shares a deposit with instances
A/B, is wrong.

## The same code

- Wasm SHA-256 (verified before deploy, unchanged from the freeze):
  `c54ae8e9d657338ccc695d32689fac322aaa1d77b90fd90e0ed63f86decbb3b0`
- On-chain code hash on **all four** contracts (frozen + A + B +
  C, RPC `view_code`): `EH9ZtfU7FbRNSFTDUqTZoE9gQ7jRQ5Qb7cWDoMuBRRGB`
- `git diff src/lib.rs` empty at deploy time and at the end of
  this run (HEAD `1517804`).

## The third instance

| | Instance C |
|---|---|
| Contract account | `mp-meteredpay-c.testnet` |
| Account creation tx | [`HTNNssAmCMH1fcxRiSsbZQnWyZDuBUtvytAfJrHU6fSh`](https://testnet.nearblocks.io/txns/HTNNssAmCMH1fcxRiSsbZQnWyZDuBUtvytAfJrHU6fSh) |
| Deploy + init tx | [`2Tayvm42ER2n9Yq9kw5vpDKDoYXMmmrvLDkVTeNkjTFF`](https://testnet.nearblocks.io/txns/2Tayvm42ER2n9Yq9kw5vpDKDoYXMmmrvLDkVTeNkjTFF) |
| Seller | `mp-seller2.testnet` (the same seller account as instance B) |
| Seller public key | `ed25519:BoVrSvynnQ9Y1bKszwQaBhGA6DiKefwVtNy7KGfDSNze` |
| Price / timeout | **0.05 testnet NEAR** / 600 s (instances A/B and frozen charge 0.1) |
| Seller API (local, run 8 Nov) | `127.0.0.1:8789` (frozen seller keeps 8787, instance B keeps 8788) |

`get_seller` on instance C returns exactly its init values
(verified on-chain 8 Nov): seller `mp-seller2.testnet`, price
`50000000000000000000000`, timeout `600`. Deploy command (same
routine as `MULTI_SELLER_RUNBOOK.md` §4, price arg changed):

```bash
near contract deploy mp-meteredpay-c.testnet \
  use-file target/near/meteredpay.wasm \
  with-init-call init json-args '{"seller_account_id": "mp-seller2.testnet", "seller_public_key": "ed25519:BoVrSvynnQ9Y1bKszwQaBhGA6DiKefwVtNy7KGfDSNze", "price_per_call": "50000000000000000000000", "call_timeout_seconds": "600"}' \
  prepaid-gas '100.000 TeraGas' attached-deposit '0 NEAR' \
  network-config testnet sign-with-keychain send
```

Run the seller:

```bash
cd seller-api && SELLER_ACCOUNT_ID=mp-seller2.testnet \
  CONTRACT_ID=mp-meteredpay-c.testnet PORT=8789 node server-summarise.mjs
# Expected first output: "[seller] contract mp-meteredpay-c.testnet
#   confirmed: seller=mp-seller2.testnet price=50000000000000000000000
#   yoctoNEAR timeout=600s"
```

## The service: `meteredpay-summarise`

Implemented in `seller-api/server-summarise.mjs`. Input: long
text (`POST /call`, `{ text }`, or `{ schema: "summarise",
document: { text } }`). Output: the top-3 sentences by a fixed
deterministic score + word counts + input SHA-256.

The fixed rule (frozen for this service — do not tune without
updating this appendix and the worked example below):

1. Split the text into sentences on `.` `!` `?` followed by
   whitespace (or end of text). Sentences are kept verbatim.
2. Tokenise on lowercase `[a-z0-9']` runs; drop a fixed stopword
   list. Count each remaining word's frequency over the whole
   input.
3. Sentence score = sum of the frequencies of its non-stopwords.
   Ties break towards the earlier sentence.
4. Take the 3 highest-scoring sentences, return them in original
   input order.

Success requires at least 4 sentences AND at least 40 words.
Anything shorter or empty is a seller failure —
`error_code: INPUT_TOO_SHORT` — a **different failure mode from
schema validation** (`VALIDATION_FAILED`), and the one the demo
run exercises. A failed call is never a paid success: the buyer
submits a failure claim with the seller-signed error attestation
and the held amount is released, never deducted.

**No quality claim is made.** Extractive means the summary is
made only of sentences copied verbatim from the input — nothing
is generated, paraphrased, or invented. Deterministic means the
same input always produces the same summary (verified below: the
same input twice returned byte-identical output and hash). A
high-frequency sentence is not necessarily a good summary, and
nothing here claims it is.

The receipt flow is identical to the schema-validate seller
(`shared/canonical.mjs`): `response_hash` is the hex SHA-256 of
the canonical body (keys sorted, no whitespace) containing
`call_id`, `status`, `output` (or `error_code`/`error_message`),
`seller_account_id` and `price_per_call_yocto`. The buyer
recomputes the hash before signing anything, exactly as before.

## Proof — Test 19-style run on instance C (fresh faucet buyer)

Buyer: `mp-rf2-buyer.testnet` (creation tx
[`BSsf6b5Wb4Jr4DtEiDPsQ1YNSZjsnrymuAMW8vSqPocR`](https://testnet.nearblocks.io/txns/BSsf6b5Wb4Jr4DtEiDPsQ1YNSZjsnrymuAMW8vSqPocR)).
Demo run: `CONTRACT_ID=mp-meteredpay-c.testnet
SELLER_ACCOUNT_ID=mp-seller2.testnet node buyer/buyer.mjs --buyer
mp-rf2-buyer.testnet --mode demo --tag rf2-c --api
http://127.0.0.1:8789 --service summarise --deposit 0.5 --cap 0.1`,
**exit 0**. Run log:
`buyer/runs/demo-mp-rf2-buyer.testnet-2026-11-08T09-17-37.jsonl`.
All 11 recorded txs re-checked via `./replay.sh verify-only`:
**VERIFY-ONLY OK**.

| Step | Tx |
|---|---|
| Deposit 0.5 | [`DReEnvgBTcpBqa9oZWUYSieGt17xzphUBDpuKQkssA9D`](https://testnet.nearblocks.io/txns/DReEnvgBTcpBqa9oZWUYSieGt17xzphUBDpuKQkssA9D) |
| Cap 0.1 | [`4bVPrL8rHivPM3sK9XRYBgNZwEoMCxFDkaWUujqbFFR1`](https://testnet.nearblocks.io/txns/4bVPrL8rHivPM3sK9XRYBgNZwEoMCxFDkaWUujqbFFR1) |
| Success 1 — request | [`7qwxt1DvMBnqfSSTnXg6MbdHyvBxQrMjnU31gcmUq6xR`](https://testnet.nearblocks.io/txns/7qwxt1DvMBnqfSSTnXg6MbdHyvBxQrMjnU31gcmUq6xR) |
| Success 1 — deducted 0.05 | [`6vZmvLdpQkX1idrQap3rGsq4YoBKYzqa6yecCaxfX25y`](https://testnet.nearblocks.io/txns/6vZmvLdpQkX1idrQap3rGsq4YoBKYzqa6yecCaxfX25y) |
| Fail — request | [`768DXjmrRS8dc3X11fJV2WSFNs9aV2PGcnyiV6EuLBMC`](https://testnet.nearblocks.io/txns/768DXjmrRS8dc3X11fJV2WSFNs9aV2PGcnyiV6EuLBMC) |
| Fail — released, no deduction (`INPUT_TOO_SHORT`, `seller_error`) | [`DsuUaPJwdmYtZYsmMtDAjAGyGMe1qfQvLUgyxmQF8kte`](https://testnet.nearblocks.io/txns/DsuUaPJwdmYtZYsmMtDAjAGyGMe1qfQvLUgyxmQF8kte) |
| Timeout — request | [`9etdUMWm5hCfhwu1SGnyu5iVYHW4CAAvaoXvwFSuQy9y`](https://testnet.nearblocks.io/txns/9etdUMWm5hCfhwu1SGnyu5iVYHW4CAAvaoXvwFSuQy9y) |
| Timeout — released after 30 s wait | [`gcdusHSNLBGGAdu6UPtQ3Xkxp1vKJEza7YNxD1LBsLy`](https://testnet.nearblocks.io/txns/gcdusHSNLBGGAdu6UPtQ3Xkxp1vKJEza7YNxD1LBsLy) |
| Success 2 — request | [`CYTxT4BThLDX5H3972m1A81ZU4Bk2oov32aQ2zajUPGe`](https://testnet.nearblocks.io/txns/CYTxT4BThLDX5H3972m1A81ZU4Bk2oov32aQ2zajUPGe) |
| Success 2 — deducted 0.05 | [`CqLkEtp6pq8nzfjjRfbGVDZkCpH7n2AYQYGucw7AUxge`](https://testnet.nearblocks.io/txns/CqLkEtp6pq8nzfjjRfbGVDZkCpH7n2AYQYGucw7AUxge) |
| Third success — refused, reason `over_budget` | [`zhfvPAFBFvTRtubYdT2s3VkARtmAzw8KMeSPPwh5Aw5`](https://testnet.nearblocks.io/txns/zhfvPAFBFvTRtubYdT2s3VkARtmAzw8KMeSPPwh5Aw5) |

Final on-chain state (re-checked independently via
`get_buyer_balance`, not just the script's own print):
**deposit 0.5 / held 0 / spent 0.1 / available 0.4 / cap 0.1**.
Seller earned 0.1, withdrawn 0 (`get_seller_balance`:
seller `mp-seller2.testnet`, earned
`100000000000000000000000`, withdrawn `0`). This is the first
deduction ever paid to `mp-seller2.testnet` for the summariser
service (its instance-B deductions were for schema validation).

Success 1 (`rf2-c-success-001`) paid for this summary of a
7-sentence, 114-word input (input SHA-256
`ac2a9740eb9d05770752d31e95123eccaac6c2e1cd3b953c34f4daac1977c893`,
recomputed below): sentences 1, 2 and 5 of the input, verbatim —
"The buyer deposits testnet NEAR into a contract, sets a budget
cap, and requests a call from a registered seller.",
"The seller serves the response and signs an attestation that it
served that response for that call.",
"A failed call releases the held amount instead of deducting it,
and a call that times out releases the held amount too."
Response hash
`bac8e9303f7eb5de0abb66454f885d7ac24e1aa7cb79a57d7e56d94fd274fdcd`
(recomputed from the run-log output with
`shared/canonical.mjs` — match). Success 2 response hash
`4856bdb6f05bfb065b76601d290be93f186307ed82981a5dd803e1b91d59142d`
(also recomputed — match).

## Worked example (recomputed with `shared/canonical.mjs`)

All values below were computed with the real registered seller
key (`mp-seller2.testnet`) from the canonical bodies shown; the
success and failure response hashes were recomputed with
`shared/canonical.mjs` + `shared/ed25519.mjs` and both match, and
both seller signatures verify against the registered public key.
`input_sha256` is the SHA-256 hex of the canonical `{ text }`
input (keys sorted, no whitespace, UTF-8).

Input text (6 sentences, 104 words — the local test input):
"MeteredPay charges a small fixed price for each successful
service call, and nothing for a failure. The buyer deposits
testnet NEAR into a contract, sets a budget cap, and requests a
call from a registered seller. The seller serves the response and
signs an attestation that it served that response for that call.
The buyer verifies the response hash and the seller signature
before signing any payment authorisation. Only a buyer-verified,
payer-signed success receipt can deduct money from the deposit on
chain. A failed call releases the held amount instead of
deducting it, and a call that times out releases the held amount
too."

Request: `POST /call` with
`{"call_id": "local-001", "buyer_account_id": "local-buyer.testnet",
"input": {"text": "<the text above>"}, "scenario": "success"}`.

Success — canonical body (keys sorted recursively, no whitespace,
UTF-8):
`{"call_id":"local-001","output":{"deterministic":true,"input_sha256":"f70aeec75e1165642b91e5355299defa9f9c93ed77152f6356e03d7c2293779a","input_word_count":104,"method":"extractive","sentence_count":6,"sentence_scores":[{"score":20,"sentence_index":1},{"score":18,"sentence_index":2},{"score":26,"sentence_index":5}],"service":"meteredpay-summarise","summary":["The buyer deposits testnet NEAR into a contract, sets a budget cap, and requests a call from a registered seller.","The seller serves the response and signs an attestation that it served that response for that call.","A failed call releases the held amount instead of deducting it, and a call that times out releases the held amount too."],"summary_word_count":59},"price_per_call_yocto":"50000000000000000000000","seller_account_id":"mp-seller2.testnet","status":"success"}`

`response_hash` = SHA-256 hex of that canonical body:
`d052f4d341d61654b66e3fa416998e5ab55b71d084787fd20c9fbc7e73a5237d`

Exact success response JSON (fields in wire order):
```json
{"call_id":"local-001","status":"success","output":{"service":"meteredpay-summarise","method":"extractive","deterministic":true,"summary":["The buyer deposits testnet NEAR into a contract, sets a budget cap, and requests a call from a registered seller.","The seller serves the response and signs an attestation that it served that response for that call.","A failed call releases the held amount instead of deducting it, and a call that times out releases the held amount too."],"sentence_scores":[{"sentence_index":1,"score":20},{"sentence_index":2,"score":18},{"sentence_index":5,"score":26}],"sentence_count":6,"input_word_count":104,"summary_word_count":59,"input_sha256":"f70aeec75e1165642b91e5355299defa9f9c93ed77152f6356e03d7c2293779a"},"response_hash":"d052f4d341d61654b66e3fa416998e5ab55b71d084787fd20c9fbc7e73a5237d","seller_signature":"vREWzm0SS9Rd+QtQCv1RjHEDUdHaScddkjefZuxlgtFuEbXVxj7YkbhBnP6UkcFvQH7W9JRPQbMTRgG8EiH4CA==","seller_account_id":"mp-seller2.testnet","price_per_call_yocto":"50000000000000000000000"}
```

Determinism check: the same request sent twice returned
byte-identical output and hash.

Failure — same shape with `"input": {"text": "Too short."}` and
`call_id` `local-002`. Canonical error body:
`{"call_id":"local-002","error_code":"INPUT_TOO_SHORT","error_message":"Input too short for extractive summary: need at least 4 sentences and 40 words, got 1 sentence(s) and 2 word(s).","price_per_call_yocto":"50000000000000000000000","seller_account_id":"mp-seller2.testnet","status":"failed"}`

`response_hash`:
`d789fb3656ef478632f47666bc79039ce1fd33d1bb0121ebdf7e0194db3a5115`

Exact failure response JSON:
```json
{"call_id":"local-002","status":"failed","error_code":"INPUT_TOO_SHORT","error_message":"Input too short for extractive summary: need at least 4 sentences and 40 words, got 1 sentence(s) and 2 word(s).","sentence_count":1,"input_word_count":2,"input_sha256":"050b09e2924a8c543c45e74b54869f668b2887af3c39f9e6764864e59a63242b","response_hash":"d789fb3656ef478632f47666bc79039ce1fd33d1bb0121ebdf7e0194db3a5115","seller_signature":"jMXjKzbKTYPvVbWQ+PvCqa138VOjnnqXl6FBc+udoH2rzrEDj4thKDIvujbupBbMV7KOmpJ5vd9CxfZLu0y1Ag==","seller_account_id":"mp-seller2.testnet","price_per_call_yocto":"50000000000000000000000"}
```

Run-log input check: the demo input for `rf2-c-success-001`
(the buyer's fixed 7-sentence text plus its call id) hashes to
`ac2a9740eb9d05770752d31e95123eccaac6c2e1cd3b953c34f4daac1977c893`,
matching the `input_sha256` recorded in the run log — recomputed
from the reconstructed input with `shared/canonical.mjs`.

## Buyer service selection

`buyer/buyer.mjs` takes `--service validate|summarise`
(or env `MP_SERVICE`); default `validate` is the frozen demo
path and is unchanged. With `summarise` the buyer sends the
summariser's `{ text }` input (a fixed long text for success
calls) and exercises the service's own failure mode for the fail
call (short text `"Too short."` under scenario `success`, claimed
`seller_error` with the `INPUT_TOO_SHORT` attestation — not
`DEMO_SELLER_ERROR`). The receipt flow, deposit/cap handling,
timeout handling, refusal handling, and run-log format are
identical. Single mode also accepts `--service summarise`
(`--document` must then be JSON `{ text }`).

## Regression — frozen path still exits 0

After the instance-C run, the frozen Test 19 / freeze1011 replay
was re-run untouched: `./replay.sh --buyer
freeze1011-buyer.testnet`, **exit 0, REPLAY OK in 238 s**.
Fresh buyer `freeze1011-buyer-rtqirvk.testnet` (creation tx
[`Cd86B2HQ6BWj6JmviCXKmqe5V77hqhemUFMtDzy2xaA6`](https://testnet.nearblocks.io/txns/Cd86B2HQ6BWj6JmviCXKmqe5V77hqhemUFMtDzy2xaA6))
against the frozen contract `apathetic-party.testnet` with the
frozen seller on 8787. Final state as expected:
**deposit 0.5 / held 0 / spent 0.2 / available 0.3 / cap 0.2**.
Run log:
`buyer/runs/demo-freeze1011-buyer-rtqirvk.testnet-2026-11-08T09-22-04.jsonl`
(deposit
[`CZuhuPziWCrhFdTF6TXBQrzy74cVgVhTdNdY4tfWxt1K`](https://testnet.nearblocks.io/txns/CZuhuPziWCrhFdTF6TXBQrzy74cVgVhTdNdY4tfWxt1K),
cap
[`5VVa5PcQgeVjSstse38a212FDbcGvXfTHs6XCWTthTjK`](https://testnet.nearblocks.io/txns/5VVa5PcQgeVjSstse38a212FDbcGvXfTHs6XCWTthTjK),
success 1 deducted
[`9a9vxjXY9ooBWvBAhFgwRHWxEDVvsb33hDGe1Jtx9oX5`](https://testnet.nearblocks.io/txns/9a9vxjXY9ooBWvBAhFgwRHWxEDVvsb33hDGe1Jtx9oX5),
fail released
[`5dVmGQVK4679He5DvojTXG3GyjuSEazsAqswm5bGxwyq`](https://testnet.nearblocks.io/txns/5dVmGQVK4679He5DvojTXG3GyjuSEazsAqswm5bGxwyq),
timeout released
[`Fp8AvmexCWDLnm9WMuyiwec7JBkmKz4AvwS523i8dbZ9`](https://testnet.nearblocks.io/txns/Fp8AvmexCWDLnm9WMuyiwec7JBkmKz4AvwS523i8dbZ9),
success 2 deducted
[`25skVkQ4n6BbRc6kijsvmycfX82V5dE9ZqdVTMaqtmnP`](https://testnet.nearblocks.io/txns/25skVkQ4n6BbRc6kijsvmycfX82V5dE9ZqdVTMaqtmnP),
refused `over_budget`
[`7afip1oVu82zGP8AqFFe8cbvp6hdSwtJC4CDMW3NN3CP`](https://testnet.nearblocks.io/txns/7afip1oVu82zGP8AqFFe8cbvp6hdSwtJC4CDMW3NN3CP)).
The frozen seller (port 8787) was never restarted or edited for
this work.

## What this does NOT claim

- **Same seller as instance B, different price, no shared
  deposit.** `mp-seller2.testnet` is the seller on both instance
  B (0.1 NEAR, schema validation) and instance C (0.05 NEAR,
  summarisation). A buyer deposit on one instance cannot be spent
  on the other; each instance holds its own deposits, caps, and
  seller earnings.
- **The contract cannot tell services apart.** A success receipt
  for a summary and one for a validation are indistinguishable
  on-chain by design — the contract verifies signatures and the
  hash, not the job. The service identity lives only in the
  seller response body the buyer verified off-chain.
- **No summary-quality claim.** The summary is three verbatim
  input sentences chosen by word frequency. It is deterministic,
  not good. No ROUGE score, no human rating, no comparison with
  any other summariser is claimed.
- **Buyer dishonesty is NOT solved** (as in the frozen entry): a
  buyer could claim failure after a genuine success. The design
  protects the buyer from paying for failure; it does not protect
  the seller from a dishonest buyer.
- **Local demonstrator only.** The summariser ran on
  `127.0.0.1:8789` during the run; it is not hosted, and no
  dashboard, video, or submission text covers instance C yet.
- **Testnet only.** All payments are NEAR testnet faucet tokens
  with no monetary value.
