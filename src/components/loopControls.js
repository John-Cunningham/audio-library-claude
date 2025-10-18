/**
 * Loop Controls Module (Pure Functions)
 *
 * Manages loop/cycle mode functionality using pure functions.
 * All state is maintained in app.js. Functions accept state and return new state.
 *
 * Usage Pattern:
 *   import * as LoopControls from './loopControls.js';
 *
 *   // In app.js:
 *   const result = LoopControls.toggleCycleMode({ cycleMode, loopStart, ... });
 *   cycleMode = result.cycleMode;
 *   nextClickSets = result.nextClickSets;
 *   LoopControls.updateLoopVisuals({ cycleMode, loopStart, ... });
 */

// Module callbacks (set once during init)
let callbacks = {};

/**
 * Initialize loop controls with callbacks
 * @param {Object} cbs - Callback functions
 * @param {Function} cbs.recordAction - Record action for playback
 * @param {Function} cbs.getAudioFiles - Get audio files array
 * @param {Function} cbs.getCurrentFileId - Get current file ID
 * @param {Function} cbs.setPendingJumpTarget - Set pending jump target for clock mode
 */
export function init(cbs) {
    callbacks = cbs;
    console.log('[LoopControls] Initialized with pure function approach');
}

// ===================================================================
// CYCLE MODE & BASIC LOOP CONTROLS
// ===================================================================

/**
 * Toggle cycle mode (combined edit + active loop)
 * @param {Object} state - Current loop state
 * @returns {Object} Updated state values { cycleMode, nextClickSets }
 */
export function toggleCycleMode(state) {
    const newCycleMode = !state.cycleMode;
    let newNextClickSets = state.nextClickSets;

    if (newCycleMode) {
        // Entering cycle mode - can edit loop AND loop is active
        newNextClickSets = 'start';
        console.log('CYCLE MODE ON - click to set loop start/end, loop will play');

        // If stems are expanded, also enable cycle mode for all stems
        if (state.multiStemPlayerExpanded) {
            const stemTypes = ['vocals', 'drums', 'bass', 'other'];
            stemTypes.forEach(type => {
                const loopBtn = document.getElementById(`stem-cycle-${type}`);
                if (loopBtn && !state.stemCycleModes[type]) {
                    state.stemCycleModes[type] = true;
                    state.stemNextClickSets[type] = 'start';
                    loopBtn.classList.add('active', 'cycle-mode');
                    console.log(`[${type}] CYCLE MODE ON (synced with parent)`);
                }
            });
        }
    } else {
        // Exiting cycle mode - editing disabled AND loop disabled
        console.log('CYCLE MODE OFF - loop disabled');

        // If stems are expanded, also disable cycle mode for all stems
        if (state.multiStemPlayerExpanded) {
            const stemTypes = ['vocals', 'drums', 'bass', 'other'];
            stemTypes.forEach(type => {
                const loopBtn = document.getElementById(`stem-cycle-${type}`);
                const loopState = state.stemLoopStates[type];
                if (loopBtn && state.stemCycleModes[type]) {
                    state.stemCycleModes[type] = false;
                    loopBtn.classList.remove('active', 'cycle-mode');
                    loopState.enabled = false;
                    loopState.start = null;
                    loopState.end = null;
                    console.log(`[${type}] CYCLE MODE OFF (synced with parent)`);
                }
            });
        }
    }

    return {
        cycleMode: newCycleMode,
        nextClickSets: newNextClickSets
    };
}

/**
 * Toggle loop on/off
 * @param {Object} state - Current loop state
 * @returns {Object} Updated state { isLooping }
 */
export function toggleLoop(state) {
    const newIsLooping = !state.isLooping;
    const loopBtn = document.getElementById('loopBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');

    if (loopBtn) loopBtn.classList.toggle('active', newIsLooping);

    // Gray out shuffle button when loop is active
    if (shuffleBtn) {
        if (newIsLooping) {
            shuffleBtn.style.opacity = '0.4';
            shuffleBtn.style.cursor = 'not-allowed';
        } else {
            shuffleBtn.style.opacity = '1';
            shuffleBtn.style.cursor = 'pointer';
        }
    }

    return { isLooping: newIsLooping };
}

