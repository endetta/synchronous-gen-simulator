# Audit Workflow Claude Code — 2026-09-20

**Metode:** Analisis 15 sesi Claude Code terpanjang lintas 4 proyek (L1 sync-gen, L2 sync-gen,
L2 UFR, L3 prot-sys), 5.507 tool calls, 212 prompt user substantif. Temuan diverifikasi
adversarial oleh 24 agen verifikator independen; setiap klaim ditelusuri ke transkrip mentah
(`~/.claude/projects/**/*.jsonl`), digest, settings, dan git. Angka yang tidak bisa direproduksi
ditolak atau di-downgrade.

**Ringkasan eksekutif:** Performa Anda **secara umum baik** untuk sebuah pola kerja
research-engineer: prompt fitur/bug Anda spesifik (contoh terbaik: laporan bug 13:23:51 di
sesi a06e56f2 — reproduksi observabel + "Jangan ada eksekusi terlebih dahulu"), dokumentasi
sesi jalan, dan hasil kerja nyata (49 commit). Tiga masalah terbesar justru **bukan kesalahan
Anda**: (1) error tool dominan berasal dari router model lokal + free-model di baliknya
(54–64% malformed JSON payload), (2) konfigurasi global terlalu agresif untuk pola kerja
iteratif, (3) sisa rework berasal dari sesi paralel tanpa isolasi + autonomous run panjang
tanpa checkpoint.

---

## 1. Kekuatan (pertahankan)

| # | Yang sudah baik | Bukti |
|---|---|---|
| K1 | Prompt bug-report berkualitas tinggi | "klik realistis, kemudian klik phasor... Jangan ada eksekusi terlebih dahulu" (a06e56f2 13:23:51) — reproduksi + mode diagnosa + scope jelas |
| K2 | Dokumentasi sesi/plan hidup | 16 log sesi + 3 plan file di design-plans/, template tersedia |
| K3 | Test harness ekstraksi-fisika (seam) | 19+ suite di tools/, `model.test.js` mengekstrak fisika dari HTML (commit 2b1644c) |
| K4 | Komitmen hasil nyata | 49 commit; fisika governor/EAC/OOS diperbaiki & dijaga tes |

## 2. Kelemahan workflow (yang bisa Anda perbaiki)

### W1 — Sesi paralel tanpa isolasi (CONFIRMED, high)
Tiga sesi paralel mengedit **satu file HTML yang sama** di satu working tree. Tercatat di log
sesi sendiri: "kerja sesi ini ter-commit oleh sesi paralel", diff harus diselamatkan manual
(`.scratch/stage-mine.sh`, `mine.patch + git apply --cached`), dan aturan "jangan overlap"
di CLAUDE.md workspace dilanggar.

**Perbaikan:** satu proyek = satu sesi aktif; kalau wajib paralel, pakai worktree (pola
`scripts/parallel-session.sh` milik L3) atau serialisasi per file. Tulis aturan ini di
CLAUDE.md proyek ini.

### W2 — Autonomous run panjang tanpa checkpoint (DOWNGRADE→medium, tetap penting)
Stretch terpanjang: **452, 325, 312, 223, 211 tool calls** tanpa prompt user di antaranya.
Satu sesi berakhir dengan keluhan Anda sendiri: "terlalu banyak menghabiskan waktu di bagian
akhir, yaitu testing dan git commit" (3j38m tanpa kontrol). 25% prompt Anda mengandung penanda
koreksi/friction ("masih salah", "coba lagi", panel tidak ter-render).

**Perbaikan:** untuk task besar, minta checkpoint tiap ±30–60 tool call / tiap 1 subsistem:
daftar file berubah, hasil tes, risiko terbuka. Sertakan verifikasi visual + smoke-test panel
tetangga setelah perbaikan UI sebelum lanjut.

### W3 — Git hygiene: cabang divergensi + push tertunda (CONFIRMED, high)
`fix/critical-governor-and-bugs` berisi **33 commit yang tidak ada di master** (termasuk fix
fisika yang CLAUDE.md sitasi sebagai kanonik: 12125cc, 2b1644c); master sendiri 3 commit di
depan origin/master; 3 commit belum di-push di cabang fix. Ini melanggar aturan "push sebelum
ganti session" — risiko kehilangan kerja.

**Perbaikan:** push sekarang; merge/PR `fix/critical-governor-and-bugs` → `master` agar
cabang kanonik memuat fix fisika; push di akhir tiap sesi.

