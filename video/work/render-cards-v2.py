"""Video-rebuild v2 PIL frames (6 Nov 2026). Replaces the wave-4 cards where the
council panels found defects. All values verbatim from the recorded run
(buyer mp-video05.testnet, 5 Nov 2026; tamper beat buyer mp-tamper05.testnet)
or from the console log demo-run-console.log. No value invented.

Frames built (all 1920x1080 on the dashboard paper background, chyron zone
bottom-right x>1450 y>950 kept clear):
- doc-success1-v2.png: de-spoiled document card — verdict + deduction tx
  REMOVED (they gave away the payoff at 0:10). Document text, words,
  chars and input SHA-256 unchanged.
- verify-closeup.png: the verification the old video only asserted —
  recomputed hash vs stated hash (identical), seller pubkey, signature
  valid, "only then does the contract deduct".
- tamper-highlight.png: tampered receipt — recomputed vs stated hash
  with the single flipped first hex char (d vs 0) in red + underlined,
  plus the failure-claim release tx. Labelled as a separate run.
- replay-block.png: copy-pasteable replay (repo URL, seller first, buyer
  command, prerequisites, expected final state).
- endcard-v2.png: name + repeated sentence + repo + contract + disclosure
  (rendered frames, not a live recording; deposit frame reconstructed).
- term-*-v2.png: trimmed terminal frames — verbatim console lines only
  (verified/balance-after lines) plus a one-line tx summary carrying the
  same tx hash; JSON objects dropped. Values unchanged, layout changed
  for legibility; see video-rebuild-log-2026-11-06.md.
- thumbnail v2 (1200x675): big title + three large rows, every word
  legible at 320 px.
"""
import json
from PIL import Image, ImageDraw, ImageFont

WORK = '/home/hatch/workspace/near-meteredpay/repo/video/work'
FR = WORK + '/frames'
VIDEO = '/home/hatch/workspace/near-meteredpay/repo/video'
PAPER = (253, 253, 247)
INK = (28, 28, 26)
TEAL_D = (11, 94, 87)
MUTED = (74, 74, 68)
RED = (180, 30, 30)
GREEN = (11, 94, 87)
AMBER = (180, 83, 9)

SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
SANS_B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

DOC_TEXT = 'MeteredPay demo call video05-success-001: pay per successful call, nothing for a failure.'
INPUT_SHA = '36ac8134cccf4415452f06604cead78d39a37ad49e3ddcf0248453da2ef38063'
HASH_S1 = '2edf3f35e9ad2cc8d4668a8ba9c7a02157ea25ad708e1dda00b5c08b7ef0124b'
SELLER_PK = 'ed25519:6zG7yLp2jqHxfkXfYgsL1ZXSf2NVQoRRaib6im72ubnm'
DED_TX_S1 = 'FdAowPRkBuUrQkGgTnfhfNsnvqHZTkNzpA1nyt1SMhFT'
TAMPER_RECOMPUTED = 'db62657be2006976882eb2236bb9f6a55dcbc672f821c5296c5ac67fea854fea'
TAMPER_STATED = '0b62657be2006976882eb2236bb9f6a55dcbc672f821c5296c5ac67fea854fea'
TAMPER_RELEASE_TX = '7rEaW3AntDRHynYDxi1JWiTDCtyzM4VYyMYC4d5PgGU7'


def wrap_text(draw, text, font, max_w):
    words = text.split(' ')
    lines, cur = [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=font) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def base():
    img = Image.new('RGB', (1920, 1080), PAPER)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 1920, 10], fill=TEAL_D)
    return img, d


def header(d, title, sub):
    d.text((96, 64), 'MeteredPay — recorded run · NEAR testnet',
           font=ImageFont.truetype(SANS_B, 30), fill=TEAL_D)
    d.text((96, 124), title, font=ImageFont.truetype(SANS_B, 54), fill=INK)
    if sub:
        d.text((96, 206), sub, font=ImageFont.truetype(SANS, 32), fill=INK)


