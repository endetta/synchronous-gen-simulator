# Spec: Time Series Visualization & Physics Accuracy Fixes

**Version:** 1.0
**Date:** 2026-09-09
**Status:** DRAFT
**Author:** Claude Code

---

## Problem Statement

Panel III (Time Series) menampilkan kurva δ, Δω, f, dan P yang secara kualitatif benar namun secara kuantitatif **TIDAK AKURAT** dan **TIDAK INFORMATIF** untuk analisis stabilitas transient. Masalah utama:

1. **Δω magnitude 45× terlalu kecil** — menunjukkan ±0.004 pu seharusnya ±0.01–0.05 pu untuk gangguan signifikan
2. **Y-axis δ tidak dimulai dari 0°** — menyesatkan persepsi amplitudo dan konteks EAC
3. **Tidak ada event markers** — fault onset/clearing tidak terlihat di time series
4. **Grid lines terlalu samar** — sulit membaca nilai kuantitatif
5. **Font size terlalu kecil** — tidak readable tanpa zoom
6. **Tidak ada coupling visible antara f dan Δω** — di island mode, f harus = 50 + Δω·50

Masalah ini menghambat tujuan edukasi simulator: user tidak dapat melakukan **analisis kuantitatif** atau memahami hubungan fisika antar variabel.

---

## Solution

Perbaikan komprehensif Panel III dalam 3 fase:

**Phase 1 (P0 - Critical):** Fix bug numerik dan visual paling mengganggu
- Perbaiki kalkulasi Δω normalization
- Fix Y-axis range untuk δ
- Tambahkan event markers (fault onset/clearing)

**Phase 2 (P1 - High):** Perbaikan readability dan UX
- Tingkatkan grid visibility
- Perbesar font size
- Tambahkan zero-line emphasis
- Implementasi semantic color coding (pre/during/post fault)

**Phase 3 (P2 - Medium):** Advanced features
- Implementasi downsampling untuk performa
- Tambahkan interactive tooltips
- Implementasi zoom/pan capability

---

## User Stories

### Phase 1 - Critical Fixes

1. Sebagai mahasiswa teknik elektro, saya ingin melihat nilai Δω yang akurat (±0.01–0.05 pu untuk gangguan besar), sehingga saya dapat memahami magnitude deviasi kecepatan rotor dan hubungannya dengan inertia.

2. Sebagai dosen pengajar stabilitas sistem tenaga, saya ingin Y-axis δ dimulai dari 0° atau minimal menampilkan δ₀ sebagai reference line, sehingga mahasiswa dapat melihat amplitudo osilasi relatif terhadap titik awal.

3. Sebagai praktisi proteksi, saya ingin melihat vertical dashed line pada saat fault onset dan clearing, sehingga saya dapat menghubungkan event di time series dengan visualisasi EAC di Panel II.

4. Sebagai peneliti, saya ingin melihat nilai Δω yang konsisten dengan hand calculation berdasarkan parameter H dan Pm, sehingga saya dapat memverifikasi model matematika simulator.

5. Sebagai user simulator, saya ingin yakin bahwa osilasi Δω yang ditampilkan realistis untuk PLTU 500 MW (H=6–10 s), sehingga saya dapat menggeneralisasi ke sistem nyata.

6. Sebagai engineer operasi, saya ingin melihat coupling antara Δω dan f di island mode, sehingga saya dapat memahami governor response terhadap perubahan beban.

7. Sebagai mahasiswa, saya ingin melihat perbedaan magnitude Δω antara grid-connected dan island mode, sehingga saya memahami efek damping infinite bus.

8. Sebagai developer simulator, saya ingin test otomatis yang memverifikasi Δω magnitude terhadap analytical solution, sehingga regression bug dapat terdeteksi sebelum user melihat.

9. Sebagai reviewer, saya ingin melihat bukti bahwa nilai Δω telah diverifikasi dengan solusi analitik swing equation, sehingga saya dapat mempercayai output simulator.

