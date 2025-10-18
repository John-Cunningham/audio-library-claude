/**
 * Loop Controls Module
 *
 * Manages loop/cycle mode functionality for the audio player:
 * - Loop toggling and cycle mode
 * - Loop region manipulation (shift, resize, move markers)
 * - Loop visual updates and UI state management
 * - Immediate jump and clock mode support
 * - Preserve loop across file changes
 *
 * Usage:
 *   import * as LoopControls from './loopControls.js';
 *
 *   LoopControls.init(callbacks, state);
 *   LoopControls.toggleLoop();
 *   LoopControls.shiftLoopLeft();
 */

// Module state
let state = {};
let callbacks = {};

// Loop state
let loopStart = null;
let loopEnd = null;
let cycleMode = false;
let nextClickSets = 'start';
let loopControlsExpanded = false;
let loopFadesEnabled = false;
let fadeTime = 0.05; // Default 50ms
let preserveLoopOnFileChange = false;
let immediateJump = 'off'; // 'off', 'on', or 'clock'
let seekOnClick = 'off'; // 'off', 'seek', or 'clock'
let isLooping = false;
let bpmLockEnabled = false;
let lockedBPM = null;

// Preserved loop state for file changes
let preservedLoopStartBar = null;
let preservedLoopEndBar = null;
let preservedCycleMode = false;
let preservedPlaybackPositionInLoop = null;

/**
 * Initialize loop controls with callbacks and state
 * @param {Object} cbs - Callback functions
 * @param {Function} cbs.recordAction - Record action for playback
 * @param {Function} cbs.getAudioFiles - Get audio files array
 * @param {Function} cbs.getCurrentFileId - Get current file ID
 * @param {Object} st - State getters
 * @param {Function} st.getWavesurfer - Get wavesurfer instance
 * @param {Function} st.getCurrentMarkers - Get current bar markers
 * @param {Function} st.getMultiStemPlayerExpanded - Get stem player expanded state
 * @param {Function} st.getStemCycleModes - Get stem cycle modes object
 * @param {Function} st.getStemNextClickSets - Get stem next click sets object
 * @param {Function} st.getStemLoopStates - Get stem loop states object
 */
export function init(cbs, st) {
    callbacks = cbs;
    state = st;
    console.log('[LoopControls] Initialized');
}

// ===================================================================
// GETTERS (for app.js to access loop state)
// ===================================================================

export function getLoopStart() { return loopStart; }
export function getLoopEnd() { return loopEnd; }
export function getCycleMode() { return cycleMode; }
export function getNextClickSets() { return nextClickSets; }
export function setNextClickSets(value) { nextClickSets = value; }
export function getLoopControlsExpanded() { return loopControlsExpanded; }
export function getLoopFadesEnabled() { return loopFadesEnabled; }
export function getFadeTime() { return fadeTime; }
export function getPreserveLoopOnFileChange() { return preserveLoopOnFileChange; }
export function getImmediateJump() { return immediateJump; }
export function getSeekOnClick() { return seekOnClick; }
export function getIsLooping() { return isLooping; }
export function getBpmLockEnabled() { return bpmLockEnabled; }
export function getLockedBPM() { return lockedBPM; }
export function getPreservedLoopStartBar() { return preservedLoopStartBar; }
export function getPreservedLoopEndBar() { return preservedLoopEndBar; }
export function getPreservedCycleMode() { return preservedCycleMode; }
export function getPreservedPlaybackPositionInLoop() { return preservedPlaybackPositionInLoop; }

// ===================================================================
// SETTERS (for app.js to modify loop state)
// ===================================================================

export function setLoopStart(value) { loopStart = value; }
export function setLoopEnd(value) { loopEnd = value; }
export function setCycleMode(value) { cycleMode = value; }
export function setPreservedLoopStartBar(value) { preservedLoopStartBar = value; }
export function setPreservedLoopEndBar(value) { preservedLoopEndBar = value; }
export function setPreservedCycleMode(value) { preservedCycleMode = value; }
export function setPreservedPlaybackPositionInLoop(value) { preservedPlaybackPositionInLoop = value; }

// ===================================================================
// CYCLE MODE & BASIC LOOP CONTROLS
// ===================================================================

/**
 * Toggle cycle mode (combined edit + active loop)
 */