### W4 — Bash sebagai default inspeksi (DOWNGRADE→medium)
Bash mendominasi 60–78% tool call di sesi bermasalah (53e0edb4: 358/461 = 78%, dengan hanya
27 Read + 1 Grep + 2 Glob). Kombinasi path Windows ber-apostrof + JSON escaping memicu
sebagian besar InputValidationError. Sesi L1 ff9dbd10 mengulang prefix `cd` yang sama 17×.

**Perbaikan:** pakai Read/Grep/Glob untuk inspeksi; satu Bash untuk batch tes/build koheren;
hindari menulis path ber-apostrof ke dalam string shell — andalkan cwd sesi.

### W5 — Polling loop menghasilkan prompt kosong (CONFIRMED, medium)
Sesi c542c250: 14 dari 41 prompt adalah status-check terjadwal tiap 5 menit ke agen yang sama.
Ini menggembungkan friction count dan memboroskan token.

**Perbaikan:** jangan polling manual; pakai notifikasi completion (Monitor/Bash background) —
agen akan memanggil balik saat selesai.

### W6 — 20% prompt = "lanjutkan" tanpa kriteria selesai (DOWNGRADE→low)
42/212 prompt adalah continuation-only ("lanjutkan", "coba lagi", "continue"). Kebanyakan OK
untuk resume, tapi tanpa kriteria selesai agen menempuh jalur sendiri.

**Perbaikan:** saat resume, satu kalimat: target + kondisi gagal + definisi "selesai".

## 3. Masalah infrastruktur (BUKAN kesalahan Anda)

| # | Masalah | Bukti | Dampak |
|---|---|---|---|
| I1 | **Free-model proxy menghasilkan 54–64% error tool** | 658/1.026 = malformed JSON payload (`InputValidationError`) di Bash/Read/Edit/SendMessage; sesi 53e0edb4: 160/358 Bash malformed | Loop retry, rework, waktu terbuang |
| I2 | **Router timeout** | 170 infra_capacity errors ("temporarily unavailable... auto mode cannot determine") | Interupsi mid-task |
| I3 | **Router tidak mendukung tool schemas penuh** | MODEL-001 CONFIRMED: `om-mid` bukan model Anthropic; kelas error konsisten dengan inkompatibilitas schema | Error rate 16.4% vs <5% normal |

Verifikator menolak klaim bahwa angka-angka ini murni kesalahan proses user — atribusi
infrastruktur adalah mayoritas. **Keputusan bisnis:** free aggregator menghemat biaya token
tetapi dikenakan biaya berupa rework + waktu. Hitung ulang dengan biaya waktu Anda.

## 4. Keamanan (perlu tindakan, bukan kepanikan)

- **S-1 Token plaintext di settings.json** (DOWNGRADE dari "version-controlled" — file TIDAK
  di-git; tetapi tetap di disk plaintext): pindahkan ke env var atau `ant auth login`;
  rotasi token jika mesin dipakai bersama.
- **S-2 bypassPermissions + skipDangerousModePermissionPrompt** (DOWNGRADE — bukan vektor
  serangan langsung, tapi menghapus gate review untuk rm/git push/file ops): pertimbangkan
  mode `acceptEdits` untuk kerja normal; `bypassPermissions` hanya untuk task otomatis penuh.
- **S-3 10 plugin global** (DOWNGRADE — count salah di laporan awal, benar 10 bukan 9):
  chrome-devtools + playwright di-load di setiap sesi termasuk kerja HTML vanilla.

## 5. Konfigurasi yang disarankan (delta settings.json)

Semua perubahan reversible; backup sudah ada di `~/.claude/settings.json.bak-20260920-125050`.

| Kunci | Sebelum | Sesudah | Alasan |
|---|---|---|---|
| `permissions.defaultMode` | `bypassPermissions` | `acceptEdits` | Gate review tetap ada untuk bash/commit; edit file tidak perlu approve ulang |
| `skipDangerousModePermissionPrompt` | `true` | dihapus | Tidak diperlukan lagi; restore safety prompt |
| `effortLevel` | `xhigh` | `high` | xhigh global memicu token & waktu berlebih untuk task rutin; xhigh per-task via /config |
| `ultracode` | `true` | `false` | Workflow fan-out opt-in per task (kata kunci "ultracode" di prompt), bukan default |
| `autoCompactWindow` | `1000000` | *(tidak diubah)* | File HTML utama single-file besar; 200K akan memicu compaction prematur. Pertahankan 1M untuk proyek ini. |
| `ANTHROPIC_AUTH_TOKEN` di env | plaintext di settings.json | env var sistem | Token tidak lagi di disk plaintext |
| Plugin chrome-devtools/playwright | enabled global | enabled per-proyek | Load hanya saat kerja UI testing |

