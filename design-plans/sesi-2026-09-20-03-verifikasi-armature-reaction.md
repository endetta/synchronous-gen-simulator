# Sesi 2026-09-20-03 — Verifikasi Tabel Armature Reaction (Kirtley Ch.4 §9)

**Tanggal:** 2026-09-20
**Waktu mulai:** 07:20
**Waktu selesai:** 09:35
**AI/Developer:** Claude Code (verifikasi sumber primer, lanjutan sesi -02)

---

## Commit Sebelum Sesi

```
0b6d589 docs(sesi): isi commit hash di log sesi riset medan magnet
```

---

## Tujuan Sesi

Menutup celah #1 riset §10 — memverifikasi tabel armature reaction lagging/unity/leading
di `docs/riset-medan-magnetik-dan-belitan.md` §4.4, yang pada sesi -02 masih berstatus
**turunan** dari relasi Kirtley dan disebut sebagai prasyarat sebelum implementasi Fase 0.

---

## Kegiatan & Hasil

### 1. Ekstraksi PDF Kirtley Ch.4, Ch.5, Ch.9

**Apa yang dilakukan:**
- Memperbaiki bug path di `tools/pdf-text.js`: Git Bash `/c/Users/...` dibaca Node sebagai
  path relatif → `Error: Cannot find module 'C:\c\Users\...'`. Solusi: pakai bentuk
  drive-letter `C:/Users/pcelr/...`. Exit code 1 → 0, output 0 → 29.354 byte.
- Mengekstrak tiga PDF dari MIT OCW 6.685 ke teks.

**Kendala & solusi:**
- `grep` menolak mencetak match ("Binary file matches") karena PDF menyisakan byte null.
  Diakali dengan `tr -d '\000'` + `grep -a`. Ini langsung mengungkap isi Ch.9.
- `Read` tool butuh path Windows; `/tmp/...` gagal. Diakali `cygpath -w /tmp`.

### 2. Temuan kunci: rumus `I_d` adalah KUTIPAN, bukan turunan

**Hasil:** Kirtley Ch.4 §9 memuat transisi ini secara eksplisit:

> "which is easily inverted to produce: Vcos δ Id = Eaf Xd / Vsin δ Iq = Xq"

Teks hasil ekstraksi kehilangan pemisah pecahan (mesin PDF menulisnya satu baris), tapi
bentuk pecahannya jelas:

```
I_d = (V cos δ − E_af)/X_d
I_q = V sin δ / X_q
```

**Ini menaikkan status §4.4 dari "turunan" menjadi "kutipan langsung".**

### 3. Ch.5 dan Ch.9 diperiksa — tidak ada tabel armature reaction

**Hasil:** Pencarian eksplisit di kedua chapter tidak menemukan konten lagging/leading/
demagnetizing.
- Ch.5 (Winding Inductances): winding factor, pitch factor, breadth factor, harmonisa MMF.
- Ch.9 (Synchronous Machine Simulation Models): Park's Transformation, matriks induktansi,
  normalisasi per-unit, model elektromekanis tereduksi. **Tidak ada armature reaction.**

Ini menutup harapan bahwa chapter Kirtley lain menyediakan tabel kanoniknya.

### 4. Rantai verifikasi lengkap disusun

**Hasil — lima mata rantai yang konsisten:**

| # | Sumber | Kontribusi |
|---|---|---|
| 1 | Kirtley Ch.4 §9 | `I_d = (V cos δ − E_af)/X_d` — **kutipan langsung** |
| 2 | Kirtley Ch.4 §9 | `λ_d = L_d·I_d + M·I_f` → overexcited ⟹ `I_d < 0` ⟹ demagnetizing |
| 3 | Kirtley Ch.4 §8 | "signs of p and q are reversed" (generator) + "q strongly negative" saat underexcited |
| 4 | Wikipedia "Synchronous machine" | "causes a demagnetizing effect due to armature reaction" (frame motor) |
| 5 | Simulator `getQe`/`getPFNature` | Kolom Q & pf di tabel cocok dengan kode |

**Pemeriksaan aljabar terhadap simulator:**

```
getQe = Vt(Ef·cos δ − Vt)/Xs = −(Vt² − Vt·Ef·cos δ)/Xs = −q_Kirtley
```

Beda tanda = konvensi acuan (generator vs motor), **bukan bug**. Dikuatkan pernyataan
Kirtley §7 sendiri: "in **motor reference coordinates** … power **into** the terminals".

### 5. Dua catatan halus ditambahkan ke riset §4.4

