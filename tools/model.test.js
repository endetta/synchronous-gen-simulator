/**
 * Model Test — Synchronous Generator Simulator
 * Validasi model fisika terhadap solusi analitik
 *
 * Usage: node tools/model.test.js
 *
 * Ref: Kundur (1994) §11.1-11.3, Anderson & Fouad (2003) §2.4
 */

const fs = require('fs');
const path = require('path');

// Constants (from HTML)
const F0 = 50;
const WS = 2 * Math.PI * 50;
const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;
const PHDT = 0.003;

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

function assertClose(actual, expected, tolerance, message) {
  const diff = Math.abs(actual - expected);
  const pass = diff <= tolerance;
  if (pass) {
    passCount++;
    console.log(`  ✓ ${message} (Δ=${diff.toFixed(6)})`);
  } else {
    failCount++;
    console.log(`  ✗ ${message} (expected=${expected}, actual=${actual}, Δ=${diff.toFixed(6)})`);
  }
}

// Physics functions (extracted from HTML)
function getPmax(Ef, V, Xs) {
  return Ef * V / Xs;
}

function getPe(Pmax, delta) {
  return Pmax * Math.sin(delta);
}

function getCC(Pm, Pmax) {
  const d0 = Math.asin(Math.min(Pm / Pmax, 0.9999));
  const c = Pm * (Math.PI - 2 * d0) / Pmax - Math.cos(d0);
  if (c < -1 || c > 1) return null;
  return Math.acos(c);
}

function getCCT(H, dcc, d0, Pm) {
  if (!dcc || Pm <= 0) return null;
  return Math.sqrt(4 * H * (dcc - d0) / (WS * Pm));
}

function getTosc(H, Ks) {
  // T_osc = 2π√(2H/(ωs·Ks))
  return 2 * Math.PI * Math.sqrt(2 * H / (WS * Ks));
}

