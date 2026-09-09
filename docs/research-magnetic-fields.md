# Research: Magnetic Field Visualization for Synchronous Generator Simulator

**Document Type:** Research Findings
**Date:** 2026-09-09
**Purpose:** Comprehensive guide for implementing realistic magnetic field visualization in "Realistic Mode"
**Target Audience:** Developers implementing the visualization engine

---

## Executive Summary

This document compiles physics principles and visualization requirements for showing magnetic field interactions in a synchronous generator. The goal is to create an educational visualization that reveals the underlying physics behind the mathematical models (swing equation, EAC, power-angle relationship).

**Key Findings:**
1. **Stator field** rotates at synchronous speed (3000 RPM for 2-pole, 50 Hz) - created by 3-phase currents
2. **Rotor field** is stationary relative to rotor (DC excitation) - rotates with rotor at synchronous speed
3. **Torque** is produced by the interaction between these two fields - proportional to sin(δ)
4. **Excitation** controls rotor field strength - directly affects Pmax and reactive power

---

## 1. Stator Magnetic Field (Armature Reaction)

### 1.1 Physical Principle

**Source:** Wikipedia - Alternating Current, Synchronous Motor

A 3-phase stator winding creates a **rotating magnetic field** through the spatial and temporal combination of three sinusoidal currents:

```
i_A(t) = I_m · sin(ωt)
i_B(t) = I_m · sin(ωt - 120°)
i_C(t) = I_m · sin(ωt - 240°)
```

**Key Properties:**
- Three coils positioned 120° apart spatially
- Each carries sinusoidal current with 120° phase separation temporally
- **Result:** Single rotating vector with **constant magnitude = 1.5 · I_m**

**Mathematical Foundation:**
The resultant MMF (magnetomotive force) is:
```
F_s(t,θ) = F_max · cos(θ - ωt)
```

This represents a wave traveling in the θ direction at angular velocity ω.

### 1.2 Synchronous Speed

**Relationship:** N_s = 120f/P

Where:
- N_s = synchronous speed (RPM)
- f = electrical frequency (Hz)
- P = number of poles

**For PLTU 500 MW (2-pole, 50 Hz):**
```
N_s = 120 × 50 / 2 = 3000 RPM
ω_s = 2πf = 100π rad/s ≈ 314.16 rad/s
```

### 1.3 Spatial Distribution of Stator MMF

**Source:** Kundur (1994) §3.4

The stator MMF distribution is approximately sinusoidal in space:

```
F_s(θ) = F_s,max · sin(θ)
```

**Key Characteristics:**
- MMF is maximum at the magnetic axis of each phase
- The resultant MMF rotates at synchronous speed
- The magnitude remains constant (for balanced 3-phase currents)

**Visualization Requirements:**
- Show three individual phase MMF vectors (optional, for educational purposes)
- Show resultant rotating MMF vector (prominent, always visible)
- Animate rotation at visual speed VSPD = 2π/7 rad/s (1 revolution per 7 seconds)
- Indicate field strength with vector length or color intensity

---

## 2. Rotor Magnetic Field (Field Winding)

### 2.1 Physical Principle

**Source:** Wikipedia - Synchronous Generator

The rotor carries a **DC-excited field winding** that creates a constant magnetic field relative to the rotor:

```
F_r = N_f · I_f
```

Where:
- N_f = number of turns in field winding
- I_f = field current (DC)

