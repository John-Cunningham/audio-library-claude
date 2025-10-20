// Galaxy View Module - 3D visualization view wrapper
// Wraps the GalaxyView class for ViewManager integration

import { GalaxyView } from './galaxyView.js';

let galaxyViewInstance = null;
let audioAnalysisId = null;

/**
 * Initialize galaxy view
 * @param {Object} data - Initial data
 * @param {Array} data.audioFiles - Array of audio files
 * @param {Object} data.playerStateManager - Player state manager instance
 * @param {Function} data.onFileClick - Callback for file clicks
 */
export async function init(data = {}) {
    console.log('🌌 Galaxy View Module: Initializing...');

    if (!data.audioFiles || data.audioFiles.length === 0) {
        console.warn('⚠️ Galaxy View: No audio files provided');
        return;
    }

    // Create Galaxy View instance if not already created
    if (!galaxyViewInstance) {
        try {
            galaxyViewInstance = new GalaxyView('galaxyViewContainer', {
                playerStateManager: data.playerStateManager,
                onFileClick: data.onFileClick || (() => {}),
                // Optional configuration overrides
                particleSize: 17.5,
                particlesPerCluster: 48,
                bloomStrength: 0,
                colorMode: 'tags',
                xAxisMode: 'bpm',
                yAxisMode: 'key',
                zAxisMode: 'tags'
            });

            console.log('✅ Galaxy View instance created');
        } catch (error) {
            console.error('❌ Failed to create Galaxy View:', error);
            return;
        }
    }

    // Initialize with audio files
    try {
        galaxyViewInstance.init(data.audioFiles);
        console.log('✅ Galaxy View initialized with', data.audioFiles.length, 'files');
    } catch (error) {
        console.error('❌ Failed to initialize Galaxy View:', error);
        return;
    }

    // Show the view
    galaxyViewInstance.show();

    // Expose to window for HTML controls
    window.galaxyViewInstance = galaxyViewInstance;

    // Ensure options menu is visible by default
    const optionsMenu = document.getElementById('galaxyOptionsMenu');
    if (optionsMenu) {
        optionsMenu.style.display = 'block';
        console.log('✅ Galaxy options menu shown');
    }

    // Populate preset dropdown with saved presets
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        galaxyViewInstance.populatePresetDropdown();
    }, 100);

    // Start audio analysis
    startAudioAnalysis();

    console.log('✅ Galaxy View Module: Initialization complete');
}

/**
 * Start audio analysis for galaxy view reactivity
 */
function startAudioAnalysis() {
    // Stop any existing analysis
    if (audioAnalysisId) {
        cancelAnimationFrame(audioAnalysisId);
    }

    let logCounter = 0;
    const LOG_INTERVAL = 300; // Log every 300 frames (~5 seconds at 60fps)

    // Create Web Audio analyser for frequency data
    let audioContext = null;
    let analyser = null;
    let dataArray = null;
    let sourceNode = null;
    let isAudioConnected = false;

    const setupAudioAnalyser = () => {
        const wavesurfer = window.wavesurfer;
        if (!wavesurfer || isAudioConnected) return;

        try {
            // WaveSurfer v7 uses Web Audio API internally
            // Get the media element (audio tag)
            const mediaElement = wavesurfer.media;

            if (!mediaElement || !(mediaElement instanceof HTMLMediaElement)) {
                return;
            }

            // Create audio context
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Create analyser
            if (!analyser) {
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.8;
                dataArray = new Uint8Array(analyser.frequencyBinCount);
            }

            // Create source from media element
            if (!sourceNode) {
                sourceNode = audioContext.createMediaElementSource(mediaElement);
                sourceNode.connect(analyser);
                analyser.connect(audioContext.destination);
                isAudioConnected = true;
                console.log('🎵 ✅ Audio analyser connected successfully!');
            }
        } catch (error) {
            // Silently handle - might fail if already connected
            if (error.name !== 'InvalidStateError') {
                console.warn('🎵 Audio analyser setup warning:', error.message);
            }
        }
    };

    const analysisLoop = () => {
        const wavesurfer = window.wavesurfer;

        // Try to set up audio connection if not connected
        if (!isAudioConnected && wavesurfer) {
            setupAudioAnalyser();
        }

        // Only analyze if analyser exists and audio is playing
        if (isAudioConnected && analyser && dataArray && galaxyViewInstance && galaxyViewInstance.isActive) {
            analyser.getByteFrequencyData(dataArray);
            galaxyViewInstance.updateAudioData(dataArray);

            // Periodic logging for debugging
            if (logCounter % LOG_INTERVAL === 0) {
                const sum = dataArray.reduce((a, b) => a + b, 0);
                const avg = sum / dataArray.length;
                const isPlaying = wavesurfer?.isPlaying?.() || false;
                if (avg > 0 || isPlaying) {
                    console.log(`🎵 Audio reactivity active - Avg frequency: ${avg.toFixed(2)}, Playing: ${isPlaying}`);
                }
            }
        }

        logCounter++;
        audioAnalysisId = requestAnimationFrame(analysisLoop);
    };

    analysisLoop();
    console.log('🎵 Audio analysis started for Galaxy View');
}

