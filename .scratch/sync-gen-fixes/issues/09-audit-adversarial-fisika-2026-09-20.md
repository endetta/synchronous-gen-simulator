# 09 — Audit adversarial fisika (2026-09-20)

**Latar belakang:** Workflow `wf_80aeac33-b0e` meluncurkan 3 subagent (governor / EAC / OOS)
untuk audit adversarial tiga perbaikan fisika (commit `12125cc`, `4d0c769`, `9cf279f`).
**Semua tiga subagent mati pada langkah output terakhir** karena kesalahan model
(`om-mid[1m]` tidak tersedia untuk subagent — `model` override yang dipilih workflow
tidak valid; bukan bug kode). *Namun* masing-masing subagent telah melakukan 150–200+
langkah tool (grep, baca, probe numerik via `tools/extract.js`) sebelum gagal. Seluruh
reasoning mereka pulih dapat dibaca kembali di transkrip subagent.

Karena semua subagent gagal pada output, workflow melaporkan `findings: []` — **INI
PEMBUANGAN DATA (false clean), bukan "tidak ada temuan"**. Daftar di bawah diekstrak dari
reasoning yang pulih + konfirmasi empiris mandiri.

## Metodologi verifikasi

Empirisasi via `tools/_verify-*.js` (seam `extract.js`): state `makeState`, `stepPhys`,
`getA2Available`, `eacStable`, `getPmEff` — semua diekstrak langsung dari HTML. Probe
hanya menulis ke `.scratch/` lokal, **tidak menyentuh HTML**.

## Temuan terkonfirmasi

### 9.1 — EAC: toleransi 2% lebih kecil dari galat numerik A₁ (konfirmasi empiris)

**Sumber:** subagent EAC (reasoning F6) + probe `/tools/_verify-eac.js`... *waktu:
09:57*. (file probe sudah dihapus, hanya bukti di bawah)

- `EAC_TOL = 1.02` → verdict stabil memerlu `A2_available >= A1/1.02` (i.e. A₂ tersedia
  minimal 98.04 % dari A₁).
- Galat diskretisasi A₁ (`A1_num` = integral kiri‑rectangle L‑RAM dengan `|ω|·dt` sebagai
  increment Δδ) **melebihi 2 %** pada kasus kritis:
  - `dur=0.12 s`: beda 1.04 %
  - `dur=0.15 s`: beda 0.83 %
  - `dur=0.18 s`: beda **2.03 %** ← melebihi toleransi

**Implikasi:** pada kasus-kasus di ambang (A₂/A₁ ≈ 1.0), keputusan verdict dapat
ditentukan oleh kebisingan numerik (arah selalu condong **stabil**, lihat 9.2) lebih
dari oleh toleransi yang disengaja. Commit message mengatakan "toleransi 2 % hanya untuk
round‑off RK4" — terlalu optimis relatif terhadap galat integrasi L‑RAM.

**Rujukan kode:**
- `LEVEL 1 - ...SIMULATOR (UNSTABLE).html` — konstanta `EAC_TOL` dan loop akumulasi
  A₁ dengan `Math.abs(WS*s.omega*dt)` (gunakan grep `A2_available` / `eacStable` untuk
  lokasi; nomor baris bergeser di working tree saat ini).
- `tools/eac-verdict.test.js:45` — placeholder `CCT` (tidak dipakai, tidak berbahaya).

### 9.2 — EAC: A₂ tersedia dihitung dari parameter **live**, bukan snapshot clearing

**Sumber:** subagent EAC (reasoning "getA2Available uses the current Pm"). Verifikasi
empiris: setelah SC clear (Pm=0.50) verdict = STABIL (A₂av=1.126, A₁=0.049). Menggeser
slider Pm ke 0.95 **pasca‑event** (tanpa reset) mengubah A₂av menjadi 0.225 — nilai
berubah retroaktif karena semua variabel recomputasi tiap frame.

**Implikasi:** kartu EAC dan narasi dapat menampilkan verdict yang **berubah-ubah
mood** bila pengguna menggeser slider sengaja setelah kejadian. Fisika swing tidak
terpengaruh (delta/omega tetap), tapi UI menyampaikan informasi yang tidak akurat bagi
event lampau. Solusi: snapshotkan `Pmax`, `Pm`, `delta_cleared` pada `delta_cleared`
(atau tandai kartu "verdict final" saat `eac_phase='done'`).

