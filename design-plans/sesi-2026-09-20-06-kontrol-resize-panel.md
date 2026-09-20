# Sesi 2026-09-20-06 — Kontrol Resize Panel (tombol +/−/⤢)

**Tanggal:** 2026-09-20
**Waktu mulai:** ±09:30
**Waktu selesai:** ±11:30
**AI/Developer:** Claude Code (sesi Level 1)

---

## Commit Sebelum Sesi

```
bfa43e8 fix(time-series): perbaiki stretching & drag Panel III saat resize
```

---

## Tujuan Sesi

Memperbaiki kontrol memperbesar section/panel. Keluhan user: satu-satunya cara
memperbesar panel adalah menarik handle di tepi bawahnya, tetapi Panel III
(Time Series) adalah panel **terakhir** di `#vizScroll` — tidak ada ruang di
bawahnya, sehingga menariknya ke bawah sangat sulit.

---

## Kegiatan & Hasil

### 1. Diagnosis akar masalah (terukur, bukan asumsi)

**Apa yang dilakukan:**
- Ukur posisi handle Panel III dan ruang gerak yang tersedia di dalam
  `#vizScroll` memakai Playwright.

**Hasil (angka sebelum perbaikan):**
- Handle `#pane3` berada **106px di bawah lipatan** saat `scrollTop=0`.
- Setelah scroll ke dasar: `roomToMoveDown = 0px` — pane tidak punya ruang
  untuk tumbuh ke bawah.
- Setiap siklus scroll+drag hanya menghasilkan **~2px** pertumbuhan
  (butuh ~140 siklus untuk +300px). Ini persis yang dikeluhkan user.

### 2. Implementasi kontrol `+/−/⤢` di setiap panel

**Apa yang dilakukan:**
- CSS `.pane-resize`: klaster tombol **di-anchor ke ATAS panel** (bukan bawah)
  agar selalu terlihat. Kanan-atas dipilih karena `.vlabel` sudah di kiri-atas;
  Panel I punya `.anim-mode-toggle` di kanan-atas juga sehingga kontrolnya
  digeser turun lewat override `#pane1 .pane-resize{top:30px}`.
- Markup: 3 tombol `<button type="button">` per panel (−, +, ⤢) dengan
  `title` + `aria-label` Bahasa Indonesia, plus label ukuran `[data-pane-size]`.
- JS: `resizePane(id,dir)` (langkah 60px, clamp `[MIN_PANE_H, paneMaxH()]`),
  `toggleMaximizePane(id)` (simpan/pulihkan tinggi, kelas `.zoomed`),
  `updatePaneSizeLabel(id)`, `initPaneResizeControls()` dipanggil di jalur boot.
- Drag: clamp atas `paneMaxH()` + **auto-scroll** saat kursor mendekati tepi
  bawah viewport (`DRAG_EDGE_ZONE=48px`, `DRAG_SCROLL_SPEED=14`), sehingga drag
  ke bawah kini benar-benar menambah tinggi.

**Hasil:**
- Panel III tumbuh **300px → 692px** dengan 7 klik, tanpa drag sama sekali.
- Lantai `MIN_PANE_H = 276px` (4 chart × 60px + padding) dihormati.
- Maksimalkan/pulihkan kembali persis ke tinggi semula (692px → 276px).
- Chart tetap tajam: **distorsi aspek 0.0%** setelah semua resize.

**Kendala (dan solusinya):**
- `MAXIMIZE_RATIO=0.9` > `PANE_MAX_RATIO=0.85` membuat tombol `+` **mengecilkan**
  panel yang sudah dimaksimalkan (733px → 692px). Diperbaiki:
  `MAXIMIZE_RATIO = PANE_MAX_RATIO`.
- Kontrol awal bertumpuk dengan `.anim-mode-toggle` di Panel I (terdeteksi lewat
  screenshot). Percobaan pertama (`left:10px`) akan bertabrakan dengan `.vlabel`
  (sama-sama `top:6px;left:10px`), jadi dipilih tetap `right:10px` + `top:30px`.
- `body.is-dragging` ditambahkan agar tombol tidak terklik tak sengaja saat drag.

### 3. Verifikasi (TDD + bukti browser)

**Apa yang dilakukan:**
- Tes sumber baru `tools/pane-resize-controls.test.js` (13 assertion) — RED 3/13
  → GREEN 13/13.
- `tools/verify-pane-controls-browser.js` (10 check) dan
  `tools/verify-pane-controls-layout.js` (15 check) — Playwright DPR 2.
- Screenshot `tools/shoot-pane-controls.js` → `resize-default`,
  `resize-enlarged`, `resize-maximized`.

**Hasil (bukti):**
- `pane-resize-controls.test.js` 13/13 · `time-series-resize.test.js` 10/10 ·
  `ui.test.js` 79/79 · `chart-scale.test.js` 17/17 · layout 15/15.
- Regresi 18 suite lain: **semua exit 0** (~259 assertion).
- Verifikasi tambahan terhadap **blob yang di-stage** (bukan working tree):
  **11/11 PASS**, termasuk tanpa error JS, 4 chart hidup, 3 klaster kontrol,
  3 drag-handle.

**Kendala (dan solusinya):**
- Patch `-U0` (tanpa konteks) mendaratkan `const id=drag.id` **sebelum** guard
  `if(!drag)return` di blob staged → `TypeError: Cannot read properties of null`.
  Terdeteksi justru karena verifikasi dijalankan terhadap blob staged, bukan
  working tree. Diperbaiki dengan membangun ulang patch dari `diff -U3`
  (berkonteks) — `git apply` tidak lagi bisa salah posisi.
- Working tree dipakai bersama beberapa sesi paralel; diff berisi hunk milik
  sesi lain (penghapusan CDN zoom, rate-limit narasi, tooltip a11y,
  `prefers-reduced-motion`). Commit dipisah per-hunk: hanya hunk milik sesi ini
  yang di-stage; hunk campuran (`body.is-dragging` + `prefers-reduced-motion`,
  `initPaneResizeControls` + `initA11yLabels`) dipangkas agar hanya baris milik
  sesi ini yang ikut.

---

## Status Plan Terkait

Tidak ada plan formal; ini perbaikan langsung atas keluhan user (lanjutan dari
`sesi-2026-09-20-03-time-series-resize-fix.md` yang memperbaiki *stretching*;
sesi ini memperbaiki *kontrolnya*).

---

## Langkah Berikutnya

- Pantau apakah kontrol `+/−/⤢` cukup, atau user ingin kontrol tambahan
  (mis. pintasan keyboard, drag handle atas, tombol "kembalikan semua").
- Sesuaikan `PANE_STEP` (60px) bila terasa terlalu kasar/halus.

---

## File yang Berubah

| File | Jenis |
|---|---|
| `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` | CSS `.pane-resize`, markup 3 klaster, JS `resizePane`/`toggleMaximizePane`/`initPaneResizeControls`, drag auto-scroll |
| `tools/pane-resize-controls.test.js` | baru — 13 assertion |
| `tools/verify-pane-controls-browser.js` | baru — 10 check browser |
| `tools/verify-pane-controls-layout.js` | baru — 15 check tata letak |
| `tools/shoot-pane-controls.js` | baru — screenshot bukti |
