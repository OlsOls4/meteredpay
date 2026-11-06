# MeteredPay — 2-minute video script (REFRAMED, record NOW)

**Status: READY TO RECORD — record TONIGHT, 5 Nov 2026, against the FROZEN
contract `apathetic-party.testnet` only.** This reframe supersedes the
12–13 Nov draft (Council review wave 3, 5 Nov 2026: V-REFRAME, V-E1–E-6,
R3, N1, R1). Do NOT record from the old draft (hook 204 wpm, cost-zero
slogan, link-in-the-repo line, unfilmable deposit button). Source: council review
wave 3 §4 + §6 + §7 (Videographers) and the devpost-demo-video skill.
Supersedes `prep/03 §3` and `prep/10 §1` (their success → fail → refusal
order is arithmetically unrecordable).

**Core message (one sentence):** An agent pays 0.1 testnet NEAR for one
document check — but only if the check comes back valid; a failed check
deducts nothing, and overspending is refused on-chain.

## Arithmetic check (read first)

Cap 0.2 testnet NEAR, price 0.1 per call. After success #1, spent is
0.1 and remaining budget is 0.1 — exactly one more call's price — so a
refusal after ONE success is impossible: the call would succeed. The
recorded order MUST be: success #1 → fail → timeout beat → tamper beat
(separate run, see below) → success #2 → refusal. After success #2,
spent is 0.2 (cap used), so the next call is refused on-chain. Final
state of the recorded main run: deposit 0.5 / held 0 / spent 0.2 /
available 0.3 / cap 0.2.

**Tamper beat accounting:** the tamper beat is NOT part of the main run's
arithmetic. It is filmed in the same recording session as a separate
single-mode run on the same frozen contract (its own buyer, its own
0.5 deposit, spent 0 — prior evidence: run `single-tamper89`,
call `tamper-single-001`, release tx `8W7EQs94SoFk9JvvYaJ2nvewqRDq2NNYWbaSwNtu5DxS`,
used here as evidence only, NEVER as footage). Its frames are labelled
on screen "Separate run — same contract" and its hashes are marked
`[FROM TAMPER RUN]`, never mixed into the main run's sequence. Demo mode
(`buyer.mjs --mode demo`) has no tamper step and there is no
`--scenario tamper` — the video team must reproduce the tampered-receipt
method in the session; if it cannot be reproduced, CUT the beat and give
its 7 s back to the close (close becomes 27 s) — do not fake it, do not
reuse the 5 Nov frames.

## Recording rules (binding)

- **One run, one buyer (main run).** Every hash, balance, and explorer
  frame in the main run comes from the SINGLE recorded run's own buyer.
  Never paste hashes from the 5 Nov run logs (or any other run) into
  frames — that is editing two runs together and is forbidden. Where
  this script was written before the run exists, hashes are marked
  `[FROM RECORDED RUN]`. The tamper beat is the sole labelled exception
  (separate run, `[FROM TAMPER RUN]`, on-screen label).
- **"Deducted: zero", never the old cost-zero slogan.** Every call costs testnet gas
  (~0.001–0.01 NEAR/call), so "failed calls cost zero" is FALSE at wallet
  level. Everywhere customer-facing — cold open, end card, narration,
  captions — say "Deducted: zero". The only gas mention is the honest
  small print: "Contract balances — wallet differs by testnet gas, shown
  on explorer".
- **"testnet" on every money overlay.** Every amount on screen says
  "testnet NEAR". Every explorer cut keeps `testnet.nearblocks.io` in
  frame. No money shot without the testnet label.
- **Show the failure claim.** The fail, timeout, and tamper beats must
  show the buyer submitting the failure/timeout claim — the release is
  never shown as automatic. On-screen: "Failed call: held amount
  released. Deducted: 0 testnet NEAR."
