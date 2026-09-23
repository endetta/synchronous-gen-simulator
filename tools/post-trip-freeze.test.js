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

  // 9.3: narasi terakhir harus mengabarkan TRIP, bukan pesan fase fault yang basi.
  // autoNarr() hanya berjalan di dalam blok HSTEP stepPhys, yang berhenti setelah
  // trip — jadi tanpa penulisan narasi di jalur trip, teks terakhir tetap
  // "FAULT AKTIF. ..." milik event yang sudah selesai.
  assertTrue(/trip/i.test(s.narr), `narasi pasca-trip menyebut TRIP (narr="${s.narr}")`);
  assertTrue(!/fault aktif/i.test(s.narr), `narasi bukan lagi pesan fase fault (narr="${s.narr}")`);
  // Badge SC harus padam: sc_active false agar updateHdr mencabut kelas 'on'
  assertTrue(s.sc_active === false, 'sc_active false pasca-trip (badge SC padam)');
  assertTrue(s.eac_phase === 'done' || s.eac_phase === 'post', `eac_phase bukan 'fault' lagi (got ${s.eac_phase})`);
  assertTrue(s.evts.length === 0, 'evts scenario dikosongkan saat trip (tidak ada event lanjutan)');

  // 9.5: anim harus berhenti bertambah
  const animAfter = s.anim;
  assertTrue(
    animAfter <= animTrip + 1e-9,
    `s.anim tidak bertambah pasca-trip (before=${animTrip.toFixed(4)}, after=${animAfter.toFixed(4)})`
  );

  // 9.6: guard slider. Uji PERILAKU: pasca-trip, handler slider tidak boleh
  // memutasi state fisika; sebelum trip, harus memutasi. Ini butuh stub DOM
  // yang mengembalikan elemen berbeda per-id (extract.js default mengembalikan
  // satu elemen yang sama untuk semua id).
  const { mkEl } = require('./extract');
  const els = {};
  const elFor = (id) => (els[id] ||= mkEl());
  global.document.getElementById = (id) => elFor(id);

  // Pasca-trip: onSl('If', {value:'2.500'}) harus DITOLAK — S.If/Eaf tidak berubah.
  const fakeEl = (v) => ({ value: v, min: '0.2', max: '3', style: { setProperty() {} } });
  const efBefore = s.Ef, ifBefore = s.If;
  M.onSl('If', fakeEl('2.500'));
  assertTrue(s.Ef === efBefore && s.If === ifBefore, `onSl ditolak pasca-trip (If/Eaf tetap ${ifBefore}/${efBefore})`);
  // adjSl juga harus ditolak.
  const efBefore2 = s.Ef, ifBefore2 = s.If;
  M.adjSl('If', 1);
  assertTrue(s.Ef === efBefore2 && s.If === ifBefore2, `adjSl ditolak pasca-trip (If/Eaf tetap ${ifBefore2}/${efBefore2})`);

  // Reset melepas latch & unfreeze, lalu handler harus bekerja lagi
  M.doReset(false);
  const s2 = M.getS_();
  assertTrue(!s2.oos_tripped, 'doReset melepas latch oos_tripped');

  // Sebelum trip (state baru): kontrol If memutakhirkan If dan E_af turunan.
  const efFresh = s2.Ef;
  M.onSl('If', fakeEl('2.500'));
  assertTrue(s2.If === 2.5 && s2.Ef > efFresh, `onSl bekerja normal saat tidak trip (If ${s2.If}, E_af ${efFresh} → ${s2.Ef})`);

  console.log(`\n=== Summary ===\nPassed: ${passCount}  Failed: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
