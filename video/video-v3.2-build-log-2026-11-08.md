# MeteredPay demo video — v3.2 frame-only patch build log (8 Nov 2026)

Patch to the v3.1 2-min demo video. NO re-record, NO new narration, NO new
chain activity, NO audio change, NO teaser change. Built from the v3.1
pipeline (`video/work/assemble-v3.py` → `video/work/remux-audio-v31.py`),
via the v3.2 copies/scripts below. Local only — never uploaded anywhere.
NOT pushed by this worker (parent owns the push).

## Output

| File | sha256 | Size | Duration |
| --- | --- | --- | --- |
| `video/meteredpay-demo-2min.mp4` (v3.2) | `f5fa9a0f281e71e72e0775ee2fb633e563a0c75d446b5893835e459da64c4716` | 17,934,455 B (< 25,000,000) | 120.035 s, 1920×1080, h264 + AAC, 30 fps |
| v3.1 (for comparison) | `69fbf19474357e65f120ccafedf0f8b9547c0f6b7d6aaf3040dc7201aba1a756` | 18,312,351 B | 120.035 s |

- `video/meteredpay-demo-2min.srt`: byte-identical to v3.1 (39 cues, same
  timings). `video/meteredpay-demo-2min-transcript.txt`: identical except
  the header line (now "v3.2 frame-only patch 8 Nov 2026").
- `video/meteredpay-teaser-30s.mp4`: UNTOUCHED, sha256
  `a055393eb5bf6ceabdeed46019f9a2e370de0c26b42a2123f3de2b11a71a5c91`
  (verified after the build). It keeps the old end card with the duplicate
  "Replay it yourself" lines — the 2-min end-card fix was deliberately NOT
  carried into the teaser file.
- `git diff src/lib.rs` = 0 lines (frozen contract untouched).

## What landed

### 1. S2-tamper frame (Shot H, 1:24) — the patch's reason to exist
- Chyron now reads "Separate run — tamper buyer" (same pill style as the
  existing chyron; the clip's headline "One letter changed." already
  carries the tamper message, so the old "Receipt tampered" chyron text
  was replaced, not stacked).
- Top balance boxes now WHOLE: the clip's Ken Burns zoom (0.08) was the
  cause — it cropped up to ~40 px off the source image, whose box labels
  sit at source y≈21. Zoom is now 0 for this clip.
- New strip variant `frames/strip-s1-sub8169ec.png`: same S1 balances,
  subline "Tamper run — buyer mp-tamper05.testnet · the balances above
  are that run's own". Wording is deliberate: "the balances above" can
  only attach to the frame's own boxes (Spent 0 / Available 0.5), never
  to the strip's main-run figures (Spent 0.1 / Available 0.4). An earlier
  draft ("these balances are that run's own") was rejected in-session
  because it could be read as claiming the strip figures were the tamper
  run's — false.
- Bottom-edge tidy: the source screenshot `z-s2-tamper.png` is itself cut
  off mid-heading at the bottom ("Make a call (buyer script)", source
  rows 1056–1079). With zoom 0 that half-cut heading showed in the
  frame; the v3.2 variant `frames/z-s2-tamper-v32.png` paints only those
  rows (1055–1079 differ; rows 1045–1054 were already paper) with the
  sampled dashboard paper colour (253,253,247) — the same framing crop
  the v3.1 zoom used to apply. No text, number or claim altered.

### 2. Fail error hash on screen (Shot F, 0:55–1:10) — VERIFIED, landed
- New line on the fail terminal frame:
  `error hash: a0365a3e…7229 (DEMO_SELLER_ERROR)`.
- Verification (the hash appears NOWHERE verbatim in
  `demo-run-console.log` or `seller.log` — grep 0 occurrences, as the
  videographers found): recomputed independently this session with the
  frozen `shared/canonical.mjs` (`errorBody` + `responseHash`) over the
  seller source inputs (`seller-api/server.mjs:266`: call
  `video05-fail-001`, error `DEMO_SELLER_ERROR`, message "Demonstrator
  seller failed this call on purpose (scenario=fail).", seller
  `tedious-sea.testnet`, price 0.1 NEAR = 100000000000000000000000
  yocto). Result `a0365a3ef8a1097c47f89f08aa3695c85236144edfcc8783dc2823bc9fde7229`
  — exact match with the value in `video/video-run-log.md` and
  `VIDEO-SCRIPT.md`. The rendered line is a derived display of that
  verified value, in the same truncated style as the video's other hashes.

### 3. Caption clip at ~1:27–1:30 (Shot I, cue 30) — DROPPED, artefact
- Full-resolution frames at 1:27.5 and 1:28.5 (1920×1080 extracts from
  the v3.1 mp4) show the burned caption "The same way — that's point two
  spent." FULLY legible in the top black band, no clipping. The reported
  clip was a downscale artefact of the videographers' frame view. No
  caption-y change made.

