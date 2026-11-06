"""Assemble the MeteredPay demo video REBUILD (2:00) + 30 s teaser.
Rebuild 6 Nov 2026 — council video-rebuild, same recorded run
(mp-video05.testnet + tamper mp-tamper05.testnet), no new run.

What changed vs assemble.py (old cut, gTTS + burned captions):
- Narration: Helio (avocado_v2:MAI_03) at speed 85 via /opt/hatch/bin/tts,
  one clip per sentence, placed across each beat so no silence gap exceeds
  ~2 s (except a deliberate <=2 s end hold). NEVER sped up to fit.
- Motion: slow Ken Burns zoom (1.0 -> 1.08, 1.12 on the longest holds) on
  every still — no frozen frame held >6 s without a reframe.
- NO burned captions (panels: they cut mid-sentence and triple-repeated the
  narration). Sidecar .srt only, sentence-level, timings from the actual
  narration placements. Headline + one supporting caption line stay in the
  top band (titles, not captions).
- Chyron window 0:10-1:03 (restored 6 Nov) with the text changing as the
  story advances; pill inset 40 px from the image edge (was flush).
- New frames: de-spoiled doc card, verification close-up, tampered-receipt
  highlight, trimmed terminal frames (verbatim lines, JSON dropped),
  replay block (copy-pasteable), end card with disclosure, new thumbnail.
- Guided frames re-shot (shoot9.mjs): no "N of N", correct Next labels,
  no footer leak, S3 receipts complete at 100% zoom.
- Close: three-card summary -> replay block -> end card (S5 audit table OUT).
"""
import os, subprocess, textwrap

WORK = '/home/hatch/workspace/near-meteredpay/repo/video/work'
FR = WORK + '/frames'
NARR = WORK + '/narr2'
OUT = '/home/hatch/workspace/near-meteredpay/repo/video'
os.makedirs(WORK + '/segs2', exist_ok=True)
os.makedirs(WORK + '/txt2', exist_ok=True)

BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

TOP_BAND = 88
IMG_H = 896


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
    p = f'{WORK}/txt2/{name}.txt'
    with open(p, 'w', encoding='utf-8') as f:
        f.write(text)
    return p


def _enable(win):
    if win is True:
        return None
    t0, t1 = win
    return f"enable='between(t,{t0},{t1})'"


def build_clip(name, image, dur, headline=None, caption=None, chyron_segs=(),
               footline=None, urlpill=None, audio=None, audio_ss=0.0,
               zoom=0.08, letterbox=True):
    """audio: (path, offset_s) — the mix/mp3 starts offset_s into the clip;
    audio_ss: seek into the audio file (for sub-clips sharing one beat mix)."""
    frames = int(round(dur * 30))
    filters = []
    if letterbox:
        filters.append(
            f"zoompan=z='min(1+{zoom}*on/{frames},1+{zoom})':x='iw/2-(iw/zoom/2)':"
            f"y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30")
        filters.append(f'scale=-2:{IMG_H},pad=1920:1080:(ow-iw)/2:{TOP_BAND}:black')
    else:
        filters.append(
            f"zoompan=z='min(1+{zoom}*on/{frames},1+{zoom})':x='iw/2-(iw/zoom/2)':"
            f"y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30")
    if headline:
        hp = txtfile(name + '-h', headline)
        filters.append(
            f"drawtext=textfile='{hp}':fontfile={BOLD}:fontsize=36:fontcolor=white:"
            f"x=(w-text_w)/2:y=8:box=1:boxcolor=black@0.60:boxborderw=10")
    if caption:
        cp = txtfile(name + '-c', caption)
        filters.append(
            f"drawtext=textfile='{cp}':fontfile={SANS}:fontsize=26:fontcolor=white:"
            f"x=(w-text_w)/2:y=52:box=1:boxcolor=black@0.60:boxborderw=8")
    for i, (t0, t1, text) in enumerate(chyron_segs):
        en = _enable((t0, t1))
        box = "drawbox=x=1376:y=916:w=340:h=44:color=0xB45309@0.92:t=fill"
        tp = txtfile(f'{name}-chy{i}', text)
        txt = (f"drawtext=textfile='{tp}':fontfile={BOLD}:fontsize=18:fontcolor=white:"
               f"x=1384:y=928")
        if en:
            box += ':' + en
            txt += ':' + en
        filters.append(box)
        filters.append(txt)
    if footline:
        fp = txtfile(name + '-f', footline)
        filters.append(
            f"drawtext=textfile='{fp}':fontfile={SANS}:fontsize=22:fontcolor=white:"
            f"x=(w-text_w)/2:y=1006:box=1:boxcolor=black@0.60:boxborderw=8")
    if urlpill:
        up = txtfile(name + '-u', urlpill)
        filters.append(
            f"drawtext=textfile='{up}':fontfile={MONO}:fontsize=20:fontcolor=white:"
            f"x=(w-text_w)/2:y=1044:box=1:boxcolor=black@0.60:boxborderw=8")
    vf = ','.join(filters)
    vout = f'{WORK}/segs2/{name}-v.mp4'
    cmd = ['ffmpeg', '-y', '-v', 'error', '-framerate', '30', '-loop', '1',
           '-t', str(dur), '-i', image]
    if vf:
        cmd += ['-vf', vf]
    cmd += ['-r', '30', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
            '-pix_fmt', 'yuv420p', '-an', vout]
    run(cmd)
    aout = f'{WORK}/segs2/{name}-a.m4a'
    if audio:
        mp3, offset = audio
        cmd = ['ffmpeg', '-y', '-v', 'error']
        if audio_ss:
            cmd += ['-ss', str(audio_ss)]
        cmd += ['-i', mp3, '-af',
                f'adelay={int(offset * 1000)}:all=1,apad,atrim=0:{dur}',
                '-t', str(dur), '-c:a', 'aac', '-b:a', '128k', '-ar', '48000',
                '-ac', '2', aout]
        run(cmd)
    else:
        run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i',
             'anullsrc=r=48000:cl=stereo', '-t', str(dur), '-c:a', 'aac',
             '-b:a', '128k', aout])
    out = f'{WORK}/segs2/{name}.mp4'
    run(['ffmpeg', '-y', '-v', 'error', '-i', vout, '-i', aout,
         '-c', 'copy', '-shortest', out])
    return out


