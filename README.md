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
# Suite inti (fisika, UI, chart)
npm test

# Tes fisika individual — semua mengekstrak fungsi dari HTML via tools/extract.js
node tools/model.test.js                  # fisika vs analitik
node tools/governor-steady-state.test.js  # governor island/RLR
node tools/eac-verdict.test.js            # kriteria stabilitas EAC
node tools/oos-trip.test.js               # loss-of-synchronism latch
node tools/reactive-power.test.js         # Q, S, power factor

# Screenshot automation
node tools/shoot.js
```

**Catatan:** tes fisika mengekstrak fungsi langsung dari blok `<script>` HTML
(`tools/extract.js`) — tidak ada rumus yang disalin ke file tes, sehingga
menghapus atau mengubah fungsi fisika akan membuat tes GAGAL.

---

## 📁 Struktur File

```
LEVEL 1 - SYNCHRONOUS GEN (UNSTABLE)/
├── CLAUDE.md
├── README.md
├── .gitignore
├── LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html
├── docs/
│   ├── PRD.md          # Product Requirements Document (sumber kebenaran model)
│   └── overview.md     # Developer overview
├── design-plans/
│   └── sesi-*.md       # Log sesi
└── tools/
    ├── extract.js      # Seam ekstraksi fisika dari HTML
    ├── model.test.js   # Fisika vs analitik
    ├── governor-steady-state.test.js
    ├── eac-verdict.test.js
    ├── oos-trip.test.js
    ├── ui.test.js      # Struktur DOM
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
- ✅ TGOV1 governor model (island/RLR + bumpless transfer)
- ✅ Grid/Island mode
- ✅ Short circuit event
- ✅ EAC visualization + verdict buku teks (A₂ tersedia ≥ A₁)
- ✅ Loss of synchronism detection (latch + fisika berhenti)
- ✅ RLR simulation
- ✅ Preset scenarios
- ✅ Daya reaktif Q / S / power factor
- ✅ Test suite dengan seam ekstraksi dari HTML

### Yang Belum:
- ⏳ Screenshot baseline (shoot.js punya masalah Chrome headless)
- ⏳ CI/CD pipeline
- ⏳ Mobile responsive
- ⏳ Zoom/pan pada time series

---

## 🤝 Kontribusi

1. Baca `CLAUDE.md` untuk panduan pengembangan
2. Baca log sesi terbaru di `design-plans/`
3. Jalankan test sebelum commit
4. Update dokumentasi jika perlu

---

## 📝 License

Proprietary — Sheva's Simulator Library
