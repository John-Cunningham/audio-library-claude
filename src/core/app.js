// Main application entry point
import { state } from './state.js';
import { fetchAudioFiles, hasStems } from './supabase.js';
import { audioManager } from './audioContext.js';
import { formatTime } from '../utils/formatting.js';

console.log('🎵 Audio Library - Initializing...');

let wavesurfer = null;
let allFiles = [];
let currentBeatmap = null;

// Loop state
let loopStart = null;
let loopEnd = null;
let editLoopMode = false;
let nextClickSets = 'start';
let seekOnClick = false;

// Initialize application
async function init() {
    try {
        // Initialize audio context
        audioManager.init();

        // Load library view
        await loadLibraryView();

        // Set up player bar event listeners
        setupPlayerBar();

        // Set up file list interactions
        setupFileList();

        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
    }
}

// Load library view with files
async function loadLibraryView() {
    const fileList = document.getElementById('fileList');
    if (!fileList) {
        console.error('fileList element not found');
        return;
    }

    fileList.innerHTML = '<div class="empty-state"><div>Loading audio files...</div></div>';

    const files = await fetchAudioFiles();
    allFiles = files;

    if (files.length === 0) {
        fileList.innerHTML = '<div class="empty-state"><div>No audio files found</div></div>';
        updateFileCount(0);
        return;
    }

    fileList.innerHTML = '';

    for (const file of files) {
        const item = createFileItem(file);
        fileList.appendChild(item);
    }

    updateFileCount(files.length);
}

// Create file list item
function createFileItem(file) {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.dataset.fileId = file.id;

    const infoDiv = document.createElement('div');
    infoDiv.style.flex = '1';
    infoDiv.style.minWidth = '0';

    const name = document.createElement('div');
    name.className = 'file-name';
    name.textContent = file.name || file.filename || 'Untitled';

    const tags = document.createElement('div');
    tags.className = 'file-tags';

    // Add metadata tags
    if (file.bpm) {
        const bpmTag = document.createElement('span');
        bpmTag.className = 'file-tag';
        bpmTag.textContent = file.bpm + ' BPM';
        tags.appendChild(bpmTag);
    }

    if (file.key) {
        const keyTag = document.createElement('span');
        keyTag.className = 'file-tag';
        keyTag.textContent = file.key;
        tags.appendChild(keyTag);
    }

    infoDiv.appendChild(name);
    infoDiv.appendChild(tags);
    item.appendChild(infoDiv);

    // Check for stems and add icon
    hasStems(file.id).then(hasS => {
        if (hasS) {
            const stemsIcon = document.createElement('span');
            stemsIcon.className = 'stems-icon';
            stemsIcon.textContent = '🎵';
            stemsIcon.title = 'Has stems';
            item.appendChild(stemsIcon);
        }
    });

    item.addEventListener('click', () => {
        loadFile(file);
    });

    return item;
}

// Update file count display
function updateFileCount(count) {
    const fileCount = document.getElementById('fileCount');
    if (fileCount) {
        fileCount.textContent = `(${count})`;
    }
}

// Load file into player
async function loadFile(file) {
    console.log('Loading file:', file);

    state.setCurrentFile(file);

    // Update UI
    const playerFilename = document.getElementById('playerFilename');
    const playerTime = document.getElementById('playerTime');

    if (playerFilename) {
        playerFilename.textContent = file.name || file.filename || 'Untitled';
    }

    // Highlight active file
    document.querySelectorAll('.file-item').forEach(item => {
        item.classList.toggle('active', item.dataset.fileId == file.id);
    });

    // Check for stems
    const hasS = await hasStems(file.id);
    const stemsBtn = document.getElementById('stemsBtn');
    if (stemsBtn) {
        if (hasS) {
            stemsBtn.style.display = 'block';
        } else {
            stemsBtn.style.display = 'none';
        }
    }

    // Load waveform
    if (file.file_url) {
        await loadWaveform(file.file_url);

        if (playerTime && wavesurfer) {
            const duration = wavesurfer.getDuration();
            playerTime.textContent = `0:00 / ${formatTime(duration)}`;
        }
    }

    // Load beatmap if available
    if (file.beatmap) {
        try {
            currentBeatmap = typeof file.beatmap === 'string'
                ? JSON.parse(file.beatmap)
                : file.beatmap;
            console.log('Loaded beatmap:', currentBeatmap.length, 'beats');
            renderMarkers();
        } catch (e) {
            console.error('Failed to parse beatmap:', e);
            currentBeatmap = null;
        }
    } else {
        currentBeatmap = null;
    }
}