def mix_parts(name, parts, dur):
    """Mix [(mp3, delay_s)] into one m4a of length dur.
    NOTE (from assemble.py, 5 Nov): trim/pad go AFTER amix — per-part
    apad+atrim before amix silently drops every part after the first."""
    out = f'{WORK}/narr2/mix-{name}.m4a'
    inputs, filters = [], []
    for i, (mp3, delay) in enumerate(parts):
        inputs += ['-i', mp3]
        filters.append(f'[{i}:a]adelay={int(delay * 1000)}:all=1[p{i}]')
    filters.append(''.join(f'[p{i}]' for i in range(len(parts))) +
                   f'amix=inputs={len(parts)}:normalize=0,atrim=0:{dur},apad[aout]')
    run(['ffmpeg', '-y', '-v', 'error'] + inputs +
        ['-filter_complex', ';'.join(filters), '-map', '[aout]',
         '-t', str(dur), '-c:a', 'aac', '-b:a', '128k', '-ar', '48000',
         '-ac', '2', out])
    return out


def place(beat_dur, durs, lead=0.4, tail=0.4):
    """Offsets for parts of measured durations durs inside a beat: equal
    gaps between parts, lead in, tail out. Returns [offset, ...]."""
    n = len(durs)
    total = sum(durs)
    if n == 1:
        return [lead]
    gap = (beat_dur - lead - tail - total) / (n - 1)
    assert gap >= 0.15, f'parts do not fit: gap {gap:.2f} in {beat_dur}s beat'
    offs, t = [], lead
    for d in durs:
        offs.append(round(t, 2))
        t += d + gap
    return offs


def split_sentences(text):
    """Split narration text into sentences (keeps the spoken words)."""
    import re
    parts = [s.strip() for s in re.split(r'(?<=[.?!])\s+', text.strip()) if s.strip()]
    return parts


def sentence_cues(parts, offsets, durs):
    """(start, end, text) per sentence, splitting each part by word count."""
    cues = []
    for (text, off, d) in zip(parts, offsets, durs):
        sents = split_sentences(text)
        words = [len(s.split()) for s in sents]
        tot = sum(words)
        t = off
        for s, w in zip(sents, words):
            dd = d * w / tot
            cues.append((round(t, 2), round(t + dd, 2), s))
            t += dd
    return cues


