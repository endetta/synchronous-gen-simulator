# FEM Medium Physics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make field current, saturation, pole count, and saliency change the generator's electrical output while preserving every verified two-pole, round-rotor result.

**Architecture:** Add four pure layers inside the existing HTML script: geometry, saturation, field coefficients, and salient-machine circuit equations. `I_f` becomes the excitation input and `S.Ef` remains the derived internal voltage, so existing formulas and tests continue to call the same functions. At two poles `Xq = Xd`, so saliency terms are exactly zero and the old closed-form EAC results remain valid.

**Tech Stack:** Vanilla JavaScript inside `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`; Node test harness through `tools/extract.js`; no build step and no new dependency.

**Spec:** `docs/superpowers/specs/2026-09-22-fem-medium-realistic-generator-design.md`

## Global Constraints

- UI text, comments, and documentation are Bahasa Indonesia; protection and machine terms stay in English.
- Every new physics function is pure and extractable from the last inline `<script>` by `tools/extract.js`.
- No production formula is copied into a test. Tests call functions extracted from the HTML.
- Two poles use `Xq/Xd = 1.00`; four, six, and eight poles use `0.65`.
- `I_f = 1.0 pu` maps to `E_af = 1.0 pu`; the saturation curve is monotonic, concave, and bounded by `1.55 pu`.
- Existing calls that pass `Ef` directly, such as `getPmax({Ef,V,Xs})`, must keep their current meaning. Saturation applies only when a caller uses `If`.
- Flux density during a fault follows field current, not collapsed terminal voltage.
- Do not change the HTML filename. Commit only this repository, from this project directory, and do not stage unrelated files.
- Run the focused test before every commit, then run the listed regression command for that task.

---

### Task 1: Extractable saturation contract

**Files:**
- Create: `tools/fem-saturation.test.js`
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (insert the saturation block immediately before `function makeState`)
- Modify: `tools/extract.js` (add the new pure names to `names` and `REQUIRED`)

**Interfaces:**
- Consumes: nothing
- Produces: `satCurve(If)`, `getEaf(If)`, `getFluxDensity(If)`, and constants `OCC_KNEE = 1`, `OCC_PEAK = 1.55`, `OCC_ALPHA = 1.4`

- [ ] **Step 1: Write the failing saturation test**

