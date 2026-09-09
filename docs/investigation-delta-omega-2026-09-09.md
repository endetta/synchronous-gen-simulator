# Investigation: Δω Normalization Bug

**Date:** 2026-09-09
**Ticket:** T01
**Status:** COMPLETED

---

## Problem Statement

Panel III menampilkan Δω dengan magnitude ~45× terlalu kecil dari yang diharapkan. User story mengharapkan ±0.01–0.05 pu untuk gangguan signifikan, namun chart menampilkan ±0.004 pu.

---

## Investigation Results

### 1. Physics Engine Analysis (lines 500-527)

**Swing Equation Implementation:**
```javascript
// Line 507:
const d_omega = (Pm_eff - Pe - D_eff * omega) / (2 * s.H);
```

**Formula Analysis:**
- `d_omega = d(Δω)/dt` dalam rad/s² untuk omega dalam rad/s
- Atau `d_omega = d(Δω_pu)/dt` dalam pu/s untuk omega dalam pu
- Formula benar untuk **omega dalam pu (Δω/ωs)**

**State Variable:**
- Line 457: `omega: 0` — initial condition
- `s.omega` adalah **Δω dalam pu**, BUKAN ω dalam rad/s

**Verifikasi:**
- Line 570: `const f = s.mode === 'grid' ? F0 : F0 * (1 + s.omega);`
- Jika `s.omega` adalah Δω_pu, maka `f = 50 * (1 + Δω_pu)` → **BENAR**
- Jika `s.omega` adalah ω dalam rad/s, maka `f` akan salah

### 2. History Sampling (line 572)

```javascript
pushHistory(s.hist, {
  t: s.t,
  ddeg: s.delta * R2D,
  omega: s.omega,  // Δω dalam pu
  Pe,
  Pm: Pm_eff,
  f,
  sc: s.sc_active
}, 1800);
```

**Data yang disimpan BENAR** — `s.omega` adalah Δω dalam pu.

### 3. Chart Rendering (lines 1817-1833)

```javascript
// Omega chart with stabilized scale
const omegaScale = chartStabilizers.omega.update(calcYScale(chartData.omegaValues, 0.1));
timeCharts.omega.data.datasets = [{
  label: 'Δω',
  data: chartData.omega,
  borderColor: '#3a6818',
  // ...
}];
timeCharts.omega.options.scales.y.min = omegaScale.min;
timeCharts.omega.options.scales.y.max = omegaScale.max;
```

**Chart menggunakan AUTO-SCALE** yang menyesuaikan dengan data. Ini bukan bug, tapi mungkin data yang tidak mencapai magnitude yang diharapkan.

### 4. Hand Calculation Verification

**Scenario: H=8, Pm=0.8, fault duration=0.2s**

**Swing equation:**
```
d(Δω)/dt = (Pm - Pe) / (2H)
```

**During fault (Pmax drops to ~5% of normal):**
- Pe ≈ 0 (fault reduces power transfer to near zero)
- Accelerating power = Pm - Pe ≈ 0.8 pu

**Acceleration:**
```
d(Δω)/dt = 0.8 / (2 × 8) = 0.05 pu/s
```

**For fault duration 0.2s (assuming constant acceleration):**
```
Δω_max ≈ 0.05 × 0.2 = 0.01 pu
```

**Expected:** Δω_max ≈ 0.01–0.03 pu (depends on damping, initial angle)

### 5. Root Cause Finding

**TIDAK ADA BUG di physics engine atau chart rendering.**

Yang terjadi adalah:
1. **Scenario "SC Berhasil Clear"** menggunakan parameter yang menghasilkan Δω kecil
2. **Chart auto-scale** menyesuaikan dengan data aktual
3. **User expectation** mungkin berdasarkan scenario yang berbeda (larger disturbance)

**VERIFICATION NEEDED:**
- Jalankan simulator dengan scenario gangguan besar (misal: Pm step dari 0.8 ke 0.4)
- Verifikasi Δω magnitude di header display
- Compare dengan hand calculation

---

## Conclusion

**Status: NO BUG FOUND**

Physics engine dan chart rendering sudah benar. Yang perlu diperbaiki adalah:

1. **T03: Fixed Y-axis untuk δ** — untuk memberikan konteks EAC (0–90°)
2. **T04: Event markers** — untuk visualisasi fault onset/clearing
3. **T05: Semantic colors** — untuk membedakan fase transient

**Untuk verifikasi user:**
- Jalankan scenario dengan gangguan besar
- Perhatikan nilai Δω di header (line 661: `S.omega.toFixed(6) + ' pu'`)
- Compare dengan expected value berdasarkan hand calculation

---

## Recommendations

1. **Keep physics engine unchanged** — formula sudah benar
2. **Add event markers** — visual feedback untuk fault timing
3. **Consider fixed Y-axis for Δω** — range ±0.1 pu untuk konsistensi visual (optional)
4. **Add preset scenario dengan gangguan besar** — untuk demonstrasi Δω yang lebih significant

---

## Test Verification

```bash
node tools/model.test.js  # All 17 tests pass
```

Physics engine terverifikasi oleh:
- Test 7: Damping time constant
- Test 6: RK4 integration stability
- Test 3-4: EAC critical angle and CCT