def doc_card_v2():
    img, d = base()
    header(d, 'The document being checked',
           'Call video05-success-001  ·  schema: quote  ·  seller tedious-sea.testnet')
    d.rounded_rectangle([96, 280, 1824, 580], radius=12, outline=TEAL_D, width=3, fill=(255, 255, 255))
    d.text((140, 312), 'document.text — verbatim from the recorded run:',
           font=ImageFont.truetype(SANS_B, 30), fill=MUTED)
    font_doc = ImageFont.truetype(SANS, 44)
    y = 372
    for line in wrap_text(d, DOC_TEXT, font_doc, 1824 - 280):
        d.text((140, y), line, font=font_doc, fill=INK)
        y += 58
    y = 640
    d.text((96, y), 'Words: 12  ·  Characters: 89',
           font=ImageFont.truetype(SANS, 32), fill=INK)
    y += 62
    d.text((96, y), 'Input SHA-256:', font=ImageFont.truetype(SANS_B, 32), fill=INK)
    d.text((96, y + 44), INPUT_SHA, font=ImageFont.truetype(MONO, 30), fill=INK)
    y += 128
    d.text((96, y), 'The buyer will check the receipt before anything is deducted.',
           font=ImageFont.truetype(SANS, 32), fill=INK)
    d.text((96, 990), 'Buyer mp-video05.testnet · 5 Nov 2026 · input SHA-256 recomputed from this document.',
           font=ImageFont.truetype(SANS, 26), fill=MUTED)
    img.save(f'{FR}/doc-success1-v2.png')
    print('wrote', f'{FR}/doc-success1-v2.png')


def verify_card():
    img, d = base()
    header(d, 'The buyer checks the receipt',
           'Call video05-success-001 — before the contract deducts anything')
    y = 300
    mono = ImageFont.truetype(MONO, 30)
    sans = ImageFont.truetype(SANS, 34)
    bold = ImageFont.truetype(SANS_B, 34)
    d.text((96, y), 'Recomputed hash:', font=bold, fill=INK)
    d.text((96, y + 52), HASH_S1, font=mono, fill=INK)
    y += 150
    d.text((96, y), 'Stated hash:', font=bold, fill=INK)
    d.text((96, y + 52), HASH_S1, font=mono, fill=INK)
    y += 150
    d.text((96, y), '✓  They match.', font=ImageFont.truetype(SANS_B, 40), fill=GREEN)
    y += 80
    d.text((96, y), 'Seller key: ' + SELLER_PK, font=mono, fill=INK)
    y += 70
    d.text((96, y), 'Signature: valid — only then does the contract deduct 0.1 testnet NEAR.',
           font=sans, fill=INK)
    d.text((96, 990), 'Buyer mp-video05.testnet · 5 Nov 2026 · verified: response hash matches, seller attestation valid.',
           font=ImageFont.truetype(SANS, 26), fill=MUTED)
    img.save(f'{FR}/verify-closeup.png')
    print('wrote', f'{FR}/verify-closeup.png')


def _hash_with_highlight(d, x, y, h, first_color):
    """Draw a 64-hex hash; first char in first_color + underlined."""
    mono = ImageFont.truetype(MONO, 30)
    mono_b = ImageFont.truetype(MONO, 30)
    w0 = d.textlength(h[0], font=mono_b)
    d.text((x, y), h[0], font=mono_b, fill=first_color)
    d.line([(x, y + 42), (x + w0, y + 42)], fill=first_color, width=4)
    d.text((x + w0, y), h[1:], font=mono, fill=INK)


def tamper_card():
    img, d = base()
    header(d, 'One letter changed — caught before payment',
           'Separate run, same contract — buyer mp-tamper05.testnet · 5 Nov 2026')
    y = 300
    bold = ImageFont.truetype(SANS_B, 34)
    sans = ImageFont.truetype(SANS, 34)
    d.text((96, y), 'Recomputed hash:', font=bold, fill=INK)
    _hash_with_highlight(d, 96, y + 52, TAMPER_RECOMPUTED, RED)
    y += 150
    d.text((96, y), 'Stated hash:', font=bold, fill=INK)
    _hash_with_highlight(d, 96, y + 52, TAMPER_STATED, RED)
    y += 150
    d.text((96, y), 'They do NOT match — failure claim: invalid_response.', font=bold, fill=RED)
    y += 80
    d.text((96, y), 'Deducted: 0 testnet NEAR.  Release tx: ' + TAMPER_RELEASE_TX,
           font=sans, fill=INK)
    d.text((96, 990), 'Tamper reproduced live in the session: one hex char of response_hash flipped before the buyer check.',
           font=ImageFont.truetype(SANS, 26), fill=MUTED)
    img.save(f'{FR}/tamper-highlight.png')
    print('wrote', f'{FR}/tamper-highlight.png')


