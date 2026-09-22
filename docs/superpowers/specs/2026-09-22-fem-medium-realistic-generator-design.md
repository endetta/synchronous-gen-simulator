# Spec: FEM Medium — Visualisasi Realistis Generator Sinkron Multi-Kutub

**Status:** DRAF — menunggu review user sebelum implementation plan
**Tanggal:** 2026-09-22
**Proyek:** LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE)
**Produk:** `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`
**Basis:** `design-plans/plan-realistic-magnetic-visualization.md` (Fase 0 SELESAI, commit `2120cad`)
**Riset acuan:** `docs/riset-medan-magnetik-dan-belitan.md` (sumber primer MIT OCW 6.685 / Kirtley Class Notes 4)
**Seam pengujian:** `tools/extract.js`, `tools/realistic-field.test.js`

---

## 1. Ringkasan Eksekutif

User mengaudit mode "Realistis" Panel I dan melaporkan enam kelas masalah: kebenaran
fluks, penggambaran fase RMF, penggambaran sudut, garis putus-putus yang tidak
informatif, bentuk magnet rotor yang tidak realistis, dan animasi stator yang
berkedip terlalu cepat untuk dibaca.

Spec ini menetapkan **FEM medium**: model saturasi non-linear + saliency
(reluctance torque) yang **mengubah mesin fisika inti**, bukan sekadar kosmetik
visual. Keputusan user yang mengikat:

| Keputusan | Pilihan user |
|---|---|
| Realisme fluks | **FEM medium** — saturasi non-linear + reluctance torque |
| Cakupan fisika | **Semua jumlah kutub**, mesin fisika berubah (EAC/CCT → numerik) |
| Strategi implementasi | **Big Bang** — arsitektur baru, bukan tambal-sulam |
| Timeline | **Lengkap** — prioritas kualitas |
| Slider eksitasi | Bermakna **arus medan I_f**; `E_af = OCC(I_f)` dengan knee saturasi |
| Xq | `Xd × rasio(p)`; p=1 → 1.00 (round rotor), p≥2 → 0.65 (salient); **tanpa slider baru** |
| Jumlah kutub | Dropdown **2 / 4 / 6 / 8** |
| Kecepatan visual | Dropdown **0.25 / 0.5 / 1 / 2 Hz**; output fisika tetap 50 Hz |

---

## 2. Temuan Audit — Kondisi Sekarang

Semua nomor baris merujuk `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`.

### 2.1 Temuan yang dikonfirmasi user

| # | Temuan | Lokasi | Akar masalah |
|---|---|---|---|
| A1 | Label `d`, `q`, `N`, `S` sulit dibaca | baris 1377–1384 | Label berada **di dalam** `#g-rotor`, jadi ikut berputar dan sering terbalik/tertidur |
| A2 | Garis putus-putus P/B tidak informatif | baris 1325–1326 (air-gap), 1377–1378 (sumbu d/q) | Elemen dekoratif tanpa entri legenda; label sumbu hanya huruf tunggal tanpa makna |
| A3 | Fluks magnet tidak realistis | `buildFluxPath` baris 1213–1228 | Kelengkungan disetel fungsi sinus; **bukan** solusi medan (komentar baris 1214–1217 mengakuinya) |
| A4 | Magnet rotor bundar, bukan batangan | baris 1357 (`rotor-body` = `<circle>`) | Rotor digambar lingkaran solid; N/S hanya teks mengambang |
| A5 | Belum ada dukungan multi-kutub | `RGEO` baris 1183–1191; komentar baris 1177 | Seluruh geometri **hard-coded 2-kutub** (`p=1`) |
| A6 | Animasi stator berkedip terlalu cepat & tak sinkron dengan rotor | baris 1480 (`wE*S.t`), 1496 | Arus/dot-cross berjalan pada **50 Hz elektrik**; rotor pada `VSPD` konstan (1 rev/7 dtk) — dua kecepatan tak terhubung |

### 2.2 Temuan tambahan dari analisis

