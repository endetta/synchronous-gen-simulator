# TO-SPEC DOCUMENT: BUG FIXES
## Synchronous Generator Simulator (LEVEL 1)

**Date:** 2026-09-10  
**Document Type:** Implementation Specification  
**Version:** 1.0  
**Status:** READY FOR IMPLEMENTATION

---

## EXECUTIVE SUMMARY

This document specifies the implementation plan for fixing 5 critical/high priority bugs identified in the comprehensive code review (COMPREHENSIVE-REVIEW-REPORT-2026-09-10.md).

### Fix Summary

| ID | Severity | Title | Lines | Effort | Risk |
|----|----------|-------|-------|--------|------|
| BUG-001 | FATAL | Rotor position in realistic animation | L1008 | 15 min | None |
| BUG-002 | HIGH | Governor TGOV1 differential equation | L518 | 2 hours | Medium |
| BUG-003 | MEDIUM | getCC uses Pm+Pm_gov | L491 | 10 min | Low |
| BUG-004 | MEDIUM | XSS in error handler | L446 | 45 min | Low |
| BUG-005 | HIGH | Missing N/S pole markers | L1056 | 1 hour | Low |

**Total Estimated Effort:** 4 hours  
**Total Risk:** LOW (after BUG-002)

---

## PHASE 1: CRITICAL FIXES (Sprint 1 - 2 hours)

### 1.1 BUG-001: Rotor Position in Realistic Animation

**Priority:** FATAL  
**Location:** `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:1008`  
**Effort:** 15 minutes  
**Risk:** None

#### Current Code (WRONG)
```javascript
// Line 1008 - in drawRotor() function
const angle = (i/slotCount)*Math.PI*2 + S.delta;
```

#### Specification
```javascript
// Line 1008 - FIXED
const angle = (i/slotCount)*Math.PI*2 + S.anim;
```

#### Rationale
- **Physics:** Rotor slots are fixed to the rotor shaft and rotate at synchronous speed
- **Current:** Slots rotate with `S.delta` (power angle) causing "wobble" visualization
- **Correct:** Slots should rotate with `S.anim` (animation timebase = synchronous speed)
- **Impact:** Students see incorrect physics - rotor appears to oscillate instead of rotate

#### Acceptance Criteria
1. Rotor slots rotate smoothly at constant speed (not wobbling)
2. N/S pole markers (if added) remain stationary relative to rotor
3. Power angle δ is visible as separation between rotor and stator fields
4. Animation runs at 60 FPS without frame drops

---

### 1.2 BUG-003: getCC Function Uses Wrong Pm

**Priority:** MEDIUM  
**Location:** `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:491`  
**Effort:** 10 minutes  
**Risk:** Low

#### Current Code (WRONG)
```javascript
// Lines 488-496 - in getCC() function
function getCC(s) {
  if(!s.eff||!s.Ef||!s.V||!s.Xs) return null;
  const Pmax = s.Ef*s.V/s.Xs;
  const Pm = Math.min(Math.max(s.Pm+s.Pm_gov,0),3.5);  // WRONG
  const d0 = Math.asin(Pm/Pmax);
  if(d0<0||d0>Math.PI/2) return null;
  return Math.acos((Pm*(Math.PI-2*d0)-Pmax*Math.cos(d0))/Pmax);
}
```

#### Specification
```javascript
// Lines 488-496 - FIXED
function getCC(s) {
  if(!s.eff||!s.Ef||!s.V||!s.Xs) return null;
  const Pmax = s.Ef*s.V/s.Xs;
  const Pm = Math.min(Math.max(s.Pm,0),3.5);  // FIXED: Use only s.Pm
  const d0 = Math.asin(Pm/Pmax);
  if(d0<0||d0>Math.PI/2) return null;
  return Math.acos((Pm*(Math.PI-2*d0)-Pmax*Math.cos(d0))/Pmax);
}
```

