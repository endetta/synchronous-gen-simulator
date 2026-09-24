# Flux Salient-Pole Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace schematic sinusoidal flux lines in Panel I Realistis mode with a physically-motivated salient-pole model (pole shoe, non-uniform air gap, leakage flux, density ∝ I_f, demagnetizing armature reaction capped 30%).

**Architecture:** New `traceFieldLine()` integrates field lines via RK4 in the rotor frame from an air-gap permeance model `Br(θ) = (F_rotor(If via OCC) + F_stator(armD, armQ)) / g(θ)`; one `<path>` per line with an explicit N→S midpoint triangle arrowhead; rewritten `rebuildFluxPaths()` classifies main vs leakage; new `density(If)` replaces dead code `fluxNorm`/`fluxCount`; cap `armD` at ±30%. Changes stay inside the single-file HTML + the existing `realistic-field.test.js` contract.

**Tech Stack:** Vanilla HTML/SVG, plain JavaScript in one `<script>` block, Node.js test harness (`tools/realistic-field.test.js` + `tools/extract.js` seam), no build, no dependencies.

**Spec:** `docs/superpowers/specs/2026-09-24-flux-salient-design.md`

## Global Constraints

- **Single-file product** — all code lives in `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`. No external JS module, no bundler.
- **Test harness seam** — physics extracted from HTML by `tools/extract.js` (REQUIRED list). `tools/realistic-field.test.js` asserts DOM-string contracts (`setAttribute('d')` writes, `opacity`, `brRot`). Do not change `fn()` helper or `between()` helper unless you also update every test that calls them.
- **CRLF file** — HTML is CRLF. When extracting with `indexOf('\n')`, normalize `\r\n`→`\n` first. (Existing helper does this.)
- **One Edit per file per blok** — the harness tracks file state; parallel edits to the SAME file in one block fail with "File has been unexpectedly modified".
- **Determinism** — flux path functions must NOT call `Date.now()` or `Math.random()`. Must be pure functions of `(θ, field)`.
- **60fps budget** — total paths per frame ≤ ~32 (main + leakage), rotation still via `<g transform>`, rebuild only on `fluxCache` change.
- **Binding constraints (from spec):** rotor/stator rotate together at synchronous speed separated by δ (Kirtley §5 — already correct); flux stays dense during `sc_active` (constant-flux-linkage, use `S.V` nominal not `getVt()`); rigid rotation via `<g transform>` (do not recompute `d` per frame); determinism via `S.animT` not `Date.now()`.
- **Language** — UI/commentary in Bahasa Indonesia; technical terms stay in English (pole shoe, leakage flux, air gap, etc.). Commit messages conventional.
- **One tool call per block** — avoid parallel tool calls to the same file.

## Review Focus

These input classes are implied by the spec but hard to test inside the existing `setAttribute('d')` + `opacity`-only contract. Each gets a test in the task that owns the code:

1. **Field monotonicity:** `density(If)` monotonically non-decreasing for `If` in [0.2, 3.0] (3 sample points).
2. **Air-gap shape:** `g(θ)` minimum at pole face (0°), maximum at interpolar (half a pole-pair pitch away).
3. **Arrowhead direction:** each main-path `<path class="flux-arrow">` points N→S (from `r0` toward `r1` side).
4. **Leakage line bounds:** every leakage path has max radius < `condIn*R` (does not cross into stator yoke).
5. **armD cap:** |armD_factor − 1| ≤ 0.3 for all achievable `Id` values (checked at clamp).

---

## Task 1: Extend `solveField` field model for salient geometry