| # | Temuan | Konsekuensi |
|---|---|---|
| A7 | Mesin fisika **tanpa saliency** (`Xd = Xq`) | `Pe = Pmax·sin δ`; begitu saliency aktif, **empat rumus inti berubah** (§4.4) |
| A8 | Model **linear** — `Ef ∝ I_f` tanpa saturasi | Mesin nyata punya OCC melengkung (Kirtley §10.4); linear melebih-lebihkan rentang eksitasi |
| A9 | `S.Ef` dipakai di ~30 tempat | Migrasi ke `I_f` berisiko memutus 22 file tes — butuh strategi shim (§5.3) |
| A10 | Mode island: kecepatan visual **tidak** ikut `S.omega` | Riset §6 sudah mencatat ini sebagai cacat kejujuran animasi |

### 2.3 Yang sudah benar dan harus dipertahankan

| Lokasi | Isi | Kenapa benar |
|---|---|---|
| baris 1431–1432 | `base = S.anim − π/2`; `rotorAng = base + S.delta` | Kirtley §5: rotor & stator berputar bersama, terpisah δ |
| baris 530–552 | `getVt`, `getPmax`, `getPe`, `getQe` | Terverifikasi terhadap Kirtley §4/§7 (Q beda tanda = konvensi) |
| baris 1442–1452 | `fluxCache` — regenerasi path hanya saat Ef/R berubah | Pola performa yang benar; dipertahankan untuk solver baru |
| baris 1435–1437 | Rotasi rigid via `transform`, bukan hitung ulang `d` | MDN: `transform` masuk jalur compositing |
| baris 1477–1491 | Dot/cross dari `S.t`, bukan `Date.now()` | Deterministik (riset §5.5) |
| `docs/riset-medan-magnetik-dan-belitan.md` §3.10 | Fluks tetap saat `sc_active` | Asas constant flux linkage — dasar model `E'` |

---

## 3. Keputusan Desain (mengikat)

1. **Saturasi dimodelkan sebagai kurva OCC eksplisit** — `I_f → E_af` melengkung dengan knee.
2. **Saliency aktif untuk semua kutub**, tapi `Xq/Xd = 1.00` di p=1 membuat suku `sin 2δ` lenyap secara alami — bukan penjabaran terpisah.
3. **Slider eksitasi bermakna `I_f`** (arus medan); `S.Ef` menjadi *derived field* = `getEaf(S.If)`.
4. **Tidak ada slider Xq baru** — rasio tetap per jumlah kutub.
5. **Jam visual `τ` (tau) tunggal** untuk semua elemen waktu-visual.
6. **Aturan baru: tidak ada elemen SVG tanpa entri legenda.**
7. **Solver medan dihitung sekali, di-cache** — pola `fluxCache` diperluas, bukan ditinggalkan.

---

## 4. Arsitektur Fisika — Empat Lapisan

### 4.1 Diagram lapisan

```
┌─────────────────────────────────────────────────────────────┐
│ L0  GEOMETRI  (dari pole count p_pole)                       │
│     p_pole ∈ {2,4,6,8}  →  pairs p = p_pole/2                │
│     Xq = Xd · SAL_RATIO[p]        (1.00, 0.65, 0.65, 0.65)   │
│     slot count = 3 · p_pole · 2   (kelipatan 6p)             │
│     kumparan/fasa = p_pole · 2                               │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│ L1  SATURASI  (OCC non-linear)                               │
│     I_f ──satCurve──▶ E_af   (knee ~1.0 pu, tanh-based)      │
│     B_air(I_f) = B_rated · satCurve(I_f)  ← dipakai fluks    │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│ L2  MEDAN  (solver fluks 2D)                                 │
│     Br(θ) ∝ satCurve(I_f)·cos(pθ_rot) + armature reaction    │
│     → koefisien Fourier → path garis fluks (dihitung sekali) │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│ L3  RANGKAIAN  (P, Q, EAC)                                   │
│     P(δ) = Pmax·sin δ + V²/2·(1/Xq−1/Xd)·sin 2δ             │
│     δ0, δ_cr, δ_cc, CCT  ← numerik (bisection + integrasi)   │
└─────────────────────────────────────────────────────────────┘
```

**Alasan pemisahan:** tiap lapisan bisa diuji independen tanpa menyentuh lapisan
lain — L0/L1/L2 tanpa swing equation, L3 tanpa SVG. Ini yang membuat TDD bisa
red→green per unit kecil, dan mencegah Big Bang berarti "satu tes raksasa".

### 4.2 L0 — Geometri per jumlah kutub

