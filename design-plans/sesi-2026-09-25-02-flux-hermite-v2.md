# Sesi 2026-09-25-02 — Perbaikan visualisasi fluks magnet mode Realistis (Hermite v2)

**Tanggal:** 2026-09-25  
**Waktu mulai:** ±10:15 (estimasi — sesi dimulai sebelum kompaksi konteks)  
**Waktu selesai:** 11:40  
**AI/Developer:** Claude Code

---

## Commit Sebelum Sesi

```
2fcc42d feat(ui): hapus legend sidebar Pm/Pe/δ/Δω/A1/A2/Vt atas permintaan user
```

---

## Tujuan Sesi

User melaporkan visualisasi fluks magnet Panel I mode "Realistis" **"masih sangat salah"** dan memberi referensi gambar garis fluks teksbook (loop mulus, beranak ragam/nested, panah arah sepanjang garis). Tugas: diagnosis akar masalah, perbaiki, verifikasi dengan tes + screenshot.

---

## Kegiatan & Hasil

### 1. Diagnosis (systematic-debugging, Phase 1)

**Apa yang dilakukan:**
- Membaca spec `docs/superpowers/specs/2026-09-24-flux-salient-design.md`, kode `traceFieldLine` / `rebuildFluxPaths` / `makeGapProfile` di HTML, dan log sesi terkait.
- Membandingkan render sesudah-fix dengan screenshot sebelum-fix (`.scratch/flux-now-2pole.png` = roda bergigi radial).

**4 defect teridentifikasi (dengan bukti):**
1. **Seed starburst** — `asin(t)*0.95` memencar ±85° dari muka kutub → garis menutupi seluruh lingkaran (roda bergigi), bukan loop dipolar.
2. **Trace tak terkalibrasi** — ODE RK4 `sin(pairs·θ)` + `FLUX_K=0.55` → kaki hampir lurus, tiba di yoke dengan sudut ~68–88° dari tangensial (bukan sambungan halus), deviasi ~10° dari spek.
3. **`armD`/`amp` dead code** — `const amp = armDModulation(field)` dihitung tapi tak pernah dipakai di trace (spec §5 tidak terpenuhi).
4. **Satu radius yoke** — semua garis menutup di `0.99R` saja → tanpa nesting (tidak "beranak ragam" seperti referensi).

### 2. Prototipo standalone sebelum menyentuh HTML

**Apa yang dilakukan:**
- `.scratch/flux-proto.js` + `shoot-proto.js`: menguji gamba Hermite kubik (A radial di muka kutub → B tangensial di yoke, `c = 0.6·|AB|`) pada SVG standalone.
- Prototipo 4-pole awal **groblokan** antar kutub → menambahkan cap wedge: `room = max(0, halfPitch − 0.05 − |a0|)` dan `spread = min(sepatu/2+0.22, halfPitch − 0.08)`.

**Hasil:** arrivo ~9° dari tangensial, radius kaki monoton naik, wedge terjaga.

### 3. TDD: 13 test merah → implementasi → hijau

**Apa yang dilakukan:**
- `tools/realistic-field.test.js`: test 11 diubah (sekarang mencari `splay` + `Math.PI / pairs`), test 17 baru (tolak `asin(t)*0.95`, wajib `sin(t*π/2)` + `halfPitch` + `rYoke` + pemakaian `amp` via regex `/\bamp\s*\*|\*\s*amp\b/`), test 18 baru (numerik dinamis via seam: loop pairs 1/2/3 × a0, asersi radius monoton, maxAng < halfPitch, tiba <30° dari tangensial).
- `tools/extract.js`: tambah `'traceFieldLine','makeGapProfile','density','armDModulation'` ke daftar `names`.
- HTML (6 edit sekuensial, CRLF-safe):
  - Hapus `FLUX_K`; tambah `FLUX_STEPS=24`, `FLUX_SPLAY_BASE=0.08`, `FLUX_SPLAY_EDGE=0.30`.
  - `makeGapProfile` kini mengembalikan `{g, gRef, min, max, pairs, halfPitch, spread}`.
  - `traceFieldLine` ditulis ulang: Hermite kubik A→B, busur yoke `ain → Φ−ain` langkah 0.06 rad, kaki balik = cermin reflektif M(Φ), splay fringing dibatasi wedge, `amp` benar-benar dipakai.
  - `rebuildFluxPaths`: seed `spread * Math.sin(t*π/2)`, `rYoke = R*(fluxMax − 0.045*ratio²)` (nesting), leakage dari `spread`.

