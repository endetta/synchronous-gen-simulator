# Riset: Medan Magnet & Belitan Stator untuk Mode Realistis

**Jenis:** Dokumen riset
**Tanggal:** 2026-09-20
**Tujuan:** Dasar implementasi ulang mode "Realistis" Panel I — garis fluks, belitan stator sebagai kumparan, dan keterkaitan eksitasi → output
**Audiens:** Engineer yang mengimplementasikan di `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`

---

## 1. Ringkasan Eksekutif

Mode "Realistis" saat ini tidak menampilkan medan magnet. Ia menampilkan dua `<circle>` ber-`radialGradient` — bentuk yang secara geometris tidak punya arah, sehingga tidak mungkin menunjukkan fluks ke mana pun. Tidak ada satu pun `<path>` garis fluks di seluruh mode itu. Belitan stator digambar sebagai 18 titik lingkaran, bukan kumparan.

Dokumen ini menetapkan:

1. **Bentuk fisika yang benar** untuk mesin 2-kutub rotor silindris — jenis mesin yang tepat untuk simulator ini, dan mengapa.
2. **Satu temuan yang mengubah desain animasi secara mendasar**: rotor dan stator menghasilkan medan magnet yang **sama-sama berputar pada kecepatan sinkron**. Yang membedakan keduanya hanyalah sudut daya δ. Konsekuensinya, animasi yang benar bukan "rotor berputar cepat di dalam stator diam", melainkan **dua medan berputar bersama, terpisah oleh δ**.
3. **Jalur dari eksitasi ke output** yang sudah terverifikasi ke sumber primer, termasuk verifikasi rumus yang sudah dipakai simulator.
4. **Keputusan Reuse-First** dengan kandidat library nyata dan trade-off-nya.
5. **Pseudocode** yang bisa dipasang di seam `updateSvgPhasorRealistic()` yang sudah ada.

---

## 2. Status Riset Sebelumnya

Dua dokumen sudah ada di `docs/`. Keduanya bersumber sekunder dan **belum pernah diverifikasi**.

### `docs/research-magnetic-fields.md` (737 baris, 2026-09-09)

| Klaim | Status setelah verifikasi |
|---|---|
| Medan stator berputar pada kecepatan sinkron | **Terverifikasi** — Kirtley Ch.4 §2 poin 4: "generate a stator current distribution which is not static as implied here but which rotates in space … and this pulls the rotor along" |
| Medan rotor stasioner relatif terhadap rotor | **Terverifikasi** — Kirtley Ch.4 §1: "The current distribution on the rotor is fixed with respect to the rotor" |
| Torsi dihasilkan interaksi dua medan, sebanding sin δ | **Terverifikasi** — Kirtley Ch.4 §3: `T = (π/2)·(μ₀R³ℓ/g)·K_S K_R sin pθ` |
| Eksitasi mengontrol kekuatan medan rotor → mempengaruhi Pmax dan Q | **Terverifikasi sebagian** — Kirtley Ch.4 §7–8 menghubungkan arus medan ke `Eaf` dan ke P/Q; klaim "langsung mempengaruhi Pmax" benar secara struktural karena `Pmax = Ef·V/Xd`, tapi dokumen lama tidak menyebut asumsi di baliknya |

Sumber dokumen lama (Wikipedia, Circuit Globe) tidak dipakai lagi sebagai rujukan teknis di dokumen ini.

### `docs/rotor-stator-visualization-research.md` (573 baris, 2026-09-08)

| Klaim | Status setelah verifikasi |
|---|---|
| Belitan 3-fasa terdiri dari tiga set kumparan terpisah 120° | **Terverifikasi** — Kirtley Ch.4 §4: "the stator has three separate windings, identical but with spatial orientation separated by an electrical angle of 120° = 2π/3" |
| Kumparan tertanam dalam slot stator | **Terverifikasi** — Kirtley Ch.4 §9: "the stator winding is located in slots in the surface of a highly permeable stator core annulus" |
| Inti stator berlaminasi | **Belum terverifikasi** — tidak dikonfirmasi di sumber yang saya buka sesi ini; secara teknis lazim untuk mesin nyata, tapi tidak saya verifikasi |
| Nomor bagian "2.1 Stator Construction" mengutip Wikipedia | Sumber lemah; konstruksi frame (wrapper plate, keybars) tidak diverifikasi dan **tidak relevan** untuk penampang 2D |

### Klaim yang DIKOREKSI

**Koreksi 1 — "Stator field rotates at sync speed" (dokumen lama) kurang lengkap dan menyesatkan secara visual.**
Pernyataan itu benar tapi tidak menyebut bahwa **medan rotor juga berputar pada kecepatan sinkron**. Kirtley Ch.4 §5: mesin beroperasi "with the mechanical speed consistent with the electrical frequency (p·Ω = ω)", dan pada kondisi itu "the machine exhibits a **constant** torque". Jika hanya stator yang berputar sementara rotor diam relatif terhadapnya, sudut antara keduanya akan berubah terus dan torsi tidak akan konstan — mesin tidak akan pernah sinkron. **Konsekuensi untuk animasi: keduanya harus berputar, dan δ adalah sudut tetap di antara keduanya.**

**Koreksi 2 — "Armature reaction" di Wikipedia tidak bisa dipakai sebagai rujukan untuk mesin sinkron.**
Saya membuka `https://en.wikipedia.org/wiki/Armature_reaction`. Halaman itu **seluruhnya tentang mesin DC** — tidak ada istilah d-axis/q-axis, tidak ada pembahasan lagging/unity/leading. Yang ada justru "cross magnetization of the armature" dan pergeseran neutral plane, konsep mesin DC. Ini penting dicatat: dokumen lama yang mengutip Wikipedia untuk armature reaction mesin sinkron kemungkinan mengutip halaman yang tidak membahasnya.

**Koreksi 3 — Halaman Wikipedia "Synchronous machine" hanya menyentuh armature reaction secara sepintas.**
Yang terverifikasi dari sana: over-excitation "causes a demagnetizing effect due to armature reaction", dan eksitasi mengendalikan pf ("By varying the excitation of a synchronous motor, it can be made to operate at lagging, leading and unity power factor"), dengan V-curve yang minimum di unity pf. **Dekomposisi d/q tidak ada di halaman itu.** Dekomposisi itu ada di sumber primer (Kirtley Ch.4 §9), bukan di Wikipedia.

### Yang masih belum terverifikasi

- Tabel lengkap "armature reaction pada pf lagging/unity/leading" dalam bentuk kanonik (Kundur/Chapman) — **tidak berhasil saya buka langsung sesi ini.** Yang bisa saya berikan adalah turunan dari relasi Kirtley yang terverifikasi (§4.4), ditandai sebagai turunan, bukan kutipan.
- Nomor halaman pasti di buku cetak Kundur (1994) — saya hanya bisa mengutip Kirtley yang PDF-nya benar-benar saya buka.
- Semua klaim tentang konstruksi fisik (frame, keybars, laminasi) — tidak relevan untuk penampang 2D dan tidak saya verifikasi.