/**
 * Update galaxy view with new data
 * @param {Object} data - Update data
 * @param {Array} data.audioFiles - Updated audio files array
 * @param {Object} data.currentFile - Currently playing file
 */
export function update(data = {}) {
    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View: Cannot update - not initialized');
        return;
    }

    // If new audio files provided, recreate particles
    if (data.audioFiles && data.audioFiles.length > 0) {
        console.log('🔄 Galaxy View: Updating with new audio files');
        galaxyViewInstance.audioFiles = data.audioFiles;
        galaxyViewInstance.createParticles();
    }

    // Currently playing file highlighting is handled internally via playerStateManager
    console.log('✅ Galaxy View updated');
}

/**
 * Destroy galaxy view and cleanup
 */
export async function destroy() {
    console.log('🌌 Galaxy View Module: Destroying...');

    if (galaxyViewInstance) {
        galaxyViewInstance.hide();
        console.log('✅ Galaxy View hidden');
    }

    // Stop audio analysis
    if (audioAnalysisId) {
        cancelAnimationFrame(audioAnalysisId);
        audioAnalysisId = null;
        console.log('🎵 Audio analysis stopped');
    }

    // Note: We don't fully destroy the instance to allow faster view switching
    // Resources are only disposed when absolutely necessary
    console.log('✅ Galaxy View Module: Destroyed');
}

/**
 * Update audio data from frequency analyzer
 * @param {Uint8Array} frequencies - Frequency data
 */
export function updateAudioData(frequencies) {
    if (galaxyViewInstance && galaxyViewInstance.isActive) {
        galaxyViewInstance.updateAudioData(frequencies);
    }
}

/**
 * Get current galaxy view instance
 * @returns {GalaxyView|null}
 */
export function getInstance() {
    return galaxyViewInstance;
}

// ============================================================================
// PRESET SYSTEM - Global functions for HTML controls
// ============================================================================

/**
 * Save current configuration as a preset
 * Called by HTML button: onclick="savePreset()"
 */
window.savePreset = function() {
    const nameInput = document.getElementById('presetNameInput');
    const name = nameInput ? nameInput.value.trim() : '';

    if (!name) {
        alert('Please enter a preset name');
        return;
    }

    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        alert('Galaxy View is not active');
        return;
    }

    const success = galaxyViewInstance.savePreset(name);
    if (success) {
        alert(`Preset "${name}" saved successfully!`);

        // Clear input
        if (nameInput) nameInput.value = '';

        // Repopulate dropdown
        galaxyViewInstance.populatePresetDropdown();
    } else {
        alert('Failed to save preset');
    }
};

/**
 * Load a saved preset
 * Called by HTML dropdown: onchange="loadPreset(this.value)"
 */
window.loadPreset = function(name) {
    if (!name) {
        return; // User selected placeholder option
    }

    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        alert('Galaxy View is not active');
        return;
    }

    const success = galaxyViewInstance.loadPreset(name);
    if (success) {
        console.log(`✅ Preset "${name}" loaded`);
        // Note: UI updates would happen here if we had UI controls to sync
    } else {
        alert(`Failed to load preset "${name}"`);
    }
};

/**
 * Delete the currently selected preset
 * Called by HTML button: onclick="deletePreset()"
 */
window.deletePreset = function() {
    const dropdown = document.getElementById('presetSelect');
    if (!dropdown) {
        console.warn('⚠️ Preset dropdown not found');
        return;
    }

    const name = dropdown.value;
    if (!name) {
        alert('Please select a preset to delete');
        return;
    }

    if (!confirm(`Delete preset "${name}"?`)) {
        return;
    }

    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        alert('Galaxy View is not active');
        return;
    }

    const success = galaxyViewInstance.deletePreset(name);
    if (success) {
        alert(`Preset "${name}" deleted`);

        // Repopulate dropdown
        galaxyViewInstance.populatePresetDropdown();

        // Reset dropdown selection
        dropdown.value = '';
    } else {
        alert(`Failed to delete preset "${name}"`);
    }
};

