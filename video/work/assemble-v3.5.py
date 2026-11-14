"""Assemble the MeteredPay demo video v3.5 (~1:28) + 30 s teaser.
Build 13 Nov 2026 — rebuild around the APPROVED v4 narration audio
(Paloma, speed 100, standing rule: NEVER slow down TTS). Same recorded
run (mp-video05.testnet + tamper mp-tamper05.testnet), no new run, same
frames/shots/strips/chyrons as v3.2/v3.3/v3.4. The v4 audio is used
SAMPLE-IDENTICAL: one finished mp3 (87.34 s), never re-rendered, never
time-stretched, never resampled for duration. The video is cut to the
audio, never the audio to the video.

AUDIO PLACEMENT (the one structural change vs v3.4):
- v3.4 placed 5 separate take mp3s per clip (adelay + per-clip AAC).
- v3.5 has ONE finished audio file, placed whole from t=0. All clips
  are therefore built VIDEO-ONLY and concatenated; the audio is then
  muxed in a SINGLE AAC encode — the v4 mp3 for the 2:00 (with 0.50 s
  of trailing silence, apad), and a single sample-accurate re-cut
  (atrim slices + concat filter) for the teaser. The teaser is NOT
  assembled from per-clip audio slices: `concat -c copy` of AAC
  segments drifts the audio (measured: +27 ms after tA growing to
  +113 ms after tJ, lag-0 corr -0.10) — the per-clip audio path is
  dropped for both files.
- Take starts in the finished audio (sentence-timings.json, the assembly
  positions from assemble-v4.py — authoritative; the +0.2-0.6 s later
  first-word times in the task brief are Whisper tiny's drift on the
  finished MP3, v4 log section 5.4, not the mix): A 0.00, B 14.51,
  CDE 19.42, FGH 41.17, I 61.28, J 66.79, KLM 72.68. Last word ends
  86.84; file 87.34 s. 38 cues (39 minus the cut "Balance untouched.").
- Shot boundaries are midpoints of the inter-shot sentence gaps; the 7
  pieces replace the old 5 takes, so every boundary after A moves.
  Multi-clip shots split by the v3.3 fractions of the shot duration.
  Clips tile 0.00-87.83 (audio 87.34 + 0.49 trailing silence over the
  end card). NO padding to 120 s, NO dead-air fill.

FRAME SNAPPING (measured defect, fixed here): every shot boundary is
snapped to a frame multiple (round(t*30)/30). Without it, per-clip
`-t` rounding drifts the burned captions late vs the audio — measured
+0.29 s accumulated by the end card on the first v3.5 build, which
would overrun the 0.2 s caption rule for the close. With snapping,
every clip has an exact integer frame count, the concat is exact, and
caption-vs-audio error is <= 1 frame (0.033 s). Cuts move <= 0.017 s,
all inside inter-sentence gaps >= 0.18 s.

"Checked." is 0.44 s in take I (62.50-62.94) — no caption extension
needed, unlike v3.4's 0.12 s comma-joined version.

Same v3.2 frame fixes as v3.4 (S2-tamper chyron/zoom 0, term-fail-v2,
z-s3-success2, endcard-v3 single line). Bitrate capped at build time:
crf 23 + maxrate 2500k, so both mp4s land safely UNDER 25,000,000 bytes.
"""
import json
import math
import os
import subprocess
from PIL import ImageFont

WORK = '/home/hatch/workspace/near-meteredpay/repo/video/work'
FR = WORK + '/frames'
V4 = WORK + '/narr4-audio/meteredpay-narration-v4.mp3'
OUT = '/home/hatch/workspace/near-meteredpay/repo/video'
os.makedirs(WORK + '/segs35', exist_ok=True)
os.makedirs(WORK + '/txt35', exist_ok=True)

BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

TOP_BAND = 88
IMG_H = 896
MAX_BYTES = 25_000_000


def snap(t):
    """Nearest frame boundary (30 fps)."""
    return round(t * 30) / 30


# Nominal shot boundaries -> frame-snapped. End: nearest frame (2635 f
# = 87.8333 s); the audio is trimmed to it, losing 0.007 s of trailing
# silence (audio stream 87.833 s, still 87.34 + 0.49 trailing).
VIDEO_END = snap(87.84)          # 87.8333 s
TEASER_END = snap(30.02)         # 30.0333 s (901 frames)