---

## 3. Cara Kerja Generator Sinkron

Sumber utama bagian ini: **MIT OpenCourseWare 6.685 *Electric Machines*, Fall 2013, Prof. James L. Kirtley Jr., Class Notes 4: "Elementary Synchronous Machine Models"** — `https://ocw.mit.edu/courses/6-685-electric-machines-fall-2013/a10eb941769a0f5fa6a7460a8a7bb201_MIT6_685F13_chapter4.pdf`. Semua kutipan di bawah dari dokumen itu kecuali dinyatakan lain. (Catatan: PDF ini tidak bisa dirender Read tool karena poppler tidak terpasang; teksnya diekstrak dengan `tools/pdf-text.js`.)

### 3.1 Gambaran fisik

Kirtley §2, "Physical Picture: Current Sheet Description":

> "The `machine' consists of a cylindrical rotor and a cylindrical stator which are coaxial and which have sinusoidal current distributions on their surfaces: the outer surface of the rotor and the inner surface of the stator."

> "We also assume that the rotor and stator have current distributions that are axially (z) directed and sinusoidal"

> "The current distribution on the rotor is fixed with respect to the rotor."

Ini adalah **rotor silindris** (round rotor). Kirtley §9 menegaskan bahwa model ini tepat untuk mesin yang menjadi subjek simulator:

> "This is a pretty good approximation for large turbine generators and many smaller **two-pole machines**"

Simulator ini memodelkan turbo-generator PLTU 2-kutub 50 Hz. Jadi model round-rotor yang dipakai simulator **defensible** dan bukan penyederhanaan yang ceroboh.

### 3.2 Medan magnet: kerapatan fluks radial

Kirtley §2 menurunkan kerapatan fluks radial di air gap dari superposisi arus stator dan rotor:

```
Br = μ₀R(K_S sin pθ + K_R sin p(θ − θ_m)) / g
```

dengan `K_S` = kerapatan arus permukaan stator, `K_R` = rotor, `θ_m` = sudut mekanis rotor, `p` = jumlah pasang kutub, `g` = panjang air gap.

**Yang penting untuk visualisasi:** ini adalah **satu** medan resultan, bukan dua medan terpisah. Yang digambar sebagai "garis fluks" di penampang adalah `Br(θ)` ini. Ia sinusoidal terhadap sudut, dan ia berputar.

### 3.3 Torsi dan sudut daya

Kirtley §3, dari pendekatan medan:

```
T = (π/2)·(μ₀R³ℓ/g)·K_S K_R sin pθ_m
```

dan dari pendekatan rangkaian (induktansi bersama):

```
T = (3/2)·p·M·I·I_f·sin δ_i
```

Kedua pendekatan **direkonsiliasi** di §6 — Kirtley menunjukkan keduanya memberi hasil sama. Ini penting: artinya gambar medan (pendekatan pertama) dan gambar fasor (pendekatan kedua) adalah dua pandangan dari satu fisika yang sama. Animasi mode Realistis dan mode Fasor **tidak boleh saling bertentangan**.

### 3.4 Kecepatan sinkron dan sudut listrik vs mekanis

Dari `https://en.wikipedia.org/wiki/Synchronous_speed` (terverifikasi):

```
N = 120·f / P
```

dengan `N` dalam rpm, `f` dalam Hz, `P` = jumlah kutub. Untuk mesin 2-kutub 50 Hz: `N = 120·50/2 = 3000 rpm`.

Kirtley §5 memakai bentuk `p·Ω = ω`, yaitu **frekuensi listrik = pasangan kutub × kecepatan mekanis**. Untuk mesin 2-kutub (`p = 1`), sudut listrik **sama dengan** sudut mekanis. Ini menyederhanakan implementasi secara signifikan: di simulator ini, tidak perlu konversi sudut.

### 3.5 ⚠️ Temuan inti: kedua medan berputar

Ini temuan paling penting untuk desain animasi.

Kirtley §2, poin 4 — setelah menghitung torsi dari dua arus permukaan statis:

> "The current distributions want to align with each other. In actual practice what is done is to generate a stator current distribution which is not static as implied here but which **rotates in space**: `K_Sz = K_S cos(pθ − ωt)` and this pulls the rotor along."

Kirtley §2, poin 5:

> "For a given pair of current distributions there is a maximum torque that can be sustained, but as long as the torque that is applied to the rotor is less than that value the rotor will adjust to the correct angle."

Kirtley §5, kondisi operasi seimbang:

> "suppose the machine is operated in this fashion: the rotor turns at a constant velocity, the field current is held constant, and the three stator currents are sinusoids in time … `pθ = ωt + δ_i`"

> "Operated in this way, with balanced currents and with the mechanical speed consistent with the electrical frequency (pΩ = ω), the machine exhibits a **constant** torque."

**Terjemahan fisiknya:** rotor dan medan stator berputar **pada kecepatan yang sama**. Selisih sudutnya adalah `δ_i` — sudut torsi — dan selisih itu **tetap** selama operasi sinkron stabil. Kalau selisihnya berubah terus, torsi tidak konstan dan mesin kehilangan sinkronisme.

**Konsekuensi untuk animasi — dan ini membatalkan pendekatan yang sekarang:**

Animasi yang benar **bukan** "rotor berputar cepat di dalam stator yang diam". Animasi yang benar adalah **dua medan yang berputar bersama-sama, terpisah oleh sudut δ yang terlihat**. Yang harus bisa dilihat pengguna adalah:

- kedua medan bergerak searah, kecepatan sama
- sumbu kutub rotor (sumbu-d) **mendahului** resultan medan stator sebesar δ
- ketika δ membesar (beban naik, atau gangguan), jarak sudut itu melebar — dan itulah yang dibaca di kurva P-δ
- ketika δ → 90°, medan tidak lagi bisa menahan dan mesin kehilangan sinkronisme

Kode yang ada **sudah menghitung ini dengan benar** (baris 1197–1198):

```js
const base = S.anim - Math.PI/2;   // posisi RMF stator
const rotorAng = base + S.delta;   // posisi kutub rotor
```

`base` adalah posisi medan stator, `rotorAng` adalah posisi rotor, dan selisihnya adalah `S.delta`. Fisikanya sudah tepat. Yang hilang hanyalah **elemen visual yang mewakili RMF stator itu** — sehingga maknanya tidak pernah terlihat. Baris 1225 bahkan menghitung `const syncAng = base;` lalu **tidak memakainya sama sekali**.

### 3.6 Rantai eksitasi → output

Kirtley §4 menurunkan fluks lingkar fasa A:

