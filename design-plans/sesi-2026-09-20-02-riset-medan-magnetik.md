# Sesi 2026-09-20-02 — Riset Medan Magnet & Belitan Stator untuk Mode Realistis

**Tanggal:** 2026-09-20
**Waktu mulai:** 06:20
**Waktu selesai:** 07:20
**AI/Developer:** Claude Code (riset sumber primer)

---

## Commit Sebelum Sesi

```
4db7a45 docs(sesi): catat hasil verifikasi visual fitur daya reaktif
```

---

## Tujuan Sesi

Melakukan riset mendalam — bukan implementasi — tentang bagaimana medan magnet bekerja pada
generator sinkron, agar mode "Realistis" Panel I bisa dibangun ulang dengan benar. Permintaan user:
(1) tampilkan garis-garis fluks, bukan hanya kutub N-S; (2) gambar stator sebagai belitan/kumparan
sungguhan, bukan titik; (3) pahami keterkaitan medan → eksitasi (Ef) → output (P, Q, V, pf);
(4) panduan modelling fisika di source code.

---

## Kegiatan & Hasil

### 1. Pemetaan kode mode Realistis (verifikasi langsung)

**Apa yang dilakukan:**
- Membaca `initSvgRealistic()` (baris 1078), `updateSvgPhasorRealistic()` (baris 1183),
  `setAnimMode()` (baris 2236), `drawRealisticLegend()` (baris 1248)
- Melacak bagaimana `S.anim` (baris 477, dimajukan baris 610) dipakai untuk sudut

**Hasil — akar masalah ditemukan:**
- `#rotor-field` (1164) dan `#stator-field` (1154) adalah `<circle>` ber-`radialGradient`.
  Lingkaran gradien tidak punya arah → tidak mungkin menunjukkan fluks. **Tidak ada satu pun
  `<path>` garis fluks di seluruh mode realistis.**
- "Titik hijau" yang dikeluhkan user = belitan fasa C (`#00a848`), dibuat sebagai 18 `<circle>`
  r=`R*0.045` (baris 1129–1151). Masalahnya bentuk (titik), bukan warna.
- Baris 1225 `const syncAng = base;` **dihitung lalu tidak dipakai** — medan stator tidak berputar.
- Baris 1197–1198 `base = S.anim - π/2`; `rotorAng = base + S.delta` — **sudut daya sudah
  tervisualisasi dengan benar secara fisik**, tapi maknanya hilang karena tak ada elemen RMF.
- Baris 1226, 1232 memakai `Date.now()` → animasi tidak bisa di-pause, tidak deterministik.

### 2. Riset sumber primer

**Apa yang dilakukan:**
- Empat agen latar belakang + satu workflow pengganti (5 dimensi paralel) **semuanya gagal**
  dengan error API 405 dari endpoint model yang sama. Workflow dihentikan.
- Riset dikerjakan sendiri di sesi utama, tempat WebFetch terbukti jalan.
- Sumber primer yang berhasil didapat: **MIT OCW 6.685 *Electric Machines*, Prof. James L.
  Kirtley Jr., Class Notes 4: "Elementary Synchronous Machine Models"**
  (`https://ocw.mit.edu/courses/6-685-electric-machines-fall-2013/a10eb941769a0f5fa6a7460a8a7bb201_MIT6_685F13_chapter4.pdf`)
- PDF tidak bisa dirender `Read` tool (poppler tidak terpasang) dan `WebFetch` mengembalikan dump
  biner → dibuat `tools/pdf-text.js` untuk mengekstrak teks dari stream FlateDecode.

**Hasil — tiga temuan yang mengubah desain:**

1. **Kedua medan berputar bersama.** Kirtley §2: medan stator "rotates in space … and this pulls
   the rotor along". §5: pada operasi seimbang `pθ = ωt + δᵢ`, dan mesin menunjukkan torsi
   **konstan**. Jadi animasi yang benar adalah **dua medan berputar bersama, terpisah δ** —
   bukan rotor berputar di dalam stator diam. Ini membatalkan narasi draf plan lama.

