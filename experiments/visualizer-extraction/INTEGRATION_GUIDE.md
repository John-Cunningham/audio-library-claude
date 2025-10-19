# 🌌 Galaxy Visualizer Integration Guide

## Overview
This guide shows how to integrate the extracted Galaxy Visualizer components into your existing audio-library-claude app. The visualizer has been modularized into 7 independent components that can be integrated incrementally.

---

## 📦 Extracted Components

1. **UTILITIES.js** - Core helper functions (no dependencies)
2. **PARTICLE_SYSTEM.js** - 3D particle creation and management
3. **AUDIO_ANALYZER.js** - WaveSurfer audio analysis connection
4. **ANIMATION_SYSTEM.js** - Particle motion and reactivity
5. **OPTIONS_MENU.html** - UI controls (optional)
6. **VISUAL_EFFECTS.js** - Bloom/glow post-processing (optional)
7. **INTEGRATION_EXAMPLE.html** - Complete working example

---

## 🎯 Integration Steps

### Step 1: Add Required Dependencies

Add these Three.js scripts to your `index.html` before your main scripts:

```html
<!-- Three.js core -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>

<!-- Post-processing (optional, for bloom effect) -->
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js"></script>
```

### Step 2: Integrate Into Galaxy View

Your existing `src/views/galaxyView.js` already has basic Three.js setup. Enhance it with the extracted modules:

```javascript
// src/views/galaxyViewEnhanced.js

import { seededRandom, createParticleTexture, ... } from '../utils/galaxyUtils.js';
import { createParticles, updateBrightness } from '../components/galaxyParticles.js';
import { setupAudioAnalysis, updateAudioAmplitude } from '../components/galaxyAudio.js';
import { updateParticleAnimation, setMotionMode } from '../components/galaxyAnimation.js';
import { initVisualEffects, renderWithEffects } from '../components/galaxyEffects.js';

export function renderGalaxyView(container) {
    // Your existing initialization...
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(...);
    const renderer = new THREE.WebGLRenderer(...);

    // === ENHANCEMENT 1: Visual Effects ===
    const composer = initVisualEffects(scene, camera, renderer);

    // === ENHANCEMENT 2: Advanced Particles ===
    // Use window.audioFiles from your app
    const config = {
        colorMode: 'tags',
        xMode: 'bpm',
        yMode: 'key',
        zMode: 'tags'
    };
    createParticles(window.audioFiles, scene, config);

    // === ENHANCEMENT 3: Audio Analysis ===
    // Connect to global wavesurfer when file loads
    if (window.wavesurfer) {
        window.wavesurfer.once('ready', () => {
            setupAudioAnalysis(window.wavesurfer);
        });
    }

    // === ENHANCEMENT 4: Animation Loop ===
    const clock = new THREE.Clock();

    function animate() {
        const deltaTime = clock.getDelta();

        // Update audio analysis
        if (window.wavesurfer && window.wavesurfer.isPlaying()) {
            updateAudioAmplitude();
        }

        // Update particle animation
        updateParticleAnimation(
            deltaTime,
            camera,
            particleSystem,
            particles,
            window.wavesurfer && window.wavesurfer.isPlaying()
        );

        // Render with effects
        renderWithEffects(scene, camera, renderer);

        requestAnimationFrame(animate);
    }

    animate();
}
```

### Step 3: Module Integration Pattern

Create these module files in your project structure:

```
src/
  components/
    galaxyParticles.js      # From PARTICLE_SYSTEM.js
    galaxyAnimation.js      # From ANIMATION_SYSTEM.js
    galaxyAudio.js          # From AUDIO_ANALYZER.js
    galaxyEffects.js        # From VISUAL_EFFECTS.js
    galaxyOptionsMenu.js    # UI controls (optional)
  utils/
    galaxyUtils.js          # From UTILITIES.js
  views/
    galaxyView.js           # Your existing view (enhanced)
```

### Step 4: Connect to Existing Systems

#### A. Audio Files Integration
```javascript
// Your existing file loading
window.loadAudioFiles = async function() {
    // ... load files ...
    window.audioFiles = files;

    // If in galaxy view, update particles
    if (currentView === 'galaxy' && typeof createParticles === 'function') {
        createParticles(window.audioFiles, scene, getCurrentConfig());
    }
};
```

#### B. WaveSurfer Integration
```javascript
// In your existing player setup (app.js around line 1844)
window.loadAudio = function(file) {
    // Your existing wavesurfer setup...

    wavesurfer.once('ready', () => {
        // Add audio analysis for galaxy view
        if (currentView === 'galaxy' && typeof setupAudioAnalysis === 'function') {
            setupAudioAnalysis(wavesurfer);
        }
    });
};
```

#### C. View Switching
```javascript
// In your view switcher
window.switchView = function(viewName) {
    if (viewName === 'galaxy') {
        // Clean up previous audio analysis if switching views
        if (typeof cleanupAudioAnalysis === 'function') {
            cleanupAudioAnalysis();
        }

        renderGalaxyView(container);

        // Reconnect audio if playing
        if (window.wavesurfer && window.wavesurfer.isPlaying()) {
            setupAudioAnalysis(window.wavesurfer);
        }
    }
};
```

### Step 5: Add Controls (Optional)

Include the options menu for user control:

