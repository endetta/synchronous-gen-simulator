#!/usr/bin/env node
/**
 * Kontrol resize panel — regression test.
 *
 * MASALAH YANG DIKUNCI
 * Panel III (Time Series) adalah pane TERAKHIR di dalam #vizScroll. Satu-satunya
 * cara memperbesarnya adalah menarik `.drag-handle` di tepi BAWAH pane ke arah
 * bawah. Karena pane3 berada di ujung konten yang bisa di-scroll, menariknya ke
 * bawah menambah scrollHeight sehingga handle ikut turun mendekati/melewati tepi
 * bawah viewport — kursor kehabisan ruang layar sebelum pane cukup besar.
 *
 * Kontrak yang diuji (perilaku, bukan implementasi):
 *   1. Tiap pane punya kontrol resize yang SELALU terlihat (tombol), jadi
 *      memperbesar tidak lagi bergantung pada drag ke ruang kosong di bawah.
 *   2. Kontrol itu <button> sungguhan (bisa di-Tab/Enter) — bukan div ber-onclick.
 *   3. Perbesar/perkecil menghormati lantai MIN_PANE_H dan punya batas atas.
 *   4. Ada aksi maksimalkan/pulihkan untuk sekali-klik memperbesar.
 *   5. Drag tetap auto-scroll container saat handle mendekati tepi bawah viewport,
 *      supaya pane terbawah bisa dibesarkan tanpa kursor keluar layar.
 *   6. Lantai MIN_PANE_H tetap dipakai (tidak ada angka sihir baru).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let passed = 0, failed = 0;
function it(name, fn) {
  try { fn(); passed++; console.log('  PASS: ' + name); }
  catch (err) { failed++; console.log('  FAIL: ' + name); console.log('     ' + err.message); }
}
function sliceBetween(startMarker, endMarker) {
  const s = html.indexOf(startMarker);
  assert(s >= 0, 'marker awal tidak ditemukan: ' + startMarker);
  const e = html.indexOf(endMarker, s + startMarker.length);
  assert(e > s, 'marker akhir tidak ditemukan: ' + endMarker);
  return html.slice(s, e);
}
function stripComments(src) {
  return src.replace(/\/\/[^\n\r]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}
function countMatches(re) { return (html.match(re) || []).length; }

console.log('Kontrol Resize Panel — Regression Test');
console.log('-'.repeat(60));

// ----------------------------------------------------------------
console.log('\n1. Kontrol resize selalu terlihat di tiap pane');
it('tiap pane punya klaster kontrol resize', () => {
  const n = countMatches(/data-pane-resize=/g);
  assert(n >= 3, 'butuh kontrol resize untuk 3 pane, ditemukan ' + n);
});
it('kontrol memakai <button>, bukan div ber-onclick', () => {
  // data-pane-resize ada di <div> pembungkus; tombolnya <button> di dalamnya.
  const clusters = html.match(/<div class="pane-resize"[\s\S]*?<\/div>/g) || [];
  assert(clusters.length >= 3, 'klaster .pane-resize kurang dari 3, ditemukan ' + clusters.length);
  clusters.forEach((c, i) => {
    const btns = (c.match(/<button[^>]*>/g) || []).length;
    assert(btns >= 3, 'klaster ' + (i + 1) + ' hanya punya ' + btns + ' <button> (butuh −, +, ⤢)');
    assert(/type="button"/.test(c), 'klaster ' + (i + 1) + ' punya <button> tanpa type="button"');
    assert(/aria-label=/.test(c), 'klaster ' + (i + 1) + ' tanpa aria-label (tidak aksesibel)');
  });
});
it('kontrol tidak bergantung pada posisi di bawah pane (selalu dalam viewport)', () => {
  // Klaster tidak boleh di-anchor ke bottom (di sanalah masalah drag berada).
  const css = sliceBetween('.pane-resize{', '}');
  assert(!/bottom\s*:/.test(css),
    'kontrol resize di-anchor ke bottom pane — ikut tenggelam saat pane terbawah tumbuh');
  assert(/top\s*:/.test(css), 'kontrol resize harus di-anchor ke atas pane');
});

// ----------------------------------------------------------------
console.log('\n2. Perbesar / perkecil berfungsi dan aman');
it('ada fungsi resize pane yang dipakai kontrol', () => {
  assert(/function resizePane\s*\(/.test(html), 'fungsi resizePane() tidak ada');
  const n = countMatches(/resizePane\s*\(/g);
  assert(n >= 3, 'resizePane() harus dipanggil dari kontrol, ditemukan ' + n + ' kemunculan');
});
it('perkecil menghormati lantai MIN_PANE_H, bukan angka sihir baru', () => {
  const body = stripComments(sliceBetween('function resizePane(', '\nfunction '));
  assert(/MIN_PANE_H/.test(body),
    'resizePane() tidak memakai MIN_PANE_H sebagai lantai — pane bisa menyusut melebihi layout');
});
it('perbesar punya batas atas agar tidak menelan seluruh layar', () => {
  const body = stripComments(sliceBetween('function resizePane(', '\nfunction '));
  const hasMax = /MAX_PANE_H|Math\.min\s*\(/.test(body);
  assert(hasMax, 'resizePane() tanpa batas atas — pane bisa tumbuh tak terbatas');
});

// ----------------------------------------------------------------
console.log('\n3. Aksi maksimalkan / pulihkan');
it('ada fungsi maksimalkan yang bisa dipanggil dari kontrol', () => {
  const hasFn = /function (toggleMaximizePane|maximizePane)\s*\(/.test(html);
  // Tombol maksimalkan memanggil fungsinya lewat onclick di dalam klaster.
  const btnCalls = (html.match(/onclick="(?:toggleMaximizePane|maximizePane)\('/g) || []).length;
  assert(hasFn && btnCalls >= 3,
    'aksi maksimalkan/pulihkan tidak lengkap (fn=' + hasFn + ', tombol=' + btnCalls + ', butuh 3)');
});

// ----------------------------------------------------------------
console.log('\n4. Drag auto-scroll agar pane terbawah bisa dibesarkan');
it('drag handler meng-auto-scroll saat handle dekat tepi bawah viewport', () => {
  const drag = stripComments(sliceBetween('function initDragHandles(){', '// OOS ALARM'));
  const hasAutoScroll = /scrollTop\s*[+\-]=|scrollBy\s*\(/.test(drag);
  assert(hasAutoScroll,
    'drag tanpa auto-scroll — pane terbawah tetap tidak bisa dibesarkan (kursor kehabisan ruang)');
});
it('auto-scroll punya zona pemicu berbasis jarak ke tepi, bukan sihir', () => {
  const drag = stripComments(sliceBetween('function initDragHandles(){', '// OOS ALARM'));
  assert(/EDGE|ZONE|MARGIN|innerHeight/.test(drag),
    'auto-scroll tanpa ambang jarak ke tepi viewport');
});

// ----------------------------------------------------------------
console.log('\n5. Kontrol resize tidak merusak struktur yang sudah diuji');
it('drag-handle tetap ada di ketiga pane (tes lain bergantung padanya)', () => {
  const n = countMatches(/class="drag-handle"/g);
  assert(n === 3, 'drag-handle harus tetap 3, ditemukan ' + n);
});
it('vlabel tetap ada di ketiga pane', () => {
  const n = countMatches(/class="vlabel"/g);
  assert(n === 3, 'vlabel harus tetap 3, ditemukan ' + n);
});
it('konstanta MIN_PANE_H tetap terdefinisi', () => {
  assert(/const MIN_PANE_H\s*=/.test(html), 'MIN_PANE_H hilang');
});

// ----------------------------------------------------------------
console.log('\n6. Kontrol terpasang saat boot');
it('kontrol resize diinisialisasi di jalur boot', () => {
  const boot = sliceBetween("window.addEventListener('load'", 'requestAnimationFrame(loop)');
  assert(/initPaneResizeControls\s*\(/.test(boot),
    'initPaneResizeControls() tidak dipanggil saat boot — kontrol tidak akan aktif');
});

console.log('\n' + '='.repeat(60));
console.log('Total: ' + (passed + failed) + ' | PASS: ' + passed + ' | FAIL: ' + failed);
console.log('='.repeat(60));
process.exit(failed ? 1 : 0);
