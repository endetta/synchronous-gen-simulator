# Plan 001: Establish Observable Time-Series Scheduling and Layout Seams

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If a STOP condition occurs, stop and report; do not improvise. Update `plans/README.md` when complete.
>
> **Drift check**: `git diff --stat 17f001b..HEAD -- "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools` and `git diff --stat -- "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools`. The working tree already has unrelated user changes in the HTML and `tools/anim-mode-toggle.test.js`; do not revert them. If the time-series excerpts below no longer match, stop and report.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `17f001b`, 2026-09-19

## Why this matters

The reported symptom can come from at least three independent layers: history sample timing, chart commit cadence/data replacement, or canvas/layout movement. Existing tests assert synthetic constants and helper math but do not observe the actual `stepPhys()`/`updateTimeCharts()` contract. This plan creates a small, stable seam so later fixes can prove which layer changed and do not trade smoothness for renewed lag.

## Current state

- `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` is a single-file vanilla simulator. Physics is in `stepPhys()` around lines 536-601; Chart.js setup is in `initTimeCharts()` around 1546-1712; chart rendering is in `updateTimeCharts()` around 1805-2096; the main loop is around 2107-2138.
- Constants at lines 323-325 are `PHDT=0.003`, `HSTEP=0.016`, and `HWIN=30`.
- `stepPhys()` computes `cap=Math.min(rdt,0.08)`, subdivides it into `ceil(cap/PHDT)` physics steps, then records at most one history entry after the inner loop:

  ```javascript
  if(s.t-s.hlast>=HSTEP){
    const Pe=getPe(s);
    const Pm_eff=Math.min(Math.max(s.Pm+s.Pm_gov,0),3.5);
    const f=s.mode==='grid'?F0:F0*(1+s.omega);
    pushHistory(s.hist,{t:s.t,ddeg:s.delta*R2D,omega:s.omega,Pe,Pm:Pm_eff,f,sc:s.sc_active},1800);
    s.hlast=s.t;
  }
  ```

- `updateTimeCharts()` lines 1805-1815 returns while scrolling and otherwise increments `chartUpdateCounter`; it commits only when the counter reaches `CHART_UPDATE_INTERVAL=5` (line 1723). It then filters the full history, applies `smartDecimate(windowData,600)`, replaces all datasets, changes x/y options, and calls four `Chart.update('none')` calls at lines 1897, 1964, 2034, and 2095.
- `renderAll()` lines 2107-2117 calls `drawTime()` and the no-op `resizeTimeCharts()` once per RAF when not scrolling. `loop()` lines 2119-2126 advances physics and renders once per RAF.
- `resizeTimeCharts()` lines 1714-1720 immediately returns because resize was disabled to avoid layout thrashing. Charts are `responsive:false` (lines 1614-1619 and 1645-1650), so a pane resize has no normal Chart.js responsive path.
- Existing `tools/chart-smoothing.test.js`, `tools/performance.test.js`, and `tools/performance-fix.test.js` use copied constants or synthetic functions. They do not load the live scheduler and do not count four-chart batch commits. `tools/chart-scale.test.js` tests scale math and a placeholder DOM structure, not actual Chart.js scale geometry.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Existing physics/UI/chart regression | `node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js` | Existing suite passes: 17 + 79 + 17 tests. |
| Existing auxiliary chart tests | `node tools/chart-smoothing.test.js && node tools/xaxis-stability.test.js && node tools/xaxis-sliding-window.test.js` | All scripts exit 0; record actual counts/output. |
| Browser launch for runtime measurements | `python -m http.server 8080` from the project directory | Server serves the HTML; use a browser/DevTools session for measurements. Stop the server after validation. |

## Scope

**In scope**

- `tools/` test seam(s) needed to observe history cadence, chart commit batching, x-window progression, and Y-scale plot-origin geometry.
- Minimal test-only extraction or instrumentation that follows the existing Node harness style. If a browser-only assertion is required, add a focused Puppeteer/DevTools runner using the existing `package.json` dependency rather than adding a framework.

**Out of scope**

- Do not modify physics equations, governor constants, `PHDT`, `HSTEP`, chart colors, event marker copy, or Panel I/II.
- Do not change the existing uncommitted HTML edits, `tools/anim-mode-toggle.test.js`, docs, or session logs as part of this plan.
- Do not add a permanent production logger or change the CDN dependencies.

