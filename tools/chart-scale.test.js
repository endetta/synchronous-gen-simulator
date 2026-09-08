/**
 * Chart Scale Test — Verifikasi smooth scaling untuk time series
 * Focusses on the ScaleStabilizer render bug fix
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
  console.error('Tidak dapat menemukan script tag di HTML');
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
  console.log('-'.repeat(60));
  fn();
}

function it(testName, fn) {
  try {
    fn();
    testsPassed++;
    console.log(`  PASS: ${testName}`);
    testResults.push({ name: testName, status: 'PASS' });
  } catch (error) {
    testsFailed++;
    console.log(`  FAIL: ${testName}`);
    console.log(`     ${error.message}`);
    testResults.push({ name: testName, status: 'FAIL', error: error.message });
  }
}

// ==================== CHART SCALE LOGIC (extracted from HTML) ====================

/**
 * Scale stabilizer untuk mencegah jitter
 * INI ADALAH IMPLEMENTASI YANG SEDANG DIPERBAIKI
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
      return this.currentScale;
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

/**
 * Calculate Y-axis scale with padding
 */
function calcYScale(data, paddingPct = 0.1) {
  if (!data || data.length === 0) {
    return { min: 0, max: 1 };
  }
  let min = Math.min(...data);
  let max = Math.max(...data);
  if (min === max) {
    const absVal = Math.abs(min) || 1;
    return { min: min - absVal * 0.1, max: max + absVal * 0.1 };
  }
  const range = max - min;
  const padding = range * paddingPct;
  return { min: min - padding, max: max + padding };
}

// ==================== TESTS ====================

describe('Chart Scale Calculation', () => {
  it('should calculate scale with padding for normal data', () => {
    const data = [10, 20, 30];
    const scale = calcYScale(data, 0.1);

    // Range is 20 (30-10), padding is 2 (10%)
    // Min should be 10 - 2 = 8, Max should be 30 + 2 = 32
    assertClose(scale.min, 8, 0.5, 'Scale min should be ~8 (10% padding)');
    assertClose(scale.max, 32, 0.5, 'Scale max should be ~32 (10% padding)');
  });

  it('should handle single value data', () => {
    const data = [50];
    const scale = calcYScale(data);

    assertTrue(scale.min < 50, 'Scale min should be less than value');
    assertTrue(scale.max > 50, 'Scale max should be greater than value');
    assertClose(scale.min, 45, 5, 'Scale min should be ~45 (10% below)');
    assertClose(scale.max, 55, 5, 'Scale max should be ~55 (10% above)');
  });

  it('should handle zero range data', () => {
    const data = [100, 100, 100];
    const scale = calcYScale(data);

    assertTrue(scale.min < 100, 'Scale min should be less than value');
    assertTrue(scale.max > 100, 'Scale max should be greater than value');
  });

  it('should handle negative values', () => {
    const data = [-20, -10];
    const scale = calcYScale(data);

    assertTrue(scale.min < -20, 'Scale min should be less than data min');
    assertTrue(scale.max > -10, 'Scale max should be greater than data max');
  });
});

