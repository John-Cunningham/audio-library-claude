/**
 * Loop State Manager
 *
 * Centralized state management for loop/cycle mode system
 * Enables multi-view architecture (Library, Galaxy, Sphere)
 *
 * Created: 2025-10-18
 * Pattern: Hybrid state (local cache + centralized state)
 */

// Default state
const state = {
    // Core loop state
    loopStart: null,
    loopEnd: null,
    cycleMode: false,
    nextClickSets: 'start',

    // Loop modes
    immediateJump: 'off',
    pendingJumpTarget: null,
    seekOnClick: 'off',

    // UI state
    loopControlsExpanded: false,

    // Loop options
    loopFadesEnabled: false,
    fadeTime: 0.015,

    // Preservation
    preserveLoopOnFileChange: true,
    preservedLoopStartBar: null,
    preservedLoopEndBar: null,
    preservedCycleMode: false,
    preservedPlaybackPositionInLoop: null,

    // BPM lock
    bpmLockEnabled: false,
    lockedBPM: null
};

// ============================================================================
// GETTERS
// ============================================================================

/**
 * Get loop start time in seconds
 * @returns {number|null}
 */
export function getLoopStart() {
    return state.loopStart;
}

/**
 * Get loop end time in seconds
 * @returns {number|null}
 */
export function getLoopEnd() {
    return state.loopEnd;
}

/**
 * Get cycle mode state
 * @returns {boolean}
 */
export function getCycleMode() {
    return state.cycleMode;
}

/**
 * Get next click sets value ('start' or 'end')
 * @returns {string}
 */
export function getNextClickSets() {
    return state.nextClickSets;
}

/**
 * Get immediate jump mode ('off', 'on', or 'clock')
 * @returns {string}
 */
export function getImmediateJump() {
    return state.immediateJump;
}

/**
 * Get pending jump target
 * @returns {number|null}
 */
export function getPendingJumpTarget() {
    return state.pendingJumpTarget;
}

/**
 * Get seek on click mode ('off', 'on', or 'quantized')
 * @returns {string}
 */
export function getSeekOnClick() {
    return state.seekOnClick;
}

/**
 * Get loop controls expanded state
 * @returns {boolean}
 */
export function getLoopControlsExpanded() {
    return state.loopControlsExpanded;
}

/**
 * Get loop fades enabled state
 * @returns {boolean}
 */
export function getLoopFadesEnabled() {
    return state.loopFadesEnabled;
}

/**
 * Get fade time in seconds
 * @returns {number}
 */
export function getFadeTime() {
    return state.fadeTime;
}

/**
 * Get preserve loop on file change setting
 * @returns {boolean}
 */
export function getPreserveLoopOnFileChange() {
    return state.preserveLoopOnFileChange;
}

/**
 * Get preserved loop start bar
 * @returns {number|null}
 */
export function getPreservedLoopStartBar() {
    return state.preservedLoopStartBar;
}

/**
 * Get preserved loop end bar
 * @returns {number|null}
 */
export function getPreservedLoopEndBar() {
    return state.preservedLoopEndBar;
}

/**
 * Get preserved cycle mode state
 * @returns {boolean}
 */
export function getPreservedCycleMode() {
    return state.preservedCycleMode;
}

/**
 * Get preserved playback position in loop
 * @returns {number|null}
 */
export function getPreservedPlaybackPositionInLoop() {
    return state.preservedPlaybackPositionInLoop;
}

/**
 * Get BPM lock enabled state
 * @returns {boolean}
 */
export function getBpmLockEnabled() {
    return state.bpmLockEnabled;
}

/**
 * Get locked BPM value
 * @returns {number|null}
 */
export function getLockedBPM() {
    return state.lockedBPM;
}

// ============================================================================
// SETTERS
// ============================================================================

/**
 * Set loop start time
 * @param {number|null} value - Time in seconds
 */
export function setLoopStart(value) {
    state.loopStart = value;
}

/**
 * Set loop end time
 * @param {number|null} value - Time in seconds
 */
export function setLoopEnd(value) {
    state.loopEnd = value;
}

/**
 * Set cycle mode
 * @param {boolean} value
 */
export function setCycleMode(value) {
    state.cycleMode = value;
}

/**
 * Set next click sets
 * @param {string} value - 'start' or 'end'
 */
export function setNextClickSets(value) {
    state.nextClickSets = value;
}

/**
 * Set immediate jump mode
 * @param {string} value - 'off', 'on', or 'clock'
 */
export function setImmediateJump(value) {
    state.immediateJump = value;
}

/**
 * Set pending jump target
 * @param {number|null} value - Time in seconds
 */
export function setPendingJumpTarget(value) {
    state.pendingJumpTarget = value;
}

/**
 * Set seek on click mode
 * @param {string} value - 'off', 'on', or 'quantized'
 */
export function setSeekOnClick(value) {
    state.seekOnClick = value;
}

/**
 * Set loop controls expanded state
 * @param {boolean} value
 */
export function setLoopControlsExpanded(value) {
    state.loopControlsExpanded = value;
}

