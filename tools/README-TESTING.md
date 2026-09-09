# Testing Guide — Synchronous Generator Simulator

Dokumentasi lengkap untuk menjalankan interaction testing pada simulator.

## 📋 Overview

Proyek ini memiliki **3 opsi testing**:

1. **Browser Console Testing** — Manual, tanpa instalasi (RECOMMENDED untuk quick test)
2. **Puppeteer Automated Testing** — Automated dengan screenshot (perlu instalasi)
3. **Existing Unit Tests** — Model & UI structure validation (sudah tersedia)

---

## 🚀 Quick Start — Browser Console Testing

**Paling mudah dan cepat!** Tidak perlu instalasi apapun.

### Langkah-langkah:

1. **Buka simulator di browser:**
   ```bash
   # Via browser langsung
   # Atau gunakan live server:
   python -m http.server 8000
   # Kemudian buka: http://localhost:8000/LEVEL%201%20-%20SYNCHRONOUS%20GENERATOR%20SIMULATOR%20(UNSTABLE).html
   ```

2. **Buka DevTools (F12)** dan pilih tab **Console**

3. **Copy-paste isi file `tools/console-test-runner.js` ke console**

4. **Tekan Enter** untuk menjalankan semua test

### Output yang diharapkan:

```
╔══════════════════════════════════════════════════════════════════╗
║  SYNCHRONOUS GENERATOR SIMULATOR — INTERACTION TEST             ║
╚══════════════════════════════════════════════════════════════════╝

▶ Running: Load Response button exists
  ✓ PASSED (2ms)

▶ Running: Click Load Response button
  ✓ PASSED (523ms)

... (lebih banyak test)

╔══════════════════════════════════════════════════════════════════╗
║                        TEST SUMMARY                              ║
╚══════════════════════════════════════════════════════════════════╝

Total Tests: 24
Passed: 24
Failed: 0
Pass Rate: 100.0%
```

### Test Scenarios yang Dijalankan:

1. ✅ **Load Response Toggle** — Klik button Load Response, verifikasi state change
2. ✅ **Animation Mode** — Toggle antara Fasor dan Realistis
3. ✅ **Parameter Changes** — Ubah H, D, X'd, Pm, Ef via slider dan input
4. ✅ **Mode Switching** — Grid ↔ Island mode
5. ✅ **Pane Toggle** — Show/hide visualization panes
6. ✅ **RLR Simulation** — Start/stop simulation flow
7. ✅ **Multiple Parameters** — Ubah semua parameter sekaligus

---

## 🤖 Automated Testing dengan Puppeteer

**Untuk testing yang lebih comprehensive dengan screenshot capture.**

### Installation:

```bash
cd "C:\Users\pcelr\Documents\Sheva\SHEVA'S SIMULATOR LIBRARY\LEVEL 1 - SYNCHRONOUS GEN (UNSTABLE)"

# Install Puppeteer
npm init -y
npm install puppeteer --save-dev
```

### Usage:

```bash
# Run automated test
node tools/puppeteer-test-runner.js
```

### Output:

- **Report JSON:** `tools/test-results/report.json`
- **Screenshots:** `tools/test-results/screenshots/*.png`
- **Console errors** dicatat di report

### Screenshot Output:

Setiap scenario menghasilkan screenshot:
```
tools/test-results/screenshots/
├── 01-load-response-toggle-initial-state.png
├── 01-load-response-toggle-rlr-clicked.png
├── 01-load-response-toggle-rlr-toggle-off.png
├── 02-animation-mode-fasor-fasor-mode.png
├── 03-animation-mode-realistis-realistis-mode.png
├── 04-parameter-h-slider-h-changed-5-5.png
├── 05-parameter-pm-input-pm-changed-1-2.png
├── 06-mode-island-island-mode.png
├── 07-mode-grid-grid-mode.png
├── 08-rlr-simulation-rlr-running.png
├── 08-rlr-simulation-rlr-stopped.png
├── 09-pane-toggle-pane1-hidden.png
├── 09-pane-toggle-pane1-visible.png
└── 10-multiple-params-all-params-changed.png
```

---

## 🧪 Existing Unit Tests

Test harness yang sudah tersedia untuk validasi model & UI structure.

### Test Files:

| File | Coverage | Command |
|------|----------|---------|
| `model.test.js` | Physics engine (swing equation, EAC, RK4, governor) | `node tools/model.test.js` |
| `ui.test.js` | DOM structure, UI elements, controls | `node tools/ui.test.js` |
| `chart-scale.test.js` | Chart scale stabilizer logic | `node tools/chart-scale.test.js` |

### Run All Tests:

```bash
# Run semua unit tests
node tools/model.test.js && node tools/ui.test.js && node tools/chart-scale.test.js

# Output:
# ✓ 17 tests passing (model.test.js)
# ✓ 79 tests passing (ui.test.js)
# ✓ 17 tests passing (chart-scale.test.js)
# Total: 113 tests passing
```

---

## 📊 Comparison Matrix

