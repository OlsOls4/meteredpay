#!/usr/bin/env python3
"""Re-roll gate for the MeteredPay v3.4 pace fix (per take).

Gate (from the v3.3 pace diagnosis): a roll passes iff ALL three hold:
  1. speech-span wpm >= 145   (words = SCRIPT word count / span)
  2. median inter-word gap <= 0.45 s   (gaps > 0.05 s, Whisper tiny words)
  3. F0 std >= 15 Hz   (numpy autocorrelation tracker, /tmp/pace_analysis.py)

Usage: python3 gate_take.py <mp3> <script_word_count>
Expects <mp3>.words.json next to the mp3 (whisper_words33.py output).
Prints measurements + PASS/FAIL, exits 0 on pass, 1 on fail.
"""
import json
import os
import re
import subprocess
import sys

import numpy as np


def main():
    mp3, nwords = sys.argv[1], int(sys.argv[2])
    wj = json.load(open(mp3 + ".words.json"))
    words = wj["words"]
    span = words[-1]["e"] - words[0]["s"]
    wpm = nwords * 60.0 / span
    gaps = [round(b["s"] - a["e"], 2) for a, b in zip(words, words[1:])
            if b["s"] - a["e"] > 0.05]
    gap_med = float(np.median(gaps)) if gaps else 0.0
    out = subprocess.run(["python3", os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                                  "pace_analysis.py"), mp3],
                         capture_output=True, text=True, check=True).stdout
    m = re.search(r"F0: .*?std=(\d+)", out)
    f0_std = int(m.group(1)) if m else -1
    m2 = re.search(r"F0: median=(\d+)", out)
    f0_med = int(m2.group(1)) if m2 else -1
    ok_wpm = wpm >= 145
    ok_gap = gap_med <= 0.45
    ok_f0 = f0_std >= 15
    print(f"{mp3}: span={span:.2f}s wpm={wpm:.1f} "
          f"{'PASS' if ok_wpm else 'FAIL'} | gap_med={gap_med:.2f}s "
          f"(n={len(gaps)}, total={sum(gaps):.2f}s) "
          f"{'PASS' if ok_gap else 'FAIL'} | F0 med={f0_med} std={f0_std} "
          f"{'PASS' if ok_f0 else 'FAIL'} => "
          f"{'PASS' if (ok_wpm and ok_gap and ok_f0) else 'FAIL'}")
    sys.exit(0 if (ok_wpm and ok_gap and ok_f0) else 1)


if __name__ == "__main__":
    main()