TIMINGS = json.load(open(f'{WORK}/narr4-audio/sentence-timings.json'))
TAKES = TIMINGS['takes']  # fname -> {shots, start} (global take starts)
# Global cue list: (start, end, text) in video time.
CUES = []
for fname, info in TAKES.items():
    for s in TIMINGS['sentences'][fname]:
        CUES.append((round(info['start'] + s['start'], 2),
                     round(info['start'] + s['end'], 2), s['text']))
CUES.sort()
# v3.5: 38 cues (39 minus the cut "Balance untouched."). Last cue ends
# 86.84: the final word ends 0.50 s before the audio file ends (87.34)
# and 0.99 s before the video ends (87.83).
assert len(CUES) == 38, len(CUES)
assert CUES[-1][1] == 86.84, CUES[-1]
assert CUES[0][0] == 0.0, CUES[0]


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print('FAILED:', ' '.join(cmd)); print(r.stdout[-2000:]); print(r.stderr[-2000:])
        raise SystemExit(1)
    return r


def dur_of(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries',
                      'format=duration', '-of', 'csv=p=0', path]).stdout.strip())


def txtfile(name, text):
    p = f'{WORK}/txt35/{name}.txt'
    with open(p, 'w', encoding='utf-8') as f:
        f.write(text)
    return p


def _text_w(text, font, size):
    return ImageFont.truetype(font, size).getlength(text)


def build_clip(name, image, start, dur, headline=None, chyron_segs=(),
               strip=None, zoom=0.08, letterbox=True):
    """VIDEO-ONLY clip. chyron_segs: [(t0, t1, text)] clip-relative,
    top-right pill. strip: path to a 1920x96 strip PNG (overlaid at
    y=984). Burned captions come from the global CUES list, clipped to
    this clip's [start, start+dur) window. Audio is muxed once at the
    end (2:00: the v4 mp3 whole; teaser: a single re-cut build) — never
    per clip, never via concat -c copy (see module docstring).
    start/dur MUST be exact frame multiples (use snap()); the caller
    guarantees it, and the resume check below verifies it."""
    assert abs(start * 30 - round(start * 30)) < 1e-6, (name, start)
    assert abs(dur * 30 - round(dur * 30)) < 1e-6, (name, dur)
    out = f'{WORK}/segs35/{name}.mp4'
    # Resume-safe: a previous run may have been killed mid-build (runtime
    # restart). A finished clip is deterministic from fixed inputs, so
    # skip it when the existing file's duration already matches.
    if os.path.exists(out):
        try:
            if abs(dur_of(out) - dur) < 0.01:
                return out
        except SystemExit:
            pass
    frames = int(round(dur * 30))
    # --- chyron pill geometry (dynamic width, right-aligned, 40px margin)
    pill_filters = []
    for i, (t0, t1, text) in enumerate(chyron_segs):
        w = int(_text_w(text, BOLD, 18)) + 24
        bx = 1880 - w
        if headline:
            hw = _text_w(headline, BOLD, 36)
            assert 960 + hw / 2 < bx - 20, \
                f'{name}: headline collides with chyron pill ({headline!r})'
        en = f"enable='between(t,{t0},{t1})'"
        tp = txtfile(f'{name}-chy{i}', text)
        pill_filters.append(
            f"drawbox=x={bx}:y=8:w={w}:h=44:color=0xB45309@0.92:t=fill:{en}")
        pill_filters.append(
            f"drawtext=textfile='{tp}':fontfile={BOLD}:fontsize=18:fontcolor=white:"
            f"x={bx + 12}:y=20:{en}")
    # --- burned captions (global cues clipped to this clip)
    # Font size shrinks (26 -> 22 -> 20) when a caption would otherwise
    # reach within 20 px of an active chyron pill's left edge (v3 fix 1:
    # the J1 caption at fs26 overlapped the CH_REF pill by ~48 px).
    cap_filters = []
    for j, (s, e, text) in enumerate(CUES):
        cs, ce = max(s, start), min(e, start + dur)
        if ce - cs < 0.05:
            continue
        cs_r, ce_r = cs - start, ce - start
        min_bx = 1920
        for (t0, t1, ptext) in chyron_segs:
            if t0 < ce_r and t1 > cs_r:
                min_bx = min(min_bx, 1880 - (int(_text_w(ptext, BOLD, 18)) + 24))
        fs = 26
        for cand in (26, 22, 20):
            if 960 + _text_w(text, SANS, cand) / 2 <= min_bx - 20:
                fs = cand
                break
        else:
            fs = 20
        cp = txtfile(f'{name}-cap{j}', text)
        cap_filters.append(
            f"drawtext=textfile='{cp}':fontfile={SANS}:fontsize={fs}:fontcolor=white:"
            f"x=(w-text_w)/2:y=52:box=1:boxcolor=black@0.60:boxborderw=8:"
            f"enable='between(t,{cs_r:.2f},{ce_r:.2f})'")
    # --- video filter chain
    vf = []
    if letterbox:
        vf.append(
            f"zoompan=z='min(1+{zoom}*on/{frames},1+{zoom})':x='iw/2-(iw/zoom/2)':"
            f"y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30")
        vf.append(f'scale=-2:{IMG_H},pad=1920:1080:(ow-iw)/2:{TOP_BAND}:black')
    else:
        vf.append(
            f"zoompan=z='min(1+{zoom}*on/{frames},1+{zoom})':x='iw/2-(iw/zoom/2)':"
            f"y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30")
    if headline:
        hp = txtfile(name + '-h', headline)
        vf.append(
            f"drawtext=textfile='{hp}':fontfile={BOLD}:fontsize=36:fontcolor=white:"
            f"x=(w-text_w)/2:y=8:box=1:boxcolor=black@0.60:boxborderw=10")
    vf += pill_filters
    vf += cap_filters
    # Build the filtergraph: [0:v] -> base -> [v0]; optional strip overlay.
    chain = '[0:v]' + ','.join(vf) + '[v0]'
    if strip:
        chain += f';[v0][1:v]overlay=0:984[vout]'
        out_label = '[vout]'
    else:
        chain += ';[v0]copy[vout]'
        out_label = '[vout]'
    vout = f'{WORK}/segs35/{name}-v.mp4'
    cmd = ['ffmpeg', '-y', '-v', 'error', '-framerate', '30', '-loop', '1',
           '-t', str(dur), '-i', image]
    if strip:
        cmd += ['-loop', '1', '-t', str(dur), '-i', strip]
    cmd += ['-filter_complex', chain, '-map', out_label,
            '-r', '30', '-frames:v', str(frames), '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23', '-maxrate', '2500k', '-bufsize', '5000k',
            '-pix_fmt', 'yuv420p', '-an', vout]
    run(cmd)
    run(['ffmpeg', '-y', '-v', 'error', '-i', vout, '-c', 'copy', out])
    return out