```js
const SAL_RATIO = { 2: 1.00, 4: 0.65, 6: 0.65, 8: 0.65 };
function polePairs(poleCount){ return poleCount / 2; }
function getXq(Xd, poleCount){ return Xd * SAL_RATIO[poleCount]; }
function slotCount(poleCount){ return 3 * poleCount * 2; }   // 12/24/36/48
function coilsPerPhase(poleCount){ return poleCount * 2; }   // 4/8/12/16
```

**Sudut elektrik vs mekanis.** Untuk `pairs` pasangan kutub:

```
θ_elec = pairs · θ_mech        (derajat elektrik = pasangan kutub × derajat mekanis)
```

Konsekuensi untuk animasi: **`S.anim` tetap sudut elektrik** (`ω_e·t`), jadi rotasi
visual RMF dan rotor **tidak berubah** dengan jumlah kutub — hanya **jumlah pola
kutub pada gambar** yang berubah. Ini yang membuat sinkronisasi kecepatan (§7)
menjadi natural, bukan kasus khusus per jumlah kutub.

Jarak dua sisi satu kumparan = `180° elektrik` = `180°/pairs` **mekanis**. Busur δ
diukur **elektrik** (satu kutub N terhadap puncak RMF terdekat) agar cocok dengan
kurva P-δ Panel II.

### 4.3 L1 — Saturasi (OCC non-linear)

```js
// Knee di ~1.0 pu. Di bawah knee hampir linear; di atasnya melengkung ke asimtot.
// BUKAN kurva mesin nyata terukur — bentuk tanh yang menyatakan perilaku
// kualitatif saturasi. Harus dinyatakan sebagai penyederhanaan di legenda.
const OCC_KNEE = 1.0, OCC_PEAK = 1.55, OCC_ALPHA = 1.4;

function satCurve(If){
  const x = Math.max(0, If) / OCC_KNEE;
  return OCC_PEAK * Math.tanh(x / OCC_ALPHA) / Math.tanh(1 / OCC_ALPHA);
}
function getEaf(If){ return satCurve(If); }
function getFluxDensity(If){ return satCurve(If) / OCC_PEAK; }  // B_air / B_rated ∈ [0,1)
```

Sifat yang harus dijaga (dan diuji):
- `satCurve(0) = 0`
- monoton naik, **cekung** (`d²/dIf² < 0` untuk `If > 0`) — inilah knee
- `satCurve(1.0) ≈ 1.0` (kalibrasi: 1 pu arus medan → 1 pu tegangan pada knee)
- `satCurve(3.0) < OCC_PEAK` — tidak pernah tak-hingga

**Rantai eksitasi → output menjadi:**

```
I_f  →  satCurve  →  E_af  →  Pmax = E_af·V/Xd  →  Pe, Qe
     └──────────────▶ B_air  →  kerapatan garis fluks (visual)
```

### 4.4 L3 — Saliency: empat rumus inti yang berubah

Ini konsekuensi paling berat dari keputusan "semua pole, mesin fisika berubah".

| Besaran | Sekarang (tanpa saliency) | Dengan saliency |
|---|---|---|
| Daya elektris | `Pe = Pmax·sin δ` | `Pe = Pmax·sin δ + V²/2·(1/Xq − 1/Xd)·sin 2δ` |
| Sudut awal δ₀ | `arcsin(Pm/Pmax)` | akar `P(δ₀) = Pm` dengan `dP/dδ > 0` (bisection, cabang stabil) |
| Sudut kritis δ_cr | `π − δ₀` | **bukan** `π − δ₀`; titik `dP/dδ = 0` pertama > δ₀ |
| Sudut clearing δ_cc | Kundur eq.11.13 | bentuk tertutup tak berlaku → integrasi numerik `A₁(δ_cc) = A₂(δ_cc)` |
| CCT | Kundur eq.11.17 | integrasi numerik |

**Catatan penting untuk p=1:** `Xq = Xd` ⟹ suku `sin 2δ` = 0 ⟹ semua rumus kembali
ke bentuk tertutup lama. Ini **bukan** percabangan kode; ini konsekuensi matematis
dari `SAL_RATIO[2] = 1.00`. Mesin 2-kutub turbo (PLTU) memang round-rotor — jadi
pilihan ini juga yang benar secara fisik.

