# Plan: Realistic Magnetic Field Visualization

**Status:** DRAF
**Dibuat:** 2026-09-09
**Sumber:** `docs/research-magnetic-fields.md`
**Target:** Mode Realistis di Panel I

---

## Ringkasan

Mengimplementasikan visualisasi medan magnet realistis untuk generator sinkron di Panel I. Visualisasi ini akan menunjukkan interaksi antara medan magnet stator (rotating field dari 3 fasa) dan medan magnet rotor (dari eksitasi DC), serta bagaimana interaksi ini menghasilkan tork dan power angle (δ).

**Tujuan edukasi:** User memahami bahwa:
1. Stator field berputar pada kecepatan sinkron (ωs)
2. Rotor field "terkunci" dan mengikuti stator field
3. Power angle (δ) adalah selisih sudut antara kedua field
4. Eksitasi (Ef) mengontrol kekuatan medan rotor

---

## Arsitektur Visual

### Komponen Utama

```
┌─────────────────────────────────────────────────────────┐
│  STATOR (Statis)                                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │  • Outer ring (housing)                           │  │
│  │  • Core ring (laminated iron)                     │  │
│  │  • 36 slots dengan kumparan 3-fasa                │  │
│  │  • Phase A (merah), B (kuning), C (biru)          │  │
│  │  • Rotating field indicator (vektor hijau)        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  ROTOR (Berputar dengan δ)                        │  │
│  │  • Cylindrical body (turbo generator)             │  │
│  │  • Pole N-S indication (berputar)                 │  │
│  │  • Field winding intensity (proporsional Ef)      │  │
│  │  • Rotor field vector (vektor oranye)             │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  POWER ANGLE (δ)                                  │  │
│  │  • Arc antara stator field dan rotor field        │  │
│  │  • Label nilai δ real-time                        │  │
│  │  • Color-coded: hijau (aman), kuning (warning)    │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  PHASE CURRENT INDICATORS                         │  │
│  │  • 3 sinusoidal waves untuk Ia, Ib, Ic            │  │
│  │  • Update real-time (animasi)                     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  LEGEND & DATA PANELS                             │  │
│  │  • Keterangan komponen visual                     │  │
│  │  • Status: δ, Ef, Pmax, Power Factor              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Fase Implementasi

### Fase 1: Struktur Dasar (Core Visualization)

**Tujuan:** Membuat struktur visual statis dan animasi rotasi dasar.

**Komponen yang dibangun:**

1. **Stator Cross-Section**
   - Outer ring (housing) - grey
   - Core ring (laminated iron) - gradient
   - 36 slots (garis radial)
   - 18 kumparan 3-fasa (6 per fase, 60° apart)
     - Phase A: merah (#C85000)
     - Phase B: kuning (#B07000)
     - Phase C: biru (#1050C0)

2. **Rotor Cross-Section**
   - Cylindrical body (untuk turbo generator PLTU)
   - Pole N-S indication (teks)
   - Shaft center

3. **Stator Rotating Field Vector**
   - Vektor hijau (#0A7040)
   - Berputar pada kecepatan visual VSPD = 2π/7 rad/s
   - Panjang konstan (magnitude field konstan untuk operasi seimbang)

4. **Rotor Field Vector**
   - Vektor oranye (#B85800)
   - Berputar dengan rotor (rotorAngle = base + δ)
   - Panjang proporsional dengan Ef (efNorm = Ef/3)

5. **Power Angle Arc**
   - Arc antara stator field axis dan rotor field axis
   - Label "δ = X.X°"
   - Color coding berdasarkan margin ke δ_cr

**Target kode:**
- Function: `initSvgRealistic(svg, w, h)` - sudah ada, perlu enhancement
- Function: `updateSvgPhasorRealistic(svg)` - sudah ada, perlu enhancement

**Kriteria selesai:**
- [ ] Stator dan rotor tampil dengan struktur jelas
- [ ] Kedua vektor field berputar dengan animasi smooth
- [ ] Power angle arc menunjukkan δ dengan benar
- [ ] Toggle Fasor/Realistis bekerja dengan baik

---

### Fase 2: Enhanced Visualization (Dynamic Elements)

**Tujuan:** Menambahkan elemen dinamis yang menunjukkan respons sistem.

**Komponen yang dibangun:**

1. **Phase Current Indicators**
   - 3 sinusoidal waves di sekitar stator
   - Ia(t) = sin(ωt), Ib(t) = sin(ωt - 120°), Ic(t) = sin(ωt - 240°)
   - Animasi pulsa pada kumparan sesuai arus fase
   - Visual frequency ~ 10× slow-down untuk kejelasan

2. **Field Strength Indicators**
   - Color intensity pada rotor field (opacity)
   - Gradient radius pada rotor field (proporsional Ef)
   - Label Ef value real-time

3. **Torque Visualization**
   - Spring-like connector antara stator dan rotor field
   - Tebal/ketat proporsional dengan torque
   - Direction indicator (accelerating/decelerating)

4. **Power Factor Indicator**
   - Badge atau indikator: Lagging / Unity / Leading
   - Color coding:
     - Over-excited (Ef > 1.5): Lagging, hijau
     - Normal (1.0-1.5): Unity, biru
     - Under-excited (Ef < 1.0): Leading, merah

5. **Margin Indicator**
   - Visual distance dari δ ke δ_cr
   - Color gradient: hijau → kuning → merah

**Target kode:**
- New function: `drawPhaseCurrents(svg, cx, cy, R, time)`
- New function: `updateFieldStrength(svg, efNorm)`
- New function: `drawTorqueSpring(svg, angle1, angle2, torque)`

**Kriteria selesai:**
- [ ] Animasi arus fase terlihat jelas
- [ ] Efek eksitasi (Ef) terlihat pada rotor field
- [ ] Power factor indicator akurat
- [ ] Margin stabilitas terlihat visual

---

### Fase 3: Advanced Features (Optional Enhancement)

**Tujuan:** Menambahkan fitur interaktif dan edukatif.

**Komponen yang dibangun:**

1. **Field Line Animation**
   - Garis-garis fluks dari rotor N ke S melalui stator
   - Animasi aliran (particle atau dashed line movement)
   - Kepadatan proporsional dengan Ef

2. **Interactive Hover States**
   - Hover pada stator → tooltip penjelasan
   - Hover pada rotor → tooltip penjelasan
   - Hover pada δ arc → tooltip EAC explanation

3. **Educational Overlays**
   - Mode "Explain" dengan label dan panah penjelasan
   - Step-by-step animation sequence
   - Quiz mode (opsional)

4. **Scenario Demonstrations**
   - Pre-set views untuk:
     - Normal operation
     - SC event (field collapse di Island mode)
     - Excitation change
     - Loss of synchronism

**Kriteria selesai:**
- [ ] Field lines mengalir dengan animasi
- [ ] Tooltips informatif muncul pada hover
- [ ] Educational mode tersedia

---

## Spesifikasi Teknis

### Struktur SVG

```xml
<svg id="svgPhasor">
  <defs>
    <!-- Gradients -->
    <radialGradient id="stator-grad">...</radialGradient>
    <radialGradient id="rotor-grad">...</radialGradient>
    <radialGradient id="rotor-field-grad">...</radialGradient>
  </defs>

  <!-- Layer 1: Stator (static) -->
  <circle id="stator-outer" />
  <circle id="stator-core" />
  <g id="stator-slots">...</g>
  <g id="stator-windings">...</g>

  <!-- Layer 2: Rotor (rotates with δ) -->
  <g id="rotor-group" transform="rotate(δ)">
    <circle id="rotor-body" />
    <circle id="rotor-field" />
    <text id="pole-N">N</text>
    <text id="pole-S">S</text>
  </g>

  <!-- Layer 3: Field vectors -->
  <g id="field-vectors">
    <line id="stator-field-vector" />
    <polygon id="stator-field-arrowhead" />
    <line id="rotor-field-vector" />
    <polygon id="rotor-field-arrowhead" />
  </g>

  <!-- Layer 4: Power angle arc -->
  <path id="delta-arc" />
  <text id="delta-label">δ = X°</text>

  <!-- Layer 5: Phase currents (animated) -->
  <g id="phase-currents">...</g>

  <!-- Layer 6: Legend & data -->
  <g id="legend">...</g>
  <g id="data-panels">...</g>
