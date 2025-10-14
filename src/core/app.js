// Main application - Coordinates all components
import { state } from './state.js';
import { audioManager } from './audioContext.js';
import { WaveformComponent } from '../components/waveform.js';
import { PlayerBarComponent } from '../components/playerBar.js';
import { LibraryView } from '../views/libraryView.js';
import { hasStems } from './supabase.js';

console.log('🎵 Audio Library - Initializing...');

// Component instances
let waveformComponent = null;
let playerBarComponent = null;
let libraryView = null;
let currentView = 'library';

// Initialize application
async function init() {
    try {
        // Initialize audio context
        audioManager.init();

        // Initialize waveform component (stays at bottom)
        waveformComponent = new WaveformComponent('waveform');
        await waveformComponent.init();

        // Initialize player bar component (stays at bottom)
        playerBarComponent = new PlayerBarComponent(waveformComponent);
        playerBarComponent.init();

        // Initialize library view
        libraryView = new LibraryView();
        await libraryView.init();

        // Set up file selection handler
        state.on('fileSelected', async (file) => {
            await loadFileIntoPlayer(file);
        });

        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize application:', error);
    }
}

// Load file into player (waveform + metadata)
async function loadFileIntoPlayer(file) {
    try {
        // Update file info in player bar
        playerBarComponent.updateFileInfo(file.name || file.filename, {
            bpm: file.bpm,
            key: file.key
        });

        // Parse beatmap if available
        let beatmap = null;
        if (file.beatmap) {
            try {
                beatmap = typeof file.beatmap === 'string'
                    ? JSON.parse(file.beatmap)
                    : file.beatmap;
                console.log('Loaded beatmap:', beatmap.length, 'beats');
            } catch (e) {
                console.error('Failed to parse beatmap:', e);
            }
        }

        // Load audio into waveform
        if (file.file_url) {
            await waveformComponent.loadAudio(file.file_url, beatmap);
        }

        // Check for stems and show/hide stems button
        const hasS = await hasStems(file.id);
        const stemsBtn = document.getElementById('stemsBtn');
        if (stemsBtn) {
            stemsBtn.style.display = hasS ? 'block' : 'none';
        }

        // Store current file
        state.setCurrentFile(file);

    } catch (error) {
        console.error('Failed to load file into player:', error);
    }
}

// Start application
init();
