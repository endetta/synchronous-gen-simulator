# 02: Seam pengujian — ekspor model fisika murni dari HTML

**What to build:** Tes yang benar-benar bisa gagal. Hari ini `model.test.js` dan `chart-scale.test.js` menyalin-ulang rumus ke dalam file tes, jadi menghapus fungsi fisika dari HTML tidak akan pernah membuat tes gagal. Setelah tiket ini, tes mengekstrak fungsi langsung dari HTML sumber kebenaran — mengubah/menghapus fisika = tes GAGAL.

**Blocked by:** 01 (perbaikan governor dulu, supaya seam yang lahir mengetes kode yang benar).

**Status:** ready-for-agent

## Latar

- `tools/model.test.js` (line 47-79) mendefinisikan ulang `getPmax`, `getPe`, `getCC`, `getCCT`, `rk4` sendiri — tes lolos meski HTML diubah total.
- `tools/reactive-power.test.js` sudah menunjukkan pola yang benar: ekstrak kode dari HTML lalu bandingkan dengan nilai acuan independen. Generalisasi pola itu.
- Harness yang berhasil dipakai verifikasi mandiri: baca HTML, regex blok `<script>` inline terakhir, stub DOM minimal (`document.getElementById` mengembalikan proxy, `Chart` mock), `new Function(code + ';return {...}')` untuk mengekspor fungsi. Pola ini sudah terbukti bekerja untuk `makeState`, `ode`, `rk4`, `stepPhys`, `getPe`, `getCC`, `getCCT` — tanpa perlu mengubah HTML sama sekali.

## Yang harus dibangun

1. Modul kecil (mis. `tools/extract.js`) yang: baca HTML → ambil blok script inline → sediakan stub DOM/browser → `new Function` → kembalikan objek berisi fungsi fisika yang diekspor. Satu tempat, dipakai semua tes.
2. Migrasi `model.test.js` ke pola ekstraksi (hapus semua rumus yang di-copy-paste).
3. Tambahkan satu "seam test" yang memverifikasi ekspor gagal jelas (pesan error yang menjelaskan) kalau fungsi yang diekspor hilang dari HTML — supaya kegagalan selanjutnya self-explanatory.

## Acceptance criteria

- [ ] `node tools/model.test.js` lolos, dan setiap rumus yang dites berasal dari ekstraksi HTML (tidak ada lagi definisi lokal `function getPmax(...)` di file tes)
- [ ] Bukti seam hidup: hapus (sementara, di working tree) fungsi `getCC` dari HTML → `node tools/model.test.js` GAGAL dengan pesan jelas → kembalikan → lolos. Catat bukti di log sesi.
- [ ] `chart-scale.test.js` tetap lolos (boleh tetap memakai class inline untuk ScaleStabilizer karena ia bagian dari kode render, bukan fisika — dokumentasikan keputusan ini)
- [ ] Semua tes lain tetap lolos; `npm test` hijau
