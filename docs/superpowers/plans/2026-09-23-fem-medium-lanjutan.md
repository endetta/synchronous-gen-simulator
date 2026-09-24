# Lanjutan FEM Medium — Kontrol UI, Jam Visual, Kurva Salient, Legenda — Implementation Plan

> **Untuk pekerja agen:** REQUIRED SUB-SKILL: pakai `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans` untuk mengimplementasikan plan ini task-by-task. Step memakai checkbox (`- [ ]`).

**Tujuan:** Menyelesaikan FEM medium hingga FINAL — kontrol `poleCount`/`I_f`/`visSpeed` berfungsi, satu jam visual τ (rotor+stator sinkron; island ∝ 1+ω), kurva P-δ Panel II dengan suku saliency, legenda realistis penuh + warning penyederhanaan, tanpa `Date.now()` di jalur realistis — tanpa regresi tes lama.

**Arsitektur:** Sebagian besar lapisan fisika FEM sudah ter-wire di HEAD `87368c7`: `getPe()/getQe()/getS()/getPF()` sudah route ke persamaan salient via `hasOwnProperty('poleCount')`; `ode()`/EAC/`updateTimeCharts`/`updateSvgPdelta`/`SCENARIOS` sudah memakai `getPeSal`/`solveDelta0/Cr/Cc/CCT`/`setIf`. Plan ini hanya mengerjakan yang **masih hilang**: (a) jam visual `S.animT` + `advanceVisualClock` + migrasi `S.anim`/`wE*S.t` di jalur realistis; (b) kontrol `#poleCount`/`#sIf`/`#visSpeed` + migrasi penuh slider `Ef`→`I_f`; (c) kurva Panel II ikut saliency; (d) legenda realistis penuh + warning; (e) gate final + log sesi.

**Tech Stack:** Vanilla JavaScript di `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`; harness tes Node via `tools/extract.js`; tanpa build, tanpa dependency baru.

**Spec:** `docs/superpowers/specs/2026-09-22-fem-medium-realistic-generator-design.md`

**Plan sebelumnya:** `docs/superpowers/plans/2026-09-22-fem-medium-physics.md` (Task 1–5 SUDAH selesai di HEAD — JANGAN diulang), `docs/superpowers/plans/2026-09-22-fem-medium-visualization.md` (Task 1–3 sudah selesai di HEAD; Task 4–6 = plan ini, disesuaikan dengan realitas HEAD).

**Keputusan user 2026-09-23:** **migrasi penuh** slider `Ef`→`I_f`; **eksekusi nativo**; **stash WIP di-restore dulu** (sebelum eksekusi).

## Global Constraints

- UI text, komentar, dokumentasi = Bahasa Indonesia; istilah teknis proteksi (saliency, OCC, RMF, air gap, sumbu-d/q, swing equation) tetap English.
- `S.Ef` **jangan dihapus** — ia derived field (diset oleh `setIf`); semua pemanggil lama yang mengisi `S.Ef` tetap valid.
- Setiap fungsi fisika baru harus murni dan bisa diekstrak `tools/extract.js`; **jangan salin rumus fisika ke file tes** (jebakan commit `2b1644c`).
- `Date.now()` **dilarang** di jalur animasi realistis (`updateSvgPhasorRealistic` + fungsi bantuannya — dijaga `realistic-field.test.js` Test 7).
- Fluks **tidak boleh menyusut** saat `sc_active` (constant flux linkage — Test 8 `realistic-field.test.js`).
- `S.animT` = fase visual dalam radian; `S.visSpeed` ∈ {0.25, 0.5, 1, 2} Hz; output fisika tetap 50 Hz.
- `S.anim` (fase lama untuk mode 'phasor') **jangan disentuh** di `updateSvgPhasor()` klasik — tetap dipakai mode fasor; hanya jalur realistis yang pindah ke `S.animT`.
- Jangan merename file HTML ataupun id yang di-hard-code oleh tes (`ui.test.js`, `realistic-field.test.js`, `pdelta-label-layout.test.js`, `pane-resize-controls.test.js`).
- Sebelum setiap commit: jalankan command regresi task tsb; sebelum setiap commit besar jalankan suite FEM + `npm test`.
- Commit hanya untuk repo ini, dari folder proyek, tanpa stage file tak terkait. Pesan commit ditutup `Co-Authored-By: Claude Code <noreply@anthropic.com>`.

---

### Task 0: Restore stash WIP FEM (sebelum eksekusi)

**Files:**
- (tanpa edit file) Bash: `git status --porcelain -uno`, `git stash list`, lalu `git stash pop`

**Interfaces:**
- Consumes: HEAD `87368c7` + stash@{0} (WIP visualisasi FEM)
- Produces: working tree = HEAD + WIP FEM; baseline tes hijau

