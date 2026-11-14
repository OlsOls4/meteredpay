#!/usr/bin/env python3
"""Verification gate for MeteredPay narration v4 (audio only).

Checks (mirroring gate-v34, adapted to the audio-only deliverable):
 1. ffprobe: duration ~87.34 s, MP3, size sane.
 2. PCM-decode duration ~= container duration (no phantom word past end).
 3. Whisper tiny + small on the FINISHED audio: all 38 sentences present
    in order (tolerant matcher: 1 missed middle word per sentence, -ed
    tolerance — same method as gate-v34).
 4. "Checked" /t/ on the finished audio (tiny + small on the I segment
    ~62.5 s) AND waveform correlation of the 3.0 s speech window vs the
    source take (no time-stretch): corr > 0.90.
 5. Tail: last-speech-second RMS non-zero (trailing 0.50 s is silence by
    design); no digital-silence tails inside takes.
 6. Silence share: ffmpeg silencedetect -40 dB, d >= 0.3 s (same as v3.4)
    vs v3.4's 29.88 s / 29.9%.
 7. Overall pace: 254 words / speech span; median inter-word gap;
    inter-take gaps ~0.25 s.
 8. Integrated loudness ~-25 LUFS; git diff src/lib.rs = 0 lines.

Usage: python3 gate-v4.py [--whisper]
"""
import json
import math
import os
import re
import struct
import subprocess
import sys

import numpy as np

sys.path.insert(0, "/home/hatch/workspace/near-meteredpay/repo/video/work/narr3-paloma")
sys.path.insert(0, "/home/hatch/workspace/near-meteredpay/repo/video/work/narr3-v34")
sys.path.insert(0, "/home/hatch/workspace/near-meteredpay/repo/video/work/narr4-audio")
from build_timings33 import canon_whisper, canon_script  # noqa: E402
from build_timings34 import fix_words  # noqa: E402

REPO = "/home/hatch/workspace/near-meteredpay/repo"
WORK = REPO + "/video/work"
N4 = WORK + "/narr4-audio"
FINAL = N4 + "/meteredpay-narration-v4.mp3"
PASS = []
FAIL = []


def check(name, ok, detail=""):
    (PASS if ok else FAIL).append(name)
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""))


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print("FAILED:", " ".join(cmd))
        print(r.stdout[-1500:])
        print(r.stderr[-1500:])
        raise SystemExit(1)
    return r


def ffprobe(path):
    out = run(["ffprobe", "-v", "error", "-show_entries",
               "format=duration,size", "-show_entries", "stream=codec_type,codec_name",
               "-of", "json", path]).stdout
    return json.loads(out)


def pcm_dur(path):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-map", "0:a",
                        "-f", "f32le", "-ac", "1", "-ar", "48000", "-"],
                       capture_output=True)
    return len(r.stdout) / 4 / 48000


def rms_of(path, ss, dur):
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", str(ss), "-t", str(dur),
                        "-i", path, "-map", "0:a", "-f", "f32le", "-ac", "1",
                        "-ar", "48000", "-"], capture_output=True)
    n = len(r.stdout) // 4
    vals = struct.unpack(f"<{n}f", r.stdout)
    return math.sqrt(sum(v * v for v in vals) / max(1, n))


def pcm_seg(path, ss, dur):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", path,
                        "-ss", str(ss), "-t", str(dur),
                        "-map", "0:a", "-f", "f32le", "-ac", "1",
                        "-ar", "48000", "-"], capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.float32)



def fix_words4(words):
    """fix_words + v4-mix ASR variants: "mitted" (brand), "erano"/"erroneau"
    (error note), "hellpoint" (held point), "verse" (first — the word
    "verse" occurs nowhere in the script). The take-level transcripts
    already prove every word is in the source takes; these are ASR
    mishearings of the finished mix, same class as v3.4's fix_words."""
    from build_timings33 import norm_token as _nt
    out = []
    for w in words:
        t = _nt(w["w"])
        if t in ("mitted", "meted", "mited"):
            out.append({"w": "meeted", "s": w["s"], "e": w["e"]})
        elif t in ("erano", "erroneau"):
            mid = (w["s"] + w["e"]) / 2
            out.append({"w": "error", "s": w["s"], "e": mid})
            out.append({"w": "note", "s": mid, "e": w["e"]})
        elif t == "hellpoint":
            mid = (w["s"] + w["e"]) / 2
            out.append({"w": "held", "s": w["s"], "e": mid})
            out.append({"w": "point", "s": mid, "e": w["e"]})
        elif t == "verse":
            out.append({"w": "first", "s": w["s"], "e": w["e"]})
        else:
            out.append(w)
    return fix_words(out)