- **Show verification.** The success beats must show the receipt check
  (response hash recomputed + seller signature verified) before the
  deduction transaction — zoomed terminal line, then dashboard log, then
  explorer tx. Success #2 flashes the verification line for 2 s
  ("verified again").
- **Never film the 30 s live wait.** The timeout is a 5-second
  settled-row beat (see 0:58–1:03 below), never a live 30-second wait.
  A persistent chyron from 0:10 reads "Buyer waits 30 s for a receipt"
  and stays up through the timeout beat.
- **Chyron window — DECIDED 6 Nov 2026: 0:10–1:03 (restored).** Decided
  by Olly-delegated Muse; the videographers' call (council wave 4,
  V-F5), over the finish team's deliberate 0:10–0:30 cut (second pass,
  commit `ee2f8fa`, "ends at 0:30 when the receipt has arrived"). The
  timeout beat is the payoff the chyron sets up, so it stays up through
  1:03 and is gone from the tamper beat (1:03) onward. This script's
  0:10–1:03 wording was correct all along; the 0:10–0:30 render was the
  deviation, now corrected by re-render only (see `video/video-run-log.md`,
  "Chyron restore" section).
- **Positioning — what the narration must NEVER claim (R1).** Do not say
  "x402 pays before delivery", "no success condition", or "no refund"
  about x402: its `exact` `authorization` flow settles only after the
  handler succeeds, and its newer `auth-capture` scheme holds funds in
  escrow with capture/void/refund. This video makes NO x402 claim at
  all. What is shown, not asserted against x402, is the bundle:
  buyer-verified hash + payer-signed receipt + on-chain cap refusal +
  buyer-claimed release + 600 s backstop + dispute-audit view — the
  guarantee lives in a NEAR contract the payer can verify and replay.
- **Every shot names its surface.** Each row below names the dashboard
  view (S1/S2/S5) or the terminal command. No shot assumes a button that
  does not exist: there is NO deposit button and NO fresh-deposit button
  anywhere (S1/S5 have none; S2 has exactly two buttons — "Load balance
  & call history" and "Show the 30-second wait" — and the dashboard is
  deliberately read-only, so do NOT add one). Deposit is filmed in the
  terminal (`node buyer/buyer.mjs --mode demo`) and confirmed on S2.
