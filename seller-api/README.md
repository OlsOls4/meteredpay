# MeteredPay — demonstrator seller API

See `SELLER_SPEC.md` for the full open spec (endpoints, canonical
hash rule, frozen signature formats, timeout rule).

## Run (local, testnet only)

```
node server.mjs            # http://127.0.0.1:8787
```

No dependencies; Node >= 18. The seller signing key is read at
startup from `~/.near-credentials/testnet/tedious-sea.testnet.json`
(env `SELLER_KEY_PATH`) and never printed. At startup the server
confirms seller + price against the frozen contract
`apathetic-party.testnet` via a read-only RPC view.

## What it is

A deterministic JSON schema-validation service
(`meteredpay-schema-validate`: validates a JSON document against one
of three fixed built-in schemas — `quote`, `payment-instruction`,
`invoice` — and returns valid/invalid + an error list of
`{ field, reason }` per error + the SHA-256 of the canonical input;
a document that fails validation returns `VALIDATION_FAILED`, never
a paid success) in three demonstrator-only modes: `success`
(default), `fail`, `timeout` (no response for 40 s; the buyer waits
30 s, then claims timeout). Pure, no dependencies, no network calls,
deterministic. The days 4–5 word-count quote service is superseded
(the recorded 5 Nov demo run used it); the live service is schema
validation. Full schema definitions: `SELLER_SPEC.md`.

It is NOT a live seller listing and has no independent sellers. The seller
never calls the contract and can never mark its own calls
successful — deduction needs the buyer's payer-signed receipt.
