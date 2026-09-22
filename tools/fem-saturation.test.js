/**
 * FEM Saturation Test — kurva OCC (open-circuit characteristic) untuk arus medan.
 *
 * Kontrak: I_f = 1.0 pu memetakan E_af = 1.0 pu; kurva monoton, cekung
 * (concave), dan dibatasi asimtot OCC_PEAK = 1.55 pu.
 *
 * Ref: docs/superpowers/specs/2026-09-22-fem-medium-realistic-generator-design.md
 * Seam: tools/extract.js (fungsi diekstrak dari HTML, tidak disalin).
 */
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');

let failed = 0;
const assertClose = (actual, expected, tol, msg) => {
  const diff = Math.abs(actual - expected);
  if (diff <= tol) console.log(`  ✓ ${msg}`);
  else { failed++; console.log(`  ✗ ${msg}: expected ${expected}, got ${actual}`); }
};
const assertTrue = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failed++; console.log(`  ✗ ${msg}`); }
};

(async () => {
  const M = await makeExtractor(HTML);
  const { satCurve, getEaf, getFluxDensity, OCC_PEAK } = M;
  assertClose(satCurve(0), 0, 1e-12, 'OCC starts at zero');
  assertClose(satCurve(1), 1, 1e-12, '1 pu field current gives 1 pu E_af');
  assertClose(getEaf(1), satCurve(1), 1e-12, 'getEaf delegates to satCurve');
  assertTrue(satCurve(3) < OCC_PEAK, 'curve stays below its 1.55 pu asymptote');
  assertTrue(satCurve(3) > satCurve(1), 'curve is still increasing at high excitation');

  let prev = 0, prevSlope = Infinity;
  for (let x = 0.25; x <= 3; x += 0.25) {
    const y = satCurve(x);
    const slope = (y - prev) / 0.25;
    assertTrue(y > prev && slope < prevSlope, `concave and monotonic at If=${x}`);
    prev = y; prevSlope = slope;
  }
  assertClose(getFluxDensity(0), 0, 1e-12, 'zero field gives zero flux density');
  assertTrue(getFluxDensity(1) > 0 && getFluxDensity(1) < 1, 'rated density is normalized below one');
  if (failed) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
