# Galaxy Visualizer Function Inventory

## Overview
This document catalogs all key functional sections from `visualizer_V37_for_extraction.html` (9085 lines).
- **Uses:** Three.js r128, WaveSurfer v7, Supabase
- **Architecture:** Single HTML file with instanced mesh particle system
- **Target Integration:** audio-library-claude with existing galaxy view

---

## 🎯 Core Utility Functions (No Dependencies)

### FUNCTION: seededRandom()
**LINES:** 4915-4919
**PURPOSE:** Generates deterministic random numbers from seed
**DEPENDENCIES:** None
**ADAPTATION NEEDED:** No - pure function
**PRIORITY:** High - used throughout for consistent positioning

### FUNCTION: createParticleTexture()
**LINES:** 4360-4429
**PURPOSE:** Creates canvas-based particle textures (circle, square, disc, ring)
**DEPENDENCIES:** None (uses HTML Canvas API)
**ADAPTATION NEEDED:** No - pure function
**PRIORITY:** High - essential for particle rendering

### FUNCTION: formatTime()
**LINES:** 6670-6674
**PURPOSE:** Formats seconds to MM:SS display
**DEPENDENCIES:** None
**ADAPTATION NEEDED:** No - pure function
**PRIORITY:** Medium - for UI display

---

## 🌌 Particle System Functions

### FUNCTION: createParticles()
**LINES:** 4713-4913
**PURPOSE:** Creates instanced mesh particle system from audio files
**DEPENDENCIES:**
- Three.js scene, geometry, materials
- audioFiles array
- Global variables: particles, particleSystem, particlesPerCluster
- seededRandom(), calculateFilePosition(), getColorForFile()
**ADAPTATION NEEDED:** Yes - accept scene and audioFiles as parameters
**PRIORITY:** High - core visualization

### FUNCTION: calculateFilePosition()
**LINES:** 4922-4946
**PURPOSE:** Calculates 3D position based on file properties and axis modes
**DEPENDENCIES:**
- calculateAxisValue()
- currentXMode, currentYMode, currentZMode
- xAxisScale, yAxisScale, zAxisScale
- seededRandom()
**ADAPTATION NEEDED:** Yes - pass modes as parameters
**PRIORITY:** High - positioning logic

### FUNCTION: calculateAxisValue()
**LINES:** Not shown in excerpts, but referenced
**PURPOSE:** Converts file property to coordinate value
**DEPENDENCIES:** File properties (BPM, key, tags)
**ADAPTATION NEEDED:** Yes - extract as pure function
**PRIORITY:** High - positioning calculation

### FUNCTION: getColorForFile()
**LINES:** Referenced multiple times
**PURPOSE:** Determines particle color based on mode
**DEPENDENCIES:**
- currentColorMode
- getCategoryForFile(), getColorForCategory()
- KEY_COLORS constant
**ADAPTATION NEEDED:** Yes - pass color mode as parameter
**PRIORITY:** High - visual distinction

### FUNCTION: getCategoryForFile()
**LINES:** Referenced throughout
**PURPOSE:** Determines category from file tags
**DEPENDENCIES:** File tags array
**ADAPTATION NEEDED:** No - pure function
**PRIORITY:** High - categorization

### FUNCTION: updateTagLegend()
**LINES:** 4964-4977
**PURPOSE:** Updates color legend based on current mode
**DEPENDENCIES:** DOM elements, current color mode
**ADAPTATION NEEDED:** Yes - separate DOM from logic
**PRIORITY:** Medium - UI feedback

---

## 🎵 Audio Analysis Functions

### FUNCTION: setupAudioAnalysis()
**LINES:** 6485-6550
**PURPOSE:** Connects analyser node to WaveSurfer's audio chain
**DEPENDENCIES:**
- WaveSurfer instance
- audioContext, analyser variables
- Web Audio API
**ADAPTATION NEEDED:** Yes - accept wavesurfer parameter
**PRIORITY:** High - audio reactivity

### FUNCTION: updateAudioAmplitude()
**LINES:** 6553-6617
**PURPOSE:** Calculates frequency band amplitudes
**DEPENDENCIES:**
- analyser, audioDataArray
- audioFrequencyMode
**ADAPTATION NEEDED:** No - works with global analyser
**PRIORITY:** High - real-time analysis