```js
function getPeSal(delta, Pmax, Xd, Xq, V){
  const sal = (Xq !== Xd) ? (V*V/2)*(1/Xq - 1/Xd)*Math.sin(2*delta) : 0;
  return Pmax*Math.sin(delta) + sal;
}
function solveDelta0(Pm, Pmax, Xd, Xq, V)    // bisection pada [0, π/2], ambil cabang dP/dδ>0
function solveDeltaCr(Pm, Pmax, Xd, Xq, V)   // akar pertama dP/dδ = 0 setelah δ0
function solveDeltaCc(Pm, Pmax, Xd, Xq, V)   // integrasi: A1(dcc) = A2(dcc)
function solveCCT(dcc, Pm, Pmax, Xd, Xq, V, H) // integrasi numerik
```

### 4.5 L2 — Solver medan

**Tujuan:** menghasilkan `Br(θ)` yang (a) menutup di yoke stator, (b) kerapatannya
∝ `B_air(I_f)`, (c) resultannya **miring** karena armature reaction, dan (d) jumlah
pola kutubnya = `pairs`.

```js
// Br(θ) dalam kerangka rotor. Suku pertama = medan rotor (dari I_f).
// Suku kedua = armature reaction dari arus stator (Kirtley §9: I_d demagnetizing,
// I_q cross-axis). Amplitudo suku kedua HALUS — round rotor Xd≈Xq (riset §4.4).
function solveField(If, Id, Iq, poleCount, delta){
  const B = getFluxDensity(If);          // L1
  const p = polePairs(poleCount);
  // koefisien harmonisa: fundamental + komponen armature
  const brRot = B;                        // amplitudo rotor
  const armD  = -Id * ARM_COUPLE;         // demagnetizing bila Id<0
  const armQ  =  Iq * ARM_COUPLE;         // cross-axis
  return { brRot, armD, armQ, p, delta };
}
```

Hasil untuk tiap garis fluks: integrasi langkah radial dari permukaan rotor ke
yoke, dengan laju belok sudut dari `Br(θ)`. Bentuk path disimpan sebagai template
(kerangka rotor) dan dirotasi rigid per frame — pola `fluxCache` lama, tapi
kuncinya `(If, Id, Iq, poleCount)` bukan sekadar `Ef`.

**Batas jujur (harus ada di komentar kode dan legenda):** ini **bukan** FEM mesh
penuh. Tidak ada mesh, tidak ada elemen hingga, tidak ada solver iteratif PDE.
Yang dimodelkan adalah distribusi medan sinusoidal dengan saturasi pada amplitudo
dan superposisi armature reaction — cukup untuk menunjukkan **fisika yang benar
secara kualitatif dan kuantitatif pada besaran turunan** (kerapatan ∝ B, resultan
miring beberapa derajat), tapi tidak memecahkan persamaan Maxwell di geometri
sebenarnya.

### 4.6 Konsekuensi pada `ode()` dan integrator

`ode()` baris 605–620 memanggil `Pmax·sin(delta)`. Diganti pemanggilan saliency.
State `S` bertambah:

```js
S.poleCount   // 2 | 4 | 6 | 8  (default 2)
S.If          // arus medan, default 1.0
S.animT       // jam visual τ
S.visSpeed    // Hz visual, default 1.0
```

`s.Ef` **tidak dihapus** — menjadi derived: `setIf(s, If){ s.If = If; s.Ef = getEaf(If); }`.

---

## 5. Desain Visualisasi

### 5.1 Label terbaca — counter-rotation

Akar A1: label ikut `#g-rotor` sehingga berputar. Solusi double-transform:

```
<g id="g-rotor" transform="rotate(θ_rotor)">        ← badan + magnet berputar
   ... geometri rotor ...
   <g class="pole-label" data-anchor="x_i,y_i">N</g> ← counter-rotate per frame
</g>
```

Tiap label diberi `transform="rotate(−θ_rotor, x_i, y_i)"` pada frame yang sama →
**tetap menempel di kutub yang benar**, tapi **teks selalu tegak**.

- Label `N`, `S`, `d`, `q` → counter-rotated
- Garis sumbu-d/q → tetap ikut berputar (garis tidak punya orientasi baca)
- Label δ pada busur → sudah di luar `#g-rotor`, tetap

