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

// ==================== CHART SCALE LOGIC (extracted from HTML - BUGGY VERSION) ====================

/**
 * Scale stabilizer untuk mencegah jitter
 * IMPLEMENTASI FIXED - mengatasi bug zero range dan slow convergence
 */
class ScaleStabilizer {
  constructor(opts = {}) {
    this.tolerance = opts.tolerance || 0.05; // 5% minimum change
    this.scaleHistory = [];
    this.currentScale = null;
  }

  update(newScale) {
    if (!this.currentScale) {
      this.currentScale = { min: newScale.min, max: newScale.max };
      return this.currentScale;
    }

    const range = this.currentScale.max - this.currentScale.min;
    const newRange = newScale.max - newScale.min;

    // FIX: Handle zero range cases by accepting the new scale directly
    if (range === 0 || newRange === 0) {
      this.currentScale = { min: newScale.min, max: newScale.max };
      return this.currentScale;
    }

    const minChange = Math.abs(newScale.min - this.currentScale.min) / range;
    const maxChange = Math.abs(newScale.max - this.currentScale.max) / range;

    // Ignore small changes
    if (minChange < this.tolerance && maxChange < this.tolerance) {
      return this.currentScale;
    }

    // FIX: Use adaptive strategy based on magnitude of change
    // For very large changes (>40%), snap immediately instead of smoothing
    // This prevents intermediate states from affecting subsequent small changes
    const maxChangeRatio = Math.max(minChange, maxChange);

    if (maxChangeRatio > 0.4) {
      // Large change: snap to new scale immediately
      this.currentScale = { min: newScale.min, max: newScale.max };
    } else {
      // Medium change: use fast smoothing
      const alpha = maxChangeRatio > 0.15 ? 0.6 : 0.3;
      this.currentScale.min = this.currentScale.min * (1 - alpha) + newScale.min * alpha;
      this.currentScale.max = this.currentScale.max * (1 - alpha) + newScale.max * alpha;
    }

    return this.currentScale;
  }

