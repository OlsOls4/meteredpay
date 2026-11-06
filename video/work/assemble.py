"""Assemble the MeteredPay demo video (2:00) and 30 s teaser from real frames.
Frames: headless-Chromium renders of the dashboard copy (this run's data),
terminal frames from the real console logs, PIL end cards. Narration: gTTS.
Captions: burned in (drawtext) + SRT sidecar + transcript.
All hashes/amounts come from the recorded runs only.

SECOND PASS (5 Nov 2026, ~23:30 UTC) — videographers' ranked fixes, re-render
from the SAME assets/run (mp-video05.testnet + tamper mp-tamper05.testnet), no
new recorded run:
 1. On-screen disclosure (c01 + c02 0:00-0:10, teaser t01): the video is built
    from rendered dashboard frames with narration, not a live screen recording.
 2. Dead-silence tails filled: the long beats (deposit, success #1, fail,
    tamper, success #2, refusal) get slow re-recorded narration split into
    parts with placed gaps, so no silence run exceeds ~3 s (was up to 12.4 s).
    Same script words throughout (plus "testnet" in the two money lines, fix 5).
 3. Overlay geometry: uniform letterbox — image scaled to 896 px tall inside
    a 100 px top band (headline, never over dashboard chrome) and a 96 px
    bottom band (burned captions + URL pill, never over body text).
 4. Chyron "Buyer waits 30 s for a receipt": 0:10-0:30 only (was 0:05-1:03),
    moved to a bottom-right pill clear of all four frames it sits over.
    SUPERSEDED 6 Nov 2026 (chyron restore, below): window is 0:10-1:03 again.
 5. "testnet" added to every money overlay (cold open, job headline, fail
    caption "the held 0.1 testnet NEAR").
 6. Teaser (and 2:00 job) headline reworded "paid only if valid" ->
    "deducted only if valid" (glossary no-bare-"Paid" rule).
 7. Test-frame gate re-run on the re-render (see video-run-log.md).
No subtitle stream is embedded in either mp4; captions are burned in, with an
SRT sidecar + transcript kept alongside.

WAVE 4 (5 Nov 2026, ~23:58 UTC) — council wave-4 video findings, same run:
 L4 show the document (c02/t02 now a verbatim document card, no new run);
 V-F1 de-spoil (cold open = REFUNDED row only; S2 = deposit-time balances);
 V-F4 re-frame the close (S1 three-card summary, then S5 audit at fit width);
 V-F2 half-open caption windows (c02, c10b: no shared boundary frame);
 V-F7 backstop line in the close (c10b footline, from BACKSTOP_SECONDS 600);
 V-F8 explorer links break between words only (video/work/dash only);
 V-F6 guided numbering verified already correct (1/2/3 of 3, 4 of 4) — kept;
 V-F5 chyron UNCHANGED (0:10-0:30) — conflict recorded in video-run-log.md,
 awaiting Olly's decision; VIDEO-SCRIPT.md still says 0:10-1:03.
 No narration/headline wording changed; no new recorded run; no re-record.

CHYRON RESTORE (6 Nov 2026) — DECIDED by Olly-delegated Muse: restore the
 chyron window to 0:10-1:03 (videographers' call, council wave 4 V-F5),
 over the finish team's deliberate 0:10-0:30 cut (second pass, commit
 ee2f8fa). Change is chyron=True on c04b, c04c, c05a, c05b, c05c, c06 only;
 re-render from the SAME assets/run, no re-record, durations unchanged.
"""
import os, subprocess, textwrap, json

WORK = '/home/hatch/workspace/near-meteredpay/repo/video/work'
FR = WORK + '/frames'
OUT = '/home/hatch/workspace/near-meteredpay/repo/video'
os.makedirs(WORK + '/segs', exist_ok=True)
os.makedirs(WORK + '/txt', exist_ok=True)

BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

# Letterbox geometry (uniform for every image clip):
#   top band 88 px (headline y=10, disclosure y=60) | image 1592x896 at y=88
#   bottom band 96 px (captions y=994, URL pill y=1044)
TOP_BAND = 88
IMG_H = 896

def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print('FAILED:', ' '.join(cmd)); print(r.stdout[-2000:]); print(r.stderr[-2000:])
        raise SystemExit(1)
    return r

def txtfile(name, text):
    p = f'{WORK}/txt/{name}.txt'
    with open(p, 'w', encoding='utf-8') as f:
        f.write(text)
    return p