10. Sebagai user, saya ingin melihat nilai f yang berubah di island mode (49–51 Hz), sehingga saya dapat mengamati governor action real-time.

### Phase 2 - Readability & UX

11. Sebagai user dengan layar kecil, saya ingin grid lines yang terlihat jelas (opacity 0.3–0.5, thickness 0.5px), sehingga saya dapat membaca nilai tanpa zoom.

12. Sebagai user dengan visual impairment, saya ingin font size minimal 11px untuk axis labels, sehingga saya dapat membaca tanpa strain.

13. Sebagai analyst, saya ingin zero-line (y=0) di Δω dan P di-bold atau berwarna berbeda, sehingga saya dapat cepat mengidentifikasi posisi equilibrium.

14. Sebagai pengajar, saya ingin kurva berubah warna saat fault (merah) dan post-clearing (hijau), sehingga mahasiswa dapat dengan cepat mengidentifikasi fase transient.

15. Sebagai user, saya ingin legend yang jelas dan berada di luar plot area, sehingga tidak menutupi kurva.

16. Sebagai presenter, saya ingin aspect ratio Panel III konsisten dengan Panel I dan II, sehingga tampilan profesional saat diproyeksikan.

17. Sebagai user yang mencatat, saya ingin melihat nilai exact di tooltip saat hover, sehingga saya dapat mencatat angka presisi untuk laporan.

18. Sebagai praktisi, saya ingin melihat mode indicator (Grid/Island) di Panel III title, sehingga saya tahu konteks simulasi saat ini.

19. Sebagai user, saya ingin curve smoothing (anti-aliasing) yang baik, sehingga kurva tidak terlihat pixelated.

20. Sebagai presenter, saya ingin responsive design yang menyesuaikan font dan line thickness saat resize window.

### Phase 3 - Advanced Features

21. Sebagai peneliti, saya ingin zoom dan pan di time series, sehingga saya dapat melihat detail event tertentu (misalnya first-swing).

22. Sebagai analyst, saya ingin export data time series sebagai CSV, sehingga saya dapat analisis lanjutan di MATLAB/Python.

23. Sebagai developer, saya ingin downsampling otomatis untuk dataset >1000 points, sehingga chart tidak lag.

24. Sebagai user, saya ingin preset view buttons ("Full range", "Last 10s", "Fault event"), sehingga saya dapat cepat fokus ke area of interest.

25. Sebagai user, saya ingin toggle grid on/off, sehingga saya dapat memilih tampilan bersih atau detail sesuai kebutuhan.

26. Sebagai user di dark environment, saya ingin dark mode color scheme, sehingga saya dapat bekerja tanpa eye strain.

27. Sebagai power user, saya ingin configurable update rate (30/60 fps), sehingga saya dapat trade-off antara smoothness dan CPU usage.

28. Sebagai educator, saya ingin screenshot export dengan watermark "SHEVA'S SIMULATOR LIBRARY", sehingga saya dapat menggunakan untuk materi tanpa copyright issue.

29. Sebagai researcher, saya ingin annotation tool untuk menandai event di kurva, sehingga saya dapat membuat figure untuk paper.

30. Sebagai user, saya ingin multiple y-axis scales (left dan right), sehingga saya dapat melihat δ dan Δω bersamaan dengan range berbeda.

---

## Implementation Decisions

### 1. Δω Normalization Bug Fix

**Problem:** Current implementation menghitung `Δω = ω - ωs` dalam rad/s, lalu menampilkan langsung di pu. Ini menghasilkan nilai ~314 rad/s yang tidak meaningful.

**Root Cause (hypothesis):**
```javascript
// CURRENT CODE (line 661):
document.getElementById('hw').textContent = S.omega.toFixed(6) + ' pu';

// Expected: S.omega sudah normalized (Δω/ωs ≈ 0.01–0.05)
// Actual: S.omega mungkin masih dalam rad/s atau ada bug di ODE
```