export function toggleCycleMode() {
    cycleMode = !cycleMode;

    if (cycleMode) {
        // Entering cycle mode - can edit loop AND loop is active
        nextClickSets = 'start';
        console.log('CYCLE MODE ON - click to set loop start/end, loop will play');

        // If stems are expanded, also enable cycle mode for all stems
        const multiStemPlayerExpanded = state.getMultiStemPlayerExpanded();
        if (multiStemPlayerExpanded) {
            const stemCycleModes = state.getStemCycleModes();
            const stemNextClickSets = state.getStemNextClickSets();
            const stemTypes = ['vocals', 'drums', 'bass', 'other'];
            stemTypes.forEach(type => {
                const loopBtn = document.getElementById(`stem-cycle-${type}`);
                if (loopBtn && !stemCycleModes[type]) {
                    stemCycleModes[type] = true;
                    stemNextClickSets[type] = 'start';
                    loopBtn.classList.add('active', 'cycle-mode');
                    console.log(`[${type}] CYCLE MODE ON (synced with parent)`);
                }
            });
        }
    } else {
        // Exiting cycle mode - editing disabled AND loop disabled
        console.log('CYCLE MODE OFF - loop disabled');

        // If stems are expanded, also disable cycle mode for all stems
        const multiStemPlayerExpanded = state.getMultiStemPlayerExpanded();
        if (multiStemPlayerExpanded) {
            const stemCycleModes = state.getStemCycleModes();
            const stemLoopStates = state.getStemLoopStates();
            const stemTypes = ['vocals', 'drums', 'bass', 'other'];
            stemTypes.forEach(type => {
                const loopBtn = document.getElementById(`stem-cycle-${type}`);
                const loopState = stemLoopStates[type];
                if (loopBtn && stemCycleModes[type]) {
                    stemCycleModes[type] = false;
                    loopBtn.classList.remove('active', 'cycle-mode');
                    loopState.enabled = false;
                    loopState.start = null;
                    loopState.end = null;
                    console.log(`[${type}] CYCLE MODE OFF (synced with parent)`);
                }
            });
        }
    }

    updateLoopVisuals();
}

/**
 * Toggle loop on/off
 */
export function toggleLoop() {
    isLooping = !isLooping;
    const loopBtn = document.getElementById('loopBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');

    loopBtn.classList.toggle('active', isLooping);

    // Gray out shuffle button when loop is active
    if (isLooping) {
        shuffleBtn.style.opacity = '0.4';
        shuffleBtn.style.cursor = 'not-allowed';
    } else {
        shuffleBtn.style.opacity = '1';
        shuffleBtn.style.cursor = 'pointer';
    }
}

/**
 * Reset/clear loop markers
 */
export function resetLoop() {
    loopStart = null;
    loopEnd = null;
    cycleMode = false;
    nextClickSets = 'start';
    updateLoopVisuals();
    console.log('Loop cleared');
}

/**
 * Clear loop but keep cycle mode active
 */
export function clearLoopKeepCycle() {
    loopStart = null;
    loopEnd = null;
    nextClickSets = 'start';
    updateLoopVisuals();
    console.log('Loop cleared (cycle mode still ON - click to set new loop)');
}

// ===================================================================
// LOOP MANIPULATION (Shift, Resize, Move Markers)
// ===================================================================

/**
 * Shift loop left by one loop duration
 */
export function shiftLoopLeft() {
    if (!cycleMode || loopStart === null || loopEnd === null) {
        console.log('No active loop to shift');
        return;
    }

    const loopDuration = loopEnd - loopStart;
    const newStart = loopStart - loopDuration;
    const newEnd = loopEnd - loopDuration;

    if (newStart < 0) {
        console.log('Cannot shift loop before start of track');
        return;
    }

    loopStart = newStart;
    loopEnd = newEnd;
    console.log(`Loop shifted left: ${loopStart.toFixed(2)}s - ${loopEnd.toFixed(2)}s`);
    callbacks.recordAction('shiftLoopLeft', { loopStart, loopEnd, loopDuration });

    handleJumpAfterLoopChange();
    updateLoopVisuals();
}

/**
 * Shift loop right by one loop duration
 */