def wrap2(text, width=72):
    return '\n'.join(textwrap.wrap(text, width=width))

CHYRON = 'Buyer waits 30 s for a receipt'
DISCLOSURE = 'Rendered dashboard frames with narration — not a live screen recording'
TAMPER_LABEL = 'Separate run — same contract'

def _enable(win):
    """win: True (whole clip) or (t0, t1) clip-relative seconds -> enable expr."""
    if win is True:
        return None
    t0, t1 = win
    return f"enable='between(t,{t0},{t1})'"

def build_clip(name, image, dur, headline=None, captions=(), chyron=False,
               label=None, urlpill=None, narr=None, disclosure=False,
               letterbox=True, footline=None):
    """captions: list of (t0, t1, text). narr: (mp3, offset_s, ss, trim_dur, atempo) or None.
    chyron/disclosure: False, True (whole clip), or (t0, t1) clip-relative window.
    footline: one line rendered in the bottom band under the image (y=1044),
    e.g. the V-F7 backstop line on the S5 close clip."""
    filters = []
    if letterbox:
        filters.append(f'scale=-2:{IMG_H},pad=1920:1080:(ow-iw)/2:{TOP_BAND}:black')
    if headline:
        hp = txtfile(name + '-h', headline)
        filters.append(
            f"drawtext=textfile='{hp}':fontfile={BOLD}:fontsize=36:fontcolor=white:"
            f"x=(w-text_w)/2:y=10:box=1:boxcolor=black@0.60:boxborderw=10")
    if disclosure:
        dp = txtfile(name + '-d', DISCLOSURE)
        en = _enable(disclosure)
        f = (f"drawtext=textfile='{dp}':fontfile={SANS}:fontsize=20:fontcolor=white:"
             f"x=(w-text_w)/2:y=60:box=1:boxcolor=black@0.60:boxborderw=8")
        if en:
            f += ':' + en
        filters.append(f)
    if chyron:
        en = _enable(chyron)
        box = ("drawbox=x=1416:y=916:w=340:h=44:color=0xB45309@0.92:t=fill")
        txt = (f"drawtext=text='{CHYRON}':fontfile={BOLD}:fontsize=19:fontcolor=white:"
               f"x=1424:y=928")
        if en:
            box += ':' + en
            txt += ':' + en
        filters.append(box)
        filters.append(txt)
    if urlpill:
        up = txtfile(name + '-u', urlpill)
        filters.append(
            f"drawtext=textfile='{up}':fontfile={MONO}:fontsize=20:fontcolor=white:"
            f"x=(w-text_w)/2:y=1044:box=1:boxcolor=black@0.60:boxborderw=8")
    if footline:
        fp = txtfile(name + '-f', footline)
        filters.append(
            f"drawtext=textfile='{fp}':fontfile={SANS}:fontsize=22:fontcolor=white:"
            f"x=(w-text_w)/2:y=1044:box=1:boxcolor=black@0.60:boxborderw=8")
    for i, (t0, t1, text) in enumerate(captions):
        cp = txtfile(f'{name}-c{i}', wrap2(text))
        filters.append(
            f"drawtext=textfile='{cp}':fontfile={SANS}:fontsize=30:fontcolor=white:"
            f"x=(w-text_w)/2:y=994:box=1:boxcolor=black@0.68:boxborderw=10:"
            f"line_spacing=6:enable='between(t,{t0},{t1})'")
    vf = ','.join(filters)
    vout = f'{WORK}/segs/{name}-v.mp4'
    cmd = ['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-t', str(dur), '-i', image]
    if vf:
        cmd += ['-vf', vf]
    cmd += ['-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
            '-pix_fmt', 'yuv420p', '-an', vout]
    run(cmd)
    # audio
    aout = f'{WORK}/segs/{name}-a.m4a'
    if narr:
        mp3, offset, ss, trim_dur, atempo = narr
        af = []
        if atempo != 1.0:
            af.append(f'atempo={atempo}')
        af.append(f'adelay={int(offset * 1000)}:all=1')
        af.append('apad')
        af.append(f'atrim=0:{dur}')
        cmd = ['ffmpeg', '-y', '-v', 'error']
        if ss:
            cmd += ['-ss', str(ss)]
        cmd += ['-i', mp3, '-af', ','.join(af), '-t', str(dur), '-c:a', 'aac',
                '-b:a', '128k', '-ar', '48000', '-ac', '2', aout]
        run(cmd)
    else:
        run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i',
             'anullsrc=r=48000:cl=stereo', '-t', str(dur), '-c:a', 'aac',
             '-b:a', '128k', aout])
    out = f'{WORK}/segs/{name}.mp4'
    run(['ffmpeg', '-y', '-v', 'error', '-i', vout, '-i', aout,
         '-c', 'copy', '-shortest', out])
    return out