/**
 * Reset/clear loop markers
 * @returns {Object} Updated state
 */
export function resetLoop() {
    console.log('Loop cleared');
    return {
        loopStart: null,
        loopEnd: null,
        cycleMode: false,
        nextClickSets: 'start'
    };
}

/**
 * Clear loop but keep cycle mode active
 * @returns {Object} Updated state
 */
export function clearLoopKeepCycle() {
    console.log('Loop cleared (cycle mode still ON - click to set new loop)');
    return {
        loopStart: null,
        loopEnd: null,
        nextClickSets: 'start'
    };
}

// ===================================================================
// LOOP MANIPULATION (Shift, Resize, Move Markers)
// ===================================================================

/**
 * Shift loop left by one loop duration
 * @param {Object} state - Current loop state
 * @param {Object} wavesurfer - Wavesurfer instance
 * @returns {Object|null} Updated state or null if operation failed
 */
export function shiftLoopLeft(state, wavesurfer) {
    if (!state.cycleMode || state.loopStart === null || state.loopEnd === null) {
        console.log('No active loop to shift');
        return null;
    }

    const loopDuration = state.loopEnd - state.loopStart;
    const newStart = state.loopStart - loopDuration;
    const newEnd = state.loopEnd - loopDuration;

    if (newStart < 0) {
        console.log('Cannot shift loop before start of track');
        return null;
    }

    console.log(`Loop shifted left: ${newStart.toFixed(2)}s - ${newEnd.toFixed(2)}s`);
    callbacks.recordAction('shiftLoopLeft', { loopStart: newStart, loopEnd: newEnd, loopDuration });

    // Handle jump based on immediateJump mode
    handleJumpAfterLoopChange(state, wavesurfer, newStart, newEnd, loopDuration);

    return {
        loopStart: newStart,
        loopEnd: newEnd
    };
}

/**
 * Shift loop right by one loop duration
 * @param {Object} state - Current loop state
 * @param {Object} wavesurfer - Wavesurfer instance
 * @returns {Object|null} Updated state or null if operation failed
 */
export function shiftLoopRight(state, wavesurfer) {
    if (!state.cycleMode || state.loopStart === null || state.loopEnd === null || !wavesurfer) {
        console.log('No active loop to shift');
        return null;
    }

    const loopDuration = state.loopEnd - state.loopStart;
    const trackDuration = wavesurfer.getDuration();
    const newStart = state.loopStart + loopDuration;
    const newEnd = state.loopEnd + loopDuration;

    if (newEnd > trackDuration) {
        console.log('Cannot shift loop past end of track');
        return null;
    }

    console.log(`Loop shifted right: ${newStart.toFixed(2)}s - ${newEnd.toFixed(2)}s`);
    callbacks.recordAction('shiftLoopRight', { loopStart: newStart, loopEnd: newEnd, loopDuration });

    handleJumpAfterLoopChange(state, wavesurfer, newStart, newEnd, loopDuration);

    return {
        loopStart: newStart,
        loopEnd: newEnd
    };
}

/**
 * Halve loop length
 * @param {Object} state - Current loop state
 * @param {Object} wavesurfer - Wavesurfer instance
 * @returns {Object|null} Updated state or null if operation failed
 */
export function halfLoopLength(state, wavesurfer) {
    if (!state.cycleMode || state.loopStart === null || state.loopEnd === null) {
        console.log('No active loop to modify');
        return null;
    }

    const loopDuration = state.loopEnd - state.loopStart;
    const newDuration = loopDuration / 2;

    if (newDuration < 0.1) {
        console.log('Loop too short to halve');
        return null;
    }

    const newEnd = state.loopStart + newDuration;
    console.log(`Loop halved: ${state.loopStart.toFixed(2)}s - ${newEnd.toFixed(2)}s (${newDuration.toFixed(1)}s)`);
    callbacks.recordAction('halfLoopLength', { loopStart: state.loopStart, loopEnd: newEnd, loopDuration: newDuration });

    handleJumpToLoopStart(state, wavesurfer, state.loopStart);

    return {
        loopEnd: newEnd
    };
}

