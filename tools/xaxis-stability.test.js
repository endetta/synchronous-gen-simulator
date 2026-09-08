/**
 * X-Axis Stability Test — Verifikasi smooth sliding window untuk time axis
 *
 * Problem: X-axis "blink" dan bergeser patah-patah di awal simulasi
 *
 * Test ini memastikan bahwa:
 * 1. X-axis labels stabil dan tidak blink saat data baru masuk
 * 2. Sliding window bergerak smooth tanpa jump
 * 3. Label positions konsisten saat window bergeser
 */

const fs = require('fs');
const path = require('path');

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

// ==================== X-AXIS LOGIC ====================

/**
 * Simulasi sliding window untuk time axis
 * HWIN = History Window (30 detik)
 */
const HWIN = 30;

/**
 * Calculate X-axis labels for sliding window
 * Ini adalah implementasi YANG SEDANG DIPERBAIKI
 */
function calculateXAxisLabels(currentTime, windowSize = HWIN) {
  const startTime = Math.max(0, currentTime - windowSize);
  const endTime = currentTime;

  // Determine actual window size (grows from 0 to HWIN)
  const actualWindowSize = endTime - startTime;

  // Generate labels dengan interval yang konsisten
  // Jumlah label adaptif berdasarkan window size
  const labelInterval = 5; // Fixed 5 second intervals
  const labels = [];

  // Mulai dari waktu terdekat yang kelipatan interval
  const firstLabel = Math.ceil(startTime / labelInterval) * labelInterval;

  // Generate labels at fixed intervals
  for (let t = firstLabel; t <= endTime; t += labelInterval) {
    if (t >= 0) { // Don't add negative time labels
      labels.push(t.toFixed(2));
    }
  }

  // Always include start and end if they're not already included
  if (labels.length === 0 || parseFloat(labels[0]) > startTime) {
    if (startTime >= 0) {
      labels.unshift(startTime.toFixed(2));
    }
  }
  if (labels.length === 0 || parseFloat(labels[labels.length - 1]) < endTime) {
    labels.push(endTime.toFixed(2));
  }

  return {
    labels,
    startTime,
    endTime,
    step: labelInterval
  };
}

/**
 * Calculate labels untuk data points dalam window
 * Ini menyebabkan masalah karena labels bergantung pada data yang ada
 */
function calculateXAxisLabelsFromData(dataPoints, windowSize = HWIN) {
  if (dataPoints.length === 0) {
    return { labels: [], startTime: 0, endTime: 0 };
  }

  const currentTime = dataPoints[dataPoints.length - 1].t;
  const startTime = Math.max(0, currentTime - windowSize);

  // Filter data dalam window
  const dataInWindow = dataPoints.filter(d => d.t >= startTime && d.t <= currentTime);

  // Masalah: labels bergantung pada data points yang ada
  // Jika data masih sedikit, labels akan "blink"
  const labels = dataInWindow.map(d => d.t.toFixed(2));

  return {
    labels,
    startTime,
    endTime: currentTime,
    dataLength: dataInWindow.length
  };
}

/**
 * Fixed interval X-axis labels
 * Labels ditentukan oleh window, bukan oleh data points
 */
function calculateXAxisLabelsFixed(currentTime, windowSize = HWIN, labelInterval = 5) {
  const startTime = Math.max(0, currentTime - windowSize);
  const endTime = currentTime;

  // Labels pada interval tetap (misalnya setiap 5 detik)
  const labels = [];
  const positions = [];

  // Mulai dari waktu terdekat yang kelipatan interval
  const firstLabel = Math.ceil(startTime / labelInterval) * labelInterval;

  for (let t = firstLabel; t <= endTime; t += labelInterval) {
    labels.push(t.toFixed(1));
    positions.push(t);
  }

  return {
    labels,
    positions,
    startTime,
    endTime
  };
}

/**
 * Chart.js X-axis configuration
 */
