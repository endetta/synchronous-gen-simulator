/**
 * Browser Console Test Runner
 *
 * Script ini bisa langsung di-paste ke browser console untuk menjalankan
 * automated interaction testing.
 *
 * Cara pakai:
 * 1. Buka file HTML di Chrome/Edge
 * 2. Buka DevTools (F12)
 * 3. Paste seluruh script ini ke Console
 * 4. Tekan Enter untuk menjalankan test
 *
 * Output: Test results di console dengan timestamp
 */

(async function runInteractionTests() {
  console.log('%c╔══════════════════════════════════════════════════════════════════╗', 'color: #c42000; font-weight: bold');
  console.log('%c║  SYNCHRONOUS GENERATOR SIMULATOR — INTERACTION TEST             ║', 'color: #c42000; font-weight: bold');
  console.log('%c╚══════════════════════════════════════════════════════════════════╝', 'color: #c42000; font-weight: bold');

  const results = {
    timestamp: new Date().toISOString(),
    passed: 0,
    failed: 0,
    tests: []
  };

  // Helper functions
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const test = async (name, fn) => {
    console.log(`\n%c▶ Running: ${name}`, 'color: #1050c0; font-weight: bold');
    const startTime = Date.now();
    try {
      await fn();
      const duration = Date.now() - startTime;
      results.passed++;
      results.tests.push({ name, status: 'PASSED', duration });
      console.log(`%c  ✓ PASSED (${duration}ms)`, 'color: #0a7040; font-weight: bold');
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      results.failed++;
      results.tests.push({ name, status: 'FAILED', error: error.message, duration });
      console.log(`%c  ✗ FAILED: ${error.message}`, 'color: #c42000; font-weight: bold');
      return false;
    }
  };

  const click = (id) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element #${id} not found`);
    el.click();
  };

  const fill = (id, value) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element #${id} not found`);
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const checkExists = (id) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element #${id} not found`);
    return el;
  };

  const checkValue = (id, expected) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element #${id} not found`);
    const actual = parseFloat(el.value).toFixed(3);
    const exp = parseFloat(expected).toFixed(3);
    if (actual !== exp) throw new Error(`Expected ${exp}, got ${actual}`);
  };

  const checkClass = (id, className, shouldHave = true) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element #${id} not found`);
    const hasClass = el.classList.contains(className);
    if (shouldHave && !hasClass) throw new Error(`#${id} should have class "${className}"`);
    if (!shouldHave && hasClass) throw new Error(`#${id} should NOT have class "${className}"`);
  };

  // ================================================================
  // TEST SCENARIOS
  // ================================================================

  console.log('\n%c═══ TEST SCENARIO 1: Load Response Toggle ═══', 'color: #b85800; font-weight: bold');
  await test('Load Response button exists', () => {
    checkExists('hbtn-rlr');
  });

  await test('Click Load Response button', async () => {
    click('hbtn-rlr');
    await sleep(500);
    checkExists('btn-rlr-x');
  });

  await test('Click Load Response again to toggle off', async () => {
    click('hbtn-rlr');
    await sleep(500);
    checkExists('btn-rlr-s');
  });

  console.log('\n%c═══ TEST SCENARIO 2: Animation Mode Toggle ═══', 'color: #b85800; font-weight: bold');
  await test('Fasor mode button exists', () => {
    checkExists('amode-phasor');
  });

  await test('Click Fasor mode', async () => {
    click('amode-phasor');
    await sleep(300);
    checkClass('amode-phasor', 'active', true);
  });

  await test('Realistis mode button exists', () => {
    checkExists('amode-realistic');
  });

  await test('Click Realistis mode', async () => {
    click('amode-realistic');
    await sleep(300);
    checkClass('amode-realistic', 'active', true);
    checkClass('amode-phasor', 'active', false);
  });

  console.log('\n%c═══ TEST SCENARIO 3: Parameter Changes ═══', 'color: #b85800; font-weight: bold');
  await test('H slider exists', () => {
    checkExists('sH');
  });

  await test('Change H via slider', async () => {
    fill('sH', '5.5');
    await sleep(200);
    checkValue('sH', '5.5');
  });

  await test('Change Pm via number input', async () => {
    fill('nPm', '1.200');
    await sleep(200);
    checkValue('nPm', '1.200');
  });

  await test('Change D via slider', async () => {
    fill('sD', '3.5');
    await sleep(200);
    checkValue('sD', '3.5');
  });

  await test('Change X\'d via slider', async () => {
    fill('sXs', '0.8');
    await sleep(200);
    checkValue('sXs', '0.8');
  });

  await test('Change Ef via slider', async () => {
    fill('sEf', '1.8');
    await sleep(200);
    checkValue('sEf', '1.8');
  });

  console.log('\n%c═══ TEST SCENARIO 4: Mode Switching ═══', 'color: #b85800; font-weight: bold');
  await test('Grid mode button exists', () => {
    checkExists('bGrid');
  });

  await test('Island mode button exists', () => {
    checkExists('bIsland');
  });

  await test('Switch to Island mode', async () => {
    click('bIsland');
    await sleep(300);
    checkClass('bIsland', 'on', true);
    checkClass('bGrid', 'on', false);
  });

  await test('Switch back to Grid mode', async () => {
    click('bGrid');
    await sleep(300);
    checkClass('bGrid', 'on', true);
    checkClass('bIsland', 'on', false);
  });

  console.log('\n%c═══ TEST SCENARIO 5: Pane Visibility Toggle ═══', 'color: #b85800; font-weight: bold');
  await test('Pane I toggle button exists', () => {
    checkExists('pt1');
  });

  await test('Toggle off Pane I', async () => {
    click('pt1');
    await sleep(300);
    checkClass('pt1', 'on', false);
  });

  await test('Toggle on Pane I', async () => {
    click('pt1');
    await sleep(300);
    checkClass('pt1', 'on', true);
  });

  console.log('\n%c═══ TEST SCENARIO 6: RLR Simulation Flow ═══', 'color: #b85800; font-weight: bold');
  await test('Start RLR simulation', async () => {
    click('btn-rlr-s');
    await sleep(1000);
    checkExists('btn-rlr-x');
  });

  await test('Stop RLR simulation', async () => {
    click('btn-rlr-x');
    await sleep(500);
    checkExists('btn-rlr-s');
  });

  console.log('\n%c═══ TEST SCENARIO 7: Multiple Parameter Changes ═══', 'color: #b85800; font-weight: bold');
  await test('Change all parameters at once', async () => {
    fill('sH', '7.0');
    fill('sD', '5.0');
    fill('sXs', '0.9');
    fill('sPm', '0.85');
    fill('sEf', '1.6');
    await sleep(500);
    checkValue('sH', '7.0');
    checkValue('sD', '5.0');
    checkValue('sXs', '0.9');
    checkValue('sPm', '0.85');
    checkValue('sEf', '1.6');
  });

  // ================================================================
  // TEST SUMMARY
  // ================================================================

  console.log('\n\n');
  console.log('%c╔══════════════════════════════════════════════════════════════════╗', 'color: #c42000; font-weight: bold');
  console.log('%c║                        TEST SUMMARY                              ║', 'color: #c42000; font-weight: bold');
  console.log('%c╚══════════════════════════════════════════════════════════════════╝', 'color: #c42000; font-weight: bold');

  const totalTests = results.passed + results.failed;
  const passRate = totalTests > 0 ? ((results.passed / totalTests) * 100).toFixed(1) : 0;

  console.log(`\n%cTotal Tests: ${totalTests}`, 'font-size: 14px');
  console.log(`%cPassed: ${results.passed}`, 'color: #0a7040; font-size: 14px; font-weight: bold');
  console.log(`%cFailed: ${results.failed}`, `color: ${results.failed > 0 ? '#c42000' : '#888'}; font-size: 14px; font-weight: bold`);
  console.log(`%cPass Rate: ${passRate}%`, 'font-size: 14px');

  if (results.failed > 0) {
    console.log('\n%cFailed Tests:', 'color: #c42000; font-weight: bold');
    results.tests.filter(t => t.status === 'FAILED').forEach(t => {
      console.log(`  ✗ ${t.name}: ${t.error}`);
    });
  }

  console.log('\n%cTest Results Object:', 'color: #1050c0; font-weight: bold');
  console.log(results);

  // Return results for programmatic access
  window.testResults = results;
  console.log('\n%cResults saved to window.testResults', 'color: #888; font-style: italic');

  return results;
})();