```
λ_a = (L_a − L_ab)·i_a + M·I_f·cos pθ
    = L_d·i_a + M·I_f·cos pθ
```

> "where we use the notation `L_d` to denote synchronous inductance"

Tegangan terminal adalah turunan fluks:

```
v_a = dλ_a/dt
```

dan dalam keadaan tunak sinusoidal, Kirtley §4 memberi rangkaian ekivalen dengan tegangan internal:

```
E_af = jωM I_f e^{jθ_m}
```

> "This system is described by the equivalent circuit shown in Figure 2." (rangkaian: `E_af` seri `jX_d` ke `V`)

**Rantai lengkapnya:**

```
I_f  →  M·I_f  →  E_af = ωM·I_f  →  (lewat jX_d)  →  V, I  →  P, Q
```

Perhatikan: `E_af` **sebanding langsung** dengan `I_f` (arus medan) dan dengan `ω` (kecepatan). Di simulator, slider `Ef` adalah `E_af` dalam per-unit. Jadi:

- **`Ef` naik → `E_af` naik → fluks medan lebih kuat → garis fluks lebih rapat/lebih panjang → `Pmax = Ef·V/Xd` naik → untuk `Pm` tetap, `δ` mengecil.**

Ini rantai yang harus terlihat saat slider `Ef` digeser.

### 3.7 Daya dan daya reaktif — verifikasi rumus simulator

Kirtley §4, untuk round rotor, daya nyata dan reaktif per fasa:

```
P_a = (1/2)·(V·E_af/X_d)·sin δ
Q_a = (1/2)·(V²/X_d) − (1/2)·(V·E_af·cos δ/X_d)
```

tiga fasa:

```
P = (3/2)·(V·E_af/X_d)·sin δ
```

Per-unit (Kirtley §7):

```
p = (v·e_af/x_d)·sin δ
q = (v²/x_d) − (v·e_af·cos δ)/x_d
```

**Perbandingan dengan simulator** (baris 487–499):

```js
function getPmax(s){ return s.Ef*getVt(s)/Math.max(s.Xs,0.01); }
function getPe(s)  { return getPmax(s)*Math.sin(s.delta); }
function getQe(s)  { const Vt=getVt(s); return Vt*(s.Ef*Math.cos(s.delta)-Vt)/Math.max(s.Xs,0.01); }
```

| Simulator | Kirtley | Cocok? |
|---|---|---|
| `Pmax = Ef·Vt/Xs` | `v·e_af/x_d` | ✅ identik (per-unit, basis 3-fasa sudah diserap) |
| `Pe = Pmax·sin δ` | `p = (v·e_af/x_d)·sin δ` | ✅ identik |
| `Qe = Vt(Ef·cos δ − Vt)/Xs` | `q = (v² − v·e_af·cos δ)/x_d` | ⚠️ **tanda berlawanan** |

**Tanda Q yang berlawanan itu BUKAN bug.** Kirtley menyatakannya eksplisit di §7:

> "These are, of course, in **motor reference coordinates**, and represent real and reactive power **into** the terminals of the machine."

Simulator memakai **referensi generator** — daya keluar dari terminal. Kode simulator juga mendokumentasikan konvensinya sendiri (baris 493–495): "Q>0 lagging (overexcited), Q<0 leading (underexcited), Q=0 unity pf". Keduanya konsisten; perbedaannya murni arah acuan. **Ini harus ditulis di dokumen/komentar agar tidak "diperbaiki" oleh orang berikutnya yang membandingkan dengan Kirtley dan mengira menemukan bug.**

**Asumsi yang menopang rumus-rumus ini** (dari Kirtley §9):

> "So far, we have been describing what are referred to as `round rotor' machines, in which stator reactance is not dependent on rotor position."

Artinya rumus `P = Pmax sin δ` mengasumsikan **tanpa saliency** (`Xd = Xq`). Kirtley memberi bentuk lengkap untuk mesin salient:

```
P = (3/2)·[ V·E_af/Xd · sin δ + V²/2·(1/Xq − 1/Xd)·sin 2δ ]
```

Suku `sin 2δ` adalah suku saliency. **Untuk turbo-generator 2-kutub, suku ini boleh diabaikan** — dan Kirtley §9 mengonfirmasi mengapa power system analysts melakukannya:

> "It is not too difficult to see why power systems analysts often neglect saliency in doing things like transient stability calculations."

Jadi simulator yang memakai `P = Pmax sin δ` **defensible** untuk mesin 2-kutub. Ini harus dinyatakan sebagai asumsi eksplisit.

### 3.8 Karakteristik open-circuit dan saturasi

Kirtley §10.5 memberi hubungan arus medan ke fluks pada operasi tanpa beban:

```
Br = μ₀ N_f I_f,nl / (2 g p)
```

> "Under rated operation, per-unit field voltage is: `e_af² = v² + (x_d i)² + 2 x_d i sin φ`"

**Catatan jujur:** model simulator **linear** — `Ef` sebanding langsung dengan `I_f`, tanpa saturasi. Mesin nyata punya OCC yang melengkung karena saturasi inti. Kirtley §10.4 menyebut batas ini: `B_s` "is easily understood to be caused by saturation of magnetic material", dan §10.1: "`B_0 = B_s(1−ξ_s)` where `B_s` is the flux density in the teeth, **limited by saturation** of the magnetic material".

Konsekuensi untuk visualisasi: **garis fluks tidak boleh ditambah tanpa batas saat `Ef` dinaikkan.** Di mesin nyata, fluks jenuh. Karena simulator tidak memodelkan saturasi, visualisasi harus memakai pemetaan yang **melengkung** (mis. `sqrt` atau `tanh`) dari `Ef` ke kerapatan garis, supaya tidak memberi kesan yang salah bahwa fluks bisa naik selamanya. Ini penyederhanaan yang harus dinyatakan.

### 3.9 Sumbu-d dan sumbu-q

Kirtley §9, definisi yang menjadi jangkar visualisasi:

> "The two components are aligned with the direct axis and with the quadrature axis of the machine. **The direct axis is aligned with the field winding, while the quadrature axis leads the direct by 90 degrees.**"

Untuk visualisasi: **sumbu-d adalah sumbu kutub rotor.** Kutub N rotor terletak pada sumbu-d. Ini memberi arti konkret pada label "N"/"S" yang sekarang hanya teks mengambang.

### 3.10 Rangkaian hubung-singkat

Simulator memodelkan gangguan dengan `Vt = V·sc_Pfact` saat `sc_active` (baris 487), dengan `sc_Pfact` default `0.04`. Artinya tegangan terminal kolaps ke 4%.

**Apakah ini defensible?** Secara kualitatif ya: gangguan 3-fasa dekat terminal memang membuat `Vt` kolaps, dan karena `Pe = Ef·Vt·sin δ/Xd`, daya elektris ikut kolaps — itulah yang mempercepat rotor dan menjadi dasar Equal Area Criterion. Simulator juga konsisten: `getQe` memakai `Vt` yang sama, sehingga P dan Q sama-sama kolaps.