/**
 * Populate preset dropdown
 * Called internally and can be called from HTML if needed
 */
window.populatePresetDropdown = function() {
    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        return;
    }

    galaxyViewInstance.populatePresetDropdown();
};

// ============================================================================
// GALAXY CONTROLS - Global functions for HTML controls
// ============================================================================

/**
 * Update motion speed (orbit speed)
 * Called by HTML slider: oninput="updateMotionSpeed(this.value)"
 */
window.updateMotionSpeed = function(value) {
    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        return;
    }
    galaxyViewInstance.updateMotionSpeed(value);
};

/**
 * Update motion speed directly from number input
 * Called by HTML number input: oninput="updateMotionSpeedDirect(this.value)"
 */
window.updateMotionSpeedDirect = function(value) {
    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        return;
    }
    const numValue = parseFloat(value);
    galaxyViewInstance.config.orbitSpeed = numValue;

    // Update both UI elements
    const textElem = document.getElementById('speedValue');
    const sliderElem = document.getElementById('speedSlider');
    if (textElem) textElem.textContent = (numValue * 100).toFixed(1);
    if (sliderElem) sliderElem.value = numValue;
};

/**
 * Update motion radius (orbit radius)
 * Called by HTML slider: oninput="updateMotionRadius(this.value)"
 */
window.updateMotionRadius = function(value) {
    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        return;
    }
    galaxyViewInstance.updateMotionRadius(value);
};

/**
 * Update cluster spread
 * Called by HTML slider: oninput="updateClusterSpread(this.value)"
 */
window.updateClusterSpread = function(value) {
    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        return;
    }
    galaxyViewInstance.updateClusterSpread(value);
};

/**
 * Update sub-particle count
 * Called by HTML slider: oninput="updateSubParticleCount(this.value)"
 */
window.updateSubParticleCount = function(value) {
    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        return;
    }
    galaxyViewInstance.updateSubParticleCount(value);
};

/**
 * Update bloom strength
 * Called by HTML slider: oninput="updateBloomStrength(this.value)"
 */
window.updateBloomStrength = function(value) {
    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        return;
    }
    galaxyViewInstance.updateBloomStrength(value);
};

/**
 * Update global audio reactivity
 * Called by HTML slider: oninput="updateGlobalReactivity(this.value)"
 */
window.updateGlobalReactivity = function(value) {
    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        return;
    }
    galaxyViewInstance.updateGlobalReactivity(value);
};

/**
 * Toggle audio reactivity on/off
 * Called by HTML button: onclick="toggleAudioReactivity()"
 */
window.toggleAudioReactivity = function() {
    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        return;
    }
    galaxyViewInstance.toggleAudioReactivity();
};

/**
 * Update hover speed (hover slowdown effect)
 * Called by HTML slider: oninput="updateHoverSpeed(this.value)"
 */
window.updateHoverSpeed = function(value) {
    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        return;
    }
    galaxyViewInstance.updateHoverSpeed(value);
};

/**
 * Update hover scale (particle size on hover)
 * Called by HTML slider: oninput="updateHoverScale(this.value)"
 */
window.updateHoverScale = function(value) {
    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        return;
    }
    galaxyViewInstance.updateHoverScale(value);
};

// ============================================================================
// AUDIO REACTIVITY CONTROLS - Global functions for HTML controls
// ============================================================================

/**
 * Update audio strength (pulse strength when playing)
 * Called by HTML slider: oninput="updateAudioStrength(this.value)"
 */
window.updateAudioStrength = function(value) {
    window.audioReactivityStrength = parseFloat(value);
    const elem = document.getElementById('audioStrengthValue');
    if (elem) elem.textContent = value;

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ audioReactivityStrength: window.audioReactivityStrength });
    }
};

/**
 * Update frequency mode (all/bass/mids/highs)
 * Called by HTML dropdown: onchange="updateFrequencyMode(this.value)"
 */
window.updateFrequencyMode = function(value) {
    window.audioFrequencyMode = value;

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ audioFrequencyMode: value });
    }
};

// ============================================================================
// GALAXY DYNAMICS CONTROLS - Global functions for HTML controls
// ============================================================================

/**
 * Update rotation mode (static/collective/spiral/individual)
 * Called by HTML dropdown: onchange="updateRotationMode(this.value)"
 */