// Initialize WaveSurfer
async function loadWaveform(url) {
    const waveformContainer = document.getElementById('waveform');
    if (!waveformContainer) {
        console.error('Waveform container not found');
        return;
    }

    // Destroy existing instance
    if (wavesurfer) {
        wavesurfer.destroy();
    }

    // Create new WaveSurfer instance
    wavesurfer = WaveSurfer.create({
        container: waveformContainer,
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
        await wavesurfer.load(url);
        console.log('Waveform loaded successfully');

        // Update time display on timeupdate
        wavesurfer.on('timeupdate', (currentTime) => {
            const playerTime = document.getElementById('playerTime');
            if (playerTime) {
                const duration = wavesurfer.getDuration();
                playerTime.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
            }
        });

        // Update play button on finish
        wavesurfer.on('finish', () => {
            const playBtn = document.getElementById('playPauseBtn');
            if (playBtn) {
                playBtn.textContent = '▶';
            }
            state.setPlaying(false);
        });

        // Loop enforcement during playback
        wavesurfer.on('audioprocess', () => {
            if (loopStart !== null && loopEnd !== null) {
                const currentTime = wavesurfer.getCurrentTime();
                if (currentTime >= loopEnd) {
                    wavesurfer.seekTo(loopStart / wavesurfer.getDuration());
                    console.log(`Loop: seeking back to ${loopStart.toFixed(2)}s`);
                }
            }
        });

    } catch (error) {
        console.error('Failed to load waveform:', error);
    }
}

// Render beat/bar markers on waveform
function renderMarkers() {
    if (!wavesurfer || !currentBeatmap || currentBeatmap.length === 0) return;

    const waveformContainer = document.getElementById('waveform');
    if (!waveformContainer) return;

    // Remove existing markers
    const existingMarkers = waveformContainer.querySelectorAll('.bar-marker, .beat-marker');
    existingMarkers.forEach(m => m.remove());

    const duration = wavesurfer.getDuration();
    const markerFrequency = document.getElementById('markerFrequency')?.value || 'bar';
    const markersEnabled = document.getElementById('markersBtn')?.classList.contains('active');

    if (!markersEnabled) return;

    // Filter beats based on frequency
    const visibleBeats = filterBeatsByFrequency(currentBeatmap, markerFrequency);

    // Create marker elements
    visibleBeats.forEach(beat => {
        const percent = (beat.time / duration) * 100;

        const marker = document.createElement('div');
        marker.className = beat.beatNum === 1 ? 'bar-marker' : 'beat-marker';
        marker.style.left = `${percent}%`;

        waveformContainer.appendChild(marker);
    });
}

// Filter beats by frequency setting
function filterBeatsByFrequency(beatmap, frequency) {
    if (frequency === 'beat') return beatmap;
    if (frequency === 'bar') return beatmap.filter(b => b.beatNum === 1);

    // For multi-bar frequencies (bar2, bar4, bar8)
    const barInterval = parseInt(frequency.replace('bar', '')) || 1;
    let barCount = 0;

    return beatmap.filter((beat, index) => {
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

// Setup player bar controls
function setupPlayerBar() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const restartBtn = document.getElementById('restartBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumePercent = document.getElementById('volumePercent');
    const rateSlider = document.getElementById('rateSlider');
    const rateValue = document.getElementById('rateValue');
    const markersBtn = document.getElementById('markersBtn');
    const markerFrequency = document.getElementById('markerFrequency');
    const loopBtn = document.getElementById('loopBtn');
    const editLoopBtn = document.getElementById('editLoopBtn');
    const stemsBtn = document.getElementById('stemsBtn');

    // Play/Pause
    if (playPauseBtn) {
        playPauseBtn.addEventListener('click', () => {
            if (!wavesurfer) return;

            if (wavesurfer.isPlaying()) {
                wavesurfer.pause();
                playPauseBtn.textContent = '▶';
                state.setPlaying(false);
            } else {
                wavesurfer.play();
                playPauseBtn.textContent = '❚❚';
                state.setPlaying(true);
            }
        });
    }

    // Restart
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            if (wavesurfer) {
                wavesurfer.seekTo(0);
            }
        });
    }

    // Volume
    if (volumeSlider && volumePercent) {
        volumeSlider.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value) / 100;
            if (wavesurfer) {
                wavesurfer.setVolume(volume);
            }
            volumePercent.textContent = e.target.value + '%';
            state.setVolume(volume);
        });
    }

    // Rate/Speed
    if (rateSlider && rateValue) {
        rateSlider.addEventListener('input', (e) => {
            const rate = parseFloat(e.target.value);
            if (wavesurfer) {
                wavesurfer.setPlaybackRate(rate);
            }
            rateValue.textContent = rate.toFixed(2) + 'x';
            state.setRate(rate);

            // Update active preset button
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
            if (wavesurfer) wavesurfer.setPlaybackRate(rate);
            state.setRate(rate);

            document.querySelectorAll('.rate-preset-btn').forEach(b => {
                b.classList.remove('active');
            });
            btn.classList.add('active');
        });
    });

    // Markers toggle
    if (markersBtn) {
        markersBtn.addEventListener('click', () => {
            markersBtn.classList.toggle('active');
            renderMarkers();
        });
    }

    // Marker frequency change
    if (markerFrequency) {
        markerFrequency.addEventListener('change', () => {
            renderMarkers();
        });
    }

    // Loop button - toggle loop on/off (doesn't enable editing)
    if (loopBtn) {
        loopBtn.addEventListener('click', () => {
            if (loopStart !== null && loopEnd !== null) {
                // If loop is fully set, toggle it
                const isActive = loopBtn.classList.contains('active');
                if (isActive) {
                    // Disable loop but keep points
                    loopBtn.classList.remove('active');
                    updateLoopVisuals();
                } else {
                    // Re-enable loop with existing points
                    loopBtn.classList.add('active');
                    updateLoopVisuals();
                }
            } else {
                // No loop set - just show message
                console.log('Set loop points first (use EDIT LOOP button)');
            }
            updateLoopStatus();
        });
    }

    // Edit Loop button - enable/disable loop editing mode
    if (editLoopBtn) {
        editLoopBtn.addEventListener('click', () => {
            editLoopMode = !editLoopMode;
            editLoopBtn.classList.toggle('active', editLoopMode);

            const seekBtn = document.getElementById('seekBtn');
            if (seekBtn) {
                seekBtn.style.display = editLoopMode ? 'inline-block' : 'none';
            }

            if (editLoopMode) {
                console.log('Edit Loop mode ON - click waveform to set loop points');
                setupWaveformClickHandler();
            } else {
                console.log('Edit Loop mode OFF');
                removeWaveformClickHandler();
            }

            updateLoopStatus();
        });
    }

    // Seek toggle button (shows when edit loop is active)
    const seekBtn = document.getElementById('seekBtn');
    if (seekBtn) {
        seekBtn.addEventListener('click', () => {
            seekOnClick = !seekOnClick;
            seekBtn.classList.toggle('active', seekOnClick);
            console.log(`Seek on click: ${seekOnClick ? 'ON' : 'OFF'}`);
        });
    }

    // Stems button
    if (stemsBtn) {
        stemsBtn.addEventListener('click', () => {
            const stemsInterface = document.getElementById('stemsInterface');
            stemsInterface.classList.toggle('visible');
            stemsBtn.classList.toggle('active');
            console.log('TODO: Load stems interface');
        });
    }
}