# Chyron texts (storyboard).
CH_DEP = 'Deposit 0.5 testnet NEAR · cap 0.2'
CH_DOC = 'The document being checked'
CH_CHECK = 'Receipt checked before payment'
CH_DED = 'Deducted 0.1 testnet NEAR'
CH_FAIL = 'Buyer files a failure claim — held 0.1 released'
CH_BACK = 'No receipt in 30 s — money back'
CH_TAMPER = 'Receipt tampered — buyer catches it'
CH_TAMPER_RUN = 'Separate run — tamper buyer'
CH_S2 = 'Second good check — cap reached'
CH_REF = 'Over budget — refused before any money moves'
CHIP = 'Coming up — the full run, in order'

# Strip PNGs (render-cards-v3.py).
S0 = f'{FR}/strip-s0.png'
S0_SUB = f'{FR}/strip-s0-sub862e80.png'
S1 = f'{FR}/strip-s1.png'
S1_HL = f'{FR}/strip-s1-sp-av.png'
S1_HL_DED1 = f'{FR}/strip-s1-sp-av-subb42b6a.png'
S1_FAIL = f'{FR}/strip-s1-subd4f8ea.png'
S1_TAMPER = f'{FR}/strip-s1-sub9587d5.png'
# v3.2: rendered by render-cards-v32.py (same S1 balances + tamper-run footline).
S1_TAMPER_RUN = f'{FR}/strip-s1-sub8169ec.png'
S2 = f'{FR}/strip-s2.png'
S2_HL = f'{FR}/strip-s2-sp-av.png'
S2_HL_DED2 = f'{FR}/strip-s2-sp-av-sub915b05.png'
S2_BACKSTOP = f'{FR}/strip-s2-sube4ed41.png'
S2_REF = f'{FR}/strip-s2-subb18f41.png'

