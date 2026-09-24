# FEM Medium Continuation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Selesaikan FEM medium hingga FINAL: jam visual τ tunggal (rotor+stator sinkron, island ∝ 1+ω), kontrol `I_f`/kutub/kecepatan visual, kurva P-δ salient di Panel II, legenda realistis penuh, dan seluruh suite tes hijau.

**Architecture:** Lanjutan dari HEAD `87368c7` + stash WIP (patch visualisasi FEM: magnet batangan, label counter-rotated, solver-cache, slot/kumparan per kutub — di-restore sebagai Step 0). Empat area kerja independen: (1) jam visual `S.animT`/`S.visSpeed`/`advanceVisualClock` menggantikan `S.anim`/`wE*S.t` di jalur realistis, (2) kontrol UI baru (`#poleCount`, `#sIf`, `#visSpeed`) dengan migrasi penuh slider `Ef`→`I_f`, (3) kurva P-δ Panel II memakai `getPeSal`, (4) legend realistis penuh. Fisika salient sudah ter-wire di HEAD (`getPe()/getQe()/ode()/EAC` route ke varian salient via `hasOwnProperty('poleCount')`) — TIDAK diubah.

**Tech Stack:** Vanilla JavaScript di `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`; test harness Node (`tools/extract.js`, source-slice tests); tanpa build, tanpa dependency baru.

**Spec:** `docs/superpowers/specs/2026-09-22-fem-medium-realistic-generator-design.md` (keputusan user mengikat; kriteria selesai §10)

## Global Constraints

- **Step 0 (WAJIB sebelum tarea 1):** `git stash pop` — restore patch WIP FEM (updates `realistic-field.test.js` 43→54 assertion, HTML +111/−67). Verifikasi: `node tools/realistic-field.test.js` → `Passed: 54  Failed: 0`; lalu `git stash list` kosong. Bila konflik stash: STOP, laporkan, jangan paksa resolve.
- Bahasa Indonesia untuk UI, komentar, narasi, commit; istilah teknis (swing equation, OCC, saliency, RMF) tetap English.
- `S.Ef` TIDAK dihapus — tetap derived field (`setIf` isi `s.If` + `s.Ef = getEaf(s.If)`).
- `updateSvgPhasor()` klasik (jalur fasor) TETAP memakai `S.anim` — jangan migrasi jalur fasor, hanya jalur realistis.
- Tidak ada `Date.now()` di jalur realistis (`initSvgRealistic`/`updateSvgPhasorRealistic`/`buildFluxPath`/`rebuildFluxPaths`/`buildCoilPath`/`buildCurrentMarker`).
- Fluks TIDAK mengerut saat `sc_active` — jangan menambahkan percabangan `sc_active` di jalur fluks.
- `realistic-field.test.js` memaksa tepat SATU `setAttribute('d')` di `updateSvgPhasorRealistic` (busur δ) — jangan menambah writer `d` di jalur update.
- Nama file HTML tidak berubah. Commit hanya repo ini, hanya file task terkait.
- Run tes fokus sebelum tiap commit, lalu perintah regresi task tersebut.

## Review Focus

- **Island mode saat ω negatif:** `advanceVisualClock` memakai `(1 + s.omega)`; ω bisa < 0 (deselerasi) — `(1+ω)` bisa ≈ 0 atau negatif kecil. Harus TETAP deterministik dan non-negatif visual (clamp `Math.max(0, 1+ω)` — ω tidak pernah < −1 dalam model ini karena fisika break di δ=±160°, tapi jaga).
- **Slider `I_f` pasca-trip:** setelah OOS trip (slider beku), `onSl('If')`/`numSl('If')`/`adjSl('If')` harus ditolak (guard `slidersFrozen()`), dan `#poleCount`/`#visSpeed` ikut frozen. Setelah `doReset()`, kontrol aktif kembali dan `S.If`/readout `E_af` kembali ke default.
- **Dropdown kutub saat simulasi jalan:** mengubah `poleCount` di tengah jalan mengubah `Xq`/saliency → d0/dcr/dcc Panel II berubah; harus `realInit=false`/`phasorReady=false` agar SVG realistis dibangun ulang, TANPA mereset fisika (jangan `doReset`).
- **`visSpeed` ≠ frekuensi fisika:** dropdown kecepatan hanya mengubah `S.visSpeed`; `S.t`/fisika/`hist`/chart frekuensi tidak tersentuh.
- **Legenda tidak boleh berbohong:** item legenda harus sesuai elemen yang benar-benar digambar (magnet, d/q, air gap, RMF, fluks, belitan, busur δ) + warning penyederhanaan eksplisit (spec §5.5).

