/**
 * Stem State Manager
 *
 * Centralized state management for multi-stem player system
 * Encapsulates all stem-related state that was previously scattered across app.js
 *
 * Purpose: Enable multi-view architecture (Library, Galaxy, Sphere)
 * - Stem state persists across view switches
 * - Clear API for state access
 * - Single source of truth for stem system
 *
 * Created: 2025-10-18
 * Part of: Multi-view architecture preparation
 */

/**
 * Create default state for a single stem
 * Used to initialize state for vocals, drums, bass, other
 */
function createDefaultStemState() {
    return {
        // Rate controls
        independentRate: 1.0,           // User's rate multiplier (1.0 = normal)
        rateLocked: true,                // If true, follows parent rate; if false, independent
        playbackIndependent: true,       // If true, stem is active (plays when parent plays)

        // Loop controls
        loopState: {
            enabled: false,
            start: null,
            end: null
        },
        cycleMode: false,                // Cycle mode active (edit + play loop)
        nextClickSets: 'start',          // Next click sets 'start' or 'end'
        seekOnClick: 'off',              // 'off', 'seek', or 'clock'
        immediateJump: 'off',            // 'off', 'on', or 'clock'
        loopControlsExpanded: false,     // UI: Loop controls visible
        loopFadesEnabled: false,         // Apply fades at loop boundaries
        fadeTime: 15,                    // Fade duration in milliseconds
        preserveLoop: false,             // Preserve loop points on file change
        preservedLoopStartBar: null,     // Bar number for preserved loop start
        preservedLoopEndBar: null,       // Bar number for preserved loop end

        // Markers
        markersEnabled: true,            // Show bar markers on waveform
        markerFrequency: 'bar',          // 'bar8', 'bar4', 'bar2', 'bar', 'halfbar', 'beat'
        currentMarkers: [],              // Array of marker time positions
        barStartOffset: 0,               // Offset for "Shift Start" feature

        // Metronome
        metronomeEnabled: false,         // Metronome active for this stem
        metronomeSound: 'click',         // 'click', 'beep', 'wood', 'cowbell'

        // BPM lock
        bpmLock: false,                  // Lock BPM across file changes

        // Action recording
        recordingActions: false,         // Recording actions for this stem
        recordedActions: []              // Array of recorded action objects
    };
}

/**
 * Global stem system state
 */
const state = {
    // UI state
    expanded: false,                     // Multi-stem player expanded (visible)

    // WaveSurfer instances
    playerWavesurfers: {},               // { vocals: WaveSurfer, drums: WaveSurfer, ... }
    playerComponents: {},                // { vocals: PlayerBarComponent, drums: PlayerBarComponent, ... }

    // Loading state
    readyCount: 0,                       // Number of stems loaded
    autoPlayOnReady: false,              // Auto-play when all stems ready
    preloaded: false,                    // Stems pre-loaded for current file

    // Parent file info
    currentParentFileBPM: null,          // Parent file's BPM (for rate calculations)

    // Per-stem state (vocals, drums, bass, other)
    stems: {
        vocals: createDefaultStemState(),
        drums: createDefaultStemState(),
        bass: createDefaultStemState(),
        other: createDefaultStemState()
    }
};

// Expose to window for PlayerBarComponent access (temporary - until full integration)
window.stemPlaybackIndependent = {
    vocals: true,
    drums: true,
    bass: true,
    other: true
};
window.stemLoopStates = {
    vocals: { enabled: false, start: null, end: null },
    drums: { enabled: false, start: null, end: null },
    bass: { enabled: false, start: null, end: null },
    other: { enabled: false, start: null, end: null }
};
window.stemCycleModes = {
    vocals: false,
    drums: false,
    bass: false,
    other: false
};
window.stemNextClickSets = {
    vocals: 'start',
    drums: 'start',
    bass: 'start',
    other: 'start'
};

// ============================================
// PUBLIC API - Global State
// ============================================