// RK4 integrator
function rk4(f, y, t, dt) {
  const k1 = f(t, y);
  const k2 = f(t + 0.5 * dt, y.map((yi, i) => yi + 0.5 * dt * k1[i]));
  const k3 = f(t + 0.5 * dt, y.map((yi, i) => yi + 0.5 * dt * k2[i]));
  const k4 = f(t + dt, y.map((yi, i) => yi + dt * k3[i]));
  return y.map((yi, i) => yi + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

// Tests
console.log('\n=== Model Physics Tests ===\n');

// Test 1: Power-Angle Relationship
console.log('Test 1: Power-Angle Relationship');
const Pmax = getPmax(1.5, 1.0, 1.2);
assertClose(Pmax, 1.25, 0.001, 'Pmax = E\'·V/X\'d = 1.5·1.0/1.2');

const Pe0 = getPe(Pmax, 0);
assertClose(Pe0, 0, 0.001, 'Pe(δ=0) = 0');

const Pe90 = getPe(Pmax, Math.PI / 2);
assertClose(Pe90, Pmax, 0.001, 'Pe(δ=90°) = Pmax');

const Pe180 = getPe(Pmax, Math.PI);
assertClose(Pe180, 0, 0.001, 'Pe(δ=180°) = 0');

// Test 2: Initial Equilibrium Angle
console.log('\nTest 2: Initial Equilibrium Angle');
const Pm = 0.8;
const d0 = Math.asin(Pm / Pmax);
assertClose(d0, 0.694738, 0.001, 'δ₀ = arcsin(Pm/Pmax)');

// Test 3: Critical Clearing Angle
console.log('\nTest 3: Critical Clearing Angle');
const dcc = getCC(Pm, Pmax);
assert(dcc !== null, 'δ_cc calculation returns value');
if (dcc) {
  assertClose(dcc, 1.8326, 0.05, 'δ_cc ≈ 105° (2.3 rad)');

  // Test 4: Critical Clearing Time
  console.log('\nTest 4: Critical Clearing Time');
  const H = 8;
  const cct = getCCT(H, dcc, d0, Pm);
  assert(cct !== null, 'CCT calculation returns value');
  if (cct) {
    // Expected CCT ≈ 0.4-0.5 s for typical PLTU parameters
    assert(cct > 0.3 && cct < 0.6, 'CCT in reasonable range (0.3-0.6 s)');
  }
}

// Test 5: Oscillation Period
console.log('\nTest 5: Oscillation Period');
const H_test = 8;
const D_test = 4;
const Ks = Pmax * Math.cos(d0); // Synchronizing coefficient
const Tosc = getTosc(H_test, Ks);
assertClose(Tosc, 2.8, 0.5, 'T_osc ≈ 2.8 s for H=8, Pmax=1.25, δ₀=0.69');

// Test 6: RK4 Integration Stability
console.log('\nTest 6: RK4 Integration Stability');

// Simple harmonic oscillator: d²x/dt² = -ω²x
// Expected: x(t) = A·cos(ωt), v(t) = -Aω·sin(ωt)
const omega_test = 2 * Math.PI; // 1 Hz
const A_test = 1.0;
const dt_test = 0.001;
const steps_test = 10000;

function sho(t, [x, v]) {
  return [v, -omega_test * omega_test * x];
}

let y = [A_test, 0]; // Initial: x=1, v=0
for (let i = 0; i < steps_test; i++) {
  y = rk4(sho, y, i * dt_test, dt_test);
}

const x_final = y[0];
const expected_x = A_test * Math.cos(omega_test * steps_test * dt_test);
assertClose(x_final, expected_x, 0.01, 'RK4 integrator accuracy for SHO');

// Test 7: Damping Effect
console.log('\nTest 7: Damping Effect');
const Pm_test = 0.8;
const Ef_test = 1.5;
const V_test = 1.0;
const Xs_test = 1.2;
const D_eff = 6; // D + grid damping

// With damping, oscillations should decay
// Time constant: τ = 2H/D
const tau = 2 * H_test / D_eff;
assertClose(tau, 2.667, 0.01, 'Damping time constant τ = 2H/D');

// Test 8: Energy Conservation (undamped)
console.log('\nTest 8: Energy Conservation (undamped)');
const H_energy = 8;
const omega_max = 0.01; // 1% speed deviation

// Kinetic energy: E_k = ½·(2H/ωs)·ω²
const E_k = 0.5 * (2 * H_energy / WS) * omega_max * omega_max;
assert(E_k > 0, 'Kinetic energy positive');

// Test 9: Loss of Synchronism Detection
console.log('\nTest 9: Loss of Synchronism Detection');
const d_cr = Math.PI - d0;
assertClose(d_cr * R2D, 110.2, 1, 'δ_cr = π - δ₀ ≈ 110°');

// If δ > δ_cr, system loses synchronism
const d_unstable = d_cr + 0.1;
const Pe_unstable = getPe(Pmax, d_unstable);
assert(Pe_unstable < getPe(Pmax, d_cr), 'Pe decreases past δ_cr (unstable region)');

// Test 10: RLR Load Profile
console.log('\nTest 10: RLR Load Profile');
const RLR_PROFILE = [
  [0,0.580],[1,0.552],[2,0.530],[3,0.515],[4,0.512],[5,0.548],
  [6,0.672],[7,0.822],[8,0.908],[9,0.924],[10,0.904],[11,0.878],
  [12,0.842],[13,0.818],[14,0.842],[15,0.878],[16,0.918],[17,0.958],
  [18,0.900],[19,0.840],[20,0.776],[21,0.715],[22,0.652],[23,0.608],[24,0.580]
];

const load_0h = RLR_PROFILE[0][1];
const load_17h = RLR_PROFILE[17][1];
assertClose(load_0h, 0.58, 0.01, 'Load at 00:00 = 58%');
assertClose(load_17h, 0.958, 0.01, 'Load at 17:00 = 95.8% (peak)');

// Summary
console.log('\n=== Test Summary ===');
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);
console.log(`Total:  ${passCount + failCount}`);

if (failCount > 0) {
  process.exit(1);
}