**Yang perlu dinyatakan sebagai penyederhanaan:** model ini tidak merepresentasikan **fluks yang terperangkap**. Pada mesin nyata, selama transien flux linkage di belakang `X'd` **tetap konstan** (inilah dasar model `E'` klasik — asas "constant flux linkage"). Karena simulator memakai `Ef` tetap dan hanya mengubah `Vt`, ia menangkap efek percepatan rotor tapi **tidak** menangkap peluruhan fluks medan. Untuk studi stabilitas transient orde pertama, pendekatan ini lazim dipakai dan memadai — tapi visualisasi fluks **tidak boleh** menunjukkan fluks ikut kolaps saat gangguan, karena secara fisik fluks justru bertahan. Yang kolaps adalah tegangan terminal, bukan fluks medan.

> **Ini penting untuk implementasi:** saat `sc_active` true, garis fluks harus **tetap rapat** (fluks medan bertahan), sementara tegangan terminal yang ditampilkan di readout kolaps. Kalau implementasi ikut mengerutkan garis fluks saat gangguan, itu **salah secara fisik** dan bertentangan dengan asas yang mendasari model `E'` yang dipakai simulator sendiri.

---

## 4. Menggambar Garis Fluks

### 4.1 Bentuk yang benar

Dari `Br = μ₀R(K_S sin pθ + K_R sin p(θ−θ_m))/g` (Kirtley §2), medan resultan di air gap **sinusoidal terhadap sudut**. Untuk mesin 2-kutub (`p=1`), pola ini punya satu daerah kutub utara dan satu selatan — pola dua-kutub klasik.

**Bentuk garis fluks yang jujur untuk penampang 2-kutub:**

1. Garis keluar dari rotor secara **tegak lurus permukaan rotor** di sekitar kutub utara
2. Menyeberangi air gap **secara radial**
3. Masuk ke gigi stator, berbelok mengikuti kontur
4. Menutup lewat yoke stator, lalu kembali ke rotor di sekitar kutub selatan

Karena Kirtley §2 mengasumsikan permeabilitas besi tak-hingga ("The `rotor' and `stator' bodies are made of highly permeable material (we approximate this as being infinite for the time being…"), maka **di dalam besi tidak ada beda potensial magnetik** — garis fluks di dalam besi berjalan sejajar permukaan, dan seluruh "aksi" magnetik terjadi di air gap. Ini menyederhanakan gambar secara besar: yang perlu digambar dengan hati-hati hanyalah bagian air gap.

> **Penyederhanaan yang dinyatakan:** Kirtley sendiri memberi catatan bahwa asumsi permeabilitas tak-hingga "is something that needs to be looked at carefully later". Untuk gambar edukatif, asumsi ini justru menguntungkan — ia membenarkan menggambar garis fluks sebagai busur halus di air gap tanpa memodelkan gigi stator satu per satu.

### 4.2 Kerapatan garis = kekuatan medan

Karena `Br` sinusoidal, kerapatan garis fluks harus **lebih rapat di dekat sumbu kutub** dan lebih renggang menuju garis netral (di antara kutub). Ini bukan hiasan — ini cara menyampaikan magnitudo medan secara visual. Kirtley §10.1 memberi jangkar kuantitatif untuk hubungan fluks–tegangan:

```
V_a = (ω/√2)·(π·B_0·ℓ·R·N_a) / (4p²)
```

yakni tegangan terminal sebanding dengan `B_0` — kerapatan fluks puncak. Jadi **kerapatan fluks puncak berbanding lurus dengan `Ef`**.

### 4.3 Rotasi rigid

Karena rotor dan stator berputar bersama (§3.5), pola fluks resultan **berputar rigid** bersama keduanya. Tidak ada distorsi bentuk akibat rotasi itu sendiri.

Ini menyederhanakan implementasi secara besar: **path garis fluks bisa dihitung sekali dalam kerangka acuan rotor, lalu seluruh grupnya dirotasi per frame.** Tidak perlu menghitung ulang `d` setiap frame.

### 4.4 Distorsi karena beban (armature reaction)

> **Status verifikasi:** dekomposisi d/q terverifikasi di Kirtley §9 (two-reaction theory). Pemetaan spesifik ke lagging/unity/leading di bawah ini adalah **turunan** dari relasi Kirtley, bukan kutipan langsung — saya tidak berhasil membuka sumber kanonik (Kundur/Chapman) untuk tabel itu sesi ini.

Kirtley §9 memisahkan arus stator menjadi dua komponen:

```
I_d = (V cos δ − E_af)/X_d
I_q = V sin δ / X_q
```

dan fluks:

```
λ_d = L_d·I_d + M·I_f
λ_q = L_q·I_q
```

dengan catatan penting:

> "Note that, in general, `L_d ≠ L_q`. In wound-field synchronous machines, usually `L_d > L_q`."

Komponen `I_d` adalah proyeksi arus stator pada **sumbu medan**. Inilah yang melakukan armature reaction terhadap medan:

- **`I_d` negatif** (arus stator melawan medan) → **demagnetizing**, fluks resultan melemah
- **`I_d` positif** → **magnetizing**, fluks resultan menguat
- **`I_q`** → tidak mengubah besar fluks, tapi **memutar** resultan menjauh dari sumbu-d

Tanda `I_d` ditentukan oleh `(V cos δ − E_af)`. Karena `E_af` sebanding dengan eksitasi:

| Kondisi | `E_af` relatif | `I_d` | Armature reaction | Q (konvensi simulator) | pf |
|---|---|---|---|---|---|
| Overexcited | `E_af·cos δ > V` | negatif | **demagnetizing** | `Q > 0` | lagging |
| Normal | `E_af·cos δ = V` | nol | tidak ada | `Q = 0` | unity |
| Underexcited | `E_af·cos δ < V` | positif | **magnetizing** | `Q < 0` | leading |

Halaman Wikipedia "Synchronous machine" mengonfirmasi arah satu sel ini: over-excitation "causes a **demagnetizing** effect due to armature reaction". Baris lainnya adalah turunan konsisten dari relasi Kirtley di atas.

**Konsistensi internal yang harus dijaga:** tabel ini harus cocok dengan `getQe` dan `getPFNature` di simulator. `getQe > 0` (lagging) harus memetakan ke `I_d` negatif (demagnetizing). Kalau implementasi visualisasi menunjukkan arah sebaliknya, ada bug.

**Yang boleh dan tidak boleh dilakukan secara visual:** distorsi ini **halus**. Kirtley §9 menegaskan untuk mesin round-rotor `X_d ≈ X_q` sehingga pengaruh saliency kecil. Jadi efek visual armature reaction yang jujur adalah **pergeseran resultan beberapa derajat dan perubahan kerapatan sedikit** — bukan pembelokan dramatis. Animasi yang menunjukkan distorsi besar akan melebih-lebihkan fisika.

