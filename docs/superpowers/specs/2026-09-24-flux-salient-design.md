# Desain: Garis Fluks Salient-Pole Realistis (Panel I)

**Status:** MENUNGGU REVIEW user, sebelum writing-plans
**Dibuat:** 2026-09-24
**Sumber audit:** `design-plans/audit-flux-fase-2026-09-24.md` (workflow `audit-flux-fase-realistis`)
**Sumber fisika:** `docs/riset-medan-magnetik-dan-belitan.md` (primer, Kirtley MIT OCW 6.685)
**Sumber kode:** `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`, Panel I mode Realistis

---

## Latar Belakang & Masalah

Audit read-only (4 panel, 2026-09-24) mengonfirmasi dua keluhan user di Panel I mode Realistis:

**A. Garis fluks tidak realistis.** `buildFluxPath` (:1451-1466) memakai polyline sinus 33 titik — komentar kode sendiri tulis "BUKAN solusi medan penuh (bukan FEM)". Tidak ada sepatu kutub, celah udara seragam (`RGEO.gap` konstan), tanpa flux bocor, tanpa panah arah N→B. Bentuk ini hanya skematis; untuk mesin kutub menonjol (salient) nyata, salah.

**B. Kerapatan tidak merespons arus medan (I_f).** Kerapatan naik via solver `n=6+round(8*brRot)` (:1474), tetapi saturasi OCC menekan `brRot` (0.15→0.98 pada I_f 0.2→3.0) sehingga `n` hanya 7→14 — 2x. Semua garis digabung jadi SATU `<path>` per pasang kutub (:1488-1493); beda 7 vs 14 sub-segmen bertumpuk tak terlihat. Sementara opacity ditimpa tiap frame `0.35+0.55*brRot` (:1718), `stroke-width` konstan (:1490), `rMax` hanya +4% (:1483). Mata membaca opacity, bukan kerapatan.

**C. Dead code + komponen tak terpakai.** `fluxNorm`/`fluxCount` `tanh(ef/1.5)` (:1440-1441) nol pemanggil. `armD=-Id*0.18` (:657) dihitung tapi tidak digambar — overexcited tidak melemahkan flux visual.

**Batasan mengikat yang DIPERSAHABKAN (jangan dilanggar saat revisi):**
- Rotor dan stator berputar bersama pada kecepatan sinkron, terpisah δ (Kirtley §5). Sudah benar di kode, tetap.
- Fluks tetap rapat saat `sc_active` (constant-flux-linkage, model `E'`). `S.V` nominal di :1690. Tetap.
- Distorsi reaksi jangkar subtle (beberapa derajat), bukan dramatis. `armQ` geser sudah ada.
- Rotasi rigid via `<g transform>`, bukan hitung ulang `d` per frame. Tetap.
- Determinisme `S.animT` (bukan `Date.now()`). Tetap.

---

## Pendekatan Terpilih: A

**Model permeansi celah + trace RK4.** Geometri salient nyata (sepatu kutub, `g(θ)` tak-seragam), medan `Br(θ)=μ0·F(θ)/g(θ)` dengan `F` = rotor (arus medan `I_f` via kurva OCC) + stator (`I_d/I_q` via `ARM_COUPLE`), trace garis integrasi RK4 di kerangka rotor, klasifikasi garis utama vs bocor.

**Alternatif ditolak:**
- **B (skematis dipercantik):** bentuk tetap salah, keluhan "tidak realistis" tak terjawab.
- **C (FEM mesh penuh):** YAGNI — berat untuk 60fps, overkill edukasi.

---

## Desain Terstruktur

### Seksi 1 — Geometri Salient-Pole (`RGEO` baru / perluasan)

| Parameter | Simbol | Makna | Default |
|-----------|--------|-------|---------|
| `shoeArc` | α_shoe | Lebar busur sepatu kutub (derajat, mekanis) | 70° |
| `shoeHeight` | h_shoe | Tinggi sepatu di atas permukaan rotor (relatif R) | 0.05 |
| `shoeFlare` | f_shoe | Flare ujung sepatu (0 = tajam, 1 = penuh) | 0.4 |
| `gapMin` | g_min | Celah di muka kutub (minimal) | RGEO.gap (0.55) |
| `gapMax` | g_max | Celah di interpolar (maksimal) | gapMin × 2.2 |

Fungsi celah: `g(θ) = gapMin + (gapMax - gapMin) · (1 - shoeMask(θ))`, dengan `shoeMask(θ)` = 1 di dalam busur sepatu, 0 di luar, transisi halus (cosine blend).

Konversi 2-kutub (round): `g(θ)` seragam (gapMax = gapMin), `shoeHeight` = 0. Kompatibel mundur dengan perilaku kini.

Koordinat sepatu: untuk kutub ke-`k` di sudut `θ_k`, permukaan rotor efektif `r_surface(θ) = rotorR + h_shoe · shoeMask(θ - θ_k)`. Titik fluks keluar tegak lurus dari permukaan ini.

