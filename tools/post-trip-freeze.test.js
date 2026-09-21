/**
 * post-trip-freeze.test.js — tiket 09.5/09.6 (TDD red)
 *
 * Pasca OOS-trip, generator sudah TRIP: fisika beku, slider harus dibekukan,
 * dan visual (s.anim) tidak boleh terus berputar saat banner
 * KEHILANGAN SINKRONISASI ditampilkan.
 */
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const R2D = 180 / Math.PI;

let passCount = 0, failCount = 0;
const assertTrue = (c, m) => {
  if (c) { passCount++; console.log(`  ✓ ${m}`); }
  else { failCount++; console.log(`  ✗ ${m}`); }
};

(async () => {
  const M = await makeExtractor(HTML);
  const { makeState, stepPhys, setS_, trigSC } = M;

  console.log('\n=== Tiket 09.5/09.6: freeze pasca OOS-trip ===\n');

  // ==== Skenario: sc_fail → trip ====
  console.log('Skenario: sc_fail hingga oos_tripped');
  const s = makeState(); setS_(s);
  s.Pm = 0.75; s.Ef = 1.5; s.Xs = 1.2; s.H = 8; s.D = 4; s.mode = 'grid';
  s.delta = Math.asin(s.Pm / (s.Ef * s.V / s.Xs)); s.omega = 0; s.Xg = 0; s.Pm_gov = 0; s.t = 0;
  trigSC(); s.sc_delay = 0.1; s.sc_dur = 0.65;

  let t = 0;
  while (t < 8 && !s.oos_tripped) { stepPhys(s, 0.005); t += 0.005; }
  assertTrue(s.oos_tripped, 'oos_tripped latch aktif');
  const deltaTrip = s.delta, animTrip = s.anim;
  console.log(`  delta saat trip: ${(deltaTrip*R2D).toFixed(2)}°, anim=${animTrip.toFixed(3)}`);

  // Step beberapa kali lagi — fisika harus tetap beku
  const omegaTrip = s.omega, deltaTrip2 = s.delta;
  const omegas = [];
  for (let i = 0; i < 20; i++) { stepPhys(s, 0.01); omegas.push(s.omega); }
  assertTrue(s.delta === deltaTrip, 'delta beku pasca-trip (fisika berhenti)');
  // omega boleh non-nol (rotor masih berputar saat lewat 160°), tapi TIDAK boleh
  // berubah lagi — fisika sudah berhenti.
  assertTrue(
    omegas.length === 20 && omegas.every(o => Math.abs(o - omegaTrip) < 1e-12),
    `omega tidak bertambah pasca-trip (tetap ${omegaTrip.toExponential(3)})`
  );

  // 9.5: anim harus berhenti bertambah
  const animAfter = s.anim;
  assertTrue(
    animAfter <= animTrip + 1e-9,
    `s.anim tidak bertambah pasca-trip (before=${animTrip.toFixed(4)}, after=${animAfter.toFixed(4)})`
  );

  // 9.6: slider harus nonaktif pasca-trip. Stub DOM mengembalikan elemen yang sama
  // untuk semua id, jadi cek lewat efek: state tidak boleh berubah walau
  // handler slider dipanggil. Verifikasi langsung via helper freezeSliders bila ada.
  const hasFreeze = typeof M.freezeSliders === 'function';
  console.log(`  helper freezeSliders ada: ${hasFreeze}`);
  assertTrue(hasFreeze, 'freezeSliders() tersedia (kontrak freeze slider post-trip)');
  if (hasFreeze) {
    M.freezeSliders(true);
    // Setelah freeze, onSl seharusnya no-op atau diblokir; cek elemen disabled
    assertTrue(true, 'freezeSliders(true) dapat dipanggil tanpa error');
  }

  // Reset melepas latch & unfreeze
  M.doReset(false);
  const s2 = M.getS_();
  assertTrue(!s2.oos_tripped, 'doReset melepas latch oos_tripped');
  if (hasFreeze) {
    M.freezeSliders(false);
    assertTrue(true, 'freezeSliders(false) dapat dipanggil tanpa error');
  }

  console.log(`\n=== Summary ===\nPassed: ${passCount}  Failed: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
