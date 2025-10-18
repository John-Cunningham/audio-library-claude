        // Import modules (ROUND 1 - Foundation Modules)
        import { supabase, PREF_KEYS } from './config.js';
        import * as Utils from './utils.js';
        import { generateStemPlayerBar } from './playerTemplate.js';
        import { PlayerBarComponent } from '../components/playerBar.js';
        import { WaveformComponent } from '../components/waveform.js';
        import { FileLoader } from '../services/fileLoader.js';
        import { ActionRecorder } from '../services/actionRecorder.js';

        // Import modules (ROUND 2 - Audio Core)
        import * as Metronome from './metronome.js';
        import { initKeyboardShortcuts } from './keyboardShortcuts.js';
        import * as ProgressBar from '../utils/progressBar.js';
        import * as MiniWaveform from '../components/miniWaveform.js';
        import { calculateBPMFromOnsets } from '../utils/bpmDetector.js';
        import * as TagManager from './tagManager.js';
        import * as TagEditModal from '../components/tagEditModal.js';
        import * as FileProcessor from './fileProcessor.js';
        import * as FileListRenderer from '../views/fileListRenderer.js';
        import * as BatchOperations from './batchOperations.js';
        import * as UploadManager from './uploadManager.js';
        import * as LoopControls from '../components/loopControls.js';
        import * as MarkerSystem from '../components/markerSystem.js';
        import * as StemMarkerSystem from '../components/stemMarkerSystem.js';
        import * as StemPlayerManager from '../components/stemPlayerManager.js';

        // Import modules (Phase 1 - View Manager)
        import * as ViewManager from './viewManager.js';
        import * as LibraryView from '../views/libraryView.js';
        import * as GalaxyView from '../views/galaxyView.js';
        import * as SphereView from '../views/sphereView.js';

        // Note: Modules provide:
        // - config.js: supabase client, PREF_KEYS constants
        // - utils.js: extractTagsFromFilename(), getAudioDuration(), etc.
        // - metronome.js: Metronome.toggleMetronome(wavesurfer), Metronome.scheduleMetronome(audioFiles, currentFileId, wavesurfer, barStartOffset, currentRate), etc.

        let audioFiles = [];
        let wavesurfer = null;
        let parentWaveform = null; // WaveformComponent instance for parent player
        let parentPlayerComponent = null; // PlayerBarComponent instance for parent player
        let fileLoader = null; // FileLoader service instance
        let actionRecorder = null; // ActionRecorder service instance
        let stemPlayerComponents = {}; // PlayerBarComponent instances for stem players {vocals: component, drums: component, ...}
        let currentFileId = null;
        let selectedFiles = new Set();
        let processingFiles = new Set(); // Track files currently being processed
        let expandedStems = new Set(); // Track files with expanded stems view (Phase 4 Step 1)

        // Stem playback state (Phase 4 Step 2A)
        let stemWavesurfers = {}; // { vocals: WaveSurfer, drums: WaveSurfer, bass: WaveSurfer, other: WaveSurfer }
        let stemFiles = {}; // Cached stem file data from audio_files_stems table for CURRENT file
        let allStemFiles = {}; // Preloaded ALL stem files, keyed by parent audio_file_id (Phase 4 Fix 1)
        // Phase 4 Fix 2: State keyed by stem file ID instead of stem type
        let stemMuted = {}; // { stemFileId: true/false }
        let stemSoloed = {}; // { stemFileId: true/false }
        let stemVolumes = {}; // { stemFileId: 0.0-1.0 }

        let searchQuery = '';
        let currentTagMode = null; // Default mode for tag clicks (null = no mode, normal click behavior)
        let showAllTags = false; // Toggle for showing low-count tags
        let isLooping = false;
        let isShuffling = false;
        let markersEnabled = true; // Toggle for bar markers
        let markerFrequency = 'bar'; // 'bar8', 'bar4', 'bar2', 'bar', 'halfbar', 'beat'
        let currentMarkers = []; // Store current marker positions for click-to-snap

        // Cycle mode state (combined edit + active loop)
        let loopStart = null; // Start time in seconds (or null if not set)
        let loopEnd = null; // End time in seconds (or null if not set)
        let cycleMode = false; // When true: can edit loop AND loop is active
        let nextClickSets = 'start'; // Track which point next click sets: 'start' or 'end'
        let immediateJump = 'off'; // Jump mode: 'off', 'on' (immediate), or 'clock' (quantized to next beat)
        let pendingJumpTarget = null; // Target time for clock-quantized jump
        let seekOnClick = 'off'; // Seek mode: 'off', 'seek' (immediate), or 'clock' (jump to loop start after setting end)
        let loopControlsExpanded = false; // Whether loop control buttons are expanded
        let loopFadesEnabled = false; // Whether to apply fades at loop boundaries
        let fadeTime = 0.015; // Fade duration in seconds (15ms default)
        let isMuted = false; // Track mute state
        let volumeBeforeMute = 100; // Store volume before muting
        let userPaused = false; // Track if user manually paused (preserve pause state when scrolling files)
        let preserveLoopOnFileChange = true; // Whether to keep loop points when switching files (default ON)
        let preservedLoopStartBar = null; // Bar number for preserved loop start (e.g., bar 17)
        let preservedLoopEndBar = null; // Bar number for preserved loop end (e.g., bar 25)
        let preservedCycleMode = false; // Cycle mode state to preserve across file changes
        let preservedPlaybackPositionInLoop = null; // Relative position within loop (0.0 to 1.0) for seamless swap
        let bpmLockEnabled = false; // Whether to lock BPM across file changes
        let lockedBPM = null; // The BPM to maintain when switching files

        // Loop action recorder - MOVED TO actionRecorder.js (Phase 10a)
        // All action recording state now managed by ActionRecorder service

        // Metronome state - MOVED TO metronome.js (ROUND 2)
        // All metronome state now managed by Metronome module

        // Bar start offset for Shift Start feature
        let barStartOffset = 0; // Offset to shift which marker is considered bar 1

        let currentRate = 1; // Track current playback rate (speed+pitch together)
        let filters = {
            canHave: new Set(),
            mustHave: new Set(),
            exclude: new Set()
        };
        let sortBy = 'date'; // 'name', 'date', 'bpm', 'key', 'length'
        let sortOrder = 'desc'; // 'asc' or 'desc'

        // Set tag click mode (for mobile)
        // Set tag mode (moved to tagManager.js)
        function setTagMode(mode) {
            TagManager.setMode(mode);
        }

        // Handle search input
        function handleSearch(query) {
            searchQuery = query;
            TagManager.render(searchQuery);
            FileListRenderer.render();
        }

        function handleSearchKeydown(e) {
            if (e.key === 'Enter') {
                // Exit search field
                e.target.blur();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                // Move to first tag
                const firstTag = document.querySelector('.tag-pill');
                if (firstTag) {
                    firstTag.focus();
                } else {
                    // If no tags, move to first file
                    const firstFile = document.querySelector('.file-item');
                    if (firstFile) {
                        firstFile.click();
                    }
                }
            }
        }

        // Load data from Supabase on startup
        async function loadData() {
            try {
                const { data, error } = await supabase
                    .from('audio_files')
                    .select('*')
                    .order('created_at', { ascending: false});

                if (error) throw error;

                audioFiles = data || [];

                // Phase 4 Fix 1: Preload ALL stem files for instant access
                await preloadAllStems();

                // Initialize view manager on first load
                if (!ViewManager.getCurrentViewName()) {
                    // Register all views
                    ViewManager.registerView('library', LibraryView);
                    ViewManager.registerView('galaxy', GalaxyView);
                    ViewManager.registerView('sphere', SphereView);

                    // Switch to library view with render functions
                    await ViewManager.switchView('library', {
                        renderFunction: FileListRenderer.render,
                        renderTagsFunction: renderTags
                    });
                } else {
                    // Just render if view already initialized
                    renderTags();
                    FileListRenderer.render();
                }
            } catch (error) {
                console.error('Error loading data:', error);
                alert('Error loading files from Supabase. Check console for details.');
            }
        }

        // Phase 4 Fix 1: Preload all stem files from database
        async function preloadAllStems() {
            allStemFiles = await StemPlayerManager.preloadAllStems(supabase);
        }

        // Polling removed - data refreshes immediately after processing completes

        // ========================================
        // STEM PLAYBACK FUNCTIONS (Phase 4 Step 2A)
        // ========================================

        // Fetch stem files for a parent audio file from audio_files_stems table
        async function fetchStemFiles(parentFileId) {
            return await StemPlayerManager.fetchStemFiles(supabase, parentFileId);
        }

        // Destroy all stem WaveSurfer instances
        function destroyAllStems() {
            const result = StemPlayerManager.destroyAllStems({
                stemWavesurfers,
                stemPlayerWavesurfers,
                stemPlayerComponents,
                wavesurfer
            });

            // Apply new state
            stemWavesurfers = result.stemWavesurfers;
            stemPlayerWavesurfers = result.stemPlayerWavesurfers;
            stemPlayerComponents = result.stemPlayerComponents;
            stemFiles = result.stemFiles;
            multiStemReadyCount = result.multiStemReadyCount;
            stemsPreloaded = result.stemsPreloaded;
            multiStemPlayerExpanded = result.multiStemPlayerExpanded;
        }

        // Create WaveSurfer instance for a single stem (hidden, no container)
        function createStemWaveSurfer(stemType) {
            return StemPlayerManager.createStemWaveSurfer(stemType, WaveSurfer);
        }

        // Load and sync all stems for a file
        async function loadStems(parentFileId, autoplay = true) {
            const result = await StemPlayerManager.loadStems(parentFileId, {
                allStemFiles,
                stemWavesurfers
            }, WaveSurfer, autoplay);

            if (result.success) {
                stemWavesurfers = result.stemWavesurfers;
                stemFiles = result.stemFiles;
                // Sync stems with main WaveSurfer events
                syncStemsWithMain(autoplay);
            }

            return result.success;
        }

        // Sync all stem WaveSurfers with main WaveSurfer
        function syncStemsWithMain(autoplay = true) {
            StemPlayerManager.syncStemsWithMain({
                wavesurfer,
                stemWavesurfers
            }, autoplay);
        }

        // Apply solo/mute logic to stems
        function updateStemAudioState() {
            // Phase 4 Step 2B: Get master volume from slider
            const volumeSlider = document.getElementById('volumeSlider');
            const sliderValue = volumeSlider ? parseFloat(volumeSlider.value) : 100;
            const sliderMax = volumeSlider ? parseFloat(volumeSlider.max) : 398;

            // Calculate master volume as 0-1 range, ensuring complete silence at 0
            const masterVolume = sliderValue === 0 ? 0 : sliderValue / sliderMax;

            // Update NEW multi-stem player volumes (when expanded)
            if (multiStemPlayerExpanded) {
                console.log(`[UPDATE STEM AUDIO] Master volume: ${(masterVolume * 100).toFixed(0)}%`);
                Object.keys(stemPlayerWavesurfers).forEach(stemType => {
                    const stemWS = stemPlayerWavesurfers[stemType];
                    if (!stemWS) return;

                    // Get the stem's individual volume slider value
                    const stemVolumeSlider = document.getElementById(`stem-volume-${stemType}`);
                    const stemVolume = stemVolumeSlider ? stemVolumeSlider.value / 100 : 1.0;

                    // Multiply master volume by stem's individual volume
                    const finalVolume = masterVolume * stemVolume;
                    stemWS.setVolume(finalVolume);
                    console.log(`[UPDATE STEM AUDIO] ${stemType}: master ${(masterVolume * 100).toFixed(0)}% × stem ${(stemVolume * 100).toFixed(0)}% = ${(finalVolume * 100).toFixed(0)}%`);
                });
            }

            // Also update OLD stem player volumes (legacy Phase 4 code)
            // Phase 4 Fix 2: Check if any stems are soloed (using stem file IDs)
            const stemFileIds = Object.values(stemFiles).map(sf => sf.id);
            const anySoloed = stemFileIds.some(id => stemSoloed[id]);

            Object.keys(stemWavesurfers).forEach(stemType => {
                const stemWS = stemWavesurfers[stemType];
                if (!stemWS) return;

                const stemFileId = stemFiles[stemType]?.id;
                if (!stemFileId) return;

                // Get state for this specific stem file
                const isMuted = stemMuted[stemFileId] || false;
                const isSoloed = stemSoloed[stemFileId] || false;
                const volume = stemVolumes[stemFileId] || 1.0;

                let finalVolume = 0;

                // If any stems are soloed, only play soloed stems
                // Otherwise, respect individual mute states
                if (anySoloed) {
                    finalVolume = isSoloed ? masterVolume * volume : 0;
                } else {
                    finalVolume = isMuted ? 0 : masterVolume * volume;
                }

                stemWS.setVolume(finalVolume);
            });
        }

        // ========================================
        // END STEM PLAYBACK FUNCTIONS
        // ========================================

        // Initialize WaveSurfer
        // THIN WRAPPER: Delegates to WaveformComponent
        function initWaveSurfer() {
            // Create parent waveform component if doesn't exist
            if (!parentWaveform) {
                parentWaveform = new WaveformComponent({
                    playerType: 'parent',
                    container: '#waveform',
                    dependencies: {
                        Metronome: Metronome
                    }
                });
            }

            // Create wavesurfer instance via component
            wavesurfer = parentWaveform.create(WaveSurfer);

            // Create and initialize parent player bar component (only once)
            if (!parentPlayerComponent) {
                parentPlayerComponent = new PlayerBarComponent({
                    playerType: 'parent',
                    waveform: wavesurfer
                });
                parentPlayerComponent.init();
                console.log('Parent PlayerBarComponent initialized');
            } else {
                // Update waveform reference for existing component
                parentPlayerComponent.waveform = wavesurfer;
                console.log('Parent PlayerBarComponent waveform reference updated');
            }
        }

        // Auto-tag from filename
        // Helper functions moved to fileProcessor.js
        // - extractTagsFromFilename()
        // - getAudioDuration()

        // Calculate BPM from onset positions with musical quantization
        // (Kept for future use when we integrate proper BPM detection)

        // Upload audio files (multi-file support)
        // Store pending upload files
        let pendingUploadFiles = [];

        // Upload workflow moved to uploadManager.js
        // - loadProcessingPreferences()
        // - saveProcessingPreferences()
        // - openUploadFlow()
        // - openUploadTagModal()
        // - File input event listener
        // - Checkbox change event listeners

        // Batch operations moved to batchOperations.js
        // - runSelectedProcessing()
        // - deleteFile()
        // - batchDelete()
        // - batchDetect()
        // - batchSeparateStems()

        // Upload functions moved to fileProcessor.js
        // - performUpload()
        // - uploadAudio()

        // Get all unique tags with counts, sorted by count (highest first)
        // Tag management functions (moved to tagManager.js)
        function handleTagClick(tag, event) {
            TagManager.handleClick(tag, event);
        }

        function selectAllVisibleTags() {
            TagManager.selectAllVisible();
        }

        function deselectAllTags() {
            TagManager.deselectAll();
        }

        // Render tags (moved to tagManager.js)
        function renderTags(searchQuery = '') {
            TagManager.render(searchQuery);
        }

        // Toggle showing all tags (moved to tagManager.js)
        function toggleShowAllTags() {
            TagManager.toggleShowAll();
        }

        // BPM/Key filtering functions removed - were unused (no UI containers exist)


        // File list rendering moved to src/views/fileListRenderer.js

        // Update STEMS button visibility and active state (Player Bar UI - NOT file list)
        function updateStemsButton() {
            StemPlayerManager.updateStemsButton({
                allStemFiles,
                currentFileId,
                multiStemPlayerExpanded
            });

            // Update text based on expanded state
            const stemsBtn = document.getElementById('stemsBtn');
            if (stemsBtn && stemsBtn.style.display !== 'none') {
                if (multiStemPlayerExpanded) {
                    stemsBtn.innerHTML = '<span>▼ STEMS</span>';
                } else {
                    stemsBtn.innerHTML = '<span>▲ STEMS</span>';
                }
            } else if (stemsBtn) {
                // Close multi-stem player if it's open and file has no stems
                if (multiStemPlayerExpanded) {
                    toggleMultiStemPlayer();
                }
            }
        }

        // Multi-Stem Player Functions (Galaxy View Style - Phase 1: Pre-loaded Silent Stems)
        let multiStemPlayerExpanded = false;
        let stemPlayerWavesurfers = {}; // Separate WaveSurfer instances for multi-stem player
        let multiStemReadyCount = 0; // Track how many stems are loaded and ready
        let multiStemAutoPlayOnReady = false; // Whether to auto-play stems when all are ready
        let stemsPreloaded = false; // Track if stems are pre-loaded for current file

        // Phase 2A: Individual Rate Controls
        let stemIndependentRates = {}; // {vocals: 1.0, drums: 1.25, ...} - user's rate multiplier per stem
        let stemRateLocked = {}; // {vocals: true, drums: false, ...} - whether stem follows parent rate
        let stemPlaybackIndependent = {
            vocals: true,
            drums: true,
            bass: true,
            other: true
        }; // whether stem should play when parent plays (user's active selection) - initialize all as active
        let currentParentFileBPM = null; // Store parent file's original BPM for calculations

        // CRITICAL: Expose to window so event handlers can access it
        window.stemPlaybackIndependent = stemPlaybackIndependent;

        // CRITICAL: Expose stemPlayerComponents so parent component can propagate to stems
        window.stemPlayerComponents = stemPlayerComponents;

        // Phase 2B: Individual Loop Controls (Version 27b)
        let stemLoopStates = {
            vocals: { enabled: false, start: null, end: null },
            drums: { enabled: false, start: null, end: null },
            bass: { enabled: false, start: null, end: null },
            other: { enabled: false, start: null, end: null }
        };

        // CRITICAL: Expose to window so PlayerBarComponent can sync to it
        window.stemLoopStates = stemLoopStates;

        // Phase 4: Cycle Mode Controls (Version 27c)
        let stemCycleModes = {
            vocals: false,
            drums: false,
            bass: false,
            other: false
        };
        let stemNextClickSets = {
            vocals: 'start',
            drums: 'start',
            bass: 'start',
            other: 'start'
        };

        // ============================================
        // VERSION 27D: FULL TEMPLATE SYSTEM - PER-STEM STATE OBJECTS
        // ============================================

        // Markers
        let stemMarkersEnabled = {
            vocals: true,
            drums: true,
            bass: true,
            other: true
        };
        let stemMarkerFrequency = {
            vocals: 'bar',
            drums: 'bar',
            bass: 'bar',
            other: 'bar'
        };
        let stemCurrentMarkers = {
            vocals: [],
            drums: [],
            bass: [],
            other: []
        };
        let stemBarStartOffset = {
            vocals: 0,
            drums: 0,
            bass: 0,
            other: 0
        };

        // Metronome
        let stemMetronomeEnabled = {
            vocals: false,
            drums: false,
            bass: false,
            other: false
        };
        let stemMetronomeSound = {
            vocals: 'click',
            drums: 'click',
            bass: 'click',
            other: 'click'
        };

        // Loop/Cycle additional controls
        let stemSeekOnClick = {
            vocals: 'off',
            drums: 'off',
            bass: 'off',
            other: 'off'
        };
        let stemImmediateJump = {
            vocals: 'off',
            drums: 'off',
            bass: 'off',
            other: 'off'
        };
        let stemLoopControlsExpanded = {
            vocals: false,
            drums: false,
            bass: false,
            other: false
        };
        let stemLoopFadesEnabled = {
            vocals: false,
            drums: false,
            bass: false,
            other: false
        };
        let stemFadeTime = {
            vocals: 15,
            drums: 15,
            bass: 15,
            other: 15
        };
        let stemPreserveLoop = {
            vocals: false,
            drums: false,
            bass: false,
            other: false
        };
        let stemBPMLock = {
            vocals: false,
            drums: false,
            bass: false,
            other: false
        };
        let stemRecordingActions = {
            vocals: false,
            drums: false,
            bass: false,
            other: false
        };
        let stemRecordedActions = {
            vocals: [],
            drums: [],
            bass: [],
            other: []
        };

        // Preserved loop positions (for file changes)
        let stemPreservedLoopStartBar = {
            vocals: null,
            drums: null,
            bass: null,
            other: null
        };
        let stemPreservedLoopEndBar = {
            vocals: null,
            drums: null,
            bass: null,
            other: null
        };

        // Phase 1: Pre-load stems silently in background when file loads
        async function preloadMultiStemWavesurfers(fileId) {
            const result = await StemPlayerManager.preloadMultiStemWavesurfers(
                fileId,
                {
                    supabase,
                    audioFiles,
                    currentRate,
                    WaveSurfer,
                    PlayerBarComponent,
                    Utils,
                    generateStemPlayerBar
                },
                {
                    currentFileId,
                    stemPlayerWavesurfers,
                    stemPlayerComponents,
                    stemLoopStates,
                    stemMarkersEnabled,
                    stemIndependentRates,
                    stemRateLocked,
                    currentParentFileBPM,
                    wavesurfer
                },
                {
                    addStemBarMarkers,
                    setupParentStemSync
                }
            );

            // Update app.js state with results
            stemFiles = result.stemFiles;
            stemPlayerWavesurfers = result.stemPlayerWavesurfers;
            stemPlayerComponents = result.stemPlayerComponents;
            stemIndependentRates = result.stemIndependentRates;
            stemRateLocked = result.stemRateLocked;
            currentParentFileBPM = result.currentParentFileBPM;
            window.currentParentFileBPM = result.currentParentFileBPM; // Expose to window for PlayerBarComponent
            stemsPreloaded = result.stemsPreloaded;
        }

        // Phase 1: Simplified toggle - just mute/unmute, no loading/destroying
        function toggleMultiStemPlayer() {
            const result = StemPlayerManager.toggleMultiStemPlayer(
                {
                    currentFileId,
                    multiStemPlayerExpanded,
                    wavesurfer,
                    stemPlayerWavesurfers
                },
                {
                    // No dependencies needed - function accesses DOM directly
                }
            );

            // Update app.js state
            multiStemPlayerExpanded = result.multiStemPlayerExpanded;

            // CRITICAL: Set up parent-stem sync when expanding
            if (multiStemPlayerExpanded && wavesurfer && Object.keys(stemPlayerWavesurfers).length > 0) {
                setupParentStemSync();
                console.log('✓ Parent-stem sync established after expanding stems');
            }
        }

        // Phase 1: UI generation only - stems already loaded by preloadMultiStemWavesurfers()
        // This function just makes the pre-existing waveform containers visible
        function generateMultiStemPlayerUI() {
            console.log('=== generateMultiStemPlayerUI (Phase 1 - Show Pre-loaded UI) ===');

            // The UI containers already exist (created in preloadMultiStemWavesurfers)
            // This function is now essentially a no-op since UI is pre-built
            // Just ensure visibility is correct

            const multiStemPlayer = document.getElementById('multiStemPlayer');
            if (multiStemPlayer) {
                console.log('Multi-stem UI already exists and ready');
            }

            console.log('=== UI ready ===');
        }

        async function initializeMultiStemPlayerWavesurfers() {
            const result = await StemPlayerManager.initializeMultiStemPlayerWavesurfers(
                {
                    wavesurfer,
                    stemFiles,
                    stemPlayerWavesurfers,
                    stemPlaybackIndependent,
                    stemLoopStates,
                    multiStemReadyCount,
                    multiStemAutoPlayOnReady,
                    cycleMode,
                    loopStart,
                    loopEnd
                },
                {
                    wavesurfer,
                    WaveSurfer,
                    Utils,
                    stemFiles,
                    audioFiles,
                    currentFileId
                },
                playAllStems,
                setupParentStemSync
            );

            // Update app.js state
            stemPlayerWavesurfers = result.stemPlayerWavesurfers;
            stemPlaybackIndependent = result.stemPlaybackIndependent;
        }

        // Play all stems in sync
        function playAllStems() {
            const stemTypes = ['vocals', 'drums', 'bass', 'other'];
            stemTypes.forEach(stemType => {
                const ws = stemPlayerWavesurfers[stemType];
                if (ws) {
                    ws.play();
                    // Update play button icon
                    const icon = document.getElementById(`stem-play-pause-icon-${stemType}`);
                    if (icon) icon.textContent = '||';
                }
            });
        }


        // Store parent-stem sync event handlers so we can clean them up
        let parentStemSyncHandlers = {
            play: null,
            pause: null,
            seeking: null
        };

        // Wrapper function to call module version with current state
        function setupParentStemSync() {
            StemPlayerManager.setupParentStemSync(
                {},  // state not used by module version
                {
                    wavesurfer,
                    stemPlayerWavesurfers,
                    multiStemPlayerExpanded,
                    stemPlaybackIndependent,
                    stemLoopStates
                }
            );
        }


        // THIN WRAPPER: Delegates to PlayerBarComponent
        function toggleMultiStemPlay(stemType) {
            stemPlayerComponents[stemType]?.playPause();
        }

        // THIN WRAPPER: Delegates to PlayerBarComponent
        function toggleMultiStemMute(stemType) {
            stemPlayerComponents[stemType]?.toggleMute();
        }

        function toggleMultiStemLoop(stemType) {
            // Phase 4: Instead of toggling basic loop, toggle cycle mode
            toggleStemCycleMode(stemType);
        }

        // Helper function to set stem loop region
        function setStemLoopRegion(stemType, startTime, endTime) {
            const loopState = stemLoopStates[stemType];
            loopState.start = startTime;
            loopState.end = endTime;
            console.log(`${stemType} loop region set: ${startTime}s - ${endTime}s`);

            // TODO: Render loop region visual overlay on waveform
        }

        // Phase 4: Toggle Cycle Mode for individual stem
        function toggleStemCycleMode(stemType) {
            // Delegate to PlayerBarComponent if it exists
            const stemComponent = stemPlayerComponents[stemType];
            if (stemComponent) {
                stemComponent.toggleCycleMode();
                return;
            }

            // Fallback to old implementation (shouldn't happen if components are set up properly)
            console.warn(`[toggleStemCycleMode] No component found for ${stemType}, using fallback`);
            const ws = stemPlayerWavesurfers[stemType];
            if (!ws) return;

            const loopState = stemLoopStates[stemType];

            // Toggle cycle mode
            stemCycleModes[stemType] = !stemCycleModes[stemType];

            if (stemCycleModes[stemType]) {
                // Entering cycle mode - enable loop editing
                stemNextClickSets[stemType] = 'start';
                console.log(`[${stemType}] CYCLE MODE ON - click waveform to set loop start/end`);
            } else {
                // Exiting cycle mode - disable loop editing
                // Also disable loop if it was playing
                loopState.enabled = false;
                loopState.start = null;
                loopState.end = null;
                console.log(`[${stemType}] CYCLE MODE OFF - loop disabled`);
            }

            // Update visual indicators
            updateStemLoopVisuals(stemType);
        }

        // Phase 4: Setup click handler for stem waveform cycle mode
        function setupStemCycleModeClickHandler(stemType, waveformContainer, ws) {
            // Remove old click listeners if they exist
            if (waveformContainer._clickHandler) {
                waveformContainer.removeEventListener('click', waveformContainer._clickHandler, true);
            }

            // Create new click handler with capture phase to intercept BEFORE WaveSurfer
            const clickHandler = (e) => {
                const loopState = stemLoopStates[stemType];
                const cycleMode = stemCycleModes[stemType];

                // If cycle mode is off, let WaveSurfer handle click normally (seeking)
                if (!cycleMode || !ws) return;

                // Prevent WaveSurfer from seeking when in cycle mode
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                // Get click position relative to waveform container
                const rect = waveformContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const relativeX = clickX / rect.width;

                // Calculate time at click position
                const duration = ws.getDuration();
                const clickTime = relativeX * duration;

                console.log(`[${stemType}] Click at ${clickTime.toFixed(2)}s`);

                // Check if clicking left of loop start (reset start) or right of loop end (reset end)
                if (loopState.start !== null && loopState.end !== null) {
                    if (clickTime < loopState.start) {
                        // Clicking left of loop start: move loop start
                        loopState.start = clickTime;
                        console.log(`[${stemType}] Loop start moved to ${clickTime.toFixed(2)}s`);
                        updateStemLoopVisuals(stemType);
                        return false;
                    } else if (clickTime > loopState.end) {
                        // Clicking right of loop end: move loop end
                        loopState.end = clickTime;
                        console.log(`[${stemType}] Loop end moved to ${clickTime.toFixed(2)}s`);
                        updateStemLoopVisuals(stemType);
                        return false;
                    }
                }

                // Normal loop setting flow
                if (stemNextClickSets[stemType] === 'start') {
                    // Set loop start
                    loopState.start = clickTime;
                    loopState.end = null;
                    loopState.enabled = false; // Don't enable loop yet (need end point)
                    stemNextClickSets[stemType] = 'end';
                    console.log(`[${stemType}] Loop start set to ${clickTime.toFixed(2)}s - click again for end`);
                    updateStemLoopVisuals(stemType);
                } else if (stemNextClickSets[stemType] === 'end') {
                    // Set loop end
                    if (clickTime <= loopState.start) {
                        console.log(`[${stemType}] Loop end must be after loop start - ignoring click`);
                        return false;
                    }
                    loopState.end = clickTime;
                    loopState.enabled = true; // Enable loop now that we have both points
                    stemNextClickSets[stemType] = 'start'; // Reset for next loop
                    console.log(`[${stemType}] Loop end set to ${clickTime.toFixed(2)}s - Loop active! Starting playback...`);

                    // Auto-play the stem when loop is set
                    if (!ws.isPlaying()) {
                        // Seek to loop start
                        ws.seekTo(loopState.start / duration);
                        // Start playing
                        ws.play();
                        // Mark stem as active (so parent play/pause respects it)
                        stemPlaybackIndependent[stemType] = true;
                        // Update play button icon
                        const playBtn = document.getElementById(`stem-play-pause-${stemType}`);
                        if (playBtn) {
                            const icon = playBtn.querySelector('span');
                            if (icon) icon.textContent = '||';
                        }
                        console.log(`[${stemType}] Auto-started playback from loop start`);
                    }

                    // Update visuals to show loop region
                    updateStemLoopVisuals(stemType);
                }

                return false;
            };

            // Add listener in CAPTURE phase to intercept before WaveSurfer's handler
            waveformContainer.addEventListener('click', clickHandler, true);
            waveformContainer._clickHandler = clickHandler; // Store reference for cleanup

            console.log(`[${stemType}] Cycle mode click handler installed`);
        }

        // Update stem loop visuals (button states, status text, loop region)
        function updateStemLoopVisuals(stemType) {
            const cycleBtn = document.getElementById(`stem-cycle-btn-${stemType}`);
            const loopStatus = document.getElementById(`stem-loop-status-${stemType}`);
            const loopState = stemLoopStates[stemType];
            const cycleMode = stemCycleModes[stemType];

            // Update cycle button state
            if (cycleBtn) {
                if (cycleMode) {
                    cycleBtn.classList.add('active');
                } else {
                    cycleBtn.classList.remove('active');
                }
            }

            // Update status text
            if (loopStatus) {
                const hasLoop = loopState.start !== null && loopState.end !== null;
                if (!cycleMode && !hasLoop) {
                    loopStatus.textContent = 'Off';
                    loopStatus.style.color = '#666';
                } else if (cycleMode && loopState.start === null) {
                    loopStatus.textContent = 'Click start';
                    loopStatus.style.color = '#f59e0b';
                } else if (cycleMode && loopState.end === null) {
                    loopStatus.textContent = 'Click end →';
                    loopStatus.style.color = '#f59e0b';
                } else if (hasLoop) {
                    const duration = loopState.end - loopState.start;
                    loopStatus.textContent = `${duration.toFixed(1)}s`;
                    loopStatus.style.color = '#10b981';
                }
            }

            // Update loop region visualization
            updateStemLoopRegion(stemType);
        }

        // Update stem loop region overlay on waveform
        function updateStemLoopRegion(stemType) {
            const waveformContainer = document.getElementById(`multi-stem-waveform-${stemType}`);
            if (!waveformContainer) return;

            const ws = stemPlayerWavesurfers[stemType];
            const loopState = stemLoopStates[stemType];
            const cycleMode = stemCycleModes[stemType];

            // Remove existing loop region
            const existingRegion = waveformContainer.querySelector('.loop-region');
            if (existingRegion) existingRegion.remove();

            // Don't draw if cycle mode is off or loop not fully set
            if (!cycleMode || loopState.start === null || loopState.end === null || !ws) return;

            const duration = ws.getDuration();
            if (duration === 0) return;

            const startPercent = (loopState.start / duration) * 100;
            const endPercent = (loopState.end / duration) * 100;
            const widthPercent = endPercent - startPercent;

            const loopRegion = document.createElement('div');
            loopRegion.className = 'loop-region';
            loopRegion.style.left = `${startPercent}%`;
            loopRegion.style.width = `${widthPercent}%`;

            waveformContainer.appendChild(loopRegion);
        }

        // THIN WRAPPER: Delegates to PlayerBarComponent
        function handleMultiStemVolumeChange(stemType, value) {
            stemPlayerComponents[stemType]?.setVolume(value);
        }

        // Phase 2A: Individual Rate Control Functions
        // THIN WRAPPERS: All delegate to PlayerBarComponent methods

        // THIN WRAPPER: Delegates to PlayerBarComponent
        function handleStemRateChange(stemType, sliderValue) {
            stemPlayerComponents[stemType]?.setRate(sliderValue);
        }

        // THIN WRAPPER: Delegates to PlayerBarComponent
        function setStemRatePreset(stemType, presetRate) {
            stemPlayerComponents[stemType]?.setRatePreset(presetRate);
        }

        // THIN WRAPPER: Delegates to PlayerBarComponent
        function toggleStemRateLock(stemType) {
            stemPlayerComponents[stemType]?.toggleRateLock();
        }

        // Phase 4 Step 2B: Render visual waveforms in expansion containers
        function renderStemWaveforms(fileId) {
            if (!stemFiles || Object.keys(stemFiles).length === 0) {
                console.log('No stem files loaded, skipping waveform render');
                return;
            }

            const stemTypes = ['vocals', 'drums', 'bass', 'other'];

            stemTypes.forEach(stemType => {
                const containerId = `stem-waveform-${stemType}-${fileId}`;
                const container = document.getElementById(containerId);

                if (!container) {
                    console.warn(`Container ${containerId} not found`);
                    return;
                }

                // Clear any existing content
                container.innerHTML = '';

                // Create a visual-only WaveSurfer instance for this stem
                const visualWS = WaveSurfer.create({
                    container: `#${containerId}`,
                    waveColor: '#666666',
                    progressColor: '#4a9eff',
                    cursorColor: 'transparent', // No cursor for visual-only
                    barWidth: 2,
                    barRadius: 3,
                    cursorWidth: 0,
                    height: 60,
                    barGap: 2,
                    responsive: true,
                    normalize: true,
                    backend: 'WebAudio',
                    autoScroll: false,
                    interact: false // Visual only, no interaction
                });

                // Load the stem audio file (visual only, no playback)
                if (stemFiles[stemType] && stemFiles[stemType].file_url) {
                    visualWS.load(stemFiles[stemType].file_url);
                    console.log(`Rendered visual waveform for ${stemType} stem`);
                } else {
                    console.warn(`No stem file found for ${stemType}`);
                }
            });
        }

        // Phase 4 Step 2B: Restore control states after re-expansion
        function restoreStemControlStates(fileId) {
            const stemTypes = ['vocals', 'drums', 'bass', 'other'];

            stemTypes.forEach(stemType => {
                // Phase 4 Fix 2: Get stem file ID
                const stemFileId = stemFiles[stemType]?.id;
                if (!stemFileId) return;

                // Restore volume slider
                const volumeSlider = document.getElementById(`stem-volume-${stemType}-${fileId}`);
                const volumeValue = document.getElementById(`stem-volume-value-${stemType}-${fileId}`);
                if (volumeSlider && volumeValue) {
                    const currentVolume = Math.round((stemVolumes[stemFileId] || 1.0) * 100);
                    volumeSlider.value = currentVolume;
                    volumeValue.textContent = `${currentVolume}%`;
                }

                // Restore mute button
                const muteBtn = document.getElementById(`stem-mute-${stemType}-${fileId}`);
                if (muteBtn) {
                    const isMuted = stemMuted[stemFileId] || false;
                    muteBtn.textContent = isMuted ? '🔇' : '🔊';
                    muteBtn.style.background = isMuted ? '#8b0000' : '#2a2a2a';
                }

                // Restore solo button
                const soloBtn = document.getElementById(`stem-solo-${stemType}-${fileId}`);
                if (soloBtn) {
                    const isSoloed = stemSoloed[stemFileId] || false;
                    soloBtn.style.background = isSoloed ? '#00aa00' : '#2a2a2a';
                    soloBtn.style.borderColor = isSoloed ? '#00ff00' : '#3a3a3a';
                }
            });
        }

        // Generate stems for a file
        function generateStems(fileId, event) {
            console.log('🎵 generateStems called with fileId:', fileId);
            event.preventDefault();
            event.stopPropagation();

            const file = audioFiles.find(f => f.id === fileId);
            console.log('📁 File found:', file?.name || 'NOT FOUND');
            if (!file) {
                console.warn('⚠️ File not found for ID:', fileId);
                return;
            }

            // Open the processing modal with stems icon context
            // This will pre-check the "Split Stems" checkbox and allow user to add other processing options
            console.log('🔍 Checking for window.openEditTagsModal:', typeof window.openEditTagsModal);
            if (window.openEditTagsModal) {
                console.log('✅ Opening modal with stems context');
                window.openEditTagsModal('stems', fileId);
            } else {
                console.error('❌ window.openEditTagsModal is not available!');
            }
        }

        // Load audio file
        // Add bar markers from beatmap data
        // THIN WRAPPER: Delegates to PlayerBarComponent
        function addBarMarkers(file) {
            if (parentPlayerComponent) {
                parentPlayerComponent.addBarMarkers(file);
            }
        }

        // THIN WRAPPER: Delegates to PlayerBarComponent
        function toggleMarkers() {
            if (parentPlayerComponent) {
                parentPlayerComponent.toggleMarkers();
            }
        }

        // THIN WRAPPER: Delegates to PlayerBarComponent
        function setMarkerFrequency(freq) {
            if (parentPlayerComponent) {
                parentPlayerComponent.setMarkerFrequency(freq);
            }
        }

        // THIN WRAPPER: Delegates to PlayerBarComponent
        function shiftBarStartLeft() {
            if (parentPlayerComponent) {
                parentPlayerComponent.shiftBarStartLeft();
            }
        }

        // THIN WRAPPER: Delegates to PlayerBarComponent
        function shiftBarStartRight() {
            if (parentPlayerComponent) {
                parentPlayerComponent.shiftBarStartRight();
            }
        }

        // ============================================
        // VERSION 27D: PER-STEM MARKER FUNCTIONS
        // ============================================
        // Note: findNearestMarkerToLeft() moved to MarkerSystem module

        // === STEM MARKER WRAPPERS (delegate to PlayerBarComponent) ===

        // THIN WRAPPER: Delegates to PlayerBarComponent
        function toggleStemMarkers(stemType) {
            if (stemPlayerComponents[stemType]) {
                stemPlayerComponents[stemType].toggleMarkers();
            }
        }

        // THIN WRAPPER: Delegates to PlayerBarComponent
        function setStemMarkerFrequency(stemType, freq) {
            if (stemPlayerComponents[stemType]) {
                stemPlayerComponents[stemType].setMarkerFrequency(freq);
            }
        }

        // THIN WRAPPER: Delegates to PlayerBarComponent
        function shiftStemBarStartLeft(stemType) {
            if (stemPlayerComponents[stemType]) {
                stemPlayerComponents[stemType].shiftBarStartLeft();
            }
        }

        // THIN WRAPPER: Delegates to PlayerBarComponent
        function shiftStemBarStartRight(stemType) {
            if (stemPlayerComponents[stemType]) {
                stemPlayerComponents[stemType].shiftBarStartRight();
            }
        }

        // Add bar markers to stem waveform
        function addStemBarMarkers(stemType, file) {
            // Call pure function from StemMarkerSystem module
            const markerTimes = StemMarkerSystem.addStemBarMarkers(
                stemType,
                file,
                stemPlayerWavesurfers,
                {
                    stemMarkersEnabled,
                    stemMarkerFrequency,
                    stemBarStartOffset,
                    stemCurrentMarkers
                }
            );

            // Update app.js state with new marker times
            stemCurrentMarkers[stemType] = markerTimes;
        }

        // Find nearest marker to the left for stem
        function findStemNearestMarkerToLeft(stemType, clickTime) {
            return StemMarkerSystem.findStemNearestMarkerToLeft(
                clickTime,
                stemCurrentMarkers[stemType]
            );
        }

        // ============================================
        // END PER-STEM MARKER FUNCTIONS
        // ============================================

        // Toggle Cycle Mode (combined edit + active loop)
        function toggleCycleMode() {
            // Call pure function from LoopControls module
            const result = LoopControls.toggleCycleMode({
                cycleMode,
                nextClickSets,
                multiStemPlayerExpanded,
                stemCycleModes,
                stemNextClickSets,
                stemLoopStates
            });

            // Apply results to app.js state
            cycleMode = result.cycleMode;
            nextClickSets = result.nextClickSets;

            // Update UI
            updateLoopVisuals();
        }

        function toggleSeekOnClick() {
            const result = LoopControls.toggleSeekOnClick({ seekOnClick });
            seekOnClick = result.seekOnClick;
            updateLoopVisuals();
        }

        function resetLoop() {
            const result = LoopControls.resetLoop();
            loopStart = result.loopStart;
            loopEnd = result.loopEnd;
            cycleMode = result.cycleMode;
            nextClickSets = result.nextClickSets;
            updateLoopVisuals();
        }

        function clearLoopKeepCycle() {
            const result = LoopControls.clearLoopKeepCycle();
            loopStart = result.loopStart;
            loopEnd = result.loopEnd;
            nextClickSets = result.nextClickSets;
            // Keep cycleMode = true so user can immediately set new loop
            updateLoopVisuals();
        }

        function updateLoopVisuals() {
            // Call pure function from LoopControls module (handles loop-specific UI)
            LoopControls.updateLoopVisuals({
                cycleMode,
                loopStart,
                loopEnd,
                nextClickSets,
                seekOnClick,
                loopControlsExpanded,
                immediateJump,
                loopFadesEnabled,
                preserveLoopOnFileChange,
                bpmLockEnabled,
                wavesurfer
            });

            // Update record/playback actions button states (delegated to ActionRecorder)
            if (actionRecorder) {
                actionRecorder.updateButtonStates();
            }
        }

        function toggleLoopControlsExpanded() {
            const result = LoopControls.toggleLoopControlsExpanded({ loopControlsExpanded });
            loopControlsExpanded = result.loopControlsExpanded;
            updateLoopVisuals();
        }

        function updateLoopRegion() {
            const waveformContainer = document.getElementById('waveform');
            if (!waveformContainer) return;

            // Remove existing loop region and progress mask
            const existingRegion = waveformContainer.querySelector('.loop-region');
            if (existingRegion) {
                existingRegion.remove();
            }
            const existingMask = waveformContainer.querySelector('.loop-progress-mask');
            if (existingMask) {
                existingMask.remove();
            }

            // Don't draw if cycle mode is off or loop not fully set
            if (!cycleMode || loopStart === null || loopEnd === null || !wavesurfer) return;

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

            // Add progress mask to hide blue progress before loop start (when loop is active)
            if (cycleMode && startPercent > 0) {
                const progressMask = document.createElement('div');
                progressMask.className = 'loop-progress-mask';
                progressMask.style.width = `${startPercent}%`;
                waveformContainer.appendChild(progressMask);
            }
        }

        function toggleImmediateJump() {
            const result = LoopControls.toggleImmediateJump({ immediateJump });
            immediateJump = result.immediateJump;
            updateLoopVisuals();
        }

        function toggleLoopFades() {
            const result = LoopControls.toggleLoopFades({ loopFadesEnabled });
            loopFadesEnabled = result.loopFadesEnabled;
            updateLoopVisuals();
        }

        function setFadeTime(milliseconds) {
            fadeTime = milliseconds / 1000; // Convert to seconds
            console.log(`Fade time: ${milliseconds}ms`);

            // Update display
            const display = document.getElementById('fadeTimeValue');
            if (display) {
                display.textContent = `${milliseconds}ms`;
            }
        }

        function togglePreserveLoop() {
            const result = LoopControls.togglePreserveLoop({ preserveLoopOnFileChange });
            preserveLoopOnFileChange = result.preserveLoopOnFileChange;
            updateLoopVisuals();
        }

        function toggleBPMLock() {
            const result = LoopControls.toggleBPMLock({
                bpmLockEnabled,
                audioFiles,
                currentFileId
            });

            bpmLockEnabled = result.bpmLockEnabled;
            lockedBPM = result.lockedBPM;
            updateLoopVisuals();
        }

        // THIN WRAPPER: Delegates to ActionRecorder service
        function toggleRecordActions() {
            if (!actionRecorder) {
                console.error('[app.js] ActionRecorder not initialized');
                return;
            }
            return actionRecorder.toggleRecording();
        }

        // THIN WRAPPER: Delegates to ActionRecorder service
        function recordAction(actionName, data = {}) {
            if (!actionRecorder) return;
            return actionRecorder.recordAction(actionName, data);
        }

        // THIN WRAPPER: Delegates to ActionRecorder service
        function stopPlayback() {
            if (!actionRecorder) return;
            return actionRecorder.stopPlayback();
        }

        // THIN WRAPPER: Delegates to ActionRecorder service
        function playRecordedActions() {
            if (!actionRecorder) {
                console.error('[app.js] ActionRecorder not initialized');
                return;
            }
            return actionRecorder.playRecordedActions();
        }

        // Helper function to find which bar marker index a time corresponds to
        function getBarIndexAtTime(time, file) {
            if (!file || !file.beatmap) return null;

            // Get all bar markers (beatNum = 1)
            const barMarkers = file.beatmap.filter(m => m.beatNum === 1);
            if (barMarkers.length === 0) return null;

            // Find the closest bar marker to this time
            let closestBarIndex = 0;
            let closestDistance = Math.abs(barMarkers[0].time - time);

            for (let i = 1; i < barMarkers.length; i++) {
                const distance = Math.abs(barMarkers[i].time - time);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestBarIndex = i;
                }
            }

            return closestBarIndex;
        }

        // Helper function to get time for a given bar marker index
        function getTimeForBarIndex(barIndex, file) {
            if (!file || !file.beatmap) return null;

            // Get all bar markers (beatNum = 1)
            const barMarkers = file.beatmap.filter(m => m.beatNum === 1);
            if (barMarkers.length === 0 || barIndex < 0 || barIndex >= barMarkers.length) return null;

            return barMarkers[barIndex].time;
        }

        // Loop manipulation functions
        function shiftLoopLeft() {
            const result = LoopControls.shiftLoopLeft({
                cycleMode, loopStart, loopEnd, immediateJump
            }, wavesurfer);

            if (result) {
                loopStart = result.loopStart;
                loopEnd = result.loopEnd;
                updateLoopVisuals();
            }
        }

        function shiftLoopRight() {
            const result = LoopControls.shiftLoopRight({
                cycleMode, loopStart, loopEnd, immediateJump
            }, wavesurfer);

            if (result) {
                loopStart = result.loopStart;
                loopEnd = result.loopEnd;
                updateLoopVisuals();
            }
        }

        function halfLoopLength() {
            const result = LoopControls.halfLoopLength({
                cycleMode, loopStart, loopEnd, immediateJump
            }, wavesurfer);

            if (result) {
                loopEnd = result.loopEnd;
                updateLoopVisuals();
            }
        }

        function doubleLoopLength() {
            const result = LoopControls.doubleLoopLength({
                cycleMode, loopStart, loopEnd, immediateJump
            }, wavesurfer);

            if (result) {
                loopEnd = result.loopEnd;
                updateLoopVisuals();
            }
        }

        // Shift+Left Arrow: Move loop START marker to the LEFT (expand loop from left)
        function moveStartLeft() {
            const result = LoopControls.moveStartLeft({
                cycleMode, loopStart, loopEnd, currentMarkers, immediateJump
            }, wavesurfer);

            if (result) {
                loopStart = result.loopStart;
                updateLoopVisuals();
            }
        }

        function moveEndRight() {
            const result = LoopControls.moveEndRight({
                cycleMode, loopStart, loopEnd, currentMarkers, immediateJump
            }, wavesurfer);

            if (result) {
                loopEnd = result.loopEnd;
                updateLoopVisuals();
            }
        }

        function moveStartRight() {
            const result = LoopControls.moveStartRight({
                cycleMode, loopStart, loopEnd, currentMarkers, immediateJump
            }, wavesurfer);

            if (result) {
                loopStart = result.loopStart;
                updateLoopVisuals();
            }
        }

        function moveEndLeft() {
            const result = LoopControls.moveEndLeft({
                cycleMode, loopStart, loopEnd, currentMarkers, immediateJump
            }, wavesurfer);

            if (result) {
                loopEnd = result.loopEnd;
                updateLoopVisuals();
            }
        }

        // Metronome functions - EXTRACTED TO metronome.js (ROUND 2)
        // All metronome functionality now handled by Metronome module
        // Wrapper functions below for window object exposure

        function toggleMetronome() {
            return Metronome.toggleMetronome(wavesurfer);
        }

        function setMetronomeSound(sound) {
            return Metronome.setMetronomeSound(sound);
        }

        // THIN WRAPPER: Delegates to FileLoader service
        async function loadAudio(fileId, autoplay = true) {
            if (!fileLoader) {
                console.error('[app.js] FileLoader not initialized');
                return;
            }

            // Reset bar start offset (managed by app.js)
            barStartOffset = 0;

            // Delegate to FileLoader service
            const result = await fileLoader.loadFile(fileId, autoplay);
            if (!result || result.alreadyLoaded) return;

            // FileLoader manages all other state through callbacks
            // wavesurfer is set via setWavesurfer callback
            // currentFileId is set via setCurrentFileId callback
            // Loop state is managed via get/set callbacks
        }

        // Play/Pause audio
        function playPause() {
            // If no file loaded, load the top file in the list
            if (!wavesurfer || !currentFileId) {
                const filteredFiles = FileListRenderer.filterFiles();
                const sortedFiles = FileListRenderer.sortFiles(filteredFiles);
                if (sortedFiles.length > 0) {
                    loadAudio(sortedFiles[0].id, true); // Load and play the top file
                }
                return;
            }

            // ALWAYS control the parent wavesurfer
            // Even when stems are expanded, parent plays (muted) and stems sync via events
            wavesurfer.playPause();
            const icon = document.getElementById('playPauseIcon');
            icon.textContent = wavesurfer.isPlaying() ? '⏸' : '▶';

            // Track user pause state (if pausing, set to true; if playing, set to false)
            userPaused = !wavesurfer.isPlaying();

            // Record action
            recordAction(wavesurfer.isPlaying() ? 'play' : 'pause', {});
        }

        // Update player time display
        function updatePlayerTime() {
            if (!wavesurfer) return;

            const current = wavesurfer.getCurrentTime();
            const duration = wavesurfer.getDuration();

            const formatTime = (seconds) => {
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            };

            document.getElementById('playerTime').textContent =
                `${formatTime(current)} / ${formatTime(duration)}`;
        }

        // Toggle loop
        function toggleLoop() {
            const result = LoopControls.toggleLoop({ isLooping });
            isLooping = result.isLooping;
        }

        // Toggle shuffle
        function toggleShuffle() {
            // Prevent toggling shuffle when loop is active
            if (isLooping) return;

            isShuffling = !isShuffling;
            const btn = document.getElementById('shuffleBtn');
            btn.classList.toggle('active', isShuffling);
        }

        // Set volume
        function setVolume(value) {
            const volume = value / 100;
            if (wavesurfer) {
                wavesurfer.setVolume(volume);
            }

            // Phase 4 Step 2B: Update all stem volumes
            updateStemAudioState();

            // Calculate decibels (relative to 100% = 0dB)
            let db;
            if (value === 0) {
                db = '-∞';
            } else {
                db = (20 * Math.log10(value / 100)).toFixed(1);
                db = (db >= 0 ? '+' : '') + db;
            }

            document.getElementById('volumePercent').textContent = `${value}% (${db} dB)`;
        }

        // Reset volume to 100%
        function resetVolume() {
            document.getElementById('volumeSlider').value = 100;
            setVolume(100);
        }

        function toggleMute() {
            const volumeSlider = document.getElementById('volumeSlider');
            const muteBtn = document.getElementById('muteBtn');

            if (isMuted) {
                // Unmute: restore previous volume
                volumeSlider.value = volumeBeforeMute;
                setVolume(volumeBeforeMute);
                isMuted = false;
                muteBtn.textContent = '🔊';
            } else {
                // Mute: save current volume and set to 0
                volumeBeforeMute = parseInt(volumeSlider.value);
                volumeSlider.value = 0;
                setVolume(0);
                isMuted = true;
                muteBtn.textContent = '🔇';
            }
        }

        // Set playback rate (natural analog - speed and pitch together)
        function setPlaybackRate(rate) {
            currentRate = rate;
            window.currentRate = rate; // Expose to window for PlayerBarComponent access

            // Check for OLD stem system (disabled but code still exists)
            const hasStemWavesurfers = Object.keys(stemWavesurfers).length > 0;

            // Phase 1: Check for NEW multi-stem player system
            const hasMultiStemWavesurfers = Object.keys(stemPlayerWavesurfers).length > 0;
            const wasPlaying = wavesurfer && wavesurfer.isPlaying();

            // Pause old stems if present (shouldn't happen but just in case)
            if (hasStemWavesurfers && wasPlaying) {
                Object.keys(stemWavesurfers).forEach(stemType => {
                    const stemWS = stemWavesurfers[stemType];
                    if (stemWS && stemWS.isPlaying()) {
                        stemWS.pause();
                    }
                });
            }

            // Phase 1: Pause new multi-stem player stems if playing
            if (hasMultiStemWavesurfers && wasPlaying) {
                Object.keys(stemPlayerWavesurfers).forEach(stemType => {
                    const stemWS = stemPlayerWavesurfers[stemType];
                    if (stemWS && stemWS.isPlaying()) {
                        stemWS.pause();
                    }
                });
            }

            // Set rate on parent WaveSurfer
            if (wavesurfer) {
                wavesurfer.setPlaybackRate(rate, false); // false = natural analog (speed+pitch)
            }

            // Set rate on OLD stem WaveSurfers (if any exist)
            Object.keys(stemWavesurfers).forEach(stemType => {
                const stemWS = stemWavesurfers[stemType];
                if (stemWS) {
                    stemWS.setPlaybackRate(rate, false);
                }
            });

            // Phase 2A: Recalculate and set rate on NEW multi-stem player WaveSurfers
            // Each stem's final rate = independentRate × parentRate (multiplicative)
            // Delegate to PlayerBarComponent to calculate and update
            Object.keys(stemPlayerWavesurfers).forEach(stemType => {
                const stemComponent = stemPlayerComponents[stemType];
                if (stemComponent) {
                    const finalRate = stemComponent.calculateFinalRate();
                    stemPlayerWavesurfers[stemType].setPlaybackRate(finalRate, false);
                    stemComponent.updateRateDisplay(finalRate);
                    console.log(`✓ ${stemType} rate set to ${finalRate.toFixed(2)}x (${stemComponent.rateLocked ? 'locked' : `independent: ${stemComponent.independentRate.toFixed(2)}x`})`);
                }
            });

            // Re-sync and resume OLD stems (if any)
            if (hasStemWavesurfers && wasPlaying) {
                const currentProgress = wavesurfer.getCurrentTime() / wavesurfer.getDuration();
                Object.keys(stemWavesurfers).forEach(stemType => {
                    const stemWS = stemWavesurfers[stemType];
                    if (stemWS) {
                        stemWS.seekTo(currentProgress);
                    }
                });

                setTimeout(() => {
                    Object.keys(stemWavesurfers).forEach(stemType => {
                        const stemWS = stemWavesurfers[stemType];
                        if (stemWS && !stemWS.isPlaying()) {
                            stemWS.play();
                        }
                    });
                }, 50);
            }

            // Phase 1: Re-sync and resume NEW multi-stem player stems
            if (hasMultiStemWavesurfers && wasPlaying) {
                const currentProgress = wavesurfer.getCurrentTime() / wavesurfer.getDuration();
                Object.keys(stemPlayerWavesurfers).forEach(stemType => {
                    const stemWS = stemPlayerWavesurfers[stemType];
                    if (stemWS) {
                        stemWS.seekTo(currentProgress);
                    }
                });

                setTimeout(() => {
                    Object.keys(stemPlayerWavesurfers).forEach(stemType => {
                        const stemWS = stemPlayerWavesurfers[stemType];
                        if (stemWS && !stemWS.isPlaying()) {
                            stemWS.play();
                            console.log(`✓ ${stemType} resumed at ${rate.toFixed(2)}x`);
                        }
                    });
                }, 50);
            }

            // Clear any scheduled metronome notes when rate changes
            // This prevents "copies" of metronome sounds at different rates
            Metronome.stopAllMetronomeSounds();
            Metronome.setLastMetronomeScheduleTime(0); // Force rescheduling

            // Immediately reschedule metronome if it's enabled and playing
            if (Metronome.isMetronomeEnabled() && wavesurfer && wavesurfer.isPlaying()) {
                Metronome.scheduleMetronome(audioFiles, currentFileId, wavesurfer, barStartOffset, currentRate);
                Metronome.setLastMetronomeScheduleTime(Date.now());
            }

            // Update slider and display
            document.getElementById('rateSlider').value = rate;
            document.getElementById('rateValue').textContent = rate.toFixed(1) + 'x';

            // Update button states (check within small tolerance for floating point)
            document.getElementById('halfRateBtn').classList.toggle('active', Math.abs(rate - 0.5) < 0.05);
            document.getElementById('normalRateBtn').classList.toggle('active', Math.abs(rate - 1) < 0.05);
            document.getElementById('doubleRateBtn').classList.toggle('active', Math.abs(rate - 2) < 0.05);

            // Record action
            recordAction('setRate', { rate });
        }

        // Reset rate to 1.0x
        function resetRate() {
            setPlaybackRate(1.0);
        }

        // ============================================
        // ADVANCED SPEED/PITCH CONTROLS (Placeholder)
        // ============================================

        let isAdvancedRateMode = false;
        let currentSpeed = 1.0;
        let currentPitch = 0.0; // semitones
        let speedPitchLocked = true;

        // Toggle between simple rate and advanced speed/pitch mode
        function toggleRateMode() {
            isAdvancedRateMode = !isAdvancedRateMode;
            const advancedContainer = document.getElementById('advancedRateContainer');
            const simpleRateSlider = document.getElementById('rateSlider');
            const toggleBtn = document.getElementById('toggleRateModeBtn');

            if (advancedContainer) {
                advancedContainer.style.display = isAdvancedRateMode ? 'flex' : 'none';
            }

            if (simpleRateSlider) {
                simpleRateSlider.style.display = isAdvancedRateMode ? 'none' : 'block';
            }

            if (toggleBtn) {
                toggleBtn.classList.toggle('active', isAdvancedRateMode);
            }

            console.log(`Advanced rate mode: ${isAdvancedRateMode ? 'ON' : 'OFF'}`);
        }

        // Set speed (placeholder - will integrate with Signalsmith later)
        function setSpeed(speed) {
            currentSpeed = speed;
            document.getElementById('speedValue').textContent = speed.toFixed(1) + 'x';

            // For now, just adjust the simple rate slider
            if (speedPitchLocked) {
                setPlaybackRate(speed);
            }

            console.log(`Speed set to ${speed}x (placeholder - chipmunk effect only)`);
        }

        // Reset speed to 1.0x
        function resetSpeed() {
            setSpeed(1.0);
        }

        // Set pitch (placeholder - will integrate with Signalsmith later)
        function setPitch(semitones) {
            currentPitch = semitones;
            document.getElementById('pitchValue').textContent = semitones.toFixed(1) + 'st';

            console.log(`Pitch set to ${semitones}st (placeholder - not yet functional)`);
        }

        // Reset pitch to 0 semitones
        function resetPitch() {
            setPitch(0);
        }

        // Toggle speed/pitch lock
        function toggleSpeedPitchLock() {
            speedPitchLocked = !speedPitchLocked;
            const lockBtn = document.getElementById('speedPitchLockBtn');

            if (lockBtn) {
                lockBtn.innerHTML = speedPitchLocked ? '<span>🔗</span>' : '<span>🔓</span>';
                lockBtn.classList.toggle('active', speedPitchLocked);
                lockBtn.title = speedPitchLocked
                    ? 'Unlock speed and pitch (independent control)'
                    : 'Lock speed and pitch together';
            }

            console.log(`Speed/Pitch ${speedPitchLocked ? 'LOCKED' : 'UNLOCKED'}`);
        }

        // Phase 4 Step 2B: Stem volume control
        function handleStemVolumeChange(stemType, value) {
            // Phase 4 Fix 2: Use stem file ID instead of stem type
            const stemFileId = stemFiles[stemType]?.id;
            if (!stemFileId) return;

            const volume = value / 100;
            stemVolumes[stemFileId] = volume;

            // Update the volume value display
            const valueDisplay = document.getElementById(`stem-volume-value-${stemType}-${currentFileId}`);
            if (valueDisplay) {
                valueDisplay.textContent = `${value}%`;
            }

            // Update actual audio volume
            updateStemAudioState();
        }

        // Phase 4 Step 2B: Stem mute toggle
        function handleStemMute(stemType) {
            // Phase 4 Fix 2: Use stem file ID instead of stem type
            const stemFileId = stemFiles[stemType]?.id;
            if (!stemFileId) return;

            stemMuted[stemFileId] = !stemMuted[stemFileId];

            // Update button appearance
            const muteBtn = document.getElementById(`stem-mute-${stemType}-${currentFileId}`);
            if (muteBtn) {
                muteBtn.textContent = stemMuted[stemFileId] ? '🔇' : '🔊';
                muteBtn.style.background = stemMuted[stemFileId] ? '#8b0000' : '#2a2a2a';
            }

            // Update actual audio volume
            updateStemAudioState();
        }

        // Phase 4 Step 2B: Stem solo toggle
        function handleStemSolo(stemType) {
            // Phase 4 Fix 2: Use stem file ID instead of stem type
            const stemFileId = stemFiles[stemType]?.id;
            if (!stemFileId) return;

            stemSoloed[stemFileId] = !stemSoloed[stemFileId];

            // Update button appearance
            const soloBtn = document.getElementById(`stem-solo-${stemType}-${currentFileId}`);
            if (soloBtn) {
                soloBtn.style.background = stemSoloed[stemFileId] ? '#00aa00' : '#2a2a2a';
                soloBtn.style.borderColor = stemSoloed[stemFileId] ? '#00ff00' : '#3a3a3a';
            }

            // Update actual audio volume
            updateStemAudioState();
        }

        // Next track
        function nextTrack() {
            const filteredFiles = FileListRenderer.filterFiles();
            if (filteredFiles.length === 0) return;

            let nextIndex;
            if (isShuffling) {
                nextIndex = Math.floor(Math.random() * filteredFiles.length);
            } else {
                const currentIndex = filteredFiles.findIndex(f => f.id === currentFileId);
                nextIndex = (currentIndex + 1) % filteredFiles.length;
            }

            loadAudio(filteredFiles[nextIndex].id, !userPaused); // Respect pause state
        }

        // Previous track
        function previousTrack() {
            const filteredFiles = FileListRenderer.filterFiles();
            if (filteredFiles.length === 0) return;

            // If in cycle mode with loop set, jump to loop start
            if (cycleMode && loopStart !== null && loopEnd !== null) {
                if (wavesurfer) {
                    wavesurfer.seekTo(loopStart / wavesurfer.getDuration());
                    if (!wavesurfer.isPlaying()) {
                        wavesurfer.play();
                    }
                }
                return;
            }

            // If currently playing and more than 1 second into the file, restart from beginning
            if (currentFileId && wavesurfer && wavesurfer.getCurrentTime() > 1.0) {
                wavesurfer.seekTo(0);
                return;
            }

            // Otherwise, go to previous file
            const currentIndex = filteredFiles.findIndex(f => f.id === currentFileId);
            const prevIndex = (currentIndex - 1 + filteredFiles.length) % filteredFiles.length;

            loadAudio(filteredFiles[prevIndex].id, !userPaused); // Respect pause state
        }

        // Delete and batch operation functions moved to batchOperations.js

        // Progress bar functions moved to utils/progressBar.js

        // Modal event handlers moved to tagEditModal.js
        // Initialize tag edit modal keyboard shortcuts and event handlers
        document.addEventListener('DOMContentLoaded', () => {
            TagEditModal.initEventHandlers({
                setPendingUploadFiles: (files) => { pendingUploadFiles = files; },
                setSearchQuery: (query) => { searchQuery = query; },
                filters,
                renderTags,
                renderFiles: FileListRenderer.render,
                getAllTags: () => TagManager.getAllTags()
            });
        });

        // addModalTag() moved to tagEditModal.js

        // Initialize keyboard shortcuts (moved to keyboardShortcuts.js)
        initKeyboardShortcuts(
            // Callbacks object
            {
                playPause,
                toggleMarkers,
                toggleMetronome: Metronome.toggleMetronome,
                toggleCycleMode,
                toggleLoop,
                resetLoop,
                toggleShuffle,
                toggleImmediateJump,
                setVolume,
                previousTrack,
                nextTrack,
                loadAudio,
                batchEditTags: () => TagEditModal.open(selectedFiles, audioFiles),
                shiftLoopLeft,
                shiftLoopRight,
                halfLoopLength,
                doubleLoopLength,
                moveStartLeft,
                moveStartRight,
                moveEndLeft,
                moveEndRight,
                filterFiles: FileListRenderer.filterFiles
            },
            // State getters object
            {
                getCurrentFileId: () => currentFileId,
                getSelectedFiles: () => selectedFiles,
                getCycleMode: () => cycleMode,
                getLoopStart: () => loopStart,
                getLoopEnd: () => loopEnd,
                getUserPaused: () => userPaused,
                getWavesurfer: () => wavesurfer,
                getRecordingWaitingForStart: () => actionRecorder ? actionRecorder.getRecordingWaiting() : false,
                setRecordingWaitingForStart: (val) => { if (actionRecorder) actionRecorder.setRecordingWaiting(val); },
                setIsRecordingActions: (val) => { if (actionRecorder) actionRecorder.setIsRecording(val); },
                setRecordingStartTime: (val) => { if (actionRecorder) actionRecorder.setRecordingStartTime(val); },
                getRecordedActions: () => actionRecorder ? actionRecorder.getRecordedActions() : [],
                getMarkersEnabled: () => markersEnabled,
                getLoopFadesEnabled: () => loopFadesEnabled,
                getImmediateJump: () => immediateJump,
                getSeekOnClick: () => seekOnClick,
                getCurrentRate: () => currentRate,
                updateLoopVisuals,
                recordAction,
                isMetronomeEnabled: Metronome.isMetronomeEnabled
            }
        );

        // Initialize mini waveforms (moved to miniWaveform.js)
        MiniWaveform.init({
            loadAudio,
            getWavesurfer: () => wavesurfer
        });

        // Initialize tag manager (moved to tagManager.js)
        TagManager.init(
            // Callbacks
            {
                renderFiles: () => FileListRenderer.render()
            },
            // State getters/setters
            {
                getAudioFiles: () => audioFiles,
                getFilters: () => filters,
                getShowAllTags: () => showAllTags,
                setShowAllTags: (val) => { showAllTags = val; },
                getCurrentTagMode: () => currentTagMode,
                setCurrentTagMode: (val) => { currentTagMode = val; },
                getSearchQuery: () => searchQuery,
                setSearchQuery: (val) => { searchQuery = val; }
            }
        );

        // Initialize file list renderer (moved to fileListRenderer.js)
        FileListRenderer.init(
            // Callbacks
            {
                loadFile: loadAudio,
                renderMiniWaveforms: (files) => MiniWaveform.renderAll(files),
                openTagEditModal: (selectedFiles, audioFiles) => TagEditModal.open(selectedFiles, audioFiles),
                renderStemWaveforms,
                restoreStemControlStates,
                updateStemsButton
            },
            // State getters
            {
                getAudioFiles: () => audioFiles,
                getSearchQuery: () => searchQuery,
                getFilters: () => filters,
                getSelectedFiles: () => selectedFiles,
                getCurrentFileId: () => currentFileId,
                getProcessingFiles: () => processingFiles,
                getExpandedStems: () => expandedStems,
                getStemWavesurfers: () => stemWavesurfers
            }
        );

        // Initialize batch operations (moved to batchOperations.js)
        BatchOperations.init(
            // Callbacks
            {
                loadData,
                clearPlayer: () => {
                    currentFileId = null;
                    if (wavesurfer) {
                        wavesurfer.destroy();
                        wavesurfer = null;
                    }
                    document.getElementById('playerFilename').textContent = 'No file selected';
                    document.getElementById('playerTime').textContent = '0:00 / 0:00';
                    document.getElementById('playPauseIcon').textContent = '▶';
                }
            },
            // State getters
            {
                getSupabase: () => supabase,
                getAudioFiles: () => audioFiles,
                getSelectedFiles: () => selectedFiles,
                getCurrentFileId: () => currentFileId,
                getProcessingFiles: () => processingFiles
            }
        );

        // Initialize upload manager (moved to uploadManager.js)
        UploadManager.init({
            getPendingUploadFiles: () => pendingUploadFiles,
            setPendingUploadFiles: (files) => { pendingUploadFiles = files; },
            renderModalTags: () => TagEditModal.render()
        });

        // Initialize loop controls (pure function approach - state passed to each function call)
        LoopControls.init({
            recordAction,
            getAudioFiles: () => audioFiles,
            getCurrentFileId: () => currentFileId,
            setPendingJumpTarget: (target) => { pendingJumpTarget = target; }
        });

        // Initialize on load
        loadData();

        // Initialize FileLoader service
        fileLoader = new FileLoader({
            // State getters/setters
            audioFiles: () => audioFiles,
            getCurrentFileId: () => currentFileId,
            setCurrentFileId: (id) => { currentFileId = id; },
            getWavesurfer: () => wavesurfer,
            setWavesurfer: (ws) => { wavesurfer = ws; },
            getParentWaveform: () => parentWaveform,
            getParentPlayerComponent: () => parentPlayerComponent,

            // Loop state
            getLoopState: () => ({ start: loopStart, end: loopEnd, cycleMode, nextClickSets }),
            setLoopState: (state) => {
                if (state.start !== undefined) loopStart = state.start;
                if (state.end !== undefined) loopEnd = state.end;
                if (state.cycleMode !== undefined) cycleMode = state.cycleMode;
                if (state.nextClickSets !== undefined) nextClickSets = state.nextClickSets;
            },
            getPreserveLoopOnFileChange: () => preserveLoopOnFileChange,
            getPreservedLoopBars: () => ({
                startBar: preservedLoopStartBar,
                endBar: preservedLoopEndBar,
                cycleMode: preservedCycleMode,
                playbackPositionInLoop: preservedPlaybackPositionInLoop
            }),
            setPreservedLoopBars: (bars) => {
                if (bars.startBar !== undefined) preservedLoopStartBar = bars.startBar;
                if (bars.endBar !== undefined) preservedLoopEndBar = bars.endBar;
                if (bars.cycleMode !== undefined) preservedCycleMode = bars.cycleMode;
                if (bars.playbackPositionInLoop !== undefined) preservedPlaybackPositionInLoop = bars.playbackPositionInLoop;
            },

            // Helpers
            resetLoop,
            updateLoopVisuals,
            getBarIndexAtTime,
            getTimeForBarIndex,
            destroyAllStems,
            preloadMultiStemWavesurfers,
            updateStemsButton,

            // BPM lock
            getBpmLockState: () => ({ enabled: bpmLockEnabled, lockedBPM }),
            setPlaybackRate,

            // UI
            getCurrentRate: () => currentRate,
            initWaveSurfer
        });

        // Initialize ActionRecorder service
        actionRecorder = new ActionRecorder({
            getWavesurfer: () => wavesurfer,
            updateLoopVisuals,
            loopActions: {
                shiftLoopLeft,
                shiftLoopRight,
                moveStartRight,
                moveEndLeft,
                halfLoopLength,
                doubleLoopLength,
                setLoopStart: (data) => {
                    if (cycleMode) {
                        loopStart = data.loopStart;
                        loopEnd = null;
                        nextClickSets = 'end';
                        updateLoopVisuals();
                    }
                },
                setLoopEnd: (data) => {
                    if (cycleMode && loopStart !== null) {
                        loopEnd = data.loopEnd;
                        cycleMode = true;
                        updateLoopVisuals();
                    }
                },
                restoreLoop: (start, end) => {
                    loopStart = start;
                    loopEnd = end;
                },
                setCycleMode: (mode) => {
                    cycleMode = mode;
                }
            },
            setPlaybackRate
        });

        console.log('[app.js] ActionRecorder service initialized');

        // Initialize view tab click handlers
        ViewManager.initViewTabs();

