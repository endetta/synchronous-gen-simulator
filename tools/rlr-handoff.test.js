/**
 * rlr-handoff.test.js — tiket 09.7/09.8/09.9 (TDD red dulu)
 *
 * 09.7: stopRLR() -> setMode('grid') memakai Pm_eff = s.Pm (setpoint terakhir),
 *       tapi Pm_gov berada di lag governor-nya. Range Pm_eff melompat (dulu
 *       −0.113 pu, probe 2026-09-21: −0.126 pu). Handoff seharusnya bumpless.
 * 09.8: stopRLR() tidak menyinkronkan slider Pm (sPm/nPm) ke s.Pm (beban akhir
 *       24 jam). Slider tetap menampilkan nilai pre-RLR → klik/drag kecil
 *       menyebabkan lompatan ke nilai slider.
 * 09.9: Klik tombol Grid saat RLR masih jalan mengubah s.mode='grid' tanpa
 *       menghentikan RLR -> f display "50.00 Hz" sementara omega masih divalid
 *       oleh RLR (fisika island).
 */
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');

let passCount = 0, failCount = 0;
const assertTrue = (c, m) => {
  if (c) { passCount++; console.log(`  ✓ ${m}`); }
  else { failCount++; console.log(`  ✗ ${m}`); }
};
const assertClose = (a, e, tol, m) => {
  const d = Math.abs(a - e);
  if (d <= tol) { passCount++; console.log(`  ✓ ${m} (Δ=${d.toExponential(2)})`); }
  else { failCount++; console.log(`  ✗ ${m} — expected ${e} ± ${tol}, got ${a}`); }
};

(async () => {
  const M = await makeExtractor(HTML);
  const { makeState, stepPhys, setS_, startRLR, stopRLR, setMode, getPmEff, getRLRLoad, RLR_DUR } = M;

  console.log('\n=== Tiket 09.7: RLR → grid handoff bumpless ===\n');

  // --- 09.7: handoff ---
  // CATATAN: startRLR() memanggil doReset(false) yang membuat state BARU.
  // Ambil state segar lewat getS_() setelah startRLR, jangan pakai objek lama.
  const s0 = makeState(); setS_(s0);
  startRLR();
  const s = M.getS_();   // state segar (doReset di dalam startRLR menggantinya)
  // Jalan sampai RLR hampir selesai (RLR_DUR = 36 s)
  let t = 0;
  while (t < RLR_DUR - 0.5) { stepPhys(s, 0.05); t += 0.05; }
  const effPre = getPmEff(s);
  const deltaPre = s.delta;
  console.log(`  t=${s.t.toFixed(2)}s | Pm_gov(gov aktif)=${s.Pm_gov.toFixed(4)} | s.Pm=${s.Pm.toFixed(4)}`);
  console.log(`  getPmEff pre-stopRLR = ${effPre.toFixed(4)}`);

  stopRLR();
  const effPost = getPmEff(s);
  console.log(`  getPmEff post-stopRLR = ${effPost.toFixed(4)} (mode=${s.mode}, s.Pm=${s.Pm.toFixed(4)})`);
  const jump = Math.abs(effPost - effPre);
  console.log(`  |lompatan Pm_eff| = ${jump.toFixed(4)} pu`);
  assertTrue(
    jump <= 0.02,
    `handoff bumpless: |ΔPm_eff| ≤ 0.02 pu (got ${jump.toFixed(4)})`
  );
  // Setpoint grid = daya aktual saat handoff (bukan beban profil yang lag)
  assertClose(s.Pm, effPre, 1e-9, 's.Pm = daya aktual saat handoff (setpoint grid)');
  // Delta tidak melompat saat handoff (fisika kontinu)
  assertClose(s.delta, deltaPre, 1e-9, 'delta kontinu saat handoff');
  // Transien pasca-handoff kecil: jalankan 10 s, omega harus tetap kecil
  let tp = 0; let omegaMax = 0;
  while (tp < 10) { stepPhys(s, 0.05); tp += 0.05; omegaMax = Math.max(omegaMax, Math.abs(s.omega)); }
  assertTrue(omegaMax < 0.05, `transien pasca-handoff kecil (|omega|max=${omegaMax.toFixed(4)} < 0.05)`);

  // --- 09.8: slider sinkron ---
  console.log('\n=== Tiket 09.8: slider Pm tersinkron pasca stopRLR ===\n');
  // Slider DOM tidak bisa dibaca via stub extract.js; verifikasi lewat kontrak
  // kode: stopRLR harus memanggil uiSl('Pm', ...) untuk sinkronisasi slider.
  const fs = require('fs');
  const src = fs.readFileSync(HTML, 'utf8');
  const stopRLRSrc = src.match(/function stopRLR\(\)\{[\s\S]*?\nfunction toggleRLR/);
  assertTrue(
    !!stopRLRSrc && /uiSl\('Pm'/.test(stopRLRSrc[0]),
    "stopRLR memanggil uiSl('Pm', ...) untuk sinkron slider"
  );
  assertTrue(s.Pm > 0, `s.Pm adalah daya aktual handoff (${s.Pm.toFixed(4)}), bukan nol`);

  // --- 09.9: klik Grid saat RLR jalan ---
  console.log('\n=== Tiket 09.9: klik Grid saat RLR aktif ===\n');
  const s20 = makeState(); setS_(s20);
  startRLR();
  const s2 = M.getS_();  // state segar setelah doReset internal
  let t2 = 0;
  while (t2 < 5) { stepPhys(s2, 0.05); t2 += 0.05; }
  console.log(`  RLR aktif: rlr_running=${M.rlr_state()} mode=${s2.mode} omega=${s2.omega.toFixed(5)}`);
  setMode('grid'); // user klik tombol Grid saat RLR masih jalan
  console.log(`  setMode('grid') → mode=${s2.mode} rlr_running=${M.rlr_state()}`);
  // Fisika: mode grid → D+2 (infinite bus damping), f = 50 Hz fixed di UI.
  // Tapi RLR masih jalan → s.Pm terus di-drive load profile island.
  let t3 = 0;
  while (t3 < 2) { stepPhys(s2, 0.05); t3 += 0.05; }
  const stillRunning = M.rlr_state();
  assertTrue(
    stillRunning === false,
    `RLR dihentikan saat mode dialihkan (rlr_running=${stillRunning}) — tidak ada mode/physics mismatch`
  );
  // f display = F0*(1+omega) di island, F0 di grid. Jika RLR berhenti dan mode
  // grid, omega harus menuju 0 (infinite bus menyerap).
  assertTrue(Math.abs(s2.omega) < 0.05, `omega kecil setelah mode grid stabil (got ${s2.omega.toFixed(5)})`);

  console.log(`\n=== Summary ===\nPassed: ${passCount}  Failed: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