export function shiftLoopRight() {
    const wavesurfer = state.getWavesurfer();
    if (!cycleMode || loopStart === null || loopEnd === null || !wavesurfer) {
        console.log('No active loop to shift');
        return;
    }

    const loopDuration = loopEnd - loopStart;
    const trackDuration = wavesurfer.getDuration();
    const newStart = loopStart + loopDuration;
    const newEnd = loopEnd + loopDuration;

    if (newEnd > trackDuration) {
        console.log('Cannot shift loop past end of track');
        return;
    }

    loopStart = newStart;
    loopEnd = newEnd;
    console.log(`Loop shifted right: ${loopStart.toFixed(2)}s - ${loopEnd.toFixed(2)}s`);
    callbacks.recordAction('shiftLoopRight', { loopStart, loopEnd, loopDuration });

    handleJumpAfterLoopChange();
    updateLoopVisuals();
}

/**
 * Halve loop length
 */
export function halfLoopLength() {
    if (!cycleMode || loopStart === null || loopEnd === null) {
        console.log('No active loop to modify');
        return;
    }

    const loopDuration = loopEnd - loopStart;
    const newDuration = loopDuration / 2;

    if (newDuration < 0.1) {
        console.log('Loop too short to halve');
        return;
    }

    loopEnd = loopStart + newDuration;
    console.log(`Loop halved: ${loopStart.toFixed(2)}s - ${loopEnd.toFixed(2)}s (${newDuration.toFixed(1)}s)`);
    callbacks.recordAction('halfLoopLength', { loopStart, loopEnd, loopDuration: newDuration });

    handleJumpToLoopStart();
    updateLoopVisuals();
}

/**
 * Double loop length
 */
export function doubleLoopLength() {
    const wavesurfer = state.getWavesurfer();
    if (!cycleMode || loopStart === null || loopEnd === null || !wavesurfer) {
        console.log('No active loop to modify');
        return;
    }

    const loopDuration = loopEnd - loopStart;
    const newDuration = loopDuration * 2;
    const newEnd = loopStart + newDuration;
    const trackDuration = wavesurfer.getDuration();

    if (newEnd > trackDuration) {
        console.log('Cannot double loop - would exceed track duration');
        return;
    }

    loopEnd = newEnd;
    console.log(`Loop doubled: ${loopStart.toFixed(2)}s - ${loopEnd.toFixed(2)}s (${newDuration.toFixed(1)}s)`);
    callbacks.recordAction('doubleLoopLength', { loopStart, loopEnd, loopDuration: newDuration });

    handleJumpToLoopStart();
    updateLoopVisuals();
}

/**
 * Move loop start marker left (expand from left)
 */
export function moveStartLeft() {
    if (!cycleMode || loopStart === null || loopEnd === null) {
        console.log('No active loop');
        return;
    }

    const currentMarkers = state.getCurrentMarkers();
    let newLoopStart;

    if (currentMarkers.length === 0) {
        newLoopStart = Math.max(0, loopStart - 0.01);
        console.log(`Start marker nudged left to ${newLoopStart.toFixed(2)}s (loop now ${(loopEnd - newLoopStart).toFixed(2)}s)`);
    } else {
        let prevMarker = null;
        for (let i = currentMarkers.length - 1; i >= 0; i--) {
            const markerTime = currentMarkers[i];
            if (markerTime < loopStart) {
                prevMarker = markerTime;
                break;
            }
        }

        if (prevMarker === null) {
            console.log('No marker found before loop start');
            return;
        }

        newLoopStart = prevMarker;
        console.log(`Start marker moved left to ${newLoopStart.toFixed(2)}s (loop now ${(loopEnd - newLoopStart).toFixed(1)}s)`);
    }

    loopStart = newLoopStart;
    callbacks.recordAction('moveStartLeft', { loopStart, loopEnd, loopDuration: loopEnd - loopStart });

    handleJumpToLoopStart();
    updateLoopVisuals();
}

/**
 * Move loop start marker right (shrink from left)
 */
export function moveStartRight() {
    if (!cycleMode || loopStart === null || loopEnd === null) {
        console.log('No active loop');
        return;
    }

    const currentMarkers = state.getCurrentMarkers();
    let newLoopStart;

    if (currentMarkers.length === 0) {
        newLoopStart = Math.min(loopEnd - 0.01, loopStart + 0.01);
        console.log(`Start marker nudged right to ${newLoopStart.toFixed(2)}s (loop now ${(loopEnd - newLoopStart).toFixed(2)}s)`);
    } else {
        let nextMarker = null;
        for (const markerTime of currentMarkers) {
            if (markerTime > loopStart && markerTime < loopEnd) {
                nextMarker = markerTime;
                break;
            }
        }

        if (nextMarker === null) {
            console.log('No marker found between start and end');
            return;
        }

        newLoopStart = nextMarker;
        console.log(`Start marker moved right to ${newLoopStart.toFixed(2)}s (loop now ${(loopEnd - newLoopStart).toFixed(1)}s)`);
    }

    loopStart = newLoopStart;
    callbacks.recordAction('moveStartRight', { loopStart, loopEnd, loopDuration: loopEnd - loopStart });

    handleJumpToLoopStart();
    updateLoopVisuals();
}