/**
 * Double loop length
 * @param {Object} state - Current loop state
 * @param {Object} wavesurfer - Wavesurfer instance
 * @returns {Object|null} Updated state or null if operation failed
 */
export function doubleLoopLength(state, wavesurfer) {
    if (!state.cycleMode || state.loopStart === null || state.loopEnd === null || !wavesurfer) {
        console.log('No active loop to modify');
        return null;
    }

    const loopDuration = state.loopEnd - state.loopStart;
    const newDuration = loopDuration * 2;
    const newEnd = state.loopStart + newDuration;
    const trackDuration = wavesurfer.getDuration();

    if (newEnd > trackDuration) {
        console.log('Cannot double loop - would exceed track duration');
        return null;
    }

    console.log(`Loop doubled: ${state.loopStart.toFixed(2)}s - ${newEnd.toFixed(2)}s (${newDuration.toFixed(1)}s)`);
    callbacks.recordAction('doubleLoopLength', { loopStart: state.loopStart, loopEnd: newEnd, loopDuration: newDuration });

    handleJumpToLoopStart(state, wavesurfer, state.loopStart);

    return {
        loopEnd: newEnd
    };
}

/**
 * Move loop start marker left (expand from left)
 * @param {Object} state - Current loop state
 * @param {Object} wavesurfer - Wavesurfer instance
 * @returns {Object|null} Updated state or null if operation failed
 */
export function moveStartLeft(state, wavesurfer) {
    if (!state.cycleMode || state.loopStart === null || state.loopEnd === null) {
        console.log('No active loop');
        return null;
    }

    const currentMarkers = state.currentMarkers || [];
    let newLoopStart;

    if (currentMarkers.length === 0) {
        newLoopStart = Math.max(0, state.loopStart - 0.01);
        console.log(`Start marker nudged left to ${newLoopStart.toFixed(2)}s (loop now ${(state.loopEnd - newLoopStart).toFixed(2)}s)`);
    } else {
        let prevMarker = null;
        for (let i = currentMarkers.length - 1; i >= 0; i--) {
            const markerTime = currentMarkers[i];
            if (markerTime < state.loopStart) {
                prevMarker = markerTime;
                break;
            }
        }

        if (prevMarker === null) {
            console.log('No marker found before loop start');
            return null;
        }

        newLoopStart = prevMarker;
        console.log(`Start marker moved left to ${newLoopStart.toFixed(2)}s (loop now ${(state.loopEnd - newLoopStart).toFixed(1)}s)`);
    }

    callbacks.recordAction('moveStartLeft', { loopStart: newLoopStart, loopEnd: state.loopEnd, loopDuration: state.loopEnd - newLoopStart });
    handleJumpToLoopStart(state, wavesurfer, newLoopStart);

    return {
        loopStart: newLoopStart
    };
}

/**
 * Move loop start marker right (shrink from left)
 * @param {Object} state - Current loop state
 * @param {Object} wavesurfer - Wavesurfer instance
 * @returns {Object|null} Updated state or null if operation failed
 */
export function moveStartRight(state, wavesurfer) {
    if (!state.cycleMode || state.loopStart === null || state.loopEnd === null) {
        console.log('No active loop');
        return null;
    }

    const currentMarkers = state.currentMarkers || [];
    let newLoopStart;

    if (currentMarkers.length === 0) {
        newLoopStart = Math.min(state.loopEnd - 0.01, state.loopStart + 0.01);
        console.log(`Start marker nudged right to ${newLoopStart.toFixed(2)}s (loop now ${(state.loopEnd - newLoopStart).toFixed(2)}s)`);
    } else {
        let nextMarker = null;
        for (const markerTime of currentMarkers) {
            if (markerTime > state.loopStart && markerTime < state.loopEnd) {
                nextMarker = markerTime;
                break;
            }
        }

        if (nextMarker === null) {
            console.log('No marker found between start and end');
            return null;
        }

        newLoopStart = nextMarker;
        console.log(`Start marker moved right to ${newLoopStart.toFixed(2)}s (loop now ${(state.loopEnd - newLoopStart).toFixed(1)}s)`);
    }

    callbacks.recordAction('moveStartRight', { loopStart: newLoopStart, loopEnd: state.loopEnd, loopDuration: state.loopEnd - newLoopStart });
    handleJumpToLoopStart(state, wavesurfer, newLoopStart);

    return {
        loopStart: newLoopStart
    };
}

