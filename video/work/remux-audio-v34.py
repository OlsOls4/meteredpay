"""Rebuild the audio track of an assembled MeteredPay video (v3.4).

Same fix as remux-audio-v31.py (v3 Defect 2): assemble-v3.4.py
concatenates separately AAC-encoded clips with `-c copy`, so a
full-stream decode yields extra PCM past the container end and the
closing word can re-appear in the raw sample stream. Rebuild the audio
from the source takes in ONE AAC encode (same takes, same placements,
no TTS re-render) and mux it with the video stream copied untouched.

Placements (v3.4, Paloma, speed 100):
  main: A trimmed to its clip end 14.96; B @15.96; CDE @23.48;
        FGH @43.74; IJKLM @68.36. Total = input file duration (~100.035).
  teaser: tA: A 0-5.82; tB: B @6.20; tE: CDE from 13.18 @13.20;
          tJ: IJKLM 6.32-13.00 @20.30; tM silent. Total ~30.035.

Usage: python3 remux-audio-v34.py <in.mp4> <out.mp4> <2min|teaser>
The takes come from video/work/narr3-v34-ln/ (loudnorm'd v3.4 takes).
The total duration is read from the input file (no hardcoded total).
"""
import os
import subprocess
import sys

REPO = '/home/hatch/workspace/near-meteredpay/repo'
NARR = REPO + '/video/work/narr3-v34-ln'


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print('FAILED:', ' '.join(cmd))
        print(r.stdout[-2000:])
        print(r.stderr[-2000:])
        raise SystemExit(1)
    return r


def ffprobe_dur(path):
    return float(run(['ffprobe', '-v', 'error', '-show_entries',
                      'format=duration', '-of', 'csv=p=0', path]).stdout.strip())


def pcm_dur(path):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-map', '0:a',
                        '-f', 'f32le', '-ac', '1', '-ar', '48000', '-'],
                       capture_output=True)
    if r.returncode != 0:
        print('FAILED: pcm decode', path)
        print(r.stderr[-2000:])
        raise SystemExit(1)
    return len(r.stdout) / 4 / 48000


def build_audio(kind, tmp, total):
    """Build a single-encode AAC audio track; return its path."""
    cmd = ['ffmpeg', '-y', '-v', 'error']
    filt = []
    if kind == '2min':
        # (file, input -ss, input -t, delay ms). A is trimmed to its clip
        # end 14.96 (its file tail is trailing silence past the B boundary).
        spec = [
            ('intro-s100.mp3', None, 14.96, 0),
            ('take-b-s100.mp3', None, None, 15960),
            ('take-cde-v6.mp3', None, None, 23480),
            ('take-fgh-v3.mp3', None, None, 43740),
            ('take-ijklm-v6.mp3', None, None, 68360),
        ]
    else:
        # Teaser placements (from assemble-v3.4.py, Paloma s100 timings):
        # tA: A 0-5.82; tB: B @6.20; tE: CDE from 13.18 @13.20;
        # tJ: IJKLM 6.32-13.00 @20.30; tM silent.
        spec = [
            ('intro-s100.mp3', None, 5.82, 0),
            ('take-b-s100.mp3', None, None, 6200),
            ('take-cde-v6.mp3', 13.18, None, 13200),
            ('take-ijklm-v6.mp3', 6.32, 6.68, 20300),
        ]
    for i, (fn, ss, dur, delay) in enumerate(spec):
        # -ss/-t BEFORE -i: input options limiting this input only.
        if ss is not None:
            cmd += ['-ss', str(ss)]
        if dur is not None:
            cmd += ['-t', str(dur)]
        cmd += ['-i', f'{NARR}/{fn}']
        filt.append(f'[{i}:a]adelay={delay}:all=1[a{i}]')
    n = len(spec)
    filt.append(f'{"".join(f"[a{i}]" for i in range(n))}'
                f'amix=inputs={n}:normalize=0,apad,atrim=0:{total}[aout]')
    # apad is required: atrim alone cannot extend a mix that ends early
    # (longest input here ends 98.52 s / 26.98 s, short of the total).
    cmd += ['-filter_complex', ';'.join(filt), '-map', '[aout]',
            '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2', tmp]
    run(cmd)
    return tmp


def main():
    inp, outp, kind = sys.argv[1], sys.argv[2], sys.argv[3]
    assert kind in ('2min', 'teaser'), kind
    total = ffprobe_dur(inp)
    tmp_a = f'/tmp/v34-remux-{kind}.m4a'
    tmp_o = outp + '.tmp.mp4'
    build_audio(kind, tmp_a, total)
    print(f'{kind} rebuilt audio: container {ffprobe_dur(tmp_a):.3f}s, '
          f'decoded PCM {pcm_dur(tmp_a):.3f}s')
    run(['ffmpeg', '-y', '-v', 'error', '-i', inp, '-i', tmp_a,
         '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'copy', tmp_o])
    os.replace(tmp_o, outp)
    print(f'{kind} remuxed: {outp} container {ffprobe_dur(outp):.3f}s, '
          f'decoded PCM {pcm_dur(outp):.3f}s, '
          f'size {os.path.getsize(outp)} B')


if __name__ == '__main__':
    main()