---

## 🎮 Animation & Motion Functions

### FUNCTION: animate()
**LINES:** 5227-5534
**PURPOSE:** Main animation loop with particle updates
**DEPENDENCIES:**
- Three.js renderer, scene, camera
- particles array
- Motion/audio variables
- updateMovement(), updateTargeting()
**ADAPTATION NEEDED:** Yes - modularize particle update logic
**PRIORITY:** High - core animation

### FUNCTION: updateMovement()
**LINES:** 5537-5583
**PURPOSE:** Updates camera position based on input
**DEPENDENCIES:**
- camera, keys object
- moveSpeed, lookSensitivity
- pitch, yaw variables
**ADAPTATION NEEDED:** No - already modular
**PRIORITY:** Low - existing in target

### FUNCTION: updateTargeting()
**LINES:** 5586-5633
**PURPOSE:** Raycasts from center for crosshair targeting
**DEPENDENCIES:**
- raycaster, camera
- particleSystem, particles
**ADAPTATION NEEDED:** Minor - use existing raycaster
**PRIORITY:** Medium - interaction

---

## 🎨 Visual Effects Functions

### FUNCTION: initScene()
**LINES:** Not fully shown, but referenced
**PURPOSE:** Sets up Three.js scene with post-processing
**DEPENDENCIES:**
- Three.js EffectComposer
- UnrealBloomPass
**ADAPTATION NEEDED:** Yes - integrate with existing scene
**PRIORITY:** Low - enhancement

### FUNCTION: updateBloomStrength()
**LINES:** Referenced in controls
**PURPOSE:** Updates bloom post-processing intensity
**DEPENDENCIES:** bloomPass instance
**ADAPTATION NEEDED:** Yes - optional enhancement
**PRIORITY:** Low - visual polish

---

## 📊 UI Control Functions

### FUNCTION: toggleOptionsMenu2()
**LINES:** Referenced in HTML
**PURPOSE:** Collapses/expands options panel
**DEPENDENCIES:** DOM elements
**ADAPTATION NEEDED:** Yes - adapt to target UI
**PRIORITY:** Medium - UI organization

### FUNCTION: toggleSection()
**LINES:** Referenced in HTML
**PURPOSE:** Collapses individual option sections
**DEPENDENCIES:** DOM elements
**ADAPTATION NEEDED:** Yes - reusable pattern
**PRIORITY:** Medium - UI organization

### FUNCTION: initOptionsMenu2Drag()
**LINES:** 3932
**PURPOSE:** Makes options panel draggable
**DEPENDENCIES:** DOM, mouse events
**ADAPTATION NEEDED:** Yes - optional feature
**PRIORITY:** Low - UX enhancement

### FUNCTION: initOptionsMenu2Resize()
**LINES:** 3935
**PURPOSE:** Makes options panel resizable
**DEPENDENCIES:** DOM, mouse events
**ADAPTATION NEEDED:** Yes - optional feature
**PRIORITY:** Low - UX enhancement

---

## 📁 Data Loading Functions

### FUNCTION: loadData()
**LINES:** 4561-4710
**PURPOSE:** Loads files from Supabase
**DEPENDENCIES:**
- Supabase client
- audioFiles array
**ADAPTATION NEEDED:** Yes - use existing data source
**PRIORITY:** N/A - use existing loader

### FUNCTION: updateDataSources()
**LINES:** 4533-4559
**PURPOSE:** Updates which data sources to show
**DEPENDENCIES:** DOM checkboxes, loadData()
**ADAPTATION NEEDED:** N/A - target has different data model
**PRIORITY:** N/A

---

## 🎹 Playback Functions

### FUNCTION: loadAndPlayFile()
**LINES:** 6283-6482
**PURPOSE:** Loads and plays single audio file
**DEPENDENCIES:**
- WaveSurfer
- wavesurfer global variable
- setupAudioAnalysis()
**ADAPTATION NEEDED:** Yes - use global wavesurfer
**PRIORITY:** Low - target has player

