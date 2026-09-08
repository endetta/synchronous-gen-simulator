/**
 * UI Test — Synchronous Generator Simulator
 * Validasi DOM structure dan interaksi UI
 *
 * Usage: node tools/ui.test.js
 */

const fs = require('fs');
const path = require('path');

// Simple DOM mock
class MockDOM {
  constructor(html) {
    this.html = html;
    this.elements = {};
    this.events = {};
  }

  getElementById(id) {
    if (!this.elements[id]) {
      this.elements[id] = {
        id: id,
        value: '',
        checked: false,
        className: '',
        style: {},
        textContent: '',
        innerHTML: '',
        disabled: false,
        dispatchEvent: (e) => {
          if (this.events[id] && this.events[id][e.type]) {
            this.events[id][e.type](e);
          }
        },
        addEventListener: (type, fn) => {
          if (!this.events[id]) this.events[id] = {};
          this.events[id][type] = fn;
        },
        classList: {
          add: (c) => { this.elements[id].className += ' ' + c; },
          remove: (c) => { this.elements[id].className = this.elements[id].className.replace(c, '').trim(); },
          toggle: (c) => { this.elements[id].className = this.elements[id].className.includes(c) ? this.elements[id].className.replace(c, '').trim() : this.elements[id].className + ' ' + c; }
        }
      };
    }
    return this.elements[id];
  }

  querySelector(selector) {
    return null;
  }

  querySelectorAll(selector) {
    return [];
  }
}

// Test utilities
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    console.log(`  ✗ ${message}`);
  }
}

function assertContains(text, substring, message) {
  const found = text.includes(substring);
  if (found) {
    passCount++;
    console.log(`  ✓ ${message}`);
  } else {
    failCount++;
    console.log(`  ✗ ${message} (not found: "${substring}")`);
  }
}

// Read HTML file
const htmlPath = path.join(__dirname, '..', 'LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html');
const html = fs.readFileSync(htmlPath, 'utf-8');

console.log('\n=== UI Structure Tests ===\n');

// Test 1: HTML Structure
console.log('Test 1: HTML Structure');
assertContains(html, '<!DOCTYPE html>', 'HTML5 doctype present');
assertContains(html, '<html lang="id">', 'HTML lang="id" for Indonesian');
assertContains(html, '<meta charset="UTF-8">', 'UTF-8 charset');
assertContains(html, '<meta name="viewport"', 'Viewport meta tag');

// Test 2: Title
console.log('\nTest 2: Title');
assertContains(html, '<title>Synchronous Generator Operation', 'Title contains "Synchronous Generator Operation"');
assertContains(html, "Sheva's Simulator Library", 'Title contains library name');

// Test 3: Fonts
console.log('\nTest 3: Fonts');
assertContains(html, 'Playfair Display', 'Serif font (Playfair Display) loaded');
assertContains(html, 'EB Garamond', 'Body font (EB Garamond) loaded');

// Test 4: Header Elements
console.log('\nTest 4: Header Elements');
assertContains(html, 'id="hd"', 'Header stat: δ Angle');
assertContains(html, 'id="hw"', 'Header stat: Δω Speed');
assertContains(html, 'id="hf"', 'Header stat: Frequency');
assertContains(html, 'id="hp"', 'Header stat: Pe Output');
assertContains(html, 'id="hm"', 'Header stat: Pm Input');
assertContains(html, 'id="scbadge"', 'Short circuit badge');

// Test 5: Panel Structure
console.log('\nTest 5: Panel Structure');
assertContains(html, 'id="pane1"', 'Panel I: Phasor Animation');
assertContains(html, 'id="pane2"', 'Panel II: P-δ Curve');
assertContains(html, 'id="pane3"', 'Panel III: Time Series');
assertContains(html, 'id="svgPhasor"', 'SVG Phasor element');
assertContains(html, 'id="svgPdelta"', 'SVG P-δ element');
assertContains(html, 'id="cv3"', 'Canvas time series element');

// Test 6: Control Sections
console.log('\nTest 6: Control Sections');
assertContains(html, 'Operating Mode', 'Operating Mode section');
assertContains(html, 'Live System Status', 'Live System Status section');
assertContains(html, 'Generator Parameters', 'Generator Parameters section');
assertContains(html, 'Prime Mover', 'Prime Mover section');
assertContains(html, 'Excitation (AVR)', 'Excitation section');
assertContains(html, 'Short Circuit Event', 'Short Circuit Event section');
assertContains(html, 'Real Load Response', 'RLR section');
assertContains(html, 'Preset Scenarios', 'Preset Scenarios section');

