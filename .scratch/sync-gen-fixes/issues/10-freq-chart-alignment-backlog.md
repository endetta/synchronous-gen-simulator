# 10 — Frekuensi chart: alignment sumbu & stabilitas skala (backlog, belum diverifikasi)

**Latar:** Ditemukan sebagai file untracked `tools/freq-chart-alignment.test.js`
saat rekonsiliasi repo 2026-09-21. File ini adalah **diagnosis mandiri** (bukan
test suite terhubung ke `package.json`), belum dirujuk plan/sesi mana pun.

**Status:** backlog — belum diputuskan apakah akan dikerjakan. Node test melaporkan
1 kegagalan + 2 peringatan; lihat keluaran aktual di bawah.

**Blocked by:** keputusan user (prioritas vs. tiket 09).

---

## Yang dilaporkan file diagnosis

Jalankan: `node tools/freq-chart-alignment.test.js`

```
TEST 1: X-axis configuration consistency
  Chart 1-3 X-axis title: TIDAK ADA (correct)
  Chart 4 X-axis title: ADA (ini yang menyebabkan misalignment)

TEST 2: Chart layout padding compensation
  ✗ GAGAL: Tidak ada kompensasi layout
    Akibat: Plot area chart freq lebih kecil → data menjorok ke kiri

TEST 3: Animation configuration untuk mencegah blink
  ⚠ WARNING: Tidak dapat mengekstrak animation duration

TEST 4: Chart update mode consistency
  Total update calls: 4 — ✓ Semua "none"

TEST 5: ScaleStabilizer tolerance untuk freq chart
  Freq stabilizer tolerance: 0.02
  ⚠ WARNING: Tolerance terlalu kecil — bisa menyebabkan blink
```

## Klaim yang perlu diverifikasi ulang

1. Chart 4 (frekuensi) punya X-axis title sedangkan chart 1–3 tidak →
   plot area lebih sempit → skala horizontal berbeda → data menjorok ke kiri.
2. Toleransi `ScaleStabilizer` untuk chart frekuensi 0.02 < rekomendasi 0.03 →
   risiko efek kedip (blink).
3. `animation.duration` tidak dapat diekstrak oleh diagnosis (kemungkinan regex
   file-based gagal, bukan bukti tidak ada).

**Catatan penting:** Test 3 dan 5 adalah WARNING, bukan kegagalan; hanya Test 2
yang GAGAL. Klaim Test 2 ("tidak ada kompensasi layout") harus diverifikasi
manual di browser sebelum dipercaya — diagnosis file-based bisa salah baca.

## Ruang lingkup jika dikerjakan

- Samakan plot area chart frekuensi dengan chart 1–3 (padding compensation atau
  hapus X-axis title di chart frekuensi).
- Pertimbangkan menaikkan toleransi stabilizer frekuensi (dengan pengukuran blink
  nyata via screenshot, bukan asumsi).
- Ubah diagnosis menjadi test asli yang benar-benar bisa gagal (ekstraksi via
  `tools/extract.js`, seperti seam tiket 02), ATAU hapus bila tidak dilanjutkan.

## Rujukan

- File diagnosis: `tools/freq-chart-alignment.test.js` (untracked per 2026-09-21)
- Seam ekstraksi: `tools/extract.js`
- Pekerjaan time-series sebelumnya: `design-plans/sesi-2026-09-20-01-time-series-map.md`,
  `plan-time-series-axis-alignment-2026-09-19.md`
