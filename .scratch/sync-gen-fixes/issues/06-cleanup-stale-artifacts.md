# 06: Bersihkan artefak stale (copy HTML root, plans/ TODO, PNG root)

**What to build:** Repo dan workspace tidak lagi punya salinan menyesatkan yang bisa dibuka pengguna secara tidak sengaja. Satu sumber kebenaran untuk file HTML simulator.

**Blocked by:** None (can start immediately) — kecuali butir 1 yang **butuh persetujuan eksplisit** karena menyentuh file di luar repo ini.

**Status:** ready-for-agent

## Latar (bukti terverifikasi)

1. **Copy HTML tua di root workspace.** `SHEVA'S SIMULATOR LIBRARY/LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` — 101.270 byte, 9 Sep 11:17. Versi di folder repo 143 KB. Diverifikasi: `grep -c getQe` pada copy root = **0**, pada versi folder = **7**. Artinya copy root **tidak punya fitur daya reaktif sama sekali** (Q, pf, S) — pengguna yang membuka file dari root mendapat simulator versi lama.
2. **`plans/` dari audit sebelumnya** (`001-time-series-observability-seams.md`, `002-…`, `003-…`) masih berstatus TODO, sementara pekerjaan time-series sudah dikerjakan lewat jalur lain (lihat `design-plans/sesi-2026-09-20-01-time-series-map.md`).
3. **PNG artefak di root repo:** `fullpage-audit.png`, `pane3-600-element.png`, `pane3-after-drag-600.png`, `pane3-current.png`, `pane3-review.png`, `pane3-stretched-live.png`. `.gitignore` sudah mengecualikan `*.png`, jadi ini tidak ter-commit — tapi mengotori direktori kerja.
4. **Working tree kotor** di branch `fix/critical-governor-and-bugs`: HTML dimodifikasi, 3 file untracked (`sesi-2026-09-20-01-time-series-map.md`, `tools/time-series-resize.test.js`, `tools/verify-resize-browser.js`).

## ⚠️ Butuh persetujuan eksplisit

Butir 1 menyentuh file **di luar repo ini** (root workspace adalah folder library, bukan repo git). **Jangan hapus tanpa konfirmasi ulang dari user.** Opsi: hapus, atau ganti isinya dengan stub yang mengarahkan ke folder repo yang benar. Tiket ini hanya boleh mengeksekusi setelah user memilih.

## Yang harus diubah

1. [SETELAH KONFIRMASI] Copy HTML root: hapus **atau** jadikan stub pengarah. Catat keputusan di log sesi.
2. `plans/README.md`: rekonsiliasi status — tandai plan 001–003 sebagai DONE / SUPERSEDED / masih TODO sesuai kenyataan, dan rujuk tiket `.scratch/sync-gen-fixes/` sebagai kelanjutan.
3. Hapus PNG artefak di root repo (aman: sudah gitignored, murni sampah direktori kerja).
4. Commit pekerjaan yang menggantung di working tree dengan pesan conventional yang jelas — atau, jika belum selesai, pindahkan ke branch terpisah supaya `fix/critical-governor-and-bugs` bersih untuk tiket 01–04.

## Acceptance criteria

- [ ] Hanya ada SATU file HTML simulator yang bisa ditemukan di workspace (atau copy root jelas-jelas menunjuk ke yang benar)
- [ ] `plans/README.md` tidak lagi memuat status TODO untuk pekerjaan yang sudah selesai — setiap baris punya status yang bisa dipertanggungjawabkan
- [ ] Tidak ada `*.png` di root repo
- [ ] `git status` di repo bersih, atau perubahan yang tersisa dijelaskan di log sesi
- [ ] Log sesi `design-plans/sesi-YYYY-MM-DD-NN-*.md` mencatat keputusan tentang copy root