---

### Step 0: Restore stash WIP FEM

**Files:**
- Modify: (via git) `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`, `tools/realistic-field.test.js`

- [ ] **Step 1: Restore stash**

```bash
git stash pop
```

Expected: working tree kembali ke status pra-stash (HTML + `tools/realistic-field.test.js` termodifikasi), `git stash list` kosong.

- [ ] **Step 2: Verifikasi baseline pasca-restore**

```bash
node tools/realistic-field.test.js
```

Expected: `Passed: 54  Failed: 0`. Bila gagal: STOP dan laporkan (patch WIP mungkin tidak sinkron dengan HEAD).

- [ ] **Step 3: (tidak commit — patch WIP akan di-commit bersama tarea yang menyentuhnya)**

---

### Task 1: Jam visual τ (S.animT + visSpeed + advanceVisualClock)

**Files:**
- Create: `tools/visual-sync.test.js`
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (`makeState`, `stepPhys`, `updateSvgPhasorRealistic`)
- Modify: `tools/extract.js` (tambah `advanceVisualClock` ke `names` + `REQUIRED`)
- Modify: `tools/realistic-field.test.js` (Test 7: `wE*S.t` → `S.animT`; hapus assertion `F0` di jalur realistis kalau tak lagi terpakai)

**Interfaces:**
- Consumes: `S.mode`, `S.omega`, `rdt`
- Produces: `advanceVisualClock(s, rdt)`; `makeState` mengembalikan `animT: 0`, `visSpeed: 1`; `updateSvgPhasorRealistic` memakai `S.animT` (bukan `S.anim`/`wE*S.t`)

- [ ] **Step 1: Tulis tes jam visual (red)**