/**
 * Move loop end marker right (expand from right)
 */
export function moveEndRight() {
    const wavesurfer = state.getWavesurfer();
    if (!cycleMode || loopStart === null || loopEnd === null) {
        console.log('No active loop');
        return;
    }

    const currentMarkers = state.getCurrentMarkers();
    let newLoopEnd;

    if (currentMarkers.length === 0) {
        const duration = wavesurfer ? wavesurfer.getDuration() : Infinity;
        newLoopEnd = Math.min(duration, loopEnd + 0.01);
        console.log(`End marker nudged right to ${newLoopEnd.toFixed(2)}s (loop now ${(newLoopEnd - loopStart).toFixed(2)}s)`);
    } else {
        let nextMarker = null;
        for (const markerTime of currentMarkers) {
            if (markerTime > loopEnd) {
                nextMarker = markerTime;
                break;
            }
        }

        if (nextMarker === null) {
            console.log('No marker found after loop end');
            return;
        }

        newLoopEnd = nextMarker;
        console.log(`End marker moved right to ${newLoopEnd.toFixed(2)}s (loop now ${(newLoopEnd - loopStart).toFixed(1)}s)`);
    }

    loopEnd = newLoopEnd;
    callbacks.recordAction('moveEndRight', { loopStart, loopEnd, loopDuration: loopEnd - loopStart });

    handleJumpToLoopStart();
    updateLoopVisuals();
}

/**
 * Move loop end marker left (shrink from right)
 */
export function moveEndLeft() {
    if (!cycleMode || loopStart === null || loopEnd === null) {
        console.log('No active loop');
        return;
    }

    const currentMarkers = state.getCurrentMarkers();
    let newLoopEnd;

    if (currentMarkers.length === 0) {
        newLoopEnd = Math.max(loopStart + 0.01, loopEnd - 0.01);
        console.log(`End marker nudged left to ${newLoopEnd.toFixed(2)}s (loop now ${(newLoopEnd - loopStart).toFixed(2)}s)`);
    } else {
        let prevMarker = null;
        for (let i = currentMarkers.length - 1; i >= 0; i--) {
            const markerTime = currentMarkers[i];
            if (markerTime < loopEnd && markerTime > loopStart) {
                prevMarker = markerTime;
                break;
            }
        }

        if (prevMarker === null) {
            console.log('No marker found between start and end');
            return;
        }

        newLoopEnd = prevMarker;
        console.log(`End marker moved left to ${newLoopEnd.toFixed(2)}s (loop now ${(newLoopEnd - loopStart).toFixed(1)}s)`);
    }

    loopEnd = newLoopEnd;
    callbacks.recordAction('moveEndLeft', { loopStart, loopEnd, loopDuration: loopEnd - loopStart });

    handleJumpToLoopStart();
    updateLoopVisuals();
}

// ===================================================================
// JUMP HELPERS (Immediate vs Clock Mode)
// ===================================================================

/**
 * Handle jump after loop change (shift operations)
 */
function handleJumpAfterLoopChange() {
    const wavesurfer = state.getWavesurfer();
    if (!wavesurfer) return;

    const loopDuration = loopEnd - loopStart;

    if (immediateJump === 'on') {
        const currentTime = wavesurfer.getCurrentTime();
        const oldLoopStart = loopStart + loopDuration;
        const oldLoopEnd = loopEnd + loopDuration;

        let relativePosition = 0;
        if (currentTime >= oldLoopStart && currentTime <= oldLoopEnd) {
            relativePosition = (currentTime - oldLoopStart) / loopDuration;
        }

        const newTime = loopStart + (relativePosition * loopDuration);
        wavesurfer.seekTo(newTime / wavesurfer.getDuration());
        console.log(`Jumped to relative position in new loop: ${newTime.toFixed(2)}s (${(relativePosition * 100).toFixed(1)}% through loop)`);
    } else if (immediateJump === 'clock') {
        callbacks.setPendingJumpTarget(loopStart);
        console.log(`Clock mode: will jump to loop start (${loopStart.toFixed(2)}s) on next beat`);
    }
}

