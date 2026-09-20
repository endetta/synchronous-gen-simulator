# 04: Loss of synchronism benar-benar trip

**What to build:** Ketika generator kehilangan sinkronisme (|δ| melewati 160°), fisika **benar-benar berhenti** (generator trip), banner tetap tampil sampai pengguna menekan DISMISS & RESET, dan reset mengembalikan state yang bersih. Hari ini banner bisa hilang-muncul sendiri dan fisika terus jalan sampai δ = 33.000°+.

**Blocked by:** 01 (setelah governor stabil, satu-satunya jalur ke OOS adalah SC yang benar-benar gagal — deteksi trip bisa diuji deterministik).

**Status:** ready-for-agent

## Latar (bukti terverifikasi)

- `stepPhys()` line 615–623: banner tampil saat `|δ|>160°`, tetapi **auto-hilang** saat `|δ|<2.7° && !sc_active`. Karena rotor terus berputar dan menembus rentang itu tiap putaran, banner kedip muncul-hilang tanpa aksi user — padahal simulator barusan mendeklarasikan "GENERATOR TRIP".
- Tidak ada yang menghentikan integrasi fisika. Terukur: δ mencapai 33.597° dengan banner menyala terus — "trip" hanyalah tulisan.
- `oos-dis` (DISMISS & RESET) memanggil `doReset()` — bagus — tapi jalur banner yang kedip membuatnya tidak bisa diandalkan.

## Yang harus diubah

1. **State latched**: tambahkan flag `s.oos_tripped` di state. Saat terpicu pertama kali (`|δ|>160°`), set `oos_tripped=true`, **hentikan stepPhys integrasi** (skip semua RK4 / substep loop — tapi tetap render frame supaya banner dan UI hidup), dan jangan pernah clear otomatis.
2. **Banner permanen** sampai `DISMISS & RESET` dipencet. Hapus cabang `else if(!s.sc_active && Math.abs(s.delta)<2.7)` — hanya reset yang boleh menghilangkan banner.
3. **Reset bersih**: `doReset()` menghapus `oos_tripped`, banner, overlay, alarm, dan state fisika kembali ke equilibrium (sudah sebagian ada — pastikan lengkap).
4. Pastikan RLR berhenti kalau OOS terjadi di tengah RLR (panggil `stopRLR()` atau minimal paksa `rlr_running=false` supaya tidak ada konflik state).

## Acceptance criteria

- [ ] Trigger SC dengan durasi > CCT (mis. 0.65 s pada default) → banner muncul, **fisika berhenti** (δ frozen, chart berhenti, phasor diam), banner TETAP tampil
- [ ] Banner tidak hilang dengan sendirinya dalam 60 detik observasi
- [ ] Klik DISMISS & RESET → banner hilang, δ kembali ke δ₀, semua kartu menampilkan angka equilibrium, charts dibersihkan
- [ ] OOS di tengah RLR → RLR berhenti (tombol kembali ke "Start"), state konsisten
- [ ] Tidak ada jalur code yang bisa meng-clear banner selain tombol reset (grep: hanya `doReset`/`oos-dis` yang memanggil classList.remove('show') untuk oos-warn)
- [ ] Tes: ekstrak logika trip dari HTML, verifikasi bahwa setelah `oos_tripped=true`, `stepPhys` tidak lagi mengubah δ