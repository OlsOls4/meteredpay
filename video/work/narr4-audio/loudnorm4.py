#!/usr/bin/env python3
"""Two-pass loudnorm (v3.1/v3.4 method) for the MeteredPay v4 chosen takes:
measure each take, then apply loudnorm I=-25 LUFS, TP=-2, LRA=11 with
measured values and linear=true (pure gain, no dynamics, no time-stretch).
Output is WAV (48 kHz stereo) in narr4-audio/ln-wav/ — lossless
intermediates for the single-encode assembly. Then verify the output
integrated loudness of each take. Words JSONs are copied alongside
(timings are identical; loudnorm is gain-only).
"""
import json
import os
import shutil
import subprocess

WORK = "/home/hatch/workspace/near-meteredpay/repo/video/work"
SRC = WORK + "/narr4-audio"
DST = SRC + "/ln-wav"
# (source mp3 in narr4-audio, final wav name)
TAKES = [
    ("take-a-s100-r1.mp3", "take-a.wav"),
    ("take-b-v3.mp3", "take-b.wav"),
    ("take-cde-s100-r1.mp3", "take-cde.wav"),
    ("take-fgh-v5.mp3", "take-fgh.wav"),
    ("take-i-caps.mp3", "take-i.wav"),
    ("take-j-lower-cut2.mp3", "take-j.wav"),
    ("take-klm-caps.mp3", "take-klm.wav"),
]
os.makedirs(DST, exist_ok=True)


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("FAILED:", " ".join(cmd))
        print(r.stdout[-2000:])
        print(r.stderr[-2000:])
        raise SystemExit(1)
    return r


def measure(path):
    r = run(["ffmpeg", "-i", path, "-af",
             "loudnorm=I=-25:TP=-2:LRA=11:print_format=json",
             "-f", "null", "-"])
    j = r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1]
    return json.loads(j)


def loudness(path):
    return float(measure(path)["input_i"])


for src, fn in TAKES:
    m = measure(f"{SRC}/{src}")
    print(f"{fn}: input I={m['input_i']} TP={m['input_tp']} "
          f"LRA={m['input_lra']} thresh={m['input_thresh']} "
          f"offset={m['target_offset']}")
    filt = ("loudnorm=I=-25:TP=-2:LRA=11"
            f":measured_I={m['input_i']}:measured_TP={m['input_tp']}"
            f":measured_LRA={m['input_lra']}"
            f":measured_thresh={m['input_thresh']}"
            f":offset={m['target_offset']}:linear=true")
    run(["ffmpeg", "-y", "-v", "error", "-i", f"{SRC}/{src}", "-af", filt,
         "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", f"{DST}/{fn}"])
    out_i = loudness(f"{DST}/{fn}")
    print(f"  -> {DST}/{fn}: output I={out_i:.2f} LUFS, "
          f"{os.path.getsize(f'{DST}/{fn}')} B")
    assert abs(out_i - (-25)) < 1.0, f"{fn} loudness {out_i} off target"
    shutil.copy(f"{SRC}/{src}.words.json", f"{DST}/{fn}.words.json")
print("done")