/**
 * Handle jump to loop start (resize/move operations)
 */
function handleJumpToLoopStart() {
    const wavesurfer = state.getWavesurfer();
    if (!wavesurfer) return;

    if (immediateJump === 'on') {
        wavesurfer.seekTo(loopStart / wavesurfer.getDuration());
        console.log(`Jumped to loop start: ${loopStart.toFixed(2)}s`);
    } else if (immediateJump === 'clock') {
        callbacks.setPendingJumpTarget(loopStart);
        console.log(`Clock mode: will jump to loop start (${loopStart.toFixed(2)}s) on next beat`);
    }
}

// ===================================================================
// LOOP SETTINGS & TOGGLES
// ===================================================================

/**
 * Toggle seek on click mode (off → seek → clock → off)
 */
export function toggleSeekOnClick() {
    if (seekOnClick === 'off') {
        seekOnClick = 'seek';
    } else if (seekOnClick === 'seek') {
        seekOnClick = 'clock';
    } else {
        seekOnClick = 'off';
    }
    console.log(`Seek mode: ${seekOnClick.toUpperCase()}`);
    updateLoopVisuals();
}

/**
 * Toggle immediate jump mode (off → on → clock → off)
 */
export function toggleImmediateJump() {
    if (immediateJump === 'off') {
        immediateJump = 'on';
    } else if (immediateJump === 'on') {
        immediateJump = 'clock';
    } else {
        immediateJump = 'off';
    }
    console.log(`Jump mode: ${immediateJump.toUpperCase()}`);
    updateLoopVisuals();
}

/**
 * Toggle loop fades on/off
 */
export function toggleLoopFades() {
    loopFadesEnabled = !loopFadesEnabled;
    console.log(`Loop fades: ${loopFadesEnabled ? 'ON' : 'OFF'}`);
    updateLoopVisuals();
}

/**
 * Set fade time in milliseconds
 */
export function setFadeTime(milliseconds) {
    fadeTime = milliseconds / 1000;
    console.log(`Fade time: ${milliseconds}ms`);

    const display = document.getElementById('fadeTimeValue');
    if (display) {
        display.textContent = `${milliseconds}ms`;
    }
}

/**
 * Toggle preserve loop on file change
 */
export function togglePreserveLoop() {
    preserveLoopOnFileChange = !preserveLoopOnFileChange;
    console.log(`Preserve loop on file change: ${preserveLoopOnFileChange ? 'ON' : 'OFF'}`);
    updateLoopVisuals();
}

/**
 * Toggle BPM lock
 */
export function toggleBPMLock() {
    bpmLockEnabled = !bpmLockEnabled;

    if (bpmLockEnabled) {
        const audioFiles = callbacks.getAudioFiles();
        const currentFileId = callbacks.getCurrentFileId();
        const currentFile = audioFiles.find(f => f.id === currentFileId);
        if (currentFile && currentFile.bpm) {
            lockedBPM = currentFile.bpm;
            console.log(`[BPM LOCK] Enabled - locked to ${lockedBPM} BPM`);
        } else {
            console.log('[BPM LOCK] Enabled but no BPM data for current file');
            lockedBPM = null;
        }
    } else {
        console.log('[BPM LOCK] Disabled');
        lockedBPM = null;
    }

    updateLoopVisuals();
}

/**
 * Toggle loop controls expanded/collapsed
 */
export function toggleLoopControlsExpanded() {
    loopControlsExpanded = !loopControlsExpanded;
    console.log(`Loop controls ${loopControlsExpanded ? 'expanded' : 'collapsed'}`);
    updateLoopVisuals();
}

// ===================================================================
// VISUAL UPDATES
// ===================================================================

/**
 * Update all loop-related UI elements
 */
