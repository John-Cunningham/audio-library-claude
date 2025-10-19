/**
 * Keyboard Shortcuts Module
 *
 * Global keyboard shortcuts for the audio library player.
 * Handles all keyboard controls except modal-specific shortcuts.
 *
 * Usage:
 *   import { initKeyboardShortcuts } from './keyboardShortcuts.js';
 *   initKeyboardShortcuts(callbacks);
 */

/**
 * Initialize keyboard shortcuts
 * @param {Object} callbacks - Object containing all callback functions
 * @param {Function} callbacks.playPause - Play/pause toggle
 * @param {Function} callbacks.toggleMarkers - Toggle bar markers
 * @param {Function} callbacks.toggleMetronome - Toggle metronome
 * @param {Function} callbacks.toggleCycleMode - Toggle cycle mode
 * @param {Function} callbacks.toggleLoop - Toggle track loop
 * @param {Function} callbacks.resetLoop - Reset/clear loop
 * @param {Function} callbacks.toggleShuffle - Toggle shuffle mode
 * @param {Function} callbacks.toggleImmediateJump - Toggle immediate jump
 * @param {Function} callbacks.setVolume - Set volume
 * @param {Function} callbacks.previousTrack - Go to previous track
 * @param {Function} callbacks.nextTrack - Go to next track
 * @param {Function} callbacks.loadAudio - Load audio file
 * @param {Function} callbacks.batchEditTags - Open batch edit tags modal
 * @param {Function} callbacks.shiftLoopLeft - Shift loop region left
 * @param {Function} callbacks.shiftLoopRight - Shift loop region right
 * @param {Function} callbacks.halfLoopLength - Halve loop length
 * @param {Function} callbacks.doubleLoopLength - Double loop length
 * @param {Function} callbacks.moveStartLeft - Move loop start marker left
 * @param {Function} callbacks.moveStartRight - Move loop start marker right
 * @param {Function} callbacks.moveEndLeft - Move loop end marker left
 * @param {Function} callbacks.moveEndRight - Move loop end marker right
 * @param {Function} callbacks.filterFiles - Get filtered file list
 * @param {Object} state - Object containing reactive state getters
 * @param {Function} state.getCurrentFileId - Get current file ID
 * @param {Function} state.getSelectedFiles - Get selected files Set
 * @param {Function} state.getCycleMode - Get cycle mode state
 * @param {Function} state.getLoopStart - Get loop start time
 * @param {Function} state.getLoopEnd - Get loop end time
 * @param {Function} state.getUserPaused - Get user paused state
 * @param {Function} state.getWavesurfer - Get wavesurfer instance
 * @param {Function} state.getRecordingWaitingForStart - Get recording waiting state
 * @param {Function} state.setRecordingWaitingForStart - Set recording waiting state
 * @param {Function} state.setIsRecordingActions - Set recording active state
 * @param {Function} state.setRecordingStartTime - Set recording start time
 * @param {Function} state.getRecordedActions - Get recorded actions array
 * @param {Function} state.getMarkersEnabled - Get markers enabled state
 * @param {Function} state.getLoopFadesEnabled - Get loop fades enabled state
 * @param {Function} state.getImmediateJump - Get immediate jump mode
 * @param {Function} state.getSeekOnClick - Get seek on click mode
 * @param {Function} state.getCurrentRate - Get current playback rate
 * @param {Function} state.updateLoopVisuals - Update loop visual indicators
 * @param {Function} state.recordAction - Record an action
 * @param {Function} state.isMetronomeEnabled - Get metronome enabled state
 */
