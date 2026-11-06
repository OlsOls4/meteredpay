# MeteredPay — multi-seller successor appendix (PROVEN 6 Nov 2026)

**Status: DEPLOYED + PROVEN on NEAR testnet, 6 Nov 2026.**
This appendix records a parallel multi-seller successor to the frozen
single-seller entry. It is an appendix only: the frozen contract
`apathetic-party.testnet` is untouched and remains the judge-replay
target (README §2.5). Nothing in this file changes the frozen entry,
its Test 19 evidence, its video, or its dashboard.

## What "multi-seller" means here — read this first

`src/lib.rs` `init` takes exactly **one** seller. There is no seller
list and no `register_seller`. So "two sellers" here means **two
contract instances deployed from the same wasm, each initialised with
one seller** — not one contract holding two sellers. A true
single-contract multi-seller (shared buyer deposit across sellers)
needs a code change (runbook Path B, `MULTI_SELLER_RUNBOOK.md` §9)
and was **not** done. Anyone claiming one of these two instances
holds two sellers is wrong; `get_seller` on each returns exactly one.

## The same code

- Wasm SHA-256 (verified before deploy, unchanged from the freeze):
  `c54ae8e9d657338ccc695d32689fac322aaa1d77b90fd90e0ed63f86decbb3b0`
- On-chain code hash on **all three** contracts (frozen + both
  successors, RPC `view_code`): `EH9ZtfU7FbRNSFTDUqTZoE9gQ7jRQ5Qb7cWDoMuBRRGB`
- `git diff src/lib.rs` empty at deploy time and at the end of this
  run (HEAD `ff5bfc8`).

## The two successor instances

