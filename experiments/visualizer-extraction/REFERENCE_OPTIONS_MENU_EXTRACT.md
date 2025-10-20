# Reference Options Menu - Complete Extraction

## Source
`visualizer_V37_for_extraction.html` lines 2197-2890

## Complete Section Structure

### 1. Toggle Controls
- Crosshair toggle
- Tooltips toggle
- Info Window toggle
- Fullscreen toggle
- Move Joystick toggle
- Look Joystick toggle
- Play Button toggle

### 2. File Browser
- Search input
- Data sources checkboxes (Audio Files, Stems)
- Show All / Hide All buttons
- File count display
- Color categories legend
- Tags list
- File list (scrollable)

### 3. Movement & Camera
```html
<label>Stem Galaxy Offset: <span id="stemOffsetValue">0</span></label>
<input type="range" min="0" max="1000" step="10" value="0">

<label>Movement Speed: <span id="galaxyMoveSpeedValue">3.0</span></label>
<input type="range" min="0.1" max="5" step="0.1" value="3.0">

<label>Look Sensitivity: <span id="galaxyLookSensValue">0.002</span></label>
<input type="range" min="0.0005" max="0.05" step="0.0005" value="0.002">
```

### 4. Visualization Modes
```html
<label>Color By:</label>
<select id="galaxyColorMode">
    <option value="tags">Tags (Category)</option>
    <option value="key">Musical Key</option>
    <option value="bpm">BPM Range</option>
    <option value="length">Length (Duration)</option>
</select>

<label>X-Axis (Left/Right):</label>
<select id="galaxyXAxisMode">
    <option value="bpm">BPM</option>
    <option value="key">Musical Key</option>
    <option value="tags">Tags (Hash)</option>
    <option value="length">Length (Duration)</option>
    <option value="random">Random</option>
</select>

<label>Y-Axis (Up/Down):</label>
<select id="galaxyYAxisMode">
    <option value="key">Musical Key</option>
    <option value="bpm">BPM</option>
    <option value="tags">Tags (Hash)</option>
    <option value="length">Length (Duration)</option>
    <option value="random">Random</option>
</select>

<label>Z-Axis (Depth):</label>
<select id="galaxyZAxisMode">
    <option value="tags">Tags (Hash)</option>
    <option value="bpm">BPM</option>
    <option value="key">Musical Key</option>
    <option value="length">Length (Duration)</option>
    <option value="random">Random</option>
</select>

<label>Particle Size: <span id="galaxyParticleSizeValue">5</span></label>
<input type="range" min="1" max="10" step="0.1" value="5">

<label>Brightness: <span id="galaxyBrightnessValue">0.8</span></label>
<input type="range" min="0.5" max="10" step="0.1" value="0.8">

<label>Visibility Distance: <span id="galaxyVisibilityValue">900</span></label>
<input type="range" min="100" max="2000" step="50" value="900">
```

### 5. Galaxy Dynamics
```html
<label>Rotation Mode:</label>
<select id="rotationMode">
    <option value="collective">Collective (Sphere)</option>
    <option value="spiral">Spiral Galaxy</option>
    <option value="individual">Individual Orbits</option>
</select>

<label>Rotation Axis:</label>
<select id="rotationAxis">
    <option value="y">Y-Axis (Vertical)</option>
    <option value="x">X-Axis (Horizontal)</option>
    <option value="z">Z-Axis (Depth)</option>
    <option value="all">All Axes</option>
</select>

<label>Speed: <span id="speedValue">0.010</span></label>
<input type="range" id="speedSlider" min="0" max="0.00003" step="0.0000001" value="0.0000015">
<input type="number" id="speedInput" value="0.0000015">

<label>Amplitude: <span id="radiusValue">20</span></label>
<input type="range" id="radiusSlider" min="0" max="100" step="1" value="80">

<label>Particle Size: <span id="sizeValue">10</span></label>
<input type="range" id="sizeSlider" min="0.5" max="100" step="0.5" value="17.5">

<label>Particle Brightness: <span id="brightnessValue">1.5</span></label>
<input type="range" id="brightnessSlider" min="0.1" max="10.0" step="0.1" value="0.8">

<label>Visibility Distance: <span id="visibilityValue">500</span></label>
<input type="range" id="visibilitySlider" min="100" max="2000" step="50" value="900">

<label>Particle Shape:</label>
<select>
    <option value="circle">Circle</option>
    <option value="square">Square</option>
    <option value="disc">Disc</option>
    <option value="ring">Ring</option>
</select>

<label>X-Axis Scale: <span id="xAxisScaleValue">1.0</span></label>
<input type="range" id="xAxisScaleSlider" min="0.1" max="3.0" step="0.1" value="1.0">

<label>Y-Axis Scale: <span id="yAxisScaleValue">1.0</span></label>
<input type="range" id="yAxisScaleSlider" min="0.1" max="3.0" step="0.1" value="1.0">

<label>Z-Axis Scale: <span id="zAxisScaleValue">1.0</span></label>
<input type="range" id="zAxisScaleSlider" min="0.1" max="3.0" step="0.1" value="1.0">

<button id="motionToggle">Motion: ON</button>
```