**Implementasi:** `updateSvgPhasorRealistic` menyimpan daftar `[el, x, y]` label
statis dan menyetel counter-rotation tiap frame. Biaya: ~6 `setAttribute` per
frame — jauh di bawah anggaran 16.7 ms.

### 5.2 Garis putus-putus → diberi makna

| Sekarang | Sesudah |
|---|---|
| Lingkaran air-gap putus-putus (baris 1325) | Penanda air gap dengan **satu label** "air gap" (tidak berputar) |
| Sumbu-d putus-putus merah (baris 1377) | Sumbu-d + **entri legenda** "sumbu-d — sejajar belitan medan (kutub N)" |
| Sumbu-q putus-putus hijau (baris 1378) | Sumbu-q + entri legenda "sumbu-q — 90° elektrik di depan d" |
| `pole-N`/`pole-S` teks mengambang | Label pada muka magnet batangan yang sesuai |

Keduanya **tetap ada** (bukan dihapus) karena bermakna; yang hilang adalah
ambiguitasnya. Legenda diperluas + tooltip hover (pola `setupPdeltaHovers` sudah
ada sebagai preseden).

### 5.3 Magnet batangan rotor

Rotor silinder dipertahankan, tapi di bawah permukaannya digambar **pasangan
magnet batangan radial** berjumlah `p_pole`:

| p_pole | Bentuk | Rasional fisik |
|---|---|---|
| 2 | 2 batang lebar menempel permukaan dalam rotor | Turbo-generator round-rotor; magnet tersembunyi di dalam silinder |
| 4/6/8 | Batang **menonjol** keluar permukaan rotor | Mesin salient-pole; konsisten dengan suku `sin 2δ` yang aktif |

Warna: N biru (`#0068d8`), S merah (`#d84000`) — sudah dipakai label sekarang.
Fluks keluar dari muka N, masuk muka S; kerapatan dari solver L2.

### 5.4 Stator per jumlah kutub

| p_pole | Slot | Kumparan/fasa | Pola RMF |
|---|---|---|---|
| 2 | 12 | 2 | 1 pasang puncak |
| 4 | 24 | 4 | 2 pasang |
| 6 | 36 | 6 | 3 pasang |
| 8 | 48 | 8 | 4 pasang |

`buildCoilPath` sekarang hard-coded `th+Math.PI` (180° mekanis). Digeneralisasi
menjadi `th + Math.PI/pairs`. RMF (`#g-rmf`) digambar sebagai pola `pairs` puncak,
bukan satu panah — sehingga jumlah kutub **terlihat** dari bentuk medan, bukan
hanya dari label.

### 5.5 Legenda baru

```
■ Garis fluks (kerapatan ∝ B(I_f), dari solver medan)
■ Magnet batangan rotor — N (biru) / S (merah)
■ Belitan stator fasa A / B / C
■ RMF stator — resultan medan 3-φ berputar
— Sumbu-d rotor (sejajar belitan medan, kutub N)
– Sumbu-q rotor (90° elektrik di depan d)
⌒ Busur δ — sudut daya (sama dengan Panel II)

⚠ Penyederhanaan: medan sinusoidal dgn saturasi amplitudo + armature reaction
  superposisi; BUKAN mesh FEM. Saturasi = kurva tanh, bukan OCC terukur.
  Jumlah konduktor per fasa jauh lebih sedikit dari mesin nyata.
```

---

## 6. Sinkronisasi Kecepatan & Kontrol Slow-Motion

### 6.1 Akar masalah (A6)

| Elemen | Sekarang | Kecepatan |
|---|---|---|
| Rotor + garis fluks | `S.anim` += `VSPD·rdt`, `VSPD = 2π/7` | 1 rev / 7 dtk |
| Dot/cross arus + denyut kumparan | `Math.sin(wE*S.t − …)`, `wE = 2π·50` | **50 Hz** |

→ stator berkedip 50×/dtk (tak terbaca), rotor berputar 0.14×/dtk. Dua jam
terpisah, tidak ada hubungan.

### 6.2 Solusi: satu jam visual τ

```js
// Jam visual terpisah dari waktu fisika S.t. Determininistik (fungsi rdt),
// tidak pernah Date.now(). Frekuensi fisika tetap 50 Hz.
// S.animT menyimpan FASE visual (radian), bukan waktu — jadi laju integrasinya
// adalah 2π·visSpeed, dan rumus elemen di bawah memakai S.animT langsung.
S.animT += 2*Math.PI * S.visSpeed * rdt * (s.mode==='island' ? (1 + s.omega) : 1);
```

