#!/usr/bin/env node
/**
 * Time-series rendering regression test.
 *
 * Covers the two user-facing requirements:
 * 1. All four charts share one Y-axis width contract (left plot origins align).
 * 2. Chart commits are time-based (not frame-count) and decimation samples on a
 *    fixed time grid so polyline vertices do not re-phase between commits.
 *
 * Static assertions extract the live source so the test fails when the
 * implementation regresses, without needing a browser.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HTML_PATH = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const html = fs.readFileSync(HTML_PATH, 'utf8');

function sliceBetween(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  assert(start >= 0, `marker not found: ${startMarker}`);
  const end = html.indexOf(endMarker, start + startMarker.length);
  assert(end > start, `end marker not found: ${endMarker}`);
  return html.slice(start, end);
}

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

console.log('Time-Series Rendering Regression Test');
console.log('-'.repeat(60));

// ----------------------------------------------------------------
// 1. Y-axis alignment contract
// ----------------------------------------------------------------
console.log('\nY-axis alignment');

it('all four charts use the shared Y-width fitter', () => {
  const shared = /function applySharedYWidth/.test(html) || /SHARED_Y_WIDTH/.test(html);
  assert(shared, 'no shared Y-axis width owner found in source');
  const uses = html.match(/afterFit:\s*applySharedYWidth|afterFit:\s*\(?scale\)?\s*=>/g) || [];
  assert(uses.length >= 4, `expected shared afterFit on 4 charts, found ${uses.length}`);
});

it('annotation plugin version resolves on CDN', () => {
  const m = html.match(/chartjs-plugin-annotation@([\d.]+)/);
  assert(m, 'annotation plugin script tag missing');
  assert.notStrictEqual(m[1], '3.3.0', 'annotation@3.3.0 does not exist on npm (404)');
});

it('no per-chart literal y width overrides remain', () => {
  const bad = html.match(/scales:\{[^}]*y:\{[^}]*width:/);
  assert(!bad, 'per-chart literal Y width override found');
});

// ----------------------------------------------------------------
// 2. Commit cadence contract
// ----------------------------------------------------------------
console.log('\nCommit cadence');

it('chart commits are scheduled by simulation time, not frame count', () => {
  const upd = sliceBetween('function updateTimeCharts(){', '\nfunction drawTime');
  assert(!/chartUpdateCounter\s*\+\+/.test(upd), 'frame-counter scheduling still present in updateTimeCharts');
  assert(/CHART_COMMIT_INTERVAL/.test(upd) || /lastChartCommit/.test(upd), 'no time-based commit interval found');
});

it('commit interval constant is declared and under 100 ms', () => {
  const m = html.match(/const CHART_COMMIT_INTERVAL\s*=\s*([\d.]+)/);
  assert(m, 'CHART_COMMIT_INTERVAL constant not declared');
  const ms = parseFloat(m[1]) * (m[1].includes('.') && parseFloat(m[1]) < 1 ? 1000 : 1);
  assert(ms > 0 && ms <= 100, `commit interval ${ms}ms out of range`);
});

it('decimation samples on a fixed time grid', () => {
  const dec = sliceBetween('function smartDecimate', '\nfunction extractChartData');
  assert(/Math\.floor\(.*\/\s*(bucketMs|DECIMATE_BUCKET)/.test(dec) || /bucketMs/.test(dec),
    'decimation does not use a fixed time bucket');
});

// ----------------------------------------------------------------
// 3. Behavioral decimator check (extracted function under vm)
// ----------------------------------------------------------------
console.log('\nDecimator behavior');

it('fixed-grid decimation keeps first/last and stays bounded', () => {
  const decSrc = sliceBetween('function smartDecimate', '\nfunction extractChartData');
  const ctx = { console };
  vm.createContext(ctx);
  try {
    vm.runInContext(decSrc + '\nthis.fn = smartDecimate;', ctx);
  } catch (e) {
    assert.fail('smartDecimate not extractable: ' + e.message);
  }
  const fn = ctx.fn;
  assert(typeof fn === 'function', 'smartDecimate did not load');
  const pts = [];
  for (let i = 0; i < 1800; i++) pts.push({ x: i * 0.016, y: Math.sin(i / 30) });
  const out = fn(pts, 600, 0.05);
  assert(out.length <= 600, `decimated length ${out.length} exceeds 600`);
  assert(out[0] === pts[0] || out[0].x === pts[0].x, 'first point dropped');
  assert(out[out.length - 1].x === pts[pts.length - 1].x, 'last point dropped');
  for (let i = 1; i < out.length; i++) {
    assert(out[i].x >= out[i - 1].x, 'timestamps not monotonic');
  }
});

it('decimated x spacing is near-uniform (no re-phasing)', () => {
  const decSrc = sliceBetween('function smartDecimate', '\nfunction extractChartData');
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(decSrc + '\nthis.fn = smartDecimate;', ctx);
  const fn = ctx.fn;
  const pts = [];
  for (let i = 0; i < 1800; i++) pts.push({ x: i * 0.016, y: Math.sin(i / 30) });
  const out = fn(pts, 600, 0.05);
  const dxs = [];
  for (let i = 1; i < out.length; i++) dxs.push(out[i].x - out[i - 1].x);
  const mean = dxs.reduce((a, b) => a + b, 0) / dxs.length;
  const maxDev = Math.max(...dxs.map(d => Math.abs(d - mean)));
  assert(maxDev < mean * 1.5, `x spacing deviates too much: mean=${mean}, maxDev=${maxDev}`);
});

console.log('\n' + '='.repeat(60));
console.log(`Total: ${passed + failed} | PASS: ${passed} | FAIL: ${failed}`);
console.log('='.repeat(60));
process.exit(failed ? 1 : 0);
