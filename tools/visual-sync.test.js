#!/usr/bin/env node
/**
 * visual-sync.test.js — Kontrak jam visual τ (tau) untuk mode Realistis.
 *
 * Satu jam visual S.animT menggantikan S.anim + wE*S.t di jalur realistis:
 *   - grid mode    : laju = 2π·visSpeed·rdt
 *   - island mode  : laju = 2π·visSpeed·rdt·(1+omega)
 *   - visSpeed     : 0.25 / 0.5 / 1 / 2 Hz (dropdown)
 *   - deterministik: fungsi murni dari rdt, TANPA Date.now()
 *
 * Usage: node tools/visual-sync.test.js
 */
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const src = require('fs').readFileSync(HTML, 'utf8');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const close = (a, e, t, m) => {
  if (Math.abs(a - e) <= t) console.log('  ✓ ' + m);
  else { fail++; console.log('  ✗ ' + m + ': got ' + a + ', expected ' + e); }
};

(async () => {
  const M = await makeExtractor(HTML);
  const { makeState, advanceVisualClock } = M;

  // ── 1. advanceVisualClock ada dan ter-export ──
  ok(typeof advanceVisualClock === 'function', 'advanceVisualClock ter-export dari extract.js');

  // ── 2. State membawa animT dan visSpeed ──
  const s = makeState();
  ok('animT' in s, 'state membawa field animT');
  ok('visSpeed' in s, 'state membawa field visSpeed');

  // ── 3. Grid: laju = 2π·visSpeed·rdt (abaikan omega) ──
  s.visSpeed = 1; s.mode = 'grid'; s.omega = 0.2; s.animT = 0;
  advanceVisualClock(s, 1);
  close(s.animT, 2 * Math.PI, 1e-9, 'grid 1Hz·1s → animT = 2π');

  // ── 4. Island: laju ikut (1+omega) ──
  s.mode = 'island'; s.animT = 0;
  advanceVisualClock(s, 1);
  close(s.animT, 2 * Math.PI * 1.2, 1e-9, 'island 1Hz·1s·(1+0.2) → animT = 2.4π');

  // ── 5. visSpeed 0.5 memperlambat setengah ──
  s.visSpeed = 0.5; s.mode = 'grid'; s.animT = 0;
  advanceVisualClock(s, 1);
  close(s.animT, Math.PI, 1e-9, 'visSpeed 0.5 → animT = π');

  // ── 6. visSpeed 2 mempercepat dua kali ──
  s.visSpeed = 2; s.animT = 0;
  advanceVisualClock(s, 1);
  close(s.animT, 4 * Math.PI, 1e-9, 'visSpeed 2 → animT = 4π');

  // ── 7. Tidak ada Date.now() di jalur realistis (line ending CRLF-safe) ──
  const start = src.indexOf('function updateSvgPhasorRealistic(');
  const end = src.indexOf('\r\n}', start) >= 0 ? src.indexOf('\r\n}', start) : src.indexOf('\n}', start);
  const updReal = src.slice(start, end + 3);
  // Buang komentar: teks "BUKAN Date.now()" di komentar bukan pemakaian.
  const updRealNoComments = updReal.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ok(!updRealNoComments.includes('Date.now()'), 'updateSvgPhasorRealistic TANPA Date.now()');

  // ── 8. Jalur realistis memakai S.animT (bukan S.anim / wE*S.t) ──
  ok(updRealNoComments.includes('S.animT'), 'jalur realistis memakai S.animT');
  ok(!updReal.includes('wE*S.t'), 'tidak ada lagi wE*S.t di jalur realistis');

  console.log('\n=== Visual Sync Contract ===');
  console.log('Passed: ' + pass + '  Failed: ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