**Investigation needed:**
1. Baca fungsi `ode()` dan `rk4()` di lines 500–527
2. Verifikasi formula: `d_omega = (Pm_eff - Pe - D_eff * omega) / (2*H)`
3. Cek apakah `omega` state variable adalah `Δω` (pu) atau `ω` (rad/s)
4. Hand-calculate untuk skenario: H=8, Pm=0.8, fault duration=0.2s → expected Δω_max ≈ ?

**Fix approach:**
- Jika `omega` sudah Δω (pu): tidak perlu normalisasi, mungkin bug di initial condition atau damping
- Jika `omega` adalah `ω` (rad/s): normalisasi dengan `Δω_pu = (omega - WS) / WS`

**Test verification:**
```javascript
// Unit test: node tools/model.test.js
// Tambahkan test case:
// Input: H=8, Pm=0.8, fault duration=0.2s
// Expected: Δω_max ≈ 0.02–0.05 pu (tunnel 20× tolerance untuk initial verification)
```

**Module affected:**
- Physics engine: `ode()`, `rk4()`, `stepPhys()`
- Display: `updateHdr()` line 661, `drawChart()` lines ~1400–1500

### 2. Y-Axis Range for δ

**Decision:** Fixed range dari 0° sampai 90° (π/2 rad) untuk konsistensi dengan EAC visual context.

**Rationale:**
- δ < 90°: zona stabil (Pe naik saat δ naik)
- δ > 90°: zona unstable (Pe turun saat δ naik)
- Menampilkan dari 0° membantu user melihat margin ke δ_cr

**Implementation:**
```javascript
// In Chart.js config for delta chart:
scales: {
  y: {
    min: 0,
    max: 90,
    ticks: { stepSize: 15 },
    title: { display: true, text: 'δ (degrees)' }
  }
}
```

**Alternative considered:** Auto-scale dengan buffer, tapi ini menyebabkan "patah-patah" dan tidak konsisten.

**Module affected:**
- Chart.js configuration: `initChart()` atau `updateChart()` function
- Line: cari `Chart` constructor atau `chart.options.scales`

### 3. Event Markers

**Decision:** Tambahkan vertical dashed line menggunakan Chart.js annotation plugin (sudah loaded).

**Implementation:**
```javascript
// Use chartjs-plugin-annotation
annotations: {
  faultOnset: {
    type: 'line',
    xMin: faultOnsetTime,
    borderColor: 'rgba(196,32,0,0.8)',
    borderWidth: 2,
    borderDash: [5, 5],
    label: {
      display: true,
      content: 'FAULT ON',
      position: 'start'
    }
  },
  faultClearing: {
    type: 'line',
    xMin: faultClearingTime,
    borderColor: 'rgba(10,112,64,0.8)',
    borderWidth: 2,
    borderDash: [5, 5],
    label: {
      display: true,
      content: 'FAULT CLEAR',
      position: 'start'
    }
  }
}
```

**Data required:**
- `S.sc_t0` + `S.sc_delay` = fault onset time
- `S.sc_t0` + `S.sc_delay` + `S.sc_dur` = fault clearing time

**Module affected:**
- Chart rendering function
- State machine: `stepPhys()` lines 539–545

### 4. Grid Line Visibility

**Decision:** Ubah grid style dari current (samar) ke visible (opacity 0.35, thickness 0.7px).

**Implementation:**
```javascript
// In Chart.js config:
grid: {
  color: 'rgba(58,68,101,0.35)',  // From rgba(?,?,?,0.1)
  lineWidth: 0.7,                  // From 0.3
  drawBorder: true,
  borderDash: []
}
```

**Module affected:**
- Chart.js grid configuration

### 5. Font Size

**Decision:** Font minimal 11px untuk axis labels, 12px untuk tick values.