// Expose functions to global scope for HTML onclick handlers
window.handleTagClick = handleTagClick;
window.toggleShowAllTags = toggleShowAllTags;
window.generateStems = generateStems;

// Expose TagManager functions to window (used by onclick handlers in rendered HTML)
window.tagManagerHandleClick = (tag, event) => TagManager.handleClick(tag, event);
window.tagManagerToggleShowAll = () => TagManager.toggleShowAll();

// Expose FileListRenderer functions to window (used by onclick handlers in rendered HTML)
window.fileListHandleFileClick = (fileId, event) => FileListRenderer.handleFileClick(fileId, event);
window.fileListHandleSort = (column) => FileListRenderer.handleSort(column);
window.fileListToggleSelection = (fileId, event) => FileListRenderer.toggleFileSelection(fileId, event);
window.fileListQuickEdit = (fileId, event) => FileListRenderer.quickEditFile(fileId, event);
window.fileListOpenStemsViewer = (fileId, event) => FileListRenderer.openStemsViewer(fileId, event);
window.addModalTag = (tag) => TagEditModal.addTag(tag);
window.renderModalTags = () => TagEditModal.render();
window.selectModalTag = (tag) => TagEditModal.selectTag(tag);
window.removeSelectedModalTag = () => TagEditModal.removeSelectedTag();
window.setTagMode = setTagMode;
window.handleSearch = handleSearch;
window.handleSearchKeydown = handleSearchKeydown;
window.selectAllVisibleTags = selectAllVisibleTags;
window.deselectAllTags = deselectAllTags;
window.openUploadFlow = () => UploadManager.openUploadFlow();
window.selectAll = () => FileListRenderer.selectAll();
window.deselectAll = () => FileListRenderer.deselectAll();
window.batchDelete = () => BatchOperations.batchDelete();
window.batchEditTags = () => TagEditModal.open(selectedFiles, audioFiles);
window.closeEditTagsModal = () => TagEditModal.close({
    setPendingUploadFiles: (files) => { pendingUploadFiles = files; },
    setSearchQuery: (query) => { searchQuery = query; },
    filters,
    renderTags,
    renderFiles: FileListRenderer.render
});
window.saveEditedTags = () => TagEditModal.save(
    {
        performUpload: (files, tags) => FileProcessor.performUpload(files, tags, {
            supabase,
            loadData,
            closeModal: TagEditModal.close,
            setPendingUploadFiles: (files) => { pendingUploadFiles = files; },
            setSearchQuery: (query) => { searchQuery = query; },
            filters,
            renderTags,
            renderFiles: FileListRenderer.render
        }),
        runSelectedProcessing: BatchOperations.runSelectedProcessing,
        loadData,
        renderTags,
        renderFiles: FileListRenderer.render
    },
    {
        selectedFiles,
        audioFiles,
        pendingUploadFiles,
        setPendingUploadFiles: (files) => { pendingUploadFiles = files; },
        clearSelectedFiles: () => { selectedFiles.clear(); },
        setSearchQuery: (query) => { searchQuery = query; },
        filters,
        supabase
    }
);
window.previousTrack = previousTrack;
window.playPause = playPause;
window.nextTrack = nextTrack;
window.toggleLoop = toggleLoop;
window.toggleShuffle = toggleShuffle;
window.setVolume = setVolume;
window.toggleMute = toggleMute;
window.resetVolume = resetVolume;
window.setPlaybackRate = setPlaybackRate;
window.resetRate = resetRate;
window.toggleRateMode = toggleRateMode;
window.setSpeed = setSpeed;
window.resetSpeed = resetSpeed;
window.setPitch = setPitch;
window.resetPitch = resetPitch;
window.toggleSpeedPitchLock = toggleSpeedPitchLock;
// Store references to old functions before overwriting
        const _oldToggleMarkers = toggleMarkers;
        const _oldSetMarkerFrequency = setMarkerFrequency;
        const _oldShiftBarStartLeft = shiftBarStartLeft;
        const _oldShiftBarStartRight = shiftBarStartRight;

