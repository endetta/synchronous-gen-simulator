# Sesi 2026-09-20-01 — Daya Reaktif (Q), pf & S sebagai Output

**Tanggal:** 2026-09-20
**Waktu mulai:** 05:16
**Waktu selesai:** 05:45
**AI/Developer:** Claude Code (TDD)

---

## Commit Sebelum Sesi

```
309a8a9 fix(ui): perbaiki toggle animasi, kelancuran chart, dan tata letak label
```

---

## Tujuan Sesi

Menambahkan **daya reaktif (Q)** sebagai output simulator, plus **power factor (pf)** dan
**apparent power (S)** sebagai metrik turunan — karena angka Q tanpa pf sulit dimaknai.
Diminta user lewat brainstorming → desain disetujui → implementasi TDD.

---

## Kegiatan & Hasil

### 1. Brainstorming & Desain (bounded path)

**Apa yang dilakukan:**
- Eksplorasi model: `getPmax`/`getPe`/`ode`/`hist`/`updateHdr`/`updateCards`/`extractChartData`
- Menyadari Q **closed-form** — tidak perlu state atau ODE baru:
  `Q = Vt·(E'·cos δ − Vt)/X'd`
- Menemukan masalah: `getPmax` menskalakan **seluruh Pmax** dengan `sc_Pfact`, sehingga
  `V` tidak pernah benar-benar menjadi tegangan terminal. Akibatnya Q nyaris tak berubah
  saat gangguan (0.1242 vs 0.1271 pra-gangguan) padahal Pe kolaps — menyesatkan.
- Verifikasi numerik seluruh titik operasi sebelum menulis kode

**Hasil:**
- Desain disetujui user: **Q + pf & S**, tanpa panel kurva kapabilitas, tanpa loop AVR
- Keputusan: header dapat **Q saja** (bukan Q+pf) — 7 stat akan overflow di 1280px
  (PRD §5.3); pf/S masuk kartu status + panel data fasor

### 2. Implementasi TDD — 5 slice merah→hijau

**Apa yang dilakukan:**

| Slice | Seam | Perubahan |
|---|---|---|
| 1 | `getVt`, identitas `getPmax` | `getVt(s)` baru; `getPmax` ditulis ulang `Ef·getVt(s)/Xs` |
| 2 | `getQe` | Rumus Q + guard Xs=0 |
| 3 | Konsistensi P–Q saat gangguan | (tes saja — mengunci perilaku) |
| 4 | `getS`, `getPF`, `getPFNature` | S=hypot, pf=\|P\|/S, sifat lag/lead/unity |
| 5 | Wiring UI | `hq`, `sc_q`, `sc_pf`, `hist.Qe`, dataset `Qe`, `qValues` |

- **Tes ditulis lebih dulu, disaksikan gagal, baru diimplementasikan** — tiap slice
- `tools/reactive-power.test.js` **mengekstrak fungsi dari HTML** (bukan menyalin ulang
  seperti `model.test.js`) sehingga tes benar-benar bisa gagal

**Hasil:**
- `tools/reactive-power.test.js` — **46 tes, semua lolos**
- Regresi penuh: model 17 ✓ · ui 79 ✓ · chart-scale 17 ✓ · reactive-power 46 ✓
  = **159 tes hijau**
- Verifikasi browser (Chrome DevTools MCP) cocok persis dengan nilai acuan:
  `Q=+0.1271 pu`, `pf=0.988 lag / 0.8100 pu`, header **tidak overflow** @1280px,
  grafik `Pe/Pm/Qe` sumbu `P, Q (pu)`, **nol error konsol**

**Kendala & temuan:**
- Dua kali salah hitung nilai acuan di tangan (kasus fault & unity pf) — ketahuan karena
  saya verifikasi ulang dengan `node -e` sebelum menulis tes. Pelajaran: hitung acuan
  dengan skrip, jangan mengandalkan aritmetika mental.
- Tes loop pf menangkap **edge case nyata**: δ=−1.4 (motoring) → pf negatif. Diputuskan
  pf = magnitudo `|P|/S` (0..1), sifat lag/lead dibaca dari tanda Q — arah daya sudah
  terlihat di readout P.
- Fixture tes sempat lupa menyertakan `getPe` di daftar ekstraksi saat `getS` memanggilnya
  — bug fixture, bukan kode produksi; diperbaiki.

---

## Status Plan Terkait

**Plan:** tidak ada (jalur bounded — desain di chat, tanpa file plan)
**Status sebelum:** —
**Status sesudah:** —
**Perubahan:** —

---

## Commit Sesi Ini

**PENTING — kerja sesi ini ter-commit oleh sesi paralel.** Saat sesi ini berjalan, sesi lain
membuat commit `309a8a9` dan menyapu seluruh perubahan Q ke dalamnya (HTML + `tools/reactive-power.test.js`
316 baris), tercampur dengan perbaikan UI/tata letak milik sesi tersebut.

Terverifikasi ada di `309a8a9`:
```
function getVt · getQe · getS · getPF (dengan Math.abs) · getPFNature
id="hq" · id="sc_q" · id="sc_pf" · Qe di hist · label:'Qe' · qValues
tools/reactive-power.test.js (316 baris)
```

**Sisa belum ter-commit** (3 baris — refactor hoisting di `updateSvgPhasor`):
```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html"
git commit -m "refactor(phasor): hoist perhitungan Q/pf keluar dari rdata"
```

**Commit hash:** `309a8a9` (disapu sesi paralel) + sisa refactor belum ter-commit

---

## Langkah Berikutnya

1. **Verifikasi visual manual di browser** — `tools/shoot.js` bermasalah (Chrome headless),
   jadi keindahan tampilan kartu `sc_q`/`sc_pf` dan garis Qe di grafik belum diperiksa mata
2. **Narasi preset Overexcitation belum diperbarui** — sekarang terbukti preset itu
   **mulai dari underexcited (Q=−0.255, pf 0.920 lead)** lalu berayun ke overexcited berat
   (Q=+0.722, pf 0.639 lag). Narasi `evts` di `SCENARIOS.overexcitation` masih tidak
   menyebut Q sama sekali — nilai edukasi besar yang belum dipakai
3. Pertimbangkan kurva kapabilitas P–Q (ditawarkan saat brainstorming, ditunda user)

---

## Catatan Tambahan

**Kenapa refactor `getPmax` aman:** `Ef·V/Xs·k` ≡ `Ef·(V·k)/Xs` — aljabar identik.
Diuji di 5 kasus (default, fault k=0.04, fault k=0.5, Xs=0.05, Ef=0.1) dengan Δ=0.00e+0.
Ini murni perbaikan **pemodelan** (V sekarang benar-benar tegangan terminal sesuai
PRD §2.2), bukan perubahan perilaku P.

**Konvensi tanda Q** (standar generator, cocok dengan notasi Kundur):
`Q>0` lagging/overexcited · `Q<0` leading/underexcited · `Q≈0` unity pf.

**Warna:** Q memakai `--violet` (#6040a0) — konsisten dengan kartu `T_osc` yang sudah
memakai violet. Q **tidak** ikut semantic red/green seperti Pe, karena Pe sudah memakai
skema itu di grafik; dua seri berkedip bersamaan terlalu berisik.

**Gotcha sesi paralel:** working tree sempat berubah dari sesi lain saat sesi ini berjalan
(HEAD pindah `17f001b` → `309a8a9`). Perubahan sesi ini terbatas pada HTML + satu file tes
baru; commit harus di-review dulu agar tidak menyapu perubahan sesi lain.