Semua elemen waktu-visual memakai `τ`:

| Elemen | Rumus baru |
|---|---|
| Rotasi RMF & rotor (`base`) | `S.animT − π/2` (menggantikan `S.anim`) |
| Fase arus fasa f (untuk dot/cross) | `sin(S.animT − f·2π/3)` |
| Denyut kumparan | `\|sin(S.animT − f·2π/3)\|` — pola sama, amplitudo absolut |

**Kontrol kecepatan visual** (dropdown di Panel I): `0.25 / 0.5 / 1 / 2 Hz`.
Default **1 Hz** — satu siklus listrik per detik nyata: flip dot/cross terbaca,
urutan fasa A→B→C terlihat berputar.

### 6.3 Mode island

`τ` otomatis diskalakan `(1 + ω)` → percepatan frekuensi **terlihat** di kecepatan
putar. Ini menutup cacat riset §6 (animasi island selama ini tidak jujur).

### 6.4 Saat fault

`τ` **tidak berubah**. Saat `sc_active`, yang berubah hanya `S.delta` yang melebar.
Fluks tetap rapat (asas constant flux linkage). Ini menjaga kontrak
`realistic-field.test.js` Test 8.

### 6.5 Determinisme

`τ` adalah fungsi murni dari `rdt` (delta waktu fisika) dan `visSpeed`, jadi:
- bisa di-pause bersama simulasi
- deterministik untuk pengujian
- tidak ada `Date.now()` di jalur realistis

---

## 7. Kontrol UI

### 7.1 Panel kontrol — perubahan

```
MESIN (csec BARU — di atas Generator Parameters)
  └ Dropdown  Jumlah Kutub:  [2] [4] [6] [8]
     → mengubah p_pole → slot, magnet, kumparan, Xq, saliency
     → p=1: round rotor (tanpa saliency); p≥2: salient

EXCITATION (AVR) — dimaknai ulang
  └ Slider  I_f — Arus Medan   0.2 – 3.0 pu   (default 1.0, di knee OCC)
     Readout turunan di sebelahnya:  E_af = 1.000 pu  (hasil OCC(I_f))
     Tooltip: I_f → fluks → E_af → Pmax

PANEL I (kanan-atas, di samping toggle Fasor/Realistis)
  └ Dropdown  Kecepatan visual: [0.25] [0.5] [1] [2] Hz
```

### 7.2 Yang dihapus / dimigrasi

- Slider `Ef` sebagai input langsung → **makna bermigrasi** ke `I_f`; `E_af` jadi readout turunan
- `S.Ef` tetap ada sebagai *derived field* (§4.6), agar `TIPS`, tooltip, `getPFNature`, preset tidak putus

### 7.3 Yang tidak berubah

H, D, X'd tetap. RLR, SC, preset, Panel II (kecuali rumus `Pe`/`δ0`/`δ_cr`),
Panel III tidak disentuh.

### 7.4 Migrasi `S.Ef` — shim, bukan sedot-semua

Ini titik paling berisiko (temuan A9). Strategi:

```js
function setIf(s, If){ s.If = clamp(If, 0.2, 3.0); s.Ef = getEaf(s.If); }
function getPmax(s){ return s.Ef * getVt(s) / Math.max(s.Xs,0.01); }  // TETAP — E_af sudah tersaturasi
```

`getPmax`/`getQe` tetap valid karena `E_af` sudah berisi efek saturasi. Tes lama
yang menyetel `S.Ef` langsung **tetap lolos**, kecuali yang menguji:
- saliency (baru)
- `δ_cr = π − δ0` (dipensiunkan saat `Xq ≠ Xd`)

**Preset scenario** yang menulis `S.Ef` langsung harus dialihkan ke `setIf`, kalau
tidak saturasi ter-bypass. Ini item checklist eksplisit.

---

## 8. Rencana Migrasi Tes

### 8.1 Pemetaan per file

