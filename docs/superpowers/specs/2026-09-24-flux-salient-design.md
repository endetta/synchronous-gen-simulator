# Design: Realistic Salient-Pole Flux Lines (Panel I)

**Status:** AWAITING USER REVIEW, before writing-plans
**Created:** 2026-09-24
**Audit source:** `design-plans/audit-flux-fase-2026-09-24.md` (workflow `audit-flux-fase-realistis`)
**Physics source:** `docs/riset-medan-magnetik-dan-belitan.md` (primary, Kirtley MIT OCW 6.685)
**Code source:** `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`, Panel I Realistis mode

---

## Background & Problem

Read-only audit (4 panels, 2026-09-24) confirms two user complaints on Panel I Realistis mode:

**A. Flux lines unrealistic.** `buildFluxPath` (:1451-1466) uses a 33-point sinusoidal polyline — the code comment itself says "BUKAN solusi medan penuh (bukan FEM)". No pole shoe, uniform air gap (`RGEO.gap` constant), no leakage flux, no N→S direction arrow. Purely schematic; for a real salient-pole machine, wrong.

**B. Density does not respond to field current (I_f).** Density rises via solver `n=6+round(8*brRot)` (:1474), but OCC saturation compresses `brRot` (0.15→0.98 on I_f 0.2→3.0) so `n` only goes 7→14 — 2×. All lines merged into ONE `<path>` per pole pair (:1488-1493); difference between 7 vs 14 sub-segments stacked is invisible. Meanwhile opacity is overridden each frame `0.35+0.55*brRot` (:1718), `stroke-width` constant (:1490), `rMax` only +4% (:1483). The eye reads opacity, not density.

**C. Dead code + unused component.** `fluxNorm`/`fluxCount` `tanh(ef/1.5)` (:1440-1441) never called. `armD=-Id*0.18` (:657) computed but never drawn — overexcitation does not weaken the flux visually.

**Binding constraints (do NOT violate on revision):**
- Rotor and stator fields rotate together at synchronous speed, separated by δ (Kirtley §5). Already correct in code, keep.
- Flux stays dense during `sc_active` (constant-flux-linkage, model `E'`). `S.V` nominal at :1690. Keep.
- Armature-reaction distortion subtle (a few degrees), not dramatic. `armQ` shift already present.
- Rigid rotation via `<g transform>`, not recompute `d` each frame. Keep.
- Determinism `S.animT` (not `Date.now()`). Keep.

---

## Chosen Approach: A

**Air-gap permeance model + trace RK4.** Real salient-pole geometry (pole shoe, non-uniform `g(θ)`), field `Br(θ)=μ0·F(θ)/g(θ)` with `F` = rotor (`I_f` via OCC curve) + stator (`I_d/I_q` via `ARM_COUPLE`), line integration via RK4 in rotor frame, classification of main vs leakage flux lines.

**Alternatives rejected:**
- **B (prettified schematic):** shape stays wrong, "unrealistic" complaint unanswered.
- **C (full FEM mesh):** YAGNI — heavy for 60fps, overkill for education.

---

## Structured Design

### Section 1 — Salient-Pole Geometry (new / extended `RGEO`)

| Parameter | Symbol | Meaning | Default |
|-----------|--------|---------|---------|
| `shoeArc` | α_shoe | Pole-shoe arc width (degrees, mechanical) | 70° |
| `shoeHeight` | h_shoe | Shoe protrusion above rotor surface (relative to R) | 0.05 |
| `shoeFlare` | f_shoe | Shoe-tip flare (0 = sharp, 1 = full) | 0.4 |
| `gapMin` | g_min | Air gap at pole face (minimum) | RGEO.gap (0.55) |
| `gapMax` | g_max | Air gap at interpolar (maximum) | gapMin × 2.2 |

Gap function: `g(θ) = gapMin + (gapMax - gapMin) · (1 - shoeMask(θ))`, with `shoeMask(θ)` = 1 inside the shoe arc, 0 outside, smooth cosine blend.

2-pole (round) conversion: `g(θ)` uniform (gapMax = gapMin), `shoeHeight` = 0. Backward-compatible.

Shoe coordinates: for pole `k` at angle `θ_k`, effective rotor surface `r_surface(θ) = rotorR + h_shoe · shoeMask(θ - θ_k)`. Flux lines exit perpendicular to this surface.

### Section 2 — Field Model `Br(θ)`