### FUNCTION: loadAndPlayMultiStem()
**LINES:** 5923-6280
**PURPOSE:** Loads multiple stems for synchronized playback
**DEPENDENCIES:**
- Multiple WaveSurfer instances
- stemWavesurfers array
**ADAPTATION NEEDED:** Yes - complex integration
**PRIORITY:** Low - advanced feature

### FUNCTION: playPause()
**LINES:** 6620-6653
**PURPOSE:** Toggles play/pause state
**DEPENDENCIES:** wavesurfer instance
**ADAPTATION NEEDED:** No - use existing
**PRIORITY:** Low - exists in target

---

## 🔧 Helper Functions

### FUNCTION: showFileTooltip()
**LINES:** 5636-5672
**PURPOSE:** Shows file info on hover
**DEPENDENCIES:** DOM tooltip elements
**ADAPTATION NEEDED:** Yes - adapt to target UI
**PRIORITY:** Medium - UX feature

### FUNCTION: hideFileTooltip()
**LINES:** 5675-5677
**PURPOSE:** Hides file tooltip
**DEPENDENCIES:** DOM element
**ADAPTATION NEEDED:** Yes - simple
**PRIORITY:** Medium - UX feature

### FUNCTION: resetCamera()
**LINES:** Referenced in controls
**PURPOSE:** Resets camera to default position
**DEPENDENCIES:** camera object
**ADAPTATION NEEDED:** No - simple reset
**PRIORITY:** Medium - UX feature

---

## 🌍 Global Variables Required

### Particle System
```javascript
let particleSystem = null;        // THREE.InstancedMesh
let particles = [];               // Array of cluster objects
let particlesPerCluster = 48;     // Sub-particles per file
let particleSize = 5;             // Base particle size
let subParticleScale = 0.3;       // Sub-particle size ratio
let clusterRadius = 10;           // Cluster spread radius
let particleShape = 'circle';     // Texture shape
```

### Audio Analysis
```javascript
let audioContext = null;          // Web Audio context
let analyser = null;               // AnalyserNode
let audioDataArray = null;         // Frequency data array
let currentAudioAmplitude = 0;    // Overall amplitude
let bassAmplitude = 0;            // Bass frequencies
let midsAmplitude = 0;            // Mid frequencies
let highsAmplitude = 0;           // High frequencies
```

### Motion & Animation
```javascript
let animationTime = 0;            // Global animation timer
let motionEnabled = true;         // Toggle motion
let motionMode = 'collective';    // Motion type
let orbitSpeed = 0.0000015;       // Rotation speed
let orbitRadius = 80;             // Motion amplitude
```

### Visual Modes
```javascript
let currentColorMode = 'tags';    // Color by: tags/key/bpm
let currentXMode = 'bpm';         // X-axis mode
let currentYMode = 'key';         // Y-axis mode
let currentZMode = 'tags';        // Z-axis mode
```

### Audio Reactivity
```javascript
let audioReactivityEnabled = true;
let audioReactivityStrength = 40;
let globalAudioReactivity = 4.4;
let audioFrequencyMode = 'all';   // all/bass/mids/highs
```

### Effects
```javascript
let bloomStrength = 0;            // Bloom intensity 0-10
let composer = null;              // EffectComposer
let bloomPass = null;             // UnrealBloomPass
```

---

## 📦 Three.js Dependencies
Required libraries (add as script tags):
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
```

---

## 🔄 Integration Order
1. **Utilities First** - Pure functions with no dependencies
2. **Particle System** - Core visualization logic
3. **Audio Analyzer** - Connect to existing wavesurfer
4. **Animation Logic** - Particle motion and reactivity
5. **UI Controls** - Options menu (optional)
6. **Visual Effects** - Bloom/glow (optional)

---

## ⚠️ Key Adaptations Needed
1. **Data Source**: Use existing audioFiles array instead of Supabase
2. **Scene Management**: Accept existing Three.js scene as parameter
3. **WaveSurfer Integration**: Connect to global wavesurfer instance
4. **ID Format**: Handle simple IDs instead of composite "audio_files_123" format
5. **File Structure**: Extract into modules instead of single HTML file