```js
// tools/visual-sync.test.js
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
let failed = 0;
const close = (a, e, tol, m) => { if (Math.abs(a - e) <= tol) console.log(`  ✓ ${m}`); else { failed++; console.log(`  ✗ ${m}: got ${a} expected ${e}`); } };
const ok = (c, m) => { if (c) console.log(`  ✓ ${m}`); else { failed++; console.log(`  ✗ ${m}`); } };

(async () => {
  const { makeState, advanceVisualClock } = await makeExtractor(HTML);
  const s = makeState();
  close(s.animT, 0, 1e-12, 'state dimulai dengan animT = 0');
  close(s.visSpeed, 1, 1e-12, 'kecepatan visual default 1 Hz');

  s.mode = 'grid'; s.omega = 0.2; s.visSpeed = 1;
  advanceVisualClock(s, 1);
  close(s.animT, 2 * Math.PI, 1e-9, 'grid: jam visual mengabaikan omega (1 siklus per detik)');

  s.mode = 'island'; s.omega = 0.2;
  advanceVisualClock(s, 1);
  close(s.animT, 2 * Math.PI + 2 * Math.PI * 1.2, 1e-9, 'island: jam visual mengikuti 1+omega');

  s.omega = -0.2;
  advanceVisualClock(s, 0.5);
  close(s.animT, 2 * Math.PI * 2.2 + 2 * Math.PI * 0.8 * 0.5, 1e-9, 'island dengan omega negatif tetap maju');

  const src = require('fs').readFileSync(HTML, 'utf8');
  if (src.includes("Date.now()")) { failed++; console.log('  ✗ Date.now() masih ada di file'); }
  if (failed) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Jalankan dan verifikasi red**

Run: `node tools/visual-sync.test.js`

Expected: FAIL — `makeExtractor` melontarkan `SEAM GAGAL: fungsi berikut tidak ditemukan ... advanceVisualClock` (belum ada di HTML dan di REQUIRED).

- [ ] **Step 3: Implementasi jam visual**

Di blok konstanta/state near `makeState` (setelah `solveField`, sebelum `makeState`), tambahkan:

```js
// Jam visual τ — SATU jam untuk semua elemen waktu-visual mode Realistis
// (rotor, RMF, dot/cross, denyut kumparan). Terpisah dari waktu fisika S.t
// dan dari S.anim (jam phasor klasik). Determininistik: fungsi rdt, bukan
// Date.now(). Kecepatan visual hanya mengubah tampilan; frekuensi fisika
// tetap 50 Hz. Mode island ikut (1 + omega) — percepatan/deselerasi terlihat.
function advanceVisualClock(s, rdt){
  const island = s.mode === 'island' ? Math.max(0, 1 + (s.omega || 0)) : 1;
  s.animT += 2 * Math.PI * (s.visSpeed || 1) * rdt * island;
}
```

Di `makeState`, tambah field (di samping `anim:0`):

```js
anim:0, animT:0, visSpeed:1,
```

Di `stepPhys`, ganti blok `if(!s.oos_tripped){ s.anim+=VSPD*rdt; ... }` menjadi:

```js
if(!s.oos_tripped){
  s.anim+=VSPD*rdt;
  if(s.anim>Math.PI*2)s.anim-=Math.PI*2;
  advanceVisualClock(s, cap);
}
```

(cap = rdt yang sudah di-clamp di `stepPhys` — satu panggilan per step, sama seperti `s.anim`.)

Di `updateSvgPhasorRealistic`:
- `const base=S.animT-Math.PI/2;` (ganti `S.anim`)
- Blok dot/cross: `const iFasa=Math.sin(S.animT - f*2*Math.PI/3);`
- Blok denyut: `const iFasa=Math.abs(Math.sin(S.animT - pi*2*Math.PI/3));`
- Hapus `const wE=2*Math.PI*F0;` dan komentar lama yang menyebut 50 Hz di jalur ini (pindahkan penjelasan ke komentar jam τ).
- Loop penanda 6 tetap: `for(let i=0;i<6;i++)` — jumlah marker per fasa tidak terkait jumlah kutub (marker di posisi kumparan dibangun di `initSvgRealistic`).

Update Test 7 di `tools/realistic-field.test.js`:

```js
ok(realFns.includes('S.animT'), 'arah arus memakai jam visual τ');
ok(!realFns.includes('wE*S.t'), 'tidak ada lagi kecepatan 50 Hz terpisah di jalur realistis');
ok(!realFns.includes('Date.now()'), 'tidak ada Date.now() di fungsi mode realistis');
```

(Hapus assertion lama `realFns.includes('wE*S.t')` dan, bila `F0` tak lagi dipakai jalur realistis, hapus atau ganti assertion `F0` dengan `S.visSpeed`.)

Tambahkan ke `tools/extract.js` names dan REQUIRED: `'advanceVisualClock'`.

- [ ] **Step 4: Jalankan tes fokus + regresi**

Run: `node tools/visual-sync.test.js && node tools/realistic-field.test.js && node tools/fem-field-solver.test.js && node tools/fem-saliency.test.js`

Expected: semua PASS (`visual-sync` hijau, `realistic-field` tetap 54 ✓ setelah assertion dimigrasi).

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/extract.js tools/visual-sync.test.js tools/realistic-field.test.js
git commit -m "$(cat <<'EOF'
feat(fem): satu jam visual τ untuk mode realistis

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Kontrol UI — I_f, kutub, kecepatan visual (migrasi penuh)

**Files:**
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (section control; TIPS; `applyControlValue`/`controlValue`; `freezeSliders`; `doReset`; `drawRealisticLegend` n/a)
- Modify: `tools/ui.test.js` (assert nEf/sEf → nIf/sIf; tambah assertion kontrol baru)
- Modify: `tools/post-trip-freeze.test.js` (blok `onSl('Ef')` → `onSl('If')`)

**Interfaces:**
- Consumes: `setIf`, `S.poleCount`, `S.visSpeed`
- Produces: `#poleCount` (select 2/4/6/8), `#sIf`/`#nIf` (slider/input I_f 0.2–3 default 1) + readout `#eafRo`, `#visSpeed` (select 0.25/0.5/1/2), handler konek ke `applyControlValue`

- [ ] **Step 1: Update tes (red)**

Di `tools/ui.test.js`, ganti Test 7 (Ef):

```js
assertContains(html, 'id="nIf"', 'If parameter input');
assertContains(html, 'id="sIf"', 'If parameter slider');
assertContains(html, 'id="eafRo"', 'E_af derived readout');
```

Tambahkan di akhir suite:

