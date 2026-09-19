# Plan 003: Make Time-Series Sampling and Chart Commits Continuous

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report; do not improvise. Update `plans/README.md` when complete.
>
> **Drift check**: `git diff --stat 17f001b..HEAD -- "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools` and compare live code against the excerpts below. Preserve the existing uncommitted changes. Do not start by changing `HSTEP`, `CHART_UPDATE_INTERVAL`, `tension`, or `animation`; first run Plan 001's baseline.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: `plans/001-time-series-observability-seams.md`; preserve `plans/002-align-time-series-y-axis-origins.md` if it has landed.
- **Category**: perf
- **Planned at**: commit `17f001b`, 2026-09-19

## Why this matters

The current engine mixes simulation timing, history sampling, and presentation scheduling. A normal 60 FPS browser loop samples roughly every 16 ms, but a slow/stalled frame can advance up to 80 ms and still append only one history entry. Separately, charts commit on every fifth RAF, so their cadence depends on display frame rate rather than simulation time. The rolling 30-second window is then uniformly decimated to 600 points, which can change which samples represent the curve on each commit and can miss narrow fault extrema. The goal is a bounded, time-consistent stream that looks continuous without recreating the old 60 Hz full-redraw lag.

## Current state

- `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:536-567` integrates physics in `PHDT` substeps, but history is recorded only once after the loop at `:574-583` when `s.t-s.hlast>=HSTEP`.
- The current condition uses the final `s.t` and does not loop over missed deadlines. When one RAF takes longer than `HSTEP`, intermediate simulation-time samples are absent; when a frame is delayed, history cadence follows browser stalls.
- `:1722-1724` uses `chartUpdateCounter` and `CHART_UPDATE_INTERVAL=5`; this is approximately 12 Hz only at 60 FPS and is not a time-based presentation contract.
- `:1817-1831` takes `te` from the last history sample, filters the 30-second window, and calls `smartDecimate(windowData,600)`. `smartDecimate():1734-1753` keeps first/last points and evenly samples all interior indexes but does not explicitly preserve min/max/extrema or step transitions.
- `:1848-2095` replaces all datasets and calls four separate `update('none')` operations. There is no explicit begin/commit guard proving the four charts observe the same snapshot, although they currently run synchronously in one function.
- `:1613-1679` configures `animation.duration=150` but `updateTimeCharts()` passes `'none'` to every update. Do not assume the configured duration is causing the observed blink until the browser trace proves it.
- `:1716-1720` makes `resizeTimeCharts()` a no-op while `responsive:false` is active. `renderAll():2113-2117` still calls it on every RAF when not scrolling, but it does no work. Pane drag changes height at `:2233-2245`, so backing-canvas/layout freshness must be tested separately.
- The existing session note `design-plans/sesi-2026-09-09-01-fix-performance-lag.md` records why earlier work moved from 25 Hz history/4-6 Hz chart updates to 60 Hz history/12 Hz chart updates. That is historical context, not proof that the current implementation is visually smooth.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Baseline/regression | `node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js` | 17, 79, and 17 existing tests pass. |
| Time-series tests | `node tools/chart-smoothing.test.js && node tools/xaxis-stability.test.js && node tools/xaxis-sliding-window.test.js` | All scripts exit 0; update stale assumptions if they conflict with the measured live contract. |
| Browser/perf validation | `python -m http.server 8080` then use the browser/DevTools runner | Stable and fault traces show bounded frame time, sample cadence, commit cadence, and no console errors. |
| Diff hygiene | `git diff --check` | No whitespace errors. |

## Scope

**In scope**

- `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`: history scheduling inside `stepPhys()`, chart scheduling/data snapshot inside `updateTimeCharts()`, decimation policy, and coalesced resize observation if Plan 001 proves it is needed.
- Time-series regression tests under `tools/`.
- Browser/performance measurement output in ignored locations only.

**Out of scope**

- Do not change the swing equation, RK4 integrator, governor, fault state machine, EAC calculations, RLR physics, or simulation meaning.
- Do not change Panel I/II rendering, header cards, event-marker semantics, chart colors, or labels.
- Do not blindly raise redraw to every RAF, disable bounded history, remove decimation, or add a smoothing filter that changes peaks/steps.
- Do not alter CDN versions or add a chart library.

## Steps

### Step 1: Turn history recording into a deterministic simulation-time contract

Using the red seam from Plan 001, change history sampling so every elapsed `HSTEP` deadline crossed by the physics integration is handled deterministically. Prefer splitting an integration substep at the next history deadline so the recorded state has the correct timestamp; if the implementation chooses a simpler catch-up policy, it must never create duplicate timestamps and must document how state values are associated with each timestamp. Keep the history bounded to the 30-second window and preserve all existing fields (`t`, `ddeg`, `omega`, `Pe`, `Pm`, `f`, `sc`).

Handle reset by restoring the sampling accumulator/deadline with the state. Handle a large `rdt` cap without silently dropping multiple history deadlines. Do not call UI card/narrative updates once per catch-up sample unless measurement proves that is required; those side effects should remain bounded.

**Verify**: the cadence seam passes for steady RAF, a 100 ms stall, and repeated stalls; timestamps are strictly increasing, bounded by the simulation interval, and fault onset/clearing samples retain the correct `sc` phase.

### Step 2: Replace frame-count chart scheduling with a single time-based commit