**Implementation:**
```javascript
// In Chart.js config:
ticks: {
  font: {
    size: 12,  // From 10
    family: 'Courier New, monospace'
  }
},
title: {
  display: true,
  font: {
    size: 13,
    family: 'EB Garamond, serif'
  }
}
```

**Module affected:**
- Chart.js font configuration

### 6. Zero-Line Emphasis

**Decision:** Bold zero-line dengan stroke 1.5px dan warna berbeda (dark gray).

**Implementation:**
```javascript
// Add custom plugin or use annotation:
annotations: {
  zeroLine: {
    type: 'line',
    yMin: 0,
    yMax: 0,
    borderColor: 'rgba(58,68,101,0.8)',
    borderWidth: 1.5
  }
}
```

**Module affected:**
- Chart.js annotation plugin configuration

### 7. Semantic Color Coding

**Decision:** Warna kurva berubah berdasarkan fase: pre-fault (normal), during-fault (merah), post-clearing (hijau/normal).

**Implementation:**
```javascript
// Dynamic dataset color:
const getSegmentColor = (index, data, faultOnsetIdx, faultClearingIdx) => {
  if (index >= faultOnsetIdx && index < faultClearingIdx) {
    return 'rgba(196,32,0,1)';  // Fault color
  }
  return 'rgba(0,104,152,1)';   // Normal color
};

// Apply to Chart.js dataset:
datasets: [{
  data: deltaHistory,
  segment: {
    borderColor: ctx => getSegmentColor(
      ctx.p0DataIndex,
      ctx.chart.data,
      faultOnsetIdx,
      faultClearingIdx
    )
  }
}]
```

**Alternative:** Gunakan Chart.js `segment` feature (available di v3+).

**Module affected:**
- Chart dataset configuration
- State tracking untuk fault indices

### 8. Downsampling for Performance

**Decision:** Implementasi Largest-Triangle-Three-Buckets (LTTB) algorithm untuk downsample ke 300–500 points jika data > 1000 points.

**Rationale:**
- History window: 30s × 60 Hz = 1800 points
- Chart.js akan lag jika render semua points
- LTTB mempertahankan visual shape dengan 5× fewer points

**Implementation:**
```javascript
function lttb(data, threshold) {
  // Implementation from https://github.com/sveinn-steinarsson/flot-downsample
  // Returns downsampled array of {x, y} points
}
```

**When to apply:** Sebelum `chart.update()` call.

**Module affected:**
- Chart data preparation function
- New utility: `lttb()` function

---

## Testing Decisions

### Test Strategy

**Principle:** Test external behavior (physics accuracy, visual output), bukan implementation details (Chart.js internals).

### 1. Physics Accuracy Tests

**Module:** `tools/model.test.js`

**New test cases:**
```javascript
// Test 3: Δω Magnitude for Fault Event
describe('Δω Magnitude', () => {
  it('should produce Δω ≈ 0.02–0.05 pu for H=8, Pm=0.8, fault 0.2s', () => {
    // Setup: H=8, D=4, Xs=1.2, Ef=1.5, Pm=0.8
    // Run: 3-phase fault for 0.2s
    // Assert: max(|Δω|) ∈ [0.015, 0.055] pu (±50% tunnel untuk numerical tolerance)
  });
  
  it('should show larger Δω for smaller H (inverse relationship)', () => {
    // Compare H=4 vs H=8, same fault
    // Assert: Δω_max(H=4) ≈ √2 × Δω_max(H=8)
  });
  
  it('should decay exponentially with damping D', () => {
    // Assert: Δω(t) ≈ Δω_0 × exp(-D×t / 2H)
  });
});

// Test 4: Frequency-Ω Coupling in Island Mode
describe('f-Δω Coupling', () => {
  it('should show f = 50 + Δω×50 in island mode', () => {
    // Setup: island mode, Δω = 0.01 pu
    // Assert: f ≈ 50.5 Hz
  });
  
  it('should keep f = 50 Hz constant in grid mode', () => {
    // Setup: grid mode, any Δω
    // Assert: f === 50.0 Hz
  });
});
```

