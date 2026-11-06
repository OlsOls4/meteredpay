"""Assemble the MeteredPay demo video v3 (2:00) + 30 s teaser.
Build 6 Nov 2026 — TTS voiceover (Pleased Skylight, speed 92), same
recorded run (mp-video05.testnet + tamper mp-tamper05.testnet), no new run.

v3.1 (same day, after the fresh re-score): take4 re-rendered with "Checked."
as its own sentence (period forces the -ed the TTS elided); takes loudnorm'd
to I=-25 LUFS (narr3-ln/); audio track rebuilt in one AAC encode by
remux-audio-v31.py (see that file for why a plain remux cannot fix the
phantom). 39 cues; last cue ends 118.50.

Adapted from assemble-v2.py (Helio sentence-clips). What changed:
- Narration: 5 LONG CONTINUOUS takes in video/work/narr3/ (one `tts
  speak` call each, never sentence-by-sentence, never synthesize-script),
  placed whole by MEASURED Whisper word timings (sentence-timings.json).
  Takes: A (fallback intro, 38 words) | B | CDE | FGH | IJKLM.
  Placement starts: A 0.00, B 15.66, CDE 23.30, FGH 53.00, IJKLM 84.70.
  Visual boundaries flexed to the measured speech (A/B 15.66, E/F 53.00,
  F/G 68.78, G/H 77.90, H/I 84.70, L/M 115.52); total stays 120.02 s.
  Fixes in the v3.1 pass (6 Nov): caption fontsize shrinks (26->22->20)
  when a cue would reach within 20 px of a chyron pill (J1/CH_REF
  overlapped by ~48 px at fs26); FGH start 53.90->53.00 so the E/F
  inter-take silence is 0.54 s not 1.89 s; H/I boundary 85.00->84.70 so
  the first 0.30 s of I1 is not clipped; teaser tJ truncated at the end
  of J1 (audio_end) and shortened to 5.0 s so its mid-video silence is
  1.02 s, end card 2.82 s.
- Burned captions: one cue per spoken sentence, timed to the measured
  word timings (top band, y=52), AND sidecar .srt from the same timings.
  No static supporting caption lines (the burned captions carry them).
- Persistent balance strip: PIL strip PNGs (render-cards-v3.py) overlaid
  in the bottom band (y=984-1080) from Shot C to the close; changed
  values highlighted Amber; explorer URL pill / footline rides as the
  strip's second line where needed.
- Chyron: top-right pill in the top band (y=8), dynamically sized, so it
  never collides with dashboard text (v2 defect). Window 15.66-103,
  continuous, no holes; "No receipt in 30 s — money back" only over the
  timeout card (G). Shot B carries the "Coming up" chip in the same slot.
- New frames: titlecard-v3, endcard-v3 (synthetic-voiceover disclosure),
  fail-release-only (Shot B, no balances), final-strip-card (Shot K).
  Doc card reused from v2 (Characters: 89 — verified correct; the "92"
  in earlier drafts is the freeze1011 run's count).
- Explorer: testnet.nearblocks.io is bot-blocked in this VM (HTTP 403,
  Cloudflare Turnstile, 6 Nov 15:02 UTC) — Shot J's middle clip is the
  S3 refusal receipt + explorer URL pill, as in v2. No fake explorer frame.
- Bitrate capped at build time: crf 23 + maxrate 2500k, so the finished
  2-min mp4 lands safely UNDER 25,000,000 bytes (v2's 28,064,425 B was
  rejected by GitHub's web uploader). The script asserts the size.
"""
import json
import os
import subprocess
from PIL import ImageFont

WORK = '/home/hatch/workspace/near-meteredpay/repo/video/work'
FR = WORK + '/frames'
# v3.1: NARR points at the loudnorm'd takes (narr3-ln), one two-pass
# loudnorm to I=-25 LUFS per take (linear gain only, no time-stretch);
# narr3/ keeps the takes as rendered. Sentence timings are identical
# in both dirs (loudnorm is gain-only).
NARR = WORK + '/narr3-ln'
OUT = '/home/hatch/workspace/near-meteredpay/repo/video'
os.makedirs(WORK + '/segs3', exist_ok=True)
os.makedirs(WORK + '/txt3', exist_ok=True)

BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

TOP_BAND = 88
IMG_H = 896
MAX_BYTES = 25_000_000

TIMINGS = json.load(open(f'{NARR}/sentence-timings.json'))
TAKES = TIMINGS['takes']  # fname -> {shots, start}
# Global cue list: (start, end, text) in video time.
CUES = []
for fname, info in TAKES.items():
    for s in TIMINGS['sentences'][fname]:
        CUES.append((round(info['start'] + s['start'], 2),
                     round(info['start'] + s['end'], 2), s['text']))
CUES.sort()
# v3.1: 39 cues (was 38) — "Checked the same way" is now two cues,
# "Checked." + "The same way — that's point two spent." (v3.1 Defect 1:
# the period forces the TTS to render the -ed). Last cue ends 118.50:
# the final word ends 1.52 s before the 120.02 video end (acoustic
# trailing silence 1.42 s over the end card, inside the <=1.5 s rule).
assert len(CUES) == 39, len(CUES)
assert CUES[-1][1] == 118.50, CUES[-1]


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
    p = f'{WORK}/txt3/{name}.txt'
    with open(p, 'w', encoding='utf-8') as f:
        f.write(text)
    return p


def _text_w(text, font, size):
    return ImageFont.truetype(font, size).getlength(text)


def build_clip(name, image, start, dur, headline=None, chyron_segs=(),
               strip=None, audio_take=None, zoom=0.08, letterbox=True,
               take_start=None, audio_end=None):
    """chyron_segs: [(t0, t1, text)] clip-relative, top-right pill.
    strip: path to a 1920x96 strip PNG (overlaid at y=984).
    audio_take: narration mp3 filename in narr3/; placement is derived
    from the take's measured start (audio_ss/offset computed here).
    take_start overrides the take's 2:00 placement (used by the teaser).
    audio_end (take-relative seconds) truncates the take audio so a
    clip never plays the start of the next sentence (teaser tJ fix).
    Burned captions are taken from the global CUES list, clipped to this
    clip's [start, start+dur) window."""
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
    vout = f'{WORK}/segs3/{name}-v.mp4'
    cmd = ['ffmpeg', '-y', '-v', 'error', '-framerate', '30', '-loop', '1',
           '-t', str(dur), '-i', image]
    if strip:
        cmd += ['-loop', '1', '-t', str(dur), '-i', strip]
    cmd += ['-filter_complex', chain, '-map', out_label,
            '-r', '30', '-c:v', 'libx264', '-preset', 'medium',
            '-crf', '23', '-maxrate', '2500k', '-bufsize', '5000k',
            '-pix_fmt', 'yuv420p', '-an', vout]
    run(cmd)
    # --- audio: take placed by measured start
    aout = f'{WORK}/segs3/{name}-a.m4a'
    if audio_take:
        take_start = TAKES[audio_take]['start'] if take_start is None else take_start
        audio_ss = max(0.0, start - take_start)
        offset = max(0.0, take_start - start)
        cmd = ['ffmpeg', '-y', '-v', 'error']
        if audio_ss:
            cmd += ['-ss', str(round(audio_ss, 2))]
        if audio_end is not None:
            cmd += ['-t', str(round(audio_end - audio_ss, 2))]
        cmd += ['-i', f'{NARR}/{audio_take}', '-af',
                f'adelay={int(round(offset * 1000))}:all=1,apad,atrim=0:{dur}',
                '-t', str(dur), '-c:a', 'aac', '-b:a', '128k', '-ar', '48000',
                '-ac', '2', aout]
        run(cmd)
    else:
        run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i',
             'anullsrc=r=48000:cl=stereo', '-t', str(dur), '-c:a', 'aac',
             '-b:a', '128k', aout])
    out = f'{WORK}/segs3/{name}.mp4'
    run(['ffmpeg', '-y', '-v', 'error', '-i', vout, '-i', aout,
         '-c', 'copy', '-shortest', out])
    return out


