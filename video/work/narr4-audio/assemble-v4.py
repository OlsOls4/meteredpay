#!/usr/bin/env python3
"""Assemble MeteredPay narration v4 — COMPLETE audio redo (Paloma, speed 100).

Seven gated takes (IJKLM split into I + J + KLM after the whole take
failed 3 rolls; J carries contingency cut #1, "Balance untouched."):
  A (43w) | B (15w) | CDE (62w) | FGH (64w) | I (14w) | J (18w, cut) |
  KLM (38w)  = 254 spoken words (256-word script minus the 2-word cut).
Takes placed whole, 0.25 s between takes (speech end -> next speech
start), 0.50 s trailing. Total 87.34 s. No time-stretch anywhere:
loudnorm is gain-only (linear=true), assembly is trim + concat only.
Final file gets its own two-pass loudnorm to I=-25 LUFS (linear=true).

Also writes sentence-timings.json (v3.4 format, 38 cues) for the video
build, and a transcript. Take starts (speech): A 0.00, B 14.51,
CDE 19.42, FGH 41.17, I 61.28, J 66.79, KLM 72.68; last word ends 86.84.
"""
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, "/home/hatch/workspace/near-meteredpay/repo/video/work/narr3-paloma")
sys.path.insert(0, "/home/hatch/workspace/near-meteredpay/repo/video/work/narr3-v34")
from build_timings33 import match_take, norm_token  # noqa: E402
from build_timings34 import fix_words  # noqa: E402


def fix_words4(words):
    """fix_words + two extra small-model merges seen in the v4 takes:
    "erroneau" -> error + note, "hellpoint" -> held + point (each split
    across the token's time span). Everything else is fix_words as-is."""
    out = []
    for w in words:
        t = norm_token(w["w"])
        if t in ("erroneau", "hellpoint"):
            a, b = ("error", "note") if t == "erroneau" else ("held", "point")
            mid = (w["s"] + w["e"]) / 2
            out.append({"w": a, "s": w["s"], "e": mid})
            out.append({"w": b, "s": mid, "e": w["e"]})
        else:
            out.append(w)
    return fix_words(out)

WORK = "/home/hatch/workspace/near-meteredpay/repo/video/work"
N4 = WORK + "/narr4-audio"
LNW = N4 + "/ln-wav"
OUT_MP3 = N4 + "/meteredpay-narration-v4.mp3"
OUT_TIMINGS = N4 + "/sentence-timings.json"
OUT_TRANSCRIPT = N4 + "/meteredpay-narration-v4-transcript.txt"

GAP = 0.25
TRAIL = 0.50

