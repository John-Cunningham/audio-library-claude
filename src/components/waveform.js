/**
 * WaveformComponent - Reusable WaveSurfer wrapper with event handling
 *
 * Usage:
 *   const parentWaveform = new WaveformComponent({
 *     playerType: 'parent',
 *     container: '#waveform',
 *     dependencies: { Metronome, ... }
 *   });
 *
 *   const wavesurfer = parentWaveform.create(WaveSurfer, config);
 */

import { formatTime } from '../utils/formatting.js';

export class WaveformComponent {
    constructor(options = {}) {
        // Configuration
        this.playerType = options.playerType; // 'parent' or 'stem'
        this.stemType = options.stemType;     // 'vocals', 'drums', etc. (if stem)
        this.container = options.container;   // '#waveform' or '#multi-stem-waveform-vocals'

        // Dependencies (injected)
        this.dependencies = options.dependencies || {};

        // WaveSurfer instance
        this.wavesurfer = null;

        // Legacy properties (kept for backward compatibility with old code)
        this.containerId = this.container;
        this.currentBeatmap = null;
        this.loopStart = null;
        this.loopEnd = null;
        this.editLoopMode = false;
        this.clickHandler = null;

        console.log(`[WaveformComponent] Created ${this.playerType}${this.stemType ? ' (' + this.stemType + ')' : ''} waveform`);
    }

    /**
     * Create WaveSurfer instance with configuration and event handlers
     * This replaces the initWaveSurfer() function from app.js
     *
     * @param {Object} WaveSurfer - WaveSurfer class (injected)
     * @param {Object} config - WaveSurfer configuration options
     * @returns {Object} wavesurfer instance
     */
    create(WaveSurfer, config = {}) {
        try {
            console.log(`[WaveformComponent] Creating WaveSurfer for ${this.playerType}...`);

            // Create WaveSurfer instance
            this.wavesurfer = WaveSurfer.create({
                container: this.container,
                waveColor: '#666666',
                progressColor: '#4a9eff',
                cursorColor: '#ffffff',
                barWidth: 3,
                barRadius: 3,
                cursorWidth: 2,
                height: 60,
                barGap: 2,
                responsive: true,
                normalize: true,
                backend: 'WebAudio',
                autoScroll: false,  // Disable auto-scrolling to keep markers in sync
                ...config // Allow overrides
            });

            console.log(`[WaveformComponent] WaveSurfer created:`, this.wavesurfer);

            // Setup all event listeners
            this.setupEventListeners();

            // Enable bottom player when waveform is ready (parent only)
            if (this.playerType === 'parent') {
                const bottomPlayer = document.getElementById('bottomPlayer');
                if (bottomPlayer) {
                    bottomPlayer.classList.remove('disabled');
                }
            }

            return this.wavesurfer;
        } catch (error) {
            console.error(`[WaveformComponent] Error creating WaveSurfer:`, error);
            throw error;
        }
    }

    /**
     * Setup all WaveSurfer event listeners
     * Extracted from app.js initWaveSurfer() function
     */
    setupEventListeners() {
        if (!this.wavesurfer) {
            console.warn(`[WaveformComponent] Cannot setup listeners - no wavesurfer instance`);
            return;
        }

        this.setupFinishHandler();
        this.setupPauseHandler();
        this.setupPlayHandler();
        this.setupReadyHandler();
        this.setupAudioProcessHandler();
        this.setupSeekingHandler();
        this.setupErrorHandler();

        console.log(`[WaveformComponent] Event listeners installed`);
    }

    /**
     * Handle 'finish' event - track ended
     */
    setupFinishHandler() {
        this.wavesurfer.on('finish', () => {
            // Access global state for isLooping (TODO: make this a dependency)
            if (typeof window !== 'undefined' && window.isLooping) {
                this.wavesurfer.play();
            } else if (typeof window !== 'undefined' && window.nextTrack) {
                window.nextTrack();
            }
        });
    }

    /**
     * Handle 'pause' event - stop metronome
     */
    setupPauseHandler() {
        this.wavesurfer.on('pause', () => {
            const Metronome = this.dependencies.Metronome;
            if (Metronome) {
                Metronome.stopAllMetronomeSounds();
                Metronome.setLastMetronomeScheduleTime(0);
            }
        });
    }

    /**
     * Handle 'play' event - reset metronome scheduling
     */
    setupPlayHandler() {
        this.wavesurfer.on('play', () => {
            const Metronome = this.dependencies.Metronome;
            if (Metronome) {
                Metronome.setLastMetronomeScheduleTime(0);
            }
        });
    }

