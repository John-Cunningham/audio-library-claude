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

    const analysisLoop = () => {
        const wavesurfer = window.wavesurfer;

        // Only analyze if wavesurfer exists and galaxy view is active
        if (wavesurfer && wavesurfer.backend && wavesurfer.backend.analyser && galaxyViewInstance && galaxyViewInstance.isActive) {
            const analyser = wavesurfer.backend.analyser;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);

            galaxyViewInstance.updateAudioData(dataArray);

            // Periodic logging for debugging
            if (logCounter % LOG_INTERVAL === 0) {
                const sum = dataArray.reduce((a, b) => a + b, 0);
                const avg = sum / dataArray.length;
                console.log(`🎵 Audio reactivity active - Avg frequency: ${avg.toFixed(2)}, Playing: ${wavesurfer.isPlaying?.() || false}`);
            }
        } else {
            // Log why analysis isn't working (only every LOG_INTERVAL frames to avoid spam)
            if (logCounter % LOG_INTERVAL === 0) {
                console.log('⚠️ Audio analysis paused -', {
                    wavesurfer: !!wavesurfer,
                    backend: !!(wavesurfer?.backend),
                    analyser: !!(wavesurfer?.backend?.analyser),
                    galaxyView: !!galaxyViewInstance,
                    isActive: galaxyViewInstance?.isActive
                });
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