window.updateRotationMode = function(value) {
    window.rotationMode = value;

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ rotationMode: value });
    }
};

/**
 * Update rotation axis (x/y/z/all)
 * Called by HTML dropdown: onchange="updateRotationAxis(this.value)"
 */
window.updateRotationAxis = function(value) {
    window.rotationAxis = value;

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ rotationAxis: value });
    }
};

/**
 * Update particle size
 * Called by HTML slider: oninput="updateParticleSize(this.value)"
 */
window.updateParticleSize = function(value) {
    window.particleSize = parseFloat(value);
    const elem = document.getElementById('sizeValue');
    if (elem) elem.textContent = value;

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ particleSize: window.particleSize });
    }
};

/**
 * Update particle brightness
 * Called by HTML slider: oninput="updateParticleBrightness(this.value)"
 */
window.updateParticleBrightness = function(value) {
    // Handle undefined/null values
    if (value === undefined || value === null || value === '') {
        value = window.particleBrightness || 0.8;
    }

    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue)) {
        console.error('❌ Failed to parse brightness value:', value);
        return;
    }

    // Clamp to valid range (0.1 to 10.0)
    const clampedValue = Math.max(0.1, Math.min(10.0, parsedValue));
    window.particleBrightness = clampedValue;

    // Update UI
    const elem = document.getElementById('brightnessValue');
    if (elem) elem.textContent = clampedValue.toFixed(1);

    // Update particle system
    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ particleBrightness: window.particleBrightness });
    }
};

/**
 * Update visibility distance (fog distance)
 * Called by HTML slider: oninput="updateVisibility(this.value)"
 */
window.updateVisibility = function(value) {
    window.visibilityDistance = parseFloat(value);
    const elem = document.getElementById('visibilityValue');
    if (elem) elem.textContent = value;

    // Update fog in scene
    if (window.scene && window.scene.fog) {
        window.scene.fog.far = window.visibilityDistance;
    }

    // Update camera far plane
    if (window.camera) {
        window.camera.far = window.visibilityDistance * 2;
        window.camera.updateProjectionMatrix();
    }
};

/**
 * Update particle shape (circle/square/triangle/star)
 * Called by HTML dropdown: onchange="updateParticleShape(this.value)"
 */
window.updateParticleShape = function(value) {
    window.particleShape = value;

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ particleShape: value });
    }
};

/**
 * Toggle motion on/off
 * Called by HTML button: onclick="toggleMotion()"
 */
window.toggleMotion = function() {
    window.motionEnabled = !window.motionEnabled;
    const btn = document.getElementById('motionToggle');

    if (btn) {
        btn.textContent = `Motion: ${window.motionEnabled ? 'ON' : 'OFF'}`;
        btn.style.background = window.motionEnabled ? 'rgba(102,126,234,0.3)' : 'rgba(255,255,255,0.1)';
    }
};

/**
 * Update X-axis scale
 * Called by HTML slider: oninput="updateXAxisScale(this.value)"
 */
window.updateXAxisScale = function(value) {
    window.xAxisScale = parseFloat(value);
    const elem = document.getElementById('xAxisScaleValue');
    if (elem) elem.textContent = value;

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ xAxisScale: window.xAxisScale });
    }
};

/**
 * Update Y-axis scale
 * Called by HTML slider: oninput="updateYAxisScale(this.value)"
 */
window.updateYAxisScale = function(value) {
    window.yAxisScale = parseFloat(value);
    const elem = document.getElementById('yAxisScaleValue');
    if (elem) elem.textContent = value;

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ yAxisScale: window.yAxisScale });
    }
};

/**
 * Update Z-axis scale
 * Called by HTML slider: oninput="updateZAxisScale(this.value)"
 */
window.updateZAxisScale = function(value) {
    window.zAxisScale = parseFloat(value);
    const elem = document.getElementById('zAxisScaleValue');
    if (elem) elem.textContent = value;

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ zAxisScale: window.zAxisScale });
    }
};

// ============================================================================
// SUB-PARTICLE DYNAMICS CONTROLS - Global functions for HTML controls
// ============================================================================

/**
 * Update sub-particle size
 * Called by HTML slider: oninput="updateSubParticleSize(this.value)"
 */
window.updateSubParticleSize = function(value) {
    window.subParticleScale = parseFloat(value);
    const elem = document.getElementById('subParticleSizeValue');
    if (elem) elem.textContent = value;

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ subParticleScale: window.subParticleScale });
    }
};