### Seksi 2 — Model Medan `Br(θ)`

```
F_rotor(θ) = brRot · cos(pairs · θ_elektrik_di_kerangka_rotor)
           = brRot · cos(θ_lokal)            [2-kutub]
F_stator(θ) = armQ · cos(θ) + armD · sin(θ)  [reaksi jangkar]
F_total(θ)  = F_rotor(θ) + F_stator(θ)
Br(θ)       = F_total(θ) / g(θ)              [koreksi celah tak-seragam]
```

`brRot` = `getFluxDensity(If)` dari OCC (`satCurve` :531-536 / `OCC_PEAK=1.55`).
`armQ`, `armD` dari solver (`ARM_COUPLE=0.18`, :654-662).
Total fluks Φ = ∫ Br(θ) dθ, dasar kerapatan visual.

### Seksi 3 — Algoritma `traceFieldLine` (ganti `buildFluxPath` :1451-1466)

Input: sudut awal `a0` (kerangka rotor), radius rotor efektif `r0`, radius stator `r1`, `field` (rotor + stator + g(θ)).
Integrasi RK4:
```
dr = (r1 - r0) / N_step      (N_step = 24)
th = a0; r = r0
for i in 0..N_step:
  titik.push([r cos th, r sin th])
  // Komponen tangensial fluks ∝ 1/g(θ), membelokkan lintasan
  dth = k · sin(pairs · th) · (dr / r) · (g_ref / g(th))   // k konstanta kelengkungan
  th += dth
  r  += dr
```
Output: array titik → satu `<path>` per garis.

**Klasifikasi garis:**
- **Utama:** mencapai `r1` (stator yoke), lintas gap penuh. Warna `#2f6fb0`, `width ∝ B` lokal.
- **Bocor (leakage):** tidak lintas gap — antar-kutub atau antar-slot, tutup di dalam rotor/stator tanpa menyentuh kutub berlawanan. Gaya dashed, warna lebih pucat (`#5a8fc0`), tipis, count ∝ `armQ` + `If` kecil.
- **Trace bocor:** mulai dari sisi kutub, naik sedikit ke ujung sepatu (`shoeFlare`), turun kembali ke kutub berikutnya — tanpa menyeberang gap.

### Seksi 4 — Kerapatan vs `I_f` (ganti dead code + opacity-dominan)

Satu fungsi `density(If)` menggantikan `fluxNorm`/`fluxCount` :1440-1441:
```
function density(If) {
  const sat = getFluxDensity(If)            // OCC, 0..1
  return Math.round(6 + 18 * Math.pow(sat, 0.7))   // 6..24, konkaf (saturasi dinyatakan)
}
```
- I_f = 0.2 → sat≈0.15 → n≈10
- I_f = 1.0 → sat≈0.65 → n≈17
- I_f = 3.0 → sat≈0.98 → n≈24

Rentang 6→24 (4x), cukup terlihat. `Math.pow(0.7)` menyebar rentang di `If` rendah (yang dominan operasi normal) dan memampatkan di `If` tinggi (saturasi).

Opacity dipersempit: rebuild `0.70 + 0.25*min(1,brRot)` (:1491), hapus penimpaan per-frame :1718 atau pertahankan sangat sempit `0.85+0.10*fn`. `stroke-width` jadi proporsional `B` lokal (`R*0.008 .. R*0.018`), `rMax` berkembang `0.92+0.07*brRot` (:1483) agar pola jelas.

### Seksi 5 — `armD` (demagnetizing) modular

`armD = -Id * ARM_COUPLE` dihitung (:657) tapi tidak dipakai. Kini dipakai sebagai modulasi amplitudo flux total, **dengan cap 30%**:

```
armD_factor = clamp(1 + field.armD, 0.7, 1.3)
F_rotor_eff  = F_rotor * armD_factor
```

- Overexcited (`Id < 0`, `armD > 0`): faktor > 1 → flux menguat, tidak melebihi +30%.
- Underexcited (`Id > 0`, `armD < 0`): faktor < 1 → flux melemah, tidak kurang dari -30%.
- Cap mencegah kesan "collapse" — bedakan secara visual dari fault.
- Cache `Id` sudah ada di `fluxCache` (:1712), tidak perlu invalidasi baru.

### Seksi 6 — Arrowhead Arah N→S

`traceFieldLine` mengembalikan titik tengah lintasan + sudut tangen di titik itu. Untuk tiap path utama, tambah satu elemen `<path class="flux-arrow">` berupa segitiga kecil di titik tengah, dirotasi mengikuti tangen, arah N→S (keluar kutub N di `r0`, menuju kutub S di `r1`). Dipilih segitiga eksplisit, bukan `marker-mid` SVG — `marker-mid` menempel di SEMUA verteks interior, bukan hanya titik tengah. Garis bocor tanpa arrowhead (arahnya ambigu edukatif).

### Seksi 7 — Multi-kutub (4/6/8)

