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
| `tools/model.test.js` | Fisika vs analitik (swing, EAC, RK4, RLR, Q/pf) | `node tools/model.test.js` | ✅ 25 assertion |
| `tools/governor-steady-state.test.js` | Governor island/RLR steady-state + bumpless transfer | `node tools/governor-steady-state.test.js` | ✅ 7 assertion |
| `tools/eac-verdict.test.js` | Kriteria stabilitas EAC buku teks (A₂ tersedia ≥ A₁) | `node tools/eac-verdict.test.js` | ✅ 6 assertion |
| `tools/oos-trip.test.js` | Latch loss-of-synchronism + fisika berhenti saat trip | `node tools/oos-trip.test.js` | ✅ 6 assertion |
| `tools/ui.test.js` | Validasi struktur HTML, DOM elements, UI controls | `node tools/ui.test.js` | ✅ 79 tests passing |
| `tools/chart-scale.test.js` | Validasi scale stabilizer untuk time series charts | `node tools/chart-scale.test.js` | ✅ 17 tests passing |
| `tools/reactive-power.test.js` | Daya reaktif Q, S, pf (ekstrak dari HTML) | `node tools/reactive-power.test.js` | ✅ 55 assertion |

Jalankan `npm test` untuk suite inti; jalankan file lain di `tools/*.test.js`
secara individual (time-series, layout, performa).

### Seam Pengujian — `tools/extract.js`

Tes fisika **mengekstrak fungsi langsung dari blok `<script>` HTML** (stub DOM
minimal, tanpa perlu build atau browser). Ini berarti:

- Menghapus atau me-rename fungsi fisika di HTML akan membuat tes GAGAL dengan
  pesan `SEAM GAGAL: ...` yang menyebut fungsi mana yang hilang.
- Daftar fungsi wajib ada di konstanta `REQUIRED` di `tools/extract.js`.
- Kalau menambah fungsi fisika baru yang perlu dites, tambahkan ke `names`
  dan (bila wajib) ke `REQUIRED`.

**Jangan** menyalin rumus fisika ke dalam file tes — pakai ekstraksi. Tes yang
menyalin rumus akan tetap hijau meski HTML diubah total (jebakan yang sudah
diperbaiki di commit `2b1644c`).

### Kapan Menggunakan Test Harness

1. **Sebelum task:**
   - Cek apakah fitur yang akan diubah punya test coverage
   - Baca test file untuk memahami expected behavior
   - Gunakan sebagai "living documentation"

2. **Selama task:**
   - Jalankan test spesifik untuk verifikasi incremental
   - Tambah test case baru jika menemukan edge case

3. **Sesudah task:**
   - Jalankan `npm test` + tes terkait; pastikan tidak ada regresi
   - Commit hanya jika semua tests pass

### Tools Lainnya

| Tool | Fungsi | Command | Catatan |
|------|--------|---------|---------|
| `tools/extract.js` | Seam ekstraksi fisika dari HTML (stub DOM) | dipakai oleh tes | Jangan diubah tanpa alasan kuat |
| `tools/shoot.js` | Screenshot automation untuk 8 view states | `node tools/shoot.js` | ⚠️ Chrome headless issue (manual testing preferred) |

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

**Pemetaan daya (JANGAN diubah tanpa membaca ini):** saat governor aktif
(island / RLR), `Pm_gov` **adalah** daya mekanik efektif — `Pm` hanya setpoint
yang dikejar servo. `Pm_eff = getPmEff(s)` memilih `Pm_gov` atau `Pm`
tergantung `govActive(s)`. Menjumlahkan keduanya (`s.Pm + s.Pm_gov`)
menghitung setpoint dua kali dan menyebabkan island mode selalu loss of
synchronism — bug yang diperbaiki di commit `12125cc` dan dijaga oleh
`tools/governor-steady-state.test.js`.

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

8. **Sesi paralel = worktree terpisah (WAJIB).** Proyek ini hanya punya SATU file
   HTML sebagai produk, jadi dua sesi yang mengedit bersamaan pasti bertabrakan.
   Audit 2026-09-20 menemukan tiga sesi paralel mengedit file yang sama dalam satu
   working tree; diff harus diselamatkan manual (`.scratch/stage-mine.sh`). Aturan:
   - Maksimum **satu** sesi memegang working tree utama pada satu waktu.
   - Bila butuh paralel: buat worktree (`git worktree add ../sgen-<topik> -b <cabang>`),
     kerjakan di sana, merge setelah selesai. Jangan saling menimpa di tree utama.
   - Sebelum mulai: cek `git worktree list` + `git status` untuk tahu sesi lain.

