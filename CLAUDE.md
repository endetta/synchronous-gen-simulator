# CLAUDE.md — Synchronous Generator Simulator (LEVEL 1)

File ini memberi panduan kepada agen coding (Claude Code / Codebuff / Freebuff CLI / dll.)
saat bekerja di **Synchronous Generator Simulator** — simulator operasi generator sinkron
PLTU berbasis HTML vanilla.

## Tentang Project

**Produk:** Simulator operasi generator sinkron dengan model klasik E' (transient reactance)
dan governor TGOV1 untuk studi stabilitas transient.

**Stack:** HTML vanilla single-file (`LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`),
tanpa build step, tanpa framework. CSS inline, JavaScript inline.

**Status:** UNSTABLE — masih dalam pengembangan. Label di nama file adalah resmi, jangan diubah.

**Repo GitHub:** https://github.com/endetta/synchronous-gen-simulator

## Pintu Masuk

- **File utama:** `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` — buka langsung di browser
- **Dokumentasi:** `docs/` — PRD, overview, referensi
- **Testing:** `tools/` — harness testing (Node.js)
- **Desain:** `design-plans/` — rencana fitur, log sesi

## Tools & Test Harness (WAJIB DIPERHATIKAN SEBELUM TASK)

**PENTING:** Sebelum mengerjakan task user, SELALU pertimbangkan tools/test berikut untuk mempercepat dan memaksimalkan hasil:

### Test Harness Tersedia

| Test File | Fungsi | Command | Status |
|-----------|--------|---------|--------|
| `tools/model.test.js` | Validasi physics engine (swing equation, EAC, RK4, governor) | `node tools/model.test.js` | ✅ 17 tests passing |
| `tools/ui.test.js` | Validasi struktur HTML, DOM elements, UI controls | `node tools/ui.test.js` | ✅ 79 tests passing |
| `tools/chart-scale.test.js` | Validasi scale stabilizer untuk time series charts | `node tools/chart-scale.test.js` | ✅ 17 tests passing |

**Total: 113 tests passing** — Jalankan sebelum dan sesudah perubahan signifikan.

### Kapan Menggunakan Test Harness

1. **Sebelum task:**
   - Cek apakah fitur yang akan diubah punya test coverage
   - Baca test file untuk memahami expected behavior
   - Gunakan sebagai "living documentation"

2. **Selama task:**
   - Jalankan test spesifik untuk verifikasi incremental
   - Tambah test case baru jika menemukan edge case

3. **Sesudah task:**
   - Jalankan semua tests: `node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js`
   - Pastikan tidak ada regression
   - Commit hanya jika semua tests pass

### Tools Lainnya

| Tool | Fungsi | Command | Catatan |
|------|--------|---------|---------|
| `tools/shoot.js` | Screenshot automation untuk 8 view states | `node tools/shoot.js` | ⚠️ Chrome headless issue (manual testing preferred) |
| `tools/lens-harness.js` | Mock-DOM harness untuk load simulator di Node.js | Required oleh test files | Jangan diubah tanpa alasan kuat |

### Workflow dengan Test Harness

```
User request → Baca CLAUDE.md → Cek relevant tests → Implementasi → Run tests → Verify pass → Commit
```

**Contoh:**
- Task: "Fix bug di physics engine" → Jalankan `model.test.js` dulu untuk lihat expected behavior
- Task: "Ubah UI parameter inputs" → Jalankan `ui.test.js` untuk cek struktur yang diharapkan
- Task: "Improve chart rendering" → Jalankan `chart-scale.test.js` untuk verifikasi scale logic

## Model Fisika (Sumber Kebenaran)

Simulator mengimplementasikan:

### Swing Equation (Kundur 1994 §11.1)
```
M · d²δ/dt² = Pm - Pe - D · (dδ/dt)
```
di mana:
- `M = 2H/ωs` (inertia)
- `δ` = power angle (rad)
- `Pm` = mechanical power (pu)
- `Pe = Pmax · sin(δ)` = electrical power (pu)
- `D` = damping coefficient (pu)
- `Pmax = E' · V / X'd` = maximum transferable power

### Governor TGOV1 (IEEE Std 421.5)
- `T₁ = 0.5 s` — servo time constant
- `T₂ = 3.5 s` — steam chest + reheater time constant
- `R = 5%` — droop

### Equal Area Criterion (EAC) — Kundur 1994 §11.2-11.3
- `δ_cr = π - δ₀` — critical angle
- `δ_cc = arccos[Pm(π-2δ₀)/Pmax - cos(δ₀)]` — critical clearing angle
- `CCT = √[4H(δ_cc-δ₀)/(ωs·Pm)]` — critical clearing time

