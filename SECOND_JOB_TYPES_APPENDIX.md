# MeteredPay — second and third job types appendix (PROVEN 8 Nov 2026)

**Status: PROVEN on NEAR testnet, 8 Nov 2026.** This appendix records
invoice and payment-instruction calls through the frozen single-seller
entry. It is an appendix only: the frozen contract
`apathetic-party.testnet` is untouched and remains the judge-replay
target (README §2.5). Nothing in this file changes the frozen entry,
its Test 19 evidence, its video, or its dashboard. No code was
changed for this run: `git diff src/lib.rs` is empty, and no source
file was edited at all.

## What this proves — read this first

**Second/third job types through the same metering primitive, same
seller, same service.** The seller service
`meteredpay-schema-validate` already defined three schemas (`quote`,
`payment-instruction`, `invoice`) in
`seller-api/SELLER_SPEC.md` and `seller-api/server.mjs`, but the
canonical recorded run exercised only `quote`. This run proves the
other two schemas actually pay (and actually fail) through the same
contract, the same seller, and the same validator — with different
document types, not a different service. It is the same validator
with different document types: one service, one seller, one contract,
three document shapes. This is **not** a second service.

Judge 2's finding, verified before this run: `grep -ril
"invoice\|payment-instruction" buyer/runs/` returned **no matches**
(exit 1) — no invoice or payment-instruction run existed in
`buyer/runs/` before 8 Nov 2026. The three runs below are the first.

## The frozen setup (unchanged)

- Contract (NEAR testnet, frozen): `apathetic-party.testnet`
- Seller (registered on-chain): `tedious-sea.testnet`
  (`ed25519:6zG7yLp2jqHxfkXfYgsL1ZXSf2NVQoRRaib6im72ubnm`,
  re-checked via `get_seller` during this run)
- Price: 0.1 testnet NEAR per successful call, timeout 600 s
- Service: `meteredpay-schema-validate` (local,
  `http://127.0.0.1:8787`, stopped after the runs; not hosted)