    /**
     * Handle 'ready' event - waveform ready to play
     */
    setupReadyHandler() {
        this.wavesurfer.on('ready', () => {
            console.log(`[WaveformComponent] WaveSurfer ready`);

            // Update time display
            if (typeof window !== 'undefined' && window.updatePlayerTime) {
                window.updatePlayerTime();
            }

            // CRITICAL: Re-establish parent-stem sync for this new wavesurfer instance
            // This must be called every time wavesurfer is recreated
            if (this.playerType === 'parent' && typeof window !== 'undefined') {
                const stemPlayerWavesurfers = window.stemPlayerWavesurfers || {};
                if (Object.keys(stemPlayerWavesurfers).length > 0 && window.setupParentStemSync) {
                    window.setupParentStemSync();
                    console.log('✓ Parent-stem sync re-established for new wavesurfer instance');
                }
            }
        });
    }

    /**
     * Handle 'audioprocess' event - update time, loop, metronome
     * This is the largest event handler (~75 lines in app.js)
     */
    setupAudioProcessHandler() {
        this.wavesurfer.on('audioprocess', () => {
            // Update time display
            if (typeof window !== 'undefined' && window.updatePlayerTime) {
                window.updatePlayerTime();
            }

            // Handle clock-quantized jump (jump on next beat marker)
            this.handleClockJump();

            // Handle loop-between-markers
            this.handleLoopCycle();

            // Schedule metronome clicks
            this.handleMetronome();
        });
    }

    /**
     * Handle clock-quantized jumps (jump on next beat marker)
     */
    handleClockJump() {
        if (typeof window === 'undefined') return;

        const pendingJumpTarget = window.pendingJumpTarget;
        const markersEnabled = window.markersEnabled;
        const currentFileId = window.currentFileId;
        const audioFiles = window.audioFiles;

        if (pendingJumpTarget !== null && markersEnabled && currentFileId) {
            const currentFile = audioFiles.find(f => f.id === currentFileId);
            if (currentFile?.beatmap) {
                const currentTime = this.wavesurfer.getCurrentTime();
                const barStartOffset = window.barStartOffset || 0;

                // Find if we just crossed a beat marker (within 50ms tolerance)
                const crossedMarker = currentFile.beatmap.some(beat => {
                    const markerTime = beat.time + barStartOffset;
                    return markerTime >= currentTime - 0.05 && markerTime <= currentTime + 0.05;
                });

                if (crossedMarker) {
                    this.wavesurfer.seekTo(pendingJumpTarget / this.wavesurfer.getDuration());
                    console.log(`Clock jump executed at beat marker: jumped to ${pendingJumpTarget.toFixed(2)}s`);
                    window.pendingJumpTarget = null; // Clear the pending jump
                }
            }
        }
    }

    /**
     * Handle loop cycle with fades
     */
    handleLoopCycle() {
        if (typeof window === 'undefined') return;

        const cycleMode = window.cycleMode;
        const loopStart = window.loopStart;
        const loopEnd = window.loopEnd;
        const loopFadesEnabled = window.loopFadesEnabled;
        const fadeTime = window.fadeTime || 0.05;

        if (cycleMode && loopStart !== null && loopEnd !== null) {
            const currentTime = this.wavesurfer.getCurrentTime();

            // Apply fades at loop boundaries if enabled
            if (loopFadesEnabled) {
                const fadeStartTime = loopEnd - fadeTime;
                const fadeInEndTime = loopStart + fadeTime;
                const volumeSlider = document.getElementById('volumeSlider');
                const userVolume = volumeSlider ? parseInt(volumeSlider.value) / 100 : 1.0;

                // Fade out before loop end (from 100% to 0%)
                if (currentTime >= fadeStartTime && currentTime < loopEnd) {
                    const fadeProgress = (currentTime - fadeStartTime) / fadeTime;
                    const fadedVolume = userVolume * (1.0 - fadeProgress);
                    this.wavesurfer.setVolume(fadedVolume);
                    console.log(`[FADE OUT] time: ${currentTime.toFixed(3)}s, progress: ${(fadeProgress * 100).toFixed(1)}%, vol: ${(fadedVolume * 100).toFixed(1)}%`);
                }
                // If we've reached or passed loop end, mute completely to prevent blip
                else if (currentTime >= loopEnd) {
                    this.wavesurfer.setVolume(0);
                    console.log(`[FADE] Muted at ${currentTime.toFixed(3)}s (past loop end)`);
                }
                // Fade in after loop start (from 0% to 100%)
                else if (currentTime >= loopStart && currentTime < fadeInEndTime) {
                    const fadeProgress = (currentTime - loopStart) / fadeTime;
                    const fadedVolume = userVolume * fadeProgress;
                    this.wavesurfer.setVolume(fadedVolume);
                    console.log(`[FADE IN] time: ${currentTime.toFixed(3)}s, progress: ${(fadeProgress * 100).toFixed(1)}%, vol: ${(fadedVolume * 100).toFixed(1)}%`);
                }
                // Normal volume (but only when not in fade regions)
                else if (currentTime < fadeStartTime && currentTime >= fadeInEndTime) {
                    this.wavesurfer.setVolume(userVolume);
                }
            }

            // Seek back to loop start when we reach loop end
            if (currentTime >= loopEnd) {
                this.wavesurfer.seekTo(loopStart / this.wavesurfer.getDuration());
                console.log(`Loop: seeking back to ${loopStart.toFixed(2)}s`);
            }
        }
    }

