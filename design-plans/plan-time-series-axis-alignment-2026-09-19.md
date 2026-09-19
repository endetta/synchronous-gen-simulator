# Selaraskan Titik Awal Sumbu-Y Time Series

Written against: `17f001b519f2a655d3c9e5cd995a3182bf0ef3c7`

## Evidence chain

- Surface: Panel III `#pane3`, empat chart bertumpuk (`delta`, `omega`, `power`, `freq`).
- Problem: titik awal area plot dan judul sumbu-Y tidak sejajar karena setiap canvas menghitung lebar sumbu-Y sendiri.
- Design evidence: `CLAUDE.md` menetapkan Panel III sebagai time series (`δ, ω, f, P`); `docs/overview.md` menyebut panel ini sebagai visualisasi time series. Kontrak visual yang diminta pengguna adalah satu garis awal sumbu-Y bersama.
- Owner: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`, `initTimeCharts()` pada sekitar baris 1546-1712.
- Scope and affected surfaces: empat chart di `#pane3`; tidak menyentuh Panel I/II, physics engine, atau header.
- Uncertainty: lebar minimum final harus divalidasi pada browser dengan label/tick terpanjang; audit ini tidak menjalankan browser.

## Design decision

Berikan satu lebar sumbu-Y bersama untuk keempat instance Chart.js melalui konfigurasi scale yang dipakai oleh semua chart. Terapkan lebar tersebut pada scale `y` setelah Chart.js menghitung kebutuhan intrinsiknya, sehingga `scale.right` dan awal area plot sama pada setiap baris tanpa mengganti komposisi empat canvas.

Jangan menyelaraskan dengan margin CSS per-wrapper: pergeseran yang terlihat berasal dari box scale internal Chart.js, bukan dari `gap`, `padding`, atau posisi wrapper.

## Reuse

- Base option bersama `baseOptsNoX`/`baseOptsWithX` di `initTimeCharts()`.
- Konfigurasi `scales.y` pada keempat chart sebagai satu owner layout.
- Exemplar: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html:1613-1679`.

Jika lebar tetap tidak cukup untuk tick/titles terpanjang, ukur kebutuhan maksimum dari empat scale setelah font aktif dan gunakan hasil itu sebagai satu konstanta bersama; jangan membuat empat angka per chart.

## Changes

1. `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`, `initTimeCharts()` sekitar `1613-1708`
   - Change: tambahkan helper/konstanta konfigurasi Y-axis bersama dan hook `afterFit`/mekanisme setara pada setiap `scales.y` untuk memaksa lebar identik.
   - Preserve: label `δ (deg)`, `Δω (pu)`, `P (pu)`, `f (Hz)`, warna, tick range, fixed δ range `0-90`, serta empat wrapper/canvas.
   - Verify: pada runtime, `delta.scales.y.left` dan tiga scale lain identik; garis grid/awal kurva berada pada kolom x yang sama; tidak ada judul/tick yang terpotong.

2. `tools/chart-scale.test.js` atau test seam baru yang memakai harness yang sama
   - Change: tulis test merah sebelum implementasi yang memeriksa kontrak bahwa semua konfigurasi time-series memakai satu lebar Y-axis dan bahwa nilai tersebut tidak lebih kecil dari kebutuhan minimum yang disepakati.
   - Preserve: test matematika `calcYScale` dan `ScaleStabilizer` yang sudah ada.
   - Verify: test gagal pada konfigurasi sekarang, lalu hijau setelah helper/kontrak bersama dipakai oleh keempat chart.

## Scope

- Inherit: seluruh state Panel III yang dibuat oleh `initTimeCharts()`.
- Verify: reset, mode Grid/Island, fault markers, panel resize, viewport sempit, dan font CDN gagal/load terlambat.
- Exclude: perubahan skala nilai Y, perubahan physics, perubahan urutan chart, serta perubahan warna atau copy.

## Validation

- Product: buka simulator dan bandingkan garis awal plot keempat chart dalam keadaan normal, island, dan fault aktif.
- Interface: validasi pada panel tinggi default 300px, setelah drag-resize, dan pada viewport desktop sempit; cek tick/titles terpanjang.
- System: pastikan satu helper/konstanta dipakai keempat chart dan tidak ada angka lebar Y-axis yang berbeda di konfigurasi individual.
- Repository: `node tools/chart-scale.test.js` -> semua test existing dan regression alignment pass.

## Stop conditions

- Stop if Chart.js menghitung lebar setelah hook sehingga hook tidak stabil; pindahkan seam ke plugin/layout owner sebelum melanjutkan.
- Stop if lebar bersama memotong label/tick pada salah satu mode; ukur kebutuhan maksimum dulu, jangan mengecilkan font atau mengubah label untuk menutupi masalah.

## Design documentation

- After acceptance and validation: update `docs/overview.md` hanya bila keputusan shared Y-axis layout dianggap kontrak permanen; jika tidak, none.
