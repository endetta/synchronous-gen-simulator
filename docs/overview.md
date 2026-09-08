# Overview — Synchronous Generator Simulator

**Quick reference untuk developer**

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
- `ode(s, delta, omega, Xg, Pm_gov)` — ordinary differential equations
- `rk4(s, dt)` — Runge-Kutta 4th order integrator
- `stepPhys(s, rdt)` — physics step wrapper

**2. Rendering**
- `drawPhasor()` — Panel I (SVG phasor animation)
- `drawPdelta()` — Panel II (P-δ curve + EAC)
- `drawTimeSeries()` — Panel III (Canvas time series)

**3. UI Controllers**
- `setMode(mode)` — Grid/Island toggle
- `trigSC()` — Short circuit trigger
- `startRLR()` / `stopRLR()` — Load response simulation
- `runSc(name)` — Preset scenarios

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
const HSTEP = 0.04;               // History step (s)
const HWIN = 30;                  // History window (s)
const VSPD = 2 * Math.PI / 7;     // Visual phasor speed (rad/s)

// Governor TGOV1 (IEEE Std 421.5)
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
  Pm_gov: 0,          // Governor state 2
  t: 0,               // Simulation time (s)

  // Parameters
  H: 8.0,             // Inertia constant (s)
  D: 4.0,             // Damping coefficient (pu)
  Xs: 1.2,            // Transient reactance X'd (pu)
  Ef: 1.5,            // Excitation voltage E' (pu)
  Pm: 0.8,            // Mechanical power (pu)
  V: 1.0,             // Terminal voltage (pu)

  // Mode
  mode: 'grid',       // 'grid' | 'island'

  // Short circuit
  sc_active: false,
  sc_on: false,
  sc_delay: 0.3,
  sc_dur: 0.20,
  sc_t0: 0,
  sc_Pfact: 0.04,     // Pmax reduction during fault

  // EAC tracking
  delta_sc_start: 0,
  delta_cleared: 0,
  A1_num: 0,          // Acceleration area (numerical)
  A2_num: 0,          // Deceleration area (numerical)
  eac_phase: 'none',  // 'none' | 'fault' | 'post' | 'done'

  // Visualization
  hist: [],           // Time series history
  particles: [],      // Visual effects
  anim: 0,            // Animation frame counter
}
```

---

## Key Functions

### Physics

```javascript
// Maximum transferable power
function getPmax(s) {
  return s.sc_active ? s.Ef * s.V / s.Xs * s.sc_Pfact : s.Ef * s.V / s.Xs;
}

// Electrical power
function getPe(s) {
  return getPmax(s) * Math.sin(s.delta);
}

// Critical clearing angle
function getCC(s) {
  const Pmax = s.Ef * s.V / s.Xs;
  const Pm = Math.min(Math.max(s.Pm + s.Pm_gov, 0), 3.5);
  const d0 = Math.asin(Math.min(Pm / Pmax, 0.9999));
  const c = Pm * (Math.PI - 2 * d0) / Pmax - Math.cos(d0);
  if (c < -1 || c > 1) return null;
  return Math.acos(c);
}

// Critical clearing time
function getCCT(s) {
  const dcc = getCC(s);
  if (!dcc) return null;
  const Pmax = s.Ef * s.V / s.Xs;
  const Pm = Math.min(Math.max(s.Pm + s.Pm_gov, 0), 3.5);
  const d0 = Math.asin(Math.min(Pm / Pmax, 0.9999));
  if (Pm <= 0) return null;
  return Math.sqrt(4 * s.H * (dcc - d0) / (WS * Pm));
}
```

### ODE System

```javascript
function ode(s, delta, omega, Xg, Pm_gov) {
  const Pmax = getPmax(s);
  const Pe = Pmax * Math.sin(delta);
  const Pm_eff = Math.min(Math.max(s.Pm + Pm_gov, 0), 3.5);

  // Grid mode: additional damping from infinite bus
  const D_eff = s.mode === 'grid' ? s.D + 2 : s.D;

  // Swing equation
  const d_delta = WS * omega;
  const d_omega = (Pm_eff - Pe - D_eff * omega) / (2 * s.H);

  // TGOV1 governor
  const gov = (s.mode === 'island' || rlr_running);
  const d_Xg = gov ? (1 / T1) * (-omega / R - Xg) : -Xg / 0.05;
  const d_Pmgov = (1 / T2) * (Xg - Pm_gov);

  return [d_delta, d_omega, d_Xg, d_Pmgov, Pe, Pm_eff];
}
```

---

## Visual Elements

### Color Scheme (CSS Variables)

```css
:root {
  --bg: #edf0f6;        /* Background */
  --surf: #fff;         /* Surface */
  --surf2: #f4f6fb;     /* Surface secondary */
  --brd: #ccd2e0;       /* Border */
  --brd2: #b8c0d4;      /* Border secondary */
  --etap: #c42000;      /* Primary accent (red-orange) */
  --etap2: #e02800;     /* Accent hover */
  --txt: #14192e;       /* Text primary */
  --txt2: #3a4465;      /* Text secondary */
  --dim: #505878;       /* Dimmed text */
  --amber: #b07000;     /* δ color */
  --cyan: #006898;      /* Pe color */
  --orange: #b85800;    /* Pm color */
  --green: #0a7040;     /* Frequency/Δω color */
  --yellow: #906000;    /* δ indicator */
  --lime: #3a6818;      /* Δω indicator */
  --violet: #6040a0;    /* T_osc indicator */
}
```

### Fonts

```css
--serif: 'Playfair Display', 'Georgia', serif;  /* Headers, titles */
--body: 'EB Garamond', 'Georgia', serif;        /* Body text */
--mono: 'Courier New', monospace;               /* Numbers, values */
```

---

## Testing Notes

### Manual Validation Checklist

- [ ] Phasor rotates smoothly at 1 rev/7s
- [ ] P-δ curve renders correctly (sinusoidal)
- [ ] Time series plots update in real-time
- [ ] Slider changes update physics immediately
- [ ] Grid vs Island mode behaves differently
- [ ] Short circuit triggers correctly
- [ ] EAC areas calculated and visualized
- [ ] Loss of synchronism detected (red overlay)
- [ ] RLR simulation runs for 36 seconds
- [ ] All preset scenarios execute without error

### Console Debugging

```javascript
// Access state
console.log(S);

// Check EAC values
console.log('A1:', S.A1_num, 'A2:', S.A2_num);
console.log('Phase:', S.eac_phase);

// Check critical angles
console.log('δ_cc:', getCC(S), 'CCT:', getCCT(S));
```

---

## Known Issues

1. **UNSTABLE** — Masih dalam pengembangan
2. Belum ada automated tests
3. Belum ada screenshot automation
4. Panel resize belum smooth
5. Performance belum di-optimize untuk low-end devices

---

## Future Enhancements

- [ ] Multi-machine system
- [ ] AVR/PSS models
- [ ] Fault recorder (COMTRADE export)
- [ ] Tutorial mode
- [ ] Mobile responsive
- [ ] PWA support