/**
 * Set loop fades enabled
 * @param {boolean} value
 */
export function setLoopFadesEnabled(value) {
    state.loopFadesEnabled = value;
}

/**
 * Set fade time
 * @param {number} value - Time in seconds
 */
export function setFadeTime(value) {
    state.fadeTime = value;
}

/**
 * Set preserve loop on file change
 * @param {boolean} value
 */
export function setPreserveLoopOnFileChange(value) {
    state.preserveLoopOnFileChange = value;
}

/**
 * Set preserved loop start bar
 * @param {number|null} value
 */
export function setPreservedLoopStartBar(value) {
    state.preservedLoopStartBar = value;
}

/**
 * Set preserved loop end bar
 * @param {number|null} value
 */
export function setPreservedLoopEndBar(value) {
    state.preservedLoopEndBar = value;
}

/**
 * Set preserved cycle mode
 * @param {boolean} value
 */
export function setPreservedCycleMode(value) {
    state.preservedCycleMode = value;
}

/**
 * Set preserved playback position in loop
 * @param {number|null} value
 */
export function setPreservedPlaybackPositionInLoop(value) {
    state.preservedPlaybackPositionInLoop = value;
}

/**
 * Set BPM lock enabled
 * @param {boolean} value
 */
export function setBpmLockEnabled(value) {
    state.bpmLockEnabled = value;
}

/**
 * Set locked BPM
 * @param {number|null} value
 */
export function setLockedBPM(value) {
    state.lockedBPM = value;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Check if there is an active loop
 * @returns {boolean}
 */
export function hasActiveLoop() {
    return state.loopStart !== null && state.loopEnd !== null;
}

/**
 * Get loop duration in seconds
 * @returns {number}
 */
export function getLoopDuration() {
    return hasActiveLoop() ? state.loopEnd - state.loopStart : 0;
}

/**
 * Get complete loop state object
 * @returns {object}
 */
export function getLoopState() {
    return {
        start: state.loopStart,
        end: state.loopEnd,
        cycleMode: state.cycleMode,
        nextClickSets: state.nextClickSets,
        immediateJump: state.immediateJump,
        seekOnClick: state.seekOnClick,
        loopFadesEnabled: state.loopFadesEnabled,
        fadeTime: state.fadeTime
    };
}

/**
 * Get preserved loop state object
 * @returns {object}
 */
export function getPreservedLoopState() {
    return {
        startBar: state.preservedLoopStartBar,
        endBar: state.preservedLoopEndBar,
        cycleMode: state.preservedCycleMode,
        playbackPosition: state.preservedPlaybackPositionInLoop
    };
}

/**
 * Get BPM lock state object
 * @returns {object}
 */
export function getBpmLockState() {
    return {
        enabled: state.bpmLockEnabled,
        lockedBPM: state.lockedBPM
    };
}

/**
 * Clear loop points (but preserve cycle mode and other settings)
 */
export function clearLoop() {
    state.loopStart = null;
    state.loopEnd = null;
}

/**
 * Reset all loop state to defaults
 */
export function reset() {
    state.loopStart = null;
    state.loopEnd = null;
    state.cycleMode = false;
    state.nextClickSets = 'start';
    state.immediateJump = 'off';
    state.pendingJumpTarget = null;
    state.seekOnClick = 'off';
    state.loopControlsExpanded = false;
    state.loopFadesEnabled = false;
    state.fadeTime = 0.015;
    state.preserveLoopOnFileChange = true;
    state.preservedLoopStartBar = null;
    state.preservedLoopEndBar = null;
    state.preservedCycleMode = false;
    state.preservedPlaybackPositionInLoop = null;
    state.bpmLockEnabled = false;
    state.lockedBPM = null;
}

/**
 * Reset only preserved loop state
 */
export function clearPreservedLoop() {
    state.preservedLoopStartBar = null;
    state.preservedLoopEndBar = null;
    state.preservedCycleMode = false;
    state.preservedPlaybackPositionInLoop = null;
}

// ============================================================================
// DEBUG
// ============================================================================

/**
 * Print current loop state to console
 */
export function debugPrintState() {
    console.group('🔁 Loop State Manager');
    console.log('Loop:', state.loopStart, '→', state.loopEnd);
    console.log('Cycle Mode:', state.cycleMode);
    console.log('Next Click Sets:', state.nextClickSets);
    console.log('Immediate Jump:', state.immediateJump);
    console.log('Seek On Click:', state.seekOnClick);
    console.log('Loop Fades:', state.loopFadesEnabled, `(${state.fadeTime}s)`);
    console.log('Preserve on File Change:', state.preserveLoopOnFileChange);
    console.log('BPM Lock:', state.bpmLockEnabled, state.lockedBPM);
    console.log('Preserved Loop:', {
        startBar: state.preservedLoopStartBar,
        endBar: state.preservedLoopEndBar,
        cycleMode: state.preservedCycleMode,
        playbackPosition: state.preservedPlaybackPositionInLoop
    });
    console.groupEnd();
}