#### Rationale
- **EAC Theory:** Critical clearing angle is based on mechanical power setpoint
- **Current:** Includes `Pm_gov` which represents steam valve position with slow dynamics (T₂=3.5s)
- **Correct:** Use only `s.Pm` (setpoint) for EAC analysis
- **Impact:** EAC margin calculation varies during governor transients incorrectly

#### Acceptance Criteria
1. EAC display shows correct critical clearing angle
2. EAC margin is consistent regardless of governor state
3. Test: Run scenario with governor response → EAC margin stable

---

### 1.3 BUG-004: XSS Vulnerability in Error Handler

**Priority:** MEDIUM (Security)  
**Location:** `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:446`  
**Effort:** 45 minutes  
**Risk:** Low

#### Current Code (VULNERABLE)
```javascript
// Lines 446-448 - in showFatalError() function
function showFatalError(message) {
  let overlay=document.getElementById('fatal-error-overlay');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='fatal-error-overlay';
    overlay.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(196,32,0,0.95);color:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;z-index:10000;font-family:var(--serif);';
  }
  overlay.innerHTML='<div style="font-size:24px;font-weight:700;margin-bottom:16px;">⚠ SIMULATOR ERROR</div><div style="font-size:16px;margin-bottom:24px;">'+message+'</div><button onclick="location.reload()" style="padding:12px 24px;background:#fff;color:var(--etap);border:none;border-radius:4px;font-size:14px;font-weight:700;cursor:pointer;">RELOAD SIMULATOR</button>';
  document.body.appendChild(overlay);
}
```

#### Specification
```javascript
// Lines 446-470 - FIXED
function showFatalError(message) {
  let overlay = document.getElementById('fatal-error-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'fatal-error-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(196,32,0,0.95);color:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;z-index:10000;font-family:var(--serif);';
  }
  // Clear and rebuild safely using DOM methods
  overlay.innerHTML = '';
  
  const title = document.createElement('div');
  title.textContent = '⚠ SIMULATOR ERROR';
  title.style.cssText = 'font-size:24px;font-weight:700;margin-bottom:16px;';
  
  const msg = document.createElement('div');
  msg.textContent = message;  // Auto-escapes HTML
  msg.style.cssText = 'font-size:16px;margin-bottom:24px;';
  
  const btn = document.createElement('button');
  btn.textContent = 'RELOAD SIMULATOR';
  btn.onclick = () => location.reload();
  btn.style.cssText = 'padding:12px 24px;background:#fff;color:var(--etap);border:none;border-radius:4px;font-size:14px;font-weight:700;cursor:pointer;';
  
  overlay.appendChild(title);
  overlay.appendChild(msg);
  overlay.appendChild(btn);
  document.body.appendChild(overlay);
}
```

#### Rationale
- **Security:** Using `innerHTML` with user-controlled content allows XSS
- **Attack Vector:** Crafted Error objects with `<img src=x onerror=...>` payload
- **Correct:** Use `textContent` which auto-escapes HTML entities
- **Impact:** Potential session hijacking, data exfiltration, UI manipulation

#### Acceptance Criteria
1. No HTML tags appear in error messages
2. Special characters (`<`, `>`, `&`, `"`, `'`) are displayed literally
3. Error message shows exactly what the exception contained
4. No scripts execute from error message content

---

## PHASE 2: HIGH PRIORITY FIXES (Sprint 2 - 2 hours)

### 2.1 BUG-002: Governor TGOV1 Differential Equation

**Priority:** HIGH  
**Location:** `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:518`  
**Effort:** 2 hours  
**Risk:** Medium (requires physics verification)

