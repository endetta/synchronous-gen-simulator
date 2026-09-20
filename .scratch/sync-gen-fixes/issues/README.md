# Tickets — sync-gen-fixes

Sumber: audit mendalam 2026-09-20 (review kritis sebagai user) + verifikasi numerik mandiri.
Ditulis terhadap commit `ddcca16` di branch `fix/critical-governor-and-bugs`.

## Eksekusi & dependensi

```
01 ─┬─ 02 ── 08
    ├─ 03
    ├─ 04
    └─ 05
06 (independen; butir-1 butuh konfirmasi ulang)
07 (independen)
```

- **Frontier awal:** 01, 06, 07 bisa mulai bersamaan.
- **Eksekusi satu-per-satu** (jangan paralel di file HTML yang sama — satu file, risiko konflik edit tinggi). Paralel hanya untuk tiket dokumen (05) dan kebersihan (06).
- Urutan yang disarankan: **01 → 03 → 04 → 02 → 08 → 05 → 06 → 07** (perbaiki fisika dulu, kunci dengan tes, lalu dokumen & kebersihan).

| Tiket | Judul | Blocked by | Status |
|-------|-------|------------|--------|
| [01](01-governor-double-count.md) | Perbaiki double-count daya mekanik governor + bumpless transfer | — | ready-for-agent |
| [02](02-test-seam-extract-physics.md) | Seam pengujian: ekspor model fisika murni dari HTML | 01 | ready-for-agent |
| [03](03-eac-verdict-correctness.md) | Verdict EAC sesuai buku: A₁ ≤ A₂ tersedia | 01 | ready-for-agent |
| [04](04-oos-real-trip.md) | Loss of synchronism benar-benar trip | 01 | ready-for-agent |
| [05](05-docs-sync.md) | Sinkronisasi dokumentasi ke realitas | 01 | ready-for-agent |
| [06](06-cleanup-stale-artifacts.md) | Bersihkan artefak stale | — (butir-1 perlu konfirmasi) | ready-for-agent |
| [07](07-interaction-a11y.md) | Interaksi & aksesibilitas | — | ready-for-agent |
| [08](08-end-to-end-test-coverage.md) | Coverage tes fitur inti (regresi gate) | 02 | ready-for-agent |

Status: `ready-for-agent` | `in-progress` | `done` | `blocked` (dengan alasan) | `rejected` (dengan alasan).

## Keputusan yang sudah disetujui user

1. **Zoom plugin (chartjs-plugin-zoom)**: hapus dari CDN + PRD (tidak dipakai).
2. **SC Power Factor**: hapus dari PRD (bukan expose ke UI).
3. **Preset scenarios**: pertahankan SC timing engineered (nilai bawaan preset menang atas input user).
4. **Copy HTML root**: butuh konfirmasi ulang saat eksekusi tiket 06 (file di luar repo).

## Temuan yang diangkat tapi TIDAK di-tiket-kan (backlog)

- `resizeTimeCharts()` disabled — panel drag tidak meresize chart di dalamnya (perlu investigasi layout thrashing lebih dulu).
- `smartDecimate()` tidak mempertahankan extrema/transien < 50 ms.
- Fallback renderer Chart.js gagal-total tanpa mekanisme retry CDN.
- Duplikasi blok fault-annotation 4× dan perhitungan d0/Pmax/δ_cr di 6 tempat — refactor saat menyentuh kode tersebut, jangan refactor untuk refactor.
- Responsif tablet/mobile (PRD eksplisit desktop-min 1280×720 — keputusan produk, bukan bug).