---

## 5. Menggambar Belitan Stator

### 5.1 Yang salah sekarang

Baris 1129–1151 membuat 18 `<circle>` berjari-jari `R*0.045`:

```js
const phases=[
  {id:'A',color:'#c85000',offset:0},
  {id:'B',color:'#0068a8',offset:2*Math.PI/3},
  {id:'C',color:'#00a848',offset:4*Math.PI/3}   // ← hijau, inilah "titik hijau" yang dikeluhkan
];
```

Warna dan penempatan 120°-nya benar (Kirtley §4: "spatial orientation separated by an electrical angle of 120°"). Yang salah adalah **bentuknya**: titik tidak bisa menunjukkan arah arus, dan tanpa arah arus tidak ada MMF, dan tanpa MMF tidak ada penjelasan mengapa arus mengalir.

### 5.2 Menggambar kumparan, bukan titik

Kirtley §3 memberi dasar untuk menggambar kumparan:

> "such a winding would be made of elementary coils with one half (the negatively going half) separated from the other half (the positively going half) by a physical angle of π/p"

Untuk mesin 2-kutub (`p=1`), kedua sisi kumparan terpisah **180° mekanis** — tepat berseberangan. Inilah bentuk kumparan yang harus digambar: sebuah loop yang masuk lewat satu slot dan keluar lewat slot yang berseberangan.

> "A positive value implies a wire with sense in the +z direction, a negative value implies a wire with sense in the -z direction."

Ini dasar konvensi **dot/cross** yang lazim: titik (•) = arus keluar dari bidang gambar (+z), silang (×) = arus masuk ke bidang gambar (−z). Konvensi ini berasal dari notasi arus dalam konduktor pada penampang melintang; saya **tidak memverifikasi sumber kanoniknya** sesi ini, tapi ia adalah konsekuensi langsung dari pernyataan Kirtley di atas tentang sense +z/−z.

**Bentuk yang direkomendasikan untuk SVG:**

Setiap fasa digambar sebagai satu path yang:
1. Turun dari slot sisi-masuk, menembus dinding slot (garis radial pendek)
2. Melengkung mengikuti sisi luar slot menuju slot sisi-keluar (180° berseberangan)
3. Naik menembus slot sisi-keluar

Untuk 3 fasa dengan masing-masing 2 sisi: 6 sisi konduktor total pada penampang 2-kutub — konsisten dengan 6 coil group yang sekarang dibuat (loop `for(let i=0;i<6;i++)`), tapi digambar sebagai **loop tersambung**, bukan 6 titik terpisah.

### 5.3 Arah arus dan MMF

Karena ketiga arus fasa sinusoidal dan berbeda 120°, arah arus di tiap konduktor **berbalik** setiap setengah siklus. Visualisasi harus menunjukkan:

- arah arus (dot vs cross) berubah pada tiap konduktor
- ketiga fasa tidak pernah bersamaan searah
- resultan MMF berputar — ini konsekuensi dari "the three currents are equal in magnitude and have a 120-degree phase difference" dan "Adding the three waves yields a single rotating vector that always remains constant in magnitude" (Wikipedia, "Rotating magnetic field" — terverifikasi)

### 5.4 Rantai "bergerak → EMF → arus"

Kirtley §2 poin 4 memberi kalimat yang tepat untuk ini: medan stator "rotates in space … and this **pulls the rotor along**". Dan Wikipedia "Synchronous generator" (terverifikasi):

> "A conductor moving relative to a magnetic field develops an electromotive force."

> "This EMF reverses its polarity when it moves under magnetic poles of opposite polarity."

> "The rotating magnetic field induces an AC voltage in the stator windings."

Rantai yang harus terlihat di layar:

1. Medan berputar (garis fluks bergerak)
2. Konduktor stator berada dalam medan yang berubah terhadap waktu
3. Karena itu timbul EMF di konduktor (Faraday)
4. EMF mendorong arus, yang arahnya berbalik saat kutub berganti
5. Arus di ketiga fasa berbeda 120° → resultan MMF berputar
6. MMF stator dan medan rotor saling tarik → torsi, rotor ikut berputar sinkron

Poin 5 dan 6 adalah yang menutup lingkaran: **stator menghasilkan medan yang justru ikut menarik rotor**. Ini yang membuat animasi jadi penjelasan, bukan hiasan.

### 5.5 Waktu simulasi, bukan `Date.now()`

Baris 1226 dan 1232 memakai `Date.now()`:

```js
statorField.setAttribute('opacity', 0.4+0.2*Math.sin(Date.now()/200));
const time=Date.now()/1000;
```

Masalahnya: animasi tidak bisa di-*pause* bersama simulasi, tidak deterministik untuk pengujian, dan tidak terhubung ke `S.t` atau `S.anim`. Ganti dengan `S.anim` (sudut rotor relatif kerangka sinkron) atau `S.t` (waktu simulasi) — keduanya sudah tersedia dan sudah dimajukan di baris 610.

---

## 6. Pemetaan Parameter UI → Visualisasi

Ini tabel yang diminta user: apa yang harus **berubah di layar** saat slider digeser.

| Parameter UI | Arti fisis | Yang harus berubah di visualisasi |
|---|---|---|
| **`Ef`** (0.1–3 pu) | `E_af = ωM·I_f` — tegangan internal, sebanding arus medan `I_f` | **Kerapatan dan panjang garis fluks.** Karena saturasi tidak dimodelkan (§3.8), pakai pemetaan melengkung (mis. `tanh(Ef/1.5)`) agar tidak menyesatkan. `Pmax` naik → untuk `Pm` tetap, `δ` mengecil → jarak sudut rotor–stator menyempit |
| **`Xs`/`X'd`** (0.05–3 pu) | Reaktansi sinkron; `X_d = ωL_d` | **Tidak mengubah kerapatan fluks**, tapi mengubah `δ` pada operasi tertentu. Visual: sudut antara rotor dan stator melebar saat `Xs` naik (karena `δ = arcsin(Pm·Xs/(Ef·V))`) |
| **`Pm`** (0.01–3 pu) | Daya mekanis dari prime mover | **Sudut `δ` melebar** saat `Pm` naik. Ini efek visual paling langsung: dua medan makin berjarak. Bila `Pm > Pmax`, tidak ada titik setimbang — animasi harus menunjukkan rotor tidak lagi terkunci |
| **`H`** (1–15 s) | Konstanta inersia | **Kecepatan respons `δ` terhadap perubahan.** Bukan properti medan; visual: seberapa cepat sudut menyempit/melebar saat gangguan. `H` kecil → ayunan cepat dan besar |
| **`D`** (0–15 pu) | Koefisien damping | **Peredaman ayunan `δ`.** `D` besar → ayunan meredam cepat, jarak sudut stabil kembali dengan sedikit osilasi |
| **Gangguan: onset** | Kapan gangguan mulai | **Momen `Vt` kolaps.** Garis fluks **TETAP** (§3.10) — yang berubah adalah penanda tegangan terminal |
| **Gangguan: durasi** | Berapa lama gangguan berlangsung | **Luas area percepatan (A1).** Visual: berapa lama `δ` terus melebar sebelum pemulihan |
| **Mode grid-connected** | Bus tak-hingga, `f = 50 Hz` tetap | Medan stator berputar pada kecepatan **tetap**. `ω` rotor tidak mempengaruhi `base` |
| **Mode island** | Berdiri sendiri, `f` bervariasi, governor aktif | Medan stator berputar pada kecepatan **yang berubah** mengikuti `S.omega`. Frekuensi visual berubah — dan ini justru salah satu hal terbaik yang bisa ditunjukkan simulator |

