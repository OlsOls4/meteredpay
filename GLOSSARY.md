# MeteredPay — glossary (frozen terminology)

**Status: FROZEN for the days 6–7 build (6 Nov 2026). Adopted from the
Council draft (`draft-glossary-2026-11-05.md`) reconciled with the day-1
glossary (`day1-glossary.md`, 1 Nov 2026) — one glossary only; the two
sources agree and this file supersedes both. Every UI string, README
sentence, video narration line, and X caption traces to a line here.
Authority order: SPEC.md (locked) → prep/04-architecture.md (amended
6 Nov for the one-field failure shape) → this page.**

## Frozen terms (use these exact words everywhere)

| Term | Meaning | Never write |
|---|---|---|
| Requested (held) | Call requested on-chain; price reserved from available into held. Money has NOT moved to the seller. Contract status `paid` means held — never show the raw word `paid` to a reader without the word "held" beside it. | "Paid" for a held call, as if money moved to the seller. |
| Deducted (testnet) | Success claim accepted: held → seller earned, spent += price, once only. The ONLY money movement to the seller. | "Paid", "settled", or "successful payment" without "testnet" in the same sentence. |
| Released — refunded (testnet) | Failed/timeout claim accepted: held amount released back to available. **"Refunded — held amount released, never deducted."** A release happens ONLY on a buyer failure claim, a buyer timeout claim, or backstop expiry — always show that claim step. | "Refunded automatically", "money returned", "refund" without the release wording. A failed call was never deducted, so nothing was "returned". |
| Refused | `request_call` refused on-chain (e.g. `over_budget`): a successful transaction with an on-chain refusal record, balances unchanged. | "Failed" for a refusal; "error" for a refusal. Refusal ≠ rejection (below). |
| Rejected | Contract rejected a claim (e.g. double-claim "Call is not in paid state"): a failed transaction, balances unchanged. | Lumping rejections under "failure" wording. Show the contract's reason in plain words + reference hash. |
| Deposited / Held / Spent / Available / Budget cap | The five numbers, always together, in this order, labelled "testnet NEAR". Invariant: `available = deposit − spent − held`. | "Remaining" (use "Available"), "balance" alone, any subset of the five. |
| Gas | Separate, chain-level cost on top of the call price, paid from the buyer's wallet in testnet NEAR. Footnote everywhere balances appear: "These are contract balances. Your wallet balance will differ by testnet gas paid for your own transactions, shown separately on the explorer." | Claiming a wallet balance moves by exactly the call price. |
| Demonstrator seller service | The one demo seller (`tedious-sea.testnet`), run for the hackathon. | "Live seller listing", "seller network", "independent sellers" (none has run yet). |
| Demonstrator mode | The seller `scenario` controls (success / fail / timeout). A real seller ignores `scenario`. | Presenting scenario buttons as real seller behaviour. Label them "Demonstrator mode" wherever they appear. |
| TESTNET | Every money surface carries: "TESTNET — no real money. Testnet NEAR has no real-world value." Amounts are always "testnet NEAR", never bare "NEAR" as if real. | "Real payment", "real money", "revenue", "sales", "income", "mainnet", "Intents", "pilots", "savings". |
| Buyer dishonesty NOT solved | A buyer could claim failure after a genuine success. State it in the FAQ; do not hide it. | Any claim the seller is protected from a dishonest buyer. |
| No LLM in v1 | The v1 agent is: buyer script + deterministic contract rules + demonstrator seller service. | "LLM", "AI reasoning", "agent intelligence", "free/local reasoning", "AI-powered". |

## Contract statuses → UI words

| Contract status | UI words |
|---|---|
| `paid` | Requested — price held |
| `success-deducted` | Deducted |
| `failed-refunded` | Released (refunded) — held amount released, never deducted |
| `timeout-refunded` | Released (timeout) — held amount released, never deducted |
| `refused` | Refused + verbatim reason |

## Frozen numbers (substitute everywhere; no other figure may appear in demo copy)

Price 0.1 testnet NEAR/call · demo deposit 0.5 · budget cap 0.2 ·
buyer wait 30 s · backstop 600 s · gas 100 Tgas per contract call.
Contract `apathetic-party.testnet` · seller `tedious-sea.testnet`.
Name tentative: MeteredPay (kept — name search 5 Nov 2026, see
`NAME-SEARCH.md`: no exact-name product or repo found; uniqueness
still only proven at submission, day-14 gate). PayOnProof REMOVED as
fallback 5 Nov 2026 (three GitHub projects use the exact name, one
with the same pay-only-for-proven-work idea). CallMeter removed —
direct collision. No fallback name is currently held. Deploy tx hash:
known gap — do not link or fabricate it.

## Frozen rules

- The demo order is always: prepay → success deducts → failed releases
  → over-budget refused. A refusal must arise from genuine budget
  state (deposit 0.5, cap 0.2, two successes, third refused) — never
  from a mode button.
- Price is fixed at contract init. There is no Set-price control; the
  seller console shows price read-only.
- Budget-cap rejections use exactly: "Budget cap cannot exceed your
  deposit" and "Budget cap cannot be below what you have already spent".
- Colour: Ink, Paper, Teal, Mint (dark only), Amber (badges/icons only,
  with ink text). No red anywhere in UI copy or code. Failure/refusal =
  amber icon + the word "Failed" / "Refused" in ink text. Success =
  teal check icon + the word "Succeeded". Colour never carries meaning
  alone.
- Hash display: list rows = truncated + copy button + explorer link;
  detail view = full hash + copy button + explorer link.
- No claim the project name is confirmed before submission. No claim a
  wallet balance moves by exactly the call price. No claim of adoption,
  independent sellers, cross-chain settlement, or dispute arbitration.
- Tracks claimed: agents, open, business, security, defi.

## Banned-word check (days 6–7)

Grep the dashboard, README, glossary, X caption draft, and seller
spec for: auto-refund, automatic refund, real money, real payment,
revenue, marketplace, customers, pilots, savings, mainnet, Intents,
LLM, "remaining" (use Available), "red" as a colour word, "paid"
outside the `paid`-status table above, "users" as a claimed audience.
Every hit must be fixed or explicitly justified here. Verification
6 Nov 2026: grep returned zero (see `BUILD_NOTES.md`, days 6–7).
Re-verified 5 Nov 2026 (freeze prep): zero unjustified hits — the
only hits are this file's own denylist rows and the verbatim
contract status table above.
