# 08: Coverage tes fitur inti (governor, SC, RLR, reset) — regresi gate yang sebenarnya

**What to build:** Sekelompok tes end-to-end yang **bisa gagal** bila fitur inti rusak. Hari ini `npm test` (model+ui+chart-scale) lolos bahkan ketika (a) governor island mode selalu OOS, (b) RLR crash, (c) SC verdict salah — karena tes hanya memeriksa struktur DOM dan rumus yang disalin, bukan perilaku dinamis.

**Blocked by:** 02 (seam ekstraksi fisika — tes harus menggunakan kode asli dari HTML, bukan kopia). Berjalan paralel dengan 03 & 04.

**Status:** done — commit `15b8f04` (regresi gate fitur inti: governor, SC, RLR, reset). Ditutup 2026-09-21.

## Latar

- `model.test.js`: 17 tes — semua memakai fungsi yang **didefinisikan ulang di dalam file tes**. Hapus `getPmax` dari HTML → tes tetap hijau.
- `ui.test.js`: 79 tes — semua `assertContains(html, '…')` (grep string). Gerakkan slider → tidak terdeteksi.
- `chart-scale.test.js`: 17 tes — memakai class `ScaleStabilizer` yang disalin.
- Tidak ada tes tunggal untuk: governor dynamics, SC state machine, RLR, EAC verdict, trip detection, reset, panel toggle, preset scenario.

## Fokus tes (gunakan `tools/extract.js` dari tiket 02)

Setiap tes ekstrak kode JS langsung dari HTML, jalankan via stub DOM, dan gagalkan build bila hasilnya meleset. Semua tes ini **ditambahkan ke skrip default** (`npm test`).

### A. Governor (tergantung 01)
- `island steady state`: Pm=0.8, setMode('island'), integrasi 80 s → `assertClose(s.Pm_gov, 0.80, 0.02, …)`, `assert( Math.abs(delta_deg) < 120, 'no runaway' )`
- `governor tracks Pm setpoint`: ubah `s.Pm` tengah jalan → `s.Pm_gov` konvergen ke nilai baru dalam toleransi 0.05 pu
- `grid mode governor stays dormant`: `d_Xg = -Xg/0.05` → `Pm_gov → 0`, `Pm_eff → s.Pm`
- `bumpless transfer`: grid→island pada Pm=0.8 → delta tidak lompat lebih dari 2°

### B. Short circuit state machine
- `sc_active window`: `sc_t0=0, sc_delay=1.0, sc_dur=0.15` → `sc_active` true hanya di [1.0, 1.15] s
- `eac_phase progression`: `none → fault (onset) → post (clear) → done`
- `triple-reset of A1/A2`: setiap klik `trigSC()` → `A1_num=0, A2_num=0, eac_phase='none'`
- `fault collapse`: saat `sc_active`, `getPe(s)` ≤ `Pmax * sc_Pfact` (yaitu Pe jatuh drastis)

### C. Preset scenarios (tergantung 01)
- `sc_success` (Pm=0.5, SC 0.15 s): setelah 12 s simulasi, `A2 ≥ A1 → STABIL`, tidak ada OOS
- `sc_fail` (Pm=0.75, SC 0.65 s): delta melewati δ_cr → `oos_tripped = true` (atau |delta| > 160°)
- `grid_island`: sampai t=28 s, tidak pernah OOS
- `overexcitation`: Ef berturun 1.0→1.5→2.0 → Pmax naik secara progresif, δ₀ turun, Q berubah tanda lag→lead→lag
- `load_step`: Pm 0.4→0.85 pada t=4 → transient kemudian settle, delta < 120°

### D. RLR (tergantung 01)
- `completes all 36 s`: `s.t` mencapai ≥ 36 pada akhir profil
- `load profile monotonic-ish`: `getRLRLoad()` (diekstrak dari HTML) mengembalikan 0.58 pada jam 0, 0.958 pada jam 17
- `RLR forces island + governor`: `s.mode === 'island'` dan `Pm_gov` bereaksi terhadap perubahan beban (bukan 0)
- `no OOS during peak`: selama simulasi penuh, |delta_deg| < 160° sepanjang jalan

### E. Reset & state cleanup
- `doReset` mengembalikan ke keadaan semula: delta→δ₀, hist=[], evts=[], sc_* false, oos cleared
- `runSc` membatalkan scenario sebelumnya (evts kosong, timer tidak menumpuk)

## Acceptance criteria

- [ ] File test baru `tools/end-to-end.test.js` diekstrak — gabungkan ke `npm test` skrip
- [ ] ≥12 tes baru, semuanya lolos pada implementasi yang benar (setelah tiket 01)
- [ ] Bukti seam hidup: revert satu baris fiksial (mis. ubah `d_Xg` kembali ke `omega/R` tanpa `s.Pm`) → **setidaknya 3 tes gagal** → kembalikan → semua lolos. Catat di log sesi.
- [ ] `node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js && node tools/end-to-end.test.js` semuanya hijau
- [ ] Tidak ada tes lama yang dikalah-kan (semua 113 tes lama tetap lolos)