```js
console.log('\nTest 18: FEM Controls');
assertContains(html, 'id="poleCount"', 'pole-count selector exists');
assertContains(html, "<option value=\"2\">2", 'pole option 2');
assertContains(html, "<option value=\"8\">8", 'pole option 8');
assertContains(html, 'id="visSpeed"', 'visual-speed selector exists');
assertContains(html, '<option value="0.25">', 'visSpeed 0.25 option');
assertContains(html, '<option value="2">2', 'visSpeed 2 option');
assertContains(html, 'data-tip="If"', 'tooltip key If');
assertContains(html, "if(key==='If') setIf(S,value)", 'applyControlValue migrates to setIf');
```

Di `tools/post-trip-freeze.test.js`, ganti blok kontrol lama:

```js
// Sebelum: onSl('Ef') ... getEaf → onSl('If') ... s2.If
```

(Sesuaikan assertion agar memakai `onSl('If', ...)` dan mengecek `s2.If` + `s2.Ef = getEaf(s2.If)`; `doReset` lalu `onSl('If', 2.5)` → `S.If = 2.5`.)

- [ ] **Step 2: Jalankan dan verifikasi red**

Run: `node tools/ui.test.js && node tools/post-trip-freeze.test.js`

Expected: FAIL pada assertion baru (element/string belum ada).

- [ ] **Step 3: Implementasi kontrol**

Section HTML — ganti blok `<!-- Excitation -->`:

```html
<!-- Machine -->
<div class="csec">
  <div class="stitle">Machine <span style="font-size:9px;color:var(--dim);font-weight:400;letter-spacing:0;text-transform:none">saliency &amp; OCC saturation</span></div>
  <div class="slg">
    <div class="slhdr"><span class="sllbl">Jumlah Kutub</span><select id="poleCount" onchange="onPoleChange(this)" style="margin-left:8px;background:var(--surf);color:var(--amber);border:1px solid var(--brd2);border-radius:2px;font-family:var(--mono);font-size:12px;padding:2px 4px"><option value="2" selected>2</option><option value="4">4</option><option value="6">6</option><option value="8">8</option></select></div>
  </div>
</div>
<!-- Excitation -->
<div class="csec">
  <div class="stitle">Excitation (AVR) · <span style="color:var(--dim);font-weight:400">E<sub>af</sub> = <span id="eafRo">1.000</span> pu</span></div>
  <div class="slg">
    <div class="slhdr"><span class="sllbl" data-tip="If">If — Field Current</span><div class="sl-val-row"><button class="sl-adj" onclick="adjSl('If',-1)">▾</button><input class="sl-num" id="nIf" type="number" value="1.000" step="0.001" min="0.2" max="3" onchange="numSl('If',this)"><span class="sl-unit">pu</span><button class="sl-adj" onclick="adjSl('If',1)">▴</button></div></div>
    <input type="range" id="sIf" min="0.2" max="3" step="0.001" value="1" oninput="onSl('If',this)">
    <div style="font-size:11px;color:var(--dim);font-style:italic;font-family:var(--body)">I_f → OCC (saturasi) → E_af → Pmax. Knee ≈ 1.0 pu, asimtot 1.55 pu.</div>
  </div>
</div>
```

Dropdown kecepatan visual — di Panel I, sisi toggle `.anim-mode-toggle` (baris sekitar 205-208):

```html
<div class="anim-mode-toggle">
  <button class="amode-btn active" id="amode-phasor" onclick="setAnimMode('phasor')">Fasor</button>
  <button class="amode-btn" id="amode-realistic" onclick="setAnimMode('realistic')">Realistis</button>
  <select id="visSpeed" title="Kecepatan visual (fisika tetap 50 Hz)" onchange="onVisSpeed(this)" style="margin-left:6px;background:var(--surf);color:var(--dim);border:1px solid var(--brd2);border-radius:3px;font-size:9px;font-weight:700;letter-spacing:1px;padding:2px 4px"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select>
</div>
```

JS — handler dropdown dan migrasi control:

```js
function onPoleChange(el){
  if(slidersFrozen()){ el.value = S.poleCount; return; }
  S.poleCount = +el.value;
  setIf(S, S.If);          // refresh derived E_af (saturasi sama, jaga konsistensi)
  phasorReady = false;     // SVG phasor klasik dibangun ulang
  realInit = false;        // SVG realistis dibangun ulang (slot/magnet/kumparan baru)
}
function onVisSpeed(el){
  if(slidersFrozen()){ el.value = S.visSpeed; return; }
  S.visSpeed = +el.value;  // HANYA visual — output fisika tetap 50 Hz
}
```

`applyControlValue` dan `controlValue` — migrasi penuh (hapus shim Ef):

