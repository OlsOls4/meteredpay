"""Whisper word-timestamp transcription for the v3.3 Paloma takes.

Same output shape as the v3 agent's narr3/*.words.json:
  {"file": ..., "duration": ..., "segments": [{start,end,text}], "words": [{"w","s","e"}]}

Workaround (13 Nov 2026): the venv's faster-whisper 1.2.1 calls
av.open(..., metadata_errors="ignore"), which PyAV 19 removed, so
decode_audio is monkeypatched to the same implementation minus that
kwarg. Pinning av 14.x failed (no wheel builds in this VM).

Usage: fw-venv/bin/python whisper_words33.py <model tiny|small> <mp3> [<mp3> ...]
Writes <mp3>.words.json next to each input. Prints the transcript.
"""
import json
import os
import sys

import av
import numpy as np


def _decode_audio_patched(input_file, sampling_rate=16000, split_stereo=False):
    import gc
    import io

    import faster_whisper.audio as _fw_audio

    resampler = av.audio.resampler.AudioResampler(
        format="s16", layout="mono" if not split_stereo else "stereo", rate=sampling_rate
    )
    raw_buffer = io.BytesIO()
    dtype = None
    with av.open(input_file, mode="r") as container:  # no metadata_errors (av 19)
        frames = container.decode(audio=0)
        frames = _fw_audio._ignore_invalid_frames(frames)
        frames = _fw_audio._group_frames(frames, 500000)
        frames = _fw_audio._resample_frames(frames, resampler)
        for frame in frames:
            array = frame.to_ndarray()
            dtype = array.dtype
            raw_buffer.write(array)
    del resampler
    gc.collect()
    audio = np.frombuffer(raw_buffer.getbuffer(), dtype=dtype)
    audio = audio.astype(np.float32) / 32768.0
    if split_stereo:
        return audio[0::2], audio[1::2]
    return audio


import faster_whisper.audio as _fw_audio_mod
import faster_whisper.transcribe as _fw_trans_mod

_fw_audio_mod.decode_audio = _decode_audio_patched
_fw_trans_mod.decode_audio = _decode_audio_patched

from faster_whisper import WhisperModel  # noqa: E402


def transcribe(path, model_name):
    import subprocess

    dur = float(
        subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", path],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
    )
    model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segments, _ = model.transcribe(path, word_timestamps=True, language="en")
    out = {"file": os.path.basename(path), "duration": round(dur, 3),
           "segments": [], "words": []}
    for seg in segments:
        out["segments"].append({"start": round(seg.start, 2),
                                "end": round(seg.end, 2),
                                "text": seg.text.strip()})
        for w in seg.words:
            out["words"].append({"w": w.word.strip(),
                                 "s": round(w.start, 2), "e": round(w.end, 2)})
    out_path = path + ".words.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)
    print(f"{os.path.basename(path)}: {len(out['words'])} words, "
          f"speech {out['words'][0]['s']:.2f}-{out['words'][-1]['e']:.2f}, "
          f"file {dur:.2f}s -> {out_path}")
    print("  transcript:", " ".join(w["w"] for w in out["words"]))
    return out


if __name__ == "__main__":
    model = sys.argv[1]
    for p in sys.argv[2:]:
        transcribe(p, model)