```html
<!-- In your HTML -->
<div id="galaxyControls"></div>

<script>
// Load the OPTIONS_MENU.html content
fetch('experiments/visualizer-extraction/OPTIONS_MENU.html')
    .then(response => response.text())
    .then(html => {
        document.getElementById('galaxyControls').innerHTML = html;
    });
</script>
```

---

## 🔧 Configuration Options

### Global Variables to Define

Add these to your main app or galaxy view:

```javascript
// === Particle System Config ===
let particleSystem = null;
let particles = [];
let particlesPerCluster = 48;
let particleSize = 5;
let subParticleScale = 0.3;
let clusterRadius = 10;
let particleShape = 'circle';
let particleBrightness = 0.8;

// === Audio Config ===
let audioContext = null;
let analyser = null;
let audioDataArray = null;
let currentAudioAmplitude = 0;
let bassAmplitude = 0;
let midsAmplitude = 0;
let highsAmplitude = 0;

// === Animation Config ===
let animationTime = 0;
let motionEnabled = true;
let motionMode = 'collective';
let orbitSpeed = 0.0000015;
let orbitRadius = 80;
let audioReactivityEnabled = true;
let audioReactivityStrength = 40;

// === Visual Effects Config ===
let bloomStrength = 0.8;
let bloomRadius = 0.4;
let bloomThreshold = 0.6;
```

---

## 🎮 Usage Examples

### Basic Integration (Minimal)
```javascript
// Just particles, no effects
createParticles(audioFiles, scene, { colorMode: 'tags' });
```

### With Audio Reactivity
```javascript
// Setup audio analysis
wavesurfer.once('ready', () => {
    setupAudioAnalysis(wavesurfer);
});

// In animation loop
updateAudioAmplitude();
updateParticleAnimation(deltaTime, camera, particleSystem, particles, true);
```

### Full Featured
```javascript
// All features enabled
const composer = initVisualEffects(scene, camera, renderer);
createParticles(audioFiles, scene, config);
setupAudioAnalysis(wavesurfer);

// Animation loop
function animate() {
    updateAudioAmplitude();
    updateParticleAnimation(...);
    composer.render(); // Or renderWithEffects()
}
```

---

## 🚀 Performance Optimization

### Mobile Optimization
```javascript
// Detect mobile and reduce quality
const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

if (isMobile) {
    particlesPerCluster = 24;  // Reduce particles
    bloomStrength = 0;         // Disable bloom
    maxParticleCount = 10000;  // Set limit
}
```

### Dynamic LOD (Level of Detail)
```javascript
// Reduce particles for distant clusters
const distanceToCamera = camera.position.distanceTo(cluster.centerPosition);
if (distanceToCamera > 500) {
    // Skip animation for distant clusters
    return;
}
```

### Frame Rate Throttling
```javascript
let lastUpdate = 0;
const targetFPS = 30;
const frameInterval = 1000 / targetFPS;

function animate(currentTime) {
    if (currentTime - lastUpdate > frameInterval) {
        // Update logic here
        lastUpdate = currentTime;
    }
    requestAnimationFrame(animate);
}
```

---

## 🐛 Troubleshooting

### Issue: No particles visible
```javascript
// Check:
console.log('Files loaded:', window.audioFiles?.length);
console.log('Particles created:', particles.length);
console.log('ParticleSystem added:', scene.children.includes(particleSystem));
```

### Issue: No audio reactivity
```javascript
// Debug audio analysis:
console.log('Analyser:', analyser);
console.log('Audio amplitude:', currentAudioAmplitude);
console.log('Context state:', audioContext?.state);

// Force resume audio context
if (audioContext?.state === 'suspended') {
    audioContext.resume();
}
```

### Issue: Poor performance
```javascript
// Profile and optimize:
console.log('Total particles:', particles.length * particlesPerCluster);
console.log('Draw calls:', renderer.info.render.calls);

// Reduce quality:
particlesPerCluster = Math.floor(particlesPerCluster / 2);
bloomEnabled = false;
```

---

## 📝 Checklist

- [ ] Three.js dependencies added to HTML
- [ ] Utility functions integrated
- [ ] Particle system creating clusters
- [ ] Audio analyzer connected to WaveSurfer
- [ ] Animation loop updating particles
- [ ] Visual effects (bloom) working (optional)
- [ ] Options menu integrated (optional)
- [ ] Performance acceptable on target devices

---

## 🎯 Next Steps

1. **Start Simple**: Begin with just particles (no audio/effects)
2. **Add Audio**: Connect analyzer and test reactivity
3. **Add Effects**: Enable bloom for polish (optional)
4. **Add Controls**: Integrate options menu (optional)
5. **Optimize**: Profile and adjust for performance

---

## 📚 Additional Resources

- Three.js docs: https://threejs.org/docs/
- WaveSurfer docs: https://wavesurfer-js.org/docs/
- Performance tips: https://discoverthreejs.com/tips-and-tricks/

---

## 💡 Tips

1. **Test incrementally** - Add one module at a time
2. **Use existing data** - Leverage your current audioFiles array
3. **Preserve existing functionality** - Don't break current features
4. **Monitor performance** - Use Chrome DevTools Performance tab
5. **Provide fallbacks** - Gracefully degrade on low-end devices

---

## 🤝 Support

For issues or questions about integration:
1. Check the FUNCTION_INVENTORY.md for detailed function docs
2. Review the individual module files for usage examples
3. Test with the INTEGRATION_EXAMPLE.html standalone demo
4. Use browser console for debugging

Good luck with your integration! 🚀