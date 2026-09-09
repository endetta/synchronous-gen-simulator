# Spec: Critical Fixes for Synchronous Generator Simulator

**Tanggal:** 2026-09-09  
**Status:** Ready for Implementation  
**Priority:** CRITICAL  
**Estimasi:** 2-3 hari kerja  

---

## Problem Statement

Code review komprehensif (max ultracode) menemukan **1 bug FATAL** dan **10 bug HIGH** yang membuat simulator memberikan hasil tidak akurat secara fundamental. Bug paling kritis adalah implementasi governor TGOV1 yang tidak lengkap — missing reference power term — menyebabkan simulator tidak bisa mempertahankan setpoint daya dalam island mode.

Mahasiswa dan engineer yang menggunakan simulator ini akan belajar konsep yang **salah** tentang:
- Cara kerja governor dalam islanded generator
- Frekuensi grid-connected vs island mode
- Validasi input dan error handling

Ini berbahaya untuk tool edukasi karena kesalahan konseptual lebih buruk daripada tidak ada tool sama sekali.

---

## Solution

Perbaiki semua bug FATAL dan HIGH yang ditemukan dalam code review, dengan prioritas:

1. **FATAL**: Governor TGOV1 — tambahkan Pm_ref term
2. **HIGH**: Grid mode frequency — fixed 50 Hz
3. **HIGH**: Input validation — prevent NaN propagation
4. **HIGH**: Division by zero — guard Xs=0
5. **HIGH**: Security — add SRI integrity checks

Setelah fixes, simulator akan:
- Memberikan hasil akurat sesuai IEEE Std 421.5 dan Kundur 1994
- Menangani input invalid dengan graceful error messages
- Aman dari basic security issues (CDN compromise, MITM)

---

## User Stories

1. Sebagai **mahasiswa teknik elektro**, saya ingin melihat governor mempertahankan daya output saat frekuensi berubah di island mode, sehingga saya memahami konsep load-frequency control dengan benar

2. Sebagai **engineer operasi PLTU**, saya ingin melihat frekuensi tetap 50 Hz saat grid-connected terlepas dari power angle swing, sehingga saya memahami perbedaan infinite bus vs islanded operation

3. Sebagai **pengguna simulator**, saya ingin mendapat pesan error yang jelas saat saya input nilai invalid (huruf, kosong), sehingga saya tidak bingung kenapa simulator tiba-tiba blank

4. Sebagai **pengguna simulator**, saya ingin simulator tidak crash saat saya input Xs=0 (meski tidak masuk akal secara fisika), sehingga saya bisa eksperimen tanpa takut

5. Sebagai **dosen yang assign simulator sebagai homework**, saya ingin yakin bahwa mahasiswa belajar model yang benar sesuai literatur akademik (Kundur, IEEE Std), sehingga tidak perlu mengkoreksi miskonsepsi nanti

6. Sebagai **security-conscious user**, saya ingin CDN scripts di-verify integritasnya, sehingga saya tidak vulnerable terhadap supply chain attack

7. Sebagai **developer yang maintain simulator**, saya ingin test suite tetap 100% pass setelah fixes, sehingga tidak ada regression

8. Sebagai **mahasiswa yang simulasi lama (hours)**, saya ingin memory usage tidak meledak karena unbounded history array, sehingga browser saya tidak hang

9. Sebagai **pengguna simulator**, saya ingin error di animation loop tidak silent freeze seluruh UI, sehingga saya tahu ada yang salah dan bisa reload

10. Sebagai **reviewer code**, saya ingin PRD di-update mencerminkan realitas (Chart.js dependency), sehingga tidak ada konflik antara doc dan implementasi

---

## Implementation Decisions

### Module: Physics Engine (dalam `<script>` tag HTML utama)

#### Decision 1: Governor TGOV1 — Add Pm_ref Term

**Current (WRONG):**
```javascript
// Line 465
const d_Xg = gov ? (1/T1) * (-omega/R - Xg) : -Xg/0.05;
```

**Fixed (CORRECT per IEEE Std 421.5):**
```javascript
const d_Xg = gov ? (1/T1) * (s.Pm - omega/R - Xg) : -Xg/0.05;
```

**Rationale:**
- Governor harus maintain reference power `Pm` (user-set value)
- Tanpa Pm term, governor converges ke 0 instead of setpoint
- s.Pm adalah reference power yang di-set user via slider
- Formula sekarang match IEEE Std 421.5 TGOV1 model

