# Pulihkan Kelancaran Kurva Time Series

Written against: `17f001b519f2a655d3c9e5cd995a3182bf0ef3c7`

## Evidence chain

- Surface: Panel III `#pane3`, data flow `stepPhys()` -> `S.hist` -> `updateTimeCharts()` -> empat Chart.js canvas.
- Problem: kurva dapat terlihat melompat/patah karena history direkam saat `s.t-s.hlast>=HSTEP`, chart hanya diperbarui setiap lima RAF (`CHART_UPDATE_INTERVAL=5`, sekitar 12 Hz), setiap update mengganti seluruh dataset dan memanggil `update('none')`, lalu 30 detik data diringkas menjadi maksimal 600 titik.
- Design evidence: `CLAUDE.md` menetapkan physics step `PHDT=0.003s`, history window 30 detik, dan validasi time series. `design-plans/sesi-2026-09-09-01-fix-performance-lag.md` mendokumentasikan 60 Hz history dan 12 Hz chart sebagai perbaikan terdahulu; itu mengurangi lag tetapi bukan bukti bahwa 12 Hz redraw memenuhi kebutuhan visual saat ini.
- Owner: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`, `stepPhys()` sekitar `536-601`, `updateTimeCharts()` sekitar `1805-2096`, render loop sekitar `2107-2137`.
- Scope and affected surfaces: rendering data Panel III; `S.hist` tetap menjadi sumber data fisika dan tetap bounded.
- Uncertainty: kontribusi relatif throttle, decimation, dan Chart.js update mode harus diukur dengan browser/perf trace setelah regression seam dibuat; audit ini tidak menjalankan aplikasi.

## Design decision

Pisahkan sampling fisika dari presentasi chart. Pertahankan history 60 Hz sebagai sumber kebenaran, tetapi jadwalkan chart update dengan waktu/RAF yang konsisten dan hindari kombinasi yang menyebabkan lompatan visual: update seluruh empat chart dalam satu batch, gunakan data decimation yang mempertahankan extrema, dan gunakan mode Chart.js yang memungkinkan redraw terjadwal tanpa animasi internal yang bersaing.

Urutan implementasi wajib: buat regression seam untuk kontinuitas waktu dan jumlah redraw, ukur baseline, ubah satu variabel per siklus red-green, lalu pilih konfigurasi yang memenuhi smoothness tanpa mengembalikan lag lama. Jangan menaikkan frekuensi redraw atau mematikan decimation secara membabi buta.

## Reuse

- `HSTEP`, bounded `pushHistory`, `smartDecimate`, dan `extractChartData()` yang sudah ada.
- `chartUpdateCounter`, `CHART_UPDATE_INTERVAL`, serta `updateTimeCharts()` sebagai satu owner scheduling.
- Test helpers/pola: `tools/chart-smoothing.test.js`, `tools/performance-fix.test.js`, `tools/xaxis-stability.test.js`.
- Exemplar: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:1722-1831` dan `2098-2127`.

## Changes

1. `tools/chart-smoothing.test.js` atau test seam baru
   - Change: tulis test merah yang memakai mock history/scheduler untuk membuktikan: (a) timestamp history monoton dan tidak melewati cadence yang diizinkan, (b) satu tick render meng-update empat chart tepat satu batch, (c) x-window bergerak kontinu antar update, dan (d) decimator mempertahankan titik awal/akhir serta extrema penting.
   - Preserve: test yang hanya menghitung throughput tidak boleh menjadi satu-satunya bukti; assertions harus menangkap gejala patah/blink yang dilaporkan.
   - Verify: test gagal terhadap perilaku scheduler/data sekarang bila ambang kontinuitas dipilih dari baseline terukur, lalu hijau setelah satu perubahan diterapkan.

