#!/usr/bin/env python3
"""Single render + whisper + gate for narr4-audio variants.

Usage: python3 render_one.py <text_file> <out_mp3> <script_words>
Renders once (Paloma, speed 100), Whisper tiny, gates. Exits 0 on
gate PASS, 1 on FAIL. Asserts voice == avocado_v2:paloma in tts output.
Does NOT overwrite an existing out_mp3 (caller picks a fresh name).
"""
import json
import os
import subprocess
import sys

WORK = "/home/hatch/workspace/near-meteredpay/repo/video/work"
VOICE = "avocado_v2:paloma"


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print("FAILED:", " ".join(cmd))
        print(r.stdout[-2000:])
        print(r.stderr[-2000:])
        raise SystemExit(1)
    return r


def main():
    text_file, out_mp3, nwords = sys.argv[1], sys.argv[2], int(sys.argv[3])
    out_mp3 = os.path.abspath(out_mp3)
    text = open(text_file, encoding="utf-8").read().strip()
    assert not os.path.exists(out_mp3), f"{out_mp3} already exists"
    print(f"--- render {out_mp3} from {text_file} ---", flush=True)
    r = run(["/opt/hatch/bin/tts", "speak", "--voice", VOICE,
             "--speed", "100", "--text-stdin", "--output", out_mp3],
            input=text)
    print("tts stdout:", r.stdout.strip()[:400])
    assert VOICE in (r.stdout + r.stderr), "voice field mismatch"
    run([f"{WORK}/fw-venv/bin/python",
         f"{WORK}/narr3-paloma/whisper_words33.py", "tiny", out_mp3], cwd=WORK)
    g = subprocess.run(["python3",
                        os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                     "gate_take.py"),
                        out_mp3, str(nwords)], capture_output=True, text=True)
    print(g.stdout.strip())
    sys.exit(0 if g.returncode == 0 else 1)


if __name__ == "__main__":
    main()
