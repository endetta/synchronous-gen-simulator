# 01: Perbaiki double-count daya mekanik governor (island/RLR) + bumpless transfer

**What to build:** Ketika pengguna menekan "Island Mode", preset "Grid vs Island", atau memulai "Real Load Response", generator **tetap sinkron** dan mencapai steady-state yang benar. Hari ini ketiga alur ini memicu loss of synchronism palsu dalam 10–20 detik karena setpoint `Pm` terhitung dua kali.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

## Latar (bukti terverifikasi)

Commit `31b594d` menambahkan `s.Pm` ke servo TGOV1:

```javascript
const d_Xg = gov?(1/T1)*(s.Pm-omega/R-Xg):-Xg/0.05;
```

tetapi konsumsi daya masih `Pm_eff = Pm + Pm_gov` — setpoint dihitung **dua kali**. Terverifikasi dengan integrasi numerik (repo ini, 20 Sep 2026), tiga skenario semuanya OOS:

- Klik "Island Mode" pada Pm=0.8 → δ melewati 33.000° pada t=40 s
- Preset "Grid vs Island" → OOS pada t≈24 s (fitur demo andalan rusak)
- RLR 24-jam → OOS pada jam 9.3 (sore, peak load)

Perilaku yang benar: **`Pm_gov` (output governor) adalah daya mekanik efektif saat governor aktif; `s.Pm` hanyalah setpoint-nya.** Jangan menambahkannya.

Hasil uji varian perbaikan (integrasi mandiri, 80 s sim):

| Varian | Island steady state | grid→island | preset grid_island |
|--------|--------------------|-------------|--------------------|
| `current` (shipped) | δ=93.430° OOS | OOS | OOS |
| `revert` (hapus s.Pm dari servo) | stabil, Pm_eff=0 (governor mati) | stabil | stabil — tapi Pm_eff=0, salah |
| **`asOutput` (Pm_eff = Pm_gov saat gov aktif)** | **stabil, Pm_eff=0.800** | **stabil, Δδ≈0.2°** | **stabil** |

## Yang harus diubah

1. Di `ode()`: saat `gov` aktif, `Pm_eff = Math.min(Math.max(Pm_gov,0),3.5)` (bukan `Pm + Pm_gov`). Saat `gov` tidak aktif, `Pm_eff = Math.min(Math.max(s.Pm,0),3.5)`.
2. Samakan konsistensi di **semua** tempat yang menghitung `Pm_eff` dari `s.Pm + s.Pm_gov` (`stepPhys`, `autoNarr`, `updateCards`, `updateHdr`, `updateSvgPhasor`, `updateSvgPdelta`, `updateParticles`) — pertimbangkan satu helper `getPmEff(s)` supaya tidak ada tempat yang lupa.
3. Bumpless transfer: saat masuk island/RLR dari grid, inisialisasi `S.Pm_gov = S.Pm` (dan `S.Xg = S.Pm`) agar Pm_eff tidak lompat dari 0.
4. Perbaiki juga akar "governor mati di grid mode": `d_Xg = -Xg/0.05` pada grid membuat governor di-decay-kan; itu memang by-design untuk grid (Pm langsung), tapi dokumentasikan komentar secukupnya.

## Acceptance criteria

- [ ] Klik "Island Mode" pada Pm=0.8, Ef=1.5, X'd=1.2, H=8, D=4 → generator stabil (|δ|<90° selamanya, Pm_eff → 0.8 pu dalam ~15 s)
- [ ] Preset "Grid vs Island" dijalankan sampai selesai (28 s) → tidak pernah muncul banner OOS, δ tetap < 90°
- [ ] RLR dijalankan sampai tuntas 36 detik → tidak ada OOS pada jam beban puncak
- [ ] Semua tempat yang menghitung Pm_eff memakai satu helper yang sama (grep `Pm + s.Pm_gov` / `Pm+Pm_gov` menghasilkan 0 hit di jalur fisika)
- [ ] Bumpless: berpindah grid→island tanpa mengubah slider, |Δδ| saat transisi < 2°
- [ ] Tes baru (pola ekstraksi seperti `reactive-power.test.js`) mengintegrasikan `ode()`+`rk4()` asli dari HTML selama 80 s dan menggagalkan build jika steady state menyimpang (Pm_eff ≠ Pm setpoint lebih dari 0.02 pu)
