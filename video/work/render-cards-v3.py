"""Video v3 new rendered elements (6 Nov 2026). Extends render-cards-v2.py.
All values verbatim from the recorded run (buyer mp-video05.testnet,
5 Nov 2026; tamper beat buyer mp-tamper05.testnet) or the run logs.
No value invented. Character count is 89 (verified: the video05 document
text recomputes input SHA-256 36ac8134... exactly; the "92" in earlier
drafts is the freeze1011 run's count — longer call id).

New frames:
- titlecard-v3.png: Shot A title card (no face, no presenter credit).
- endcard-v3.png: Shot M end card — three summary rows + repo + contract
  + v3 disclosure ("Narration: synthetic voiceover. ...").
- fail-release-only.png: Shot B trimmed terminal frame — release line
  only, no balances (spoiler withheld).
- final-strip-card.png: Shot K — final balances, large, nothing else moving.
- strip-*.png: persistent balance strip (1920x96, bottom band y=984-1080),
  one per balance state, changed values highlighted Amber; optional
  second line carries the explorer URL pill / footline for that clip.
  Palette (v2): Ink #0F2A2E / Paper #F7F4EE / Teal #0E7C6B /
  Mint #8FE3C0 / Amber #D97706.
"""
import os
from PIL import Image, ImageDraw, ImageFont

WORK = '/home/hatch/workspace/near-meteredpay/repo/video/work'
FR = WORK + '/frames'
VIDEO = '/home/hatch/workspace/near-meteredpay/repo/video'
# Palette copied from render-cards-v2.py (same values).
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

INK_RGB = (15, 42, 46)
TEAL_RGB = (14, 124, 107)
MINT_RGB = (143, 227, 192)
AMBER_RGB = (217, 119, 6)
PAPER_RGB = (247, 244, 238)
SUBTLE = (184, 196, 192)


def _f(path, size, bold=False):
    return ImageFont.truetype(SANS_B if bold else SANS, size)


def _mf(size, bold=False):
    return ImageFont.truetype(MONO, size)


def title_card():
    img = Image.new('RGB', (1920, 1080), PAPER_RGB)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 1920, 10], fill=TEAL_RGB)
    f_name = ImageFont.truetype(SANS_B, 150)
    f_tag = ImageFont.truetype(SANS, 56)
    f_sub = ImageFont.truetype(SANS, 38)
    for text, font, y, fill in [
            ('MeteredPay', f_name, 330, TEAL_RGB),
            ('Pay only when the work checks out.', f_tag, 540, INK_RGB),
            ('Built at NEAR Hackathon · testnet demo', f_sub, 650, MUTED)]:
        w = d.textlength(text, font=font)
        d.text(((1920 - w) / 2, y), text, font=font, fill=fill)
    d.text((96, 990), 'Testnet only — no mainnet money.',
           font=ImageFont.truetype(SANS, 26), fill=MUTED)
    img.save(f'{FR}/titlecard-v3.png')
    print('wrote', f'{FR}/titlecard-v3.png')


def endcard_v3():
    img, d = base()
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
    d.text((96, 710), 'Replay it yourself — same contract: apathetic-party.testnet',
           font=ImageFont.truetype(SANS, 36), fill=INK)
    d.text((96, 780), 'Replay it yourself — link\u2019s in the replies.',
           font=ImageFont.truetype(SANS, 36), fill=INK)
    d.text((96, 900), 'Narration: synthetic voiceover. Demo frames rendered from the real run log — not a live screen recording.',
           font=ImageFont.truetype(SANS, 24), fill=MUTED)
    d.text((96, 936), 'Testnet only — no mainnet money. Replay reproduces the deposit, the two successes and the refusal;',
           font=ImageFont.truetype(SANS, 24), fill=MUTED)
    d.text((96, 972), 'the failure and tamper beats use the same commands with the seller\u2019s scenario switch.',
           font=ImageFont.truetype(SANS, 24), fill=MUTED)
    img.save(f'{FR}/endcard-v3.png')
    print('wrote', f'{FR}/endcard-v3.png')


