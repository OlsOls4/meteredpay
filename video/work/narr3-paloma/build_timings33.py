"""Build narr3-paloma/sentence-timings.json from Whisper tiny word timings.

Sentence TEXTS are copied from the v3 timings (narr3-ln/sentence-timings.json)
— the script is unchanged for v3.3 (same 39 sentences). Only the timings are
new (Paloma, speed 90).

Matching: Whisper tiny misspells homophones ("air" for NEAR, "cool" for
call, "cellar" for seller, "aeronauts" for "error note", "8 .1" for
"take point one", "meated/mitred/meet a pay" for the brand). The matcher
canonicalises both sides with an alias table and greedily matches each
script sentence's words in order, allowing up to 2 skipped Whisper tokens
between matched words. Degenerate word timestamps (<0.05 s, e.g. tiny's
"checked." at 1.84-1.86) are expanded to the neighbouring gap for the
sentence boundary. Every sentence must match; the script asserts
monotonicity and prints the full alignment for review.

Output: narr3-paloma/sentence-timings.json with
  {"voice": "avocado_v2:paloma", "speed": 90,
   "takes": {fname: {"shots": ..., "start": <set later by assembly>}},
   "sentences": {fname: [{text, start, end}, ...]}}
Take starts are NOT set here (assembly derives them from the speech spans
+ hold plan); the builder writes start: null and the assembly script fills
them in. Actually the v3 format requires a start per take — the assembly
script below writes the final file with starts; this builder writes the
sentence lists with take-relative times and start: 0.0 placeholders.
"""
import json
import re

V3 = "/home/hatch/workspace/near-meteredpay/repo/video/work/narr3-ln/sentence-timings.json"
PAL = "/home/hatch/workspace/near-meteredpay/repo/video/work/narr3-paloma"
OUT = PAL + "/sentence-timings.json"

# Whisper-token -> canonical script-token aliases (tiny-model mishearings).
ALIASES = {
    "air": "near",
    "cool": "call",
    "cellar": "seller",
    "aeronauts": "error",
    "meated": "metered",
    "mitred": "metered",
    "meeted": "metered",
    "meet": "metered",
    "tessnet": "testnet",
    "tess": "test",
    "overbudget": "over",
    "whole": "held",
    "an": "a",
    # tiny-model systematic renderings (also seen on the finished mix):
    "buy": "buyer",     # "buyer" -> "buy" (drops -er)
    "0": "zero",         # "Deducted: zero." -> "deducted 0"
    "there": "near",     # "half a NEAR" -> "half in there"
    "are": "the",        # "checks the receipt" -> "check are receipt"
    "8": "take",
    ".1": "point",
    ".2": "point",
    "600": "six",
    "1": "one",
    "10": "ten",
    "30": "thirty",
    "89": "eighty",
    "12": "twelve",
}
# Tokens that expand to TWO canonical words (handled by pre-expansion).
EXPAND = {
    "600": ["six", "hundred"],
    "89": ["eighty", "nine"],
    "12": ["twelve"],
    ".1": ["point", "one"],
    ".2": ["point", "two"],
}


def stem(tok):
    """Light plural/3rd-person stemmer, applied to BOTH sides so it cancels:
    fails->fail, calls->call, says->say, comes->come, words->word."""
    if len(tok) > 3 and tok.endswith("s") and not tok.endswith(("ss", "us", "is", "as")):
        return tok[:-1]
    return tok


def norm_token(tok):
    return stem(re.sub(r"[^a-z0-9]", "", tok.lower()))


