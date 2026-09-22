# FEM Medium Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the realistic generator view show readable upright labels, bar magnets, pole-dependent windings, solver-driven flux, and one synchronized visual clock.

**Architecture:** Keep all geometry and animation in `initSvgRealistic` and `updateSvgPhasorRealistic`. The view reads the pure physics contract (`poleCount`, `If`, `solveField`, `slotCount`, `coilsPerPhase`) and never recalculates electrical power. One visual phase, `S.animT`, drives rotor, stator field, current markers, and coil pulsing.

**Tech Stack:** Inline SVG and vanilla JavaScript in `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`; source-contract tests in `tools/`; no framework and no new dependency.

**Spec:** `docs/superpowers/specs/2026-09-22-fem-medium-realistic-generator-design.md`

## Global Constraints

- Prerequisite: `docs/superpowers/plans/2026-09-22-fem-medium-physics.md` is complete and its physics gate passes.
- Bahasa Indonesia for UI labels; technical terms such as RMF, sumbu-d, sumbu-q, and OCC stay unchanged.
- No SVG element is added without a legend entry.
- Labels `N`, `S`, `d`, and `q` remain attached to their poles but their text stays upright.
- Two poles use two embedded bar magnets; four, six, and eight poles use protruding salient magnets.
- Flux paths are rebuilt only when field current, armature current, pole count, or SVG radius changes.
- Flux does not shrink when `sc_active` is true.
- No `Date.now()` in the realistic animation path.
- `S.visSpeed` changes only visual speed. Electrical frequency output remains 50 Hz nominal.
- Preserve the existing `tools/realistic-field.test.js` contracts unless a step explicitly updates that test first.

---

### Task 1: Pole-aware winding and RMF geometry

**Files:**
- Modify: `tools/realistic-field.test.js`
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (`initSvgRealistic`, around the current 36-slot and six-coil loops)
- Test: `tools/realistic-field.test.js`

**Interfaces:**
- Consumes: `slotCount(poleCount)`, `coilsPerPhase(poleCount)`, `polePairs(poleCount)`
- Produces: realistic SVG whose slot and coil counts are derived from `S.poleCount`

- [ ] **Step 1: Add failing source assertions**

```js
ok(initReal.includes('slotCount(S.poleCount)'), 'slot count comes from pole geometry');
ok(initReal.includes('coilsPerPhase(S.poleCount)'), 'coil count comes from pole geometry');
ok(fn('buildCoilPath').includes('Math.PI / pairs'), 'coil pitch uses 180 electrical degrees');
ok(initReal.includes('pairs:polePairs'), 'RMF group records the number of pole pairs');
```

- [ ] **Step 2: Run and verify failure**

Run: `node tools/realistic-field.test.js`

Expected: FAIL on the new assertions while all existing assertions still identify the old geometry.

- [ ] **Step 3: Replace the fixed loops**

Use `const slots = slotCount(S.poleCount || 2);`, `const pairs = polePairs(S.poleCount || 2);`, and `const coils = coilsPerPhase(S.poleCount || 2);`. Change `buildCoilPath` to accept `pairs` and connect the return side at `th + Math.PI / pairs`. Draw one RMF peak per pole pair by adding `pairs` radial markers inside `#g-rmf`.

- [ ] **Step 4: Verify**

Run: `node tools/realistic-field.test.js`

Expected: PASS, including the existing two-pole flux and current-marker contracts.

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/realistic-field.test.js
git commit -m "$(cat <<'EOF'
feat(viz): sesuaikan slot, kumparan, dan RMF dengan jumlah kutub

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

### Task 2: Upright labels and bar magnets

**Files:**
- Modify: `tools/realistic-field.test.js`
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (`initSvgRealistic` and `updateSvgPhasorRealistic`)
- Test: `tools/realistic-field.test.js`

**Interfaces:**
- Consumes: `S.poleCount`, `rotorAng`, and the existing `#g-rotor`
- Produces: `#magnet-{i}`, `#label-{i}`, and counter-rotation in `updateSvgPhasorRealistic`

- [ ] **Step 1: Add failing label and magnet assertions**

```js
ok(initReal.includes('id:`magnet-${i}`'), 'one bar magnet is created per pole');
ok(initReal.includes('id:`label-${i}`'), 'one upright label is created per pole');
ok(updReal.includes('rotate(-${deg(rotorAng)}'), 'labels receive counter-rotation');
ok(initReal.includes('protrude:S.poleCount>2'), 'more than two poles use salient magnets');
```

- [ ] **Step 2: Run and verify failure**

