# Sesi 2026-09-20-03 — Perbaikan Responsif Panel III (Time Series)

**Tanggal:** 2026-09-20 · **Waktu:** 08:45–10:30 · **Cabang:** `fix/critical-governor-and-bugs`

---

## Commit Sebelum Sesi

```
ddcca16 docs(sesi): isi commit hash di log verifikasi armature reaction
```

---

## Permintaan User

Panel III (time series, 4 chart): tinggi/panjang harus bisa diatur fleksibel dan
responsif. Gejala: saat tarik ke bawah, **tulisan stretching/melar**, tarikan berat,
tampilan jelek.

---

## Root Cause (terverifikasi terukur)

1. **Bitmap stale:** `resizeTimeCharts()` = stub `return;`. CSS box membesar
   (64→139px) tapi backing store tetap (128px, DPR 2) → browser upscale non-uniform
   → **distorsi aspek 54%** (scaleX 0.667 vs scaleY 1.455). Inilah "tulisan melar".
2. **Scroll-lock tiap mousemove:** handler drag menulis `vizScroll.scrollTop` tiap
   frame → melawan kursor, tarikan terasa berat.
3. **Lantai drag 120px** di bawah lantai konten (4×60px min-height + padding + gap
   = 276px) → chart ter-clip saat menyusut.

---

## Solusi

- `MIN_CHART_H=60`, `MIN_PANE_H=276` — satu sumber kebenaran lantai.
- `resizeTimeCharts()` baru: loop `chart.resize(w,h)` (Chart.js menangani DPR),
  skip jika ukuran sama; dipicu via `scheduleTimeChartResize()` **coalesced RAF**
  — sekali per frame maksimal.
- Drag: lantai pakai `MIN_PANE_H`, **scroll-lock dihapus**, resize dipanggil sekali
  di `mouseup`, plus listener `window resize`.
- **Legenda seri overlay** per chart (δ; Δω; Pe/Pm/Qe; f/fnom) — absolut kanan-atas,
  `pointer-events:none`, tidak memakan tinggi plot.

---

## Verifikasi

### TDD
- `tools/time-series-resize.test.js` (baru): RED 1/10 → GREEN 10/10.
- **Bukti backtest:** HTML di-stash ke versi lama → browser test mendeteksi bug
  persis seperti keluhan user (bitmap beku 128→128px, distorsi 54%, lantai 120px),
  lalu di-pop kembali → semua hijau.

### Browser (`tools/verify-resize-browser.js`, Playwright, DPR 2)
- Buggy: bitmap beku, distorsi 54%.
- Fixed: bitmap 128→278px mengikuti CSS 64→139px, **distorsi 0.0%**, legenda 4/4,
  lantai 276px, tanpa error runtime. **PASS 11/11.**

### Regresi (13 suite, dijalankan ulang oleh subagen)
`model(17) ui(79) chart-scale time-series-render(8) time-series-resize(10)
chart-smoothing xaxis-stability xaxis-sliding-window performance
timeseries-title-clearance(3) pdelta-label-layout(3) reactive-power(55)
anim-mode-toggle` — **SEMUA GREEN (190+ tes).**

### Visual
`tools/shoot-pane3.js` → `tools/shots/pane3-{default-300,tall-620,short-276}.png`
+ `viz-full.png`: teks tajam, legenda terbaca, tidak ada stretching di semua tinggi.

---

## Kendala Penting: Diff Tercampur Sesi Paralel

Saat commit, ternyata working tree juga berisi implementasi **Fase 0 medan magnet**
(sesi lain, mungkin "Engine"): `g-flux`, `g-rmf`, `buildCoilPath`, `fluxCache`
(hunk old-line 1075–1191 + `tools/realistic-field.test.js`).

Dipisahkan tanpa interaktif: hunk difilter berdasar old-start ≥1600 (punya saya)
vs <1600 (punya sesi lain) → `mine.patch` → `git apply --cached`. Hasil:
staged hanya 74+/27− (bukan 316+/117− campuran), simbol medan magnet di staged = 0.

**Peringatan untuk sesi lain:** perubahan medan magnet masih di working tree,
belum di-commit oleh siapa pun. Jangan saling menimpa.

---

## Status File

| File | Status |
|---|---|
| `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` | M — hanya hunk resize di-staged |
| `tools/time-series-resize.test.js` | baru, staged |
| `tools/verify-resize-browser.js` | baru, staged |
| `tools/shoot-pane3.js` | baru, staged |
| `tools/realistic-field.test.js` | **BUKAN sesi ini** — ditinggal untuk sesi lain |
| `design-plans/sesi-2026-09-20-01-time-series-map.md` | log pemetaan (baca-saja), dibiarkan untracked |
| `mine.patch` | artefak pemisahan, dihapus setelah commit |

---

## Langkah Berikutnya

1. Sesi lain commit pekerjaan medan magnetnya dari working tree yang sama.
2. Opsional: splitter lebar, `object-fit:contain` sebagai pengaman, dokumentasi
   kontrak resize di `docs/overview.md`.
3. Hapus `mine.patch` setelah commit.