Catatan:
- `ANTHROPIC_BASE_URL` proxy ke `127.0.0.1:20128` **tidak saya ubah** — itu keputusan
  bisnis Anda (free aggregator). Tapi sadari: mayoritas tool error datang dari sana.
- `ANTHROPIC_AUTH_TOKEN` **tidak saya hapus dari settings.json** karena itu sedang
  menjadi credential yang mengautentikasi proxy lokal; pindahkan ke env var di saat
  Anda siap memperbarui konfigurasi proxy. Token tidak terdeteksi di git.
- `permissions.defaultMode` **tidak saya ubah ke `auto`** karena akan memblokir
  semua tool call tanpa approval di session Anda saat ini. Bila Anda ingin gate,
  gunakan `/config` → Permissions dan pilih mode yang nyaman (`acceptEdits` adalah
  kompromi umum: edit file lulus, bash/commit tetap ditanya).
- `skipDangerousModePermissionPrompt: true` **dibiarkan** karena disetel manual di UI.
  Hapus manual jika ingin prompt mode berbahaya kembali muncul.

## 6. SOP prompt & checkpoint (yang akan mengurangi rework)

**Pola prompt yang sudah bagus (pertahankan):**
```
[gejala observabel] + [langkah reproduksi] + [mode: diagnosa/eksekusi] + [batasan]
Contoh nyata Anda: "klik realistis, klik phasor, klik realistis... animasi stuck.
Coba ceritakan alasannya dan solusinya. Jangan ada eksekusi terlebih dahulu."
```

**Template resume/continuation (ganti "lanjutkan" polos):**
```
Lanjutkan [X]. Status terakhir: [Y]. Definisi selesai: [Z]. Jangan sentuh [W].
```

**Checkpoint untuk task besar:**
```
Kerjakan [X] dengan checkpoint: setelah diagnosis, setelah implementasi pertama,
setelah tes lulus. Di tiap checkpoint laporkan file berubah + hasil tes + risiko.
Setelah fix UI: smoke-test panel tetangga sebelum lanjut.
```

**Aturan sesi:**
1. Satu proyek = satu sesi aktif; paralel hanya dengan worktree terpisah.
2. Push sebelum ganti session — selalu, bukan "setelah sesi paralel selesai".
3. Task besar → brainstorming → plan → implementasi bertahap dengan gate.
4. Jangan polling manual agen; biarkan notifikasi completion memanggil.

## 7. Metrik keberhasilan (2 minggu ke depan)

| Metrik | Baseline hari ini | Target |
|---|---|---|
| Tool error rate | 16.4% | < 8% (mayoritas dari router yang bisa diperbaiki) |
| Commit `fix`/`revert` | 30.6% (15/49) | < 15% |
| Sesi tanpa log manual | 54% | < 20% |
| Prompt continuation-only | 20% | < 10% |
| Sesi paralel tanpa worktree | 3 kejadian | 0 |
| Commit belum push saat ganti sesi | 3 | 0 |
| Autonomous stretch > 100 calls | 5 kejadian | ≤ 1 (dengan checkpoint eksplisit) |

## Lampiran: metode & limitasi

- 15 sesi = sampel proporsional terpanjang dari 94 sesi di 4 proyek; hasil generalisasi
  dengan hati-hati ke sesi pendek.
- Klasifikasi error otomatis dari digest Python; 1.026 vs 1.031 (recount independen)
  — selisih <1%, tidak mengubah kesimpulan.
- 2 agen find (failures-infrastructure, outcomes) gagal menjalankan StructuredOutput —
  lensa tersebut di-backfill dari digest manual + verifier tersendiri.
- Sintesis akhir workflow menghasilkan output kosong; laporan ini disusun langsung dari
  temuan + 24 verdict verifikasi (lihat journal.jsonl untuk jejak penuh).
- Verifikator menolak/downgrade beberapa klaim awal: angka stretch sudah benar tapi klaim
  "kontiguity" diperkuat ulang; "19 suite tes" ternyata 21; "9 plugin" ternyata 10;
  WF-03 (file tes hilang) TERBANTAHKAN — kedua file xaxis-*.test.js ada dan ter-track.
- Skrip audit tersimpan di `.scratch/digest.py`, `.scratch/probe.py`, `.scratch/digest-out/`
  untuk reproducibility.
