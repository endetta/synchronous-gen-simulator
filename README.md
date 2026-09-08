# Synchronous Generator Simulator

**Level 1 - Simulation HTML** | **Status: UNSTABLE**

Simulator operasi generator sinkron untuk PLTU 500 MW dengan model klasik E' (transient reactance) dan governor TGOV1.

---

## 📖 Tentang

Simulator ini mengimplementasikan model fisika standar untuk studi stabilitas transient sistem tenaga:

- **Swing Equation** (Kundur 1994 §11.1)
- **Equal Area Criterion (EAC)** (Kundur 1994 §11.2-11.3)
- **TGOV1 Governor** (IEEE Std 421.5-2005)
- **Load Frequency Control (LFC)** (Kundur 1994 §11)

---

## 🚀 Cara Menggunakan

### Langsung di Browser

Buka file HTML langsung:
```
LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html
```

### Dengan HTTP Server

```bash
# Python
python -m http.server 8080

# Node.js
npx serve
```

Kemudian akses `http://localhost:8080`

---

## 📊 Fitur

| Fitur | Deskripsi |
|-------|-----------|
| Phasor Animation | Visualisasi rotor-stator phasor |
| P-δ Curve | Kurva daya sudut dengan EAC |
| Time Series | Grafik δ, ω, f, P vs waktu |
| Grid/Island Mode | Toggle mode operasi |
| Short Circuit | Trigger 3-phase fault |
| EAC Visualization | A₁ dan A₂ areas |
| Loss of Synchronism | Alert saat δ > δ_cr |
| RLR Simulation | 24-hour load profile (2400× speed) |
| Preset Scenarios | Quick demo scenarios |

---

## 🛠️ Testing

```bash
# Model physics tests
node tools/model.test.js

# UI structure tests
node tools/ui.test.js

# Screenshot automation
node tools/shoot.js

# Verifikasi screenshots
node tools/shoot.js --check
```

---

## 📁 Struktur File

```
LEVEL 1 - SYNCHRONOUS GEN (UNSTABLE)/
├── CLAUDE.md
├── README.md
├── .gitignore
├── LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html
├── docs/
│   ├── PRD.md          # Product Requirements Document
│   └── overview.md     # Developer overview
├── design-plans/
│   └── sesi-*.md       # Session logs
└── tools/
    ├── model.test.js   # Physics tests
    ├── ui.test.js      # UI tests
    └── shoot.js        # Screenshot tool
```

---

## 📚 Referensi

1. Kundur, P. (1994). *Power System Stability and Control.* McGraw-Hill.
2. Anderson, P. M., & Fouad, A. A. (2003). *Power System Control and Stability.* IEEE Press.
3. IEEE Std 399-1997. *Recommended Practice for Industrial & Commercial Power Systems.*
4. IEEE Std 421.5-2005. *Excitation System Models for Power Stability Studies.*

---

## 🐛 Status

**Label UNSTABLE** — Masih dalam pengembangan aktif.

### Yang Sudah Diimplementasi:
- ✅ Swing equation dengan RK4 integrator
- ✅ TGOV1 governor model
- ✅ Grid/Island mode
- ✅ Short circuit event
- ✅ EAC visualization
- ✅ Loss of synchronism detection
- ✅ RLR simulation
- ✅ Preset scenarios

### Yang Belum:
- ⏳ Automated test suite
- ⏳ Screenshot baseline
- ⏳ CI/CD pipeline
- ⏳ Mobile responsive

---

## 🤝 Kontribusi

1. Baca `CLAUDE.md` untuk panduan pengembangan
2. Baca log sesi terbaru di `design-plans/`
3. Jalankan test sebelum commit
4. Update dokumentasi jika perlu

---

## 📝 License

Proprietary — Sheva's Simulator Library
