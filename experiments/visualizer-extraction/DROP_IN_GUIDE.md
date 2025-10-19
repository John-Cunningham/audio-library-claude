# 🌌 Galaxy View Drop-In Replacement Guide

## What This Is

This is a **complete drop-in replacement** for your Galaxy View that preserves the **EXACT appearance** of your `visualizer_V37_for_extraction.html` while integrating seamlessly with your existing audio library app.

## What's Been Done

### ✅ Preserved Exactly
- **Particle system** - Same 48 particles per file, same clustering
- **Visual appearance** - Exact colors, sizes, shapes, glow effects
- **Motion modes** - Collective, spiral, individual rotation patterns
- **Audio reactivity** - Same pulse effects, frequency analysis
- **Options menu** - All the same controls and settings
- **Navigation** - FPS-style WASD movement with mouse look
- **Crosshair targeting** - Click particles to play files
- **Stats overlay** - File count, position, targeted file

### ✅ Removed (as requested)
- Supabase backend connection
- Bottom player bar (uses app's global player)
- Multi-stem player UI
- File loading from database

### ✅ Integrated with your app
- Uses `window.audioFiles` array
- Connects to `window.wavesurfer` instance
- Calls `window.loadAudio()` when clicking particles
- Works alongside your existing views

---

## Files Created

```
experiments/visualizer-extraction/
├── galaxyViewReplacement.js    # Main galaxy view module
├── galaxyOptionsMenu.html      # Options UI (inject when active)
└── DROP_IN_GUIDE.md            # This file
```

---

## How to Use

### Step 1: Add Three.js Dependencies

In your main `index.html`, add these before your app scripts:

```html
<!-- Three.js core -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

<!-- Optional: For bloom effect -->
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js"></script>
```

### Step 2: Replace Your Galaxy View

**Option A: Direct Replacement** (when ready to replace existing)
```bash
# Backup existing
cp src/views/galaxyView.js src/views/galaxyView.backup.js

# Copy replacement
cp experiments/visualizer-extraction/galaxyViewReplacement.js src/views/galaxyView.js
```

**Option B: Test First** (recommended)
```javascript
// In your app.js or view switcher, temporarily use:
import { renderGalaxyView } from './experiments/visualizer-extraction/galaxyViewReplacement.js';

// Instead of:
// import { renderGalaxyView } from './src/views/galaxyView.js';
```

### Step 3: Load the Options Menu

When Galaxy View is active, inject the options menu HTML:

```javascript
// In your view switcher or galaxyView initialization
function showGalaxyView() {
    // Render the galaxy
    const container = document.getElementById('viewContainer');
    const galaxy = renderGalaxyView(container);

    // Load options menu UI
    fetch('experiments/visualizer-extraction/galaxyOptionsMenu.html')
        .then(response => response.text())
        .then(html => {
            // Create a container for the menu
            const menuContainer = document.createElement('div');
            menuContainer.id = 'galaxyMenuContainer';
            menuContainer.innerHTML = html;
            document.body.appendChild(menuContainer);
        });

    return galaxy;
}
```

### Step 4: Connect to Your Global Systems

The galaxy view automatically connects to:

```javascript
// Your global audio files array
window.audioFiles  // Already integrated

// Your global wavesurfer instance
window.wavesurfer  // Connects for audio analysis

// Your play function
window.loadAudio(file)  // Called when clicking particles
```

---

## Testing Checklist

- [ ] Three.js scripts loaded
- [ ] Galaxy view renders with particles
- [ ] Particles show your actual audio files
- [ ] Options menu appears and controls work
- [ ] WASD movement works
- [ ] Mouse look works (click to lock pointer)
- [ ] Clicking particles plays files
- [ ] Audio reactivity pulses when playing
- [ ] All visual modes work (tags/key/bpm coloring)
- [ ] Motion modes work (collective/spiral/individual)

---

## Customization

### Adjusting Default Settings

In `galaxyViewReplacement.js`, find the global variables section:

```javascript
// Adjust these defaults as needed
let particleSize = 17.5;          // Make particles bigger/smaller
let particlesPerCluster = 48;     // More/fewer particles per file
let orbitRadius = 80;              // Wider/tighter rotation
let audioReactivityStrength = 40; // Stronger/weaker pulse
```

### Changing Colors

Find the `mainCategoryColors` object:

```javascript
const mainCategoryColors = {
    'drums': { hue: 0, sat: 0.8, name: 'Red' },     // Change hue (0-360)
    'bass': { hue: 280, sat: 0.8, name: 'Purple' }, // Change saturation (0-1)
    // Add your own categories...
};
```

### Performance Tuning

For better performance on low-end devices:

```javascript
// Reduce particles
particlesPerCluster = 24;  // Half the particles

// Disable bloom
bloomStrength = 0;

// Reduce draw distance
visibilityDistance = 500;  // Shorter fog distance
```

---

## Integration Pattern

```javascript
// Example integration in your app.js

class App {
    constructor() {
        this.currentView = 'library';
        this.galaxyView = null;
    }

    switchToGalaxyView() {
        // Clean up previous view
        if (this.currentView === 'library') {
            this.hideLibraryView();
        }

        // Show galaxy
        const container = document.getElementById('mainContent');
        this.galaxyView = window.galaxyView.render(container);

        // Update on file changes
        window.addEventListener('filesUpdated', (e) => {
            if (this.galaxyView) {
                this.galaxyView.updateFiles(e.detail.files);
            }
        });

        // Connect audio when playing
        if (window.wavesurfer) {
            this.galaxyView.connectAudio(window.wavesurfer);
        }

        this.currentView = 'galaxy';
    }

    switchToLibraryView() {
        // Clean up galaxy
        if (this.galaxyView) {
            this.galaxyView.destroy();
            this.galaxyView = null;

            // Remove options menu
            const menuContainer = document.getElementById('galaxyMenuContainer');
            if (menuContainer) menuContainer.remove();
        }

        // Show library
        this.showLibraryView();
        this.currentView = 'library';
    }
}
```

---

## Troubleshooting

### No particles visible
```javascript
// Check if files are loaded
console.log('Files:', window.audioFiles);

// Manually trigger update
window.galaxyView.updateFiles(window.audioFiles);
```

### No audio reactivity
```javascript
// Check if wavesurfer is connected
window.galaxyView.connectAudio(window.wavesurfer);

// Check if audio context is running
console.log('Audio context:', window.wavesurfer.backend.ac.state);
```

### Performance issues
```javascript
// Reduce particle count
window.particlesPerCluster = 24;
window.galaxyView.updateFiles(window.audioFiles);

// Disable bloom
window.bloomStrength = 0;
```

### Controls not working
```javascript
// For FPS controls, click canvas to lock pointer
renderer.domElement.requestPointerLock();

// Check if pointer is locked
console.log('Pointer locked:', document.pointerLockElement);
```

---

## What's Different from Standalone

| Feature | Standalone Visualizer | This Integration |
|---------|----------------------|------------------|
| Data Source | Supabase database | `window.audioFiles` array |
| Audio Player | Built-in WaveSurfer | Your app's global player |
| File Loading | Fetches from DB | Uses existing loaded files |
| Player Bar | Bottom player UI | Uses your app's player |
| Stems UI | Multi-stem player | Removed (use app's stems) |
| Audio Analysis | Creates own analyser | Hooks into your wavesurfer |

---

## Next Steps

1. **Test in isolation** - Load just the galaxy view to verify it works
2. **Integrate gradually** - Add to your view switcher
3. **Customize settings** - Adjust defaults to your preference
4. **Optimize if needed** - Reduce particles for performance

---

## Support

If you need to reference the original behavior:
- Original file: `visualizer_V37_for_extraction.html`
- Line numbers are preserved in comments where applicable
- All original functions are available, just adapted for integration

The galaxy view is now ready to drop into your app while maintaining the exact visual experience you want!