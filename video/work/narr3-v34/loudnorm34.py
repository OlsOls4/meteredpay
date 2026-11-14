#!/usr/bin/env python3
"""Two-pass loudnorm (v3.1 method) for the MeteredPay v3.4 chosen takes:
measure each take, then apply loudnorm I=-25 LUFS, TP=-2, LRA=11 with
measured values and linear=true (pure gain, no dynamics, no time-stretch).
Output to narr3-v34-ln/ under the final assembly filenames. Then verify
the output integrated loudness of each take.
"""
import json
import os
import shutil
import subprocess

WORK = "/home/hatch/workspace/near-meteredpay/repo/video/work"
DST = WORK + "/narr3-v34-ln"
# (source path, final filename in DST)
TAKES = [
    (WORK + "/narr3-v34/take-a-v2.mp3", "intro-s100.mp3"),
    (WORK + "/narr3-pace/paloma-b-s100.mp3", "take-b-s100.mp3"),
    (WORK + "/narr3-v34/take-cde-v6.mp3", "take-cde-v6.mp3"),
    (WORK + "/narr3-v34/take-fgh-v3.mp3", "take-fgh-v3.mp3"),
    (WORK + "/narr3-v34/take-ijklm-v6.mp3", "take-ijklm-v6.mp3"),
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
    m = measure(src)
    print(f"{fn}: input I={m['input_i']} TP={m['input_tp']} "
          f"LRA={m['input_lra']} thresh={m['input_thresh']} "
          f"offset={m['target_offset']}")
    filt = ("loudnorm=I=-25:TP=-2:LRA=11"
            f":measured_I={m['input_i']}:measured_TP={m['input_tp']}"
            f":measured_LRA={m['input_lra']}"
            f":measured_thresh={m['input_thresh']}"
            f":offset={m['target_offset']}:linear=true")
    run(["ffmpeg", "-y", "-v", "error", "-i", src, "-af", filt,
         "-c:a", "libmp3lame", "-q:a", "2", f"{DST}/{fn}"])
    out_i = loudness(f"{DST}/{fn}")
    print(f"  -> {DST}/{fn}: output I={out_i:.2f} LUFS, "
          f"{os.path.getsize(f'{DST}/{fn}')} B")
    # copy the words JSON alongside (timings are identical; loudnorm is gain-only)
    shutil.copy(f"{src}.words.json", f"{DST}/{fn}.words.json")
print("done")