// Test 7: Parameter Inputs
console.log('\nTest 7: Parameter Inputs');
assertContains(html, 'id="nH"', 'H parameter input');
assertContains(html, 'id="sH"', 'H parameter slider');
assertContains(html, 'id="nD"', 'D parameter input');
assertContains(html, 'id="sD"', 'D parameter slider');
assertContains(html, 'id="nXs"', 'X\'d parameter input');
assertContains(html, 'id="sXs"', 'X\'d parameter slider');
assertContains(html, 'id="nPm"', 'Pm parameter input');
assertContains(html, 'id="sPm"', 'Pm parameter slider');
assertContains(html, 'id="nEf"', 'Ef parameter input');
assertContains(html, 'id="sEf"', 'Ef parameter slider');

// Test 8: Buttons
console.log('\nTest 8: Buttons');
assertContains(html, 'onclick="doReset()"', 'Reset button');
assertContains(html, 'onclick="trigSC()"', 'Short circuit trigger button');
assertContains(html, 'onclick="startRLR()"', 'RLR start button');
assertContains(html, 'onclick="stopRLR()"', 'RLR stop button');

// Test 9: Preset Scenarios
console.log('\nTest 9: Preset Scenarios');
assertContains(html, "runSc('load_step')", 'Load Step preset');
assertContains(html, "runSc('grid_island')", 'Grid vs Island preset');
assertContains(html, "runSc('sc_success')", 'SC Berhasil Clear preset');
assertContains(html, "runSc('sc_fail')", 'SC Gagal Clear preset');
assertContains(html, "runSc('overexcitation')", 'Overexcitation preset');

// Test 10: Mode Toggle
console.log('\nTest 10: Mode Toggle');
assertContains(html, 'id="bGrid"', 'Grid-Connected button');
assertContains(html, 'id="bIsland"', 'Island Mode button');
assertContains(html, "setMode('grid')", 'Grid mode handler');
assertContains(html, "setMode('island')", 'Island mode handler');

// Test 11: OOS Warning
console.log('\nTest 11: OOS Warning');
assertContains(html, 'id="oos-overlay"', 'OOS overlay element');
assertContains(html, 'id="oos-warn"', 'OOS warning banner');
assertContains(html, 'LOSS OF SYNCHRONISM', 'OOS warning text');

// Test 12: Legend
console.log('\nTest 12: Legend');
assertContains(html, 'P<sub>m</sub> — Mechanical Power', 'Legend: Pm');
assertContains(html, 'P<sub>e</sub> — Electrical Power', 'Legend: Pe');
assertContains(html, 'δ — Power Angle', 'Legend: δ');
assertContains(html, 'Δω / Frequency Deviation', 'Legend: Δω');
assertContains(html, 'A₁ — Acceleration Area', 'Legend: A₁');
assertContains(html, 'A₂ — Deceleration Area', 'Legend: A₂');

// Test 13: References
console.log('\nTest 13: Academic References');
assertContains(html, 'Kundur, P. (1994)', 'Kundur reference');
assertContains(html, 'Anderson, P. M., &amp; Fouad, A. A. (2003)', 'Anderson & Fouad reference');
assertContains(html, 'IEEE Std 399-1997', 'IEEE Std 399-1997 reference');
assertContains(html, 'IEEE Std 421.5', 'IEEE Std 421.5 reference');

// Test 14: CSS Variables
console.log('\nTest 14: CSS Variables');
assertContains(html, '--etap:#c42000', 'Primary accent color (--etap)');
assertContains(html, '--serif:', 'Serif font variable');
assertContains(html, '--body:', 'Body font variable');
assertContains(html, '--mono:', 'Mono font variable');

// Test 15: JavaScript Constants
console.log('\nTest 15: JavaScript Constants');
assertContains(html, 'const F0=50', 'Nominal frequency constant');
assertContains(html, 'const WS=2*Math.PI*50', 'Synchronous speed constant');
assertContains(html, 'const PHDT=0.003', 'Physics timestep constant');
assertContains(html, 'const HWIN=30', 'History window constant');

// Test 16: Physics Functions
console.log('\nTest 16: Physics Functions');
assertContains(html, 'function makeState()', 'State initialization function');
assertContains(html, 'function getPmax(s)', 'Pmax calculation function');
assertContains(html, 'function getPe(s)', 'Pe calculation function');
assertContains(html, 'function getCC(s)', 'Critical clearing angle function');
assertContains(html, 'function getCCT(s)', 'Critical clearing time function');
assertContains(html, 'function ode(s,', 'ODE system function');
assertContains(html, 'function rk4(s,dt)', 'RK4 integrator function');

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Total:  ${passCount + failCount}`);

if (failCount > 0) {
  process.exit(1);
}