/**
 * Move loop end marker right (expand from right)
 * @param {Object} state - Current loop state
 * @param {Object} wavesurfer - Wavesurfer instance
 * @returns {Object|null} Updated state or null if operation failed
 */
export function moveEndRight(state, wavesurfer) {
    if (!state.cycleMode || state.loopStart === null || state.loopEnd === null) {
        console.log('No active loop');
        return null;
    }

    const currentMarkers = state.currentMarkers || [];
    let newLoopEnd;

    if (currentMarkers.length === 0) {
        const duration = wavesurfer ? wavesurfer.getDuration() : Infinity;
        newLoopEnd = Math.min(duration, state.loopEnd + 0.01);
        console.log(`End marker nudged right to ${newLoopEnd.toFixed(2)}s (loop now ${(newLoopEnd - state.loopStart).toFixed(2)}s)`);
    } else {
        let nextMarker = null;
        for (const markerTime of currentMarkers) {
            if (markerTime > state.loopEnd) {
                nextMarker = markerTime;
                break;
            }
        }

        if (nextMarker === null) {
            console.log('No marker found after loop end');
            return null;
        }

        newLoopEnd = nextMarker;
        console.log(`End marker moved right to ${newLoopEnd.toFixed(2)}s (loop now ${(newLoopEnd - state.loopStart).toFixed(1)}s)`);
    }

    callbacks.recordAction('moveEndRight', { loopStart: state.loopStart, loopEnd: newLoopEnd, loopDuration: newLoopEnd - state.loopStart });
    handleJumpToLoopStart(state, wavesurfer, state.loopStart);

    return {
        loopEnd: newLoopEnd
    };
}

/**
 * Move loop end marker left (shrink from right)
 * @param {Object} state - Current loop state
 * @param {Object} wavesurfer - Wavesurfer instance
 * @returns {Object|null} Updated state or null if operation failed
 */
export function moveEndLeft(state, wavesurfer) {
    if (!state.cycleMode || state.loopStart === null || state.loopEnd === null) {
        console.log('No active loop');
        return null;
    }

    const currentMarkers = state.currentMarkers || [];
    let newLoopEnd;

    if (currentMarkers.length === 0) {
        newLoopEnd = Math.max(state.loopStart + 0.01, state.loopEnd - 0.01);
        console.log(`End marker nudged left to ${newLoopEnd.toFixed(2)}s (loop now ${(newLoopEnd - state.loopStart).toFixed(2)}s)`);
    } else {
        let prevMarker = null;
        for (let i = currentMarkers.length - 1; i >= 0; i--) {
            const markerTime = currentMarkers[i];
            if (markerTime < state.loopEnd && markerTime > state.loopStart) {
                prevMarker = markerTime;
                break;
            }
        }

        if (prevMarker === null) {
            console.log('No marker found between start and end');
            return null;
        }

        newLoopEnd = prevMarker;
        console.log(`End marker moved left to ${newLoopEnd.toFixed(2)}s (loop now ${(newLoopEnd - state.loopStart).toFixed(1)}s)`);
    }

    callbacks.recordAction('moveEndLeft', { loopStart: state.loopStart, loopEnd: newLoopEnd, loopDuration: newLoopEnd - state.loopStart });
    handleJumpToLoopStart(state, wavesurfer, state.loopStart);

    return {
        loopEnd: newLoopEnd
    };
}

// ===================================================================
// LOOP SETTINGS & TOGGLES
// ===================================================================

/**
 * Toggle seek on click mode (off → seek → clock → off)
 * @param {Object} state - Current state
 * @returns {Object} Updated state { seekOnClick }
 */
export function toggleSeekOnClick(state) {
    let newSeekOnClick = 'off';

    if (state.seekOnClick === 'off') {
        newSeekOnClick = 'seek';
    } else if (state.seekOnClick === 'seek') {
        newSeekOnClick = 'clock';
    } else {
        newSeekOnClick = 'off';
    }

    console.log(`Seek mode: ${newSeekOnClick.toUpperCase()}`);
    return { seekOnClick: newSeekOnClick };
}

