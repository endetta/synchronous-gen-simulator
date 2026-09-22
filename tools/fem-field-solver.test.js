/**
 * FEM Field Solver Test — koefisien medan dan armature reaction.
 *
 * Kontrak visual: flux mengikuti I_f, armature reaction dipisah menjadi sumbu-d
 * dan sumbu-q, serta pola medan mengikuti jumlah pole pairs.
 * Seam: tools/extract.js (fungsi diekstrak dari HTML, tidak disalin).
 */
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
let failed = 0;
const ok = (c, m) => { if (c) console.log(`  ✓ ${m}`); else { failed++; console.log(`  ✗ ${m}`); } };

(async () => {
  const { solveField } = await makeExtractor(HTML);
  const low = solveField(0.5, 0, 0, 2, 0);
  const high = solveField(2, 0, 0, 2, 0);
  ok(high.brRot > low.brRot, 'flux amplitude rises with field current');
  ok(high.brRot / low.brRot < 4, 'saturation prevents linear flux growth');
  const over = solveField(1, -0.4, 0.2, 4, 0.4);
  ok(over.armD > 0 && over.armQ > 0, 'negative Id and positive Iq produce the two armature components');
  ok(over.pairs === 2, 'four poles produce two field patterns');
  const noArm = solveField(1, 0, 0, 2, 0.4);
  ok(noArm.armD === 0 && noArm.armQ === 0, 'unity cross-axis-free case has no armature distortion');
  if (failed) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
