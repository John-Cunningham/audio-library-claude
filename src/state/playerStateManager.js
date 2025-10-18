/**
 * Player State Manager
 *
 * Centralized state management for parent player state
 * Enables multi-view architecture (Library, Galaxy, Sphere)
 *
 * Created: 2025-10-18
 * Pattern: Hybrid state (local cache + centralized state)
 */

// Default state
const state = {
    // Current file
    currentFileId: null,

    // Playback controls
    currentRate: 1,
    isShuffling: false,
    userPaused: false,

    // Volume/Mute
    isMuted: false,
    volumeBeforeMute: 100,

    // Markers
    markersEnabled: true,
    markerFrequency: 'bar', // 'bar8', 'bar4', 'bar2', 'bar', 'halfbar', 'beat'
    barStartOffset: 0,
    currentMarkers: [],

    // Old-style loop (deprecated, kept for backwards compatibility)
    isLooping: false
};

// ============================================================================
// GETTERS
// ============================================================================

/**
 * Get current file ID
 * @returns {string|null}
 */
export function getCurrentFileId() {
    return state.currentFileId;
}

/**
 * Get current playback rate
 * @returns {number}
 */
export function getCurrentRate() {
    return state.currentRate;
}

/**
 * Get shuffle state
 * @returns {boolean}
 */
export function getIsShuffling() {
    return state.isShuffling;
}

/**
 * Get user paused state
 * @returns {boolean}
 */
export function getUserPaused() {
    return state.userPaused;
}

/**
 * Get mute state
 * @returns {boolean}
 */
export function getIsMuted() {
    return state.isMuted;
}

/**
 * Get volume before mute
 * @returns {number}
 */
export function getVolumeBeforeMute() {
    return state.volumeBeforeMute;
}

/**
 * Get markers enabled state
 * @returns {boolean}
 */
export function getMarkersEnabled() {
    return state.markersEnabled;
}

/**
 * Get marker frequency
 * @returns {string}
 */
export function getMarkerFrequency() {
    return state.markerFrequency;
}

/**
 * Get bar start offset
 * @returns {number}
 */
export function getBarStartOffset() {
    return state.barStartOffset;
}

/**
 * Get current markers array
 * @returns {Array}
 */
export function getCurrentMarkers() {
    return state.currentMarkers;
}

/**
 * Get old-style looping state
 * @returns {boolean}
 */
export function getIsLooping() {
    return state.isLooping;
}

// ============================================================================
// SETTERS
// ============================================================================

/**
 * Set current file ID
 * @param {string|null} value
 */
export function setCurrentFileId(value) {
    state.currentFileId = value;
}

/**
 * Set current playback rate
 * @param {number} value
 */
export function setCurrentRate(value) {
    state.currentRate = value;
}

/**
 * Set shuffle state
 * @param {boolean} value
 */
export function setIsShuffling(value) {
    state.isShuffling = value;
}

/**
 * Set user paused state
 * @param {boolean} value
 */
export function setUserPaused(value) {
    state.userPaused = value;
}

/**
 * Set mute state
 * @param {boolean} value
 */
export function setIsMuted(value) {
    state.isMuted = value;
}

/**
 * Set volume before mute
 * @param {number} value
 */
export function setVolumeBeforeMute(value) {
    state.volumeBeforeMute = value;
}

/**
 * Set markers enabled
 * @param {boolean} value
 */
export function setMarkersEnabled(value) {
    state.markersEnabled = value;
}

/**
 * Set marker frequency
 * @param {string} value
 */
export function setMarkerFrequency(value) {
    state.markerFrequency = value;
}

/**
 * Set bar start offset
 * @param {number} value
 */
export function setBarStartOffset(value) {
    state.barStartOffset = value;
}

/**
 * Set current markers
 * @param {Array} value
 */
export function setCurrentMarkers(value) {
    state.currentMarkers = value;
}

/**
 * Set old-style looping state
 * @param {boolean} value
 */
export function setIsLooping(value) {
    state.isLooping = value;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Get complete playback state
 * @returns {object}
 */
export function getPlaybackState() {
    return {
        currentFileId: state.currentFileId,
        currentRate: state.currentRate,
        isShuffling: state.isShuffling,
        userPaused: state.userPaused,
        isLooping: state.isLooping
    };
}

/**
 * Get complete volume state
 * @returns {object}
 */
export function getVolumeState() {
    return {
        isMuted: state.isMuted,
        volumeBeforeMute: state.volumeBeforeMute
    };
}

/**
 * Get complete marker state
 * @returns {object}
 */
export function getMarkerState() {
    return {
        markersEnabled: state.markersEnabled,
        markerFrequency: state.markerFrequency,
        barStartOffset: state.barStartOffset,
        currentMarkers: [...state.currentMarkers] // Return copy
    };
}

/**
 * Reset all player state to defaults
 */
export function reset() {
    state.currentFileId = null;
    state.currentRate = 1;
    state.isShuffling = false;
    state.userPaused = false;
    state.isMuted = false;
    state.volumeBeforeMute = 100;
    state.markersEnabled = true;
    state.markerFrequency = 'bar';
    state.barStartOffset = 0;
    state.currentMarkers = [];
    state.isLooping = false;
}

/**
 * Reset only playback state (keep markers, volume)
 */
export function resetPlayback() {
    state.currentFileId = null;
    state.currentRate = 1;
    state.isShuffling = false;
    state.userPaused = false;
    state.isLooping = false;
}

// ============================================================================
// DEBUG
// ============================================================================

/**
 * Print current player state to console
 */
export function debugPrintState() {
    console.group('🎵 Player State Manager');
    console.log('Current File:', state.currentFileId);
    console.log('Rate:', state.currentRate + 'x');
    console.log('Shuffle:', state.isShuffling);
    console.log('User Paused:', state.userPaused);
    console.log('Muted:', state.isMuted, `(restore to ${state.volumeBeforeMute}%)`);
    console.log('Markers:', state.markersEnabled, `(${state.markerFrequency})`);
    console.log('Bar Offset:', state.barStartOffset);
    console.log('Marker Count:', state.currentMarkers.length);
    console.log('Old Loop Mode:', state.isLooping);
    console.groupEnd();
}
