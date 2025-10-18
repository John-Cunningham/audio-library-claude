/**
 * ActionRecorder Service
 *
 * Records and plays back user actions (loop manipulations, playback controls).
 * This is a standalone feature for replaying sequences of player actions.
 *
 * Features:
 * - Record user actions with timing
 * - Playback recorded sequences
 * - Button state management
 * - Stop/cancel playback
 *
 * Architecture: Service class with dependency injection
 * Used by: app.js (thin wrapper delegates to this service)
 */

export class ActionRecorder {
    constructor(dependencies) {
        // State
        this.isRecording = false;
        this.recordingWaiting = false;
        this.recordedActions = [];
        this.recordingStartTime = null;
        this.isPlayingBack = false;
        this.playbackTimeouts = [];

        // Dependencies
        this.getWavesurfer = dependencies.getWavesurfer;
        this.updateLoopVisuals = dependencies.updateLoopVisuals;
        this.loopActions = dependencies.loopActions;
        this.setPlaybackRate = dependencies.setPlaybackRate;

        // State setters for keyboard shortcuts integration
        this.setRecordingWaitingCallback = null;
        this.setIsRecordingCallback = null;
        this.setRecordingStartTimeCallback = null;
    }

    /**
     * Register callbacks for state updates (used by keyboard shortcuts)
     */
    registerStateCallbacks(callbacks) {
        this.setRecordingWaitingCallback = callbacks.setRecordingWaiting;
        this.setIsRecordingCallback = callbacks.setIsRecording;
        this.setRecordingStartTimeCallback = callbacks.setRecordingStartTime;
    }

    /**
     * Get recording waiting state (for keyboard shortcuts)
     */
    getRecordingWaiting() {
        return this.recordingWaiting;
    }

    /**
     * Set recording waiting state (for keyboard shortcuts)
     */
    setRecordingWaiting(value) {
        this.recordingWaiting = value;
        if (this.setRecordingWaitingCallback) {
            this.setRecordingWaitingCallback(value);
        }
    }

    /**
     * Set recording active state (for keyboard shortcuts)
     */
    setIsRecording(value) {
        this.isRecording = value;
        if (this.setIsRecordingCallback) {
            this.setIsRecordingCallback(value);
        }
    }

    /**
     * Set recording start time (for keyboard shortcuts)
     */
    setRecordingStartTime(value) {
        this.recordingStartTime = value;
        if (this.setRecordingStartTimeCallback) {
            this.setRecordingStartTimeCallback(value);
        }
    }

    /**
     * Get recorded actions array (for keyboard shortcuts)
     */
    getRecordedActions() {
        return this.recordedActions;
    }

    /**
     * Toggle recording mode
     */
    toggleRecording() {
        if (!this.isRecording && !this.recordingWaiting) {
            // Start recording mode - wait for first keypress
            this.setRecordingWaiting(true);
            this.setIsRecording(false);
            this.recordedActions = [];
            this.setRecordingStartTime(null);
            console.log('[RECORD] Recording armed - waiting for first keypress to start...');
            this.updateLoopVisuals();
        } else {
            // Stop recording
            this.setRecordingWaiting(false);
            this.setIsRecording(false);
            console.log('[RECORD] Recording stopped');
            console.log(`[RECORD] Captured ${this.recordedActions.length} actions:`);
            this.recordedActions.forEach((action, i) => {
                console.log(`  [${i}] ${action.time.toFixed(3)}s: ${action.action}`, action.data);
            });
            this.updateLoopVisuals();
        }
    }

    /**
     * Record an action
     * @param {string} actionName - Name of action
     * @param {object} data - Action data
     */
    recordAction(actionName, data = {}) {
        if (!this.isRecording || !this.recordingStartTime) return;

        const wavesurfer = this.getWavesurfer();
        const currentTime = wavesurfer ? wavesurfer.getCurrentTime() : 0;
        const relativeTime = currentTime - this.recordingStartTime;

        const action = {
            time: relativeTime,
            playbackTime: currentTime,
            action: actionName,
            data: data
        };

        this.recordedActions.push(action);
        console.log(`[RECORD] ${relativeTime.toFixed(3)}s: ${actionName}`, data);
    }

