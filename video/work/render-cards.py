"""Render terminal frames (from term-frames.json, exact log lines), end cards,
and the thumbnail. All hashes come from the recorded run logs."""
import json
import textwrap
from PIL import Image, ImageDraw, ImageFont

WORK = '/home/hatch/workspace/near-meteredpay/repo/video/work'
FRAMES = WORK + '/frames'

MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
MONO_B = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'
SANS = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
SANS_B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'


def wrap(text, font, max_w, draw):
    words = text.split(' ')
    lines, cur = [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=font) <= max_w:
            cur = t
        else:
            if cur:
                lines.append(cur)
            # long unbreakable token: hard-split by characters
            while draw.textlength(w, font=font) > max_w:
                n = len(w)
                while n > 1 and draw.textlength(w[:n], font=font) > max_w:
                    n -= 1
                lines.append(w[:n])
                w = w[n:]
            cur = w
    if cur:
        lines.append(cur)
    return lines


def term_frame(title, body_lines, out_path):
    W, H = 1920, 1080
    img = Image.new('RGB', (W, H), (13, 17, 23))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 86], fill=(22, 27, 34))
    d.text((48, 22), 'MeteredPay — buyer terminal (recorded run, NEAR testnet)',
           font=ImageFont.truetype(MONO_B, 30), fill=(125, 211, 252))
    title_font = ImageFont.truetype(MONO_B, 34)
    body_font = ImageFont.truetype(MONO, 30)
    y = 130
    for tline in wrap(title, title_font, W - 96, d):
        d.text((48, y), tline, font=title_font, fill=(255, 255, 255))
        y += 46
    y += 30
    for line in body_lines:
        color = (125, 211, 252) if line.strip().startswith(('verified:', 'invalid response')) \
            else ((250, 204, 21) if 'refused:' in line else (226, 232, 240))
        if line.strip().startswith('['):
            color = (165, 180, 252)
        for wline in wrap(line, body_font, W - 96, d):
            d.text((48, y), wline, font=body_font, fill=color)
            y += 44
        y += 14
        if y > H - 60:
            break
    d.text((48, H - 56), 'testnet.nearblocks.io — every transaction above is on NEAR testnet',
           font=ImageFont.truetype(MONO, 26), fill=(148, 163, 184))
    img.save(out_path)
    print('wrote', out_path)


spec = json.load(open(WORK + '/term-frames.json'))
for f in spec:
    # Short one-line title; the exact command is body line 1 (so the chyron
    # pill at y=132 in the video never overlaps the wrapped command).
    term_frame('buyer terminal — ' + f['label'], [f['title']] + f['body'], f'{FRAMES}/{f["file"]}')


def end_card(out_path, lines):
    W, H = 1920, 1080
    img = Image.new('RGB', (W, H), (13, 60, 60))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 10], fill=(45, 212, 191))
    d.rectangle([0, H - 10, W, H], fill=(45, 212, 191))
    y = 300
    for text, size, color in lines:
        font = ImageFont.truetype(SANS_B if size >= 64 else SANS, size)
        w = d.textlength(text, font=font)
        d.text(((W - w) / 2, y), text, font=font, fill=color)
        y += int(size * 1.5)
    img.save(out_path)
    print('wrote', out_path)


end_card(f'{FRAMES}/endcard.png', [
    ('MeteredPay', 110, (255, 255, 255)),
    ('Failed call? Deducted: zero.', 64, (45, 212, 191)),
    ('NEAR testnet. Built at NEAR HACKATHON.', 48, (226, 232, 240)),
    ('Repo in the replies.', 48, (226, 232, 240)),
    ('Replay it yourself — same contract: apathetic-party.testnet', 40, (148, 163, 184)),
])
end_card(f'{FRAMES}/endcard-teaser.png', [
    ('MeteredPay', 110, (255, 255, 255)),
    ('apathetic-party.testnet', 64, (45, 212, 191)),
    ('NEAR testnet', 48, (226, 232, 240)),
])

# Thumbnail 1200x675 per the script spec: cold-open frame + three-row proof strip.
base = Image.open(f'{FRAMES}/s1-coldopen.png').convert('RGB')
base = base.resize((1200, 675))
d = ImageDraw.Draw(base)
d.rectangle([0, 500, 1200, 675], fill=(13, 17, 23))
rows = [
    ('Deducted', '0.1 testnet NEAR — success', (45, 212, 191)),
    ('Refunded', '0 testnet NEAR deducted — failed call', (250, 204, 21)),
    ('Refused', 'over_budget — refused on-chain', (226, 232, 240)),
]
y = 508
for label, desc, color in rows:
    f1 = ImageFont.truetype(SANS_B, 28)
    f2 = ImageFont.truetype(SANS, 26)
    d.text((40, y), label, font=f1, fill=color)
    d.text((260, y), desc, font=f2, fill=(226, 232, 240))
    y += 40
d.text((40, 632), 'NEAR testnet demo — no mainnet money. Built at NEAR HACKATHON.',
       font=ImageFont.truetype(SANS, 22), fill=(148, 163, 184))
base.save(f'{WORK}/../meteredpay-thumbnail-1200x675.png')
print('wrote thumbnail')
# 500px test render for the legibility check
base.resize((500, 281)).save('/tmp/thumb-500.png')
print('wrote /tmp/thumb-500.png')