2. `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`, `stepPhys()` sekitar `574-583`
   - Change: jadikan history sampling deterministic terhadap waktu simulasi (misalnya accumulator/next-sample deadline) agar rdt RAF yang berubah tidak menyebabkan interval data berubah-ubah; tetap batasi jumlah sampel dan tangani frame catch-up.
   - Preserve: integrasi RK4, event state machine, nilai history, dan history window 30 detik.
   - Verify: fixture rdt yang bervariasi menghasilkan cadence history yang stabil dan tidak menggandakan/menghilangkan event penting.

3. `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`, `updateTimeCharts()` sekitar `1805-2096`
   - Change: ganti counter berbasis frame dengan scheduler berbasis waktu yang menggabungkan satu commit data untuk empat chart; pastikan update tidak terjadi saat user scrolling dan tidak menulis dataset separuh batch.
   - Preserve: sliding window `xMin/xMax`, annotations, stabilized Y-scales, semantic colors, dan tooltip behavior.
   - Verify: profiler/browser instrumentation menunjukkan cadence konsisten; keempat chart memiliki timestamp akhir yang sama setiap commit; tidak ada blink pada x-axis.

4. `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`, opsi dataset/chart sekitar `1613-1679` dan `1848/1957/2025/2086`
   - Change: pilih konfigurasi interpolation/decimation Chart.js berdasarkan hasil baseline (misalnya `tension`/`cubicInterpolationMode` dan decimation terkontrol) agar kurva tetap kontinu tanpa overshoot yang menyesatkan; jangan mengandalkan `tension` saja.
   - Preserve: extrema, fault onset/clearing markers, fixed δ context, serta nilai numerik tooltip.
   - Verify: dataset sinusoidal dan fault step tidak kehilangan peak/step; screenshot/manual check menunjukkan garis tidak patah dan tidak berosilasi palsu.

5. `resizeTimeCharts()` sekitar `1714-1720`
   - Change: pulihkan resize hanya pada perubahan ukuran pane/container yang terdeteksi, dijadwalkan di luar update data (ResizeObserver atau coalesced RAF), bukan dipanggil setiap render frame.
   - Preserve: larangan layout thrashing dan scroll lock yang menjadi alasan fungsi saat ini dinonaktifkan.
   - Verify: drag-resize dan perubahan viewport memperbarui backing canvas/chart area sekali per perubahan ukuran tanpa autoscroll atau flicker.

## Scope

- Inherit: seluruh mode normal, Grid/Island, RLR, short-circuit, reset, dan sliding window Panel III.
- Verify: simulasi awal (<2s), window penuh (30s), window sliding (>30s), fault dengan step cepat, data stabil, drag-resize, dan user scrolling.
- Exclude: perubahan persamaan physics/governor, perubahan isi history, migrasi library, export/zoom feature, dan perubahan Panel I/II.

## Validation

- Product: jalankan simulator pada kondisi stabil, load step, dan fault; kurva harus bergerak kontinu, peak tetap terlihat, dan empat chart tetap sinkron.
- Interface: desktop viewport default dan sempit; panel default serta setelah resize; periksa console tidak ada error Chart.js.
- System: jalankan regression seam, `node tools/chart-smoothing.test.js`, `node tools/chart-scale.test.js`, dan test existing yang relevan.
- Repository: `node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js` -> semua pass; `node tools/chart-smoothing.test.js` -> pass; manual/browser performance evidence mencatat update cadence dan tidak ada console errors.

## Stop conditions

- Stop if measurement shows the dominant symptom is axis layout rather than data cadence; complete the axis plan first and do not tune interpolation blindly.
- Stop if increasing redraw rate causes frame budget regressions on the target viewport; retain the current rate and fix data scheduling/decimation instead.
- Stop if Chart.js interpolation creates overshoot around fault discontinuities; use monotonic/linear rendering for those segments rather than smoothing them cosmetically.

## Design documentation

- After acceptance and validation: append the measured sampling/render contract to `docs/overview.md` or the relevant current plan; do not claim “smooth” without recorded cadence and visual verification.
