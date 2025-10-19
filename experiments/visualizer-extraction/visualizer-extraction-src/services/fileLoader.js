/**
 * FileLoader Service
 *
 * Handles file lifecycle operations:
 * - Loading audio files
 * - Destroying old wavesurfer instances
 * - Loop preservation across file changes
 * - BPM lock application
 * - Stem pre-loading
 * - UI updates
 *
 * Architecture: Service class with dependency injection
 * Used by: app.js (thin wrapper delegates to this service)
 */

import { loadAudioIntoWaveSurfer } from '../utils/audioFetch.js';

export class FileLoader {
    constructor(dependencies) {
        // State
        this.audioFiles = dependencies.audioFiles;
        this.getCurrentFileId = dependencies.getCurrentFileId;
        this.setCurrentFileId = dependencies.setCurrentFileId;

        // Waveform management
        this.getWavesurfer = dependencies.getWavesurfer;
        this.setWavesurfer = dependencies.setWavesurfer;
        this.getParentWaveform = dependencies.getParentWaveform;
        this.getParentPlayerComponent = dependencies.getParentPlayerComponent;

        // Loop state
        this.getLoopState = dependencies.getLoopState;
        this.setLoopState = dependencies.setLoopState;
        this.getPreserveLoopOnFileChange = dependencies.getPreserveLoopOnFileChange;
        this.getPreservedLoopBars = dependencies.getPreservedLoopBars;
        this.setPreservedLoopBars = dependencies.setPreservedLoopBars;

        // Helpers
        this.resetLoop = dependencies.resetLoop;
        this.updateLoopVisuals = dependencies.updateLoopVisuals;
        this.getBarIndexAtTime = dependencies.getBarIndexAtTime;
        this.getTimeForBarIndex = dependencies.getTimeForBarIndex;
        this.destroyAllStems = dependencies.destroyAllStems;
        this.preloadMultiStemWavesurfers = dependencies.preloadMultiStemWavesurfers;
        this.updateStemsButton = dependencies.updateStemsButton;

        // BPM lock
        this.getBpmLockState = dependencies.getBpmLockState;
        this.setPlaybackRate = dependencies.setPlaybackRate;

        // UI
        this.getCurrentRate = dependencies.getCurrentRate;
        this.initWaveSurfer = dependencies.initWaveSurfer;
    }

    /**
     * Load an audio file
     * @param {string} fileId - ID of file to load
     * @param {boolean} autoplay - Whether to auto-play after loading
     * @returns {Promise<object>} - Loaded file state
     */
    async loadFile(fileId, autoplay = true) {
        const file = this.audioFiles().find(f => f.id === fileId);
        if (!file) {
            console.error(`[FileLoader] File not found: ${fileId}`);
            return null;
        }

        const currentFileId = this.getCurrentFileId();

        // Don't reload if this file is already loaded
        if (currentFileId === fileId) {
            console.log(`[FileLoader] File already loaded: ${fileId}`);
            return { file, alreadyLoaded: true };
        }

        console.log(`[FileLoader] Loading file: ${file.name} (${fileId})`);

        // Step 1: Preserve loop if enabled
        await this._preserveLoopState(currentFileId);

        // Step 2: Update current file ID
        this.setCurrentFileId(fileId);

        // Step 3: Reset or prepare loop state for new file
        this._prepareLoopState();

        // Step 4: Reset bar start offset
        this._resetBarStartOffset();

        // Step 5: Destroy old wavesurfer and stems
        this._destroyOldWavesurfer();
        this.destroyAllStems();

        // Step 6: Initialize new wavesurfer
        this.initWaveSurfer();
        const wavesurfer = this.getWavesurfer();

        // Step 7: Apply current volume and rate
        this._applyVolumeAndRate(wavesurfer);

        // Step 8: Load audio file with retry logic for QUIC errors
        loadAudioIntoWaveSurfer(wavesurfer, file.file_url, 'FileLoader')
            .catch(error => {
                console.error('[FileLoader] ❌ Failed to load audio file:', error);
                // Show error in UI
                document.getElementById('playerFilename').textContent = `Error: ${file.name}`;
                document.getElementById('playerTime').textContent = 'Failed to load';
            });

        // Step 9: Update player UI
        this._updatePlayerUI(file);

        // Step 10: Setup 'ready' event handler
        wavesurfer.once('ready', async () => {
            await this._handleWaveformReady(file, wavesurfer, autoplay);
        });

        // Step 11: Update file list highlighting
        this._updateFileListHighlighting(fileId);

        // Step 12: Update STEMS button
        this.updateStemsButton();

        return {
            file,
            wavesurfer,
            alreadyLoaded: false
        };
    }

