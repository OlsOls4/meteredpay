# MeteredPay — 2-minute video script (REBUILT 6 Nov 2026)

**Status: REBUILT — 6 Nov 2026, council video-rebuild.** Olly's verdict on
the 5 Nov cut: "It's rubbish and the narration is robotic." This rebuild
supersedes the 5 Nov script below in full for narration, beats, captions,
chyron, close, and thumbnail. Same recorded run (buyer
`mp-video05.testnet`, 5 Nov 2026; tamper beat buyer `mp-tamper05.testnet`,
same session, same frozen contract `apathetic-party.testnet`) — NO new
recorded run, no new chain activity. Build: `video/work/assemble-v2.py`
(narration `video/work/narr2/`, Helio voice; frames `video/work/frames/`,
re-shoots `video/work/shoot9.mjs` + `shoot9b.mjs`).

**Core message (one sentence):** An agent pays 0.1 testnet NEAR for one
document check — but only if the check comes back valid; a failed check
deducts nothing, and overspending is refused on-chain.

## Arithmetic check (read first — unchanged from 5 Nov)

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
0.5 deposit, spent 0). Its frames are labelled on screen "Separate run
— same contract" and its hashes are marked `[FROM TAMPER RUN]`, never
mixed into the main run's sequence.

## Recording rules (binding — unchanged from 5 Nov unless noted)

- **One run, one buyer (main run).** Every hash, balance, and explorer
  frame in the main run comes from the SINGLE recorded run's own buyer.
  Never paste hashes from the 5 Nov run logs (or any other run) into
  frames — that is editing two runs together and is forbidden. The
  tamper beat is the sole labelled exception (separate run,
  `[FROM TAMPER RUN]`, on-screen label).
- **"Deducted: zero", never the old cost-zero slogan.** Every call costs testnet gas
  (~0.001–0.01 NEAR/call), so "failed calls cost zero" is FALSE at wallet
  level. Everywhere customer-facing — cold open, end card, narration,
  captions — say "Deducted: zero".
- **"testnet" on every money overlay.** Every amount on screen says
  "testnet NEAR". Every explorer cut keeps `testnet.nearblocks.io` in
  frame. No money shot without the testnet label.
- **Show the failure claim.** The fail, timeout, and tamper beats must
  show the buyer submitting the failure/timeout claim — the release is
  never shown as automatic. On-screen: "Failed call: held amount
  released. Deducted: 0 testnet NEAR."
- **Show verification.** The success beats must show the receipt check
  (response hash recomputed + seller signature verified) before the
  deduction transaction. REBUILT: a dedicated verification close-up card
  shows recomputed hash = stated hash (`2edf3f35…f0124b`), the seller
  pubkey, and "Signature: valid — only then does the contract deduct".
- **Never film the 30 s live wait.** The timeout is a 5-second
  settled-row beat, never a live 30-second wait.
- **Chyron window — 0:10–1:03 (restored 6 Nov, DECIDED).** The text now
  CHANGES as the story advances (was one fixed line): 0:10–0:30 "Buyer
  waits 30 s for a receipt"; 0:30–0:58 "Receipt checked before payment";
  0:58–1:03 "No receipt in 30 s — money back". Pill inset 40 px from the
  image edge (was flush). Gone from the tamper beat (1:03) onward.
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
  view (S1/S2/S3) or the terminal command. No shot assumes a button that
  does not exist: there is NO deposit button and NO fresh-deposit button
  anywhere. Deposit is filmed in the terminal
  (`node buyer/buyer.mjs --mode demo`) and confirmed on S2.
- **Captions — CHANGED 6 Nov: sidecar .srt ONLY, no burned captions.**
  The 5 Nov burned captions cut mid-sentence and triple-repeated the
  narration. The .srt is sentence-level (39 cues 2:00, 8 cues teaser),
  timings from the actual narration placements. The headline + one
  supporting line in the top band are titles, not captions.
- **Motion — NEW 6 Nov.** Slow Ken Burns zoom (1.0 → 1.08; 1.12 on the
  11 s+ holds) on every still. No framing held >6 s without a reframe.
  Max silence gap 2.28 s (cold-open → job boundary); all other gaps
  ≤2.07 s; the rest is natural inter-sentence pauses.