/**
 * Toggle immediate jump mode (off → on → clock → off)
 * @param {Object} state - Current state
 * @returns {Object} Updated state { immediateJump }
 */
export function toggleImmediateJump(state) {
    let newImmediateJump = 'off';

    if (state.immediateJump === 'off') {
        newImmediateJump = 'on';
    } else if (state.immediateJump === 'on') {
        newImmediateJump = 'clock';
    } else {
        newImmediateJump = 'off';
    }

    console.log(`Jump mode: ${newImmediateJump.toUpperCase()}`);
    return { immediateJump: newImmediateJump };
}

/**
 * Toggle loop fades on/off
 * @param {Object} state - Current state
 * @returns {Object} Updated state { loopFadesEnabled }
 */
export function toggleLoopFades(state) {
    const newLoopFadesEnabled = !state.loopFadesEnabled;
    console.log(`Loop fades: ${newLoopFadesEnabled ? 'ON' : 'OFF'}`);
    return { loopFadesEnabled: newLoopFadesEnabled };
}

/**
 * Set fade time in milliseconds
 * @param {number} milliseconds - Fade time in ms
 * @returns {Object} Updated state { fadeTime }
 */
export function setFadeTime(milliseconds) {
    console.log(`Fade time: ${milliseconds}ms`);

    const display = document.getElementById('fadeTimeValue');
    if (display) {
        display.textContent = `${milliseconds}ms`;
    }

    return { fadeTime: milliseconds / 1000 };
}

/**
 * Toggle preserve loop on file change
 * @param {Object} state - Current state
 * @returns {Object} Updated state { preserveLoopOnFileChange }
 */
export function togglePreserveLoop(state) {
    const newPreserveLoop = !state.preserveLoopOnFileChange;
    console.log(`Preserve loop on file change: ${newPreserveLoop ? 'ON' : 'OFF'}`);
    return { preserveLoopOnFileChange: newPreserveLoop };
}

/**
 * Toggle BPM lock
 * @param {Object} state - Current state
 * @returns {Object} Updated state { bpmLockEnabled, lockedBPM }
 */
export function toggleBPMLock(state) {
    const newBpmLockEnabled = !state.bpmLockEnabled;
    let newLockedBPM = null;

    if (newBpmLockEnabled) {
        const audioFiles = callbacks.getAudioFiles();
        const currentFileId = callbacks.getCurrentFileId();
        const currentFile = audioFiles.find(f => f.id === currentFileId);

        if (currentFile && currentFile.bpm) {
            newLockedBPM = currentFile.bpm;
            console.log(`[BPM LOCK] Enabled - locked to ${newLockedBPM} BPM`);
        } else {
            console.log('[BPM LOCK] Enabled but no BPM data for current file');
        }
    } else {
        console.log('[BPM LOCK] Disabled');
    }

    return {
        bpmLockEnabled: newBpmLockEnabled,
        lockedBPM: newLockedBPM
    };
}

/**
 * Toggle loop controls expanded/collapsed
 * @param {Object} state - Current state
 * @returns {Object} Updated state { loopControlsExpanded }
 */
export function toggleLoopControlsExpanded(state) {
    const newExpanded = !state.loopControlsExpanded;
    console.log(`Loop controls ${newExpanded ? 'expanded' : 'collapsed'}`);
    return { loopControlsExpanded: newExpanded };
}

// ===================================================================
// VISUAL UPDATES
// ===================================================================

/**
 * Update all loop-related UI elements
 * @param {Object} state - Current loop state (all loop-related variables)
 */
