# Tickets: Time Series Visualization & Physics Accuracy Fixes

**Generated:** 2026-09-09
**Source:** `spec-time-series-audit-2026-09-09.md`
**Approach:** Vertical slice (tracer-bullet) dengan blocking dependencies

---

## Dependency Graph

```
T01 (Δω Investigation) ──┬──> T02 (Δω Fix) ──┬──> T05 (Semantic Colors)
                         │                    │
                         └──> T04 (Event Markers) ──> T05
                         
T03 (Y-Axis Range) ───────────────────────────────> T05

T06 (Grid Visibility) ──┐
T07 (Font Size) ────────┼──> T08 (Zero-Line) ──> T09 (Interactive Tooltips)
                        │
T05 ────────────────────┘

T09 ──────────────────────────────────────────────> T10 (Zoom/Pan)
T09 ──────────────────────────────────────────────> T11 (Export CSV)

T12 (Downsampling) ───────> T13 (Performance Test)
```

---

## Ticket List

### T01 — Investigate Δω Normalization Bug

**Priority:** P0-Critical
**Blocking:** T02, T04
**Blocked by:** —
**Estimate:** 2–3 hours

**User Story:**  
Sebagai developer, saya ingin mengetahui root cause mengapa Δω magnitude ~45× terlalu kecil, sehingga saya dapat memperbaiki dengan benar tanpa menyebabkan regresi di tempat lain.

**Acceptance Criteria:**
- [ ] Baca fungsi `ode()` dan `rk4()` di lines 500–527
- [ ] Verifikasi formula: `d_omega = (Pm_eff - Pe - D_eff * omega) / (2*H)`
- [ ] Tentukan apakah `omega` state variable adalah `Δω` (pu) atau `ω` (rad/s)
- [ ] Hand-calculate untuk skenario: H=8, Pm=0.8, fault duration=0.2s → expected Δω_max ≈ 0.02–0.05 pu
- [ ] Dokumentasikan temuan di `docs/investigation-delta-omega-2026-09-09.md`

**Implementation Notes:**
```javascript
// CURRENT CODE (line 661):
document.getElementById('hw').textContent = S.omega.toFixed(6) + ' pu';

// Expected: S.omega sudah normalized (Δω/ωs ≈ 0.01–0.05)
// Actual: S.omega mungkin masih dalam rad/s atau ada bug di ODE
```

**Test Command:**
```bash
node tools/model.test.js
```

---

### T02 — Fix Δω Normalization and Display

**Priority:** P0-Critical
**Blocking:** T05
**Blocked by:** T01
**Estimate:** 2–4 hours

**User Story:**  
Sebagai mahasiswa teknik elektro, saya ingin melihat nilai Δω yang akurat (±0.01–0.05 pu untuk gangguan besar), sehingga saya dapat memahami magnitude deviasi kecepatan rotor dan hubungannya dengan inertia.

**Acceptance Criteria:**
- [ ] Implementasi fix berdasarkan hasil investigasi T01
- [ ] Δω magnitude dalam range realistis (±0.01–0.05 pu untuk H=6–10, fault=0.2s)
- [ ] Nilai Δω konsisten dengan hand calculation (toleransi 20% untuk initial verification)
- [ ] Display Δω di header dengan format `+0.023 pu` atau `-0.015 pu` (sign visible)
- [ ] Chart Δω menampilkan range yang meaningful (auto-scale dengan buffer)
- [ ] Semua test di `tools/model.test.js` pass
- [ ] Tambah test case baru untuk Δω magnitude verification

**Implementation Notes:**
```javascript
// Possible fix (depends on T01 findings):
// Jika omega adalah ω (rad/s):
const deltaOmega_pu = (S.omega - WS) / WS;

// Jika omega sudah Δω tapi scale salah:
// Normalisasi dengan damping yang benar
```

**Test Command:**
```bash
node tools/model.test.js && node tools/ui.test.js
```

---

### T03 — Fix Y-Axis Range for δ Chart

**Priority:** P0-Critical
**Blocking:** T05
**Blocked by:** —
**Estimate:** 1–2 hours

**User Story:**  
Sebagai dosen pengajar stabilitas sistem tenaga, saya ingin Y-axis δ dimulai dari 0° sampai 90°, sehingga mahasiswa dapat melihat amplitudo osilasi dan konteks EAC (stability boundary).

