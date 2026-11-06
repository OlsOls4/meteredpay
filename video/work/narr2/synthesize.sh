#!/bin/bash
# Regenerate the rebuild narration (Helio, avocado_v2:MAI_03, speed 85).
# Run from video/work/narr2/. Requires /opt/hatch/bin/tts (Meta Shortwave).
# The full clips (n01-n12) are the beats; the lettered parts (n04a-d etc.)
# are the same sentences synthesized separately so each beat's speech can
# be placed across its sub-clips with no silence gap over ~2 s.
# Texts are the exact TTS inputs; see repo/VIDEO-SCRIPT.md for the script.
set -e
cd "$(dirname "$0")"
speak() { printf '%s' "$2" | /opt/hatch/bin/tts speak --text-stdin --voice avocado_v2:MAI_03 --speed 85 --output "$1.mp3" >/dev/null; echo "ok $1"; }
speak n01 "Failed call. Deducted: zero."
speak n02 "Agents pay for every call, even the broken ones. This agent needs one document checked before it files it. It pays only if the check comes back valid."
speak n03 "It puts down zero point five testnet NEAR, and sets a limit: no more than zero point two. Whatever happens, it can't spend past that."
speak n04 "First call. The check comes back valid. The buyer checks the receipt. Same fingerprint, real signature. And only then does the contract take zero point one. That's the whole trick: the buyer checks, then the contract pays."
speak n05 "Now a call fails. The buyer says so, and the money comes back. Held, never taken. Deducted: zero. The seller's own error note proves it failed."
speak n06 "No answer in thirty seconds? Same deal. The money comes back."
speak n07 "Someone fiddled with the receipt. See that one letter? The buyer catches it, and pays nothing."
speak n08 "Second good check. That's the limit reached. Two good checks, zero point two spent. The budget is gone."
speak n09 "One more call, and the contract says no before any money moves. Over budget, refused, on the record. Balance untouched. That's the limit doing its job."
speak n10 "The buyer checks every receipt. The contract only pays on a receipt the buyer has signed."
speak n11 "Replay it yourself. The link's in the replies."
speak n12 "MeteredPay. Failed call? Deducted: zero."
speak n04a "First call. The check comes back valid."
speak n04b "The buyer checks the receipt. Same fingerprint, real signature."
speak n04c "And only then does the contract take zero point one."
speak n04d "That's the whole trick: the buyer checks, then the contract pays."
speak n05a "Now a call fails."
speak n05b "The buyer says so, and the money comes back."
speak n05c "Held, never taken. Deducted: zero."
speak n05d "The seller's own error note proves it failed."
speak n08a "Second good check."
speak n08b "That's the limit reached."
speak n08c "Two good checks, zero point two spent. The budget is gone."
speak n09a "One more call, and the contract says no before any money moves."
speak n09b "Over budget, refused, on the record."
speak n09c "Balance untouched."
speak n09d "That's the limit doing its job."
speak n11a "Replay it yourself."
speak n11b "The link's in the replies."
speak t02 "Agents pay for every call, even the broken ones. It pays only if the check comes back valid."
speak t03 "The buyer checks the receipt. Same fingerprint, real signature. Then the contract pays."
speak t04 "One more call, and the contract says no before any money moves."