    /**
     * Handle metronome scheduling
     */
    handleMetronome() {
        const Metronome = this.dependencies.Metronome;
        if (!Metronome) return;

        if (Metronome.isMetronomeEnabled() && this.wavesurfer.isPlaying()) {
            const now = Date.now();
            const lastScheduleTime = Metronome.getLastMetronomeScheduleTime();

            // Schedule every 0.5 seconds
            if (now - lastScheduleTime > 500) {
                if (typeof window !== 'undefined') {
                    const audioFiles = window.audioFiles;
                    const currentFileId = window.currentFileId;
                    const barStartOffset = window.barStartOffset || 0;
                    const currentRate = window.currentRate || 1.0;

                    Metronome.scheduleMetronome(audioFiles, currentFileId, this.wavesurfer, barStartOffset, currentRate);
                    Metronome.setLastMetronomeScheduleTime(now);
                }
            }
        }
    }

    /**
     * Handle 'seeking' event - user seeking in waveform
     */
    setupSeekingHandler() {
        this.wavesurfer.on('seeking', () => {
            // Update time display
            if (typeof window !== 'undefined' && window.updatePlayerTime) {
                window.updatePlayerTime();
            }

            // Stop all scheduled metronome sounds to prevent double-play
            const Metronome = this.dependencies.Metronome;
            if (Metronome) {
                Metronome.stopAllMetronomeSounds();
                Metronome.setLastMetronomeScheduleTime(0); // Force rescheduling after seek
            }
        });
    }

    /**
     * Handle 'error' event
     */
    setupErrorHandler() {
        this.wavesurfer.on('error', (error) => {
            console.error(`[WaveformComponent] WaveSurfer error:`, error);
        });
    }

    /**
     * Get logging prefix for console messages
     */
    getLogPrefix() {
        if (this.playerType === 'parent') {
            return 'WaveformComponent[Parent]';
        } else {
            return `WaveformComponent[${this.stemType}]`;
        }
    }

    // ============================================
    // LEGACY METHODS (for backward compatibility)
    // ============================================

    // LEGACY init() - REMOVED
    // This referenced old state.js event system
    // No longer needed with new architecture

    async loadAudio(url, beatmap = null) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Destroy existing instance
        if (this.wavesurfer) {
            this.wavesurfer.destroy();
        }

        // Store beatmap
        this.currentBeatmap = beatmap;

        // Create new WaveSurfer instance
        this.wavesurfer = WaveSurfer.create({
            container: container,
            waveColor: '#4a9eff',
            progressColor: '#3a8eef',
            cursorColor: '#ffffff',
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            height: 80,
            normalize: true,
            backend: 'WebAudio'
        });

