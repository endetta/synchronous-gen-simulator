#!/usr/bin/env node
/**
 * Fase 0 — Kontrak visualisasi medan magnet mode Realistis.
 * Riset: docs/riset-medan-magnetik-dan-belitan.md (sumber primer MIT OCW 6.685)
 * Plan:  design-plans/plan-realistic-magnetic-visualization.md Fase 0
 *
 * Validasi kontrak elemen + fisika pada source HTML, tanpa DOM sungguhan:
 *   1. Elemen baru ada: #g-rotor, #g-flux, #g-rmf, #d-arc, #delta-label
 *   2. Gradien lama tanpa arah (#rotor-field/#stator-field) dihapus
 *   3. Belitan berupa <path> tersambung (buildCoilPath), bukan <circle>
 *   4. Penanda dot/cross per fasa per konduktor (konvensi +z/−z)
 *   5. Rotasi via transform grup, BUKAN hitung ulang d per frame
 *   6. Regenerasi fluks hanya saat Ef/R berubah (fluxCache)
 *   7. Tidak ada Date.now() di jalur animasi realistis — memakai S.t
 *   8. Kedua medan berputar bersama, terpisah δ (base & base+S.delta)
 *   9. Fluks TIDAK mengerut saat SC (asas constant flux linkage)
 *  10. Geometri: fluks menembus air gap dan menutup di yoke stator
 *
 * Usage: node tools/realistic-field.test.js
 */
const fs = require('fs');
const path = require('path');

const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const src = fs.readFileSync(HTML, 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ ' + msg); }
}
function sect(name) { console.log('\n' + name); }

// Buang komentar supaya pencarian simbol tidak tertipu teks dokumentasi
// (mis. komentar "BUKAN Date.now()" tidak dihitung sebagai pemakaian).
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

// Ambil isi fungsi (dari "function NAMA(" sampai "\n}" di kolom 0 berikutnya)
function fn(name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) return '';
  const end = src.indexOf('\n}', start);
  return src.slice(start, end > 0 ? end + 2 : start + 5000);
}
function between(a, b) {
  const i = src.indexOf(a);
  const j = src.indexOf(b, i + 1);
  return (i >= 0 && j > i) ? src.slice(i, j) : '';
}

const initReal = fn('initSvgRealistic');
const updReal  = fn('updateSvgPhasorRealistic');
const realSec  = between('// REALISTIC ROTOR-STATOR ANIMATION', '// SVG P-DELTA');

sect('Test 1: Elemen baru Fase 0 ada di initSvgRealistic()');
ok(initReal.includes("id:'g-rotor'"), 'grup rotor #g-rotor dibuat');
ok(initReal.includes("id:'g-flux'"), 'grup garis fluks #g-flux dibuat');
ok(initReal.includes("id:'g-rmf'"), 'penanda RMF stator #g-rmf dibuat');
ok(initReal.includes("id:'d-arc'"), 'busur sudut daya #d-arc dibuat');
ok(initReal.includes("id:'delta-label'"), 'label nilai δ #delta-label dibuat');
ok(initReal.includes("'axis-d'") && initReal.includes("'axis-q'"), 'penanda sumbu-d dan sumbu-q dibuat');

sect('Test 2: Lingkaran gradient tanpa arah dihapus');
ok(!src.includes("id:'stator-field'"), '#stator-field (circle gradient) tidak ada lagi');
ok(!src.includes("id:'rotor-field'"), '#rotor-field (circle gradient) tidak ada lagi');
ok(!src.includes('rotor-field-grad') && !src.includes('stator-field-grad'), 'gradien field lama tidak ada lagi');

