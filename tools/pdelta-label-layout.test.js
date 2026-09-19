#!/usr/bin/env node
/**
 * Panel II (P–δ) label layout regression test.
 *
 * Bug: label δ_cc, tick sudut, dan judul sumbu X bertumpuk di margin bawah
 * karena mb=32 hanya muat dua baris teks dan δ_cc hanya ~4px dari judul.
 *
 * Kontrak layout:
 * - Baris bawah berurutan: tick (14) < δ_cc (28) < judul (42), jarak >= 12px
 * - mt >= 28 agar label grid Y teratas tidak menyentuh strip label pane (vlabel)
 * - mb >= 46 agar tiga baris teks muat di margin bawah
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL: ${name}`);
    console.log(`     ${err.message}`);
  }
}

console.log('Panel II Label Layout Regression Test');
console.log('-'.repeat(60));

it('margin mt/mb cukup lebar', () => {
  const m = html.match(/const ml=58,mr=18,mt=(\d+),mb=(\d+);/);
  assert(m, 'margin declaration not found');
  const mt = +m[1];
  const mb = +m[2];
  assert(mt >= 28, `mt=${mt} < 28 (label grid teratas menyentuh vlabel)`);
  assert(mb >= 46, `mb=${mb} < 46 (tiga baris label tidak muat)`);
});

it('offset baris bawah berurutan dengan jarak >= 12px', () => {
  const tick = html.match(/mkSvg\('text',\{x,y:f2\(mt\+ph\+(\d+)\)/);
  assert(tick, 'tick label offset not found');
  const dcc = html.match(/setA\('pd-dcc-t',\{x:sx\(d_cc\),y:f2\(mt\+ph\+(\d+)\)\}/);
  assert(dcc, 'pd-dcc-t offset not found (masih memakai mt+ph+mb-8?)');
  const title = html.match(/setA\('pd-xl-lbl',\{x:f2\(ml\+pw\/2\),y:f2\(mt\+ph\+(\d+)\)\}/);
  assert(title, 'pd-xl-lbl offset not found');
  const t = +tick[1];
  const d = +dcc[1];
  const x = +title[1];
  assert(d - t >= 12, `jarak tick ke d_cc hanya ${d - t}px (<12)`);
  assert(x - d >= 12, `jarak d_cc ke judul hanya ${x - d}px (<12)`);
});

it('judul sumbu X masih di dalam margin bawah', () => {
  const m = html.match(/const ml=58,mr=18,mt=(\d+),mb=(\d+);/);
  assert(m, 'margin declaration not found');
  const mb = +m[2];
  const title = html.match(/setA\('pd-xl-lbl',\{x:f2\(ml\+pw\/2\),y:f2\(mt\+ph\+(\d+)\)\}/);
  assert(title, 'pd-xl-lbl offset not found');
  const x = +title[1];
  assert(x + 8 <= mb, `judul +${x}+8 > mb=${mb} (teks bisa terpotong)`);
});

console.log('\n' + '='.repeat(60));
console.log(`Total: ${passed + failed} | PASS: ${passed} | FAIL: ${failed}`);
console.log('='.repeat(60));
process.exit(failed ? 1 : 0);