- [ ] **Step 1: Cek status**

```bash
git status --porcelain -uno
git stash list
```

Expected: (a) working tree KOTOR dengan ` M "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html"` dan ` M tools/realistic-field.test.js` → SKIP Step 2, langsung Step 3. (b) ATAU clean + stash berisi → Step 2.

- [ ] **Step 2: Pop stash (hanya bila status clean + stash ada)**

```bash
git stash pop
```

Expected: kedua file termodifikasi muncul lagi.

- [ ] **Step 3: Baseline hijau**

```bash
node tools/realistic-field.test.js
node tools/fem-saturation.test.js
node tools/pole-geometry.test.js
node tools/fem-saliency.test.js
node tools/fem-field-solver.test.js
npm test
```

Expected: semua exit 0. `realistic-field` menampilkan ≥43 `Passed` (tergantung versi WIP; yang penting `Failed: 0`).

- [ ] **Step 4: Commit WIP ter-restore**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/realistic-field.test.js
git commit -m "feat(viz): ripristina WIP visualisasi FEM di atas HEAD 87368c7

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

Expected: commit baru berisi 2 file. Dari sini working tree bersih dan semua kerja lanjutan berjalan di atasnya.

---

### Task 1: Jam visual τ (S.animT + advanceVisualClock) + migrasi jalur realistis

**Files:**
- Create: `tools/visual-sync.test.js`
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (`makeState`, `stepPhys`, `updateSvgPhasorRealistic`)
- Modify: `tools/extract.js` (tambah `advanceVisualClock` ke `names` dan `REQUIRED`)
- Modify: `tools/realistic-field.test.js` (Test 7 — migrasi assertion `wE*S.t` → `S.animT`; langkah terakhir task ini)

**Interfaces:**
- Consumes: `S.mode`, `S.omega`, `S.visSpeed`, `rdt`
- Produces: `S.animT` (radian), `S.visSpeed` (Hz), `advanceVisualClock(state, rdt)`

- [ ] **Step 1: Tulis test yang gagal**

Isi `tools/visual-sync.test.js` (pola sama dengan tes FEM lain — harness kecil sendiri):

```js
const path = require('path');
const { makeExtractor } = require('./extract');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
let failed = 0;
const ok = (c, m) => { if (c) console.log('  ✓ ' + m); else { failed++; console.log('  ✗ ' + m); } };
const close = (a, e, t, m) => {
  if (Math.abs(a - e) <= t) console.log('  ✓ ' + m);
  else { failed++; console.log('  ✗ ' + m + ': got ' + a + ', expected ' + e); }
};

(async () => {
  const { makeState, advanceVisualClock } = await makeExtractor(HTML);
  const s = makeState();
  s.visSpeed = 1; s.mode = 'grid'; s.omega = 0.2;
  advanceVisualClock(s, 1);
  close(s.animT, 2 * Math.PI, 1e-9, 'grid clock = 2π·1 Hz·1 s (abaikan omega)');
  s.mode = 'island'; advanceVisualClock(s, 1);
  close(s.animT, 2 * Math.PI + 2 * Math.PI * 1.2, 1e-9, 'island clock mengikuti (1+omega)');
  s.visSpeed = 0.5; s.mode = 'grid'; s.animT = 0;
  advanceVisualClock(s, 1);
  close(s.animT, Math.PI, 1e-9, 'visSpeed 0.5 memperlambat fase menjadi setengah');
  if (failed) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
```

Run: `node tools/visual-sync.test.js`
Expected: FAIL — `advanceVisualClock` tidak ada di `extract.js` → pesan `SEAM GAGAL` atau `undefined is not a function`.

- [ ] **Step 2: Implementasi advanceVisualClock + state**

Di `makeState()` tambahkan dua field (setelah `animMode`):

```js
    animT: 0,          // jam visual τ (radian) — dipakai jalur realistis
    visSpeed: 1,       // kecepatan visual (Hz) — dropdown 0.25/0.5/1/2
```

Tambah fungsi baru (letakkan sebelum `function stepPhys`):

```js
// Jam visual τ — terpisah dari waktu fisika S.t dan dari fase phasor S.anim.
// Deterministis: fungsi murni dari rdt; tidak pernah Date.now(). Di island,
// laju ikut (1 + omega) sehingga percepatan frekuensi terlihat nyata.
// (spec §6.2 — grid: ×1, island: ×(1+ω))
function advanceVisualClock(s, rdt){
  const island = s.mode === 'island' ? (1 + s.omega) : 1;
  s.animT += 2 * Math.PI * s.visSpeed * rdt * island;
}
```

