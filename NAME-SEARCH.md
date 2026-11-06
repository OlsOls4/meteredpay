# MeteredPay — name search (days 10–11, pulled forward)

**Date searched:** 5 Nov 2026 (evening, UTC). **Searcher:** Phase 3 freeze-prep
agent. **Status:** evidence, not proof — the organisers' internal submission
database cannot be checked from outside; uniqueness is only proven at
submission time (day 14, the final gate). Do NOT treat this file as a
guarantee that the name is free.

## Verdict

**Keep MeteredPay as the submission name (tentative, day-14 gate still
applies). PayOnProof is REMOVED as a fallback — it collides worse than
MeteredPay does. CallMeter stays removed (direct collision, decided
5 Nov). No fallback name is currently held; if MeteredPay collides at
submission, a new name must be picked and re-checked then — do not
reach for PayOnProof or CallMeter.**

## What was searched

### "MeteredPay" — web search (5 Nov 2026)

- General web search for `"MeteredPay" NEAR`: no product, repo, or
  hackathon entry named MeteredPay. Results were unrelated uses of the
  words "metered/pay" (parking payment pages, campus maps).
- General web search for `"MeteredPay" github`: no repo named
  MeteredPay. Nearest neighbours (similar words, different names):
  - `Kaspa-World-Eater/metered-protocol` — "metered", a chunked
    payment scheme for metered work settled on Kaspa (created
    2026-09-11). Different name, different chain, different mechanism.
    https://github.com/Kaspa-World-Eater/metered-protocol
  - Meteroid (`github.com/meteroid-oss/meteroid`) — open-source
    billing/metering platform for SaaS. Different name, different
    product. https://github.com/meteroid-oss/meteroid
    (announcement: https://dev.to/gaspardb/announcing-meteroid-oss-v1-rc-and-cloud-1gmo)
  - `thesithunyein/meter` ("meter, pay per call apis on arc") — Arc
    pay-per-call gateway. Different name, different chain.
    https://github.com/thesithunyein/meter
- Web search for `MeteredPay devpost OR nearhackathon`: no MeteredPay
  entry on Devpost or nearhackathon.com in the results.
- GitHub repository search API (`api.github.com/search/repositories?q=MeteredPay`,
  5 Nov 2026): **total_count 0** — no public repository matches.
- GitHub code search for `MeteredPay` requires authentication; not
  run (no credential use authorised for this check). The repo-name
  search above is the material check.

### "PayOnProof" — web + GitHub search (5 Nov 2026)

**Collided — do not use.** GitHub repository search API
(`api.github.com/search/repositories?q=PayOnProof`, 5 Nov 2026):
**total_count 4**, three distinct projects using the exact name:

| Repo | Created | What it is |
|---|---|---|
| `PayOnProof/payonproof` | 2026-02-11 | "Payment switch and routing layer that aggregates multiple Stellar Anchors to execute cross-border payments at the best rate" — https://github.com/PayOnProof/payonproof |
| `Daniel221287/payonproof` | 2026-10-21 | "PayOnProof: an AI accounts-payable agent that pays construction subcontractors only for work it can prove, through PayPal" — same success-conditional idea as MeteredPay, in a different domain. https://github.com/Daniel221287/payonproof |
| `juangh123/payonproof` (+ `juangh123/payonproof-arc`) | 2026-10-30 | "ERC-8183 job escrow for USDC on Arc mainnet… Pay for work only when proof of delivery arrives." https://github.com/juangh123/payonproof |

Web search for `"PayOnProof"` also surfaced only near-neighbours
(PayeeProof, PayProof, "pay-on-proof" as a generic phrase in a Devpost
entry), no exact-name product beyond the GitHub repos above.

The `Daniel221287/payonproof` collision is the worst of the three:
same name AND the same "pay only for work you can prove" concept,
created October 2026. A judge searching the fallback name would find
a different project doing the same pitch. PayOnProof is therefore a
worse fallback than MeteredPay itself.

## Consequences

- **Submission name:** MeteredPay (tentative). All repo surfaces,
  dashboard header, video end card, and X caption keep it.
- **Fallbacks:** none held. `prep/00-ready-to-build.md` and
  `prep/01-branding.md` still list PayOnProof (fallback 1) and
  CallMeter (fallback 2) — those lists are now STALE and must not be
  relied on. They are historical prep documents, not submission
  surfaces, so they are flagged here rather than rewritten.
- **GLOSSARY.md** updated 5 Nov 2026: the "Name tentative" line now
  records PayOnProof as removed, not as the fallback.
- **Day-14 gate (unchanged):** at submission, re-check the name
  against the organisers' view (submission-time uniqueness check).
  If MeteredPay collides then, pick a fresh name, re-check it the
  same way, and re-render only the name-bearing surfaces (dashboard
  header is swappable text; video end card is a separate editable
  layer — Council review §5.6).
- **Re-record trigger (unchanged):** a name collision found before
  recording (days 12–13) triggers a re-record of the end card, not a
  full re-shoot.
