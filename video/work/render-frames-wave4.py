"""Wave-4 PIL frames (5 Nov 2026, ~23:59 UTC). No new recorded run.
All text is verbatim from the recorded run (buyer mp-video05.testnet,
5 Nov 2026) or arithmetic on that verbatim text (word/char counts).

Frames built:
- doc-success1.png: full-screen readable card of the actual checked
  document for L4 (c02 0:05-0:15 + teaser t02). Document text verbatim
  from buyer.mjs defaultInput template + build-dash.js PLAYBACK excerpt;
  input SHA-256 recomputed with shared/canonical.mjs and verified to
  match the run log (36ac8134...). Seller verdict wording matches the
  S3 receipt frames (build-dash.js PLAYBACK sellerOutput). Deduction
  tx + buyer-check line verbatim from the run log / console log.
  The fail companion is NOT built: fail-001's document is the same
  valid template (callId video05-fail-001) and the failure was the
  seller's scenario=fail (DEMO_SELLER_ERROR), not a wrong document
  field — no verbatim "one wrong field" exists to highlight.
- s1-coldopen-refunded.png: the REFUNDED (fail-001) row only, cropped
  from the 2x cold-open shot (orange outline detected), for V-F1.
- s1-threecards.png: the S1 three-card summary (Succeeded / Failed /
  Refused) cropped from the 2x shot, for V-F4 (1:40-1:47).
Composed frames are 1920x1080 on the dashboard paper background so
assemble.py's letterbox scaling keeps them legible; the chyron zone
(bottom-right, x>1450, y>950) is kept clear on the document card.
"""
import json
from PIL import Image, ImageDraw, ImageFont

WORK = '/home/hatch/workspace/near-meteredpay/repo/video/work'
FR = WORK + '/frames'
PAPER = (253, 253, 247)
INK = (28, 28, 26)
TEAL_D = (11, 94, 87)
MUTED = (74, 74, 68)

SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
SANS_B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'

DOC_TEXT = 'MeteredPay demo call video05-success-001: pay per successful call, nothing for a failure.'
INPUT_SHA = '36ac8134cccf4415452f06604cead78d39a37ad49e3ddcf0248453da2ef38063'
DED_TX = 'FdAowPRkBuUrQkGgTnfhfNsnvqHZTkNzpA1nyt1SMhFT'


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


def doc_card():
    W, H = 1920, 1080
    img = Image.new('RGB', (W, H), PAPER)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 10], fill=TEAL_D)
    d.text((96, 64), 'MeteredPay — recorded run · NEAR testnet',
           font=ImageFont.truetype(SANS_B, 30), fill=TEAL_D)
    d.text((96, 124), 'The document being checked',
           font=ImageFont.truetype(SANS_B, 54), fill=INK)
    d.text((96, 206), 'Call video05-success-001  ·  schema: quote  ·  seller tedious-sea.testnet',
           font=ImageFont.truetype(SANS, 32), fill=INK)
    # Document box.
    d.rounded_rectangle([96, 280, 1824, 580], radius=12, outline=TEAL_D, width=3, fill=(255, 255, 255))
    d.text((140, 312), 'document.text — verbatim from the recorded run:',
           font=ImageFont.truetype(SANS_B, 30), fill=MUTED)
    font_doc = ImageFont.truetype(SANS, 44)
    y = 372
    for line in wrap_text(d, DOC_TEXT, font_doc, 1824 - 280):
        d.text((140, y), line, font=font_doc, fill=INK)
        y += 58
    # Facts.
    y = 640
    d.text((96, y), 'Words: 12  ·  Characters: 89',
           font=ImageFont.truetype(SANS, 32), fill=INK)
    y += 62
    d.text((96, y), 'Input SHA-256:', font=ImageFont.truetype(SANS_B, 32), fill=INK)
    d.text((96, y + 44), INPUT_SHA, font=ImageFont.truetype(MONO, 30), fill=INK)
    y += 128
    d.text((96, y), 'Seller verdict: valid, no errors — deducted 0.1 testnet NEAR',
           font=ImageFont.truetype(SANS, 32), fill=INK)
    y += 56
    d.text((96, y), 'Deduction tx: ' + DED_TX, font=ImageFont.truetype(MONO, 28), fill=INK)
    d.text((96, 990), 'Buyer mp-video05.testnet · 5 Nov 2026 · input SHA-256 recomputed from this document.',
           font=ImageFont.truetype(SANS, 26), fill=MUTED)
    img.save(f'{FR}/doc-success1.png')
    print('wrote', f'{FR}/doc-success1.png')