**Catatan penting untuk mode island:** karena `base = S.anim - π/2` dan `S.anim` dimajukan dengan `VSPD` konstan (baris 610), kecepatan putar visual **tidak** mengikuti `S.omega` di mode island. Untuk membuat animasi jujur di mode island, `S.anim` harus dimajukan dengan laju yang bergantung pada `S.omega`. Ini perubahan yang perlu dipertimbangkan, tapi di luar cakupan visualisasi medan murni.

---

## 7. Algoritma & Pseudocode

### 7.1 Reuse-First: hasil pencarian

**Aturan proyek:** sebelum menulis kode substantif, wajib mencari solusi open-source yang ada.

Kandidat yang saya periksa langsung:

| Kandidat | Lisensi | Ukuran | Dependensi | Penilaian |
|---|---|---|---|---|
| `@anvaka/streamlines` v1.6.0 | **MIT** | 194 KB unpacked | **nol** | Kalkulator streamline untuk medan vektor sembarang, jarak antar-garis seragam. API: `streamlines({vectorField, boundingBox, onStreamlineAdded}).run()`. Build UMD tersedia via CDN. |
| `@crazygl/hero-magnetic-field-lines` v0.1.1 | Apache-2.0 | 55 KB | `@crazygl/core`, **peer React ≥18** | Komponen hero React. **Tidak cocok**: proyek ini HTML vanilla tanpa React, dan efeknya partikel dekoratif, bukan diagram mesin |
| `d3-contour` v4.0.2 | ISC | — | `d3-array` | Marching squares untuk kontur skalar. **Tidak cocok**: yang dibutuhkan garis medan vektor, bukan kontur skalar |
| PhET Charges and Fields | GPL-3.0 (kode), CC-BY (materi) | — | — | Algoritmanya: superposisi Coulomb + integrasi numerik garis medan. **GPL tidak kompatibel** untuk disalin ke proyek ini |

**Keputusan: implementasi custom, dengan alasan tertulis.**

Alasan yang bisa dipertahankan:

1. **Medan di sini trivial secara analitik.** `Br = μ₀R(K_S sin pθ + K_R sin p(θ−θ_m))/g` (Kirtley §2) — satu fungsi sinus. `@anvaka/streamlines` menyelesaikan masalah umum (medan vektor sembarang, jarak antar-garis seragam di bidang 2D) yang **tidak** dihadapi di sini, dan harganya 194 KB untuk sesuatu yang butuh ~30 baris integrator.
2. **Streamline bukan bentuk yang tepat.** Garis fluks mesin adalah kurva tertutup dari rotor, menyeberangi air gap, menutup lewat stator — bukan streamline medan vektor bebas yang memudar di batas.
3. **Garis tidak perlu dihitung ulang per frame.** Karena pola berputar rigid (§4.3), path dihitung sekali lalu grupnya dirotasi. Library yang menghitung ulang tiap frame justru salah pakai.
4. **GPL PhET tidak kompatibel** dengan lisensi proyek.

`@anvaka/streamlines` dicatat sebagai **rujukan algoritma** (cara menjaga jarak antar-garis seragam) tanpa menyalin kodenya.

### 7.2 Generasi path

Rekomendasi: **integrasi medan di kerangka acuan rotor, dihitung sekali, disimpan sebagai template.**

```
// Sekali saja (atau saat parameter berubah material)
function buildFluxPaths(R, rotorR, statorR, Ef) {
  const paths = [];
  const N = 6 + Math.round(6 * fluxDensity(Ef));   // jumlah garis ∝ fluks, dibatasi
  for (let k = 0; k < N; k++) {
    // Sudut keluar dari rotor, tersebar di sekitar sumbu-d (kutub N)
    const a0 = -Math.PI/3 + (2*Math.PI/3) * (k + 0.5) / N;
    // Integrasi: mulai dari permukaan rotor, maju sampai mencapai stator
    const pts = traceFieldLine(a0, rotorR, statorR);
    paths.push(pts);
  }
  return paths;   // dalam koordinat rotor, sudut 0 = sumbu-d
}

function traceFieldLine(a0, r0, r1) {
  // Langkah RK4 pada medan radial 2-kutub.
  // Medan: Br(θ) = cos(θ - θr); di kerangka rotor θr = 0, jadi Br = cos(θ).
  const pts = [];
  let r = r0, th = a0;
  const dr = (r1 - r0) / 24;              // 24 langkah radial
  for (let i = 0; i <= 24; i++) {
    pts.push([r * Math.cos(th), r * Math.sin(th)]);
    // Laju perubahan sudut: fluks menyeberangi gap hampir radial,
    // membelok karena komponen tangensial. Konstanta k menyetel kelengkungan.
    const k = 0.55;
    th += k * Math.sin(th) * (dr / r);
    r  += dr;
  }
  return pts;
}
```

> **Ini penyederhanaan, bukan FEM.** Kelengkungan garis disetel dengan satu konstanta `k`, bukan dihitung dari solusi medan penuh. Untuk gambar edukatif ini memadai karena bentuk kualitatifnya benar (rapat di kutub, renggang di garis netral, menutup lewat stator). **Nyatakan ini di komentar kode.**

Alternatif yang juga sah: **template Bézier yang ditulis tangan** lalu diskalakan. Lebih murah, tapi kurang bisa digeneralisasi saat `Ef` berubah. Untuk 6–12 garis, integrasi di atas tetap murah dan lebih jujur.

### 7.3 Rotasi: pakai `transform`, jangan hitung ulang `d`

Ini keputusan performa yang penting, dan ada dukungan sumbernya.

MDN, *CSS vs. JavaScript animation performance* (`https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/CSS_JavaScript_animation_performance`, terverifikasi):

