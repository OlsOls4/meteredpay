# MeteredPay — 2-minute video script, v3 FINAL (voiceover-only TTS)

**Status: FINAL for the voice bake-off, 6 Nov 2026.** This supersedes
`VIDEO-SCRIPT-V3-DRAFT.md` in full for narration, beats, captions, and
close. Same recorded run (buyer `mp-video05.testnet`, 5 Nov 2026; tamper
beat buyer `mp-tamper05.testnet`, same session, same frozen contract
`apathetic-party.testnet`) — NO new recorded run, no new chain activity,
unless the assembly team takes the shoot-note option (b) in the
storyboard. **This script IS for TTS voiceover** — neutral presenter
voice, third person, rendered in long continuous takes (see Voiceover
rules). It is NOT for Olly to record: Olly declined to record or appear
on camera 6 Nov 14:34 ("No, you do everything"), so there is no face
intro and no face close. The "no introduction" complaint is about
content, not a face: the video still opens with a real spoken
introduction over opening visuals.

**Core message (one sentence):** An agent pays 0.1 testnet NEAR for one
document check — but only if the check comes back valid; a failed check
deducts nothing, and overspending is refused on-chain.

**Word count: 251 words as rendered (see §5 + assembly edits), ~150 wpm target, ~102 s of speech + ~18 s of
deliberate pauses and natural gaps placed over pictures still delivering
information.** The rendered intro is the 36-word fallback intro plus the
"on testnet" first line (38 words): the 43-word full intro ran 16.0–16.4 s
at speed 92–100 and would not fit the 15 s slot, and the fallback at
speed 92 runs 15.66 s of speech (145.6 wpm) — 0.66 s past the slot,
inside the script's own ~1 s tolerance, so Shot A runs 0–15.66 s and
Shot B 15.66–23 s. If a take runs long, cut words — never speed up (see the
36-word fallback intro in Adaptation decisions §5).

## Adaptation decisions (v3 draft → v3 final)

### 1. Why this file exists

Olly 6 Nov 14:34 declined to record any voiceover and declined to appear
on camera. The council v3 plan's HYBRID intro form (face intro + human
voiceover + face close) is therefore superseded. The plan's own fallback
— human-voiceover-only with a plain title card — becomes the plan, with
TTS voiceover in place of the human voice (the voice bake-off picks the
voice; this file is the exact text it must render). No other structural
change: same 13 shots, same order, same timings, same hash table, same
recorded run.

### 2. Every first-person line changed (exhaustive — grep-verified)

Only **two** narration lines in the draft contained any first person.
No other narration line (B, C, D, E, F, H, I, J, K, M) contained
first-person wording and none was changed.

- **Shot A (intro), 44 → 41 words (−3).**
  Draft: "I'm Olly, this is MeteredPay. My agents pay for every call —
  even the ones that *fail*. Say one in ten fails: that's money paid for
  work that never happened. MeteredPay only pays when the work checks
  out. [beat] Watch what happens when a call fails."
  Final: "This is MeteredPay, on testnet. Agents pay for every call —
  even the ones that *fail*. Say one in ten fails: that's money paid for
  work that never happened. MeteredPay only pays when the work checks
  out. [beat] Watch what happens when a call fails."
  Change: dropped "I'm Olly," (no presenter on camera) and "My" → bare
  "Agents". Everything else verbatim, including the labelled hypothetical
  "Say one in ten fails" and the [beat] before the closing line.
  **Assembly edit 6 Nov (binding rule — spoken test-money statement):**
  the first line is "This is MeteredPay, on testnet." (+2 words vs the
  41-word final above): the draft's binding rule requires saying in the
  intro, in plain words, that this is test money, and the final script
  carried it on-screen only. TTS input renders the brand spaced
  ("Metered Pay", see Voiceover rules) for pronunciation; captions and
  on-screen text stay "MeteredPay".
- **Shot G (timeout), 18 → 19 words (+1).**
  Draft: "No answer in thirty seconds? Our wait — the contract gives six
  hundred. Same deal: the money comes back."
  Final: "No answer in thirty seconds? The buyer's wait — the contract
  gives six hundred. Same deal: the money comes back."
  Change: "Our wait" → "The buyer's wait". The 30 s is the buyer's
  timeout before it can file a timeout claim; the contract backstop is
  600 s. This is the faithful third-person conversion — no claim changed.