| File tes | Nasib | Alasan |
|---|---|---|
| `realistic-field.test.js` | **Migrasi** — kontrak diperluas: magnet batangan, label counter-rotated, geometri per kutub, `#g-rmf` pola `pairs` | seam tetap `initSvgRealistic`/`updateSvgPhasorRealistic` |
| `model.test.js` | **Sebagian migrasi** — tes `δ_cr = π−δ₀` dan CCT pindah/disesuaikan | rumus lama tak berlaku bila `Xq≠Xd` |
| `eac-verdict.test.js` | **Migrasi ke numerik** — `getA2Available` ikut saliency | A₂ tersedia kini integral, bukan bentuk tertutup |
| `reactive-power.test.js` | **Tambahan kasus** — Q dengan armature reaction saturasi | rantai baru |
| `governor-steady-state.test.js` | **Regresi (wajib hijau)** | tidak menyentuh saliency |
| `oos-trip.test.js` | **Regresi (wajib hijau)** | tidak menyentuh saliency |
| `ui.test.js` | **Tambahan** — dropdown kutub, slider `I_f`, dropdown kecepatan | kontrak kontrol baru |
| `chart-scale`, `time-series-*`, `pane-resize`, `a11y`, `performance` | **Regresi (wajib hijau)** | tidak tersentuh |
| **BARU** `fem-saturation.test.js` | L1 — `satCurve` monoton, cekung, knee, batas atas | inti FEM medium |
| **BARU** `fem-saliency.test.js` | L3 — suku sin2δ, `δ_cr` numerik ≠ `π−δ₀` saat `Xq<Xd`, p=1 kembali tertutup | inti FEM medium |
| **BARU** `fem-field-solver.test.js` | L2 — harmonisa, kerapatan ∝ B(I_f), armature reaction memiringkan | inti FEM medium |
| **BARU** `visual-sync.test.js` | Satu jam `τ` untuk rotor+stator, island ∝ (1+ω), tidak ada `Date.now()` | keluhan A6 |
| **BARU** `pole-geometry.test.js` | L0 — `SAL_RATIO`, `slotCount`, `coilsPerPhase`, `θ_elec` | dukungan multi-kutub |

### 8.2 Pembatasan seam yang harus dijaga

`tools/extract.js` mengekstrak dari blok `<script>` inline terakhir dengan stub DOM.
Semua fungsi baru L0–L3 **wajib** murni (tanpa DOM) agar bisa diekstrak. Daftar
`names`/`REQUIRED` di `extract.js` diperluas dengan fungsi baru **saat tesnya
ditulis**, bukan belakangan.

---

## 9. Urutan TDD

```
Fase A  L1 Saturasi      RED fem-saturation.test.js   → GREEN satCurve/getEaf/getFluxDensity
Fase B  L0 Geometri      RED pole-geometry.test.js    → GREEN polePairs/getXq/slotCount
Fase C  L3 Rangkaian     RED fem-saliency.test.js     → GREEN getPeSal/solveDelta0/Cr/Cc/CCT
Fase D  Migrasi EAC      RED eac-verdict (numerik)    → GREEN getA2Available saliency
Fase E  Migrasi model    RED model.test (δcr pindah)  → GREEN, tes lama disesuaikan
Fase F  L2 Solver medan  RED fem-field-solver.test.js → GREEN solveField
Fase G  Visual per-kutub RED realistic-field (perluas)→ GREEN initSvgRealistic
Fase H  Label ⊥ + magnet RED realistic-field (label)  → GREEN counter-rotate + batangan
Fase I  Jam visual τ     RED visual-sync.test.js      → GREEN S.animT + slider kecepatan
Fase J  UI kontrol       RED ui.test (tambahan)       → GREEN dropdown kutub + slider I_f
Fase K  Regresi penuh    Semua tes node tools/*.test.js→ SEMUA hijau
```

**Gate setiap fase:** tes baru **merah dulu** (fitur belum ada, dan merah karena
alasan yang benar), lalu hijau; setelah hijau, jalankan **seluruh suite lama**
untuk regresi.

**Iron law TDD:** tidak ada kode produksi tanpa tes yang gagal lebih dulu.

---

## 10. Kriteria Selesai

