# Research: Rotor-Stator Animation Visualization for Synchronous Generators

**Document Type:** Research Findings
**Date:** 2026-09-08
**Purpose:** Guide realistic visualization of rotor-stator dynamics in synchronous generator simulator

---

## 1. Overview

This document compiles research findings on realistic visualization techniques for synchronous generator rotor-stator animations, focusing on:
- Stator winding representation (3-phase copper coils)
- Excitation field visualization (rotor magnetic field)
- Stator magnetic field (rotating field from 3-phase currents)
- SVG/Canvas implementation techniques for educational/scientific visualization

---

## 2. Physical Components to Visualize

### 2.1 Stator Construction

Based on [Wikipedia: Synchronous Motor](https://en.wikipedia.org/wiki/Synchronous_motor) and Circuit Globe:

**Key Physical Features:**
- Stator frame contains wrapper plate, circumferential ribs, and keybars
- **3-phase winding** consists of three coil sets positioned 120° apart
- Coils are embedded in stator slots around the inner circumference
- Copper windings with insulation (typically appearing reddish-brown/orange)
- Laminated steel core (appearing as layered gray/silver structure)

**Visual Representation Approaches:**
1. **Cross-sectional view**: Show stator as annular ring with 6 slots (2 per phase, distributed symmetrically)
2. **Winding representation**: Each phase uses distinct color coding:
   - Phase A: Red/Magenta
   - Phase B: Yellow/Gold
   - Phase C: Blue/Cyan
3. **Coil turns**: Represent as grouped rectangles or concentric arcs in cross-section

### 2.2 Rotor Types

**Two main rotor types** (Wikipedia):

1. **Cylindrical (Non-Salient Pole)**
   - Used for high-speed machines (2-6 poles)
   - Smooth cylindrical surface
   - Field winding distributed in slots
   - Typical for steam turbine generators (PLTU)

2. **Salient Pole**
   - Used for low-speed machines (many poles)
   - Projecting toothed poles
   - Field winding concentrated on pole cores
   - Typical for hydro generators

**For PLTU 500 MW (this simulator):**
- Use **cylindrical rotor** representation
- Show field winding as distributed conductors
- DC excitation creates constant magnetic field

### 2.3 Excitation System

**Excitation Methods:**
- **DC-excited**: External DC source magnetizes rotor via slip rings or brushless exciter
- Field winding on rotor carries DC current
- Creates **constant amplitude** magnetic field
- Field strength proportional to excitation current (E' in model)

**Visual Elements:**
- Rotor field winding shown as coils on rotor surface
- Magnetic field lines emanating from rotor poles
- Field strength indicated by:
  - Color intensity (brighter = stronger field)
  - Line density (more lines = stronger field)
  - Arrow size (larger = stronger field)

---

## 3. Rotating Magnetic Field Visualization

### 3.1 Physical Principle

From [Wikipedia: Rotating Magnetic Field](https://en.wikipedia.org/wiki/Rotating_magnetic_field):

> "Three sets of coils are nearly always used, because it is compatible with a symmetric three-phase AC sine current system."

**Mathematical Foundation:**
- Three coils positioned 120° apart
- Each carries sinusoidal current with 120° phase separation:
  - i_A = I_m·sin(ωt)
  - i_B = I_m·sin(ωt - 120°)
  - i_C = I_m·sin(ωt - 240°)
- **Result:** Single rotating vector with constant magnitude

**Key Insight:**
> "The result of adding three 120-degree phased sine waves on the axis of the motor is a single rotating vector that maintains constant magnitude."

### 3.2 Visualization Approaches

**1. Vector Sum Approach (Recommended for this simulator)**
```
At time t:
- Show three individual magnetic field vectors from each phase
- Show resultant vector (vector sum)
- Animate rotation over time
- Resultant maintains constant magnitude, rotates at ωs
```

**2. Field Line Approach**
```
- Show magnetic field lines from stator
- Lines emerge from stator teeth, pass through air gap to rotor
- Field pattern rotates at synchronous speed
- Use curved arrows or streamlines
```

**3. Color/Heatmap Approach**
```
- Use color gradient to show field intensity
- Red = North pole (positive field)
- Blue = South pole (negative field)
- Animate color pattern rotating
```

**Recommended:** Use **Vector Sum Approach** for educational clarity. Show:
- Three phase currents (as sinusoidal waves on side panel)
- Three magnetic field vectors (color-coded by phase)
- Resultant rotating field vector
- Rotor position relative to rotating field

---

## 4. SVG/Canvas Animation Best Practices

### 4.1 Canvas Animation (MDN Web Docs)

From [MDN: Canvas Basic Animations](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations):

**Recommended Animation Loop:**
```javascript
function draw() {
  // Animation frame logic
  window.requestAnimationFrame(draw);
}
window.requestAnimationFrame(draw);
```

**Advantages over setInterval/setTimeout:**
- Syncs with display refresh rate (typically 60fps)
- Automatically throttles in background tabs
- Browser optimizes repaint timing

**Animation Steps:**
1. **Clear canvas** - `ctx.clearRect(0, 0, width, height)`
2. **Save canvas state** - `ctx.save()` before transformations
3. **Draw animated shapes** - render frame
4. **Restore canvas state** - `ctx.restore()` for clean next frame

**Performance Optimization:**
- Clear only what's necessary (full clear vs partial)
- Use `ctx.save()`/`ctx.restore()` to manage state efficiently
- For trail effects: use semi-transparent fill without storing history:
```javascript
context.fillStyle = "rgb(0 0 0 / 5%)";
context.fillRect(0, 0, canvas.width, canvas.height);
```

**Scientific Visualization Techniques:**
```javascript
// Time-based rotation
const time = new Date();
ctx.rotate(
  ((2 * Math.PI) / 60) * time.getSeconds() +
  ((2 * Math.PI) / 60000) * time.getMilliseconds()
);

// For smooth sweeping motion
const sec = now.getSeconds() + now.getMilliseconds() / 1000;
```

**Key Limitation:**
> "Once drawn, shapes stay static. Moving elements requires redrawing the entire frame."

### 4.2 SVG Animation (SMIL and JavaScript)

From [CSS-Tricks: Guide to SVG Animations (SMIL)](https://css-tricks.com/guide-svg-animations-smil/):

**Core Animation Elements:**
- `<animate>` - animates scalar attributes and properties over time
- `<set>` - shorthand for assigning values to non-numeric attributes
- `<animateMotion>` - moves elements along motion paths
- `<animateTransform>` - animates transformation attributes

**Key Attributes:**
```xml
<animate
  xlink:href="#target"
  attributeName="d"
  from="M0,0 L100,0"
  to="M0,0 L150,0"
  dur="1s"
  begin="0s"
  fill="freeze"
  repeatCount="indefinite"
/>
```

**SMIL Unique Capabilities:**
- **Path morphing** (animating the `d` attribute) - not available in CSS
- **Motion along paths** with `rotate="auto"` for orientation
- **Synchronized animations** using other animations' IDs: `begin="otherAnim.begin + 1s"`
- Works when SVG is embedded as `<img>` or CSS `background-image`

**JavaScript-Based SVG:**
- For complex animations, use JavaScript manipulation
- Libraries: **Snap.svg** ("the jQuery of SVG")
- JS animations don't work when SVG is embedded as `<img>`

**Browser Support:**
- SMIL works in all browsers except Internet Explorer and Opera Mini
- Test support via Modernizr, provide fallbacks

### 4.3 W3C SVG Animations Specification

From [W3C SVG Animations Level 2](https://svgwg.org/specs/animations/):

**Interpolation Methods (calcMode):**
1. **discrete** - jumps between values
2. **linear** - simple linear interpolation (default)
3. **paced** - even pace of change (default for animateMotion)
4. **spline** - cubic Bézier control via keySplines

**Multi-Step Animation:**
```xml
<animate
  attributeName="x"
  values="0; 50; 100; 50; 0"
  keyTimes="0; 0.25; 0.5; 0.75; 1"
  dur="4s"
/>
```

**Additive Animation:**
```xml
<animate
  attributeName="x"
  from="0" to="100"
  additive="sum"
  accumulate="sum"
/>
```
- `additive="sum"` - animation adds to base value
- `accumulate="sum"` - iterations build on each other (useful for progressive visualization)

**Distance Functions for Paced Animation:**
- **Scalars:** distance(Va, Vb) = |Va − Vb|
- **Colors:** distance in RGB space: √[(Ra-Rb)² + (Ga-Gb)² + (Ba-Bb)²]
- **Transforms:** defined for translate, scale, rotate, skew

---

## 5. Recommended Implementation Strategy

### 5.1 Current Simulator Approach (from code analysis)

The existing simulator uses:
- **Panel I:** SVG-based phasor animation showing E' and Vt vectors rotating
- **Panel II:** SVG P-δ curve with interactive EAC visualization
- **Panel III:** Chart.js time series (δ, ω, f, P vs time)

**Phasor Animation Details:**
```javascript
const VSPD = 2 * Math.PI / 7; // Visual phasor speed: 1 rev/7s

// Base angle for rotation
const base = S.anim - Math.PI/2;
const vt_a = base;        // Grid reference phasor angle
const ef_a = base + S.delta;  // Excitation phasor angle (offset by power angle)

// Draw two arrows: Vt (grid) and Ef (excitation)
// Delta = angular separation between them
```

### 5.2 Enhanced Visualization Recommendations

**Option A: Enhanced Phasor Diagram (Recommended)**

Add to Panel I:
1. **Stator representation:**
   - Circular ring outline (stator core)
   - 6 coil symbols distributed 120° apart (2 per phase)
   - Color-coded: Red (A), Yellow (B), Blue (C)
   - Small sinusoidal indicators showing instantaneous current magnitude

2. **Rotor representation:**
   - Circle at center representing rotor
   - Field winding symbol (simplified)
   - DC current indicator

3. **Magnetic field vectors:**
   - Three phase field vectors (faded, based on instantaneous current)
   - Resultant rotating field vector (prominent, constant magnitude)
   - Rotor field vector (aligned with Ef phasor)

4. **Power angle visualization:**
   - Keep existing Ef and Vt arrows
   - Add torque angle indication
   - Show slip when Δω ≠ 0

**Option B: Separate Field Visualization Panel**

Add new panel showing:
- Cross-section of machine (stator + rotor + air gap)
- Magnetic field lines (static from rotor, rotating from stator)
- Field interaction (attraction/repulsion creating torque)
- Animation of field rotation

**Option C: Interactive Exploded View**

- Allow user to toggle between:
  - Phasor view (current)
  - Physical cross-section view
  - Field line view
  - Combined view

### 5.3 Technical Implementation

**SVG Approach (Recommended for static elements):**
```javascript
// Create stator cross-section
function drawStator(svg, cx, cy, R_stator, R_rotor) {
  // Stator ring
  svg.appendChild(mkSvg('circle', {
    cx: cx, cy: cy, r: R_stator,
    fill: 'none', stroke: '#8090b0', 'stroke-width': 8
  }));

  // Coil slots (6 slots, 60° apart)
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 + 30) * D2R;  // Offset 30° from horizontal
    const x = cx + (R_stator - 4) * Math.cos(angle);
    const y = cy + (R_stator - 4) * Math.sin(angle);
    // Draw coil symbol (rectangle or group of turns)
    drawCoil(svg, x, y, angle, phaseColors[i % 3]);
  }
}
```

**Canvas Approach (Recommended for animated field lines):**
```javascript
function drawFieldLines(ctx, cx, cy, R_stator, R_rotor, time) {
  // Draw magnetic field lines from stator
  const numLines = 8;
  for (let i = 0; i < numLines; i++) {
    const baseAngle = (i / numLines) * 2 * Math.PI;
    const angle = baseAngle + time * VSPD;  // Rotate with time

    // Draw curved field line using bezier or arc
    ctx.beginPath();
    ctx.moveTo(
      cx + R_stator * Math.cos(angle),
      cy + R_stator * Math.sin(angle)
    );
    // ... draw path through air gap to opposite side
    ctx.stroke();
  }
}
```

**Animation Loop (Combined):**
```javascript
function updateVisualization() {
  // Update SVG elements (phasors, static elements)
  updatePhasorSVG();

  // Clear and redraw Canvas (field lines, particles)
  ctx.clearRect(0, 0, width, height);
  drawFieldLines(ctx, cx, cy, R_stator, R_rotor, S.anim);

  // Continue animation
  requestAnimationFrame(updateVisualization);
}
```

---

## 6. Visualization Element Specifications

### 6.1 Color Coding

**Phase Colors (Standard):**
- Phase A: Red (#C42000 or #FF0000)
- Phase B: Yellow (#B07000 or #FFD700)
- Phase C: Blue (#1050C0 or #0000FF)

**Field Colors:**
- Stator rotating field: Green (#0A7040)
- Rotor excitation field: Orange (#B85800)
- Resultant field: Violet (#6040A0)

**Magnetic Polarity:**
- North pole: Red/Orange gradient
- South pole: Blue/Cyan gradient

### 6.2 Geometric Parameters

**Stator:**
- Outer radius: R_stator
- Inner radius (air gap): R_stator * 0.85
- Number of slots: 6 minimum (for educational clarity)
- Slot width: 8-12 pixels

**Rotor:**
- Radius: R_rotor = R_stator * 0.80
- Air gap: R_stator * 0.85 - R_rotor
- Field winding: 4-6 conductor symbols distributed

**Scaling:**
- Use relative sizing based on container
- Minimum stroke width: 1.5px for visibility
- Arrow head size: 12-16px

### 6.3 Animation Parameters

**Rotation Speed:**
- Synchronous speed: ωs = 2πf = 100π rad/s (actual)
- Visual speed: VSPD = 2π/7 rad/s (1 revolution per 7 seconds for clarity)

**Current Indicators:**
- Phase current sinusoid: show 2-3 cycles
- Magnitude bar: height proportional to |sin(ωt + φ)|
- Color intensity: modulate alpha based on current magnitude

---

## 7. Academic References

### 7.1 Synchronous Machine Theory

1. **Kundur, P. (1994).** *Power System Stability and Control.* McGraw-Hill.
   - Section 3.4: Synchronous machine theory
   - Section 11.1: Swing equation fundamentals
   - Figures 3.1-3.5: Machine cross-sections and phasor diagrams

2. **Anderson, P. M., & Fouad, A. A. (2003).** *Power System Control and Stability* (2nd ed.). IEEE Press.
   - Chapter 2: Synchronous machine representation
   - Section 2.4: Power-angle relationships
   - Figures showing rotor-stator geometry

3. **Fitzgerald, A. E., Kingsley, C., & Umans, S. D. (2003).** *Electric Machinery* (6th ed.). McGraw-Hill.
   - Chapter 5: Synchronous machines
   - Detailed illustrations of stator windings and field patterns
   - Rotating magnetic field development

### 7.2 Visualization Standards

4. **IEEE Std 421.5-2005.** *Excitation System Models for Power Stability Studies.*
   - Governor and exciter block diagrams
   - TGOV1 model structure

5. **IEEE Std 399-1997.** *Recommended Practice for Industrial & Commercial Power Systems.*
   - Load profile visualization
   - System response curves

### 7.3 Web Technologies

6. **MDN Web Docs.** *Canvas API Tutorial: Basic Animations.*
   https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations

7. **Soueidan, S. (2014).** *A Guide to SVG Animations (SMIL).* CSS-Tricks.
   https://css-tricks.com/guide-svg-animations-smil/

8. **W3C.** *SVG Animations Level 2 Specification.*
   https://svgwg.org/specs/animations/

---

## 8. Implementation Checklist

### Phase 1: Basic Stator-Rotor Visualization
- [ ] Add stator cross-section to Panel I
- [ ] Add 6 coil symbols (color-coded by phase)
- [ ] Add rotor circle representation
- [ ] Add field winding symbol on rotor
- [ ] Test static rendering

### Phase 2: Magnetic Field Visualization
- [ ] Implement rotating field vector (resultant of 3 phases)
- [ ] Add three individual phase vectors (optional toggle)
- [ ] Animate field rotation at VSPD
- [ ] Show field strength indicator (based on E')

### Phase 3: Interaction
- [ ] Link field visualization to simulation state
- [ ] Show field strength change when Ef changes
- [ ] Visual feedback during SC event (field collapse)
- [ ] Delta angle visualization enhancement

### Phase 4: Polish
- [ ] Optimize performance (debounce, efficient redraw)
- [ ] Add legend/tooltips for visualization elements
- [ ] Test on multiple screen sizes
- [ ] Cross-browser testing

---

## 9. Summary of Key Findings

**1. Physical Accuracy:**
- PLTU generators use cylindrical (non-salient pole) rotors
- Stator has 3-phase windings, 120° apart
- Rotating field created by three sinusoidal currents
- Rotor field is DC (constant magnitude)

**2. Visualization Strategy:**
- Use SVG for static elements (stator ring, coil symbols, rotor outline)
- Use Canvas for animated elements (field lines, particle effects)
- Or use SVG for everything with JavaScript-driven animation
- Phasor diagram is educational standard for power systems

**3. Technical Approach:**
- `requestAnimationFrame()` for smooth 60fps animation
- Separate visual speed (VSPD) from actual synchronous speed
- Color-code phases: Red, Yellow, Blue
- Show resultant rotating field as prominent green vector

**4. Animation Best Practices:**
- Debounce resize events
- Use `save()`/`restore()` for Canvas state management
- Clear and redraw entire frame for Canvas
- SMIL for declarative SVG animations (or JS manipulation)

**5. Integration with Current Simulator:**
- Enhance existing Panel I (phasor) with physical machine cross-section
- Maintain current functionality (delta visualization, phasor rotation)
- Add optional visualization modes (phasor only, cross-section, combined)

---

## Appendix A: Current Simulator Visualization Code Reference

**From `LEVEL 1 - SYNCHRONOUS GENERATOR SIMULATOR (UNSTABLE).html`:**

```javascript
// Panel I: SVG Phasor Animation
// Current implementation: Two phasors (Vt and Ef) rotating at VSPD
// Delta = angular separation between them

// Key parameters:
const VSPD = 2 * Math.PI / 7;  // 1 revolution per 7 seconds
const NS = 'http://www.w3.org/2000/svg';

// Current visual elements:
// - Background circle with tick marks
// - Vt phasor (blue) - grid reference
// - Ef phasor (orange) - excitation EMF
// - Delta arc showing power angle
// - Data panels (left and right)
// - Center dot and cross-hairs
```

**Enhancement opportunity:**
The current phasor diagram effectively shows the electrical quantities (Vt and Ef). Adding a physical cross-section visualization would enhance educational value by showing:
- Where these phasors originate physically
- How 3-phase currents create rotating field
- Relationship between rotor position and power angle

---

**Document Version:** 1.0
**Last Updated:** 2026-09-08
**Author:** Claude Code (research compilation)
**Status:** Research Complete - Ready for Implementation Planning