        // Load audio
        try {
            await this.wavesurfer.load(url);
            console.log('Waveform loaded successfully');

            // Render markers after loading
            this.renderMarkers();

            // Set up event listeners
            this.setupEventListeners();

            return this.wavesurfer;
        } catch (error) {
            console.error('Failed to load waveform:', error);
            throw error;
        }
    }

    // LEGACY setupEventListeners() - REMOVED
    // This was duplicated and referenced old state.js system
    // New setupEventListeners() is at line 94

    play() {
        if (this.wavesurfer) {
            this.wavesurfer.play();
        }
    }

    pause() {
        if (this.wavesurfer) {
            this.wavesurfer.pause();
        }
    }

    isPlaying() {
        return this.wavesurfer ? this.wavesurfer.isPlaying() : false;
    }

    seekTo(position) {
        if (this.wavesurfer) {
            this.wavesurfer.seekTo(position);
        }
    }

    setVolume(volume) {
        if (this.wavesurfer) {
            this.wavesurfer.setVolume(volume);
        }
    }

    setPlaybackRate(rate) {
        if (this.wavesurfer) {
            this.wavesurfer.setPlaybackRate(rate);
        }
    }

    getDuration() {
        return this.wavesurfer ? this.wavesurfer.getDuration() : 0;
    }

    getCurrentTime() {
        return this.wavesurfer ? this.wavesurfer.getCurrentTime() : 0;
    }

    // LEGACY renderMarkers() - COMMENTED OUT
    // References old state.js system
    renderMarkers() {
        // This legacy method is not used by new architecture
        // Markers are now handled by PlayerBarComponent.addBarMarkers()
        return;

        /* OLD CODE - COMMENTED OUT
        if (!this.wavesurfer || !this.currentBeatmap || this.currentBeatmap.length === 0) return;

        const container = document.getElementById(this.containerId);
        if (!container) return;

        // Remove existing markers
        const existingMarkers = container.querySelectorAll('.bar-marker, .beat-marker');
        existingMarkers.forEach(m => m.remove());

        if (!state.markersEnabled) return;

        const duration = this.getDuration();
        const visibleBeats = this.filterBeatsByFrequency(this.currentBeatmap, state.markerFrequency);

        // Create marker elements
        visibleBeats.forEach(beat => {
            const percent = (beat.time / duration) * 100;

            const marker = document.createElement('div');
            marker.className = beat.beatNum === 1 ? 'bar-marker' : 'beat-marker';
            marker.style.left = `${percent}%`;

            container.appendChild(marker);
        });
    }

    filterBeatsByFrequency(beatmap, frequency) {
        if (frequency === 'beat') return beatmap;
        if (frequency === 'bar') return beatmap.filter(b => b.beatNum === 1);
        if (frequency === 'halfbar') return beatmap.filter(b => b.beatNum === 1 || b.beatNum === 3);

        // For multi-bar frequencies
        const barInterval = parseInt(frequency.replace('bar', '')) || 1;
        let barCount = 0;

        return beatmap.filter((beat) => {
            if (beat.beatNum === 1) {
                if (barCount % barInterval === 0) {
                    barCount++;
                    return true;
                }
                barCount++;
            }
            return false;
        });
    }

    // LEGACY updateLoopRegion() - COMMENTED OUT
    // References old state.js system
    updateLoopRegion() {
        // This legacy method is not used by new architecture
        // Loop regions are now handled by PlayerBarComponent
        return;

        /* OLD CODE - COMMENTED OUT
        const container = document.getElementById(this.containerId);
        if (!container || !this.wavesurfer) return;

        // Remove existing loop region
        const existingRegion = container.querySelector('.loop-region');
        if (existingRegion) {
            existingRegion.remove();
        }

        // Don't draw if loop not set or cycle mode not active
        if (this.loopStart === null || this.loopEnd === null || !state.editLoopMode) return;

        const duration = this.getDuration();
        if (duration === 0) return;

        const startPercent = (this.loopStart / duration) * 100;
        const endPercent = (this.loopEnd / duration) * 100;
        const widthPercent = endPercent - startPercent;

        const loopRegion = document.createElement('div');
        loopRegion.className = 'loop-region';
        loopRegion.style.left = `${startPercent}%`;
        loopRegion.style.width = `${widthPercent}%`;

        container.appendChild(loopRegion);
    }

    // LEGACY setupClickHandler() - COMMENTED OUT
    // References old state.js system
    setupClickHandler() {
        // This legacy method is not used by new architecture
        // Click handling is now done by PlayerBarComponent.setupWaveformClickHandler()
        return;

        /* OLD CODE - COMMENTED OUT
        const container = document.getElementById(this.containerId);
        if (!container) return;

        this.clickHandler = (e) => {
            if (!this.wavesurfer || !this.editLoopMode) return;

            const bounds = container.getBoundingClientRect();
            const x = e.clientX - bounds.left;
            const percent = x / bounds.width;
            const duration = this.getDuration();
            let clickTime = percent * duration;

            // Snap to nearest marker if enabled
            if (state.markersEnabled && this.currentBeatmap && this.currentBeatmap.length > 0) {
                clickTime = this.findNearestBeatToLeft(clickTime);
            }

            // Emit click event with time
            state.emit('waveformClick', { time: clickTime });
        };

        container.addEventListener('click', this.clickHandler);
        */
    }

    removeClickHandler() {
        const container = document.getElementById(this.containerId);
        if (container && this.clickHandler) {
            container.removeEventListener('click', this.clickHandler);
            this.clickHandler = null;
        }
    }

    findNearestBeatToLeft(time) {
        if (!this.currentBeatmap || this.currentBeatmap.length === 0) return time;

        let nearestBeat = null;

        for (let i = 0; i < this.currentBeatmap.length; i++) {
            if (this.currentBeatmap[i].time <= time) {
                nearestBeat = this.currentBeatmap[i];
            } else {
                break;
            }
        }

        return nearestBeat ? nearestBeat.time : time;
    }

    destroy() {
        if (this.wavesurfer) {
            this.wavesurfer.destroy();
            this.wavesurfer = null;
        }
        this.removeClickHandler();
    }
}
