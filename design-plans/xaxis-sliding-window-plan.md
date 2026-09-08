# Plan: X-Axis Sliding Window untuk Data > 30 Detik

## Problem Analysis

### Current Behavior (BUG)
```
Time: 0-30s  → X-axis: 0-30s ✅ Data tampil
Time: 35s    → X-axis: 0-30s ❌ Data 30-35s TIDAK tampil
Time: 60s    → X-axis: 0-30s ❌ Data 30-60s TIDAK tampil
```

**Root Cause:**
```javascript
// Line 1352: xMax calculation is WRONG
const xMax = windowSize > HWIN ? windowEnd : HWIN;
//          ^^^^^^^^^^^^^^^^ always false at start
//          Then xMax = HWIN (30) forever!

// Line 1360: X-axis max stuck at 30
timeCharts.delta.options.scales.x.max = xMax;  // Always 30
```

### Expected Behavior (CORRECT)
```
Time: 0-30s  → X-axis: 0-30s   ✅ Data 0-30s
Time: 35s    → X-axis: 5-35s   ✅ Data 5-35s (sliding window)
Time: 60s    → X-axis: 30-60s  ✅ Data 30-60s (sliding window)
Time: 100s   → X-axis: 70-100s ✅ Data 70-100s (sliding window)
```

## Solution Design

### 1. Fix X-Axis Min/Max Calculation

**Current (WRONG):**
```javascript
const ts = Math.max(0, te - HWIN);
const xMax = windowSize > HWIN ? windowEnd : HWIN;
```

**Fixed (CORRECT):**
```javascript
const ts = Math.max(0, te - HWIN);  // Window start
const te = hist[hist.length-1].t;   // Window end (current time)

// X-axis min/max should match the window
const xMin = ts;  // Start dari ts, bukan 0
const xMax = te;  // End di te, bukan fixed HWIN
```

### 2. Update X-Axis Min Dynamically

**Current (INCOMPLETE):**
```javascript
timeCharts.delta.options.scales.x.max = xMax;  // Only set max
```

**Fixed (COMPLETE):**
```javascript
timeCharts.delta.options.scales.x.min = xMin;  // Set min too!
timeCharts.delta.options.scales.x.max = xMax;
```

### 3. Sliding Window Behavior

```
Phase 1: Growing Window (t < 30s)
┌─────────────────────────────────┐
│ 0 ---- t=15 ---- 30            │  xMin=0, xMax=15 (actual time)
└─────────────────────────────────┘
Window grows from 0 to 30 seconds

Phase 2: Sliding Window (t >= 30s)
┌─────────────────────────────────┐
│          25 ---- t=35 ---- 55   │  xMin=25, xMax=35
└─────────────────────────────────┘
Window slides right, always showing 30s of data
```

## Implementation Plan

### Step 1: Fix xMin and xMax Calculation
- [ ] Update `updateTimeCharts()` function
- [ ] Calculate `xMin = ts` (not always 0)
- [ ] Calculate `xMax = te` (not fixed HWIN)
- [ ] Apply to all 4 charts (delta, omega, power, freq)

### Step 2: Update X-Axis Configuration
- [ ] Set `x.min = xMin` dynamically
- [ ] Set `x.max = xMax` dynamically
- [ ] Ensure stepSize=5 still works with sliding window

### Step 3: Handle Edge Cases
- [ ] Simulation start (t=0-30s): xMin=0, xMax=t
- [ ] Sliding phase (t>30s): xMin=t-30, xMax=t
- [ ] Reset: Reset xMin to 0

### Step 4: Test Coverage
- [ ] Test: Data displays correctly at t=10s
- [ ] Test: Data displays correctly at t=30s
- [ ] Test: Data displays correctly at t=60s
- [ ] Test: Data displays correctly at t=100s
- [ ] Test: Sliding window smooth transition

## Code Changes

### File: LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html

**Location:** Function `updateTimeCharts()` around line 1343

**Changes:**
```javascript
function updateTimeCharts(){
  const hist=S.hist;
  if(hist.length<2||Object.keys(timeCharts).length===0)return;

  const te=hist[hist.length-1].t;
  const ts=Math.max(0,te-HWIN);
  const data=hist.filter(d=>d.t>=ts&&d.t<=te);

  // Calculate X-axis range with sliding window
  const xMin=ts;  // Window start (slides after 30s)
  const xMax=te;  // Window end (always current time)

  // Delta chart with stabilized scale
  const deltaData=data.map(d=>({x:d.t,y:d.ddeg}));
  const deltaScale=chartStabilizers.delta.update(calcYScale(data.map(d=>d.ddeg),0.1));
  timeCharts.delta.data.datasets=[{label:'δ',data:deltaData,borderColor:'#806000',backgroundColor:'rgba(128,96,0,0.05)'}];
  timeCharts.delta.options.scales.y.min=deltaScale.min;
  timeCharts.delta.options.scales.y.max=deltaScale.max;
  timeCharts.delta.options.scales.x.min=xMin;  // ADD THIS
  timeCharts.delta.options.scales.x.max=xMax;
  timeCharts.delta.update('none');

  // Repeat for omega, power, freq charts...
}
```

## Test Plan

### Test File: tools/xaxis-sliding-window.test.js (new)

```javascript
describe('X-Axis Sliding Window', () => {
  it('should show growing window at t=15s', () => {
    const te = 15;
    const ts = Math.max(0, te - 30);
    assertEqual(ts, 0, 'Window start should be 0');
    assertEqual(te, 15, 'Window end should be 15');
  });

  it('should show full window at t=30s', () => {
    const te = 30;
    const ts = Math.max(0, te - 30);
    assertEqual(ts, 0, 'Window start should be 0');
    assertEqual(te, 30, 'Window end should be 30');
  });

  it('should slide window at t=60s', () => {
    const te = 60;
    const ts = Math.max(0, te - 30);
    assertEqual(ts, 30, 'Window start should slide to 30');
    assertEqual(te, 60, 'Window end should be 60');
  });

  it('should slide window at t=100s', () => {
    const te = 100;
    const ts = Math.max(0, te - 30);
    assertEqual(ts, 70, 'Window start should slide to 70');
    assertEqual(te, 100, 'Window end should be 100');
  });
});
```

## Expected Result

After fix:
- ✅ Chart displays data from t=0 to t=30 (first 30s)
- ✅ At t=35, chart displays data from t=5 to t=35 (sliding window)
- ✅ At t=60, chart displays data from t=30 to t=60 (sliding window)
- ✅ Smooth sliding transition without blinking
- ✅ All data points visible, none lost

## Status: READY FOR IMPLEMENTATION

Priority: HIGH
Estimated time: 15 minutes
Complexity: LOW (simple logic fix)