> "as long as the properties we want to animate do not trigger reflow/repaint … we can move those sampling operations out of the main thread. The most common property is the CSS transform. **If an element is promoted as a layer, animating transform properties can be done in the GPU**, meaning better performance/efficiency"

MDN, *Animation performance and frame rate*:

> "Properties that *are rendered* in their **own layer** don't even trigger a repaint, because the update is handled in **composition**. These do trigger: style recalculation. For example: `transform`, `opacity`"

Dan anggaran waktunya:

> "For a rate of 60 frames per second, the browser has **16.7 milliseconds** to execute scripts, recalculate styles and layout if needed, and repaint the area being updated."

**Konsekuensi konkret:**

- **Jangan** menghitung ulang atribut `d` setiap frame. Mengubah `d` adalah perubahan geometri — memicu layout/paint, bukan compositing.
- **Lakukan**: taruh semua path fluks dalam satu `<g id="flux-group">` dan set `transform="rotate(deg, cx, cy)"` per frame. Ini masuk jalur compositing.
- Hal yang sama berlaku untuk rotor: `<g transform="rotate(...)">` untuk seluruh badan rotor + belitan medannya, bukan memindahkan tiap elemen.
- **Jumlah path:** dengan 6–12 garis fluks × ~25 titik, ditambah 3 kumparan, totalnya di bawah 20 elemen yang dirotasi sebagai grup. Ini jauh di bawah anggaran 16.7 ms — aman untuk 60 fps bahkan tanpa GPU promotion.
- `will-change`: MDN **tidak** membahasnya di kedua halaman yang saya buka. Saya tidak akan merekomendasikannya tanpa dasar; kalau perlu, ukur dulu dengan DevTools.

### 7.4 Pseudocode untuk `updateSvgPhasorRealistic()`

```js
function updateSvgPhasorRealistic(svg){
  const w = svg.clientWidth, h = svg.clientHeight;
  if (w < 10 || h < 10) return;
  if (!realInit || Math.abs(w-real_lastW) > 5 || Math.abs(h-real_lastH) > 5) {
    initSvgRealistic(svg, w, h);
  }
  if (!S) return;

  const cx = w/2, cy = h/2, R = Math.min(h*0.38, w*0.28);
  const rotorR = R*0.5;

  // ── Posisi: base = RMF stator, rotorAng = kutub rotor, selisihnya = δ ──
  const base     = S.anim - Math.PI/2;
  const rotorAng = base + S.delta;
  const deg = (a) => a * 180 / Math.PI;

  // ── 1. Rotor + belitan medan: satu grup, dirotasi ──
  const gRotor = safeQuerySelector(svg, '#g-rotor');
  if (gRotor) gRotor.setAttribute('transform',
    `rotate(${deg(rotorAng)}, ${cx}, ${cy})`);

  // ── 2. Garis fluks: template dalam kerangka rotor, dirotasi rigid ──
  //      Regenerasi HANYA bila Ef berubah material (bukan tiap frame).
  if (Math.abs(S.Ef - fluxCache.ef) > 0.02) rebuildFluxPaths(svg, R, rotorR, S.Ef);
  const gFlux = safeQuerySelector(svg, '#g-flux');
  if (gFlux) {
    gFlux.setAttribute('transform', `rotate(${deg(rotorAng)}, ${cx}, ${cy})`);
    // Kerapatan/opasitas ikut eksitasi, dengan pemetaan melengkung (anti-saturasi palsu)
    gFlux.setAttribute('opacity', 0.35 + 0.5 * Math.tanh(S.Ef/1.5));
  }

  // ── 3. RMF stator: penanda yang selama ini hilang ──
  const gRmf = safeQuerySelector(svg, '#g-rmf');
  if (gRmf) gRmf.setAttribute('transform',
    `rotate(${deg(base)}, ${cx}, ${cy})`);

  // ── 4. Arah arus di konduktor: dot/cross, fungsi S.t (BUKAN Date.now) ──
  const wE = 2*Math.PI*50;                 // 2πf, mesin 2-kutub
  for (let f = 0; f < 3; f++) {
    const iFasa = Math.sin(wE * S.t - f*2*Math.PI/3);
    for (let s = 0; s < 2; s++) {
      const el = safeQuerySelector(svg, `#cd-${f}-${s}`);
      if (el) el.setAttribute('visibility', iFasa > 0 ? 'visible' : 'hidden');
    }
  }

  // ── 5. Busur δ antara sumbu-d rotor dan RMF stator ──
  const dArc = safeQuerySelector(svg, '#d-arc');
  if (dArc) {
    const rr = rotorR * 1.25;
    const x1 = cx + rr*Math.cos(rotorAng), y1 = cy + rr*Math.sin(rotorAng);
    const x2 = cx + rr*Math.cos(base),     y2 = cy + rr*Math.sin(base);
    const besar = Math.abs(S.delta) > Math.PI ? 1 : 0;
    const arah  = S.delta >= 0 ? 1 : 0;
    dArc.setAttribute('d', `M ${x1} ${y1} A ${rr} ${rr} 0 ${besar} ${arah} ${x2} ${y2}`);
  }
}
```

**Catatan implementasi:**

- `fluxCache.ef` menyimpan `Ef` terakhir yang dipakai membangun path. Ini yang membuat regenerasi jarang terjadi.
- `#g-rmf` adalah elemen **baru** yang harus dibuat di `initSvgRealistic()` — inilah penanda RMF yang selama ini hilang, dan yang membuat baris 1225 (`const syncAng = base`) akhirnya berguna.
- Busur δ (`#d-arc`) adalah elemen yang membuat hubungan ke Panel II (kurva P-δ) terlihat langsung: sudut yang sama, ditampilkan dua cara.
- Saat `S.sc_active`, **jangan** ubah opasitas `#g-flux` (§3.10). Yang boleh berubah adalah penanda tegangan terminal.

---

## 8. Kaveat Jujur

### Yang tidak bisa ditunjukkan jujur oleh animasi penampang 2D

1. **Fluks bocor (leakage flux).** Kirtley memisahkan `L_d = L_l + L_a` secara implisit lewat teori dua-reaksi. Fluks bocor tidak menyeberangi air gap dan tidak menghasilkan torsi. Menggambarnya akan membingungkan tanpa menambah pemahaman.

2. **Fluks di dalam besi.** Asumsi permeabilitas tak-hingga berarti tidak ada beda potensial magnetik di dalam besi. Mesin nyata punya saturasi, histeresis, dan eddy current. Animasi yang menggambar garis "menembus" besi akan salah.

3. **Belitan terdistribusi yang sebenarnya.** Mesin nyata punya banyak slot per kutub per fasa dengan belitan terdistribusi dan berjarak (short-pitched). Kirtley §3 mengasumsikan distribusi sinusoidal kontinu ("In fact we can't do exactly that yet, but we can approximate"). Gambar dengan 2 sisi konduktor per fasa adalah **penyederhanaan besar** dan harus dinyatakan.