# ---------------- narration: measured Helio clips (speed 85) ----------------
# Full-clip durations measured 6 Nov (ffprobe); part durations measured too.
# Sentence texts are the exact TTS inputs (spoken form).
N01 = ('n01', 'Failed call. Deducted: zero.')
N02 = ('n02', 'Agents pay for every call, even the broken ones. This agent needs one document checked before it files it. It pays only if the check comes back valid.')
N03 = ('n03', 'It puts down zero point five testnet NEAR, and sets a limit: no more than zero point two. Whatever happens, it can\u2019t spend past that.')
N06 = ('n06', 'No answer in thirty seconds? Same deal. The money comes back.')
N07 = ('n07', 'Someone fiddled with the receipt. See that one letter? The buyer catches it, and pays nothing.')
N10 = ('n10', 'The buyer checks every receipt. The contract only pays on a receipt the buyer has signed.')
N12 = ('n12', 'MeteredPay. Failed call? Deducted: zero.')
# Multi-part beats: (clip, text) per part.
P04 = [('n04a', 'First call. The check comes back valid.'),
       ('n04b', 'The buyer checks the receipt. Same fingerprint, real signature.'),
       ('n04c', 'And only then does the contract take zero point one.'),
       ('n04d', 'That\u2019s the whole trick: the buyer checks, then the contract pays.')]
P05 = [('n05a', 'Now a call fails.'),
       ('n05b', 'The buyer says so, and the money comes back.'),
       ('n05c', 'Held, never taken. Deducted: zero.'),
       ('n05d', 'The seller\u2019s own error note proves it failed.')]
P08 = [('n08a', 'Second good check.'),
       ('n08b', 'That\u2019s the limit reached.'),
       ('n08c', 'Two good checks, zero point two spent. The budget is gone.')]
P09 = [('n09a', 'One more call, and the contract says no before any money moves.'),
       ('n09b', 'Over budget, refused, on the record.'),
       ('n09c', 'Balance untouched.'),
       ('n09d', 'That\u2019s the limit doing its job.')]
P11 = [('n11a', 'Replay it yourself.'),
       ('n11b', 'The link\u2019s in the replies.')]

# Beat mixes (multi-part beats only). Single-clip beats use the mp3 directly.
MIX04 = mix_parts('c04', [(f'{NARR}/{n}.mp3', o) for (n, _), o in
                          zip(P04, place(18, [dur_of(f'{NARR}/{n}.mp3') for n, _ in P04], lead=0.5, tail=0.42))], 18)
MIX05 = mix_parts('c05', [(f'{NARR}/{n}.mp3', o) for (n, _), o in
                          zip(P05, place(16, [dur_of(f'{NARR}/{n}.mp3') for n, _ in P05], lead=0.4, tail=0.2))], 16)
MIX08 = mix_parts('c08', [(f'{NARR}/{n}.mp3', o) for (n, _), o in
                          zip(P08, place(10, [dur_of(f'{NARR}/{n}.mp3') for n, _ in P08], lead=0.3, tail=0.44))], 10)
MIX09 = mix_parts('c09', [(f'{NARR}/{n}.mp3', o) for (n, _), o in
                          zip(P09, place(16, [dur_of(f'{NARR}/{n}.mp3') for n, _ in P09], lead=0.4, tail=0.89))], 16)
MIX11 = mix_parts('c10b', [(f'{NARR}/{n}.mp3', o) for (n, _), o in
                           zip(P11, place(6, [dur_of(f'{NARR}/{n}.mp3') for n, _ in P11], lead=0.4, tail=0.92))], 6)

# SRT cue plan: (beat_start_s, beat_dur, [(part_text, offset, dur)]) — built
# from the same placements as the mixes, so captions match the narration.
CUES = []  # (start, end, text) in video time


def add_cues(beat_start, parts, offsets, durs):
    for (s, e, t) in sentence_cues([p[1] for p in parts], offsets, durs):
        CUES.append((round(beat_start + s, 2), round(beat_start + e, 2), t))


def add_single_cue(beat_start, clip, text, lead):
    d = dur_of(f'{NARR}/{clip}.mp3')
    for (s, e, t) in sentence_cues([text], [lead], [d]):
        CUES.append((round(beat_start + s, 2), round(beat_start + e, 2), t))