def fail_release_only():
    W, H = 1920, 1080
    img = Image.new('RGB', (W, H), (10, 10, 10))
    d = ImageDraw.Draw(img)
    f_title = ImageFont.truetype(SANS_B, 44)
    f_head = ImageFont.truetype(SANS, 34)
    f_body = ImageFont.truetype(MONO, 34)
    f_big = ImageFont.truetype(SANS_B, 48)
    lines = [
        '  release tx (buyer failure claim): 7j4Jijr9sptyhgfzv9r6CPXYd3B2enzVBNXnedHgzJaA',
    ]
    wrapped = []
    for ln in lines:
        wrapped.extend(wrap_text(d, ln, f_body, W - 160) or [''])
    block_h = 90 + 60 + len(wrapped) * 62 + 110
    y = max(120, (H - block_h) // 2)
    d.text((80, y), 'Buyer console — failed call, money released', font=f_title, fill=(255, 255, 255))
    y += 90
    d.text((80, y), 'Buyer mp-video05.testnet · 5 Nov 2026', font=f_head, fill=(180, 180, 180))
    y += 80
    for ln in wrapped:
        d.text((80, y), ln, font=f_body, fill=(230, 230, 230))
        y += 62
    y += 30
    d.text((80, y), 'Deducted: 0 testnet NEAR', font=f_big, fill=(143, 227, 192))
    y += 80
    d.text((80, y), 'The held 0.1 testnet NEAR is released, never deducted.',
           font=ImageFont.truetype(SANS, 32), fill=(230, 230, 230))
    d.text((80, H - 60), 'Full log: repo/video/work/demo-run-console.log · explorer: testnet.nearblocks.io',
           font=ImageFont.truetype(SANS, 26), fill=(150, 150, 150))
    img.save(f'{FR}/fail-release-only.png')
    print('wrote', f'{FR}/fail-release-only.png')


def final_strip_card():
    img, d = base()
    header(d, 'One honest limit.',
           'Final balances — buyer mp-video05.testnet · 5 Nov 2026 · NEAR testnet')
    rows = [
        ('Deposit', '0.5 testnet NEAR'),
        ('Held', '0 testnet NEAR'),
        ('Spent', '0.2 testnet NEAR'),
        ('Available', '0.3 testnet NEAR'),
        ('Cap', '0.2 testnet NEAR'),
    ]
    y = 320
    for label, val in rows:
        d.text((140, y), label, font=ImageFont.truetype(SANS_B, 56), fill=INK)
        d.text((700, y), val, font=ImageFont.truetype(SANS_B, 56), fill=TEAL_D)
        y += 96
    d.text((96, 900), 'Spent 0.2 = cap — the next call was refused on-chain.',
           font=ImageFont.truetype(SANS, 32), fill=INK)
    d.text((96, 990), 'This protects the buyer, not the seller. A dishonest buyer could still claim a failure.',
           font=ImageFont.truetype(SANS, 26), fill=MUTED)
    img.save(f'{FR}/final-strip-card.png')
    print('wrote', f'{FR}/final-strip-card.png')


# Balance states: (deposit, held, spent, available, cap)
STATES = {
    's0': ('0.5', '0', '0', '0.5', '0.2'),    # deposit-time
    's1': ('0.5', '0', '0.1', '0.4', '0.2'),  # after success #1
    's2': ('0.5', '0', '0.2', '0.3', '0.2'),  # after success #2 (final)
}
LABELS = ['Deposit', 'Held', 'Spent', 'Available', 'Cap']


def strip_png(state, highlight=(), subline=None):
    """Render the persistent balance strip (1920x96, overlaid at y=984).
    highlight: subset of ('spent','available') whose values render Amber.
    Returns the file path."""
    vals = STATES[state]
    import hashlib
    subtag = ('-sub' + hashlib.md5((subline or '').encode()).hexdigest()[:6]) if subline else ''
    name = f'strip-{state}' + (''.join('-' + h[:2] for h in highlight)) + subtag
    path = f'{FR}/{name}.png'
    if os.path.exists(path):
        return path
    img = Image.new('RGB', (1920, 96), INK_RGB)
    d = ImageDraw.Draw(img)
    f_lab = ImageFont.truetype(SANS, 26)
    f_val = ImageFont.truetype(SANS_B, 28)
    f_val_hl = ImageFont.truetype(SANS_B, 28)
    f_sub = ImageFont.truetype(SANS, 20)
    keys = ['deposit', 'held', 'spent', 'available', 'cap']
    # Build segments: (text, font, fill)
    segs = []
    for i, (lab, val, key) in enumerate(zip(LABELS, vals, keys)):
        if i:
            segs.append(('  ·  ', f_lab, MINT_RGB))
        segs.append((lab + ' ', f_lab, (255, 255, 255)))
        segs.append((val, f_val_hl if key in highlight else f_val,
                     AMBER_RGB if key in highlight else (255, 255, 255)))
    segs.append((' testnet NEAR', f_lab, MINT_RGB))
    total = sum(d.textlength(t, font=f) for t, f, _ in segs)
    x = (1920 - total) / 2
    y = 10 if subline else 30
    for t, f, fill in segs:
        d.text((x, y), t, font=f, fill=fill)
        x += d.textlength(t, font=f)
    if subline:
        w = d.textlength(subline, font=f_sub)
        d.text(((1920 - w) / 2, 56), subline, font=f_sub, fill=SUBTLE)
    img.save(path)
    print('wrote', path)
    return path


if __name__ == '__main__':
    title_card()
    endcard_v3()
    fail_release_only()
    final_strip_card()
    strip_png('s0')
    strip_png('s1')
    strip_png('s1', highlight=('spent', 'available'))
    strip_png('s2', highlight=('spent', 'available'))
    strip_png('s2')
    strip_png('s0', subline='Testnet only — no mainnet money.')
    strip_png('s1', highlight=('spent', 'available'),
              subline='Deduction tx FdAowPRk…SMhFT · testnet.nearblocks.io')
    strip_png('s1', subline='Release tx 7j4Jijr9…HgzJaA · testnet.nearblocks.io')
    strip_png('s1', subline='Release tx 7rEaW3An…PgGU7 · testnet.nearblocks.io')
    strip_png('s2', highlight=('spent', 'available'),
              subline='Deduction tx FiHaJ9uv…YwcDT · testnet.nearblocks.io')
    strip_png('s2', subline='Backstop: 600 s — buyer can reclaim after expiry. · Refusal tx 8sPCKFBt…K5Tcj · testnet.nearblocks.io')
    strip_png('s2', subline='Refusal tx 8sPCKFBt…K5Tcj · testnet.nearblocks.io')