```js
function applyControlValue(key,value){
  if(key==='If') { setIf(S,value); const r=document.getElementById('eafRo'); if(r) r.textContent=getEaf(S.If).toFixed(3); }
  else S[key]=value;
}
function controlValue(key){ return key==='If' ? S.If : S[key]; }
```

`freezeSliders` — tambah kontrol baru:

```js
function freezeSliders(frozen){
  ['sH','sD','sXs','sPm','sIf','nH','nD','nXs','nPm','nIf','poleCount','visSpeed'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.disabled=frozen;
  });
  document.querySelectorAll('.sl-adj').forEach(b=>{ b.disabled=frozen; });
}
```

`doReset` — sync kontrol baru:

```js
['sH','sD','sXs','sPm','sIf','poleCount','visSpeed'].forEach(id=>{const el=document.getElementById(id); if(el) el.value = (id==='visSpeed'||id==='poleCount') ? (id==='poleCount'?2:S.visSpeed) : (id==='sIf'?S.If:el.value);});
```

(ganti baris `['sH','sD','sXs','sPm','sEf'].forEach(id=>updTrack(...))` — pakai `updTrack` untuk slider, dan set `value` untuk select.)

TIPS — ganti `Ef:{...}` dengan:

```js
If:{title:'If — Field Current',unit:'pu',
    range:'0.2–3.0 pu | knee OCC ≈ 1.0 pu',
    desc:'Arus medan eksitasi. Tegangan internal turunannya E_af = OCC(I_f): saturasi non-linear (tanh, asimtot 1.55 pu). (Kundur, 1994 §3.2)',
    effect:'If naik → E_af naik (melengkung di atas knee) → Pmax naik → kurva P-δ lebih tinggi → δ₀ lebih kecil → margin EAC lebih besar. Di atas knee, kenaikan If tidak lagi linear menaikkan E_af.'},
```

Update `makeState` — baca kontrol If dari slider (migrasi penuh; hapus `const If = 1.0;` hard-code):

```js
const If = parseValidNumber(document.getElementById('sIf').value, 1.0, 0.2, 3, 'Field Current If');
```

Periksa ulang pemakai `sEf`/`nEf` yang tersisa (grep `sEf|nEf|'Ef'` di HTML; `SCENARIOS` sudah pakai `uiSl('If',...)`, `TIPS` diubah, tooltip label `data-tip` diubah; `applyControlValue` shim Ef dihapus).

- [ ] **Step 4: Regresi lengkap**

Run: `node tools/ui.test.js && node tools/post-trip-freeze.test.js && node tools/model.test.js && node tools/reactive-power.test.js && node tools/eac-verdict.test.js && node tools/governor-steady-state.test.js && node tools/oos-trip.test.js && node tools/rlr-handoff.test.js && node tools/eac-snapshot.test.js`

Expected: semua PASS. `reactive-power.test.js` memakai `getEaf`/`getQeSal` (tidak menyentuh kontrol) → aman.

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/ui.test.js tools/post-trip-freeze.test.js
git commit -m "$(cat <<'EOF'
feat(ui): kontrol I_f, jumlah kutub, dan kecepatan visual (migrasi penuh)

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Kurva P-δ salient di Panel II

**Files:**
- Create: `tools/pdelta-curve-salient.test.js`
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (`updateSvgPdelta`, `EAC_TIPS`)
- Test: `tools/pdelta-curve-salient.test.js`, `tools/pdelta-label-layout.test.js`

**Interfaces:**
- Consumes: `getPeSal`, `getPmaxSal`, `getMachineXq`, `solveDelta0/Cr/Cc`
- Produces: kurva `#pd-curve` = `getPeSal(d, Pmax, Xd, Xq, V)`; kurva fault `#pd-fault` = `getPeSal(d, Pmax_f, ...)`; area A1/A2 dan titik operasi pakai `getPeSal`; tooltip dcr/dcc/d0 menjelaskan varian numerik

- [ ] **Step 1: Tulis tes (red)**

