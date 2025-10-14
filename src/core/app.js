// Main application entry point
import { state } from './state.js';
import { fetchAudioFiles, hasStems } from './supabase.js';
import { audioManager } from './audioContext.js';
import { formatTime } from '../utils/formatting.js';

console.log('🎵 Audio Library - Initializing...');

let wavesurfer = null;
let allFiles = [];
let currentBeatmap = null;

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

    // Loop button (placeholder)
    if (loopBtn) {
        loopBtn.addEventListener('click', () => {
            loopBtn.classList.toggle('active');
            const loopStatus = document.getElementById('loopStatus');
            if (loopStatus) {
                loopStatus.textContent = loopBtn.classList.contains('active') ? 'On' : 'Off';
            }
            console.log('TODO: Implement looping');
        });
    }

    // Edit Loop button (placeholder)
    if (editLoopBtn) {
        editLoopBtn.addEventListener('click', () => {
            editLoopBtn.classList.toggle('active');
            console.log('TODO: Implement edit loop mode');
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

// Start application
init();
