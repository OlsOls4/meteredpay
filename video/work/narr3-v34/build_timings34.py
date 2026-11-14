#!/usr/bin/env python3
"""Build narr3-v34-ln/sentence-timings.json for MeteredPay v3.4.

Sentence TEXTS are the script sentences (VIDEO-SCRIPT-V3-FINAL.md), with
two changes vs v3.3:
- Take A is the 43-word full intro WITH "on testnet" (script §2 assembly
  edit, binding rule: spoken test-money statement in the intro).
- Take IJKLM drops "Balance untouched." (contingency cut #1, diagnosis §3:
  the balance strip shows it visually). 11 sentences, not 12.
Total cues: 5 + 3 + 9 + 10 + 11 = 38 (v3.3 had 39).

Matching: reuses the v3.3 matcher (build_timings33.canon_whisper /
canon_script / match_take) against the Whisper tiny word timings of the
chosen renders. TTS input punctuation differs from the script (commas
instead of periods/dashes/semicolons — the pace direction); the matcher
aligns on WORDS only, so punctuation is irrelevant. "Checked." is
comma-joined in the v6 TTS input but tiny AND small both hear "checked"
there (verified 13 Nov) — the matcher finds it as sentence 2's first word.

Output: narr3-v34-ln/sentence-timings.json with
  {"voice": "avocado_v2:paloma", "speed": 100,
   "takes": {fname: {"shots": ..., "start": 0.0 (filled by assembly)}},
   "sentences": {fname: [{text, start, end}, ...]}}
Take starts are NOT set here (assembly derives them from the speech spans
+ hold plan); this builder writes start: 0.0 placeholders.
"""
import json
import os
import re
import sys

sys.path.insert(0, "/home/hatch/workspace/near-meteredpay/repo/video/work/narr3-paloma")
from build_timings33 import match_take, norm_token  # noqa: E402

WORK = "/home/hatch/workspace/near-meteredpay/repo/video/work"
V34 = WORK + "/narr3-v34"
PACE = WORK + "/narr3-pace"
OUT = WORK + "/narr3-v34-ln/sentence-timings.json"

# (final filename in narr3-v34-ln, shots, source words.json path, sentences)
TAKES = [
    ("intro-s100.mp3", "A", f"{V34}/take-a-v2.mp3.words.json", [
        "This is MeteredPay, on testnet.",
        "Agents pay for every call — even the ones that fail.",
        "Say one in ten fails: that's money paid for work that never happened.",
        "MeteredPay only pays when the work checks out.",
        "Watch what happens when a call fails.",
    ]),
    ("take-b-s100.mp3", "B", f"{PACE}/paloma-b-s100.mp3.words.json", [
        "Watch this first.",
        "A call fails — and the held money comes straight back.",
        "Deducted: zero.",
    ]),
    ("take-cde-v6.mp3", "CDE", f"{V34}/take-cde-v6.mp3.words.json", [
        "The buyer puts down half a NEAR, and caps spending at point two.",
        "It can never spend past it.",
        "One document to check.",
        "The seller validates it against a schema — twelve words, eighty-nine characters.",
        "Valid — against the schema.",
        "First call.",
        "The check comes back valid.",
        "The buyer checks the receipt — same fingerprint, real signature.",
        "Only then does the contract take point one.",
    ]),
    ("take-fgh-v3.mp3", "FGH", f"{V34}/take-fgh-v3.mp3.words.json", [
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
    ]),
    ("take-ijklm-v6.mp3", "IJKLM", f"{V34}/take-ijklm-v6.mp3.words.json", [
        "Second good check.",
        "Checked.",
        "The same way — that's point two spent.",
        "The limit, reached.",
        "One more call — and the contract says no before any money moves.",
        "Over budget, refused, on the record.",
        # "Balance untouched." CUT (contingency cut #1) — not in the take.
        "One honest limit: this protects the buyer, not the seller.",
        "A dishonest buyer could still claim a failure.",
        "The buyer checks every receipt.",
        "The contract only pays on one the buyer has signed.",
        "MeteredPay. Failed call? Deducted: zero.",
    ]),
]