```
F_rotor(θ) = brRot · cos(pairs · θ_electrical_in_rotor_frame)
           = brRot · cos(θ_local)            [2-pole]
F_stator(θ) = armQ · cos(θ) + armD · sin(θ)  [armature reaction]
F_total(θ)  = F_rotor(θ) + F_stator(θ)
Br(θ)       = F_total(θ) / g(θ)              [non-uniform air-gap correction]
```

`brRot` = `getFluxDensity(If)` from OCC (`satCurve` :531-536 / `OCC_PEAK=1.55`).
`armQ`, `armD` from solver (`ARM_COUPLE=0.18`, :654-662).
Total flux Φ = ∫ Br(θ) dθ, basis for visual density.

### Section 3 — `traceFieldLine` Algorithm (replaces `buildFluxPath` :1451-1466)

Input: start angle `a0` (rotor frame), effective rotor radius `r0`, stator radius `r1`, `field` (rotor + stator + g(θ)).
RK4 integration:
```
dr = (r1 - r0) / N_step      (N_step = 24)
th = a0; r = r0
for i in 0..N_step:
  point.push([r cos th, r sin th])
  // Tangential flux component ∝ 1/g(θ), bends the trajectory
  dth = k · sin(pairs · th) · (dr / r) · (g_ref / g(th))   // k = curvature constant
  th += dth
  r  += dr
```
Output: point array → one `<path>` per line, plus midpoint + tangent angle for arrowhead.

**Line classification:**
- **Main:** reaches `r1` (stator yoke), crosses the full gap. Color `#2f6fb0`, `width ∝ local B`.
- **Leakage:** does not cross the gap — between poles or between slots, closes inside rotor/stator without reaching opposite polarity. Dashed, paler color (`#5a8fc0`), thin, count ∝ `armQ` + small `If`.
- **Leakage trace:** starts at pole side, rises slightly to shoe tip (`shoeFlare`), descends back to next pole — without crossing gap.

### Section 4 — Density vs `I_f` (replaces dead code + opacity-dominant behavior)

Single `density(If)` function replaces `fluxNorm`/`fluxCount` :1440-1441:
```
function density(If) {
  const sat = getFluxDensity(If)            // OCC, 0..1
  return Math.round(6 + 18 * Math.pow(sat, 0.7))   // 6..24, concave (saturation stated)
}
```
- I_f = 0.2 → sat≈0.15 → n≈10
- I_f = 1.0 → sat≈0.65 → n≈17
- I_f = 3.0 → sat≈0.98 → n≈24

Range 6→24 (4×), visible enough. `Math.pow(0.7)` spreads the range at low `If` (dominant normal operation) and compresses at high `If` (saturation).

Opacity narrowed: rebuild `0.70 + 0.25*min(1,brRot)` (:1491), remove or keep very narrow the per-frame override :1718 (`0.85+0.10*fn`). `stroke-width` becomes proportional to local `B` (`R*0.008 .. R*0.018`), `rMax` expands `0.92+0.07*brRot` (:1483) so the pattern is clear.

### Section 5 — `armD` (demagnetizing) Modulation

`armD = -Id * ARM_COUPLE` computed (:657) but unused. Now used as flux-total amplitude modulation, **capped at 30%**:

```
armD_factor = clamp(1 + field.armD, 0.7, 1.3)
F_rotor_eff  = F_rotor * armD_factor
```

- Overexcited (`Id < 0`, `armD > 0`): factor > 1 → flux strengthens, max +30%.
- Underexcited (`Id > 0`, `armD < 0`): factor < 1 → flux weakens, max −30%.
- Cap prevents the appearance of "collapse" — visually distinct from fault.
- Cache `Id` already in `fluxCache` (:1712), no new invalidation needed.

### Section 6 — N→S Direction Arrowhead

`traceFieldLine` returns the midpoint of the trajectory + tangent angle at that point. For each main path, add a `<path class="flux-arrow">` element — a small triangle at the midpoint, rotated to follow the tangent, pointing N→S (leaving N pole at `r0`, heading to S pole at `r1`). Explicit triangle chosen rather than SVG `marker-mid` — `marker-mid` attaches to EVERY interior vertex, not just the midpoint. Leakage lines get no arrowhead (direction is educationally ambiguous).

### Section 7 — Multi-Pole (4/6/8)