- **Narration — CHANGED 6 Nov: Helio voice.** `avocado_v2:MAI_03` via
  `/opt/hatch/bin/tts`, speed 85, one clip per sentence, placed across
  each beat. NEVER sped up to fit — clip durations fit the speech.
  Measured wpm (speech time only): hook 76, job 157, deposit 157,
  success #1 143, fail 122, timeout 149, tamper 136, success #2 152,
  refusal 126, close 159. The old ≤145 wpm cap was a gTTS-era rule for a
  robotic voice; it does not apply to a natural voice — the test is
  whether it sounds rushed (fresh panel verdict, see
  `hidden_files/council-review-video-rebuild-2026-11-06.md` §7).
- **Thumbnail — CHANGED 6 Nov (v2).** Big "MeteredPay" + three large
  rows (SUCCESS — deducted 0.1 testnet NEAR / FAILED — deducted zero /
  OVER BUDGET — refused on-chain) + "NEAR testnet demo — no mainnet
  money." Every word legible at 320 px wide (verified).
- **Backstop line — SOFTENED 6 Nov.** "Backstop: 600 s — buyer can
  reclaim after expiry." The old "can always reclaim" was unproven (no
  backstop reclaim was ever executed).
- **Video length:** no duration cap was found in the live HACKATHON.md
  (re-read 5 Nov 2026, 477 lines). 2:00 is the team's own target.
- 1920×1080, MP4 H.264/AAC, 30 fps, no music, no stock audio. No
  secrets on screen. No claim spoken that is not also visible or
  linked. No editing two runs together (except the labelled tamper
  beat, above).

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

## 2:00 script (REBUILT 6 Nov 2026)

