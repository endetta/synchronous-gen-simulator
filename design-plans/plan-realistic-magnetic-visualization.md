# Plan: Realistic Magnetic Field Visualization

**Status:** PROGRESS — Fase 0 SELESAI (commit `2120cad`, 2026-09-20); Fase 1–2 menunggu approval
**Dibuat:** 2026-09-09
**Direvisi:** 2026-09-20 (setelah riset sumber primer)
**Sumber:** `docs/riset-medan-magnetik-dan-belitan.md` (primer, terverifikasi)
**Sumber lama (tidak lagi jadi acuan):** `docs/research-magnetic-fields.md`, `docs/rotor-stator-visualization-research.md`
**Target:** Mode Realistis di Panel I

---

## ⚠️ KOREKSI TERHADAP VERSI DRAF 2026-09-09

Versi draf disusun dari dokumen riset bersumber sekunder yang belum diverifikasi. Riset ulang
2026-09-20 memakai sumber primer (MIT OCW 6.685, Kirtley, Class Notes 4) dan menemukan empat
koreksi yang mengubah isi plan:

**Koreksi 1 — "Stator berputar, rotor terkunci" itu menyesatkan.**
Draf menyatakan tujuan edukasi "Rotor field 'terkunci' dan mengikuti stator field". Kirtley §5
menunjukkan rotor dan stator berputar **pada kecepatan yang sama** (`pθ = ωt + δᵢ`), dan justru
karena itu torsi konstan. Yang harus divisualisasikan adalah **dua medan berputar bersama,
terpisah δ** — bukan satu berputar dan satu mengejar. Fase 1 draf sudah punya elemen yang benar
(`rotorAngle = base + δ`), tapi narasi edukasinya salah dan akan menyesatkan pengguna.

**Koreksi 2 — Garis fluks naik dari "Fase 3 opsional" menjadi kebutuhan inti.**
Permintaan user 2026-09-20 eksplisit: garis fluks adalah yang utama, dan belitan harus berbentuk
kumparan sungguhan, bukan titik. Draf menempatkan keduanya sebagai "Advanced Features (Optional)".
Ini dibalik: **Fase 1 versi baru = garis fluks + belitan kumparan.**

**Koreksi 3 — Jangan mengerutkan fluks saat gangguan.**
Draf Fase 3 menyebut "SC event (field collapse di Island mode)". Itu **salah secara fisik**:
model `E'` yang dipakai simulator berdiri di atas asas *constant flux linkage* — fluks di
belakang `X'd` bertahan selama transien. Yang kolaps adalah tegangan terminal. Visualisasi yang
mengerutkan fluks saat `sc_active` bertentangan dengan model simulator sendiri.

**Koreksi 4 — `will-change: transform` dihapus dari spesifikasi.**
Draf §Performance Considerations merekomendasikan `will-change: transform`. MDN tidak membahas
`will-change` di kedua halaman performa animasi yang saya buka; yang terverifikasi adalah bahwa
`transform` dan `opacity` masuk jalur compositing. Rekomendasi tanpa dasar dihapus.

**Yang tetap berlaku dari draf:** struktur layer SVG, rencana power-angle arc, rencana indikator
arus fasa, dan sebagian besar skema warna.

---

## Ringkasan

Mengimplementasikan visualisasi medan magnet realistis untuk generator sinkron di Panel I. Visualisasi ini akan menunjukkan interaksi antara medan magnet stator (rotating field dari 3 fasa) dan medan magnet rotor (dari eksitasi DC), serta bagaimana interaksi ini menghasilkan tork dan power angle (δ).

**Tujuan edukasi (direvisi 2026-09-20):**
1. Kedua medan — rotor dan stator — berputar **bersama** pada kecepatan sinkron (Kirtley §5)
2. Power angle (δ) adalah **jarak sudut** antara sumbu-d rotor dan resultan medan stator; ia
   melebar saat beban naik dan itulah yang dibaca di kurva P-δ Panel II
3. Eksitasi (Ef) mengontrol **kekuatan fluks medan** — terlihat sebagai kerapatan garis fluks,
   dan menggeser δ pada daya mekanis tertentu
4. Belitan stator adalah **kumparan**, dan arus yang mengalir di dalamnya menghasilkan MMF yang
   berputar — rantai "bergerak → EMF → arus → MMF → torsi"

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

> **Catatan revisi:** Fase 1 dan 2 di bawah adalah versi draf 2026-09-09. Urutan prioritas
> diubah oleh **Fase 0** (baru) yang berisi permintaan eksplisit user 2026-09-20 — garis fluks
> dan belitan kumparan. Fase 0 harus dikerjakan lebih dulu; Fase 1 dan 2 menyusul sebagai
> pengayaan. Lihat `docs/riset-medan-magnetik-dan-belitan.md` §7 untuk pseudocode Fase 0.

