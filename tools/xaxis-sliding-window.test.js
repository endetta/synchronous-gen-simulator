/**
 * X-Axis Sliding Window Test — Verifikasi window bergeser setelah 30 detik
 *
 * Test ini memastikan bahwa:
 * 1. Chart menampilkan data dari t=0 hingga t=30 (window growing)
 * 2. Chart menampilkan data dari t=(time-30) hingga t=time (window sliding)
 * 3. Tidak ada data yang hilang
 */

// ==================== TEST UTILITIES ====================

let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function assertEqual(actual, expected, message) {
  if (actual === expected) return true;
  throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
}

function assertClose(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) return true;
  throw new Error(`${message}\n  Expected: ${expected} ± ${tolerance}\n  Actual: ${actual} (diff: ${diff})`);
}

function assertTrue(condition, message) {
  if (condition) return true;
  throw new Error(message);
}

function describe(suiteName, fn) {
  console.log(`\n${suiteName}`);
  console.log('─'.repeat(60));
  fn();
}

function it(testName, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`  ✅ ${testName}`);
    testResults.push({ name: testName, status: 'PASS' });
  } catch (error) {
    testsFailed++;
    console.log(`  ❌ ${testName}`);
    console.log(`     ${error.message}`);
    testResults.push({ name: testName, status: 'FAIL', error: error.message });
  }
}

// ==================== CONSTANTS ====================

const HWIN = 30; // History window = 30 seconds

// ==================== SLIDING WINDOW LOGIC ====================

/**
 * Calculate X-axis min/max for sliding window
 */
function calculateXAxisRange(currentTime, windowSize = HWIN) {
  const xMin = Math.max(0, currentTime - windowSize);
  const xMax = currentTime;
  return { xMin, xMax, windowSize };
}

/**
 * Filter data within window
 */
function filterDataInWindow(dataPoints, currentTime, windowSize = HWIN) {
  const startTime = Math.max(0, currentTime - windowSize);
  const endTime = currentTime;
  return dataPoints.filter(d => d.t >= startTime && d.t <= endTime);
}

// ==================== TESTS ====================

describe('X-Axis Sliding Window Logic', () => {

  it('should show growing window at t=15s (phase 1)', () => {
    const result = calculateXAxisRange(15);

    assertEqual(result.xMin, 0, 'xMin should be 0 at t=15s');
    assertEqual(result.xMax, 15, 'xMax should be 15 at t=15s');
    assertTrue(result.windowSize === 30, 'windowSize should be 30');
  });

  it('should show full window at t=30s (transition)', () => {
    const result = calculateXAxisRange(30);

    assertEqual(result.xMin, 0, 'xMin should be 0 at t=30s');
    assertEqual(result.xMax, 30, 'xMax should be 30 at t=30s');
  });

  it('should slide window at t=35s (phase 2)', () => {
    const result = calculateXAxisRange(35);

    assertEqual(result.xMin, 5, 'xMin should slide to 5 at t=35s');
    assertEqual(result.xMax, 35, 'xMax should be 35 at t=35s');
  });

  it('should slide window at t=60s', () => {
    const result = calculateXAxisRange(60);

    assertEqual(result.xMin, 30, 'xMin should slide to 30 at t=60s');
    assertEqual(result.xMax, 60, 'xMax should be 60 at t=60s');
  });

  it('should slide window at t=100s', () => {
    const result = calculateXAxisRange(100);

    assertEqual(result.xMin, 70, 'xMin should slide to 70 at t=100s');
    assertEqual(result.xMax, 100, 'xMax should be 100 at t=100s');
  });

  it('should handle edge case at t=0', () => {
    const result = calculateXAxisRange(0);

    assertEqual(result.xMin, 0, 'xMin should be 0 at t=0');
    assertEqual(result.xMax, 0, 'xMax should be 0 at t=0');
  });
});

describe('Data Filtering in Window', () => {

  it('should filter data correctly at t=15s', () => {
    const data = [
      { t: 0, value: 50 },
      { t: 5, value: 51 },
      { t: 10, value: 52 },
      { t: 15, value: 53 },
      { t: 20, value: 54 }, // Should be excluded
      { t: 25, value: 55 }  // Should be excluded
    ];

    const filtered = filterDataInWindow(data, 15);

    assertEqual(filtered.length, 4, 'Should have 4 data points (0, 5, 10, 15)');
    assertTrue(filtered.every(d => d.t <= 15), 'All data should be t <= 15');
  });

  it('should filter data correctly at t=60s with sliding window', () => {
    const data = [
      { t: 0, value: 50 },  // Should be excluded
      { t: 10, value: 51 }, // Should be excluded
      { t: 20, value: 52 }, // Should be excluded
      { t: 30, value: 53 },
      { t: 40, value: 54 },
      { t: 50, value: 55 },
      { t: 60, value: 56 }
    ];

    const filtered = filterDataInWindow(data, 60);

    assertEqual(filtered.length, 4, 'Should have 4 data points (30, 40, 50, 60)');
    assertTrue(filtered.every(d => d.t >= 30), 'All data should be t >= 30');
    assertTrue(filtered.every(d => d.t <= 60), 'All data should be t <= 60');
  });

  it('should include all data when within window', () => {
    const data = [
      { t: 5, value: 50 },
      { t: 10, value: 51 },
      { t: 15, value: 52 }
    ];

    const filtered = filterDataInWindow(data, 20);

    assertEqual(filtered.length, 3, 'Should have all 3 data points');
  });
});