/**
 * Get entire state object (use sparingly - prefer specific getters)
 */
export function getState() {
    return state;
}

/**
 * Check if multi-stem player is expanded
 */
export function isExpanded() {
    return state.expanded;
}

/**
 * Set multi-stem player expanded state
 */
export function setExpanded(value) {
    state.expanded = value;
}

/**
 * Get WaveSurfer instances for all stems
 */
export function getPlayerWavesurfers() {
    return state.playerWavesurfers;
}

/**
 * Set WaveSurfer instances (used during initialization)
 */
export function setPlayerWavesurfers(wavesurfers) {
    state.playerWavesurfers = wavesurfers;
}

/**
 * Get PlayerBarComponent instances for all stems
 */
export function getPlayerComponents() {
    return state.playerComponents;
}

/**
 * Set PlayerBarComponent instances (used during initialization)
 */
export function setPlayerComponents(components) {
    state.playerComponents = components;
}

/**
 * Get ready count (number of stems loaded)
 */
export function getReadyCount() {
    return state.readyCount;
}

/**
 * Set ready count
 */
export function setReadyCount(count) {
    state.readyCount = count;
}

/**
 * Increment ready count (returns new count)
 */
export function incrementReadyCount() {
    state.readyCount++;
    return state.readyCount;
}

/**
 * Get auto-play on ready flag
 */
export function getAutoPlayOnReady() {
    return state.autoPlayOnReady;
}

/**
 * Set auto-play on ready flag
 */
export function setAutoPlayOnReady(value) {
    state.autoPlayOnReady = value;
}

/**
 * Get preloaded flag
 */
export function isPreloaded() {
    return state.preloaded;
}

/**
 * Set preloaded flag
 */
export function setPreloaded(value) {
    state.preloaded = value;
}

/**
 * Get parent file BPM
 */
export function getCurrentParentFileBPM() {
    return state.currentParentFileBPM;
}

/**
 * Set parent file BPM
 */
export function setCurrentParentFileBPM(bpm) {
    state.currentParentFileBPM = bpm;
    window.currentParentFileBPM = bpm; // Expose to window for PlayerBarComponent
}

// ============================================
// PUBLIC API - Per-Stem State
// ============================================

/**
 * Get all state for a specific stem
 * @param {string} stemType - 'vocals', 'drums', 'bass', or 'other'
 */
export function getStem(stemType) {
    return state.stems[stemType];
}

/**
 * Get specific property from stem state
 * @param {string} stemType - 'vocals', 'drums', 'bass', or 'other'
 * @param {string} key - Property name (e.g., 'independentRate', 'loopState')
 */
export function getStemState(stemType, key) {
    return state.stems[stemType][key];
}

/**
 * Set specific property in stem state
 * @param {string} stemType - 'vocals', 'drums', 'bass', or 'other'
 * @param {string} key - Property name
 * @param {*} value - New value
 */
export function setStemState(stemType, key, value) {
    state.stems[stemType][key] = value;

    // Sync to window object for legacy compatibility
    syncToWindow(stemType, key, value);
}

/**
 * Update multiple properties in stem state at once
 * @param {string} stemType - 'vocals', 'drums', 'bass', or 'other'
 * @param {Object} updates - Object with key-value pairs to update
 */
export function updateStemState(stemType, updates) {
    Object.keys(updates).forEach(key => {
        state.stems[stemType][key] = updates[key];
        syncToWindow(stemType, key, updates[key]);
    });
}

// ============================================
// LEGACY COMPATIBILITY - Window Object Sync
// ============================================

/**
 * Sync specific state changes to window object
 * Required for PlayerBarComponent until full integration
 */
