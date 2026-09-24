# Finish Flux Salient-Redesign + Integrasi ke master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menuntaskan cabang `fix/flux-salient-redesign` (verifikasi Task 7, smoke test Panel I Realistis) lalu mengintegrasikannya ke `master` dan merapikan worktree, sehingga tidak ada lagi commit lokal yang belum di-push dan `master` tidak tertinggal.

**Architecture:** Cabang flux (tip `759aa6b`) sudah berisi implementasi Task 1-6 plus fix `seed flux lokal` (spec §7, commit `759aa6b`). Karena `fix/critical-governor-and-bugs` hanya punya 1 commit tambahan setelah titik cabang (docs `32d46ba`), merge flux → critical dijamin tanpa konflik. History master → critical linear (master tip `4d76b2b` adalah ancestor), jadi merge critical → master memakai `--ff-only`. Semua perubahan produk ada di SATU file HTML; verifikasi memakai harness `tools/*.test.js` yang mengekstrak fisika dari HTML.

**Tech Stack:** Vanilla HTML single-file, Node.js test harness (`tools/extract.js` seam), git CLI, Puppeteer (sudah terpasang di `node_modules`) untuk smoke otomatis dengan fallback manual.

**Spec:** `docs/superpowers/specs/2026-09-24-flux-salient-design.md` + plan asal `docs/superpowers/plans/2026-09-24-flux-salient-redesign.md` (Task 1-6 selesai, Task 7 = plan ini)

## Global Constraints

- **Lingkungan shell:** Git Bash (POSIX). Nama repo mengandung apostrof → selalu pakai variabel, jangan hardcode path di tengah perintah.
- **Variabel wajib (definisikan di setiap shell baru):**
  ```bash
  export REPO="C:/Users/pcelr/Documents/Sheva/SHEVA'S SIMULATOR LIBRARY/LEVEL 1 - SYNCHRONOUS GEN (UNSTABLE)"
  export SD="C:/Users/pcelr/Documents/Sheva/SHEVA'S SIMULATOR LIBRARY/LEVEL 1 - SYNCHRONOUS GEN (UNSTABLE)"
  export WT="C:/Users/pcelr/Documents/Sheva/SHEVA'S SIMULATOR LIBRARY/LEVEL 1 - SYNCHRONOUS GEN (UNSTABLE)/.claude/worktrees/fix+flux-salient-redesign"
  export WTSD="$WT"
  ```
- **`safe.directory`:** sandbox berjalan sebagai user berbeda dari pemilik repo; SETIAP perintah git wajib `-c safe.directory="$SD"` (dan `-c safe.directory="$WTSD"` untuk operasi di worktree).
- **`npm` rusak di sandbox ini** (`npm-cli.js` tidak ditemukan). Jangan pakai `npm test`; jalankan `node tools/<nama>.test.js` langsung. Di mesin user `npm test` tetap berlaku.
- **Satu file produk, CRLF** (`LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`). Normalisasi `\r\n`→`\n` saat parsing; satu Edit per blok per file; `old_string` unik.
- **Determinisme:** jangan tambah `Date.now()`/`Math.random()` di fungsi fisika; flux lines murni fungsi `(θ, field)`.
- **Bahasa:** komentar/UI Indonesia; istilah teknis English. Commit message conventional (type: feat, fix, docs, chore, merge).
- **Satu sesi per working tree:** merge dilakukan dari worktree utama; worktree flux hanya dibaca/di-commit Task 1, jangan ada sesi lain yang menulisnya.
- **Jangan ubah nama fungsi di `REQUIRED` `tools/extract.js`** tanpa alasan kuat — tes akan `SEAM GAGAL`.

## Review Focus

1. **Merge conflict HTML antara flux dan critical** — seharusnya mustahil (divergensi hanya 1 commit docs), tapi jika `git merge` melaporkan konflik: BERHENTI, jangan resolve sendiri; laporkan. (Pinned di Task 3.)
2. **`origin` bergerak sebelum push** — selalu `git fetch origin` sebelum merge/push; jika `origin/master` ≠ `4d76b2b`, jangan `--ff-only`; laporkan. (Pinned di Task 3/4.)
3. **Worktree flux locked** — `git worktree remove` akan gagal; wajib `git worktree unlock` dulu, dan pastikan tidak ada sesi lain yang memakai. (Pinned di Task 5.)
4. **Smoke otomatis gagal (Chrome headless)** — jangan anggap merah; fallback checklist manual, tandai hasil; jangan tunda merge karena ini. (Pinned di Task 2.)
5. **Regresi panel tetangga pasca-merge** — merge mengubah Panel I; setelah merge jalankan smoke singkat Panel II (P-δ) & III (time series) + cek console error. (Pinned di Task 3.)