### Fase 0: Garis Fluks & Belitan Kumparan (PRIORITAS — permintaan user 2026-09-20)

**Tujuan:** Mode Realistis menampilkan medan magnet yang sesungguhnya, dan belitan stator sebagai
kumparan — bukan titik.

**Komponen yang dibangun:**

1. **Garis fluks (menggantikan `#rotor-field` dan `#stator-field` yang berupa lingkaran gradient)**
   - 6–12 `<path>` dalam grup `#g-flux`, dihitung dalam kerangka acuan rotor
   - Bentuk: keluar tegak lurus permukaan rotor di sekitar kutub, menyeberangi air gap radial,
     menutup lewat yoke stator (Kirtley §2)
   - Kerapatan garis ∝ fluks; pakai pemetaan melengkung (`tanh`) karena saturasi tidak dimodelkan
   - **Rotasi rigid** via `<g transform="rotate(...)">` — JANGAN hitung ulang atribut `d` per frame

2. **Belitan stator sebagai kumparan (menggantikan 18 `<circle>` `winding-{A,B,C}-{i}`)**
   - Path kumparan tersambung: masuk lewat satu slot, keluar lewat slot berseberangan 180°
     (Kirtley §3: kedua sisi kumparan terpisah `π/p`; untuk 2-kutub = 180°)
   - Penanda arah arus dot/cross per sisi konduktor, id `#cd-{fasa}-{i}-dot` / `#cd-{fasa}-{i}-x`
   - Arah berbalik mengikuti arus fasa sinusoidal, memakai `S.t` — **bukan `Date.now()`**

3. **Penanda RMF stator (`#g-rmf`)**
   - Elemen **baru**. Inilah yang selama ini hilang sehingga baris 1225 (`const syncAng = base`)
     dihitung lalu tidak dipakai
   - Membuat δ terlihat sebagai jarak sudut nyata antara dua medan

4. **Busur δ (`#d-arc`)**
   - Busur antara sumbu-d rotor dan RMF stator, dengan label nilai δ
   - Menghubungkan langsung ke kurva P-δ di Panel II — sudut yang sama, dua tampilan

5. **Sumbu-d dan sumbu-q pada rotor**
   - Kirtley §9: "The direct axis is aligned with the field winding, while the quadrature axis
     leads the direct by 90 degrees"
   - Memberi arti konkret pada label "N"/"S" yang sekarang mengambang

**Target kode:**
- `initSvgRealistic()` — tambah `#g-rotor`, `#g-flux`, `#g-rmf`, `#d-arc`, `#cd-{f}-{i}-dot`/`-x`
- `updateSvgPhasorRealistic()` — pseudocode lengkap di riset §7.4
- Fungsi baru: `buildFluxPath()`, `buildCoilPath()`, `rebuildFluxPaths()`

**Kriteria selesai:**
- [x] Garis fluks terlihat, rapat di kutub dan renggang di garis netral
- [x] Garis berputar rigid bersama rotor (via `transform`, bukan `d`)
- [x] Belitan berbentuk kumparan tersambung, bukan titik
- [x] Arah arus terlihat berubah (dot/cross) mengikuti `S.t`
- [x] Busur δ terlihat dan nilainya cocok dengan `S.delta`
- [x] Slider `Ef` mengubah kerapatan garis fluks dengan pemetaan melengkung
- [x] Saat `sc_active`, garis fluks **TIDAK** mengerut (asas constant flux linkage)
- [x] Tidak ada lagi `Date.now()` di jalur animasi mode realistis

*(Semua kriteria terverifikasi 2026-09-20 oleh `tools/realistic-field.test.js`
(43 assertion, 11 seksi) + verifikasi browser — bukti di
`design-plans/sesi-2026-09-20-05-fase0-medan-magnet.md`.)*

**Prasyarat verifikasi:** tabel armature reaction di riset §4.4 — **TERVERIFIKASI** (2026-09-20).
Rumus `I_d` adalah kutipan langsung Kirtley Ch.4 §9; tabel didukung tiga sumber (Kirtley §9 +
§8, Wikipedia). Kedua buku (Kundur/Chapman) tetap tidak terbuka — lihat riset §10 celah 1 & 2.

---

### Fase 1: Struktur Dasar (Core Visualization) — versi draf, setelah Fase 0

**Tujuan:** Membuat struktur visual statis dan animasi rotasi dasar.

**Komponen yang dibangun:**