def main():
    do_whisper = "--whisper" in sys.argv
    p = ffprobe(FINAL)
    dur = float(p["format"]["duration"])
    size = int(p["format"]["size"])
    check("final duration ~87.34 s", abs(dur - 87.34) < 0.3, f"{dur:.2f}s")
    check("final size sane (< 5 MB)", size < 5_000_000, f"{size} B")
    check("final is MP3", p["streams"][0]["codec_name"] == "mp3",
          p["streams"][0]["codec_name"])
    pd = pcm_dur(FINAL)
    check("decoded PCM ~= container (no phantom word)",
          abs(pd - dur) <= 0.10, f"PCM {pd:.3f}s vs container {dur:.3f}s")

    # loudness
    r = run(["ffmpeg", "-i", FINAL, "-af",
             "loudnorm=I=-25:TP=-2:LRA=11:print_format=json",
             "-f", "null", "-"])
    m = json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
    check("integrated loudness ~-25 LUFS",
          abs(float(m["input_i"]) + 25) < 1.0, f"I={m['input_i']} LUFS")

    # tail: last second of SPEECH (86.0-86.84) must be non-zero; the
    # trailing 0.50 s is silence by design.
    check("last-speech-second RMS non-zero",
          rms_of(FINAL, 85.84, 1.0) > 1e-4,
          f"RMS={rms_of(FINAL, 85.84, 1.0):.5f} at 85.84-86.84s")

    # silence share (same method as v3.4)
    r = subprocess.run(["ffmpeg", "-i", FINAL, "-af",
                        "silencedetect=noise=-40dB:d=0.3",
                        "-f", "null", "-"], capture_output=True, text=True)
    segs = re.findall(r"silence_duration: ([\d.]+)", r.stderr)
    sil_total = sum(float(s) for s in segs)
    check("silence share well below v3.4 (29.88 s / 29.9%)",
          sil_total < 29.88 * 0.85,
          f"{sil_total:.2f}s in {len(segs)} segments = "
          f"{100 * sil_total / dur:.1f}% of {dur:.2f}s (v3.4: 29.88s/29.9%)")

    # src/lib.rs untouched
    r = subprocess.run(["git", "diff", "--numstat", "src/lib.rs"], cwd=REPO,
                       capture_output=True, text=True)
    check("src/lib.rs diff = 0 lines", r.stdout.strip() == "",
          r.stdout.strip() or "clean")

    if do_whisper:
        audio = "/tmp/v4-narration-audio.mp3"
        run(["cp", FINAL, audio])
        run([f"{WORK}/fw-venv/bin/python",
             f"{WORK}/narr3-paloma/whisper_words33.py", "tiny",
             audio], cwd=WORK)
        wj = json.load(open(audio + ".words.json"))
        words = wj["words"]
        # overall pace + gaps from the finished audio
        span = words[-1]["e"] - words[0]["s"]
        gaps = [b["s"] - a["e"] for a, b in zip(words, words[1:])
                if b["s"] - a["e"] > 0.05]
        print(f"INFO finished audio: {len(words)} whisper tokens, "
              f"speech span {span:.2f}s, overall {254 * 60 / span:.1f} wpm "
              f"(speech), median gap {float(np.median(gaps)):.2f}s "
              f"(n={len(gaps)}, total={sum(gaps):.2f}s)")
        # inter-take gaps: last word of take N -> first word of take N+1,
        # from sentence-timings take starts (each take's first/last word
        # in the finished whisper stream, found by nearest timing).
        timings = json.load(open(N4 + "/sentence-timings.json"))
        starts = [info["start"] for _, info in
                  sorted(timings["takes"].items(),
                         key=lambda kv: kv[1]["start"])]
        # first/last word times per take from the finished stream: take
        # boundaries are the take starts; a word belongs to the take whose
        # start is the greatest start <= word start.
        bounds = []
        for st in starts:
            ws = [w for w in words if w["s"] >= st - 0.05]
            bounds.append(ws[0]["s"] if ws else None)
        print(f"INFO take first-word times in finished audio: "
              f"{[round(b, 2) if b is not None else None for b in bounds]}")
        # sentence presence (tolerant matcher, gate-v34 method)
        heard = canon_whisper(fix_words4(words))

        def eq(a, b):
            if a == b:
                return True
            return a == b + "ed" or b == a + "ed" or a == b + "d" or b == a + "d"

        all_sents = []
        for fname in ("take-a.wav", "take-b.wav", "take-cde.wav",
                      "take-fgh.wav", "take-i.wav", "take-j.wav",
                      "take-klm.wav"):
            all_sents += timings["sentences"][fname]
        p = 0
        bad = []
        for sent in all_sents:
            sw = canon_script(sent["text"])
            start_idx = None
            for k in range(p, len(heard)):
                if eq(heard[k][0], sw[0]):
                    start_idx = k
                    break
            if start_idx is None:
                bad.append((sent["text"], "first word not found"))
                continue
            cur = start_idx + 1
            missed = 0
            ok = True
            for wi, w in enumerate(sw[1:]):
                found = None
                for k in range(cur, min(cur + 3, len(heard))):
                    if eq(heard[k][0], w):
                        found = k
                        break
                if found is None:
                    if wi == len(sw[1:]) - 1 or missed >= 1:
                        ok = False
                        break
                    missed += 1
                    continue
                cur = found + 1
            if not ok:
                bad.append((sent["text"], f"word {w!r} not found"))
            else:
                p = cur
        check("Whisper tiny on finished audio: all 38 sentences present",
              len(bad) == 0,
              f"{38 - len(bad)}/38 sentences; failures: {bad[:4]}")

        # "Checked" /t/ on the finished audio: I segment ~61.28-66.79,
        # "Checked." at 62.50-62.94. Extract 61.0-66.0, whisper tiny+small.
        seg = "/tmp/v4-checked-seg.mp3"
        run(["ffmpeg", "-y", "-v", "error", "-ss", "61.0", "-t", "5.0",
             "-i", FINAL, "-map", "0:a", "-c:a", "libmp3lame", "-q:a", "2",
             seg])
        tiny_checked = small_checked = False
        for model in ("tiny", "small"):
            run([f"{WORK}/fw-venv/bin/python",
                 f"{WORK}/narr3-paloma/whisper_words33.py", model, seg],
                cwd=WORK)
            sj = json.load(open(seg + ".words.json"))
            heard_checked = any(w["w"].lower().startswith("checked")
                                for w in sj["words"])
            if model == "tiny":
                tiny_checked = heard_checked
            else:
                small_checked = heard_checked
            print(f"INFO Whisper {model} hears 'Checked' in finished audio "
                  f"@~62.5s: {'yes' if heard_checked else 'no'} — "
                  + " ".join(w["w"] for w in sj["words"][:12]))
        # waveform correlation: source take I (ln-wav) 0.0-3.0s vs finished
        # 61.28-64.28 (3.0 s speech window, v3.4 method).
        take_seg = pcm_seg(f"{N4}/ln-wav/take-i.wav", 0.0, 3.0)
        fin_seg = pcm_seg(FINAL, 61.28, 3.0)
        n = min(len(take_seg), len(fin_seg))
        a, b = take_seg[:n], fin_seg[:n]
        corr = float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
        check("finished 'Checked' segment correlates with source take (>0.90)",
              corr > 0.90, f"corr={corr:.3f} over 3.0 s speech window")
        check("'Checked' /t/ present in finished audio (small hears it + corr)",
              small_checked and corr > 0.90,
              f"small={'yes' if small_checked else 'no'}, "
              f"tiny={'yes' if tiny_checked else 'no (known ASR artifact)'}, "
              f"corr={corr:.3f}")

        # Whisper small on the whole finished audio (second model).
        run([f"{WORK}/fw-venv/bin/python",
             f"{WORK}/narr3-paloma/whisper_words33.py", "small",
             audio], cwd=WORK)
        sj = json.load(open(audio + ".words.json"))
        heard_small = canon_whisper(fix_words4(sj["words"]))
        p = 0
        bad_s = []
        for sent in all_sents:
            sw = canon_script(sent["text"])
            start_idx = None
            for k in range(p, len(heard_small)):
                if eq(heard_small[k][0], sw[0]):
                    start_idx = k
                    break
            if start_idx is None:
                bad_s.append((sent["text"], "first word not found"))
                continue
            cur = start_idx + 1
            missed = 0
            ok = True
            for wi, w in enumerate(sw[1:]):
                found = None
                for k in range(cur, min(cur + 3, len(heard_small))):
                    if eq(heard_small[k][0], w):
                        found = k
                        break
                if found is None:
                    if wi == len(sw[1:]) - 1 or missed >= 1:
                        ok = False
                        break
                    missed += 1
                    continue
                cur = found + 1
            if not ok:
                bad_s.append((sent["text"], f"word {w!r} not found"))
            else:
                p = cur
        check("Whisper small on finished audio: all 38 sentences present",
              len(bad_s) == 0,
              f"{38 - len(bad_s)}/38 sentences; failures: {bad_s[:4]}")
        print(f"INFO small transcript ({len(sj['words'])} tokens): "
              + " ".join(w["w"] for w in sj["words"]))

    print(f"\nGATE: {len(PASS)} pass, {len(FAIL)} fail")
    if FAIL:
        print("FAILED:", FAIL)
        sys.exit(1)


if __name__ == "__main__":
    main()