2. **Rumus Q simulator bukan bug.** Kirtley §4 memberi `q = (v² − v·e_af·cos δ)/x_d` — tanda
   berlawanan dengan `getQe` simulator. Kirtley §7 menyatakan sendiri: "in **motor reference
   coordinates** … power **into** the terminals". Simulator memakai referensi generator.
   Keduanya benar.

3. **Fluks JANGAN mengerut saat gangguan.** Model `E'` berdiri di atas asas *constant flux
   linkage*. Yang kolaps adalah tegangan terminal, bukan fluks medan. Visualisasi yang
   mengerutkan fluks saat `sc_active` bertentangan dengan model simulator sendiri.

**Verifikasi rumus simulator terhadap sumber primer:**

| Simulator | Kirtley | Hasil |
|---|---|---|
| `Pmax = Ef·Vt/Xs` | `v·e_af/x_d` | identik |
| `Pe = Pmax·sin δ` | `p = (v·e_af/x_d)·sin δ` | identik |
| `Qe = Vt(Ef·cos δ − Vt)/Xs` | `q = (v² − v·e_af·cos δ)/x_d` | beda tanda = konvensi, bukan bug |

**Koreksi terhadap dokumen riset lama:**
- Halaman Wikipedia "Armature reaction" **seluruhnya tentang mesin DC** — tidak ada d/q axis,
  tidak ada lagging/unity/leading. Dokumen lama kemungkinan mengutip halaman yang tidak
  membahas mesin sinkron. Dekomposisi d/q yang benar ada di Kirtley §9.
- Draf plan menulis fasa C sebagai biru `#1050C0` — tidak pernah cocok dengan kode aktual
  (`#00a848`).

### 3. Reuse-First

**Apa yang dilakukan:** memeriksa kandidat library langsung via npm registry dan GitHub raw.

| Kandidat | Lisensi | Ukuran | Penilaian |
|---|---|---|---|
| `@anvaka/streamlines` v1.6.0 | MIT | 194 KB, **nol deps** | Rujukan algoritma saja |
| `@crazygl/hero-magnetic-field-lines` | Apache-2.0 | 55 KB | Butuh peer React ≥18 — tidak cocok |
| `d3-contour` v4.0.2 | ISC | — | Kontur skalar, bukan medan vektor |
| PhET Charges and Fields | GPL-3.0 | — | Lisensi tidak kompatibel |

**Keputusan: implementasi custom**, dengan empat alasan tertulis (riset §7.1): medan di sini
hanya satu fungsi sinus; streamline bukan bentuk yang tepat (garis fluks mesin adalah kurva
tertutup, bukan streamline yang memudar di batas); path tidak perlu dihitung ulang per frame
karena rotasi rigid; GPL tidak kompatibel.

### 4. Dokumen riset ditulis

**Hasil:** `docs/riset-medan-magnetik-dan-belitan.md` — 718 baris, 6.569 kata. Sepuluh bagian:
ringkasan, status riset sebelumnya (termasuk koreksi), cara kerja generator, garis fluks,
belitan stator, tabel pemetaan parameter UI → visualisasi, algoritma + pseudocode siap pasang,
kaveat jujur, kaitan dengan kode (nomor baris), dan **daftar celah yang belum terjawab**.

### 5. Plan diperbarui

**Hasil:** `design-plans/plan-realistic-magnetic-visualization.md` direvisi:
- Bagian "KOREKSI TERHADAP VERSI DRAF 2026-09-09" dengan empat koreksi eksplisit
- **Fase 0 baru** (prioritas) berisi permintaan user: garis fluks, belitan kumparan, `#g-rmf`,
  busur δ, sumbu-d/q. Fase 1–3 lama turun prioritasnya.