**Hasil (bukti):**
- Test merah terarah: 13 kasus gagal sesuai desain TDD.
- Sesudah implementasi: `node tools/realistic-field.test.js` → **124/124 lolos (exit 0)**.
- `npm test` → **12 suite hijau**; 6 suite terkait field exit 0.

### 4. Verifikasi visual in-browser

**Apa yang dilakukan:**
- `.scratch/shoot-flux-after.js` (puppeteer, port 8777, `py -m http.server`): screenshot mode Realistis 2/4/6 pole.
- Membaca `.scratch/after-2pole.png`, `after-4pole.png`, `after-6pole.png`.

**Hasil:**
- 2-pole: fascio terkonsentrasi di bawah kutub, kaki melengkung halus (sambungan C1), busur yoke bertingkat, panah N→S, leakage dashed — sesuai gambar referensi user.
- 4 & 6-pole: tiap kutub punya loop sendiri, **tidak ada silang/groblokan antar kutub** (cap halfPitch bekerja), nesting yoke terjaga.
- Jumlah path: `{2: main 38, 4: main 76, 6: main 114}` = 19 garis per kutub × jumlah kutub — linear & konsisten.
- Console: **1 resource 404** — diverifikasi = `favicon.ico` (HTML hanya merujuk CDN eksternal Google Fonts + jsDelivr Chart.js; tidak ada resource lokal). Benign, tidak terkait perubahan ini.

---

## Status Plan Terkait

**Plan:** `design-plans/plan-realistic-magnetic-visualization.md` (Fase 0 kontrak) + spec `docs/superpowers/specs/2026-09-24-flux-salient-design.md`  
**Status sebelum:** Fase 0 selesai; deviasi implementasi trace dari spek §3/§5  
**Status sesudah:** Fase 0 + perbaikan trace v2 selesai; spek §3 (sambungan C1 tangensial), §5 (armD aktif), dan bentuk loop teksbook terpenuhi  
**Perubahan:** implementasi Hermite v2 menggantikan ODE sin(pairs·θ) — dicatat sebagai deviasi diimplementasi di sesi ini (lihat Catatan Tambahan).

---

## Commit Sesi Ini

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" \
        tools/extract.js tools/realistic-field.test.js \
        design-plans/sesi-2026-09-25-02-flux-hermite-v2.md
git commit -m "fix(field): trace fluks Hermite v2 — loop dipolar teksbook, bukan starburst"
git push origin master
```

**Commit hash:** `01ff764` (di-rebase di atas `9b3efbd` sesi chart Panel III, sudah push ke `origin/master`)

---

## Langkah Berikutnya

1. Lanjut `plan-realistic-magnetic-visualization.md` / spek flux — cek item Fase yang masih DRAF.
2. Jika user ingin penyesuaian visual (kepadatan garis, jumlah garis per kutub, arah panah), cukup ubah konstanta `FLUX_SPLAY_*` / `FLUX_STEPS` / multiplier seed — satu titik di `traceFieldLine`/`rebuildFluxPaths`.
3. Sesi berikutnya: baca log sesi ini + status plan sebelum eksplorasi ulang.

---

## Catatan Tambahan

- **Deviasi spek yang disengaja:** spek §3 menyebut ODE sin(pairs·θ); implementasi v2 memakai **gamba Hermite kubik + busur yoke + cermin Φ** karena ODE lama tidak terkalibrasi (deviasi ~10°, tiba tak tangensial). Geometri bersifat deterministik dan lulus test numerik — tidak ada solver ODE di jalur render.
- Kunci bentuk "teksbook": (a) seed padat di muka kutub, (b) sambungan C1 tangensial di yoke, (c) nesting radius yoke, (d) panah per garis.
- `.scratch/` berisi prototipo & screenshot verifikasi (gitignored/lokal).
- Aturan disiplin Edit terpenuhi: 1 Edit per file per blok, `old_string` unik, CRLF-safe, tidak ada `node -e` kompleks.
