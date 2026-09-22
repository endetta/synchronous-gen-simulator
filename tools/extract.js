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
  if (blocks.length === 0) {
    throw new Error(
      'SEAM GAGAL: tidak menemukan blok <script> inline di ' + htmlPath + '.\n' +
      '  Tes mengekstrak fungsi fisika langsung dari HTML sumber kebenaran.\n' +
      '  Kalau struktur script berubah (mis. dipindah ke file .js eksternal),\n' +
      '  perbarui tools/extract.js agar tetap bisa menemukannya.'
    );
  }
  const code = blocks[blocks.length - 1][1];

  installStubs();

  const factory = new Function(`
    ${code}
    // Lookup aman: fungsi yang hilang menjadi undefined, BUKAN ReferenceError.
    // Guard REQUIRED di luar akan memberi pesan yang menjelaskan.
    const _get = (name) => { try { return eval(name); } catch (e) { return undefined; } };
    const names = ['makeState','ode','rk4','stepPhys','procEvts','runSc','startRLR','stopRLR',
      'toggleRLR','setMode','setAnimMode','doReset','trigSC','onSl','numSl','adjSl','togglePane',
      'getPe','getPmax','getQe','getS','getPF','getPFNature','getCC','getCCT','getVt',
      'getPmEff','govActive','getA2Available','eacStable','snapEac','freezeSliders','slidersFrozen',
      'setNarr','autoNarr','updateCards','updateHdr','getRLRLoad','getRLRPeriod',
      'satCurve','getEaf','getFluxDensity',
      'polePairs','getXq','slotCount','coilsPerPhase','elecAngle',
      'getPeSal','solveDelta0','solveDeltaCr','solveDeltaCc','solveCCT'];
    const out = {};
    for (const n of names) out[n] = _get(n);
    out.EAC_TOL = (typeof EAC_TOL !== 'undefined') ? EAC_TOL : undefined;
    out.OCC_PEAK = _get('OCC_PEAK');
    out.SAL_RATIO = _get('SAL_RATIO');
    out.getS_ = () => S;
    out.setS_ = (v) => { S = v; };
    out.rlr_state = () => rlr_running;
    out.setRlr = (v) => { rlr_running = v; };
    out.RLR_PROFILE = _get('RLR_PROFILE');
    out.RLR_PERIODS = _get('RLR_PERIODS');
    out.RLR_SPEED = _get('RLR_SPEED');
    out.RLR_DUR = _get('RLR_DUR');
    out.SCENARIOS = _get('SCENARIOS');
    out.F0 = _get('F0'); out.WS = _get('WS'); out.R2D = _get('R2D'); out.D2R = _get('D2R');
    out.PHDT = _get('PHDT'); out.HSTEP = _get('HSTEP'); out.HWIN = _get('HWIN');
    return out;
  `);

  const mod = factory();

  // Guard seam: fungsi-fungsi ini WAJIB ada. Tanpa guard, kegagalan muncul
  // sebagai "undefined is not a function" yang membingungkan. Dengan guard,
  // pesannya menjelaskan apa yang hilang dan apa yang harus dilakukan.
  const REQUIRED = [
    'makeState', 'getPmax', 'getPe', 'getQe', 'getS', 'getPF', 'getCC', 'getCCT',
    'getPmEff', 'govActive', 'getA2Available', 'eacStable', 'snapEac',
    'freezeSliders', 'slidersFrozen', 'setNarr', 'updateCards', 'updateHdr',
    'ode', 'rk4', 'stepPhys', 'doReset', 'trigSC', 'setMode', 'runSc',
    'getRLRLoad', 'satCurve', 'getEaf', 'getFluxDensity',
    'polePairs', 'getXq', 'slotCount', 'coilsPerPhase', 'elecAngle',
    'getPeSal', 'solveDelta0', 'solveDeltaCr', 'solveDeltaCc', 'solveCCT',
  ];
  const missing = REQUIRED.filter(k => typeof mod[k] !== 'function');
  if (missing.length > 0) {
    throw new Error(
      'SEAM GAGAL: fungsi berikut tidak ditemukan di blok <script> HTML:\n' +
      missing.map(k => '    - ' + k).join('\n') + '\n' +
      '  Tes mengekstrak fungsi ini langsung dari HTML sumber kebenaran.\n' +
      '  Kalau di-rename atau dihapus, tes HARUS gagal — itu memang tujuannya.\n' +
      '  Perbaiki HTML, atau (bila rename disengaja) perbarui daftar REQUIRED\n' +
      '  di tools/extract.js dan semua pemanggil.'
    );
  }

  // Set global S ke state awal
  mod.setS_(mod.makeState());
  return mod;
}

module.exports = { makeExtractor, installStubs, mkEl };
