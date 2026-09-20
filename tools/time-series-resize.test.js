#!/usr/bin/env node
/**
 * Panel III (time series) responsive-resize regression test.
 *
 * BUG YANG DIKUNCI TES INI
 * Panel III berisi 4 chart bertumpuk (δ, Δω, P/Q, f) di dalam wrapper `flex:1`,
 * tiap canvas `width:100%;height:100%`. Saat pane ditarik lebih tinggi, kotak CSS
 * ikut membesar TETAPI backing store canvas (`canvas.width/height`) tidak pernah
 * diperbarui, karena `resizeTimeCharts()` sengaja dikosongkan (`return;`).
 * Browser lalu menskalakan bitmap lama secara non-uniform → tick label dan teks
 * ikut melar ("tulisan ditarik melebar"). Terukur: aspect-distortion ~0.46 pada
 * viewport DPR 1.5 saat pane 300px → 600px.
 *
 * Kontrak yang diuji di sini adalah kontrak PERILAKU pada source (house style
 * `tools/time-series-render.test.js`), bukan detail implementasi: tes ini tidak
 * peduli bagaimana resize ditulis, hanya bahwa (a) resize benar-benar terjadi,
 * (b) tidak dijalankan tiap frame, (c) dipicu saat ukuran berubah, dan
 * (d) lantai tinggi drag menghormati lantai konten.
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

/** Ambil potongan source dari marker awal sampai marker akhir (eksklusif). */
function sliceBetween(startMarker, endMarker) {
  const s = html.indexOf(startMarker);
  assert(s >= 0, 'marker awal tidak ditemukan: ' + startMarker);
  const e = html.indexOf(endMarker, s + startMarker.length);
  assert(e > s, 'marker akhir tidak ditemukan: ' + endMarker);
  return html.slice(s, e);
}

