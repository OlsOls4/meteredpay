# MeteredPay — X demo post caption (DRAFT ONLY)

**Status: LIVE — main post published by Olly 14 Nov 2026 17:32:
https://x.com/OlsOls4/status/2121657509085647308. Post 2 below is
also live (reply to the demo post, same time). Post 3 is a draft
only, not posted. Human publishes; agent drafts only.**

> Agents pay for API calls that fail. MeteredPay — Built at NEAR HACKATHON. @NEARProtocol #NEARHackathon
>
> Deducted only on success. Failed calls: deducted zero. Over-budget refused on-chain.
>
> Replay the same contract yourself — repo in replies. Testnet only.

**Character count: 256 characters** — verified by hand and by script
(line counts 102 + 2 + 84 + 2 + 66 = 256, newlines included), within
X's 280-character free-post limit, with 24 characters to spare. Contains
@NEARProtocol, #NEARHackathon, and "Built at NEAR HACKATHON". F3
(Council review §5) CLOSED. First line reworked 5 Nov 2026 (Wave 3,
E-7) to lead with the user problem (HACKATHON.md L199: "Lead with the
user problem"); second line reworded the same pass (Wave 3, N1:
"Deducted: zero", not "cost zero" — every call costs testnet gas).
Previous draft was 580 characters including the attach-instruction
line below, which is an instruction, not post text, and is no longer
inside the caption.

**Attach (instruction, not post text):** attach the 1:27 v3.5 video. If
the video cannot be attached, attach the 5 screenshots in prep/10 §2.2
in order instead, and link the video in the reply.

Reply (posted by the human with the post):
> Repo: https://github.com/OlsOls4/meteredpay — testnet contract: apathetic-party.testnet. Testnet only, no production-network funds, no intent-based settlement in the demo path. The demo seller is a demonstrator service, not a live seller listing.

**Post 2 (thread reply — LIVE, posted 14 Nov 2026 17:32 as a reply to
the demo post; no separate URL recorded for the reply itself):**

> The video shows one service. The same contract also pays a second seller, a deterministic summariser at 0.05/call on a third instance — and the repo proves the failure paths on-chain: a dishonest buyer detected, three forged claims rejected.

**Character count: 241 characters** — within X's 280-character free-post limit. Points at the Wave 6 breadth the video doesn't show: second service (summariser, instance C), second seller, dishonest-buyer demo, live attack suite. All four are proven in the repo (SECOND_SERVICE_APPENDIX.md, MULTI_SELLER_APPENDIX.md, DISHONEST_BUYER_DEMO.md, ATTACK_SUITE_APPENDIX.md); no new claim is made here.

**Post 3 (thread reply — DRAFT ONLY, not posted):**

> The tamper beat is a separate buyer (mp-tamper05.testnet) on the same contract — its own balances are 0.5/0/0/0.5/0.2; the strip underneath still shows the main run.

**Character count: 165 characters** — within X's 280-character free-post limit (verified by script, 14 Nov 2026 — Python `len()` on the exact text). Clarifies the tamper beat: separate buyer with its own balances (0.5/0/0/0.5/0.2) vs the main run's persistent balance strip underneath (video v3.5).

Pre-post checklist (day 13, before the URL is recorded): video attached
(or 5 screenshots in order); caption states "Built at NEAR HACKATHON"
(first line); tags present; caption length verified ≤280 chars (256,
verified 5 Nov 2026 — paste into X's composer as a final check); repo URL placeholder [REPO_URL] FILLED —
the post is UNPUBLISHABLE while it remains (the "no placeholder
remains" claim is removed until then); contract ID in the
reply matches the frozen contract exactly; post is PUBLIC — confirmed
in a signed-out browser; post URL captured exactly (max 300
characters); no claim the repo cannot prove (no claimed adoption,
live seller listing, production-network funds, intent-based
settlement claims). The post link is a submission field;
changes after submission go only through the organisers' hand-reviewed
request process.