export function updateLoopVisuals() {
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
        cycleBtn.classList.toggle('active', cycleMode);
    }

    // Show/hide seek on click button
    if (seekOnClickBtn) {
        seekOnClickBtn.style.display = cycleMode ? 'inline-block' : 'none';
        const buttonText = seekOnClick === 'off' ? 'SEEK' : seekOnClick.toUpperCase();
        seekOnClickBtn.querySelector('span').textContent = buttonText;
        seekOnClickBtn.classList.toggle('active', seekOnClick !== 'off');
    }

    // Show/hide clear loop button
    const clearLoopBtn = document.getElementById('clearLoopBtn');
    if (clearLoopBtn) {
        clearLoopBtn.style.display = cycleMode ? 'inline-block' : 'none';
    }

    // Update loop status text
    if (loopStatus) {
        updateLoopStatusText(loopStatus);
    }

    // Show/hide expand button and loop controls
    const showExpandBtn = cycleMode && loopStart !== null && loopEnd !== null;
    if (expandLoopBtn) {
        expandLoopBtn.style.display = showExpandBtn ? 'inline-block' : 'none';
        expandLoopBtn.querySelector('span').textContent = loopControlsExpanded ? '▲' : '▼';
    }

    if (loopControlsContainer) {
        loopControlsContainer.style.display = (showExpandBtn && loopControlsExpanded) ? 'flex' : 'none';
    }

    // Update jump button
    if (jumpBtn) {
        const buttonText = immediateJump === 'off' ? 'JMP' : immediateJump.toUpperCase();
        jumpBtn.querySelector('span').textContent = buttonText;
        jumpBtn.classList.toggle('active', immediateJump !== 'off');
    }

    // Update fade button
    if (fadeBtn) {
        fadeBtn.classList.toggle('active', loopFadesEnabled);
    }

    // Update preserve loop button
    if (preserveLoopBtn) {
        preserveLoopBtn.classList.toggle('active', preserveLoopOnFileChange);
    }

    // Update BPM lock button
    if (bpmLockBtn) {
        bpmLockBtn.classList.toggle('active', bpmLockEnabled);
    }

    // Update visual loop region
    updateLoopRegion();
}

/**
 * Update loop status text with duration and bar/beat info
 */
function updateLoopStatusText(loopStatus) {
    const hasLoop = loopStart !== null && loopEnd !== null;

    if (!cycleMode && !hasLoop) {
        loopStatus.textContent = 'Off';
        loopStatus.style.color = '#666';
    } else if (cycleMode && loopStart === null) {
        loopStatus.textContent = 'Click start';
        loopStatus.style.color = '#f59e0b';
    } else if (cycleMode && loopEnd === null) {
        loopStatus.textContent = 'Click end →';
        loopStatus.style.color = '#f59e0b';
    } else if (hasLoop) {
        const duration = loopEnd - loopStart;
        let statusText = `${duration.toFixed(1)}s`;

        // Add bar/beat count if beatmap data exists
        const audioFiles = callbacks.getAudioFiles();
        const currentFileId = callbacks.getCurrentFileId();
        const currentFile = audioFiles.find(f => f.id === currentFileId);

        if (currentFile && currentFile.beatmap && currentFile.beatmap.length > 0) {
            const beatsInLoop = currentFile.beatmap.filter(beat =>
                beat.time >= loopStart && beat.time < loopEnd
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
 */
export function updateLoopRegion() {
    const waveformContainer = document.getElementById('waveform');
    if (!waveformContainer) return;

    // Remove existing loop region and progress mask
    const existingRegion = waveformContainer.querySelector('.loop-region');
    const existingMask = waveformContainer.querySelector('.loop-progress-mask');
    if (existingRegion) existingRegion.remove();
    if (existingMask) existingMask.remove();

    // Don't draw if cycle mode is off or loop not fully set
    const wavesurfer = state.getWavesurfer();
    if (!cycleMode || loopStart === null || loopEnd === null || !wavesurfer) return;

    const duration = wavesurfer.getDuration();
    if (duration === 0) return;

    const startPercent = (loopStart / duration) * 100;
    const endPercent = (loopEnd / duration) * 100;
    const widthPercent = endPercent - startPercent;

    const loopRegion = document.createElement('div');
    loopRegion.className = 'loop-region';
    loopRegion.style.left = `${startPercent}%`;
    loopRegion.style.width = `${widthPercent}%`;
    waveformContainer.appendChild(loopRegion);

    // Add progress mask to hide blue progress before loop start
    if (cycleMode && startPercent > 0) {
        const progressMask = document.createElement('div');
        progressMask.className = 'loop-progress-mask';
        progressMask.style.width = `${startPercent}%`;
        waveformContainer.appendChild(progressMask);
    }
}
