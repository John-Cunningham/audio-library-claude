/**
 * ADVANCED RATE MODE MODULE
 *
 * Placeholder for Signalsmith time/pitch stretching integration
 * Provides UI controls for independent speed and pitch manipulation
 *
 * Current state: Placeholder only - pitch control not functional
 * Future: Will integrate with Signalsmith library for time-stretching
 */

// ============================================
// STATE
// ============================================

let isAdvancedRateMode = false;
let currentSpeed = 1.0;
let currentPitch = 0.0; // semitones
let speedPitchLocked = true;

// ============================================
// DEPENDENCIES
// ============================================

let setPlaybackRateCallback = null;

/**
 * Initialize the advanced rate mode module
 * @param {Object} dependencies - Required dependencies
 * @param {Function} dependencies.setPlaybackRate - Callback to set playback rate
 */
export function init(dependencies = {}) {
    setPlaybackRateCallback = dependencies.setPlaybackRate;
    console.log('[AdvancedRateMode] Module initialized');
}

// ============================================
// GETTERS
// ============================================

export function isAdvancedMode() {
    return isAdvancedRateMode;
}

export function getSpeed() {
    return currentSpeed;
}

export function getPitch() {
    return currentPitch;
}

export function isSpeedPitchLocked() {
    return speedPitchLocked;
}

// ============================================
// MODE TOGGLE
// ============================================

/**
 * Toggle between simple rate and advanced speed/pitch mode
 */
export function toggleRateMode() {
    isAdvancedRateMode = !isAdvancedRateMode;
    const advancedContainer = document.getElementById('advancedRateContainer');
    const simpleRateSlider = document.getElementById('rateSlider');
    const toggleBtn = document.getElementById('toggleRateModeBtn');

    if (advancedContainer) {
        advancedContainer.style.display = isAdvancedRateMode ? 'flex' : 'none';
    }

    if (simpleRateSlider) {
        simpleRateSlider.style.display = isAdvancedRateMode ? 'none' : 'block';
    }

    if (toggleBtn) {
        toggleBtn.classList.toggle('active', isAdvancedRateMode);
    }

    console.log(`Advanced rate mode: ${isAdvancedRateMode ? 'ON' : 'OFF'}`);
}

// ============================================
// SPEED CONTROLS (Placeholder - uses simple rate)
// ============================================

/**
 * Set speed (placeholder - will integrate with Signalsmith later)
 * Currently just adjusts simple playback rate (chipmunk effect)
 * @param {number} speed - Speed multiplier (e.g., 1.0 = normal, 2.0 = double)
 */
export function setSpeed(speed) {
    currentSpeed = speed;
    const speedDisplay = document.getElementById('speedValue');
    if (speedDisplay) {
        speedDisplay.textContent = speed.toFixed(1) + 'x';
    }

    // For now, just adjust the simple rate slider
    if (speedPitchLocked && setPlaybackRateCallback) {
        setPlaybackRateCallback(speed);
    }

    console.log(`Speed set to ${speed}x (placeholder - chipmunk effect only)`);
}

/**
 * Reset speed to 1.0x
 */
export function resetSpeed() {
    setSpeed(1.0);
}

// ============================================
// PITCH CONTROLS (Placeholder - not functional)
// ============================================

/**
 * Set pitch (placeholder - will integrate with Signalsmith later)
 * Currently not functional - waiting for time-stretching integration
 * @param {number} semitones - Pitch shift in semitones (e.g., +12 = one octave up)
 */
export function setPitch(semitones) {
    currentPitch = semitones;
    const pitchDisplay = document.getElementById('pitchValue');
    if (pitchDisplay) {
        pitchDisplay.textContent = semitones.toFixed(1) + 'st';
    }

    console.log(`Pitch set to ${semitones}st (placeholder - not yet functional)`);
}

/**
 * Reset pitch to 0 semitones
 */
export function resetPitch() {
    setPitch(0);
}

// ============================================
// LOCK TOGGLE
// ============================================

/**
 * Toggle speed/pitch lock
 * Locked: Speed and pitch change together (normal playback rate)
 * Unlocked: Speed and pitch can be controlled independently (requires Signalsmith)
 */
export function toggleSpeedPitchLock() {
    speedPitchLocked = !speedPitchLocked;
    const lockBtn = document.getElementById('speedPitchLockBtn');

    if (lockBtn) {
        lockBtn.innerHTML = speedPitchLocked ? '<span>🔗</span>' : '<span>🔓</span>';
        lockBtn.classList.toggle('active', speedPitchLocked);
        lockBtn.title = speedPitchLocked
            ? 'Unlock speed and pitch (independent control)'
            : 'Lock speed and pitch together';
    }

    console.log(`Speed/Pitch ${speedPitchLocked ? 'LOCKED' : 'UNLOCKED'}`);
}

// ============================================
// DEBUG
// ============================================

export function debugPrintState() {
    console.log('=== Advanced Rate Mode State ===');
    console.log('Mode:', isAdvancedRateMode ? 'ADVANCED' : 'SIMPLE');
    console.log('Speed:', currentSpeed + 'x');
    console.log('Pitch:', currentPitch + 'st');
    console.log('Lock:', speedPitchLocked ? 'LOCKED' : 'UNLOCKED');
    console.log('===============================');
}