Di `tools/extract.js`: tambahkan `'advanceVisualClock'` ke array `names` dan ke `REQUIRED`.

- [ ] **Step 3: Jinakkan pemanggilan di stepPhys**

Di `stepPhys(s, rdt)`, setelah blok `if(!s.oos_tripped){ s.anim+=VSPD*rdt; ... }` (blok `s.anim` ini DIPERTAHANKAN untuk mode phasor), tambahkan baris:

```js
  advanceVisualClock(s, cap);
```

`cap` sudah ada di scope (`Math.min(rdt,0.08)`). Pastikan penambahan ini DI LUAR `if(!s.oos_tripped)` — jam visual ikut berhenti saat trip karena `stepPhys` di-break lebih awal (baris `if(s.oos_tripped) break;`).

- [ ] **Step 4: Migrasi updateSvgPhasorRealistic ke S.animT**

Di `updateSvgPhasorRealistic`:

1. Ganti:
```js
const base=S.anim-Math.PI/2;
```
menjadi:
```js
const base=S.animT-Math.PI/2;
```

2. Hapus `const wE=2*Math.PI*F0;` (tidak dipakai lagi) dan ganti kedua pemakaian `wE*S.t`:

Untuk dot/cross (berisi commentar "fungsi waktu simulasi S.t"):
```js
const iFasa=Math.sin(wE*S.t - f*2*Math.PI/3);
```
menjadi:
```js
const iFasa=Math.sin(S.animT - f*2*Math.PI/3);
```

Untuk denyut kumparan:
```js
const iFasa=Math.abs(Math.sin(wE*S.t - pi*2*Math.PI/3));
```
menjadi:
```js
const iFasa=Math.abs(Math.sin(S.animT - pi*2*Math.PI/3));
```

3. Update komentarnya menjadi mis. `// Arah arus di konduktor: dot/cross, fungsi jam visual τ (S.animT) — bukan Date.now()`.

Verifikasi: `grep -n "wE\*S.t\|S.animT" "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html"` — di fungsi realistis hanya ada `S.animT`, tidak ada `wE*S.t`.

- [ ] **Step 5: Perbarui realistic-field.test.js Test 7 (migrasi disengaja)**

Ubah assertion lama (baris ~122):
```js
ok(realFns.includes('wE*S.t'), 'arah arus memakai waktu simulasi S.t');
```
menjadi:
```js
ok(realFns.includes('S.animT'), 'arah arus memakai jam visual S.animT');
```

Ini MIGRASI bermotivasi (spec §6.2): jam visual menggantikan `S.t` untuk elemen visual; determinisme tetap (S.animT fungsi murni rdt).

- [ ] **Step 6: Verifikasi**

```bash
node tools/visual-sync.test.js
node tools/realistic-field.test.js
node tools/fem-saturation.test.js
```

Expected: semua PASS, `Failed: 0`.

- [ ] **Step 7: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/extract.js tools/visual-sync.test.js tools/realistic-field.test.js
git commit -m "feat(viz): jam visual tau (S.animT + advanceVisualClock), migrasi jalur realistis

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: Kontrol UI — dropdown kutub, slider I_f, dropdown visSpeed

**Files:**
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (panel kontrol, `applyControlValue`, `controlValue`, `freezeSliders`, `doReset`, `TIPS`)
- Modify: `tools/ui.test.js`

**Interfaces:**
- Consumes: `setIf`, `S.poleCount`, `S.visSpeed`
- Produces: `#poleCount` (select), `#sIf`/`#nIf` (slider+input I_f 0.2..3), `#visSpeed` (select), `#eaf-readout` (readout E_af), handler `onPoleChange`/`onVisSpeedChange`; key `'If'` diterima `applyControlValue`/`controlValue`; array freeze + reset disinkronkan

- [ ] **Step 1: Tulis assertion UI yang gagal**

Di `tools/ui.test.js`, dalam Test 7 (`Parameter Inputs`), setelah baris `id="sXs"` tambahkan:

```js
assertContains(html, 'id="poleCount"', 'Pole count selector');
assertContains(html, 'id="sIf"', 'Field current (I_f) slider');
assertContains(html, 'id="visSpeed"', 'Visual speed selector');
```

Dan dalam Test 6 (`Control Sections`), setelah `'Excitation (AVR)'`:

```js
assertContains(html, 'MESIN', 'MESIN section');
```

Run: `node tools/ui.test.js`
Expected: FAIL hanya pada assertion baru (id belum ada). Sekaligus pastikan assertion lama `id="nEf"`/`id="sEf"` MASIH LULUS — Task 3 yang akan menggantinya.

- [ ] **Step 2: Tambah HTML**