sect('Test 3: Belitan berupa kumparan tersambung, bukan titik');
ok(initReal.includes('buildCoilPath'), 'belitan memakai buildCoilPath()');
ok(!/id:`winding-\$\{[^}]+\}-\$\{i\}`,\s*\n\s*cx:/.test(initReal), 'tidak ada lagi <circle> winding');
const coil = fn('buildCoilPath');
// kumparan = path dengan busur end-winding (perintah A) antara dua sisi slot
ok(/A\$\{/.test(coil), 'buildCoilPath menghasilkan busur end-winding (arc 180°)');
// dua sisi kumparan terpisah 180° mekanis (Kirtley §3: π/p untuk p=1)
ok(coil.includes('th+Math.PI'), 'sisi kumparan berseberangan 180°');

sect('Test 4: Penanda arah arus dot/cross (konvensi +z/−z)');
ok(realSec.includes('buildCurrentMarker'), 'penanda dot/cross dibuat via buildCurrentMarker()');
ok(realSec.includes("'-dot'") && realSec.includes("'-x'"), 'sepasang penanda dot dan cross ada');
ok((src.match(/cd-\$\{ph\.id\}-\$\{i\}/g) || []).length >= 1, 'id penanda berpola cd-{fasa}-{i}');
ok(updReal.includes("`#cd-${ph}-${i}-dot`") && updReal.includes("`#cd-${ph}-${i}-x`"), 'update menyetel dot DAN cross per konduktor');

sect('Test 5: Rotasi rigid via transform grup');
ok(updReal.includes("gRotor.setAttribute('transform'"), '#g-rotor dirotasi via transform');
ok(updReal.includes("gRmf.setAttribute('transform'"), '#g-rmf dirotasi via transform');
// Hanya SATU setAttribute('d') di jalur update — yaitu busur δ (yang memang
// panjangnya berubah). Path garis fluks TIDAK boleh dihitung ulang per frame.
const dWrites = (updReal.match(/setAttribute\('d'/g) || []).length;
ok(dWrites === 1, `hanya busur δ yang menulis atribut d (ditemukan ${dWrites}, harus 1)`);
const fluxSect = updReal.slice(updReal.indexOf('const gFlux='), updReal.indexOf('// ── 3.'));
ok(fluxSect.length > 0 && !fluxSect.includes("setAttribute('d'"), 'path garis fluks tidak dihitung ulang per frame');
ok(updReal.includes('deg(rotorAng)') && updReal.includes('deg(base)'), 'rotor pakai base+δ, RMF pakai base (kedua medan berputar bersama)');

sect('Test 6: Regenerasi fluks jarang (fluxCache)');
ok(updReal.includes('fluxCache.ef!==S.Ef'), 'regenerasi hanya saat Ef berubah');
ok(updReal.includes('fluxCache.R!==R'), 'regenerasi juga saat ukuran berubah');
ok(realSec.includes('tanh'), 'pemetaan kerapatan ∝ tanh(Ef) — anti-saturasi palsu (riset §3.8)');

sect('Test 7: Determinisme — S.t, bukan Date.now()');
const realFns = stripComments(
  fn('initSvgRealistic') + fn('updateSvgPhasorRealistic') + fn('buildFluxPath') +
  fn('rebuildFluxPaths') + fn('buildCoilPath') + fn('buildCurrentMarker')
);
ok(!realFns.includes('Date.now()'), 'tidak ada Date.now() di fungsi mode realistis');
ok(realFns.includes('wE*S.t'), 'arah arus memakai waktu simulasi S.t');
ok(realFns.includes('F0'), 'frekuensi listrik dari konstanta F0, bukan waktu dinding');

sect('Test 8: Fisika — fluks tetap saat SC, kerapatan ∝ Ef');
ok(!updReal.includes('getVt'), 'kerapatan fluks tidak mengikuti tegangan terminal (constant flux linkage)');
ok(!updReal.includes('sc_active'), 'tidak ada percabangan sc_active yang mengerutkan fluks');
ok(updReal.includes('fluxNorm(S.Ef)'), 'opasitas fluks adalah fungsi Ef saja');

sect('Test 9: RMF memakai sudut yang selama ini dead code');
ok(updReal.includes('const base=S.anim-Math.PI/2'), 'base = S.anim − π/2 dipertahankan');
ok(updReal.includes('rotorAng=base+S.delta'), 'rotorAng = base + δ dipertahankan');
ok(updReal.includes("'#g-rmf'") && updReal.includes('deg(base)'), 'base kini DIPAKAI memutar #g-rmf (tidak lagi dead code)');
ok(!stripComments(updReal).includes('syncAng'), 'variabel syncAng yang tidak terpakai sudah hilang');

sect('Test 10: Geometri konsisten — fluks menutup di yoke stator');
const RGEOm = realSec.match(/const RGEO=\{([\s\S]*?)\};/);
ok(!!RGEOm, 'konstanta geometri RGEO ada');
if (RGEOm) {
  const g = RGEOm[1];
  const num = k => { const m = g.match(new RegExp(k + ':([0-9.]+)')); return m ? +m[1] : NaN; };
  const rotor = num('rotor'), gap = num('gap'), fMin = num('fluxMin'), fMax = num('fluxMax'), condIn = num('condIn');
  ok(rotor < gap && gap < condIn, 'urutan radius benar: rotor < air gap < konduktor');
  ok(fMin > condIn && fMax < 1.0, 'garis fluks menutup di yoke (di dalam besi stator, di luar slot)');
  ok(fMin > gap, 'fluks menyeberangi air gap');
}

sect('Test 11: Konvensi kerangka lokal sumbu-d konsisten');
// Grup rotor dibangun sepanjang +x (sumbu-d lokal 0°) agar rotate(rotorAng)
// langsung benar tanpa offset. Kalau tidak, kutub N tidak akan segaris
// dengan busur δ.
const gRotorBlock = initReal.slice(initReal.indexOf("id:'g-rotor'"), initReal.indexOf("svg.appendChild(gRotor)"));
ok(gRotorBlock.includes('x:cx+rotorR*0.6,y:cy'), 'kutub N di sumbu-d lokal (+x), bukan −y');
ok(gRotorBlock.includes('x1:cx,y1:cy,x2:cx+rotorR,y2:cy'), 'penanda sumbu-d sepanjang +x');
ok(gRotorBlock.includes('x2:cx,y2:cy+rotorR*0.85'), 'sumbu-q tegak lurus d (arah +y)');
// Fluks harus keluar dekat 0° dan masuk dekat 180° pada kerangka lokal yang sama
ok(fn('buildFluxPath').includes('Math.PI/2'), 'garis fluks memuncak di sumbu-q (90°)');

console.log(`\n=== Realistic Field Contract ===`);
console.log(`Passed: ${pass}  Failed: ${fail}`);
process.exit(fail ? 1 : 0);