# Shot boundaries, frame-snapped (nominal midpoints in comments).
# Take starts (finished audio): A 0.00, B 14.51, CDE 19.42, FGH 41.17,
# I 61.28, J 66.79, KLM 72.68. Last word ends 86.84; audio file 87.34.
B_AB = snap(14.30)   # A5 ends 14.08, B1 starts 14.51
B_BC = snap(19.30)   # B3 ends 19.17, C1 starts 19.42
B_CD = snap(24.25)   # C2 ends 23.96, D1 starts 24.54
B_DE = snap(31.74)   # D3 ends 31.46, E1 starts 32.02
B_EF = snap(40.99)   # E4 ends 40.80, F1 starts 41.17
B_FG = snap(50.38)   # F5 ends 50.07, G1 starts 50.69
B_GH = snap(56.44)   # G3 ends 56.35, H1 starts 56.53
B_HI = snap(61.07)   # H2 ends 60.85, I1 starts 61.28
B_IJ = snap(66.60)   # I4 ends 66.40, J1 starts 66.79
B_JK = snap(72.56)   # J2 ends 72.43, K1 starts 72.68
B_KL = snap(78.84)   # K2 ends 78.64, L1 starts 79.04
B_LM = snap(83.34)   # L2 ends 83.06, M starts 83.62
# Multi-clip splits (v3.3 fractions), snapped.
S_C = snap(21.80)
S_E1 = snap(34.52)
S_E2 = snap(36.61)
S_E3 = snap(39.39)
S_F = snap(45.03)
S_H = snap(58.17)
S_I = snap(63.64)
S_J1 = snap(68.69)
S_J2 = snap(70.99)

# ---------------- 2:00 -> ~1:28 (v3.5 boundaries, v4 audio timings) ----------------
clips2 = []
# A 0-14.30 title card (no headline overlay, no chyron, no strip)
clips2.append(build_clip('cA', f'{FR}/titlecard-v3.png', 0.0, B_AB,
                         zoom=0.04, letterbox=False))
# B 14.30-19.30 fail-release-only + chip (B take starts 14.51)
clips2.append(build_clip('cB', f'{FR}/fail-release-only.png', B_AB, B_BC - B_AB,
                         headline='Watch this first.',
                         chyron_segs=[(0, B_BC - B_AB, CHIP)], zoom=0.08))
# C 19.30-24.27 terminal + S2 (CDE take starts 19.42)
clips2.append(build_clip('cC1', f'{FR}/term-deposit-v2.png', B_BC, S_C - B_BC,
                         headline='Deposit 0.5. Cap 0.2.',
                         chyron_segs=[(0, S_C - B_BC, CH_DEP)],
                         strip=S0_SUB, zoom=0.08))
clips2.append(build_clip('cC2', f'{FR}/z-s2-deposit.png', S_C, B_CD - S_C,
                         headline='Deposit 0.5. Cap 0.2.',
                         chyron_segs=[(0, B_CD - S_C, CH_DEP)],
                         strip=S0, zoom=0.08))
# D 24.27-31.73 document card
clips2.append(build_clip('cD', f'{FR}/doc-success1-v2.png', B_CD, B_DE - B_CD,
                         headline='One document to check.',
                         chyron_segs=[(0, B_DE - B_CD, CH_DOC)],
                         strip=S0, zoom=0.12))
# E 31.73-41.00 verify + terminal + S3 + guided
clips2.append(build_clip('cE1', f'{FR}/verify-closeup.png', B_DE, S_E1 - B_DE,
                         headline='Check the receipt first.',
                         chyron_segs=[(0, S_E1 - B_DE, CH_CHECK)],
                         strip=S0, zoom=0.08))
clips2.append(build_clip('cE2', f'{FR}/term-verify1-v2.png', S_E1, S_E2 - S_E1,
                         headline='Check the receipt first.',
                         chyron_segs=[(0, S_E2 - S_E1, CH_DED)],
                         strip=S1_HL, zoom=0.08))
clips2.append(build_clip('cE3', f'{FR}/z-s3-success1.png', S_E2, S_E3 - S_E2,
                         headline='Check the receipt first.',
                         chyron_segs=[(0, S_E3 - S_E2, CH_DED)],
                         strip=S1_HL_DED1, zoom=0.08))
