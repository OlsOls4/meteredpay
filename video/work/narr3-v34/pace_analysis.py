#!/usr/bin/env python3
"""Pitch + dynamics + gap analysis for the MeteredPay v3.4 pace fix.

Copied from /tmp/pace_analysis.py (v3.3 pace diagnosis, 13 Nov 2026) into
the repo so a VM restart cannot wipe it. Decodes mp3 via ffmpeg to mono
16k float, then:
- F0 by autocorrelation (50-400 Hz) on 30 ms windows, 10 ms hop; voiced = peak corr > 0.5
- RMS / peak / crest factor
- inter-word gaps from a sibling .words.json (same basename) if present.
Usage: python3 pace_analysis.py <mp3> [<mp3> ...]
"""
import json, os, subprocess, sys
import numpy as np

SR = 16000

def decode(path):
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1",
                        "-ar", str(SR), "-f", "f32le", "-"],
                       capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32)

def pitch_track(x, sr=SR):
    win = int(0.030 * sr); hop = int(0.010 * sr)
    f0s = []
    for start in range(0, len(x) - win, hop):
        seg = x[start:start + win]
        seg = seg - seg.mean()
        if np.sqrt((seg ** 2).mean()) < 0.02:
            continue
        c = np.correlate(seg, seg, mode="full")[win - 1:]
        c = c / (c[0] + 1e-12)
        lo, hi = int(sr / 400), int(sr / 50)
        seg_c = c[lo:hi]
        k = int(np.argmax(seg_c)) + lo
        if c[k] < 0.5:
            continue
        # parabolic interpolation
        if 0 < k < len(c) - 1:
            a, b, cc = c[k - 1], c[k], c[k + 1]
            shift = 0.5 * (a - cc) / (a - 2 * b + cc + 1e-12)
            k = k + shift
        f0s.append(sr / k)
    return np.array(f0s)

def gaps(path):
    jpath = path + ".words.json"
    if not os.path.exists(jpath):
        return None
    d = json.load(open(jpath))
    words = d["words"]
    gs = []
    for a, b in zip(words, words[1:]):
        g = b["s"] - a["e"]
        if g > 0.05:
            gs.append(round(g, 2))
    return gs

for path in sys.argv[1:]:
    x = decode(path)
    dur = len(x) / SR
    f0 = pitch_track(x)
    rms = float(np.sqrt((x ** 2).mean()))
    peak = float(np.abs(x).max())
    crest = 20 * np.log10(peak / rms) if rms > 0 else 0
    gs = gaps(path)
    print(f"== {os.path.basename(path)}  dur={dur:.2f}s")
    if len(f0):
        print(f"   F0: median={np.median(f0):.0f} mean={np.mean(f0):.0f} "
              f"std={np.std(f0):.0f} p10={np.percentile(f0,10):.0f} "
              f"p90={np.percentile(f0,90):.0f} Hz  voiced_frames={len(f0)}")
    print(f"   RMS={rms:.4f} peak={peak:.3f} crest={crest:.1f} dB")
    if gs:
        print(f"   word-gaps n={len(gs)} median={np.median(gs):.2f}s "
              f"mean={np.mean(gs):.2f}s max={max(gs):.2f}s "
              f"total={sum(gs):.2f}s  >0.5s: {sum(1 for g in gs if g>0.5)}")
        print(f"   gaps: {gs}")