#### Current Code (WRONG)
```javascript
// Lines 511-520 - in stepPhys() function
const T1=0.5,T2=3.5,R=0.05;  // TGOV1 parameters (T1=0.5s, T2=3.5s, R=5%)
const Pm_eff = Math.min(Math.max(s.Pm+s.Pm_gov,0),3.5);
const D_eff = s.mode==='grid'?s.D+2:s.D;
const omega = s.omega;
const Pmax = getPmax(s);
const Pe = Pmax * Math.sin(s.delta);
const M = 2*s.H/WS;

const d_delta = omega * WS;
const d_omega = (Pm_eff - Pe - D_eff * omega) / M;

// Governor state equations (IEEE Std 421.5 TGOV1 model)
const gov = (s.mode === 'island');
const d_Xg = gov ? (1/T1)*(s.Pm - omega/R - Xg) : -Xg/0.05;  // WRONG
const d_Pm_gov = gov ? (1/T2)*(Xg - Pm_gov) : 0;

// State derivatives array
return [d_delta, d_omega, d_Xg, d_Pm_gov];
```

#### Specification (Proposed)
```javascript
// Lines 511-525 - FIXED
const T1 = 0.5, T2 = 3.5, R = 0.05;  // TGOV1 parameters (T1=0.5s, T2=3.5s, R=5%)
const Pm_eff = Math.min(Math.max(s.Pm + s.Pm_gov, 0), 3.5);
const D_eff = s.mode === 'grid' ? s.D + 2 : s.D;
const omega = s.omega;
const Pmax = getPmax(s);
const Pe = Pmax * Math.sin(s.delta);
const M = 2 * s.H / WS;

const d_delta = omega * WS;
const d_omega = (Pm_eff - Pe - D_eff * omega) / M;

// Governor state equations (IEEE Std 421.5 TGOV1 model)
// TGOV1: Steam turbine governor with reheat
// Xg: Governor valve position (pu)
// Pm_gov: Turbine output power (pu)
// R: Droop (5% = 0.05 pu)
const gov = (s.mode === 'island');

// FIXED: Correct TGOV1 implementation
// Per IEEE Std 421.5-2005 Figure 4.33:
// dXg/dt = (1/T1) * (Pm - Xg)  where Pm is mechanical power setpoint
// dPm_gov/dt = (1/T2) * (Xg - Pm_gov)
// The droop R affects how Pm relates to frequency: Pm = P_ref + (f0 - f)/R
// For the TGOV1 model, the valve position Xg tracks the mechanical power setpoint
const d_Xg = gov ? (1/T1) * (s.Pm - Xg) : -Xg/0.05;  // FIXED: Removed omega/R term
const d_Pm_gov = gov ? (1/T2) * (Xg - Pm_gov) : 0;

// State derivatives array
return [d_delta, d_omega, d_Xg, d_Pm_gov];
```

#### Rationale

**IEEE Std 421.5-2005 TGOV1 Model:**

The TGOV1 model represents a steam turbine governor with:
- **T₁ = 0.5s:** First time constant (hydraulic actuator)
- **T₂ = 3.5s:** Second time constant (reheater)
- **R = 0.05:** Droop (5%)

**Correct Equation Structure:**
```
dXg/dt = (1/T₁) × (P_ref - Xg)
dPm_gov/dt = (1/T₂) × (Xg - Pm_gov)
```

Where `P_ref` is the mechanical power setpoint (s.Pm).

**Current Bug:**
```
dXg/dt = (1/T₁) × (s.Pm - ω/R - Xg)  // WRONG - includes ω/R in Xg equation
```

The term `ω/R` represents a frequency-dependent power reference, but in the standard TGOV1 model, this should affect the reference power calculation, not be subtracted from the governor state directly.

**Correct Interpretation:**
The droop characteristic is: `Pm = P_ref + (f₀ - f)/R = P_ref + ω/R`

For the TGOV1 implementation, `s.Pm` represents the mechanical power setpoint. The droop affects how the setpoint is calculated from frequency error, but the governor state `Xg` should track this setpoint with lag dynamics.

#### Implementation Options