| Time | Shot (surface named) | On-screen text / narration |
|---|---|---|
| 0:00–0:05 (5 s) | **Cold open:** S1 three-card summary (Succeeded / Failed / Refused). No disclosure overlay — disclosure moved to the end card. | Headline **"Failed call. Deducted: zero."** Narration (4 words): "Failed call. Deducted: zero." |
| 0:05–0:16.5 (11.5 s) | **The job:** de-spoiled document card (document + input SHA-256 only — the verdict and deduction tx are REMOVED; they gave away the payoff). Chyron appears at 0:10: "Buyer waits 30 s for a receipt". | Headline "One document to check." Caption "Paid only if the check comes back valid." Narration (28 words): "Agents pay for every call, even the broken ones. This agent needs one document checked before it files it. It pays only if the check comes back valid." |
| 0:16.5–0:27 (10.5 s) | **Deposit + cap:** trimmed terminal frame (verbatim balance-after lines + deposit/cap txs, JSON dropped), then S2 deposit-time balances. Footline: "Testnet only — no mainnet money." | Headline "Deposit 0.5. Cap 0.2." Caption "The contract holds the deposit. It cannot spend past the cap." Narration (25 words): "It puts down zero point five testnet NEAR, and sets a limit: no more than zero point two. Whatever happens, it can't spend past that." |
| 0:27–0:45 (18 s) | **Success #1:** trimmed terminal (verified line + deduction tx `FdAowPRk…` + balance after) 4 s → verification close-up card 5 s (recomputed hash = stated hash, seller pubkey, "Signature: valid") → guided success card 4 s → S3 receipt 5 s (complete at 100% zoom). Chyron switches at 0:30 to "Receipt checked before payment". URL pill on the S3 cut: deduction tx. | Headline "Check the receipt first." Caption "Same fingerprint. Real signature. Then the contract pays." Narration (37 words): "First call. The check comes back valid. The buyer checks the receipt. Same fingerprint, real signature. And only then does the contract take zero point one. That's the whole trick: the buyer checks, then the contract pays." |
| 0:45–1:01 (16 s) | **Fail:** trimmed terminal (seller-error attestation + release tx `7j4Jijr9…` + balance after) 5 s → guided fail card 11 s (no "N of N", Next button reads "Next: see the failed (timeout) call", balance after is this call's 0.5/0/0.1/0.4/0.2). Chyron switches at 0:58 to "No receipt in 30 s — money back". URL pill on the terminal cut: release tx. | Headline "Failed call. Money back." Caption "Held, never taken. Deducted: zero." Narration (25 words): "Now a call fails. The buyer says so, and the money comes back. Held, never taken. Deducted: zero. The seller's own error note proves it failed." |
| 1:01–1:06 (5 s) | **Timeout beat (settled row, 5 s):** guided timeout card (balance after 0.5/0/0.1/0.4/0.2; Next button "Next: see the refused call"). Chyron "No receipt in 30 s — money back" to 1:03, then gone. (Do NOT film the live 30-second wait.) | Headline "No answer in 30 seconds." Caption "Same deal — the money comes back." Narration (11 words): "No answer in thirty seconds? Same deal. The money comes back." |
| 1:06–1:14 (8 s) | **Tampered receipt (R3, separate run):** highlight card 5 s (recomputed `db62657b…` vs stated `0b62657b…`, the single flipped first hex char in red + underlined; "They do NOT match — failure claim: invalid_response"; "Deducted: 0 testnet NEAR"; release tx `7rEaW3An…`) → S2-tamper 3 s. On-screen label throughout: "Separate run — same contract". URL pill on the highlight card: release tx. | Headline "One letter changed." Caption "The buyer catches it. Pays nothing." Narration (16 words): "Someone fiddled with the receipt. See that one letter? The buyer catches it, and pays nothing." |
| 1:14–1:24 (10 s) | **Success #2:** trimmed terminal (verified line + deduction tx `FiHaJ9uv…` + balance after 0.5/0/0.2/0.3/0.2) 3 s → S3 receipt 7 s. URL pill on the S3 cut: deduction tx. | Headline "Second good check." Caption "That is the limit reached." Narration (18 words): "Second good check. That's the limit reached. Two good checks, zero point two spent. The budget is gone." |
| 1:24–1:40 (16 s) | **Refusal:** trimmed terminal (`refused: video05-overbudget-001 reason=over_budget (verbatim), balances unchanged` + refusal tx `8sPCKFBt…` + balance after) 5 s → guided refusal card 5.5 s (only button: "Finish — replay it yourself on S5") → S3 receipt 5.5 s (complete at 100% zoom). Footline on the S3 cut: "Backstop: 600 s — buyer can reclaim after expiry." URL pill: refusal tx. | Headline "Over budget — refused." Caption "Before any money moves. Balance untouched." Narration (26 words): "One more call, and the contract says no before any money moves. Over budget, refused, on the record. Balance untouched. That's the limit doing its job." |
| 1:40–2:00 (20 s) | **Close (REBUILT — S5 audit table OUT):** S1 three-card summary 7 s → replay block 6 s (repo URL + seller-first + buyer command + prerequisites + expected finish 0.5/0/0.2/0.3/0.2) → end card 7 s (name + "Failed call? Deducted: zero." + repo + contract + disclosure: "Rendered dashboard frames with narration — not a live screen recording. Deposit frame rebuilt from the run log; demo outcomes chosen by the seller's scenario switch."). | Headline (three-card only): "Three calls, three answers." Narration (16 + 8 + 5 words): "The buyer checks every receipt. The contract only pays on a receipt the buyer has signed." / "Replay it yourself. The link's in the replies." / "MeteredPay. Failed call? Deducted: zero." |

**Timing arithmetic:** 5 + 11.5 + 10.5 + 18 + 16 + 5 + 8 + 10 + 16 + 20 = **120 seconds**.

## 30-second cut (teaser only — attach the 2:00 to X)

Same recorded main run only; the tamper beat is NOT in the teaser. Never
presented as a complete run — the 2:00 is the complete run. Rebuilt from
the same new assets (Helio narration, new frames).

| Time | Shot | On-screen text / narration |
|---|---|---|
| 0:00–0:05 | Cold open (three-card summary). | **"Failed call. Deducted: zero."** Narration: "Failed call. Deducted: zero." |
| 0:05–0:13 | The job (de-spoiled document card). | "One document to check." / "Paid only if the check comes back valid." Narration: "Agents pay for every call, even the broken ones. It pays only if the check comes back valid." |
| 0:13–0:22 | Verification close-up card. | "Check the receipt first." / "Same fingerprint. Real signature. Then the contract pays." Narration: "The buyer checks the receipt. Same fingerprint, real signature. Then the contract pays." |
| 0:22–0:28 | Refusal (guided refusal card). | "Over budget — refused." / "Before any money moves. Balance untouched." Narration: "One more call, and the contract says no before any money moves." |
| 0:28–0:30 | End card (2 s clip; measured silent tail ~3.5 s from 26.57 — last narration ends 26.96). | "MeteredPay — Failed call? Deducted: zero." No narration. |

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
  its 8 s to the close — never fake it, never reuse 5 Nov frames.
- If the best TTS still sounds robotic: Olly recording the voiceover
  himself (~15 min, script above) is the one alternative — deliver the
  best TTS version first so he can hear the difference (decision
  recorded 6 Nov 2026, video rebuild).