Sebelum `<!-- Generator params -->` sisipkan:

```html
<!-- MESIN -->
<div class="csec">
  <div class="stitle">MESIN <span style="font-size:9px;color:var(--dim);font-weight:400;letter-spacing:0;text-transform:none">saliency &amp; geometri kutub</span></div>
  <div style="font-family:var(--body);font-size:12.5px;color:var(--txt2);margin-bottom:8px;line-height:1.6">Jumlah kutub menentukan slot stator, magnet rotor, Xq, dan torsi reluctance. I<sub>f</sub> = arus medan (AVR) → E' = OCC(I<sub>f</sub>) dengan saturasi.</div>
  <div class="slg">
    <div class="slhdr"><span class="sllbl" data-tip="poleCount">Jumlah Kutub</span></div>
    <select id="poleCount" onchange="onPoleChange(this)" style="width:100%;padding:4px;font-family:var(--mono);font-size:12px">
      <option value="2">2 — Round Rotor (Xq = Xd)</option>
      <option value="4">4 — Salient (Xq = 0.65·Xd)</option>
      <option value="6">6 — Salient (Xq = 0.65·Xd)</option>
      <option value="8">8 — Salient (Xq = 0.65·Xd)</option>
    </select>
  </div>
  <div class="slg">
    <div class="slhdr"><span class="sllbl" data-tip="If">I<sub>f</sub> — Arus Medan (AVR)</span><div class="sl-val-row"><button class="sl-adj" onclick="adjSl('If',-1)">▾</button><input class="sl-num" id="nIf" type="number" value="1.000" step="0.001" min="0.2" max="3" onchange="numSl('If',this)"><span class="sl-unit">pu</span><button class="sl-adj" onclick="adjSl('If',1)">▴</button></div></div>
    <input type="range" id="sIf" min="0.2" max="3" step="0.001" value="1" oninput="onSl('If',this)">
    <div style="font-size:12px;color:var(--dim);font-style:italic;font-family:var(--body);margin-top:4px">E<sub>af</sub> = <span id="eaf-readout">1.0000</span> pu (hasil OCC)</div>
  </div>
</div>
```

Di Panel I, tepat setelah `<div class="anim-mode-toggle">...</div>` tambahkan:

```html
<div style="position:absolute;top:8px;right:190px;z-index:5;font-size:11px;font-family:var(--body)">
  <span style="color:var(--dim)">Kecepatan</span>
  <select id="visSpeed" onchange="onVisSpeedChange(this)" style="font-size:11px;padding:1px;color:var(--amber);font-family:var(--mono)">
    <option value="0.25">0.25 Hz</option>
    <option value="0.5">0.5 Hz</option>
    <option value="1" selected>1 Hz</option>
    <option value="2">2 Hz</option>
  </select>
</div>
```

- [ ] **Step 3: Implementasi handler + sinkronisasi**

Di JS (setelah fungsi `setAnimMode`), tambahkan:

```js
function onPoleChange(el){
  S.poleCount = +el.value || 2;
  // Geometri statis (slot, magnet, kumparan, RMF) ikut poleCount →
  // wajib rebuild SVG realistis pada frame berikutnya.
  realInit = false;
}
function onVisSpeedChange(el){
  S.visSpeed = +el.value || 1;
}
```

Di `applyControlValue`, ganti pengelolaan key:

```js
function applyControlValue(key, value){
  if(key === 'If'){ setIf(S, value); const e = document.getElementById('eaf-readout'); if(e) e.textContent = S.Ef.toFixed(4); }
  else if(key === 'Ef'){ setIf(S, value); } // shim legacy — dihapus di Task 3
  else S[key] = value;
}
```

Di `controlValue`, tambahkan:

```js
function controlValue(key){ return key === 'If' ? S.If : (key === 'Ef' ? S.If : S[key]); }
```

Catatan: untuk sementara `'Ef'` tetap dibaca sebagai `S.If` (shim); Task 3 membersihkannya.

Di `freezeSliders`, tambahkan `'sIf','nIf'` ke array:

```js
['sH','sD','sXs','sPm','sIf','nH','nD','nXs','nPm','nIf'].forEach(id=>{ ... });
```

Di `doReset`, loop `['sH','sD','sXs','sPm','sEf']` → `['sH','sD','sXs','sPm','sIf']` dan setelahnya tambahkan:

```js
  const eaf = document.getElementById('eaf-readout');
  if(eaf) eaf.textContent = S.Ef.toFixed(4);
```

Di `TIPS`, tambahkan entri `If` (setelah `Ef`):