- **Shot D (document), one-word factual correction (assembly, 6 Nov).**
  The final script said "twelve words, ninety-two characters". That 92
  is the FREEZE1011 run's count (its call id `freeze1011-success-001`
  is 3 chars longer), carried over by mistake. The recorded video05
  document recomputes exactly: input SHA-256 `36ac8134…8063` from the
  canonical input (verified with `shared/canonical.mjs`), and the text
  is 89 characters, 12 words. The narration now says "twelve words,
  eighty-nine characters" and the v2 document card's "Characters: 89"
  was correct all along. No other number changes.
- **Teaser, first two lines:** same as Shot A, first two sentences:
  "This is MeteredPay, on testnet. Agents pay for every call — even the ones that
  *fail*." (Was: "I'm Olly, this is MeteredPay. My agents pay for every
  call — even the ones that *fail*.")
- **Shot L (close) narration: UNCHANGED.** It was already third person
  ("The buyer checks every receipt. The contract only pays on one the
  buyer has signed."). Only the visual changed: face close → voiceover
  over the S3 final receipt + balance strip (see storyboard).
- **Shot M (end card) disclosure: one clause changed.** Draft: "Face
  intro/close recorded by the author. Demo frames rendered from the real
  run log — not a live screen recording. …" Final: "Narration: synthetic
  voiceover. Demo frames rendered from the real run log — not a live
  screen recording. …" The rest of the disclosure is verbatim. The
  "face intro/close recorded" claim would now be false.

### 3. Shots changed

- **A:** face intro → clean title card ("MeteredPay" + tagline "Pay only
  when the work checks out." + "Built at NEAR Hackathon · testnet demo"),
  voiceover intro over it, cut-in to the fail-release line at ~0:10 as
  scripted. The tagline is a restatement of the script's own line
  ("MeteredPay only pays when the work checks out") — no new claim.
  No lower third naming Olly; no presenter credit on screen.
- **L:** face close → voiceover close over the S3 final receipt with the
  balance strip overlaid, slow zoom. Narration unchanged. No chyron, no
  headline.
- **M:** disclosure line only (see §2). Everything else unchanged.
- **B–K:** unchanged, including the persistent balance strip, burned
  captions, and chyron discipline (no 0:27–0:30 hole, CH_BACK only over
  the timeout card).

### 4. Claims preserved — nothing dropped

Every number, tx hash, balance, and claim is verbatim from the draft.
"Deducted: zero" everywhere (never cost-zero). "testnet" on every money
overlay and on the title card ("testnet demo"); spoken amounts are
unchanged from the draft — the draft's narration never said "testnet"
aloud either, and the test-money statement is carried on screen in the
first 15 s, exactly as the draft's lower third did. "Say one in ten
fails" kept as a labelled hypothetical, never as a measured rate. No
x402 claim anywhere. No new claim introduced. **Nothing I could not
preserve: none — every first-person line converted cleanly, no claim
dropped, no line needed a rewrite beyond the minimal conversions above.**

### 5. Timing re-check (re-counted, draft counts corrected)

Counting convention: whitespace-separated tokens, excluding `[beat]`
markers and standalone "—" tokens; hyphenated words ("ninety-two")
count as one token; "Deducted:" counts as one word. Recounted
mechanically from the draft text.

| Shot | Draft claimed | Draft actual | Final | Speech @150 wpm | Slot | Fit |
|---|---|---|---|---|---|---|
| A | 38 | 44 | **38** | 15.2 s | 15 s | **+0.2 s over** |
| B | 15 | 15 | 15 | 6.0 s | 8 s | +2.0 s slack |
| C | 20 | 19 | 19 | 7.6 s | 8 s | +0.4 s slack |
| D | 15 | 19 | 19 | 7.6 s | 7 s | +0.6 s over |
| E | 24 | 24 | 24 | 9.6 s | 17 s | +7.4 s slack |
| F | 29 | 29 | 29 | 11.6 s | 15 s | +3.4 s slack |
| G | 18 | 18 | **19** | 7.6 s | 7 s | +0.6 s over |
| H | 16 | 16 | 16 | 6.4 s | 8 s | +1.6 s slack |
| I | 14 | 14 | 14 | 5.6 s | 7 s | +1.4 s slack |
| J | 20 | 20 | 20 | 8.0 s | 11 s | +3.0 s slack |
| K | 18 | 18 | 18 | 7.2 s | 7 s | +0.2 s over |
| L | 15 | 15 | 15 | 6.0 s | 6 s | exact |
| M | 6 | 5 | 5 | 2.0 s | 4 s | +2.0 s slack |
| **Total** | **248** | **256** | **251** | **100.4 s** | **120 s** | **19.6 s residual** |

The draft's claimed 248 words was an undercount: its actual text is 256
words (A claimed 38, actual 44; D claimed 15, actual 19; C claimed 20,
actual 19; M claimed 6, actual 5). As rendered: Shot A is the fallback
intro (36 words) plus the "on testnet" line (+2) = 38 words, and Shot D
says "eighty-nine characters" (same word count). Final is **251 words →
100.4 s of speech at 150 wpm → 19.6 s residual** for the 6 marked [beat]
pauses (~0.5–1 s each) plus natural sentence gaps and shot holds. Shot
durations sum to 120 s (15+8+8+7+17+15+7+8+7+11+7+6+4), re-verified;
assembly placed takes by measured timing, so the A/B boundary sits at
15.66 s and the E/F boundary at 53.90 s (see build log) — totals unchanged.
Per-shot overruns (A +1.4 s, D +0.6 s, G +0.6 s, K +0.2 s) total 2.8 s
and are absorbed by 21.2 s of slack elsewhere; the binding constraint is
the 120 s total, and takes are placed whole by measured timing (see
Voiceover rules), so a take's audio may run ~1 s past a visual cut —
the cut-in to the fail-release line inside Shot A already works this way.
The draft had the same per-shot tension (its claimed 38-word intro is
15.2 s in a 15 s slot); this is not new.

**Intro mitigation (bake-off):** render the intro take at ~165 wpm
(41 words in 15 s — still conversational). Only if the take runs long,
use this 36-word fallback intro (14.4 s @150 wpm) and nothing else:
"This is MeteredPay. Agents pay for every call — even the ones that
*fail*. Say one in ten fails: that's money for work that never happened.
MeteredPay only pays when the work checks out. [beat] Watch what
happens." Changes vs the final intro: drops "paid" before "for work"
and shortens the closing line to "Watch what happens." — the cut-in cue
phrase is preserved.
**Assembly outcome:** the full intro (with "on testnet", 43 words) ran
16.44 s at speed 92 / 16.03 s at speed 100 — over the slot at both
speeds — so the fallback WAS used, with the testnet first line:
"This is MeteredPay, on testnet. Agents pay for every call — even the
ones that *fail*. Say one in ten fails: that's money for work that never
happened. MeteredPay only pays when the work checks out. Watch what
happens." (38 words; TTS input "Metered Pay" spaced). Rendered at
speed 92 it runs 15.66 s of speech — 0.66 s past the 15 s slot, inside
the ~1 s tolerance, so Shot A is 0–15.66 s. Because "Watch what
happens." now lands at ~14.9 s, the ~0:10 cut-in to the fail-release
line is dropped: the title card holds the full shot and Shot B shows
the release line immediately after.

### 6. Out of scope / flag for the assembly team

`ASSEMBLY-PLAN-V3.md` and `RECORDING-GUIDE-V3.md` still assume Olly's
recorded audio + face clips (`video/work/narr3/`, `v3-face-intro.mp4`,
`v3-face-close.mp4`). They need a matching update before the build:
narration source becomes the bake-off TTS renders (long continuous
takes, new directory — do not touch `narr2/`), Shots A/L become the
title-card / S3-receipt visuals in `STORYBOARD-V3-FINAL.md`, and the
test-take gate becomes a bake-off listen-through. This file does not
make those edits — text-only adaptation of script + storyboard, per the
task.

## Notation

- **[beat]** — a deliberate pause (0.5–1 s), always over a picture still
  delivering information (a hash comparison, a balance tick, a refusal line).
  Rendered as a real pause inside the take — never digital silence, never
  a sentence-clip boundary.
- ***word*** — emphasis: stress this word, don't just say it louder.
- Numbers are written as spoken ("half a NEAR", "point two"). Render them
  exactly as written — a hash or balance spoken wrong is a re-render, not
  an edit.

## Arithmetic check (read first — unchanged from v2)

Cap 0.2 testnet NEAR, price 0.1 per call. After success #1, spent is 0.1
and remaining budget is 0.1 — exactly one more call's price — so a refusal
after ONE success is impossible: the call would succeed. The recorded order
MUST be: success #1 → fail → timeout beat → tamper beat (separate run) →
success #2 → refusal. After success #2, spent is 0.2 (cap used), so the
next call is refused on-chain. Final state of the recorded main run:
deposit 0.5 / held 0 / spent 0.2 / available 0.3 / cap 0.2. The flash-forward
preview (Shot 2) shows the fail release out of order and is labelled on
screen "Coming up — the full run, in order"; the journey itself runs in
true order.

**Tamper beat accounting:** the tamper beat is NOT part of the main run's
arithmetic. It is filmed in the same recording session as a separate
single-mode run on the same frozen contract (its own buyer, its own 0.5
deposit, spent 0). Its frames are labelled on screen "Separate run — same
contract" and its hashes are marked `[FROM TAMPER RUN]`, never mixed into
the main run's sequence.

## Voiceover rules (binding — adapted from the draft's recording rules for TTS)

- **Long continuous takes, never sentence-by-sentence.** Render in 3–4
  long takes (one clip per take), placed whole across their shots by
  measured timings. v2's robotic feel was measured as 32 stitched
  sentence-clips with identical digital-silence tails and tempo cliffs
  (76↔157 wpm between adjacent sentences) — the bake-off must not
  reproduce that shape. No per-sentence clips, no stitching, no
  time-stretch, never speed up.
- **Brand pronunciation (TTS input only):** Whisper heard "MeteredPay"
  as "meated/mitred/meter'd pay" in ALL bake-off takes, and in the v3
  brand test the spaced input "Metered Pay" transcribed clearly closer
  ("Meatred Pay") than the compound ("me, Ted Pay"). So the TTS input
  spells the brand "Metered Pay" (spaced) everywhere it is spoken;
  captions, on-screen text, and this script keep "MeteredPay". This is
  a pronunciation spelling for the TTS engine, not a wording change.
- **Pauses are inside the take.** The script's marked [beat] pauses are
  rendered as real pauses within the continuous take, over
  information-bearing pictures. Never leave digital silence.
- **One run, one buyer (main run).** Every hash, balance, and explorer
  frame in the main run comes from the SINGLE recorded run's own buyer.
  Never paste hashes from any other run into frames. The tamper beat is
  the sole labelled exception.
- **"Deducted: zero", never cost-zero.** Every call costs testnet gas
  (~0.001–0.01 NEAR/call), so "failed calls cost zero" is FALSE at wallet
  level. Everywhere customer-facing say "Deducted: zero".
- **"testnet" on every money overlay.** Every amount on screen says
  "testnet NEAR". No money shot without the testnet label. The title card
  states in plain words that this is test money ("testnet demo") in the
  first 15 s — the end-card small print alone made a viewer doubt the
  whole thing.
- **Show the failure claim.** The fail, timeout, and tamper beats must
  show the buyer submitting the failure/timeout claim — the release is
  never shown as automatic.
- **Show verification.** The success beats must show the receipt check
  (response hash recomputed + seller signature verified) before the
  deduction. Success #2 gets the same hash-match beat as #1, briefly —
  never asserted without showing.
- **Never film the 30 s live wait.** The timeout is a settled-row beat,
  never a live 30-second wait.
- **Positioning — what the narration must NEVER claim (R1).** Do not say
  "x402 pays before delivery", "no success condition", or "no refund"
  about x402. This video makes NO x402 claim at all.
- **The "say one in ten" line is a labelled hypothetical** ("Say one in
  ten fails") — an arithmetic illustration, not a measured failure rate.
  Never present it as a fact about agents generally.
- **The honesty lines are spoken, not footers.** Buyer dishonesty is
  spoken in the honesty beat; 30 s vs 600 s is spoken in the timeout
  beat; replay scope is end-card text + the X reply.
- **Captions are burned in** (sentence-level, timed to the rendered
  voiceover's measured word timings) **and** sidecar `.srt`. Assembly
  fails if any caption cue overruns its spoken sentence by >0.2 s.
- **Every shot names its surface.** Each row below names the dashboard
  view (S1/S2/S3), terminal command, or title-card shot. No shot assumes a
  button that does not exist: there is NO deposit button anywhere.
  Deposit is filmed in the terminal and confirmed on S2.
- **Persistent balance strip** (deposit / held / spent / available / cap)
  is on screen from the deposit to the close; the changed digit is
  highlighted at each deduction, and the refusal is shown as the strip
  *not* moving.
- **Video length:** no duration cap was found in the live HACKATHON.md
  (477 lines). 2:00 is the team's own target.
- 1920×1080, MP4 H.264/AAC, 30 fps, no music, no stock audio. No secrets
  on screen. No claim spoken that is not also visible or linked.
- **Bake-off direction:** if a rendered line sounds unnatural, flag it to
  the parent — keep the numbers and the claims verbatim, rephrase nothing
  else without telling the assembly team. If a take runs long, cut words
  (fallback intro above) — never speed up.

## The script (120 s)

| Time | Shot | Narration (words counted) |
|---|---|---|
| 0:00–0:15 (15 s) | **A. Intro — title card, voiceover.** Title card: "MeteredPay" + tagline "Pay only when the work checks out." + "Built at NEAR Hackathon · testnet demo". Slow push-in. Cut-in at ~0:10 to the fail-release line as the voiceover says "watch what happens". | "This is MeteredPay, on testnet. Agents pay for every call — even the ones that *fail*. Say one in ten fails: that's money for work that never happened. MeteredPay only pays when the work checks out. [beat] Watch what happens." (38, fallback intro as rendered) |
| 0:15–0:23 (8 s) | **B. Flash-forward preview:** trimmed terminal frame, fail release line only — release tx `7j4Jijr9…` + "Deducted: 0 testnet NEAR". No balances shown. Chip (persistent): "Coming up — the full run, in order". | "Watch this first. A call fails — and the held money comes straight back. *Deducted: zero.*" (15) |
| 0:23–0:31 (8 s) | **C. Setup:** terminal, command typed live → deposit tx `AzzVziRy…`, cap tx `BHPKq6rm…` → S2 deposit-time balances. Balance strip appears and stays. | "The buyer puts down half a NEAR, and caps spending at point two. It can never spend past it." (19) |
| 0:31–0:38 (7 s) | **D. The document (real, verbatim):** document card — "MeteredPay demo call video05-success-001: pay per successful call, nothing for a failure." + input SHA-256 `36ac8134…8063`. Slow pan across the text. | "One document to check. The seller validates it against a schema — twelve words, eighty-nine characters. [beat] *Valid* — against the schema." (19) |
| 0:38–0:55 (17 s) | **E. Success #1 + verification:** verification close-up 5 s (recomputed hash = stated hash `2edf3f35…f0124b`, seller pubkey, "Signature: valid") → deduction tx `FdAowPRk…` 3 s → balance strip ticks (spent 0→0.1, available 0.5→0.4) 4 s → guided success card 5 s. Chyron changes mid-shot: "Receipt checked before payment" → "Deducted 0.1 testnet NEAR". | "First call. The check comes back valid. The buyer checks the receipt — same fingerprint, real signature. [beat] Only then does the contract take point one." (24) |
| 0:55–1:10 (15 s) | **F. Fail (full beat):** terminal — seller error attestation (`DEMO_SELLER_ERROR`, error hash `a0365a3e…7229`) → buyer files failure claim (claim line highlighted) → release tx `7j4Jijr9…` → guided fail card + explorer receipt; strip ticks to 0.5 / 0 / 0.1 / 0.4 / 0.2. | "Now a call fails. The seller says so itself — error note, signed. The buyer files the claim, and the held point one comes back. [beat] Held, never taken. *Deducted: zero.*" (29) |
| 1:10–1:17 (7 s) | **G. Timeout:** guided timeout card, balance unchanged, release tx `FqP9nzPK…`. | "No answer in thirty seconds? The buyer's wait — the contract gives six hundred. Same deal: the money comes back." (19) |
| 1:17–1:25 (8 s) | **H. Tamper (separate run, labelled):** highlight card — recomputed `db62657b…` vs stated `0b62657b…`, first hex char in red + underlined; release tx `7rEaW3An…`; S2-tamper. Tag throughout: "Separate run — same contract". | "Then someone fiddles with a receipt — one letter changed. [beat] The buyer catches it, and pays nothing." (16) |
| 1:25–1:32 (7 s) | **I. Success #2:** terminal verified line + deduction tx `FiHaJ9uv…` → S3 receipt; strip ticks (spent 0.1→0.2, available 0.4→0.3). Hash-match shown again, briefly. | "Second good check. Checked. The same way — that's point two spent. The limit, *reached*." (14) |
| 1:32–1:43 (11 s) | **J. Refusal:** terminal verbatim `refused: video05-overbudget-001 reason=over_budget`, balances unchanged, refusal tx `8sPCKFBt…` → guided refusal card → S3 receipt. Footline: "Backstop: 600 s — buyer can reclaim after expiry." Attempt one live explorer frame for the refusal tx (fallback: URL pill — see storyboard). Strip does not move. | "One more call — and the contract says *no* before any money moves. Over budget, refused, on the record. [beat] Balance untouched." (20) |
| 1:43–1:50 (7 s) | **K. Honesty beat:** voiceover over the final balance strip (0.5 / 0 / 0.2 / 0.3 / 0.2). | "One honest limit: this protects the *buyer*, not the seller. A dishonest buyer could still claim a failure." (18) |
| 1:50–1:56 (6 s) | **L. Close — voiceover over S3 final receipt + balance strip.** Slow zoom. No chyron, no headline. | "The buyer checks every receipt. The contract only pays on one the buyer has signed." (15) |
| 1:56–2:00 (4 s) | **M. End card (only appearance of the summary):** three rows — SUCCESS deducted 0.1 testnet NEAR / FAILED deducted zero / OVER BUDGET refused on-chain — + repo URL + contract `apathetic-party.testnet`. On-screen text: "Replay it yourself — link's in the replies." Disclosure: "Narration: synthetic voiceover. Demo frames rendered from the real run log — not a live screen recording. Testnet only — no mainnet money. Replay reproduces the deposit, the two successes and the refusal; the failure and tamper beats use the same commands with the seller's scenario switch." | "MeteredPay. Failed call? *Deducted: zero.*" (5) |

**Timing arithmetic:** 15 + 8 + 8 + 7 + 17 + 15 + 7 + 8 + 7 + 11 + 7 + 6 + 4 = **120 seconds**.
**Word count:** 38 + 15 + 19 + 19 + 24 + 29 + 19 + 16 + 14 + 20 + 18 + 15 + 5 = **251 words** (100.4 s speech @150 wpm + 19.6 s marked pauses, gaps, and holds).

## 30-second cut (teaser only — attach the 2:00 to X)

Re-cut from v3 only (title-card hook + fail preview + refusal), never reused
from v2. Same recorded main run only; the tamper beat is NOT in the teaser. Never
presented as a complete run — the 2:00 is the complete run.

| Time | Shot | Narration |
|---|---|---|
| 0:00–0:06 | Title-card hook (Shot A, first two sentences). | "This is MeteredPay, on testnet. Agents pay for every call — even the ones that *fail*." |
| 0:06–0:14 | Flash-forward fail preview (Shot B). | "Watch this first. A call fails — and the held money comes straight back. *Deducted: zero.*" |
| 0:14–0:22 | Verification close-up + deduction (Shot E, cut down). | "The buyer checks the receipt — same fingerprint, real signature. Only then does the contract take point one." |
| 0:22–0:28 | Refusal (Shot J, cut down). | "One more call — and the contract says *no* before any money moves." |
| 0:28–0:30 | End card (2 s). | "MeteredPay — Failed call? Deducted: zero." No narration. |

## Re-render triggers

- Name collision found before/during the build (see `NAME-SEARCH.md`;
  MeteredPay tentative until the day-14 submission check).
- Any frame showing a hash, balance, or explorer link from a different run
  than the recorded run's buyer (tamper beat excepted — labelled separate
  run, `[FROM TAMPER RUN]`).
- Any money overlay missing "testnet", or any claim spoken that is not
  visible or linked.
- A failed/timeout/tamper beat that shows the release without the buyer
  claim step.
- Any cost-zero / costs-zero wording slipping back into narration,
  captions, or on-screen text; any refusal reason other than `over_budget`
  verbatim.
- A tamper beat that cannot be reproduced in the session: cut it, give its
  8 s to the close — never fake it, never reuse v2 frames.
- The "say one in ten" line stated as fact rather than as a hypothetical.
- A rendered take that sounds flat, rushed, or stitched (sentence-clip
  joins, digital-silence tails, tempo cliffs): fix direction / re-render
  in long continuous takes first, do not assemble over it.