def mix_narr(name, parts, dur):
    """Mix beat narration from parts: [(mp3, delay_s, atempo)] -> one m4a.
    Parts are slow gTTS re-records of the SAME script words, split at sentence
    boundaries and placed so speech spans the beat with no gap over ~3 s.
    NOTE: trim/pad go AFTER amix. Per-part apad+atrim before amix silently
    drops every part after the first (found 5 Nov 2026, second-pass QA)."""
    out = f'{WORK}/narr/mix-{name}.m4a'
    inputs, filters = [], []
    for i, (mp3, delay, atempo) in enumerate(parts):
        inputs += ['-i', mp3]
        af = []
        if atempo != 1.0:
            af.append(f'atempo={atempo}')
        af.append(f'adelay={int(delay * 1000)}:all=1')
        filters.append(f'[{i}:a]{",".join(af)}[p{i}]')
    filters.append(''.join(f'[p{i}]' for i in range(len(parts))) +
                   f'amix=inputs={len(parts)}:normalize=0,atrim=0:{dur},apad[aout]')
    run(['ffmpeg', '-y', '-v', 'error'] + inputs +
        ['-filter_complex', ';'.join(filters), '-map', '[aout]',
         '-t', str(dur), '-c:a', 'aac', '-b:a', '128k', '-ar', '48000',
         '-ac', '2', out])
    return out

N = lambda n: f'{WORK}/narr/n{n:02d}.mp3'

# --- Re-recorded narration (second pass): same script words, slow gTTS ---
# n01b/t2b are normal speed; the split parts are slow=True. Generated here so
# the build is reproducible from this file alone. Durations measured 5 Nov:
# n01b 4.10, n03a 3.02, n03b 3.58, n04a 6.55, n04b 4.44, n05a1 1.97, n05a2 2.78,
# n05b 6.41, n07a 2.50, n07b 2.33, n08a 1.54, n08b 1.92, n09a 6.62, n09b 4.94.
from gtts import gTTS as _g
for _fn, _tx, _sl in [
        ('n01b', 'Failed call. Deducted: zero testnet NEAR.', False),
        ('n03a', 'The buyer prepays testnet NEAR', True),
        ('n03b', 'and sets a spending limit in the contract.', True),
        ('n04a', 'One successful call. The contract deducts exactly one call price.', True),
        ('n04b', 'only because the buyer verified the success receipt.', True),
        ('n05a1', 'Now a failed call.', True),
        ('n05a2', 'The buyer claims the failure.', True),
        ('n05b', 'the held 0.1 testnet NEAR is released, never deducted.', True),
        ('n07a', "The receipt didn't check out,", True),
        ('n07b', 'so nothing was deducted.', True),
        ('n08a', 'Second call,', True),
        ('n08b', 'budget now used.', True),
        ('n09a', 'And over budget, the contract refuses the call before any money moves.', True),
        ('n09b', 'The contract logged the refusal; balance unchanged.', True)]:
    _g(_tx, lang='en', tld='com', slow=_sl).save(f'{WORK}/narr/{_fn}.mp3')
N1B = f'{WORK}/narr/n01b.mp3'
MIX03 = mix_narr('n03', [(f'{WORK}/narr/n03a.mp3', 0.4, 0.75),
                          (f'{WORK}/narr/n03b.mp3', 5.0, 0.83)], 10)
MIX04 = mix_narr('n04', [(f'{WORK}/narr/n04a.mp3', 0.4, 0.90),
                          (f'{WORK}/narr/n04b.mp3', 8.0, 1.0)], 13)
MIX05 = mix_narr('n05', [(f'{WORK}/narr/n05a1.mp3', 0.4, 0.75),
                          (f'{WORK}/narr/n05a2.mp3', 5.6, 0.80),
                          (f'{WORK}/narr/n05b.mp3', 11.6, 0.85)], 20)
MIX07 = mix_narr('n07', [(f'{WORK}/narr/n07a.mp3', 0.3, 0.75),
                          (f'{WORK}/narr/n07b.mp3', 4.2, 0.97)], 7)