/**
 * Update main/sub particle size ratio
 * Called by HTML slider: oninput="updateMainToSubRatio(this.value)"
 */
window.updateMainToSubRatio = function(value) {
    window.mainToSubSizeRatio = parseFloat(value);
    const elem = document.getElementById('mainToSubRatioValue');
    if (elem) elem.textContent = value;

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ mainToSubSizeRatio: window.mainToSubSizeRatio });
    }
};

/**
 * Update sub-particle motion speed
 * Called by HTML slider: oninput="updateSubParticleMotion(this.value)"
 */
window.updateSubParticleMotion = function(value) {
    window.subParticleMotionSpeed = parseFloat(value);
    const elem = document.getElementById('subParticleMotionValue');
    if (elem) elem.textContent = value;

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ subParticleMotionSpeed: window.subParticleMotionSpeed });
    }
};

/**
 * Update sub-particle animation speed
 * Called by HTML slider: oninput="updateSubParticleSpeed(this.value)"
 */
window.updateSubParticleSpeed = function(value) {
    window.subParticleAnimationSpeed = parseFloat(value);
    const elem = document.getElementById('subParticleSpeedValue');
    if (elem) elem.textContent = value;

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ subParticleAnimationSpeed: window.subParticleAnimationSpeed });
    }
};

/**
 * Update motion path (static/circular/spiral/orbit)
 * Called by HTML dropdown: onchange="updateMotionPath(this.value)"
 */
window.updateMotionPath = function(value) {
    window.subParticleMotionPath = value;

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ subParticleMotionPath: value });
    }
};

/**
 * Update sub-particle shape (sphere/cube/plane)
 * Called by HTML dropdown: onchange="updateSubParticleShape(this.value)"
 */
window.updateSubParticleShape = function(value) {
    window.subParticleShape = value;

    // Recreate particles with new shape
    if (galaxyViewInstance && galaxyViewInstance.createParticles) {
        galaxyViewInstance.createParticles();
    }

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ subParticleShape: value });
    }
};

// ============================================================================
// VISUAL GRADIENTS CONTROLS - Global functions for HTML controls
// ============================================================================

/**
 * Update size gradient
 * Called by HTML slider: oninput="updateSizeGradient(this.value)"
 */
window.updateSizeGradient = function(value) {
    window.sizeGradient = parseFloat(value);
    const elem = document.getElementById('sizeGradientValue');
    if (elem) elem.textContent = value;

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ sizeGradient: window.sizeGradient });
    }
};

/**
 * Update density gradient
 * Called by HTML slider: oninput="updateDensityGradient(this.value)"
 */
window.updateDensityGradient = function(value) {
    window.densityGradient = parseFloat(value);
    const elem = document.getElementById('densityGradientValue');
    if (elem) elem.textContent = value;

    // Recreate particles to apply density gradient
    if (galaxyViewInstance && galaxyViewInstance.createParticles) {
        galaxyViewInstance.createParticles();
    }

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ densityGradient: window.densityGradient });
    }
};

// ============================================================================
// CROSSHAIR HOVER CONTROLS - Global functions for HTML controls
// ============================================================================

/**
 * Toggle mouse interaction (crosshair hover effect)
 * Called by HTML button: onclick="toggleMouseInteraction()"
 */
window.toggleMouseInteraction = function() {
    window.mouseInteractionEnabled = !window.mouseInteractionEnabled;
    const btn = document.getElementById('mouseInteractionToggle');

    if (btn) {
        btn.textContent = `Crosshair Hover: ${window.mouseInteractionEnabled ? 'ON' : 'OFF'}`;
        btn.style.background = window.mouseInteractionEnabled ? 'rgba(102,126,234,0.3)' : 'rgba(255,255,255,0.1)';
    }

    if (galaxyViewInstance && galaxyViewInstance.updateParticleSettings) {
        galaxyViewInstance.updateParticleSettings({ mouseInteractionEnabled: window.mouseInteractionEnabled });
    }
};

// ============================================================================
// TOGGLE CONTROLS - Global functions for HTML toggle buttons
// ============================================================================

/**
 * Toggle crosshair visibility
 * Called by HTML button: onclick="toggleCrosshair()"
 */
window.toggleCrosshair = function() {
    // TODO: Implement crosshair toggle in GalaxyView class
    console.log('toggleCrosshair() called - stub function');
};

/**
 * Toggle tooltips visibility
 * Called by HTML button: onclick="toggleTooltips()"
 */
window.toggleTooltips = function() {
    // TODO: Implement tooltips toggle in GalaxyView class
    console.log('toggleTooltips() called - stub function');
};

