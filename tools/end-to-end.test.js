/**
 * End-to-End Feature Tests — tiket 08
 *
 * Regresi gate yang SEBELUMNYA TIDAK ADA: tes yang bisa gagal bila fitur inti
 * rusak. Semua tes mengekstrak kode asli dari HTML via tools/extract.js.
 *
 * Cakupan:
 *   A. Governor (island steady state, tracking, dormant di grid)
 *   B. Short circuit state machine
 *   C. Preset scenarios (verdict EAC, OOS)
 *   D. RLR
 *   E. Reset & state cleanup
 *
 * Usage: node tools/end-to-end.test.js
 */
const path = require('path');
const { makeExtractor } = require('./extract');

const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const R2D = 180 / Math.PI;

let passCount = 0, failCount = 0;
const ok = (c, m) => { if (c) { passCount++; console.log(`  ✓ ${m}`); } else { failCount++; console.log(`  ✗ ${m}`); } };
const close = (a, e, tol, m) => {
  const d = Math.abs(a - e);
  if (d <= tol) { passCount++; console.log(`  ✓ ${m} (Δ=${d.toExponential(2)})`); }
  else { failCount++; console.log(`  ✗ ${m} — expected ${e} ± ${tol}, got ${a}`); }
};

(async () => {
  const M = await makeExtractor(HTML);
  const {
    makeState, stepPhys, setS_, trigSC, doReset, getS_, setMode,
    getPmEff, govActive, getPe, getPmax, getA2Available, eacStable,
    getRLRLoad, getRLRPeriod, RLR_DUR, SCENARIOS,
  } = M;

  const step = (s, T, dt = 0.005) => { let t = 0; while (t < T) { stepPhys(s, dt); t += dt; } };
  const fresh = (o) => {
    const s = makeState(); setS_(s);
    Object.assign(s, o);
    s.delta = Math.asin(Math.min(Math.max(s.Pm / (s.Ef * s.V / s.Xs), -0.9999), 0.9999));
    s.omega = 0; s.Xg = 0; s.Pm_gov = 0; s.t = 0;
    return s;
  };

  console.log('\n=== A. Governor ===');

  // A1: island steady state
  const a1 = fresh({ Pm: 0.8, Ef: 1.5, Xs: 1.2, H: 8, D: 4, mode: 'island' });
  step(a1, 80);
  close(getPmEff(a1), 0.80, 0.02, 'island: Pm_eff konvergen ke setpoint');
  ok(Math.abs(a1.delta * R2D) < 120, 'island: tidak runaway (delta < 120 deg)');
  ok(govActive(a1), 'govActive true di island');

  // A2: governor tracks a changed setpoint
  a1.Pm = 0.6; step(a1, 60);
  close(getPmEff(a1), 0.60, 0.03, 'island: governor mengikuti setpoint baru (0.6 pu)');

  // A3: dormant in grid
  const a3 = fresh({ Pm: 0.6, Ef: 1.5, Xs: 1.2, H: 8, D: 4, mode: 'grid' });
  step(a3, 60);
  close(a3.Pm_gov, 0, 0.005, 'grid: Pm_gov decay ke 0');
  close(getPmEff(a3), 0.60, 0.005, 'grid: Pm_eff = setpoint langsung');
  ok(!govActive(a3), 'govActive false di grid');

  // A4: bumpless transfer
  const a4 = fresh({ Pm: 0.8, Ef: 1.5, Xs: 1.2, H: 8, D: 4, mode: 'grid' });
  step(a4, 15);
  const dBefore = a4.delta;
  setMode('island'); a4.mode = 'island';
  step(a4, 10);
  ok(Math.abs(a4.delta - dBefore) < 0.05, 'bumpless: delta tidak lompat saat grid→island');
  ok(Math.abs(a4.omega) < 0.02, 'bumpless: omega tetap kecil setelah switch');

  console.log('\n=== B. Short Circuit state machine ===');

  const b1 = fresh({ Pm: 0.5, Ef: 1.5, Xs: 1.2, H: 8, D: 4, mode: 'grid' });
  trigSC(); b1.sc_delay = 1.0; b1.sc_dur = 0.15;
  ok(b1.sc_on === true, 'trigSC menyalakan sc_on');
  ok(b1.eac_phase === 'none', 'trigSC mereset eac_phase ke none');
  ok(b1.A1_num === 0 && b1.A2_num === 0, 'trigSC mereset A1/A2');

  let sawFault = false, sawPost = false, sawDone = false, maxPeDuringFault = 0;
  let t = 0;
  while (t < 6) {
    stepPhys(b1, 0.005); t += 0.005;
    if (b1.sc_active) { sawFault = true; maxPeDuringFault = Math.max(maxPeDuringFault, getPe(b1)); }
    if (b1.eac_phase === 'post') sawPost = true;
    if (b1.eac_phase === 'done') sawDone = true;
  }
  ok(sawFault, 'sc_active true selama window fault');
  ok(sawPost, 'eac_phase melewati post setelah clearing');
  ok(sawDone, 'eac_phase mencapai done di puncak swing pertama');
  const Pmax = b1.Ef * b1.V / b1.Xs;
  ok(maxPeDuringFault < Pmax * 0.15, `Pe kolaps saat fault (maks ${maxPeDuringFault.toFixed(3)} << Pmax ${Pmax.toFixed(2)})`);

  console.log('\n=== C. Preset scenarios ===');

  // C1: sc_success -> STABIL
  const c1 = fresh({ Pm: 0.5, Ef: 1.5, Xs: 1.2, H: 8, D: 4, mode: 'grid' });
  trigSC(); c1.sc_delay = 0.1; c1.sc_dur = 0.15;
  step(c1, 10);
  ok(!c1.oos_tripped, 'sc_success: tidak trip');
  ok(eacStable(c1), 'sc_success: verdict STABIL (A2 tersedia >= A1)');
  ok(getA2Available(c1) > c1.A1_num, 'sc_success: margin A2 > A1');

  // C2: sc_fail -> TIDAK STABIL + trip
  const c2 = fresh({ Pm: 0.75, Ef: 1.5, Xs: 1.2, H: 8, D: 4, mode: 'grid' });
  trigSC(); c2.sc_delay = 0.1; c2.sc_dur = 0.65;
  step(c2, 8);
  ok(c2.oos_tripped === true, 'sc_fail: OOS terdeteksi dan latch ter-set');
  ok(!eacStable(c2), 'sc_fail: verdict TIDAK STABIL');

  // C3: grid_island preset -> tidak pernah OOS
  const c3 = fresh({ Pm: 0.55, Ef: 1.5, H: 8, D: 4, mode: 'grid' });
  step(c3, 3.5); c3.Pm = 0.85; step(c3, 9.5); c3.Pm = 0.55; step(c3, 2.0);
  setMode('island'); c3.mode = 'island'; step(c3, 2.0); c3.Pm = 0.85; step(c3, 11);
  ok(!c3.oos_tripped, 'grid_island: tidak pernah OOS sepanjang preset');
  ok(Math.abs(c3.delta * R2D) < 120, 'grid_island: delta tetap wajar di akhir');

  // C4: overexcitation -> Pmax naik, Q berubah sifat
  const c4 = fresh({ Pm: 0.6, Ef: 1.0, H: 8, D: 4, mode: 'grid' });
  const pmax1 = c4.Ef * c4.V / c4.Xs;
  const q1 = M.getQe(c4);
  c4.Ef = 2.0; step(c4, 5);
  const pmax2 = c4.Ef * c4.V / c4.Xs;
  const q2 = M.getQe(c4);
  ok(pmax2 > pmax1, `overexcitation: Pmax naik (${pmax1.toFixed(3)} -> ${pmax2.toFixed(3)})`);
  ok(q1 < 0 && q2 > 0, `overexcitation: Q berubah leading->lagging (${q1.toFixed(3)} -> ${q2.toFixed(3)})`);

  // C5: load_step -> settle
  const c5 = fresh({ Pm: 0.4, Ef: 1.5, H: 8, D: 4, mode: 'grid' });
  step(c5, 4); c5.Pm = 0.85; step(c5, 30);
  ok(Math.abs(c5.delta * R2D) < 120, 'load_step: delta tetap stabil setelah step');
  close(getPmEff(c5), 0.85, 0.01, 'load_step: Pm_eff = setpoint baru');

  console.log('\n=== D. RLR ===');

  const d1 = fresh({ Ef: 1.5, H: 8, D: 4, mode: 'island' });
  d1.Pm = getRLRLoad(0);
  d1.delta = Math.asin(d1.Pm / (d1.Ef * d1.V / d1.Xs));
  d1.Xg = d1.Pm; d1.Pm_gov = d1.Pm;
  let worst = 0, tt = 0;
  while (tt < RLR_DUR) {
    d1.Pm = getRLRLoad(tt);
    stepPhys(d1, 0.005); tt += 0.005;
    worst = Math.max(worst, Math.abs(d1.delta * R2D));
  }
  ok(worst < 160, `RLR: tidak OOS sepanjang 36 s (maks |delta| = ${worst.toFixed(1)} deg)`);
  close(getRLRLoad(0), 0.58, 0.01, 'RLR: beban jam 00:00 = 0.58');
  close(getRLRLoad(17 * 3600 / 2400), 0.958, 0.01, 'RLR: beban jam 17:00 = 0.958 (puncak)');
  ok(govActive(d1), 'RLR: governor aktif (island)');

  console.log('\n=== E. Reset & cleanup ===');

  const e1 = fresh({ Pm: 0.75, Ef: 1.5, Xs: 1.2, H: 8, D: 4, mode: 'grid' });
  trigSC(); e1.sc_delay = 0.1; e1.sc_dur = 0.65;
  step(e1, 8);
  ok(e1.oos_tripped, 'reset: kondisi awal memang tripped');
  doReset();
  const e2 = getS_();
  ok(!e2.oos_tripped, 'reset: latch OOS dilepas');
  ok(e2.hist.length === 0, 'reset: history dibersihkan');
  ok(e2.sc_on === false && e2.sc_active === false, 'reset: state SC dibersihkan');
  ok(e2.eac_phase === 'none' && e2.A1_num === 0 && e2.A2_num === 0, 'reset: state EAC dibersihkan');
  ok(e2.evts.length === 0, 'reset: event scenario dibersihkan');
  // Reset: delta kembali ke equilibrium AWAL STATE BARU. makeState() membaca
  // nilai dari DOM (di stub: '1'), jadi pembanding yang benar adalah state
  // segar lain, bukan formula dari nilai default HTML.
  const eRef = makeState();
  ok(Math.abs(e2.delta - eRef.delta) < 1e-9, 'reset: delta kembali ke equilibrium segar (idemempoten)');

  console.log(`\n=== Summary ===\nPassed: ${passCount}  Failed: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