**Test Seam:** `tools/model.test.js` — add test case:
```javascript
// Governor steady-state in island mode
// Given: island mode, omega=0 (synchronous speed), Pm=0.8
// Expected: Xg converges to Pm=0.8, NOT to 0
```

---

#### Decision 2: Grid Mode Frequency — Fix to 50 Hz Constant

**Current (WRONG):**
```javascript
// Lines 519, 608
const f = s.mode === 'grid' ? F0 * (1 + s.omega * 0.05) : F0 * (1 + s.omega);
```

**Fixed (CORRECT per PRD §3.1):**
```javascript
const f = s.mode === 'grid' ? F0 : F0 * (1 + s.omega);
```

**Rationale:**
- Grid-connected = infinite bus = frequency FIXED at 50 Hz
- Power angle δ can swing, tapi frequency tidak berubah
- Hanya island mode yang frequency varies dengan speed deviation
- Factor 0.05 tidak ada basis di Kundur atau IEEE standard

**Test Seam:** `tools/model.test.js` — verify:
```javascript
// Grid mode frequency stays 50 Hz
// Given: grid mode, omega varying -0.1 to +0.1
// Expected: f = 50.0 for all omega values
```

---

#### Decision 3: Input Validation — Prevent NaN Propagation

**Location:** `makeState()` (line 408-414), slider handlers

**New Helper Function:**
```javascript
function parseValidNumber(value, defaultVal, min, max, label) {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) {
    console.warn(`Invalid input for ${label}: "${value}", using default ${defaultVal}`);
    showUserWarning(`Input tidak valid untuk ${label}. Menggunakan nilai default: ${defaultVal}`);
    return defaultVal;
  }
  const clamped = Math.max(min, Math.min(max, parsed));
  if (clamped !== parsed) {
    console.warn(`${label} clamped from ${parsed} to ${clamped}`);
  }
  return clamped;
}
```

**Apply to All Inputs:**
```javascript
H: parseValidNumber(document.getElementById('sH').value, 8.0, 1, 15, 'Inertia H'),
D: parseValidNumber(document.getElementById('sD').value, 4.0, 0, 15, 'Damping D'),
Xs: parseValidNumber(document.getElementById('sXs').value, 1.2, 0.05, 3, 'Reactance Xs'),
// ... dst
```

**User-Facing Warning:**
Add HTML element:
```html
<div id="input-warning" style="display:none; position:fixed; top:70px; right:20px; 
     background:#ff6b35; color:#fff; padding:12px; border-radius:4px; 
     box-shadow:0 4px 12px rgba(0,0,0,0.2); z-index:9000;">
  <span id="warning-text"></span>
  <button onclick="document.getElementById('input-warning').style.display='none'" 
          style="margin-left:12px; background:rgba(255,255,255,0.3); border:none; 
          color:#fff; padding:4px 8px; cursor:pointer;">✕</button>
</div>
```

**Test Seam:** `tools/ui.test.js` — verify:
```javascript
// NaN input handling
// Given: user sets H = "abc"
// Expected: H remains at previous valid value or default, warning shown
```

---

#### Decision 4: Division by Zero — Guard Xs=0

**Location:** Lines 413-414, 434, 443

**Current:**
```javascript
function getPmax(s) {
  return s.sc_active ? s.Ef * s.V / s.Xs * s.sc_Pfact : s.Ef * s.V / s.Xs;
}
```

**Fixed:**
```javascript
function getPmax(s) {
  const Xs_safe = Math.max(s.Xs, 0.01); // Never allow Xs < 0.01 pu
  return s.sc_active ? s.Ef * s.V / Xs_safe * s.sc_Pfact : s.Ef * s.V / Xs_safe;
}
```

**Also guard in CCT calculation (line 444):**
```javascript
function getCC(s) {
  const Pmax = s.Ef * s.V / Math.max(s.Xs, 0.01);
  // ... rest
}
```

**Test Seam:** `tools/model.test.js` — verify:
```javascript
// Division by zero guard
// Given: Xs = 0
// Expected: Pmax calculated using Xs = 0.01, no Infinity/NaN
```

---

### Module: Security (HTML `<head>`)

#### Decision 5: Add SRI Integrity Checks

**Current:**
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.3.0/dist/chartjs-plugin-annotation.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js"></script>
```

**Fixed (with SRI):**
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js" 
        integrity="sha384-..." crossorigin="anonymous"></script>
<!-- Dst untuk plugin lainnya -->
```