</svg>
```

### Animasi Loop

```javascript
function updateSvgPhasorRealistic(svg) {
  if (!S) return;

  const w = svg.clientWidth, h = svg.clientHeight;
  if (w < 10 || h < 10) return;

  // Re-initialize if size changed significantly
  if (!realInit || Math.abs(w - real_lastW) > 5 || Math.abs(h - real_lastH) > 5) {
    initSvgRealistic(svg, w, h);
  }

  const cx = w / 2, cy = h / 2;
  const R = Math.min(h * 0.38, w * 0.28);
  const rotorR = R * 0.5;

  // Base rotation angle (visual speed)
  const base = S.anim - Math.PI / 2;

  // 1. Stator field rotates at sync speed
  const statorFieldAngle = base;
  updateStatorFieldVector(svg, cx, cy, R, statorFieldAngle);

  // 2. Rotor position = base + delta
  const rotorAngle = base + S.delta;
  updateRotorPosition(svg, cx, cy, rotorR, rotorAngle);

  // 3. Rotor field intensity based on Ef
  const efNorm = Math.min(S.Ef / 3, 1);
  updateRotorFieldIntensity(svg, efNorm);

  // 4. Power angle arc
  updateDeltaArc(svg, cx, cy, R, S.delta);

  // 5. Phase current animations
  const time = Date.now() / 1000;
  updatePhaseCurrents(svg, cx, cy, R, time);

  // 6. Update data panels
  updateRealisticDataPanels(svg, w, h);
}
```

### Color Scheme

```css
/* Phase colors (standard) */
--phase-a: #C85000;  /* Red-Orange */
--phase-b: #B07000;  /* Yellow-Gold */
--phase-c: #1050C0;  /* Blue */