---

### Task 1: Finalisasi status plan flux (docs) + commit di cabang flux

**Files:**
- Modify: `docs/superpowers/plans/2026-09-24-flux-salient-redesign.md` (di worktree flux `$WT`)

**Interfaces:**
- Consumes: tip flux `759aa6b` (sudah ada).
- Produces: plan asal mencatat Task 1-6 selesai; Task 7 dirujuk ke plan ini.

- [ ] **Step 1: Cek isi plan asal**

Run (dari `$WT`):
```bash
grep -n '^## Task 7' "$WT/docs/superpowers/plans/2026-09-24-flux-salient-redesign.md"
grep -c -- '- \[ \] \*\*Step' "$WT/docs/superpowers/plans/2026-09-24-flux-salient-redesign.md"
```
Expected: nomor baris heading Task 7, dan jumlah total kotak belum tercentang (Task 1-7).

- [ ] **Step 2: Centang Task 1-6, sisakan Task 7**

PowerShell (satu file, satu blok):
```powershell
$p = "C:\Users\pcelr\Documents\Sheva\SHEVA'S SIMULATOR LIBRARY\LEVEL 1 - SYNCHRONOUS GEN (UNSTABLE)\.claude\worktrees\fix+flux-salient-redesign\docs\superpowers\plans\2026-09-24-flux-salient-redesign.md"
$lines = Get-Content -LiteralPath $p
$idx = 0..($lines.Count - 1) | Where-Object { $lines[$_] -match '- \[ \] \*\*Step' }
$keep = $idx[-4..-1]   # 4 baris kotak Task 7 dibiarkan kosong
foreach ($i in $idx) { if ($keep -notcontains $i) { $lines[$i] = $lines[$i] -replace '- \[ \] \*\*Step', '- [x] **Step' } }
Set-Content -LiteralPath $p -Value $lines -Encoding UTF8
```
Verifikasi: `grep -c -- '- \[ \] \*\*Step' "$WT/docs/superpowers/plans/2026-09-24-flux-salient-redesign.md"` harus tepat 4.
Alternatif manual: semua `- [ ] **Step` di Task 1 s/d Task 6 menjadi `- [x] **Step`; empat baris milik Task 7 dibiarkan.

- [ ] **Step 3: Tambahkan catatan rujukan di Task 7**

Edit file di atas: tepat setelah baris `## Task 7: Final verification — manual smoke test of realistic-field contract + full suite` tambahkan satu baris:
```markdown
> Dilaksanakan oleh `2026-09-24-finish-flux-salient-integration.md` — fix seed double-pairAng sudah di `759aa6b`.
```

- [ ] **Step 4: Verifikasi dokumen**

Run:
```bash
grep -n '759aa6b' "$WT/docs/superpowers/plans/2026-09-24-flux-salient-redesign.md"
```
Expected: baris catatan rujukan muncul.

- [ ] **Step 5: Commit**

```bash
cd "$WT"
git -c safe.directory="$SD" -c safe.directory="$WTSD" add -- docs/superpowers/plans/2026-09-24-flux-salient-redesign.md
git -c safe.directory="$SD" -c safe.directory="$WTSD" commit -m "docs(plan): centang Task 1-6 flux salient, rujuk Task 7 ke plan integrasi"
git -c safe.directory="$SD" -c safe.directory="$WTSD" push
```

---

### Task 2: Smoke test Panel I Realistis (otomatis, fallback manual)

**Files:**
- Run: `$WT/tools/puppeteer-test-runner.js`
- Note hasil di `docs/superpowers/plans/2026-09-24-finish-flux-salient-integration.md` (append, di worktree utama)

**Interfaces:**
- Consumes: HTML flux tip (sudah termasuk fix `759aa6b`).
- Produces: catatan hasil smoke (lulus/gagal per butir) — dasar keputusan merge di Task 3.

- [ ] **Step 1: Coba smoke otomatis Puppeteer di worktree flux**

```bash
cd "$WT"
node tools/puppeteer-test-runner.js 2>&1 | tail -30
```
Expected A: proses selesai, `tools/test-results/report.json` + screenshot terbentuk → **lulus otomatis**, lanjut Step 3.
Expected B: error Chrome headless (EPERM / spawn) → jangan perbaiki di sini (isu dikenal, AGENTS.md), lanjut Step 2.

- [ ] **Step 2: Smoke manual checklist (user/browser)**

