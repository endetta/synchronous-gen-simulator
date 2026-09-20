/**
 * Governor Steady-State Test (TDD red untuk tiket 01)
 *
 * MEMAKSA: tes ini mengekstrak ode()/rk4()/stepPhys() langsung dari HTML
 * (seam ekstraksi), kemudian verifikasi bahwa di island mode:
 *   (a) governor mencapai steady-state dengan Pm_gov → Pm setpoint
 *   (b) Pm_eff = Pm_gov (bukan Pm + Pm_gov)
 *   (c) tidak ada runaway OOS
 *
 * SEBELUM perbaikan (green target belum ada): tes GAGAL karena
 *   - Pm_gov overshoots ke negatif → Pm_eff ≠ Pm
 *   - delta melesat melewati 180° → tripped
 */
const path = require('path');
const fs = require('fs');
const { makeExtractor } = require('./extract');

const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');

let passCount = 0;
let failCount = 0;
function assertClose(actual, expected, tol, msg) {
  const diff = Math.abs(actual - expected);
  const ok = diff <= tol;
  if (ok) { passCount++; console.log(`  ✓ ${msg} (Δ=${diff.toExponential(2)})`); }
  else    { failCount++; console.log(`  ✗ ${msg} — expected ${expected} ± ${tol}, got ${actual}`); }
}
function assertTrue(cond, msg) {
  if (cond) { passCount++; console.log(`  ✓ ${msg}`); }
  else      { failCount++; console.log(`  ✗ ${msg}`); }
}

async function main() {
  const { S, makeState, ode, rk4, stepPhys, setMode, setS_, getPe, getPmax, getPmEff, R2D } = await makeExtractor(HTML);

  console.log('\n=== Governor Steady-State: Island Mode (TDD red) ===\n');

  // --- Test 1: Governor trims to Pm setpoint (bukan menambahkannya) ---
  console.log('Test 1: Governor tracks Pm setpoint in island mode');
  const s = makeState();
  setS_(s);
  s.mode = 'island';
  s.Pm = 0.80; s.Ef = 1.5; s.Xs = 1.2; s.H = 8; s.D = 4;
  s.delta = 0; s.omega = 0; s.Xg = 0; s.Pm_gov = 0; s.t = 0;

  // 80 seconds simulasi, 5 ms step
  let t = 0;
  const dt = 0.005;
  while (t < 80) {
    stepPhys(s, dt);
    t += dt;
  }
  const Pm_eff = getPmEff(s);
  assertClose(Pm_eff, 0.800, 0.03, 'Pm_eff converges to Pm setpoint (0.8 pu)');
  assertClose(s.Pm_gov, 0.800, 0.03, 'Pm_gov converges to Pm setpoint');
  assertTrue(Math.abs(s.delta * R2D) < 90, 'delta stays bounded (< 90 deg), system stable');

  // --- Test 2: Bumpless grid→island transfer ---
  console.log('\nTest 2: Bumpless grid→island transfer');
  const s2 = makeState();
  setS_(s2);
  s2.mode = 'grid';
  s2.Pm = 0.80;
  // settle 20 s in grid mode
  let t2 = 0; while (t2 < 20) { stepPhys(s2, 0.005); t2 += 0.005; }
  const deltaBefore = s2.delta;
  const omegaBefore = s2.omega;

  setMode('island'); s2.mode = 'island';
  // 10 s after switch
  let t3 = 0; while (t3 < 10) { stepPhys(s2, 0.005); t3 += 0.005; }
  const deltaAfter = s2.delta;
  assertClose(Math.abs(deltaAfter - deltaBefore), 0, 0.02, 'delta tidak lompat > 0.02 rad pada grid→island switch');
  assertTrue(Math.abs(s2.omega) < 0.05, 'omega tetap kecil post-switch (≤ 0.05 pu)');

  // --- Test 3: Governor stays dormant in grid mode ---
  console.log('\nTest 3: Governor dormant in grid mode');
  const s3 = makeState();
  setS_(s3);
  s3.mode = 'grid';
  s3.Pm = 0.60;
  let t4 = 0; while (t4 < 80) { stepPhys(s3, 0.005); t4 += 0.005; }
  assertClose(s3.Pm_gov, 0, 0.005, 'Pm_gov → 0 in grid mode (governor off)');
  assertClose(getPmEff(s3), 0.60, 0.005, 'Pm_eff = Pm setpoint langsung di grid mode');

  // --- Summary ---
  console.log('\n=== Summary ===');
  console.log(`Passed: ${passCount}  Failed: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
