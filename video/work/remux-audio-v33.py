"""Rebuild the audio track of an assembled MeteredPay video (v3.3).

Same fix as remux-audio-v31.py (v3 Defect 2): assemble-v3.3.py
concatenates separately AAC-encoded clips with `-c copy`, so a
full-stream decode yields extra PCM past the container end and the
closing word can re-appear in the raw sample stream. Rebuild the audio
from the source takes in ONE AAC encode (same takes, same placements,
no TTS re-render) and mux it with the video stream copied untouched.

Placements (v3.3, Paloma, speed 90):
  2-min: A trimmed to its clip end 17.50; B @19.50; CDE @27.50;
         FGH @55.00; IJKLM @84.50. Total 120.035.
  teaser: tA: A 0-6.20; tB: B @6.20; tE: CDE from 17.14 @13.20;
          tJ: IJKLM 7.08-11.12 @22.20; tM silent. Total 30.041.

Usage: python3 remux-audio-v33.py <in.mp4> <out.mp4> <2min|teaser>
The takes come from video/work/narr3-paloma-ln/ (loudnorm'd v3.3 takes).
"""
import os
import subprocess
import sys

REPO = '/home/hatch/workspace/near-meteredpay/repo'
NARR = REPO + '/video/work/narr3-paloma-ln'


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


def build_audio(kind, tmp):
    """Build a single-encode AAC audio track; return its path."""
    cmd = ['ffmpeg', '-y', '-v', 'error']
    filt = []
    if kind == '2min':
        # (file, input -ss, input -t, delay ms). A is trimmed to its clip
        # end 17.50 (its file tail is trailing silence past the B boundary).
        spec = [
            ('intro-fallback-s90.mp3', None, 17.50, 0),
            ('take-b.mp3', None, None, 19500),
            ('take2-cde.mp3', None, None, 27500),
            ('take3-fgh.mp3', None, None, 55000),
            ('take4-ijklm.mp3', None, None, 84500),
        ]
        total = 120.035
    else:
        # Teaser placements (from assemble-v3.3.py, Paloma timings):
        # tA: A 0-6.20; tB: B @6.20; tE: CDE from 17.14 @13.20;
        # tJ: IJKLM 7.08-11.12 @22.20; tM silent.
        spec = [
            ('intro-fallback-s90.mp3', None, 6.20, 0),
            ('take-b.mp3', None, None, 6200),
            ('take2-cde.mp3', 17.14, None, 13200),
            ('take4-ijklm.mp3', 7.08, 4.04, 22200),
        ]
        total = 30.041
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
    # (longest input here ends 118.54 s / 26.24 s, short of the total).
    cmd += ['-filter_complex', ';'.join(filt), '-map', '[aout]',
            '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '2', tmp]
    run(cmd)
    return tmp


def main():
    inp, outp, kind = sys.argv[1], sys.argv[2], sys.argv[3]
    assert kind in ('2min', 'teaser'), kind
    tmp_a = f'/tmp/v33-remux-{kind}.m4a'
    tmp_o = outp + '.tmp.mp4'
    build_audio(kind, tmp_a)
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
