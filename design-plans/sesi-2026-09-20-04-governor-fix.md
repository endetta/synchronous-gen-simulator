# Sesi 2026-09-20-04: Perbaikan Governor Island/RLR Double-Count (Tiket 01)

**Tanggal:** 2026-09-20  
**Branch:** `fix/critical-governor-and-bugs`  
**Commit sebelum:** `4db7a45` (docs(sesi): catat hasil verifikasi visual fitur daya reaktif)  

---

## Apa yang ditemukan

### Bug: Governor double-count `Pm` setpoint → loss of synchronism

**Commit `31b594d`** (Sept 9) menambahkan `s.Pm` ke dalam servo TGOV1:

```javascript
d_Xg = gov ? (1/T1)*(s.Pm - omega/R - Xg) : -Xg/0.05;
```

**Tetapi** konsumsi daya tetap `Pm_eff = s.Pm + s.Pm_gov`, yang menghitung **setpoint dua kali**. Verifikasi numerik mandiri (integrasi RK4 80 s, tiga skenario) membuktikan dampaknya:

| Skenario | Hasil sebelum | Hasil sesudah |
|---|---|---|
| Klik Island Mode, Pm=0.8 | δ=33.597° (OOS) | δ=39.7° stabil |
| Preset Grid vs Island (28 s) | OOS pada t≈24s | δ=35.2° stabil |
| RLR 36 s | OOS jam 9.3 (sore peak) | max\|δ\|=37.0° stabil |

### Akar penyebab

`Pm_gov` adalah **output** governor, bukan koreksi bertambah. Di island/RLR, `Pm_eff` harus **sama dengan** `Pm_gov`, bukan `s.Pm + Pm_gov`. Di grid mode, governor tidak aktif dan `Pm_eff = s.Pm` langsung (dengan damping tambahan D+2).

---

## Apa yang dilakukan

### Perubahan kode HTML

1. **Helper baru** `govActive(s)` + `getPmEff(s)` (lines 508–520) — satu sumber kebenaran untuk Pm_eff, dipakai oleh ode, getCC, getCCT, stepPhys, autoNarr, updateCards, updateHdr, updateSvgPdelta, updateTimeCharts.

2. **`ode()` line 539–549**: `Pm_eff = gov ? Pm_gov : s.Pm` — governor menghasilkan daya, tidak menambahkannya.

3. **`setMode()` line 2612–2619**: bumpless transfer — saat masuk island, seed `S.Xg = S.Pm`, `S.Pm_gov = S.Pm` agar daya tidak jatuh ke nol saat switch.

4. **`startRLR()` line 2689**: bumpless inisialisasi governor = beban awal.

5. Semua konsumen lama `Math.min(Math.max(s.Pm+s.Pm_gov,0),3.5)` diganti ke `getPmEff(s)` / `getPmEff(S)`.

### Test seam baru

- `tools/extract.js` — mengekstrak fungsi fisika langsung dari blok `<script>` HTML, dengan stub DOM minimal. Tidak perlu mengubah HTML untuk testing.
- `tools/governor-steady-state.test.js` — 7 assertion: (1) island steady-state Pm_eff→Pm setpoint, (2) grid→island bumpless (delta jump < 0.02 rad), (3) grid mode governor dormant.

### Seam test proof (fail-before-fix)

Sebelum perbaikan:

```
✗ Pm_eff converges to Pm setpoint (0.8 pu) — expected 0.8 ± 0.03, got 0.267
✗ delta stays bounded (< 90 deg), system stable
✗ delta tidak lompat > 0.02 rad pada grid→island switch — got 326.73 rad
```

Setelah perbaikan:

```
✓ Pm_eff converges to Pm setpoint (0.8 pu) (Δ=1.21e-8)
✓ Pm_gov converges to Pm setpoint (Δ=1.21e-8)
✓ delta stays bounded (< 90 deg), system stable
=== Summary: Passed: 7  Failed: 0 ===
```

---

## Verifikasi

```bash
$ node tools/governor-steady-state.test.js    → 7 passed, 0 failed
$ node tools/verify-governor-fix.js          → SEMUA SKENARIO STABIL ✓
$ node tools/model.test.js            → 17 passed
$ node tools/ui.test.js            → 79 passed
$ node tools/reactive-power.test.js       → 55 passed
$ (semua file test lain tetap hijau)
```

---

## Langkah berikutnya

- Tiket 02: Generalisasi seam `extract.js` untuk semua tes (migrasi `model.test.js` off inline-rumus).
- Tiket 03: Perbaiki verdict EAC (A₂ accumulation + faktor ×0.8).
- Tiket 04: Loss-of-synchronism harus benar-benar trip.