```js
// tools/pdelta-curve-salient.test.js
const fs = require('fs');
const path = require('path');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const src = fs.readFileSync(HTML, 'utf8');
let failed = 0;
const ok = (c, m) => { if (c) console.log(`  ✓ ${m}`); else { failed++; console.log(`  ✗ ${m}`); } };

const upd = src.slice(src.indexOf('function updateSvgPdelta'), src.indexOf('function initSvgPdelta') < 0 ? src.indexOf('function updateSvgPdelta') + 14000 : src.indexOf('function initSvgPdelta'));
const mainCurve = upd.slice(upd.indexOf("// Main curve"), upd.indexOf('// Pm line'));
const a2Sect = upd.slice(upd.indexOf('A₂'), upd.indexOf('Acceleration arrow'));
const tips = src.slice(src.indexOf('const EAC_TIPS'), src.indexOf('};', src.indexOf('const EAC_TIPS')));

ok(mainCurve.includes('getPeSal'), 'kurva utama memakai persamaan salient');
ok(!/Pmax\*Math\.sin\(d\)/.test(mainCurve), 'kurva utama tidak lagi sin murni (round-rotor)');
ok(upd.includes('getPeSal(d, Pmax_f'), 'kurva fault memakai getPeSal dengan Pmax_f');
ok(a2Sect.includes('getPeSal'), 'area A2 memakai persamaan salient');
ok(upd.includes('getPeSal(dc2'), 'titik operasi memakai persamaan salient');
ok(tips.includes('numerik'), 'tooltip δ_cr/dcc menyebut varian numerik (salient)');
if (failed) process.exit(1);
```

- [ ] **Step 2: Jalankan dan verifikasi red**

Run: `node tools/pdelta-curve-salient.test.js`

Expected: FAIL pada assertion `getPeSal` di kurva (masih `Pmax*Math.sin(d)`).

- [ ] **Step 3: Implementasi**

Di `updateSvgPdelta` (baris 1913-1918 dsb), ganti:

```js
// Main curve — persamaan salient penuh; p=1 (round rotor) lenyap ke Pmax·sin δ.
let cpts=''; for(let d=0;d<=Math.PI;d+=0.006) cpts+=(d===0?'M':'L')+sx(d)+','+sy(getPeSal(d,Pmax,S.Xs,Xq,S.V))+' ';
```

(dengan `Xq` sudah didefinisikan di atas: `const Xq=getMachineXq(S)`.)

Kurva fault (baris ~1951):

```js
let fp=''; for(let d=0;d<=Math.PI;d+=0.01) fp+=(d===0?'M':'L')+sx(d)+','+sy(getPeSal(d,Pmax_f,S.Xs,Xq,S.V))+' ';
```

Area A2 (baris ~1973):

```js
for(let d=dc;d<=de;d+=0.02){const p=getPeSal(d,Pmax,S.Xs,Xq,S.V);a2+=` L${sx(d)},${p>Pm_eff?sy(p):sy(Pm_eff)}`;}
```

Label A2 (baris ~1976): `const la2=(dc+de)/2,pm2=getPeSal(la2,Pmax,S.Xs,Xq,S.V);`

Titik operasi (baris ~1985):

```js
const opx=parseFloat(sx(dc2)),opy=parseFloat(sy(getPeSal(dc2,Pmax,S.Xs,Xq,S.V)));
```

`EAC_TIPS` — perbarui dcr/dcc/d0 agar jujur untuk salient:

```js
dcr:{title:'δ_cr — Critical Angle',
     desc:'Titik pertama setelah δ₀ di mana Pe TURUN melewati Pm (dP/dδ < 0). Untuk round rotor (2 kutub): δ_cr = π − δ₀. Untuk mesin salient (4/6/8 kutub): diselesaikan numerik — selalu ≤ π − δ₀.'},
dcc:{title:'δ_cc — Critical Clearing Angle',
     desc:'Sudut maksimum saat SC boleh di-clear agar EAC terpenuhi: A₁(δ_cc) = A₂(δ_cc) — integrasi numerik. Round rotor: bentuk tertutup Kundur eq.11.13.'},
d0:{title:'δ₀ — Initial Equilibrium Angle',
     desc:'Sudut daya steady-state di cabang stabil (dP/dδ > 0). Round rotor: δ₀ = arcsin(Pm/Pmax). Salient: akar numerik P(δ) = Pm.'},
```

- [ ] **Step 4: Jalankan fokus + regresi**

Run: `node tools/pdelta-curve-salient.test.js && node tools/pdelta-label-layout.test.js && node tools/eac-verdict.test.js && node tools/model.test.js`

Expected: PASS semua. Label layout tidak berubah (margin/offset sama; hanya bentuk kurva).

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/pdelta-curve-salient.test.js
git commit -m "$(cat <<'EOF'
feat(viz): kurva P-δ salient di Panel II dengan tip jujur

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Legend realistis penuh

