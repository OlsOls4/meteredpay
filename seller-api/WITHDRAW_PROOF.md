# Withdraw proof — seller-only `withdraw()` on instance B (Wave 6, 13 Nov 2026)

The contract has a seller-only `withdraw()` (`src/lib.rs` ~715–729):
it pays exactly `earned` in testnet NEAR to the registered seller,
sets `earned` to 0, adds the amount to `withdrawn`, and rejects a
second withdraw with "Nothing to withdraw" and any non-seller caller
with "Only the seller can withdraw". This document proves it live
on instance B.

## Contract interface (read from `src/lib.rs`, not guessed)

```rust
/// Seller withdraws exactly `earned` in testnet NEAR, and only to
/// the registered seller. Returns a transfer Promise: the amount
/// and updated seller balance are read back via
/// get_seller_balance (a Promise return carries no JSON value).
/// A second withdraw with earned == 0 is rejected.
pub fn withdraw(&mut self) -> Promise {
```

`withdraw` takes **no arguments** — `json-args '{}'`, no attached
deposit. The caller must be the registered seller
(`mp-seller2.testnet` on instance B).

## Exact command run

```bash
export PATH="$HOME/.cargo/bin:$PATH"
near contract call-function as-transaction mp-meteredpay-b.testnet withdraw \
  json-args '{}' prepaid-gas '100.000 TeraGas' attached-deposit '0 NEAR' \
  sign-as mp-seller2.testnet network-config testnet sign-with-keychain send
```

## Transaction

https://testnet.nearblocks.io/txns/AYuTEzgJneJ9kVPJ9cWftR8BFvHpsuM1AJcasguRjcr5

RPC `tx` query (signer `mp-seller2.testnet`, receiver
`mp-meteredpay-b.testnet`): status `SuccessValue`, one action,
`FunctionCall { method_name: "withdraw", args: "e30=" ({}),
deposit: "0", gas: 100000000000000 }`.

## Balances before / after

| | Before (13 Nov 2026, live RPC) | After |
|---|---|---|
| Instance B seller balance (`get_seller_balance`) | earned **0.2**, withdrawn **0** | earned **0**, withdrawn **0.2** |
| Seller wallet (`mp-seller2.testnet`, `view_account`) | 10.0 testnet NEAR | 10.19979 testnet NEAR |

The seller received exactly the 0.2 earned, minus ~0.0002 gas for
the withdraw transaction itself. `earned` is now 0, so a second
`withdraw` on instance B would be rejected with "Nothing to
withdraw" (unit test `second_withdraw_rejected` in `src/lib.rs`;
not re-proven live — a second live withdraw would be a deliberate
failing tx, and the earned-0 state is already the proof the first
withdraw consumed the balance).

## Live balances re-queried the same day (13 Nov 2026)

For the copy worker — every live balance, so stale figures can be
fixed in one pass:

| Contract | Seller | Earned | Withdrawn |
|---|---|---|---|
| `apathetic-party.testnet` (frozen) | `tedious-sea.testnet` | **4.6** (re-queried after the final demo replay, ~10:05 UTC; grows 0.2 per replay) | 0.2 |
| `mp-meteredpay-a.testnet` | `tedious-sea.testnet` | 0.2 | 0 |
| `mp-meteredpay-b.testnet` | `mp-seller2.testnet` | **0** (was 0.2 — withdrawn today, this tx) | **0.2** (was 0) |
| `mp-meteredpay-c.testnet` | `mp-seller2.testnet` | 0.1 | 0 |

Buyer balances (unchanged by the withdraw): A buyer
`mp-l1a-buyer.testnet` 0.5 / 0 / 0.2 / 0.3 / 0.2; B buyer
`mp-l1b-buyer.testnet` 0.5 / 0 / 0.2 / 0.3 / 0.2; C buyer
`mp-rf2-buyer.testnet` 0.5 / 0 / 0.1 / 0.4 / 0.1.

Note: the frozen contract's earned total grows with every replay
(4.2 before today's seller-up replay, 4.4 after it). Any figure
quoted for it must carry its date.
