# 03: Verdict EAC sesuai teks buku: A₁ ≤ A₂ tersedia

**What to build:** Kartu EAC dan narasi memberi angka-angka yang konsisten — area yang digambar di kurva P-δ sama dengan angka di kartu, dan verdict (STABIL / TIDAK STABIL) memakai kriteria buku teks, bukan faktor ×0.8. Preset `sc_success` → STABIL; `sc_fail` → TIDAK STABIL.

**Blocked by:** 01 (governor harus stabil dulu supaya transient simulasi dapat dipercaya). *Berjalan paralel dengan 02* — tidak perlu menunggu seam, hanya butuh angka yang benar.

**Status:** ready-for-agent

## Latar (bukti terverifikasi)

Kriteria EAC buku teks (Kundur 1994 §11.2): sistem stabil jika area deselerasi **tersedia** ≥ area akselerasi, di mana A₂ tersedia diintegrasikan sampai rotor mencapai δ_max pertama kali (kecepatan nol pertama setelah clearing):

```
A₁ = ∫_{δ₀}^{δ_clear} (Pm − Pe_fault) dδ
A₂(δ_max) = ∫_{δ_clear}^{δ_max} (Pe_post − Pm) dδ        ← hentikan di kecepatan nol pertama
STABIL ⇔ A₂(δ_max) ≥ A₁
```

Kode saat ini:
- HTML line 584–587: A₂ terus mengakumulasi selamanya (`s.eac_phase==='post' && s.delta > s.delta_cleared`) — tidak ada batas δ_max.
- HTML line 652 & 687: verdict `A2_num >= A1_num*0.8` — faktor 0.8 menyembunyikan ketimpangan.
- Terukur (integrasi mandiri, 20 Sep 2026) pada kasus `sc_success` (Pm=0.5, Ef=1.5, X'd=1.2, SC 0.15 s): A₁=0.0496 (sim) vs 0.0561 (analitik); A₂=0.1085 (sim) vs 1.1242 (analitik maksimal) — faktor 0.8 membuatnya lolos, tapi angka kartu tidak dapat dipertanggungjawabkan.

## Yang harus diubah

1. **Henti A₂ pada δ_max pertama**: di `stepPhys()`, ketika `eac_phase==='post'` dan `omega` melewati nol ke negatif (rotor mencapai puncak swing pertama), stop integrasi A₂ dan set `eac_phase='done'`. Jangan biarkan A₂ berubah setelahnya — kecuali SC baru memicu (reset ke 'none'/'fault').
2. **Koreksi verdict**: ganti `>= A1_num*0.8` menjadi `>= A1_num` (atau beri toleransi numerik kecil seperti `*1.02` untuk round-off RK4, bukan `*0.8`). Dokumentasikan perbedaannya.
3. **Konsistensi visual = angka**: area A₂ yang digambar di `updateSvgPdelta()` (line 1462–1485) sampai titik yang sama di mana integrasi berhenti; label kartu (line 687–691) menggunakan angka yang sama.

## Acceptance criteria

- [ ] `sc_success` preset → kartu EAC: A₁≈0.056, A₂≈0.9–1.1 (sampai δ_max), verdict **STABIL (A₂≥A₁)**, tidak ada faktor 0.8
- [ ] `sc_fail` preset → A₁ > A₂ maksimal, verdict **TIDAK STABIL**
- [ ] Setelah SC clear dan sistem bergoyang kembali ke equilibrium, angka A₂ di kartu dan narasi **berhenti berubah** (tidak terus tumbuh)
- [ ] Area A₂ di kurva P-δ visual berakhir pada titik yang sama di mana angka berhenti
- [ ] Tes baru: integrasikan A₁/A₂ via `stepPhys` (dengan seam ekstraksi HTML) selama satu SC cycle; bandingkan A₁ terhadap nilai analitik ∫(Pm−Pe_fault)dδ dalam toleransi 2% — gagalkan build bila meleset
- [ ] Tes: verdict STABIL/TIDAK STABIL benar untuk minimal 3 kombinasi Pm/Ef/sc_dur yang berbeda