**Acceptance Criteria:**
- [ ] Y-axis δ chart fixed range: 0° to 90°
- [ ] Tick marks setiap 15° (0, 15, 30, 45, 60, 75, 90)
- [ ] Horizontal reference line di δ₀ (initial angle) — optional, nice-to-have
- [ ] Horizontal reference line di δ_cr (critical angle) saat fault — optional
- [ ] Legend jelas menunjukkan satuan "degrees"
- [ ] Test visual: nilai δ tidak pernah di luar range 0–90° untuk scenario normal

**Implementation Notes:**
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

**Test Command:**
```bash
node tools/chart-scale.test.js
```

---

### T04 — Add Event Markers (Fault Onset/Clearing)

**Priority:** P0-Critical
**Blocking:** T05
**Blocked by:** T01
**Estimate:** 2–3 hours

**User Story:**  
Sebagai praktisi proteksi, saya ingin melihat vertical dashed line pada saat fault onset dan clearing, sehingga saya dapat menghubungkan event di time series dengan visualisasi EAC di Panel II.

**Acceptance Criteria:**
- [ ] Vertical dashed line di waktu fault onset (warna merah, label "FAULT ON")
- [ ] Vertical dashed line di waktu fault clearing (warna hijau, label "FAULT CLEAR")
- [ ] Marker muncul di semua 4 chart (δ, Δω, f, P) secara synchronized
- [ ] Marker hanya muncul saat SC event aktif ( tidak ada marker saat normal operation)
- [ ] Position marker akurat: `S.sc_t0 + S.sc_delay` (onset), `S.sc_t0 + S.sc_delay + S.sc_dur` (clearing)
- [ ] Gunakan `chartjs-plugin-annotation` (sudah loaded)

**Implementation Notes:**
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

**Test Command:**
```bash
node tools/ui.test.js
```

---

### T05 — Implement Semantic Color Coding

**Priority:** P1-High
**Blocking:** —
**Blocked by:** T02, T03, T04
**Estimate:** 3–4 hours

**User Story:**  
Sebagai pengajar, saya ingin kurva berubah warna saat fault (merah) dan post-clearing (hijau), sehingga mahasiswa dapat dengan cepat mengidentifikasi fase transient.

**Acceptance Criteria:**
- [ ] Pre-fault phase: warna normal (biru untuk δ, orange untuk Δω, dll.)
- [ ] During-fault phase: warna merah (rgba(196,32,0,1))
- [ ] Post-clearing phase: warna hijau atau kembali ke normal
- [ ] Color transition smooth tanpa visual glitch
- [ ] Legend menampilkan color key untuk setiap phase
- [ ] Implementasi menggunakan Chart.js segment feature atau dataset split

**Implementation Notes:**
```javascript
// Dynamic dataset color:
const getSegmentColor = (index, data, faultOnsetIdx, faultClearingIdx) => {
  if (index >= faultOnsetIdx && index < faultClearingIdx) {
    return 'rgba(196,32,0,1)';  // Fault color
  }
  if (index >= faultClearingIdx) {
    return 'rgba(10,112,64,1)';  // Post-clearing color
  }
  return 'rgba(48,128,232,1)';  // Normal color
};
```

**Test Command:**
```bash
node tools/chart-scale.test.js
```

---

### T06 — Improve Grid Line Visibility

**Priority:** P1-High
**Blocking:** —
**Blocked by:** —
**Estimate:** 1 hour

**User Story:**  
Sebagai user dengan layar kecil, saya ingin grid lines yang terlihat jelas (opacity 0.3–0.5, thickness 0.5px), sehingga saya dapat membaca nilai tanpa zoom.

**Acceptance Criteria:**
- [ ] Grid line opacity: 0.35 (dari ~0.1)
- [ ] Grid line thickness: 0.7px (dari ~0.3px)
- [ ] Grid color: `rgba(58,68,101,0.35)`
- [ ] Apply ke semua 4 chart
- [ ] Test visual: grid terlihat jelas tanpa mengganggu kurva

**Implementation Notes:**
```javascript
// In Chart.js config:
grid: {
  color: 'rgba(58,68,101,0.35)',
  lineWidth: 0.7,
  drawBorder: true,
  borderDash: []
}
```

**Test Command:**
```bash
node tools/ui.test.js
```

---

### T07 — Increase Font Size for Readability

**Priority:** P1-High
**Blocking:** —
**Blocked by:** —
**Estimate:** 1 hour

**User Story:**  
Sebagai user dengan visual impairment, saya ingin font size minimal 11px untuk axis labels, sehingga saya dapat membaca tanpa strain.

**Acceptance Criteria:**
- [ ] Axis tick values: 12px (dari 10px)
- [ ] Axis title: 13px (dari 10px)
- [ ] Legend text: 12px
- [ ] Font family: `Courier New, monospace` untuk ticks, `EB Garamond, serif` untuk titles
- [ ] Apply ke semua 4 chart