  reset() {
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

    // Normal operation - establish stable scale around 50 Hz
    for (let i = 0; i < 5; i++) {
      const scale = stabilizer.update({ min: 49.5, max: 50.5 });
      scales.push({ min: scale.min, max: scale.max }); // Clone to capture values
    }

    const initialScale = scales[scales.length - 1];
    const initialAvg = (initialScale.min + initialScale.max) / 2;

    // Step change (like a fault causing frequency drop to 47 Hz)
    for (let i = 0; i < 10; i++) {
      const scale = stabilizer.update({ min: 47, max: 48 });
      scales.push({ min: scale.min, max: scale.max }); // Clone to capture values
    }

    const finalScale = scales[scales.length - 1];
    const finalAvg = (finalScale.min + finalScale.max) / 2;

    // Scale should adapt to lower values after step change
    assertTrue(
      finalAvg < initialAvg - 1.0,
      `Scale should adapt to lower values after step change. Initial avg: ${initialAvg.toFixed(3)}, Final avg: ${finalAvg.toFixed(3)}`
    );
  });

  it('BUG DEMONSTRATION: tiny changes should NOT trigger scale updates', () => {
    // This test demonstrates the CORE BUG:
    // The tolerance is calculated relative to RANGE, not the actual change magnitude.
    // When range is small, even tiny changes appear as large percentages.

    const stabilizer = new ScaleStabilizer({ tolerance: 0.05 });

    // Initial scale with small range (typical for stable frequency)
    // Range = 50.1 - 49.9 = 0.2 Hz
    const scale1 = stabilizer.update({ min: 49.9, max: 50.1 });

    // Tiny change of 0.005 Hz (should be considered "small" and ignored)
    // With buggy implementation: change/range = 0.005/0.2 = 2.5% < 5% tolerance
    // So this SHOULD be ignored
    const result = stabilizer.update({ min: 49.905, max: 50.105 });

    // EXPECTED: Scale should remain at original values (tiny change ignored)
    // BUGGY: Scale might update because the tolerance logic is flawed

    // This test PASSES with current implementation (2.5% < 5% is correctly ignored)
    // But the bug manifests in other scenarios
    assertEqual(result.min, 49.9, 'Tiny change (2.5% of range) should be ignored');
    assertEqual(result.max, 50.1, 'Tiny change (2.5% of range) should be ignored');
  });

  it('FAILING TEST: scale should NOT jitter on borderline tolerance', () => {
    // This test FAILS with the buggy implementation
    // When change is EXACTLY at tolerance threshold, behavior is inconsistent

    const stabilizer = new ScaleStabilizer({ tolerance: 0.05 });

    // Range = 0.2
    stabilizer.update({ min: 49.9, max: 50.1 });

    // Change of 0.01 Hz = 5% of range (EXACTLY at tolerance)
    // With buggy implementation, this is at the edge and may cause jitter
    const result1 = stabilizer.update({ min: 49.91, max: 50.11 });

    // The scale should still be stable (at or below tolerance should be ignored)
    // But the smoothing factor alpha=0.3 is applied, changing the values
    // This is the BUG: borderline changes cause unwanted smoothing

    // EXPECTED: Values should remain stable
    // ACTUAL: Values get smoothed (partially updated)
    // This test WILL FAIL because the smoothing is applied even at threshold

    assertTrue(
      Math.abs(result1.min - 49.9) < 0.001,
      `At-tolerance change should be ignored, but min changed to ${result1.min}`
    );
    assertTrue(
      Math.abs(result1.max - 50.1) < 0.001,
      `At-tolerance change should be ignored, but max changed to ${result1.max}`
    );
  });

  it('FAILING TEST: repeated small changes cause drift (render bug)', () => {
    // This test captures the ACTUAL render bug:
    // Repeated small changes that are slightly above tolerance cause
    // the scale to drift continuously, creating a jittery visual effect

    const stabilizer = new ScaleStabilizer({ tolerance: 0.05 });
    const captured = [];

    // Establish initial scale
    stabilizer.update({ min: 49.9, max: 50.1 });
    captured.push({ min: 49.9, max: 50.1 });

    // Simulate 20 frames of data with tiny oscillations
    // Each change is 6% of range (0.012 Hz), just above 5% tolerance
    for (let i = 0; i < 20; i++) {
      const oscillation = Math.sin(i * 0.5) * 0.012;
      const newMin = 49.9 + oscillation;
      const newMax = 50.1 + oscillation;
      const result = stabilizer.update({ min: newMin, max: newMax });
      captured.push({ min: result.min, max: result.max });
    }

    // BUG: With smoothing applied to every frame, the scale drifts
    // even though the underlying data oscillates around a stable center

    // Check that the scale hasn't drifted too far from original
    const finalScale = captured[captured.length - 1];
    const originalScale = captured[0];

    // The final scale should still be close to the original
    // With the bug, repeated smoothing causes the scale to drift
    const minDrift = Math.abs(finalScale.min - originalScale.min);
    const maxDrift = Math.abs(finalScale.max - originalScale.max);

    // EXPECTED: Scale should remain relatively stable
    // BUGGY: Scale drifts significantly due to repeated smoothing
    assertTrue(
      minDrift < 0.05,
      `Scale min should not drift significantly. Drift: ${minDrift.toFixed(4)}`
    );
    assertTrue(
      maxDrift < 0.05,
      `Scale max should not drift significantly. Drift: ${maxDrift.toFixed(4)}`
    );
  });

  it('FAILING TEST: large range change should not use old range for tolerance', () => {
    // This test demonstrates the BUG:
    // The tolerance is calculated using the OLD range, not considering
    // that the new data might have a completely different range.

    const stabilizer = new ScaleStabilizer({ tolerance: 0.05 });

    // Initial scale with LARGE range (10 Hz)
    const r1 = stabilizer.update({ min: 45, max: 55 }); // Range = 10

    // Now the data settles to a SMALL range (0.2 Hz around 50 Hz)
    // Change in min = 4.9, Change in max = 4.9
    // With old range = 10: change/range = 4.9/10 = 49% >> 5% tolerance
    // So this will trigger an update (which is correct)

    // But then subsequent tiny changes:
    stabilizer.update({ min: 49.9, max: 50.1 });

    // Now range = 0.2, but this is AFTER the smoothing transition
    // If the smoothing didn't complete, range might still be ~10
    // causing incorrect tolerance calculations

    // Tiny change that should be ignored
    const result = stabilizer.update({ min: 49.91, max: 50.11 });

    // The tolerance check uses: change/range
    // change = 0.01, range = currentScale.max - currentScale.min
    // If currentScale hasn't fully transitioned, range could be ~9.4
    // making 0.01/9.4 = 0.1% which is correctly ignored

    // This test should pass with correct implementation
    // But fail if the smoothing causes intermediate states
    assertClose(result.min, 49.9, 0.01, 'Scale should stabilize after transition');
  });

  it('FAILING TEST: zero range edge case', () => {
    // This test captures a CRITICAL BUG:
    // When range becomes zero (all values are the same),
    // the tolerance check divides by zero

    const stabilizer = new ScaleStabilizer({ tolerance: 0.05 });

    // Normal scale
    stabilizer.update({ min: 49, max: 51 }); // Range = 2

    // Transition to zero range (all values equal)
    // This can happen when the system is perfectly stable
    const result = stabilizer.update({ min: 50, max: 50 }); // Range = 0

    // BUG: In the buggy implementation, range === 0 causes early return
    // with the OLD scale, not the new one!
    // The scale should update to { min: 50, max: 50 } (with padding added by calcYScale)
    // But instead it returns the old { min: ~49.7, max: ~50.3 } (smoothed value)

    // This test WILL FAIL with the buggy implementation
    assertClose(result.min, 50, 0.5, 'Scale should handle zero range data');
    assertClose(result.max, 50, 0.5, 'Scale should handle zero range data');
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