4. **Bentuk tiga dimensi.** Mesin sebenarnya silindris dengan belitan yang menjulur keluar ujung inti (end winding). Penampang 2D tidak bisa menunjukkan ini.

5. **Medan orde tinggi.** Distribusi slot yang diskret menghasilkan harmonisa MMF. Kirtley §3 mengasumsikan sinusoidal murni.

### Di mana model simulator menyimpang dari mesin nyata

| Aspek | Simulator | Mesin nyata |
|---|---|---|
| **Saturasi** | Tidak dimodelkan; `Ef ∝ I_f` linear | OCC melengkung; `B_s` dibatasi saturasi (Kirtley §10.1) |
| **Saliency** | Diabaikan (`Xd = Xq`) | Mesin kutub menonjol punya suku `sin 2δ` (Kirtley §9). **Untuk 2-kutub, ini sah** |
| **Fluks saat gangguan** | `Ef` tetap, `Vt` kolaps | Flux linkage di belakang `X'd` tetap konstan — **inilah dasar model E'** |
| **Kecepatan visual** | `VSPD` konstan (baris 328) | Di mode island, kecepatan harusnya ikut `S.omega` |
| **Waktu animasi** | `Date.now()` (baris 1226, 1232) | Tidak bisa di-pause, tidak deterministik |
| **Damping** | `D` sebagai koefisien terpusat | Mesin nyata: damper winding + friksi + windage |

### Rekomendasi yang mengikuti dari kaveat ini

1. **Beri label "penyederhanaan" di legenda** untuk: jumlah konduktor per fasa, ketiadaan saturasi, ketiadaan leakage.
2. **Jangan** mengerutkan garis fluks saat gangguan — itu bertentangan dengan asas constant flux linkage yang mendasari model `E'` simulator sendiri.
3. **Pakai pemetaan melengkung** untuk `Ef → kerapatan garis`, karena saturasi tidak dimodelkan.
4. **Jaga distorsi armature reaction tetap halus** — Kirtley §9 menegaskan untuk round-rotor pengaruhnya kecil.

---

## 9. Kaitan dengan Kode Saat Ini

Semua nomor baris merujuk `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`.

### Yang harus diubah

| Lokasi | Sekarang | Seharusnya |
|---|---|---|
| Baris 1129–1151 | 18 `<circle>` `winding-{A,B,C}-{i}`, r=`R*0.045` | Path kumparan tersambung; konduktor dengan penanda dot/cross |
| Baris 1154 | `#stator-field` = `<circle>` ber-gradient | Grup `#g-rmf` berisi penanda arah medan stator |
| Baris 1164 | `#rotor-field` = `<circle>` ber-gradient | Grup `#g-rotor` (badan + belitan medan) + `#g-flux` (garis fluks) |
| Baris 1169–1170 | Teks `pole-N`/`pole-S` mengambang | Kutub N pada sumbu-d; tambah penanda sumbu-d dan sumbu-q |
| Baris 1213–1220 | `Ef` → `opacity` + `r` lingkaran | `Ef` → jumlah/kerapatan path fluks, dengan pemetaan `tanh` |
| Baris 1225 | `const syncAng = base;` **tidak dipakai** | Pakai untuk merotasi `#g-rmf` |
| Baris 1226, 1232 | `Date.now()` | `S.t` atau `S.anim` |
| Baris 1248 | Legend menyebut "Rotor Field"/"Rotor Excitation" untuk lingkaran gradient | Legend menyebut garis fluks, RMF, sumbu-d/q, dan catatan penyederhanaan |

### Yang sudah benar dan harus dipertahankan

| Lokasi | Isi | Kenapa benar |
|---|---|---|
| Baris 1197–1198 | `base = S.anim - π/2`; `rotorAng = base + S.delta` | Sesuai Kirtley §5: rotor dan stator berputar bersama, terpisah δ |
| Baris 487–499 | `getVt`, `getPmax`, `getPe`, `getQe` | Terverifikasi terhadap Kirtley §4/§7 (Q beda tanda = konvensi, bukan bug) |
| Baris 328, 610 | `VSPD = 2π/7`, `S.anim += VSPD*rdt` | Sumber sudut yang deterministik dan bisa di-pause |
| Baris 1129–1133 | Warna & offset 120° ketiga fasa | Sesuai Kirtley §4 |

### Elemen baru yang perlu dibuat di `initSvgRealistic()`

```
#g-rotor      grup: badan rotor + belitan medan + penanda sumbu-d/q
#g-flux       grup: seluruh path garis fluks (template kerangka rotor)
#g-rmf        grup: penanda resultan medan stator
#d-arc        path: busur sudut δ antara sumbu-d rotor dan RMF stator
#cd-{f}-{s}   penanda arah arus (dot/cross) per fasa per sisi konduktor
```

### Alat bantu yang dibuat sesi ini

`tools/pdf-text.js` — ekstraktor teks PDF minimal (FlateDecode + operator Tj/TJ) untuk membaca sumber primer MIT OCW. Dibuat karena `Read` tool tidak bisa merender PDF (poppler tidak terpasang) dan `WebFetch` mengembalikan dump biner. Berguna lagi untuk Ch.5 (Winding Inductances) dan Ch.9 (Simulation Models).

---

## 10. Celah yang Belum Terjawab

Dinyatakan terbuka, bukan didiamkan:

1. **Tabel armature reaction lagging/unity/leading dalam bentuk kanonik** — saya turunkan dari relasi Kirtley (§4.4), tapi tidak berhasil membuka Kundur atau Chapman langsung. Turunan itu konsisten, tapi bukan kutipan. **Perlu verifikasi sebelum dipakai sebagai klaim otoritatif.**
2. **Nomor halaman Kundur (1994)** untuk setiap rumus — tidak bisa dikutip karena bukunya tidak saya buka.
3. **Konvensi dot/cross** — saya jelaskan sebagai konsekuensi pernyataan Kirtley tentang sense +z/−z, tapi tidak menemukan sumber yang menyatakan konvensinya secara eksplisit.
4. **Konstanta kelengkungan `k = 0.55`** di §7.2 adalah tebakan yang perlu disetel visual, bukan nilai dari sumber.
5. **Performa SVG pada perangkat nyata** — MDN memberi anggaran 16.7 ms dan prinsip transform-vs-`d`, tapi tidak ada pengukuran di mesin target. Perlu diukur dengan DevTools setelah implementasi.
6. **`will-change`** — MDN tidak membahasnya di halaman yang saya buka; tidak direkomendasikan tanpa dasar.
7. **Chapter 9 Kirtley (Synchronous Machine Simulation Models)** — PDF-nya terdaftar di OCW tapi belum saya ekstrak. Kemungkinan berisi model dinamis yang lebih lengkap daripada yang dipakai simulator.