9. **Push sebelum ganti sesi (WAJIB).** Jangan menunda push dengan alasan "menunggu
   sesi paralel selesai" — audit menemukan cabang `fix/critical-governor-and-bugs`
   tertinggal 33 commit dari `master` dan 3 commit belum di-push. Setiap akhir tugas
   non-sepele: `git push` cabang aktif. Bila `master` tertinggal jauh, buka PR/merge
   agar cabang kanonik memuat fix fisika yang CLAUDE.md sitasi.

10. **Checkpoint untuk tugas panjang.** Jangan berjalan otonom > ±30–60 tool call
    tanpa laporan. Di setiap checkpoint sebutkan: file yang berubah, hasil tes,
    risiko terbuka. Setelah perbaikan UI, smoke-test panel tetangga (Panel I/II/III)
    sebelum lanjut — beberapa regresi pada 2026-09-19/20 baru ketahuan setelah
    panel lain rusak.

11. **Gunakan tool khusus, bukan Bash, untuk inspeksi.** Pakai Read/Grep/Glob untuk
    membaca & mencari; Bash untuk menjalankan tes/git. Hindari menulis path Windows
    ber-apostrof ke dalam string shell (memicu `InputValidationError`); andalkan
    working directory sesi, jangan mengulang `cd` yang sama.

12. **Checklist anti-gagal tool (post-mortem 2026-09-23).** 8 dari 9 error "edit
    file"/`InputValidationError` berulang bukan bug tool, melainkan pemakaian salah.
    Wajib sebelum tiap edit/substantif:
    - **Satu Edit per file per blok** — dua Edit ke file SAMA dalam satu blok paralel
      memakai snapshot basi → error "File has been unexpectedly modified".
    - **`old_string` unik** — `grep -n` dulu; sertakan 2-3 baris konteks, atau
      `replace_all:true` bila sengaja (error "Found 2 matches").
    - **Read area sekitar dulu** sebelum Edit — cegah duplikat nama/var
      (`SyntaxError` pasca-Edit).
    - **Jangan `node -e` kompleks di PowerShell** (quote/`$`/kurawal dimakan shell) —
      tulis file `.js` sementara lalu `node file.js`.
    - **Strip komentar dulu untuk assertion substring** — `Date.now()` di komentar
      "BUKAN Date.now()" terhitung false positive (pola `stripComments` di tes).
    - **CRLF-safe** — file HTML ini CRLF (3425 baris); jangan asumsi LF
      (`indexOf('\n}\n')` gagal); normalisasi `\r\n`→`\n` saat parsing teks file.
    - **Jangan panggil tool dengan param kosong** — isi `file_path`/`pattern` eksplisit.
    - **`InputValidationError: could not be parsed as JSON` berulang** = transien dari
      rantai router (`routers9-starter`, translasi /v1/chat/completions) — SATU tool
      call per blok (juga mencegah 2-Edit-paralel), retry saat kena, jangan galau.

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

- [x] Test harness dengan Node.js (seam ekstraksi `tools/extract.js`) — fisika diekstrak dari HTML, bukan disalin
- [x] GitHub repo initialization — ✅ https://github.com/endetta/synchronous-gen-simulator
- [x] Chart.js integration untuk time series visualization
- [x] Dokumentasi PRD formal (docs/PRD.md)
- [ ] Stabilisasi fitur core — manual browser testing
- [ ] Screenshot automation (shoot.js) — ⚠️ Chrome headless issue
- [ ] CI/CD dengan GitHub Actions

## Catatan Penting

- **Label UNSTABLE** di nama file adalah status resmi — jangan dihapus sampai fitur stabil.
- Simulasi real-time menggunakan `requestAnimationFrame` dengan physics step `PHDT = 0.003s`.
- Visual phasor rotation speed: `VSPD = 2π/7` rad/s (1 revolusi per 7 detik).
- History window: 30 detik untuk time series.
