# Critical Bugs Found - Animation Loop Error

## Error Message
```
⚠ SIMULATOR ERROR
Fatal error in animation loop.
Cannot read properties of null (reading 'setAttribute')
```

## Root Cause Analysis

### Bug #1: CRITICAL - querySelector without null checks (Lines 815-898)
**Severity:** FATAL - Causes animation loop crash

**Location:** `updateSvgPhasor()` function

**Problem:** Multiple `svg.querySelector()` calls without null checks:
- Line 815-818: `svg.querySelector('#ph-bgrect').setAttribute(...)`
- Line 858: `svg.querySelector('#ph-arc').setAttribute('visibility','hidden')`
- Line 867: `svg.querySelector('#ph-vt-h').setAttribute(...)`
- Line 878: `svg.querySelector('#ph-ef-h').setAttribute(...)`
- Line 890: `svg.querySelector('#ph-dlbl').setAttribute('visibility','hidden')`

**Trigger:** When SVG elements are not initialized or when switching animation modes.

**Impact:** If `initSvgPhasor()` fails or is interrupted, all these querySelector calls return `null` and crash on `.setAttribute()`.

---

### Bug #2: CRITICAL - Realistic mode querySelector without null checks (Lines 1067-1110)
**Severity:** FATAL - Causes animation loop crash

**Location:** `updateSvgPhasorRealistic()` function

**Problem:** querySelector calls without null checks:
- Line 1069-1075: `poleN.setAttribute()` / `poleS.setAttribute()` - both can be null
- Line 1081-1085: `rotorField.setAttribute()` - can be null
- Line 1091-1092: `statorField.setAttribute()` - can be null
- Line 1105-1106: `coil.setAttribute()` - can be null in loop

**Trigger:** When switching to realistic mode before `initSvgRealistic()` completes, or if init fails.

---

### Bug #3: HIGH - Race condition in animation mode switching
**Severity:** HIGH - Can trigger Bug #1 or #2

**Location:** `setAnimMode()` function (Line 1808-1813)

**Problem:** 
```javascript
function setAnimMode(mode){
  if(!S) return;
  S.animMode=mode;
  // Immediately switches mode flag
  // But updateSvgPhasor() is called next frame and dispatches to updateSvgPhasorRealistic()
  // If initSvgRealistic() hasn't run yet, querySelector returns null
}
```

**Trigger:** User clicks "Realistis" button → mode switches → next RAF calls `updateSvgPhasor()` → dispatches to `updateSvgPhasorRealistic()` → elements not initialized → null.setAttribute() → CRASH.

---

### Bug #4: MEDIUM - initSvgRealistic uses S.delta before S check (Line 1034-1036)
**Severity:** MEDIUM - Can cause incorrect initialization

**Location:** `initSvgRealistic()` function

**Problem:**
```javascript
const poleAng=S?S.delta:0;  // Line 1035
svg.appendChild(mkSvg('text',{id:'pole-N',x:cx+rotorR*0.6*Math.cos(poleAng-Math.PI/2),...}));
```

**Issue:** S is checked, but if S is null during init, poleAng=0 is used. Not fatal but incorrect.

---

## Why This Causes "Cannot read properties of null (reading 'setAttribute')"

1. User switches to realistic mode via button
2. `setAnimMode('realistic')` sets `S.animMode='realistic'`
3. Next animation frame calls `loop()` → `renderAll()` → `updateSvgPhasor()`
4. `updateSvgPhasor()` checks `S.animMode==='realistic'` and dispatches to `updateSvgPhasorRealistic()`
5. `updateSvgPhasorRealistic()` calls `svg.querySelector('#pole-N')` → **returns null** (not initialized yet)
6. Code tries `poleN.setAttribute('x', ...)` → **CRASH: Cannot read properties of null**

OR:

1. User toggles panel visibility or resizes window
2. `phasorReady=false` is set, triggering re-init
3. `initSvgPhasor()` clears `svg.innerHTML=''`
4. Before re-init completes, animation frame runs
5. `querySelector()` returns null → **CRASH**

---

## Solution Strategy

### Fix Priority
1. **CRITICAL:** Add null checks to all querySelector calls in both phasor modes
2. **CRITICAL:** Add null checks in updateSvgPhasorRealistic
3. **HIGH:** Add initialization guard in realistic mode switch
4. **MEDIUM:** Improve error handling in animation loop

### Implementation Plan
1. Create defensive helper functions for element access
2. Add null checks before all setAttribute calls
3. Add initialization state tracking
4. Add try-catch in specific risky sections
5. Run existing test suite to verify no regressions