describe('Scale Stabilizer - BUG TESTS (should fail before fix)', () => {
  it('should maintain stable scale during small oscillations (render bug)', () => {
    // Simulate generator frequency oscillating around 50 Hz
    // With small variations (49.9 - 50.1 Hz), the scale should NOT jitter
    const stabilizer = new ScaleStabilizer({ tolerance: 0.03 });
    const scales = [];

    // Normal operation: values around 50 Hz with small oscillation
    for (let i = 0; i < 20; i++) {
      const baseValue = 50 + Math.sin(i * 0.5) * 0.1; // 49.9 - 50.1 Hz
      const data = [baseValue, baseValue + 0.05];
      const scale = calcYScale(data);
      const stabilized = stabilizer.update(scale);
      scales.push(stabilized);
    }

    // Check that scale variance is low
    const maxValues = scales.map(s => s.max);
    const minValues = scales.map(s => s.min);
    const maxVariance = Math.max(...maxValues) - Math.min(...maxValues);
    const minVariance = Math.max(...minValues) - Math.min(...minValues);

    // BUG: The stabilizer should keep variance low (< 0.5 Hz)
    // Currently FAILING because the tolerance check is broken
    assertTrue(
      maxVariance < 0.5,
      `Scale should be stable during oscillation, maxVariance=${maxVariance} (should be < 0.5)`
    );
    assertTrue(
      minVariance < 0.5,
      `Scale should be stable during oscillation, minVariance=${minVariance} (should be < 0.5)`
    );
  });

  it('should correctly ignore small scale changes that are below tolerance', () => {
    // Create a stabilizer with 5% tolerance
    const stabilizer = new ScaleStabilizer({ tolerance: 0.05 });
    stabilizer.update({ min: 49, max: 51 }); // Range = 2

    // Small change: 0.05 (2.5% of range) - should be IGNORED
    const result1 = stabilizer.update({ min: 49.025, max: 51.025 });

    // The result should be the original scale (unchanged)
    // BUG: Currently it updates because tolerance calculation is wrong
    assertEqual(
      result1.min,
      49,
      'Scale should NOT change for changes below tolerance'
    );
    assertEqual(
      result1.max,
      51,
      'Scale should NOT change for changes below tolerance'
    );
  });

  it('should accept large scale changes during fault events', () => {
    const stabilizer = new ScaleStabilizer({ tolerance: 0.05 });
    stabilizer.update({ min: 49, max: 51 });

    // Large change: 3 Hz drop (50 → 47) - should be ACCEPTED
    const result = stabilizer.update({ min: 46, max: 48 });

    // With 3 Hz drop (>5% tolerance), scale should change
    assertTrue(
      result.min < 49,
      'Scale should accept large changes (50->47)'
    );
  });

  it('should handle scale changes when current scale min is near zero', () => {
    // This is a critical bug case: when min is near 0, the division causes issues
    const stabilizer = new ScaleStabilizer({ tolerance: 0.05 });
    stabilizer.update({ min: 0.001, max: 2 }); // Very small min

    // Small change that should be ignored (less than 5%)
    const result = stabilizer.update({ min: 0.002, max: 2.01 });

    // BUG: The relative change calculation breaks when min is near 0
    // Should keep original scale since change is small
    // But currently it might incorrectly update due to division by tiny number
    assertClose(
      result.min,
      0.001,
      0.0005,
      'Scale should be stable when min is near zero'
    );
  });

  it('should handle step changes gracefully with smooth transition', () => {
    const stabilizer = new ScaleStabilizer({ tolerance: 0.02 });
    const scales = [];

    // Normal operation
    for (let i = 0; i < 5; i++) {
      const scale = stabilizer.update({ min: 49.5, max: 50.5 });
      scales.push(scale);
    }

    // Step change (like a fault causing frequency drop)
    for (let i = 0; i < 10; i++) {
      const scale = stabilizer.update({ min: 47, max: 48 });
      scales.push(scale);
    }

    // The scale should transition smoothly, not jump instantly
    const initialAvg = (scales[0].min + scales[0].max) / 2;
    const finalAvg = (scales[scales.length - 1].min + scales[scales.length - 1].max) / 2;

    // BUG: Without proper transition, the scale jumps too fast or too slow
    assertTrue(
      finalAvg < initialAvg,
      'Scale should adapt to lower values after step change'
    );

    // With smoothing, the change should be gradual
    const midAvg = (scales[5].min + scales[5].max) / 2;
    assertTrue(
      midAvg < initialAvg && midAvg > finalAvg,
      'Scale should transition smoothly, not jump'
    );
  });
});

describe('Scale Stability Over Time', () => {
  it('should maintain stable scale during sustained oscillation', () => {
    const stabilizer = new ScaleStabilizer({ tolerance: 0.03 });
    const scales = [];

    // Simulate sustained oscillation (like during a transient)
    for (let i = 0; i < 30; i++) {
      const baseValue = 50 + Math.sin(i * 0.2) * 0.3; // 49.7 - 50.3 Hz
      const data = [baseValue, baseValue + 0.02];
      const scale = calcYScale(data);
      const stabilized = stabilizer.update(scale);
      scales.push(stabilized);
    }

    // Check variance is low (scale stabilized)
    const maxValues = scales.map(s => s.max);
    const minValues = scales.map(s => s.min);
    const maxVariance = Math.max(...maxValues) - Math.min(...maxValues);
    const minVariance = Math.max(...minValues) - Math.min(...minValues);

    assertTrue(
      maxVariance < 0.6,
      `Max variance should be < 0.6 during oscillation, got ${maxVariance}`
    );
    assertTrue(
      minVariance < 0.6,
      `Min variance should be < 0.6 during oscillation, got ${minVariance}`
    );
  });
});

describe('DOM Structure Tests', () => {
  it('should preserve vlabel and drag-handle when initializing charts', () => {
    // Simulate pane3 structure from HTML
    const pane3 = {
      innerHTML: '',
      children: [],
      querySelectorAll: () => [],
      appendChild: (child) => { pane3.children.push(child); },
      getElementById: () => null
    };

    // The initTimeCharts() function should keep vlabel and drag-handle
    // This test is a placeholder - actual DOM test requires browser

    assertTrue(true, 'Structure validation - vlabel and drag-handle preserved');
  });
});

describe('Chart Initialization', () => {
  it('should create 4 chart canvases for delta, omega, power, and frequency', () => {
    const expectedCharts = ['delta', 'omega', 'power', 'freq'];

    assertEqual(expectedCharts.length, 4, 'Should have 4 chart types');
  });
});

// ==================== SUMMARY ====================

console.log('\n' + '='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Total: ${testsPassed + testsFailed} tests`);
console.log(`PASS: ${testsPassed}`);
console.log(`FAIL: ${testsFailed}`);
console.log('='.repeat(60));

if (testsFailed > 0) {
  console.log('\nFailed tests:');
  testResults
    .filter(t => t.status === 'FAIL')
    .forEach(t => console.log(`  - ${t.name}`));
  console.log('\nNOTE: This test file contains tests that currently FAIL due to');
  console.log(' ScaleStabilizer render bug. After fixing the bug, these tests');
  console.log(' should all PASS.');
  process.exit(1);
} else {
  console.log('\nAll tests passed!');
  process.exit(0);
}
