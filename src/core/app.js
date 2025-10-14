// Main application entry point
import { state } from './state.js';
import { fetchAudioFiles, hasStems } from './supabase.js';
import { audioManager } from './audioContext.js';

console.log('🎵 Audio Library - Initializing...');

// Initialize application
async function init() {
    try {
        // Initialize audio context
        audioManager.init();

        // Load library view
        await loadLibraryView();

        // Set up view switcher
        setupViewSwitcher();

        // Set up player bar event listeners
        setupPlayerBar();

        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
    }
}

// Load library view with files
async function loadLibraryView() {
    const fileGrid = document.getElementById('fileGrid');
    fileGrid.innerHTML = '<div class="loading">Loading audio files...</div>';

    const files = await fetchAudioFiles();

    if (files.length === 0) {
        fileGrid.innerHTML = '<div class="loading">No audio files found</div>';
        return;
    }

    fileGrid.innerHTML = '';

    for (const file of files) {
        const card = createFileCard(file);
        fileGrid.appendChild(card);
    }
}

// Create file card element
function createFileCard(file) {
    const card = document.createElement('div');
    card.className = 'file-card';
    card.dataset.fileId = file.id;

    const name = document.createElement('div');
    name.className = 'file-card-name';
    name.textContent = file.name || file.filename;

    const meta = document.createElement('div');
    meta.className = 'file-card-meta';
    meta.innerHTML = `
        <span>${file.bpm ? file.bpm + ' BPM' : ''}</span>
        <span>${file.key || ''}</span>
    `;

    card.appendChild(name);
    card.appendChild(meta);

    // Check for stems icon
    hasStems(file.id).then(hasS => {
        if (hasS) {
            const icon = document.createElement('div');
            icon.className = 'file-card-icon';
            icon.textContent = '🎵 Stems available';
            card.appendChild(icon);
        }
    });

    card.addEventListener('click', () => {
        loadFile(file);
    });

    return card;
}

// Load file into player
function loadFile(file) {
    console.log('Loading file:', file);
    state.setCurrentFile(file);

    // Update UI
    document.getElementById('fileName').textContent = file.name || file.filename;
    document.getElementById('fileMetadata').textContent =
        `${file.bpm ? file.bpm + ' BPM' : ''} ${file.key ? '• ' + file.key : ''}`;

    // Highlight active card
    document.querySelectorAll('.file-card').forEach(card => {
        card.classList.toggle('active', card.dataset.fileId == file.id);
    });

    // Check for stems
    hasStems(file.id).then(hasS => {
        const stemsBtn = document.getElementById('stemsBtn');
        if (hasS) {
            stemsBtn.classList.remove('hidden');
        } else {
            stemsBtn.classList.add('hidden');
        }
    });

    // Load waveform (placeholder for now)
    console.log('TODO: Load waveform for:', file.file_url);
}

// Setup view switcher
function setupViewSwitcher() {
    const btn = document.getElementById('viewSwitcherBtn');
    const menu = document.getElementById('viewMenu');

    btn.addEventListener('click', () => {
        menu.classList.toggle('hidden');
    });

    document.querySelectorAll('.view-option').forEach(option => {
        option.addEventListener('click', () => {
            const view = option.dataset.view;
            switchView(view);
            menu.classList.add('hidden');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.add('hidden');
        }
    });
}

// Switch between views
function switchView(viewName) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });

    // Show selected view
    const view = document.getElementById(viewName + 'View');
    if (view) {
        view.classList.add('active');
    }

    // Update menu buttons
    document.querySelectorAll('.view-option').forEach(option => {
        option.classList.toggle('active', option.dataset.view === viewName);
    });

    state.setView(viewName);
}

// Setup player bar controls (basic for now)
function setupPlayerBar() {
    const playPauseBtn = document.getElementById('playPauseBtn');
    const stemsBtn = document.getElementById('stemsBtn');
    const volumeSlider = document.getElementById('volumeSlider');

    playPauseBtn.addEventListener('click', () => {
        const isPlaying = state.isPlaying;
        state.setPlaying(!isPlaying);
        playPauseBtn.textContent = !isPlaying ? '❚❚' : '▶';
        console.log('TODO: Implement play/pause');
    });

    stemsBtn.addEventListener('click', () => {
        const stemsInterface = document.getElementById('stemsInterface');
        stemsInterface.classList.toggle('visible');
        stemsBtn.classList.toggle('active');
        console.log('TODO: Load stems interface');
    });

    volumeSlider.addEventListener('input', (e) => {
        const volume = parseInt(e.target.value) / 100;
        state.setVolume(volume);
        document.getElementById('volumeValue').textContent = e.target.value + '%';
    });

    // More controls to be implemented...
}

// Start application
init();