**Key Properties:**
- Field is stationary relative to rotor (no rotation relative to rotor)
- Field rotates with rotor at synchronous speed (in steady state)
- Field strength is directly proportional to excitation current (I_f) or voltage (E')

**Rotor Types:**

| Type | Application | Characteristics |
|------|-------------|-----------------|
| **Cylindrical (Non-salient pole)** | High-speed (2-6 poles), steam turbines | Smooth surface, uniform air gap, distributed winding |
| **Salient pole** | Low-speed (many poles), hydro turbines | Projecting poles, non-uniform air gap, concentrated winding |

**For PLTU 500 MW:** Use **cylindrical rotor** representation.

### 2.2 Rotor Poles

The DC excitation creates distinct **North and South poles** on the rotor:

- 2-pole machine: 1 North, 1 South (180° apart)
- 4-pole machine: 2 North, 2 South (90° apart)
- P-pole machine: P/2 North, P/2 South (360°/P apart)

**Magnetic Field Direction:**
- Field lines emerge from North pole
- Field lines enter South pole
- Field lines form closed loops through stator core

### 2.3 Excitation System Effects

**Source:** Wikipedia - Synchronous Motor, IEEE Std 421.5-2005

**Excitation Voltage (E'):**
- Controls the strength of rotor magnetic field
- Higher E' → stronger field → higher Pmax
- Range: 0.1 - 3.0 pu (normal operation: 1.0 - 1.5 pu)

**Effects on Generator Operation:**

| Excitation Level | Field Strength | Power Factor | Reactive Power | Effect |
|------------------|----------------|--------------|----------------|--------|
| **Under-excited** (E' < 1.0 pu) | Weak | Leading | Absorbing Q | Rotor field < stator field, generator absorbs reactive power |
| **Normal excited** (E' ≈ 1.0-1.5 pu) | Moderate | Unity | Q ≈ 0 | Rotor field ≈ stator field, optimal operation |
| **Over-excited** (E' > 1.5 pu) | Strong | Lagging | Supplying Q | Rotor field > stator field, generator supplies reactive power |

**V-Curve Characteristic:**
- Armature current vs field current
- Minimum current at unity power factor
- Current increases both for under- and over-excitation

**Visualization Requirements:**
- Show rotor field strength proportional to E' value
- Indicate North/South poles with color coding (Red/Blue or Orange/Cyan)
- Show field lines emanating from poles
- Animate field strength changes when E' is adjusted
- Display power factor indicator (leading/unity/lagging)

---

## 3. Interaction Between Stator and Rotor Fields

### 3.1 Torque Production

**Source:** Kundur (1994) §3.4, §11.1

The **electromagnetic torque** is produced by the interaction between the stator and rotor magnetic fields:

```
T_e = k · B_s · B_r · sin(δ)
```

Where:
- B_s = stator magnetic flux density
- B_r = rotor magnetic flux density
- δ = angle between stator and rotor fields (power angle)
- k = machine constant

**Key Insight:**
The torque is proportional to the **sine of the angle** between the two fields:
- δ = 0° → No torque (fields aligned)
- δ = 90° → Maximum torque (fields perpendicular)
- δ = 180° → No torque (fields opposite)
- δ > 90° → Decreasing torque (unstable region)

### 3.2 Power-Angle Relationship

**Source:** Kundur (1994) §11.1, Anderson & Fouad (2003) §2.4

```
P_e = P_max · sin(δ)
P_max = E' · V / X'_d
```

**Physical Interpretation:**
- E' represents the rotor field strength (excitation EMF)
- V represents the stator field strength (terminal voltage)
- X'_d represents the magnetic coupling (reactance)
- δ is the angular separation between rotor and stator fields

**Visualization of Power Angle (δ):**
- δ = angular separation between rotor field axis and stator rotating field axis
- In steady state: rotor rotates at synchronous speed, locked to stator field
- During transient: δ oscillates as rotor accelerates/decelerates

### 3.3 How the Rotor "Follows" the Stator Field

**Source:** Wikipedia - Synchronous Motor

**Synchronization Mechanism:**
1. Stator rotating field rotates at synchronous speed (ω_s)
2. Rotor field is "locked" to the stator field by magnetic attraction
3. In steady state: rotor rotates at exactly ω_s, with constant δ
4. During disturbance: δ changes, creating accelerating/decelerating torque

**Torque Balance:**
```
T_mechanical - T_electrical - T_damping = J · dω/dt
```

Where:
- T_mechanical = mechanical torque from prime mover (Pm/ω)
- T_electrical = electromagnetic torque (Pe/ω)
- T_damping = damping torque (D · Δω)
- J = moment of inertia

**Loss of Synchronism:**
- If δ exceeds δ_cr = π - δ_0, the rotor can no longer follow the stator field
- The generator "loses synchronism" and must be tripped
- This is visualized in the simulator with the red overlay warning

---

## 4. Excitation Effects on Magnetic Fields

### 4.1 Field Current and Magnetic Field Strength

**Source:** IEEE Std 421.5-2005

The rotor magnetic field strength is directly controlled by the excitation system:

```
B_r ∝ I_f ∝ E'
```

**Excitation System (AVR - Automatic Voltage Regulator):**
- Controls field current to maintain terminal voltage
- Responds to voltage deviations
- In this simulator: E' is directly adjustable (simplified model)

### 4.2 Effect on Pmax and Stability

**Mathematical Relationship:**
```
P_max = E' · V / X'_d
```

**When E' increases:**
1. Rotor field strength increases
2. P_max increases proportionally
3. Power-angle curve shifts upward
4. For same Pm: δ_0 decreases
5. Critical angle δ_cr = π - δ_0 increases
6. Margin to instability increases
7. CCT (critical clearing time) increases

**Visualization:**
- Show P-δ curve changing with E' adjustment
- Show rotor field vector length/color changing with E'
- Show margin indicator (δ_cr - δ) changing

### 4.3 Reactive Power and Power Factor

**Source:** Kundur (1994) §3.5

The power factor is determined by the excitation level:

```
Q = (E' · V · cos(δ) - V²) / X'_d
```

**Under-excited (E' < V):**
- Q < 0 (absorbing reactive power)
- Leading power factor
- Rotor field is weaker than stator field
- Risk of losing synchronism

**Over-excited (E' > V):**
- Q > 0 (supplying reactive power)
- Lagging power factor
- Rotor field is stronger than stator field
- Better stability margin

**Visualization Requirements:**
- Show reactive power flow direction
- Display power factor indicator
- Color-code operation region (under-excited / normal / over-excited)

---

## 5. Visualization Requirements for "Realistic Mode"

### 5.1 Core Visual Elements

**1. Stator Cross-Section (Static)**
- Circular ring representing stator core
- 6 coil slots (2 per phase, distributed 60° apart)
- Color-coded coils: Phase A (Red), Phase B (Yellow), Phase C (Blue)
- Label each phase

**2. Rotor Cross-Section (Rotating)**
- Smaller circle representing rotor
- For cylindrical rotor: smooth surface with distributed winding symbols
- For salient pole (optional): projecting poles with concentrated windings
- North/South pole indication with color gradient

**3. Stator Rotating Magnetic Field**
- Resultant vector rotating at visual speed VSPD
- Vector length proportional to field strength (constant for balanced operation)
- Color: Green (#0A7040) or Cyan (#006898)
- Optional: Show three individual phase vectors (faded, for educational purposes)

**4. Rotor Magnetic Field**
- Vector(s) aligned with rotor North pole axis
- Length proportional to E' value
- Color: Orange (#B85800) for North, Blue (#1050C0) for South
- Field lines emanating from poles (optional, for advanced visualization)

**5. Power Angle (δ) Visualization**
- Angular separation between stator field axis and rotor field axis
- Arc indicator showing δ value
- Color coding: Green for safe, Yellow for warning, Red for critical

**6. Torque Indication**
- Show interaction between stator and rotor fields
- Visual representation of torque direction
- Animate during transients (oscillations)

### 5.2 Animation Parameters

**Visual Speed (VSPD):**
```
VSPD = 2π/7 rad/s  // 1 revolution per 7 seconds
```

**Phase Current Animation:**
- Show instantaneous current magnitude in each phase
- Current magnitude: I_A(t) = sin(ωt), I_B(t) = sin(ωt - 120°), I_C(t) = sin(ωt - 240°)
- Update at 60 FPS for smooth animation

**Field Rotation:**
- Stator field: rotates at VSPD (visual representation of ω_s)
- Rotor: rotates at VSPD + Δω_visual (where Δω_visual represents speed deviation)
- In steady state: both rotate together, δ = constant
- During transient: rotor oscillates relative to stator field

### 5.3 Interaction with Excitation (Ef) Parameter

**When Ef Changes:**
1. Rotor field vector length changes proportionally
2. Rotor field color intensity changes
3. P_max value updates in status display
4. P-δ curve in Panel II updates
5. Power factor indicator updates

**Real-time Updates:**
```javascript
function updateRotorField(ef_value) {
  // Scale field vector length
  const fieldLength = baseLength * ef_value;
  
  // Update color intensity
  const intensity = mapRange(ef_value, 0.1, 3.0, 0.3, 1.0);
  fieldVector.style.opacity = intensity;
  
  // Update Pmax display
  updatePmax(ef_value);
  
  // Update power factor indicator
  updatePowerFactor(ef_value);
}
```

### 5.4 Interaction with Simulation State

**During Short Circuit Event:**
- Stator field: maintained by infinite bus (Grid-Connected) or collapses (Island)
- Rotor field: maintained by excitation (E' ≈ constant during transient)
- Power angle δ: increases rapidly during fault
- Torque: decreases during fault (Pe ≈ 0)
- Visualization: show rotor accelerating, δ increasing, stator field unaffected

**During Load Changes (RLR Simulation):**
- Governor responds to load changes (Pm adjusts)
- Excitation may adjust to maintain voltage (E' changes)
- δ oscillates during transient
- Δω oscillates and damps out
- Visualization: show both fields rotating, with δ oscillating

**Loss of Synchronism:**
- δ exceeds δ_cr
- Rotor cannot follow stator field
- Visualization: show rotor "slipping" poles, δ wrapping around
- Warning: red overlay, alarm

---

## 6. Technical Implementation Recommendations

### 6.1 SVG vs Canvas

**SVG (Recommended for static/semi-static elements):**
- Stator cross-section (rings, slots, labels)
- Rotor cross-section (circle, poles)
- Field vectors (arrows)
- Power angle arc
- Legend and labels

**Canvas (Optional for complex animations):**
- Field line particles
- Smooth gradient effects
- High-frequency animations (>30 FPS)

**Hybrid Approach (Recommended):**
- Use SVG for structural elements and vectors
- Use Canvas overlay for particle effects (optional)
- Keep phasor animation in SVG (current implementation)

### 6.2 Animation Loop

```javascript
function updateVisualization(timestamp) {
  // Update animation time
  S.anim = (timestamp / 1000) * VSPD;
  
  // Update stator field rotation
  const statorAngle = S.anim;
  updateStatorFieldVector(statorAngle);
  
  // Update rotor position (stator angle + delta)
  const rotorAngle = statorAngle + S.delta;
  updateRotorFieldVector(rotorAngle);
  
  // Update phase current indicators
  updatePhaseCurrents(S.anim);
  
  // Update power angle arc
  updatePowerAngleArc(S.delta);
  
  // Update torque indicator
  updateTorqueIndicator(S.delta, S.omega);
  
  // Continue animation loop
  requestAnimationFrame(updateVisualization);
}
```

### 6.3 Performance Optimization

**Debounce Size Calculations:**
```javascript
let lastSizeCheck = 0;
const SIZE_CHECK_INTERVAL = 10; // frames

function shouldCheckSize(frameCount) {
  if (frameCount - lastSizeCheck >= SIZE_CHECK_INTERVAL) {
    lastSizeCheck = frameCount;
    return true;
  }
  return false;
}
```

**Efficient Redraw:**
- Only update elements that changed
- Use CSS transforms for rotation (GPU accelerated)
- Batch DOM updates

### 6.4 Color Scheme

**Phase Colors (Standard):**
```css
--phase-a: #C42000;  /* Red */
--phase-b: #B07000;  /* Yellow */
--phase-c: #1050C0;  /* Blue */
```

**Field Colors:**
```css
--stator-field: #0A7040;  /* Green */
--rotor-north: #B85800;   /* Orange */
--rotor-south: #1050C0;   /* Blue */
```

**Power Angle Indicator:**
```css
--delta-safe: #0A7040;    /* Green */
--delta-warning: #B07000; /* Yellow */
--delta-critical: #C42000; /* Red */
```

---

## 7. Educational Content

### 7.1 Tooltips and Explanations

**Stator Field:**
> "Medan magnet stator berputar pada kecepatan sinkron (ωs = 100π rad/s untuk 50 Hz). Dibuat oleh tiga arus fase yang terpisah 120° secara spasial dan temporal. Arah putaran: berlawanan arah jarum jam (CCW)."

**Rotor Field:**
> "Medan magnet rotor dibuat oleh eksitasi DC. Arahnya tetap relatif terhadap rotor, namun berputar bersama rotor pada kecepatan sinkron. Kekuatan medan sebanding dengan tegangan eksitasi (E')."

**Power Angle (δ):**
> "Sudut antara sumbu medan stator dan sumbu medan rotor. Menentukan daya listrik yang ditransfer: Pe = Pmax·sin(δ). Semakin besar δ, semakin besar daya yang ditransfer, namun semakin dekat ke batas stabilitas."

**Torque:**
> "Torsi elektromagnetik dihasilkan oleh interaksi medan stator dan rotor. Sebanding dengan sin(δ). Saat δ = 90°, torsi maksimum. Saat δ > 90°, torsi menurun (zona tidak stabil)."

**Excitation Effect:**
> "Meningkatkan E' (over-excitation) memperkuat medan rotor, meningkatkan Pmax, memperkecil δ₀, dan memperbesar margin stabilitas. Generator memasok daya reaktif (lagging power factor)."

### 7.2 Scenarios for Demonstration

**Scenario 1: Normal Operation**
- Show both fields rotating together
- δ = constant (steady state)
- Torque balanced

**Scenario 2: Load Increase**
- Pm increases
- Rotor momentarily accelerates
- δ increases
- Oscillation visible
- Damping restores equilibrium

**Scenario 3: Short Circuit**
- Pe drops to near zero
- Rotor accelerates rapidly
- δ increases dramatically
- If cleared before δ_cc: system recovers
- If not: loss of synchronism

**Scenario 4: Excitation Change**
- E' increases
- Rotor field strengthens
- Pmax increases
- δ decreases (for same Pm)
- Margin increases

**Scenario 5: Under-excitation**
- E' decreases
- Rotor field weakens
- Pmax decreases
- δ increases (for same Pm)
- Margin decreases
- Risk of instability

---

## 8. Integration with Current Simulator

### 8.1 Existing Implementation

The simulator already has:
- **Panel I:** SVG phasor animation showing E' and V vectors
- **Panel II:** P-δ curve with EAC visualization
- **Panel III:** Time series charts (δ, ω, f, P)
- **Physics engine:** Swing equation, governor TGOV1, EAC calculations
- **Animation mode toggle:** "Fasor" and "Realistis" buttons (currently non-functional for "Realistis")

### 8.2 Implementation Path

**Phase 1: Basic Realistic Mode**
- Add stator cross-section (ring + coils)
- Add rotor cross-section (circle + poles)
- Add rotating stator field vector
- Add rotor field vector (aligned with E' phasor)
- Show power angle δ

**Phase 2: Enhanced Visualization**
- Add phase current indicators (sinusoidal waves)
- Add field strength indicators (color intensity)
- Add torque visualization
- Add North/South pole coloring

**Phase 3: Advanced Features**
- Add field line animation (optional)
- Add particle effects for flux (optional)
- Add interactive hover states
- Add educational overlays

### 8.3 Code Structure

```javascript
// Add to existing HTML
function updateSvgPhasorRealistic(svg) {
  // Clear previous content
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  
  // Get dimensions
  const W = svg.clientWidth || 400;
  const H = svg.clientHeight || 300;
  const cx = W / 2, cy = H / 2;
  const R_stator = Math.min(W, H) * 0.42;
  const R_rotor = R_stator * 0.65;
  
  // Draw stator cross-section
  drawStatorCrossSection(svg, cx, cy, R_stator);
  
  // Draw rotor cross-section (rotates with delta)
  drawRotorCrossSection(svg, cx, cy, R_rotor, S.delta);
  
  // Draw stator rotating field vector
  drawStatorFieldVector(svg, cx, cy, R_stator, S.anim);
  
  // Draw rotor field vector
  drawRotorFieldVector(svg, cx, cy, R_rotor, S.delta, S.Ef);
  
  // Draw power angle arc
  drawPowerAngleArc(svg, cx, cy, R_rotor * 0.4, S.delta);
  
  // Draw phase current indicators
  drawPhaseCurrents(svg, cx, cy, R_stator, S.anim);
  
  // Draw legend and labels
  drawRealisticLegend(svg, W, H);
}
```

---

## 9. Academic References

### Primary Sources

1. **Kundur, P. (1994).** *Power System Stability and Control.* McGraw-Hill.
   - §3.4: Synchronous machine theory
   - §11.1: Swing equation
   - §11.2-11.3: Equal Area Criterion
   - Figures 3.1-3.5: Machine cross-sections

2. **Anderson, P. M., & Fouad, A. A. (2003).** *Power System Control and Stability* (2nd ed.). IEEE Press.
   - Chapter 2: Synchronous machine representation
   - §2.4: Power-angle relationships

3. **IEEE Std 421.5-2005.** *Excitation System Models for Power Stability Studies.*
   - TGOV1 governor model
   - Excitation system models

4. **IEEE Std 399-1997.** *Recommended Practice for Industrial & Commercial Power Systems.*
   - Load profile curves
   - System response characteristics

### Secondary Sources

5. **Fitzgerald, A. E., Kingsley, C., & Umans, S. D. (2003).** *Electric Machinery* (6th ed.). McGraw-Hill.
   - Chapter 5: Synchronous machines
   - Rotating magnetic field development

6. **Wikipedia.** *Synchronous Motor.* https://en.wikipedia.org/wiki/Synchronous_motor
   - Excitation effects
   - V-curves

7. **Wikipedia.** *Rotating Magnetic Field.* https://en.wikipedia.org/wiki/Rotating_magnetic_field
   - Three-phase field creation
   - Mathematical foundation

### Web Technology References

8. **MDN Web Docs.** *Canvas API Tutorial: Basic Animations.*
   https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations

9. **CSS-Tricks.** *A Guide to SVG Animations (SMIL).*
   https://css-tricks.com/guide-svg-animations-smil/

10. **W3C.** *SVG Animations Level 2 Specification.*
    https://svgwg.org/specs/animations/

---

## 10. Summary of Key Findings

### Physics Principles

1. **Stator Field:**
   - Created by 3-phase currents (120° spatial + temporal separation)
   - Rotates at synchronous speed: N_s = 120f/P
   - Constant magnitude for balanced operation

2. **Rotor Field:**
   - Created by DC excitation
   - Stationary relative to rotor
   - Strength proportional to E' (excitation voltage)

3. **Torque Production:**
   - Result of interaction between stator and rotor fields
   - T_e ∝ B_s · B_r · sin(δ)
   - Maximum at δ = 90°

4. **Excitation Effects:**
   - Controls rotor field strength
   - Affects Pmax = E'·V/X'_d
   - Determines reactive power and power factor

### Visualization Requirements

1. **Static Elements:**
   - Stator cross-section with 3-phase coils
   - Rotor cross-section with pole indication

2. **Animated Elements:**
   - Rotating stator field vector
   - Rotor field vector (rotates with rotor)
   - Power angle δ visualization
   - Phase current indicators

3. **Interactive Elements:**
   - Field strength changes with E' adjustment
   - Torque visualization during transients
   - Power factor indication

### Technical Approach

1. **Use SVG** for structural elements and vectors
2. **Use CSS transforms** for rotation (GPU accelerated)
3. **Use requestAnimationFrame** for smooth 60 FPS animation
4. **Debounce** size calculations for performance
5. **Color-code** phases, fields, and status indicators

---

**Document Version:** 1.0
**Last Updated:** 2026-09-09
**Author:** Claude Code (research compilation)
**Status:** Research Complete - Ready for Implementation Planning
**Next Steps:** Implement Phase 1 of realistic visualization in Panel I