describe('Window Size Behavior', () => {

  it('should maintain 30s window size throughout simulation', () => {
    const times = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200];

    times.forEach(time => {
      const result = calculateXAxisRange(time);
      const actualWindowSize = result.xMax - result.xMin;

      // Window size should grow from 0 to 30, then stay at 30
      if (time < 30) {
        assertEqual(actualWindowSize, time, `Window should grow to ${time}s`);
      } else {
        assertEqual(actualWindowSize, 30, `Window should be 30s at t=${time}s`);
      }
    });
  });

  it('should not lose any data within window', () => {
    // Simulate 100 seconds of data
    const data = [];
    for (let t = 0; t <= 100; t += 0.01) {
      data.push({ t, value: 50 + Math.sin(t) * 0.5 });
    }

    // Check at t=100s
    const filtered = filterDataInWindow(data, 100);

    // Should have approximately 30s of data = 3000 points
    // Exact count depends on floating point rounding
    assertTrue(filtered.length >= 2999, `Should have ~3000 data points, got ${filtered.length}`);

    // First point should be near t=70
    assertTrue(filtered[0].t >= 69.99 && filtered[0].t <= 70.01, `First data point should be near t=70, got ${filtered[0].t}`);

    // Last point should be at t=100
    assertClose(filtered[filtered.length - 1].t, 100, 0.01, 'Last data point should be at t=100');
  });
});

describe('Chart.js X-Axis Configuration', () => {

  it('should set correct xMin and xMax for Chart.js', () => {
    const currentTime = 45;
    const { xMin, xMax } = calculateXAxisRange(currentTime);

    // Chart.js config should use these values
    const chartConfig = {
      type: 'linear',
      min: xMin,
      max: xMax,
      ticks: { stepSize: 5 }
    };

    assertEqual(chartConfig.min, 15, 'Chart xMin should be 15 at t=45s');
    assertEqual(chartConfig.max, 45, 'Chart xMax should be 45 at t=45s');
  });

  it('should maintain tick step size during sliding', () => {
    const times = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    times.forEach(time => {
      const { xMin, xMax } = calculateXAxisRange(time);

      // Tick positions should be at multiples of 5
      const tickStep = 5;
      const expectedTicks = [];
      for (let t = Math.ceil(xMin / tickStep) * tickStep; t <= xMax; t += tickStep) {
        expectedTicks.push(t);
      }

      assertTrue(expectedTicks.length > 0, `Should have ticks at t=${time}s`);
      assertTrue(expectedTicks.every(t => t % 5 === 0), 'All ticks should be at multiples of 5');
    });
  });
});

describe('Real Simulation Scenario', () => {

  it('should simulate 2 minutes of data with sliding window', () => {
    // Simulate 120 seconds of data
    const dataPoints = [];
    for (let t = 0; t <= 120; t += 0.01) {
      dataPoints.push({ t, value: 50 + Math.sin(t * 0.5) * 0.3 });
    }

    // Check at various points
    const checkPoints = [10, 30, 60, 90, 120];
    const results = [];

    checkPoints.forEach(time => {
      const { xMin, xMax } = calculateXAxisRange(time);
      const filtered = filterDataInWindow(dataPoints, time);

      results.push({
        time,
        xMin,
        xMax,
        dataPoints: filtered.length,
        windowSize: xMax - xMin
      });
    });

    console.log('     Sliding window simulation:');
    results.forEach(r => {
      console.log(`       t=${r.time}s: window=[${r.xMin}-${r.xMax}], data=${r.dataPoints} points`);
    });

    // Verify all windows are correct
    assertTrue(results[0].windowSize === 10, 't=10s: window should be 10s');
    assertTrue(results[1].windowSize === 30, 't=30s: window should be 30s');
    assertTrue(results[2].windowSize === 30, 't=60s: window should be 30s');
    assertTrue(results[3].windowSize === 30, 't=90s: window should be 30s');
    assertTrue(results[4].windowSize === 30, 't=120s: window should be 30s');
  });
});

// ==================== SUMMARY ====================

console.log('\n' + '═'.repeat(60));
console.log('TEST SUMMARY');
console.log('═'.repeat(60));
console.log(`Total: ${testsPassed + testsFailed} tests`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log('═'.repeat(60));

if (testsFailed > 0) {
  console.log('\nFailed tests:');
  testResults
    .filter(t => t.status === 'FAIL')
    .forEach(t => console.log(`  - ${t.name}`));
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