# Chyron texts (storyboard).
CH_DEP = 'Deposit 0.5 testnet NEAR · cap 0.2'
CH_DOC = 'The document being checked'
CH_CHECK = 'Receipt checked before payment'
CH_DED = 'Deducted 0.1 testnet NEAR'
CH_FAIL = 'Buyer files a failure claim — held 0.1 released'
CH_BACK = 'No receipt in 30 s — money back'
CH_TAMPER = 'Receipt tampered — buyer catches it'
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
S2 = f'{FR}/strip-s2.png'
S2_HL = f'{FR}/strip-s2-sp-av.png'
S2_HL_DED2 = f'{FR}/strip-s2-sp-av-sub915b05.png'
S2_BACKSTOP = f'{FR}/strip-s2-sube4ed41.png'
S2_REF = f'{FR}/strip-s2-subb18f41.png'

A_TAKE = 'intro-fallback-s92.mp3'
B_TAKE = 'take-b.mp3'
CDE_TAKE = 'take2-cde.mp3'
FGH_TAKE = 'take3-fgh.mp3'
IJKLM_TAKE = 'take4-ijklm.mp3'

# ---------------- 2:00 ----------------
clips2 = []
# A 0-15.66 title card (no headline overlay, no chyron, no strip)
clips2.append(build_clip('cA', f'{FR}/titlecard-v3.png', 0.0, 15.66,
                         audio_take=A_TAKE, zoom=0.04, letterbox=False))
# B 15.66-23 fail-release-only + chip
clips2.append(build_clip('cB', f'{FR}/fail-release-only.png', 15.66, 7.34,
                         headline='Watch this first.',
                         chyron_segs=[(0, 7.34, CHIP)],
                         audio_take=B_TAKE, zoom=0.08))
# C 23-31 terminal 4 + S2 4
clips2.append(build_clip('cC1', f'{FR}/term-deposit-v2.png', 23.0, 4.0,
                         headline='Deposit 0.5. Cap 0.2.',
                         chyron_segs=[(0, 4.0, CH_DEP)],
                         strip=S0_SUB, audio_take=CDE_TAKE, zoom=0.08))
clips2.append(build_clip('cC2', f'{FR}/z-s2-deposit.png', 27.0, 4.0,
                         headline='Deposit 0.5. Cap 0.2.',
                         chyron_segs=[(0, 4.0, CH_DEP)],
                         strip=S0, audio_take=CDE_TAKE, zoom=0.08))
# D 31-38 document card
clips2.append(build_clip('cD', f'{FR}/doc-success1-v2.png', 31.0, 7.0,
                         headline='One document to check.',
                         chyron_segs=[(0, 7.0, CH_DOC)],
                         strip=S0, audio_take=CDE_TAKE, zoom=0.12))
# E 38-53.0 verify 5 + terminal 3 + S3 4 + guided 3.0
clips2.append(build_clip('cE1', f'{FR}/verify-closeup.png', 38.0, 5.0,
                         headline='Check the receipt first.',
                         chyron_segs=[(0, 5.0, CH_CHECK)],
                         strip=S0, audio_take=CDE_TAKE, zoom=0.08))
clips2.append(build_clip('cE2', f'{FR}/term-verify1-v2.png', 43.0, 3.0,
                         headline='Check the receipt first.',
                         chyron_segs=[(0, 3.0, CH_DED)],
                         strip=S1_HL, audio_take=CDE_TAKE, zoom=0.08))
clips2.append(build_clip('cE3', f'{FR}/z-s3-success1.png', 46.0, 4.0,
                         headline='Check the receipt first.',
                         chyron_segs=[(0, 4.0, CH_DED)],
                         strip=S1_HL_DED1, audio_take=CDE_TAKE, zoom=0.08))