def _orange_bbox(path):
    """Bounding box of the thick orange outline (#b45309) around the
    REFUNDED row: scan rows for long horizontal orange runs. Returns
    the outline box EXACTLY (no y padding: 10 px above/below would pull
    in slivers of the neighbouring rows)."""
    im = Image.open(path).convert('RGB')
    w, h = im.size
    px = im.load()
    def is_orange(r, g, b):
        return abs(r - 180) < 40 and abs(g - 83) < 40 and abs(b - 9) < 40
    band_rows = []
    for yy in range(h):
        n = sum(1 for xx in range(0, w, 2) if is_orange(*px[xx, yy]))
        if n > 400:  # outline spans ~1400 px; badge borders are far shorter
            band_rows.append(yy)
    assert len(band_rows) >= 2, 'outline bands not found'
    top, bot = min(band_rows), max(band_rows)
    xs = []
    for yy in (top, bot):
        xs += [xx for xx in range(0, w, 2) if is_orange(*px[xx, yy])]
    return (min(xs) - 10, top, max(xs) + 10, bot)


def _cards_bbox(path):
    """Bounding box of the three S1 proof cards: their 1 px #c9c7b8
    borders form the longest horizontal lines in the cards region."""
    im = Image.open(path).convert('RGB')
    w, h = im.size
    px = im.load()
    def is_line(r, g, b):
        return abs(r - 201) < 12 and abs(g - 199) < 12 and abs(b - 184) < 12
    rows = []
    for yy in range(300, 900):
        n = sum(1 for xx in range(0, w, 2) if is_line(*px[xx, yy]))
        if n > 500:
            rows.append(yy)
    assert len(rows) >= 2, 'card border rows not found'
    top, bot = min(rows), max(rows)
    cols = []
    for xx in range(0, w, 2):
        n = sum(1 for yy in range(top, bot + 1, 2) if is_line(*px[xx, yy]))
        if n > 100:
            cols.append(xx)
    return (min(cols), top, max(cols), bot)


def coldopen_refunded():
    src = f'{FR}/z2-coldopen-row.png'
    box = _orange_bbox(src)
    print('REFUNDED row box:', box)
    im = Image.open(src).convert('RGB').crop(box)
    # Scale to near-full width on a 1920x1080 paper canvas.
    tw = 1860
    th = round(im.height * tw / im.width)
    im = im.resize((tw, th), Image.LANCZOS)
    canvas = Image.new('RGB', (1920, 1080), PAPER)
    canvas.paste(im, ((1920 - tw) // 2, (1080 - th) // 2))
    canvas.save(f'{FR}/s1-coldopen-refunded.png')
    print('wrote', f'{FR}/s1-coldopen-refunded.png', 'strip', tw, 'x', th)


def threecards():
    src = f'{FR}/z2-threecards.png'
    box = _cards_bbox(src)
    print('cards box:', box)
    im = Image.open(src).convert('RGB').crop(box)
    tw = 1780
    th = round(im.height * tw / im.width)
    im = im.resize((tw, th), Image.LANCZOS)
    canvas = Image.new('RGB', (1920, 1080), PAPER)
    canvas.paste(im, ((1920 - tw) // 2, (1080 - th) // 2))
    canvas.save(f'{FR}/s1-threecards.png')
    print('wrote', f'{FR}/s1-threecards.png', 'cards', tw, 'x', th)


doc_card()
coldopen_refunded()
threecards()
print('RENDER-FRAMES-WAVE4 DONE')