# Chyron segments: (t0, t1, text) clip-relative. Window 0:10-1:03.
CH_WAIT = 'Buyer waits 30 s for a receipt'
CH_CHECK = 'Receipt checked before payment'
CH_BACK = 'No receipt in 30 s — money back'
PILL_S1 = 'Deduction tx FdAowPRk…SMhFT · testnet.nearblocks.io'
PILL_FAIL = 'Release tx 7j4Jijr9…HgzJaA · testnet.nearblocks.io'
PILL_TAMPER = 'Release tx 7rEaW3An…PgGU7 · testnet.nearblocks.io'
PILL_S2 = 'Deduction tx FiHaJ9uv…YwcDT · testnet.nearblocks.io'
PILL_REF = 'Refusal tx 8sPCKFBt…K5Tcj · testnet.nearblocks.io'

# ---------------- 2:00 ----------------
clips2 = []
t = 0.0
# 0:00-0:05 cold open — three-card summary (was the REFUNDED row only)
clips2.append(build_clip('c01', f'{FR}/s1-threecards.png', 5,
    headline='Failed call. Deducted: zero.',
    audio=(f'{NARR}/n01.mp3', 0.6), zoom=0.08))
add_single_cue(0, *N01, 0.6)
t = 5.0
# 0:05-0:16.5 the job — de-spoiled document card (chyron from 0:10)
clips2.append(build_clip('c02', f'{FR}/doc-success1-v2.png', 11.5,
    headline='One document to check.',
    caption='Paid only if the check comes back valid.',
    chyron_segs=[(5, 11.5, CH_WAIT)],
    audio=(f'{NARR}/n02.mp3', 0.4), zoom=0.12))
add_single_cue(5, *N02, 0.4)
t = 16.5
# 0:16.5-0:27 deposit: terminal 5 s + S2 5.5 s
clips2.append(build_clip('c03a', f'{FR}/term-deposit-v2.png', 5,
    headline='Deposit 0.5. Cap 0.2.',
    caption='The contract holds the deposit. It cannot spend past the cap.',
    chyron_segs=[(0, 5, CH_WAIT)],
    footline='Testnet only — no mainnet money.',
    audio=(f'{NARR}/n03.mp3', 0.4), zoom=0.08))
clips2.append(build_clip('c03b', f'{FR}/z-s2-deposit.png', 5.5,
    headline='Deposit 0.5. Cap 0.2.',
    caption='The contract holds the deposit. It cannot spend past the cap.',
    chyron_segs=[(0, 5.5, CH_WAIT)],
    audio=(f'{NARR}/n03.mp3', 0.4), audio_ss=5.0, zoom=0.08))
add_single_cue(16.5, *N03, 0.4)
t = 27.0
# 0:27-0:45 success #1: terminal 4 + verify card 5 + guided 4 + S3 5
offs04 = place(18, [dur_of(f'{NARR}/{n}.mp3') for n, _ in P04], lead=0.5, tail=0.42)
durs04 = [dur_of(f'{NARR}/{n}.mp3') for n, _ in P04]
add_cues(27, P04, offs04, durs04)
for nm, img, dd, ss, ch in [
        ('c04a', 'term-verify1-v2.png', 4, 0, [(0, 3, CH_WAIT), (3, 4, CH_CHECK)]),
        ('c04b', 'verify-closeup.png', 5, 4, [(0, 5, CH_CHECK)]),
        ('c04c', 'z-guided-success1.png', 4, 9, [(0, 4, CH_CHECK)]),
        ('c04d', 'z-s3-success1.png', 5, 13, [(0, 5, CH_CHECK)])]:
    clips2.append(build_clip(nm, f'{FR}/{img}', dd,
        headline='Check the receipt first.',
        caption='Same fingerprint. Real signature. Then the contract pays.',
        chyron_segs=ch,
        urlpill=PILL_S1 if nm == 'c04d' else None,
        audio=(MIX04, 0.0), audio_ss=ss, zoom=0.08))
t = 45.0
# 0:45-1:01 fail: terminal 5 + guided 11
offs05 = place(16, [dur_of(f'{NARR}/{n}.mp3') for n, _ in P05], lead=0.4, tail=0.2)
durs05 = [dur_of(f'{NARR}/{n}.mp3') for n, _ in P05]
add_cues(45, P05, offs05, durs05)
clips2.append(build_clip('c05a', f'{FR}/term-fail-v2.png', 5,
    headline='Failed call. Money back.',
    caption='Held, never taken. Deducted: zero.',
    chyron_segs=[(0, 5, CH_CHECK)],
    urlpill=PILL_FAIL, audio=(MIX05, 0.0), audio_ss=0, zoom=0.08))
