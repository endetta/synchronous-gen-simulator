# Plan 002: Align All Time-Series Y-Axis Plot Origins

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report; do not improvise. Update `plans/README.md` when complete.
>
> **Drift check**: `git diff --stat 17f001b..HEAD -- "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools` and inspect the live `initTimeCharts()` excerpts before editing. Preserve the existing uncommitted HTML changes.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: `plans/001-time-series-observability-seams.md`
- **Category**: bug
- **Planned at**: commit `17f001b`, 2026-09-19

## Why this matters

Panel III renders four independent Chart.js canvases, each with a different Y-axis title/tick range. Chart.js computes each Y scale's intrinsic width independently, so the visible plot starts at different x coordinates: `f (Hz)` and `δ (deg)` occupy more label width than `P (pu)` and `Δω (pu)`. A shared Y-scale width will make the four curves visually comparable without changing values, order, or physics.

## Current state

- `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:1613-1679` defines `baseOptsNoX` and `baseOptsWithX`; both use `responsive:false`, Y ticks with `padding:4`, and independent Y scales.
- `:1684-1707` creates four Chart.js instances. Each instance spreads the base scale and supplies a different Y title: `δ (deg)`, `Δω (pu)`, `P (pu)`, and `f (Hz)`.
- `:1848-1852`, `:1957-1961`, `:2024-2031`, and `:2084-2092` update each chart's Y range independently on every chart commit.
- `resizeTimeCharts():1714-1720` is currently a deliberate no-op. Do not re-enable per-frame resize here; Plan 003 owns coalesced resize behavior.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Regression suite | `node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js` | 17, 79, and 17 existing tests pass. |
| Axis-related tests | `node tools/xaxis-stability.test.js && node tools/xaxis-sliding-window.test.js` | Both scripts exit 0. |
| Browser measurement | `python -m http.server 8080` then open the HTML in a browser | Four charts render and runtime seam from Plan 001 can inspect scale geometry. |

## Scope

**In scope**

- `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`, only `initTimeCharts()` Y-scale configuration.
- The axis geometry regression seam created by Plan 001, or `tools/chart-scale.test.js` if it can observe the real config without weakening the assertion.

**Out of scope**

- No changes to labels, font sizes, chart order, colors, Y numeric ranges, physics, data sampling, x-windowing, or Panel I/II.
- No CSS margin/padding hack on wrappers. The defect is Chart.js internal scale width, so fix the common scale layout owner.
- No per-frame call to `resizeTimeCharts()`.

## Steps

### Step 1: Make the shared width contract explicit

Define one named Y-axis width constant or one shared scale-layout helper in `initTimeCharts()`. Apply it to every Y scale through Chart.js's scale fit hook (`afterFit`) or an equivalent supported layout hook so each instance receives the same final width after measuring its own title/ticks. The shared width must be at least the maximum intrinsic width observed for the four labels/tick sets at the active font, plus the existing padding.

Do not use four numeric widths. Do not overwrite the title or tick callbacks to make labels shorter. Keep the existing delta fixed range and dynamic omega/power/frequency ranges unchanged.

**Verify**: the configuration has one shared width owner and all four chart instances use it; the test from Plan 001 reports equal `scale.left` values within one CSS pixel and no clipped title/tick.

### Step 2: Cover runtime states

Run the geometry seam after initial load, after a reset, after switching Grid/Island, during a fault, and after changing the pane height. Ensure the common width remains valid when frequency and omega ranges change. If changing pane height exposes stale backing-canvas dimensions, stop and hand that symptom to Plan 003 rather than adding a resize call here.

**Verify**: all states report the same plot-origin coordinate within one CSS pixel; the maximum difference and clipping result are printed by the test.

### Step 3: Preserve the existing local changes and regression behavior

Review the diff to ensure the existing uncommitted `pane3` height, SVG cache reset, animation-mode guard, and drag-scroll edits remain intact. Run all relevant tests.

**Verify**: `git diff --check` exits 0; `node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js` exits 0; axis tests exit 0.

## Test plan

- Add a regression assertion that all four real Chart.js Y scales have equal plot starts, independent of exact pixel value.
- Add a clipping assertion using the longest labels/ticks seen in the four current charts.
- Exercise initial, reset, Grid/Island, fault, and resized-pane states in the browser-backed test where available.
- Do not replace the real geometry assertion with a check that four config objects contain the same constant; that only proves the implementation text, not rendered alignment.

## Done criteria

- [ ] One shared Y-axis width/layout owner is applied to all four charts.
- [ ] Plot origins differ by no more than one CSS pixel in all required states.
- [ ] No title or tick is clipped at the tested font and viewport.
- [ ] Numeric Y ranges and chart data are unchanged.
- [ ] Existing and axis-specific tests pass.
- [ ] No files outside the HTML and axis test seam are modified.

## STOP conditions

- Chart.js applies `afterFit` before the final width is known and the result cannot be made stable; stop and report the observed lifecycle instead of adding a layout loop.
- The shared width clips any label/tick; measure the maximum requirement and revise the constant, never shrink text or alter labels to hide it.
- The problem is actually canvas scaling or pane geometry rather than Y-scale width; stop and continue with Plan 003.

## Maintenance notes

Any new time-series chart or longer Y-axis title must reuse the shared width owner and add a clipping/plot-origin case. Reviewers should check that alignment is measured from actual `scale.left`/plot geometry, not inferred from wrapper CSS.
