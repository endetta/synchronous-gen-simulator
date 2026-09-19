#!/usr/bin/env node
/**
 * Panel III (time series) title clearance regression test.
 *
 * Bug: judul pane (.vlabel, top:6px) bertumpuk dengan tick Y teratas chart
 * delta karena container chart mulai dari padding 6px.
 *
 * Kontrak: container chart di pane3 punya padding-top >= 24px sehingga
 * konten chart turun di bawah strip judul.
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

console.log('Panel III Title Clearance Regression Test');
console.log('-'.repeat(60));

it('chart container punya padding-top >= 24px', () => {
  const m = html.match(/container\.style\.cssText='([^']+)'/);
  assert(m, 'container cssText not found');
  const pad = m[1].match(/padding:([^;]+);/);
  assert(pad, 'padding not found in container cssText');
  const padTop = parseFloat(pad[1].trim().split(/\s+/)[0]);
  assert(!isNaN(padTop), `cannot parse padding-top from "${pad[1]}"`);
  assert(padTop >= 24, `padding-top=${padTop}px < 24px (judul pane bisa overlap tick Y)`);
});

it('vlabel masih di top:6px (judul tidak digeser)', () => {
  const m = html.match(/\.vlabel\{[^}]*top:(\d+)px/);
  assert(m, 'vlabel top not found');
  assert(+m[1] === 6, `vlabel top=${m[1]}px, expected 6px`);
});

it('padding sisi/bawah tetap 6px', () => {
  const m = html.match(/container\.style\.cssText='([^']+)'/);
  assert(m, 'container cssText not found');
  const pad = m[1].match(/padding:([^;]+);/);
  assert(pad, 'padding not found');
  const parts = pad[1].trim().split(/\s+/);
  // Format: "24px 6px 6px" (top right/left bottom) atau "6px" (semua sisi)
  if (parts.length === 3) {
    assert(parseFloat(parts[1]) === 6, `padding kiri/kanan=${parts[1]}, expected 6px`);
    assert(parseFloat(parts[2]) === 6, `padding bawah=${parts[2]}, expected 6px`);
  } else {
    assert(parts.length === 1, `unexpected padding format: "${pad[1]}"`);
    assert(parseFloat(parts[0]) === 6, `padding=${parts[0]}, expected 6px`);
  }
});

console.log('\n' + '='.repeat(60));
console.log(`Total: ${passed + failed} | PASS: ${passed} | FAIL: ${failed}`);
console.log('='.repeat(60));
process.exit(failed ? 1 : 0);
