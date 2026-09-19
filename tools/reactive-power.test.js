/**
 * Reactive Power Test — Synchronous Generator Simulator
 * Validasi daya reaktif (Q), apparent power (S), dan power factor (pf)
 *
 * Usage: node tools/reactive-power.test.js
 *
 * Berbeda dari model.test.js (yang menyalin ulang rumus ke dalam file tes),
 * tes ini MENGESKTRAK fungsi langsung dari HTML sumber kebenaran lalu
 * membandingkannya dengan nilai acuan independen. Dengan begitu tes benar-benar
 * gagal bila fungsi belum ada / rumusnya salah.
 *
 * Ref: Kundur (1994) §11.1; PRD §2.2
 */

const fs = require('fs');
const path = require('path');

const R2D = 180 / Math.PI;

// ================================================================
// Test utilities
// ================================================================
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    console.log(`  ✗ ${message}`);
  }
}

function assertClose(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    passCount++;
    console.log(`  ✓ ${message} (Δ=${diff.toExponential(2)})`);
  } else {
    failCount++;
    console.log(`  ✗ ${message} (expected=${expected}, actual=${actual}, Δ=${diff.toExponential(2)})`);
  }
}

// ================================================================
// Ekstraksi fungsi dari HTML — sumber kebenaran, bukan salinan
// ================================================================
const htmlPath = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const html = fs.readFileSync(htmlPath, 'utf-8');

/**
 * Ambil body fungsi `function name(...)` dari source dengan menyeimbangkan kurung.
 * Melempar error bila fungsi tidak ditemukan — itulah sinyal RED.
 */
function extractFunction(src, name) {
  const marker = `function ${name}(`;
  const start = src.indexOf(marker);
  if (start === -1) throw new Error(`Fungsi '${name}' tidak ditemukan di HTML`);

  const braceStart = src.indexOf('{', start);
  if (braceStart === -1) throw new Error(`Body fungsi '${name}' tidak ditemukan`);

  let depth = 0;
  for (let i = braceStart; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`Kurung fungsi '${name}' tidak seimbang`);
}

/** Bangun fungsi dari HTML. Gagal keras bila belum diimplementasikan. */
function buildFromHtml(names) {
  const src = names.map((n) => extractFunction(html, n)).join('\n');
  // eslint-disable-next-line no-new-func
  return new Function(`${src}\nreturn {${names.join(',')}};`)();
}

// ================================================================
// State fixture — nilai default simulator (PRD §3.2/§3.3)
// ================================================================
function makeState(overrides) {
  return Object.assign(
    { Ef: 1.5, V: 1.0, Xs: 1.2, Pm: 0.8, delta: 0.694738, sc_active: false, sc_Pfact: 0.04 },
    overrides || {}
  );
}

console.log('\n=== Reactive Power Tests ===\n');

// ================================================================
// Slice 1: Tegangan terminal & identitas refactor getPmax
// ================================================================
console.log('Test 1: Tegangan Terminal Vt');
try {
  const M = buildFromHtml(['getVt']);
  const s_norm = makeState();
  const s_fault = makeState({ sc_active: true });

  assertClose(M.getVt(s_norm), 1.0, 1e-12, 'Vt = V saat tidak ada gangguan');
  assertClose(M.getVt(s_fault), 0.04, 1e-12, 'Vt = V·sc_Pfact saat gangguan');
  assertClose(M.getVt(makeState({ sc_active: true, sc_Pfact: 0.5 })), 0.5, 1e-12,
    'Vt mengikuti sc_Pfact yang diubah');
} catch (e) {
  failCount++;
  console.log(`  ✗ getVt dapat diekstrak dari HTML — ${e.message}`);
}