## Temuan yang **tidak terkonfirmasi** / perlusahaan penilaian

Berikut temuan yang muncul di reasoning subagent tapi **belum selesai dikerjakan** —
perlu keputusan:

### 9.3 — OOS: narrasi/badge SC stale setelah trip (diduga terkonfirmasi via reasoning)

- Subagent OOS melaporkan `sc_active` tetap `true` pasca-trip (state machine SC beku
  karena substep loop `break` di atas level SC logic). Artinya:
  - header **SC badge tetap menyala** sampai `doReset()`
  - narasi terakhir yang tampil adalah "**FAULT AKTIF...**" (terakhir diperbarui saat
    SC), bukan "GENERATOR TRIP"
  - kartu EAC menampilkan teks fase FAULT (karena `eac_phase='fault'` pada moment trip)
- **Status properti:** *belum saya probe* — membutuhkan stubbing DOM tambahan untuk
  `updateHdr`/`updateCards`. *Reasoning subagent cukup meyakinkan*; saya tidak
  menimpen klaim ini. **TODO:** probe via `mkEl`-based DOM stub bila prioritas.

### 9.4 — OOS: overshoot ambang 160° (per-frame check, bukan per-substep)

- Algoritma memeriksa `ddeg > 160` **sekali per `stepPhys()`** (setelah loop substep),
  bukan tiap RK4 substep. Pada transien cepat, overshoot bisa jauh melebihi 160°.
- **Probe empiris hasilnya:** 0.2° excess (skema sc_fail default) — overshoot **kecil
  pada skenario standar**. Subagent melaporkan hingga 93° excess pada skenario lain
  (Pm≈0). Nilai ekstrim belum kuduga; patut dicek bila OOS-trip menjadi fokus.

### 9.5 — OOS: `s.anim` / phasor putar terus setelah trip (cosmetic)

- `s.anim += VSPD*rdt` tetap dijalankan setelah trip (di luar loop substep). Visual
  rotor/RMF terus berputar sementara banner "KEHILANGAN SINKRONISASI". **Cosmetic /
  low.** Subagent tidak menegaskan bahwa ini bug vs. desain (medan dapat tetap
  berputar saat beku). Perlu keputusan UX: beku tidak?

### 9.6 — OOS: header readout berubah bila slider digeser post-trip (terkonfirmasi sebagian)

- Probe: setelah trip (delta beku 160.2°), menggeser Ef 1.5→2.6 & Xs 1.2→0.6 membuat
  `getPe(s)` berubah 0.0170 → 0.0588, `getPmax` 0.050 → 0.173. **Readout benar-benar
  berubah saat fisika sudah beku** → inkonsisten. Terkonfirmasi empiris.
- Perlu solusi: disable `onSl`/`numSl` pasca-trip, atau bekukan nilai header pada trip.

### 9.7 — Governor: RLR→grid handoff **bukan bumpless**, lompatan −0.1131 pu (terkonfirmasi)

- Subagent governor menemukan `stopRLR()` → `setMode('grid')` memakai `Pm_eff = s.Pm`
  (setpoint terakhir), tapi `Pm_gov` berada di 0.6931 (lag tunggal). Rangka
  `Pm_eff = 0.6931 → 0.5800` — **lompatan −0.1131 pu** pada akhir RLR.
- Probe empiris (`/tools/_verify-handoff.js`, sudah dihapus): lompatan −0.1131 pu terkonfirmasi;
  transient pasca-handoff f ∈ [0.99854, 1.00129], delta maks 33.67° — **stabil, tapi
  bukan nol lompatan**.
- Perbaikan proposal: seed ulang `Pm_gov = Xg = s.Pm` di `stopRLR` atau ramp perlahan.
  Catatan: commit `12125cc` **meningkatkan** (lompatan lama −0.69 pu → −0.113 pu).
  Ini residu, bukan regresi.

### 9.8 — Governor: UI state desync (slider menampilkan nilai pre‑RLR)