# (wav in ln-wav, shots, span words.json (tiny), match words.json,
#  sentences, script words). Spans (assembly offsets) always come from
#  tiny, so inter-take gaps are exactly 0.25 s by the gated measurement.
#  Sentence matching uses small for A/CDE/FGH/I (tiny's ASR is too lossy
#  there: 'Mitted Pay', 'bypass'/'cell', 'erroneau'/'hellpoint', 'check'
#  for 'checked') and tiny for B/J/KLM (clean transcripts).
TAKES = [
    ("take-a.wav", "A", f"{N4}/take-a-s100-r1.mp3.words.json",
     f"{N4}/take-a-s100-r1.mp3.words-small.json", [
        "This is MeteredPay, on testnet.",
        "Agents pay for every call — even the ones that fail.",
        "Say one in ten fails: that's money paid for work that never happened.",
        "MeteredPay only pays when the work checks out.",
        "Watch what happens when a call fails.",
    ], 43),
    ("take-b.wav", "B", f"{N4}/take-b-v3.mp3.words.json",
     f"{N4}/take-b-v3.mp3.words.json", [
        "Watch this first.",
        "A call fails — and the held money comes straight back.",
        "Deducted: zero.",
    ], 15),
    ("take-cde.wav", "CDE", f"{N4}/take-cde-s100-r1.mp3.words.json",
     f"{N4}/take-cde-s100-r1.mp3.words-small.json", [
        "The buyer puts down half a NEAR, and caps spending at point two.",
        "It can never spend past it.",
        "One document to check.",
        "The seller validates it against a schema — twelve words, eighty-nine characters.",
        "Valid — against the schema.",
        "First call.",
        "The check comes back valid.",
        "The buyer checks the receipt — same fingerprint, real signature.",
        "Only then does the contract take point one.",
    ], 62),
    ("take-fgh.wav", "FGH", f"{N4}/take-fgh-v5.mp3.words.json",
     f"{N4}/take-fgh-v5.mp3.words-small.json", [
        "Now a call fails.",
        "The seller says so itself — error note, signed.",
        "The buyer files the claim, and the held point one comes back.",
        "Held, never taken.",
        "Deducted: zero.",
        "No answer in thirty seconds?",
        "The buyer's wait — the contract gives six hundred.",
        "Same deal: the money comes back.",
        "Then someone fiddles with a receipt — one letter changed.",
        "The buyer catches it, and pays nothing.",
    ], 64),
    ("take-i.wav", "I", f"{N4}/take-i-caps.mp3.words.json",
     f"{N4}/take-i-caps.mp3.words-small.json", [
        "Second good check.",
        "Checked.",
        "The same way — that's point two spent.",
        "The limit, reached.",
    ], 14),
    ("take-j.wav", "J", f"{N4}/take-j-lower-cut2.mp3.words.json",
     f"{N4}/take-j-lower-cut2.mp3.words.json", [
        "One more call — and the contract says no before any money moves.",
        "Over budget, refused, on the record.",
        # "Balance untouched." CUT (contingency cut #1) — not in the take.
    ], 18),
    ("take-klm.wav", "KLM", f"{N4}/take-klm-caps.mp3.words.json",
     f"{N4}/take-klm-caps.mp3.words.json", [
        "One honest limit: this protects the buyer, not the seller.",
        "A dishonest buyer could still claim a failure.",
        "The buyer checks every receipt.",
        "The contract only pays on one the buyer has signed.",
        "MeteredPay. Failed call? Deducted: zero.",
    ], 38),
]


def run(cmd, **kw):
    r = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if r.returncode != 0:
        print("FAILED:", " ".join(cmd))
        print(r.stdout[-2000:])
        print(r.stderr[-2000:])
        raise SystemExit(1)
    return r


