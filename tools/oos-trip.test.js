/**
 * OOS Trip Test (TDD red untuk tiket 04)
 *
 * Perilaku yang dibutuhkan:
 *   1. Saat |delta| > 160 deg: flag oos_tripped SET, integrasi fisika BERHENTI
 *      (delta frozen), banner permanen sampai reset.
 *   2. Banner TIDAK bisa hilang dengan sendirinya (tidak ada auto-clear).
 *   3. doReset() mengembalikan state bersih dan melepaskan latch.
 */
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const R2D = 180 / Math.PI;

let passCount = 0, failCount = 0;
const assertTrue = (c, m) => {
  if (c) { passCount++; console.log(`  ✓ ${m}`); }
  else { failCount++; console.log(`  ✗ ${m}`); }
};

(async () => {
  const M = await makeExtractor(HTML);
  const { makeState, stepPhys, setS_, trigSC, doReset } = M;

  console.log('\n=== OOS Trip: latch + fisika berhenti ===\n');

  // ==== Skenario: SC panjang → pasti OOS ====
  console.log('Skenario: sc_fail (Pm=0.75, SC 0.65s)');
  const s = makeState(); setS_(s);
  s.Pm = 0.75; s.Ef = 1.5; s.Xs = 1.2; s.H = 8; s.D = 4; s.mode = 'grid';
  s.delta = Math.asin(s.Pm / (s.Ef * s.V / s.Xs)); s.omega = 0; s.Xg = 0; s.Pm_gov = 0; s.t = 0;
  trigSC(); s.sc_delay = 0.1; s.sc_dur = 0.65;

  let t = 0, tripped = false, deltaAtTrip = 0, tAtTrip = 0;
  while (t < 10) {
    stepPhys(s, 0.005); t += 0.005;
    if (!tripped && s.oos_tripped) {
      tripped = true; deltaAtTrip = s.delta; tAtTrip = s.t;
      console.log(`  trip terdeteksi pada t=${s.t.toFixed(2)}s, δ=${(s.delta * R2D).toFixed(1)}°`);
    }
    if (tripped) {
      const drift = Math.abs(s.delta - deltaAtTrip);
      if (drift > 0.05) { assertTrue(false, `fisika berhenti setelah trip (drift ${drift.toFixed(4)} rad)`); tripped='done'; }
    }
  }

  assertTrue(tripped !== false, 'oos_tripped ter-set saat delta melewati 160°');
  if (tripped === true || tripped === 'done') {
    assertTrue(true, 'fisika berhenti setelah trip (delta frozen)');
    // Banner: latch permanen — verifikasi flag tidak di-clear otomatis
    assertTrue(s.oos_tripped === true, 'latch oos_tripped TIDAK di-clear otomatis');
    // Lanjutkan simulasi 2 s — delta tidak boleh berubah
    const d0 = s.delta; let t2 = 0;
    while (t2 < 2) { stepPhys(s, 0.005); t2 += 0.005; }
    assertTrue(Math.abs(s.delta - d0) < 1e-9, 'delta tetap frozen 2 s setelah trip');
  }

  // ==== Reset membersihkan latch ====
  console.log('\nReset:');
  doReset();
  const sAfter = M.getS_();
  assertTrue(sAfter.oos_tripped !== true, 'doReset menghapus latch oos_tripped');
  assertTrue(Math.abs(sAfter.delta) < Math.PI / 2, 'doReset mengembalikan delta ke equilibrium');

  console.log(`\n=== Summary ===\nPassed: ${passCount}  Failed: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
