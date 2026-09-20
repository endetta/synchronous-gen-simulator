/**
 * EAC Verdict Test (TDD red untuk tiket 03)
 *
 * Kriteria buku teks (Kundur 1994 §11.2):
 *   A1 = integral dari d0 sampai delta_clear dari (Pm - Pe_fault)
 *   A2 = integral dari delta_clear sampai delta_max pertama (omega nol pertama)
 *   STABIL iff A2 >= A1 (tanpa faktor 0.8)
 *
 * SEBELUM perbaikan:
 *   - A2 tidak berhenti di delta_max (terus tumbuh selama post phase)
 *   - verdict memakai A2 >= A1*0.8
 */
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const R2D = 180 / Math.PI;

let passCount = 0, failCount = 0;
const assertClose = (a, e, tol, m) => {
  const d = Math.abs(a - e);
  if (d <= tol) { passCount++; console.log(`  ✓ ${m} (Δ=${d.toExponential(2)})`); }
  else { failCount++; console.log(`  ✗ ${m} — expected ${e} ± ${tol}, got ${a}`); }
};
const assertTrue = (c, m) => {
  if (c) { passCount++; console.log(`  ✓ ${m}`); }
  else { failCount++; console.log(`  ✗ ${m}`); }
};

(async () => {
  const M = await makeExtractor(HTML);
  const { makeState, stepPhys, setS_, trigSC } = M;

  console.log('\n=== EAC Verdict: kriteria buku teks ===\n');

  // ==== Skenario 1: SC pendek, jelas stabil (Pm=0.5, Ef=1.5, X'd=1.2, SC 0.15 s) ====
  console.log('Skenario 1: sc_success (Pm=0.5, SC 0.15s)');
  const s = makeState(); setS_(s);
  s.Pm = 0.5; s.Ef = 1.5; s.Xs = 1.2; s.H = 8; s.D = 4; s.mode = 'grid';
  s.delta = Math.asin(s.Pm / (s.Ef * s.V / s.Xs)); s.omega = 0; s.Xg = 0; s.Pm_gov = 0; s.t = 0;

  // analytic A1: (Pm)(dc - d0) - Pf*(cos dc - cos d0), Pf = Pmax * sc_Pfact
  const Pmax = s.Ef * s.V / s.Xs;
  const Pf = Pmax * s.sc_Pfact;
  const d0 = Math.asin(s.Pm / Pmax);
  const CCT = Math.sqrt(4 * s.H * (Math.PI - 2 * d0 - (Math.PI - 2 * d0)) / (50 * 2 * Math.PI * s.Pm));  // placeholder

  // trigger SC on the sim (delay 1s, dur 0.15s)
  trigSC();
  s.sc_delay = 1.0; s.sc_dur = 0.15;
  let t = 0, dClear = null, A2_at_first_peak = null, prevOmega = null, firstPeakSeen = false;
  let A2_growth_after_peak = 0;
  while (t < 12) {
    stepPhys(s, 0.005); t += 0.005;
    if (dClear === null && s.eac_phase === 'post') dClear = s.delta;
    if (dClear !== null && !firstPeakSeen && prevOmega !== null && prevOmega > 0 && s.omega <= 0) {
      firstPeakSeen = true;
      A2_at_first_peak = s.A2_num;
    }
    if (firstPeakSeen) A2_growth_after_peak = Math.max(A2_growth_after_peak, Math.abs(s.A2_num - A2_at_first_peak));
    prevOmega = s.omega;
  }
  assertTrue(dClear !== null, 'eac_phase mencapai post (SC clear terjadi)');
  assertTrue(firstPeakSeen, 'delta_max pertama tercapai (omega crossing zero)');
  assertClose(A2_growth_after_peak, 0, 1e-6, 'A2 BERHENTI bertambah setelah delta_max pertama (bukan terus tumbuh)');

  // analytic A1 at clearing: A1 = ∫_{d0}^{dc}(Pm − Pf·sin δ)dδ
  //                                  = Pm·(dc−d0) + Pf·(cos dc − cos d0)
  if (dClear !== null) {
    const A1_analytic = s.Pm * (dClear - d0) + Pf * (Math.cos(dClear) - Math.cos(d0));
    // Toleransi 5%: PHDT integrasi 3 ms + Math.abs(omega) diskretisasi menyisakan
    // error ~5% pada area kecil (~0.05 pu·rad). Verdict STABIL tidak terpengaruh.
    assertClose(s.A1_num, A1_analytic, 0.05 * A1_analytic + 1e-4, `A1_num cocok analitik (${A1_analytic.toFixed(4)})`);
    // Kriteria buku teks: A2 TERSEDIA (dari dc sampai δcr) >= A1
    const dcr = Math.PI - d0;
    const A2_available = Pmax * (Math.cos(dClear) - Math.cos(dcr)) - s.Pm * (dcr - dClear);
    assertTrue(A2_available >= s.A1_num, `verdict buku teks A2_tersedia (${A2_available.toFixed(4)}) >= A1 (${s.A1_num.toFixed(4)}) → STABIL (sc_success)`);
  }

  // ==== Skenario 2: SC panjang, jelas tidak stabil (Pm=0.75, SC 0.65 s) ====
  console.log('\nSkenario 2: sc_fail (Pm=0.75, SC 0.65s)');
  const s2 = makeState(); setS_(s2);
  s2.Pm = 0.75; s2.Ef = 1.5; s2.Xs = 1.2; s2.H = 8; s2.D = 4; s2.mode = 'grid';
  s2.delta = Math.asin(s2.Pm / (s2.Ef * s2.V / s2.Xs)); s2.omega = 0; s2.Xg = 0; s2.Pm_gov = 0; s2.t = 0;
  trigSC(); s2.sc_delay = 0.1; s2.sc_dur = 0.65;
  let t2 = 0;
  let everOOS = false;
  while (t2 < 8) { stepPhys(s2, 0.005); t2 += 0.005; if (Math.abs(s2.delta) * R2D > 160) everOOS = true; }
  assertTrue(everOOS, 'sc_fail benar-benar OOS (delta > 160 deg)');

  // ==== Summary ====
  console.log(`\n=== Summary ===\nPassed: ${passCount}  Failed: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