| Feature | Browser Console | Puppeteer | Unit Tests |
|---------|----------------|-----------|------------|
| **Setup** | ❌ None | ⚠️ npm install | ✅ Already available |
| **Speed** | ⚡ Fast | 🐢 Slower (browser launch) | ⚡⚡ Fastest |
| **Screenshots** | ❌ Manual | ✅ Automatic | ❌ N/A |
| **CI/CD Ready** | ❌ No | ✅ Yes | ✅ Yes |
| **Console Error Detection** | ✅ Yes | ✅ Yes | ❌ No |
| **Visual Regression** | ❌ No | ✅ Yes (manual compare) | ❌ No |
| **Real Interaction** | ✅ Yes | ✅ Yes | ⚠️ Mock DOM |

---

## 🎯 Recommendations

### Untuk Development (quick iteration):
👉 **Browser Console Testing** — cepat, mudah, langsung lihat hasil

### Untuk Regression Testing (before commit):
👉 **Unit Tests** — `node tools/model.test.js && node tools/ui.test.js`

### Untuk Comprehensive Testing (before release):
👉 **Puppeteer** — automated + screenshot untuk visual verification

### Untuk CI/CD Pipeline:
👉 **Unit Tests + Puppeteer** — keduanya (unit tests cepat, Puppeteer untuk E2E)

---

## 🐛 Debugging Tips

### Browser Console Test Gagal?

1. **Buka DevTools → Console** untuk lihat error detail
2. **Check element IDs** — pastikan selector masih valid
3. **Timing issues** — tambah `await sleep(ms)` jika perlu

### Puppeteer Test Gagal?

1. **Cek screenshot** di `tools/test-results/screenshots/`
2. **Lihat report JSON** di `tools/test-results/report.json`
3. **Run dengan headless=false** untuk debug visual:
   ```javascript
   // Edit puppeteer-test-runner.js line ~180
   browser = await puppeteer.launch({
     headless: false, // <-- Ubah ke false
     args: ['--no-sandbox'],
   });
   ```

### Unit Test Gagal?

1. **Jalankan test spesifik** untuk isolasi masalah
2. **Cek file HTML** — pastikan struktur DOM tidak berubah
3. **Lihat error stack trace** untuk detail

---

## 📝 Adding New Tests

### Browser Console Test:

Edit `tools/console-test-runner.js`, tambahkan scenario baru:

```javascript
await test('My new test', async () => {
  click('my-button-id');
  await sleep(500);
  checkClass('my-button-id', 'active', true);
});
```

### Puppeteer Test:

Edit `tools/puppeteer-test-runner.js`, tambahkan ke `SCENARIOS`:

```javascript
{
  name: '11-my-new-test',
  description: 'Test something new',
  steps: [
    { action: 'click', selector: '#my-button' },
    { action: 'wait', time: 500 },
    { action: 'screenshot', name: 'my-result' },
  ],
}
```

---

## 📦 File Structure

```
tools/
├── console-test-runner.js       ← Browser console test (RECOMMENDED)
├── puppeteer-test-runner.js     ← Puppeteer automated test
├── interaction-test.js          ← Test scenarios definition
├── run-interaction-tests.js     ← Helper script
├── model.test.js                ← Unit test: physics model
├── ui.test.js                   ← Unit test: DOM structure
├── chart-scale.test.js          ← Unit test: chart scaling
├── lens-harness.js              ← Mock DOM for unit tests
├── shoot.js                     ← Screenshot tool (legacy)
├── test-results/                ← Output directory
│   ├── report.json
│   └── screenshots/
└── README-TESTING.md            ← This file
```

---

## ❓ FAQ

### Q: Apakah perlu Cypress juga?

**A:** TIDAK. Untuk proyek single-file HTML seperti ini:
- **Browser Console** sudah cukup untuk quick testing
- **Puppeteer** sudah cukup untuk automated E2E testing
- **Cypress** overkill dan menambah kompleksitas setup

### Q: Puppeteer vs Playwright, mana yang lebih baik?

**A:** Untuk proyek ini:
- **Puppeteer** lebih lightweight, fokus Chrome/Chromium
- **Playwright** lebih powerful, multi-browser, tapi lebih berat
- Karena simulator ini hanya target Chrome-based browsers, **Puppeteer cukup**

### Q: Bagaimana test short circuit event?

**A:** Tambah scenario dengan SC trigger:

```javascript
// Browser Console
await test('SC event trigger', async () => {
  fill('scDelay', '0.5');
  fill('scDur', '0.2');
  click('btn-trigger-sc'); // Jika ada button trigger
  await sleep(2000);
  checkExists('scbadge'); // Badge FAULT muncul
});
```

### Q: Bagaimana verifikasi animasi?

**A:** Screenshot comparison:
1. Ambil screenshot sebelum animasi start
2. Wait beberapa frames
3. Ambil screenshot setelah animasi
4. Compare secara visual (manual atau image diff tool)

---

## 🎓 Learning Resources

- [Puppeteer Documentation](https://pptr.dev/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## 📄 License

Testing tools ini adalah bagian dari Synchronous Generator Simulator project.
Lihat project root untuk license information.

---

**Last Updated:** 2026-09-09
**Maintainer:** Sheva's Simulator Library Team
