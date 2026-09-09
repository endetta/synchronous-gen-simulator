# PRD — Synchronous Generator Simulator

**Product Requirements Document**
Version: 0.1.0-unstable
Last Updated: 2026-09-09

---

## 1. Ringkasan Produk

Simulator operasi generator sinkron untuk PLTU 500 MW dengan model klasik E' (transient reactance) dan governor TGOV1. Target pengguna: mahasiswa teknik elektro, engineer operasi, dan praktisi proteksi sistem tenaga.

### Tujuan
- Memvisualisasikan dinamika rotor generator sinkron saat gangguan
- Mendemonstrasikan Equal Area Criterion (EAC) untuk stabilitas transient
- Mensimulasikan respons governor dan excitation terhadap perubahan beban
- Menjadi alat edukasi interaktif untuk studi stabilitas sistem tenaga

---

## 2. Model Matematika (Sumber Kebenaran)

### 2.1 Swing Equation

**Referensi:** Kundur (1994) §11.1, Anderson & Fouad (2003) §2.4

```
M · d²δ/dt² = Pm - Pe - D · (dδ/dt)
```

di mana:
- `M = 2H/ωs` — inertia constant (s)
- `δ` — power angle (rad)
- `ω` — rotor speed deviation (pu)
- `ωs = 2πf₀ = 100π` — synchronous speed (rad/s)
- `Pm` — mechanical power (pu)
- `Pe` — electrical power (pu)
- `D` — damping coefficient (pu)

### 2.2 Power-Angle Relationship

```
Pe = Pmax · sin(δ)
Pmax = E' · V / X'd
```

di mana:
- `E'` — internal EMF (excitation voltage)
- `V` — terminal voltage (grid voltage, dianggap 1.0 pu)
- `X'd` — transient reactance

### 2.3 Governor TGOV1

**Referensi:** IEEE Std 421.5-2005

```
dXg/dt = (1/T₁) · (-ω/R - Xg)
dPm_gov/dt = (1/T₂) · (Xg - Pm_gov)
```

Parameter:
- `T₁ = 0.5 s` — servo time constant
- `T₂ = 3.5 s` — steam chest + reheater time constant
- `R = 5%` — droop

### 2.4 Equal Area Criterion (EAC)

**Referensi:** Kundur (1994) §11.2-11.3

**Critical Angle:**
```
δ_cr = π - δ₀
```

**Critical Clearing Angle:**
```
δ_cc = arccos[Pm(π-2δ₀)/Pmax - cos(δ₀)]
```

**Critical Clearing Time:**
```
CCT = √[4H(δ_cc-δ₀)/(ωs·Pm)]
```

**Acceleration Area (A₁):**
```
A₁ = ∫[δ₀ → δ_cc] (Pm - Pe_fault) dδ
```

**Deceleration Area (A₂):**
```
A₂ = ∫[δ_cc → δ_max] (Pe_post - Pm) dδ
```

Stabilitas: `A₂ ≥ A₁` → STABIL

---

## 3. Spesifikasi Fungsional

### 3.1 Mode Operasi

| Mode | Deskripsi | f (Hz) | Governor |
|------|-----------|--------|----------|
| Grid-Connected | Terhubung infinite bus | 50 (fixed) | Aktif dengan damping +2 pu |
| Island | Standalone | Variabel | Aktif penuh |

### 3.2 Parameter Generator

| Parameter | Simbol | Range | Default | Satuan |
|-----------|--------|-------|---------|--------|
| Inertia Constant | H | 1–15 | 8.0 | s |
| Damping Coefficient | D | 0–15 | 4.0 | pu |
| Transient Reactance | X'd | 0.05–3 | 1.2 | pu |
| Excitation Voltage | E' | 0.1–3 | 1.5 | pu |

### 3.3 Parameter Prime Mover

| Parameter | Simbol | Range | Default | Satuan |
|-----------|--------|-------|---------|--------|
| Mechanical Power | Pm | 0.01–3 | 0.8 | pu |

### 3.4 Short Circuit Event

| Parameter | Range | Default | Satuan |
|-----------|-------|---------|--------|
| SC Onset Delay | 0–10 | 0.3 | s |
| SC Duration | 0.02–5 | 0.20 | s |
| SC Power Factor | — | 0.04 | pu |

### 3.5 Real Load Response (RLR)

- **Profil beban:** IEEE Std 399-1997 utility load curve (24 jam)
- **Durasi simulasi:** 36 detik (2400× speed)
- **Periode:** Night Valley, Morning Ramp, Morning Peak, Midday Dip, Evening Peak, Evening Decline