clips2.append(build_clip('cE4', f'{FR}/z-guided-success1.png', S_E3, B_EF - S_E3,
                         headline='Check the receipt first.',
                         chyron_segs=[(0, B_EF - S_E3, CH_DED)],
                         strip=S1, zoom=0.08))
# F 41.00-50.37 terminal + guided (FGH take starts 41.17)
clips2.append(build_clip('cF1', f'{FR}/term-fail-v2.png', B_EF, S_F - B_EF,
                         headline='Failed call. Money back.',
                         chyron_segs=[(0, S_F - B_EF, CH_FAIL)],
                         strip=S1_FAIL, zoom=0.08))
clips2.append(build_clip('cF2', f'{FR}/z-guided-fail.png', S_F, B_FG - S_F,
                         headline='Failed call. Money back.',
                         chyron_segs=[(0, B_FG - S_F, CH_FAIL)],
                         strip=S1, zoom=0.12))
# G 50.37-56.43 timeout card
clips2.append(build_clip('cG', f'{FR}/z-guided-timeout.png', B_FG, B_GH - B_FG,
                         headline='No answer in 30 seconds.',
                         chyron_segs=[(0, B_GH - B_FG, CH_BACK)],
                         strip=S1, zoom=0.08))
# H 56.43-61.07 highlight + S2-tamper
clips2.append(build_clip('cH1', f'{FR}/tamper-highlight.png', B_GH, S_H - B_GH,
                         headline='One letter changed.',
                         chyron_segs=[(0, S_H - B_GH, CH_TAMPER)],
                         strip=S1_TAMPER, zoom=0.08))
clips2.append(build_clip('cH2', f'{FR}/z-s2-tamper-v32.png', S_H, B_HI - S_H,
                         headline='One letter changed.',
                         chyron_segs=[(0, B_HI - S_H, CH_TAMPER_RUN)],
                         strip=S1_TAMPER_RUN, zoom=0.0))
# I 61.07-66.60 terminal + S3 (I take starts 61.28)
clips2.append(build_clip('cI1', f'{FR}/term-verify2-v2.png', B_HI, S_I - B_HI,
                         headline='Second good check.',
                         chyron_segs=[(0, S_I - B_HI, CH_S2)],
                         strip=S2_HL, zoom=0.08))
clips2.append(build_clip('cI2', f'{FR}/z-s3-success2.png', S_I, B_IJ - S_I,
                         headline='Second good check.',
                         chyron_segs=[(0, B_IJ - S_I, CH_S2)],
                         strip=S2_HL_DED2, zoom=0.08))
# J 66.60-72.57 terminal + S3-refusal + guided (J take starts 66.79)
clips2.append(build_clip('cJ1', f'{FR}/term-refusal-v2.png', B_IJ, S_J1 - B_IJ,
                         headline='Over budget — refused.',
                         chyron_segs=[(0, S_J1 - B_IJ, CH_REF)],
                         strip=S2, zoom=0.08))
clips2.append(build_clip('cJ2', f'{FR}/z-s3-refusal.png', S_J1, S_J2 - S_J1,
                         headline='Over budget — refused.',
                         chyron_segs=[(0, S_J2 - S_J1, CH_REF)],
                         strip=S2_REF, zoom=0.08))
clips2.append(build_clip('cJ3', f'{FR}/z-guided-refusal.png', S_J2, B_JK - S_J2,
                         headline='Over budget — refused.',
                         chyron_segs=[(0, B_JK - S_J2, CH_REF)],
                         strip=S2_BACKSTOP, zoom=0.08))
# K 72.57-78.83 final strip card (static by design, zoom 0)
clips2.append(build_clip('cK', f'{FR}/final-strip-card.png', B_JK, B_KL - B_JK,
                         headline='One honest limit.',
                         strip=S2, zoom=0.0))
# L 78.83-83.33 S3 final receipt + strip (no headline, no chyron)
clips2.append(build_clip('cL', f'{FR}/z-s3-success2.png', B_KL, B_LM - B_KL,
                         strip=S2, zoom=0.12))
# M 83.33-87.83 end card (full frame)
clips2.append(build_clip('cM', f'{FR}/endcard-v3.png', B_LM, VIDEO_END - B_LM,
                         zoom=0.02, letterbox=False))