def canon_whisper(words):
    """words: [{w,s,e}] -> [(canon, s, e)] with merges/splits applied."""
    toks = [(norm_token(w["w"]), w["s"], w["e"]) for w in words]
    toks = [t for t in toks if t[0]]  # drop punctuation-only tokens (em-dashes etc.)
    out = []
    i = 0
    while i < len(toks):
        t, s, e = toks[i]
        # brand: X + "pay" -> "meteredpay" (optional "a" between: "Meet a pay")
        if t in ("meated", "mitred", "meeted", "meet", "metered", "meter"):
            if i + 1 < len(toks) and toks[i + 1][0] == "pay":
                out.append(("meteredpay", s, toks[i + 1][2]))
                i += 2
                continue
            if i + 2 < len(toks) and toks[i + 1][0] == "a" and toks[i + 2][0] == "pay":
                out.append(("meteredpay", s, toks[i + 2][2]))
                i += 3
                continue
        # test + net -> testnet
        if t in ("test", "tess") and i + 1 < len(toks) and toks[i + 1][0] == "net":
            out.append(("testnet", s, toks[i + 1][2]))
            i += 2
            continue
        # "error" + "note" split from "aeronauts" (stemmed to "aeronaut"): keep as two tokens
        if t in ("aeronaut", "aeronauts"):
            out.append(("error", s, e))
            out.append(("note", s, e))
            i += 1
            continue
        # "8" + "1" (Whisper hears "take point one" as "8.1") -> take point one
        if t == "8" and i + 1 < len(toks) and toks[i + 1][0] in ("1", ".1"):
            out.append(("take", s, e))
            out.append(("point", toks[i + 1][1], toks[i + 1][1]))
            out.append(("one", toks[i + 1][1], toks[i + 1][2]))
            i += 2
            continue
        # "the claim" merged into one token "acclaim": expand to both words
        if t == "acclaim":
            out.append(("the", s, e))
            out.append(("claim", s, e))
            i += 1
            continue
        # "0" + "2"/"1" (Whisper splits "0.2"/"0.1" as two tokens) -> point two/one
        if t == "0" and i + 1 < len(toks) and toks[i + 1][0] in ("1", "2"):
            second = "one" if toks[i + 1][0] == "1" else "two"
            out.append(("point", s, e))
            out.append((second, toks[i + 1][1], toks[i + 1][2]))
            i += 2
            continue
        if t in EXPAND:
            mid = s + (e - s) / 2
            for j, cw in enumerate(EXPAND[t]):
                a = s + (e - s) * j / len(EXPAND[t])
                b = s + (e - s) * (j + 1) / len(EXPAND[t])
                out.append((cw, round(a, 2), round(b, 2)))
            i += 1
            continue
        out.append((ALIASES.get(t, t), s, e))
        i += 1
    return out


def canon_script(text):
    # split hyphenated compounds ("eighty-nine" -> eighty, nine) to match
    # Whisper's tokenisation; drop empties.
    return [t for t in (norm_token(w) for w in text.replace("—", " ").replace("-", " ").split()) if t]


def match_take(sentences, wtoks):
    """Greedy sequential match. Returns [{text,start,end}] (take-relative)."""
    canon = canon_whisper(wtoks)
    p = 0
    res = []
    for sent in sentences:
        sw = canon_script(sent["text"])
        # find first word at/after p
        start_idx = None
        for k in range(p, len(canon)):
            if canon[k][0] == sw[0]:
                start_idx = k
                break
        assert start_idx is not None, f"first word {sw[0]!r} of {sent['text']!r} not found after pos {p}"
        # match remaining words in order, allowing <=2 skips between;
        # allow ONE missing middle word per sentence (tiny drops "and" etc.)
        idxs = [start_idx]
        cur = start_idx + 1
        ok = True
        missed = 0
        for wi, w in enumerate(sw[1:]):
            found = None
            for k in range(cur, min(cur + 3, len(canon))):
                if canon[k][0] == w:
                    found = k
                    break
            if found is None:
                # last word must match; a middle word may be missed once
                if wi == len(sw[1:]) - 1 or missed >= 1:
                    ok = False
                    break
                missed += 1
                print(f"    NOTE: {sent['text']!r}: script word {w!r} not heard (skipped)")
                continue
            idxs.append(found)
            cur = found + 1
        assert ok, f"sentence {sent['text']!r}: could not match word {w!r} after pos {cur} (canon around: {[c[0] for c in canon[cur:cur+5]]})"
        s = canon[idxs[0]][1]
        e = canon[idxs[-1]][2]
        # degenerate last-word timestamp: extend to next word start - 0.05
        if e - canon[idxs[-1]][1] < 0.05 and idxs[-1] + 1 < len(canon):
            e = round(canon[idxs[-1] + 1][1] - 0.05, 2)
        res.append({"text": sent["text"], "start": round(s, 2), "end": round(e, 2)})
        p = idxs[-1] + 1
    return res, p, len(canon)


FILEMAP = {
    "intro-fallback-s92.mp3": "intro-fallback-s90.mp3",
    "take-b.mp3": "take-b.mp3",
    "take2-cde.mp3": "take2-cde.mp3",
    "take3-fgh.mp3": "take3-fgh.mp3",
    "take4-ijklm.mp3": "take4-ijklm.mp3",
}


def main():
    v3 = json.load(open(V3))
    takes = {}
    sentences = {}
    for fname, info in v3["takes"].items():
        pfname = FILEMAP[fname]
        wj = json.load(open(f"{PAL}/{pfname}.words.json"))
        matched, used, total = match_take(v3["sentences"][fname], wj["words"])
        print(f"{fname}: {len(matched)} sentences, used {used}/{total} whisper tokens")
        for m in matched:
            print(f"  {m['start']:6.2f}-{m['end']:6.2f}  {m['text']}")
        # monotonicity
        for a, b in zip(matched, matched[1:]):
            assert b["start"] >= a["end"] - 0.05, f"overlap {a} vs {b}"
        takes[pfname] = {"shots": info["shots"], "start": 0.0}
        sentences[pfname] = matched
    out = {"voice": "avocado_v2:paloma", "speed": 90, "takes": takes,
           "sentences": sentences}
    json.dump(out, open(OUT, "w"), indent=1)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