- `will-change: transform` **dihapus** dari spesifikasi performa — MDN tidak membahasnya di
  kedua halaman yang saya buka; yang terverifikasi adalah `transform`/`opacity` masuk jalur
  compositing.
- Tujuan edukasi diperbaiki: dari "rotor terkunci mengikuti stator" menjadi "kedua medan
  berputar bersama, terpisah δ".

---

## Kendala

**Empat agen latar belakang dan satu workflow (5 dimensi) gagal semua** dengan
`API Error: 405 Method Not Allowed` dari endpoint model yang sama. Workflow dihentikan setelah
4 dari 5 agen mati. Riset dikerjakan sendiri di sesi utama.

**Read tool tidak bisa merender PDF** (`pdftoppm is not installed`). Diakali dengan menulis
`tools/pdf-text.js` — ekstraktor teks PDF minimal (FlateDecode + operator Tj/TJ) memakai `zlib`
bawaan Node.

**WebSearch diblokir classifier** berulang kali ("temporarily unavailable"). Diakali dengan
menembak URL spesifik langsung lewat WebFetch.

**Server HTTP lokal dihentikan otomatis** oleh sistem karena memori menipis (bukan kegagalan
perintah). Tidak dinyalakan ulang.

---

## Status Plan Terkait

**Plan:** `design-plans/plan-realistic-magnetic-visualization.md`
**Status:** DRAF, direvisi 2026-09-20. Menunggu approval user untuk mulai Fase 0.

---

## Commit Sesi Ini

```bash
git add docs/riset-medan-magnetik-dan-belitan.md \
        design-plans/plan-realistic-magnetic-visualization.md \
        design-plans/sesi-2026-09-20-02-riset-medan-magnetik.md \
        tools/pdf-text.js
git commit -m "docs(riset): riset sumber primer medan magnet & belitan stator"
```

**Commit hash:** `6d34800` — 4 file, +1162/−17

---

## Langkah Berikutnya

1. **Konfirmasi tabel armature reaction** (riset §4.4) — masih **turunan** dari relasi Kirtley,
   belum diverifikasi ke Kundur/Chapman. Ini celah #1 di riset §10 dan disebut sebagai prasyarat
   sebelum implementasi Fase 0.
2. **Review plan Fase 0 dengan user** — belum ada approval untuk mulai coding.
3. **Implementasi Fase 0 dengan TDD**, seam di `initSvgRealistic()` / `updateSvgPhasorRealistic()`.
   Tambah test di `tools/` untuk kontrak `#g-flux` dan `#g-rmf`.
4. **Pertimbangkan Kirtley Ch.9** ("Synchronous Machine Simulation Models") — PDF-nya terdaftar
   di OCW, belum diekstrak. Kemungkinan berisi model dinamis lebih lengkap.

---

## Catatan Tambahan

**Kutipan Kirtley §2 yang menjadi jangkar seluruh desain animasi:**

> "The current distributions want to align with each other. In actual practice what is done is
> to generate a stator current distribution which is not static as implied here but which
> **rotates in space** … and this pulls the rotor along."

**Untuk sesi berikutnya:** `tools/pdf-text.js` bisa dipakai ulang untuk membaca PDF sumber
primer lain (Kirtley Ch.5 Winding Inductances, Ch.9 Simulation Models) tanpa perlu memasang
poppler. Usage: `node tools/pdf-text.js <file.pdf>`.

**Peringatan implementasi yang mudah terlewat:** saat `sc_active` true, garis fluks harus tetap
rapat. Kalau implementasi ikut mengerutkannya, itu salah fisik dan bertentangan dengan asas
constant flux linkage yang mendasari model `E'` simulator sendiri. Ditandai tebal di riset §3.10
dan §8.

**Catatan konvensi tanda Q:** perbedaan tanda antara `getQe` simulator dan rumus Kirtley adalah
konvensi acuan (generator vs motor), bukan bug. Ditulis eksplisit di riset §3.7 supaya tidak ada
yang "memperbaikinya" nanti.