Use the scheduler seam to replace `chartUpdateCounter` as the source of truth with a presentation deadline or elapsed simulation-time accumulator. Build one immutable chart snapshot (`te`, `ts`, window data, decimated data, scales, annotations) and apply it to all four charts from that snapshot. Keep the four `update('none')` calls in one synchronous commit unless browser measurement proves Chart.js can batch differently; the important contract is that all four charts receive the same `te`, `xMin`, and `xMax` before any update is observed.

When `isUserScrolling` is true, defer the commit without mutating half the charts. On resume, publish one complete latest snapshot and reset the presentation deadline to avoid a burst of stale commits. Keep x-window semantics `xMin=Math.max(0,te-HWIN)` and `xMax=te`.

**Verify**: the commit seam reports stable cadence based on simulation time under variable RAF intervals, exactly one update per chart per commit, equal final timestamps, and no partial commit while scrolling.

### Step 3: Make decimation preserve visually important behavior

Replace or extend `smartDecimate()` only after the baseline identifies data loss as a contributor. The decimator must always retain first and last points, preserve local extrema per bucket for continuous signals, and preserve both sides of a discontinuity/fault step when those points exist. It must return monotonically increasing timestamps and never exceed `MAX_CHART_POINTS`. Use the same selected index set for all datasets in a snapshot so Pe/Pm, f/nominal, and event alignment remain synchronized.

Do not apply cubic/tension smoothing across a fault discontinuity. If Chart.js line interpolation is changed, use linear/monotonic behavior for step-sensitive data and test a sinusoid plus a known step signal. `tension:0.2` is currently set in datasets at `:1848`, `:1957`, `:2025`, and `:2086`; validate whether it produces overshoot before changing it.

**Verify**: tests prove first/last preservation, extrema preservation, monotonic timestamps, bounded output, synchronized x values, and no overshoot or missing transition in sinusoid and fault-step fixtures.

### Step 4: Measure and fix canvas/layout invalidation separately

If Plan 001's baseline shows backing-canvas size or scale geometry changes after pane drag/viewport resize, implement one coalesced resize path owned by a `ResizeObserver` or a size-change check scheduled outside data commits. Never call `chart.resize()` on every RAF. Preserve `responsive:false` only if explicit resize updates the canvas backing dimensions correctly; otherwise use the minimal Chart.js-supported responsive configuration that does not reintroduce autoscroll.

**Verify**: after initial load, viewport resize, and pane drag, each canvas backing size matches its CSS size within the device-pixel-ratio contract, each chart resizes at most once per size change, and no chart data commit is generated solely by an unchanged RAF.

### Step 5: Compare candidate rates under a frame-budget gate

Test at least the current behavior and one conservative time-based cadence selected from the baseline. Measure RAF duration, chart commit duration, history length, and dropped-frame signals on the default desktop viewport and a narrow viewport. Choose the lowest commit latency that meets the visual continuity assertions; do not claim “smooth” from a unit test alone.

**Verify**: steady, load-step, Grid/Island, RLR, short-circuit, reset, 30-second sliding-window, scroll, and pane-resize scenarios pass; no scenario exceeds the agreed frame budget or produces console errors. Record the chosen cadence and rationale in the session log or current project overview after acceptance.

## Test plan

- Extend the Plan 001 cadence seam rather than testing private counters.
- Add scheduler cases for variable RAF intervals, long-frame catch-up, scroll pause/resume, reset, and a fault whose onset falls between chart commits.
- Add decimator cases for a sinusoid, narrow extrema, a step/fault transition, duplicate/near-duplicate timestamps, and a history buffer exactly at/over `MAX_CHART_POINTS`.
- Add an integration-style mock Chart registry asserting all four charts commit the same snapshot.
- Run `node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js` plus all new time-series tests; then perform browser traces for the required scenarios.

## Done criteria

- [ ] History cadence is deterministic under variable RAF timing and never emits duplicate/non-monotonic timestamps.
- [ ] Chart commits are time-based, bounded, and atomic across all four charts.
- [ ] Decimation preserves extrema and fault steps while keeping synchronized, bounded data.
- [ ] X-window moves continuously from `[0,t]` to `[t-30,t]` with no stale/fixed endpoint.
- [ ] Resize invalidation, if needed, is coalesced and not per-frame.
- [ ] All existing and new tests pass; browser traces show no console errors and meet the measured frame-budget gate.
- [ ] Physics/governor behavior and out-of-scope panels are unchanged.

## STOP conditions

- A proposed history fix changes RK4 integration results or fault/EAC state; stop and separate the model change.
- Catch-up sampling requires duplicate timestamps or invented values that cannot be justified from the simulation state; stop and report the interpolation decision.
- Decimation or interpolation hides/overshoots a fault step or changes a peak materially; use a segment-aware/linear strategy or stop for product input.
- Higher commit cadence regresses frame budget or recreates long-run lag; retain the bounded cadence and investigate data/layout cost instead.
- Chart.js resize behavior cannot be measured without a real browser canvas; stop rather than asserting dimensions from a mock.
- The live code has drifted beyond the excerpts and the change would touch files outside Scope.

## Maintenance notes

Future changes to simulation step size, history window, chart count, Chart.js plugin annotations, or pane layout must preserve the single-snapshot commit contract and add a targeted cadence/geometry test. Reviewers should inspect boundary timestamps around fault onset/clearing, the first and last visible points, and whether any smoothing crosses discontinuities. Keep the performance claims tied to recorded browser measurements, not synthetic operation counts alone.