- [ ] Dropdown 2/4/6/8 kutub bekerja; slot, magnet, kumparan, RMF ikut berubah
- [ ] Label `d`/`q`/`N`/`S` **selalu tegak dan terbaca** di semua sudut rotor
- [ ] Magnet rotor berupa **batangan** berjumlah `p_pole`; salient-pole untuk p≥2
- [ ] Garis fluks dari **solver** L2; kerapatan ∝ B(I_f); armature reaction memiringkan resultan
- [ ] Saturasi: `I_f` di atas knee **tidak** lagi linear menaikkan `E_af`/fluks
- [ ] `Pe` punya suku `sin 2δ` saat `Xq < Xd`; `δ_cr`/`δ_cc`/`CCT` numerik
- [ ] Rotor + stator berputar dari **satu jam τ**; sinkron by construction
- [ ] Dropdown kecepatan visual bekerja; output fisika tetap 50 Hz
- [ ] Mode island: kecepatan visual ikut `(1+ω)`
- [ ] Tidak ada `Date.now()` di jalur realistis
- [ ] Fluks **tidak** mengerut saat `sc_active`
- [ ] Tidak ada elemen SVG tanpa entri legenda
- [ ] Semua tes lama tetap hijau, atau dimigrasi dengan alasan tertulis
- [ ] `tools/extract.js` `REQUIRED` diperbarui untuk fungsi baru

---

## 11. Risiko Terbuka

| # | Risiko | Mitigasi |
|---|---|---|
| R1 | Biaya solver L2 per frame | Solver hanya jalan saat `(I_f, Id, Iq, p_pole)` berubah material; cache seperti `fluxCache` lama |
| R2 | `δ_cr` numerik mengubah makna ambang "CRITICAL" (5°/20°) di `updateCards` & narasi | Kalibrasi ulang ambang terhadap `δ_cr` numerik, bukan angka tetap |
| R3 | Tes lama yang mengunci `π−δ₀` jadi merah di Fase E | Memang tujuannya — **dimigrasi**, bukan dihapus |
| R4 | Preset scenario menulis `S.Ef` langsung → saturasi ter-bypass | Alihkan semua ke `setIf`; tambahkan tes yang gagal bila `S.Ef` ditulis langsung |
| R5 | Lengkung OCC (tanh) bukan OCC terukur | Dinyatakan sebagai penyederhanaan di legenda + komentar kode |
| R6 | `δ0` ganda pada mesin salient | Solver memilih cabang stabil `dP/dδ > 0`; tes menutup kasus dua-akar |
| R7 | Performa SVG membesar (48 slot @ 8-kutub + magnet + solver) | Ukur dengan DevTools setelah implementasi; anggaran 16.7 ms/frame (MDN) |
| R8 | "FEM medium" bisa disalahpahami sebagai FEM mesh penuh | Batas jujur ditulis di §4.5, komentar kode, dan legenda |

---

## 12. Referensi

1. Kirtley, J. L. (2013). *Electric Machines*, Class Notes 4: Elementary Synchronous Machine Models. MIT OCW 6.685. — §2 (Br radial), §3 (kumparan, π/p), §4 (tiga fasa 120°), §5 (kedua medan berputar), §9 (sumbu d/q, saliency, `P(δ)` salient), §10 (saturasi, OCC)
2. `docs/riset-medan-magnetik-dan-belitan.md` — riset primer proyek ini
3. `design-plans/plan-realistic-magnetic-visualization.md` — Fase 0 (SELESAI, `2120cad`)
4. Kundur, P. (1994). *Power System Stability and Control*. — EAC (bentuk tertutup yang dipensiunkan saat `Xq≠Xd`)
5. MDN, *Animation performance and frame rate* — anggaran 16.7 ms, `transform` masuk compositing
6. `tools/realistic-field.test.js` — kontrak visualisasi yang diperluas
7. `tools/extract.js` — seam ekstraksi fisika dari HTML

---

## 13. Yang TIDAK Termasuk (Non-Scope)

- **FEM mesh penuh** (meshing, solver iteratif PDE, time-stepping) — ditolak user sebagai terlalu berisiko
- **Slope/reluctance non-linear per elemen** — hanya saturasi amplitudo
- **Harmonisa MMF orde tinggi dari distribusi slot diskret** — tetap sinusoidal murni (Kirtley §3)
- **Fluks bocor (leakage)** — tetap tidak digambar (riset §8.1)
- **End-winding 3D** — penampang 2D
- **Model PM (permanent magnet)** — mesin wound-field
- **Saliency untuk mesin azimuth/axial** — hanya radial