// Setup file list interactions
function setupFileList() {
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');

    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            console.log('TODO: Implement select all');
        });
    }

    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            console.log('TODO: Implement deselect all');
        });
    }
}

// Loop functionality
function updateLoopVisuals() {
    updateLoopRegion();
    updateLoopStatus();
}

function updateLoopRegion() {
    const waveformContainer = document.getElementById('waveform');
    if (!waveformContainer || !wavesurfer) return;

    // Remove existing loop region
    const existingRegion = waveformContainer.querySelector('.loop-region');
    if (existingRegion) {
        existingRegion.remove();
    }

    // Don't draw if loop not set or loop button not active
    const loopBtn = document.getElementById('loopBtn');
    const loopActive = loopBtn?.classList.contains('active');

    if (loopStart === null || loopEnd === null || !loopActive) return;

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
}

function updateLoopStatus() {
    const loopStatus = document.getElementById('loopStatus');
    if (!loopStatus) return;

    if (!editLoopMode && (loopStart === null || loopEnd === null)) {
        loopStatus.textContent = 'Off';
        loopStatus.classList.remove('active');
    } else if (editLoopMode && loopStart === null) {
        loopStatus.textContent = 'Click start';
        loopStatus.classList.add('active');
    } else if (editLoopMode && loopEnd === null) {
        loopStatus.textContent = 'Click end →';
        loopStatus.classList.add('active');
    } else if (loopStart !== null && loopEnd !== null) {
        const duration = loopEnd - loopStart;
        loopStatus.textContent = `${duration.toFixed(1)}s`;
        loopStatus.classList.add('active');
    }
}