def srt_time(s):
    ms = int(round(s * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    sec, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{sec:02d},{ms:03d}'


def write_srt(cues, path):
    cues = sorted(cues)
    with open(path, 'w', encoding='utf-8') as f:
        for i, (s, e, tx) in enumerate(cues, 1):
            f.write(f'{i}\n{srt_time(s)} --> {srt_time(e)}\n{tx}\n\n')
    return len(cues)


def concat(clips, out_path):
    lst = f'{WORK}/segs35/list-{os.path.basename(out_path)}.txt'
    with open(lst, 'w') as f:
        for c in clips:
            f.write(f"file '{c}'\n")
    run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0',
         '-i', lst, '-c', 'copy', out_path])
    d = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                   '-of', 'csv=p=0', out_path]).stdout.strip())
    size = os.path.getsize(out_path)
    print(out_path, f'{d:.2f}s', size, 'bytes')
    assert size < MAX_BYTES, f'{out_path} is {size} bytes, over the 25 MB cap'
    return d


# 2:00: concat video-only, then mux the v4 mp3 in ONE encode (+0.49 s pad
# to the snapped VIDEO_END; the audio is trimmed to VIDEO_END, losing
# 0.007 s of trailing silence).
d2v = concat(clips2, f'{WORK}/segs35/meteredpay-demo-2min-videoonly.mp4')
assert abs(d2v - VIDEO_END) < 0.05, (d2v, VIDEO_END)
run(['ffmpeg', '-y', '-v', 'error', '-i',
     f'{WORK}/segs35/meteredpay-demo-2min-videoonly.mp4', '-i', V4,
     '-filter_complex', f'[1:a]apad,atrim=0:{VIDEO_END}[a]',
     '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac',
     '-b:a', '128k', '-ar', '48000', '-ac', '2', '-t', str(VIDEO_END),
     f'{OUT}/meteredpay-demo-2min.mp4'])
d2 = dur_of(f'{OUT}/meteredpay-demo-2min.mp4')
print(f'{OUT}/meteredpay-demo-2min.mp4', f'{d2:.2f}s',
      os.path.getsize(f'{OUT}/meteredpay-demo-2min.mp4'), 'bytes')
assert 87.3 <= d2 <= 88.4, d2
assert os.path.getsize(f'{OUT}/meteredpay-demo-2min.mp4') < MAX_BYTES
n_cues = write_srt(CUES, f'{OUT}/meteredpay-demo-2min.srt')
print(f'SRT: {n_cues} cues')
with open(f'{OUT}/meteredpay-demo-2min-transcript.txt', 'w', encoding='utf-8') as f:
    f.write('MeteredPay demo video — narration transcript (Lilting Swing / Paloma voice, speed 100, 13 Nov 2026, v3.5 rebuild around approved v4 audio; frames from v3.2).\n')
    f.write('254 words: 43-word intro WITH "on testnet" (script §2 assembly edit); IJKLM split I + J + KLM; J minus "Balance untouched." (contingency cut #1).\n')
    f.write('Recorded run: buyer mp-video05.testnet, 5 Nov 2026; tamper beat: buyer mp-tamper05.testnet.\n')
    f.write('Narration: synthetic voiceover. TTS input spells the brand "Metered Pay" (spaced) for pronunciation;\n')
    f.write('captions and on-screen text use "MeteredPay".\n\n')
    for _, _, tx in sorted(CUES):
        f.write(tx + ' ')
    f.write('\n')

