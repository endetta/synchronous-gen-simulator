# Sesi 2026-09-25-02 — Fix cacat Panel III: tepi kanan freq + judul "Time (s)"

**Waktu mulai:** 2026-09-25 ~08:50
**Commit sebelum:** `5e93a13` (worktree `fix-ts-axis-alignment`), luego merge `b6039dc` (master masuk)

## Kegiatan

1. **Merge cabang ke master** (permintaan user): merge `master` masuk di cabang
   (ort), suite hijau → `git push origin master` (2fcc42d..b6039dc). Cabang
   `worktree-fix-ts-axis-alignment` di-push juga.
2. **Rencana fix dua cacat** (laporan user 2026-09-25): (a) tepi kanan kurva
   frekuensi tidak lurus, (b) judul "Time (s)" menimpa sumbu X + angka.
3. **Investigasi akar** (browser-pixel + geometri Chart.js 4.4.1):
   - Cacat 1: `ticks.align 'center'` default → `_calculatePadding` menyisakan
     `lebarLabelTerakhir/2` di kanan → `chartArea.right` freq 982.32–978.99
     bervariasi per label terakhir jendela X; 3 chart lain terkunci di 986.
   - Cacat 2: `Scale.fit()` clamp `min(maxHeight, …)`, `maxHeight = canvas/2`
     = 25.5px (canvas 65) < kebutuhan 46px (tick 8 + label 14.4 + judul 23.6)
     → `drawTitle()` digambar judul di zona label (terukur overlap pixel
     y 32–38 kedua glyph). Padding.bottom yang diuji BUKAN solusi: padding
     menyusutkan `availableHeight` → `maxHeight` → overlap bangkit (1.5→9.3px).
4. **TDD**: `tools/freq-right-title.test.js` nuovo — RED 9 gagal → GREEN 12/12.
5. **Implementasi**:
   - `ticks.align:'inner'` di sumbu-X freq → right tepat 986px di xMax
     0.05/9.9/29.95/100.5/1000 (dan label "0" flush di x=66).
   - `FREQ_MIN_WRAPPER_H=96` (dulu `MIN_CHART_H=60` untuk keempat wrapper):
     wrapper freq min-height 96 → canvas 94 → maxHeight 47 ≥ 46 → clamp
     tidak aktif, gap judul-label 11.2px.
   - `MIN_PANE_H = 24+6+3*MIN_CHART_H+FREQ_MIN_WRAPPER_H+3*2 = 318` (dulu 276).
   - `#pane3` default 300→318px.
   - `baseOptsWithX` padding.bottom tetap 0 (dulu hipotesis 14 — revert
     setelah investigasi terbukti menyusutkan maxHeight).

## Hasil (bukti)

- `node tools/freq-right-title.test.js` → Passed: 12 Failed: 0 (RED dulu 9 gagal)
- `node tools/y-axis-origin-alignment.test.js` → 26/26 (origin spread 0.00px semua state)
- `node tools/freq-chart-alignment.test.js` → 3/3 (freq 920px = delta 920px)
- `npm test` → semua hijau (12 file, 11 summary)
- `node tools/puppeteer-test-runner.js` → 10/10, console 0 error
- Ukur final: canvasH 95, xH 46 ≤ maxH 47.5 (no clamp), gap judul-label 11.2px,
  right keempat 986px. Screenshot `.scratch/final-freq-wrap.png` dijaga.

## Status plan

Plan 002 (y-axis align) selesai (dijaga test). Rencana fix Panel III tidak ada
file plan — diuji lewat freq-right-title.test.js.

## Langkah berikutnya

- Periksa apakah master di push: cabang `worktree-fix-ts-axis-alignment` masih
  belum di-push commit fix `4311162` — push sebelum ganti sesi.
- `.scratch/*` artefak (probe*.js, o*.txt, png) boleh dihapus.
- Defect pre-existing separato: label tick Δω scientific-notation float-dust
  (island) — fix terpisah (physics/data), dijaga KNOWN DEFECT di
  y-axis-origin-alignment.test.js.