Template computed once in the local pole-pair frame. For `pairs` > 1: each pair = rotated copy of the template (`transform:rotate(...)` on the pair `<g>`). Separator between pairs (neutral line) is marked. Flux scope does **NOT** handle the mechanical scaling of `δ/pairs` — that is the phase scope, deferred.

### Section 8 — Legend Update

Add entries:
- Rotor pole shoe (bar magnets → shoe)
- Non-uniform air gap (arrow `g_min` / `g_max`)
- Leakage flux (thin dashed line)
- N→S direction (arrowhead)

Warning updated: "Air-gap permeance model + rotor/stator field superposition — NOT a full FEM mesh."

### Section 9 — Testing (extend `tools/realistic-field.test.js`)

**New:**
- Count of paths ∝ `I_f` monotonically increasing (3 sample points, check order).
- Leakage paths exist (id/class `leak-`, dashed, do not cross gap).
- `g(θ)` minimum at pole face, maximum at interpolar.
- One `<path>` per main line (not merged).
- Arrowhead: triangle at midpoint of main paths, direction N→S; leakage lines without arrowhead.
- `armD` effect: overexcited strengthens ≤30%, underexcited weakens ≤30%, never collapses.
- No call to `getVt()` / `sc_active` in path rebuild.

**Adjusted (behavior changes):**
- Test 5: count of `setAttribute('d')` may change (δ arc + new shoe may add writes).
- Test 8: opacity assertion replaced by path-count ∝ `I_f` assertion.
- Test 11: d/q axis stay, consistent.

### Section 10 — Performance

- Rebuild only on `fluxCache` change (`If/Id/Iq/poleCount/R`), unchanged.
- RK4 `N_step` = 24, `n` max 24, total paths per frame ≤ 24 + leakage (~8) = ~32 paths. Light.
- Rotation still `<g transform>`, not per-path.
- Dead-code removal reduces bundle.

---

## Impact & Risk

| Area | Impact | Mitigation |
|------|--------|------------|
| `buildFluxPath` :1451-1466 | Removed, replaced by `traceFieldLine` | All callers go through `rebuildFluxPaths` |
| `fluxNorm`/`fluxCount` :1440-1441 | Removed (dead code) | Zero callers |
| `rebuildFluxPaths` :1471-1496 | Rewritten | Cache keys unchanged |
| `updateSvgPhasorRealistic` :1717-1718 | Opacity override removed/narrowed | No visual regression at 2-pole |
| `drawRealisticLegend` :1770-1790 | New entries | Legend layout may need nudge |
| `tools/realistic-field.test.js` | Tests 5/8/11 adjusted, new tests added | Run `node tools/realistic-field.test.js` post-edit |
| Round-rotor 2-pole | Backward-compatible (g uniform, shoeHeight=0) | Visual test |

**Risk:** curvature constant `k` in RK4 trace may need visual calibration. **Mitigation:** manual browser test post-implementation.

---

## Boundaries

- Does **NOT** include mechanical scaling of `δ/poles` multi-pole (phase scope, deferred).
- Does **NOT** include asymmetric RMF marker, `i<6` → `coilsPerPhase` loop, slow-motion label (phase scope).
- Does **NOT** include changes to slider/control UI.
- **`armD` cap 30%** is a visualization assumption, not a measured physical limit.

---

## Done Criteria

- [ ] `traceFieldLine` replaces `buildFluxPath`, produces main + leakage lines.
- [ ] One `<path>` per line + N→S arrowhead.
- [ ] `density(If)` replaces dead code, range 6→24.
- [ ] `armD` modulates flux with 30% cap.
- [ ] Salient geometry: pole shoe + non-uniform `g(θ)`, 4/6/8 poles.
- [ ] Backward-compatible 2-pole (round rotor).
- [ ] Constant-flux-linkage preserved (no `getVt`/`sc_active` on path).
- [ ] All `node tools/realistic-field.test.js` green (43+ assertions).
- [ ] Full `npm test` green.
- [ ] Manual browser test: I_f slider changes density visibly, arrowhead present.

---

## Next Steps

1. User reviews this spec.
2. If approved → invoke `writing-plans` for per-stage TDD implementation plan.
3. Implementation: `tools/realistic-field.test.js` first (red), then code (green), then legend + visual calibration.
4. Phase illustration (mechanical `δ/poles` scaling, asymmetric RMF, coilsPerPhase loop, slow-motion label) deferred per user scope.