**Files:**
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (`drawRealisticLegend`)
- Modify: `tools/realistic-field.test.js` (tambah assertion legenda)

**Interfaces:**
- Consumes: tidak ada (statis)
- Produces: legenda berisi magnet batangan N/S, sumbu-d/q, air gap, RMF, fluks, belitan A/B/C, busur δ, + warning penyederhanaan (spec §5.5)

- [ ] **Step 1: Tes (red)**

Append di `tools/realistic-field.test.js` (setelah Test 11, sebelum summary):

```js
sect('Test 12: Legenda realistis lengkap');
const legend = fn('drawRealisticLegend');
ok(legend.includes('Magnet batangan'), 'legenda menyebut magnet batangan');
ok(legend.includes('Sumbu-d'), 'legenda menyebut sumbu-d');
ok(legend.includes('Sumbu-q'), 'legenda menyebut sumbu-q');
ok(legend.includes('air gap'), 'legenda menyebut air gap');
ok(legend.includes('RMF'), 'legenda menyebut RMF');
ok(legend.includes('Belitan stator'), 'legenda menyebut belitan stator');
ok(legend.includes('Busur'), 'legenda menyebut busur δ');
ok(legend.includes('Penyederhanaan'), 'warning penyederhanaan ada');
ok(legend.includes('BUKAN mesh FEM'), 'warning menyebut bukan FEM mesh');
```

- [ ] **Step 2: Jalankan dan verifikasi red**

Run: `node tools/realistic-field.test.js`

Expected: FAIL hanya pada Test 12 (legenda lama 5 item tanpa magnet/air gap/warning).

- [ ] **Step 3: Implementasi legenda**

Ganti `drawRealisticLegend` items:

```js
const items=[
  {label:'Garis fluks (rapat ∝ B(I_f), solver medan)',color:'#2f6fb0'},
  {label:'RMF stator (medan 3-φ berputar)',color:'#30a060'},
  {label:'Belitan stator fasa A / B / C',color:'#c85000'},
  {label:'Magnet batangan rotor — N (biru) / S (merah)',color:'#0068d8'},
  {label:'Sumbu-d rotor (sejajar belitan medan, kutub N)',color:'#d84000'},
  {label:'Sumbu-q rotor (90° elektrik di depan d)',color:'#3a6818'},
  {label:'Air gap',color:'#c0c8d8'},
  {label:'Busur δ — sudut daya (sama dengan Panel II)',color:'#a86000'},
];
```

Dan di akhir (setelah loop items), tambah warning baris multi-line:

```js
svg.appendChild(mkSvg('text',{x:legendX,y:legendY+items.length*16+14,'font-size':10,'fill':'#808898','font-family':'var(--body)'},
  '⚠ Penyederhanaan: medan sinusoidal dgn saturasi amplitudo + armature reaction')); 
svg.appendChild(mkSvg('text',{x:legendX,y:legendY+items.length*16+26,'font-size':10,'fill':'#808898','font-family':'var(--body)'},
  'superposisi; BUKAN mesh FEM. Saturasi = kurva tanh, bukan OCC terukur.'));
```

Catatan: `legendY` awal = `h-104` — dengan 8 item + 2 baris warning, sesuaikan `legendY = h - (8*16 + 34)` agar tidak keluar SVG. Verifikasi `initSvgRealistic` memanggil `drawRealisticLegend(svg,w,h)` (sudah ada).

- [ ] **Step 4: Jalankan fokus + regresi**

Run: `node tools/realistic-field.test.js && node tools/visual-sync.test.js && node tools/ui.test.js`

Expected: PASS (realistic-field 54 + Test 12 baru).

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/realistic-field.test.js
git commit -m "$(cat <<'EOF'
feat(viz): legenda realistis lengkap + warning penyederhanaan

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Gate penuh, log sesi, push

**Files:**
- Create: `design-plans/sesi-2026-09-23-01-fem-medium-final.md`
- (tidak ada file produk baru)

**Interfaces:**
- Consumes: semua tarea 1-4 + Step 0
- Produces: log sesi + cabang ter-push

- [ ] **Step 1: Gate penuh**