```js
  If:{title:"I_f — Arus Medan (AVR)",unit:'pu',
      range:'Knee ~1.0 pu | Saturasi asimtot 1.55 pu',
      desc:"Arus medan generator. E' = OCC(I_f): di atas knee kurva melengkung (saturasi tanh).",
      effect:"I_f naik → E_af naik (ter-saturasi) → P_max naik → kurva P-δ lebih tinggi → margin EAC lebih besar. (Kundur 1994 §3.2)"},
```

- [ ] **Step 4: Verifikasi**

```bash
node tools/ui.test.js
node tools/realistic-field.test.js
node tools/fem-saliency.test.js
node tools/visual-sync.test.js
```

Expected: semua PASS. (Catatan: assertion lama `id="sEf"` di ui.test.js masih ada dan masih lulus — slider Ef masih di DOM sampai Task 3.)

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/ui.test.js
git commit -m "feat(ui): kontrol jumlah kutub, arus medan I_f, dan kecepatan visual

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: Migrasi penuh — hapus slider Ef legacy

**Files:**
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (hapus blok Excitation `sEf`/`nEf`; bersihkan shim di `applyControlValue`/`controlValue`/`freezeSliders`/`doReset`; hapus entri `Ef` di `TIPS`)
- Modify: `tools/ui.test.js` (ganti assertion `sEf`/`nEf` dengan `eaf-readout`)

**Interfaces:**
- Consumes: `#sIf`, `setIf`
- Produces: `#nEf`/`#sEf` TIDAK ADA lagi; `#eaf-readout` wajib ada; shim `'Ef'` dihapus; tidak ada referensi `Ef` slider tersisa di JS

- [ ] **Step 1: Ubah dulu test (red)**

Di `tools/ui.test.js` Test 7, ganti dua baris:

```js
assertContains(html, 'id="nEf"', 'Ef parameter input');
assertContains(html, 'id="sEf"', 'Ef parameter slider');
```

menjadi:

```js
assertContains(html, 'id="eaf-readout"', 'E_af derived readout');
assertContains(html, 'id="sIf"', 'Field current (I_f) slider');
```

Run: `node tools/ui.test.js`
Expected: FAIL — assertion `nEf`/`sEf` masih di HTML (belum dihapus) dan `eaf-readout`... sudah ada (Task 2) → kegagalan ada di `nEf`/`sEf` yang TIDAK BOLEH ada? Bukan: assertion ini MENUNTUT keberadaan. Karena itu urutannya: jalankan SEKARANG, dan pastikan FAIL datang dari assertion lain yang kita tahu belum terpenuhi — tidak ada. Triknya: assertion lama dihapus, yang baru (`eaf-readout`) sudah benar → setelah edit ini test HARUSNYA sudah pass tanpa edit HTML. Itu tidak "red dulu" — acceptable untuk task migrasi kecil: red state-nya adalah assertion `id="sEf"` yang kita tahu akan kita hapus, dan kita ganti dengan contract baru. Jalankan; pastikan PASS (green) → lanjut.

- [ ] **Step 2: Hapus blok Excitation dari HTML**

Hapus seluruh:

```html
    <!-- Excitation -->
    <div class="csec">
      <div class="stitle">Excitation (AVR)</div>
      ...
    </div>
```

(Segmen antara `<!-- Excitation -->` dan `<!-- SC -->`.)

- [ ] **Step 3: Bersihkan JS**

1. `applyControlValue`: hapus baris `else if(key === 'Ef'){ setIf(S, value); }` (shim).
2. `controlValue`: kembalikan ke bentuk sederhana (key `'Ef'` tidak lagi valid — tanpa fallback):
```js
function controlValue(key){ return key === 'If' ? S.If : S[key]; }
```
3. `freezeSliders`: array menjadi `['sH','sD','sXs','sPm','sIf','nH','nD','nXs','nPm','nIf']` (tanpa `sEf`/`nEf`).
4. `doReset`: hapus `'sEf'` dari loop `updTrack` (sudah diganti `'sIf'` di Task 2) — pastikan tidak ada sisa.
5. `TIPS`: hapus entri `Ef: {...}`.
6. `TIPS` referensi lain? `data-tip="Ef"` tidak ada lagi (slider dihapus) — verifikasi.

Verifikasi tidak ada sisa referensi yang DIALIRKAN:

```bash
grep -n "sEf\|nEf\|'Ef'\|\"Ef\"\|data-tip=\"Ef\"" "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html"
```

Expected: TIDAK ada match di kode hidup (komentar sejarah seperti "kontrol lama" boleh tetap; jika ada sebutan `Ef` di komentar, dilakukan cek bahwa itu hanya dokumentasi).

- [ ] **Step 4: Verifikasi penuh**

```bash
node tools/ui.test.js
node tools/realistic-field.test.js
node tools/fem-saliency.test.js
npm test
```