Run: `node tools/realistic-field.test.js`

Expected: FAIL because no magnet or counter-rotation exists.

- [ ] **Step 3: Draw magnets and counter-rotate their labels**

For each pole `i`, place a rounded rectangle at mechanical angle `2π i / poleCount`. Its radial extent is `0.34R..0.48R` for two poles and `0.34R..0.62R` for more than two poles. Color north poles `#0068d8` and south poles `#d84000`.

Create each label at its magnet face and, in `updateSvgPhasorRealistic`, set:

```js
label.setAttribute('transform', `rotate(${-deg(rotorAng)} ${x} ${y})`);
```

Apply the same counter-rotation to the `d` and `q` text labels. Leave the axis lines themselves rotating with the rotor.

- [ ] **Step 4: Verify**

Run: `node tools/realistic-field.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/realistic-field.test.js
git commit -m "$(cat <<'EOF'
feat(viz): tambah magnet batangan dan label rotor tegak

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

### Task 3: Solver-driven flux paths

**Files:**
- Modify: `tools/realistic-field.test.js`
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (`rebuildFluxPaths` and its call in `updateSvgPhasorRealistic`)
- Test: `tools/realistic-field.test.js`

**Interfaces:**
- Consumes: `solveField(If, Id, Iq, poleCount, delta)` from the physics plan
- Produces: `fluxCache = {If, Id, Iq, poleCount, R}` and pole-pair-aware flux paths

- [ ] **Step 1: Add failing solver-cache assertions**

```js
ok(updReal.includes('solveField('), 'flux rebuild reads solveField');
ok(updReal.includes('fluxCache.If!==S.If'), 'field current invalidates flux cache');
ok(updReal.includes('fluxCache.poleCount!==S.poleCount'), 'pole count invalidates flux cache');
ok(!updReal.includes('sc_active'), 'fault state still cannot shrink flux');
```

- [ ] **Step 2: Run and verify failure**

Run: `node tools/realistic-field.test.js`

Expected: FAIL on the new cache assertions.

- [ ] **Step 3: Rebuild paths from field coefficients**

Calculate `Id` and `Iq` with the same expressions used by `getQeSal`, call `solveField`, and draw `pairs` copies of the flux pattern at `2π k / pairs`. Scale path count and opacity by `field.brRot`. Include `field.armQ` as a small angular offset and `field.armD` as a small amplitude reduction. Change the cache guard to:

```js
if (fluxCache.If !== S.If || fluxCache.Id !== Id || fluxCache.Iq !== Iq || fluxCache.poleCount !== S.poleCount || fluxCache.R !== R) rebuildFluxPaths(...);
```

- [ ] **Step 4: Verify**

Run: `node tools/realistic-field.test.js && node tools/fem-field-solver.test.js`

Expected: PASS. The flux contract still forbids per-frame `d` updates and fault-dependent shrinking.

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/realistic-field.test.js
git commit -m "$(cat <<'EOF'
feat(viz): gambar garis fluks dari solusi medan

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

### Task 4: One visual clock and island speed

**Files:**
- Create: `tools/visual-sync.test.js`
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (`makeState`, `stepPhys`, `updateSvgPhasorRealistic`)
- Modify: `tools/extract.js` — add `advanceVisualClock` to both `names` and `REQUIRED`
- Test: `tools/visual-sync.test.js`, `tools/realistic-field.test.js`

**Interfaces:**
- Consumes: `S.mode`, `S.omega`, and `rdt`
- Produces: `S.animT`, `S.visSpeed`, and `advanceVisualClock(state, rdt)`

- [ ] **Step 1: Write the failing clock test**

```js
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
let failed = 0;
const close = (a, e, tol, m) => { if (Math.abs(a - e) <= tol) console.log(`  ✓ ${m}`); else { failed++; console.log(`  ✗ ${m}: got ${a}`); } };