**(a) Unity pf bukan "tidak ada reaksi".** Saat `I_d = 0`, reaksi armature sepenuhnya
cross-axis (`I_q ≠ 0`). Fluks d-axis tidak berubah besar, tapi fluks q-axis **memutar**
resultan menjauh dari sumbu-d. Kalau implementasi menggambar "fluks menghilang" di unity pf,
itu salah — yang benar adalah pola fluks **miring**, bukan memudar.

**(b) Label lagging/leading bertukar antar frame.** Wikipedia & Kirtley §7 = frame motor;
simulator = frame generator. Yang **tidak** bergantung frame: pemetaan `I_d` →
demagnetizing/magnetizing (murni geometris). Yang **bergantung** frame: label pf. Jadi
jangan mengutip "overexcited = lagging" dari sumber motor dan memakainya langsung.

### 6. Dokumen diperbarui

**File yang diubah:**
- `docs/riset-medan-magnetik-dan-belitan.md` — banner §4.4 diganti, tabel disempurnakan
  (kolom "`E_af·cos δ` vs `V`", sel unity ditandai "cross-axis semua"), rantai verifikasi
  5 mata rantai ditambahkan, dua catatan halus ditambahkan, celah #1 di §10 **DITUTUP**.
- `design-plans/plan-realistic-magnetic-visualization.md` — prasyarat verifikasi ditandai
  TERVERIFIKASI, Next step #1 ditandai SELESAI, catatan sesi diperbarui.

---

## Status Plan Terkait

**Plan:** `design-plans/plan-realistic-magnetic-visualization.md`
**Status sebelum:** DRAF (direvisi 2026-09-20) — menunggu approval, prasyarat verifikasi belum tertutup
**Status sesudah:** DRAF (direvisi 2026-09-20) — **prasyarat verifikasi tertutup**, tetap menunggu approval user
**Perubahan:** Next step #1 dicoret (selesai); prasyarat verifikasi Fase 0 ditandai TERVERIFIKASI

---

## Commit Sesi Ini

```bash
git add docs/riset-medan-magnetik-dan-belitan.md \
        design-plans/plan-realistic-magnetic-visualization.md \
        design-plans/sesi-2026-09-20-03-verifikasi-armature-reaction.md
git commit -m "docs(riset): verifikasi tabel armature reaction ke Kirtley Ch.4 §9"
git push origin fix/critical-governor-and-bugs
```

**Commit hash:** `aa4abaf` — 3 file, +200/−14

---

## Langkah Berikutnya

1. **Review plan Fase 0 dengan user** — prasyarat verifikasi sudah tertutup, tapi **belum ada
   approval untuk mulai coding**. Jangan mulai implementasi tanpa izin eksplisit.
2. **Implementasi Fase 0 dengan TDD** setelah approval: seam di `initSvgRealistic()` /
   `updateSvgPhasorRealistic()`; tambah test `tools/` untuk kontrak `#g-flux` dan `#g-rmf`.
3. **Celah yang masih terbuka** (riset §10): nomor halaman Kundur (1994) untuk setiap rumus;
   konvensi dot/cross tanpa sumber eksplisit; konstanta kelengkungan `k = 0.55` masih tebakan;
   performa SVG belum diukur di perangkat nyata; `will-change` belum berdasar.

---

## Catatan Tambahan

**Untuk sesi berikutnya — jangan ulangi pencarian yang sudah gagal.** Sudah dicoba dan
**tidak** menghasilkan: MIT 6.061 (redirect loop), LibreTexts Direct Energy Electromechanics
ch.8 (404), MIT 6.002 (404), LibreTexts search (form saja, tanpa hasil), Wikipedia "Armature
reaction" (seluruhnya mesin DC). Yang **berhasil**: MIT OCW 6.685 PDF langsung via WebFetch
+ `tools/pdf-text.js`, dan Wikipedia "Synchronous machine".

**Yang tetap tidak dapat diakses:** Kundur (1994) dan Chapman — buku cetak berhak cipta,
tidak diunduh. Karena itu tabel §4.4 tetap "rakitan kutipan", bukan "kutipan tabel". Ini
dinyatakan terbuka di banner §4.4, bukan didiamkan.

**Celah #7 riset §10 sudah tertutup juga** (Kirtley Ch.9 diekstrak dan dibaca — ternyata
tidak memuat tabel armature reaction, hanya Park's Transformation dan model simulasi).

**Peringatan implementasi yang tetap berlaku:** saat `sc_active` true, garis fluks harus
tetap rapat (asas constant flux linkage). Juga: distorsi armature reaction harus **halus**
(beberapa derajat), bukan dramatis — Kirtley §9 menegaskan `X_d ≈ X_q` untuk round rotor.