clips2.append(build_clip('c05b', f'{FR}/z-guided-fail.png', 11,
    headline='Failed call. Money back.',
    caption='Held, never taken. Deducted: zero.',
    chyron_segs=[(0, 11, CH_CHECK)],
    audio=(MIX05, 0.0), audio_ss=5, zoom=0.12))
t = 61.0
# 1:01-1:06 timeout (chyron to 1:03)
clips2.append(build_clip('c06', f'{FR}/z-guided-timeout.png', 5,
    headline='No answer in 30 seconds.',
    caption='Same deal — the money comes back.',
    chyron_segs=[(0, 2, CH_BACK)],
    audio=(f'{NARR}/n06.mp3', 0.2), zoom=0.08))
add_single_cue(61, *N06, 0.2)
t = 66.0
# 1:06-1:14 tamper: highlight card 5 + S2-tamper 3
clips2.append(build_clip('c07a', f'{FR}/tamper-highlight.png', 5,
    headline='One letter changed.',
    caption='The buyer catches it. Pays nothing.',
    urlpill=PILL_TAMPER, audio=(f'{NARR}/n07.mp3', 0.4), zoom=0.08))
clips2.append(build_clip('c07b', f'{FR}/z-s2-tamper.png', 3,
    headline='One letter changed.',
    caption='The buyer catches it. Pays nothing.',
    audio=(f'{NARR}/n07.mp3', 0.4), audio_ss=5.0, zoom=0.08))
add_single_cue(66, *N07, 0.4)
t = 74.0
# 1:14-1:24 success #2: terminal 3 + S3 7
offs08 = place(10, [dur_of(f'{NARR}/{n}.mp3') for n, _ in P08], lead=0.3, tail=0.44)
durs08 = [dur_of(f'{NARR}/{n}.mp3') for n, _ in P08]
add_cues(74, P08, offs08, durs08)
clips2.append(build_clip('c08a', f'{FR}/term-verify2-v2.png', 3,
    headline='Second good check.',
    caption='That is the limit reached.',
    audio=(MIX08, 0.0), audio_ss=0, zoom=0.08))
clips2.append(build_clip('c08b', f'{FR}/z-s3-success2.png', 7,
    headline='Second good check.',
    caption='That is the limit reached.',
    urlpill=PILL_S2, audio=(MIX08, 0.0), audio_ss=3, zoom=0.08))
t = 84.0
# 1:24-1:40 refusal: terminal 5 + guided 5.5 + S3 5.5
offs09 = place(16, [dur_of(f'{NARR}/{n}.mp3') for n, _ in P09], lead=0.4, tail=0.89)
durs09 = [dur_of(f'{NARR}/{n}.mp3') for n, _ in P09]
add_cues(84, P09, offs09, durs09)
clips2.append(build_clip('c09a', f'{FR}/term-refusal-v2.png', 5,
    headline='Over budget — refused.',
    caption='Before any money moves. Balance untouched.',
    audio=(MIX09, 0.0), audio_ss=0, zoom=0.08))
clips2.append(build_clip('c09b', f'{FR}/z-guided-refusal.png', 5.5,
    headline='Over budget — refused.',
    caption='Before any money moves. Balance untouched.',
    audio=(MIX09, 0.0), audio_ss=5, zoom=0.08))
clips2.append(build_clip('c09c', f'{FR}/z-s3-refusal.png', 5.5,
    headline='Over budget — refused.',
    caption='Before any money moves. Balance untouched.',
    footline='Backstop: 600 s — buyer can reclaim after expiry.',
    urlpill=PILL_REF, audio=(MIX09, 0.0), audio_ss=10.5, zoom=0.08))
t = 100.0
# 1:40-2:00 close: three-card 7 + replay block 6 + end card 7
clips2.append(build_clip('c10a', f'{FR}/s1-threecards.png', 7,
    headline='Three calls, three answers.',
    audio=(f'{NARR}/n10.mp3', 0.4), zoom=0.08))
add_single_cue(100, *N10, 0.4)
offs11 = place(6, [dur_of(f'{NARR}/{n}.mp3') for n, _ in P11], lead=0.4, tail=0.92)
durs11 = [dur_of(f'{NARR}/{n}.mp3') for n, _ in P11]
add_cues(107, P11, offs11, durs11)
clips2.append(build_clip('c10b', f'{FR}/replay-block.png', 6,
    audio=(MIX11, 0.0), zoom=0.08))
