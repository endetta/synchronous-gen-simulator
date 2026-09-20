# Overview — Synchronous Generator Simulator

**Quick reference untuk developer**

> Terakhir disinkronkan dengan kode: 2026-09-20 (commit `2b1644c`).
> Kalau mengubah fungsi fisika, perbarui bagian ini juga.

---

## Arsitektur

```
LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html
├── <style> — CSS inline (root variables, layout, components)
├── <body> — HTML structure (header, panels, controls)
└── <script> — JavaScript (physics engine, rendering, UI logic)
```

### Komponen Utama

**1. Physics Engine (`<script>`)**
- `makeState()` — inisialisasi state
- `govActive(s)` / `getPmEff(s)` — sumber kebenaran daya mekanik efektif
- `ode(s, delta, omega, Xg, Pm_gov)` — ordinary differential equations
- `rk4(s, dt)` — Runge-Kutta 4th order integrator
- `stepPhys(s, rdt)` — physics step wrapper (SC state machine, EAC, OOS trip)
- `getA2Available(s)` / `eacStable(s)` — kriteria stabilitas EAC buku teks

**2. Rendering**
- `updateSvgPhasor()` — Panel I (SVG phasor animation; dispatch ke mode 'realistic')
- `updateSvgPdelta()` — Panel II (P-δ curve + EAC)
- `updateTimeCharts()` — Panel III (Chart.js time series; dipanggil via `drawTime()`)

**3. UI Controllers**
- `setMode(mode)` — Grid/Island toggle (+ bumpless transfer governor)
- `trigSC()` — Short circuit trigger
- `startRLR()` / `stopRLR()` — Load response simulation
- `runSc(name)` — Preset scenarios
- `doReset()` — Reset penuh (termasuk melepas latch OOS)

---

## Constants & Parameters

```javascript
// System constants
const F0 = 50;                    // Nominal frequency (Hz)
const WS = 2 * Math.PI * 50;      // Synchronous speed (rad/s)
const R2D = 180 / Math.PI;        // Radians to degrees
const D2R = Math.PI / 180;        // Degrees to radians

// Simulation constants
const PHDT = 0.003;               // Physics step (s)
const HSTEP = 0.016;              // History step (s) — 60 Hz sampling
const HWIN = 30;                  // History window (s)
const VSPD = 2 * Math.PI / 7;     // Visual phasor speed (rad/s)

// Governor TGOV1 (IEEE Std 421.5) — lokal di dalam ode()
const T1 = 0.5;                   // Servo time constant (s)
const T2 = 3.5;                   // Steam chest + reheater (s)
const R = 0.05;                   // Droop (5%)
```

---

## State Object

```javascript
S = {
  // Dynamic state
  delta: 0,           // Power angle (rad)
  omega: 0,           // Speed deviation (pu)
  Xg: 0,              // Governor state 1
  Pm_gov: 0,          // Governor output — ADALAH daya mekanik saat governor aktif
  t: 0,               // Simulation time (s)

  // Parameters
  H: 8.0,             // Inertia constant (s)
  D: 4.0,             // Damping coefficient (pu)
  Xs: 1.2,            // Transient reactance X'd (pu)
  Ef: 1.5,            // Excitation voltage E' (pu)
  Pm: 0.8,            // Mechanical power SETPOINT (pu)
  V: 1.0,             // Terminal voltage (pu)

  // Mode
  mode: 'grid',       // 'grid' | 'island'

  // Short circuit
  sc_active: false,
  sc_on: false,
  sc_delay: 0.3,
  sc_dur: 0.20,
  sc_t0: 0,
  sc_Pfact: 0.04,     // Sisa tegangan saat fault (bolted fault model)

  // Loss of synchronism — LATCHED sampai doReset()
  oos_tripped: false,

  // EAC tracking
  delta_sc_start: 0,
  delta_cleared: 0,
  A1_num: 0,          // Acceleration area (numerical, selama fault)
  A2_num: 0,          // Deceleration area (numerical, sampai puncak swing pertama)
  eac_phase: 'none',  // 'none' | 'fault' | 'post' | 'done'

  // Visualization
  hist: [],           // Time series history (maks 1800 titik = 30 s @ 60 Hz)
  particles: [],      // Visual effects
  anim: 0,            // Animation frame counter
}
```

---

## Key Functions

### Physics