**Prior art:** Existing `model.test.js` already tests power-angle relationship and EAC formulas. Extend with Δω tests.

### 2. Visual Rendering Tests

**Module:** `tools/chart-scale.test.js` (extend)

**New test cases:**
```javascript
// Test: Y-axis range fixed at 0–90° for δ
describe('δ Y-Axis Range', () => {
  it('should have y-min = 0° for delta chart', () => {
    // Read Chart.js config
    // Assert: chart.options.scales.y.min === 0
  });
  
  it('should have y-max = 90° for delta chart', () => {
    // Assert: chart.options.scales.y.max === 90
  });
});

// Test: Grid line visibility
describe('Grid Line Styling', () => {
  it('should have grid opacity >= 0.3', () => {
    // Parse grid.color from rgba()
    // Assert: alpha >= 0.3
  });
  
  it('should have grid lineWidth >= 0.5px', () => {
    // Assert: grid.lineWidth >= 0.5
  });
});

// Test: Font size
describe('Font Size', () => {
  it('should have tick font size >= 11px', () => {
    // Assert: ticks.font.size >= 11
  });
  
  it('should have title font size >= 12px', () => {
    // Assert: title.font.size >= 12
  });
});
```

### 3. Integration Tests

**Module:** New `tools/timeseries.test.js`

**Test cases:**
```javascript
// Test: Full simulation run produces expected output
describe('Time Series Integration', () => {
  it('should produce stable oscillation after fault cleared', () => {
    // Run: fault scenario
    // Assert: δ returns to equilibrium within 10s
    // Assert: Δω decays to < 0.001 pu within 10s
  });
  
  it('should mark fault onset/clearing in annotation data', () => {
    // Run: trigger SC
    // Assert: chart.options.plugins.annotation.annotations.faultOnset exists
    // Assert: xMin value matches expected time
  });
});
```

### 4. Manual Browser Testing Checklist

**File:** `tools/manual-test-checklist.md`

```markdown
## Panel III Time Series - Manual Test Checklist

### Physics Accuracy
- [ ] Run "SC Berhasil Clear" preset → verify Δω magnitude realistic (±0.01–0.05 pu)
- [ ] Toggle Grid vs Island mode → verify f constant vs varying
- [ ] Adjust H slider → verify Δω amplitude changes inversely
- [ ] Adjust D slider → verify decay rate changes

### Visual Quality
- [ ] Open browser DevTools → check no console errors
- [ ] Verify Y-axis δ starts from 0°
- [ ] Verify grid lines visible without zoom
- [ ] Verify font readable at 100% zoom
- [ ] Trigger SC → verify vertical lines appear
- [ ] Verify zero-line emphasized

### Performance
- [ ] Run RLR simulation (36s) → verify no lag
- [ ] Check memory usage → no unbounded growth
- [ ] Check CPU usage → < 50% single core

### Responsiveness
- [ ] Resize window → verify chart redraws correctly
- [ ] Zoom browser → verify fonts scale properly
- [ ] Test on mobile viewport → verify touch-friendly
```

### 5. Regression Tests

**Strategy:** Run all existing tests (113 tests) sebelum dan sesudah changes.

```bash
# Pre-commit hook:
node tools/model.test.js && \
node tools/ui.test.js && \
node tools/chart-scale.test.js
```

**Expected:** All tests pass, no new failures.

---

## Out of Scope

1. **Panel I (Phasor) dan Panel II (P-δ)** — fokus hanya Panel III time series
2. **3D visualization** — tidak dibutuhkan untuk edukasi
3. **Audio feedback** — tidak relevan untuk use case
4. **Multi-language support** — UI sudah Bahasa Indonesia, tidak perlu localization
5. **Mobile app** — simulator diakses via desktop browser
6. **Cloud sync** — data tidak perlu disimpan lintas session
7. **AI-powered analysis** — di luar scope tool edukasi
8. **Real-time data import** — simulator pakai data sintetis
9. **Collaborative features** — single-user tool
10. **Performance optimization di bawah 30 fps** — Chart.js sudah cukup smooth

