#!/usr/bin/env node
/**
 * Test: Frequency chart alignment & stability
 *
 * Bug: Kurva frekuensi sisi kanan menjorok ke kiri dibanding 3 kurva lain
 *      dan berkedip saat sumbu waktu ter-refresh.
 *
 * Root cause:
 * 1. Chart freq punya X-axis title → plot area lebih kecil → skala horizontal berbeda
 * 2. ScaleStabilizer update dengan timing berbeda + animation → blink
 */

const fs = require('fs');
const path = require('path');

const HTML_PATH = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');

console.log('=== Test: Frequency Chart Alignment & Stability ===\n');

let html;
try {
  html = fs.readFileSync(HTML_PATH, 'utf-8');
} catch (e) {
  console.error('GAGAL: File HTML tidak ditemukan');
  process.exit(1);
}

let failed = 0;

// ===== TEST 1: X-axis configuration consistency =====
console.log('TEST 1: X-axis configuration consistency');

// Extract baseOptsNoX and baseOptsWithX
const baseOptsNoXMatch = html.match(/const baseOptsNoX=\{[\s\S]*?scales:\{[\s\S]*?x:\{[\s\S]*?\},/);
const baseOptsWithXMatch = html.match(/const baseOptsWithX=\{[\s\S]*?scales:\{[\s\S]*?x:\{[\s\S]*?\},[\s\S]*?title:\{display:true/);

if (!baseOptsNoXMatch || !baseOptsWithXMatch) {
  console.log('  ✗ GAGAL: Tidak dapat menemukan konfigurasi X-axis');
  failed++;
} else {
  const noXConfig = baseOptsNoXMatch[0];
  const withXConfig = baseOptsWithXMatch[0];

  // Chart 1-3 seharusnya TIDAK punya title
  const noXHasTitle = noXConfig.includes('title:{display:true');

  // Chart 4 seharusnya PUNYA title
  const withXHasTitle = withXConfig.includes('title:{display:true');

  console.log(`  Chart 1-3 X-axis title: ${noXHasTitle ? 'ADA (BUG!)' : 'TIDAK ADA (correct)'}`);
  console.log(`  Chart 4 X-axis title: ${withXHasTitle ? 'ADA (ini yang menyebabkan misalignment)' : 'TIDAK ADA'}`);

  if (noXHasTitle) {
    console.log('  ✗ GAGAL: Chart 1-3 seharusnya tidak punya X-axis title');
    failed++;
  } else if (!withXHasTitle) {
    console.log('  ✗ GAGAL: Chart 4 seharusnya punya X-axis title');
    failed++;
  }
}

// ===== TEST 2: Chart layout compensation =====
console.log('\nTEST 2: Chart layout padding compensation');

// Cek apakah ada padding/layout compensation untuk menyamakan plot area
const hasLayoutCompensation = html.includes('layout:{padding:') ||
                              html.includes('chartArea:') ||
                              html.includes('// Plot area compensation') ||
                              html.includes('// X-axis title compensation');

if (hasLayoutCompensation) {
  console.log('  ✓ LOLOS: Ada mekanisme kompensasi layout untuk menyamakan plot area');
} else {
  console.log('  ✗ GAGAL: Tidak ada kompensasi layout');
  console.log('    Akibat: Plot area chart freq lebih kecil → data menjorok ke kiri');
  failed++;
}

// ===== TEST 3: Animation configuration untuk stabilitas =====
console.log('\nTEST 3: Animation configuration untuk mencegah blink');

// Extract freq chart creation
const freqChartMatch = html.match(/timeCharts\.freq=new Chart\(canvases\[3\],\{[\s\S]*?\}\);/);

if (!freqChartMatch) {
  console.log('  ✗ GAGAL: Tidak dapat menemukan konfigurasi freq chart');
  failed++;
} else {
  const freqConfig = freqChartMatch[0];

  // Cek animation duration
  const animDurationMatch = freqConfig.match(/animation:\{[\s\S]*?duration:(\d+)/);

  if (!animDurationMatch) {
    console.log('  ⚠ WARNING: Tidak dapat mengekstrak animation duration');
  } else {
    const duration = parseInt(animDurationMatch[1]);
    console.log(`  Animation duration: ${duration}ms`);

    if (duration > 0) {
      console.log('  ⚠ PERHATIAN: Animation enabled - bisa menyebabkan blink');
      console.log('    Recommendation: Set duration:0 atau false untuk chart freq');
    } else {
      console.log('  ✓ LOLOS: Animation disabled');
    }
  }
}

// ===== TEST 4: Update mode consistency =====
console.log('\nTEST 4: Chart update mode consistency');

// Semua chart seharusnya update dengan mode 'none' untuk performa
const updateCalls = html.match(/timeCharts\.\w+\.update\(['"](\w+)['"]\)/g) || [];
console.log(`  Total update calls: ${updateCalls.length}`);

const nonNoneUpdates = updateCalls.filter(call => !call.includes("'none'") && !call.includes('"none"'));

if (nonNoneUpdates.length > 0) {
  console.log(`  ⚠ WARNING: ${nonNoneUpdates.length} update calls tidak menggunakan 'none' mode`);
  console.log('    Ini bisa menyebabkan re-layout yang lambat');
} else {
  console.log('  ✓ LOLOS: Semua update menggunakan mode "none"');
}

// ===== TEST 5: Scale stabilizer tolerance =====
console.log('\nTEST 5: ScaleStabilizer tolerance untuk freq chart');

const stabilizerMatch = html.match(/chartStabilizers=\{[\s\S]*?freq:new ScaleStabilizer\(\{tolerance:([\d.]+)\}\)/);

if (!stabilizerMatch) {
  console.log('  ✗ GAGAL: Tidak dapat menemukan freq stabilizer configuration');
  failed++;
} else {
  const tolerance = parseFloat(stabilizerMatch[1]);
  console.log(`  Freq stabilizer tolerance: ${tolerance}`);

  if (tolerance < 0.03) {
    console.log('  ⚠ WARNING: Tolerance terlalu kecil - bisa menyebabkan blink');
    console.log('    Recommendation: Naikkan ke >= 0.03 untuk stabilitas');
  } else {
    console.log('  ✓ LOLOS: Tolerance cukup untuk stabilitas');
  }
}

// ===== SUMMARY =====
console.log('\n' + '='.repeat(50));
if (failed === 0) {
  console.log('✓ SEMUA TES LOLOS');
  process.exit(0);
} else {
  console.log(`✗ ${failed} TES GAGAL`);
  console.log('\nDiagnosis:');
  console.log('1. X-axis title di chart freq memakan space → plot area lebih kecil');
  console.log('2. Plot area berbeda ukuran → skala horizontal berbeda → menjorok ke kiri');
  console.log('3. Scale stabilizer + animation → blink effect');
  console.log('\nSolusi:');
  console.log('1. Tambah padding compensation di chart 1-3 untuk samakan plot area');
  console.log('2. Atau: hilangkan X-axis title di chart freq');
  console.log('3. Set animation duration ke 0 untuk chart freq');
  console.log('4. Naikkan tolerance stabilizer freq ke >= 0.03');
  process.exit(1);
}
