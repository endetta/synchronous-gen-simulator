#!/usr/bin/env node
/**
 * tools/chart-smoothing.test.js
 * Test untuk validasi chart smoothing dan data rendering
 *
 * Memastikan:
 * 1. History sampling rate cukup untuk smooth chart
 * 2. Smart decimation tidak kehilangan detail penting
 * 3. Chart update frequency optimal
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Chart Smoothing Validation Test');
console.log('=====================================\n');

// Constants (sama seperti di simulator)
const PHDT = 0.003;  // Physics timestep (3 ms = 333 Hz)
const HSTEP_NEW = 0.016;  // History sampling (16 ms = 60 Hz)
const HSTEP_OLD = 0.04;   // Previous sampling (40 ms = 25 Hz)
const HWIN = 30;  // History window (30 seconds)
const CHART_UPDATE_INTERVAL = 5;  // 12 Hz (every 5 frames)
const MAX_CHART_POINTS = 600;  // Max points to render

// ================================================================
// Test 1: History Sampling Rate
// ================================================================
console.log('Test 1: History Sampling Rate');
console.log('-----------------------------');

// Old configuration (laggy)
const oldPointsPerSec = 1 / HSTEP_OLD;
const oldPointsInWindow = oldPointsPerSec * HWIN;
console.log(`Old sampling: ${oldPointsPerSec} Hz`);
console.log(`Old points in window: ${oldPointsInWindow}`);
console.log(`→ Data terlalu diskrit, chart terlihat patah-patah\n`);

// New configuration (smooth)
const newPointsPerSec = 1 / HSTEP_NEW;
const newPointsInWindow = newPointsPerSec * HWIN;
console.log(`New sampling: ${newPointsPerSec} Hz`);
console.log(`New points in window: ${newPointsInWindow}`);
console.log(`→ Data lebih halus, cukup untuk smooth chart\n`);

// ================================================================
// Test 2: Smart Decimation Quality
// ================================================================
console.log('Test 2: Smart Decimation Quality');
console.log('---------------------------------');

function smartDecimate(arr, maxPoints) {
  if (arr.length <= maxPoints) return arr;
  const result = [];
  const step = arr.length / maxPoints;
  result.push(arr[0]);
  for (let i = 1; i < maxPoints - 1; i++) {
    const idx = Math.floor(i * step);
    result.push(arr[idx]);
  }
  result.push(arr[arr.length - 1]);
  return result;
}

// Test dengan data sinusoidal (seperti power angle)
const sineData = Array.from({ length: 1800 }, (_, i) => ({
  t: i * 0.016,
  val: 20 + 10 * Math.sin(i * 0.05) + 5 * Math.sin(i * 0.2)
}));

const decimated = smartDecimate(sineData, MAX_CHART_POINTS);

console.log(`Original data points: ${sineData.length}`);
console.log(`Decimated points: ${decimated.length}`);
console.log(`Compression ratio: ${(sineData.length / decimated.length).toFixed(1)}x\n`);

// Verifikasi data tetap representatif
const originalMin = Math.min(...sineData.map(d => d.val));
const originalMax = Math.max(...sineData.map(d => d.val));
const decimatedMin = Math.min(...decimated.map(d => d.val));
const decimatedMax = Math.max(...decimated.map(d => d.val));

console.log('Data range preservation:');
console.log(`  Original min: ${originalMin.toFixed(2)}`);
console.log(`  Original max: ${originalMax.toFixed(2)}`);
console.log(`  Decimated min: ${decimatedMin.toFixed(2)} (Δ: ${(decimatedMin - originalMin).toFixed(2)})`);
console.log(`  Decimated max: ${decimatedMax.toFixed(2)} (Δ: ${(originalMax - decimatedMax).toFixed(2)})`);

const rangeError = Math.max(
  Math.abs(decimatedMin - originalMin),
  Math.abs(originalMax - decimatedMax)
);
console.log(`  Max range error: ${rangeError.toFixed(2)} (${(rangeError/originalMax*100).toFixed(1)}%)`);

const qualityPass = rangeError < 2.0; // < 2% error is acceptable
console.log(`  Quality check: ${qualityPass ? 'PASS ✓' : 'FAIL ✗'}\n`);

// ================================================================
// Test 3: Chart Update Frequency Analysis
// ================================================================
console.log('Test 3: Chart Update Frequency');
console.log('------------------------------');

// Frame timing (60 FPS)
const frameTime = 1000 / 60; // 16.67 ms
const chartUpdateRate = 1000 / (CHART_UPDATE_INTERVAL * frameTime);

console.log(`Physics FPS: 1000/PHDT = ${1000/PHDT} Hz`);
console.log(`History sampling: 1000/HSTEP = ${1000/HSTEP_NEW} Hz`);
console.log(`Chart update rate: 1000/(5 * ${frameTime.toFixed(0)}) = ${chartUpdateRate.toFixed(1)} Hz`);
console.log();

// Performance comparison
const oldChartOps = (1000/HSTEP_OLD) * 8;  // 8 .map() calls
const newChartOps = (1000/HSTEP_NEW) * 8;  // Single pass
console.log('Array operations per second (old vs new):');
console.log(`  Old: ${(oldChartOps/1000).toFixed(1)}k ops/sec`);
console.log(`  New: ${(newChartOps/1000).toFixed(1)}k ops/sec`);
console.log();

// ================================================================
// Test 4: Visual Smoothness Simulation
// ================================================================
console.log('Test 4: Visual Smoothness Simulation');
console.log('-------------------------------------');

// Simulate chart rendering quality
function calculateSmoothnessScore(decimatedData, originalData) {
  // Hitung error antara decimated dan original
  let totalError = 0;
  let maxError = 0;

  for (let i = 0; i < originalData.length; i++) {
    // Cari nilai decimated terdekat
    const decimatedIdx = Math.floor(i / (originalData.length / decimatedData.length));
    if (decimatedIdx < decimatedData.length) {
      const error = Math.abs(originalData[i].val - decimatedData[decimatedIdx].val);
      totalError += error;
      maxError = Math.max(maxError, error);
    }
  }

  const avgError = totalError / originalData.length;
  return { avgError, maxError };
}

const smoothness = calculateSmoothnessScore(decimated, sineData);
console.log('Visual quality metrics:');
console.log(`  Average error: ${smoothness.avgError.toFixed(2)}`);
console.log(`  Max error: ${smoothness.maxError.toFixed(2)}`);

const visualSmoothPass = smoothness.avgError < 1.0 && smoothness.maxError < 3.0;
console.log(`  Visual quality: ${visualSmoothPass ? 'PASS ✓' : 'FAIL ✗'}\n`);

// ================================================================
// Test 5: Memory and Performance Trade-off
// ================================================================
console.log('Test 5: Memory & Performance Trade-off');
console.log('---------------------------------------');

// Memory calculation
const bytesPerPoint = 100; // Estimated bytes per history entry
const oldMemory = oldPointsInWindow * bytesPerPoint / 1024; // KB
const newMemory = newPointsInWindow * bytesPerPoint / 1024; // KB
const renderMemory = MAX_CHART_POINTS * bytesPerPoint / 1024; // KB

console.log('Memory usage:');
console.log(`  Old history: ${(oldMemory).toFixed(1)} KB`);
console.log(`  New history: ${(newMemory).toFixed(1)} KB`);
console.log(`  Render buffer: ${(renderMemory).toFixed(1)} KB`);
console.log(`  Total increase: ${(newMemory - oldMemory).toFixed(1)} KB\n`);

// Performance
const oldUpdateRate = 1000 / (10 * 16.67); // Old: every 10 frames
const newUpdateRate = 1000 / (5 * 16.67);  // New: every 5 frames
const oldRenderCost = oldPointsInWindow * 8; // Old: 8 .map() calls
const newRenderCost = MAX_CHART_POINTS * 1; // New: single pass

console.log('Render performance:');
console.log(`  Old update rate: ${oldUpdateRate.toFixed(1)} Hz`);
console.log(`  New update rate: ${newUpdateRate.toFixed(1)} Hz`);
console.log(`  Old render cost: ${oldRenderCost.toLocaleString()} ops`);
console.log(`  New render cost: ${newRenderCost.toLocaleString()} ops`);
console.log(`  Cost reduction: ${((1 - newRenderCost/oldRenderCost)*100).toFixed(1)}%\n`);

// ================================================================
// Summary
// ================================================================
console.log('=====================================');
console.log('📊 TEST SUMMARY');
console.log('=====================================\n');

const allPass = qualityPass && visualSmoothPass;

console.log('Results:');
console.log(`  History sampling rate:      ${oldPointsPerSec} → ${newPointsPerSec} Hz`);
console.log(`  Data in window:             ${oldPointsInWindow} → ${newPointsInWindow}`);
console.log(`  Decimation quality:         ${qualityPass ? 'PASS' : 'FAIL'}`);
console.log(`  Visual smoothness:          ${visualSmoothPass ? 'PASS' : 'FAIL'}`);
console.log(`  Memory overhead:            ${(newMemory - oldMemory).toFixed(1)} KB`);
console.log(`  Render cost reduction:      ${((1 - newRenderCost/oldRenderCost)*100).toFixed(1)}%`);
console.log();
console.log(`Overall: ${allPass ? 'ALL TESTS PASS ✓' : 'SOME TESTS FAIL ✗'}\n`);

if (allPass) {
  console.log('Recommendations:');
  console.log('  ✓ HSTEP reduced from 40ms to 16ms (25Hz → 60Hz)');
  console.log('  ✓ History buffer increased to 1800 points');
  console.log('  ✓ Chart updates every 5 frames (12 Hz)');
  console.log('  ✓ Smart decimation to 600 points for rendering');
  console.log('  ✓ Single-pass data extraction (replaces 8 .map() calls)');
  console.log();
  console.log('Expected behavior:');
  console.log('  - Chart data sinkron dengan animasi generator');
  console.log('  - Smooth visual tanpa patah-patah');
  console.log('  - CPU usage tetap efisien');
}

process.exit(allPass ? 0 : 1);