## Git workflow

- Work on the project branch already selected by the operator; do not commit or push unless explicitly requested.
- Preserve the repository's conventional commit style if the operator later asks for a commit.

## Steps

### Step 1: Add a history cadence characterization seam

Create a focused test helper in `tools/` that models the public contract of history recording: given a sequence of outer RAF durations and `PHDT`, it must report every recorded sample timestamp and enforce strictly increasing time. Include cases for steady 60 FPS, a 100 ms frame stall, and a frame stall crossing multiple `HSTEP` deadlines. The expected contract should state whether missed deadlines are intentionally coalesced or require catch-up; do not hide this choice in a tolerance.

**Verify**: run the new test alone. It must fail against the current one-record-after-inner-loop behavior for the multi-deadline stall case, or explicitly record the current coalescing behavior as the baseline if the test is only characterization. The output must identify sample count and timestamp gaps.

### Step 2: Add a chart commit/batch seam

Create a mock chart registry with four named charts. Exercise the scheduling contract over a deterministic RAF timeline and assert that a chart commit either updates all four charts once or updates none; no partial batch is allowed. Assert the x-window pair is monotonic and advances by the committed simulation-time delta, not by a hard-coded frame count. Include the scroll-paused case and assert that resuming produces one complete commit rather than four staggered updates.

**Verify**: the test exits 0 and reports commit count, per-chart update counts, and the final x-window. Against current code, document any expected failure as the red baseline before implementation; do not weaken assertions to make the current implementation pass.

### Step 3: Add a Y-axis geometry seam

Add a browser-capable test or a pure configuration seam that observes all four `scales.y` instances after Chart.js layout. Assert that `scale.left` (the plot origin) is identical within one CSS pixel, that the longest tick/title is not clipped, and that the assertion still holds after setting representative ranges for delta, omega, power, and frequency. Keep the test independent of exact label colors and values.

**Verify**: run the test in the actual Chart.js environment, not only a plain object mock. It must report the four left coordinates and the maximum observed difference. If the test cannot obtain a real canvas in the available environment, stop and report the environment limitation instead of replacing it with a tautological object assertion.

### Step 4: Capture a baseline before implementation

Run the existing suite and the new seams. In a browser, capture one stable-mode and one fault-mode trace of RAF interval, history sample interval, chart commit interval, four update counts, canvas width/height, and `scale.left` values. Use a short fixed run (for example 10 seconds) and record the viewport/pane dimensions. This is measurement evidence, not a pass/fail visual opinion.

**Verify**: baseline artifacts are kept outside tracked source or in ignored test output; `git status --short` shows no generated files that are not part of the planned test seam. Record whether the dominant symptom is cadence, data continuity, axis geometry, canvas sizing, or a combination.

## Test plan

- Model the history seam after the deterministic helper style in `tools/xaxis-sliding-window.test.js`, but assert actual scheduler behavior rather than copied expected constants.
- Model chart commit assertions after the existing named `describe`/`it` style in `tools/chart-scale.test.js`.
- Use the existing `puppeteer` dependency only if a real Chart.js/canvas measurement is needed; do not add a second browser framework.
- Required final verification: all existing tests plus every new seam pass, and the baseline report contains numerical cadence and geometry measurements.

## Done criteria

- [ ] A deterministic history cadence seam exists and covers a frame stall crossing more than one `HSTEP` interval.
- [ ] A four-chart batch/update seam exists and detects partial commits and frame-count-only assumptions.
- [ ] A real or explicitly browser-backed Y-axis geometry seam reports all four plot origins and clipping status.
- [ ] Baseline measurements exist for steady and fault runs.
- [ ] `node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js` exits 0.
- [ ] No files outside the test seam and allowed ignored output are modified.

## STOP conditions

- The live time-series excerpts do not match after drift inspection.
- The test would only pass by asserting a copied implementation detail instead of observed behavior.
- The browser environment cannot expose real canvas/Chart.js geometry; stop and report the missing capability.
- Baseline evidence shows the dominant problem is physics/model discontinuity rather than rendering; stop and route to a separate model audit.

## Maintenance notes

Future changes to `HSTEP`, the history buffer size, chart update cadence, Chart.js options, or pane resizing must update these seams and repeat both steady and fault baselines. Reviewers should reject tests that only compare synthetic constants to themselves or that measure CPU operations without asserting visible continuity contracts.
