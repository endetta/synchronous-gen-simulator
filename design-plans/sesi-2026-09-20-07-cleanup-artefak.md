# Sesi 2026-09-20-07: Tiket 06 — Bersihkan Artefak Stale

**Tanggal:** 2026-09-20
**Branch:** `fix/critical-governor-and-bugs`
**Commit sebelum:** `e422ece` (feat(a11y): tooltip keyboard/sentuh, ARIA kontrol, narasi anti-kedip)
**Tiket:** `.scratch/sync-gen-fixes/issues/06-cleanup-stale-artifacts.md`

---

## Latar

Audit 2026-09-20 menemukan tiga kelas artefak stale:
1. Copy HTML simulator di **root workspace** yang tertinggal 11 hari (9 Sep) —
   tanpa `getQe`, `getPmEff`, `oos_tripped`, `getA2Available`, `eacStable`.
   Pengguna yang membuka file dari root akan mendapat simulator versi lama.
2. `plans/README.md` masih menandai plan 001–003 sebagai TODO padahal
   pekerjaan time-series sudah selesai lewat jalur sesi lain.
3. Enam PNG artefak audit di direktori repo (gitignored, tapi mengotori
   direktori kerja).

## Keputusan user

> "copy dulu saja, nanti saya tes. jika saya suka hasilnya maka hapus saja backupnya"

Backup dibuat lebih dulu, penghapusan dilakukan setelah checksum terverifikasi.

---

## Kegiatan

### 1. Backup + hapus copy root (checksum terverifikasi)

```
sha256 asli   : 3e87336963e38dab131d0de295b0f680b4d50558e76e91a2fc5fbd70b617387d
sha256 backup : 3e87336963e38dab131d0de295b0f680b4d50558e76e91a2fc5fbd70b617387d  ✓ identik
```

- Backup: `.backup/LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE)_2026-09-09_root-copy.html` (99 KB)
- Copy root dihapus dari workspace root.
- Root workspace **bukan repo git** → penghapusan tidak bisa di-undo lewat git,
  itulah sebabnya backup dibuat dan diverifikasi lebih dulu.

**Untuk user:** setelah Anda menguji versi dari folder repo dan puas,
hapus backup dengan:
```bash
rm "SHEVA'S SIMULATOR LIBRARY/.backup/LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE)_2026-09-09_root-copy.html"
```

### 2. PNG artefak dihapus

`fullpage-audit.png`, `pane3-600-element.png`, `pane3-after-drag-600.png`,
`pane3-current.png`, `pane3-review.png`, `pane3-stretched-live.png` —
semuanya sudah di `.gitignore`, jadi murni kebersihan direktori kerja.

### 3. plans/README.md direkonsiliasi

Plan 001–003 ditandai DONE dengan bukti commit (`bfa43e8`) dan rujukan log sesi;
ditambah catatan bahwa pekerjaan lanjutan dilacak di
`.scratch/sync-gen-fixes/issues/`.

---

## Hasil

- Satu sumber kebenaran untuk file simulator: `LEVEL 1 - SYNCHRONOUS GEN (UNSTABLE)/`
- `plans/README.md` tidak lagi memuat TODO palsu
- Direktori kerja repo bersih dari PNG

## Status plan terkait

`.scratch/sync-gen-fixes/issues/06-cleanup-stale-artifacts.md` → **DONE**
(satu-satunya butir yang butuh konfirmasi user sudah dikonfirmasi dan dieksekusi
dengan backup).

## Langkah berikutnya

- User menguji simulator dari folder repo; bila puas → hapus backup.
- Tiket tersisa: 09 (temuan audit adversarial fisika, dicatat sesi lain).
- Backlog tidak di-tiket-kan: resize chart di dalam panel, extrema
  `smartDecimate()`, retry CDN Chart.js, refactor duplikasi.