export function initKeyboardShortcuts(callbacks, state) {
    let lastLoggedKey = null; // Define in closure scope, not on 'this'

    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts if user is typing in an input field or modal is open
        const modal = document.getElementById('editTagsModal');
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || modal?.classList.contains('active')) {
            return;
        }

        // Don't trigger shortcuts if modifier keys are held (allow browser shortcuts like Cmd+R)
        if (e.metaKey || e.ctrlKey || e.altKey) {
            return;
        }

        // Don't trigger shortcuts if pointer is locked for Galaxy View navigation
        // Galaxy View has its own spacebar handler in galaxyInteraction.js
        const isPointerLocked = window.isPointerLocked || false;
        if (isPointerLocked) {
            // Only log once per key press to reduce spam
            if (!lastLoggedKey || lastLoggedKey !== e.key) {
                console.log('[KeyboardShortcuts] Pointer locked, skipping shortcuts (Galaxy View handles them)');
                lastLoggedKey = e.key;
            }
            return;
        } else {
            lastLoggedKey = null; // Reset when not locked
        }

        // Special case: In Galaxy View but pointer NOT locked, spacebar should still work
        // Don't let galaxyInteraction.js handle it since onKeyDown might still fire
        const inGalaxyView = window.currentView === 'galaxy' || document.getElementById('galaxyViewContainer')?.style.display !== 'none';
        const isSpacebar = e.key === ' ';

        if (inGalaxyView && isSpacebar && !isPointerLocked) {
            // Prevent galaxyInteraction from also handling it
            e.stopPropagation();
        }

        // If recording is waiting for first keypress, start recording now
        const wavesurfer = state.getWavesurfer();
        if (state.getRecordingWaitingForStart() && wavesurfer) {
            state.setRecordingWaitingForStart(false);
            state.setIsRecordingActions(true);
            const recordingStartTime = wavesurfer.getCurrentTime();
            state.setRecordingStartTime(recordingStartTime);

            // Capture playing state immediately
            const isCurrentlyPlaying = wavesurfer.isPlaying();
            console.log(`[RECORD] Capturing initial state - wavesurfer.isPlaying() = ${isCurrentlyPlaying}`);

            // Record initial state
            const initialState = {
                playbackTime: recordingStartTime,
                loopStart: state.getLoopStart(),
                loopEnd: state.getLoopEnd(),
                cycleMode: state.getCycleMode(),
                rate: state.getCurrentRate(),
                volume: parseInt(document.getElementById('volumeSlider')?.value || 100),
                isPlaying: isCurrentlyPlaying,
                currentFileId: state.getCurrentFileId(),
                markersEnabled: state.getMarkersEnabled(),
                metronomeEnabled: state.isMetronomeEnabled(),
                loopFadesEnabled: state.getLoopFadesEnabled(),
                immediateJump: state.getImmediateJump(),
                seekOnClick: state.getSeekOnClick()
            };

            const recordedActions = state.getRecordedActions();
            recordedActions.push({
                time: 0,
                playbackTime: recordingStartTime,
                action: 'initialState',
                data: initialState
            });

            console.log(`[RECORD] Recording started at ${recordingStartTime.toFixed(3)}s`);
            console.log('[RECORD] Initial state captured:', initialState);
            state.updateLoopVisuals();
        }

        const filteredFiles = callbacks.filterFiles();
        if (filteredFiles.length === 0) return;

        const currentFileId = state.getCurrentFileId();
        const currentIndex = filteredFiles.findIndex(f => f.id === currentFileId);
        const cycleMode = state.getCycleMode();
        const loopStart = state.getLoopStart();
        const loopEnd = state.getLoopEnd();
        const userPaused = state.getUserPaused();

        switch(e.key.toLowerCase()) {
            case 'arrowleft':
                e.preventDefault();
                if (e.shiftKey && cycleMode && loopStart !== null && loopEnd !== null) {
                    // Shift+Left: Move START marker left (expand from left)
                    callbacks.moveStartLeft();
                } else if (cycleMode && loopStart !== null && loopEnd !== null) {
                    // In cycle mode with full loop: Left arrow = shift loop left
                    callbacks.shiftLoopLeft();
                } else {
                    // Left: Previous track
                    callbacks.previousTrack();
                }
                break;

            case 'arrowright':
                e.preventDefault();
                if (e.shiftKey && cycleMode && loopStart !== null && loopEnd !== null) {
                    // Shift+Right: Move START marker right (shrink from left)
                    callbacks.moveStartRight();
                } else if (cycleMode && loopStart !== null && loopEnd !== null) {
                    // In cycle mode with full loop: Right arrow = shift loop right
                    callbacks.shiftLoopRight();
                } else {
                    // Right: Next track
                    callbacks.nextTrack();
                }
                break;

            case 'arrowup':
                e.preventDefault();
                if (e.shiftKey && cycleMode && loopStart !== null && loopEnd !== null) {
                    // Shift+Up: Move END marker right (expand loop)
                    callbacks.moveEndRight();
                } else if (cycleMode) {
                    // In edit loop mode: Up arrow = double loop length
                    callbacks.doubleLoopLength();
                } else {
                    // Up: Play previous file (respect pause state)
                    if (currentIndex > 0) {
                        callbacks.loadAudio(filteredFiles[currentIndex - 1].id, !userPaused);
                    } else {
                        // Wrap to last file
                        callbacks.loadAudio(filteredFiles[filteredFiles.length - 1].id, !userPaused);
                    }
                }
                break;

            case 'arrowdown':
                e.preventDefault();
                if (e.shiftKey && cycleMode && loopStart !== null && loopEnd !== null) {
                    // Shift+Down: Move END marker left (shrink loop)
                    callbacks.moveEndLeft();
                } else if (cycleMode) {
                    // In edit loop mode: Down arrow = half loop length
                    callbacks.halfLoopLength();
                } else {
                    // Down: Play next file (respect pause state)
                    if (currentIndex < filteredFiles.length - 1) {
                        callbacks.loadAudio(filteredFiles[currentIndex + 1].id, !userPaused);
                    } else {
                        // Wrap to first file
                        callbacks.loadAudio(filteredFiles[0].id, !userPaused);
                    }
                }
                break;

            case ' ':
            case 'spacebar':
                e.preventDefault();
                // Play/pause
                callbacks.playPause();
                break;

            case 'm':
                e.preventDefault();
                // Toggle bar markers
                callbacks.toggleMarkers();
                break;

            case 'k':
                e.preventDefault();
                // Toggle metronome
                callbacks.toggleMetronome(wavesurfer);
                break;

            case 'enter':
                e.preventDefault();
                // Open edit tags for current file
                if (currentFileId) {
                    const selectedFiles = state.getSelectedFiles();
                    selectedFiles.clear();
                    selectedFiles.add(currentFileId);

                    // Update checkboxes
                    document.querySelectorAll('.file-item input[type="checkbox"]').forEach(cb => {
                        cb.checked = false;
                    });
                    const checkbox = document.getElementById(`checkbox-${currentFileId}`);
                    if (checkbox) checkbox.checked = true;

                    callbacks.batchEditTags();
                }
                break;

            case 'c':
                e.preventDefault();
                // C: Toggle cycle mode (edit + play loop)
                callbacks.toggleCycleMode();
                break;

            case 'f':
                e.preventDefault();
                // F: Focus search field
                document.getElementById('searchBar')?.focus();
                break;

            case '-':
            case '_':
                e.preventDefault();
                // Minus key: Decrease volume by 10%
                {
                    const volumeSlider = document.getElementById('volumeSlider');
                    if (volumeSlider) {
                        const currentVolume = parseInt(volumeSlider.value);
                        const newVolume = Math.max(0, currentVolume - 10);
                        volumeSlider.value = newVolume;
                        callbacks.setVolume(newVolume);
                    }
                }
                break;

            case '=':
            case '+':
                e.preventDefault();
                // Equals/Plus key: Increase volume by 10%
                {
                    const volumeSlider = document.getElementById('volumeSlider');
                    if (volumeSlider) {
                        const currentVolume = parseInt(volumeSlider.value);
                        const newVolume = Math.min(398, currentVolume + 10);
                        volumeSlider.value = newVolume;
                        callbacks.setVolume(newVolume);
                    }
                }
                break;

            case 'l':
                e.preventDefault();
                if (e.shiftKey) {
                    // Shift+L: Clear/reset loop
                    callbacks.resetLoop();
                } else {
                    // L: Toggle loop
                    callbacks.toggleLoop();
                }
                break;

            case 'r':
                e.preventDefault();
                // R: Toggle shuffle
                callbacks.toggleShuffle();
                break;

            case 'j':
                e.preventDefault();
                // Toggle immediate jump on shift
                callbacks.toggleImmediateJump();
                break;

            case ',':
            case '<':
                e.preventDefault();
                // Comma: Previous track
                callbacks.previousTrack();
                break;

            case '.':
            case '>':
                e.preventDefault();
                // Period: Next track
                callbacks.nextTrack();
                break;

            case 's':
                e.preventDefault();
                // Toggle shuffle
                callbacks.toggleShuffle();
                break;

            case 'h':
                e.preventDefault();
                // Half loop length
                callbacks.halfLoopLength();
                break;

            case 'd':
                e.preventDefault();
                // Double loop length
                callbacks.doubleLoopLength();
                break;
        }
    });

    console.log('[KeyboardShortcuts] Initialized global keyboard shortcuts');
}