### 4. Riders (landed in the same pass)
- S3 "tedi/ous-sea.testnet" wrap (Shot I): fixed. One-line change in the
  VIDEO dashboard copy only (`video/work/dash/app.js`, S3 render: `<br>`
  before the seller-account span). `dashboard/app.js` (live repo
  dashboard) untouched. Re-shot `z-s3-success1.png` +
  `z-s3-success2.png` only — pixel-diff vs v3.1: exactly 1,050 px
  changed, confined to rows 205–242 (the two seller-service lines), for
  each; re-shoot reproduced identically on a second run. The other S3
  frames were left at their v3.1 bytes (fail/timeout are not used by the
  2-min video; refusal has no seller suffix, so no wrap).
- End-card duplicate "Replay it yourself" lines (1:58): dropped the
  "link's in the replies." line; the contract line stays; disclosure
  footer shifted up 70 px to close the gap.

### NOT done (as instructed)
- S3 receipt footers UNCHANGED: the hosted seller has NOT shipped (no
  Render account), so "no independent seller has run against the
  contract" remains TRUE.
- No pacing / F0 / loudness work; no new takes; no teaser change.

## Scripts (new, in `video/work/`)
- `render-cards-v32.py` — re-renders only term-fail-v2.png (hash line),
  endcard-v3.png (duplicate line dropped) and the tamper-run strip
  variant. Imports the v2/v3 renderers; leaves them untouched.
- `assemble-v3.2.py` — copy of `assemble-v3.py` with only the cH2
  changes (chyron, zoom 0, new strip, v32 S2 frame) + transcript header;
  the teaser section is REMOVED so the teaser cannot be rebuilt by
  accident. All timings, boundaries, cues and audio placements identical.
- `shoot-s3-v32.mjs` — re-shoots ONLY the two success S3 receipts, with
  the exact `shoot9.mjs` procedure (1920×1080, DSF 1.0, renderS3,
  `#s3-detail` scrollIntoView). Documents two rejected attempts:
  `shoot6.mjs` shoots the header/nav and a wider column (wrong framing);
  adding `hide-chrome` and/or scrolling differently pushes "Call receipt"
  off the top and cuts the balance boxes off the bottom. The `z-` prefix
  on S3 frames is a misnomer — they are 1.0x shots (see `shoot9.mjs`).
  Note: an intermediate `shoot6.mjs` run overwrote the (unused)
  `s3-*.png` 1920-viewport variants; they were re-shot shoot9-style by
  this script and are now consistent with the `z-s3-*` files. The
  `video/work/dash/app.js` `<br>` edit and the re-shot frames live in
  untracked work files (same convention as v3.1).

## Test-frame gate (v3.2, this session)
- ffprobe PASS: 120.035 s / 1920×1080 / h264 + AAC / 30 fps.
- Size PASS: 17,934,455 B < 25,000,000 B.
- Frames inspected at full resolution from the finished file (0:40,
  0:55.5, 1:22.5, 1:24, 1:24.6, 1:28.5; plus 0:55.5 / 1:28.5 / 1:58
  verified byte-identical to the same frames from the first v3.2 build,
  which were inspected then): 1:24 shows the "Separate run — tamper
  buyer" pill, whole balance boxes (Deposited 0.5 / Held 0 / Spent 0 /
  Available 0.5 / Budget cap 0.2) and the tamper-run footline; no
  caption/chyron collision at 1:22.5 (caption "The buyer catches it, and
  pays nothing." sits clear of the pill); 0:55–0:57 shows the error-hash
  line legible; 1:28.5 shows the re-broken seller-service line
  ("tedious-sea.testnet)" whole) and the S3 footer intact; 1:58 shows a
  single "Replay it yourself" line; 0:40 hash-match close-up unchanged.
- Audio: decoded PCM of the finished file is BIT-IDENTICAL to v3.1
  (5,762,048 samples, max |diff| 0.0, same length) — the remux rebuilt
  the track from the same takes at the same placements; no Whisper
  re-run was possible (no whisper install in this VM) and none was
  needed: identical PCM + byte-identical SRT preserve the v3.1 gates.
  Container 120.035 s, decoded PCM 120.043 s (single priming block —
  the v3.1 AAC phantom fix holds).
- SRT vs v3.1: byte-identical (`diff` clean). No timing moved.
- `node dashboard/verify.mjs`: not re-run (dashboard untouched by this
  patch; the only dashboard-file change is the video copy's `dash/app.js`
  presentation `<br>`, which the video-copy build does not verify).
- `git diff src/lib.rs` = 0 lines.

## Residuals (unchanged from v3.1, not in scope)
Headline == burned caption for ~1.5 s on Shots B, D, I; terminal black
voids; per-take wpm 122–128 on the three long takes; F0 drift (measured
only, never heard); teaser end-card hold 2.82 s silent; teaser keeps the
old end card (duplicate Replay lines) by design. The orphaned first-draft
strip `frames/strip-s1-subc0e2c2.png` (old subline wording) was superseded
by `strip-s1-sub8169ec.png` and is unused.