def replay_card():
    img, d = base()
    header(d, 'Replay it yourself — same contract',
           'Contract apathetic-party.testnet · NEAR testnet · no mainnet money')
    y = 300
    bold = ImageFont.truetype(SANS_B, 34)
    sans = ImageFont.truetype(SANS, 34)
    mono = ImageFont.truetype(MONO, 28)
    d.text((96, y), 'Repo:  github.com/OlsOls4/meteredpay', font=bold, fill=INK)
    y += 80
    d.text((96, y), '1.  cd seller-api && node server.mjs', font=mono, fill=INK)
    y += 60
    d.text((96, y), '    (demo seller, localhost:8787)', font=sans, fill=MUTED)
    y += 70
    d.text((96, y), '2.  node buyer/buyer.mjs --buyer <you>.testnet --mode demo --tag demo', font=mono, fill=INK)
    y += 60
    d.text((96, y), '    (fresh faucet testnet account · Node 24 · seller first)', font=sans, fill=MUTED)
    y += 80
    d.text((96, y), 'Expected finish: deposit 0.5 · held 0 · spent 0.2 · available 0.3 · cap 0.2 testnet NEAR.',
           font=bold, fill=INK)
    d.text((96, 990), 'Same contract, same steps as this video — buyer mp-video05.testnet, 5 Nov 2026.',
           font=ImageFont.truetype(SANS, 26), fill=MUTED)
    img.save(f'{FR}/replay-block.png')
    print('wrote', f'{FR}/replay-block.png')


def endcard_v2():
    img, d = base()
    d.text((96, 180), 'MeteredPay', font=ImageFont.truetype(SANS_B, 96), fill=TEAL_D)
    d.text((96, 320), 'Failed call? Deducted: zero.',
           font=ImageFont.truetype(SANS_B, 54), fill=INK)
    d.text((96, 440), 'NEAR testnet. Built at NEAR HACKATHON.',
           font=ImageFont.truetype(SANS, 40), fill=INK)
    d.text((96, 520), 'github.com/OlsOls4/meteredpay',
           font=ImageFont.truetype(SANS_B, 40), fill=TEAL_D)
    d.text((96, 600), 'Replay it yourself — same contract: apathetic-party.testnet',
           font=ImageFont.truetype(SANS, 36), fill=INK)
    d.text((96, 900), 'Rendered dashboard frames with narration — not a live screen recording.',
           font=ImageFont.truetype(SANS, 26), fill=MUTED)
    d.text((96, 936), 'Deposit frame rebuilt from the run log; demo outcomes chosen by the seller\u2019s scenario switch.',
           font=ImageFont.truetype(SANS, 26), fill=MUTED)
    img.save(f'{FR}/endcard-v2.png')
    print('wrote', f'{FR}/endcard-v2.png')


def thumbnail_v2():
    W, H = 1200, 675
    img = Image.new('RGB', (W, H), PAPER)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 12], fill=TEAL_D)
    d.text((60, 48), 'MeteredPay', font=ImageFont.truetype(SANS_B, 84), fill=TEAL_D)
    rows = [
        ('SUCCESS', 'deducted 0.1 testnet NEAR', GREEN),
        ('FAILED', 'deducted zero', AMBER),
        ('OVER BUDGET', 'refused on-chain', RED),
    ]
    y = 190
    for label, desc, color in rows:
        d.text((60, y), label, font=ImageFont.truetype(SANS_B, 44), fill=color)
        d.text((60, y + 56), desc, font=ImageFont.truetype(SANS, 40), fill=INK)
        y += 128
    d.text((60, 590), 'NEAR testnet demo — no mainnet money.',
           font=ImageFont.truetype(SANS, 30), fill=MUTED)
    img.save(f'{VIDEO}/meteredpay-thumbnail-1200x675-v2.png')
    print('wrote', f'{VIDEO}/meteredpay-thumbnail-1200x675-v2.png')


