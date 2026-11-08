"""Video v3.2 frame-only patch (8 Nov 2026) — re-render ONLY the frames
the v3.2 patch changes. Everything else is reused byte-for-byte from v3.1.
Leaves render-cards-v2.py / render-cards-v3.py untouched.

1. term-fail-v2.png: one added line carrying the verified fail error hash
   `error hash: a0365a3e...7229 (DEMO_SELLER_ERROR)`. The hash was
   INDEPENDENTLY RECOMPUTED this session with the frozen
   shared/canonical.mjs (errorBody + responseHash over call_id
   video05-fail-001, error DEMO_SELLER_ERROR, message "Demonstrator
   seller failed this call on purpose (scenario=fail).", seller
   tedious-sea.testnet, price 0.1 NEAR) and matches
   a0365a3ef8a1097c47f89f08aa3695c85236144edfcc8783dc2823bc9fde7229
   exactly. It is NOT in demo-run-console.log or seller.log verbatim
   (the logs record only the attestation assertion); the recomputation
   against the seller source (seller-api/server.mjs:266) + frozen
   canonical function is the verification. The line is a derived
   display of that verified value, in the same style as the other
   truncated hashes in the video (e.g. strip sublines "FdAowPRk...SMhFT").
2. endcard-v3.png: drops the duplicate "Replay it yourself" line
   ("link's in the replies") and shifts the disclosure footer up 70 px
   to close the gap. The contract line stays.
3. strip-s1 tamper-run variant: same S1 balances, subline
   "Tamper run — buyer mp-tamper05.testnet · these balances are that
   run's own" — the footline that explains the strip/frame balance
   difference on the S2-tamper clip.
"""
import copy
import importlib.util
import sys


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


WORK = '/home/hatch/workspace/near-meteredpay/repo/video/work'
_rc2 = _load('render_cards_v2', WORK + '/render-cards-v2.py')
_rc3 = _load('render_cards_v3', WORK + '/render-cards-v3.py')
TERM_V2 = _rc2.TERM_V2
term_frame_v2 = _rc2.term_frame_v2
strip_png = _rc3.strip_png

# --- 1. fail terminal frame + error hash line ---
fail = copy.deepcopy(TERM_V2['term-fail-v2.png'])
assert fail['lines'][0].startswith('  verified: seller error attestation valid'), fail['lines'][0]
fail['lines'].insert(1, '  error hash: a0365a3e\u20267229 (DEMO_SELLER_ERROR)')
term_frame_v2('term-fail-v2.png', fail)

# --- 2. end card (v3.2): drop the duplicate Replay line ---
from PIL import Image, ImageDraw, ImageFont  # noqa: E402
import os  # noqa: E402
FR = '/home/hatch/workspace/near-meteredpay/repo/video/work/frames'
SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
SANS_B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
PAPER = (253, 253, 247)
INK = (28, 28, 26)
TEAL_D = (11, 94, 87)
MUTED = (74, 74, 68)
RED = (180, 30, 30)
GREEN = (11, 94, 87)
AMBER = (180, 83, 9)


def endcard_v32():
    img = Image.new('RGB', (1920, 1080), PAPER)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 1920, 10], fill=TEAL_D)
    d.text((96, 120), 'MeteredPay', font=ImageFont.truetype(SANS_B, 96), fill=TEAL_D)
    d.text((96, 260), 'Failed call? Deducted: zero.',
           font=ImageFont.truetype(SANS_B, 54), fill=INK)
    rows = [
        ('SUCCESS', 'deducted 0.1 testnet NEAR', GREEN),
        ('FAILED', 'deducted zero', AMBER),
        ('OVER BUDGET', 'refused on-chain', RED),
    ]
    y = 380
    for label, desc, color in rows:
        d.text((96, y), label, font=ImageFont.truetype(SANS_B, 44), fill=color)
        d.text((560, y + 4), desc, font=ImageFont.truetype(SANS, 40), fill=INK)
        y += 78
    d.text((96, 640), 'github.com/OlsOls4/meteredpay',
           font=ImageFont.truetype(SANS_B, 40), fill=TEAL_D)
    d.text((96, 710), 'Replay it yourself \u2014 same contract: apathetic-party.testnet',
           font=ImageFont.truetype(SANS, 36), fill=INK)
    # v3.2: the second "Replay it yourself \u2014 link\u2019s in the replies."
    # line is dropped (duplicate opening); footer shifted up 70 px.
    d.text((96, 830), 'Narration: synthetic voiceover. Demo frames rendered from the real run log \u2014 not a live screen recording.',
           font=ImageFont.truetype(SANS, 24), fill=MUTED)
    d.text((96, 866), 'Testnet only \u2014 no mainnet money. Replay reproduces the deposit, the two successes and the refusal;',
           font=ImageFont.truetype(SANS, 24), fill=MUTED)
    d.text((96, 902), 'the failure and tamper beats use the same commands with the seller\u2019s scenario switch.',
           font=ImageFont.truetype(SANS, 24), fill=MUTED)
    img.save(f'{FR}/endcard-v3.png')
    print('wrote', f'{FR}/endcard-v3.png')


endcard_v32()

# --- 3. tamper-run strip variant (S1 balances + explanatory subline) ---
p = strip_png('s1', subline='Tamper run \u2014 buyer mp-tamper05.testnet \u00b7 the balances above are that run\u2019s own')
print('strip:', p)
