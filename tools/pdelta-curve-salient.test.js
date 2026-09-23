const fs = require('fs');
const path = require('path');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const src = fs.readFileSync(HTML, 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

const start = src.indexOf('function updateSvgPdelta(');
const end = src.indexOf('\n}', start);
const upd = src.slice(start, end + 2);
ok(upd.includes('getPeSal(d'), 'kurva utama Panel II memakai getPeSal (suku saliency)');
ok(upd.includes('solveDelta0('), 'δ0 dihitung numerik (solveDelta0)');
ok(upd.includes('solveDeltaCr('), 'δ_cr dihitung numerik (solveDeltaCr)');
ok(upd.includes('getMachineXq('), 'Xq terhubung ke solver sudut');
// Pengecualian fisik yang didokumentasikan (spec §2.3): fault curve sengaja
// tetap Pmax_f·sin(d) karena saat SC tegangan kolaps dan suku reluctance
// praktis hilang; komen justifikasi wajib ada di kode.
ok(!/cpts=\s*'';\s*for\([^)]*\)\s*cpts\+=.*Pmax\*Math\.sin\(d\)/.test(upd), 'kurva UTAMA bukan round-rotor murni (fault curve terkecuali)');
ok(/P_fault hanya memakai Pmax_f/.test(upd), 'justifikasi fault curve ada di kode');
console.log('\n=== P-Delta Salient Contract ===');
console.log('Passed: ' + pass + '  Failed: ' + fail);
process.exit(fail ? 1 : 0);