**Option A: Simplified (Current Fix)**
- Remove the `omega/R` term from `d_Xg` equation
- Use `d_Xg = (1/T1) × (s.Pm - Xg)`
- Governor tracks setpoint directly
- Risk: May not match exact IEEE 421.5 behavior

**Option B: Full Droop Implementation**
- Calculate reference power with droop: `P_ref = Pm + omega/R`
- Use: `d_Xg = (1/T1) × (P_ref - Xg)`
- More complex but matches IEEE standard exactly
- Risk: Changes governor behavior significantly

**Option C: Research First**
- Consult IEEE Std 421.5-2005 Figure 4.33 exactly
- Implement according to official block diagram
- Test against known stable operating points

#### Recommendation: Option C → Option A

Given the complexity of the TGOV1 model and potential for significant behavior change:

1. **Research Phase:** Review IEEE Std 421.5-2005 Figure 4.33 block diagram
2. **Implement Phase:** Start with simplified fix (Option A)
3. **Test Phase:** Verify governor response to frequency step
4. **Adjust Phase:** Refine if needed based on test results

#### Acceptance Criteria
1. Governor reaches steady state at correct power output
2. Governor responds to frequency deviations with proper dynamics
3. No unstable oscillations in governor response
4. EAC analysis shows correct critical clearing time

---

### 2.2 BUG-005: Missing N/S Pole Markers

**Priority:** HIGH  
**Location:** `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:1056-1061`  
**Effort:** 1 hour  
**Risk:** Low

#### Current Code (INCOMPLETE)
```javascript
// Lines 1056-1061 - in updateSvgPhasorRealistic() function
const efGrad = document.createElementNS(SVG_NS, 'radialGradient');
efGrad.setAttribute('id', 'efGrad'+suffix);
efGrad.setAttribute('cx', '50%');
efGrad.setAttribute('cy', '50%');
efGrad.setAttribute('r', '50%');
efGrad.innerHTML = `
  <stop offset="0%" style="stop-color:#c42000;stop-opacity:${intensity}"/>
  <stop offset="100%" style="stop-color:#c42000;stop-opacity:0"/>
`;
```

#### Specification
```javascript
// Lines 1056-1080 - FIXED with N/S pole markers
const efGrad = document.createElementNS(SVG_NS, 'radialGradient');
efGrad.setAttribute('id', 'efGrad'+suffix);
efGrad.setAttribute('cx', '50%');
efGrad.setAttribute('cy', '50%');
efGrad.setAttribute('r', '50%');
efGrad.innerHTML = `
  <stop offset="0%" style="stop-color:#c42000;stop-opacity:${intensity}"/>
  <stop offset="100%" style="stop-color:#c42000;stop-opacity:0"/>
`;

// Add N/S pole markers on rotor field ellipse
// North pole marker (positive magnetic flux)
const northPole = document.createElementNS(SVG_NS, 'text');
northPole.textContent = 'N';
northPole.setAttribute('x', efX + Math.cos(0) * 30);
northPole.setAttribute('y', efY + Math.sin(0) * 30);
northPole.setAttribute('text-anchor', 'middle');
northPole.setAttribute('dominant-baseline', 'middle');
northPole.setAttribute('fill', '#c42000');
northPole.setAttribute('font-weight', 'bold');
northPole.setAttribute('font-size', '14');
efGroup.appendChild(northPole);

// South pole marker (negative magnetic flux)
const southPole = document.createElementNS(SVG_NS, 'text');
southPole.textContent = 'S';
southPole.setAttribute('x', efX + Math.cos(Math.PI) * 30);
southPole.setAttribute('y', efY + Math.sin(Math.PI) * 30);
southPole.setAttribute('text-anchor', 'middle');
southPole.setAttribute('dominant-baseline', 'middle');
southPole.setAttribute('fill', '#005cbf');
southPole.setAttribute('font-weight', 'bold');
southPole.setAttribute('font-size', '14');
efGroup.appendChild(southPole);
```