(async () => {
  const { makeState, advanceVisualClock } = await makeExtractor(HTML);
  const s = makeState();
  s.visSpeed = 1; s.mode = 'grid'; s.omega = 0.2;
  advanceVisualClock(s, 1);
  close(s.animT, 2 * Math.PI, 1e-9, 'grid visual clock ignores speed deviation');
  s.mode = 'island'; advanceVisualClock(s, 1);
  close(s.animT, 2 * Math.PI + 2 * Math.PI * 1.2, 1e-9, 'island visual clock follows 1+omega');
  const src = require('fs').readFileSync(HTML, 'utf8');
  if (src.includes('Date.now()')) { failed++; console.log('  ✗ realistic path still uses Date.now'); }
  if (failed) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run and verify failure**

Run: `node tools/visual-sync.test.js`

Expected: FAIL because `advanceVisualClock` is absent.

- [ ] **Step 3: Advance one clock and use it everywhere**

```js
function advanceVisualClock(s, rdt){
  const island = s.mode === 'island' ? (1 + s.omega) : 1;
  s.animT += 2 * Math.PI * s.visSpeed * rdt * island;
}
```

Initialize `animT: 0` and `visSpeed: 1` in `makeState`. Call `advanceVisualClock(s, rdt)` once per `stepPhys`. In the realistic updater replace `S.anim` with `S.animT` and replace `wE * S.t` with `S.animT`.

- [ ] **Step 4: Verify**

Run: `node tools/visual-sync.test.js && node tools/realistic-field.test.js`

Expected: PASS. The realistic source no longer contains `Date.now()` or `wE*S.t`.

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/extract.js tools/visual-sync.test.js tools/realistic-field.test.js
git commit -m "$(cat <<'EOF'
feat(viz): sinkronkan rotor dan stator pada satu jam visual

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

### Task 5: Machine controls and complete legend

**Files:**
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (control panel near Generator Parameters and Excitation; realistic legend)
- Modify: `tools/ui.test.js`
- Test: `tools/ui.test.js`

**Interfaces:**
- Consumes: `setIf`, `S.poleCount`, `S.visSpeed`, and `advanceVisualClock`
- Produces: `#poleCount`, `#sIf`, `#visSpeed`, and a legend entry for every realistic SVG element

- [ ] **Step 1: Add failing UI source assertions**

```js
ok(src.includes('id="poleCount"'), 'pole-count selector exists');
ok(src.includes('id="sIf"'), 'field-current slider exists');
ok(src.includes('id="visSpeed"'), 'visual-speed selector exists');
['Magnet batangan', 'Sumbu-d', 'Sumbu-q', 'air gap', 'Penyederhanaan'].forEach((label) => {
  ok(src.includes(label), `legend contains ${label}`);
});
```

- [ ] **Step 2: Run and verify failure**

Run: `node tools/ui.test.js`

Expected: FAIL only on these new assertions.

- [ ] **Step 3: Add the controls and legend**

Add a Machine section before Generator Parameters with a select containing values `2`, `4`, `6`, and `8`. Its change handler sets `S.poleCount`, calls `setIf(S, S.If)` to refresh derived values, and sets `realInit = false`.

Replace the excitation slider's input path with `I_f`, range `0.2..3`, default `1`, and a read-only `E_af` display. The slider handler calls `setIf(S, value)`.

Add a visual-speed select in Panel I with values `0.25`, `0.5`, `1`, and `2`; its handler sets only `S.visSpeed`.

Extend the realistic legend with magnet bars, d-axis, q-axis, air gap, RMF, flux, stator phases, and the exact simplification warning from spec §5.5.

- [ ] **Step 4: Run the UI and visualization gates**

Run: `node tools/ui.test.js && node tools/realistic-field.test.js && node tools/visual-sync.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/ui.test.js
git commit -m "$(cat <<'EOF'
feat(ui): tambah kontrol kutub, arus medan, dan kecepatan visual

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

### Task 6: Full visualization regression gate

**Files:**
- Create: `design-plans/sesi-2026-09-22-02-fem-medium-visualisasi.md`
- Test: visualization and physics commands below

**Interfaces:**
- Consumes: all tasks in this plan and the physics plan
- Produces: a session log recording the final gate

- [ ] **Step 1: Run the final gate**

```bash
node tools/realistic-field.test.js && node tools/visual-sync.test.js && node tools/ui.test.js && node tools/fem-saturation.test.js && node tools/pole-geometry.test.js && node tools/fem-saliency.test.js && node tools/fem-field-solver.test.js && node tools/model.test.js && node tools/eac-verdict.test.js && node tools/governor-steady-state.test.js && node tools/oos-trip.test.js && node tools/reactive-power.test.js
```

Expected: all commands exit 0.

- [ ] **Step 2: Write the session log**

Record start time, pre-task commit, files changed, each test result, remaining visual risks, and the next manual browser check: pole switching, upright labels, bar magnets, and slow visual speed.

- [ ] **Step 3: Commit**

```bash
git add design-plans/sesi-2026-09-22-02-fem-medium-visualisasi.md
git commit -m "$(cat <<'EOF'
docs(sesi): catat gate visualisasi FEM medium

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```