# ---------------- 30 s teaser (re-cut from the v4 audio) ----------------
# Teaser cue list (video time within the teaser), re-timed from the v4
# sentence timings. tA: A1+A2 (A2 ends 6.08; the slice ends there, so
# A3's "Say..." is out). tB: B1-B3 (global 14.51-19.17). tE: CDE E3+E4
# (global 35.40-40.80). tJ: J1+J2 (global 66.79-72.43).
# Clip lengths rebalanced vs v3.4 (B was 2.34 s of dead air after B3 at
# the old 7.0 s length): tB 6.00 s, end card 3.82 s. All boundaries are
# exact frame multiples (6.20/6.00/7.10/6.90 s), end snapped to 30.03 s.
TCUES = [
    (0.00, 2.90, 'This is MeteredPay, on testnet.'),
    (3.30, 6.08, 'Agents pay for every call — even the ones that fail.'),
    (6.20, 7.16, 'Watch this first.'),
    (7.28, 9.86, 'A call fails — and the held money comes straight back.'),
    (9.90, 10.86, 'Deducted: zero.'),
    (12.20, 15.12, 'The buyer checks the receipt — same fingerprint, real signature.'),
    (15.76, 17.60, 'Only then does the contract take point one.'),
    (19.30, 22.66, 'One more call — and the contract says no before any money moves.'),
    (22.66, 24.94, 'Over budget, refused, on the record.'),
]
# Teaser clips use the same build_clip, but its burned captions come from
# the global CUES list (2:00 timings) — so build teaser clips with a
# dedicated path: temporarily swap the global CUES.
_real_cues = CUES
CUES = TCUES
clips30 = []
clips30.append(build_clip('tA', f'{FR}/titlecard-v3.png', 0.0, 6.20,
                          zoom=0.04, letterbox=False))
clips30.append(build_clip('tB', f'{FR}/fail-release-only.png', 6.20, 6.00,
                          headline='Watch this first.',
                          chyron_segs=[(0, 6.00, CHIP)],
                          zoom=0.08))
clips30.append(build_clip('tE', f'{FR}/verify-closeup.png', 12.20, 7.10,
                          headline='Check the receipt first.',
                          chyron_segs=[(0, 7.10, CH_CHECK)],
                          strip=S1_HL, zoom=0.08))
clips30.append(build_clip('tJ', f'{FR}/term-refusal-v2.png', 19.30, 6.90,
                          headline='Over budget — refused.',
                          chyron_segs=[(0, 6.90, CH_REF)],
                          strip=S2_REF, zoom=0.08))
clips30.append(build_clip('tM', f'{FR}/endcard-v3.png', 26.20, TEASER_END - 26.20,
                          zoom=0.02, letterbox=False))
CUES = _real_cues
d30v = concat(clips30, f'{WORK}/segs35/meteredpay-teaser-30s-videoonly.mp4')
assert abs(d30v - TEASER_END) < 0.05, (d30v, TEASER_END)
# Teaser audio: ONE sample-accurate build from the v4 mp3 (atrim slices,
# each padded to its clip length, concat filter) — never per-clip slices
# through concat -c copy (that drifts the audio, see module docstring).
run(['ffmpeg', '-y', '-v', 'error', '-i', V4, '-filter_complex',
     '[0:a]atrim=0:6.08,asetpts=PTS-STARTPTS,apad,atrim=0:6.20[a0];'
     '[0:a]atrim=14.51:19.17,asetpts=PTS-STARTPTS,apad,atrim=0:6.00[a1];'
     '[0:a]atrim=35.40:40.80,asetpts=PTS-STARTPTS,apad,atrim=0:7.10[a2];'
     '[0:a]atrim=66.79:72.43,asetpts=PTS-STARTPTS,apad,atrim=0:6.90[a3];'
     'anullsrc=r=48000:cl=stereo:d=3.82[as];'
     '[a0][a1][a2][a3][as]concat=n=5:v=0:a=1,apad,atrim=0:'
     f'{TEASER_END}[ta]',
     '-map', '[ta]', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000',
     '-ac', '2', f'{WORK}/segs35/teaser-audio.m4a'])
run(['ffmpeg', '-y', '-v', 'error', '-i',
     f'{WORK}/segs35/meteredpay-teaser-30s-videoonly.mp4', '-i',
     f'{WORK}/segs35/teaser-audio.m4a',
     '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy',
     '-t', str(TEASER_END), f'{OUT}/meteredpay-teaser-30s.mp4'])
d30 = dur_of(f'{OUT}/meteredpay-teaser-30s.mp4')
print(f'{OUT}/meteredpay-teaser-30s.mp4', f'{d30:.2f}s',
      os.path.getsize(f'{OUT}/meteredpay-teaser-30s.mp4'), 'bytes')
assert 29.5 <= d30 <= 30.5, d30
assert os.path.getsize(f'{OUT}/meteredpay-teaser-30s.mp4') < MAX_BYTES
write_srt(TCUES, f'{OUT}/meteredpay-teaser-30s.srt')

print('ASSEMBLY DONE (2-min + teaser)')