clips2.append(build_clip('cE4', f'{FR}/z-guided-success1.png', 50.0, 3.0,
                         headline='Check the receipt first.',
                         chyron_segs=[(0, 3.0, CH_DED)],
                         strip=S1, audio_take=CDE_TAKE, zoom=0.08))
# F 53.0-68.78 terminal 5 + guided 10.78
clips2.append(build_clip('cF1', f'{FR}/term-fail-v2.png', 53.0, 5.0,
                         headline='Failed call. Money back.',
                         chyron_segs=[(0, 5.0, CH_FAIL)],
                         strip=S1_FAIL, audio_take=FGH_TAKE, zoom=0.08))
clips2.append(build_clip('cF2', f'{FR}/z-guided-fail.png', 58.0, 10.78,
                         headline='Failed call. Money back.',
                         chyron_segs=[(0, 10.78, CH_FAIL)],
                         strip=S1, audio_take=FGH_TAKE, zoom=0.12))
# G 68.78-77.90 timeout card
clips2.append(build_clip('cG', f'{FR}/z-guided-timeout.png', 68.78, 9.12,
                         headline='No answer in 30 seconds.',
                         chyron_segs=[(0, 9.12, CH_BACK)],
                         strip=S1, audio_take=FGH_TAKE, zoom=0.08))
# H 77.90-84.70 highlight 4 + S2-tamper 2.80
clips2.append(build_clip('cH1', f'{FR}/tamper-highlight.png', 77.90, 4.0,
                         headline='One letter changed.',
                         chyron_segs=[(0, 4.0, CH_TAMPER)],
                         strip=S1_TAMPER, audio_take=FGH_TAKE, zoom=0.08))
clips2.append(build_clip('cH2', f'{FR}/z-s2-tamper.png', 81.90, 2.80,
                         headline='One letter changed.',
                         chyron_segs=[(0, 2.80, CH_TAMPER)],
                         strip=S1, audio_take=FGH_TAKE, zoom=0.08))
# I 84.70-92 terminal 3.30 + S3 4
clips2.append(build_clip('cI1', f'{FR}/term-verify2-v2.png', 84.70, 3.30,
                         headline='Second good check.',
                         chyron_segs=[(0, 3.30, CH_S2)],
                         strip=S2_HL, audio_take=IJKLM_TAKE, zoom=0.08))
clips2.append(build_clip('cI2', f'{FR}/z-s3-success2.png', 88.0, 4.0,
                         headline='Second good check.',
                         chyron_segs=[(0, 4.0, CH_S2)],
                         strip=S2_HL_DED2, audio_take=IJKLM_TAKE, zoom=0.08))
# J 92-103 terminal 4 + S3-refusal 4 + guided 3
clips2.append(build_clip('cJ1', f'{FR}/term-refusal-v2.png', 92.0, 4.0,
                         headline='Over budget — refused.',
                         chyron_segs=[(0, 4.0, CH_REF)],
                         strip=S2, audio_take=IJKLM_TAKE, zoom=0.08))
clips2.append(build_clip('cJ2', f'{FR}/z-s3-refusal.png', 96.0, 4.0,
                         headline='Over budget — refused.',
                         chyron_segs=[(0, 4.0, CH_REF)],
                         strip=S2_REF, audio_take=IJKLM_TAKE, zoom=0.08))
clips2.append(build_clip('cJ3', f'{FR}/z-guided-refusal.png', 100.0, 3.0,
                         headline='Over budget — refused.',
                         chyron_segs=[(0, 3.0, CH_REF)],
                         strip=S2_BACKSTOP, audio_take=IJKLM_TAKE, zoom=0.08))
# K 103-110 final strip card (static by design, zoom 0)
clips2.append(build_clip('cK', f'{FR}/final-strip-card.png', 103.0, 7.0,
                         headline='One honest limit.',
                         strip=S2, audio_take=IJKLM_TAKE, zoom=0.0))
# L 110-115.52 S3 final receipt + strip (no headline, no chyron)
clips2.append(build_clip('cL', f'{FR}/z-s3-success2.png', 110.0, 5.52,
                         strip=S2, audio_take=IJKLM_TAKE, zoom=0.12))