def main():
    # --- sentence timings from the source takes (take-relative) ---
    takes, sentences, total_words = {}, {}, 0
    spans = []
    for fname, shots, span_path, match_path, sents, nwords in TAKES:
        span_w = json.load(open(span_path))["words"]
        span = span_w[-1]["e"] - span_w[0]["s"]
        spans.append(span)
        # Sentence matching: small-model words where tiny's ASR is too lossy
        # (see TAKES header); "Checked." in take I is heard by small
        # (1.22-1.66 s, 0.44 s) while tiny renders it "check".
        words = json.load(open(match_path))["words"]
        sent_dicts = [{"text": t} for t in sents]
        matched, used, tot = match_take(sent_dicts, fix_words4(words))
        print(f"{fname}: {len(matched)} sentences, used {used}/{tot} whisper tokens, span={span:.2f}s")
        for m in matched:
            print(f"  {m['start']:6.2f}-{m['end']:6.2f}  {m['text']}")
        for a, b in zip(matched, matched[1:]):
            assert b["start"] >= a["end"] - 0.05, f"overlap {a} vs {b}"
        takes[fname] = {"shots": shots, "start": 0.0}
        sentences[fname] = matched
        total_words += nwords
    total_cues = sum(len(v) for v in sentences.values())
    print(f"total cues={total_cues}, total words={total_words}")
    assert total_cues == 38, total_cues
    assert total_words == 254, total_words

    # --- take starts: 0.25 s speech-to-speech gaps, 0.50 s trailing ---
    starts, t = [], 0.0
    for i, span in enumerate(spans):
        starts.append(round(t, 2))
        t += span + (GAP if i < len(spans) - 1 else TRAIL)
    total_dur = round(t, 2)
    print("take starts:", starts, "total:", total_dur)
    for (fname, *_), st in zip(TAKES, starts):
        takes[fname]["start"] = st
    json.dump({"voice": "avocado_v2:paloma", "speed": 100,
               "takes": takes, "sentences": sentences},
              open(OUT_TIMINGS, "w"), indent=1)
    print("wrote", OUT_TIMINGS)

    # --- assemble: trim each loudnorm'd wav to [0, span+gap] and concat ---
    trim_ends = [round(s + (GAP if i < len(spans) - 1 else TRAIL), 2)
                 for i, s in enumerate(spans)]
    filt_parts, concat_inputs = [], []
    for i, (fname, *_) in enumerate(TAKES):
        filt_parts.append(f"[{i}:a]atrim=0:{trim_ends[i]}[a{i}]")
        concat_inputs.append(f"[a{i}]")
    filt = ";".join(filt_parts) + ";" + "".join(concat_inputs) + \
        f"concat=n={len(TAKES)}:v=0:a=1[aout]"
    assembled = N4 + "/assembled-v4.wav"
    cmd = ["ffmpeg", "-y", "-v", "error"]
    for fname, *_ in TAKES:
        cmd += ["-i", f"{LNW}/{fname}"]
    cmd += ["-filter_complex", filt, "-map", "[aout]",
            "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", assembled]
    run(cmd)
    print("assembled", assembled, f"{os.path.getsize(assembled)} B")

    # --- final two-pass loudnorm to -25 LUFS (linear=true, gain-only) ---
    def measure(path):
        r = run(["ffmpeg", "-i", path, "-af",
                 "loudnorm=I=-25:TP=-2:LRA=11:print_format=json",
                 "-f", "null", "-"])
        j = r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1]
        return json.loads(j)
    m = measure(assembled)
    print(f"assembled: input I={m['input_i']} TP={m['input_tp']} "
          f"LRA={m['input_lra']} thresh={m['input_thresh']} "
          f"offset={m['target_offset']}")
    filt2 = ("loudnorm=I=-25:TP=-2:LRA=11"
             f":measured_I={m['input_i']}:measured_TP={m['input_tp']}"
             f":measured_LRA={m['input_lra']}"
             f":measured_thresh={m['input_thresh']}"
             f":offset={m['target_offset']}:linear=true")
    run(["ffmpeg", "-y", "-v", "error", "-i", assembled, "-af", filt2,
         "-c:a", "libmp3lame", "-q:a", "2", OUT_MP3])
    out_i = float(measure(OUT_MP3)["input_i"])
    dur = float(run(["ffprobe", "-v", "error", "-show_entries",
                     "format=duration", "-of", "csv=p=0",
                     OUT_MP3]).stdout.strip())
    print(f"FINAL: {OUT_MP3}: {dur:.2f}s, I={out_i:.2f} LUFS, "
          f"{os.path.getsize(OUT_MP3)} B")
    assert abs(dur - total_dur) < 0.15, (dur, total_dur)
    assert abs(out_i - (-25)) < 1.0, out_i

    # --- transcript ---
    cues = []
    for fname, info in takes.items():
        for s in sentences[fname]:
            cues.append((round(info["start"] + s["start"], 2),
                         round(info["start"] + s["end"], 2), s["text"]))
    cues.sort()
    with open(OUT_TRANSCRIPT, "w", encoding="utf-8") as f:
        f.write("MeteredPay narration v4 — complete audio redo (Lilting Swing / Paloma voice, speed 100, 13 Nov 2026).\n")
        f.write("254 spoken words: 43-word intro WITH \"on testnet\" (script §2 assembly edit); IJKLM split I + J + KLM;\n")
        f.write("J carries contingency cut #1 (\"Balance untouched.\" removed — the balance strip shows it visually).\n")
        f.write("Narration: synthetic voiceover. TTS input spells the brand \"Metered Pay\" (spaced) for pronunciation;\n")
        f.write("captions and on-screen text use \"MeteredPay\".\n")
        f.write(f"Total: {dur:.2f} s, inter-take gaps 0.25 s, trailing 0.50 s, loudnorm -25 LUFS.\n\n")
        for _, _, tx in cues:
            f.write(tx + " ")
        f.write("\n")
    print("wrote", OUT_TRANSCRIPT)
    print("ASSEMBLY DONE")


if __name__ == "__main__":
    main()