function syncToWindow(stemType, key, value) {
    // Sync playbackIndependent
    if (key === 'playbackIndependent') {
        window.stemPlaybackIndependent[stemType] = value;
    }

    // Sync loopState
    if (key === 'loopState') {
        window.stemLoopStates[stemType] = value;
    }

    // Sync cycleMode
    if (key === 'cycleMode') {
        window.stemCycleModes[stemType] = value;
    }

    // Sync nextClickSets
    if (key === 'nextClickSets') {
        window.stemNextClickSets[stemType] = value;
    }
}

/**
 * Sync all state to window objects (call once during initialization)
 */
export function syncAllToWindow() {
    const stemTypes = ['vocals', 'drums', 'bass', 'other'];
    stemTypes.forEach(stemType => {
        window.stemPlaybackIndependent[stemType] = state.stems[stemType].playbackIndependent;
        window.stemLoopStates[stemType] = state.stems[stemType].loopState;
        window.stemCycleModes[stemType] = state.stems[stemType].cycleMode;
        window.stemNextClickSets[stemType] = state.stems[stemType].nextClickSets;
    });
}

// ============================================
// CONVENIENCE GETTERS - Common Patterns
// ============================================

/**
 * Get all stem types
 */
export function getStemTypes() {
    return ['vocals', 'drums', 'bass', 'other'];
}

/**
 * Get WaveSurfer for specific stem
 */
export function getStemWavesurfer(stemType) {
    return state.playerWavesurfers[stemType];
}

/**
 * Get PlayerBarComponent for specific stem
 */
export function getStemComponent(stemType) {
    return state.playerComponents[stemType];
}

/**
 * Check if stem is active (playbackIndependent = true)
 */
export function isStemActive(stemType) {
    return state.stems[stemType].playbackIndependent;
}

/**
 * Check if stem has loop enabled
 */
export function isStemLooping(stemType) {
    return state.stems[stemType].loopState.enabled;
}

/**
 * Check if stem follows parent (not looping, is active)
 */
export function doesStemFollowParent(stemType) {
    const stem = state.stems[stemType];
    return stem.playbackIndependent && !stem.loopState.enabled;
}

// ============================================
// RESET & CLEANUP
// ============================================

/**
 * Reset all state to defaults
 * Call when destroying stems or loading new file
 */
export function reset() {
    state.expanded = false;
    state.playerWavesurfers = {};
    state.playerComponents = {};
    state.readyCount = 0;
    state.autoPlayOnReady = false;
    state.preloaded = false;
    state.currentParentFileBPM = null;

    // Reset all stems to defaults
    const stemTypes = getStemTypes();
    stemTypes.forEach(type => {
        state.stems[type] = createDefaultStemState();
    });

    // Sync to window
    syncAllToWindow();
}

/**
 * Reset only per-stem state (keep wavesurfers/components)
 * Useful when switching files but keeping stem player loaded
 */
export function resetStemControls() {
    const stemTypes = getStemTypes();
    stemTypes.forEach(type => {
        state.stems[type] = createDefaultStemState();
    });
    syncAllToWindow();
}

// ============================================
// DEBUG HELPERS
// ============================================

/**
 * Log current state to console (for debugging)
 */
export function debugPrintState() {
    console.group('🎵 Stem State Manager');
    console.log('Expanded:', state.expanded);
    console.log('Ready Count:', state.readyCount);
    console.log('Preloaded:', state.preloaded);
    console.log('Parent BPM:', state.currentParentFileBPM);
    console.log('Wavesurfers:', Object.keys(state.playerWavesurfers));
    console.log('Components:', Object.keys(state.playerComponents));
    console.group('Per-Stem State');
    getStemTypes().forEach(type => {
        console.group(type);
        console.log('Rate:', state.stems[type].independentRate, '(locked:', state.stems[type].rateLocked + ')');
        console.log('Active:', state.stems[type].playbackIndependent);
        console.log('Loop:', state.stems[type].loopState);
        console.log('Markers:', state.stems[type].markersEnabled, '(' + state.stems[type].markerFrequency + ')');
        console.groupEnd();
    });
    console.groupEnd();
    console.groupEnd();
}