**Action Required:**
1. Generate SRI hash untuk setiap CDN script:
   ```bash
   curl -s https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js | \
     openssl dgst -sha384 -binary | openssl base64 -A
   ```
2. Add integrity attribute dengan hash hasil
3. Add `crossorigin="anonymous"` untuk CORS

**Rationale:** Melindungi dari supply chain attack (CDN compromise).

---

### Module: Resource Management

#### Decision 6: Bound History Array

**Current:** Unbounded `hist` array grows indefinitely

**Fixed:**
```javascript
function pushHistory(s, entry) {
  s.hist.push(entry);
  
  // Keep only HWIN worth of data (30 seconds)
  const cutoffTime = entry.t - HWIN - 5; // 5s buffer
  if (s.hist.length > 0 && s.hist[0].t < cutoffTime) {
    // Remove old entries in chunks for efficiency
    const firstValidIdx = s.hist.findIndex(h => h.t >= cutoffTime);
    if (firstValidIdx > 100) { // Only splice if meaningful reduction
      s.hist.splice(0, firstValidIdx);
    }
  }
}
```

**Call Site:** Replace all `S.hist.push(...)` with `pushHistory(S, ...)`

**Test Seam:** `tools/model.test.js` — verify:
```javascript
// History array bounded
// Given: simulation runs for 200 seconds
// Expected: hist.length stays ~750 (30s / 0.04s), not 5000+
```

---

### Module: Error Handling

#### Decision 7: Global Error Handler for Animation Loop

