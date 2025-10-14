// Waveform Component - WaveSurfer with markers and loop regions
import { state } from '../core/state.js';
import { formatTime } from '../utils/formatting.js';

export class WaveformComponent {
    constructor(containerId) {
        this.containerId = containerId;
        this.wavesurfer = null;
        this.currentBeatmap = null;
        this.loopStart = null;
        this.loopEnd = null;
        this.editLoopMode = false;
        this.clickHandler = null;
    }

    async init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('Waveform container not found:', this.containerId);
            return;
        }

        console.log('Waveform component initialized');

        // Listen for state changes
        state.on('loopStartChanged', (start) => {
            this.loopStart = start;
            this.updateLoopRegion();
        });

        state.on('loopEndChanged', (end) => {
            this.loopEnd = end;
            this.updateLoopRegion();
        });

        state.on('editLoopModeChanged', (mode) => {
            this.editLoopMode = mode;
            if (mode) {
                this.setupClickHandler();
            } else {
                this.removeClickHandler();
            }
        });

        state.on('markersChanged', () => {
            this.renderMarkers();
        });

        state.on('markerFrequencyChanged', () => {
            this.renderMarkers();
        });
    }

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

    setupEventListeners() {
        if (!this.wavesurfer) return;

        // Update time display
        this.wavesurfer.on('timeupdate', (currentTime) => {
            state.emit('waveformTimeUpdate', {
                currentTime,
                duration: this.wavesurfer.getDuration()
            });
        });

        // Handle finish
        this.wavesurfer.on('finish', () => {
            state.setPlaying(false);
        });

        // Loop enforcement
        this.wavesurfer.on('audioprocess', () => {
            if (this.loopStart !== null && this.loopEnd !== null) {
                const currentTime = this.wavesurfer.getCurrentTime();
                if (currentTime >= this.loopEnd) {
                    this.wavesurfer.seekTo(this.loopStart / this.wavesurfer.getDuration());
                    console.log(`Loop: seeking back to ${this.loopStart.toFixed(2)}s`);
                }
            }
        });
    }

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

    // Marker rendering
    renderMarkers() {
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

    // Loop region visualization
    updateLoopRegion() {
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

    // Click handler for loop editing
    setupClickHandler() {
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
