/**
 * Chart Scale Test — Verifikasi smooth scaling untuk time series
 *
 * Test ini memastikan bahwa:
 * 1. Y-axis scale tidak berubah drastis (patah-patah) saat data baru masuk
 * 2. Y-axis scale adaptif dengan buffer zone yang reasonable
 * 3. X-axis (time) scale smooth dengan sliding window
 */

const fs = require('fs');
const path = require('path');

// Stub DOM environment
global.document = {
  getElementById: () => null,
  createElement: (tag) => ({
    tagName: tag.toUpperCase(),
    style: {},
    innerHTML: '',
    appendChild: () => {},
    querySelectorAll: () => []
  }),
  querySelectorAll: () => []
};

global.window = {
  requestAnimationFrame: (fn) => setTimeout(fn, 16)
};

// Load HTML file
const htmlPath = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// Extract JavaScript from HTML
const scriptMatch = htmlContent.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('❌ Tidak dapat menemukan script tag di HTML');
  process.exit(1);
}

// ==================== TEST UTILITIES ====================

let testsPassed = 0;
let testsFailed = 0;
const testResults = [];

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    return true;
  }
  throw new Error(`${message}\n  Expected: ${expected}\n  Actual: ${actual}`);
}

function assertClose(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    return true;
  }
  throw new Error(`${message}\n  Expected: ${expected} ± ${tolerance}\n  Actual: ${actual} (diff: ${diff})`);
}