/* Field colors */
--stator-field: #0A7040;  /* Green */
--rotor-north: #0068D8;   /* Blue (N pole) */
--rotor-south: #D84000;   /* Orange-Red (S pole) */
--rotor-field: #B85800;   /* Orange (field vector) */

/* Status colors */
--delta-safe: #0A7040;    /* Green */
--delta-warning: #B07000; /* Yellow */
--delta-critical: #C42000; /* Red */

/* Structure colors */
--stator-housing: #A0A8B8;
--stator-core: #D0D8E8;
--rotor-body: #404860;
--airgap: #C0C8D8;
```

### Performance Considerations

1. **Debounce size calculations**
   - Hanya baca `clientWidth/Height` setiap 10 frame
   - Gunakan cached values di antara

2. **Efficient DOM updates**
   - Gunakan `setAttribute` batch, bukan `innerHTML`
   - Cache element references setelah inisialisasi

3. **GPU acceleration**
   - Gunakan CSS transforms untuk rotasi
   - `will-change: transform` pada elemen yang berputar

4. **Animation optimization**
   - `requestAnimationFrame` untuk smooth 60 FPS
   - Skip frame jika tidak ada perubahan signifikan

---

## Testing Plan

### Manual Browser Testing

**Test scenarios:**

1. **Basic rendering**
   - Buka simulator → toggle ke Realistis mode
   - Verifikasi stator dan rotor tampil dengan jelas
   - Verifikasi vektor field berputar

2. **Power angle response**
   - Ubah Pm slider → observe δ changes
   - Verifikasi rotor position relatif terhadap stator field
   - Verifikasi arc dan label δ update

3. **Excitation effect**
   - Ubah Ef slider → observe rotor field intensity
   - Verifikasi panjang vektor rotor field berubah
   - Verifikasi opacity/intensity berubah

4. **SC event visualization**
   - Trigger SC → observe rotor acceleration
   - Verifikasi δ meningkat dengan cepat
   - Verifikasi warning muncul saat δ > δ_cr

5. **Mode switching**
   - Toggle antara Fasor dan Realistis
   - Verifikasi tidak ada memory leak
   - Verifikasi animasi smooth saat switch

### Test Harness Integration

**Unit tests (tambah ke `tools/ui.test.js`):**

```javascript
// Test: Realistic mode initialization
test('realistic mode initializes without errors', () => {
  const svg = document.getElementById('svgPhasor');
  S.animMode = 'realistic';
  const result = initSvgRealistic(svg, 400, 300);
  expect(result).not.toThrow();
});