```js
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');

let failed = 0;
const assertClose = (actual, expected, tol, msg) => {
  const diff = Math.abs(actual - expected);
  if (diff <= tol) console.log(`  ✓ ${msg}`);
  else { failed++; console.log(`  ✗ ${msg}: expected ${expected}, got ${actual}`); }
};
const assertTrue = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failed++; console.log(`  ✗ ${msg}`); }
};

(async () => {
  const M = await makeExtractor(HTML);
  const { satCurve, getEaf, getFluxDensity, OCC_PEAK } = M;
  assertClose(satCurve(0), 0, 1e-12, 'OCC starts at zero');
  assertClose(satCurve(1), 1, 1e-12, '1 pu field current gives 1 pu E_af');
  assertClose(getEaf(1), satCurve(1), 1e-12, 'getEaf delegates to satCurve');
  assertTrue(satCurve(3) < OCC_PEAK, 'curve stays below its 1.55 pu asymptote');
  assertTrue(satCurve(3) > satCurve(1), 'curve is still increasing at high excitation');

  let prev = 0, prevSlope = Infinity;
  for (let x = 0.25; x <= 3; x += 0.25) {
    const y = satCurve(x);
    const slope = (y - prev) / 0.25;
    assertTrue(y > prev && slope < prevSlope, `concave and monotonic at If=${x}`);
    prev = y; prevSlope = slope;
  }
  assertClose(getFluxDensity(0), 0, 1e-12, 'zero field gives zero flux density');
  assertTrue(getFluxDensity(1) > 0 && getFluxDensity(1) < 1, 'rated density is normalized below one');
  if (failed) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the test and verify the missing-function seam failure**

Run: `node tools/fem-saturation.test.js`

Expected: FAIL from `tools/extract.js` because `satCurve` is absent.

- [ ] **Step 3: Add the saturation functions and export them**

Insert before `makeState`:

```js
const OCC_KNEE = 1, OCC_PEAK = 1.55, OCC_ALPHA = 1.4;
function satCurve(If){
  const x = Math.max(0, If) / OCC_KNEE;
  return OCC_PEAK * Math.tanh(x / OCC_ALPHA) / Math.tanh(1 / OCC_ALPHA);
}
function getEaf(If){ return satCurve(If); }
function getFluxDensity(If){ return satCurve(If) / OCC_PEAK; }
```

In `tools/extract.js`, add these names to both `names` and `REQUIRED`:

```js
'satCurve', 'getEaf', 'getFluxDensity'
```

Also export the constant beside the existing `EAC_TOL` export:

```js
out.OCC_PEAK = _get('OCC_PEAK');
```

- [ ] **Step 4: Run the focused test**

Run: `node tools/fem-saturation.test.js`

Expected: PASS, with all monotonic and concavity checks green.

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/extract.js tools/fem-saturation.test.js
git commit -m "$(cat <<'EOF'
feat(fem): tambah kurva saturasi OCC untuk arus medan

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

### Task 2: Pole geometry and fixed saliency ratios

**Files:**
- Create: `tools/pole-geometry.test.js`
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (insert immediately after the Task 1 saturation block)
- Modify: `tools/extract.js`

**Interfaces:**
- Consumes: nothing from Task 1
- Produces: `SAL_RATIO`, `polePairs(poleCount)`, `getXq(Xd, poleCount)`, `slotCount(poleCount)`, `coilsPerPhase(poleCount)`, `elecAngle(mechAngle, poleCount)`

- [ ] **Step 1: Write the failing geometry test**

```js
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
let failed = 0;
const check = (cond, msg) => { if (cond) console.log(`  ✓ ${msg}`); else { failed++; console.log(`  ✗ ${msg}`); } };