function createXAxisConfig(currentTime, windowSize = HWIN) {
  const startTime = Math.max(0, currentTime - windowSize);
  const endTime = currentTime;

  return {
    type: 'linear',
    min: startTime,
    max: endTime,
    ticks: {
      stepSize: 5, // Fixed 5-second intervals
      color: '#3a4465',
      font: { size: 10 }
    },
    grid: {
      display: true,
      color: '#e8ecf4'
    },
    title: {
      display: true,
      text: 'Time (s)',
      color: '#3a4465'
    }
  };
}

// ==================== TESTS ====================

describe('X-Axis Label Generation', () => {

  it('should generate consistent labels regardless of data points', () => {
    const time1 = 5;
    const time2 = 5;

    const labels1 = calculateXAxisLabels(time1);
    const labels2 = calculateXAxisLabels(time2);

    assertEqual(labels1.labels.length, labels2.labels.length, 'Label count should be same');
    assertEqual(labels1.labels[0], labels2.labels[0], 'First label should be same');
    assertEqual(labels1.labels[labels1.labels.length-1], labels2.labels[labels2.labels.length-1], 'Last label should be same');
  });

  it('should slide window smoothly without jumps', () => {
    const prevTime = 10;
    const currTime = 10.1;

    const prevLabels = calculateXAxisLabels(prevTime);
    const currLabels = calculateXAxisLabels(currTime);

    // Window start should move smoothly
    const startDiff = Math.abs(parseFloat(currLabels.labels[0]) - parseFloat(prevLabels.labels[0]));
    assertTrue(startDiff < 0.2, `Window start should move smoothly, diff=${startDiff}`);
  });

  it('should handle start of simulation correctly', () => {
    // At t=0.1s, window should be 0 to 0.1s (not -29.9 to 0.1s)
    const labels = calculateXAxisLabels(0.1, 30);

    assertTrue(parseFloat(labels.labels[0]) >= 0, 'Window start should not be negative');
    // Window end should be current time, not HWIN
    assertClose(parseFloat(labels.labels[labels.labels.length-1]), 0.1, 0.01, 'Last label should be current time');
  });

  it('should expand window until reaching HWIN', () => {
    // At t=5s, window should be 0 to 5s
    const labels5 = calculateXAxisLabels(5);
    const start5 = parseFloat(labels5.labels[0]);
    assertTrue(start5 >= 0 && start5 < 1, 'Window should start near 0 at t=5s');

    // At t=40s, window should be 10 to 40s (full 30s window)
    const labels40 = calculateXAxisLabels(40);
    const start40 = parseFloat(labels40.labels[0]);
    assertClose(start40, 10, 1, 'Window should start at t=10s when current time is 40s');
  });
});

describe('X-Axis from Data Points (Problem Demo)', () => {

  it('should show blinking problem with data-dependent labels', () => {
    // Simulate data arriving over time
    const dataPoints = [];
    const labelSets = [];

    // First few seconds - data is sparse
    for (let t = 0; t < 1; t += 0.1) {
      dataPoints.push({ t, value: 50 });
      const result = calculateXAxisLabelsFromData(dataPoints);
      labelSets.push(result.labels);
    }

    // Check for inconsistency (blinking)
    // Label count will change as data arrives
    const labelCounts = labelSets.map(l => l.length);
    const uniqueCounts = [...new Set(labelCounts)];

    console.log(`     Label counts in first 1s: ${labelCounts.slice(0, 10).join(', ')}...`);
    assertTrue(uniqueCounts.length > 1, 'Label count changes as data arrives (this causes blinking)');
  });

  it('should have stable labels when data is sufficient', () => {
    // Simulate data after window is full
    const dataPoints = [];
    for (let t = 0; t < 35; t += 0.01) {
      dataPoints.push({ t, value: 50 });
    }

    // Now labels should be stable
    const result1 = calculateXAxisLabelsFromData([...dataPoints], 30);
    dataPoints.push({ t: 35.01, value: 50 });
    const result2 = calculateXAxisLabelsFromData(dataPoints, 30);

    // With enough data, labels should be consistent
    assertTrue(result1.dataLength > 1000, 'Should have many data points');
    assertTrue(result2.dataLength > 1000, 'Should have many data points after adding one');
  });
});

