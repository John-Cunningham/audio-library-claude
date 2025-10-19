# Galaxy Visualizer Extraction Prompts
**Purpose:** Extract modular components from standalone visualizer for integration into audio-library-claude
**Source File:** `visualizer_V37_for_extraction.html` (9085 lines)
**Target:** Clean, documented, integration-ready code blocks

---

## 🎯 EXTRACTION SESSION SETUP

**Model Recommendation:** Claude Opus 4 (better for large file analysis)
**Thinking Mode:** ON (required for careful analysis)
**MCPs:** Optional (Code Rabbit won't help much with single HTML file)
**Working Directory:** `/Users/jcc/Resilio Sync/JC Cloud/Developer/audio-library-claude/experiments/visualizer-extraction/`

---

## 📋 PROMPT SEQUENCE

Use these prompts **in order**. Each builds on the previous one.

---

## PROMPT 1: Initial Analysis & Function Inventory

```
I need you to analyze this standalone HTML visualizer and extract its code into modular components for integration into another codebase.

CONTEXT:
- This is a 9085-line standalone HTML file with a complete 3D audio visualizer
- It uses Three.js r128, WaveSurfer v7, and instanced mesh rendering
- I need to extract the visualization logic and integrate it into an existing audio library app
- The target app already has:
  - Three.js r128 scene with basic particles
  - Global player bar with WaveSurfer instance
  - Game controls (WASD + mouse look with pointer lock)
  - ViewManager lifecycle (init, update, destroy)
  - Global audioFiles array with BPM, key, tags, etc.

YOUR TASK:
1. Read the entire file: visualizer_V37_for_extraction.html

2. Identify and catalog ALL key functional sections:
   - Particle system (instanced mesh + subparticles)
   - Audio analyzer (connects to WaveSurfer's audio context)
   - Animation loop (motion, reactivity, particle updates)
   - Color/positioning logic (axes modes, color modes)
   - Utility functions (seededRandom, calculateAxisValue, etc.)
   - Options menu UI and controls
   - Visual effects (bloom, textures)

3. Create a detailed function inventory with this format:
   ```
   FUNCTION: functionName()
   LINES: 1234-1567
   PURPOSE: What it does
   DEPENDENCIES: What functions/variables it needs
   ADAPTATION NEEDED: Yes/No - explanation
   PRIORITY: High/Medium/Low for integration
   ```

4. Identify all global variables used by the visualizer and their purposes

5. Note any Three.js post-processing dependencies (effect passes, shaders)

DO NOT extract code yet - just create the comprehensive inventory first.

DELIVERABLE: A markdown document with complete function inventory, variable list, and dependency graph.
```

**Expected Output:** Function inventory document (save as `FUNCTION_INVENTORY.md`)

---

## PROMPT 2: Extract Core Utilities (No Dependencies)

```
Now extract the utility functions that have NO dependencies on the standalone's structure. These are pure helper functions.

TARGET FUNCTIONS (find and extract):
- seededRandom() - deterministic random number generator
- createParticleTexture() - generates particle textures (circle, square, disc, ring)
- Any color conversion utilities (HSL, RGB, etc.)
- Any mathematical helper functions
- Any string parsing utilities

For each function, provide:
1. Complete function code (well-formatted)
2. JSDoc comment explaining what it does
3. Parameter descriptions
4. Return value description
5. Example usage
6. Any constants it requires

FORMAT AS:
```javascript
// === CORE UTILITIES MODULE ===
// Pure helper functions with no external dependencies
// Safe to integrate first

/**
 * Description here
 * @param {type} paramName - description
 * @returns {type} description
 */
function functionName(params) {
    // code here
}

// Example usage:
// const result = functionName(input);
```

DELIVERABLE: Complete, copy-paste-ready utility functions with documentation.
```

**Expected Output:** `UTILITIES.js` - Ready to integrate

---

## PROMPT 3: Extract Particle System Core

```
Extract the particle system code as a modular component that can work with an existing Three.js scene.

WHAT TO EXTRACT:
- createParticles() function - main particle creation logic
- calculateFilePosition() function - positions particles based on axis modes
- calculateAxisValue() function - converts file properties to 3D coordinates
- getColorForFile() function - determines particle color
- updateTagLegend() and related legend functions
- Any particle texture/material creation functions
- Any related helper functions

CRITICAL ADAPTATIONS NEEDED:
1. Data source: Accept audioFiles array as parameter (don't load from Supabase)
2. Scene: Accept Three.js scene object as parameter (don't create new scene)
3. Variables: Document all required global variables
4. File ID format: Use simple IDs, not composite "audio_files_123" format

PROVIDE:
1. Complete extracted code as a module
2. List of required global variables with default values
3. List of required constants/configuration objects
4. Function signatures showing parameters
5. Integration notes (what needs to change in target codebase)
6. Performance notes (instanced mesh rendering details)

FORMAT AS:
```javascript
// === PARTICLE SYSTEM MODULE ===

// REQUIRED GLOBAL VARIABLES (define these in your main file):
let particleSystem = null;
let particles = [];
let particlesPerCluster = 48;
// ... (list all)

// REQUIRED CONSTANTS:
const KEY_COLORS = { /* ... */ };
// ... (list all)

/**
 * Creates particle system from audio files
 * @param {Array} audioFiles - Array of file objects with {id, name, bpm, key, tags, etc}
 * @param {THREE.Scene} scene - Three.js scene to add particles to
 */
function createParticles(audioFiles, scene) {
    // Extracted code here...
}

// ... (all related functions)
```

DELIVERABLE: Complete particle system module with all dependencies documented.
```

**Expected Output:** `PARTICLE_SYSTEM.js` - Modular particle creation code

---

## PROMPT 4: Extract Audio Analyzer System

```
Extract the audio analysis system that connects to WaveSurfer and provides frequency data.

WHAT TO EXTRACT:
- setupAudioAnalysis() function - connects analyzer to WaveSurfer
- updateAudioAmplitude() function - calculates bass/mids/highs
- Any frequency calculation helpers
- Error handling and reconnection logic

CRITICAL ADAPTATION:
The standalone creates its own WaveSurfer instance. Our target app has an EXISTING global wavesurfer instance. The extracted code must:
- Accept wavesurfer instance as parameter
- NOT create a new WaveSurfer
- Safely handle reconnection when files change
- Work with WaveSurfer v7 specifically

PROVIDE:
1. Complete extracted code
2. Detailed audio routing diagram showing:
   - WaveSurfer's internal audio chain
   - Where analyzer node is inserted
   - How it doesn't break playback
3. List of required global variables (analyser, audioContext, etc.)
4. Integration instructions:
   - When to call setupAudioAnalysis()
   - When to call updateAudioAmplitude()
   - How to handle file changes
5. Error handling notes
6. Debug logging to verify it's working

FORMAT AS:
```javascript
// === AUDIO ANALYZER MODULE ===

// AUDIO CHAIN (WaveSurfer v7):
// MediaElement → GainNode → Analyser → AudioContext.destination
//                            ↑
//                    Insert here (don't break chain!)

// REQUIRED GLOBAL VARIABLES:
let audioContext = null;
let analyser = null;
// ... (list all)

/**
 * Sets up audio analyzer connected to WaveSurfer instance
 * IMPORTANT: Call this after loading a file, or when wavesurfer recreates
 * @param {WaveSurfer} wavesurferInstance - Existing WaveSurfer instance
 */
function setupAudioAnalysis(wavesurferInstance) {
    // Extracted code with detailed comments...
}

/**
 * Updates audio amplitude values from analyzer
 * Call this every frame in your animation loop
 */
function updateAudioAmplitude() {
    // Extracted code...
}
```

DELIVERABLE: Audio analyzer module with integration guide
```

**Expected Output:** `AUDIO_ANALYZER.js` - Audio analysis system

---

## PROMPT 5: Extract Animation & Reactivity Logic

```
Extract the particle animation and audio reactivity logic from the animate() loop.

WHAT TO EXTRACT:
- Particle position update logic (motion, orbit, spiral, etc.)
- Audio reactivity scaling (particles pulse with music)
- Subparticle orbit calculations
- Distance-based culling/visibility
- Hover effects (crosshair interaction)
- Currently playing file highlighting

WHAT NOT TO EXTRACT:
- The render loop itself (we have our own)
- Basic Three.js rendering calls
- Just the particle UPDATE logic

ORGANIZE BY:
1. Motion systems (collective, spiral, individual, etc.)
2. Audio reactivity (playing file pulse, global pulse)
3. Subparticle animation (orbit paths)
4. Visual effects (hover, highlighting)

PROVIDE:
1. A main updateParticles(deltaTime, currentFileId) function
2. Helper functions for each motion mode
3. List of all motion-related variables with defaults
4. List of all reactivity-related variables with defaults
5. Comments explaining each motion mode algorithm
6. Performance notes (what's expensive, optimization tips)

FORMAT AS:
```javascript
// === PARTICLE ANIMATION MODULE ===

// REQUIRED VARIABLES - Motion:
let motionEnabled = true;
let motionMode = 'collective'; // 'collective', 'spiral', 'individual'
// ... (list all)

// REQUIRED VARIABLES - Audio Reactivity:
let audioReactivityEnabled = true;
let audioReactivityStrength = 40;
// ... (list all)

/**
 * Updates all particle positions and effects
 * Call this every frame from your animation loop
 * @param {number} deltaTime - Time since last frame
 * @param {number|string} currentFileId - ID of currently playing file (for highlighting)
 */
function updateParticles(deltaTime, currentFileId) {
    // Main update logic...

    particles.forEach((cluster, index) => {
        // Update cluster position (motion)
        updateClusterMotion(cluster, deltaTime);

        // Update subparticles (orbits)
        updateSubParticles(cluster, deltaTime);

        // Apply audio reactivity
        if (audioReactivityEnabled) {
            applyAudioReactivity(cluster, currentFileId);
        }

        // Apply hover effects
        if (mouseInteractionEnabled) {
            applyHoverEffects(cluster);
        }
    });

    // Update instanced mesh matrices
    particleSystem.instanceMatrix.needsUpdate = true;
}

// Helper functions for each motion mode...
function updateClusterMotion(cluster, deltaTime) {
    if (!motionEnabled) return;

    switch (motionMode) {
        case 'collective':
            // Collective sphere rotation logic...
            break;
        case 'spiral':
            // Spiral galaxy logic...
            break;
        case 'individual':
            // Individual orbits logic...
            break;
    }
}

// ... (all helper functions)
```

DELIVERABLE: Complete animation update module
```

**Expected Output:** `PARTICLE_ANIMATION.js` - Animation and reactivity

---

## PROMPT 6: Extract Options Menu UI

```
Extract the complete options menu (optionsMenu2) as HTML, CSS, and JavaScript.

WHAT TO EXTRACT:
1. HTML structure (lines ~2197-2700+):
   - The entire <div id="optionsMenu2"> and its contents
   - All collapsible sections
   - All controls (sliders, selects, buttons)

2. CSS styles:
   - .mode-controls, .mode-controls-left
   - .options-title-bar
   - .collapsible-content
   - All slider and button styles
   - Drag/resize cursor styles

3. JavaScript functionality:
   - toggleOptionsMenu2() - collapse/expand
   - toggleSection() - section collapse
   - initOptionsMenu2Drag() - drag functionality
   - initOptionsMenu2Resize() - resize functionality
   - All oninput handlers

ORGANIZE INTO THREE BLOCKS:
1. HTML (ready to insert into #galaxyViewContainer)
2. CSS (ready to add to stylesheet)
3. JavaScript (all interactive functions)

DOCUMENT:
- Which controls call which functions
- What variables each control modifies
- Default values for all controls
- Mobile touch support notes

FORMAT AS:
```html
<!-- === OPTIONS MENU HTML === -->
<!-- Insert this into #galaxyViewContainer -->

<div class="mode-controls mode-controls-left" id="optionsMenu2">
    <!-- Complete menu structure... -->
</div>
```

```css
/* === OPTIONS MENU CSS === */
/* Add this to your stylesheet */

.mode-controls {
    /* styles... */
}

/* ... all styles ... */
```

```javascript
// === OPTIONS MENU JAVASCRIPT ===

// Collapse/Expand main menu
function toggleOptionsMenu2() {
    // code...
}

// Collapse/Expand sections
function toggleSection(element) {
    // code...
}

// Initialize drag functionality
function initOptionsMenu2Drag() {
    // code...
}

// Control update functions
function updateParticleSize(value) {
    particleSize = parseFloat(value);
    document.getElementById('galaxyParticleSizeValue').textContent = value;
    recreateParticles();
}

// ... (all control handlers)
```

PROVIDE ALSO:
- List of all control IDs and their purposes
- List of all functions called by controls
- Integration checklist (steps to wire it up)

DELIVERABLE: Three separate files for HTML, CSS, JS
```

**Expected Output:**
- `OPTIONS_MENU.html`
- `OPTIONS_MENU.css`
- `OPTIONS_MENU.js`

---

## PROMPT 7: Extract Visual Effects System

```
Extract the post-processing effects system (bloom, glow, etc.)

WHAT TO EXTRACT:
- EffectComposer setup from initScene()
- UnrealBloomPass configuration
- Render target setup
- Bloom strength controls
- Any custom shaders

IDENTIFY DEPENDENCIES:
- What Three.js libraries are needed (script tags)
- What order to load them

PROVIDE:
1. Complete effect setup code
2. List of required script tags for index.html
3. Variables for effect controls
4. Integration notes (when to initialize, how to toggle)
5. Performance impact notes

FORMAT AS:
```javascript
// === VISUAL EFFECTS MODULE ===

// REQUIRED THREE.JS LIBRARIES (add these script tags):
// <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
// <script src="..."></script>
// ... (list all)

// REQUIRED VARIABLES:
let composer = null;
let bloomPass = null;
let bloomStrength = 0;

/**
 * Sets up post-processing effects
 * @param {THREE.Scene} scene
 * @param {THREE.Camera} camera
 * @param {THREE.WebGLRenderer} renderer
 */
function setupEffects(scene, camera, renderer) {
    // Effect composer setup...
}

/**
 * Update bloom strength
 * @param {number} strength - 0 to 10
 */
function updateBloomStrength(strength) {
    bloomStrength = parseFloat(strength);
    if (bloomPass) {
        bloomPass.strength = bloomStrength;
    }
}

/**
 * Render with effects
 * Call this instead of renderer.render() if effects are enabled
 */
function renderWithEffects() {
    if (composer && bloomStrength > 0) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}
```

DELIVERABLE: Visual effects module with dependency list
```

**Expected Output:** `VISUAL_EFFECTS.js` - Post-processing setup

---

## PROMPT 8: Create Integration Package & Guide

```
Create a final integration package that organizes everything and provides a clear integration roadmap.

SYNTHESIZE:
1. All extracted modules
2. All variable lists
3. All dependencies

CREATE:
1. **INTEGRATION_GUIDE.md** with:
   - Complete variable initialization code (copy-paste ready)
   - Integration order (step-by-step: what to add first, second, etc.)
   - Dependency graph (visual text diagram showing what depends on what)
   - File structure recommendation (where each module goes)
   - Testing checklist for each integration step

2. **VARIABLE_INIT.js** - All variables with defaults:
   ```javascript
   // === ALL REQUIRED VARIABLES ===
   // Copy this block to the top of galaxyView.js

   // Particle System
   let particleSystem = null;
   let particles = [];
   let particlesPerCluster = 48;
   // ... (ALL variables organized by module)
   ```

3. **INTEGRATION_CHECKLIST.md**:
   - [ ] Step 1: Add utility functions
   - [ ] Test: Utilities work independently
   - [ ] Step 2: Add particle system
   - [ ] Test: Instanced particles render
   - [ ] Step 3: Add audio analyzer
   - [ ] Test: Amplitude values update
   - ... (complete checklist)

4. **KNOWN_ISSUES.md**:
   - Tricky parts identified during extraction
   - Potential integration conflicts
   - Performance considerations
   - Required code changes in target app

DELIVERABLE: Complete integration package with guides
```

**Expected Output:**
- `INTEGRATION_GUIDE.md`
- `VARIABLE_INIT.js`
- `INTEGRATION_CHECKLIST.md`
- `KNOWN_ISSUES.md`

---

## 📊 EXPECTED DELIVERABLES

After running all 8 prompts, you should have:

### Analysis Documents:
1. `FUNCTION_INVENTORY.md` - Complete function catalog
2. `INTEGRATION_GUIDE.md` - Step-by-step integration instructions
3. `INTEGRATION_CHECKLIST.md` - Testing checklist
4. `KNOWN_ISSUES.md` - Gotchas and warnings

### Code Modules:
5. `UTILITIES.js` - Pure helper functions
6. `PARTICLE_SYSTEM.js` - Particle creation and positioning
7. `AUDIO_ANALYZER.js` - Audio analysis system
8. `PARTICLE_ANIMATION.js` - Animation and reactivity
9. `OPTIONS_MENU.html` - Menu HTML structure
10. `OPTIONS_MENU.css` - Menu styles
11. `OPTIONS_MENU.js` - Menu interactivity
12. `VISUAL_EFFECTS.js` - Post-processing effects
13. `VARIABLE_INIT.js` - All variables with defaults

### Integration Support:
14. Dependency graph (in INTEGRATION_GUIDE.md)
15. Script tag list (in VISUAL_EFFECTS.js)
16. Testing procedures (in INTEGRATION_CHECKLIST.md)

---

## 🎯 SUCCESS CRITERIA

The extraction session is complete when:
- ✅ All 13 deliverable files created
- ✅ All code is documented with JSDoc comments
- ✅ All dependencies are identified
- ✅ All variables have default values
- ✅ Integration order is clear
- ✅ Code is formatted and ready to copy-paste

---

## 🔄 BRINGING RESULTS BACK

After extraction is complete:
1. Copy all generated files to this directory
2. Review INTEGRATION_GUIDE.md
3. Return to main Claude session
4. Say: "Extraction complete, ready to integrate"
5. Main session will use these modules to build Phase 2

---

**Ready to begin? Start with PROMPT 1 in a new Claude session.**
