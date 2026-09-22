/**
 * FEM Saliency Test — persamaan rangkaian mesin salient (Xd ≠ Xq).
 *
 * Kontrak: pada 2 kutub (Xq = Xd) semua suku reluctance lenyap sehingga hasil
 * round-rotor lama tetap berlaku; pada 4 kutub ke atas torsi reluctance
 * menurunkan sudut operasi dan menggeser δ_cr / δ_cc.
 *
 * Ref: Kundur (1994) §5.2 (salient-pole machine, torsi reluctance);
 *      Anderson & Fouad (2003) §2.4 (EAC mesin salient).
 * Seam: tools/extract.js (fungsi diekstrak dari HTML, tidak disalin).
 */
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
let failed = 0;
const close = (a, e, tol, m) => { if (Math.abs(a - e) <= tol) console.log(`  ✓ ${m}`); else { failed++; console.log(`  ✗ ${m}: expected ${e}, got ${a}`); } };
const ok = (c, m) => { if (c) console.log(`  ✓ ${m}`); else { failed++; console.log(`  ✗ ${m}`); } };

(async () => {
  const M = await makeExtractor(HTML);
  const { getPeSal, solveDelta0, solveDeltaCr, solveDeltaCc, solveCCT } = M;
  const Pmax = 1.25, V = 1, Xd = 1.2, XqRound = 1.2, XqSalient = 0.78, Pm = 0.8, H = 8;
  const d0Round = Math.asin(Pm / Pmax);
  close(getPeSal(d0Round, Pmax, Xd, XqRound, V), Pm, 1e-9, 'round rotor has no reluctance term');
  close(solveDelta0(Pm, Pmax, Xd, XqRound, V), d0Round, 1e-6, 'round-rotor equilibrium matches arcsin');
  close(solveDeltaCr(Pm, Pmax, Xd, XqRound, V), Math.PI - d0Round, 1e-5, 'round-rotor critical angle remains pi-delta0');

  const d0Salient = solveDelta0(Pm, Pmax, Xd, XqSalient, V);
  close(getPeSal(d0Salient, Pmax, Xd, XqSalient, V), Pm, 1e-5, 'salient equilibrium carries the requested power');
  ok(d0Salient < d0Round, 'salient reluctance torque lowers the operating angle');
  const dcr = solveDeltaCr(Pm, Pmax, Xd, XqSalient, V);
  ok(dcr > d0Salient && dcr < Math.PI - d0Salient, 'salient critical angle is no longer pi-delta0');
  const dcc = solveDeltaCc(Pm, Pmax, Xd, XqSalient, V);
  ok(dcc > d0Salient && dcc < dcr, 'critical clearing angle lies between equilibrium and critical angle');
  const cct = solveCCT(dcc, Pm, Pmax, Xd, XqSalient, V, H);
  ok(cct > 0.05 && cct < 1, `salient CCT is finite, got ${cct}`);
  if (failed) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