export function updateLoopVisuals(state) {
    const cycleBtn = document.getElementById('cycleBtn');
    const seekOnClickBtn = document.getElementById('seekOnClickBtn');
    const loopStatus = document.getElementById('loopStatus');
    const expandLoopBtn = document.getElementById('expandLoopBtn');
    const loopControlsContainer = document.getElementById('loopControlsContainer');
    const jumpBtn = document.getElementById('jumpBtn');
    const fadeBtn = document.getElementById('fadeBtn');
    const preserveLoopBtn = document.getElementById('preserveLoopBtn');
    const bpmLockBtn = document.getElementById('bpmLockBtn');

    // Update cycle button state
    if (cycleBtn) {
        cycleBtn.classList.toggle('active', state.cycleMode);
    }

    // Show/hide seek on click button
    if (seekOnClickBtn) {
        seekOnClickBtn.style.display = state.cycleMode ? 'inline-block' : 'none';
        const buttonText = state.seekOnClick === 'off' ? 'SEEK' : state.seekOnClick.toUpperCase();
        seekOnClickBtn.querySelector('span').textContent = buttonText;
        seekOnClickBtn.classList.toggle('active', state.seekOnClick !== 'off');
    }

    // Show/hide clear loop button
    const clearLoopBtn = document.getElementById('clearLoopBtn');
    if (clearLoopBtn) {
        clearLoopBtn.style.display = state.cycleMode ? 'inline-block' : 'none';
    }

    // Update loop status text
    if (loopStatus) {
        updateLoopStatusText(state, loopStatus);
    }

    // Show/hide expand button and loop controls
    const showExpandBtn = state.cycleMode && state.loopStart !== null && state.loopEnd !== null;
    if (expandLoopBtn) {
        expandLoopBtn.style.display = showExpandBtn ? 'inline-block' : 'none';
        expandLoopBtn.querySelector('span').textContent = state.loopControlsExpanded ? '▲' : '▼';
    }

    if (loopControlsContainer) {
        loopControlsContainer.style.display = (showExpandBtn && state.loopControlsExpanded) ? 'flex' : 'none';
    }

    // Update jump button
    if (jumpBtn) {
        const buttonText = state.immediateJump === 'off' ? 'JMP' : state.immediateJump.toUpperCase();
        jumpBtn.querySelector('span').textContent = buttonText;
        jumpBtn.classList.toggle('active', state.immediateJump !== 'off');
    }

    // Update fade button
    if (fadeBtn) {
        fadeBtn.classList.toggle('active', state.loopFadesEnabled);
    }

    // Update preserve loop button
    if (preserveLoopBtn) {
        preserveLoopBtn.classList.toggle('active', state.preserveLoopOnFileChange);
    }

    // Update BPM lock button
    if (bpmLockBtn) {
        bpmLockBtn.classList.toggle('active', state.bpmLockEnabled);
    }

    // Update visual loop region
    updateLoopRegion(state);
}

/**
 * Update loop status text with duration and bar/beat info
 * @param {Object} state - Current loop state
 * @param {HTMLElement} loopStatus - Loop status element
 */
function updateLoopStatusText(state, loopStatus) {
    const hasLoop = state.loopStart !== null && state.loopEnd !== null;

    if (!state.cycleMode && !hasLoop) {
        loopStatus.textContent = 'Off';
        loopStatus.style.color = '#666';
    } else if (state.cycleMode && state.loopStart === null) {
        loopStatus.textContent = 'Click start';
        loopStatus.style.color = '#f59e0b';
    } else if (state.cycleMode && state.loopEnd === null) {
        loopStatus.textContent = 'Click end →';
        loopStatus.style.color = '#f59e0b';
    } else if (hasLoop) {
        const duration = state.loopEnd - state.loopStart;
        let statusText = `${duration.toFixed(1)}s`;

        // Add bar/beat count if beatmap data exists
        const audioFiles = callbacks.getAudioFiles();
        const currentFileId = callbacks.getCurrentFileId();
        const currentFile = audioFiles.find(f => f.id === currentFileId);

        if (currentFile && currentFile.beatmap && currentFile.beatmap.length > 0) {
            const beatsInLoop = currentFile.beatmap.filter(beat =>
                beat.time >= state.loopStart && beat.time < state.loopEnd
            ).length;

            const bars = Math.floor(beatsInLoop / 4);
            const remainingBeats = beatsInLoop % 4;

            if (bars > 0 && remainingBeats === 0) {
                statusText += ` (${bars} ${bars === 1 ? 'Bar' : 'Bars'})`;
            } else if (bars > 0) {
                statusText += ` (${bars} ${bars === 1 ? 'Bar' : 'Bars'}, ${remainingBeats} ${remainingBeats === 1 ? 'Beat' : 'Beats'})`;
            } else if (beatsInLoop > 0) {
                statusText += ` (${beatsInLoop} ${beatsInLoop === 1 ? 'Beat' : 'Beats'})`;
            }
        }

        loopStatus.textContent = statusText;
        loopStatus.style.color = '#10b981';
    }
}