TERM_V2 = {
    'term-deposit-v2.png': {
        'title': 'Buyer console — deposit + cap',
        'head': 'Buyer mp-video05.testnet · 5 Nov 2026',
        'lines': [
            '  balance after deposit: deposit=0.5000 testnet NEAR held=0.0000 testnet NEAR',
            '  spent=0.0000 testnet NEAR available=0.5000 testnet NEAR cap=0.5000 testnet NEAR',
            '  balance after cap: deposit=0.5000 testnet NEAR held=0.0000 testnet NEAR',
            '  spent=0.0000 testnet NEAR available=0.5000 testnet NEAR cap=0.2000 testnet NEAR',
            '  deposit tx: AzzVziRy57WiGjSGgcwpa3nK91bVMJQSL2Wt4dUKCP8K',
            '  cap tx: BHPKq6rm3pSqS9ynyYK3AtokdZVRFW9MeJYEKCyjjUJ7',
        ],
    },
    'term-verify1-v2.png': {
        'title': 'Buyer console — success #1 verified + deducted',
        'head': 'Buyer mp-video05.testnet · 5 Nov 2026',
        'lines': [
            '  verified: response hash matches, seller attestation valid',
            '  for video05-success-001',
            '  deduction tx: FdAowPRkBuUrQkGgTnfhfNsnvqHZTkNzpA1nyt1SMhFT',
            '  balance after success: deposit=0.5000 held=0.0000 spent=0.1000',
            '  available=0.4000 cap=0.2000 testnet NEAR',
        ],
    },
    'term-fail-v2.png': {
        'title': 'Buyer console — failed call, money released',
        'head': 'Buyer mp-video05.testnet · 5 Nov 2026',
        'lines': [
            '  verified: seller error attestation valid for video05-fail-001',
            '  release tx (buyer failure claim): 7j4Jijr9sptyhgfzv9r6CPXYd3B2enzVBNXnedHgzJaA',
            '  balance after failure claim: deposit=0.5000 held=0.0000 spent=0.1000',
            '  available=0.4000 cap=0.2000 testnet NEAR (held amount released, never deducted)',
        ],
    },
    'term-verify2-v2.png': {
        'title': 'Buyer console — success #2 verified + deducted',
        'head': 'Buyer mp-video05.testnet · 5 Nov 2026',
        'lines': [
            '  verified: response hash matches, seller attestation valid',
            '  for video05-success-002',
            '  deduction tx: FiHaJ9uvAMUPM3N1kWvpdoMxk77SodCyLRgxqX2YwcDT',
            '  balance after success: deposit=0.5000 held=0.0000 spent=0.2000',
            '  available=0.3000 cap=0.2000 testnet NEAR',
        ],
    },
    'term-refusal-v2.png': {
        'title': 'Buyer console — over-budget, refused on-chain',
        'head': 'Buyer mp-video05.testnet · 5 Nov 2026',
        'lines': [
            '  refused: video05-overbudget-001 reason=over_budget (verbatim),',
            '  balances unchanged',
            '  refusal tx: 8sPCKFBtB3CKeyBXyxoUqwtuDLyi2y4YjC29cJyK5Tcj',
            '  balance after refusal: deposit=0.5000 held=0.0000 spent=0.2000',
            '  available=0.3000 cap=0.2000 testnet NEAR',
        ],
    },
}


def term_frame_v2(name, spec):
    """Terminal frame, vertically centred so there is no black void.
    Body lines are verbatim console lines or a one-line summary carrying
    the same tx hash / balances (values unchanged, JSON dropped)."""
    W, H = 1920, 1080
    img = Image.new('RGB', (W, H), (10, 10, 10))
    d = ImageDraw.Draw(img)
    f_title = ImageFont.truetype(SANS_B, 44)
    f_head = ImageFont.truetype(SANS, 34)
    f_body = ImageFont.truetype(MONO, 34)
    # Wrap body lines to the frame width.
    lines = []
    for ln in spec['lines']:
        lines.extend(wrap_text(d, ln, f_body, W - 160) or [''])
    block_h = 90 + 60 + len(lines) * 62
    y = max(120, (H - block_h) // 2)
    d.text((80, y), spec['title'], font=f_title, fill=(255, 255, 255))
    y += 90
    d.text((80, y), spec['head'], font=f_head, fill=(180, 180, 180))
    y += 80
    for ln in lines:
        d.text((80, y), ln, font=f_body, fill=(230, 230, 230))
        y += 62
    d.text((80, H - 60), 'Full log: repo/video/work/demo-run-console.log · explorer: testnet.nearblocks.io',
           font=ImageFont.truetype(SANS, 26), fill=(150, 150, 150))
    img.save(f'{FR}/{name}')
    print('wrote', f'{FR}/{name}')


if __name__ == '__main__':
    doc_card_v2()
    verify_card()
    tamper_card()
    replay_card()
    endcard_v2()
    thumbnail_v2()
    for name, spec in TERM_V2.items():
        term_frame_v2(name, spec)
