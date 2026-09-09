#!/usr/bin/env node
/**
 * Animation Mode Toggle Bug Test
 *
 * Bug: Ketika user toggle fasor → realistis → fasor → realistis,
 * simulator freeze karena SVG ready flags tidak di-reset saat mode berubah.
 *
 * Root cause:
 * - initSvgPhasor() set phasorReady=true dan clear innerHTML
 * - initSvgRealistic() set rsReady=true dan clear innerHTML
 * - Tapi setAnimMode() TIDAK reset flag yang berlawanan
 * - Akibat: SVG structure mismatch, operasi pada null elements
 */

const fs = require('fs');
const path = require('path');

// Navigate to correct path (file is in SHEVA'S SIMULATOR LIBRARY root, not LEVEL 1 subfolder)
const HTML_PATH = path.join(__dirname, '..', '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');

function testAnimModeToggleBug() {
  console.log('Testing Animation Mode Toggle Bug...\n');

  const html = fs.readFileSync(HTML_PATH, 'utf-8');

  // Extract setAnimMode function
  const setAnimModeMatch = html.match(/function setAnimMode\(mode\)\{[\s\S]*?\n\}/);
  if (!setAnimModeMatch) {
    throw new Error('setAnimMode function not found');
  }

  const setAnimModeCode = setAnimModeMatch[0];
  console.log('Current setAnimMode implementation:');
  console.log(setAnimModeCode);
  console.log();

  // Check if it resets ready flags
  const resetsPhasorReady = /phasorReady\s*=\s*false/.test(setAnimModeCode);
  const resetsRsReady = /rsReady\s*=\s*false/.test(setAnimModeCode);

  console.log('Bug Detection:');
  console.log(`  - Resets phasorReady flag: ${resetsPhasorReady ? '✓' : '✗ MISSING'}`);
  console.log(`  - Resets rsReady flag: ${resetsRsReady ? '✓' : '✗ MISSING'}`);
  console.log();

  if (!resetsPhasorReady || !resetsRsReady) {
    console.log('❌ BUG CONFIRMED: setAnimMode() does NOT reset ready flags');
    console.log();
    console.log('Expected behavior:');
    console.log('  When switching to realistic mode → phasorReady should be set to false');
    console.log('  When switching to phasor mode → rsReady should be set to false');
    console.log();
    console.log('Why this causes freeze:');
    console.log('  1. User clicks "Fasor" → phasorReady=true, SVG initialized with phasor structure');
    console.log('  2. User clicks "Realistis" → rsReady=true, SVG innerHTML cleared & realistic structure created');
    console.log('  3. User clicks "Fasor" again → phasorReady STILL true, NO re-init');
    console.log('     BUT: SVG structure is still realistic (wrong structure!)');
    console.log('  4. updateSvgPhasorClassic() tries to query phasor elements → returns NULL');
    console.log('  5. Operations on null elements → freeze/crash');
    console.log();
    return false;
  } else {
    console.log('✓ No bug detected: ready flags are properly reset');
    return true;
  }
}

try {
  const passed = testAnimModeToggleBug();
  process.exit(passed ? 0 : 1);
} catch (err) {
  console.error('Test error:', err.message);
  process.exit(1);
}