// CRITICAL: Expose setters to sync component state to global variables
        // This allows waveform click handler (cycle mode) to access marker data
        // TODO: Remove once waveform click handling is moved into component
        window.updateCurrentMarkers = (markers) => {
            currentMarkers = markers;
            console.log(`[Global] currentMarkers updated, length: ${markers.length}`);
        };
        window.updateMarkersEnabled = (enabled) => {
            markersEnabled = enabled;
            console.log(`[Global] markersEnabled updated: ${enabled}`);
        };

        // Expose loop/cycle state variables for component click handler
        // Using getters/setters so component can read AND write the module-scoped variables
        Object.defineProperty(window, 'cycleMode', {
            get: () => cycleMode,
            set: (value) => { cycleMode = value; },
            configurable: true
        });
        Object.defineProperty(window, 'loopStart', {
            get: () => loopStart,
            set: (value) => { loopStart = value; },
            configurable: true
        });
        Object.defineProperty(window, 'loopEnd', {
            get: () => loopEnd,
            set: (value) => { loopEnd = value; },
            configurable: true
        });
        Object.defineProperty(window, 'nextClickSets', {
            get: () => nextClickSets,
            set: (value) => { nextClickSets = value; },
            configurable: true
        });
        Object.defineProperty(window, 'seekOnClick', {
            get: () => seekOnClick,
            set: (value) => { seekOnClick = value; },
            configurable: true
        });

        // Expose helper functions for component
        window.updateLoopVisuals = updateLoopVisuals;
        window.recordAction = recordAction;

        // Expose functions needed by WaveformComponent
        window.updatePlayerTime = updatePlayerTime;
        window.setupParentStemSync = setupParentStemSync;

        // Expose state variables needed by WaveformComponent event handlers
        Object.defineProperty(window, 'isLooping', {
            get: () => isLooping,
            set: (value) => { isLooping = value; },
            configurable: true
        });
        Object.defineProperty(window, 'pendingJumpTarget', {
            get: () => pendingJumpTarget,
            set: (value) => { pendingJumpTarget = value; },
            configurable: true
        });
        Object.defineProperty(window, 'markersEnabled', {
            get: () => markersEnabled,
            set: (value) => { markersEnabled = value; },
            configurable: true
        });
        Object.defineProperty(window, 'currentFileId', {
            get: () => currentFileId,
            set: (value) => { currentFileId = value; },
            configurable: true
        });
        Object.defineProperty(window, 'audioFiles', {
            get: () => audioFiles,
            set: (value) => { audioFiles = value; },
            configurable: true
        });
        Object.defineProperty(window, 'barStartOffset', {
            get: () => barStartOffset,
            set: (value) => { barStartOffset = value; },
            configurable: true
        });
        Object.defineProperty(window, 'loopFadesEnabled', {
            get: () => loopFadesEnabled,
            set: (value) => { loopFadesEnabled = value; },
            configurable: true
        });
        Object.defineProperty(window, 'fadeTime', {
            get: () => fadeTime,
            set: (value) => { fadeTime = value; },
            configurable: true
        });
        Object.defineProperty(window, 'stemPlayerWavesurfers', {
            get: () => stemPlayerWavesurfers,
            set: (value) => { stemPlayerWavesurfers = value; },
            configurable: true
        });