MIX08 = mix_narr('n08', [(f'{WORK}/narr/n08a.mp3', 0.4, 0.80),
                          (f'{WORK}/narr/n08b.mp3', 5.2, 0.80)], 10)
MIX09 = mix_narr('n09', [(f'{WORK}/narr/n09a.mp3', 0.4, 0.75),
                          (f'{WORK}/narr/n09b.mp3', 11.5, 0.75)], 20)

URL_S1 = 'testnet.nearblocks.io/txns/FdAowPRkBuUrQkGgTnfhfNsnvqHZTkNzpA1nyt1SMhFT'
URL_RF = 'testnet.nearblocks.io/txns/8sPCKFBtB3CKeyBXyxoUqwtuDLyi2y4YjC29cJyK5Tcj'

# ---------------- 2:00 ----------------
clips2 = []
# 0:00-0:05 cold open (disclosure on screen for the full 5 s)
# Wave 4 V-F1: REFUNDED row only (was the full 5-row table, incl. refusal).
clips2.append(build_clip('c01', f'{FR}/s1-coldopen-refunded.png', 5,
    headline='Failed call. Deducted: zero testnet NEAR.',
    captions=[(0, 5, 'Failed call. Deducted: zero testnet NEAR.')],
    disclosure=True, narr=(N1B, 0.4, 0, 0, 1.0)))
# 0:05-0:15 the job (disclosure 0:05-0:10, chyron appears at 0:10 = t5)
# Wave 4 L4: the actual checked document, verbatim from the recorded run
# (was S1 prose). Wave 4 V-F2: half-open caption windows (no shared 5.0 s
# boundary — the old (0,5)/(5,10) pair garbled one frame at 0:10.0).
clips2.append(build_clip('c02', f'{FR}/doc-success1.png', 10,
    headline='One document checked on testnet — deducted only if valid.',
    captions=[(0, 4.97, 'An agent needs one document checked before it files it. It'),
              (5.03, 10, 'pays 0.1 testnet NEAR — but only if the check comes back valid.')],
    chyron=(5, 10), disclosure=(0, 5), narr=(N(2), 0.4, 0, 0, 1.0)))
# 0:15-0:25 deposit: terminal 5s + S2 5s (chyron still up; receipt not yet arrived)
clips2.append(build_clip('c03a', f'{FR}/term-deposit.png', 5,
    headline='Deposit: 0.5 testnet NEAR — Budget: 0.2 testnet NEAR',
    captions=[(0, 5, 'The buyer prepays testnet NEAR and sets a spending limit in the contract.')],
    chyron=True, narr=(MIX03, 0.4, 0, 0, 1.0)))
clips2.append(build_clip('c03b', f'{FR}/z-s2-deposit.png', 5,
    headline='Deposit: 0.5 testnet NEAR — Budget: 0.2 testnet NEAR',
    captions=[(0, 5, 'Contract balances — wallet differs by testnet gas, shown on explorer.')],
    chyron=True, narr=(MIX03, 0.0, 4.6, 0, 1.0)))
# Wave 4 V-F1: z-s2-deposit.png shows DEPOSIT-TIME balances (0.5/0/0/0.5/0.2,
# from the run log — the old z-s2-loaded.png showed the final 0.5/0/0.2/0.3/0.2).
# 0:25-0:38 success #1: terminal 5s + guided 4s + S3 explorer 4s
# CHYRON RESTORE 6 Nov: chyron runs 0:10-1:03 (through the timeout beat,
# per VIDEO-SCRIPT.md) — no longer ends at 0:30 (end of c04a).
clips2.append(build_clip('c04a', f'{FR}/term-verify1.png', 5,
    headline='Successful call: −0.1 testnet NEAR',
    captions=[(0, 5, 'One successful call. The contract deducts exactly one call price —')],
    chyron=True, narr=(MIX04, 0.4, 0, 0, 1.0)))
clips2.append(build_clip('c04b', f'{FR}/z-guided-success1.png', 4,
    headline='Successful call: −0.1 testnet NEAR',
    captions=[(0, 4, 'only because the buyer verified the success receipt.')],
    chyron=True, narr=(MIX04, 0.0, 4.6, 0, 1.0)))
clips2.append(build_clip('c04c', f'{FR}/z-s3-success1.png', 4,
    headline='Successful call: −0.1 testnet NEAR',
    captions=[(0, 4, 'only because the buyer verified the success receipt.')],
    chyron=True, urlpill=URL_S1, narr=(MIX04, 0.0, 8.6, 0, 1.0)))
