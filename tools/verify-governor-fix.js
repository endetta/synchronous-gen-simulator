/**
 * Verifikasi perbaikan tiket 01 pada tiga skenario nyata yang sebelumnya OOS.
 */
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');

const R2D = 180 / Math.PI;

(async () => {
  const M = await makeExtractor(HTML);
  const { makeState, stepPhys, setMode, setS_, getPmEff, getPe, startRLR, getRLRLoad } = M;

  const step = (s, T, dt = 0.005) => { let t = 0; while (t < T) { stepPhys(s, dt); t += dt; } };
  const rep = (s, tag) => {
    const d = s.delta * R2D;
    console.log(`  ${tag}: δ=${d.toFixed(1)}° Pm_eff=${getPmEff(s).toFixed(3)} Pe=${getPe(s).toFixed(3)} ω=${s.omega.toFixed(5)} ${Math.abs(d) > 160 ? '*** OOS ***' : 'stable'}`);
    return Math.abs(d) <= 160;
  };

  let allOk = true;
  console.log('=== A. Klik "Island Mode" pada Pm=0.8 ===');
  const a = makeState(); setS_(a);
  a.Pm = 0.8; a.Ef = 1.5; a.Xs = 1.2; a.H = 8; a.D = 4;
  step(a, 10);
  rep(a, 'grid t=10s');
  setMode('island'); a.mode = 'island';
  for (const T of [1, 3, 5, 10, 20, 40]) { step(a, T === 1 ? 1 : T - (T === 3 ? 1 : T === 5 ? 3 : T === 10 ? 5 : T === 20 ? 10 : 20)); }
  allOk = rep(a, 'island t=40s') && allOk;

  console.log('\n=== B. Preset "Grid vs Island" penuh (28 s) ===');
  const b = makeState(); setS_(b);
  b.Pm = 0.55; b.Ef = 1.5; b.H = 8; b.D = 4;
  const PmaxB = b.Ef * b.V / b.Xs;
  b.delta = Math.asin(b.Pm / PmaxB);
  step(b, 3.5); b.Pm = 0.85; step(b, 9.5); b.Pm = 0.55; step(b, 2.0);
  setMode('island'); b.mode = 'island';
  step(b, 2.0); b.Pm = 0.85; step(b, 11);
  allOk = rep(b, 't=28s') && allOk;

  console.log('\n=== C. RLR 36 detik penuh ===');
  const c = makeState(); setS_(c);
  c.mode = 'island'; c.Ef = 1.5; c.H = 8; c.D = 4;
  c.Pm = getRLRLoad(0);
  const PmaxC = c.Ef * c.V / c.Xs;
  c.delta = Math.asin(c.Pm / PmaxC);
  c.Xg = c.Pm; c.Pm_gov = c.Pm;   // bumpless seperti startRLR
  let worst = 0, t = 0;
  while (t < 36) {
    c.Pm = getRLRLoad(t);
    stepPhys(c, 0.005); t += 0.005;
    worst = Math.max(worst, Math.abs(c.delta * R2D));
  }
  console.log(`  max |δ| sepanjang 36 s = ${worst.toFixed(1)}°  ${worst > 160 ? '*** OOS ***' : 'stable'}`);
  console.log(`  akhir: δ=${(c.delta * R2D).toFixed(1)}° Pm_eff=${getPmEff(c).toFixed(3)} load=${getRLRLoad(36).toFixed(3)}`);
  allOk = worst <= 160 && allOk;

  console.log('\n=== ' + (allOk ? 'SEMUA SKENARIO STABIL ✓' : 'MASIH ADA YANG OOS ✗') + ' ===');
  process.exit(allOk ? 0 : 1);
})();
