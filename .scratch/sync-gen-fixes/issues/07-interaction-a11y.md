# 07: Interaksi & aksesibilitas (tooltip sentuh/keyboard, narasi non-kedip)

**What to build:** Simulator bisa dipakai dari touchpad/tablet (tanpa mouse hover), keyboard, dan pengguna yang sensitif terhadap animasi berlebihan. Tooltip muncul via tap/focus, narasi tidak mengganti teks 100×/detik, dan kontrol animasi tidak bisa tertindih saat drag panel.

**Blocked by:** None (can start immediately) — UI polish, tidak menyentuh fisika.

**Status:** ready-for-agent

## Latar (bukti statis)

- Tooltip `tools/lens-harness.js` dan HTML line 2571–2588: hanya `mouseenter` + `mousemove` + `mouseleave`. **Tidak ada** `focus`/`blur`/`click`/`touchend`. Akibat: (a) tablet user tidak pernah melihat tooltip penjelasan fisika; (b) keyboard-only & screen reader user buta total.
- Narasi `autoNarr()` dipanggil di `stepPhys()` setiap batch fisika (HTML line 605). Pada 60 Hz loop itu = ~100+ update/detik. Efek: teks berubah–berubah kenceng.
- `.amode-btn` (Fasor / Realistis toggle) ditempatkan di `position:absolute; top:6px; right:10px` dalam panel SVG (line 137–140). Saat pengguna drag `.drag-handle` di pane yang sama, tombol tetap aktif dan bisa diklik secara tidak sengaja.
- Tidur: kontrol slider `input[type=number]` — tidak ada `aria-label`, `aria-valuenow`, atau `role=spinbutton` yang eksplisit. Slider range `input[type=range]` juga buta aksen.

## Yang harus diubah

1. **Tooltip universal:** ubah listener agar menangani `focus`/`blur` dan `touchend` (preventDefault double-tap), bukan hanya mouse. Pindahkan posisi dengan `getBoundingClientRect` relatif ke viewport, bukan `clientX/Y` kasar yang kadang keluar layar. Pastikan `<span class="sllbl" data-tip="…">` memiliki `aria-describedby` yang merujuk ke elemen deskripsi tersembunyi.
2. **Debounce narasi:** batasi `autoNarr` ke maks 2 Hz. Implementasi ringan: simpan `s._narr_ts`; jika `s.t - s._narr_ts < 0.5` dan state belum berubah drastis (ganti `sc_active`, masuk `post`, dekat `d_cr`), jangan update `narr`.
3. **Guard drag interaction:** saat `.drag-handle` `mousedown`, tambahkan kelas `.is-dragging` pada `<body>` dan gunakan CSS `#is-dragging .amode-btn { pointer-events: none; opacity: 0.5; }` — atau pindahkan tombol animasi ke `hdr-right` sehingga tidak pernah tumpang-tumpuk dengan drag handle.
4. **Aksen aksesibilitas minimum:**
   - `input[type=number]` dapat `aria-label` yang diisi dari label `<label>`.
   - Slider: tambahkan `aria-valuemin/aria-valuenow/aria-valuemax/aria-label`.
   - Panel-toggle tombol: `aria-pressed` + `aria-expanded` pada pane yang dikontrol.
5. Hapus efek berkelip berlebihan (`#oos-warn` `animation: oog .5s step-end infinite` bisa dipersenjatai prefers-reduced-motion via `@media (prefers-reduced-motion: reduce)`).

## Acceptance criteria

- [ ] Pada tablet/desktop sentuh: menekan satu kali pada label parameter (mis. "H — Inertia Constant") menampilkan tooltip; ketukan kedua atau tap di luar menutupnya
- [ ] Keyboard: fokus pada elemen parameter (`Tab`), tekan `Enter` atau `Space` → tooltip muncul; `Escape` → nutup. (Verifikasi dengan DevTools Accessibility pane / a11y tree)
- [ ] Narasi tidak berubah lebih dari 2×/detik pada simulasi transien (periksa via `MutationObserver` selama 5 s)
- [ ] Pada saat drag handle sedang aktif, `.amode-btn` tidak dapat diklik (`pointer-events: none`)
- [ ] `@media (prefers-reduced-motion: reduce)` hadir; `oog`/`oog` animation di-suppress
- [ ] `npm run test` (ui.test.js) lolos — tambah asersi aksesibilitas baru (aria attributes ada pada slider/input)
- [ ] Audit Lighthouse a11y skor ≥ 80 (atau setidaknya tidak ada error "aria-*" yang melanggar dan button tidak memiliki accessible name)