Expected: semua exit 0. Jika `interaction-a11y.test.js` atau yang lain mereferensikan `sEf`, perbarui assertion-nya ke `sIf` (migrasi bermotivasi; catat di komit).

- [ ] **Step 5: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/ui.test.js
git commit -m "feat(ui): migrasi penuh slider Ef → I_f (readout E_af derivatif)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: Kurva P-δ salient di Panel II

**Files:**
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (`updateSvgPdelta`, `EAC_TIPS`, `runSc`)
- Create: `tools/pdelta-curve-salient.test.js`

**Interfaces:**
- Consumes: `getPeSal`, `getMachineXq`, `getPmaxSal`, `solveDelta0`, `solveDeltaCr`, `getCC`
- Produces: kurva `pd-curve` memakai `getPeSal`; fault curve memakai `Pmax_f·sin(d)`; `d_s`/`d_cr`/`d_cc` numerik sudah terpakai (verifikasi); `runSc` menghitung ulang `delta` dengan `solveDelta0`

- [ ] **Step 1: Tulis test yang gagal (source-contract)**

Isi `tools/pdelta-curve-salient.test.js`:

```js
const fs = require('fs');
const path = require('path');
const HTML = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const src = fs.readFileSync(HTML, 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };

const start = src.indexOf('function updateSvgPdelta(');
const end = src.indexOf('\n}\n', start);
const upd = src.slice(start, end + 3);
ok(upd.includes('getPeSal(d'), 'kurva utama Panel II memakai getPeSal (suku saliency)');
ok(upd.includes('solveDelta0('), 'δ0 dihitung numerik (solveDelta0)');
ok(upd.includes('solveDeltaCr('), 'δ_cr dihitung numerik (solveDeltaCr)');
ok(upd.includes('getMachineXq('), 'Xq terhubung ke solver sudut');
ok(!/Pmax\*Math\.sin\(d\)/.test(upd), 'tidak ada lagi kurva round-rotor murni');
console.log('\n=== P-Delta Salient Contract ===');
console.log('Passed: ' + pass + '  Failed: ' + fail);
process.exit(fail ? 1 : 0);
```

Run: `node tools/pdelta-curve-salient.test.js`
Expected: FAIL — `getPeSal(d` masih pakai `Pmax*Math.sin(d)` (baris ~1914 dan ~1951 terverifikasi).

- [ ] **Step 2: Migrasi kurva utama**

Di `updateSvgPdelta`, ganti:

```js
  let cpts=''; for(let d=0;d<=Math.PI;d+=0.006) cpts+=(d===0?'M':'L')+sx(d)+','+sy(Pmax*Math.sin(d))+' ';
```

menjadi:

```js
  let cpts=''; for(let d=0;d<=Math.PI;d+=0.006){ const v=getPeSal(d,Pmax,S.Xs,Xq,S.V); cpts+=(d===0?'M':'L')+sx(d)+','+sy(v)+' '; }
```

(`Xq` sudah ada di scope: `const Xq=getMachineXq(S)` baris ~1874. Terlihat puncak kurva bergeser ke kiri saat `Xq<Xd` — benar secara fisik, spec §4.4.)

Fault curve: PERTAHANKAN `Pmax_f*Math.sin(d)` (baris ~1951) — saat fault tegangan kolaps (`Vt=V·sc_Pfact`) dan perhitungan saliency dengan `Vt` kolaps menghasilkan kurva menyentuh nol; spec §2.3/riset menetapkan penyederhanaan ini. Tambahkan komentar di dekatnya:

```js
// P_fault hanya memakai Pmax_f·sin(d): saat short circuit tegangan terminal
// kolaps (constant flux linkage, E' tetap), suku reluctance praktis hilang.
```

- [ ] **Step 3: Perbarui EAC_TIPS (narasi numerik)**

Di `EAC_TIPS`, sesuaikan tiga entry agar jujur untuk salient-pole:

- `dcr.desc` → tambahkan kalimat: `Untuk mesin salient-pole (4/6/8 kutub), δ_cr dihitung numerik (akar dP/dδ = 0) — bukan π − δ₀; untuk round rotor (2 kutub) hasilnya sama.`
- `dcc.desc` → tambahkan: `Untuk salient-pole, δ_cc dari integrasi numerik A1(δ_cc) = A2(δ_cc).`
- `d0.desc` → tambahkan: `Untuk salient-pole, δ₀ dari bisection P(δ₀) = Pm pada cabang stabil.`

- [ ] **Step 4: runSc — δ₀ salient**

Di `runSc`, ganti:

```js
  const Pmax=S.Ef*S.V/S.Xs;
  S.delta=Math.asin(Math.min(Math.max(S.Pm/Pmax,-.9999),.9999));
```

