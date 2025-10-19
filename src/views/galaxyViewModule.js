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

    const analysisLoop = () => {
        const wavesurfer = window.wavesurfer;

        // Only analyze if wavesurfer exists and galaxy view is active
        if (wavesurfer && wavesurfer.backend && wavesurfer.backend.analyser && galaxyViewInstance && galaxyViewInstance.isActive) {
            const analyser = wavesurfer.backend.analyser;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);

            galaxyViewInstance.updateAudioData(dataArray);
        }

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