/**
 * Update visual loop region overlay
 * @param {Object} state - Current loop state
 */
export function updateLoopRegion(state) {
    const waveformContainer = document.getElementById('waveform');
    if (!waveformContainer) return;

    // Remove existing loop region and progress mask
    const existingRegion = waveformContainer.querySelector('.loop-region');
    const existingMask = waveformContainer.querySelector('.loop-progress-mask');
    if (existingRegion) existingRegion.remove();
    if (existingMask) existingMask.remove();

    // Don't draw if cycle mode is off or loop not fully set
    if (!state.cycleMode || state.loopStart === null || state.loopEnd === null || !state.wavesurfer) return;

    const duration = state.wavesurfer.getDuration();
    if (duration === 0) return;

    const startPercent = (state.loopStart / duration) * 100;
    const endPercent = (state.loopEnd / duration) * 100;
    const widthPercent = endPercent - startPercent;

    const loopRegion = document.createElement('div');
    loopRegion.className = 'loop-region';
    loopRegion.style.left = `${startPercent}%`;
    loopRegion.style.width = `${widthPercent}%`;
    waveformContainer.appendChild(loopRegion);

    // Add progress mask to hide blue progress before loop start
    if (state.cycleMode && startPercent > 0) {
        const progressMask = document.createElement('div');
        progressMask.className = 'loop-progress-mask';
        progressMask.style.width = `${startPercent}%`;
        waveformContainer.appendChild(progressMask);
    }
}

// ===================================================================
// INTERNAL HELPERS
// ===================================================================

/**
 * Handle jump after loop change (shift operations)
 * @param {Object} state - Current state
 * @param {Object} wavesurfer - Wavesurfer instance
 * @param {number} newLoopStart - New loop start time
 * @param {number} newLoopEnd - New loop end time
 * @param {number} loopDuration - Loop duration
 */
function handleJumpAfterLoopChange(state, wavesurfer, newLoopStart, newLoopEnd, loopDuration) {
    if (!wavesurfer) return;

    if (state.immediateJump === 'on') {
        const currentTime = wavesurfer.getCurrentTime();
        const oldLoopStart = newLoopStart + loopDuration;
        const oldLoopEnd = newLoopEnd + loopDuration;

        let relativePosition = 0;
        if (currentTime >= oldLoopStart && currentTime <= oldLoopEnd) {
            relativePosition = (currentTime - oldLoopStart) / loopDuration;
        }

        const newTime = newLoopStart + (relativePosition * loopDuration);
        wavesurfer.seekTo(newTime / wavesurfer.getDuration());
        console.log(`Jumped to relative position in new loop: ${newTime.toFixed(2)}s (${(relativePosition * 100).toFixed(1)}% through loop)`);
    } else if (state.immediateJump === 'clock') {
        callbacks.setPendingJumpTarget(newLoopStart);
        console.log(`Clock mode: will jump to loop start (${newLoopStart.toFixed(2)}s) on next beat`);
    }
}

/**
 * Handle jump to loop start (resize/move operations)
 * @param {Object} state - Current state
 * @param {Object} wavesurfer - Wavesurfer instance
 * @param {number} loopStart - Loop start time
 */
function handleJumpToLoopStart(state, wavesurfer, loopStart) {
    if (!wavesurfer) return;

    if (state.immediateJump === 'on') {
        wavesurfer.seekTo(loopStart / wavesurfer.getDuration());
        console.log(`Jumped to loop start: ${loopStart.toFixed(2)}s`);
    } else if (state.immediateJump === 'clock') {
        callbacks.setPendingJumpTarget(loopStart);
        console.log(`Clock mode: will jump to loop start (${loopStart.toFixed(2)}s) on next beat`);
    }
}