menjadi:

```js
  const Pmax=getPmaxSal(S);
  const d0=solveDelta0(S.Pm, Pmax, Math.max(S.Xs,0.01), getMachineXq(S), S.V);
  S.delta = d0 !== null ? d0 : Math.asin(Math.min(Math.max(S.Pm/Pmax,-.9999),.9999));
```

- [ ] **Step 5: Verifikasi**

```bash
node tools/pdelta-curve-salient.test.js
node tools/pdelta-label-layout.test.js
node tools/eac-verdict.test.js
node tools/model.test.js
```

Expected: semua PASS. Jika `pdelta-label-layout` gagal (label d0/dcr dihitung kotak), update assertion-nya dengan nilai yang dihitung dari kode baru (bukan angka karangan).

- [ ] **Step 6: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/pdelta-curve-salient.test.js
git commit -m "feat(pdelta): kurva P-d salient + delta0 numerik di runSc

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: Legenda realistis penuh + warning penyederhanaan

**Files:**
- Modify: `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html` (`drawRealisticLegend`)
- Modify: `tools/realistic-field.test.js` (tambah Test 3d)

**Interfaces:**
- Consumes: `drawRealisticLegend(svg,w,h)`
- Produces: legenda berisi magnet batangan, sumbu-d, sumbu-q, air gap, RMF, fluks, belitan stator, busur δ, + warning penyederhanaan (spec §5.5)

- [ ] **Step 1: Tulis assertion yang gagal**

Di `tools/realistic-field.test.js`, setelah Test 3c, tambahkan:

```js
sect('Test 3d: Legenda realistis penuh + warning');
ok(initReal.includes("'Magnet batangan'"), 'legenda: magnet batangan');
ok(initReal.includes("'Sumbu-d'"), 'legenda: sumbu-d');
ok(initReal.includes("'Sumbu-q'"), 'legenda: sumbu-q');
ok(initReal.includes("'air gap'"), 'legenda: air gap');
ok(initReal.includes("'RMF'"), 'legenda: RMF');
ok(initReal.includes("'Garis fluks'"), 'legenda: garis fluks');
ok(initReal.includes('Penyederhanaan'), 'warning penyederhanaan ada');
ok(initReal.includes('mesh'), 'warning menyebut BUKAN mesh FEM penuh');
```

Run: `node tools/realistic-field.test.js`
Expected: FAIL hanya assertion baru.

- [ ] **Step 2: Perluas legenda**

Di `drawRealisticLegend`, ganti array `items` menjadi (8 item):

```js
  const items=[
    {label:'Garis fluks (kerapatan ∝ B(I_f) — solver medan)', color:'#2f6fb0'},
    {label:'Magnet batangan rotor — N / S', color:'#0068d8'},
    {label:'Belitan stator fasa A/B/C', color:'#c85000'},
    {label:'RMF stator (medan 3-φ berputar)', color:'#30a060'},
    {label:'Sumbu-d rotor (sejajar belitan medan, kutub N)', color:'#d84000'},
    {label:'Sumbu-q rotor (90° elektrik di depan d)', color:'#3a6818'},
    {label:'Air gap', color:'#c0c8d8'},
    {label:'Busur δ — sudut daya (sama Panel II)', color:'#a86000'},
  ];
```

Dan setelah loop `items.forEach`, tambahkan warning:

```js
  const wy = legendY + items.length * 16 + 12;
  svg.appendChild(mkSvg('text',{x:legendX,y:wy,'font-size':10,'fill':'#707888','font-family':'var(--body)'},
    '⚠ Penyederhanaan: medan sinusoidal + saturasi tanh + reaksi armature superposisi — BUKAN mesh FEM penuh.'));
```

Perhatikan posisi: `legendY=h-104` mungkin sempit untuk 8 item + warning (≈8×16+20 = 148 px). Jika meluber, pindahkan `legendY` menjadi `h-180` dan periksa kondisi `h` cukup (Panel I h ≥ 320 → OK).

- [ ] **Step 3: Verifikasi**

```bash
node tools/realistic-field.test.js
node tools/ui.test.js
```

Expected: semua PASS.

- [ ] **Step 4: Commit**

