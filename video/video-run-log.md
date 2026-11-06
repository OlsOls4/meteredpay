# MeteredPay video — run log

Produced 5 Nov 2026 (evening, ~22:00–23:30 UTC) by the video production team.
Files are local only under `repo/video/`. Nothing uploaded, no repo made public,
no submission, no mainnet, zero cost. Testnet only.

## Deliverables

| File | Size | Duration |
| --- | --- | --- |
| `meteredpay-demo-2min.mp4` | 5,086,350 bytes (~4.85 MB) | 120.02 s, 1920×1080, 30 fps, H.264/AAC |
| `meteredpay-teaser-30s.mp4` | 948,652 bytes | 30.02 s, 1920×1080, 30 fps, H.264/AAC |
| `meteredpay-demo-2min.srt` | 1,259 bytes | captions sidecar for the 2:00 |
| `meteredpay-teaser-30s.srt` | 293 bytes | captions sidecar for the teaser |
| `meteredpay-demo-2min-transcript.txt` | 1,536 bytes | narration transcript, both cuts |
| `meteredpay-thumbnail-1200x675.png` | ~190 KB | 1200×675, three-row proof strip, legible at 500 px |

## Governing script

`VIDEO-SCRIPT.md` as reframed (commit `8eb7049`, "READY TO RECORD — record TONIGHT,
5 Nov 2026"). That reframe supersedes the old 12–13 Nov draft cited in the original
task brief. All ten segments follow it; the tamper beat was reproduced in-session
(never faked, never reused frames). End card says "Repo in the replies" and the
refusal reason is `over_budget` verbatim (council F2/F12).

## HACKATHON.md video requirements (re-read live 5 Nov 2026 22:07 UTC)

- No video duration cap. No hosting/visibility requirement for the video itself.
- The X demo post must say the project was built at NEAR HACKATHON, tag
  @NEARProtocol + #NEARHackathon, and have the demo video or screenshots attached.
- Deadline 14 Nov 2026 23:59 UTC; judging 16–18 Nov; testnet-only eligible;
  local-only demo OK with a public repo + X post with video.

## Recorded run (main) — buyer `mp-video05.testnet`

Created 5 Nov 2026 via near-cli-rs 0.30.1 faucet flow (full non-interactive form).
Demo mode, tag `video05`, deposit 0.5 testnet NEAR, cap 0.2, price 0.1/call.
Seller API on `http://127.0.0.1:8787` (schema-validation service).
Run log: `buyer/runs/demo-mp-video05.testnet-2026-11-05T22-14-54.jsonl` (13 rows).
Console: `video/work/demo-run-console.log`. Final state 0.5 / 0 / 0.2 / 0.3 / 0.2
(deposit / held / spent / available / cap).

| Step | Transaction |
| --- | --- |
| deposit (0.5) | `AzzVziRy57WiGjSGgcwpa3nK91bVMJQSL2Wt4dUKCP8K` |
| set_budget_cap (0.2) | `BHPKq6rm3pSqS9ynyYK3AtokdZVRFW9MeJYEKCyjjUJ7` |
| success-001 request | `943GuoYMN6g7ukc8DVBBK78fQv9zwTWbxo6pFUq3huD2` |
| success-001 deduction | `FdAowPRkBuUrQkGgTnfhfNsnvqHZTkNzpA1nyt1SMhFT` |
| success-001 response_hash | `2edf3f35e9ad2cc8d4668a8ba9c7a02157ea25ad708e1dda00b5c08b7ef0124b` |
| success-001 input_sha256 | `36ac8134cccf4415452f06604cead78d39a37ad49e3ddcf0248453da2ef38063` |
| fail-001 request | `6XsMx3bKnjrpiUDfwMc5o55GosL8B7Qgx2sX2o9PD2JL` |
| fail-001 release (seller_error claim) | `7j4Jijr9sptyhgfzv9r6CPXYd3B2enzVBNXnedHgzJaA` |
| fail-001 seller error hash | `a0365a3ef8a1097c47f89f08aa3695c85236144edfcc8783dc2823bc9fde7229` |
| timeout-001 request | `9zEfv7JQjFD1b3CcK2Agdc4x7c6a3HhKXz1MLmywHXhh` |
| timeout-001 release (timeout claim) | `FqP9nzPK5VShJpJTSD6L7vUSceV4n5BbUjqDaCUCk8nU` |
| success-002 request | `AXEiBcbcjyxjTPcnjLSqikBLs1PE8YhBiRfVGFx1hzZN` |
| success-002 deduction | `FiHaJ9uvAMUPM3N1kWvpdoMxk77SodCyLRgxqX2YwcDT` |
| success-002 response_hash | `6db115057e3723b8496234042ff6e0a6b29b13548ec2c1f087061398ed08680d` |
| success-002 input_sha256 | `40236db7f6826fdc591d68411d0a0efd708ee11f60565b76a01e8a9ad5f82599` |
| overbudget-001 refusal (`over_budget`) | `8sPCKFBtB3CKeyBXyxoUqwtuDLyi2y4YjC29cJyK5Tcj` |

Note: the seller log's cumulative "earned 2.2 testnet NEAR" is NOT this run's
earnings (this run earned 0.2); it is not shown as such anywhere in the video.

## Tamper run (separate run, same contract) — buyer `mp-tamper05.testnet`

Created 5 Nov 2026 22:43, same faucet method. Single mode, tag `tamper05`,
`--api http://127.0.0.1:8789` (tamper proxy flips one hex char of every success
`response_hash`; signature untouched; proxy killed after the run).
Call ID: `tamper05-single-2026-11-05T22-43-56-9jx7t9`.
Run log: `buyer/runs/single-mp-tamper05.testnet-2026-11-05T22-43-56.jsonl`.
Console: `video/work/tamper-run-console.log`. Final 0.5 / 0 / 0 / 0.5 / 0.2, spent 0.

| Step | Transaction |
| --- | --- |
| deposit (0.5) | `4JL4c8uFoF9zNNGATmoJV9WjinMEZ4hb8Fz7dAa3E6j6` |
| set_budget_cap (0.2) | `Bi719J7sCyCgw377QaEyxVcspELdCe1Cs838uitBCidJ` |
| request | `GDooxNJT8Cn6hi8tBRpvqrqGNgP6CPCziDUcGu2KCJUx` |
| release (invalid_response claim) | `7rEaW3AntDRHynYDxi1JWiTDCtyzM4VYyMYC4d5PgGU7` |

Verification line (verbatim from the console): `invalid response for
tamper05-single-2026-11-05T22-43-56-9jx7t9: response hash mismatch: recomputed
db62657be2006976882eb2236bb9f6a55dcbc672f821c5296c5ac67fea854fea != stated
0b62657be2006976882eb2236bb9f6a55dcbc672f821c5296c5ac67fea854fea — submitting
failure claim invalid_response`.

## Hash verification

Every hash-like token in the video build inputs (`video/work/term-frames.json`,
`video/work/assemble.py`, overlay text files, and the dashboard copy's PLAYBACK
data) was checked against the two run logs + consoles: all 25 tokens are either
in the run logs directly or recomputed from this run's own inputs with the frozen
`shared/canonical.mjs` — verified 5 Nov 2026 23:12 UTC:

- success-001 `input_sha256` 36ac8134… recomputed from the canonical input
  document `{document:{text:"MeteredPay demo call video05-success-001: …"},schema:"quote"}`.
- success-002 `input_sha256` 40236db7… recomputed the same way.
- fail-001 seller error hash a0365a3e… recomputed via `errorBody` +
  `responseHash` (error `DEMO_SELLER_ERROR`, seller `tedious-sea.testnet`,
  price 0.1 NEAR in yocto).
- Response hashes 2edf3f35… and 6db11505… are in the run log verbatim.

No hash from any other run appears in the video inputs (cross-checked against
all other `buyer/runs/*.jsonl`).

## Production method (honest: rendered frames, NOT a live screen recording)

No true screen recording is possible in this VM. The video is built from:

- Real rendered frames of the dashboard: headless Chromium (Playwright) screenshots
  of a video dashboard copy (`video/work/dash/`, built by `video/work/build-dash.js`
  from the repo dashboard; repo `dashboard/` untouched) with this run's real rows,
  balances, and hashes; 150%-zoom variants for the money beats (viewport 1280×720,
  deviceScaleFactor 1.5).
- Real terminal frames: PIL renders of verbatim console-log lines
  (`video/work/render-cards.py` from `video/work/term-frames.json`, spec built by
  `video/work/build-term-spec.mjs`; every hash verified against the run logs).
- Narration: gTTS (Google TTS), normal speed; seg 06 uses atempo 1.05 (5.11 s →
  4.87 s) so it fits its 5 s beat. Narration carries across sub-clip boundaries
  where a beat is split (verified: every word is spoken, nothing clipped —
  speech-end audit per clip in the build notes).
- Assembly: ffmpeg (still image + drawtext headline/caption/chyron/label overlays
  + narration, concat to exactly 120 s / 30 s).

## Explorer limitation

`testnet.nearblocks.io` is bot-blocked in this VM (curl 403; headless Chrome gets
a Cloudflare Turnstile page, saved as `video/work/frames/explorer-success1.png`).
No explorer screenshot was faked. Explorer cuts use the dashboard S3 receipt
frames (real "View on testnet explorer" links + real tx hashes) plus a full
`testnet.nearblocks.io/txns/<hash>` text line on screen.

## Defects found in QA and fixed (re-rendered)

1. Thumbnail proof strip overlapped in three columns — restacked as three rows;
   re-checked legible at 500 px.
2. Terminal titles showed the full command wrapped over two lines, colliding
   with the chyron pill — titles shortened to one-line labels
   ("buyer terminal — deposit + cap", etc.); the exact command is now body line 1.
3. ALL S3 receipt frames were wrong in the first assembly: they showed S1, not S3.
   Root cause: the dashboard `route()` does `VIEWS.indexOf(hash after '#/')`,
   so `#/s3?call=X` falls back to S1 (the `?call=` query breaks the view match).
   Re-shot all 10 S3 frames by loading `#/s3` then calling the exposed
   `window.__meteredpay.renderS3(callId)` with a visibility check; all 10 are
   now distinct and verified. NOTE FOR THE FINISH TEAM: this is also a real
   dashboard bug — clicking a "Receipt" link (`#/s3?call=…`) in the live dashboard
   lands on S1 instead of the receipt. Not fixed here (dashboard is frozen for video).
4. Chyron pill rendered at top-left with white text on a light background
   (ffmpeg `drawbox` `x=w-660` evaluated against the box width, not the frame) —
   fixed to absolute coordinates (x=1260); now legible top-right, 0:10–1:03.
5. Tamper label box overlapped the terminal title — label folded into the
   headline ("Separate run — Receipt didn't check out. …") and shown on both
   tamper sub-clips.
6. Narration truncated at sub-clip boundaries in the first assembly (clips were
   compared against file durations including trailing silence; the actual defect
   was that narration audio was only placed on the first sub-clip of a split
   beat) — narration now carries across sub-clips via `-ss` splits
   (n03/n04/n05/n08/n09); speech-end audit confirms every word is spoken.

## Verification performed

- `ffprobe`: 120.02 s / 30.02 s; 1920×1080; 30 fps; H.264 + AAC 48 kHz stereo.
- Frame-by-frame QA at 18 timestamps (cold open, job, deposit, success #1,
  fail, timeout, tamper, success #2, refusal, close, end card): headlines,
  captions, chyron window (0:10–1:03), tamper label, explorer URL pills,
  `over_budget` legibility at 150% zoom — all pass.
- Audio: narration present in all 10 segments (mean −21 to −29 dB per segment);
  carry-over tail windows confirmed spoken; speech-end audit per clip.
- Wording: no "cost zero" / "costs zero" / "budget exceeded" anywhere in the
  video inputs; every money overlay says "testnet"; "Deducted: zero" used
  throughout; refusal reason `over_budget` verbatim.
- Sound-off watch-through retell: "an agent pays for a check only if it passes;
  a failed check deducts nothing; overspending is refused." ✓

## Build inputs (reproducible)

`video/work/assemble.py` (ffmpeg build), `video/work/render-cards.py`,
`video/work/build-term-spec.mjs`, `video/work/build-dash.js`,
`video/work/shoot*.mjs` (frame capture), `video/work/proxy.mjs` (local forward
proxy for headless Chromium; no credentials in files),
`video/work/frames/` (source frames), `video/work/narr/` (gTTS clips),
`video/work/segs/` (per-clip segments), `video/work/qa/` (QA frame grabs).
Seller API + forward proxy processes were stopped after assembly.

## Second pass (videographers' ranked fixes) — 5 Nov 2026 ~23:30–23:45 UTC

Re-render from the SAME assets/run (buyer `mp-video05.testnet`, tamper
`mp-tamper05.testnet`); no new recorded run, no new contract calls, no repo
made public, no push/remote, no X post, no upload. Build: `video/work/assemble.py`
(only file changed besides the outputs + SRT/transcript). Three renders were
needed: the first exposed an ffmpeg `amix` bug (below); the second exposed a
clipped chyron; the third is the final cut.

### Final deliverables

| File | Size | Duration |
| --- | --- | --- |
| `meteredpay-demo-2min.mp4` | 4,781,196 bytes (~4.56 MB) | 120.02 s, 1920×1080, 30 fps, H.264/AAC |
| `meteredpay-teaser-30s.mp4` | 875,719 bytes | 30.02 s, 1920×1080, 30 fps, H.264/AAC |
| `meteredpay-demo-2min.srt` | rewritten | measured speech windows (see below) |
| `meteredpay-teaser-30s.srt` | rewritten | measured speech windows |
| `meteredpay-demo-2min-transcript.txt` | rewritten | timings match the new SRTs |

Durations unchanged from pass 1 (120.02 s / 30.02 s). No subtitle stream is
embedded in either mp4 (ffprobe: video + audio streams only); captions are
burned in (≤2 lines) with the SRT as a sidecar. Thumbnail unchanged.

### Fix 1 — on-screen disclosure (HIGH)
Second line under the headline, 0:00–0:10 in the 2:00 (cold open 0:00–0:05,
job beat 0:05–0:10) and 0:00–0:06 in the teaser: "Rendered dashboard frames
with narration — not a live screen recording". No frame claims a live
recording anywhere.

### Fix 2 — dead silence (HIGH)
Long beats re-recorded as slow gTTS splits of the SAME script words, placed
with gaps and mixed per beat (`mix_narr` in `assemble.py`; atempo 0.75–1.0).
Measured silence before → after (ffmpeg silencedetect, −50 dB, d=1.0 s):
fail 12.4 s → max 3.3 s gap / 2.3 s tail; refusal 10.9 s → max 3.8 s gap /
3.1 s tail; success #2 8.1 s → max 3.6 s; deposit 5.6 s → max 1.8 s;
success #1 4.5 s → 1.6 s tail; tamper 3.7 s → 1.4 s gap. Mid-close gap
5.3 s → 2.8 s (n11 now starts 0.5 s into c10b instead of 3.0 s; SRT #11
moves 1:50 → 1:47). Worst remaining silence is the 4.4 s end-card hold
(1:55–2:00) and the 5.4 s silent teaser end card — both intentional holds,
not dropped audio.
BUG FOUND AND FIXED IN-BUILD: per-part `apad`+`atrim` before `amix`
silently dropped every narration part after the first (first render's
mixes contained part A only; silence was unchanged). Trim/pad now happen
AFTER `amix` (documented in `assemble.py`).

### Fix 3 — overlay geometry (MEDIUM-HIGH)
Uniform letterbox on every image clip: image scaled to 1592×896 inside a
88 px top band (headline, fontsize 36) and a 96 px bottom band (captions
fontsize 30 at y=994; URL pill fontsize 20 at y=1044). Verified on frames:
headline no longer covers the MeteredPay header or the "TESTNET — no real
money" pill (0:12, 0:36, 1:37); response hash 2edf3f35… fully legible at
0:36 with the explorer URL pill below it in the bottom band; refusal
explanation "reason over_budget (verbatim)" fully legible at 1:32 and 1:37
with the refusal URL pill below it; captions clear of body text on every
checked frame (cold open, job, deposit terminal, S2, success #1 terminal /
guided / S3, fail guided / S3, tamper S2, success #2, refusal terminal /
guided / S3, close, end card, teaser cold open + job). Cost: dashboard
frames render at ~83% scale; amounts remain legible at 1080p (gate frames).
Two source-frame limits remain and are NOT overlay collisions: S3 frames'
last explanatory line is cut by the source viewport itself (e.g. "SHA-256
of the canonical…" at 0:36, "…transaction" at 1:37).

### Fix 4 — chyron timing (MEDIUM)
Chyron "Buyer waits 30 s for a receipt" now 0:10–0:30 only: appears at t=5
of the job clip (absolute 0:10), stays through deposit (0:15–0:25) and the
verification terminal (0:25–0:30), gone from the guided success frame
(verified absent at 0:32) and every later beat. It also moved from top-right
to a bottom-right pill (x=1416, y=916, fontsize 19) clear of all four
frames it sits over (checked 0:12, 0:17, 0:22, 0:27). First re-render
clipped its last letter (fontsize 20 = 333 px in a 340 px box); fixed to
fontsize 19 (317 px, measured with PIL).
BOUNDARY NOTE: the script also says the chyron "stays up through the
timeout beat". The videographers' instruction ("gone once the receipt
arrives") wins here: the success #1 receipt is verified 0:25–0:30, so the
chyron ends at 0:30 and does not reappear for the timeout beat. The script
was not edited (out of scope for this pass).

### Fix 5 — "testnet" on every money overlay (LOW-MEDIUM)
Cold-open headline + caption + narration: "Failed call. Deducted: zero
testnet NEAR." (n01 re-recorded, 4.10 s). Job headline (both cuts):
"One document checked on testnet — deducted only if valid." Fail caption:
"the held 0.1 testnet NEAR is released, never deducted." (n05 part 2
re-recorded with the same words). All other money overlays already said
"testnet". The refusal headline has no amount ("Over budget: refused
on-chain. Balance unchanged.") and the close headline names the testnet
contract; both left as-is.

### Fix 6 — teaser "Paid only if valid" (LOW-MEDIUM)
Teaser 0:06 headline + caption + narration (t2 re-recorded): "One document
checked on testnet. Deducted only if valid." The 2:00 job headline got the
same rewording (same line, same glossary no-bare-"Paid" rule).

### Test-frame gate (re-run on the final cut)
- One paused frame per money beat: cold open 0:02, job 0:12, deposit 0:17
  + 0:22, success #1 0:27 + 0:32 + 0:36, fail 0:45 + 0:52 + 0:56, timeout
  1:00, tamper 1:05 + 1:08, success #2 1:12 + 1:16, refusal 1:25 + 1:32 +
  1:37 — every amount legible with its "testnet NEAR" label; frames in
  `video/work/qa2/`.
- Refusal explorer page: `over_budget` legible at 1:32 (guided card) and
  1:37 (S3 receipt, "reason over_budget (verbatim)"). Explorer itself is
  still bot-blocked in this VM, so the S3 receipt frame is the proof, as
  in pass 1 — no explorer screenshot was faked.
- Sound-off watch-through retell: "an agent pays for a document check
  only if it passes; a failed check deducts nothing; overspending is
  refused." ✓

### Pre-existing note (out of scope, not changed)
The deposit beat's S2 frame (`z-s2-loaded.png`, 0:20–0:25) shows the run's
FINAL balances (Spent 0.2 / Available 0.3), not the post-deposit state —
it is the frame pass 1 shot. Fixing it needs a re-shot S2 frame, not a
re-render; flagged here for the finish team, not fixed in this pass.

## L7 — freeze verification (Wave 4, 5 Nov 2026 ~23:55 UTC, BEFORE the Wave-4 re-render)

Verified by the Wave-4 video workstream against HEAD `5688927`
("Commit stranger-replay run log cited by README §2.5"):

- `git ls-files -s` vs `git hash-object` agree for all six tracked
  deliverables — every file below is tracked at HEAD and unmodified
  on disk (`git status` clean on all tracked `video/*` files).
- Untracked under `video/work/` only (build intermediates, never
  tracked): `dash/`, `diag-s2.mjs`, `frames/`, `narr/`,
  `package-lock.json`, `proxy.log`, `qa/`, `qa2/`, `segs/`,
  `seller.log`, `seller2.log`, `test-narration.mp3`, `txt/`.
  The re-render overwrites the two mp4s below; backups of the frozen
  files were kept outside the repo (`/tmp/mp-backup/`).

| File | Size | sha256 |
| --- | --- | --- |
| `meteredpay-demo-2min.mp4` | 4,781,196 bytes | `8547b6b559e583e6a50b15d32376d256ca200e7c1de7ce92334f442da181ee57` |
| `meteredpay-teaser-30s.mp4` | 875,719 bytes | `d1a834cdea1f8d4a7494fd6438ac6201f2a7419f2ab426b15d3ff1476cbed79b` |
| `meteredpay-demo-2min.srt` | 1,286 bytes | `ffbca636776ce4c92aaa37878ddae7198ddc6c5e21b18a6cdc930b5bc40f1e6c` |
| `meteredpay-teaser-30s.srt` | 322 bytes | `df25dd278fd82757fca0188b025a898a56a8f94e62b6e3c1ea0b2a79b45a42fd` |
| `meteredpay-demo-2min-transcript.txt` | 2,149 bytes | `fae5fded867146d422b6d219123fb7a1ae3b6d63f297c5ef8ef93931dcc239f5` |
| `meteredpay-thumbnail-1200x675.png` | 189,530 bytes | `e7c4e375e5c0e88ebb7b030c4344c4a72f440a78c807a1f67f083c391905d8a6` |

- `ffprobe`: 2:00 = 120.021333 s, 1920×1080, 30 fps, H.264/AAC;
  teaser = 30.021333 s, same geometry. Sizes match the second-pass
  table above. The Deliverables table at the top of this log still
  lists PASS-1 sizes (5,086,350 / 948,652 / SRT 1,259 / 293 /
  transcript 1,536) — stale; the second-pass table + this section
  supersede it.
- 2-min sha256 `8547b6b5…` matches the Wave-4 council synthesis §10
  drift note (23:42 re-render `467b6cad…` → `8547b6b5…`).
- Transcript/SRT match: all 11 two-minute SRT cues and all 4 teaser
  cues appear verbatim in the transcript (programmatic check); SRT
  windows are the second-pass measured speech windows.
- Tamper beat present (frame grab 1:05, "Separate run — Receipt
  didn't check out"); no hash from any other run in the video inputs
  (see "Hash verification" above — 25 tokens, re-checked for this
  wave: both `input_sha256` values recomputed from the canonical
  inputs with `shared/canonical.mjs` and matched the run log).
- Baseline frame grabs (pre-re-render, `/tmp/qa-baseline/`):
  0:10.0 CONFIRMS the V-F2 garbled frame — both c02 captions overlap
  on one frame; 1:00 shows the timeout guided card "4 of 4";
  1:32 shows the refusal card "3 of 3" (see V-F6 note in the Wave-4
  section below).
- Stale chyron claims corrected: "Defects fixed" #4 and the
  "Verification performed" section above still say the chyron runs
  0:10–1:03 — that is pass 1. The frozen render runs it 0:10–0:30
  (second-pass Fix 4, commit `ee2f8fa`); see the V-F5 conflict note
  in the Wave-4 section below. Nothing in this section changes the
  chyron.
- This log did NOT previously record mp4 sha256s (only input/
  response hashes). The table above adds them for the frozen files;
  the Wave-4 re-render section below records the new hashes after
  the re-render.

## Wave 4 — re-render (5 Nov 2026 ~23:58–6 Nov 00:17 UTC, same run, no re-record)

Council wave-4 video findings implemented by re-rendering through
`video/work/assemble.py` only — no new recorded run, no new testnet
transactions for video purposes, no narration/headline wording
changed. Two renders happened: render 1 (00:06 UTC) was QA'd and
then SUPERSEDED by render 2 (00:17 UTC) after the S5 framing fix
below. Only render 2 is current.

| File | Size | Duration | sha256 |
| --- | --- | --- | --- |
| `meteredpay-demo-2min.mp4` (render 2, current) | 4,559,347 bytes | 120.021333 s | `fe2952dbc0f87d8a185d1a0de9e952986c2ebd21c9714203d8da09c10dad6422` |
| `meteredpay-teaser-30s.mp4` (render 2, current) | 768,316 bytes | 30.021333 s | `08d478597c02752471a7e15367f415fdf35c9b153571c271dfa7e4a9ea4c3fd2` |
| `meteredpay-demo-2min.mp4` (render 1, superseded) | 4,623,262 bytes | 120.021333 s | `cb3c582620140cc43feb963259f8fd0d30d1c6d4675e3067c1f84c3968103d7a` |
| `meteredpay-teaser-30s.mp4` (render 1, superseded) | 768,105 bytes | 30.021333 s | `a9a29e08a8c73f24beac36f3f9e8c907b82a481e3afdf2ea35bf0c0fc99b9bfb` |

Durations UNCHANGED by the re-render (120.02 s / 30.02 s, same as
the frozen files). SRT + transcript UNCHANGED (narration text
identical; see the speech-timing note below). Thumbnail unchanged.

What changed, per finding (all in `video/work/` — `assemble.py`,
`shoot7.mjs`, `render-frames-wave4.py`, `dash/app.js`,
`dash/styles.css`; repo `dashboard/` untouched):

- **L4 — show the document (c02 0:05–0:15, teaser t02):** new
  frame `frames/doc-success1.png`, a full-screen card of the actual
  checked document, verbatim from the recorded run: call
  `video05-success-001`, schema `quote`, seller
  `tedious-sea.testnet`, document text
  "MeteredPay demo call video05-success-001: pay per successful
  call, nothing for a failure." (Words: 12 · Characters: 89),
  Input SHA-256 `36ac8134cccf4415452f06604cead78d39a37ad49e3ddcf0248453da2ef38063`
  (recomputed from the canonical input with
  `shared/canonical.mjs` — matches the run log), seller verdict
  "valid, no errors — deducted 0.1 testnet NEAR", deduction tx
  `FdAowPRkBuUrQkGgTnfhfNsnvqHZTkNzpA1nyt1SMhFT`, footer "Buyer
  mp-video05.testnet · 5 Nov 2026 · input SHA-256 recomputed from
  this document." Frame grab at 0:10 verified legible at 1080p — a
  sound-off viewer can say what is being checked.
  **Fail companion NOT shipped:** fail-001's document is the same
  valid template with callId `video05-fail-001`; the failure was the
  seller's `scenario=fail` → `DEMO_SELLER_ERROR`, not a wrong field
  in the document — no verbatim "one wrong field" exists in the
  fail-001 run-log input, so highlighting one would invent a
  document. Only the success card ships.
- **V-F1 — de-spoil (c01 0:00–0:05, c03b 0:20–0:25, teaser t01):**
  cold open is now `frames/s1-coldopen-refunded.png` — the REFUNDED
  (fail-001) row only, cropped from the 2x shot by orange-outline
  detection (tight box (222, 264, 1696, 561), no y padding); no other
  row, no refusal, visible at 0:02. S2 is now
  `frames/z-s2-deposit.png` at DEPOSIT-TIME state: balances
  0.5 / 0 / 0 / 0.5 / 0.2 (from the run-log rows after deposit +
  set_budget_cap and `demo-run-console.log`), both history tables
  showing the dashboard's own "No calls recorded for this buyer." /
  "No refusals recorded for this buyer." rows — because the S2 live
  load reads the frozen contract's FINAL state, the five balance
  boxes were set via `page.evaluate` to the run-log deposit-time
  values and the history tbodys replaced with the empty-state rows
  (method note: the frame is a reconstruction from run-log values,
  not a live deposit-time capture — a live re-shot is impossible
  without a new run). The "Pre-existing note" above about
  `z-s2-loaded.png` is RESOLVED by this change.
- **V-F4 — re-frame the close (c10a 1:40–1:47, c10b 1:47–1:53):**
  c10a is now `frames/s1-threecards.png` — the S1 three-card
  summary (Succeeded / Failed / Refused), cropped by border
  detection (box (232, 336, 1686, 745)); all three cards complete
  with bottom borders, verified at 1:40. c10b is now
  `frames/s5-audit-fit.png` — the S5 audit table at fit width
  (`main` widened to 1880 px, `.table-wrap` overflow visible, both
  framing-only live DOM edits for the shot): all six columns fully
  in frame at 1:50, Explorer column complete, "View on testnet
  explorer" wraps between words only. First version of this frame
  (render 1) still showed a half-line of step-3 text clipped at the
  top edge — the window scroll could not reach the heading (page
  only ~1623 px tall after widening; `#audit-rows.scrollIntoView()`
  scrolled the `.table-wrap` instead of the window) — so
  `shoot8.mjs` re-shot it with a body min-height spacer and an
  explicit `window.scrollTo` to the "Dispute audit" heading, and
  render 2 superseded render 1. (A `page.screenshot({clip})`
  attempt was tried and discarded: clip is viewport-relative in
  this Playwright build and returned a 1920×302 image.)
- **V-F2 — half-open caption windows (c02, c10b):** caption windows
  changed from `(0, 5)` / `(5, 10)` to `(0, 4.97)` / `(5.03, 10)`
  (c10b: `(0, 4.97)` / `(5.03, 6)`). Frame at exactly 0:10.0 in the
  re-render shows NO caption (60 ms gap, 2 frames at 30 fps) —
  the garbled overlap frame from the frozen render is gone.
- **V-F6 — guided numbering: verified already correct, NOT
  changed.** In-video at 0:32 success "1 of 3", 0:45 fail "2 of 3",
  1:00 timeout "4 of 4", 1:32 refusal "3 of 3". (Timeline order
  shows 1, 2, 4, then 3 — that is the frozen script's execution
  order, not a numbering error.)
- **V-F8 — wrapped explorer links (video dash copy only):**
  `video/work/dash/app.js:132` `txLink` class changed to
  `"hash explorer-link"`; `video/work/dash/styles.css` added
  `.explorer-link { word-break: normal; overflow-wrap: break-word; }`
  — links break between words only, never mid-word. Verified in the
  0:32, 1:00, 1:32 and 1:50 grabs. Repo `dashboard/` untouched.
  (Call-ids still wrap mid-word inside their S5 cell — that is the
  dashboard's existing `break-all` on hash text, not this defect.)
- **V-F7 — backstop in the close (c10b):** `build_clip` gained a
  `footline` parameter (rendered y=1044, same black-box treatment
  as urlpill); c10b carries
  "Backstop: 600 s — the buyer can always reclaim" (from
  `dashboard/config.js` `BACKSTOP_SECONDS: 600`), visible at
  1:47–1:53 under the S5 table.
- **V-F5 — chyron window: UNCHANGED (0:10–0:30). CONFLICT RECORDED
  — needs Olly's decision.** Two positions: (a) Videographers +
  wave 3 — restore the chyron to 0:10–1:03 (through the timeout
  beat), as `VIDEO-SCRIPT.md` still says ("stays up through the
  timeout beat"); (b) the deliberate cut to 0:10–0:30 made in the
  second pass (commit `ee2f8fa`, Fix 4 — "ends at 0:30 when the
  receipt has arrived / been verified"). The frozen render and this
  re-render both run 0:10–0:30. Nothing about the chyron was
  changed in this wave. Note: the chyron pill's right edge sits at
  the image edge (x=1416 + 340 px box), so its last glyph is tight
  against the frame edge — pre-existing, same in the frozen render.

Verification performed on render 2 (the test-frame gate, re-run):

- `ffprobe`: 120.021333 s / 30.021333 s, 1920×1080, 30 fps,
  H.264/AAC; sha256s in the table above.
- Frame grabs from the final mp4s (`/tmp/qa-final/`): 0:02
  (REFUNDED row only), 0:10 (document legible), 0:10.0 (no
  overlap), 0:20 (0.5/0/0/0.5/0.2, no calls), 0:32 ("1 of 3",
  deducted 0.1), 1:00 ("4 of 4"), 1:05 (tamper beat — hash
  mismatch, separate run, deducted 0), 1:32 ("3 of 3"), 1:40
  (three cards), 1:47 + 1:50 (S5 six columns + backstop line),
  1:52 (backstop line); teaser 0:02 (REFUNDED row), 0:09
  (document card), 0:25. All unchanged clips are pixel-identical
  between render 1 and render 2 (frame sha256s match) — only c10b
  differs.
- Transcript/SRT match: text unchanged, all 11 two-minute cues
  and 4 teaser cues still verbatim in the transcript. Speech
  timing re-measured with `silencedetect` (-50 dB, d=0.5) on the
  final audio: every SRT window covers its speech. Two negligible
  deviations from the second-pass measured windows (gTTS re-fetch
  variance — the render re-fetches narration): cue #7's speech ends
  0.57 s before its window ends (caption overhang, no clipping);
  cue #8's speech starts 0.25 s before its window opens (sidecar
  only — the burned caption is clip-wide). SRT left unchanged.
- No cross-run hash: all hashes in the new frames/overlays are
  from the video05 run or the labelled tamper05 separate run
  (document input hash recomputed; the two response hashes and
  tx hashes in the S5 table match the run log).
- Backups of the frozen (pre-Wave-4) mp4s kept outside the repo
  (`/tmp/mp-backup/`). Forward proxy used for the live contract
  reads during the shoots was stopped after the final render;
  seller API on 127.0.0.1:8787 was pre-existing and left running.

## Chyron restore — re-render (6 Nov 2026 ~09:00 UTC, same run, no re-record)

DECISION: chyron window RESTORED to 0:10–1:03, decided by Olly-delegated
Muse 6 Nov 2026 — the videographers' call (council wave 4, V-F5), over
the finish team's deliberate 0:10–0:30 cut (second pass, commit `ee2f8fa`,
Fix 4 — "ends at 0:30 when the receipt has arrived / been verified").
Rationale (videographers): the timeout beat (0:58–1:03) is the payoff the
chyron sets up; `VIDEO-SCRIPT.md` always said 0:10–1:03 ("stays up
through the timeout beat") — the 0:10–0:30 render was the deviation.
`VIDEO-SCRIPT.md` amended with the decision record (recording-rules
bullet); this log's V-F5 conflict note is now RESOLVED in favour of
restore. The stale "0:10–1:03" claims in "Defects fixed" #4 and
"Verification performed" (pass 1) are now TRUE again of the current
render; the second-pass Fix 4 / Wave-4 "0:10–0:30" statements describe
the superseded renders only.

Change: `video/work/assemble.py` only — `chyron=True` added to clips
c04b (0:30–0:34), c04c (0:34–0:38), c05a (0:38–0:44), c05b (0:44–0:52),
c05c (0:52–0:58), c06 (0:58–1:03); header comments updated. No frame,
narration, headline, caption, SRT, transcript, or thumbnail change.
Re-rendered with the existing pipeline (`python3 assemble.py`); no new
recorded run, no new testnet transactions, no re-record. Note: `gtts`
was not installed in the system python3 — installed with
`pip3 install --user --break-system-packages gtts` (2.5.4) before the
run; the render re-fetches narration from gTTS as before (same words,
re-fetch variance as in Wave 4).

| File | Size | Duration | sha256 |
| --- | --- | --- | --- |
| `meteredpay-demo-2min.mp4` (chyron restore, current) | 4,578,861 bytes | 120.021333 s | `6b6f0c8645873a73100d49a62c4f6277e2056b75b8a0a6ebe4fb2fd3935a8258` |
| `meteredpay-teaser-30s.mp4` (chyron restore, current) | 768,194 bytes | 30.021333 s | `191553c0b43625efe0b4048dde21514359b055c3234fc5d78e03783d77c96192` |
| `meteredpay-demo-2min.mp4` (Wave-4 render 2, superseded) | 4,559,347 bytes | 120.021333 s | `fe2952dbc0f87d8a185d1a0de9e952986c2ebd21c9714203d8da09c10dad6422` |
| `meteredpay-teaser-30s.mp4` (Wave-4 render 2, superseded) | 768,316 bytes | 30.021333 s | `08d478597c02752471a7e15367f415fdf35c9b153571c271dfa7e4a9ea4c3fd2` |

Durations UNCHANGED (120.02 s / 30.02 s). SRT + transcript + thumbnail
UNCHANGED (sha256s identical to the frozen table: `ffbca636…`,
`df25dd27…`, `fae5fded…`, `e7c4e375…`). The teaser hash changed although
no teaser clip carries a chyron — gTTS re-fetch variance only (same
words, same frames; Wave 4 recorded the same effect). Backups of the
Wave-4 mp4s kept outside the repo (`/tmp/mp-backup-chyron/`).
NOT committed by this worker (coordinator commits at the end).

Test-frame gate (re-run on the chyron-restore render — frames in
`/tmp/qa-chyron/`):

- Chyron presence, programmatic (burnt-orange pill region
  x=1430–1750, y=920–956, ≥0.84 orange fraction): PRESENT at 0:12,
  0:17, 0:22, 0:27, 0:32, 0:36, 0:45, 0:52, 0:56, 1:00, 1:02; ABSENT
  at 0:02, 0:09 (before the window), 1:04, 1:05 (tamper beat), 1:12,
  1:32, 1:37, 1:47, 1:50 (after the window); teaser 0:09 absent
  (teaser never carries the chyron). Window is exactly 0:10–1:03.
- Visual spot-checks: 0:17 (deposit terminal), 0:36 (S3 success #1 —
  response hash 2edf3f35… fully legible, explorer URL pill below),
  0:45 (guided fail, "2 of 3"), 0:56 (S3 fail — error hash a0365a3e…
  fully legible), 1:00 (timeout guided card, "4 of 4"), 1:04 (tamper
  terminal, chyron correctly gone, hash-mismatch line legible). On
  every checked frame the pill sits over blank space only — no
  collision with terminal text, hashes, captions, or URL pills; the
  full text "Buyer waits 30 s for a receipt" is legible (the
  second-pass fontsize-19 fix holds). The S3 frames' last
  explanatory line is still cut by the source viewport itself
  (pre-existing, not an overlay collision).
- Money overlays: every amount legible with its "testnet NEAR" label
  on all checked frames (headlines, captions, balances); no "cost
  zero" wording; refusal reason `over_budget` verbatim (unchanged
  clips). Sound-off retell unchanged: "an agent pays for a document
  check only if it passes; a failed check deducts nothing;
  overspending is refused." ✓
- Audio: `silencedetect` (−50 dB, d=0.5) — narration present in all
  10 segments; worst silence run is the intentional 4.4 s end-card
  hold (1:55–2:00); all other gaps ≤3.8 s, matching the second-pass
  measurements.
- No cross-run hash: no input, frame, or overlay changed — all hashes
  are from the video05 run or the labelled tamper05 separate run, as
  verified for the Wave-4 render.

## REBUILD (6 Nov 2026, ~13:00–14:00 UTC) — council video-rebuild, Olly: "rubbish, narration robotic"

Same recorded run (mp-video05.testnet + tamper mp-tamper05.testnet), no new
run, no new chain activity. Build: `video/work/assemble-v2.py` (frames
`video/work/render-cards-v2.py`, re-shoots `video/work/shoot9.mjs` +
`shoot9b.mjs`, narration `video/work/narr2/synthesize.sh`).
Full council synthesis:
`~/workspace/goals/win-cash-with-meteredpay-at-near-hackathon/hidden_files/council-review-video-rebuild-2026-11-06.md`;
rebuild log:
`~/workspace/goals/win-cash-with-meteredpay-at-near-hackathon/hidden_files/video-rebuild-log-2026-11-06.md`.

Outputs (this render):
- 2-min `meteredpay-demo-2min.mp4` — 120.02 s, 1920×1080, h264+aac, 30 fps,
  28,064,084 bytes, sha256
  `6ed84e034f38c106a67b034da97736bf712191134f7ca20219325e8de680066b`.
- Teaser `meteredpay-teaser-30s.mp4` — 30.02 s, 6,797,130 bytes, sha256
  `4a67fd85a6861e53b0e27091962f036df4aa91d9c6168a86d62f9c2fe7b92078`.
- SRT sidecars regenerated (2:00: 39 cues; teaser: 8 cues), sentence-level,
  timings from the actual narration placements; transcript regenerated.
- Thumbnail v2 `meteredpay-thumbnail-1200x675.png` — 43,331 bytes, sha256
  `67b58876c90ab8f4c427661c1ed127b5e55caf2dd066b5385dd98567c6fb036a`
  (big title + three rows, every word legible at 320 px; old thumbnail
  backed up outside the repo at `/tmp/mp-old-thumbnail.png`).
- Previous render backed up outside the repo: `/tmp/mp-old-2min.mp4`,
  `/tmp/mp-old-teaser.mp4`.

What changed (all panel-driven; see synthesis §6):
- Narration: Helio (`avocado_v2:MAI_03`, `/opt/hatch/bin/tts`, speed 85),
  one clip per sentence, placed across each beat; NEVER sped up to fit.
  New plain-language script (219 words, hook in first 10 s, one journey,
  how-it-works in the close, name + "Failed call? Deducted: zero.").
  Measured wpm (speech only): 76–159 by beat.
- Motion: slow Ken Burns zoom (1.0→1.08, 1.12 on 11 s+ holds) on every
  still. Pixel-diff 2 s apart inside a clip: 7.4% changed (old: 0.008).
- NO burned captions (sidecar .srt only). Headline + one supporting line
  in the top band are titles, not captions.
- Cold open: S1 three-card summary (was the REFUNDED row only).
- Document card de-spoiled (verdict + deduction tx removed).
- NEW verification close-up card (recomputed hash = stated hash
  `2edf3f35…f0124b`, seller pubkey, "Signature: valid").
- NEW tamper highlight card (flipped first hex char `d` vs `0` in red +
  underlined; "They do NOT match — failure claim: invalid_response").
- Terminal frames trimmed: verbatim console lines + one-line tx
  summaries carrying the same hashes/balances; JSON objects dropped
  (values unchanged, layout changed — documented in the rebuild log).
- Guided frames re-shot (video-copy dash only): guided order now
  success → fail → timeout → refusal; no "N of N" progress; Next labels
  correct ("Next: see the failed (timeout) call", "Next: see the refused
  call"); no footer leak (playback-note hidden in the video copy);
  "Name tentative" span removed from video frames only. Live dashboard
  untouched.
- S3 receipts re-shot at 100% zoom, complete (last line no longer cut);
  "Balance before" dropped in the video copy only (balance-after stays).
  Refusal frame re-shot twice: first pass caught the dashboard header
  (shorter receipt cannot scroll it out); fixed by hiding the header/nav
  for that shot only (`hide-chrome` in the video copy) — receipt
  content unchanged.
- Chyron 0:10–1:03 (restored window kept) with text changing as the story
  advances: 0:10–0:30 "Buyer waits 30 s for a receipt"; 0:30–0:58
  "Receipt checked before payment"; 0:58–1:03 "No receipt in 30 s —
  money back". Pill inset 40 px from the image edge (was flush).
  CORRECTION (fresh panel, 6 Nov ~13:17): the pill is ABSENT ~0:27–0:30
  over the success-#1 terminal cut (chyron set to start at 0:30), and
  the third text appears ~3 s early (0:58–1:01, over the fail card);
  the pill also collides with the S1 "Receipt" header / S2-S3 footer
  text at 0:24, 0:38, 0:42, 0:52, 0:55, 1:00, 1:02. One-line re-render
  fix exists (c04a chyron `[(0,3,CH_WAIT),(3,4,CH_CHECK)]`); not done —
  the panel verified hash `6ed84e03…` and a re-render would invalidate
  that verification. Parent's call whether to re-render before posting.
- Close rebuilt: three-card summary → replay block (copy-pasteable:
  repo URL, seller first, buyer command, prerequisites, expected finish
  0.5/0/0.2/0.3/0.2) → end card. S5 audit table OUT. Disclosure moved
  to the end card (extended: rendered frames, deposit-frame
  reconstruction, scenario control). Backstop softened: "Backstop: 600 s
  — buyer can reclaim after expiry."
- L1 second seller NOT in the video (arc is the single-contract proof;
  L1 lives in the README appendix + submission idea).

Verification (this render — see rebuild log for the full gate):
- ffprobe: 120.02 s / 30.02 s, 1920×1080, h264 + aac. Test-frame gate:
  frames at 0:02/0:07/0:12/0:19/0:24/0:29/0:33/0:38/0:42/0:47/0:55/1:00/
  1:02/1:04/1:08/1:12/1:17/1:20/1:26/1:32/1:37/1:44/1:50/1:57 inspected;
  chyron present 0:10–1:03 with the right text at each switch, absent
  before 0:10 and after 1:03 — CORRECTED by the fresh panel: the pill is
  ABSENT ~0:27–0:30 (see the chyron correction above); every amount
  legible with "testnet NEAR"; refusal reason `over_budget` verbatim;
  no "cost zero" wording.
- Audio: `silencedetect` (−50 dB, d=0.5, audio stream mapped) — max
  silence run 2.28 s (cold-open → job boundary, 3.38–5.65 s); all other
  runs ≤2.07 s. 38 runs ≥0.5 s totalling 45.5 s below −50 dB — these are
  natural inter-sentence pauses inside Helio's delivery (0.35–0.67 s
  each) plus placement gaps, NOT dead air: the old cut's defining defect
  was 12.4 s runs; the max run here is 2.28 s and every frame moves.
- SRT: 39 + 8 cues, no empty cues, no overlaps, last cue ends 118.45 s
  (2:00) / 26.96 s (teaser; the t05 clip is 2 s but the measured silent
  tail is ~3.45 s, 26.57–30.03 — not the "deliberate 2 s" first claimed).
- Claims: all tx hashes, response hashes, input SHA-256, seller pubkey,
  and final balances re-checked against `demo-run-console.log`,
  `tamper-run-console.log`, and the dash PLAYBACK data — all PASS.
  Input SHA-256 `36ac8134…` is the seller-output hash from the PLAYBACK
  data (same value the S3 receipt shows), not the raw document-text hash.
- Dashboard verify still OK; `src/lib.rs` diff 0 (frozen contract
  untouched); no new unverified claim; no video uploaded anywhere.

Known minor defects (accepted, recorded — not re-rendered for):
- Chyron hole 0:27–0:30 + third text ~3 s early (0:58–1:01, over the
  fail card); pill collisions at 0:24, 0:38, 0:42, 0:52, 0:55, 1:00,
  1:02 (guided-card "Receipt" header / S2-S3 footer text). One-line
  re-render fix exists for the hole; not done (panel verified hash
  `6ed84e03…`).
- Max silence run 2.28 s, 0.28 s over the ≤2 s rule, at the cold-open →
  job beat boundary (visual cut + new headline carry it; reads as a
  deliberate beat pause).
- Teaser silent tail ~3.45 s measured (26.57–30.03), not 2 s.
- The S3 "Seller service" line wraps awkwardly ("tedi/ous-sea.testnet")
  at 100% zoom — legible, cosmetic only.
- S2 frames clipped (0:24 deposit, 1:12 tamper); tamper S2 breaks the
  explorer link mid-word (pre-existing frames, reused not re-shot).
- Terminal black voids (~25% top, ~20% bottom) remain; 1.12× zoom crops
  the "Call receipt" heading at 1:22.

Fresh independent review panel (6 Nov ~13:17): video 28 → **43/60**;
Impact 3→5, Originality 4→5, Technical 6→8, Design 3–4→6,
Sustainability 4→5, AI-readability 6→7. Verdict: significant improvement
YES, postable with the X caption YES. Single open item: Olly should
listen to ~30 s first (panel could not hear audio). Full AFTER scorecard
in `hidden_files/council-review-video-rebuild-2026-11-06.md` §7. Video is
LOCAL ONLY — never uploaded anywhere. NOT pushed by this worker (parent
owns the push; the old cut is live on GitHub Pages — the parent must
re-upload the new binaries).
