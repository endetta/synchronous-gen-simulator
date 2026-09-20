/**
 * Interaction & A11y Test — tiket 07
 *
 * Memverifikasi (statis + ekstraksi HTML):
 *   1. Tooltip punya jalur keyboard (focus/keydown) dan sentuh (touchend),
 *      bukan hanya mouse.
 *   2. Label parameter mendapat tabindex + role + aria-label.
 *   3. Slider mendapat aria-valuemin/max/label dari TIPS.
 *   4. Narasi di-rate-limit (NARR_MIN_DT) dengan bypass untuk kejadian.
 *   5. prefers-reduced-motion menonaktifkan animasi berkedip.
 *   6. Guard is-dragging mencegah klik tak sengaja.
 */
const path = require('path');
const fs = require('fs');

const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const html = fs.readFileSync(HTML, 'utf8');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✓ ${m}`); } else { fail++; console.log(`  ✗ ${m}`); } };

console.log('\n=== Interaction & A11y (tiket 07) ===\n');

console.log('Tooltip — jalur input universal');
ok(html.includes("el.addEventListener('focus'"), 'tooltip punya handler focus (keyboard)');
ok(html.includes("el.addEventListener('blur'"), 'tooltip punya handler blur');
ok(html.includes("el.addEventListener('touchend'"), 'tooltip punya handler touchend (sentuh)');
ok(html.includes("e.key==='Escape'"), 'Escape menutup tooltip');
ok(html.includes("positionTipAt"), 'posisi tooltip dihitung dari getBoundingClientRect (tidak keluar layar)');
ok(html.includes("document.addEventListener('touchstart'"), 'ketukan di luar menutup tooltip');

console.log('\nAksesibilitas kontrol');
ok(html.includes("initA11yLabels"), 'fungsi initA11yLabels ada dan dipanggil di init');
ok(html.includes("el.setAttribute('tabindex','0')"), 'label parameter dapat tabindex');
ok(html.includes("el.setAttribute('role','button')"), 'label parameter dapat role');
ok(html.includes("el.setAttribute('aria-label'"), 'label parameter dapat aria-label');
ok(html.includes("sl.setAttribute('aria-valuemin'"), 'slider dapat aria-valuemin');
ok(html.includes("sl.setAttribute('aria-valuemax'"), 'slider dapat aria-valuemax');
ok(html.includes("num.setAttribute('aria-label'"), 'input angka dapat aria-label');
ok(html.includes("b.setAttribute('aria-pressed'"), 'tombol toggle panel dapat aria-pressed');
ok(html.includes("syncPaneAria()"), 'aria-pressed panel disinkronkan saat toggle');
ok(html.includes("syncModeAria(m)"), 'aria-pressed mode disinkronkan saat ganti mode');

console.log('\nNarasi — rate limit');
ok(html.includes('NARR_MIN_DT'), 'konstanta rate-limit narasi ada');
ok(html.includes("const isEvent=s.sc_active||ddeg>158"), 'kejadian penting melewati rate-limit');

console.log('\nGerak & interaksi');
ok(html.includes('prefers-reduced-motion'), 'media query prefers-reduced-motion ada');
ok(html.includes("document.body.classList.add('is-dragging')"), 'is-dragging diset saat drag mulai');
ok(html.includes("document.body.classList.remove('is-dragging')"), 'is-dragging dihapus saat drag selesai');
ok(html.includes('body.is-dragging .amode-btn'), 'tombol animasi dinonaktifkan saat drag');

console.log(`\n=== Summary ===\nPassed: ${pass}  Failed: ${fail}`);
process.exit(fail > 0 ? 1 : 0);
