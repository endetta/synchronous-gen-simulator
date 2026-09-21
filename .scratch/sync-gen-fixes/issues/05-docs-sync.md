# 05: Sinkronisasi dokumentasi ke realitas

**What to build:** Dokumen tidak lagi berbohong tentang produk. PRD, README, CLAUDE.md, dan overview.md cocok dengan kode — termasuk model governor hasil tiket 01, versi plugin yang benar-benar dipakai, dan daftar tes yang benar-benar bisa dijalankan.

**Blocked by:** 01 (PRD §2.3 harus mendokumentasikan governor yang **sudah diperbaiki**, bukan yang rusak).

**Status:** done — commit `e54dfe8` + `a608da2` (sinkronkan PRD/CLAUDE/README/overview dengan realitas kode), `92c8244` (hapus Known Issue stale). Ditutup 2026-09-21.

## Latar — drift terverifikasi

| # | Klaim dokumen | Realitas kode |
|---|---------------|---------------|
| 1 | `CLAUDE.md` lines 28-61: `tools/lens-harness.js` adalah test harness yang bisa dijalankan (`node tools/lens-harness.js`) | File itu **dokumen Markdown** berekstensi `.js` — `node` melempar `SyntaxError` |
| 2 | `docs/PRD.md` line 216: `chartjs-plugin-annotation@3.3.0` + hash `sha384-bYKs…` | HTML line 13 memakai **`@3.1.0`** + hash `sha384-3N9G…` |
| 3 | `docs/PRD.md` line 226: "Works offline after initial CDN load" | Tidak ada Service Worker, tidak ada cache lokal — offline = blank |
| 4 | `docs/PRD.md` line 129: "SC Power Factor" parameter, default 0.04 | Hardcoded di `makeState()` (`sc_Pfact:0.04`), **tidak ada kontrol UI** |
| 5 | `docs/overview.md` lines 25-27: `drawPhasor()`, `drawPdelta()`, `drawTimeSeries()` | Fungsi sebenarnya: `updateSvgPhasor()`, `updateSvgPdelta()`, `drawTime()` |
| 6 | `docs/overview.md` line 48: `HSTEP = 0.04` | HTML line 327: `const HSTEP=0.016` |
| 7 | HTML line 14 memuat `chartjs-plugin-zoom@2.0.1` | **Tidak ada konfigurasi zoom sama sekali** — hanya komentar "Interactive charts with zoom/pan" (line 1664). Plugin mati |
| 8 | `CLAUDE.md` roadmap & "113 tests passing" | Benar jumlahnya, tapi 96 dari 113 adalah grep-string / rumus salinan — lihat tiket 02 |

## Keputusan yang sudah disetujui

- **Zoom plugin: HAPUS** dari CDN (HTML line 14) dan dari PRD §5.2. Ia tidak dipakai. Konsekuensi: waktu muat lebih cepat, permukaan serangan lebih kecil.
- **SC Power Factor: HAPUS dari PRD** (bukan ditambahkan ke UI). Nilai 0.04 adalah asumsi model untuk fault bolted, bukan parameter operasi.
- **Klaim offline: direvisi** — ganti dengan pernyataan jujur: butuh koneksi ke CDN saat pertama kali; setelah itu bergantung cache browser (tidak dijamin).

## Yang harus diubah

1. `tools/lens-harness.js`: hapus, atau tulis ulang sebagai harness JS yang benar-benar jalan. **Rekomendasi: hapus** — perannya sudah digantikan `tools/extract.js` (tiket 02) + tes yang ada. Perbarui tabel di `CLAUDE.md`.
2. `docs/PRD.md` §2.3: tulis ulang persamaan TGOV1 agar cocok dengan implementasi pasca-tiket-01 (termasuk penjelasan `Pm_gov` sebagai output daya, bukan penambahan).
3. `docs/PRD.md` §5.2: perbaiki versi/hash plugin, hapus baris zoom, tambahkan catatan bahwa SRI harus diverifikasi saat upgrade.
4. `docs/PRD.md` §3.4: hapus baris SC Power Factor; jelaskan bahwa fault dimodelkan bolted dengan sisa tegangan 4%.
5. `docs/PRD.md` §5.3: revisi klaim offline.
6. `docs/overview.md`: perbaiki nama fungsi dan `HSTEP`.
7. `README.md`: perbaiki pohon struktur file (tidak menyebut `tools/*.test.js` yang sebenarnya ada, menyebut `shoot.js` yang punya masalah Chrome headless), dan tinjau ulang daftar "Yang Belum".
8. `CLAUDE.md`: perbaiki tabel Tools & Test Harness + jumlah tes + deskripsi `lens-harness.js`; tandai item roadmap yang sudah selesai.

## Acceptance criteria

- [ ] `node tools/lens-harness.js` tidak lagi dianjurkan di dokumen mana pun (file dihapus atau benar-benar jalan)
- [ ] Setiap versi & hash SRI di PRD §5.2 identik dengan `<script>` di HTML (verifikasi dengan grep berdampingan)
- [ ] Tidak ada dokumen yang menyebut "SC Power Factor" sebagai parameter yang dapat diatur
- [ ] `grep -rn "drawPhasor\|drawPdelta\|drawTimeSeries" docs/ CLAUDE.md README.md` → 0 hit
- [ ] `grep -n "HSTEP" docs/overview.md` menampilkan 0.016
- [ ] PRD §2.3 cocok dengan `ode()` hasil tiket 01 (baca berdampingan, istilah sama)
- [ ] Semua dokumen memakai istilah domain yang konsisten dengan kode (Bahasa Indonesia untuk UI, istilah proteksi tetap Inggris)
