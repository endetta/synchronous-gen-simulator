# Sesi 2026-09-21-02: Tiket 09 — perbaikan temuan audit adversarial fisika

**Tanggal:** 2026-09-21 → 2026-09-22
**Branch:** `fix/critical-governor-and-bugs`
**Commit sebelum:** `bc2e5eb` (docs(sesi): tiket 10 backlog + log sesi push & sinkronisasi)
**Tiket:** `.scratch/sync-gen-fixes/issues/09-audit-adversarial-fisika-2026-09-20.md`

---

## Latar

Tiket 09 mencatat 11 temuan dari workflow audit adversarial 2026-09-20 yang subagent-nya
mati pada langkah output (temuan diekstrak dari reasoning yang pulih + konfirmasi mandiri).
Sebagian belum terkonfirmasi. User memutuskan cakupan: **semua temuan**, plus 9.5 (bekukan
anim post-trip) dan 9.11 (resume AudioContext).

## Kegiatan

### 1. Verifikasi empiris temuan (seam `tools/extract.js`)

Probe mandiri mengkonfirmasi:
- **9.2** — geser `Xs`/`Pm`/`Ef` pasca-event membalik verdict EAC STABIL → TIDAK STABIL (A₂ bisa negatif)
- **9.3** — pasca-trip: `sc_active=true`, `eac_phase='fault'` → badge SC menyala + narasi "FAULT AKTIF" menggantung
- **9.6** — pasca-trip geser Ef 1.5→2.6 & Xs 1.2→0.6: Pe 0.0151→0.0436, Pmax 0.060→0.173 (fisika beku, readout berubah)
- **9.7** — handoff RLR→grid lompatan **−0.1258 pu** (audit: −0.1131; beda setup probe)
- **9.9** — `setMode('grid')` saat RLR jalan: mode berubah, RLR tetap jalan → f display bohong
- **9.11** — `getACtx()` tak pernah `ac.resume()`

### 2. Perbaikan (TDD, commit per unit)

| Commit | Tiket | Isi |
|--------|-------|-----|
| `80d276a` | 9.2 | Snapshot `Pmax`/`Pm`/`delta_cleared` saat clear (`eac_snap`), dipakai di `getA2Available` selama fase post/done |
| `de4495d` | 9.3/9.5/9.6 | Trip: tutup event SC, bekukan `s.anim`, `freezeSliders(true)`; guard `slidersFrozen()` di onSl/numSl/adjSl |
| `351eda0` | 9.7/9.8/9.9 | Handoff bumpless (setpoint grid = daya aktual saat handoff), `uiSl('Pm',S.Pm)`, `setMode` hentikan RLR saat ke grid |
| `4d91b40` | 9.1/9.11 | Dokumentasi batas akurasi A₁ (terukur 3–6%, underestimate → condong STABIL); `ac.resume()` bila suspended |

### 3. Temuan teknis selama perbaikan

- **9.2**: galat awal — `getA2Available` dipanggil ulang tiap frame dari parameter live.
  Snapshot dipasang pada transisi `fault`→`post`, dibersihkan di `trigSC`/`runSc`/reset.
- **9.7**: `getPmEff(S)` harus ditangkap **sebelum** `setMode('grid')` — setelah itu
  `govActive` false sehingga `getPmEff` mengembalikan `s.Pm` (beban profil yang lag),
  bukan `Pm_gov` (daya aktual). Setpoint grid = daya termal terakhir.
- **9.1**: klaim audit "galat 2.03% pada 0.18 s" **tidak tepat** — verifikasi ulang
  memberi 3.97% (dan 5.93%/4.76%/2.84% pada 0.12/0.15/0.25 s). Komentar kode memakai
  angka hasil verifikasi sendiri, bukan mengulang klaim audit.
- **Jebakan test**: `startRLR()` memanggil `doReset(false)` yang membuat state baru;
  test harus `getS_()` ulang setelahnya. Ini sempat membuat test gagal keliru.

## Hasil

- 10 temuan tiket 09 selesai (2 dokumentasi/keputusan, 8 fix); 9.4 tidak perlu perubahan
  (overshoot 0.2° pada skenario standar).
- Tes baru: `eac-snapshot.test.js` (5), `post-trip-freeze.test.js` (8), `rlr-handoff.test.js` (8).
- Suite penuh 10 file + end-to-end (38 assertion) — **semua PASS**.

## Status plan terkait

- Tiket 09 → **done** (dengan catatan terutang: integrasi A₁ midpoint bila verdict ambang jadi concern).
- Tiket 10 (freq-chart alignment) → tetap backlog.

## Langkah berikutnya

- Manual browser test: verifikasi visual freeze slider + banner pasca-trip, dan
  handoff RLR→grid tanpa lompatan daya (shoot.js/manual).
- Bila verdict ambang jadi perhatian: ganti integrasi A₁ ke aturan titik-tengah.
- Pertimbangkan PR `fix/critical-governor-and-bugs` → `master` (kini identik di origin).