```bash
node tools/fem-saturation.test.js && node tools/pole-geometry.test.js && node tools/fem-saliency.test.js && node tools/fem-field-solver.test.js && node tools/realistic-field.test.js && node tools/visual-sync.test.js && node tools/pdelta-curve-salient.test.js && node tools/model.test.js && node tools/eac-verdict.test.js && node tools/eac-snapshot.test.js && node tools/governor-steady-state.test.js && node tools/oos-trip.test.js && node tools/reactive-power.test.js && node tools/rlr-handoff.test.js && node tools/post-trip-freeze.test.js && node tools/ui.test.js && node tools/chart-scale.test.js && node tools/xaxis-stability.test.js && node tools/xaxis-sliding-window.test.js && node tools/chart-smoothing.test.js && node tools/anim-mode-toggle.test.js && node tools/time-series-render.test.js && node tools/pdelta-label-layout.test.js && node tools/timeseries-title-clearance.test.js && node tools/time-series-resize.test.js && node tools/pane-resize-controls.test.js && node tools/freq-chart-alignment.test.js 2>/dev/null; echo "GATE_FEM_EXIT:$?"
npm test
```

Expected: semua `Exit: 0` (freq-chart-alignment butuh Puppeteer — jika gagal karena lingkungan, catat di log sebagai "belum dijalankan (butuh Chrome)", jangan hitung sebagai kegagalan implementasi). Periksa `tools/shots/report.txt` bila shoot dijalankan.

- [ ] **Step 2: Smoke test manual checklist di browser (bila sesi interaktif)**

- [ ] Tombol "Realistis": magnet batangan 2/4/6/8 kutub, label N/S/d/q tegak
- [ ] Switch kutub 2→8 saat simulasi jalan: slot/kumparan/RMF berubah, fisika tidak reset
- [ ] Slider I_f 1.0→3.0: `E_af` readout naik melengkung (knee), fluks realistis makin rapat
- [ ] Dropdown kecepatan 0.25×/1×/2×: kecepatan putar berubah, chart frekuensi tetap 50 Hz
- [ ] Island + grid: kecepatan visual island mengikuti ω
- [ ] SC berhasil/gagal: fluks tidak mengerut saat fault; pasca-trip semua kontrol (termasuk poleCount/visSpeed) beku

- [ ] **Step 3: Tulis log sesi**

`design-plans/sesi-2026-09-23-01-fem-medium-final.md` — isi per template: tanggal, waktu mulai/selesai, commit sebelum (`87368c7`), tujuan, kegiatan & hasil (tiap tarea + hasil tes + hash commit), status plan terkait (plan 2026-09-22 fisika/visualisasi + plan ini → SELESAI), langkah berikutnya (PR fix/critical-governor-and-bugs → master, sinkronkan overview.md/README).

- [ ] **Step 4: Commit log + push**

```bash
git add design-plans/sesi-2026-09-23-01-fem-medium-final.md
git commit -m "$(cat <<'EOF'
docs(sesi): FEM medium final — gate penuh hijau

Co-Authored-By: Claude Code <noreply@anthropic.com>
EOF
)"
git push origin fix/critical-governor-and-bugs
```

Expected: `git status` bersih, cabang tersinkron dengan origin.

---

## Kriteria Selesai (spec §10) — pemetaan ke tarea

| Kriteria | Tarea |
|---|---|
| Dropdown 2/4/6/8 kutub bekerja; slot/magnet/kumparan/RMF ikut | Task 2 (kontrol) + Step 0 (geometri) |
| Label d/q/N/S selalu tegak | Step 0 (sudah di stash) + T1 (jaminan animT) |
| Magnet batangan p_pole; salient untuk p≥2 | Step 0 |
| Garis fluks dari solver; kerapatan ∝ B(I_f); armature reaction memiringkan | Step 0 + T1 (brRot di opacity) |
| Saturasi I_f bekerja | HEAD (satCurve) + Task 2 (UI) |
| Pe punya suku sin 2δ; δ_cr/δ_cc/CCT numerik | HEAD (done) + Task 3 (Panel II) |
| Rotor+stator dari satu jam τ | Task 1 |
| Dropdown kecepatan visual; output fisika 50 Hz | Task 1 + Task 2 |
| Island ∝ (1+ω) | Task 1 |
| Tidak ada Date.now() di jalur realistis | Task 1 (tes) |
| Fluks tidak mengerut saat sc_active | Step 0 + Task 1 (tes) |
| Tidak ada elemen SVG tanpa entri legenda | Task 4 |
| Semua tes lama hijau / dimigrasi dgn alasan | Task 1-5 |
| tools/extract.js REQUIRED diperbarui | Task 1 (advanceVisualClock) |