/** Body resizeTimeCharts() — dari deklarasi sampai `let lastChartCommit`. */
function resizeBody() {
  return sliceBetween('function resizeTimeCharts(){', 'let lastChartCommit');
}
/** Body renderAll() — jalur per-frame. */
function renderAllBody() {
  return sliceBetween('function renderAll(){', 'function loop(');
}
/** Body initDragHandles() — dari deklarasi sampai OOS ALARM section. */
function dragBody() {
  // File memakai CRLF, jadi marker multi-baris ditulis dengan \r?\n.
  return sliceBetween('function initDragHandles(){', '// OOS ALARM (Web Audio API)');
}
/** Buang komentar supaya nama fungsi di dalam komentar tidak ikut terhitung. */
function stripComments(src) {
  return src.replace(/\/\/[^\n\r]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

console.log('Panel III — Responsive Resize Regression Test');
console.log('-'.repeat(60));

// ----------------------------------------------------------------
console.log('\n1. resizeTimeCharts() benar-benar melakukan resize');
it('resizeTimeCharts bukan stub kosong (tidak langsung return)', () => {
  const body = resizeBody();
  // Buang komentar dulu supaya komentar "return" tidak dianggap kode.
  const code = body.replace(/\/\/[^\n]*/g, '');
  const onlyReturn = /^\s*function\s*resizeTimeCharts\(\)\s*\{\s*return\s*;?\s*\}\s*$/.test(code.trim());
  assert(!onlyReturn, 'resizeTimeCharts() masih stub kosong — backing store tidak pernah diperbarui');
});
it('resizeTimeCharts memanggil resize pada keempat chart', () => {
  const body = resizeBody();
  // Resize dilakukan via loop `for(k in timeCharts)` sekali → satu .resize(),
  // tapi diterapkan ke SEMUA chart. Kontraknya: setiap chart yang ada di-resize.
  const loops = (body.match(/for\s*\(\s*(?:const|let)\s+\w+\s+in\s+timeCharts/g) || []).length;
  assert(loops >= 1, 'tidak ada loop over timeCharts untuk resize');
  assert(/\.resize\s*\(/.test(body), 'resizeTimeCharts tidak memanggil chart.resize()');
});

// ----------------------------------------------------------------
console.log('\n2. Resize TIDAK dijalankan tiap frame (anti layout-thrashing)');
it('renderAll tidak memanggil resizeTimeCharts setiap frame', () => {
  // Komentar di renderAll menyebut nama fungsi; buang komentar dulu supaya yang
  // diuji benar-benar KODE, bukan teks penjelas.
  const body = stripComments(renderAllBody());
  assert(!/resizeTimeCharts\s*\(/.test(body),
    'resizeTimeCharts() dipanggil di renderAll() — tetap thrash layout tiap frame');
  assert(!/scheduleTimeChartResize\s*\(/.test(body),
    'scheduleTimeChartResize() dipanggil di renderAll() — tetap memicu resize tiap frame');
});

// ----------------------------------------------------------------
console.log('\n3. Resize dipicu saat ukuran pane berubah');
it('ada pemicu resize saat drag selesai atau lewat observer/window-resize', () => {
  const drag = dragBody();
  const onDragEnd = /mouseup|pointerup/.test(drag) && /scheduleTimeChartResize\s*\(\)/.test(drag);
  const hasWindowResize = /window\.addEventListener\(['"]resize['"]/.test(html);
  const hasObserver = /ResizeObserver/.test(html);
  assert(onDragEnd || hasWindowResize || hasObserver,
    'tidak ada jalur yang memicu resize saat pane berubah ukuran (drag end / window resize / ResizeObserver)');
});

// ----------------------------------------------------------------
console.log('\n4. Handler drag tidak mengunci scroll tiap mousemove');
it('mousemove tidak menulis vizScroll.scrollTop tiap frame drag', () => {
  const drag = dragBody();
  assert(!/scrollTop\s*=\s*lockedScrollTop/.test(drag),
    'drag masih mem-pin vizScroll.scrollTop tiap mousemove — melawan kursor, tarikan jadi berat');
});
it('mouseup tidak memaksa tulis balik scrollTop', () => {
  const drag = dragBody();
  assert(!/scrollTop\s*=\s*finalScroll/.test(drag),
    'mouseup masih memaksa scrollTop kembali — tampilan bisa melompat setelah drag');
});

// ----------------------------------------------------------------
console.log('\n5. Lantai tinggi drag menghormati lantai konten');
it('lantai drag >= tinggi minimum konten (4 chart + padding + gap)', () => {
  // min-height wrapper dibangun lewat konkatenasi: min-height:'+MIN_CHART_H+'px
  // jadi nilainya diambil dari konstanta bernama, bukan literal di wrapper.
  const constMatch = html.match(/const\s+MIN_CHART_H\s*=\s*(\d+)/);
  assert(constMatch, 'konstanta MIN_CHART_H tidak ditemukan');
  const minH = parseInt(constMatch[1], 10);
  assert(/min-height:'\+MIN_CHART_H\+'px/.test(html),
    'wrapper tidak memakai MIN_CHART_H untuk min-height-nya');

  // Lantai konten = padding atas(24) + bawah(6) + 4*minH + 3*gap(2)
  const contentFloor = 24 + 6 + 4 * minH + 3 * 2;

  // Lantai drag harus memakai MIN_PANE_H, bukan angka sihir.
  const drag = dragBody();
  const usesConst = /Math\.max\(\s*MIN_PANE_H/.test(drag);
  const floorMatch = drag.match(/Math\.max\(\s*(\d+)/);
  const dragFloor = usesConst ? contentFloor : (floorMatch ? parseInt(floorMatch[1], 10) : NaN);

  assert(!isNaN(dragFloor), 'lantai tinggi drag tidak ditemukan di initDragHandles');
  assert(dragFloor >= contentFloor,
    'lantai drag ' + dragFloor + 'px < lantai konten ' + contentFloor + 'px ' +
    '(4×' + minH + 'px + padding 30px + gap 6px) — pane bisa menyusut melebihi kemampuan layout, chart terpotong');
});

// ----------------------------------------------------------------
console.log('\n6. Tinggi minimum per-chart punya satu sumber kebenaran');
it('tinggi minimum chart memakai konstanta bernama, bukan angka sihir', () => {
  const hasConst = /const\s+MIN_CHART_H(?:EIGHT)?\s*=/.test(html);
  assert(hasConst,
    'tidak ada konstanta bernama untuk tinggi minimum chart — lantai drag dan min-height wrapper bisa saling lepas');
});

// ----------------------------------------------------------------
console.log('\n7. Legenda seri tampil pada chart multi-seri');
it('chart P/Q menampilkan legenda untuk Pe, Pm, Qe', () => {
  const pc = sliceBetween('timeCharts.power=new Chart', 'timeCharts.freq');
  const legendOn = /legend\s*:\s*\{[^}]*display\s*:\s*true/.test(pc);
  const legendSeam = /SERIES_LEGEND|buildSeriesLegend|legendEl|legend-item/.test(html);
  assert(legendOn || legendSeam,
    'chart P/Q punya 3 seri bertumpuk (Pe/Pm/Qe) tanpa legenda — sulit dibedakan');
});
it('legenda menyebut ketiga label seri P/Q', () => {
  assert(/'Pe'/.test(html) && /'Pm'/.test(html) && /'Qe'/.test(html),
    'label seri Pe/Pm/Qe tidak lengkap di source');
});

console.log('\n' + '='.repeat(60));
console.log('Total: ' + (passed + failed) + ' | PASS: ' + passed + ' | FAIL: ' + failed);
console.log('='.repeat(60));
process.exit(failed ? 1 : 0);
