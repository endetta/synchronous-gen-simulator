/**
 * extract.js — Seam untuk mengekstrak kode fisika dari HTML sumber kebenaran.
 *
 * Pola ini sudah terbukti di verifikasi mandiri 2026-09-20: stub DOM minimal,
 * ambil blok <script> inline terakhir, eval dengan new Function, ekspor fungsi
 * yang dibutuhkan. Tidak perlu mengubah HTML sama sekali.
 *
 * Pemakaian:
 *   const { makeExtractor } = require('./extract');
 *   const { S, makeState, ode, rk4, stepPhys, ... } = await makeExtractor(htmlPath);
 */

function mkEl() {
  return new Proxy({
    style: { setProperty() {} },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    children: [],
    value: '1', min: '0', max: '10',
    addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute() { return null; },
    appendChild() {}, insertBefore() {}, remove() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    getContext() { return { fillRect() {}, fillText() {} }; },
    getBoundingClientRect() { return { width: 100, height: 100 }; },
    clientWidth: 800, clientHeight: 300,
    innerHTML: '', textContent: '', offsetHeight: 300,
    dataset: {},
  }, { get: (t, k) => (k in t ? t[k] : undefined) });
}

function installStubs() {
  const el = mkEl();
  global.document = {
    getElementById: () => el,
    createElement: () => mkEl(),
    createElementNS: () => mkEl(),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    body: el,
  };
  global.window = { addEventListener() {}, innerWidth: 1920, innerHeight: 1080 };
  global.requestAnimationFrame = () => 0;
  global.setTimeout = () => 0;
  global.setInterval = () => 0;
  global.clearTimeout = () => {};
  global.clearInterval = () => {};
  global.Chart = function () {
    return { data: { datasets: [] }, options: { scales: { x: {}, y: {} }, plugins: {} }, update() {}, scales: { y: { width: 40 } } };
  };
}

async function makeExtractor(htmlPath) {
  const fs = require('fs');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Ambil semua blok <script> inline (tanpa src)
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  if (blocks.length === 0) throw new Error('Tidak menemukan blok <script> inline di HTML');
  const code = blocks[blocks.length - 1][1];

  installStubs();

  const factory = new Function(code + `
    ;return {
      makeState, ode, rk4, stepPhys, procEvts, runSc, startRLR, stopRLR, toggleRLR,
      setMode, setAnimMode, doReset, trigSC, onSl, numSl, adjSl, togglePane,
      getPe, getPmax, getQe, getS, getPF, getPFNature, getCC, getCCT, getVt,
      getPmEff, govActive,
      setNarr, autoNarr, updateCards, updateHdr,
      getRLRLoad, getRLRPeriod,
      getS_: () => S, setS_: v => { S = v; },
      getStateRef: () => S,
      rlr_state: () => rlr_running, setRlr: v => { rlr_running = v; },
      RLR_PROFILE, RLR_PERIODS, RLR_SPEED, RLR_DUR,
      SCENARIOS,
      F0, WS, R2D, D2R, PHDT, HSTEP, HWIN,
      get oos_state() { return { interval: typeof oos_interval !== 'undefined' ? oos_interval : null }; },
      Chart: global.Chart,
      document: global.document,
      window: global.window,
    };
  `);

  const mod = factory();
  // Set global S ke state awal
  mod.setS_(mod.makeState());
  return mod;
}

module.exports = { makeExtractor, installStubs, mkEl };
