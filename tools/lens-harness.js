# Lens Harness — Synchronous Generator Simulator

**File:** `tools/lens-harness.js`
**Purpose:** Test harness untuk memvalidasi model fisika dan UI

---

## Penggunaan

```bash
# Jalankan semua test
node tools/lens-harness.js

# Jalankan test spesifik
node tools/lens-harness.js --test physics
node tools/lens-harness.js --test ui

# With verbose output
node tools/lens-harness.js --verbose
```

---

## Struktur Test

```javascript
const TESTS = [
  {
    name: 'physics:rk4-integration',
    desc: 'Verifikasi RK4 integrator dengan solusi analitik',
    run: (state, assert) => { ... }
  },
  {
    name: 'physics:power-angle',
    desc: 'Verifikasi P-δ relationship',
    run: (state, assert) => { ... }
  },
  {
    name: 'ui:sliders',
    desc: 'Verifikasi slider interaction',
    run: (dom, assert) => { ... }
  }
];
```

---

## Assert API

```javascript
assert.equal(actual, expected, message)
assert.close(actual, expected, tolerance, message)
assert.true(condition, message)
assert.false(condition, message)
assert.throws(fn, message)
```

---

## DOM Mocking

```javascript
// Simulasi input value
dom.getElementById('nH').value = '8.0';
dom.getElementById('nH').dispatchEvent(new Event('input'));

// Simulasi klik
dom.getElementById('btn-grid').click();
```

---

## Physics Validation

### Test Case: Oscillation Period

```
Expected: T_osc ≈ 2π√(2H/(ωs·Ks))
With: H=8, D=4, Pm=0.8, Pmax=1.875
Expected: T_osc ≈ 2.8 s
```

### Test Case: Critical Clearing Time

```
Expected: CCT = √[4H(δ_cc-δ₀)/(ωs·Pm)]
With: H=8, δ₀=0.42 rad, δ_cc=2.2 rad, Pm=0.8
Expected: CCT ≈ 0.45 s
```

---

## CI Integration

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: node tools/lens-harness.js
```
