// Build the video dashboard copy: same dashboard HTML/CSS/JS as the repo,
// with the PLAYBACK table replaced by the single recorded run's real rows
// (buyer mp-video05.testnet, 5 Nov 2026). The repo dashboard/ is untouched.
// All hashes/balances below come from buyer/runs/demo-mp-video05.testnet-2026-11-05T22-14-54.jsonl
// (exit 0, final 0.5/0/0.2/0.3/0.2). Fail error hash recomputed with the
// frozen shared/canonical.mjs; success input_sha256 likewise.
const fs = require('fs');
const path = require('path');
const SRC = '/home/hatch/workspace/near-meteredpay/repo/dashboard';
const DST = '/home/hatch/workspace/near-meteredpay/repo/video/work/dash';
fs.mkdirSync(DST, { recursive: true });
for (const f of ['styles.css']) fs.copyFileSync(path.join(SRC, f), path.join(DST, f));
let idx = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');
idx = idx.replace('The recorded\n    5 Nov run above used the earlier word-count service; replay live\n    on S5 to see the new service.',
  'The recorded run above used the schema-validation service.');
// Table caption + S2 default buyer: point at this run, not the earlier one.
idx = idx.replace('Earlier run — word-count service, 5 Nov 2026. The current seller is the schema-validation service; replay live on S5 to see it.',
  'Recorded run — schema-validation service, 5 Nov 2026. Buyer mp-video05.testnet.');
idx = idx.replace('value="good-example.testnet"', 'value="mp-video05.testnet"');
// (same slots: success#1 deduction, fail release, success#2 deduction,
// refusal, timeout release) so no cross-run hash appears in any frame.
const SWAP = [
  ['JDmqNR3sqJ274wj12FRjg5FJwMDnxakpAeZr8RuVSkwg', 'FdAowPRkBuUrQkGgTnfhfNsnvqHZTkNzpA1nyt1SMhFT', 'JDmqNR3s…', 'FdAowPRk…'],
  ['BX3Emksn2UxigMRSdYUzQ8oqoSpjJMnWpKddT4BWQAgj', '7j4Jijr9sptyhgfzv9r6CPXYd3B2enzVBNXnedHgzJaA', 'BX3Emksn…', '7j4Jijr9…'],
  ['BZRSwq2SdtYA7RaQ6NSPUA8Kp5yVkfvzs4t3NYpmzKZj', 'FiHaJ9uvAMUPM3N1kWvpdoMxk77SodCyLRgxqX2YwcDT', 'BZRSwq2S…', 'FiHaJ9uv…'],
  ['7zW3UAva9vjiGjxx7DuEZ8D9uFTEdVZ2xiCMhXpTStu2', '8sPCKFBtB3CKeyBXyxoUqwtuDLyi2y4YjC29cJyK5Tcj', '7zW3UAva…', '8sPCKFBt…'],
  ['3XorTaigTfzfzzQvfKB9oX1k8NEESpFXYcPQUZphDvCy', 'FqP9nzPK5VShJpJTSD6L7vUSceV4n5BbUjqDaCUCk8nU', '3XorTaig…', 'FqP9nzPK…'],
];
for (const [oldH, newH, oldS, newS] of SWAP) {
  if (!idx.includes(oldH)) throw new Error('S5 example hash not found: ' + oldH);
  idx = idx.replaceAll(oldH, newH).replaceAll(oldS, newS);
}
fs.writeFileSync(path.join(DST, 'index.html'), idx);

