/**
 * Pole Geometry Test — geometri jumlah kutub & rasio saliency tetap.
 *
 * Kontrak: 2 kutub = round rotor (Xq/Xd = 1.00); 4/6/8 kutub = salient (0.65).
 * Slot = 6 per kutub; koil = 2 per fase per kutub.
 *
 * Ref: docs/superpowers/specs/2026-09-22-fem-medium-realistic-generator-design.md
 * Seam: tools/extract.js (fungsi diekstrak dari HTML, tidak disalin).
 */
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
let failed = 0;
const check = (cond, msg) => { if (cond) console.log(`  ✓ ${msg}`); else { failed++; console.log(`  ✗ ${msg}`); } };

(async () => {
  const M = await makeExtractor(HTML);
  const { SAL_RATIO, polePairs, getXq, slotCount, coilsPerPhase, elecAngle } = M;
  check(SAL_RATIO[2] === 1 && SAL_RATIO[4] === 0.65 && SAL_RATIO[6] === 0.65 && SAL_RATIO[8] === 0.65, 'fixed saliency ratios');
  [2, 4, 6, 8].forEach((poles) => {
    check(polePairs(poles) === poles / 2, `${poles} poles have ${poles / 2} pairs`);
    check(getXq(1.2, poles) === 1.2 * SAL_RATIO[poles], `Xq follows ratio for ${poles} poles`);
    check(slotCount(poles) === 6 * poles, `${poles} poles use 6 slots per pole`);
    check(coilsPerPhase(poles) === 2 * poles, `${poles} poles use two coils per phase per pole`);
  });
  check(Math.abs(elecAngle(Math.PI / 2, 4) - Math.PI) < 1e-12, '4 poles turn 90 mechanical degrees into 180 electrical degrees');
  if (failed) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