console.log('\nTest 2: Identitas Refactor getPmax (regresi)');
try {
  const M = buildFromHtml(['getVt', 'getPmax']);

  // Rumus LAMA: Ef*V/Xs, dikali sc_Pfact saat fault
  const rumusLama = (s) => {
    const Xs_safe = Math.max(s.Xs, 0.01);
    return s.sc_active ? (s.Ef * s.V / Xs_safe) * s.sc_Pfact : s.Ef * s.V / Xs_safe;
  };

  const kasus = [
    { nama: 'default', s: makeState() },
    { nama: 'fault k=0.04', s: makeState({ sc_active: true }) },
    { nama: 'fault k=0.5', s: makeState({ sc_active: true, sc_Pfact: 0.5 }) },
    { nama: 'Xs ekstrem rendah', s: makeState({ Xs: 0.05 }) },
    { nama: 'Ef rendah', s: makeState({ Ef: 0.1 }) },
  ];

  kasus.forEach(({ nama, s }) => {
    assertClose(M.getPmax(s), rumusLama(s), 1e-12, `getPmax identik dgn rumus lama — ${nama}`);
  });

  // Xs=0 harus dijaga guard, bukan Infinity/NaN
  const s_nol = makeState({ Xs: 0 });
  assert(Number.isFinite(M.getPmax(s_nol)), 'getPmax tetap finite saat Xs=0 (guard)');
} catch (e) {
  failCount++;
  console.log(`  ✗ getPmax dapat diekstrak dari HTML — ${e.message}`);
}

// ================================================================
// Slice 2: Daya reaktif Q = Vt·(E'·cos δ − Vt)/X'd   (Kundur §11.1)
// ================================================================
console.log('\nTest 3: Daya Reaktif Q — nilai acuan aljabar');
try {
  const M = buildFromHtml(['getVt', 'getPmax', 'getQe']);

  // Q = Vt(Ef·cos δ − Vt)/Xs, dihitung tangan dari aljabar (bukan dari kode)
  assertClose(M.getQe(makeState({ delta: 0 })), 0.416666666667, 1e-9,
    'Q(δ=0, Ef=1.5) = V(Ef−V)/X = 0.41667 pu');
  assertClose(M.getQe(makeState({ delta: 0, Ef: 0.5 })), -0.416666666667, 1e-9,
    'Q(δ=0, Ef=0.5) = −0.41667 pu (underexcited)');

  // Titik operasi default simulator
  assertClose(M.getQe(makeState({ delta: 0.694498265627 })), 0.127135302282, 1e-9,
    'Q di δ₀ default = +0.12714 pu');

  // Titik operasi preset Overexcitation (awal lead, akhir lag berat)
  assertClose(M.getQe(makeState({ delta: 0.803802318933, Ef: 1.0, Pm: 0.6 })), -0.255021614237, 1e-9,
    'Q preset Overexcitation AWAL = −0.25502 pu (leading)');
  assertClose(M.getQe(makeState({ delta: 0.368267893437, Ef: 2.0, Pm: 0.6 })), 0.721587171959, 1e-9,
    'Q preset Overexcitation AKHIR = +0.72159 pu (lagging)');
} catch (e) {
  failCount++;
  console.log(`  ✗ getQe dapat diekstrak dari HTML — ${e.message}`);
}

console.log('\nTest 4: Q — properti & edge case');
try {
  const M = buildFromHtml(['getVt', 'getPmax', 'getQe']);

  // Unity pf: Q = 0 saat Ef·cos δ = Vt
  const dU = 0.764992832711;   // tan δ = P·X/V²
  const EfU = 1.386217876093;  // Ef = V/cos δ
  assertClose(M.getQe(makeState({ delta: dU, Ef: EfU })), 0, 1e-12,
    'Q = 0 pada kondisi unity power factor');

  // Simetri: Q bergantung pada cos δ, jadi δ dan −δ memberi Q sama
  assertClose(M.getQe(makeState({ delta: 0.5 })), M.getQe(makeState({ delta: -0.5 })), 1e-12,
    'Q simetris terhadap δ (fungsi cos)');

  // δ=90° → cos δ = 0 → Q = −Vt²/Xs (murni menyerap)
  assertClose(M.getQe(makeState({ delta: Math.PI / 2 })), -(1.0 * 1.0) / 1.2, 1e-12,
    'Q(δ=90°) = −Vt²/Xs = −0.83333 pu');

  // Xs=0 → guard, harus finite
  assert(Number.isFinite(M.getQe(makeState({ Xs: 0 }))), 'Q tetap finite saat Xs=0 (guard)');
} catch (e) {
  failCount++;
  console.log(`  ✗ getQe properti dapat diuji — ${e.message}`);
}