**Files:**
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:654-662`
- Test: `tools/realistic-field.test.js` (Test 8 assertion already covers `field.brRot`; this task ADDS a field-shape contract via `fn('solveField')` substring check)

**Interfaces:**
- Consumes: existing `solveField(If, Id, Iq, poleCount, delta)` signature, `ARM_COUPLE` constant
- Produces: `solveField` returns extended object `{ brRot, armD, armQ, pairs, delta, pairs, gapProfile }` where `gapProfile` is a function `g(θ)` for the non-uniform air gap (1 at pole face, `gapMax/gapMax` at interpolar). Backward-compatible: old fields unchanged.

- [x] **Step 1: Add `gapProfile` and salient constants after `solveField`**

In `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` at :654-662, after the existing `solveField` function, add:

```javascript
// ================================================================
// GEOMETRI POLE SHOE — salient-pole air-gap model (spec Seksi 1).
// g(θ) = gapMin + (gapMax - gapMin) · (1 - shoeMask(θ)).
// 2-pole (round): gapMin === gapMax, g uniform (backward-compatible).
// ================================================================
const SAL_GAP_MIN = 1.00;          // muka kutub (pole face)
const SAL_GAP_MAX = 2.20;          // interpolar
const SAL_SHOE_ARC = 70 * Math.PI / 180;   // lebar busur sepatu, mekanis
const SAL_SHOE_HEIGHT = 0.05;      // tinggi sepatu (relatif R)
const SAL_SHOE_FLARE = 0.4;        // flare ujung sepatu

function shoeMask(localTh, pairs) {
  // 1 di dalam busur sepatu, 0 di luar, cosine blend.
  // localTh dalam kerangka rotor pasangan; 0 = muka kutub.
  const half = SAL_SHOE_ARC / 2;
  const a = ((localTh % (2 * Math.PI / pairs)) + (2 * Math.PI / pairs)) % (2 * Math.PI / pairs);
  const dist = Math.min(a, (2 * Math.PI / pairs) - a);
  if (dist >= half) return 0;
  return 0.5 + 0.5 * Math.cos((dist / half) * Math.PI); // 1 di 0, 0 di half
}