Buka `file://$WT/LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` di Chrome, lalu centang semua:
- [ ] Panel I mode Realistis: garis flux rapat di muka kutub, renggang di netral (bukan sinus skematik)
- [ ] Geser `I_f`: kerapatan garis naik/turun (density ∝ I_f)
- [ ] Setiap garis utama punya arrowhead segitiga arah N→S
- [ ] Garis leakage putus-putus pendek, tidak menembus stator yoke
- [ ] Jumlah path garis tidak meledak (tetap ringan saat animasi jalan)
- [ ] Console (F12) bersih dari error; Panel II (P-δ) dan Panel III (time series) tetap render normal
Catatan hasil: tulis PASS/FAIL per butir + detail kegagalan.

- [ ] **Step 3: Rekam hasil di plan ini (worktree utama)**

Append di akhir `$REPO/docs/superpowers/plans/2026-09-24-finish-flux-salient-integration.md`:
```markdown
## Hasil Smoke Test Panel I Realistis (Task 2)
- Tanggal/Jam: <isi>
- Metode: otomatis (Puppeteer) / manual — tandai yang dipakai
- Hasil per butir: <PASS/FAIL per butir Step 2>
- Keputusan: lanjut merge / perbaiki dulu
```
TIDAK perlu commit file plan ini (masih dipakai Task 3-6); cukup edit di working tree.

---

### Task 3: Merge flux → critical + verifikasi penuh + push

**Files:**
- Merge dari worktree utama (`$REPO`, branch `fix/critical-governor-and-bugs`).

**Interfaces:**
- Consumes: flux tip (dari Task 1-2), critical tip `32d46ba`.
- Produces: merge commit di `fix/critical-governor-and-bugs`; tip baru dirujuk Task 4-6.

- [ ] **Step 1: Fetch + cek divergensi**

```bash
git -c safe.directory="$SD" -C "$REPO" fetch origin
git -c safe.directory="$SD" -C "$REPO" log --oneline -1 origin/master
git -c safe.directory="$SD" -C "$REPO" merge-base fix/critical-governor-and-bugs fix/flux-salient-redesign
```
Expected: `origin/master` = `4d76b2b`; merge-base = `5233bc5` (titik cabang flux). Jika `origin/master` ≠ `4d76b2b`: BERHENTI, laporkan.

- [ ] **Step 2: Merge**