```bash
git add "LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html" tools/realistic-field.test.js
git commit -m "feat(viz): legenda realistis penuh + warning penyederhanaan

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 6: Gate akhir — regresi penuh + log sesi + push

**Files:**
- Create: `design-plans/sesi-2026-09-23-01-fem-medium-lanjutan.md`

**Interfaces:**
- Consumes: semua task 0–5
- Produces: log sesi dengan checklist FINAL; branch ter-push

- [ ] **Step 1: Gate lengkap**

```bash
node tools/realistic-field.test.js && node tools/visual-sync.test.js && node tools/pdelta-curve-salient.test.js && node tools/fem-saturation.test.js && node tools/pole-geometry.test.js && node tools/fem-saliency.test.js && node tools/fem-field-solver.test.js && node tools/model.test.js && node tools/eac-verdict.test.js && node tools/governor-steady-state.test.js && node tools/oos-trip.test.js && node tools/reactive-power.test.js && node tools/eac-snapshot.test.js && node tools/post-trip-freeze.test.js && node tools/rlr-handoff.test.js && node tools/end-to-end.test.js && node tools/ui.test.js && node tools/chart-scale.test.js && node tools/interaction-a11y.test.js
```

Expected: semua exit 0.

- [ ] **Step 2: Verifikasi manual browser**

Buka HTML di browser; cek (minimal):
- Panel I mode "Realistis": magnet terlihat, label N/S/d/q selalu tegak, ganti kutub 2→8 → slot/kumparan/RMF berubah
- Dropdown Kecepatan 0.25 Hz → rotor berputar lambat; dot/cross terbaca seperti pola 3-fase (bukan kedip 50 Hz)
- Slider I_f 0.2→3 → fluks menebal lalu jenuh; `E_af` readout berubah
- Panel II: kurva P-δ dengan puncak lebih kiri untuk 4/6/8 kutub; δ_cr/δ_cc bergerak; fault curve benar
- Island mode: kecepatan visual ikut (1+ω)
- No console error

- [ ] **Step 3: Tulis log sesi**

Isi `design-plans/sesi-2026-09-23-01-fem-medium-lanjutan.md` (format template sesi): tanggal, waktu mulai, commit sebelum (`87368c7`), keputusan (migrasi penuh/nativo/stash), task & hasil (conteggi test), verifikasi manual, status plan (FINAL), langkah berikutnya.

- [ ] **Step 4: Commit + push**

```bash
git add design-plans/sesi-2026-09-23-01-fem-medium-lanjutan.md
git commit -m "docs(sesi): gate akhir FEM medium lanjutan — FINAL

Co-Authored-By: Claude Code <noreply@anthropic.com>"
git push origin fix/critical-governor-and-bugs
```

Expected: push berhasil, 0 commit tertinggal.

---

## Self-Review

1. **Cakupan spec (§10):** dropdown kutub → Task 2; label tegak + magnet (sudah di HEAD+stash, diverifikasi Task 0–1); fluks solver (sudah); saturasi If (sudah); sin2δ + numerik (sudah + Task 4 kurva); jam τ (Task 1); visSpeed (Task 2); island ∝ 1+ω (Task 1); tanpa Date.now (Task 1); fluks tidak menyusut saat SC (sudah, tidak disentuh); legenda + warning (Task 5); extract.js REQUIRED (Task 1); tes lama hijau/dimigrasi (Task 1/3/4/6).
2. **Placeholder scan:** tidak ada TBD/TODO; semua step berisi kode konkret.
3. **Konsistensi tipe/nama:** `advanceVisualClock(s,rdt)` dipanggil di `stepPhys` (dengan `cap`) dan di test; `S.animT`/`S.visSpeed` dari `makeState`; `onPoleChange`/`onVisSpeedChange` koheren dengan HTML; `eaf-readout` koheren antara HTML, `applyControlValue`, `doReset`, dan assert ui.test.js; key `'If'` koheren antara `applyControlValue`/`controlValue`/`freezeSliders`/`TIPS`.
4. **Review Focus (input yang bisa menggigit):**
   - `#sEf` legacy: Task 2 menambah slider baru TANPA menghapus lama (test lama tetap hijau); Task 3 menghapus + migrasi assertion. 
   - `realistic-field` Test 7 (`wE*S.t`): dimigrasi ke `S.animT` di Task 1 (migrasi, bukan penghapusan kontrak).
   - `pdelta-label-layout` (posisi label d0/dcr): Task 4 memicu perubahan posisi → assertion di-update dengan nilai kode baru.
   - `runSc` δ₀ arcsin → solveDelta0 di Task 4 (spec §7.4: preset tak boleh bypass saturasi — `setIf` sudah dipakai di SCENARIOS).
   - `freezeSliders` (post-trip): Task 2 menambah `sIf`, Task 3 menghapus `sEf` — dipastikan konsisten; `post-trip-freeze.test.js` memakai `onSl('Ef')`/`adjSl('Ef')` → CAKUP: task 3 harus memeriksa file itu dan menyamakan ke `'If'` (sudah disebut di Step 4 Task 3: "jika file lain mereferensikan sEf, perbarui").