    /**
     * Preserve loop state before changing files
     * @private
     */
    async _preserveLoopState(currentFileId) {
        const preserveLoopOnFileChange = this.getPreserveLoopOnFileChange();
        const loopState = this.getLoopState();
        const wavesurfer = this.getWavesurfer();

        if (preserveLoopOnFileChange &&
            loopState.start !== null &&
            loopState.end !== null &&
            currentFileId &&
            wavesurfer) {

            const currentFile = this.audioFiles().find(f => f.id === currentFileId);
            if (currentFile && currentFile.beatmap) {
                const preservedLoopStartBar = this.getBarIndexAtTime(loopState.start, currentFile);
                const preservedLoopEndBar = this.getBarIndexAtTime(loopState.end, currentFile);
                const preservedCycleMode = loopState.cycleMode;

                // Calculate relative position within loop for seamless swap
                const currentTime = wavesurfer.getCurrentTime();
                let preservedPlaybackPositionInLoop = null;

                if (currentTime >= loopState.start && currentTime <= loopState.end) {
                    const loopDuration = loopState.end - loopState.start;
                    preservedPlaybackPositionInLoop = (currentTime - loopState.start) / loopDuration;
                    console.log(`[FileLoader] Preserving loop: bar ${preservedLoopStartBar} to bar ${preservedLoopEndBar}, cycle mode: ${preservedCycleMode}, position in loop: ${(preservedPlaybackPositionInLoop * 100).toFixed(1)}%`);
                } else {
                    console.log(`[FileLoader] Preserving loop: bar ${preservedLoopStartBar} to bar ${preservedLoopEndBar}, cycle mode: ${preservedCycleMode}`);
                }

                this.setPreservedLoopBars({
                    startBar: preservedLoopStartBar,
                    endBar: preservedLoopEndBar,
                    cycleMode: preservedCycleMode,
                    playbackPositionInLoop: preservedPlaybackPositionInLoop
                });
            }
        }
    }

    /**
     * Prepare loop state for new file
     * @private
     */
    _prepareLoopState() {
        const preserveLoopOnFileChange = this.getPreserveLoopOnFileChange();
        const preservedBars = this.getPreservedLoopBars();

        if (!preserveLoopOnFileChange) {
            this.resetLoop();
            this.setPreservedLoopBars({
                startBar: null,
                endBar: null,
                cycleMode: false,
                playbackPositionInLoop: null
            });
        } else if (preservedBars.startBar !== null && preservedBars.endBar !== null) {
            // When preserving, temporarily clear loop points but KEEP cycle mode on
            this.setLoopState({
                start: null,
                end: null,
                cycleMode: preservedBars.cycleMode,
                nextClickSets: 'start'
            });
            this.updateLoopVisuals();
        }
    }

    /**
     * Reset bar start offset
     * @private
     */
    _resetBarStartOffset() {
        // Bar start offset is managed by app.js global state
        // This method is called by app.js wrapper
        const display = document.getElementById('barStartOffsetDisplay');
        if (display) {
            display.textContent = '0';
        }
    }

    /**
     * Destroy old wavesurfer instance
     * @private
     */
    _destroyOldWavesurfer() {
        const wavesurfer = this.getWavesurfer();
        if (wavesurfer) {
            wavesurfer.pause();
            wavesurfer.stop();
            wavesurfer.destroy();
            this.setWavesurfer(null);
        }
    }

    /**
     * Apply current volume and playback rate to wavesurfer
     * @private
     */
    _applyVolumeAndRate(wavesurfer) {
        // Apply current volume
        const volumeSlider = document.getElementById('volumeSlider');
        const currentVolume = volumeSlider ? volumeSlider.value / 100 : 1;
        wavesurfer.setVolume(currentVolume);

        // Apply current playback rate (natural analog - speed+pitch)
        const currentRate = this.getCurrentRate();
        wavesurfer.setPlaybackRate(currentRate, false);
    }

    /**
     * Update player UI with file info
     * @private
     */
    _updatePlayerUI(file) {
        document.getElementById('playerFilename').textContent = file.name;
        document.getElementById('playerTime').textContent = '0:00 / 0:00';
        document.getElementById('playPauseIcon').textContent = '▶';
    }