---

## 4. Spesifikasi UI/UX

### 4.1 Layout

```
+----------------------------------+
|          HEADER (fixed)          |
|  δ | Δω | f | Pe | Pm | [RLR] [R]|
+----------------------------------+
|  PANELS BAR (toggle buttons)     |
+----------------------------------+
| Panel I   |   Panel II   |       |
| Phasor    |   P-δ Curve  |       |
| Animation |   + EAC      |       |
+----------------------------------+
| Panel III - Time Series          |
| (δ, ω, f, P vs time)             |
+----------------------------------+
|           CONTROLS               |
| [Mode] [Status] [Params] [SC]    |
| [RLR] [Presets] [Narrative]      |
+----------------------------------+
```

### 4.2 Panel Visualisasi

**Panel I — Phasor Animation:**
- Rotor phasor (E')
- Stator phasor (V)
- Rotation animation
- Power angle indicator

**Panel II — P-δ Curve:**
- Sinusoidal curve P = Pmax·sin(δ)
- Mechanical power line (Pm)
- Operating point (δ₀)
- Critical angle (δ_cr)
- Critical clearing angle (δ_cc)
- EAC areas (A₁, A₂)

**Panel III — Time Series:**
- δ(t) — power angle
- ω(t) — speed deviation
- f(t) — frequency
- P(t) — power

### 4.3 Interaksi

- **Slider + number input** untuk semua parameter
- **Preset scenarios** untuk quick demo
- **Short circuit trigger** dengan visual feedback
- **RLR simulation** dengan play/pause
- **Loss of synchronism warning** (red overlay + alarm)

---

## 5. Non-Functional Requirements

### 5.1 Performance

- **Frame rate:** ≥30 FPS untuk animasi phasor
- **Physics step:** 3 ms (PHDT = 0.003 s)
- **History window:** 30 detik

### 5.2 Dependencies

**External Libraries (CDN with SRI):**

| Library | Version | Purpose | License |
|---------|---------|---------|---------|
| Chart.js | 4.4.1 | Time series visualization (δ, ω, f, P) | MIT |
| chartjs-plugin-annotation | 3.3.0 | EAC area annotations on charts | MIT |
| chartjs-plugin-zoom | 2.0.1 | Chart pan/zoom for detailed analysis | MIT |

**CDN URLs with SRI:**
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js" integrity="sha384-9nhczxUqK87bcKHh20fSQcTGD4qq5GhayNYSYWqwBkINBhOfQLg/P5HG5lF1urn4" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.3.0/dist/chartjs-plugin-annotation.min.js" integrity="sha384-bYKsxjqxaylGfcsbR8gpRpA4n3bKucz/Z7MqapB0Io/RiuxGVJ+808uklxP0CwN2" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js" integrity="sha384-zPzbVRXfR492Sd5D+HydTYCxxgHAfgVO8KERbLlpeH5unsmbAEXrscGUUqLZG9BM" crossorigin="anonymous"></script>
```

**Note:** SRI hashes ensure CDN integrity. Verify at https://www.srihash.org/

### 5.3 Browser Compatibility

- **Browser:** Chrome 90+, Firefox 88+, Edge 90+
- **Resolution:** Minimum 1280×720
- **Core functionality:** Works offline after initial CDN load (browser cache)

### 5.4 Accuracy

- **ODE solver:** RK4 (Runge-Kutta 4th order)
- **Numerical precision:** IEEE 754 double
- **Validation:** Cross-check dengan referensi akademik

---

## 6. Referensi Akademik

1. Kundur, P. (1994). *Power System Stability and Control.* McGraw-Hill.
2. Anderson, P. M., & Fouad, A. A. (2003). *Power System Control and Stability* (2nd ed.). IEEE Press.
3. Elgerd, O. I. (1971). *Electric Energy Systems Theory.* McGraw-Hill.
4. Wu, H., & Wang, X. (2020). Mode-adaptive power-angle control. *IEEE J. ESTPE, 8*(2), 1034–1049.
5. IEEE Std 399-1997. *Recommended Practice for Industrial & Commercial Power Systems.*
6. IEEE Std 421.5-2005. *Excitation System Models for Power Stability Studies.*

---

## 7. Riwayat Perubahan

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0-unstable | 2026-09-09 | Added §5.2 Dependencies (Chart.js + plugins with SRI) |
| 0.1.0-unstable | 2026-09-08 | Initial PRD draft |