// ================================================================
// Slice 3: Konsistensi P–Q saat gangguan (alasan utama refactor Vt)
// ================================================================
console.log('\nTest 5: Konsistensi P–Q saat gangguan');
try {
  const M = buildFromHtml(['getVt', 'getPmax', 'getQe']);
  const df = 40 / R2D;

  // Saat fault, P dan Q HARUS sama-sama kolaps (Vt = 0.04)
  assertClose(M.getPmax(makeState({ sc_active: true, delta: df })) * Math.sin(df), 0.032139380484, 1e-9,
    'Pe saat gangguan = 0.03214 pu (kolaps)');
  assertClose(M.getQe(makeState({ sc_active: true, delta: df })), 0.036968888823, 1e-9,
    'Qe saat gangguan = 0.03697 pu (ikut kolaps, BUKAN 0.1242)');

  // Pembanding: tanpa pemodelan Vt, Q di δ yang sama nyaris tak berubah
  const qTanpaVt = 1.0 * (1.5 * Math.cos(df) - 1.0) / 1.2;
  assertClose(qTanpaVt, 0.124222220565, 1e-9, '(kontrol) Q tanpa pemodelan Vt = 0.12422 pu');
  assert(M.getQe(makeState({ sc_active: true, delta: df })) < qTanpaVt / 3,
    'Q saat gangguan jauh lebih kecil dari Q pra-gangguan (konsisten dgn Pe)');
} catch (e) {
  failCount++;
  console.log(`  ✗ Konsistensi P–Q dapat diuji — ${e.message}`);
}

// ================================================================
// Slice 4: Apparent power S & power factor
// ================================================================
console.log('\nTest 6: Apparent Power S = √(P² + Q²)');
try {
  const M = buildFromHtml(['getVt', 'getPmax', 'getPe', 'getQe', 'getS']);

  assertClose(M.getS(makeState({ delta: 0.694498265627 })), 0.810039125652, 1e-9,
    'S default = 0.81004 pu');
  assertClose(M.getS(makeState({ delta: 0.803802318933, Ef: 1.0 })), 0.651947868873, 1e-9,
    'S Overexcitation awal = 0.65195 pu');
  assertClose(M.getS(makeState({ delta: 0.368267893437, Ef: 2.0 })), 0.938449810451, 1e-9,
    'S Overexcitation akhir = 0.93845 pu');

  // Unity pf → S = |P|
  assertClose(M.getS(makeState({ delta: 0.764992832711, Ef: 1.386217876093 })), 0.8, 1e-9,
    'S = |P| pada unity pf');

  // S selalu ≥ |P| dan ≥ |Q|
  const s_uji = makeState({ delta: 1.1 });
  assert(M.getS(s_uji) >= Math.abs(M.getPe(s_uji)) - 1e-12, 'S ≥ |P|');
  assert(M.getS(s_uji) >= Math.abs(M.getQe(s_uji)) - 1e-12, 'S ≥ |Q|');
} catch (e) {
  failCount++;
  console.log(`  ✗ getS dapat diekstrak dari HTML — ${e.message}`);
}

console.log('\nTest 7: Power Factor pf = P/S & sifat lagging/leading');
try {
  const M = buildFromHtml(['getVt', 'getPmax', 'getPe', 'getQe', 'getS', 'getPF', 'getPFNature']);

  assertClose(M.getPF(makeState({ delta: 0.694498265627 })), 0.987606616355, 1e-9,
    'pf default = 0.98761');
  assertClose(M.getPF(makeState({ delta: 0.803802318933, Ef: 1.0 })), 0.920318983537, 1e-9,
    'pf Overexcitation awal = 0.92032');
  assertClose(M.getPF(makeState({ delta: 0.368267893437, Ef: 2.0 })), 0.639352252319, 1e-9,
    'pf Overexcitation akhir = 0.63935');

  assertClose(M.getPF(makeState({ delta: 0.764992832711, Ef: 1.386217876093 })), 1, 1e-9,
    'pf = 1 pada unity power factor');

  // Sifat pf ditentukan tanda Q
  assert(M.getPFNature(makeState({ delta: 0.694498265627 })) === 'lag',
    'Q>0 → pf lagging (overexcited)');
  assert(M.getPFNature(makeState({ delta: 0.803802318933, Ef: 1.0 })) === 'lead',
    'Q<0 → pf leading (underexcited)');
  assert(M.getPFNature(makeState({ delta: 0.764992832711, Ef: 1.386217876093 })) === 'unity',
    'Q≈0 → pf unity');

  // S≈0 → pf tak terdefinisi, jangan NaN
  const s_mati = makeState({ Ef: 1.0, delta: 0 });
  const pf_mati = M.getPF(s_mati);
  assert(Number.isFinite(pf_mati), 'pf finite saat S≈0 (tidak NaN)');

  // pf selalu dalam [0,1] — termasuk saat generator motoring (δ<0, P<0)
  let pfDiLuar = null;
  for (let d = -1.4; d <= 1.4; d += 0.1) {
    const pf = M.getPF(makeState({ delta: d }));
    if (!(pf >= 0 && pf <= 1)) { pfDiLuar = `δ=${d.toFixed(2)} pf=${pf}`; break; }
  }
  assert(pfDiLuar === null, `pf selalu dalam [0,1] untuk δ ∈ [−1.4, 1.4]${pfDiLuar ? ' — gagal di ' + pfDiLuar : ''}`);
} catch (e) {
  failCount++;
  console.log(`  ✗ getPF/getPFNature dapat diekstrak dari HTML — ${e.message}`);
}