    /**
     * Play back recorded actions
     */
    playRecordedActions() {
        console.log(`[PLAYBACK] playRecordedActions() called`);

        // If already playing, STOP playback instead
        if (this.isPlayingBack) {
            this.stopPlayback();
            return;
        }

        console.log(`[PLAYBACK] recordedActions.length = ${this.recordedActions.length}`);

        if (this.recordedActions.length === 0) {
            console.log('[PLAYBACK] No recorded actions to play');
            alert('No recorded actions to play. Press RECORD button first, then perform actions, then stop recording.');
            return;
        }

        console.log(`[PLAYBACK] Starting playback of ${this.recordedActions.length} actions`);
        console.log('[PLAYBACK] Recorded actions:', this.recordedActions);

        // Set playback state and update button
        this.isPlayingBack = true;
        this.updateLoopVisuals();

        // Calculate total duration of playback
        const lastAction = this.recordedActions[this.recordedActions.length - 1];
        const totalDuration = lastAction.time * 1000; // Convert to milliseconds

        // Schedule cleanup when playback finishes
        const cleanupTimeout = setTimeout(() => {
            this.isPlayingBack = false;
            this.playbackTimeouts = [];
            this.updateLoopVisuals();
            console.log('[PLAYBACK] Playback complete');
        }, totalDuration + 100); // Add 100ms buffer

        this.playbackTimeouts.push(cleanupTimeout);

        const wavesurfer = this.getWavesurfer();

        // Schedule each action
        this.recordedActions.forEach((action) => {
            const actionTimeout = setTimeout(() => {
                console.log(`[PLAYBACK] ${action.time.toFixed(3)}s: ${action.action}`, action.data);

                // Execute the action
                switch(action.action) {
                    case 'initialState':
                        // Restore initial state
                        this._restoreInitialState(action.data, wavesurfer);
                        break;
                    case 'shiftLoopLeft':
                        this.loopActions.shiftLoopLeft();
                        break;
                    case 'shiftLoopRight':
                        this.loopActions.shiftLoopRight();
                        break;
                    case 'moveStartRight':
                        this.loopActions.moveStartRight();
                        break;
                    case 'moveEndLeft':
                        this.loopActions.moveEndLeft();
                        break;
                    case 'halfLoopLength':
                        this.loopActions.halfLoopLength();
                        break;
                    case 'doubleLoopLength':
                        this.loopActions.doubleLoopLength();
                        break;
                    case 'setLoopStart':
                        this.loopActions.setLoopStart(action.data);
                        break;
                    case 'setLoopEnd':
                        this.loopActions.setLoopEnd(action.data);
                        break;
                    case 'play':
                        if (wavesurfer && !wavesurfer.isPlaying()) {
                            wavesurfer.play();
                        }
                        break;
                    case 'pause':
                        if (wavesurfer && wavesurfer.isPlaying()) {
                            wavesurfer.pause();
                        }
                        break;
                    case 'setRate':
                        this.setPlaybackRate(action.data.rate);
                        break;
                    default:
                        console.log(`[PLAYBACK] Unknown action: ${action.action}`);
                }
            }, action.time * 1000); // Convert to milliseconds

            this.playbackTimeouts.push(actionTimeout);
        });

        console.log('[PLAYBACK] All actions scheduled');
    }

    /**
     * Restore initial state during playback
     * @private
     */
    _restoreInitialState(state, wavesurfer) {
        console.log(`[PLAYBACK] Restoring initial state - isPlaying was: ${state.isPlaying}`);

        if (state.loopStart !== null && state.loopEnd !== null) {
            this.loopActions.restoreLoop(state.loopStart, state.loopEnd);
        }

        this.loopActions.setCycleMode(state.cycleMode);

        if (state.rate) {
            this.setPlaybackRate(state.rate);
        }

        if (state.volume) {
            document.getElementById('volumeSlider').value = state.volume;
        }

        if (wavesurfer) {
            wavesurfer.seekTo(state.playbackTime / wavesurfer.getDuration());
            console.log(`[PLAYBACK] Seeked to ${state.playbackTime.toFixed(3)}s`);

            if (state.isPlaying && !wavesurfer.isPlaying()) {
                console.log('[PLAYBACK] Starting playback (was playing in recording)');
                wavesurfer.play();
            } else if (!state.isPlaying && wavesurfer.isPlaying()) {
                console.log('[PLAYBACK] Pausing playback (was paused in recording)');
                wavesurfer.pause();
            } else {
                console.log(`[PLAYBACK] No playback state change needed (isPlaying: ${state.isPlaying})`);
            }
        }

        this.updateLoopVisuals();
        console.log('[PLAYBACK] Initial state restored');
    }

    /**
     * Stop playback and cancel all scheduled actions
     */
    stopPlayback() {
        // Cancel all scheduled timeouts
        this.playbackTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.playbackTimeouts = [];

        // Reset state
        this.isPlayingBack = false;
        this.updateLoopVisuals();
        console.log('[PLAYBACK] Playback stopped');
    }

    /**
     * Update button states (called from updateLoopVisuals)
     */
    updateButtonStates() {
        // Update record actions button state
        const recordActionsBtn = document.getElementById('recordActionsBtn');
        if (recordActionsBtn) {
            if (this.recordingWaiting) {
                recordActionsBtn.classList.add('active');
                recordActionsBtn.classList.remove('flashing');
                recordActionsBtn.style.background = '#ff9944'; // Orange when waiting
            } else if (this.isRecording) {
                recordActionsBtn.classList.add('active');
                recordActionsBtn.classList.add('flashing'); // Smooth flash while recording
                recordActionsBtn.style.background = '#ff4444'; // Red when recording
            } else {
                recordActionsBtn.classList.remove('active');
                recordActionsBtn.classList.remove('flashing');
                recordActionsBtn.style.background = '';
            }
        }

        // Update play actions button state
        const playActionsBtn = document.getElementById('playActionsBtn');
        if (playActionsBtn) {
            if (this.isPlayingBack) {
                playActionsBtn.classList.add('active');
                playActionsBtn.classList.add('flashing-green'); // Smooth green flash while playing back
                playActionsBtn.style.background = '#44ff44'; // Green when playing back
            } else {
                playActionsBtn.classList.remove('active');
                playActionsBtn.classList.remove('flashing-green');
                playActionsBtn.style.background = '';
            }
        }
    }
}