function assertTrue(condition, message) {
  if (condition) {
    return true;
  }
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

// ==================== CHART SCALE LOGIC ====================

/**
 * Simulasi data generator untuk testing
 */
function generateTimeSeriesData(length, baseValue, variation) {
  const data = [];
  for (let i = 0; i < length; i++) {
    const noise = (Math.random() - 0.5) * variation;
    data.push({
      t: i * 0.01, // time in seconds
      value: baseValue + noise
    });
  }
  return data;
}

/**
 * Implementasi scale calculator yang akan di-test
 * Ini adalah versi yang SEDANG DIPERBAIKI
 */
function calculateYAxisScale(data, config = {}) {
  if (!data || data.length === 0) {
    return { min: 0, max: 1 };
  }

  const values = data.map(d => d.value);
  let dataMin = Math.min(...values);
  let dataMax = Math.max(...values);

  // Jika min === max, tambahkan padding
  if (dataMin === dataMax) {
    const absVal = Math.abs(dataMin) || 1;
    return {
      min: dataMin - absVal * 0.1,
      max: dataMax + absVal * 0.1
    };
  }

  // Tambahkan buffer zone (padding)
  const range = dataMax - dataMin;
  const padding = config.paddingPercent !== undefined
    ? range * config.paddingPercent
    : range * 0.1; // Default 10% padding

  let min = dataMin - padding;
  let max = dataMax + padding;

  // Round to nice values - HANYA jika diminta
  // Jangan round secara default untuk menghindari scale melompat-lompat
  if (config.niceValues) {
    const magnitude = Math.pow(10, Math.floor(Math.log10(range || 1)));
    min = Math.floor(min / magnitude) * magnitude;
    max = Math.ceil(max / magnitude) * magnitude;
  }

  return { min, max };
}

/**
 * Scale stabilizer untuk mencegah jitter
 */
class ScaleStabilizer {
  constructor(options = {}) {
    this.historySize = options.historySize || 5;
    this.tolerance = options.tolerance || 0.05; // 5% perubahan minimum
    this.scaleHistory = [];
    this.currentScale = null;
  }

  update(newScale) {
    this.scaleHistory.push(newScale);
    if (this.scaleHistory.length > this.historySize) {
      this.scaleHistory.shift();
    }

    // Jika belum ada scale, gunakan yang baru
    if (!this.currentScale) {
      this.currentScale = { ...newScale };
      return newScale;
    }

    // Hitung perubahan relatif
    const minChange = Math.abs(newScale.min - this.currentScale.min) /
                      Math.abs(this.currentScale.min || 1);
    const maxChange = Math.abs(newScale.max - this.currentScale.max) /
                      Math.abs(this.currentScale.max || 1);

    // Jika perubahan terlalu kecil, pertahankan scale lama
    if (minChange < this.tolerance && maxChange < this.tolerance) {
      return this.currentScale;
    }

    // Smooth transition
    const alpha = 0.3; // Smoothing factor
    this.currentScale.min = this.currentScale.min * (1 - alpha) + newScale.min * alpha;
    this.currentScale.max = this.currentScale.max * (1 - alpha) + newScale.max * alpha;

    return this.currentScale;
  }

  reset() {
    this.scaleHistory = [];
    this.currentScale = null;
  }
}

// ==================== TESTS ====================

describe('Chart Scale Calculation', () => {

  it('should calculate scale with padding for normal data', () => {
    const data = [
      { t: 0, value: 10 },
      { t: 1, value: 20 },
      { t: 2, value: 30 }
    ];

    const scale = calculateYAxisScale(data, { paddingPercent: 0.1 });

    // Range is 20 (30-10), padding is 2 (10%)
    // Min should be 10 - 2 = 8, Max should be 30 + 2 = 32
    assertClose(scale.min, 8, 0.5, 'Scale min should be ~8 (10% padding)');
    assertClose(scale.max, 32, 0.5, 'Scale max should be ~32 (10% padding)');
  });

  it('should handle single value data', () => {
    const data = [{ t: 0, value: 50 }];
    const scale = calculateYAxisScale(data);

    assertTrue(scale.min < 50, 'Scale min should be less than value');
    assertTrue(scale.max > 50, 'Scale max should be greater than value');
    assertClose(scale.min, 45, 5, 'Scale min should be ~45 (10% below)');
    assertClose(scale.max, 55, 5, 'Scale max should be ~55 (10% above)');
  });

  it('should handle zero range data', () => {
    const data = [
      { t: 0, value: 100 },
      { t: 1, value: 100 },
      { t: 2, value: 100 }
    ];
    const scale = calculateYAxisScale(data);

    assertTrue(scale.min < 100, 'Scale min should be less than value');
    assertTrue(scale.max > 100, 'Scale max should be greater than value');
  });

  it('should round to nice values when requested', () => {
    const data = [
      { t: 0, value: 12.3 },
      { t: 1, value: 87.7 }
    ];

    // Test WITH niceValues enabled
    const scaleNice = calculateYAxisScale(data, { niceValues: true });
    assertTrue(scaleNice.min % 10 === 0 || scaleNice.min === 0, 'Min should be nice value when enabled');
    assertTrue(scaleNice.max % 10 === 0, 'Max should be nice value when enabled');

    // Test WITHOUT niceValues (default) - should have smooth padding
    const scaleDefault = calculateYAxisScale(data);
    assertTrue(scaleDefault.min < 12.3, 'Min should be below data min');
    assertTrue(scaleDefault.max > 87.7, 'Max should be above data max');
  });

  it('should handle negative values', () => {
    const data = [
      { t: 0, value: -20 },
      { t: 1, value: -10 }
    ];
    const scale = calculateYAxisScale(data);

    assertTrue(scale.min < -20, 'Scale min should be less than data min');
    assertTrue(scale.max > -10, 'Scale max should be greater than data max');
  });
});

describe('Scale Stabilizer', () => {

  it('should return first scale immediately', () => {
    const stabilizer = new ScaleStabilizer();
    const scale = { min: 0, max: 100 };
    const result = stabilizer.update(scale);

    assertEqual(result.min, 0, 'First scale min should be used');
    assertEqual(result.max, 100, 'First scale max should be used');
  });

  it('should ignore small scale changes', () => {
    const stabilizer = new ScaleStabilizer({ tolerance: 0.05 });
    stabilizer.update({ min: 0, max: 100 });

    // Small change (2%)
    const result = stabilizer.update({ min: 0, max: 102 });

    assertEqual(result.max, 100, 'Should ignore changes below tolerance');
  });

  it('should accept large scale changes', () => {
    const stabilizer = new ScaleStabilizer({ tolerance: 0.05 });
    stabilizer.update({ min: 0, max: 100 });

    // Large change (20%)
    const result = stabilizer.update({ min: 0, max: 120 });

    assertTrue(result.max > 100, 'Should accept changes above tolerance');
    assertTrue(result.max < 120, 'Should smooth the transition');
  });

  it('should maintain history size limit', () => {
    const stabilizer = new ScaleStabilizer({ historySize: 3 });

    for (let i = 0; i < 10; i++) {
      stabilizer.update({ min: 0, max: i * 10 });
    }

    assertEqual(stabilizer.scaleHistory.length, 3, 'History should be limited to 3');
  });

  it('should reset scale history', () => {
    const stabilizer = new ScaleStabilizer();
    stabilizer.update({ min: 0, max: 100 });
    stabilizer.update({ min: 0, max: 110 });

    stabilizer.reset();

    assertEqual(stabilizer.scaleHistory.length, 0, 'History should be empty after reset');
    assertEqual(stabilizer.currentScale, null, 'Current scale should be null after reset');
  });
});

describe('Scale Stability Over Time', () => {

  it('should maintain stable scale during oscillation', () => {
    const stabilizer = new ScaleStabilizer({ tolerance: 0.03 });
    const scales = [];

    // Simulate oscillating data (like generator frequency)
    for (let i = 0; i < 20; i++) {
      const baseValue = 50 + Math.sin(i * 0.5) * 0.2; // 49.8 - 50.2 Hz
      const data = generateTimeSeriesData(10, baseValue, 0.1);
      const scale = calculateYAxisScale(data.map(d => ({ t: d.t, value: d.value })));
      const stabilized = stabilizer.update(scale);
      scales.push(stabilized);
    }

    // Check that scale variance is low
    const maxValues = scales.map(s => s.max);
    const minValues = scales.map(s => s.min);
    const maxVariance = Math.max(...maxValues) - Math.min(...maxValues);
    const minVariance = Math.max(...minValues) - Math.min(...minValues);

    assertTrue(maxVariance < 2, `Max variance should be < 2, got ${maxVariance}`);
    assertTrue(minVariance < 2, `Min variance should be < 2, got ${minVariance}`);
  });

  it('should adapt to step changes gracefully', () => {
    const stabilizer = new ScaleStabilizer({ tolerance: 0.02 });
    const scales = [];

    // Normal operation (50 Hz range)
    for (let i = 0; i < 5; i++) {
      const data = generateTimeSeriesData(10, 50, 0.02);
      const scale = calculateYAxisScale(data.map(d => ({ t: d.t, value: d.value })));
      const stabilized = stabilizer.update(scale);
      scales.push({ min: stabilized.min, max: stabilized.max }); // Clone values
    }

    const scaleBeforeStep = scales[scales.length - 1];

    // Step change (fault event - lower frequency)
    for (let i = 0; i < 10; i++) {
      const data = generateTimeSeriesData(10, 47, 0.1);
      const scale = calculateYAxisScale(data.map(d => ({ t: d.t, value: d.value })));
      const stabilized = stabilizer.update(scale);
      scales.push({ min: stabilized.min, max: stabilized.max }); // Clone values
    }

    const finalScale = scales[scales.length - 1];

    // With 3 Hz drop, scale should definitely change
    const maxDiff = scaleBeforeStep.max - finalScale.max;
    const minDiff = scaleBeforeStep.min - finalScale.min;

    // At least one boundary should have changed significantly (around 3 Hz)
    assertTrue(
      Math.abs(maxDiff) > 1.5 || Math.abs(minDiff) > 1.5,
      `Scale should adapt to lower values, maxDiff=${maxDiff.toFixed(3)}, minDiff=${minDiff.toFixed(3)}`
    );
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