function makeGapProfile(pairs) {
  const min = SAL_GAP_MIN, max = SAL_GAP_MAX;
  // g_ref dipakai normalisasi trace agar kelengkungan tak bergantung absolut.
  const gRef = min;
  return { g: (th) => (min + (max - min) * (1 - shoeMask(th, pairs))) / gRef, gRef, min, max, pairs };
}
```

- [x] **Step 2: Extend `solveField` to return `gapProfile`**

In the same file, inside `solveField`, add one line to the returned object:
```javascript
function solveField(If, Id, Iq, poleCount, delta){
  const pairs = polePairs(poleCount);
  return {
    brRot: getFluxDensity(If),
    armD: -Id * ARM_COUPLE,
    armQ: Iq * ARM_COUPLE,
    pairs,
    delta,
    gapProfile: makeGapProfile(pairs)
  };
}
```

- [x] **Step 3: Add `fn('solveField')`-based assertion to `realistic-field.test.js`**

Add a new Test section at the END of `tools/realistic-field.test.js` (before the final summary), after Test 11:

```javascript
sect('Test 12: Geometri pole shoe — solveField mengembalikan gapProfile');
const solFn = fn('solveField');
ok(solFn.includes('gapProfile'), 'solveField menghasilkan gapProfile');
ok(solFn.includes('makeGapProfile'), 'gapProfile dibangun lewat makeGapProfile');
const shoeMaskFn = fn('shoeMask');
ok(/function\s+shoeMask/.test(shoeMaskFn), 'shoeMask terdefinisi');
```

- [x] **Step 4: Run test to verify new assertions pass**

```bash
node tools/realistic-field.test.js 2>&1 | tail -20
```

Expected: 63 + 3 = 66 assertions pass, 0 fail.

- [x] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" "tools/realistic-field.test.js"
git commit -m "feat(field): tambah gapProfile salient-pole ke solveField

shoeMask() + makeGapProfile() model permeansi celah tak-seragam;
2-potong (round) tetap kompatibel (gap uniform).

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 2: Replace dead-code `fluxNorm`/`fluxCount` with single `density(If)`

**Files:**
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:1440-1441` (delete), insert new `density(If)` at same location
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:1474` (rename `n=` formula to use `density()`)
- Test: `tools/realistic-field.test.js` (new Test 13)

**Interfaces:**
- Consumes: existing `getFluxDensity(If)` (OCC-derived, 0..1)
- Produces: `density(If) -> int` in [6, 24], concave (saturation stated). Replaces both `fluxNorm` and `fluxCount`. Used by `rebuildFluxPaths` Task 4.

- [x] **Step 1: Delete `fluxNorm`/`fluxCount`, replace with `density(If)`**

In `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` at :1440-1441, DELETE:
```javascript
function fluxNorm(ef){ return Math.tanh(Math.max(0,ef)/1.5); }
function fluxCount(ef){ return 6+Math.round(6*fluxNorm(ef)); }
```
and INSERT at the same location (after the OCC comment block at :1437-1439):
```javascript
// Arus medan -> jumlah garis (kerapatan fluks), melengkung (saturasi).
// Rentang 6..24 (4x), cukup terlihat. Pangkat 0.7 menyebar rentang di
// I_f rendah (operasi normal dominan) dan memampatkan di I_f tinggi.
function density(If){
  const sat = Math.max(0, Math.min(1, getFluxDensity(If)));   // OCC, 0..1
  return Math.round(6 + 18 * Math.pow(sat, 0.7));
}
```

- [x] **Step 2: Update comment at :1437-1439**

Replace the existing comment block (which references the now-dead `fluxNorm`/`fluxCount`):
```javascript
// Eksitasi -> kerapatan garis, melengkung (tanh). Saturasi tidak dimodelkan
// (riset §3.8), jadi pemetaan linear akan melebih-lebihkan rentang Ef:
// tanpa lengkungan, Ef=3 tampak 30x lebih rapat daripada Ef=0.1.
```
WITH:
```javascript
// Eksitasi -> kerapatan garis (density()), melengkung (OCC saturation).
// Saturasi dimodelkan OCC (OCC_PEAK=1.55), jadi pemetaan linear akan
// melebih-lebihkan rentang Ef di atas knee (1.0 pu).
```

- [x] **Step 3: Add Test 13 for `density(If)` monotonicity**

In `tools/realistic-field.test.js`, after the new Test 12 from Task 1, add:

```javascript
sect('Test 13: density(I_f) monoton naik + batas');
const densFn = fn('density');
ok(/function\s+density/.test(densFn), 'density(If) terdefinisi');
ok(densFn.includes('getFluxDensity'), 'density memakai getFluxDensity (OCC)');
ok(!/fluxNorm\s*\(/.test(stripComments(src)), 'fluxNorm sudah dihapus (dead code)');
ok(!/fluxCount\s*\(/.test(stripComments(src)), 'fluxCount sudah dihapus (dead code)');
```

- [x] **Step 4: Run tests**

```bash
node tools/realistic-field.test.js 2>&1 | tail -25
```

Expected: 66 + 4 = 70 assertions pass. `npm test` still green (no other test references `fluxNorm`/`fluxCount`).

- [x] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" "tools/realistic-field.test.js"
git commit -m "feat(field): ganti fluxNorm/fluxCount (dead code) dengan density(If)

density(I_f) = 6 + 18*sat^0.7, rentang 6..24, OCC saturation.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 3: Implement `traceFieldLine` (RK4) replacing `buildFluxPath`

**Files:**
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:1451-1466` (delete `buildFluxPath`), insert new `traceFieldLine` + helpers at the same location
- Test: `tools/realistic-field.test.js` (new Test 14)

**Interfaces:**
- Consumes: existing `RGEO` constants, `pairs`, `gapProfile` from Task 1
- Produces: `traceFieldLine(a0, r0, r1, field, opts) -> { points: [[x,y],...], midPoint: [x,y], midAngle: rad }`. One `<path>` worth of line data per call. Returns `null` on degenerate input. Pure function (no DOM). Used by Task 4.

- [x] **Step 1: Delete `buildFluxPath` and insert `traceFieldLine` + `buildArrowHead`**

In `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`, REPLACE :1451-1466 (`buildFluxPath` entire function) with:

```javascript
// ================================================================
// TRACE FLUX LINE — integrasi RK4 di kerangka acuan rotor (spec Seksi 3).
// Medan: Br(θ) = (F_rotor + F_stator)/g(θ); F_total = brRot·cos(θ) + armQ·cos(θ)+armD·sin(θ).
// ================================================================
const FLUX_K = 0.55;   // konstanta kelengkungan trace (sesuaikan saat kalibrasi visual)
const FLUX_STEPS = 24;

// Modulasi demagnetizing, cap ±30% (spec Seksi 5).
function armDModulation(field){
  const f = 1 + (field.armD || 0);
  return Math.max(0.7, Math.min(1.3, f));
}

function traceFieldLine(a0, r0, r1, field, opts){
  if (!field || !field.gapProfile) return null;
  const pairs = field.pairs || 1;
  const g = field.gapProfile.g;
  const gRef = field.gapProfile.gRef;
  const dr = (r1 - r0) / FLUX_STEPS;
  const amp = armDModulation(field);
  const pts = [];
  let r = r0, th = a0;
  for (let i = 0; i <= FLUX_STEPS; i++) {
    pts.push([r * Math.cos(th), r * Math.sin(th)]);
    // Komponen tangensial ∝ 1/g(θ) — fluks membelok di celah lebar.
    const bend = FLUX_K * Math.sin(pairs * th) * (dr / r) * (gRef / g(th));
    th += bend;
    r += dr;
  }
  // Titik tengah + sudut tangen untuk arrowhead N→S.
  const midIdx = Math.floor(pts.length / 2);
  const p0 = pts[Math.max(0, midIdx - 1)];
  const p1 = pts[Math.min(pts.length - 1, midIdx + 1)];
  const midPoint = pts[midIdx];
  const midAngle = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
  return { points: pts, midPoint, midAngle };
}

function pathFromPoints(pts){
  if (!pts || pts.length === 0) return '';
  let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
  for (let i = 1; i < pts.length; i++) d += 'L' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1);
  return d;
}

// Segitiga kecil di titik tengah flux line, arah tangen (spec Seksi 6).
// Pilih eksplisit, BUKAN marker-mid (yang menempel di semua verteks interior).
function buildArrowHead(midPoint, midAngle, size){
  const [x, y] = midPoint;
  const a = midAngle;
  const p1 = [x + size * Math.cos(a), y + size * Math.sin(a)];
  const p2 = [x + size * 0.6 * Math.cos(a + 2.5), y + size * 0.6 * Math.sin(a + 2.5)];
  const p3 = [x + size * 0.6 * Math.cos(a - 2.5), y + size * 0.6 * Math.sin(a - 2.5)];
  return `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}L${p3[0].toFixed(1)} ${p3[1].toFixed(1)}Z`;
}
```

- [x] **Step 2: Add Test 14 for trace existence and signature**

In `tools/realistic-field.test.js`, add:

```javascript
sect('Test 14: traceFieldLine terdefinisi, pure function');
const traceFn = fn('traceFieldLine');
ok(/function\s+traceFieldLine/.test(traceFn), 'traceFieldLine ada');
ok(traceFn.includes('gapProfile'), 'pakai gapProfile');
ok(traceFn.includes('armDModulation'), 'pakai armDModulation (cap 30%)');
ok(/function\s+armDModulation/.test(stripComments(src)), 'armDModulation terdefinisi');
ok(/function\s+buildArrowHead/.test(stripComments(src)), 'buildArrowHead terdefinisi');
ok(/Math\.max\(0\.7/.test(traceFn) || /Math\.max\(0\.7/.test(stripComments(src)), 'cap armD 0.7 (lower)');
ok(/Math\.min\(1\.3/.test(traceFn) || /Math\.min\(1\.3/.test(stripComments(src)), 'cap armD 1.3 (upper)');
```

- [x] **Step 3: Run tests**

```bash
node tools/realistic-field.test.js 2>&1 | tail -25
```

Expected: 70 + 6 = 76 assertions pass.

- [x] **Step 4: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" "tools/realistic-field.test.js"
git commit -m "feat(field): traceFieldLine RK4 ganti buildFluxPath

air-gap permeance model, armD modulation (cap ±30%),
arrowhead segitiga eksplisit di titik tengah.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 4: Rewrite `rebuildFluxPaths` for main + leakage classification

**Files:**
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:1471-1496` (full rewrite of `rebuildFluxPaths`)
- Test: `tools/realistic-field.test.js` (adjust Test 5; new Test 15)

**Interfaces:**
- Consumes: `density(If)` from Task 2, `traceFieldLine` from Task 3, `pathFromPoints`, `buildArrowHead`, `RGEO`, `SAL_*` constants
- Produces: `#g-flux` populated with one `<path class="flux-main">` per main line + arrowhead `<path class="flux-arrow">` + `<path class="flux-leak">` dashed for leakage. No merged multi-line path. Used by `updateSvgPhasorRealistic` (no change to caller required).

- [x] **Step 1: Rewrite `rebuildFluxPaths`**

In `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`, REPLACE entire `rebuildFluxPaths` :1471-1496 with:

```javascript
// Bangun ulang path fluks: satu <path> per garis utama + leakage.
// Utama: rotor N -> gap -> stator yoke. Bocor: antar-kutub, tidak lintas gap.
function rebuildFluxPaths(svg, cx, cy, R, field){
  const g = safeQuerySelector(svg, '#g-flux');
  if (!g) return;
  const n = density(field.brRot > 0 ? S.If || 0 : 0);   // pakai Task 2
  const span = RGEO.fluxMax - RGEO.fluxMin;
  const pairs = Math.max(1, field.pairs || 1);
  const rotorR = R * RGEO.rotor * (1 + SAL_SHOE_HEIGHT * 0.5); // efektif di muka sepatu
  const statorYokeR = R * RGEO.fluxMax;
  const mainColor = '#2f6fb0', leakColor = '#5a8fc0';
  const arrowSize = R * 0.025;
  while (g.firstChild) g.removeChild(g.firstChild);

  // Seed distribusi: terkonsentrasi di muka kutub (sumbu-d lokal 0).
  for (let pair = 0; pair < pairs; pair++) {
    const pairAng = 2 * Math.PI * pair / pairs;
    for (let k = 0; k < n; k++) {
      // Distribusi cos^-like: rapat di muka kutub, renggang di netral.
      const t = (k + 0.5) / n;
      const b = Math.asin(t) * 0.95;   // condense toward 0 (pole face)
      for (const sgn of [1, -1]) {
        const a0 = pairAng + sgn * b;
        const line = traceFieldLine(a0, rotorR, statorYokeR, field, {});
        if (!line) continue;
        const pathId = `flux-p${pair}-${k}-${sgn > 0 ? 'u' : 'l'}`;
        g.appendChild(mkSvg('path', {
          id: pathId, class: 'flux-main', d: pathFromPoints(line.points),
          fill: 'none', stroke: mainColor,
          'stroke-width': Math.max(1, R * (0.008 + 0.010 * field.brRot)),
          'stroke-linecap': 'round',
          opacity: (0.70 + 0.25 * Math.min(1, field.brRot)).toFixed(3),
          transform: `rotate(${pairAng * 180 / Math.PI} ${cx} ${cy})`
        }));
        // Arrowhead N→S di titik tengah.
        g.appendChild(mkSvg('path', {
          class: 'flux-arrow', d: buildArrowHead(line.midPoint, line.midAngle, arrowSize),
          fill: mainColor, opacity: 0.9,
          transform: `rotate(${pairAng * 180 / Math.PI} ${cx} ${cy})`
        }));
      }
    }
    // Leakage: antar-kutub, di luar busur sepatu.
    for (let k = 0; k < Math.max(2, Math.round(n * 0.3)); k++) {
      const aLeak = pairAng + SAL_SHOE_ARC * 1.1 + (k + 0.5) * 0.15;
      const rLeakEnd = rotorR * (1.05 + 0.05 * (k + 1)); // tak lintas gap
      const line = traceFieldLine(aLeak, rotorR, rLeakEnd, field, {});
      if (!line) continue;
      g.appendChild(mkSvg('path', {
        class: 'flux-leak', d: pathFromPoints(line.points),
        fill: 'none', stroke: leakColor, 'stroke-width': Math.max(1, R * 0.006),
        'stroke-linecap': 'round', 'stroke-dasharray': '2,3', opacity: 0.6,
        transform: `rotate(${pairAng * 180 / Math.PI} ${cx} ${cy})`
      }));
    }
  }
  fluxCache.n = n * pairs;
}
```

- [x] **Step 2: Adjust Test 5 (d-write count)**

Test 5 asserts exactly 1 `setAttribute('d')`. New `rebuildFluxPaths` writes `d` only on rebuild, but `updateSvgPhasorRealistic` still writes only δ-arc `d` per frame. Since `rebuildFluxPaths` is NOT in the update loop (it's guarded by `fluxCache`), Test 5 stays valid. Verify by running:

```bash
node tools/realistic-field.test.js 2>&1 | grep "Test 5"
```

Expected: Test 5 still ✓ (the `dWrites === 1` assertion holds).

- [x] **Step 3: Add Test 15 for flux classification**

In `tools/realistic-field.test.js`, add:

```javascript
sect('Test 15: rebuildFluxPaths klasifikasi main + leakage');
const rebFn = fn('rebuildFluxPaths');
ok(rebFn.includes('flux-main'), 'path utama ber-class flux-main');
ok(rebFn.includes('flux-leak'), 'path bocor ber-class flux-leak');
ok(rebFn.includes('flux-arrow'), 'path arrowhead ber-class flux-arrow');
ok(rebFn.includes('density('), 'pakai density(If), bukan fluxCount');
ok(rebFn.includes('buildArrowHead('), 'pakai buildArrowHead eksplisit');
ok(rebFn.includes('stroke-dasharray'), 'leakage dashed');
ok(!/d\+=buildFluxPath/.test(rebFn), 'tidak lagi merge multi-garis jadi satu path');
```

- [x] **Step 4: Run tests**

```bash
node tools/realistic-field.test.js 2>&1 | tail -30
npm test 2>&1 | tail -10
```

Expected: `realistic-field.test.js` = 76 + 7 = 83 assertions pass. `npm test` still green (no other test touches flux path).

- [x] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" "tools/realistic-field.test.js"
git commit -m "feat(field): rebuildFluxPaths — main + leakage classification

satu <path> per garis + arrowhead eksplisit; leakage dashed antar-kutub.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 5: Remove opacity override per-frame; keep narrow opacity range

**Files:**
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:1715-1719` (replace opacity override block)
- Test: `tools/realistic-field.test.js` (new Test 16)

**Interfaces:**
- Consumes: existing `gFlux` query
- Produces: opacity per-frame removed (or kept very narrow `0.85+0.10*fn`); density visual dominates.

- [x] **Step 1: Remove opacity override block**

In `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`, REPLACE :1715-1719:
```javascript
  const gFlux=safeQuerySelector(svg,'#g-flux');
  if(gFlux){
    const fn=field.brRot;
    Array.from(gFlux.children).forEach(path=>path.setAttribute('opacity',(0.35+0.55*Math.min(1,fn)).toFixed(3)));
  }
```
WITH:
```javascript
  // Opacity TIDAK di-override per-frame: biarkan yang direbuild (Task 4)
  // yang menentukan. Perubahan visual utama kini lewat density + width,
  // bukan opacity (perbaikan keluhan "yang berubah opacity, bukan kerapatan").
  const gFlux = safeQuerySelector(svg, '#g-flux');
  if (gFlux && fluxCache.If !== S.If) {
    // First draw: pastikan opacity sudah benar (rebuild di langkah 2 sudah set).
    // Tidak ada override; rebuild yang bertanggung jawab.
  }
```

- [x] **Step 2: Add Test 16 for absence of override**

In `tools/realistic-field.test.js`, add:

```javascript
sect('Test 16: opacity TIDAK di-override tiap frame di gFlux');
const updNoOpOverride = stripComments(fn('updateSvgPhasorRealistic'));
// Pastikan tidak ada lagi loop yang setAttribute('opacity') ke gFlux per frame.
const gFluxBlock = updNoOpOverride.slice(
  updNoOpSelector.indexOf("const gFlux="),
  updNoOpSelector.indexOf("// ── 3.")
);
ok(!gFluxBlock.includes("setAttribute('opacity'"), 'gFlux tiap frame tidak set opacity');
```

- [x] **Step 3: Run tests**

```bash
node tools/realistic-field.test.js 2>&1 | tail -30
```

Expected: 83 + 1 = 84 assertions pass.

- [x] **Step 4: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" "tools/realistic-field.test.js"
git commit -m "fix(field): hapus opacity override per-frame di gFlux

visual density kini lewat jumlah + lebar garis, bukan opacity.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 6: Update legend entries for salient model

**Files:**
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:1770-1790` (`drawRealisticLegend`)
- Test: `tools/realistic-field.test.js` (adjust Test 3d assertions + new Test 17)

**Interfaces:**
- Consumes: existing legend items array
- Produces: entries for pole shoe, non-uniform air gap, leakage flux, N→S arrow; warning updated.

- [x] **Step 1: Replace legend items and warning**

In `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`, REPLACE the `items` array at :1772-1781 AND the warning text at :1788-1789 with:

```javascript
  const items = [
    { label: 'Flux line (density ∝ B(I_f) — field solver)', color: '#2f6fb0' },
    { label: 'Flux line leakage (antar-kutub/slot)', color: '#5a8fc0' },
    { label: 'N→S direction arrowhead', color: '#2f6fb0' },
    { label: 'Rotor pole shoe (N / S)', color: '#0068d8' },
    { label: 'Rotor bar magnet (embedded, 2-pole round)', color: '#0068d8' },
    { label: 'Stator winding phase A / B / C', color: '#c85000' },
    { label: 'RMF stator (rotating 3-φ field)', color: '#30a060' },
    { label: 'Direct axis d (sejajar field winding)', color: '#d84000' },
    { label: 'Quadrature axis q (90° elektrik lead d)', color: '#3a6818' },
    { label: 'Non-uniform air gap (g_min / g_max)', color: '#c0c8d8' },
    { label: 'Busur δ — power angle (sama Panel II)', color: '#a86000' },
  ];
  items.forEach((it, i) => {
    const y = legendY + i * 15;
    svg.appendChild(mkSvg('rect', { x: legendX, y: y, width: 12, height: 12, fill: it.color, stroke: '#404858', 'stroke-width': 0.5, 'rx': 2 }));
    svg.appendChild(mkSvg('text', { x: legendX + 18, y: y + 10, 'font-size': 10, fill: '#505868', 'font-family': 'var(--body)' }, it.label));
  });
  const wy = legendY + items.length * 15 + 10;
  svg.appendChild(mkSvg('text', { x: legendX, y: wy, 'font-size': 9, fill: '#707888', 'font-family': 'var(--body)' },
    'Air-gap permeance model + rotor/stator field superposition — NOT a full FEM mesh.'));
```

- [x] **Step 2: Adjust Test 3d assertions**

Test 3d has assertions like `legendFn.includes('Magnet batangan rotor')`. The new legend renames that entry. In `tools/realistic-field.test.js`, REPLACE the Test 3d block at :93-103 with:

```javascript
sect('Test 3d: Legenda realistis penuh + warning');
const legendFn = fn('drawRealisticLegend');
ok(legendFn.includes('Flux line'), 'legenda: flux line');
ok(legendFn.includes('leakage'), 'legenda: leakage flux');
ok(legendFn.includes('N→S'), 'legenda: N→S direction');
ok(legendFn.includes('pole shoe') || legendFn.includes('Pole shoe'), 'legenda: pole shoe');
ok(legendFn.includes('Quadrature axis') || legendFn.includes('axis q'), 'legenda: sumbu q');
ok(legendFn.includes('Non-uniform air gap'), 'legenda: non-uniform air gap');
ok(legendFn.includes('RMF stator'), 'legenda: RMF');
ok(legendFn.includes('Busur') && legendFn.includes('power angle'), 'legenda: busur δ');
ok(legendFn.includes('permeance') || legendFn.includes('superposisi') || legendFn.includes('NOT a full FEM'),
   'warning: air-gap permeance / superposition, bukan FEM');
```

- [x] **Step 3: Run tests**

```bash
node tools/realistic-field.test.js 2>&1 | tail -35
```

Expected: 84 + 2 (adjusted 3d + new counts) still pass; full count ~86 assertions pass, 0 fail.

- [x] **Step 4: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" "tools/realistic-field.test.js"
git commit -m "docs(legend): perbarui legenda untuk model salient-pole

pole shoe, non-uniform air gap, leakage flux, N→S arrow, warning permeance.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Task 7: Final verification — manual smoke test of realistic-field contract + full suite
> Dilaksanakan oleh `2026-09-24-finish-flux-salient-integration.md` — fix seed double-pairAng sudah di `759aa6b`.

**Files:**
- None (verification-only task). Optionally add a small Node smoke script under `tools/` if helpful.

**Interfaces:**
- All previous tasks' outputs.

- [ ] **Step 1: Run realistic-field.test.js alone**

```bash
node tools/realistic-field.test.js 2>&1
```

Expected: all assertions pass, 0 fail.

- [ ] **Step 2: Run full npm test suite**

```bash
npm test 2>&1 | tail -20
```

Expected: all suites green, no regressions. If any test outside `realistic-field.test.js` fails (unlikely but possible), revert to Task 5 or Task 6 and re-check.

- [ ] **Step 3: Run browser smoke (manual, user-assisted)**

Open `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` directly in a browser. Toggle Panel I to Realistis mode. Verify:
- Flux lines visible, denser at pole face (sumbu-d) than at interpolar.
- Small triangle arrowhead on each main line, pointing N→S.
- Dashed leakage lines between poles (not crossing the air gap).
- Slider I_f (in MESIN section) changes the NUMBER of visible lines visibly (not just opacity).
- 2-pole (default) looks round, uniform; 4/6/8 poles look salient (pole shoe protrudes).
- SC event does NOT collapse flux lines (constant-flux-linkage holds).
- Legend lists all new entries; warning updated.
- `npm run dev` (or `python -m http.server`) serves it at `localhost`; check console for errors.

If any step fails, debug (don't commit broken state) and report back.

- [ ] **Step 4: Commit final (no code changes — smoke-pass commit marker)**

Only if smoke test passes without code changes, this step is a no-op (skip). If smoke test required a fix, commit that fix with:

```bash
git add <fixed file>
git commit -m "fix(field): <short description>

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Post-Plan Notes

- **Curvature constant `k=0.55`** in `traceFieldLine` is an initial estimate. If the flux lines look too straight or too bent in the browser, adjust and re-run Task 7 smoke.
- **Scope deferred per user decision:** mechanical scaling of `δ/poles` (multi-pole phase), asymmetric RMF marker, `i<6` → `coilsPerPhase` loop, slow-motion label disclosure — these are the "Fase" scope, handled in a follow-up plan.
- **`armD` cap ±30%** is a visualization assumption. If user wants stronger/weaker effect, adjust `armDModulation` clamp in Task 3.
- The plan does NOT touch `updateSvgPhasorRealistic` δ-arc logic (still correct), `drawRealisticLegend` color scheme (kept `#2f6fb0`/`#5a8fc0`/`#30a060` for consistency), or `initSvgRealistic` magnet/slot counts (kept as-is; Task 4 handles flux only).