1. **Stator Cross-Section**
   - Outer ring (housing) - grey
   - Core ring (laminated iron) - gradient
   - 36 slots (garis radial)
   - 18 kumparan 3-fasa (6 per fase, 60° apart)
     - Phase A: merah (#C85000)
     - Phase B: biru (#0068a8)
     - Phase C: hijau (#00a848)
     - **Catatan 2026-09-20:** warna di atas adalah yang BENAR-BENAR ada di kode (baris 1131).
       Draf 2026-09-09 menulis fasa C sebagai biru `#1050C0` — itu keliru dan tidak pernah
       cocok dengan implementasi. Fasa C yang hijau inilah yang dikeluhkan user sebagai
       "titik-titik hijau yang tidak jelas" — masalahnya bukan warnanya, tapi bentuknya
       (titik, bukan kumparan).

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
     - SC event — **visual: δ melebar cepat, rotor kehilangan kunci; garis fluks TETAP**
       (koreksi 2026-09-20: draf menulis "field collapse di Island mode" — itu salah fisik,
       lihat bagian Koreksi di atas)
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

3. **GPU acceleration** (direvisi 2026-09-20)
   - Gunakan `transform` untuk rotasi — **terverifikasi** masuk jalur compositing.
     MDN, *Animation performance and frame rate*: "Properties that *are rendered* in their
     **own layer** don't even trigger a repaint, because the update is handled in
     **composition** … For example: `transform`, `opacity`"
   - **JANGAN** hitung ulang atribut `d` per frame — mengubah `d` adalah perubahan geometri
     yang memicu layout/paint, bukan compositing
   - `will-change` **DIHAPUS** dari spesifikasi: MDN tidak membahasnya di kedua halaman
     performa animasi yang saya buka (riset §7.3). Jangan rekomendasikan tanpa dasar —
     ukur dulu dengan DevTools bila perlu.

4. **Animation optimization**
   - `requestAnimationFrame` untuk smooth 60 FPS; anggaran per frame 16.7 ms
     (MDN: "the browser has 16.7 milliseconds to execute scripts, recalculate styles and
     layout if needed, and repaint the area being updated")
   - Skip frame jika tidak ada perubahan signifikan
   - Beban mode realistis sangat ringan: <20 elemen dirotasi sebagai grup, jauh di bawah anggaran

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

### Fase 0 (PRIORITAS — permintaan user 2026-09-20)
- [ ] `#g-flux` — 6–12 path garis fluks, template kerangka rotor
- [ ] `buildFluxPaths()` + `traceFieldLine()` — integrasi medan, dihitung sekali
- [ ] `rebuildFluxPaths()` — regenerasi hanya saat `Ef` berubah material
- [ ] Rotasi rigid via `transform`, bukan `d`
- [ ] Pemetaan `Ef → kerapatan` melengkung (`tanh`) — saturasi tidak dimodelkan
- [ ] Belitan sebagai kumparan tersambung (ganti 18 `<circle>`)
- [ ] Penanda dot/cross `#cd-{f}-{s}`, digerakkan `S.t`
- [ ] `#g-rmf` — penanda RMF stator (memakai `base` yang selama ini sia-sia)
- [ ] `#d-arc` — busur δ + label
- [ ] Sumbu-d / sumbu-q pada rotor
- [ ] Hapus semua `Date.now()` dari jalur animasi realistis
- [ ] Garis fluks TIDAK mengerut saat `sc_active`
- [ ] Legend diperbarui + catatan penyederhanaan

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

**Status:** DRAF (direvisi 2026-09-20) — **prasyarat verifikasi sudah tertutup**, menunggu approval user untuk mulai implementasi Fase 0
**Next step:**
1. ~~Konfirmasi tabel armature reaction (riset §4.4)~~ — **SELESAI 2026-09-20**: kutipan langsung Kirtley Ch.4 §9 + rantai verifikasi tiga sumber
2. Review plan Fase 0 dengan user — **belum ada approval untuk mulai coding**
3. Implementasi Fase 0 dengan TDD; tambah `tools/` test untuk kontrak `#g-flux` dan `#g-rmf`

**Catatan sesi 2026-09-20:** riset primer selesai, dokumen di
`docs/riset-medan-magnetik-dan-belitan.md`. Plan ini direvisi berdasarkan temuan itu —
lihat bagian "KOREKSI TERHADAP VERSI DRAF 2026-09-09" di atas. Verifikasi §4.4 ditutup
sesi yang sama; dua catatan halus ditambahkan (unity pf = cross-axis, bukan "tidak ada";
label pf bertukar antar frame motor/generator).