```javascript
// Daya mekanik efektif — SATU sumber kebenaran.
// Saat governor aktif (island / RLR), Pm_gov ADALAH daya mekanik; s.Pm hanya
// setpoint-nya. Menjumlahkan keduanya = menghitung setpoint dua kali (bug lama).
function govActive(s){ return s.mode==='island'||rlr_running; }
function getPmEff(s){
  const raw = govActive(s) ? s.Pm_gov : s.Pm;
  return Math.min(Math.max(raw, 0), 3.5);
}

// Maximum transferable power — tegangan terminal kolaps saat fault
function getVt(s)   { return s.sc_active ? s.V * s.sc_Pfact : s.V; }
function getPmax(s) { return s.Ef * getVt(s) / Math.max(s.Xs, 0.01); }

// Electrical power
function getPe(s) { return getPmax(s) * Math.sin(s.delta); }

// Kriteria EAC buku teks: A2 TERSEDIA (dari delta_cleared sampai delta_cr)
function getA2Available(s) {
  // area deselerasi geometris; 0 bila clearing sudah lewat delta_cr
}
function eacStable(s) { return getA2Available(s) >= s.A1_num / 1.02; }
```

### ODE System

```javascript
function ode(s, delta, omega, Xg, Pm_gov) {
  const Pmax = getPmax(s);
  const Pe = Pmax * Math.sin(delta);
  const gov = govActive(s);
  const Pm_eff = Math.min(Math.max(gov ? Pm_gov : s.Pm, 0), 3.5);

  // Grid mode: additional damping from infinite bus
  const D_eff = s.mode === 'grid' ? s.D + 2 : s.D;

  // Swing equation
  const d_delta = WS * omega;
  const d_omega = (Pm_eff - Pe - D_eff * omega) / (2 * s.H);

  // TGOV1 governor — servo mengejar (Pm - omega/R); Pm_gov = output.
  // Di grid mode governor di-decay-kan ke 0 (daya langsung dari setpoint).
  const T1 = 0.5, T2 = 3.5, R = 0.05;
  const d_Xg = gov ? (1 / T1) * (s.Pm - omega / R - Xg) : -Xg / 0.05;
  const d_Pmgov = (1 / T2) * (Xg - Pm_gov);

  return [d_delta, d_omega, d_Xg, d_Pmgov, Pe, Pm_eff];
}
```

> **Penting:** jangan mengubah `Pm_eff` kembali menjadi `s.Pm + Pm_gov`.
> Itu bug yang sudah diperbaiki (commit `12125cc`) dan bikin island mode
> selalu loss of synchronism. Tes penjaganya: `tools/governor-steady-state.test.js`.

---

## Testing

```bash
# Semua tes (lintas file)
npm test

# Tes individual — semua mengekstrak fungsi dari HTML via tools/extract.js
node tools/model.test.js               # fisika vs analitik (25 assertion)
node tools/governor-steady-state.test.js  # governor island/RLR + bumpless
node tools/eac-verdict.test.js         # kriteria EAC buku teks
node tools/oos-trip.test.js            # latch trip + fisika berhenti
node tools/ui.test.js                  # struktur DOM (grep string)
node tools/chart-scale.test.js         # stabilizer skala chart
```

**Seam pengujian:** `tools/extract.js` mengekstrak fungsi fisika langsung dari
blok `<script>` HTML (stub DOM minimal). Menghapus/mengubah fungsi fisika di
HTML akan membuat tes GAGAL dengan pesan `SEAM GAGAL: ...` yang menyebut
fungsi yang hilang. Daftar fungsi wajib ada di konstanta `REQUIRED` di file itu.

---

## Known Issues

1. **UNSTABLE** — masih dalam pengembangan
2. `resizeTimeCharts()` sengaja dinonaktifkan (layout thrashing) — chart tidak ikut membesar saat panel di-drag
3. `smartDecimate()` bucket 50 ms tidak menjamin extrema/transien pendek terlihat
4. Chart.js dimuat dari CDN — butuh koneksi saat pertama kali dibuka
5. EAC_TOL 2% lebih kecil dari galat diskretisasi A₁ pada kasus ambang (temuan 9.1 audit adversarial — lihat `.scratch/sync-gen-fixes/issues/09-*`)

## Future Enhancements

- [ ] Multi-machine system
- [ ] AVR/PSS models
- [ ] Fault recorder (COMTRADE export)
- [ ] Tutorial mode
- [ ] Mobile responsive
- [ ] PWA support