Template dihitung sekali dalam kerangka lokal pasangan kutub. Untuk `pairs` > 1: tiap pasangan = salinan template yang di-rotate `2π·k/pairs` (`transform:rotate(...)` di `<g>` pasangan). Sekat antar-pasangan (garis netral) ditandai. Cakupan flux **tidak** menangani skala mekanis `δ/pairs` — itu scope fase, ditunda.

### Seksi 8 — Legenda Update

Tambah entri:
- Sepatu kutub rotor (magnet batangan → sepatu)
- Celah udara tak-seragam (panah `g_min` / `g_max`)
- Flux bocor (garis putus-putus tipis)
- Arah N→S (panah)

Warning update: "Model permeansi celah + superposisi medan rotor/stator — BUKAN mesh FEM penuh."

### Seksi 9 — Testing (perluasan `tools/realistic-field.test.js`)

**Baru:**
- Jumlah path ∝ `I_f` monoton naik (set 3 titik, cek urutan).
- Terdapat path bocor (id/class `leak-`, dashed, tidak lintas gap).
- `g(θ)` minimum di muka kutub, maksimum di interpolar.
- Satu `<path>` per garis utama (bukan digabung).
- Arrowhead: segitiga di titik tengah main path utama, arah N→S; garis bocor tanpa arrowhead.
- Efek `armD`: overexcited menguat ≤30%, underexcited melemah ≤30%, tidak pernah collapse.
- Tidak ada panggilan `getVt()` / `sc_active` di rebuild path.

**Disesuaikan (perilaku berubah):**
- Test 5: jumlah `setAttribute('d')` bisa berubah (busur δ + sepatu baru mungkin tambah).
- Test 8: assertion opacity diganti assertion jumlah path ∝ `I_f`.
- Test 11: sumbu-d/q tetap, konsisten.

### Seksi 10 — Performa

- Rebuild hanya saat `fluxCache` berubah (`If/Id/Iq/poleCount/R`), tetap.
- `N_step` RK4 = 24, `n` max 24, total path per frame ≤ 24 + bocor (~8) = ~32 path. Ringan.
- Rotasi tetap `<g transform>`, bukan per-path.
- Penghapusan dead code mengurangi bundle.

---

## Dampak & Risiko

| Area | Dampak | Mitigasi |
|------|--------|----------|
| `buildFluxPath` :1451-1466 | Dihapus, ganti `traceFieldLine` | Semua pemanggil via `rebuildFluxPaths` |
| `fluxNorm`/`fluxCount` :1440-1441 | Dihapus (dead code) | Nol pemanggil |
| `rebuildFluxPaths` :1471-1496 | Ditulis ulang | Cache key sama |
| `updateSvgPhasorRealistic` :1717-1718 | Opacity override dihapus/dipersempit | Tidak ada regresi visual di 2-kutub |
| `drawRealisticLegend` :1770-1790 | Entri baru | Layout legend mungkin perlu geser |
| `tools/realistic-field.test.js` | Test 5/8/11 disesuaikan, tambah test baru | Jalankan `node tools/realistic-field.test.js` pasca-edit |
| Round rotor 2-kutub | Kompatibel mundur (g seragam, shoeHeight=0) | Test visual |

**Risiko:** variabel kelengkungan `k` di trace RK4 mungkin butuh kalibrasi visual. **Mitigasi:** manual browser test setelah implement.

---

## Batasan

- **Tidak termasuk** skala mekanis `δ/pairs` multi-kutub (scope fase, ditunda).
- **Tidak termasuk** marker RMF asimetris, loop `i<6` → `coilsPerPhase`, label slow-motion (scope fase).
- **Tidak termasuk** perubahan UI slider/kontrol.
- **`armD` cap 30%** adalah asumsi visualisasi, bukan batas fisika terukur.

---

## Kriteria Selesai

- [ ] `traceFieldLine` menggantikan `buildFluxPath`, menghasilkan garis utama + bocor.
- [ ] Satu `<path>` per garis + arrowhead N→S.
- [ ] `density(If)` menggantikan dead code, rentang 6→24.
- [ ] `armD` memodulasi flux dengan cap 30%.
- [ ] Geometri salient: sepatu kutub + `g(θ)` tak-seragam, 4/6/8 kutub.
- [ ] Kompatibel mundur 2-kutub (round rotor).
- [ ] Constant-flux-linkage tetap (tanpa `getVt`/`sc_active` di path).
- [ ] Semua `node tools/realistic-field.test.js` hijau (43+ assertion).
- [ ] `npm test` hijau penuh.
- [ ] Manual browser test: slider I_f mengubah kerapatan terlihat, arrowhead ada.

---

## Langkah Berikutnya

1. User review spec ini.
2. Jika setuju → invoke `writing-plans` untuk rencana implementasi per-tahap (TDD).
3. Implementasi: `tools/realistic-field.test.js` dulu (red), lalu kode (green), lalu legenda + kalibrasi visual.