// ================================================================
// Slice 5: Wiring UI — elemen DOM & integrasi state
// ================================================================
console.log('\nTest 8: Elemen DOM daya reaktif');
const domIds = [
  ['hq', 'Header stat: Q Output'],
  ['sc_q', 'Kartu status: Q Output'],
  ['sc_pf', 'Kartu status: pf / S'],
];
domIds.forEach(([id, desc]) => {
  assert(html.includes(`id="${id}"`), `${desc} (id="${id}")`);
});

console.log('\nTest 9: Integrasi Q ke state & riwayat');
assert(/pushHistory\(s\.hist,\{[^}]*Qe[^}]*\}/.test(html) || /hist\.push\(\{[^}]*Qe/.test(html),
  'Riwayat (hist) menyimpan Qe untuk grafik');
assert(html.includes("getElementById('hq')"), 'updateHdr menulis ke #hq');
assert(html.includes("getElementById('sc_q')"), 'updateCards menulis ke #sc_q');
assert(html.includes("getElementById('sc_pf')"), 'updateCards menulis ke #sc_pf');
assert(/label:'Qe'/.test(html), 'Dataset Qe terpasang di grafik daya');
assert(/qValues/.test(html), 'Skala grafik menyertakan qValues');

// ================================================================
// Slice 6: Narasi preset Overexcitation menyebut Q
// ================================================================
console.log('\nTest 10: Narasi preset Overexcitation mengungkap Q');
const narasi = [...html.matchAll(/\bn:(["'])((?:(?!\1).)*)\1/g)].map((m) => m[2]);
const narasiOverexc = narasi.filter((n) => /Ef[=→]/.test(n));

assert(narasiOverexc.length >= 3, `Ada >=3 narasi preset Overexcitation (ditemukan ${narasiOverexc.length})`);
assert(narasiOverexc.some((n) => /lead|leading/i.test(n)),
  'Narasi awal menyebut kondisi LEADING (underexcited) — temuan baru dari fitur Q');
assert(narasiOverexc.some((n) => /Q\s*[=−+]/.test(n) || /\bQ\b.*pu/i.test(n)),
  'Narasi menyebut nilai Q');

// Nilai Q tiap tahap preset harus cocok dengan model
try {
  const M = buildFromHtml(['getVt', 'getPmax', 'getPe', 'getQe', 'getS', 'getPF', 'getPFNature']);
  const tahap = [
    { Ef: 1.0, delta: 0.803802318933, Q: -0.2550, nat: 'lead' },
    { Ef: 1.5, delta: 0.500654712405, Q: 0.2633, nat: 'lag' },
    { Ef: 2.0, delta: 0.368267893437, Q: 0.7216, nat: 'lag' },
  ];
  tahap.forEach(({ Ef, delta, Q, nat }) => {
    const s = makeState({ Ef, delta, Pm: 0.6 });
    assertClose(M.getQe(s), Q, 5e-5, `Preset Ef=${Ef}: Q=${Q} pu`);
    assert(M.getPFNature(s) === nat, `Preset Ef=${Ef}: sifat ${nat}`);
  });
} catch (e) {
  failCount++;
  console.log(`  ✗ Nilai Q tahap preset dapat diverifikasi — ${e.message}`);
}

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Total:  ${passCount + failCount}`);

if (failCount > 0) {
  process.exit(1);
}