- **Thumbnail frame:** the cold-open frame (0:00–0:05, settled REFUNDED
  row, "Failed call. Deducted: zero."), composed per the prep/01
  thumbnail spec (1200 × 675: three-row proof strip Deducted / Refunded /
  Refused + logo + "NEAR testnet demo — no mainnet money. Built at NEAR
  HACKATHON."). Test-render the thumbnail at ~500 px and check the rows
  stay legible before the full take.
- **Video length:** no duration cap was found in the live HACKATHON.md
  (re-read 5 Nov 2026, 477 lines). 2:00 is the team's own target.
- 1920×1080, MP4 H.264/AAC, 30 fps, open captions burned in (≤2 lines,
  sidecar + transcript kept in the repo), "testnet" survives in every
  money sentence of the captions. Browser zoom from test frames starting
  150%, cursor visible and slow, no music, no stock audio. No secrets on
  screen. No claim spoken that is not also visible or linked. No editing
  two runs together (except the labelled tamper beat, above).

## Test-frame gate (BEFORE the full take — E-6)

Shoot and pass these paused frames before recording the full take; any
failed frame re-stages the shot, never narrates over an illegible number:

1. One paused frame per money beat (cold open, deposit, success #1,
   fail, timeout, tamper, success #2, refusal) — every amount legible
   with its "testnet NEAR" label at 150% browser zoom.
2. The refusal explorer page paused — `over_budget` legible in the
   receipt/logs at 150% zoom.
3. One full sound-off watch-through of the assembled cut — a viewer with
   no audio must be able to retell it in one sentence: "an agent pays
   for a check only if it passes; a failed check deducts nothing;
   overspending is refused."

## 2:00 script

| Time | Shot (surface named) | On-screen text / narration |
|---|---|---|
| 0:00–0:05 (5 s) | **Cold open:** S1 dashboard, already-settled REFUNDED row. | **"Failed call. Deducted: zero."** (on screen + spoken, 4 words, 48 wpm) |
| 0:05–0:15 (10 s) | **The job:** S1 dashboard, seeded demo document visible; small print "Demonstrator service — seeded demo document". Persistent chyron appears at 0:10: "Buyer waits 30 s for a receipt". | Narration (23 words, **138 wpm** — 11 words in the first 5 s, 12 in the second; the 5 s boundary falls mid-sentence after "It"): "An agent needs one document checked before it files it. It pays 0.1 testnet NEAR — but only if the check comes back valid." |
| 0:15–0:25 (10 s) | **Deposit + cap:** terminal `node buyer/buyer.mjs --mode demo` (deposit + set_budget_cap lines), then S2 "Load balance & call history" button click showing balance. Small print: "Contract balances — wallet differs by testnet gas, shown on explorer." | **"Deposit: 0.5 testnet NEAR — Budget: 0.2 testnet NEAR"** Narration (13 words, 78 wpm): "The buyer prepays testnet NEAR and sets a spending limit in the contract." |
| 0:25–0:38 (13 s) | **Success #1 (verification split):** 0:25–0:30 zoomed terminal line "verified: response hash matches, seller attestation valid" (`buyer.mjs` L306); 0:30–0:34 S1/S2 dashboard log SUCCESS, balance drops by 0.1; 0:34–0:38 explorer deduction tx `[FROM RECORDED RUN]`. | **"Successful call: −0.1 testnet NEAR"** Narration (18 words, 83 wpm): "One successful call. The contract deducts exactly one call price — only because the buyer verified the success receipt." |
| 0:38–0:58 (20 s) | **Fail:** terminal `buyer.mjs --mode demo` fail step; S1/S2 dashboard log REFUNDED, balance unchanged; failure-claim tx shown `[FROM RECORDED RUN]`. | **"Failed call: held amount released. Deducted: 0 testnet NEAR."** Narration (16 words, 48 wpm): "Now a failed call. The buyer claims the failure — the held 0.1 is released, never deducted." |
| 0:58–1:03 (5 s) | **Timeout beat (settled row, 5 s):** S2 dashboard timeout row already settled; timeout-claim tx shown `[FROM RECORDED RUN]`; caption "Buyer claimed timeout — held amount released". Chyron "Buyer waits 30 s for a receipt" still up. | **"No receipt in 30 s: held amount released. Deducted: 0 testnet NEAR."** Narration (9 words, 108 wpm): "No receipt in thirty seconds — same release, never deducted." (Do NOT film the live 30-second wait.) |
| 1:03–1:10 (7 s) | **Tampered receipt (R3, separate run):** terminal verification-failure line ("response hash mismatch" / "seller signature FAILED verification"); failure-claim tx `[FROM TAMPER RUN]`; S2 row failed-refunded. On-screen label throughout: "Separate run — same contract". | **"Receipt didn't check out. Deducted: 0 testnet NEAR."** Narration (9 words, 77 wpm): "The receipt didn't check out, so nothing was deducted." |
| 1:10–1:20 (10 s) | **Success #2 (fast, same shots as #1):** terminal verification line flashes 2 s ("verified again"); S1/S2 dashboard log SUCCESS; explorer deduction tx `[FROM RECORDED RUN]`. | **"Second call: −0.1 testnet NEAR. Budget now used."** Narration (5 words, 30 wpm): "Second call, budget now used." |
| 1:20–1:40 (20 s) | **Refusal:** terminal `buyer.mjs --mode demo` past the budget; S1/S2 dashboard log REFUSED, reason `over_budget` verbatim, balance unchanged; refusal tx on explorer, reason `over_budget` legible `[FROM RECORDED RUN]`. | **"Over budget: refused on-chain. Balance unchanged."** Narration (19 words, 57 wpm): "And over budget, the contract refuses the call before any money moves. The contract logged the refusal; balance unchanged." |
| 1:40–2:00 (20 s) | **Close:** S5 dispute-audit view (the four outcomes + receipt links); S1 replay steps; contract ID in full; end card held 3 s. | **"Replay it yourself — same contract: apathetic-party.testnet"** + end card **"MeteredPay — Failed call? Deducted: zero. NEAR testnet. Built at NEAR HACKATHON. Repo in the replies."** Narration (31 words, 93 wpm): "The contract holds the deposit and refuses overspending on-chain. Would you trust an agent that only pays for work it can prove? Replay it — repo in the replies — and tell us." |

**Timing arithmetic:** 5 + 10 + 10 + 13 + 20 + 5 + 7 + 10 + 20 + 20 = **120 seconds**.
Steals, per wave 3: hook 5 s → 10 s (5 s stolen from the close, 25 s → 20 s);
tamper beat 7 s (5–8 s range) = 5 s from the deposit beat (15 s → 10 s) +
2 s from the refusal beat (22 s → 20 s). Close stays 20 s; no beat is cut.

**Hook wpm check (E-1):** hook narration is 23 words over 10 s = **138 wpm**
(≤145). First 5 s: 11 words ("An agent needs one document checked
before it files it. It") = 132 wpm; second 5 s: 12 words ("pays 0.1
testnet NEAR — but only if the check comes back valid") = 144 wpm.
No 5 s window exceeds 12 words. No other beat exceeds 108 wpm.

## 30-second cut (teaser only — attach the 2:00 to X)

Same recorded main run only; the tamper beat is NOT in the teaser. Never
presented as a complete run — the 2:00 is the complete run.

| Time | Shot | On-screen text |
|---|---|---|
| 0:00–0:06 | Fail cold open (same REFUNDED row as 0:00–0:05 of the 2:00). | **"Failed call. Deducted: zero."** |
| 0:06–0:12 | The job (same shot as 0:05–0:15 of the 2:00, trimmed). | **"One document checked — paid only if valid."** |
| 0:12–0:20 | Success #1 (same shot as 0:25–0:38 of the 2:00, trimmed; verification line flashed). | **"Successful call: −0.1 testnet NEAR"** |
| 0:20–0:26 | Refusal (same shot as 1:20–1:40 of the 2:00, trimmed; the refusal tx is the recorded run's real refusal, after success #2). | **"Over budget: refused on-chain. Balance unchanged."** |
| 0:26–0:30 | End card: contract ID only. | **"MeteredPay — apathetic-party.testnet — NEAR testnet"** (repo in the replies, not in the 30 s frame) |

Honesty note for the cut: it is a teaser edit of the same recorded
run, not a standalone replay — the refusal it shows is the run's real
refusal, which happened after the second success. The cut must never
be presented as a complete run; the 2:00 is the complete run.

## Re-record triggers

- Name collision found before/during recording (see `NAME-SEARCH.md`;
  MeteredPay tentative until the day-14 submission check). The name
  sits in swappable text (dashboard header) and a separate editable
  end-card layer — a rename costs a re-render of the end card, not a
  full re-shoot.
- Any frame showing a hash, balance, or explorer link from a different
  run than the recorded run's buyer (tamper beat excepted — labelled
  separate run, `[FROM TAMPER RUN]`).
- Any money overlay missing "testnet", or any claim spoken that is not
  visible or linked.
- A failed/timeout/tamper beat that shows the release without the buyer
  claim step.
- Any cost-zero / costs-zero wording slipping back into narration,
  captions, or on-screen text; any link-in-the-repo wording; any
  refusal reason other than `over_budget` verbatim.
- A tamper beat that cannot be reproduced in the session: cut it, give
  its 7 s to the close — never fake it, never reuse 5 Nov frames.