/**
 * Toggle info window visibility
 * Called by HTML button: onclick="toggleInfoWindow()"
 */
window.toggleInfoWindow = function() {
    // TODO: Implement info window toggle in GalaxyView class
    console.log('toggleInfoWindow() called - stub function');
};

/**
 * Toggle fullscreen mode
 * Called by HTML button: onclick="toggleFullscreen()"
 */
window.toggleFullscreen = function() {
    const container = document.getElementById('galaxyViewContainer');
    if (!container) return;

    if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
            console.error('Error attempting to enable fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
};

/**
 * Toggle move joystick visibility
 * Called by HTML button: onclick="toggleMoveJoystick()"
 */
window.toggleMoveJoystick = function() {
    // TODO: Implement move joystick toggle in GalaxyView class
    console.log('toggleMoveJoystick() called - stub function');
};

/**
 * Toggle look joystick visibility
 * Called by HTML button: onclick="toggleLookJoystick()"
 */
window.toggleLookJoystick = function() {
    // TODO: Implement look joystick toggle in GalaxyView class
    console.log('toggleLookJoystick() called - stub function');
};

/**
 * Toggle play button visibility
 * Called by HTML button: onclick="togglePlayButton()"
 */
window.togglePlayButton = function() {
    // TODO: Implement play button toggle in GalaxyView class
    console.log('togglePlayButton() called - stub function');
};

// ============================================================================
// FILE BROWSER CONTROLS - Global functions for HTML controls
// ============================================================================

/**
 * Toggle galaxy database source (audio files vs stems)
 * Called by HTML checkbox: onclick="toggleGalaxyDbSource('audioFiles', event)"
 */
window.toggleGalaxyDbSource = function(source, event) {
    if (event) event.stopPropagation();
    // TODO: Implement database source toggle in GalaxyView class
    console.log(`toggleGalaxyDbSource(${source}) called - stub function`);
};

/**
 * Show all categories
 * Called by HTML button: onclick="showAllCategories()"
 */
window.showAllCategories = function() {
    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        return;
    }
    // TODO: Implement show all categories in GalaxyView class
    console.log('showAllCategories() called - stub function');
};

/**
 * Hide all categories
 * Called by HTML button: onclick="hideAllCategories()"
 */
window.hideAllCategories = function() {
    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        return;
    }
    // TODO: Implement hide all categories in GalaxyView class
    console.log('hideAllCategories() called - stub function');
};

// ============================================================================
// VISUALIZATION MODE CONTROLS - Global functions for HTML dropdowns
// ============================================================================

/**
 * Recreate particles (called when visualization modes change)
 * Called by HTML selects: onchange="recreateParticles()"
 */
window.recreateParticles = function() {
    if (!galaxyViewInstance) {
        console.warn('⚠️ Galaxy View not initialized');
        return;
    }

    // Read current visualization mode values from dropdowns
    const colorMode = document.getElementById('galaxyColorMode')?.value;
    const xAxisMode = document.getElementById('galaxyXAxisMode')?.value;
    const yAxisMode = document.getElementById('galaxyYAxisMode')?.value;
    const zAxisMode = document.getElementById('galaxyZAxisMode')?.value;

    // Update config
    if (colorMode) galaxyViewInstance.config.colorMode = colorMode;
    if (xAxisMode) galaxyViewInstance.config.xAxisMode = xAxisMode;
    if (yAxisMode) galaxyViewInstance.config.yAxisMode = yAxisMode;
    if (zAxisMode) galaxyViewInstance.config.zAxisMode = zAxisMode;

    // Recreate particles with new modes
    galaxyViewInstance.createParticles();
    console.log('✅ Particles recreated with new visualization modes');
};

// ============================================================================
// OTHER CONTROLS - Global functions for miscellaneous HTML controls
// ============================================================================

/**
 * Update stem offset
 * Called by HTML slider: oninput="updateStemOffset(this.value)"
 */
window.updateStemOffset = function(value) {
    // TODO: Implement stem offset in GalaxyView class
    const elem = document.getElementById('stemOffsetValue');
    if (elem) elem.textContent = value;
    console.log(`updateStemOffset(${value}) called - stub function`);
};

/**
 * Update brightness (alias for updateParticleBrightness)
 * Called by HTML slider: oninput="updateBrightness(this.value)"
 */
window.updateBrightness = function(value) {
    // Alias to updateParticleBrightness
    window.updateParticleBrightness(value);
};