---

## Further Notes

### References
- Kundur, P. (1994). Power System Stability and Control. McGraw-Hill. §11.1 (Swing Equation)
- Anderson, P. M., & Fouad, A. A. (2003). Power System Control and Stability. §2.4 (Critical Clearing)
- IEEE Std 421.5-2005 (Governor TGOV1)
- Chart.js Documentation: https://www.chartjs.org/docs/latest/
- LTTB Algorithm: https://github.com/sveinn-steinarsson/flot-downsample

### Implementation Priority

**P0 (Critical - 1 sesi):**
1. Investigate dan fix Δω magnitude bug
2. Fix Y-axis range untuk δ (0–90°)
3. Add event markers (fault onset/clearing)

**P1 (High - 1-2 sesi):**
4. Improve grid visibility (opacity 0.35, thickness 0.7px)
5. Increase font size (min 11px)
6. Add zero-line emphasis
7. Implement semantic color coding

**P2 (Medium - 2-3 sesi):**
8. Implement LTTB downsampling
9. Add interactive tooltips
10. Add zoom/pan capability

### Estimated Effort
- **P0:** 4–6 jam kerja (investigasi + fix + test)
- **P1:** 6–8 jam kerja
- **P2:** 8–12 jam kerja
- **Total:** 18–26 jam kerja (~3–4 sesi full-time)

### Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Δω bug lebih kompleks dari dugaan | High | Medium | Reserve 2× waktu untuk investigasi; siap fallback ke workaround |
| Chart.js limitation untuk semantic coloring | Medium | Low | Gunakan segment plugin atau multiple datasets |
| Performance regression dari changes | Medium | Low | Profile dengan Chrome DevTools; rollback jika lag > 16ms |
| Existing tests fail setelah changes | High | Low | Incremental commits dengan test gate di setiap step |

### Success Criteria

**P0:**
- [ ] Δω magnitude realistis (±0.01–0.05 pu untuk fault 0.2s, H=8)
- [ ] Y-axis δ dimulai dari 0°
- [ ] Event markers muncul saat fault triggered

**P1:**
- [ ] Grid lines visible di 100% zoom tanpa strain
- [ ] Font readable tanpa zoom
- [ ] Zero-line clearly distinguished
- [ ] Kurva berubah warna saat fault

**P2:**
- [ ] Smooth scrolling untuk 1800 data points
- [ ] Tooltip menampilkan nilai exact
- [ ] Zoom/pan works untuk inspect detail

### Dependencies
- Chart.js 4.4.1 (sudah loaded)
- chartjs-plugin-annotation 3.3.0 (sudah loaded)
- chartjs-plugin-zoom 2.0.1 (sudah loaded, belum dipakai)

### Breaking Changes
- **None.** Semua changes backward-compatible. Chart API tidak berubah, hanya visual presentation.

### Rollback Plan
Jika P0 fixes menyebabkan regression:
1. Revert commit terakhir yang passing tests
2. Document bug findings di sesi log
3. Re-plan approach dengan informasi baru

---

## Appendix: Code Locations

**Physics Engine:**
- `ode()` function: lines 500–514
- `rk4()` function: lines 516–527
- `stepPhys()` function: lines 529–594
- State variable `S.omega`: line 457

**Chart Rendering:**
- Chart initialization: cari `new Chart(` atau `Chart.register(`
- Chart update: cari `chart.update()` atau `.data.datasets[`
- History push: lines 567–576

**Event Markers:**
- Fault state machine: lines 539–545
- Annotation config: cari `plugins: { annotation:` atau tambahkan jika belum ada

**UI Display:**
- Header Δω display: line 661
- Time series panel: `<canvas id="cv3">` line 195