    /**
     * Handle waveform ready event
     * @private
     */
    async _handleWaveformReady(file, wavesurfer, autoplay) {
        // Ensure parent volume is restored (in case it was muted by stems)
        const volumeSlider = document.getElementById('volumeSlider');
        const currentVolume = volumeSlider ? volumeSlider.value / 100 : 1;
        wavesurfer.setVolume(currentVolume);
        console.log(`[FileLoader] Restored parent volume to ${(currentVolume * 100).toFixed(0)}%`);

        // Load file into parent player component (handles markers)
        const parentPlayerComponent = this.getParentPlayerComponent();
        if (parentPlayerComponent) {
            parentPlayerComponent.loadFile(file);
            console.log('[FileLoader] Loaded file into parentPlayerComponent (markers should render)');
        } else {
            console.warn('[FileLoader] parentPlayerComponent not available - markers may not render');
        }

        // BPM Lock: Auto-adjust playback rate to match locked BPM
        const bpmLockState = this.getBpmLockState();
        if (bpmLockState.enabled && bpmLockState.lockedBPM !== null && file.bpm) {
            const rateAdjustment = bpmLockState.lockedBPM / file.bpm;
            this.setPlaybackRate(rateAdjustment);
            console.log(`[FileLoader] [BPM LOCK] Adjusted rate to ${rateAdjustment.toFixed(3)}x (locked: ${bpmLockState.lockedBPM} BPM, file: ${file.bpm} BPM)`);
        }

        // Restore loop from preserved bar indices (if preserve mode is on)
        await this._restorePreservedLoop(file, wavesurfer, autoplay);

        // Pre-load stems if file has stems (NEW system - silent background loading)
        await this._preloadStems(file);

        // Auto-play parent file if requested
        if (autoplay) {
            wavesurfer.play();
            document.getElementById('playPauseIcon').textContent = '⏸';
        }
    }

    /**
     * Restore loop from preserved bar indices
     * @private
     */
    async _restorePreservedLoop(file, wavesurfer, autoplay) {
        const preserveLoopOnFileChange = this.getPreserveLoopOnFileChange();
        const preservedBars = this.getPreservedLoopBars();

        if (preserveLoopOnFileChange &&
            preservedBars.startBar !== null &&
            preservedBars.endBar !== null) {

            const newLoopStart = this.getTimeForBarIndex(preservedBars.startBar, file);
            const newLoopEnd = this.getTimeForBarIndex(preservedBars.endBar, file);

            if (newLoopStart !== null && newLoopEnd !== null) {
                this.setLoopState({
                    start: newLoopStart,
                    end: newLoopEnd,
                    cycleMode: preservedBars.cycleMode
                });
                console.log(`[FileLoader] Restored loop: ${newLoopStart.toFixed(2)}s to ${newLoopEnd.toFixed(2)}s (bar ${preservedBars.startBar} to ${preservedBars.endBar}), cycle mode: ${preservedBars.cycleMode}`);
                this.updateLoopVisuals();

                // Seamless swap: restore playback position within loop
                if (preservedBars.playbackPositionInLoop !== null && autoplay) {
                    const newLoopDuration = newLoopEnd - newLoopStart;
                    const newPlaybackTime = newLoopStart + (preservedBars.playbackPositionInLoop * newLoopDuration);
                    wavesurfer.seekTo(newPlaybackTime / wavesurfer.getDuration());
                    console.log(`[FileLoader] Seamless swap: restored playback to ${(preservedBars.playbackPositionInLoop * 100).toFixed(1)}% through loop (${newPlaybackTime.toFixed(2)}s)`);

                    // Clear playback position after use
                    this.setPreservedLoopBars({
                        ...preservedBars,
                        playbackPositionInLoop: null
                    });
                }
            } else {
                console.log('[FileLoader] Could not restore loop: bar indices out of range for new file');
                this.setPreservedLoopBars({
                    startBar: null,
                    endBar: null,
                    cycleMode: false,
                    playbackPositionInLoop: null
                });
            }
        }
    }

    /**
     * Pre-load stems if file has stems
     * @private
     */
    async _preloadStems(file) {
        if (file.has_stems) {
            console.log('[FileLoader] 🎵 File has stems - pre-loading in background...');
            try {
                await this.preloadMultiStemWavesurfers(file.id);
                console.log('[FileLoader] ✅ Stems pre-loaded successfully and ready');

                // Show STEMS button
                const stemsBtn = document.getElementById('stemsBtn');
                if (stemsBtn) {
                    stemsBtn.style.display = 'block';
                }
            } catch (error) {
                console.error('[FileLoader] ❌ Failed to pre-load stems:', error);
            }
        }
    }

    /**
     * Update file list highlighting
     * @private
     */
    _updateFileListHighlighting(fileId) {
        // Update active file highlighting without re-rendering entire list
        document.querySelectorAll('.file-item').forEach(item => {
            item.classList.remove('active');
        });
        const currentFileItem = document.querySelector(`.file-item:has(input#checkbox-${fileId})`);
        if (currentFileItem) {
            currentFileItem.classList.add('active');
        }
    }
}
