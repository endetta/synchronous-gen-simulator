/**
 * eac-snapshot.test.js — tiket 09.2 (TDD red dulu)
 *
 * Verdict EAC (kartu + narasi) harus memakai SNAPSHOT parameter saat clearing,
 * bukan parameter live. Kalau user menggeser slider Pm/Xs/Ef pasca-event,
 * verdict untuk event lampau TIDAK boleh berubah (fisika swing tidak terpengaruh,
 * tapi UI menyampaikan informasi yang salah tentang event yang sudah selesai).
 *
 * Fix yang diharapkan: saat eac_phase berubah fault→post (SC clear), snapshotkan
 * Pm_eff/Pmax/Xs/Ef; getA2Available memakai snapshot saat fase post/done.
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

  console.log('\n=== Tiket 09.2: verdict EAC beku pasca-event ===\n');

  // ==== Skenario A: sc_success stabil, geser slider pasca-event ====
  console.log('Skenario A: sc_success → geser Pm/Xs/Ef pasca clear');
  const s = makeState(); setS_(s);
  s.Pm = 0.5; s.Ef = 1.5; s.Xs = 1.2; s.H = 8; s.D = 4; s.mode = 'grid';
  s.delta = Math.asin(s.Pm / (s.Ef * s.V / s.Xs)); s.omega = 0; s.Xg = 0; s.Pm_gov = 0; s.t = 0;
  trigSC(); s.sc_delay = 1.0; s.sc_dur = 0.15;

  let t = 0;
  while (t < 12 && s.eac_phase !== 'done') { stepPhys(s, 0.005); t += 0.005; }
  assertTrue(s.eac_phase === 'done' || s.eac_phase === 'post', `event selesai (eac_phase=${s.eac_phase})`);

  const a2_before = M.getA2Available(s);
  const stable_before = M.eacStable(s);
  assertTrue(stable_before, `baseline verdict STABIL (A2=${a2_before.toFixed(4)}, A1=${s.A1_num.toFixed(4)})`);

  // Geser slider pasca-event (simulasi onSl/numSl — tulis langsung ke state)
  s.Pm = 0.85; s.Xs = 1.5; s.Ef = 1.0;
  const stable_after = M.eacStable(s);
  assertTrue(
    stable_after === stable_before,
    `verdict TIDAK berubah saat slider digeser pasca-event (got ${stable_after})`
  );

  // ==== Skenario B: event TIDAK STABIL tetap TIDAK STABIL walau slider "memperbaiki" ====
  console.log('\nSkenario B: geser slider pasca-event tidak bisa "menyelamatkan" verdict lama');
  // Cari kombinasi yang membuat A2 live besar (user geser Ef naik, Pm turun)
  s.Ef = 2.2; s.Pm = 0.3; s.Xs = 0.8;
  const stable_rescue = M.eacStable(s);
  assertTrue(
    stable_rescue === stable_before,
    `verdict lama tidak bisa diubah jadi STABIL oleh slider (got ${stable_rescue})`
  );

  // ==== Skenario C: event baru setelah reset HARUS pakai parameter baru ====
  console.log('\nSkenario C: event baru setelah slider digeser → verdict baru dengan parameter baru');
  const s3 = makeState(); setS_(s3);
  s3.Pm = 0.5; s3.Ef = 1.5; s3.Xs = 1.2; s3.H = 8; s3.D = 4; s3.mode = 'grid';
  s3.delta = Math.asin(s3.Pm / (s3.Ef * s3.V / s3.Xs)); s3.omega = 0; s3.Xg = 0; s3.Pm_gov = 0; s3.t = 0;
  trigSC(); s3.sc_delay = 1.0; s3.sc_dur = 0.15;
  let t3 = 0;
  while (t3 < 12 && s3.eac_phase !== 'done') { stepPhys(s3, 0.005); t3 += 0.005; }
  assertTrue(M.eacStable(s3), 'event baru tetap dinilai dengan parameter event itu (STABIL)');

  console.log(`\n=== Summary ===\nPassed: ${passCount}  Failed: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
