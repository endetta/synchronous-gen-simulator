const path = require('path');
const { chromium } = require('playwright');
const HTML = path.join(process.cwd(), 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const URL = 'file:///' + HTML.replace(/\\/g, '/').replace(/ /g, '%20');

let pass = 0, fail = 0;
const chk = (n, ok, d) => { if (ok) { pass++; console.log('  PASS: ' + n + (d ? '  [' + d + ']' : '')); } else { fail++; console.log('  FAIL: ' + n + (d ? '  [' + d + ']' : '')); } };

(async () => {
  const b = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await p.goto(URL, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  console.log('Cek Tabrakan Kontrol Resize');
  console.log('-'.repeat(60));

  const boxes = await p.evaluate(() => {
    const R = e => { const x = e.getBoundingClientRect(); return { l: Math.round(x.left), r: Math.round(x.right), t: Math.round(x.top), b: Math.round(x.bottom) }; };
    const out = { panes: {}, others: {} };
    document.querySelectorAll('[data-pane-resize]').forEach(e => { out.panes[e.dataset.paneResize] = R(e); });
    const am = document.querySelector('.anim-mode-toggle'); if (am) out.others.animToggle = R(am);
    const vl = document.querySelectorAll('.vlabel'); out.others.vlabels = Array.from(vl).map(R);
    return out;
  });

  const hit = (a, c) => !(a.r <= c.l || c.r <= a.l) && !(a.b <= c.t || c.b <= a.t);

  for (const id of ['pane1', 'pane2', 'pane3']) {
    const a = boxes.panes[id];
    if (!a) { chk(id + ' kontrol ada', false); continue; }
    let clash = [];
    if (boxes.others.animToggle && hit(a, boxes.others.animToggle)) clash.push('anim-mode-toggle');
    boxes.others.vlabels.forEach((v, i) => { if (hit(a, v)) clash.push('vlabel#' + (i + 1)); });
    chk(id + ' tidak bertumpuk dengan elemen lain', clash.length === 0, clash.join(',') || 'bersih');
  }

  // Setiap tombol benar-benar bisa diklik (Playwright akan gagal jika terhalang)
  console.log('\nTombol bisa diklik:');
  for (const id of ['pane1', 'pane2', 'pane3']) {
    for (const [n, label] of [[1, '−'], [2, '+'], [3, '⤢']]) {
      try {
        await p.click(`[data-pane-resize="${id}"] button:nth-of-type(${n})`, { timeout: 3000 });
        chk(id + ' tombol ' + label + ' bisa diklik', true);
      } catch (e) {
        chk(id + ' tombol ' + label + ' bisa diklik', false, String(e.message).slice(0, 60));
      }
      await p.waitForTimeout(150);
    }
  }

  // Fungsi nyata: perkecil dulu, lalu perbesar via tombol (urutan yang valid —
  // pane mungkin sudah di batas atas akibat klik ⤢ pada loop sebelumnya).
  console.log('\nFungsi:');
  for (let i = 0; i < 5; i++) { await p.click('[data-pane-resize="pane3"] button:nth-of-type(1)'); await p.waitForTimeout(100); }
  await p.waitForTimeout(400);
  const h0 = await p.evaluate(() => document.getElementById('pane3').offsetHeight);
  for (let i = 0; i < 3; i++) { await p.click('[data-pane-resize="pane3"] button:nth-of-type(2)'); await p.waitForTimeout(120); }
  await p.waitForTimeout(400);
  const h1 = await p.evaluate(() => document.getElementById('pane3').offsetHeight);
  chk('pane3 membesar via tombol +', h1 > h0, h0 + 'px → ' + h1 + 'px');

  // Tombol + tidak boleh mengecilkan pane (bug lama: MAXIMIZE_RATIO > PANE_MAX_RATIO)
  const h2 = await p.evaluate(() => document.getElementById('pane3').offsetHeight);
  await p.click('[data-pane-resize="pane3"] button:nth-of-type(2)');
  await p.waitForTimeout(300);
  const h3 = await p.evaluate(() => document.getElementById('pane3').offsetHeight);
  chk('tombol + tidak pernah mengecilkan pane', h3 >= h2, h2 + 'px → ' + h3 + 'px');

  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  chk('tanpa error JS', errs.length === 0, errs.slice(0, 2).join(' | ') || 'bersih');

  await b.close();
  console.log('\n' + '='.repeat(60));
  console.log('Total: ' + (pass + fail) + ' | PASS: ' + pass + ' | FAIL: ' + fail);
  console.log('='.repeat(60));
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