# 0:38-0:58 fail: terminal 6s + guided 8s + S3 6s (chyron still up: 0:10-1:03)
clips2.append(build_clip('c05a', f'{FR}/term-fail.png', 6,
    headline='Failed call: held amount released. Deducted: 0 testnet NEAR.',
    captions=[(0, 6, 'Now a failed call. The buyer claims the failure —')],
    chyron=True, narr=(MIX05, 0.4, 0, 0, 1.0)))
clips2.append(build_clip('c05b', f'{FR}/z-guided-fail.png', 8,
    headline='Failed call: held amount released. Deducted: 0 testnet NEAR.',
    captions=[(0, 8, 'the held 0.1 testnet NEAR is released, never deducted.')],
    chyron=True, narr=(MIX05, 0.0, 5.6, 0, 1.0)))
clips2.append(build_clip('c05c', f'{FR}/z-s3-fail.png', 6,
    headline='Failed call: held amount released. Deducted: 0 testnet NEAR.',
    captions=[(0, 6, 'the held 0.1 testnet NEAR is released, never deducted.')],
    chyron=True, narr=(MIX05, 0.0, 13.6, 0, 1.0)))
# 0:58-1:03 timeout (chyron still up — the timeout beat is the payoff)
clips2.append(build_clip('c06', f'{FR}/z-guided-timeout.png', 5,
    headline='No receipt in 30 s: held amount released. Deducted: 0 testnet NEAR.',
    captions=[(0, 5, 'No receipt in thirty seconds — same release, never deducted.')],
    chyron=True, narr=(N(6), 0.1, 0, 0, 1.05)))
# 1:03-1:10 tamper (separate run)
clips2.append(build_clip('c07a', f'{FR}/term-tamper.png', 4,
    headline='Separate run — Receipt didn\'t check out. Deducted: 0 testnet NEAR.',
    captions=[(0, 4, "The receipt didn't check out, so nothing was deducted.")],
    label=TAMPER_LABEL, narr=(MIX07, 0.3, 0, 0, 1.0)))
clips2.append(build_clip('c07b', f'{FR}/z-s2-tamper.png', 3,
    headline='Separate run — Receipt didn\'t check out. Deducted: 0 testnet NEAR.',
    captions=[(0, 3, "The receipt didn't check out, so nothing was deducted.")],
    label=TAMPER_LABEL, narr=(MIX07, 0.0, 3.7, 0, 1.0)))
# 1:10-1:20 success #2: terminal 2s + S3 4s + zoomed S3 4s
clips2.append(build_clip('c08a', f'{FR}/term-verify2.png', 2,
    headline='Second call: −0.1 testnet NEAR. Budget now used.',
    captions=[(0, 2, 'Second call, budget now used.')], narr=(MIX08, 0.1, 0, 0, 1.0)))
clips2.append(build_clip('c08b', f'{FR}/s3-success2.png', 4,
    headline='Second call: −0.1 testnet NEAR. Budget now used.',
    captions=[(0, 4, 'Second call, budget now used.')], narr=(MIX08, 0.0, 1.9, 0, 1.0)))
clips2.append(build_clip('c08c', f'{FR}/z-s3-success2.png', 4,
    headline='Second call: −0.1 testnet NEAR. Budget now used.',
    captions=[(0, 4, 'Second call, budget now used.')], narr=(MIX08, 0.0, 5.9, 0, 1.0)))
# 1:20-1:40 refusal: terminal 6s + guided 8s + S3 explorer 6s
clips2.append(build_clip('c09a', f'{FR}/term-refusal.png', 6,
    headline='Over budget: refused on-chain. Balance unchanged.',
    captions=[(0, 6, 'And over budget, the contract refuses the call before any money moves.')],
    narr=(MIX09, 0.4, 0, 0, 1.0)))
clips2.append(build_clip('c09b', f'{FR}/z-guided-refusal.png', 8,
    headline='Over budget: refused on-chain. Balance unchanged.',
    captions=[(0, 8, 'The contract logged the refusal; balance unchanged.')], narr=(MIX09, 0.0, 5.6, 0, 1.0)))
clips2.append(build_clip('c09c', f'{FR}/z-s3-refusal.png', 6,
    headline='Over budget: refused on-chain. Balance unchanged.',
    captions=[(0, 6, 'The contract logged the refusal; balance unchanged.')],
    urlpill=URL_RF, narr=(MIX09, 0.0, 13.6, 0, 1.0)))
