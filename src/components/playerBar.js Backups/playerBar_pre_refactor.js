// Player Bar Component - All transport, loop, and playback controls
import { state } from '../core/state.js';
import { formatTime } from '../utils/formatting.js';

export class PlayerBarComponent {
    constructor(waveformComponent) {
        this.waveform = waveformComponent;
        this.loopStart = null;
        this.loopEnd = null;
        this.cycleMode = false;
        this.nextClickSets = 'start';
        this.seekOnClick = false;
        this.loopControlsExpanded = false;
    }

    init() {
        this.setupTransportControls();
        this.setupPlaybackControls();
        this.setupRateControls();
        this.setupVolumeControls();
        this.setupLoopControls();
        this.setupMarkerControls();

        // Listen for waveform events
        state.on('waveformTimeUpdate', ({ currentTime, duration }) => {
            this.updateTimeDisplay(currentTime, duration);
        });

        state.on('waveformClick', ({ time }) => {
            this.handleWaveformClick(time);
        });

        console.log('Player bar component initialized');
    }

    // Transport Controls (Play, Pause, Prev, Next, Restart)
    setupTransportControls() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const restartBtn = document.getElementById('restartBtn');

        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                if (this.waveform.isPlaying()) {
                    this.waveform.pause();
                    playPauseBtn.textContent = '▶';
                    state.setPlaying(false);
                } else {
                    this.waveform.play();
                    playPauseBtn.textContent = '❚❚';
                    state.setPlaying(true);
                }
            });
        }

        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.waveform.seekTo(0);
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                state.emit('prevTrack');
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                state.emit('nextTrack');
            });
        }
    }

    // Playback Controls (Markers, Frequency)
    setupPlaybackControls() {
        const markersBtn = document.getElementById('markersBtn');
        const markerFrequency = document.getElementById('markerFrequency');

        if (markersBtn) {
            markersBtn.addEventListener('click', () => {
                markersBtn.classList.toggle('active');
                state.setMarkersEnabled(markersBtn.classList.contains('active'));
            });
        }

        if (markerFrequency) {
            markerFrequency.addEventListener('change', (e) => {
                state.setMarkerFrequency(e.target.value);
            });
        }
    }

    // Rate/Speed Controls
    setupRateControls() {
        const rateSlider = document.getElementById('rateSlider');
        const rateValue = document.getElementById('rateValue');

        if (rateSlider && rateValue) {
            rateSlider.addEventListener('input', (e) => {
                const rate = parseFloat(e.target.value);
                this.waveform.setPlaybackRate(rate);
                rateValue.textContent = rate.toFixed(2) + 'x';
                state.setRate(rate);

                // Update preset buttons
                document.querySelectorAll('.rate-preset-btn').forEach(btn => {
                    btn.classList.toggle('active', parseFloat(btn.dataset.rate) === rate);
                });
            });
        }

        // Rate preset buttons
        document.querySelectorAll('.rate-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const rate = parseFloat(btn.dataset.rate);
                if (rateSlider) rateSlider.value = rate;
                if (rateValue) rateValue.textContent = rate.toFixed(2) + 'x';
                this.waveform.setPlaybackRate(rate);
                state.setRate(rate);

                document.querySelectorAll('.rate-preset-btn').forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
            });
        });
    }

    // Volume Controls
    setupVolumeControls() {
        const volumeSlider = document.getElementById('volumeSlider');
        const volumePercent = document.getElementById('volumePercent');

        if (volumeSlider && volumePercent) {
            volumeSlider.addEventListener('input', (e) => {
                const volume = parseInt(e.target.value) / 100;
                this.waveform.setVolume(volume);
                volumePercent.textContent = e.target.value + '%';
                state.setVolume(volume);
            });
        }
    }

    // Loop/Cycle Controls (Main implementation matching v31)
    setupLoopControls() {
        const cycleBtn = document.getElementById('cycleBtn');
        const seekBtn = document.getElementById('seekBtn');
        const clearLoopBtn = document.getElementById('clearLoopBtn');
        const expandLoopBtn = document.getElementById('expandLoopBtn');

        // CYCLE button - toggles cycle mode (edit + active loop)
        if (cycleBtn) {
            cycleBtn.addEventListener('click', () => {
                this.cycleMode = !this.cycleMode;
                cycleBtn.classList.toggle('active', this.cycleMode);

                // Show/hide additional buttons
                if (seekBtn) seekBtn.style.display = this.cycleMode ? 'inline-block' : 'none';
                if (clearLoopBtn) clearLoopBtn.style.display = this.cycleMode ? 'inline-block' : 'none';

                // Update state
                state.setEditLoopMode(this.cycleMode);
                this.nextClickSets = 'start';

                console.log(`CYCLE MODE ${this.cycleMode ? 'ON' : 'OFF'}`);
                this.updateLoopStatus();
            });

            // Keyboard shortcut: C key
            document.addEventListener('keydown', (e) => {
                if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    cycleBtn.click();
                }
            });
        }

        // SEEK button - toggle seeking on waveform click
        if (seekBtn) {
            seekBtn.addEventListener('click', () => {
                this.seekOnClick = !this.seekOnClick;
                seekBtn.classList.toggle('active', this.seekOnClick);
                console.log(`Seek on click: ${this.seekOnClick ? 'ON' : 'OFF'}`);
            });
        }

        // CLEAR button - clear loop points but keep cycle mode on
        if (clearLoopBtn) {
            clearLoopBtn.addEventListener('click', () => {
                this.loopStart = null;
                this.loopEnd = null;
                this.nextClickSets = 'start';
                state.emit('loopStartChanged', null);
                state.emit('loopEndChanged', null);
                this.waveform.loopStart = null;
                this.waveform.loopEnd = null;
                this.waveform.updateLoopRegion();
                console.log('Loop cleared (cycle mode still ON)');
                this.updateLoopStatus();
            });
        }

        // EXPAND button - show/hide loop manipulation controls
        if (expandLoopBtn) {
            expandLoopBtn.addEventListener('click', () => {
                this.loopControlsExpanded = !this.loopControlsExpanded;
                const loopControlsContainer = document.getElementById('loopControlsContainer');
                if (loopControlsContainer) {
                    loopControlsContainer.style.display = this.loopControlsExpanded ? 'flex' : 'none';
                }
                expandLoopBtn.querySelector('span').textContent = this.loopControlsExpanded ? '▲' : '▼';
            });
        }

        // Set up loop manipulation buttons
        this.setupLoopManipulationControls();
    }

    setupLoopManipulationControls() {
        // These would be buttons like shift left/right, half/double, etc.
        // Placeholder for now - will implement based on v31 if needed
        const shiftLeftBtn = document.getElementById('shiftLeftBtn');
        const shiftRightBtn = document.getElementById('shiftRightBtn');

        if (shiftLeftBtn) {
            shiftLeftBtn.addEventListener('click', () => {
                console.log('TODO: Shift loop left');
            });
        }

        if (shiftRightBtn) {
            shiftRightBtn.addEventListener('click', () => {
                console.log('TODO: Shift loop right');
            });
        }
    }

    // Marker Controls
    setupMarkerControls() {
        // Placeholder for bar shift controls, metronome, etc.
    }

    // Handle waveform clicks for setting loop points
    handleWaveformClick(time) {
        if (!this.cycleMode) return;

        const duration = this.waveform.getDuration();

        // Check if we're resetting existing points
        if (this.loopStart !== null && this.loopEnd !== null) {
            if (time < this.loopStart) {
                // Click left of start - reset start
                this.loopStart = time;
                console.log(`Loop start moved to ${time.toFixed(2)}s`);
                state.emit('loopStartChanged', this.loopStart);
                this.waveform.loopStart = this.loopStart;
                this.waveform.updateLoopRegion();
                if (this.seekOnClick) {
                    this.waveform.seekTo(time / duration);
                }
                this.updateLoopStatus();
                return;
            } else if (time > this.loopEnd) {
                // Click right of end - reset end
                this.loopEnd = time;
                console.log(`Loop end moved to ${time.toFixed(2)}s`);
                state.emit('loopEndChanged', this.loopEnd);
                this.waveform.loopEnd = this.loopEnd;
                this.waveform.updateLoopRegion();
                if (this.seekOnClick) {
                    this.waveform.seekTo(time / duration);
                }
                this.updateLoopStatus();
                return;
            }
        }

        // Normal loop setting flow
        if (this.nextClickSets === 'start') {
            this.loopStart = time;
            this.loopEnd = null;
            this.nextClickSets = 'end';
            console.log(`Loop start set to ${time.toFixed(2)}s`);
            state.emit('loopStartChanged', this.loopStart);
            this.waveform.loopStart = this.loopStart;
            this.waveform.updateLoopRegion();
        } else if (this.nextClickSets === 'end') {
            if (time <= this.loopStart) {
                console.log('Loop end must be after loop start - ignoring click');
                return;
            }
            this.loopEnd = time;
            this.nextClickSets = 'start';
            console.log(`Loop end set to ${time.toFixed(2)}s - Loop active!`);
            state.emit('loopEndChanged', this.loopEnd);
            this.waveform.loopEnd = this.loopEnd;
            this.waveform.updateLoopRegion();

            // Show expand button when loop is fully set
            const expandLoopBtn = document.getElementById('expandLoopBtn');
            if (expandLoopBtn) {
                expandLoopBtn.style.display = 'inline-block';
            }
        }

        this.updateLoopStatus();

        if (this.seekOnClick) {
            this.waveform.seekTo(time / duration);
        }
    }

    // Update loop status display
    updateLoopStatus() {
        const loopStatus = document.getElementById('loopStatus');
        if (!loopStatus) return;

        if (!this.cycleMode) {
            loopStatus.textContent = 'Off';
            loopStatus.classList.remove('active');
        } else if (this.loopStart === null) {
            loopStatus.textContent = 'Click start';
            loopStatus.classList.add('active');
        } else if (this.loopEnd === null) {
            loopStatus.textContent = 'Click end →';
            loopStatus.classList.add('active');
        } else {
            const duration = this.loopEnd - this.loopStart;
            loopStatus.textContent = `${duration.toFixed(1)}s`;
            loopStatus.classList.add('active');
        }
    }

    // Update time display
    updateTimeDisplay(currentTime, duration) {
        const playerTime = document.getElementById('playerTime');
        if (playerTime) {
            playerTime.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
        }
    }

    // Update file info display
    updateFileInfo(filename, metadata = {}) {
        const playerFilename = document.getElementById('playerFilename');
        if (playerFilename) {
            playerFilename.textContent = filename || 'No file loaded';
        }

        // Could add more metadata display here
    }
}