clips2.append(build_clip('c10c', f'{FR}/endcard-v2.png', 7,
    audio=(f'{NARR}/n12.mp3', 0.6), zoom=0.02, letterbox=False))
add_single_cue(113, *N12, 0.6)


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
    lst = f'{WORK}/segs2/list-{os.path.basename(out_path)}.txt'
    with open(lst, 'w') as f:
        for c in clips:
            f.write(f"file '{c}'\n")
    run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0',
         '-i', lst, '-c', 'copy', out_path])
    d = float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                   '-of', 'csv=p=0', out_path]).stdout.strip())
    print(out_path, f'{d:.2f}s', os.path.getsize(out_path), 'bytes')
    return d


d2 = concat(clips2, f'{OUT}/meteredpay-demo-2min.mp4')
assert 119.5 <= d2 <= 120.5, d2
n_cues = write_srt(CUES, f'{OUT}/meteredpay-demo-2min.srt')
print(f'SRT: {n_cues} cues')
with open(f'{OUT}/meteredpay-demo-2min-transcript.txt', 'w', encoding='utf-8') as f:
    f.write('MeteredPay demo video — narration transcript (Helio voice, 6 Nov 2026 rebuild).\n')
    f.write('Recorded run: buyer mp-video05.testnet, 5 Nov 2026; tamper beat: buyer mp-tamper05.testnet.\n\n')
    for _, _, tx in sorted(CUES):
        f.write(tx + ' ')
    f.write('\n')

# ---------------- 30 s teaser ----------------
TCUES = []
clips30 = []
# t01 0-5 cold open
clips30.append(build_clip('t01', f'{FR}/s1-threecards.png', 5,
    headline='Failed call. Deducted: zero.',
    audio=(f'{NARR}/n01.mp3', 0.6), zoom=0.08))
for (s, e, tx) in sentence_cues([N01[1]], [0.6], [dur_of(f'{NARR}/n01.mp3')]):
    TCUES.append((s, e, tx))
# t02 5-13 document
clips30.append(build_clip('t02', f'{FR}/doc-success1-v2.png', 8,
    headline='One document to check.',
    caption='Paid only if the check comes back valid.',
    audio=(f'{NARR}/t02.mp3', 0.5), zoom=0.12))
for (s, e, tx) in sentence_cues(['Agents pay for every call, even the broken ones. It pays only if the check comes back valid.'], [0.5], [dur_of(f'{NARR}/t02.mp3')]):
    TCUES.append((5 + s, 5 + e, tx))
# t03 13-22 verification
clips30.append(build_clip('t03', f'{FR}/verify-closeup.png', 9,
    headline='Check the receipt first.',
    caption='Same fingerprint. Real signature. Then the contract pays.',
    audio=(f'{NARR}/t03.mp3', 0.5), zoom=0.08))
for (s, e, tx) in sentence_cues(['The buyer checks the receipt. Same fingerprint, real signature. Then the contract pays.'], [0.5], [dur_of(f'{NARR}/t03.mp3')]):
    TCUES.append((13 + s, 13 + e, tx))
# t04 22-28 refusal
clips30.append(build_clip('t04', f'{FR}/z-guided-refusal.png', 6,
    headline='Over budget — refused.',
    caption='Before any money moves. Balance untouched.',
    audio=(f'{NARR}/t04.mp3', 0.4), zoom=0.08))
for (s, e, tx) in sentence_cues(['One more call, and the contract says no before any money moves.'], [0.4], [dur_of(f'{NARR}/t04.mp3')]):
    TCUES.append((22 + s, 22 + e, tx))
# t05 28-30 end card. Clip is 2 s of silence, but the measured silent
# tail is ~3.45 s (26.57-30.03) — it starts during t04's tail.
clips30.append(build_clip('t05', f'{FR}/endcard-v2.png', 2,
    zoom=0.02, letterbox=False))
d30 = concat(clips30, f'{OUT}/meteredpay-teaser-30s.mp4')
assert 29.5 <= d30 <= 30.5, d30
write_srt(TCUES, f'{OUT}/meteredpay-teaser-30s.srt')
print('ASSEMBLY DONE')