### 6. Sub-Particle Dynamics
```html
<label>Cluster Spread: <span id="clusterSpreadValue">2.0</span></label>
<input type="range" id="clusterSpreadSlider" min="0.1" max="20" step="0.1" value="10.0">

<label>Sub-Particle Size: <span id="subParticleSizeValue">0.3</span></label>
<input type="range" id="subParticleSizeSlider" min="0.05" max="1.0" step="0.05" value="0.3">

<label>Main/Sub Size Ratio: <span id="mainToSubRatioValue">2.0</span></label>
<input type="range" id="mainToSubRatioSlider" min="1.0" max="10.0" step="0.5" value="2.0">

<label>Sub-Particle Count: <span id="subParticleCountValue">15</span></label>
<input type="range" id="subParticleCountSlider" min="3" max="50" step="1" value="48">

<label>Sub-Particle Distance: <span id="subParticleMotionValue">1.0</span></label>
<input type="range" id="subParticleMotionSlider" min="0" max="50" step="0.5" value="3.6">

<label>Sub-Particle Speed: <span id="subParticleSpeedValue">0.5</span></label>
<input type="range" id="subParticleSpeedSlider" min="0.1" max="25.0" step="0.5" value="0.5">

<label>Motion Path:</label>
<select id="motionPathSelect">
    <option value="natural">Natural (Simple Orbit)</option>
    <option value="ring">Ring (2D Orbit)</option>
    <option value="sphere">Sphere (3D Orbit)</option>
    <option value="figure8">Figure Eight</option>
    <option value="random">Random (Chaotic Orbits)</option>
    <option value="static">Static (No Motion)</option>
</select>

<label>Cluster Shape:</label>
<select id="subParticleShapeSelect">
    <option value="default">Default</option>
    <option value="sphere">Sphere</option>
    <option value="spiked">Spiked</option>
</select>
```

### 7. Visual Gradients
```html
<label>Size Gradient: <span id="sizeGradientValue">0.0</span></label>
<input type="range" id="sizeGradientSlider" min="0" max="2" step="0.1" value="0">
<div>0 = uniform, 2 = extreme gradient (large center, tiny outer)</div>

<label>Density Gradient: <span id="densityGradientValue">0.0</span></label>
<input type="range" id="densityGradientSlider" min="0" max="1" step="0.1" value="0">
<div>0 = uniform, 1 = dense center, sparse outer</div>

<label>Bloom/Glow: <span id="bloomStrengthValue">0.0</span></label>
<input type="range" id="bloomStrengthSlider" min="0" max="10" step="0.5" value="0">
<div>0 = no glow, 10 = maximum bloom effect</div>
```

### 8. Audio Reactivity
```html
<label>Current Amplitude: <span id="audioAmplitudeDisplay">0.00</span></label>

<div style="grid: 1fr 1fr 1fr">
    <div>Bass: <span id="bassAmplitudeDisplay">0.00</span></div>
    <div>Mids: <span id="midsAmplitudeDisplay">0.00</span></div>
    <div>Highs: <span id="highsAmplitudeDisplay">0.00</span></div>
</div>

<label>Frequency Range:</label>
<select id="frequencyModeSelect">
    <option value="all">All Frequencies</option>
    <option value="bass">Bass (20-250 Hz)</option>
    <option value="mids">Mids (250-2000 Hz)</option>
    <option value="highs">Highs (2000+ Hz)</option>
</select>

<label>Pulse Strength (Playing): <span id="audioStrengthValue">3.0</span></label>
<input type="range" id="audioStrengthSlider" min="0" max="100" step="1" value="40">

<label>Global Reactivity (All): <span id="globalReactivityValue">0.5</span></label>
<input type="range" id="globalReactivitySlider" min="0" max="10" step="0.1" value="4.4">

<button id="audioReactivityToggle">Audio Reactivity: ON</button>
```

### 9. Crosshair Hover Effects
```html
<label>Hover Speed: <span id="hoverSpeedValue">10</span>%</label>
<input type="range" id="hoverSpeedSlider" min="0" max="100" step="5" value="10">
<div>Speed % when hovered (10% = very slow)</div>

<label>Hover Scale: <span id="hoverScaleValue">1.0</span>x</label>
<input type="range" id="hoverScaleSlider" min="1" max="5" step="0.1" value="1.0">
<div>Size multiplier when hovered (1.0 = no change)</div>

<button id="mouseInteractionToggle">Crosshair Hover: ON</button>
```

### 10. Presets
```html
<label>Preset Name:</label>
<input type="text" id="presetNameInput" placeholder="My Preset">

<input type="checkbox" id="saveCameraCheckbox" checked>
<span>Save Camera Position</span>

<button>Save Preset</button>

<label>Load Preset:</label>
<select id="presetSelect">
    <option value="">-- Select Preset --</option>
</select>

<button>Delete Selected Preset</button>
<button>Set as Default Preset</button>

<!-- Import/Export -->
<button>📥 Export All to JSON</button>
<button>📤 Import from JSON</button>

<!-- Cloud Sync -->
<button>☁️ Upload Presets to Cloud</button>
<button>⬇️ Download Presets from Cloud</button>
```

---

## Implementation Strategy

### Option 1: Copy Entire HTML Block
- Extract lines 2197-2890 from reference
- Replace our current OPTIONS_MENU.html content
- Update all `onclick` handlers to point to our control functions

### Option 2: Merge Sections
- Keep our existing structure
- Add missing sections one by one
- Ensure control IDs match reference

### Option 3: Hybrid Approach (RECOMMENDED)
1. Keep our HTML file structure
2. Copy EXACT sections from reference
3. Map reference control functions to our galaxyControls.js
4. Ensure all window variables match reference naming

---

## Next Steps

1. **Extract all control functions** from reference JavaScript
2. **Map reference variables** to our implementation
3. **Replace OPTIONS_MENU.html** with reference structure
4. **Update galaxyControls.js** to match reference function names
5. **Update galaxyViewRefactored.js** to use reference variable names

This will give us EXACT feature parity with the reference file.