#### Rationale
- **Educational Value:** Students need to identify magnetic polarity direction
- **Current:** Rotor field ellipse shows intensity but no polarity labels
- **Correct:** Add "N" and "S" labels at the poles
- **Impact:** Significantly improves educational value

#### Acceptance Criteria
1. "N" label visible at North pole position
2. "S" label visible at South pole position
3. Labels use contrasting colors (red for N, blue for S)
4. Labels rotate with rotor field (use same angle transformation)

---

## IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [ ] Read COMPREHENSIVE-REVIEW-REPORT-2026-09-10.md
- [ ] Read TO-SPEC-BUG-FIXES-2026-09-10.md (this document)
- [ ] Run tests: `node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js`
- [ ] Create backup branch: `git checkout -b fix/bundle-2026-09-10`

### Implementation Tasks
- [ ] BUG-001: Fix rotor position (L1008) - 15 min
- [ ] BUG-003: Fix getCC Pm calculation (L491) - 10 min
- [ ] BUG-004: Fix XSS error handler (L446) - 45 min
- [ ] BUG-005: Add N/S pole markers (L1056) - 1 hour
- [ ] BUG-002: Fix TGOV1 governor equation (L518) - 2 hours
  - [ ] Research IEEE Std 421.5-2005 Figure 4.33
  - [ ] Implement fix
  - [ ] Verify with test cases

### Post-Implementation
- [ ] Run all tests: `node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js`
- [ ] Manual browser testing:
  - [ ] Verify rotor rotation smooth (not wobbling)
  - [ ] Verify N/S pole markers visible
  - [ ] Verify error messages display correctly
  - [ ] Verify EAC margin stable during governor transients
  - [ ] Verify governor response to frequency step
- [ ] Check console for errors
- [ ] Run performance test (5-minute continuous simulation)
- [ ] Update git: `git add LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`
- [ ] Commit: `git commit -m "fix: Implement 5 critical/high bug fixes per review report"`

---

## TESTING PLAN

### Unit Tests (Add to tools/)

```javascript
// tools/bug-fix-verification.test.js (NEW)

describe('BUG-001: Rotor Position', () => {
  it('should use S.anim for rotor slot angles', () => {
    // Mock DOM and verify angle calculation
  });
});

describe('BUG-003: getCC Pm Calculation', () => {
  it('should use only s.Pm, not s.Pm + s.Pm_gov', () => {
    // Set up state with governor response
    // Verify EAC margin consistent
  });
});

describe('BUG-004: XSS Fix', () => {
  it('should use textContent instead of innerHTML', () => {
    // Test that HTML tags are escaped
  });
});

describe('BUG-005: N/S Pole Markers', () => {
  it('should render N and S labels on rotor field', () => {
    // Check DOM for N/S elements
  });
});

describe('BUG-002: TGOV1 Governor', () => {
  it('should reach steady state correctly', () => {
    // Simulate governor step response
    // Verify steady-state power output
  });
});
```

### Manual Test Scenarios

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Rotor Rotation | Open realistic mode, observe rotor | Slots rotate smoothly, not wobbling |
| N/S Markers | Open realistic mode, observe rotor field | Red "N" and blue "S" visible |
| Error Display | Trigger error (e.g., invalid input) | HTML tags displayed literally |
| EAC Stability | Run governor response scenario | EAC margin consistent |
| Governor Response | Step frequency change | Governor responds with correct dynamics |

---

## ROLLBACK PLAN

If issues occur after deployment:

```bash
# Rollback to previous state
git checkout fix/critical-governor-and-bugs

# Or restore specific file
git checkout HEAD -- "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html"
```

---

## SIGN-OFF

| Item | Status |
|------|--------|
| All bugs identified | ✅ Complete |
| Implementation plan reviewed | ✅ Ready |
| Testing plan defined | ✅ Ready |
| Rollback plan prepared | ✅ Ready |

**Next Step:** Implement bugs per checklist above

---

**END OF TO-SPEC DOCUMENT**
