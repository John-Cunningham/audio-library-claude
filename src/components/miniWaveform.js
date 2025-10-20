/**
 * Mini Waveform Component
 *
 * Renders small waveform visualizations in the file list.
 * Each file in the library view shows a mini waveform that:
 * - Displays the audio waveform shape
 * - Allows clicking to load and seek within the file
 * - Manages WaveSurfer instances efficiently
 *
 * Usage:
 *   import * as MiniWaveform from '../components/miniWaveform.js';
 *
 *   MiniWaveform.init(callbacks);
 *   MiniWaveform.renderAll(files);
 *   MiniWaveform.destroy(fileId);
 */

// Track mini waveform instances by file ID
let miniWaveforms = {};

// Callbacks to app.js functions
let loadAudioCallback = null;
let getWavesurferCallback = null;

// Lazy loading queue
let loadQueue = [];
let isLoadingInProgress = false;
const LOAD_DELAY_MS = 300; // 300ms between each waveform load
const TOTAL_LOAD_TIME_MS = 45000; // Spread over 45 seconds

/**
 * Initialize mini waveform system with callbacks
 * @param {Object} callbacks - Callback functions
 * @param {Function} callbacks.loadAudio - Load audio file
 * @param {Function} callbacks.getWavesurfer - Get main wavesurfer instance
 */
export function init(callbacks) {
    loadAudioCallback = callbacks.loadAudio;
    getWavesurferCallback = callbacks.getWavesurfer;
    console.log('[MiniWaveform] Initialized');
}

/**
 * Render mini waveforms for multiple files (lazy loaded)
 * @param {Array} files - Array of file objects to render waveforms for
 */
export function renderAll(files) {
    if (!loadAudioCallback || !getWavesurferCallback) {
        console.warn('[MiniWaveform] Not initialized - call init() first');
        return;
    }

    // Calculate delay to spread loading over TOTAL_LOAD_TIME_MS
    const delayPerFile = files.length > 0 ? Math.min(TOTAL_LOAD_TIME_MS / files.length, LOAD_DELAY_MS) : LOAD_DELAY_MS;

    files.forEach((file, index) => {
        const container = document.getElementById(`miniwave-${file.id}`);
        if (!container) return;

        // If waveform already exists and is still attached, skip
        if (miniWaveforms[file.id] && container.children.length > 0) {
            return;
        }

        // Destroy old instance if it exists but container was recreated
        if (miniWaveforms[file.id]) {
            try {
                miniWaveforms[file.id].destroy();
            } catch (e) {
                // Silently handle destruction errors
            }
        }

        // Create mini wavesurfer instance immediately (but don't load audio yet)
        const miniWave = WaveSurfer.create({
            container: container,
            waveColor: '#444',
            progressColor: '#666',
            height: 32,
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            interact: true,
            hideScrollbar: true,
            normalize: true,
            cursorWidth: 0
        });

        // Suppress abort errors (expected when typing quickly in search)
        miniWave.on('error', (err) => {
            // Silently ignore AbortError - these are expected during rapid re-renders
            if (err.name === 'AbortError') return;
            console.error('[MiniWaveform] Error:', err);
        });

        // Make it interactive - click to play from that position
        miniWave.on('click', (relativeX) => {
            console.log(`[MiniWaveform] Clicked at position: ${(relativeX * 100).toFixed(1)}%`);
            loadAudioCallback(file.id, true); // Autoplay enabled
            setTimeout(() => {
                const wavesurfer = getWavesurferCallback();
                if (wavesurfer) {
                    console.log(`[MiniWaveform] Seeking to: ${(relativeX * 100).toFixed(1)}%`);
                    wavesurfer.seekTo(relativeX);
                    // Play is already started by loadAudio autoplay, just seek to position
                }
            }, 500); // Increased timeout to ensure file is fully loaded
        });

        // Store the instance
        miniWaveforms[file.id] = miniWave;

        // Queue the waveform loading with delay (lazy load)
        const loadDelay = index * delayPerFile;
        setTimeout(() => {
            if (miniWaveforms[file.id]) { // Check if it still exists
                miniWave.load(file.file_url).catch(err => {
                    // Silently ignore AbortError - these are expected during rapid re-renders
                    if (err.name === 'AbortError') return;
                    console.error('[MiniWaveform] Failed to load:', err);
                });
            }
        }, loadDelay);
    });

    console.log(`[MiniWaveform] Queued ${files.length} waveforms for lazy loading (spread over ${(files.length * delayPerFile / 1000).toFixed(1)}s)`);
}

/**
 * Destroy mini waveform for a specific file
 * @param {number} fileId - File ID to destroy waveform for
 */
export function destroy(fileId) {
    if (miniWaveforms[fileId]) {
        try {
            miniWaveforms[fileId].destroy();
        } catch (e) {
            // Silently handle destruction errors
        }
        delete miniWaveforms[fileId];
    }
}

/**
 * Get mini waveform instance for a file (for debugging)
 * @param {number} fileId - File ID
 * @returns {Object|null} WaveSurfer instance or null
 */
export function getInstance(fileId) {
    return miniWaveforms[fileId] || null;
}

/**
 * Destroy all mini waveforms (cleanup)
 */
export function destroyAll() {
    Object.keys(miniWaveforms).forEach(fileId => {
        destroy(parseInt(fileId));
    });
}