(async () => {
  const M = await makeExtractor(HTML);
  const { SAL_RATIO, polePairs, getXq, slotCount, coilsPerPhase, elecAngle } = M;
  check(SAL_RATIO[2] === 1 && SAL_RATIO[4] === 0.65 && SAL_RATIO[6] === 0.65 && SAL_RATIO[8] === 0.65, 'fixed saliency ratios');
  [2, 4, 6, 8].forEach((poles) => {
    check(polePairs(poles) === poles / 2, `${poles} poles have ${poles / 2} pairs`);
    check(getXq(1.2, poles) === 1.2 * SAL_RATIO[poles], `Xq follows ratio for ${poles} poles`);
    check(slotCount(poles) === 6 * poles, `${poles} poles use 6 slots per pole`);
    check(coilsPerPhase(poles) === 2 * poles, `${poles} poles use two coils per phase per pole`);
  });
  check(Math.abs(elecAngle(Math.PI / 2, 4) - Math.PI) < 1e-12, '4 poles turn 90 mechanical degrees into 180 electrical degrees');
  if (failed) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run it and verify failure**

Run: `node tools/pole-geometry.test.js`

Expected: FAIL because `polePairs` is not exported.

- [ ] **Step 3: Implement the geometry functions**

```js
const SAL_RATIO = { 2: 1.00, 4: 0.65, 6: 0.65, 8: 0.65 };
function polePairs(poleCount){ return poleCount / 2; }
function getXq(Xd, poleCount){ return Xd * SAL_RATIO[poleCount]; }
function slotCount(poleCount){ return 6 * poleCount; }
function coilsPerPhase(poleCount){ return 2 * poleCount; }
function elecAngle(mechAngle, poleCount){ return polePairs(poleCount) * mechAngle; }
```

Add all six names to `names` and the five functions to `REQUIRED` in `tools/extract.js`. Export `out.SAL_RATIO = _get('SAL_RATIO');`.

- [ ] **Step 4: Verify**

Run: `node tools/pole-geometry.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/extract.js tools/pole-geometry.test.js
git commit -m "$(cat <<'EOF'
feat(fem): tambah geometri jumlah kutub dan rasio saliency

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

### Task 3: Salient-machine circuit equations

**Files:**
- Create: `tools/fem-saliency.test.js`
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (insert after Task 2)
- Modify: `tools/extract.js`

**Interfaces:**
- Consumes: `getXq(Xd, poleCount)` from Task 2
- Produces:
  - `getPeSal(delta, Pmax, Xd, Xq, V)` returns pu power
  - `solveDelta0(Pm, Pmax, Xd, Xq, V)` returns the stable equilibrium in radians
  - `solveDeltaCr(Pm, Pmax, Xd, Xq, V)` returns the first unstable boundary after `delta0`
  - `solveDeltaCc(Pm, Pmax, Xd, Xq, V)` returns critical clearing angle
  - `solveCCT(dcc, Pm, Pmax, Xd, Xq, V, H)` returns seconds

- [ ] **Step 1: Write the failing salient-machine test**

```js
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
let failed = 0;
const close = (a, e, tol, m) => { if (Math.abs(a - e) <= tol) console.log(`  ✓ ${m}`); else { failed++; console.log(`  ✗ ${m}: expected ${e}, got ${a}`); } };
const ok = (c, m) => { if (c) console.log(`  ✓ ${m}`); else { failed++; console.log(`  ✗ ${m}`); } };

(async () => {
  const M = await makeExtractor(HTML);
  const { getPeSal, solveDelta0, solveDeltaCr, solveDeltaCc, solveCCT } = M;
  const Pmax = 1.25, V = 1, Xd = 1.2, XqRound = 1.2, XqSalient = 0.78, Pm = 0.8, H = 8;
  const d0Round = Math.asin(Pm / Pmax);
  close(getPeSal(d0Round, Pmax, Xd, XqRound, V), Pm, 1e-9, 'round rotor has no reluctance term');
  close(solveDelta0(Pm, Pmax, Xd, XqRound, V), d0Round, 1e-6, 'round-rotor equilibrium matches arcsin');
  close(solveDeltaCr(Pm, Pmax, Xd, XqRound, V), Math.PI - d0Round, 1e-5, 'round-rotor critical angle remains pi-delta0');

  const d0Salient = solveDelta0(Pm, Pmax, Xd, XqSalient, V);
  close(getPeSal(d0Salient, Pmax, Xd, XqSalient, V), Pm, 1e-5, 'salient equilibrium carries the requested power');
  ok(d0Salient < d0Round, 'salient reluctance torque lowers the operating angle');
  const dcr = solveDeltaCr(Pm, Pmax, Xd, XqSalient, V);
  ok(dcr > d0Salient && dcr < Math.PI - d0Salient, 'salient critical angle is no longer pi-delta0');
  const dcc = solveDeltaCc(Pm, Pmax, Xd, XqSalient, V);
  ok(dcc > d0Salient && dcc < dcr, 'critical clearing angle lies between equilibrium and critical angle');
  const cct = solveCCT(dcc, Pm, Pmax, Xd, XqSalient, V, H);
  ok(cct > 0.05 && cct < 1, `salient CCT is finite, got ${cct}`);
  if (failed) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run it and verify failure**

Run: `node tools/fem-saliency.test.js`

Expected: FAIL because `getPeSal` is absent.

- [ ] **Step 3: Implement the salient equations**

```js
function getPeSal(delta, Pmax, Xd, Xq, V){
  const sal = Math.abs(Xq - Xd) < 1e-12 ? 0 : (V * V / 2) * (1 / Xq - 1 / Xd) * Math.sin(2 * delta);
  return Pmax * Math.sin(delta) + sal;
}
function dPeSal(delta, Pmax, Xd, Xq, V){
  const sal = Math.abs(Xq - Xd) < 1e-12 ? 0 : V * V * (1 / Xq - 1 / Xd) * Math.cos(2 * delta);
  return Pmax * Math.cos(delta) + sal;
}
function solveDelta0(Pm, Pmax, Xd, Xq, V){
  let lo = 0, hi = Math.PI / 2;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (getPeSal(mid, Pmax, Xd, Xq, V) < Pm) lo = mid; else hi = mid;
  }
  const d = (lo + hi) / 2;
  return dPeSal(d, Pmax, Xd, Xq, V) > 0 ? d : null;
}
function solveDeltaCr(Pm, Pmax, Xd, Xq, V){
  const d0 = solveDelta0(Pm, Pmax, Xd, Xq, V);
  if (d0 === null) return null;
  let lo = d0, hi = Math.PI - 1e-6;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (dPeSal(mid, Pmax, Xd, Xq, V) > 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
function area(from, to, fn){
  const n = 240;
  const h = (to - from) / n;
  let sum = 0.5 * (fn(from) + fn(to));
  for (let i = 1; i < n; i++) sum += fn(from + i * h);
  return sum * h;
}
function solveDeltaCc(Pm, Pmax, Xd, Xq, V){
  const d0 = solveDelta0(Pm, Pmax, Xd, Xq, V);
  const dcr = solveDeltaCr(Pm, Pmax, Xd, Xq, V);
  if (d0 === null || dcr === null) return null;
  const a1 = (dc) => area(d0, dc, (d) => Math.max(0, Pm - 0.04 * getPeSal(d, Pmax, Xd, Xq, V)));
  const a2 = (dc) => area(dc, dcr, (d) => Math.max(0, getPeSal(d, Pmax, Xd, Xq, V) - Pm));
  let lo = d0, hi = dcr;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (a2(mid) > a1(mid)) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
function solveCCT(dcc, Pm, Pmax, Xd, Xq, V, H){
  const d0 = solveDelta0(Pm, Pmax, Xd, Xq, V);
  if (dcc === null || d0 === null || Pm <= 0) return null;
  const accelerating = area(d0, dcc, (d) => Math.max(0, Pm - 0.04 * getPeSal(d, Pmax, Xd, Xq, V)));
  return Math.sqrt(Math.max(0, 4 * H * accelerating / (2 * Math.PI * 50 * Pm)));
}
```

Export all five public functions through `names` and `REQUIRED`. Keep `dPeSal` and `area` local; tests must not depend on them.

- [ ] **Step 4: Verify the new test and old physics**

Run: `node tools/fem-saliency.test.js && node tools/model.test.js`

Expected: both PASS. The old model still uses `getPe`, so this task cannot change its numbers yet.

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/extract.js tools/fem-saliency.test.js
git commit -m "$(cat <<'EOF'
feat(fem): tambah persamaan rangkaian mesin salient

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

### Task 4: Wire field current and saliency into the live state

**Files:**
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:500-640` (`makeState`, power functions, EAC functions, and `ode`)
- Modify: `tools/extract.js`
- Test: `tools/fem-saliency.test.js` (append the integration cases below)

**Interfaces:**
- Consumes: `getEaf`, `getXq`, `getPeSal`, `solveDelta0`, `solveDeltaCr`, `solveDeltaCc`, `solveCCT`
- Produces: `setIf(state, If)`, `getPmaxSal(state)`, `getPeState(state)`, `getQeSal(state)`; `makeState` returns `poleCount: 2`, `If: 1`, and derived `Ef: 1`

- [ ] **Step 1: Append failing integration assertions**

```js
const s = M.makeState();
M.setIf(s, 1);
close(s.Ef, 1, 1e-12, '1 pu field current derives 1 pu internal voltage');
M.setIf(s, 3);
ok(s.Ef < 1.55 && s.Ef > M.getEaf(1), 'high field current saturates derived E_af');
s.poleCount = 4; s.Pm = 0.8; s.Xs = 1.2; s.V = 1; s.Ef = M.getEaf(1.5);
const salient = M.getPeState({ ...s, delta: Math.PI / 6 });
const round = M.getPeSal(Math.PI / 6, s.Ef * s.V / s.Xs, s.Xs, s.Xs, s.V);
ok(salient > round, 'four-pole state includes reluctance torque');
```

Also assert that no scenario bypasses saturation. This is spec risk R4:

```js
const src = require('fs').readFileSync(HTML, 'utf8');
const scenarioBlock = src.slice(src.indexOf('const SCENARIOS={'), src.indexOf('function runSc('));
ok(!/s\.Ef\s*=/.test(scenarioBlock), 'no scenario writes S.Ef directly (would bypass saturation)');
ok(!/uiSl\('Ef'/.test(scenarioBlock), 'no scenario drives the old Ef slider');
```

- [ ] **Step 2: Run and verify failure**

Run: `node tools/fem-saliency.test.js`

Expected: FAIL because `setIf` is undefined.

- [ ] **Step 3: Wire the state without changing explicit-Ef callers**

```js
function setIf(s, If){
  s.If = Math.max(0.2, Math.min(3, If));
  s.Ef = getEaf(s.If);
}
function getMachineXq(s){ return getXq(s.Xs, s.poleCount || 2); }
function getPmaxSal(s){ return s.Ef * getVt(s) / Math.max(s.Xs, 0.01); }
function getPeState(s){ return getPeSal(s.delta, getPmaxSal(s), s.Xs, getMachineXq(s), getVt(s)); }
function getQeSal(s){
  const Vt = getVt(s), Xq = getMachineXq(s);
  const id = (Vt * Math.cos(s.delta) - s.Ef) / Math.max(s.Xs, 0.01);
  const iq = Vt * Math.sin(s.delta) / Math.max(Xq, 0.01);
  return Vt * (id * Math.sin(s.delta) - iq * Math.cos(s.delta));
}
```

In `makeState`, after reading the controls, set:

```js
poleCount: 2,
If: 1,
Ef: getEaf(1),
```

Do not remove the existing excitation control yet. Keep `getPmax`, `getPe`, and `getQe` for explicit object calls, but change their live-state callers and `ode` to `getPmaxSal` and `getPeState`.

Replace the equilibrium and critical-angle calculations in `getA2Available`, `getCC`, and `getCCT` with `solveDelta0`, `solveDeltaCr`, `solveDeltaCc`, and `solveCCT`. For `poleCount === 2`, these functions return the old values.

Then migrate every direct write to `S.Ef` so saturation cannot be bypassed. There are nine sites today; verify with `grep -n "s\.Ef\s*=\|uiSl('Ef'" "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html"` before and after.

In `SCENARIOS`, replace each `s.Ef = X` with `setIf(s, X)`. In the `overexcitation` scenario, replace the event handlers:

```js
{t:4,fn(s){setIf(s,1.5);uiSl('If','1.5');},n:'...'},
{t:12,fn(s){setIf(s,2.0);uiSl('If','2.0');},n:'...'},
```

and replace its `uiSl('Ef','1.0')` with `uiSl('If','1.0')`. Rewrite those narrative strings to describe field current, because the old text quotes `Ef` values that no longer match the input. The `overexcitation` init must set `s.If` through `setIf` as well.

The `Ef` slider element still exists in this task; Task 5 of the visualization plan replaces it with the `I_f` control. Until then, `uiSl('Ef', ...)` may remain only outside `SCENARIOS`.

- [ ] **Step 4: Run focused and regression tests**

Run: `node tools/fem-saliency.test.js && node tools/model.test.js && node tools/eac-verdict.test.js && node tools/governor-steady-state.test.js && node tools/reactive-power.test.js`

Expected: PASS. If a regression differs only because live state now starts at `If = 1` rather than the old control default, update that test setup to call `setIf(state, value)` explicitly; do not weaken an assertion.

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/extract.js tools/fem-saliency.test.js
git commit -m "$(cat <<'EOF'
feat(fem): hubungkan arus medan dan saliency ke state hidup

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

### Task 5: Field-solution coefficients

**Files:**
- Create: `tools/fem-field-solver.test.js`
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (insert after Task 3 functions)
- Modify: `tools/extract.js`

**Interfaces:**
- Consumes: `getFluxDensity(If)` and `polePairs(poleCount)`
- Produces: `solveField(If, Id, Iq, poleCount, delta)` returning `{brRot, armD, armQ, pairs, delta}`

- [ ] **Step 1: Write the failing field test**

```js
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
let failed = 0;
const ok = (c, m) => { if (c) console.log(`  ✓ ${m}`); else { failed++; console.log(`  ✗ ${m}`); } };

(async () => {
  const { solveField } = await makeExtractor(HTML);
  const low = solveField(0.5, 0, 0, 2, 0);
  const high = solveField(2, 0, 0, 2, 0);
  ok(high.brRot > low.brRot, 'flux amplitude rises with field current');
  ok(high.brRot / low.brRot < 4, 'saturation prevents linear flux growth');
  const over = solveField(1, -0.4, 0.2, 4, 0.4);
  ok(over.armD > 0 && over.armQ > 0, 'negative Id and positive Iq produce the two armature components');
  ok(over.pairs === 2, 'four poles produce two field patterns');
  const noArm = solveField(1, 0, 0, 2, 0.4);
  ok(noArm.armD === 0 && noArm.armQ === 0, 'unity cross-axis-free case has no armature distortion');
  if (failed) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run it and verify failure**

Run: `node tools/fem-field-solver.test.js`

Expected: FAIL because `solveField` is absent.

- [ ] **Step 3: Implement the coefficient solver**

```js
const ARM_COUPLE = 0.18;
function solveField(If, Id, Iq, poleCount, delta){
  return {
    brRot: getFluxDensity(If),
    armD: -Id * ARM_COUPLE,
    armQ: Iq * ARM_COUPLE,
    pairs: polePairs(poleCount),
    delta
  };
}
```

Export `solveField` through `names` and `REQUIRED`. `ARM_COUPLE` stays local so the visual layer can change it only by editing this one named constant.

- [ ] **Step 4: Verify**

Run: `node tools/fem-field-solver.test.js && node tools/fem-saturation.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/extract.js tools/fem-field-solver.test.js
git commit -m "$(cat <<'EOF'
feat(fem): tambah koefisien solusi medan dan armature reaction

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

### Task 6: Physics regression gate

**Files:**
- Modify: `package.json` only if a `test:fem` script is needed; otherwise no file changes
- Test: all physics tests listed below

**Interfaces:**
- Consumes: all functions produced by Tasks 1-5
- Produces: one documented command that proves the physics plan is complete

- [ ] **Step 1: Run the complete physics gate**

Run:

```bash
node tools/fem-saturation.test.js && node tools/pole-geometry.test.js && node tools/fem-saliency.test.js && node tools/fem-field-solver.test.js && node tools/model.test.js && node tools/eac-verdict.test.js && node tools/governor-steady-state.test.js && node tools/oos-trip.test.js && node tools/reactive-power.test.js
```

Expected: every command exits 0.

- [ ] **Step 2: Record the gate in the session log**

Create `design-plans/sesi-2026-09-22-01-fem-medium-fisika.md` with start time, the commit before this plan (`c70251a`), commands run, pass counts, and the next plan path.

- [ ] **Step 3: Commit the session log**

```bash
git add design-plans/sesi-2026-09-22-01-fem-medium-fisika.md
git commit -m "$(cat <<'EOF'
docs(sesi): catat gate fisika FEM medium

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```