| | Instance A | Instance B |
|---|---|---|
| Contract account | `mp-meteredpay-a.testnet` | `mp-meteredpay-b.testnet` |
| Account creation tx | [`6MyU7DhfVvBKENgLCovz6PrFNtNBGGVPaSKDChXQqFCU`](https://testnet.nearblocks.io/txns/6MyU7DhfVvBKENgLCovz6PrFNtNBGGVPaSKDChXQqFCU) | [`6mNPVGFDkkaZLsQFTv5bmPw5P9bpgbHt9y9wzR2pBNx8`](https://testnet.nearblocks.io/txns/6mNPVGFDkkaZLsQFTv5bmPw5P9bpgbHt9y9wzR2pBNx8) |
| Deploy + init tx | [`EXnxJ3Jne2qZf7ZbAypmxi7LUTAgJ8AZJ5R8UDyd1D3V`](https://testnet.nearblocks.io/txns/EXnxJ3Jne2qZf7ZbAypmxi7LUTAgJ8AZJ5R8UDyd1D3V) | [`8J3X5o4PRgmW3ZnYW5ncF7HEKPPQ56mLAieCMRsWZsa2`](https://testnet.nearblocks.io/txns/8J3X5o4PRgmW3ZnYW5ncF7HEKPPQ56mLAieCMRsWZsa2) |
| Seller | `tedious-sea.testnet` | `mp-seller2.testnet` |
| Seller public key | `ed25519:6zG7yLp2jqHxfkXfYgsL1ZXSf2NVQoRRaib6im72ubnm` | `ed25519:BoVrSvynnQ9Y1bKszwQaBhGA6DiKefwVtNy7KGfDSNze` |
| Price / timeout | 0.1 testnet NEAR / 600 s | 0.1 testnet NEAR / 600 s |
| Seller API (local, run 6 Nov) | `127.0.0.1:8787` | `127.0.0.1:8788` |

`get_seller` on each instance returns exactly its init values
(verified on-chain 6 Nov; full CLI output in `l1-logs/verify-a.log`
and `l1-logs/verify-b.log`). Both sellers run the same service
(`meteredpay-schema-validate`, schemas `quote`,
`payment-instruction`, `invoice`) under the same open spec
(`seller-api/SELLER_SPEC.md`).

## Proof — Test 19 re-run per instance (fresh faucet buyer each)

Buyer A: `mp-l1a-buyer.testnet` (creation tx
[`3dotiufcBtriuxvvmCtJXLR9yf4JLdZE1W9soPFEuU9C`](https://testnet.nearblocks.io/txns/3dotiufcBtriuxvvmCtJXLR9yf4JLdZE1W9soPFEuU9C)).
Buyer B: `mp-l1b-buyer.testnet` (creation tx
[`AuFcNTAyi7ApyhE9AB1XzDUtPopReksJmn4vTFpdsLhz`](https://testnet.nearblocks.io/txns/AuFcNTAyi7ApyhE9AB1XzDUtPopReksJmn4vTFpdsLhz)).
Demo runs: `buyer/buyer.mjs --mode demo --tag redeploy-a` /
`--tag redeploy-b`, exit 0 both. Run logs:
`buyer/runs/demo-mp-l1a-buyer.testnet-2026-11-06T08-34-39.jsonl`,
`buyer/runs/demo-mp-l1b-buyer.testnet-2026-11-06T08-38-53.jsonl`.

### Instance A — `mp-meteredpay-a.testnet` (seller `tedious-sea.testnet`)

| Step | Tx |
|---|---|
| Deposit 0.5 | [`7fN9Huj8TGNEPK89obUU5N5zSJu8QhW5FxFru66pVRN8`](https://testnet.nearblocks.io/txns/7fN9Huj8TGNEPK89obUU5N5zSJu8QhW5FxFru66pVRN8) |
| Cap 0.2 | [`DErRPhc5b3X3zb3bZSmvCB5oHyX5jPArmEFkQnDU43kH`](https://testnet.nearblocks.io/txns/DErRPhc5b3X3zb3bZSmvCB5oHyX5jPArmEFkQnDU43kH) |
| Success 1 — request | [`6Ddf7tHFoDx5kr2Hwj4FVr5Ko6jJaFeFrmfh6YB6N4Pd`](https://testnet.nearblocks.io/txns/6Ddf7tHFoDx5kr2Hwj4FVr5Ko6jJaFeFrmfh6YB6N4Pd) |
| Success 1 — deducted 0.1 | [`BaSPmTa7PX4bvEaBVnWyJQf2x5zAzsKFFWLwxUXt2WtC`](https://testnet.nearblocks.io/txns/BaSPmTa7PX4bvEaBVnWyJQf2x5zAzsKFFWLwxUXt2WtC) |
| Fail — request | [`8DkcC1a1ZWpbsvKii79osFDwtuVNBGbSqHya7myXVF8s`](https://testnet.nearblocks.io/txns/8DkcC1a1ZWpbsvKii79osFDwtuVNBGbSqHya7myXVF8s) |
| Fail — released, no deduction | [`4zbBApT79cUWx8R27CyjbwEL6DCrDLZy9bZvo2QepyY8`](https://testnet.nearblocks.io/txns/4zbBApT79cUWx8R27CyjbwEL6DCrDLZy9bZvo2QepyY8) |
| Timeout — request | [`AjhBDLyjdHfjTTc4XLAj3b1VyqK32jake6EdYEYN3KRT`](https://testnet.nearblocks.io/txns/AjhBDLyjdHfjTTc4XLAj3b1VyqK32jake6EdYEYN3KRT) |
| Timeout — released after 30 s wait | [`8u6Y1ZhoySjZJS1ZhLfLr6e5XJuBeCSqN7jTGQCwZG32`](https://testnet.nearblocks.io/txns/8u6Y1ZhoySjZJS1ZhLfLr6e5XJuBeCSqN7jTGQCwZG32) |
| Success 2 — request | [`398sR883EGZnsXxErcdvw1mjU9vd1FyTyvmCdraEPPaK`](https://testnet.nearblocks.io/txns/398sR883EGZnsXxErcdvw1mjU9vd1FyTyvmCdraEPPaK) |
| Success 2 — deducted 0.1 | [`Fpv5L3UpMsFqx1282gqVYQenJHME6tHgAcCsGEVjGWfw`](https://testnet.nearblocks.io/txns/Fpv5L3UpMsFqx1282gqVYQenJHME6tHgAcCsGEVjGWfw) |
| Third success — refused, reason `over_budget` | [`6xYTiLSrnVGXEcjj6cmXUaXTfnwVL2eaqaTCAZFni29V`](https://testnet.nearblocks.io/txns/6xYTiLSrnVGXEcjj6cmXUaXTfnwVL2eaqaTCAZFni29V) |

Final on-chain state (re-checked independently via
`get_buyer_balance`, not just the script's own print):
**deposit 0.5 / held 0 / spent 0.2 / available 0.3 / cap 0.2**.
Seller earned 0.2, withdrawn 0 (`get_seller_balance`).

### Instance B — `mp-meteredpay-b.testnet` (seller `mp-seller2.testnet`)

| Step | Tx |
|---|---|
| Deposit 0.5 | [`4LbEVG1XvoeKUT77GtY7MqikCRZAV5pKtH3epzdYspeZ`](https://testnet.nearblocks.io/txns/4LbEVG1XvoeKUT77GtY7MqikCRZAV5pKtH3epzdYspeZ) |
| Cap 0.2 | [`GeZT3VGa4PQMgdA16RkkzAP8dUQp8U4NNEuHuD8FaCVh`](https://testnet.nearblocks.io/txns/GeZT3VGa4PQMgdA16RkkzAP8dUQp8U4NNEuHuD8FaCVh) |
| Success 1 — request | [`CpQizzAjfkovH4cbVeng4jCuubBp37Pux33T2Ug7BwMG`](https://testnet.nearblocks.io/txns/CpQizzAjfkovH4cbVeng4jCuubBp37Pux33T2Ug7BwMG) |
| Success 1 — deducted 0.1 | [`CQqmYcwziQYdAFxXbt8Z4bat7mTJWxLvJsfbyRC8BS67`](https://testnet.nearblocks.io/txns/CQqmYcwziQYdAFxXbt8Z4bat7mTJWxLvJsfbyRC8BS67) |
| Fail — request | [`6VqUyveHfU9t914hLRQd8K8fVXShEmuo7dHY6C5fwF14`](https://testnet.nearblocks.io/txns/6VqUyveHfU9t914hLRQd8K8fVXShEmuo7dHY6C5fwF14) |
| Fail — released, no deduction | [`82j8wT9ihtH9SzAYKuUtBm7TcjAy3NWxnrPvxqFYrD8u`](https://testnet.nearblocks.io/txns/82j8wT9ihtH9SzAYKuUtBm7TcjAy3NWxnrPvxqFYrD8u) |
| Timeout — request | [`G4eZzreKPEGYrf8npfF6g86kqDdiJbYFQQLY3PUMNAc3`](https://testnet.nearblocks.io/txns/G4eZzreKPEGYrf8npfF6g86kqDdiJbYFQQLY3PUMNAc3) |
| Timeout — released after 30 s wait | [`8s86fcTHEiRFZfx7Tqdny62upSLoJwD6UUhHkqwSHqFc`](https://testnet.nearblocks.io/txns/8s86fcTHEiRFZfx7Tqdny62upSLoJwD6UUhHkqwSHqFc) |
| Success 2 — request | [`4vsfhuTfj6ke48SW8d1P1tAS4Ry2LWYwzMNmpvVfYCaT`](https://testnet.nearblocks.io/txns/4vsfhuTfj6ke48SW8d1P1tAS4Ry2LWYwzMNmpvVfYCaT) |
| Success 2 — deducted 0.1 | [`CaCEnH75vdfJzBz7mwvMmEGMJ6GmeCyDjuL4Fi1wTDxP`](https://testnet.nearblocks.io/txns/CaCEnH75vdfJzBz7mwvMmEGMJ6GmeCyDjuL4Fi1wTDxP) |
| Third success — refused, reason `over_budget` | [`FtDqQkkAw8818QCjsJ7XXtkZ7JEU1kUnTf1S3hWP9Yhp`](https://testnet.nearblocks.io/txns/FtDqQkkAw8818QCjsJ7XXtkZ7JEU1kUnTf1S3hWP9Yhp) |

Final on-chain state (re-checked independently via
`get_buyer_balance`): **deposit 0.5 / held 0 / spent 0.2 /
available 0.3 / cap 0.2**. Seller earned 0.2, withdrawn 0
(`get_seller_balance`). This is the first deduction ever paid to
`mp-seller2.testnet` — the seller was previously registered
nowhere.

## Negative check — the two instances are really separate sellers

Cross-check buyer `mp-l1x-buyer.testnet` (creation tx
[`Gy3hwSN8mf9AnhCBanvFVQGPTk2vX1HH7ocZr3S1rdU1`](https://testnet.nearblocks.io/txns/Gy3hwSN8mf9AnhCBanvFVQGPTk2vX1HH7ocZr3S1rdU1)).
In each direction a success receipt signed by the OTHER seller's
key was submitted to the contract, with a correctly signed buyer
signature (so the seller signature is the only invalid part).
Both were rejected on-chain with the contract panic
`Invalid seller signature`, and no deduction happened (held 0.1
intact, spent 0 on both instances afterwards).

| Direction | Setup txs (deposit / cap / request) | Rejected submit tx |
|---|---|---|
| Seller 2's receipt → instance A (`xcheck-a-001`) | [`Dh1oVsWeFU5TaD7Fw9kttJqZ2FSHmugDuzjAXL64qtmQ`](https://testnet.nearblocks.io/txns/Dh1oVsWeFU5TaD7Fw9kttJqZ2FSHmugDuzjAXL64qtmQ) / [`FYcJVLVs4YfHXSUEFLCGH6QKghFoGDQ1oRxAhfxqevLt`](https://testnet.nearblocks.io/txns/FYcJVLVs4YfHXSUEFLCGH6QKghFoGDQ1oRxAhfxqevLt) / [`AqTKGpt1ApSFobV8D7KPobqyKSj56AXY3DnhVLxHVbPt`](https://testnet.nearblocks.io/txns/AqTKGpt1ApSFobV8D7KPobqyKSj56AXY3DnhVLxHVbPt) | [`6rwzrNiTTQcpbvxyHKA6NUHr1GVX4n98ecEAXqdEoriv`](https://testnet.nearblocks.io/txns/6rwzrNiTTQcpbvxyHKA6NUHr1GVX4n98ecEAXqdEoriv) — `Smart contract panicked: Invalid seller signature` |
| Seller 1's receipt → instance B (`xcheck-b-001`) | [`5cFPjQpemEf3iCNf5BzQPQ3BeeD4gNuqL4Q3CzpmLMaL`](https://testnet.nearblocks.io/txns/5cFPjQpemEf3iCNf5BzQPQ3BeeD4gNuqL4Q3CzpmLMaL) / [`Du7f51QzjRSJetZ5QFdaxeCi9Aw8HPXJqTEmPB3aMh9v`](https://testnet.nearblocks.io/txns/Du7f51QzjRSJetZ5QFdaxeCi9Aw8HPXJqTEmPB3aMh9v) / [`3baNTxyuhRgtFXseQvwTXk8QbXBHqNKn4dCqxUbfqZNa`](https://testnet.nearblocks.io/txns/3baNTxyuhRgtFXseQvwTXk8QbXBHqNKn4dCqxUbfqZNa) | [`GFE7wB5JgukJ58Aho5RgmXBMi12uEL1pD1xCTnJfiNTB`](https://testnet.nearblocks.io/txns/GFE7wB5JgukJ58Aho5RgmXBMi12uEL1pD1xCTnJfiNTB) — `Smart contract panicked: Invalid seller signature` |

## What this does NOT claim

- The frozen contract `apathetic-party.testnet` is untouched:
  `get_seller` still returns `tedious-sea.testnet`, its code hash
  is still `EH9ZtfU7FbRNSFTDUqTZoE9gQ7jRQ5Qb7cWDoMuBRRGB`, and its
  Test 19 / freeze / stranger-replay evidence still refers to it.
  It remains the judge-replay target.
- No shared buyer deposit across sellers: a buyer must deposit
  separately on each instance. That is Path B (code change), not
  done.
- The seller APIs ran locally (`127.0.0.1:8787` / `8788`) for the
  proof runs and were stopped afterwards; they are not hosted.
- The runbook's optional double-claim edge test was not re-run on
  the successors (the frozen contract's double-claim evidence
  stands for the same code).
- Testnet only, $0, no mainnet, no real money. All accounts were
  faucet-funded.

## Runbook corrections found while executing

1. **Runbook §6 omits `SELLER_ACCOUNT_ID` for the buyer.**
   `buyer/buyer.mjs` takes its expected seller from
   `SELLER_ACCOUNT_ID` (default `tedious-sea.testnet`,
   `buyer.mjs:87`) and throws `Contract seller mp-seller2.testnet
   != tedious-sea.testnet` before any transaction if it is not
   set. The instance-B demo command must be:
   `CONTRACT_ID=mp-meteredpay-b.testnet SELLER_ACCOUNT_ID=mp-seller2.testnet node buyer/buyer.mjs --buyer <buyer>.testnet --mode demo --tag redeploy-b --api http://127.0.0.1:8788`
   (env-only fix; no code changed).
2. **near-cli-rs prints no tx hash when a call fails on-chain.**
   The first cross-seller `submit_success` (CLI) failed with the
   expected panic but no Transaction ID was printed. The hash was
   captured by re-submitting via near-api-js
   (`sendTransactionAsync`, which returns the hash up front) and
   confirming via RPC `tx` query. The two hashes above are from
   those re-submissions.
3. **NearBlocks API `GET /v1/account/<id>/txns` returned empty**
   for these accounts on 6 Nov 2026 (checked for accounts with
   known transactions). Use the RPC `tx` method or the explorer
   transaction page to verify a hash, not that endpoint.

## Logs

- Full CLI output: `l1-logs/` (`create-a.log`, `create-b.log`,
  `deploy-a.log`, `deploy-b.log`, `verify-a.log`, `verify-b.log`,
  `seller-a.log`, `seller-b.log`, `demo-a.log`, `demo-b.log`,
  `xcheck-a-*.log`, `xcheck-b-*.log`).
- Deploy log (this run, narrative):
  `~/workspace/goals/win-cash-with-meteredpay-at-near-hackathon/hidden_files/l1-deploy-log.md`
- Buyer run logs: `buyer/runs/demo-mp-l1a-buyer.testnet-2026-11-06T08-34-39.jsonl`,
  `buyer/runs/demo-mp-l1b-buyer.testnet-2026-11-06T08-38-53.jsonl`.