**Implementation Notes:**
```javascript
// In Chart.js config:
ticks: {
  font: {
    size: 12,
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

**Test Command:**
```bash
node tools/ui.test.js
```

---

### T08 — Add Zero-Line Emphasis

**Priority:** P1-High
**Blocking:** —
**Blocked by:** T06, T07
**Estimate:** 1–2 hours

**User Story:**  
Sebagai analyst, saya ingin zero-line (y=0) di Δω dan P di-bold atau berwarna berbeda, sehingga saya dapat cepat mengidentifikasi posisi equilibrium.

**Acceptance Criteria:**
- [ ] Zero-line stroke: 1.5px (dari 0.7px)
- [ ] Zero-line color: `rgba(58,68,101,0.8)` (lebih gelap dari grid)
- [ ] Hanya untuk chart Δω dan P (tidak untuk δ dan f)
- [ ] Gunakan `chartjs-plugin-annotation` atau custom plugin

**Implementation Notes:**
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

**Test Command:**
```bash
node tools/chart-scale.test.js
```

---

### T09 — Add Interactive Tooltips

**Priority:** P2-Medium
**Blocking:** T10, T11
**Blocked by:** T05, T06, T07, T08
**Estimate:** 2–3 hours

**User Story:**  
Sebagai user yang mencatat, saya ingin melihat nilai exact di tooltip saat hover, sehingga saya dapat mencatat angka presisi untuk laporan.

**Acceptance Criteria:**
- [ ] Tooltip menampilkan: waktu (t), nilai (presisi 4 decimal), nama variabel
- [ ] Tooltip muncul untuk semua data points
- [ ] Tooltip tidak memblokir kurva (position: 'nearest')
- [ ] Background semi-transparan dengan kontras tinggi
- [ ] Tooltip muncul di semua 4 chart secara synchronized (sama x-axis)

**Implementation Notes:**
```javascript
// Chart.js tooltip config:
plugins: {
  tooltip: {
    mode: 'index',
    intersect: false,
    callbacks: {
      label: function(context) {
        return `${context.dataset.label}: ${context.parsed.y.toFixed(4)}`;
      }
    }
  }
}
```

**Test Command:**
```bash
node tools/ui.test.js
```

---

### T10 — Implement Zoom and Pan

**Priority:** P2-Medium
**Blocking:** —
**Blocked by:** T09
**Estimate:** 2–3 hours

**User Story:**  
Sebagai peneliti, saya ingin zoom dan pan di time series, sehingga saya dapat melihat detail event tertentu (misalnya first-swing).

**Acceptance Criteria:**
- [ ] Zoom dengan mouse wheel atau pinch gesture
- [ ] Pan dengan drag
- [ ] Reset zoom button
- [ ] Zoom terbatas pada x-axis (waktu)
- [ ] Gunakan `chartjs-plugin-zoom` (sudah loaded)
- [ ] Semua 4 chart zoom secara synchronized

**Implementation Notes:**
```javascript
// Use chartjs-plugin-zoom
plugins: {
  zoom: {
    pan: {
      enabled: true,
      mode: 'x'
    },
    zoom: {
      wheel: {
        enabled: true
      },
      mode: 'x'
    }
  }
}
```

**Test Command:**
```bash
node tools/chart-scale.test.js
```

---

### T11 — Export Time Series Data as CSV

**Priority:** P2-Medium
**Blocking:** —
**Blocked by:** T09
**Estimate:** 2 hours

**User Story:**  
Sebagai analyst, saya ingin export data time series sebagai CSV, sehingga saya dapat analisis lanjutan di MATLAB/Python.

**Acceptance Criteria:**
- [ ] Tombol "Export CSV" di UI
- [ ] CSV columns: t, δ (deg), Δω (pu), f (Hz), Pe (pu), Pm (pu)
- [ ] Header row dengan nama kolom
- [ ] Presisi: 6 decimal places
- [ ] Filename: `sheva-time-series-YYYY-MM-DD-HHMMSS.csv`
- [ ] Download otomatis saat klik tombol

**Implementation Notes:**
```javascript
// Export function:
function exportCSV() {
  const csv = 't,δ (deg),Δω (pu),f (Hz),Pe (pu),Pm (pu)\n';
  S.hist.forEach(p => {
    csv += `${p.t.toFixed(6)},${p.ddeg.toFixed(6)},${p.omega.toFixed(6)},${p.f.toFixed(6)},${p.Pe.toFixed(6)},${p.Pm.toFixed(6)}\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sheva-time-series-${timestamp()}.csv`;
  a.click();
}
```

**Test Command:**
```bash
node tools/ui.test.js
```

---

### T12 — Implement LTTB Downsampling

**Priority:** P2-Medium
**Blocking:** —
**Blocked by:** —
**Estimate:** 3–4 hours

**User Story:**  
Sebagai developer, saya ingin downsampling otomatis untuk dataset >1000 points, sehingga chart tidak lag saat simulasi lama.

**Acceptance Criteria:**
- [ ] Implementasi Largest-Triangle-Three-Buckets (LTTB) algorithm
- [ ] Threshold: 1000 points → trigger downsampling
- [ ] Target: ~500 points setelah downsampling
- [ ] Preserves visual shape of curve (peak, valleys)
- [ ] Real-time downsampling saat pushHistory
- [ ] Tidak mempengaruhi data export (export full data, bukan downsampled)

**Implementation Notes:**
```javascript
// LTTB algorithm (simplified):
function lttb(data, threshold) {
  if (data.length <= threshold) return data;
  
  const sampled = [];
  const bucketSize = (data.length - 2) / (threshold - 2);
  
  sampled.push(data[0]); // Always keep first
  
  for (let i = 0; i < threshold - 2; i++) {
    // Find max triangle area point in bucket
    // ... (see Sveinn Steinarsson paper)
  }
  
  sampled.push(data[data.length - 1]); // Always keep last
  return sampled;
}
```

**Test Command:**
```bash
node tools/model.test.js
```

---

### T13 — Performance and Regression Test

**Priority:** P2-Medium
**Blocking:** —
**Blocked by:** T12
**Estimate:** 2 hours

**User Story:**  
Sebagai developer, saya ingin test otomatis yang memverifikasi performa dan akurasi setelah semua fitur diimplementasi, sehingga saya yakin tidak ada regresi.

**Acceptance Criteria:**
- [ ] Performance benchmark: rendering time < 16ms per frame (60fps)
- [ ] Memory profiling: tidak ada memory leak setelah 60 detik simulasi
- [ ] Visual regression test: screenshot comparison untuk 3 scenario (grid, island, fault)
- [ ] Physics accuracy test: Δω magnitude dalam tolerance
- [ ] All existing tests pass: `node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js`

**Implementation Notes:**
```javascript
// Performance test:
const start = performance.now();
for (let i = 0; i < 1000; i++) {
  drawChart();
}
const elapsed = performance.now() - start;
console.log(`Avg render time: ${elapsed / 1000}ms`);
// Should be < 16ms for 60fps
```

**Test Command:**
```bash
node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js
```

---

## Execution Order

**Sprint 1 (P0 - Critical):**
1. T01 — Investigate Δω Bug (blocking T02, T04)
2. T02 — Fix Δω Normalization (blocked by T01)
3. T03 — Fix Y-Axis Range (independent)
4. T04 — Add Event Markers (blocked by T01)

**Sprint 2 (P1 - High):**
5. T05 — Semantic Colors (blocked by T02, T03, T04)
6. T06 — Grid Visibility (independent)
7. T07 — Font Size (independent)
8. T08 — Zero-Line Emphasis (blocked by T06, T07)

**Sprint 3 (P2 - Medium):**
9. T09 — Interactive Tooltips (blocked by T05, T06, T07, T08)
10. T10 — Zoom and Pan (blocked by T09)
11. T11 — Export CSV (blocked by T09)
12. T12 — LTTB Downsampling (independent)
13. T13 — Performance Test (blocked by T12)

---

## Labels

- `P0-Critical`: Blocking lainnya, harus selesai di Sprint 1
- `P1-High`: Penting untuk UX, selesai di Sprint 2
- `P2-Medium`: Nice-to-have, selesai di Sprint 3
- `ready-for-agent`: Ticket siap dikerjakan oleh subagent
- `blocked`: Ticket menunggu dependency selesai
- `investigation`: Research task, tidak ada code change langsung

---

## Notes

- **Tracer-bullet approach:** T01 adalah single point of failure untuk Sprint 1. Jika investigasi membutuhkan waktu lebih lama, T03 bisa dikerjakan paralel.
- **Vertical slice:** Setiap sprint menghasilkan fitur yang user bisa lihat dan test.
- **Test coverage:** Setiap ticket harus menambah atau update test di `tools/*.test.js`.
- **Documentation:** Update `docs/spec-time-series-audit-2026-09-09.md` status setelah implementasi.