// Test: Power angle visualization
test('power angle arc matches S.delta', () => {
  S.delta = 0.5; // radians
  updateSvgPhasorRealistic(svg);
  const arcEl = svg.querySelector('#delta-arc');
  expect(arcEl.getAttribute('d')).toContain('A'); // arc command
});

// Test: Excitation effect on rotor field
test('rotor field intensity scales with Ef', () => {
  S.Ef = 2.0; // over-excited
  updateSvgPhasorRealistic(svg);
  const fieldEl = svg.querySelector('#rotor-field');
  const opacity = parseFloat(fieldEl.getAttribute('opacity'));
  expect(opacity).toBeGreaterThan(0.5);
});
```

---

## Integration Points

### Dengan Fitur Existing

1. **Swing Equation Physics**
   - Realistic mode membaca `S.delta`, `S.omega`, `S.Ef` dari physics engine
   - Visualisasi mengikuti state fisika secara real-time

2. **Governor TGOV1**
   - Perubahan Pm dari governor terlihat sebagai perubahan δ
   - Rotor oscillation saat transien terlihat di animasi

3. **Equal Area Criterion**
   - Saat SC event, realistic mode menunjukkan:
     - Rotor accelerating (δ meningkat)
     - Field vectors diverging
     - Warning indicators

4. **Time Series Charts**
   - Realistic mode menyediakan visual 2D dari data time series
   - Cross-reference antara chart dan animation

### Dengan UI Controls

1. **Parameter sliders**
   - Ef slider → update rotor field intensity real-time
   - Pm slider → update power angle real-time
   - H, D sliders → affect oscillation damping

2. **Mode toggle**
   - Button "Fasor" ↔ "Realistis" di Panel I header
   - Smooth transition tanpa reset physics

3. **Preset scenarios**
   - Load Step → observe δ transition
   - SC event → observe rotor acceleration
   - Overexcitation → observe rotor field strengthen

---

## Timeline Estimasi

| Fase | Durasi | Dependencies |
|------|--------|--------------|
| Fase 1: Struktur Dasar | 3-4 jam | Research doc, existing code |
| Fase 2: Enhanced Visualization | 4-5 jam | Fase 1 selesai |
| Fase 3: Advanced Features | 3-4 jam (opsional) | Fase 2 selesai |
| Testing & Polish | 2-3 jam | Semua fase |

**Total estimasi:** 12-16 jam kerja

---

## Referensi

1. **Dokumen research:** `docs/research-magnetic-fields.md`
2. **Kode existing:** 
   - `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` lines 1026-1212
   - Functions: `initSvgRealistic()`, `updateSvgPhasorRealistic()`
3. **Physics model:** Kundur (1994) §3.4, §11.1-11.3
4. **Visual reference:** IEEE Std 421.5-2005, Fitzgerald et al. (2003) Chapter 5

---

## Checklist Implementasi

### Fase 1
- [ ] Stator outer ring
- [ ] Stator core ring
- [ ] Stator slots (36)
- [ ] Stator windings (3-phase, 18 coils)
- [ ] Rotor body (cylindrical)
- [ ] Rotor pole labels (N/S)
- [ ] Stator field vector (rotating)
- [ ] Rotor field vector (rotating with δ)
- [ ] Power angle arc
- [ ] Delta label
- [ ] Legend
- [ ] Toggle mode working

### Fase 2
- [ ] Phase current waves
- [ ] Coil pulsing animation
- [ ] Field intensity indicator
- [ ] Power factor badge
- [ ] Margin indicator
- [ ] Torque visualization (optional)

### Fase 3
- [ ] Field line particles
- [ ] Interactive tooltips
- [ ] Educational overlays
- [ ] Scenario demonstrations

---

**Status:** DRAF - Menunggu approval untuk mulai implementasi Fase 1
**Next step:** Review plan dengan user → mulai coding Fase 1