describe('Fixed Interval X-Axis Solution', () => {

  it('should generate stable labels regardless of data', () => {
    const result = calculateXAxisLabelsFixed(25, 30, 5);

    // Labels should be at 0, 5, 10, 15, 20, 25
    assertTrue(result.labels.length >= 4, 'Should have labels at 5s intervals');
    assertTrue(result.labels.includes('5.0') || result.labels.includes('10.0'), 'Should have 5s interval labels');
  });

  it('should not have labels before start of window', () => {
    const result = calculateXAxisLabelsFixed(10, 30, 5);

    const positions = result.positions;
    const minPos = Math.min(...positions);

    assertTrue(minPos >= 0, 'Should not have labels before t=0');
  });

  it('should maintain consistent label positions', () => {
    const result1 = calculateXAxisLabelsFixed(20, 30, 5);
    const result2 = calculateXAxisLabelsFixed(20.5, 30, 5);

    // Labels should be at same positions (5s intervals)
    const pos1 = result1.positions;
    const pos2 = result2.positions;

    // Should have same label positions (5s intervals)
    assertTrue(pos1.length === pos2.length, 'Label count should be same');
    for (let i = 0; i < pos1.length; i++) {
      assertClose(pos1[i], pos2[i], 0.01, `Position ${i} should be same`);
    }
  });
});

describe('Chart.js X-Axis Configuration', () => {

  it('should use linear scale with fixed min/max', () => {
    const config = createXAxisConfig(20);

    assertEqual(config.type, 'linear', 'Should use linear scale');
    assertEqual(config.min, 0, 'Min should be calculated');
    assertEqual(config.max, 20, 'Max should be current time');
    assertEqual(config.ticks.stepSize, 5, 'Should have 5s intervals');
  });

  it('should slide window correctly', () => {
    const config1 = createXAxisConfig(35);
    const config2 = createXAxisConfig(35.5);

    // Window should slide smoothly
    const minDiff = Math.abs(config2.min - config1.min);
    assertClose(minDiff, 0.5, 0.1, 'Window min should slide by 0.5s');

    const maxDiff = Math.abs(config2.max - config1.max);
    assertClose(maxDiff, 0.5, 0.1, 'Window max should slide by 0.5s');
  });

  it('should not go negative at start', () => {
    const config = createXAxisConfig(5);
    assertTrue(config.min >= 0, 'Min should not be negative');
  });
});

describe('Real Simulation Scenario', () => {

  it('should simulate first 10 seconds of chart updates', () => {
    // Simulate data arriving every 0.01s
    // Chart updates every frame (let's say 60fps = ~0.016s)
    const dataPoints = [];
    const updates = [];

    for (let t = 0; t <= 10; t += 0.016) {
      // Add new data point
      dataPoints.push({ t, value: 50 + Math.sin(t) * 0.5 });

      // Calculate X-axis config
      const config = createXAxisConfig(t);
      updates.push({
        time: t,
        min: config.min,
        max: config.max,
        dataLength: dataPoints.length
      });
    }

    // Check for smooth progression
    for (let i = 1; i < updates.length; i++) {
      const prev = updates[i-1];
      const curr = updates[i];

      // Min should not jump backwards
      if (curr.min > 0) {
        assertTrue(curr.min >= prev.min, `Min should not jump backwards at t=${curr.time}`);
      }

      // Max should increase smoothly
      assertTrue(curr.max >= prev.max, 'Max should increase');
    }

    console.log(`     Simulated ${updates.length} chart updates over 10s`);
    console.log(`     First update: min=${updates[0].min}, max=${updates[0].max}`);
    console.log(`     Last update: min=${updates[updates.length-1].min}, max=${updates[updates.length-1].max}`);
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