### Mode Operasi
1. **Grid-Connected:** Infinite bus, f = 50 Hz fixed, damping +2 pu
2. **Island Mode:** Standalone, f varies, governor aktif

## Aturan Pengembangan

1. **Bahasa.** UI, komentar, dan dokumentasi = **Bahasa Indonesia**. Istilah teknis
   (swing equation, damping, governor, EAC, dll.) biarkan dalam bahasa Inggris.

2. **Tidak ada build.** Jalankan dengan membuka `.html` langsung di browser, atau
   `python -m http.server` / `npx serve` untuk live reload.

3. **Validasi.** Test harness formal tersedia di `tools/`. Jalankan sebelum dan sesudah perubahan:
   ```bash
   # Run all tests
   node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js
   
   # Or individual tests
   node tools/model.test.js      # Physics validation (17 tests)
   node tools/ui.test.js          # UI structure (79 tests)
   node tools/chart-scale.test.js # Chart rendering (17 tests)
   ```
   
   Manual browser testing tetap diperlukan untuk:
   - Verifikasi visual: phasor animation, P-δ curve, time series
   - Interaksi user: parameter inputs, mode switching, preset scenarios
   - Cek console untuk error

4. **Jangan mengubah nama file HTML.** Nama file dengan label UNSTABLE adalah resmi.
   Update semua referensi bila file di-rename.

5. **Windows + Git Bash.** Semua perintah lewat bash POSIX (`ls`, `mv`, `rm`, `git`);
   jangan pakai `del`/`move`/`dir`.

6. **Log sesi wajib.** Setiap tugas non-sepele: buat log di
   `design-plans/sesi-YYYY-MM-DD-NN-*.md` (template: `design-plans/sesi-TEMPLATE.md`).
   Cantumkan: waktu mulai + commit sebelum → kegiatan & hasil → status plan → langkah berikutnya.

7. **Referensi akademik.** Simulator berbasis:
   - Kundur, P. (1994). Power System Stability and Control. McGraw-Hill.
   - Anderson, P. M., & Fouad, A. A. (2003). Power System Control and Stability. IEEE Press.
   - IEEE Std 399-1997, IEEE Std 421.5-2005

## Fitur Saat Ini

1. **Visualisasi:**
   - Panel I: Phasor animation (rotor-stator)
   - Panel II: P-δ curve dengan Equal Area Criterion
   - Panel III: Time series (δ, ω, f, P)

2. **Mode operasi:**
   - Grid-connected (infinite bus)
   - Island mode (standalone)

3. **Parameter generator:**
   - H (inertia constant): 1-15 s
   - D (damping): 0-15 pu
   - X'd (transient reactance): 0.05-3 pu
   - Ef (excitation voltage): 0.1-3 pu

4. **Prime mover:**
   - Pm (mechanical power): 0.01-3 pu
   - Governor TGOV1 (T₁=0.5s, T₂=3.5s, R=5%)

5. **Short Circuit Event:**
   - 3-phase fault trigger
   - Configurable onset delay dan duration
   - EAC visualization (A₁, A₂ areas)
   - Loss of synchronism detection

6. **Real Load Response (RLR):**
   - 24-hour load profile dalam 36 detik (2400× speed)
   - IEEE Std 399-1997 load curve
   - LFC simulation (Kundur 1994 §11)

7. **Preset Scenarios:**
   - Load Step
   - Grid vs Island
   - SC Berhasil Clear
   - SC Gagal Clear
   - Overexcitation

## Roadmap

- [x] Test harness dengan Node.js (lens-harness.js) — ✅ 113 tests passing
- [x] GitHub repo initialization — ✅ https://github.com/endetta/synchronous-gen-simulator
- [x] Chart.js integration untuk time series visualization
- [ ] Stabilisasi fitur core — manual browser testing
- [ ] Screenshot automation (shoot.js) — ⚠️ Chrome headless issue
- [ ] Dokumentasi PRD formal
- [ ] CI/CD dengan GitHub Actions

## Catatan Penting

- **Label UNSTABLE** di nama file adalah status resmi — jangan dihapus sampai fitur stabil.
- Simulasi real-time menggunakan `requestAnimationFrame` dengan physics step `PHDT = 0.003s`.
- Visual phasor rotation speed: `VSPD = 2π/7` rad/s (1 revolusi per 7 detik).
- History window: 30 detik untuk time series.