# M 115.52-120.02 end card (full frame)
clips2.append(build_clip('cM', f'{FR}/endcard-v3.png', 115.52, 4.50,
                         audio_take=IJKLM_TAKE, zoom=0.02, letterbox=False))


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
    lst = f'{WORK}/segs3/list-{os.path.basename(out_path)}.txt'
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


d2 = concat(clips2, f'{OUT}/meteredpay-demo-2min.mp4')
assert 119.5 <= d2 <= 120.5, d2
n_cues = write_srt(CUES, f'{OUT}/meteredpay-demo-2min.srt')
print(f'SRT: {n_cues} cues')
with open(f'{OUT}/meteredpay-demo-2min-transcript.txt', 'w', encoding='utf-8') as f:
    f.write('MeteredPay demo video — narration transcript (Pleased Skylight voice, speed 92, 6 Nov 2026, v3.1).\n')
    f.write('Recorded run: buyer mp-video05.testnet, 5 Nov 2026; tamper beat: buyer mp-tamper05.testnet.\n')
    f.write('Narration: synthetic voiceover. TTS input spells the brand "Metered Pay" (spaced) for pronunciation;\n')
    f.write('captions and on-screen text use "MeteredPay".\n\n')
    for _, _, tx in sorted(CUES):
        f.write(tx + ' ')
    f.write('\n')

# ---------------- 30 s teaser (re-cut from v3 assets only) ----------------
# Teaser cue list (video time within the teaser).
TCUES = [
    (0.00, 2.64, 'This is MeteredPay, on testnet.'),
    (2.98, 6.20, 'Agents pay for every call — even the ones that fail.'),
    (6.20, 7.54, 'Watch this first.'),
    (7.86, 11.16, 'A call fails — and the held money comes straight back.'),
    (11.66, 12.70, 'Deducted: zero.'),
    (14.20, 18.34, 'The buyer checks the receipt — same fingerprint, real signature.'),
    (19.26, 21.46, 'Only then does the contract take point one.'),
    (22.20, 25.80, 'One more call — and the contract says no before any money moves.'),
]
# Teaser clips use the same build_clip, but its burned captions come from
# the global CUES list (2:00 timings) — so build teaser clips with a
# dedicated path: temporarily swap the global CUES.
_real_cues = CUES
CUES = TCUES
clips30 = []
clips30.append(build_clip('tA', f'{FR}/titlecard-v3.png', 0.0, 6.20,
                          audio_take=A_TAKE, zoom=0.04, letterbox=False))
clips30.append(build_clip('tB', f'{FR}/fail-release-only.png', 6.20, 8.0,
                          headline='Watch this first.',
                          chyron_segs=[(0, 8.0, CHIP)],
                          audio_take=B_TAKE, zoom=0.08, take_start=6.20))
clips30.append(build_clip('tE', f'{FR}/verify-closeup.png', 14.20, 8.0,
                          headline='Check the receipt first.',
                          chyron_segs=[(0, 8.0, CH_CHECK)],
                          strip=S1_HL, audio_take=CDE_TAKE, zoom=0.08,
                          take_start=-7.70))
clips30.append(build_clip('tJ', f'{FR}/term-refusal-v2.png', 22.20, 5.0,
                          headline='Over budget — refused.',
                          chyron_segs=[(0, 5.0, CH_REF)],
                          strip=S2_REF, audio_take=IJKLM_TAKE, zoom=0.08,
                          take_start=14.34, audio_end=11.46))
clips30.append(build_clip('tM', f'{FR}/endcard-v3.png', 27.20, 2.82,
                          zoom=0.02, letterbox=False))
CUES = _real_cues
d30 = concat(clips30, f'{OUT}/meteredpay-teaser-30s.mp4')
assert 29.5 <= d30 <= 30.5, d30
write_srt(TCUES, f'{OUT}/meteredpay-teaser-30s.srt')
print('ASSEMBLY DONE')