BRAND_FIRST = {"me", "meet", "meated", "mitred", "meeted", "metered", "meter"}
BRAND_MID = {"to", "a", "ed"}
# Tiny mishearings of single words in the finished mix (the take-level
# matcher already proved these words ARE in the source takes; the mix's
# AAC re-encode flips tiny's beam search on them).
WORD_ALIASES = {"helled": "held", "tessna": "testnet"}


def fix_words(words):
    """Pre-merge Whisper brand mishearings the v3.3 canon does not cover:
    "me to pay" (A v2), "Meet ed pay" (IJKLM v6) -> one "MeteredPay" token;
    "thing a print" (finished mix) -> "fingerprint"; "tessna" -> "testnet";
    "helled" -> "held". Operates on raw word dicts before match_take.
    """
    toks = [(norm_token(w["w"]), w["s"], w["e"]) for w in words]
    out = []
    i = 0
    while i < len(toks):
        t, s, e = toks[i]
        if t in BRAND_FIRST:
            # brand + optional mid token + "pay"
            if i + 2 < len(toks) and toks[i + 1][0] in BRAND_MID and toks[i + 2][0] == "pay":
                out.append({"w": "MeteredPay", "s": s, "e": toks[i + 2][2]})
                i += 3
                continue
            if i + 1 < len(toks) and toks[i + 1][0] == "pay":
                out.append({"w": "MeteredPay", "s": s, "e": toks[i + 1][2]})
                i += 2
                continue
        # "fingerprint" exploded into three tokens by tiny in the mix
        if t == "thing" and i + 2 < len(toks) and toks[i + 1][0] == "a" \
                and toks[i + 2][0] == "print":
            out.append({"w": "fingerprint", "s": s, "e": toks[i + 2][2]})
            i += 3
            continue
        if t in WORD_ALIASES:
            out.append({"w": WORD_ALIASES[t], "s": s, "e": e})
            i += 1
            continue
        out.append({"w": words[i]["w"], "s": s, "e": e})
        i += 1
    return out


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    takes = {}
    sentences = {}
    total = 0
    for fname, shots, wj_path, sents in TAKES:
        wj = json.load(open(wj_path))
        sent_dicts = [{"text": t} for t in sents]
        matched, used, tot = match_take(sent_dicts, fix_words(wj["words"]))
        print(f"{fname}: {len(matched)} sentences, used {used}/{tot} whisper tokens")
        for m in matched:
            print(f"  {m['start']:6.2f}-{m['end']:6.2f}  {m['text']}")
        for a, b in zip(matched, matched[1:]):
            assert b["start"] >= a["end"] - 0.05, f"overlap {a} vs {b}"
        # Caption legibility: "Checked." is 0.12 s in the v6 take (comma-
        # joined, not a full stop). A 0.12 s burned caption is unreadable,
        # so hold the cue through the following pause to the next sentence
        # start (0.38 s) — standard caption practice, documented here.
        # The audio word itself is unchanged (1.86-1.98 take-relative).
        if fname == "take-ijklm-v6.mp3":
            for j, m in enumerate(matched):
                if m["text"] == "Checked." and m["end"] - m["start"] < 0.3:
                    m["end"] = matched[j + 1]["start"]
                    print(f"  NOTE: 'Checked.' cue extended to {m['end']} "
                          f"(next sentence start) for caption legibility")
        takes[fname] = {"shots": shots, "start": 0.0}
        sentences[fname] = matched
        total += len(matched)
    out = {"voice": "avocado_v2:paloma", "speed": 100, "takes": takes,
           "sentences": sentences}
    json.dump(out, open(OUT, "w"), indent=1)
    print(f"wrote {OUT} — {total} cues total")
    assert total == 38, total


if __name__ == "__main__":
    main()