# 1:40-2:00 close: S1 three-card summary 7s + S5 audit 6s + end card 7s
# Wave 4 V-F4: c10a is the S1 three-card summary (was S5 steps); c10b is
# the S5 audit table at fit width (was the cropped zoom). Wave 4 V-F2:
# half-open caption windows on c10b. Wave 4 V-F7: backstop footline.
# n11 starts 0.5 s into c10b (was 3.0): closes the 5.3 s mid-close silence gap.
clips2.append(build_clip('c10a', f'{FR}/s1-threecards.png', 7,
    headline='Replay it yourself — same contract: apathetic-party.testnet',
    captions=[(0, 7, 'The contract holds the deposit and refuses overspending on-chain.')],
    narr=(N(10), 0.4, 0, 0, 1.0)))
clips2.append(build_clip('c10b', f'{FR}/s5-audit-fit.png', 6,
    headline='Replay it yourself — same contract: apathetic-party.testnet',
    captions=[(0, 4.97, 'Would you trust an agent that only pays for work it can prove?'),
              (5.03, 6, 'Replay it — repo in the replies — and tell us.')],
    footline='Backstop: 600 s — the buyer can always reclaim',
    narr=(N(11), 0.5, 0, 3.0, 1.0)))
clips2.append(build_clip('c10c', f'{FR}/endcard.png', 7,
    captions=[(0, 7, 'Replay it — repo in the replies — and tell us.')],
    letterbox=False, narr=(N(11), 0.0, 5.5, 5.4, 1.0)))

def concat(clips, out_path):
    lst = f'{WORK}/segs/list-{os.path.basename(out_path)}.txt'
    with open(lst, 'w') as f:
        for c in clips:
            f.write(f"file '{c}'\n")
    run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0',
         '-i', lst, '-c', 'copy', out_path])
    d = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                   '-of', 'csv=p=0', out_path], ).stdout.strip())
    print(out_path, f'{d:.2f}s', os.path.getsize(out_path), 'bytes')
    return d

d2 = concat(clips2, f'{OUT}/meteredpay-demo-2min.mp4')
assert 119.5 <= d2 <= 120.5, d2

# ---------------- 30 s teaser ----------------
# Teaser-only narration (same on-screen lines, short).
from gtts import gTTS as _g
for name, text in [('t2', 'One document checked on testnet. Deducted only if valid.'),
                   ('t3', 'Successful call. Minus 0.1 testnet NEAR.'),
                   ('t4', 'Over budget. Refused on-chain. Balance unchanged.')]:
    _g(text, lang='en', tld='com').save(f'{WORK}/narr/{name}.mp3')
T = lambda n: f'{WORK}/narr/{n}.mp3'
clips30 = []
clips30.append(build_clip('t01', f'{FR}/s1-coldopen-refunded.png', 6,
    headline='Failed call. Deducted: zero testnet NEAR.',
    captions=[(0, 6, 'Failed call. Deducted: zero testnet NEAR.')],
    disclosure=True, narr=(N1B, 0.4, 0, 0, 1.0)))
clips30.append(build_clip('t02', f'{FR}/doc-success1.png', 6,
    headline='One document checked on testnet — deducted only if valid.',
    captions=[(0, 6, 'One document checked on testnet — deducted only if valid.')],
    narr=(T('t2'), 0.4, 0, 0, 1.0)))
clips30.append(build_clip('t03', f'{FR}/z-guided-success1.png', 8,
    headline='Successful call: −0.1 testnet NEAR',
    captions=[(0, 8, 'Successful call: −0.1 testnet NEAR')],
    narr=(T('t3'), 0.4, 0, 0, 1.0)))
clips30.append(build_clip('t04', f'{FR}/z-guided-refusal.png', 6,
    headline='Over budget: refused on-chain. Balance unchanged.',
    captions=[(0, 6, 'Over budget: refused on-chain. Balance unchanged.')],
    narr=(T('t4'), 0.4, 0, 0, 1.0)))
clips30.append(build_clip('t05', f'{FR}/endcard-teaser.png', 4,
    captions=[(0, 4, 'MeteredPay — apathetic-party.testnet — NEAR testnet')],
    letterbox=False))
d30 = concat(clips30, f'{OUT}/meteredpay-teaser-30s.mp4')
assert 29.5 <= d30 <= 30.5, d30
print('ASSEMBLY DONE')