**Add at top of animation function:**
```javascript
function animate() {
  try {
    // Existing animation code
    if (running) stepPhys(S, PHDT);
    drawPhasor();
    drawPdelta();
    if (chartUpdateCounter++ % 5 === 0) updateTimeCharts();
    
    S.anim++;
    requestAnimationFrame(animate);
  } catch (error) {
    console.error('Animation error:', error);
    running = false;
    showFatalError(`Simulator error: ${error.message}. Silakan reload halaman.`);
  }
}

function showFatalError(message) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(196, 32, 0, 0.95); color: #fff;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column; z-index: 10000; font-family: var(--serif);
  `;
  overlay.innerHTML = `
    <div style="font-size: 24px; font-weight: 700; margin-bottom: 16px;">⚠ SIMULATOR ERROR</div>
    <div style="font-size: 16px; margin-bottom: 24px;">${message}</div>
    <button onclick="location.reload()" 
            style="padding: 12px 24px; background: #fff; color: var(--etap); 
            border: none; border-radius: 4px; font-size: 14px; font-weight: 700;
            cursor: pointer;">RELOAD SIMULATOR</button>
  `;
  document.body.appendChild(overlay);
}
```

**Rationale:** Silent failures confuse users. Better to fail loudly dengan actionable message.

---

### Documentation Updates

#### Decision 8: Update PRD §5.2

**Current:**
> No dependencies: HTML self-contained

**Updated:**
> **Dependencies:** Chart.js 4.4.1 + plugins (CDN dengan SRI integrity checks) untuk time series visualization. HTML tetap single-file, no build step required.

**Also Update:**
- `docs/overview.md` — mention Chart.js integration
- `CLAUDE.md` — reflect Chart.js sebagai acceptable CDN dependency

---

## Testing Decisions

### What Makes a Good Test

**Test external behavior, bukan implementation details:**

✅ **Good:**
```javascript
// Test: Governor maintains setpoint in island mode
it('governor converges to Pm setpoint when omega=0 in island mode', () => {
  const s = makeState();
  s.mode = 'island';
  s.Pm = 0.8;
  s.omega = 0; // at synchronous speed
  
  // Run simulation for 10 seconds
  for (let i = 0; i < 10 / PHDT; i++) {
    stepPhys(s, PHDT);
  }
  
  // Pm_gov should converge to 0.8, not 0
  assertClose(s.Pm_gov, 0.8, 0.05, 'Governor output should match setpoint');
});
```

❌ **Bad:**
```javascript
// Test: Governor internal state variable value
it('Xg value at t=5.3s', () => {
  assertEqual(s.Xg, 0.673921); // brittle, implementation detail
});
```

### Modules to Test

1. **`tools/model.test.js`** — Physics engine
   - Governor steady-state (new test)
   - Grid vs island frequency (modified test)
   - Division by zero guards (new test)
   - History bounding (new test)

2. **`tools/ui.test.js`** — UI behavior
   - Input validation warnings (new test)
   - Error overlay display (new test)

3. **Manual Browser Testing** — Visual + integration
   - SRI integrity blocks tampered scripts
   - Warning messages display correctly
   - Error overlay shows and allows reload
   - Charts still render with SRI-protected Chart.js

### Prior Art

Existing test patterns di `tools/model.test.js`:
```javascript
describe('Swing Equation', () => {
  it('steady-state equilibrium', () => {
    // Setup initial state
    // Run simulation
    // Assert Pe ≈ Pm, omega ≈ 0
  });
});
```

Gunakan `assertClose(actual, expected, tolerance, message)` untuk floating-point comparisons.

---

## Out of Scope

**TIDAK termasuk dalam spec ini:**

1. **Code smells (LOW priority)** — mysterious names, magic numbers, data clumps
   - Akan di-address di refactoring sprint terpisah

2. **Performance optimization** — RK4 step size, animation throttling
   - Current performance acceptable untuk educational use

3. **New features** — AVR model, multi-machine, COMTRADE export
   - Masih UNSTABLE, fokus ke correctness dulu

4. **Mobile responsive** — desktop-first acceptable untuk lab/classroom use

5. **Refactoring Chart.js integration** — native Canvas/SVG rendering
   - Chart.js works, tidak perlu diganti sekarang
   - Pertimbangkan di LEVEL 2 consistency review nanti

6. **Test coverage untuk visualization code** — `drawPhasor()`, `drawPdelta()`
   - Visual output sulit di-automate test
   - Screenshot testing (`tools/shoot.js`) cukup untuk regression

---

## Further Notes

### Verification Checklist

Setelah implementasi, verifikasi:

- [ ] Run `node tools/model.test.js` — semua tests PASS
- [ ] Run `node tools/ui.test.js` — semua tests PASS  
- [ ] Run `node tools/chart-scale.test.js` — semua tests PASS (no regression)
- [ ] Manual: Input "abc" di H slider → warning muncul, tidak crash
- [ ] Manual: Set Xs=0 → tidak Infinity/NaN, simulasi tetap jalan
- [ ] Manual: Grid mode, trigger SC → frequency stays 50.0 Hz
- [ ] Manual: Island mode, change Pm → Pm_gov converges to new Pm
- [ ] Manual: Run simulation 5+ minutes → memory usage stable
- [ ] Manual: Tamper Chart.js CDN URL → SRI blocks execution
- [ ] Manual: Trigger error di console → error overlay shows
- [ ] Browser DevTools Console → no errors/warnings during normal operation

### Academic Reference Validation

Cross-check implemented fixes against:

1. **IEEE Std 421.5-2005**, Figure 1 (TGOV1 model)
   - Confirm Pm_ref term presence in speed governor

2. **Kundur (1994) §11.4** (Load-Frequency Control)
   - Confirm governor steady-state: Pm = Pm_ref - (ω / R)

3. **Anderson & Fouad (2003) §7.2** (Islanded Operation)
   - Confirm frequency deviation: f = f0(1 + ω) for island mode

### Breaking Changes

**NONE.** Semua fixes backward-compatible:
- User-facing UI tidak berubah
- Saved state format tidak berubah
- Preset scenarios tetap work

**Migration:** Users cukup hard refresh (Ctrl+F5) untuk load fixed version.

### Performance Impact

Estimated overhead dari fixes:

| Fix | Overhead | Justification |
|-----|----------|---------------|
| Input validation | ~0.1ms per input change | Negligible, only on user action |
| Division by zero guard | ~0.001ms per physics step | `Math.max()` call, negligible |
| History bounding | ~1ms per 100 entries removed | Amortized, happens every ~30s |
| Error try-catch | ~0.01ms per frame | Modern JS engines optimize this |
| SRI check | One-time at page load | No runtime overhead |

**Total runtime impact:** < 0.1% — imperceptible.

---

## Implementation Order

1. **Day 1 Morning:** Fix FATAL governor bug + add test
2. **Day 1 Afternoon:** Fix HIGH-01 grid frequency + add test
3. **Day 2 Morning:** Add input validation + UI warnings
4. **Day 2 Afternoon:** Add division guards + SRI integrity
5. **Day 3 Morning:** Add history bounding + error handler
6. **Day 3 Afternoon:** Update docs, run full test suite, manual verification

**Target Release:** 2026-09-12 (3 hari dari sekarang)

**Ready for Implementation:** ✅

---

**Prepared by:** Claude Code Review (Max Ultracode)  
**Review ID:** wf_ec618f07-746  
**Total Findings:** 24 (1 FATAL, 10 HIGH, 6 MEDIUM, 7 LOW)