// Wrapper functions that delegate to PlayerBarComponent
        window.toggleMarkers = () => {
            if (parentPlayerComponent) {
                parentPlayerComponent.toggleMarkers();
            } else {
                _oldToggleMarkers(); // Fallback to old function
            }
        };
        window.setMarkerFrequency = (freq) => {
            if (parentPlayerComponent) {
                parentPlayerComponent.setMarkerFrequency(freq);
            } else {
                _oldSetMarkerFrequency(freq); // Fallback
            }
        };
        window.shiftBarStartLeft = () => {
            if (parentPlayerComponent) {
                parentPlayerComponent.shiftBarStartLeft();
            } else {
                _oldShiftBarStartLeft(); // Fallback
            }
        };
        window.shiftBarStartRight = () => {
            if (parentPlayerComponent) {
                parentPlayerComponent.shiftBarStartRight();
            } else {
                _oldShiftBarStartRight(); // Fallback
            }
        };
window.toggleMetronome = toggleMetronome;
window.setMetronomeSound = setMetronomeSound;
window.toggleCycleMode = toggleCycleMode;
window.toggleSeekOnClick = toggleSeekOnClick;
window.clearLoopKeepCycle = clearLoopKeepCycle;
window.toggleLoopControlsExpanded = toggleLoopControlsExpanded;
window.shiftLoopLeft = shiftLoopLeft;
window.shiftLoopRight = shiftLoopRight;
window.moveStartLeft = moveStartLeft;
window.moveEndRight = moveEndRight;
window.halfLoopLength = halfLoopLength;
window.doubleLoopLength = doubleLoopLength;
window.toggleImmediateJump = toggleImmediateJump;
window.toggleLoopFades = toggleLoopFades;
window.setFadeTime = setFadeTime;
window.togglePreserveLoop = togglePreserveLoop;
window.toggleBPMLock = toggleBPMLock;
window.toggleRecordActions = toggleRecordActions;
window.playRecordedActions = playRecordedActions;
window.handleStemVolumeChange = handleStemVolumeChange;
window.handleStemMute = handleStemMute;
window.handleStemSolo = handleStemSolo;
window.toggleStemsViewer = () => FileListRenderer.toggleStemsViewer();
window.toggleMultiStemPlayer = toggleMultiStemPlayer;
window.toggleMultiStemPlay = toggleMultiStemPlay;
window.toggleMultiStemMute = toggleMultiStemMute;
window.toggleMultiStemLoop = toggleMultiStemLoop;
window.handleMultiStemVolumeChange = handleMultiStemVolumeChange;
// Phase 2A: Rate control functions
window.handleStemRateChange = handleStemRateChange;
window.setStemRatePreset = setStemRatePreset;
window.toggleStemRateLock = toggleStemRateLock;
// Phase 2B: Loop region functions
window.setStemLoopRegion = setStemLoopRegion;

// ============================================
// VERSION 27D: FULL TEMPLATE SYSTEM EXPORTS
// ============================================

// Marker functions
window.toggleStemMarkers = toggleStemMarkers;
window.setStemMarkerFrequency = setStemMarkerFrequency;
window.shiftStemBarStartLeft = shiftStemBarStartLeft;
window.shiftStemBarStartRight = shiftStemBarStartRight;

// Cycle/Loop functions
window.toggleStemCycleMode = toggleStemCycleMode;

// TODO: Add more function exports as they are implemented:
// Metronome: toggleStemMetronome, setStemMetronomeSound
// Cycle/Loop: toggleStemSeekOnClick, clearStemLoopKeepCycle, toggleStemLoopControlsExpanded
// Loop manipulation: shiftStemLoopLeft, shiftStemLoopRight, moveStemStartLeft, moveStemEndRight, halfStemLoopLength, doubleStemLoopLength
// Loop modes: toggleStemImmediateJump, toggleStemLoopFades, setStemFadeTime, toggleStemPreserveLoop, toggleStemBPMLock
// Recording: toggleStemRecordActions, playStemRecordedActions
