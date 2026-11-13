// MeteredPay dashboard (days 6-7). Static, no build step, no dependencies.
// READ-ONLY: this page never signs, never sends a contract transaction,
// and never asks for a private key or seed phrase. Every money claim
// links to a real testnet explorer transaction. Wording follows
// Wording (Wave 6, 13 Nov 2026): "Refunded" is replaced by
// hold-released wording ("Hold released — never deducted") — a failed
// call was never deducted, so "refunded" misleads. Five numbers
// everywhere, no red, TESTNET on every money surface. Contract: apathetic-party.testnet, seller tedious-sea.testnet,
// price 0.1 testnet NEAR/call, demo deposit 0.5, cap 0.2, buyer wait
// 30 s, backstop 600 s.
(function () {
  'use strict';
  var C = window.METEREDPAY_CONFIG;
  var EX = C.EXPLORER_TX;

  // ------------------------------------------------------------------
  // Recorded demo run (Journey 0 playback). Static data only — rendering
  // this view makes ZERO contract calls and ZERO network requests.
  // Buyer freeze1011-buyer.testnet, 5 Nov 2026 21:06 UTC (canonical replay, see dashboard/frozen-run.json), deposit 0.5, cap 0.2. Service: meteredpay-schema-validate.
  // ------------------------------------------------------------------
  var PLAYBACK = [
    {
      id: 'freeze1011-success-001', kind: 'success', label: 'Succeeded',
      requestTx: '8UKh7z4zhkhPfPnQhwAi3iajynijjmLMbewDPqSVGgE',
      settleTx: 'BD3fkPVQNBBPjroxS85y3Bam2GK87TxDKSiFMVehC3Zd',
      settleKind: 'Deduction transaction',
      responseHash: '58aa417c4bd47cec7d786f9381fb8a54aeb08585933b06f692afe2fab19b65be',
      sellerOutput: 'Schema-validation success (quote schema): valid, word_count 12, char_count 92, excerpt "MeteredPay demo call freeze1011-success-001: pay per successful call, nothing for a failure.", input_sha256 780502d84853e928fb0ab6931bf34ab8c5a582a00a5bcf348684ce0fd489c311.',
      sellerService: 'meteredpay-schema-validate (JSON schema-validation service)',
      amount: 'Deducted 0.1 testnet NEAR',
      balAfter: { deposit: '0.5', held: '0', spent: '0.1', available: '0.4', cap: '0.2' },
      note: 'Buyer verified the seller signature before signing.'
    },
    {
      id: 'freeze1011-fail-001', kind: 'fail', label: 'Failed',
      requestTx: '3fJJUvQj37xgym8Ra9tW6geBt99mwU735JFvifDvmmWu',
      settleTx: '3a6juX9uJHB5fr2C9emqfR82jJD8nijCnb4k1TPwQo9e',
      settleKind: 'Release transaction (buyer failure claim)',
      responseHash: null,
      sellerOutput: 'Seller error DEMO_SELLER_ERROR — "Demonstrator seller failed this call on purpose (scenario=fail)." Signed seller error attestation present; the buyer submitted the failure claim with that evidence. (The error attestation hash is not recorded in the freeze1011 run log.)',
      sellerService: 'meteredpay-schema-validate (returned a signed seller error attestation, not a successful output)',
      amount: 'Hold released — never deducted (0 testnet NEAR deducted)',
      balAfter: { deposit: '0.5', held: '0', spent: '0.1', available: '0.4', cap: '0.2' },
      note: 'The buyer submitted a failure claim; that claim released the hold.'
    },
    {
      id: 'freeze1011-timeout-001', kind: 'timeout', label: 'Failed (timeout)',
      requestTx: 'EKjUSkPVXvVHe8VcZArjMMJF1cG1dGNeiPnmLWHdhMkU',
      settleTx: 'C2EXM52zH62Y4JZ6ZaqF6DCo2tXuhW369dYhTKnStycB',
      settleKind: 'Release transaction (buyer timeout claim)',
      responseHash: null,
      sellerOutput: 'No seller response within the 30-second buyer wait. No seller evidence was supplied — the buyer submitted a timeout claim without seller evidence, and the hold was released on that claim.',
      sellerService: 'meteredpay-schema-validate (no response received within the 30-second buyer wait)',
      amount: 'Hold released — never deducted (0 testnet NEAR deducted)',
      balAfter: { deposit: '0.5', held: '0', spent: '0.1', available: '0.4', cap: '0.2' },
      note: 'No receipt arrived in 30 s, so the buyer claimed timeout; that claim released the hold.'
    },
    {
      id: 'freeze1011-success-002', kind: 'success', label: 'Succeeded',
      requestTx: '4rzhEpkJGUgSNupKXXdFWHtkfCzywzTNoxF9kZeL1rnL',
      settleTx: 'C34RNjN1r2MJmona6ZRYNEc6UdrVwQYTaoRdXFvkYGUb',
      settleKind: 'Deduction transaction',
      responseHash: 'c8516657a12d2deaaf405c73174f6f8a4a6cd728b4bf4d53c7b9b9f9e8102dfd',
      sellerOutput: 'Schema-validation success (quote schema): valid, word_count 12, char_count 92, excerpt "MeteredPay demo call freeze1011-success-002: pay per successful call, nothing for a failure.", input_sha256 128a907f18354848386c7697bc0b368add106ac8eab7a7c259befe004278d9db.',
      sellerService: 'meteredpay-schema-validate (JSON schema-validation service)',
      amount: 'Deducted 0.1 testnet NEAR',
      balAfter: { deposit: '0.5', held: '0', spent: '0.2', available: '0.3', cap: '0.2' },
      note: 'Buyer verified the seller signature before signing. Spent now 0.2 = cap — the next call will be refused.'
    },
    {
      id: 'freeze1011-overbudget-001', kind: 'refusal', label: 'Refused',
      requestTx: 'ESem4KumVHwC7FfT6TT2aqrcsi4R1jGfFt66LhDTZ2qm',
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

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function txLink(hash) { return '<a class="hash" href="' + EX + esc(hash) + '" target="_blank" rel="noopener">View on testnet explorer</a>'; }
  function blockLink(height) { return '<a class="hash" href="' + esc(C.EXPLORER_BLOCK) + esc(String(height)) + '" target="_blank" rel="noopener">Block ' + esc(String(height)) + ' on testnet explorer</a>'; }
  function shortHash(h) { return esc(h.slice(0, 8)) + '…' + esc(h.slice(-6)); }
  function playbackById(id) { return PLAYBACK.filter(function (x) { return x.id === id; })[0] || null; }
  // H2: explorer link for one LIVE history row. The frozen contract
  // stores no transaction hash per call (CallRecord has call_id,
  // status, price, response_hash, failure_reason, heights — no tx
  // hash), so no per-call tx link can be derived from a live read and
  // none is invented. Order of preference, all real explorer URLs:
  //   1. the recorded run's request (+ settlement) tx, when this
  //      call_id is one of the recorded demo calls;
  //   2. the block page for the call's resolved (or proposed) height;
  //   3. the buyer's account page (no height stored, e.g. refusals).
  function rowExplorerHtml(c, buyerAcct) {
    var p = playbackById(c.call_id);
    if (p && p.requestTx) {
      var out = '<span class="mono">' + shortHash(p.requestTx) + '</span> ' + txLink(p.requestTx);
      if (p.settleTx) out += '<br><span class="mono">' + shortHash(p.settleTx) + '</span> ' + txLink(p.settleTx);
      return out;
    }
    if (c.resolved_height) return blockLink(c.resolved_height);
    if (c.proposed_height) return blockLink(c.proposed_height);
    if (buyerAcct) return '<a class="hash" href="' + esc(C.EXPLORER_ACCOUNT) + esc(buyerAcct) + '" target="_blank" rel="noopener">Buyer on testnet explorer</a>';
    return '—';
  }
  // H2: balance-after per live history row, from the ordered call list
  // + the live five-number balance. Spent-after is exact: spent only
  // grows by the price of each success-deducted call. Available-after
  // is deposit − spent-after − held-after and is exact when the deposit
  // has not changed since the call (the page footnotes this; the live
  // five-number balance above is always exact). Calls arrive newest
  // first; walk them oldest first.
  function liveBalanceAfter(calls, bal) {
    var spent = 0, out = {};
    var chrono = calls.slice().reverse();
    chrono.forEach(function (c) {
      if (c.status === 'success-deducted') spent += Number(BigInt(c.price)) / 1e24;
      var held = c.status === 'paid' ? Number(BigInt(c.price)) / 1e24 : 0;
      var avail = Number(BigInt(bal.deposit)) / 1e24 - spent - held;
      out[c.call_id] = 'Spent ' + spent.toFixed(1).replace(/\.0$/, '') + ' · Available ' + avail.toFixed(1).replace(/\.0$/, '') + ' testnet NEAR';
    });
    return out;
  }
  // U-F8: balance-BEFORE per live history row. Same reconstruction as
  // liveBalanceAfter, walked oldest first: before a call, spent is what
  // earlier successes had already deducted and held is 0 (earlier calls
  // have settled). Exact under the same deposit-unchanged assumption
  // as balance-after (footnoted on S2).
  function liveBalanceBefore(calls, bal) {
    var spent = 0, out = {};
    calls.slice().reverse().forEach(function (c) {
      var avail = Number(BigInt(bal.deposit)) / 1e24 - spent;
      out[c.call_id] = 'Spent ' + spent.toFixed(1).replace(/\.0$/, '') + ' · Available ' + avail.toFixed(1).replace(/\.0$/, '') + ' testnet NEAR';
      if (c.status === 'success-deducted') spent += Number(BigInt(c.price)) / 1e24;
    });
    return out;
  }
  // H2: seller earned-after per live log row (exact: earned only grows
  // by the price of each success-deducted call).
  function liveEarnedAfter(calls) {
    var earned = 0, out = {};
    calls.slice().reverse().forEach(function (c) {
      if (c.status === 'success-deducted') earned += Number(BigInt(c.price)) / 1e24;
      out[c.call_id] = earned.toFixed(1).replace(/\.0$/, '') + ' testnet NEAR';
    });
    return out;
  }
  // D1 — per-buyer claim transparency (seller console v2). From the
  // on-chain call list: successes, failure claims, timeout claims,
  // and the failure-claim rate over settled claims (success +
  // failure + timeout; refusals are not claims and are excluded).
  // flag: 'all-failure' (rate 1), 'no-failure' (rate 0), 'mixed',
  // or 'unknown' (no settled claims). The rendering must keep a
  // 100% failure-claim buyer visibly distinct from a 0% one.
  function claimStats(calls) {
    var s = { calls: calls.length, successes: 0, failureClaims: 0, timeoutClaims: 0, refusals: 0, settled: 0, failureClaimRate: null, flag: 'unknown' };
    calls.forEach(function (c) {
      if (c.status === 'success-deducted') s.successes += 1;
      else if (c.status === 'failed-refunded') s.failureClaims += 1;
      else if (c.status === 'timeout-refunded') s.timeoutClaims += 1;
      else if (c.status === 'refused') s.refusals += 1;
    });
    s.settled = s.successes + s.failureClaims + s.timeoutClaims;
    if (s.settled > 0) {
      s.failureClaimRate = s.failureClaims / s.settled;
      s.flag = s.failureClaimRate === 1 ? 'all-failure' : (s.failureClaimRate === 0 ? 'no-failure' : 'mixed');
    }
    return s;
  }
  function claimBadgeHtml(s) {
    if (s.flag === 'all-failure') return '<span class="badge amber">Every settled claim is a failure claim — 100% failure-claim rate</span>';
    if (s.flag === 'no-failure') return '<span class="badge ok">No failure claims — 0% failure-claim rate</span>';
    if (s.flag === 'mixed') return '<span class="badge neutral">Failure-claim rate ' + Math.round(s.failureClaimRate * 100) + '%</span>';
    return '<span class="badge neutral">No settled claims yet</span>';
  }
  // Claim tx link for one call: the recorded run's settlement tx
  // when known, else the block/explorer fallback (the contract stores
  // no tx hash per call — see rowExplorerHtml). txForCall, when
  // supplied, maps call_id -> { tx, label } and wins.
  function claimTxHtml(c, buyerAcct, txForCall) {
    var m = txForCall && txForCall[c.call_id];
    if (m && m.tx) return '<span class="mono">' + shortHash(m.tx) + '</span> ' + txLink(m.tx);
    var p = playbackById(c.call_id);
    if (p && p.settleTx) return '<span class="mono">' + shortHash(p.settleTx) + '</span> ' + txLink(p.settleTx);
    return rowExplorerHtml(c, buyerAcct);
  }
  function claimsTableHtml(buyerAcct, calls, txForCall) {
    var s = claimStats(calls);
    var rows = calls.filter(function (c) { return c.status === 'failed-refunded' || c.status === 'timeout-refunded'; }).map(function (c) {
      var kind = c.status === 'failed-refunded' ? 'Failure claim (' + (c.failure_reason || '') + ')' : 'Timeout claim';
      return '<tr><td><span class="mono">' + esc(c.call_id) + '</span></td><td>' + esc(kind) + '</td><td>' + claimTxHtml(c, buyerAcct, txForCall) + '</td></tr>';
    }).join('') || '<tr><td colspan="3">No failure or timeout claims recorded for this buyer.</td></tr>';
    return '<h3>Buyer claim transparency — <span class="mono">' + esc(buyerAcct) + '</span></h3>' +
      '<p>Calls ' + s.calls + ' · successes ' + s.successes + ' · failure claims ' + s.failureClaims +
      ' · timeout claims ' + s.timeoutClaims + ' · refusals ' + s.refusals + ' · ' + claimBadgeHtml(s) + '</p>' +
      '<p class="small">Live from the contract (<span class="mono">list_calls</span>). A buyer who claims failure after a genuine success leaves a public pattern here — the contract cannot prevent the claim, but the pattern is visible. Failure-claim rate = failure claims ÷ settled claims (success + failure + timeout); refusals are not claims.</p>' +
      '<div class="table-wrap"><table><thead><tr><th>Claim call</th><th>Claim</th><th>Claim transaction (explorer)</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  function fmtYocto(y) { return (Number(BigInt(y)) / 1e24).toFixed(4).replace(/\.?0+$/, '') || '0'; }
  function fiveHtml(b) {
    return '<dl class="five" aria-label="Five-number balance, testnet NEAR">' +
      '<div><dt>Deposited</dt><dd>' + esc(fmtYocto(b.deposit)) + '</dd></div>' +
      '<div><dt>Held</dt><dd>' + esc(fmtYocto(b.held)) + '</dd></div>' +
      '<div><dt>Spent</dt><dd>' + esc(fmtYocto(b.spent)) + '</dd></div>' +
      '<div><dt>Available</dt><dd>' + esc(fmtYocto(b.available)) + '</dd></div>' +
      '<div><dt>Budget cap</dt><dd>' + esc(fmtYocto(b.cap)) + '</dd></div></dl>' +
      '<p class="small muted">Testnet NEAR. Invariant: Available = Deposited − Spent − Held. ' +
      'These are contract balances. Your wallet balance will differ by testnet gas paid for your own transactions, shown separately on the explorer.</p>';
  }
  function fiveStaticHtml(b) {
    // Same label set as fiveHtml (glossary): Deposited, Held, Spent,
    // Available, Budget cap — S2 and S3 must show identical labels.
    var labels = { deposit: 'Deposited', held: 'Held', spent: 'Spent', available: 'Available', cap: 'Budget cap' };
    return '<dl class="five" aria-label="Five-number balance, testnet NEAR">' +
      ['deposit', 'held', 'spent', 'available', 'cap'].map(function (k) {
        return '<div><dt>' + labels[k] + '</dt><dd>' + esc(b[k]) + '</dd></div>';
      }).join('') + '</dl>' +
      '<p class="small muted">Testnet NEAR. Invariant: Available = Deposited − Spent − Held.</p>';
  }
  function announce(msg) { var n = $('live'); if (n) n.textContent = msg; }

  // ------------------------------------------------------------------
  // RPC with retries + endpoint fallback (FastNear primary).
  // Returns { ok, data, endpoint, error, at }.
  // ------------------------------------------------------------------
  var lastRpc = { ok: null, endpoint: null, at: null, error: null };
  function rpcCall(method, args, endpoint, contractId) {
    var body = JSON.stringify({
      jsonrpc: '2.0', id: 'meteredpay-dash', method: 'query',
      params: {
        request_type: 'call_function', account_id: contractId || C.CONTRACT_ID,
        method_name: method, args_base64: btoa(unescape(encodeURIComponent(JSON.stringify(args)))),
        finality: 'final'
      }
    });
    return fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body,
      signal: AbortSignal.timeout(15000)
    }).then(function (res) { return res.json(); }).then(function (j) {
      if (!j.result || !j.result.result) throw new Error('RPC view returned no result');
      return JSON.parse(new TextDecoder().decode(new Uint8Array(j.result.result)));
    });
  }
  function rpcViewFor(method, args, contractId) {
    var endpoints = C.RPC_URLS.slice();
    var chain = Promise.reject(new Error('no endpoint tried'));
    endpoints.forEach(function (ep) {
      for (var a = 0; a < 2; a++) {
        chain = chain.catch(function () { return rpcCall(method, args, ep, contractId); });
      }
    });
    return chain.then(function (data) {
      lastRpc = { ok: true, endpoint: 'testnet RPC', at: new Date(), error: null };
      return data;
    }).catch(function (e) {
      lastRpc = { ok: false, endpoint: null, at: new Date(), error: String(e.message || e) };
      throw e;
    });
  }
  function rpcView(method, args) {
    return rpcViewFor(method, args, C.CONTRACT_ID);
  }
  function rpcStatusHtml() {
    if (lastRpc.ok === null) return '<p class="small muted">Contract state not loaded yet in this session.</p>';
    if (lastRpc.ok) return '<p class="small">Contract reachable. Last successful read: ' + esc(lastRpc.at.toLocaleTimeString()) + '.</p>';
    return '<div class="banner" role="alert"><strong>Testnet contract unreachable.</strong> ' +
      'Balances and history below may be out of date (last attempt ' + esc(lastRpc.at ? lastRpc.at.toLocaleTimeString() : 'unknown') +
      '). No new calls will be sent from this page — it never sends any. Try again or run locally from the README. Error: ' + esc(lastRpc.error || '') + '</div>';
  }

  // ------------------------------------------------------------------
  // Views
  // ------------------------------------------------------------------
  var VIEWS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'];
  var currentCall = 'freeze1011-success-001';
  var s2AutoLoaded = false;
  function show(view) {
    VIEWS.forEach(function (v) {
      var el = $('view-' + v);
      if (el) el.classList.toggle('active', v === view);
      var link = document.querySelector('nav.views a[href="#/' + v + '"]');
      if (link) { if (v === view) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); }
    });
    if (view === 's4') loadSeller();
    if (view === 's5') loadReplay();
    if (view === 's6') loadTwoSellers();
    if (view === 's7') loadInstanceC();
    announce('Showing view ' + view);
  }
  function route() {
    var hash = location.hash || '#/s1';
    // Strip the query before matching the view: '#/s3?call=X' is the
    // S3 receipt route, not an unknown view falling back to S1.
    var path = hash.replace('#/', '').split('?')[0];
    var view = VIEWS.indexOf(path) >= 0 ? path : 's1';
    var q = new URLSearchParams(hash.split('?')[1] || '');
    var callId = q.get('call');
    // A ?call= link is always a receipt link: render S3 for that call
    // (same renderS3(callId) path the guided proof uses) and show S3,
    // so the receipt never lands on S1. Only a KNOWN call becomes the
    // current call: an unknown id must not poison currentCall, or
    // plain #/s3 would keep showing "Call not found" instead of the
    // last valid receipt (UI/UX F3 acceptance: unknown → S1 → S3
    // shows the default success-001 receipt, never "Call not found").
    // The ?call= view itself still renders the not-found state for
    // the unknown id (M4) — only currentCall is left untouched.
    if (callId) {
      view = 's3';
      renderS3(callId);
      if (playbackById(callId)) currentCall = callId;
    }
    else if (view === 's3') { renderS3(currentCall); }
    // U-F7: ?buyer= deep link on S2 — prefill the account; the
    // auto-load below runs loadBuyer() so the link lands on data.
    var deepBuyer = q.get('buyer');
    if (view === 's2' && deepBuyer) {
      var acctEl = $('buyer-account');
      if (acctEl) acctEl.value = deepBuyer;
    }
    show(view);
    // F4: S2 auto-loads the prefilled demo buyer on first entry (same
    // pattern as S4/S5); the button stays as retry. A ?buyer= deep link
    // loads that buyer instead.
    if (view === 's2' && deepBuyer) loadBuyer();
    else if (view === 's2' && !s2AutoLoaded) { s2AutoLoaded = true; loadBuyer(); }
  }

  // S1 — Journey 0 playback (static data, zero network requests).
  function renderPlayback() {
    var rows = PLAYBACK.map(function (r) {
      var badge = r.kind === 'success' ? 'ok' : (r.kind === 'refusal' ? 'neutral' : 'amber');
      var settle = r.settleTx
        ? '<br>' + esc(r.settleKind) + ': <span class="mono">' + shortHash(r.settleTx) + '</span> ' + txLink(r.settleTx)
        : '<br>Single successful transaction with reason <code>over_budget</code> (verbatim).';
      return '<tr><td><span class="badge ' + badge + '">' + esc(r.label) + '</span><br><span class="mono">' + esc(r.id) + '</span></td>' +
        '<td>' + esc(r.amount) + '</td>' +
        '<td>Spent ' + esc(r.balAfter.spent) + ' · Available ' + esc(r.balAfter.available) + ' testnet NEAR</td>' +
        '<td>Request transaction: <span class="mono">' + shortHash(r.requestTx) + '</span> ' + txLink(r.requestTx) + settle + '</td>' +
        '<td><a href="#/s3?call=' + esc(r.id) + '">Receipt</a></td></tr>';
    }).join('');
    $('playback-rows').innerHTML = rows;
    $('playback-note').textContent = 'Recorded demo run — replay it live on S5. Buyer ' + C.DEMO_BUYER +
      ', 5 Nov 2026. Deposit 0.5, cap 0.2, price 0.1 testnet NEAR per successful call. ' +
      'Final: deposited 0.5, held 0, spent 0.2, available 0.3, cap 0.2.';
  }

  // ------------------------------------------------------------------
  // H1 — Journey 0 guided proof (S1). One primary button steps through
  // four beats (success → fail → success → refusal; timeout optional 5th), one
  // card at a time: result word + amount + balance-after + explorer
  // link + "Receipt" link, Next/Back, "N of 4" progress, ending at S5.
  // Beats are the canonical freeze1011 run (frozen-run.json): the
  // second success is the causal call — it reaches the cap, so the
  // refusal that follows is explained inside the guided flow.
  // Static PLAYBACK data only — zero network requests, no wallet, no
  // timers, no contract change. Keyboard-operable: real buttons, focus
  // moves to the card heading on each step.
  // ------------------------------------------------------------------
  var GUIDED_IDS = ['freeze1011-success-001', 'freeze1011-fail-001', 'freeze1011-success-002', 'freeze1011-overbudget-001'];
  var guidedIdx = -1; // -1 = not started
  var guidedTimeoutOn = false;
  function guidedIds() {
    var ids = GUIDED_IDS.slice();
    if (guidedTimeoutOn) ids.push('freeze1011-timeout-001');
    return ids;
  }
  function guidedState() {
    var ids = guidedIds();
    return { started: guidedIdx >= 0, index: guidedIdx, total: ids.length, id: guidedIdx >= 0 ? ids[guidedIdx] : null, timeoutOn: guidedTimeoutOn };
  }
  function guidedCardHtml(r, step, total, nextLabel) {
    var badge = r.kind === 'success' ? 'ok' : (r.kind === 'refusal' ? 'neutral' : 'amber');
    var settle = r.settleTx
      ? '<br>' + esc(r.settleKind) + ': <span class="mono">' + shortHash(r.settleTx) + '</span> ' + txLink(r.settleTx)
      : '<br>Single successful transaction with reason <code>over_budget</code> (verbatim).';
    var backDisabled = step <= 1 ? ' disabled' : '';
    var nextBtn = step < total
      ? '<button type="button" id="guided-next">Next: see the ' + esc(nextLabel) + ' call</button>'
      : '<a class="button-link" href="#/s5">Finish — replay it yourself on S5</a>';
    var timeoutBtn = (!guidedTimeoutOn && step === total)
      ? ' <button type="button" id="guided-timeout" class="secondary">Show the optional timeout beat too</button>' : '';
    return '<div class="card" role="group" aria-labelledby="guided-heading">' +
      '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + step + '" aria-label="Guided proof progress"><div style="width:' + Math.round(step / total * 100) + '%"></div></div>' +
      '<p class="small"><strong>' + step + ' of ' + total + '</strong></p>' +
      '<h4 id="guided-heading" tabindex="-1"><span class="badge ' + badge + '">' + esc(r.label) + '</span> — call <span class="mono">' + esc(r.id) + '</span></h4>' +
      '<p>' + esc(r.amount) + '</p>' +
      '<p class="small">Service: ' + esc(r.sellerService) + ' — the canonical freeze1011 replay; replay live on S5 to see the same service.</p>' +
      '<p>Request transaction: <span class="mono">' + shortHash(r.requestTx) + '</span> ' + txLink(r.requestTx) + settle + '</p>' +
      '<h5>Balance after this call</h5>' + fiveStaticHtml(r.balAfter) +
      '<p>' + esc(r.note) + '</p>' +
      '<p><a href="#/s3?call=' + esc(r.id) + '">Receipt</a> · <a href="#/s1">Back to the full recorded run</a></p>' +
      '<p><button type="button" id="guided-back" class="secondary"' + backDisabled + '>Back</button> ' + nextBtn + timeoutBtn + '</p>' +
      '</div>';
  }
  function renderGuided() {
    var el = $('guided');
    if (!el) return;
    if (guidedIdx < 0) { el.innerHTML = ''; return; }
    var ids = guidedIds();
    var r = playbackById(ids[guidedIdx]);
    if (!r) { el.innerHTML = '<p>Guided proof unavailable — the recorded run could not be found.</p>'; return; }
    el.innerHTML = guidedCardHtml(r, guidedIdx + 1, ids.length, guidedIdx + 1 < ids.length ? (playbackById(ids[guidedIdx + 1]) || { label: 'next' }).label.toLowerCase() : '');
    wireGuidedButtons();
    var h = document.getElementById ? document.getElementById('guided-heading') : null;
    if (h && h.focus) h.focus();
    announce('Guided proof step ' + (guidedIdx + 1) + ' of ' + ids.length + ': ' + r.label + '. ' + r.amount);
  }
  function wireGuidedButtons() {
    var next = $('guided-next');
    if (next) next.addEventListener('click', function () { guidedIdx += 1; renderGuided(); });
    var back = $('guided-back');
    if (back) back.addEventListener('click', function () { if (guidedIdx > 0) { guidedIdx -= 1; renderGuided(); } });
    var to = $('guided-timeout');
    if (to) to.addEventListener('click', function () { guidedTimeoutOn = true; guidedIdx = guidedIds().length - 1; renderGuided(); });
  }
  // Restarting the guided proof always starts from the four-beat
  // sequence (success → fail → success → refusal); the optional timeout beat
  // is off until the reader asks for it again, so the "N of 4"
  // progress copy always matches the beat count.
  function guidedStart() { guidedTimeoutOn = false; guidedIdx = 0; renderGuided(); }
  function guidedNext() { var ids = guidedIds(); if (guidedIdx >= 0 && guidedIdx < ids.length - 1) { guidedIdx += 1; renderGuided(); } }
  function guidedBack() { if (guidedIdx > 0) { guidedIdx -= 1; renderGuided(); } }
  function guidedShowTimeout() { guidedTimeoutOn = true; guidedIdx = guidedIds().length - 1; renderGuided(); }

  // S2 — Buyer console (read-only live reads).
  // M5: partial failure — each of the three reads renders (or fails)
  // independently, with a retry; the page never goes all-or-nothing.
  function loadBuyer() {
    var acct = ($('buyer-account').value || '').trim();
    if (!acct) { $('buyer-result').innerHTML = '<p>Enter a testnet account ID, then load its balance.</p>'; return; }
    // M5: account-format hint. Testnet accounts usually end in
    // .testnet (implicit accounts are 64 hex chars). A wrong-looking
    // ID still loads — the contract read is what decides.
    var hint = '';
    if (!/\.testnet$/.test(acct) && !/^[0-9a-f]{64}$/.test(acct)) {
      hint = '<p class="banner">That doesn\'t look like a testnet account ID — testnet accounts usually end in <code>.testnet</code>, e.g. <code>freeze1011-buyer.testnet</code>. Loading it anyway; if nothing comes back, check the spelling.</p>';
    }
    var loadBtn = $('buyer-load');
    if (loadBtn) loadBtn.disabled = true;
    $('buyer-result').innerHTML = hint + '<p aria-live="polite">Loading contract state…</p>';
    Promise.allSettled([
      rpcView('get_buyer_balance', { account_id: acct }),
      rpcView('list_calls', { buyer_account_id: acct, from_index: '0', limit: '50' }),
      rpcView('list_refusals', { buyer_account_id: acct, from_index: '0', limit: '50' })
    ]).then(function (res) {
      var balOk = res[0].status === 'fulfilled', callsOk = res[1].status === 'fulfilled', refOk = res[2].status === 'fulfilled';
      var bal = balOk ? res[0].value : null, calls = callsOk ? res[1].value : [], refusals = refOk ? res[2].value : [];
      var balAfter = balOk ? liveBalanceAfter(calls, bal) : {};
      var balBefore = balOk ? liveBalanceBefore(calls, bal) : {};
      var out = hint;
      if (!balOk || !callsOk || !refOk) {
        var missing = [!balOk ? 'balance' : null, !callsOk ? 'call history' : null, !refOk ? 'refusals' : null].filter(Boolean).join(', ');
        out += '<div class="banner" role="alert"><strong>Some contract data could not be loaded (' + esc(missing) + ').</strong> ' +
          'What did load is shown below; the rest may be out of date. <button type="button" id="buyer-retry" class="secondary">Retry loading</button></div>';
      }
      if (balOk) {
        out += fiveHtml({ deposit: bal.deposit, held: bal.held, spent: bal.spent, available: bal.available, cap: bal.budget_cap });
      } else {
        out += '<p>Balance could not be loaded.</p>';
      }
      var rows = calls.map(function (c) {
        var word = { 'paid': 'Requested — price held', 'success-deducted': 'Succeeded', 'failed-refunded': 'Hold released', 'timeout-refunded': 'Hold released (timeout)', 'refused': 'Refused' }[c.status] || c.status;
        var badge = c.status === 'success-deducted' ? 'ok' : (c.status === 'refused' ? 'neutral' : 'amber');
        var deducted = c.status === 'success-deducted' ? esc(fmtYocto(c.price)) + ' testnet NEAR' : '0 testnet NEAR';
        return '<tr><td><span class="mono">' + esc(c.call_id) + '</span></td>' +
          '<td><span class="badge ' + badge + '">' + esc(word) + '</span></td>' +
          '<td>' + esc(fmtYocto(c.price)) + ' testnet NEAR</td>' +
          '<td>' + deducted + '</td>' +
          '<td>' + esc(balBefore[c.call_id] || '—') + '</td>' +
          '<td>' + esc(balAfter[c.call_id] || '—') + '</td>' +
          '<td>' + (c.response_hash ? '<span class="mono">' + shortHash(c.response_hash) + '</span>' : '—') + '</td>' +
          '<td>' + esc(c.failure_reason || '—') + '</td>' +
          '<td>' + rowExplorerHtml(c, acct) + '</td></tr>';
      }).join('') || '<tr><td colspan="9">No calls recorded for this buyer.</td></tr>';
      var refRows = refusals.map(function (r) {
        // RefusalRecord carries the exact balances at refusal time.
        var avail = (Number(BigInt(r.deposit)) - Number(BigInt(r.spent)) - Number(BigInt(r.held))) / 1e24;
        return '<tr><td><span class="mono">' + esc(r.call_id) + '</span></td><td><code>' + esc(r.reason) + '</code></td>' +
          '<td>Deposit ' + esc(fmtYocto(r.deposit)) + ', spent ' + esc(fmtYocto(r.spent)) + ', held ' + esc(fmtYocto(r.held)) + ', cap ' + esc(fmtYocto(r.budget_cap)) + '</td>' +
          '<td>Available ' + esc(String(avail)) + ' testnet NEAR (exact, recorded at refusal)</td>' +
          '<td>' + rowExplorerHtml({ call_id: r.call_id }, acct) + '</td></tr>';
      }).join('') || '<tr><td colspan="5">No refusals recorded for this buyer.</td></tr>';
      out += '<h3>Call history (newest first)</h3><div class="table-wrap"><table><thead><tr><th>Call</th><th>Result</th><th>Price</th><th>Deducted</th><th>Balance before</th><th>Balance after</th><th>Response hash</th><th>Failure reason</th><th>Explorer</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        (callsOk ? '<p class="small muted">Balance before/after per row are reconstructed from the call history and the current deposit; they are exact when the deposit has not changed since the call. Deducted is 0 on hold-released/refused rows — a failed call is never deducted. The five-number balance above is read live and is always exact.</p>'
          : '<p class="small muted">Call history could not be loaded.</p>') +
        '<h3>Refusals</h3><div class="table-wrap"><table><thead><tr><th>Call</th><th>Reason (verbatim)</th><th>Balances at refusal</th><th>Balance after</th><th>Explorer</th></tr></thead><tbody>' + refRows + '</tbody></table></div>' +
        rpcStatusHtml();
      $('buyer-result').innerHTML = out;
      var retry = $('buyer-retry');
      if (retry) retry.addEventListener('click', loadBuyer);
      if (loadBtn) loadBtn.disabled = false;
      if (balOk) announce('Balance loaded for ' + acct + '. Spent ' + fmtYocto(bal.spent) + ' testnet NEAR.');
      else announce('Some contract data could not be loaded for ' + acct + '.');
    }).catch(function () {
      $('buyer-result').innerHTML = hint + rpcStatusHtml();
      if (loadBtn) loadBtn.disabled = false;
    });
  }

  // 30-second buyer-wait demonstrator timer (S2). Informational only:
  // it shows how long the buyer waits for a seller receipt. No call is
  // made, no money moves.
  var waitTimer = null;
  function runWaitDemo() {
    var btn = $('wait-demo-btn'), bar = $('wait-bar'), prog = $('wait-progress'), txt = $('wait-text');
    if (waitTimer) { clearInterval(waitTimer); waitTimer = null; }
    var total = C.BUYER_WAIT_SECONDS, left = total;
    btn.disabled = true;
    var skip = $('wait-skip-btn'); if (skip) skip.disabled = false;
    function tick() {
      txt.textContent = 'Buyer wait: ' + left + ' s of ' + total + ' s left. If no receipt arrives, the buyer submits a timeout claim — the held amount is released, never deducted.';
      bar.style.width = ((total - left) / total * 100) + '%';
      // M2: aria-valuenow belongs on the progressbar element itself,
      // not on the inner fill bar.
      if (prog) prog.setAttribute('aria-valuenow', String(total - left));
      if (left <= 0) {
        clearInterval(waitTimer); waitTimer = null;
        txt.textContent = 'Wait elapsed (30 s). In a real call the buyer would now submit a timeout claim. Nothing was sent from this page.';
        btn.disabled = false;
        if (skip) skip.disabled = true;
        announce('Thirty second buyer wait elapsed. No call was made.');
        return;
      }
      left -= 1;
    }
    tick();
    waitTimer = setInterval(tick, 1000);
  }
  // M12: skip the 30 s wait demo — the point is the timeout rule, not
  // watching a timer. Nothing was sent from this page either way.
  function skipWaitDemo() {
    if (waitTimer) { clearInterval(waitTimer); waitTimer = null; }
    var btn = $('wait-demo-btn'), bar = $('wait-bar'), prog = $('wait-progress'), txt = $('wait-text'), skip = $('wait-skip-btn');
    if (bar) bar.style.width = '100%';
    if (prog) prog.setAttribute('aria-valuenow', String(C.BUYER_WAIT_SECONDS));
    if (txt) txt.textContent = 'Wait skipped. In a real call the buyer would now submit a timeout claim — the held amount is released, never deducted. Nothing was sent from this page.';
    if (btn) btn.disabled = false;
    if (skip) skip.disabled = true;
    announce('Buyer wait demo skipped. No call was made.');
  }

  // M11: copy helper with a fallback and a revert. Clipboard API
  // first; legacy execCommand second; otherwise an honest failure
  // message. The button always reverts to "Copy" after 2 s.
  function copyText(text, btn) {
    function done(ok) {
      btn.textContent = ok ? 'Copied' : 'Copy failed — select the hash to copy it';
      setTimeout(function () { btn.textContent = 'Copy'; }, 2000);
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    } else if (typeof document !== 'undefined' && typeof document.execCommand === 'function' && typeof document.createElement === 'function') {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        done(document.execCommand('copy'));
        document.body.removeChild(ta);
      } catch (e) { done(false); }
    } else { done(false); }
  }

  // S3 — Call result detail (from the recorded run).
  // M3: balance-before is shown alongside balance-after. For a
  // success call the pre-call state is spent − 0.1 / available + 0.1
  // (price is fixed at 0.1); for fail/timeout/refusal the balances
  // are unchanged by the call, so before = after.
  function balBefore(r) {
    if (r.kind !== 'success') return r.balAfter;
    return {
      deposit: r.balAfter.deposit,
      held: r.balAfter.held,
      spent: (Number(r.balAfter.spent) - 0.1).toFixed(1).replace(/\.0$/, ''),
      available: (Number(r.balAfter.available) + 0.1).toFixed(1).replace(/\.0$/, ''),
      cap: r.balAfter.cap
    };
  }
  function renderS3(callId) {
    var id = callId || currentCall;
    var r = playbackById(id);
    // M4: an unknown call id must NOT silently show PLAYBACK[0].
    // It is a trust defect to render one call's receipt under
    // another call's ID.
    if (!r) {
      $('s3-detail').innerHTML =
        '<h3>Call not found</h3>' +
        '<p>No call with ID <span class="mono">' + esc(id) + '</span> is in the recorded demo run. ' +
        'The receipt shown here is only for calls from that run — an unknown ID gets no receipt, not another call\'s.</p>' +
        '<p><a href="#/s1">Back to the recorded run</a> · <a href="#/s2">Back to buyer console</a></p>';
      announce('Call ' + id + ' not found in the recorded run.');
      return;
    }
    var badge = r.kind === 'success' ? 'ok' : (r.kind === 'refusal' ? 'neutral' : 'amber');
    var hashRow = r.responseHash
      ? '<dt>Response hash</dt><dd><span class="mono">' + esc(r.responseHash) + '</span> <button type="button" class="secondary" data-copy="' + esc(r.responseHash) + '">Copy</button><br><span class="small muted">SHA-256 of the canonical seller response body. The buyer recomputed this hash and verified the seller signature before signing.</span></dd>'
      : (r.kind === 'fail'
        ? '<dt>Response hash</dt><dd>Not recorded in the freeze1011 run log — the seller error attestation hash for this failure claim is not in the run log, so none is stated here. The failure reason <code>seller_error</code> is recorded on-chain.</dd>'
        : '<dt>Response hash</dt><dd>None — no seller response was received (timeout) or no response was needed (refusal).</dd>');
    $('s3-detail').innerHTML =
      '<h3>Call <span class="mono">' + esc(r.id) + '</span> — <span class="badge ' + badge + '">' + esc(r.label) + '</span></h3>' +
      '<dl>' +
      '<dt>Seller service</dt><dd>' + esc(r.sellerService) + (r.kind === 'refusal' ? '' : ' (demonstrator seller service, <span class="mono">' + esc(C.SELLER_ACCOUNT_ID) + '</span>)') + '</dd>' +
      '<dt>Price</dt><dd>0.1 testnet NEAR per successful call, fixed at contract init</dd>' +
      '<dt>Result</dt><dd>' + esc(r.amount) + '</dd>' +
      '<dt>Request transaction</dt><dd><span class="mono">' + esc(r.requestTx) + '</span> ' + txLink(r.requestTx) + '</dd>' +
      (r.settleTx ? '<dt>' + esc(r.settleKind) + '</dt><dd><span class="mono">' + esc(r.settleTx) + '</span> ' + txLink(r.settleTx) + '</dd>' : '') +
      hashRow +
      '<dt>Seller output</dt><dd>' + esc(r.sellerOutput) + '</dd>' +
      '<dt>Verification</dt><dd>' + esc(r.note) + '</dd>' +
      '</dl>' +
      '<h3>Balance before this call</h3>' + fiveStaticHtml(balBefore(r)) +
      '<h3>Balance after this call</h3>' + fiveStaticHtml(r.balAfter) +
      (r.kind === 'timeout' ? '<h3>Timeout wait (30 s)</h3><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="30" aria-valuenow="30" aria-label="Buyer wait elapsed"><div style="width:100%"></div></div><p class="small">Buyer waited the full 30 s, received no receipt, then submitted a timeout claim. The held amount was released, never deducted.</p>' : '') +
      '<p><a href="#/s2">Make another call</a> · <a href="#/s1">Back to the recorded run</a></p>';
    document.querySelectorAll('#s3-detail [data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        copyText(b.getAttribute('data-copy'), b);
      });
    });
  }

  // S4 — Seller console (read-only live reads).
  // Partial failure, mirroring S2 (M5): each of the three reads
  // renders (or fails) independently, with a retry; the page never
  // goes all-or-nothing on one dead read.
  // U-F8: the call log accepts a buyer (default: the recorded demo
  // buyer), so a judge's own replay appears here too.
  function loadSeller() {
    var el = $('seller-result');
    var buyerAcct = ($('seller-buyer') && $('seller-buyer').value || '').trim() || C.DEMO_BUYER;
    el.innerHTML = '<p aria-live="polite">Loading seller state…</p>';
    Promise.allSettled([rpcView('get_seller', {}), rpcView('get_seller_balance', {}), rpcView('list_calls', { buyer_account_id: buyerAcct, from_index: '0', limit: '50' })])
      .then(function (res) {
        var sOk = res[0].status === 'fulfilled', balOk = res[1].status === 'fulfilled', callsOk = res[2].status === 'fulfilled';
        var s = sOk ? res[0].value : null, bal = balOk ? res[1].value : null, calls = callsOk ? res[2].value : [];
        var out = '';
        if (!sOk || !balOk || !callsOk) {
          var missing = [!sOk ? 'seller registration' : null, !balOk ? 'seller balance' : null, !callsOk ? 'call log' : null].filter(Boolean).join(', ');
          out += '<div class="banner" role="alert"><strong>Some seller data could not be loaded (' + esc(missing) + ').</strong> ' +
            'What did load is shown below; the rest may be out of date. <button type="button" id="seller-retry" class="secondary">Retry loading</button></div>';
        }
        if (sOk) {
          out += '<p><strong>Price: 0.1 testnet NEAR per successful call, fixed at contract init.</strong> There is no set-price control — the price is fixed.</p>' +
            '<dl><dt>Seller</dt><dd><span class="mono">' + esc(s.seller_account_id) + '</span> (demonstrator seller service)</dd>' +
            (balOk
              ? '<dt>Earned (not yet withdrawn)</dt><dd>' + esc(fmtYocto(bal.earned)) + ' testnet NEAR</dd>' +
                '<dt>Withdrawn</dt><dd>' + esc(fmtYocto(bal.withdrawn)) + ' testnet NEAR</dd>'
              : '<dt>Earned (not yet withdrawn)</dt><dd>Could not be loaded.</dd>' +
                '<dt>Withdrawn</dt><dd>Could not be loaded.</dd>') +
            '<dt>Backstop timeout</dt><dd>' + esc(String(s.call_timeout_seconds)) + ' s</dd></dl>' +
            '<p class="small muted">Earned and withdrawn are shown separately, read live from the contract — never hardcoded. Withdrawal is testnet NEAR only, by the registered seller; it is not part of this read-only page.</p>';
        } else {
          out += '<p>Seller registration could not be loaded.</p>';
        }
        var earnedAfter = liveEarnedAfter(calls);
        var rows = callsOk
          ? (calls.map(function (c) {
            var word = { 'paid': 'Requested — price held', 'success-deducted': 'Succeeded', 'failed-refunded': 'Hold released', 'timeout-refunded': 'Hold released (timeout)', 'refused': 'Refused' }[c.status] || c.status;
            return '<tr><td><span class="mono">' + esc(c.call_id) + '</span></td><td>' + esc(word) + '</td>' +
              '<td>' + (c.status === 'success-deducted' ? esc(fmtYocto(c.price)) + ' testnet NEAR earned' : '0 testnet NEAR earned') + '</td>' +
              '<td>' + esc(earnedAfter[c.call_id] || '—') + ' earned after this call</td>' +
              '<td>' + rowExplorerHtml(c, buyerAcct) + '</td></tr>';
          }).join('') || '<tr><td colspan="5">No calls recorded.</td></tr>')
          : '<tr><td colspan="5">Call log could not be loaded.</td></tr>';
        out += '<h3>Seller call log (buyer ' + esc(buyerAcct) + (buyerAcct === C.DEMO_BUYER ? ' — the recorded demo buyer' : '') + ')</h3>' +
          '<div class="table-wrap"><table><thead><tr><th>Call</th><th>Result</th><th>Earned</th><th>Earned after</th><th>Explorer</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
          rpcStatusHtml();
        el.innerHTML = out;
        // D1: per-buyer claim transparency, live from the same call list.
        var claimsEl = $('seller-claims');
        if (claimsEl) {
          claimsEl.innerHTML = callsOk
            ? claimsTableHtml(buyerAcct, calls, null)
            : '<p>Buyer claim transparency could not be loaded — the call log could not be loaded.</p>';
        }
        var retry = $('seller-retry');
        if (retry) retry.addEventListener('click', loadSeller);
        if (sOk && balOk) announce('Seller state loaded. Earned ' + fmtYocto(bal.earned) + ' testnet NEAR.');
        else announce('Some seller data could not be loaded.');
      })
      .catch(function () { el.innerHTML = rpcStatusHtml(); });
    // F2: no auto-probe. The health check runs only when the judge
    // presses "Check seller on this machine" (wired in init).
  }
  function checkSellerHealth() {
    var el = $('seller-health');
    fetch(C.SELLER_URL + '/health', { signal: AbortSignal.timeout(8000) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        el.innerHTML = '<p class="small">Seller API reachable at <span class="mono">' + esc(C.SELLER_URL) + '</span>: status ' + esc(j.status || '?') + ', seller ' + esc(j.seller_account_id || '?') + ', price ' + esc(j.price_per_call_yocto || '?') + ' yoctoNEAR, mode ' + esc(j.mode || '?') + '.</p>';
      })
      .catch(function () {
        el.innerHTML = '<div class="banner"><strong>Seller API unreachable at <span class="mono">' + esc(C.SELLER_URL) + '</span>.</strong> ' +
          'The demonstrator seller is not running at the configured URL. The contract state above is still live; start the seller locally (<code>node seller-api/server.mjs</code>) or set <code>SELLER_URL</code> in <code>dashboard/config.js</code>.</div>';
      });
  }

  // S5 — Contract & replay + dispute audit.
  function loadReplay() {
    var el = $('replay-result');
    // Label whose calls the audit table shows (the demo buyer, not
    // "the buyer" in general — one judge's replay does not disturb
    // another's, and state is per buyer).
    var auditLabel = $('audit-buyer-label');
    if (auditLabel) auditLabel.textContent = 'Demo buyer ' + C.DEMO_BUYER + ' — every row below is that buyer\'s call. Your own replay\'s calls appear on S2, not here.';
    rpcView('get_seller', {}).then(function (s) {
      el.innerHTML = '<p>Contract <span class="mono">' + esc(C.CONTRACT_ID) + '</span> — seller <span class="mono">' + esc(s.seller_account_id) + '</span>, ' +
        'price 0.1 testnet NEAR per successful call, backstop ' + esc(String(s.call_timeout_seconds)) + ' s. ' +
        'Seller public key <span class="mono">' + esc(s.seller_public_key) + '</span>.</p>' + rpcStatusHtml();
    }).catch(function () { el.innerHTML = rpcStatusHtml(); });
    rpcView('list_calls', { buyer_account_id: C.DEMO_BUYER, from_index: '0', limit: '50' }).then(function (calls) {
      return rpcView('get_buyer_balance', { account_id: C.DEMO_BUYER }).then(function (bal) {
        return { calls: calls, bal: bal };
      }, function () { return { calls: calls, bal: null }; });
    }).then(function (res) {
      var calls = res.calls;
      // H2: balance-after per audit row (same reconstruction as S2;
      // exact for spent, available assumes the deposit is unchanged —
      // footnoted on S2). Without a live balance, show the amount only.
      var balAfter = res.bal ? liveBalanceAfter(calls, res.bal) : {};
      var rows = calls.map(function (c) {
        var att;
        if (c.status === 'failed-refunded') {
          // F1 (days 8-9): the frozen contract stores NO seller
          // attestation for failure claims (response_hash is null
          // on-chain — verified). Do not imply otherwise: the seller
          // error attestation for the recorded fail call is shown on
          // S3 from the run log, not from the contract.
          att = 'No seller attestation is stored on-chain for failure claims (frozen contract) — the seller error attestation for the recorded fail call is shown on S3 from the run log. <a href="#/s3?call=' + esc(c.call_id) + '">Receipt</a>';
        } else if (c.status === 'timeout-refunded') {
          att = 'No seller attestation is stored on-chain for failure claims (frozen contract) — no seller response was received; the timeout receipt is shown on S3 from the run log. <a href="#/s3?call=' + esc(c.call_id) + '">Receipt</a>';
        } else if (c.response_hash) {
          att = 'Seller attested response hash <span class="mono">' + shortHash(c.response_hash) + '</span>';
        } else {
          att = 'No seller attestation stored on-chain';
        }
        var claim = { 'success-deducted': 'Buyer claimed success (payer-signed receipt)', 'failed-refunded': 'Buyer claimed failure (' + (c.failure_reason || '') + ')', 'timeout-refunded': 'Buyer claimed timeout', 'paid': 'Buyer claim not yet submitted', 'refused': 'No claim — request refused' }[c.status] || c.status;
        var outcome = { 'success-deducted': 'Deducted 0.1 testnet NEAR', 'failed-refunded': 'Released — held amount released, never deducted', 'timeout-refunded': 'Released — held amount released, never deducted', 'paid': 'Price held', 'refused': 'Refused, balances unchanged' }[c.status] || c.status;
        return '<tr><td><span class="mono">' + esc(c.call_id) + '</span></td><td>' + att + '</td><td>' + esc(claim) + '</td><td>' + esc(outcome) + '</td><td>' + esc(balAfter[c.call_id] || '—') + '</td><td>' + rowExplorerHtml(c, C.DEMO_BUYER) + '</td></tr>';
      }).join('');
      $('audit-rows').innerHTML = rows || '<tr><td colspan="6">No calls recorded for the demo buyer.</td></tr>';
    }).catch(function () {
      $('audit-rows').innerHTML = '<tr><td colspan="6">Contract unreachable — audit data may be out of date.</td></tr>';
    });
  }

  // S6 — Two sellers (live Layer 2). Recorded fallback state below
  // must match dashboard/two-seller.json exactly (verify.mjs checks);
  // it is shown ONLY when the live read fails, labelled as recorded.
  var TWO_SELLER_RECORDED = [
    { key: 'a', contract: 'mp-meteredpay-a.testnet', seller: 'tedious-sea.testnet', buyer: 'mp-l1a-buyer.testnet', price: '0.1', recorded: '6 Nov 2026', finalState: { deposit: '0.5', held: '0', spent: '0.2', available: '0.3', cap: '0.2' }, earned: '0.2', withdrawn: '0', claimSummary: { calls: 5, successes: 2, failureClaims: 1, timeoutClaims: 1, refusals: 1 } },
    { key: 'b', contract: 'mp-meteredpay-b.testnet', seller: 'mp-seller2.testnet', buyer: 'mp-l1b-buyer.testnet', price: '0.1', recorded: '6 Nov 2026', finalState: { deposit: '0.5', held: '0', spent: '0.2', available: '0.3', cap: '0.2' }, earned: '0.2', withdrawn: '0', claimSummary: { calls: 5, successes: 2, failureClaims: 1, timeoutClaims: 1, refusals: 1 } }
  ];
  var twoSellerManifest = null;
  function loadTwoSellerManifest() {
    if (twoSellerManifest) return Promise.resolve(twoSellerManifest);
    return fetch('./two-seller.json').then(function (r) { return r.json(); }).then(function (j) { twoSellerManifest = j; return j; }).catch(function () { return null; });
  }
  function twoSellerClaimTxMap(manifestInst) {
    var m = {};
    if (!manifestInst) return m;
    manifestInst.steps.forEach(function (s) {
      if (s.label.indexOf('Fail — released') === 0) m.fail = s.tx;
      if (s.label.indexOf('Timeout — released') === 0) m.timeout = s.tx;
    });
    return m;
  }
  function s6PanelHtml(inst, res) {
    var head = '<h3>Live now — instance ' + inst.key.toUpperCase() + ' (<span class="mono">' + esc(inst.contract) + '</span>)</h3>';
    var ok = res.every(function (r) { return r.status === 'fulfilled'; });
    if (!ok) {
      var missing = ['seller registration', 'seller balance', 'buyer balance', 'call log'].filter(function (label, i) { return res[i].status !== 'fulfilled'; }).join(', ');
      return head + '<div class="banner" role="alert"><strong>Live read failed (' + esc(missing) + ') — showing the recorded ' + esc(inst.recorded) + ' state below; retry.</strong> The recorded state is settled history, not a live read.</div>' +
        '<p>Seller <span class="mono">' + esc(inst.seller) + '</span> · buyer <span class="mono">' + esc(inst.buyer) + '</span> (recorded ' + esc(inst.recorded) + ')</p>' +
        fiveStaticHtml(inst.finalState) +
        '<p>Earned (not yet withdrawn): <strong>' + esc(inst.earned) + ' testnet NEAR</strong> · Withdrawn: ' + esc(inst.withdrawn) + ' testnet NEAR (recorded 6 Nov state).</p>';
    }
    var s = res[0].value, bal = res[1].value, bb = res[2].value;
    var matchSeller = s.seller_account_id === inst.seller;
    var matchEarned = fmtYocto(bal.earned) === inst.earned;
    var matchBal = fmtYocto(bb.deposit) === inst.finalState.deposit && fmtYocto(bb.held) === inst.finalState.held && fmtYocto(bb.spent) === inst.finalState.spent && fmtYocto(bb.available) === inst.finalState.available && fmtYocto(bb.budget_cap) === inst.finalState.cap;
    var time = new Date().toLocaleTimeString();
    var status = (matchSeller && matchEarned && matchBal)
      ? '<p class="small">Live read ' + esc(time) + ' — matches the recorded final state.</p>'
      : '<div class="banner" role="alert"><strong>Live read ' + esc(time) + ' — differs from the recorded ' + esc(inst.recorded) + ' state.</strong> Seller match: ' + (matchSeller ? 'yes' : 'NO') + '; earned match: ' + (matchEarned ? 'yes' : 'NO') + '; buyer balance match: ' + (matchBal ? 'yes' : 'NO') + '. The live values below are what the contract returns now.</div>';
    return head + status +
      '<p>Seller <span class="mono">' + esc(s.seller_account_id) + '</span> · price ' + esc(inst.price) + ' testnet NEAR per successful call · backstop ' + esc(String(s.call_timeout_seconds)) + ' s</p>' +
      '<p>Earned (not yet withdrawn): <strong>' + esc(fmtYocto(bal.earned)) + ' testnet NEAR</strong> · Withdrawn: ' + esc(fmtYocto(bal.withdrawn)) + ' testnet NEAR (live).</p>' +
      '<h4>Buyer <span class="mono">' + esc(inst.buyer) + '</span> — live five-number balance</h4>' +
      fiveHtml({ deposit: bb.deposit, held: bb.held, spent: bb.spent, available: bb.available, cap: bb.budget_cap });
  }
  function loadTwoSellers() {
    var aEl = $('s6-live-a'), bEl = $('s6-live-b'), cEl = $('s6-claims');
    if (aEl) aEl.innerHTML = '<p aria-live="polite">Loading live state for instance A…</p>';
    if (bEl) bEl.innerHTML = '<p aria-live="polite">Loading live state for instance B…</p>';
    loadTwoSellerManifest().then(function (man) {
      var jobs = TWO_SELLER_RECORDED.map(function (inst) {
        var min = man ? man.instances.filter(function (x) { return x.contract === inst.contract; })[0] : null;
        // Per-instance allSettled: one dead read never blanks the other.
        return Promise.allSettled([
          rpcViewFor('get_seller', {}, inst.contract),
          rpcViewFor('get_seller_balance', {}, inst.contract),
          rpcViewFor('get_buyer_balance', { account_id: inst.buyer }, inst.contract),
          rpcViewFor('list_calls', { buyer_account_id: inst.buyer, from_index: '0', limit: '50' }, inst.contract)
        ]).then(function (res) { return { inst: inst, res: res, manifestInst: min }; });
      });
      return Promise.all(jobs);
    }).then(function (done) {
      done.forEach(function (d, i) {
        var el = i === 0 ? aEl : bEl;
        if (el) el.innerHTML = s6PanelHtml(d.inst, d.res);
      });
      if (cEl) {
        cEl.innerHTML = done.map(function (d) {
          if (d.res[3].status === 'fulfilled') {
            var txMap = {};
            if (d.manifestInst) {
              var m = twoSellerClaimTxMap(d.manifestInst);
              d.res[3].value.forEach(function (c) {
                if (c.call_id.slice(-9) === '-fail-001' && m.fail) txMap[c.call_id] = { tx: m.fail };
                if (c.call_id.slice(-12) === '-timeout-001' && m.timeout) txMap[c.call_id] = { tx: m.timeout };
              });
            }
            return claimsTableHtml(d.inst.buyer, d.res[3].value, txMap);
          }
          var cs = d.inst.claimSummary;
          return '<h3>Buyer claim transparency — <span class="mono">' + esc(d.inst.buyer) + '</span></h3>' +
            '<p>Live call log could not be loaded — recorded 6 Nov state: calls ' + cs.calls + ' · successes ' + cs.successes + ' · failure claims ' + cs.failureClaims + ' · timeout claims ' + cs.timeoutClaims + ' · refusals ' + cs.refusals + '. Claim transactions are in the recorded tables above.</p>';
        }).join('');
      }
      var okCount = done.filter(function (d) { return d.res.every(function (r) { return r.status === 'fulfilled'; }); }).length;
      announce('Two-seller live reads finished: ' + okCount + ' of 2 instances live.');
    }).catch(function () {
      if (aEl) aEl.innerHTML = '<div class="banner" role="alert"><strong>Live read failed — showing the recorded 6 Nov state below; retry.</strong></div>';
      if (bEl) bEl.innerHTML = '<div class="banner" role="alert"><strong>Live read failed — showing the recorded 6 Nov state below; retry.</strong></div>';
    });
  }


  // S7 — instance C, summariser (live Layer 2). Recorded fallback state
  // below must match dashboard/instance-c.json exactly (verify.mjs
  // checks); it is shown ONLY when the live read fails, labelled as recorded.
  var INSTANCE_C_RECORDED = { key: 'c', contract: 'mp-meteredpay-c.testnet', seller: 'mp-seller2.testnet', buyer: 'mp-rf2-buyer.testnet', price: '0.05', recorded: '8 Nov 2026', finalState: { deposit: '0.5', held: '0', spent: '0.1', available: '0.4', cap: '0.1' }, earned: '0.1', withdrawn: '0', claimSummary: { calls: 5, successes: 2, failureClaims: 1, timeoutClaims: 1, refusals: 1 } };
  var instanceCManifest = null;
  function loadInstanceCManifest() {
    if (instanceCManifest) return Promise.resolve(instanceCManifest);
    return fetch('./instance-c.json').then(function (r) { return r.json(); }).then(function (j) { instanceCManifest = j; return j; }).catch(function () { return null; });
  }
  function loadInstanceC() {
    var cEl = $('s7-live-c'), claimsEl = $('s7-claims');
    if (cEl) cEl.innerHTML = '<p aria-live="polite">Loading live state for instance C…</p>';
    loadInstanceCManifest().then(function (man) {
      var inst = INSTANCE_C_RECORDED;
      var min = man ? man.instances.filter(function (x) { return x.contract === inst.contract; })[0] : null;
      return Promise.allSettled([
        rpcViewFor('get_seller', {}, inst.contract),
        rpcViewFor('get_seller_balance', {}, inst.contract),
        rpcViewFor('get_buyer_balance', { account_id: inst.buyer }, inst.contract),
        rpcViewFor('list_calls', { buyer_account_id: inst.buyer, from_index: '0', limit: '50' }, inst.contract)
      ]).then(function (res) { return { inst: inst, res: res, manifestInst: min }; });
    }).then(function (d) {
      if (cEl) cEl.innerHTML = s6PanelHtml(d.inst, d.res);
      if (claimsEl) {
        if (d.res[3].status === 'fulfilled') {
          var txMap = {};
          if (d.manifestInst) {
            var m = twoSellerClaimTxMap(d.manifestInst);
            d.res[3].value.forEach(function (c) {
              if (c.call_id.slice(-9) === '-fail-001' && m.fail) txMap[c.call_id] = { tx: m.fail };
              if (c.call_id.slice(-12) === '-timeout-001' && m.timeout) txMap[c.call_id] = { tx: m.timeout };
            });
          }
          claimsEl.innerHTML = claimsTableHtml(d.inst.buyer, d.res[3].value, txMap);
        } else {
          var cs = d.inst.claimSummary;
          claimsEl.innerHTML = '<h3>Buyer claim transparency — <span class="mono">' + esc(d.inst.buyer) + '</span></h3>' +
            '<p>Live call log could not be loaded — recorded 8 Nov state: calls ' + cs.calls + ' · successes ' + cs.successes + ' · failure claims ' + cs.failureClaims + ' · timeout claims ' + cs.timeoutClaims + ' · refusals ' + cs.refusals + '. Claim transactions are in the recorded table above.</p>';
        }
      }
      var ok = d.res.every(function (r) { return r.status === 'fulfilled'; });
      announce('Instance C live read finished: ' + (ok ? 'live.' : 'recorded fallback.'));
    }).catch(function () {
      if (cEl) cEl.innerHTML = '<div class="banner" role="alert"><strong>Live read failed — showing the recorded 8 Nov state below; retry.</strong></div>';
    });
  }

  // Human-stakes calculator (S1). Every figure is illustrative only —
  // no real usage data. Pure function + DOM wrapper.
  function stakesYear(callsPerDay, failRatePct, pricePounds) {
    return callsPerDay * (failRatePct / 100) * pricePounds * 365;
  }
  function stakesCalc() {
    var el = $('stakes-result');
    if (!el) return;
    function num(id) {
      var n = $(id);
      return n ? parseFloat(String(n.value || '').replace(/,/g, '')) : NaN;
    }
    var c = num('stakes-calls'), r = num('stakes-rate'), p = num('stakes-price');
    if (!isFinite(c) || !isFinite(r) || !isFinite(p) || c < 0 || r < 0 || r > 100 || p < 0) {
      el.textContent = 'Enter numbers above — illustrative only, no real usage data.';
      return;
    }
    var failedPerDay = c * (r / 100);
    var perYear = stakesYear(c, r, p);
    el.textContent = 'At ' + c.toLocaleString() + ' calls a day with ' + r + '% failing, you pay for ' + failedPerDay.toLocaleString() + ' failed calls a day — at £' + p + ' per call that is £' + perYear.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' a year for work that never happened. Illustrative only — no real usage data.';
  }

  // ------------------------------------------------------------------
  // Init
  // ------------------------------------------------------------------
  function init() {
    // M1: JavaScript loaded — remove the JS-load-failure message.
    // If app.js never runs, the message stays visible.
    var jsWarn = $('js-warning');
    if (jsWarn && jsWarn.remove) jsWarn.remove();
    renderPlayback();
    renderS3();
    var acct = $('buyer-account');
    if (acct) acct.value = C.DEMO_BUYER;
    var loadBtn = $('buyer-load');
    if (loadBtn) loadBtn.addEventListener('click', loadBuyer);
    var waitBtn = $('wait-demo-btn');
    if (waitBtn) waitBtn.addEventListener('click', runWaitDemo);
    var skipBtn = $('wait-skip-btn');
    if (skipBtn) { skipBtn.disabled = true; skipBtn.addEventListener('click', skipWaitDemo); }
    var guidedBtn = $('guided-start');
    if (guidedBtn) guidedBtn.addEventListener('click', guidedStart);
    var sellerLoadBtn = $('seller-load');
    if (sellerLoadBtn) sellerLoadBtn.addEventListener('click', loadSeller);
    // F2: health check behind an explicit button — never auto-probed.
    var healthBtn = $('seller-health-btn');
    if (healthBtn) healthBtn.addEventListener('click', checkSellerHealth);
    var s6RetryBtn = $('s6-retry');
    if (s6RetryBtn) s6RetryBtn.addEventListener('click', loadTwoSellers);
    var s7RetryBtn = $('s7-retry');
    if (s7RetryBtn) s7RetryBtn.addEventListener('click', loadInstanceC);
    // F6: copy buttons on S2/S5 shell commands + the S1 response hash.
    // data-copy carries the literal text; data-copy-from copies the
    // text of a sibling <code> element (so the command appears once).
    if (typeof document.querySelectorAll === 'function') {
      document.querySelectorAll('button[data-copy]').forEach(function (b) {
        b.addEventListener('click', function () { copyText(b.getAttribute('data-copy'), b); });
      });
      document.querySelectorAll('button[data-copy-from]').forEach(function (b) {
        b.addEventListener('click', function () {
          var src = document.getElementById(b.getAttribute('data-copy-from'));
          if (src) copyText(src.textContent, b);
        });
      });
    }
    // Human-stakes calculator (S1).
    ['stakes-calls', 'stakes-rate', 'stakes-price'].forEach(function (id) {
      var n = $(id);
      if (n) n.addEventListener('input', stakesCalc);
    });
    stakesCalc();
    var sellerAcct = $('seller-buyer');
    if (sellerAcct && !sellerAcct.value) sellerAcct.value = C.DEMO_BUYER;
    window.addEventListener('hashchange', route);
    route();
    // Contract/seller reachability banner on S1 (live read, retries).
    rpcView('get_seller', {}).then(function () {
      var b = $('s1-status'); if (b) b.innerHTML = '<p class="small">Testnet contract reachable. <a href="#/s5">Replay it yourself</a> or load the buyer console on S2.</p>';
    }).catch(function () {
      var b = $('s1-status');
      if (b) b.innerHTML = '<div class="banner" role="alert"><strong>Testnet contract unreachable.</strong> The recorded run below is still viewable (it is already-settled history), but live balances cannot be loaded. Try the replay steps on S5 or re-run locally from the README.</div>';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // ------------------------------------------------------------------
  // Exposed for the headless verification harness (not part of the UI).
  window.__meteredpay = { PLAYBACK: PLAYBACK, renderPlayback: renderPlayback, renderS3: renderS3, route: route, loadBuyer: loadBuyer, loadReplay: loadReplay, loadSeller: loadSeller, loadTwoSellers: loadTwoSellers, loadInstanceC: loadInstanceC, claimStats: claimStats, stakesYear: stakesYear, stakesCalc: stakesCalc, fmtYocto: fmtYocto, fiveHtml: fiveHtml, fiveStaticHtml: fiveStaticHtml, guidedStart: guidedStart, guidedNext: guidedNext, guidedBack: guidedBack, guidedShowTimeout: guidedShowTimeout, guidedState: guidedState, renderGuided: renderGuided, runWaitDemo: runWaitDemo, skipWaitDemo: skipWaitDemo, rowExplorerHtml: rowExplorerHtml, liveBalanceAfter: liveBalanceAfter, liveBalanceBefore: liveBalanceBefore };
})();