const PLAYBACK = [
  {
    id: 'video05-success-001', kind: 'success', label: 'Succeeded',
    requestTx: '943GuoYMN6g7ukc8DVBBK78fQv9zwTWbxo6pFUq3huD2',
    settleTx: 'FdAowPRkBuUrQkGgTnfhfNsnvqHZTkNzpA1nyt1SMhFT',
    settleKind: 'Deduction transaction',
    responseHash: '2edf3f35e9ad2cc8d4668a8ba9c7a02157ea25ad708e1dda00b5c08b7ef0124b',
    sellerOutput: 'Schema-validation service meteredpay-schema-validate — document validated against the quote schema: valid, no errors. Input SHA-256 36ac8134cccf4415452f06604cead78d39a37ad49e3ddcf0248453da2ef38063. Excerpt "MeteredPay demo call video05-success-001: pay per successful call, nothing for a failure."',
    sellerService: 'Schema-validation service (meteredpay-schema-validate)',
    amount: 'Deducted 0.1 testnet NEAR',
    balAfter: { deposit: '0.5', held: '0', spent: '0.1', available: '0.4', cap: '0.2' },
    note: 'Buyer verified the seller signature before signing.'
  },
  {
    id: 'video05-fail-001', kind: 'fail', label: 'Failed',
    requestTx: '6XsMx3bKnjrpiUDfwMc5o55GosL8B7Qgx2sX2o9PD2JL',
    settleTx: '7j4Jijr9sptyhgfzv9r6CPXYd3B2enzVBNXnedHgzJaA',
    settleKind: 'Release transaction (buyer failure claim)',
    responseHash: 'a0365a3ef8a1097c47f89f08aa3695c85236144edfcc8783dc2823bc9fde7229',
    sellerOutput: 'Seller error DEMO_SELLER_ERROR — "Demonstrator seller failed this call on purpose (scenario=fail)." Signed seller error attestation present (error hash a0365a3e…fde7229); the buyer submitted the failure claim with that evidence.',
    sellerService: 'Schema-validation service (returned a signed seller error attestation, not a successful output)',
    amount: 'Refunded — held amount released, never deducted (0 testnet NEAR deducted)',
    balAfter: { deposit: '0.5', held: '0', spent: '0.1', available: '0.4', cap: '0.2' },
    note: 'The buyer submitted a failure claim; that claim released the hold.'
  },
  {
    id: 'video05-timeout-001', kind: 'timeout', label: 'Failed (timeout)',
    requestTx: '9zEfv7JQjFD1b3CcK2Agdc4x7c6a3HhKXz1MLmywHXhh',
    settleTx: 'FqP9nzPK5VShJpJTSD6L7vUSceV4n5BbUjqDaCUCk8nU',
    settleKind: 'Release transaction (buyer timeout claim)',
    responseHash: null,
    sellerOutput: 'No seller response within the 30-second buyer wait. No seller evidence was supplied — the buyer submitted a timeout claim without seller evidence, and the hold was released on that claim.',
    sellerService: 'Schema-validation service (no response received within the 30-second buyer wait)',
    amount: 'Refunded — held amount released, never deducted (0 testnet NEAR deducted)',
    balAfter: { deposit: '0.5', held: '0', spent: '0.1', available: '0.4', cap: '0.2' },
    note: 'No receipt arrived in 30 s, so the buyer claimed timeout; that claim released the hold.'
  },
  {
    id: 'video05-success-002', kind: 'success', label: 'Succeeded',
    requestTx: 'AXEiBcbcjyxjTPcnjLSqikBLs1PE8YhBiRfVGFx1hzZN',
    settleTx: 'FiHaJ9uvAMUPM3N1kWvpdoMxk77SodCyLRgxqX2YwcDT',
    settleKind: 'Deduction transaction',
    responseHash: '6db115057e3723b8496234042ff6e0a6b29b13548ec2c1f087061398ed08680d',
    sellerOutput: 'Schema-validation service meteredpay-schema-validate — document validated against the quote schema: valid, no errors. Input SHA-256 40236db7f6826fdc591d68411d0a0efd708ee11f60565b76a01e8a9ad5f82599. Excerpt "MeteredPay demo call video05-success-002: pay per successful call, nothing for a failure."',
    sellerService: 'Schema-validation service (meteredpay-schema-validate)',
    amount: 'Deducted 0.1 testnet NEAR',
    balAfter: { deposit: '0.5', held: '0', spent: '0.2', available: '0.3', cap: '0.2' },
    note: 'Buyer verified the seller signature before signing.'
  },
  {
    id: 'video05-overbudget-001', kind: 'refusal', label: 'Refused',
    requestTx: '8sPCKFBtB3CKeyBXyxoUqwtuDLyi2y4YjC29cJyK5Tcj',
    settleTx: null,
    settleKind: null,
    responseHash: null,
    sellerOutput: 'No seller call was made. The contract refused the request before any hold: reason over_budget (verbatim).',
    sellerService: 'None — no seller call was made; the contract refused the request before any seller call',
    amount: '0 — refused (balances unchanged)',
    balAfter: { deposit: '0.5', held: '0', spent: '0.2', available: '0.3', cap: '0.2' },
    note: 'Refusal is a successful transaction with an on-chain refusal record — not a failed transaction.'
  }
];

let app = fs.readFileSync(path.join(SRC, 'app.js'), 'utf8');
const start = app.indexOf('  var PLAYBACK = [');
const end = app.indexOf('];', start) + 2;
if (start < 0 || end < 2) throw new Error('PLAYBACK block not found');
const replacement = '  var PLAYBACK = ' + JSON.stringify(PLAYBACK, null, 2).replace(/\n/g, '\n  ') + ';';
app = app.slice(0, start) + replacement + app.slice(end);
app = app.replace('Buyer good-example.testnet, 5 Nov 2026, deposit 0.5, cap 0.2.',
  'Buyer mp-video05.testnet, 5 Nov 2026, deposit 0.5, cap 0.2 (video recorded run).');
fs.writeFileSync(path.join(DST, 'app.js'), app);

let cfg = fs.readFileSync(path.join(SRC, 'config.js'), 'utf8');
cfg = cfg.replace("DEMO_BUYER: 'good-example.testnet'", "DEMO_BUYER: 'mp-video05.testnet'");
fs.writeFileSync(path.join(DST, 'config.js'), cfg);
// Guided proof (S1 "See the 60-second proof"): point its hardcoded call IDs
// at this run's calls and drop the "earlier run" wording, so the guided
// cards render this run's real data.
app = app.replace("var GUIDED_IDS = ['demo-success-001', 'demo-fail-001', 'demo-overbudget-001'];",
  "var GUIDED_IDS = ['video05-success-001', 'video05-fail-001', 'video05-overbudget-001'];");
app = app.replace("var currentCall = 'demo-success-001';", "var currentCall = 'video05-success-001';");
app = app.replace("if (guidedTimeoutOn) ids.push('demo-timeout-001');",
  "if (guidedTimeoutOn) ids.push('video05-timeout-001');");
app = app.replace("'<p class=\"small\">Service (earlier run): ' + esc(r.sellerService) + ' — the current seller is the schema-validation service; replay live on S5 to see it.</p>'",
  "'<p class=\"small\">Service: ' + esc(r.sellerService) + '.</p>'");
fs.writeFileSync(path.join(DST, 'app.js'), app);
console.log('dashboard copy built at', DST);
