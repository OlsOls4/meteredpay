// Build terminal frames (from the real console logs — lines are extracted
// programmatically, never retyped), the end cards, and the thumbnail.
// Terminal frames render the actual buyer-script output of the recorded runs.
import fs from 'node:fs';


const WORK = '/home/hatch/workspace/near-meteredpay/repo/video/work';
const DEMO_LOG = fs.readFileSync(WORK + '/demo-run-console.log', 'utf8');
const TAMPER_LOG = fs.readFileSync(WORK + '/tamper-run-console.log', 'utf8');

function linesContaining(log, needles, maxChars) {
  const out = [];
  for (const line of log.split('\n')) {
    if (needles.some(n => line.includes(n))) out.push(line);
  }
  return out;
}
// Pick exact lines (kept whole; the renderer wraps them visually).
const pick = (log, needle) => {
  const l = log.split('\n').find(x => x.includes(needle));
  if (!l) throw new Error('line not found: ' + needle);
  return l;
};
const frames = [
  {
    file: 'term-deposit.png',
    label: 'deposit + cap',
    title: '$ node buyer.mjs --buyer mp-video05.testnet --mode demo --tag video05 --deposit 0.5 --cap 0.2',
    body: [
      pick(DEMO_LOG, '[deposit]'),
      pick(DEMO_LOG, 'balance after deposit:'),
      pick(DEMO_LOG, '[set_budget_cap]'),
      pick(DEMO_LOG, 'balance after cap:'),
    ],
  },
  {
    file: 'term-verify1.png',
    label: 'success #1 — verification',
    title: '$ node buyer.mjs --buyer mp-video05.testnet --mode demo --tag video05 --deposit 0.5 --cap 0.2   — call video05-success-001',
    body: [
      pick(DEMO_LOG, 'verified: response hash matches, seller attestation valid for video05-success-001'),
      pick(DEMO_LOG, '[success-deducted]').replace('{"call_id":"video05-success-001"', '{"call_id":"video05-success-001"'),
    ],
  },
  {
    file: 'term-fail.png',
    label: 'fail — failure claim',
    title: '$ node buyer.mjs --buyer mp-video05.testnet --mode demo --tag video05 --deposit 0.5 --cap 0.2   — call video05-fail-001',
    body: [
      pick(DEMO_LOG, 'verified: seller error attestation valid for video05-fail-001'),
      pick(DEMO_LOG, '[failed-refunded]'),
      pick(DEMO_LOG, 'balance after failure claim video05-fail-001'),
    ],
  },
  {
    file: 'term-timeout.png',
    label: 'timeout — 30 s wait, settled row',
    title: '$ node buyer.mjs --buyer mp-video05.testnet --mode demo --tag video05 --deposit 0.5 --cap 0.2   — call video05-timeout-001',
    body: [
      pick(DEMO_LOG, 'waiting up to 30s'),
      pick(DEMO_LOG, 'seller did not respond within 30s'),
      pick(DEMO_LOG, '[timeout-refunded]'),
    ],
  },
  {
    file: 'term-tamper.png',
    label: 'tamper — separate run, same contract',
    title: '$ node buyer.mjs --buyer mp-tamper05.testnet --mode single --tag tamper05 --api http://127.0.0.1:8789 --deposit 0.5 --cap 0.2   — separate run',
    body: [
      pick(TAMPER_LOG, 'invalid response for tamper05-'),
      pick(TAMPER_LOG, '[failed-refunded]'),
      pick(TAMPER_LOG, 'balance after failure claim tamper05-'),
    ],
  },
  {
    file: 'term-verify2.png',
    label: 'success #2 — verification',
    title: '$ node buyer.mjs --buyer mp-video05.testnet --mode demo --tag video05 --deposit 0.5 --cap 0.2   — call video05-success-002',
    body: [
      pick(DEMO_LOG, 'verified: response hash matches, seller attestation valid for video05-success-002'),
      pick(DEMO_LOG, 'video05-success-002","tx":"FiHaJ9uv'),
    ],
  },
  {
    file: 'term-refusal.png',
    label: 'refusal — over_budget',
    title: '$ node buyer.mjs --buyer mp-video05.testnet --mode demo --tag video05 --deposit 0.5 --cap 0.2   — call video05-overbudget-001',
    body: [
      pick(DEMO_LOG, 'refused: video05-overbudget-001'),
      pick(DEMO_LOG, '[refused]'),
      pick(DEMO_LOG, 'balance after refusal video05-overbudget-001'),
    ],
  },
];
fs.writeFileSync(WORK + '/term-frames.json', JSON.stringify(frames, null, 2));
console.log('term frames spec written:', frames.map(f => f.file).join(', '));
// sanity: every tx hash in the spec must be in the run logs
const allText = DEMO_LOG + TAMPER_LOG;
for (const f of frames) for (const line of f.body) {
  for (const m of line.matchAll(/[A-Za-z0-9]{43,44}/g)) {
    if (!allText.includes(m[0]) && !/^(video05|tamper05)/.test(m[0])) throw new Error('hash not in run logs: ' + m[0]);
  }
}
console.log('all hashes in spec verified against the run logs');