```bash
git -c safe.directory="$SD" -C "$REPO" merge --no-ff fix/flux-salient-redesign -m "merge: flux salient redesign (Task 1-6 + fix seed spec §7) ke critical"
```
Expected: merge commit tanpa konflik. Jika ada konflik: BERHENTI, jangan resolve; laporkan (Review Focus #1).

- [ ] **Step 3: Verifikasi penuh 20 suite di tree hasil merge**

```bash
cd "$REPO"
for f in model governor-steady-state eac-verdict oos-trip eac-snapshot post-trip-freeze rlr-handoff end-to-end ui chart-scale reactive-power interaction-a11y realistic-field fem-field-solver fem-saliency fem-saturation pdelta-curve-salient pole-geometry visual-sync performance-fix; do
  node "tools/$f.test.js" || echo "FAIL: $f"
done
```
Expected: semua `EXIT 0`; tidak ada baris `FAIL:`. Perhatian khusus `realistic-field.test.js` harus `Passed: 87`.

- [ ] **Step 4: Smoke panel tetangga (cepat)**

Buka `file://$REPO/LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` hasil merge; pastikan Panel II/III render + console bersih (5 menit).

- [ ] **Step 5: Push critical + cek status**

```bash
git -c safe.directory="$SD" -C "$REPO" push
git -c safe.directory="$SD" -C "$REPO" status -sb
git -c safe.directory="$SD" -C "$REPO" branch -vv
```
Expected: `## fix/critical-governor-and-bugs...origin/fix/critical-governor-and-bugs` tanpa `ahead`; semua branch terdaftar `[origin/...]`. (File plan baru ini boleh tampil sebagai `??` — akan di-commit di Task 6.)

---

### Task 4: Merge critical → master (fast-forward) + push

**Files:**
- Merge dari worktree utama (`$REPO`).

**Interfaces:**
- Consumes: critical tip (Task 3).
- Produces: `master` baru = critical tip; `origin/master` maju.

- [ ] **Step 1: Checkout master**

```bash
git -c safe.directory="$SD" -C "$REPO" checkout master
git -c safe.directory="$SD" -C "$REPO" status -sb
```
Expected: `## master...origin/master`; working tree bersih (file HTML berubah versi ke master lama — normal).

- [ ] **Step 2: Fast-forward merge**

```bash
git -c safe.directory="$SD" -C "$REPO" merge --ff-only fix/critical-governor-and-bugs
```
Expected: `Fast-forward`; `git log --oneline -1` = tip critical (merge commit Task 3). Jika gagal (bukan FF): BERHENTI, laporkan.

- [ ] **Step 3: Regresi inti**

```bash
cd "$REPO"
node tools/model.test.js && node tools/ui.test.js && node tools/realistic-field.test.js && node tools/oos-trip.test.js && node tools/governor-steady-state.test.js
```
Expected: kelima suite `EXIT 0`.

- [ ] **Step 4: Push master**

```bash
git -c safe.directory="$SD" -C "$REPO" push
```
Expected: `4d76b2b..<tip> master -> master`.

---

### Task 5: Bereskan worktree flux

**Files:**
- Tidak ada file; operasi git admin.

**Interfaces:**
- Consumes: flux sudah ter-merge (Task 3).
- Produces: satu worktree tersisa; repo bersih.

- [ ] **Step 1: Unlock + remove worktree flux**

```bash
git -c safe.directory="$SD" -C "$REPO" worktree unlock "$WT"
git -c safe.directory="$SD" -C "$REPO" worktree remove "$WT"
```
Expected: perintah sukses; folder `.claude/worktrees/fix+flux-salient-redesign` hilang. Jika remove gagal karena file modifikasi/untracked: cek `git -C "$WT" status` dulu, jangan `--force` tanpa memeriksa.

- [ ] **Step 2: Verifikasi akhir**

```bash
git -c safe.directory="$SD" -C "$REPO" worktree list
git -c safe.directory="$SD" -C "$REPO" branch -vv
git -c safe.directory="$SD" -C "$REPO" status -sb
```
Expected: `worktree list` hanya worktree utama; `branch -vv`: `master`, `fix/critical-governor-and-bugs`, `fix/flux-salient-redesign` semuanya `[origin/...]` tanpa `ahead`/`behind`; `status` bersih.

---

### Task 6: Log sesi + commit terakhir

**Files:**
- Create: `design-plans/sesi-2026-09-24-02-finish-flux-integration.md` (template: `design-plans/sesi-TEMPLATE.md`)

**Interfaces:**
- Consumes: hasil Task 1-5.
- Produces: log sesi ter-commit di `master`.

- [ ] **Step 1: Buat log sesi dari template**

Copy `design-plans/sesi-TEMPLATE.md` → `design-plans/sesi-2026-09-24-02-finish-flux-integration.md`, isi (Bahasa Indonesia):
- Commit sebelum: `759aa6b` (flux) / `32d46ba` (critical) / `4d76b2b` (master)
- Kegiatan: verifikasi Task 7, fix seed double-pairAng (759aa6b), smoke Panel I, merge flux→critical→master, cleanup worktree
- Hasil: 20 suite hijau, realistic-field 87/87, merge tanpa konflik, FF ke master
- Status plan: `2026-09-24-flux-salient-redesign.md` Task 1-6 selesai, Task 7 selesai (plan ini)
- Langkah berikut: stabilisasi core + shoot.js + CI/CD (roadmap AGENTS.md)

- [ ] **Step 2: Commit + push**

```bash
git -c safe.directory="$SD" -C "$REPO" add -- design-plans/sesi-2026-09-24-02-finish-flux-integration.md docs/superpowers/plans/2026-09-24-finish-flux-salient-integration.md
git -c safe.directory="$SD" -C "$REPO" commit -m "docs(sesi): selesai integrasi flux salient ke master"
git -c safe.directory="$SD" -C "$REPO" push
```
Expected: push sukses; `status -sb` bersih.

- [ ] **Step 3: Verifikasi penutup**

```bash
git -c safe.directory="$SD" -C "$REPO" log --oneline -5
git -c safe.directory="$SD" -C "$REPO" worktree list
```
Expected: 5 commit terakhir berisi merge flux, merge master, dan log sesi; satu worktree.
## Hasil Smoke Test Panel I Realistis (Task 2)
- Tanggal/Jam: 2026-09-24
- Metode: otomatis (Puppeteer `tools/puppeteer-test-runner.js` di worktree flux `59d5f49`)
- Hasil: 10/10 scenario PASS, Console Errors: 0; `report.json` + screenshots di `tools/test-results/`
- Butir visual flux (density ∝ I_f, arrowhead N→S, leakage terbatas, path count): dikunci oleh `realistic-field.test.js` 87/87 (kontrak DOM + geometri); penilaian mata manual menyusul dari user pasca-merge (Ruling 2)
- Keputusan: lanjut merge