function setupWaveformClickHandler() {
    const waveformContainer = document.getElementById('waveform');
    if (!waveformContainer) return;

    const clickHandler = (e) => {
        if (!wavesurfer || !editLoopMode) return;

        const bounds = waveformContainer.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const percent = x / bounds.width;
        const duration = wavesurfer.getDuration();
        let clickTime = percent * duration;

        // Snap to nearest marker if markers are enabled
        const markersEnabled = document.getElementById('markersBtn')?.classList.contains('active');
        if (markersEnabled && currentBeatmap && currentBeatmap.length > 0) {
            clickTime = findNearestBeatToLeft(clickTime);
        }

        // Check if we're resetting existing points
        if (loopStart !== null && loopEnd !== null) {
            if (clickTime < loopStart) {
                // Click left of start - reset start
                loopStart = clickTime;
                console.log(`Loop start moved to ${clickTime.toFixed(2)}s`);
                updateLoopVisuals();
                if (seekOnClick) {
                    wavesurfer.seekTo(clickTime / duration);
                }
                return;
            } else if (clickTime > loopEnd) {
                // Click right of end - reset end
                loopEnd = clickTime;
                console.log(`Loop end moved to ${clickTime.toFixed(2)}s`);
                updateLoopVisuals();
                if (seekOnClick) {
                    wavesurfer.seekTo(clickTime / duration);
                }
                return;
            }
        }

        // Normal loop setting flow
        if (nextClickSets === 'start') {
            loopStart = clickTime;
            loopEnd = null;
            nextClickSets = 'end';
            console.log(`Loop start set to ${clickTime.toFixed(2)}s`);

            // Enable loop button automatically
            const loopBtn = document.getElementById('loopBtn');
            if (loopBtn) {
                loopBtn.classList.add('active');
            }
        } else if (nextClickSets === 'end') {
            if (clickTime <= loopStart) {
                console.log('Loop end must be after loop start - ignoring click');
                return;
            }
            loopEnd = clickTime;
            nextClickSets = 'start'; // Reset for next loop
            console.log(`Loop end set to ${clickTime.toFixed(2)}s - Loop active!`);
        }

        updateLoopVisuals();

        if (seekOnClick) {
            wavesurfer.seekTo(clickTime / duration);
        }
    };

    waveformContainer.addEventListener('click', clickHandler);
    waveformContainer._clickHandler = clickHandler;
}

function removeWaveformClickHandler() {
    const waveformContainer = document.getElementById('waveform');
    if (waveformContainer && waveformContainer._clickHandler) {
        waveformContainer.removeEventListener('click', waveformContainer._clickHandler);
        waveformContainer._clickHandler = null;
    }
}

function findNearestBeatToLeft(time) {
    if (!currentBeatmap || currentBeatmap.length === 0) return time;

    let nearestBeat = null;

    for (let i = 0; i < currentBeatmap.length; i++) {
        if (currentBeatmap[i].time <= time) {
            nearestBeat = currentBeatmap[i];
        } else {
            break;
        }
    }

    return nearestBeat ? nearestBeat.time : time;
}

// Start application
init();