- `startRLR` menonaktifkan slider Pm; `stopRLR` **tidak menyinkronkan** kembali
  `sPm.value`/`nPm` dengan `s.Pm` (yang kini = beban akhir 24 jam, bukan nilai
  prekursor). Slider tetap menampilkan nilai lama → user klik drag kecil menyebabkan
  lompatan ke nilai slider. **Minor UI bug.** `stopRLR` tidak memanggil
  `uiSl('sPm', S.Pm)`. (Belum saya probe visual; reasoning cukup kuat.)

### 9.9 — Governor: klik "Grid" saat RLR masih berjalan → f display tidak konsisten

- Saat RLR aktif, `govActive(s)` tetap `true` (karena `rlr_running`). Klik tombol Grid
  mengubah `s.mode='grid'` tapi tidak menghentikan RLR → frekuensi header menampilkan
  "50.00 Hz" (mode grid) sementara `omega` memang berubah di physics. **Minor UI/physics
  mismatch**, pre-existing. (Belum dipilah.)

## Tidak ada temuan — bersikar tidak bersikap

### 9.10 — Governor: "droop R=5 % tidak menghasilkan offset frekuensi" bukan bug

- `dω/dt = (Pm_eff − Pe − D·ω)/(2H)` → `dδ/dt = ω·WS` memaksa `ω = 0` pada
  keseimbangan, sehingga `Pm_gov = Pm − ω/R = Pm` (drop-out persis). Model ini tidak
  memiliki beban frekuensi-sensitif → frekuensi tetap 50 Hz di steady state. **Ini
  pilihan model (damping D bukan beban f-dependen), bukan bug perbaikan.** Test
  `governor-steady-state.test.js` assertion `Pm_eff → Pm ±0.03` tepat.

### 9.11 — OOS: audio alarm tidak dihentikan oleh trip (sesuai spesifikasi)

- `startOOSAlarm()` dipanggil tiap frame pasca-trip, ditahan oleh
  `if(oos_active) return`. Alarm **memenuhi spesifikasi "permanent sampai reset"**.
- Catatan low‑severity (pre-existing): `getACtx()` tidak pernah memanggil
  `ac.resume()`; bila konteks AudioContext dibuat terlalu jauh setelah gesture, Chrome
  dapat membuatnya *suspended* → alarm **akustik mungkin tak pernah terdengar**.
  (Belum dipilah — butuh browser aktual.)

## Rekomendasi penempatan (prioritas)

| No | Temuan | Severity | Prior | Aksi |
|----|--------|----------|-------|------|
| 9.2 | Verdict EAC pakai parameter live, berubah retroaktif | med | 1 | Snapshotkan Pm/Pmax/delta_cleared pada clearing; atau kunci kartu saat `eac_phase='done'` |
| 9.1 | EAC_TOL 2 % < galat numerik A₁ (2.03 % pd 0.18 s) | low | 2 | Dokumentasikan batas akurasi; pertimbangkan integrasi I‑RAM yang konsisten (midpoint) |
| 9.6 | Header readout berubah post-trip bila slider digeser | med | 2 | Disable `onSl`/`numSl` pasca-trip atau bekukan nilai pada trip |
| 9.7 | RLR→grid handoff −0.113 pu (bukan bumpless) | low | 3 | Seed ulang `Pm_gov=Xg=s.Pm` di `stopRLR` |
| 9.8 | Slider Pm menampilkan nilai pre-RLR pasca-stop | low | 3 | `uiSl('sPm', S.Pm)` di `stopRLR` |
| 9.3/9.4/9.5/9.9/9.11 | Lihat masing-masing butir | — | — | Perlu keputusan / probe tambahan / pemilihan model subagent |

> **Disclaimer audit:** semua tiga subagent audit mati pada output final karena
> kegagalan konfigurasi model (bukan kegagalan kode). Daftar temuan di atas
> diekstrak dari *reasoning yang berhasil dieksekusi* + konfirmasi empiris
> mandiri; **bukan** output terstruktur yang divalidasi. Temuan yang belum
> dikonfirmasi (9.3–9.5, 9.8–9.11) perlu verifikasi ulang bila dipilih untuk diproses.