- Buyer (fresh faucet account): `mp-rf2-cjyhp9.testnet`
  (creation tx
  [`7Soiw8xryZhyt3XZBn4hUYckQv44gbcDqbeMf2qu4uNy`](https://testnet.nearblocks.io/txns/7Soiw8xryZhyt3XZBn4hUYckQv44gbcDqbeMf2qu4uNy))
- Deposit 0.5 / cap 0.2, as in the canonical run
- Buyer command (single mode, `--mode single` already accepts
  `--schema` / `--document`; `--mode demo` hardcodes `quote` and was
  not changed):
  `node buyer/buyer.mjs --buyer mp-rf2-cjyhp9.testnet --mode single
  --tag <tag> --deposit 0.5 --cap 0.2 --schema <schema>
  --document '<json>'`

## Run order — why the invalid run went first

The three calls share one buyer, one 0.5 deposit and one 0.2 cap.
Two successes deduct 0.2, which exhausts the cap: a third
`request_call` after that would be refused on-chain as
`over_budget` before the document ever reached validation. So the
invalid-document run went **first** (hold released, spent still 0),
then the two valid runs. The final state is therefore identical to
the canonical run: deposit 0.5 / held 0 / spent 0.2 / available 0.3
/ cap 0.2. Execution order was invalid → invoice → payment-
instruction; the table below lists them in the task's (a)/(b)/(c)
order.

## Proof — three `--mode single` runs, one fresh buyer

### (a) Invoice schema, valid document — success deducts 0.1

Call ID `rf2-invoice-single-2026-11-08T09-17-12-0ybhos`.
Document sent:
`{"invoice_id":"INV-RF2-001","amount_yocto":"1000000000000000000000000","currency":"NEAR","due_date":"2026-12-01"}`
Seller output (the result paid for):
`{"service":"meteredpay-schema-validate","schema":"invoice","valid":true,"errors":[],"input_sha256":"d8088b2dc68fbbbb0dda7203f5cca0748ad6a168fd707138250354c9fb37f2e3","invoice_id":"INV-RF2-001","amount_yocto":"1000000000000000000000000","currency":"NEAR","due_date":"2026-12-01"}`
Outcome `success-deducted`, `seller_registered: true`.
Run log:
`buyer/runs/single-mp-rf2-cjyhp9.testnet-2026-11-08T09-17-12.jsonl`.

| Step | Tx |
|---|---|
| Request | [`EBRgdKziMCfWCo33M58Z8sjny9ZsnQZNG6zgxCzZJHed`](https://testnet.nearblocks.io/txns/EBRgdKziMCfWCo33M58Z8sjny9ZsnQZNG6zgxCzZJHed) |
| Success — deducted 0.1 | [`5ehLby81ZVdueWXaCEGQHjALBDx9D7jWqkrwetR421fN`](https://testnet.nearblocks.io/txns/5ehLby81ZVdueWXaCEGQHjALBDx9D7jWqkrwetR421fN) |

### (b) Payment-instruction schema, valid document — success deducts 0.1

Call ID `rf2-payinstr-single-2026-11-08T09-18-10-vt0hzd`.
Document sent:
`{"payee":"alice.testnet","amount_yocto":"1000000000000000000000000"}`
Seller output (the result paid for):
`{"service":"meteredpay-schema-validate","schema":"payment-instruction","valid":true,"errors":[],"input_sha256":"5430c69143767f32078fce6f7710cb7ec92fec968463215b869564e73cdc8675","payee":"alice.testnet","amount_yocto":"1000000000000000000000000","memo":null}`
Outcome `success-deducted`, `seller_registered: true`.
Run log:
`buyer/runs/single-mp-rf2-cjyhp9.testnet-2026-11-08T09-18-10.jsonl`.

| Step | Tx |
|---|---|
| Request | [`tZnXwVHaVCCXGtCsikX9hozyf1GiwaV2kzp1LNj1vuZ`](https://testnet.nearblocks.io/txns/tZnXwVHaVCCXGtCsikX9hozyf1GiwaV2kzp1LNj1vuZ) |
| Success — deducted 0.1 | [`9bAjz238Mtye8Vz8UCFDsN8614PUZZY2jo5ndWuKJw1W`](https://testnet.nearblocks.io/txns/9bAjz238Mtye8Vz8UCFDsN8614PUZZY2jo5ndWuKJw1W) |

### (c) Invoice schema, INVALID document — VALIDATION_FAILED, hold released, never deducted

Call ID `rf2-invalid-single-2026-11-08T09-15-39-ueq4dg`.
Document sent:
`{"invoice_id":"INV-RF2-BAD","amount_yocto":"0","currency":"NEAR","due_date":"2026-12-01"}`
(`amount_yocto` must be a string of digits greater than zero.)
Seller failure: error code `VALIDATION_FAILED`, message
`Document failed schema 'invoice': 1 error(s) — amount_yocto:
required: must be a string of digits greater than zero`, with a
valid seller error attestation. Outcome `failed-refunded`,
`failure_reason: seller_error`, `seller_registered: true` — the
buyer submitted a failure claim with that attestation and the held
amount was released, never deducted.
Run log:
`buyer/runs/single-mp-rf2-cjyhp9.testnet-2026-11-08T09-15-39.jsonl`.

| Step | Tx |
|---|---|
| Deposit 0.5 | [`FZPWTQKZdVUBw46RRE8J22xjYQ8H6CuGaLiBPER2HJ6d`](https://testnet.nearblocks.io/txns/FZPWTQKZdVUBw46RRE8J22xjYQ8H6CuGaLiBPER2HJ6d) |
| Cap 0.2 | [`4qvDyf3d6T97fkxxhu15MSEEBypZdAS3tTkMiUmnYmd3`](https://testnet.nearblocks.io/txns/4qvDyf3d6T97fkxxhu15MSEEBypZdAS3tTkMiUmnYmd3) |
| Request | [`fYVKdTcJRod4LyVsm45oY85UmiXaati7hX4TtjMP9o2`](https://testnet.nearblocks.io/txns/fYVKdTcJRod4LyVsm45oY85UmiXaati7hX4TtjMP9o2) |
| Failure — released, never deducted | [`5ChvidscBeh2doUNXAJBwzYv1Fko5uZsSAtWq1pwnRcG`](https://testnet.nearblocks.io/txns/5ChvidscBeh2doUNXAJBwzYv1Fko5uZsSAtWq1pwnRcG) |

## Final on-chain state (asserted independently, not just the script's own print)

Re-checked after all three runs via near-cli-rs read-only calls
(`get_buyer_balance`, `get_seller_balance`, `get_seller` on
`apathetic-party.testnet`), and every recorded tx re-verified with
`./replay.sh verify-only` per run log — all 8 txs OK on-chain:

**Buyer `mp-rf2-cjyhp9.testnet`: deposit 0.5 / held 0 / spent 0.2 /
available 0.3 / cap 0.2** (testnet NEAR).
**Seller `tedious-sea.testnet`: earned 4.0, withdrawn 0.2.**
The seller had already earned 3.8 before this run (prior runs);
this run added exactly 0.2 — the two 0.1 deductions above — and
nothing from the invalid call.

## What this does NOT claim

- No new service, no second seller, no new contract: same
  `meteredpay-schema-validate` service, same seller
  `tedious-sea.testnet`, same frozen contract
  `apathetic-party.testnet`. Only the document type varied.
- The frozen contract is untouched: `get_seller` still returns
  `tedious-sea.testnet` with the same public key, and
  `git diff src/lib.rs` is empty.
- The seller API ran locally (`127.0.0.1:8787`) for the proof runs
  and was stopped afterwards; it is not hosted.
- Testnet only, $0, no mainnet, no real money. The buyer account
  was faucet-funded.
- The `quote` schema was not re-run here; its evidence is the
  canonical run (README §2.5 / Test 19).

## Logs

- Buyer run logs (tx hashes + explorer links only, no keys):
  `buyer/runs/single-mp-rf2-cjyhp9.testnet-2026-11-08T09-15-39.jsonl`
  (invalid invoice),
  `buyer/runs/single-mp-rf2-cjyhp9.testnet-2026-11-08T09-17-12.jsonl`
  (valid invoice),
  `buyer/runs/single-mp-rf2-cjyhp9.testnet-2026-11-08T09-18-10.jsonl`
  (valid payment-instruction).
- Seller API log (this run): `/tmp/meteredpay-seller-rf2.log`
  (ephemeral; seller confirmed the frozen contract, seller, price,
  and all three schemas at startup).
