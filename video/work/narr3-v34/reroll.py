#!/usr/bin/env python3
"""Re-roll driver for the MeteredPay v3.4 pace fix.

For one take: render up to MAX_ROLLS fresh rolls at speed 100 with
Paloma (avocado_v2:paloma), Whisper-transcribe each (tiny), gate each
(gate_take.py). Keep the FIRST roll passing all three gate criteria;
stop as soon as one passes. Writes a JSON roll log next to the renders.

Usage: python3 reroll.py <take_key> <text_file> <script_words> <outdir> [max_rolls]
  take_key: a | cde | fgh | ijklm   (b is reused, not re-rolled)
  outdir: e.g. /home/.../video/work/narr3-v34
Renders land as <outdir>/take-<key>-s100-r<N>.mp3 (+ .words.json).
The chosen roll is ALSO copied to <outdir>/take-<key>-s100-chosen.mp3.
Voice field on every tts return is checked == avocado_v2:paloma.
"""
import json
import os
import shutil
import subprocess
import sys

WORK = "/home/hatch/workspace/near-meteredpay/repo/video/work"
VOICE = "avocado_v2:paloma"
MAX_ROLLS = 3


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print("FAILED:", " ".join(cmd))
        print(r.stdout[-2000:])
        print(r.stderr[-2000:])
        raise SystemExit(1)
    return r


def main():
    key, text_file, nwords, outdir = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
    max_rolls = int(sys.argv[5]) if len(sys.argv) > 5 else MAX_ROLLS
    text = open(text_file, encoding="utf-8").read().strip()
    log = {"take": key, "voice": VOICE, "speed": 100, "rolls": [], "chosen": None}
    for i in range(1, max_rolls + 1):
        mp3 = os.path.abspath(f"{outdir}/take-{key}-s100-r{i}.mp3")
        print(f"--- take {key} roll {i}: tts speak (speed 100) ---", flush=True)
        r = run(["/opt/hatch/bin/tts", "speak", "--voice", VOICE,
                 "--speed", "100", "--text-stdin", "--output", mp3],
                input=text)
        print("tts stdout:", r.stdout.strip()[:600])
        print("tts stderr:", r.stderr.strip()[:300])
        assert VOICE in (r.stdout + r.stderr), \
            f"voice field {VOICE!r} not in tts output for roll {i}"
        print(f"--- take {key} roll {i}: whisper tiny ---", flush=True)
        run([f"{WORK}/fw-venv/bin/python",
             f"{WORK}/narr3-paloma/whisper_words33.py", "tiny", mp3], cwd=WORK)
        g = subprocess.run(["python3", f"{outdir}/gate_take.py", mp3, str(nwords)],
                           capture_output=True, text=True)
        print(g.stdout.strip())
        roll = {"roll": i, "file": os.path.basename(mp3),
                "gate_line": g.stdout.strip(), "passed": g.returncode == 0}
        log["rolls"].append(roll)
        if g.returncode == 0:
            chosen = f"{outdir}/take-{key}-s100-chosen.mp3"
            shutil.copy(mp3, chosen)
            shutil.copy(mp3 + ".words.json", chosen + ".words.json")
            log["chosen"] = os.path.basename(mp3)
            print(f"take {key}: roll {i} PASSES — chosen, stopping.")
            break
        print(f"take {key}: roll {i} fails gate.")
    with open(f"{outdir}/take-{key}-rolls.json", "w", encoding="utf-8") as f:
        json.dump(log, f, indent=1)
    print(json.dumps(log, indent=1))
    if log["chosen"] is None:
        print(f"take {key}: NO roll passed in {max_rolls} rolls — "
              f"contingency cuts required before re-rolling.")
        sys.exit(2)


if __name__ == "__main__":
    main()
