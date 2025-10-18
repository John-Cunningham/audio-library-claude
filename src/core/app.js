        // Import modules (ROUND 1 - Foundation Modules)
        import { supabase, PREF_KEYS } from './config.js';
        import * as Utils from './utils.js';
        import { generateStemPlayerBar } from './playerTemplate.js';
        import { PlayerBarComponent } from '../components/playerBar.js';

        // Import modules (ROUND 2 - Audio Core)
        import * as Metronome from './metronome.js';
        import { initKeyboardShortcuts } from './keyboardShortcuts.js';
        import * as ProgressBar from '../utils/progressBar.js';
        import * as MiniWaveform from '../components/miniWaveform.js';
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
        let parentPlayerComponent = null; // PlayerBarComponent instance for parent player
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

        // Loop action recorder
        let isRecordingActions = false; // Whether recording is active
        let recordingWaitingForStart = false; // Whether we're waiting for first keypress to start
        let recordedActions = []; // Array of {time: number, action: string, data: object}
        let recordingStartTime = null; // When recording actually started (first keypress time)
        let isPlayingBackActions = false; // Whether we're currently playing back recorded actions
        let playbackTimeouts = []; // Track all scheduled timeouts for playback so we can cancel them

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
        function initWaveSurfer() {
            try {
                console.log('Initializing WaveSurfer...');

                wavesurfer = WaveSurfer.create({
                    container: '#waveform',
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
                    autoScroll: false  // Disable auto-scrolling to keep markers in sync
                });

                console.log('WaveSurfer created:', wavesurfer);

                // Create and initialize parent player component (only once)
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

                wavesurfer.on('finish', () => {
                    if (isLooping) {
                        wavesurfer.play();
                    } else {
                        nextTrack();
                    }
                });

                wavesurfer.on('pause', () => {
                    // Stop all metronome sounds immediately
                    Metronome.stopAllMetronomeSounds();
                    // Reset metronome scheduling when paused
                    Metronome.setLastMetronomeScheduleTime(0);
                });

                wavesurfer.on('play', () => {
                    // Reset metronome scheduling when playback starts
                    Metronome.setLastMetronomeScheduleTime(0);
                });

                wavesurfer.on('ready', () => {
                    console.log('WaveSurfer ready');
                    console.log('Waveform container HTML:', document.getElementById('waveform').innerHTML);
                    console.log('Waveform container children:', document.getElementById('waveform').children);
                    updatePlayerTime();

                    // CRITICAL: Re-establish parent-stem sync for this new wavesurfer instance
                    // This must be called every time wavesurfer is recreated
                    if (Object.keys(stemPlayerWavesurfers).length > 0) {
                        setupParentStemSync();
                        console.log('✓ Parent-stem sync re-established for new wavesurfer instance');
                    }
                });

                wavesurfer.on('audioprocess', () => {
                    updatePlayerTime();

                    // Handle clock-quantized jump (jump on next beat marker)
                    if (pendingJumpTarget !== null && markersEnabled && currentFileId) {
                        const currentFile = audioFiles.find(f => f.id === currentFileId);
                        if (currentFile?.beatmap) {
                            const currentTime = wavesurfer.getCurrentTime();

                            // Find if we just crossed a beat marker (within 50ms tolerance)
                            const crossedMarker = currentFile.beatmap.some(beat => {
                                const markerTime = beat.time + barStartOffset;
                                return markerTime >= currentTime - 0.05 && markerTime <= currentTime + 0.05;
                            });

                            if (crossedMarker) {
                                wavesurfer.seekTo(pendingJumpTarget / wavesurfer.getDuration());
                                console.log(`Clock jump executed at beat marker: jumped to ${pendingJumpTarget.toFixed(2)}s`);
                                pendingJumpTarget = null; // Clear the pending jump
                            }
                        }
                    }

                    // Handle loop-between-markers
                    if (cycleMode && loopStart !== null && loopEnd !== null) {
                        const currentTime = wavesurfer.getCurrentTime();

                        // Apply fades at loop boundaries if enabled
                        if (loopFadesEnabled) {
                            const fadeStartTime = loopEnd - fadeTime;
                            const fadeInEndTime = loopStart + fadeTime;
                            const userVolume = parseInt(document.getElementById('volumeSlider').value) / 100;

                            // Fade out before loop end (from 100% to 0%)
                            if (currentTime >= fadeStartTime && currentTime < loopEnd) {
                                const fadeProgress = (currentTime - fadeStartTime) / fadeTime;
                                const fadedVolume = userVolume * (1.0 - fadeProgress);
                                wavesurfer.setVolume(fadedVolume);
                                console.log(`[FADE OUT] time: ${currentTime.toFixed(3)}s, progress: ${(fadeProgress * 100).toFixed(1)}%, vol: ${(fadedVolume * 100).toFixed(1)}%`);
                            }
                            // If we've reached or passed loop end, mute completely to prevent blip
                            else if (currentTime >= loopEnd) {
                                wavesurfer.setVolume(0);
                                console.log(`[FADE] Muted at ${currentTime.toFixed(3)}s (past loop end)`);
                            }
                            // Fade in after loop start (from 0% to 100%)
                            else if (currentTime >= loopStart && currentTime < fadeInEndTime) {
                                const fadeProgress = (currentTime - loopStart) / fadeTime;
                                const fadedVolume = userVolume * fadeProgress;
                                wavesurfer.setVolume(fadedVolume);
                                console.log(`[FADE IN] time: ${currentTime.toFixed(3)}s, progress: ${(fadeProgress * 100).toFixed(1)}%, vol: ${(fadedVolume * 100).toFixed(1)}%`);
                            }
                            // Normal volume (but only when not in fade regions)
                            else if (currentTime < fadeStartTime && currentTime >= fadeInEndTime) {
                                wavesurfer.setVolume(userVolume);
                            }
                        }

                        // Seek back to loop start when we reach loop end
                        if (currentTime >= loopEnd) {
                            wavesurfer.seekTo(loopStart / wavesurfer.getDuration());
                            console.log(`Loop: seeking back to ${loopStart.toFixed(2)}s`);
                        }
                    }

                    // Schedule metronome clicks (only when playing)
                    if (Metronome.isMetronomeEnabled() && wavesurfer.isPlaying()) {
                        const now = Date.now();
                        // Schedule every 0.5 seconds
                        if (now - Metronome.getLastMetronomeScheduleTime() > 500) {
                            Metronome.scheduleMetronome(audioFiles, currentFileId, wavesurfer, barStartOffset, currentRate);
                            Metronome.setLastMetronomeScheduleTime(now);
                        }
                    }
                });

                wavesurfer.on('seeking', () => {
                    updatePlayerTime();
                    // Stop all scheduled metronome sounds to prevent double-play
                    Metronome.stopAllMetronomeSounds();
                    Metronome.setLastMetronomeScheduleTime(0); // Force rescheduling after seek
                });

                wavesurfer.on('error', (error) => {
                    console.error('WaveSurfer error:', error);
                });

                // Enable bottom player when waveform is ready
                document.getElementById('bottomPlayer').classList.remove('disabled');
            } catch (error) {
                console.error('Error initializing WaveSurfer:', error);
            }
        }

        // Auto-tag from filename
        // Helper functions moved to fileProcessor.js
        // - extractTagsFromFilename()
        // - getAudioDuration()

        // Calculate BPM from onset positions with musical quantization
        // (Kept for future use when we integrate proper BPM detection)
        function calculateBPMFromOnsets(onsets, duration) {
            console.log('calculateBPMFromOnsets called with', onsets ? onsets.length : 0, 'onsets, duration:', duration);

            if (!onsets || onsets.length < 4) {
                console.log('Not enough onsets (need at least 4)');
                return null;
            }

            // Remove first/last onsets if they're too close to edges (silence artifacts)
            const trimmedOnsets = onsets.filter(onset => onset > 0.1 && onset < duration - 0.1);
            console.log('Trimmed onsets:', trimmedOnsets.length);

            if (trimmedOnsets.length < 4) {
                console.log('Not enough trimmed onsets (need at least 4)');
                return null;
            }

            // Calculate intervals between onsets
            const intervals = [];
            for (let i = 1; i < trimmedOnsets.length; i++) {
                intervals.push(trimmedOnsets[i] - trimmedOnsets[i - 1]);
            }

            // Find median interval (more robust than mean)
            intervals.sort((a, b) => a - b);
            const medianInterval = intervals[Math.floor(intervals.length / 2)];

            // Calculate raw BPM
            let rawBPM = 60 / medianInterval;
            console.log('Raw BPM from median interval:', rawBPM);

            // Handle subdivisions - if BPM is very high, it might be detecting 8th/16th notes
            // Typical music range is 60-200 BPM
            while (rawBPM > 200) {
                rawBPM = rawBPM / 2;
            }
            while (rawBPM < 60) {
                rawBPM = rawBPM * 2;
            }

            // If still outside reasonable range after adjustment, try different interval
            if (rawBPM < 60 || rawBPM > 200) {
                // Try using a larger interval (every 2nd, 4th, 8th onset)
                for (let step of [2, 4, 8]) {
                    const stepIntervals = [];
                    for (let i = step; i < trimmedOnsets.length; i += step) {
                        stepIntervals.push((trimmedOnsets[i] - trimmedOnsets[i - step]) / step);
                    }
                    if (stepIntervals.length > 0) {
                        stepIntervals.sort((a, b) => a - b);
                        const stepMedian = stepIntervals[Math.floor(stepIntervals.length / 2)];
                        const stepBPM = 60 / stepMedian;

                        if (stepBPM >= 60 && stepBPM <= 200) {
                            rawBPM = stepBPM;
                            break;
                        }
                    }
                }
            }

            // Musical quantization
            const rounded = Math.round(rawBPM);
            const tolerance = 0.5; // 0.5 BPM tolerance for snapping

            // Check if close to whole number
            if (Math.abs(rawBPM - rounded) < tolerance) {
                return rounded;
            }

            // Keep precise value (for time-stretched files)
            return Math.round(rawBPM * 100) / 100;
        }

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

        // Get all unique BPMs with counts
        function getAllBPMs() {
            const bpmCounts = {};
            audioFiles.forEach(file => {
                if (file.bpm) {
                    bpmCounts[file.bpm] = (bpmCounts[file.bpm] || 0) + 1;
                }
            });

            // Sort by BPM value (ascending)
            return Object.entries(bpmCounts)
                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                .map(([bpm, count]) => ({ bpm: parseInt(bpm), count }));
        }

        // Get all unique keys with counts
        function getAllKeys() {
            const keyCounts = {};
            audioFiles.forEach(file => {
                if (file.key) {
                    keyCounts[file.key] = (keyCounts[file.key] || 0) + 1;
                }
            });

            // Sort alphabetically
            return Object.entries(keyCounts)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([key, count]) => ({ key, count }));
        }

        // Handle BPM click
        function handleBPMClick(bpm, event) {
            event.preventDefault();

            if (filters.bpm.has(bpm)) {
                filters.bpm.delete(bpm);
            } else {
                filters.bpm.add(bpm);
            }

            renderBPMs();
            FileListRenderer.render();
        }

        // Handle Key click
        function handleKeyClick(key, event) {
            event.preventDefault();

            if (filters.key.has(key)) {
                filters.key.delete(key);
            } else {
                filters.key.add(key);
            }

            renderKeys();
            FileListRenderer.render();
        }

        // Render BPM filters
        function renderBPMs() {
            const container = document.getElementById('bpmContainer');
            const allBPMs = getAllBPMs();

            if (allBPMs.length === 0) {
                container.innerHTML = '<div class="empty-state" style="width: 100%; padding: 20px;">No BPM data yet.</div>';
                return;
            }

            let html = allBPMs.map(({ bpm, count }) => {
                const isActive = filters.bpm.has(bpm);
                const className = isActive ? 'tag-button can-have' : 'tag-button';
                return `<button class="${className}" onclick="handleBPMClick(${bpm}, event)">${bpm} BPM (${count})</button>`;
            }).join('');

            container.innerHTML = html;
        }

        // Render Key filters
        function renderKeys() {
            const container = document.getElementById('keyContainer');
            const allKeys = getAllKeys();

            if (allKeys.length === 0) {
                container.innerHTML = '<div class="empty-state" style="width: 100%; padding: 20px;">No key data yet.</div>';
                return;
            }

            let html = allKeys.map(({ key, count }) => {
                const isActive = filters.key.has(key);
                const className = isActive ? 'tag-button can-have' : 'tag-button';
                return `<button class="${className}" onclick="handleKeyClick('${key}', event)">${key} (${count})</button>`;
            }).join('');

            container.innerHTML = html;
        }


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

        // Pause all stems
        function pauseAllStems() {
            const stemTypes = ['vocals', 'drums', 'bass', 'other'];
            stemTypes.forEach(stemType => {
                const ws = stemPlayerWavesurfers[stemType];
                if (ws) {
                    ws.pause();
                    // Update play button icon
                    const icon = document.getElementById(`stem-play-pause-icon-${stemType}`);
                    if (icon) icon.textContent = '▶';
                }
            });
        }

        // Store parent-stem sync event handlers so we can clean them up
        let parentStemSyncHandlers = {
            play: null,
            pause: null,
            seeking: null
        };

        // Set up synchronization between parent player and stems
        function setupParentStemSync() {
            if (!wavesurfer) return;

            console.log('Setting up parent-stem synchronization');

            // Clean up old handlers first (prevent duplicates)
            if (parentStemSyncHandlers.play) {
                wavesurfer.un('play', parentStemSyncHandlers.play);
            }
            if (parentStemSyncHandlers.pause) {
                wavesurfer.un('pause', parentStemSyncHandlers.pause);
            }
            if (parentStemSyncHandlers.seeking) {
                wavesurfer.un('seeking', parentStemSyncHandlers.seeking);
            }

            const stemTypes = ['vocals', 'drums', 'bass', 'other'];

            // When parent plays, resume stems that follow parent
            parentStemSyncHandlers.play = () => {
                if (multiStemPlayerExpanded) {
                    console.log('Parent play event - resuming stems that follow parent');
                    stemTypes.forEach(stemType => {
                        const ws = stemPlayerWavesurfers[stemType];
                        const loopState = stemLoopStates[stemType];
                        const followsParent = stemPlaybackIndependent[stemType] && !loopState.enabled;

                        console.log(`  ${stemType}: active=${stemPlaybackIndependent[stemType]}, loopEnabled=${loopState.enabled}, followsParent=${followsParent}, isPlaying=${ws ? ws.isPlaying() : 'no ws'}`);

                        if (ws && followsParent && !ws.isPlaying()) {
                            console.log(`  → Playing ${stemType}`);
                            ws.play();
                            const icon = document.getElementById(`stem-play-pause-icon-${stemType}`);
                            if (icon) icon.textContent = '||';
                        }
                    });
                }
            };
            wavesurfer.on('play', parentStemSyncHandlers.play);

            // When parent pauses, pause stems that follow parent
            parentStemSyncHandlers.pause = () => {
                if (multiStemPlayerExpanded) {
                    console.log('Parent pause event - pausing stems that follow parent');
                    stemTypes.forEach(stemType => {
                        const ws = stemPlayerWavesurfers[stemType];
                        const loopState = stemLoopStates[stemType];
                        const followsParent = stemPlaybackIndependent[stemType] && !loopState.enabled;

                        console.log(`  ${stemType}: active=${stemPlaybackIndependent[stemType]}, loopEnabled=${loopState.enabled}, followsParent=${followsParent}, isPlaying=${ws ? ws.isPlaying() : 'no ws'}`);

                        if (ws && followsParent) {
                            if (ws.isPlaying()) {
                                console.log(`  → Pausing ${stemType}`);
                                ws.pause();
                                const icon = document.getElementById(`stem-play-pause-icon-${stemType}`);
                                if (icon) icon.textContent = '▶';
                            }
                        }
                    });
                }
            };
            wavesurfer.on('pause', parentStemSyncHandlers.pause);

            // When parent seeks, seek stems that follow parent
            parentStemSyncHandlers.seeking = (currentTime) => {
                if (multiStemPlayerExpanded) {
                    const seekPosition = currentTime / wavesurfer.getDuration();
                    console.log('Parent seek event - syncing stems that follow parent to:', seekPosition);

                    stemTypes.forEach(stemType => {
                        const ws = stemPlayerWavesurfers[stemType];
                        const loopState = stemLoopStates[stemType];
                        const followsParent = stemPlaybackIndependent[stemType] && !loopState.enabled;

                        console.log(`  ${stemType}: active=${stemPlaybackIndependent[stemType]}, loopEnabled=${loopState.enabled}, followsParent=${followsParent}`);

                        if (ws && followsParent) {
                            ws.seekTo(seekPosition);
                        }
                    });
                }
            };
            wavesurfer.on('seeking', parentStemSyncHandlers.seeking);
        }

        function destroyMultiStemPlayerWavesurfers() {
            console.log('Destroying multi-stem player wavesurfers');

            // Clean up event listeners before destroying
            if (wavesurfer) {
                if (parentStemSyncHandlers.play) {
                    wavesurfer.un('play', parentStemSyncHandlers.play);
                    parentStemSyncHandlers.play = null;
                }
                if (parentStemSyncHandlers.pause) {
                    wavesurfer.un('pause', parentStemSyncHandlers.pause);
                    parentStemSyncHandlers.pause = null;
                }
                if (parentStemSyncHandlers.seeking) {
                    wavesurfer.un('seeking', parentStemSyncHandlers.seeking);
                    parentStemSyncHandlers.seeking = null;
                }
            }

            // Destroy all stem wavesurfers
            Object.values(stemPlayerWavesurfers).forEach(ws => {
                if (ws) {
                    ws.destroy();
                }
            });
            stemPlayerWavesurfers = {};
            stemPlayerComponents = {}; // Clear component instances too
            multiStemReadyCount = 0;

            // Restore parent player volume if it was muted
            if (wavesurfer && wavesurfer.getVolume() === 0) {
                const volumeSlider = document.getElementById('volumeSlider');
                const volume = volumeSlider ? volumeSlider.value / 100 : 1;
                wavesurfer.setVolume(volume);
                console.log('Restored parent player volume to:', volume);
            }
        }

        function toggleMultiStemPlay(stemType) {
            const ws = stemPlayerWavesurfers[stemType];
            if (!ws) {
                console.log(`No WaveSurfer instance for ${stemType}`);
                return;
            }

            const icon = document.getElementById(`stem-play-pause-icon-${stemType}`);

            if (ws.isPlaying()) {
                ws.pause();
                if (icon) icon.textContent = '▶';
                // Mark as NOT active (user paused it)
                stemPlaybackIndependent[stemType] = false;
                console.log(`Paused ${stemType} stem - marked as inactive`);
            } else {
                ws.play();
                if (icon) icon.textContent = '||';
                // Mark as active (user wants it playing)
                stemPlaybackIndependent[stemType] = true;
                console.log(`Playing ${stemType} stem - marked as active`);
            }
        }

        function toggleMultiStemMute(stemType) {
            const ws = stemPlayerWavesurfers[stemType];
            if (!ws) {
                console.log(`No WaveSurfer instance for ${stemType}`);
                return;
            }

            const muteBtn = document.getElementById(`stem-mute-${stemType}`);
            const volumeSlider = document.getElementById(`stem-volume-${stemType}`);
            const currentVolume = ws.getVolume();

            if (currentVolume > 0) {
                // Mute - save current volume first
                ws._savedVolume = currentVolume;
                ws.setVolume(0);
                if (muteBtn) {
                    muteBtn.classList.add('active');
                    const icon = muteBtn.querySelector('span');
                    if (icon) icon.textContent = '🔇';
                }
                if (volumeSlider) volumeSlider.value = 0;
                const percentDisplay = document.getElementById(`stem-volume-percent-${stemType}`);
                if (percentDisplay) percentDisplay.textContent = '0%';
                console.log(`Muted ${stemType} stem`);
            } else {
                // Unmute - restore previous volume
                const restoredVolume = ws._savedVolume || 1.0;
                ws.setVolume(restoredVolume);
                if (muteBtn) {
                    muteBtn.classList.remove('active');
                    const icon = muteBtn.querySelector('span');
                    if (icon) icon.textContent = '🔊';
                }
                if (volumeSlider) volumeSlider.value = restoredVolume * 100;
                const percentDisplay = document.getElementById(`stem-volume-percent-${stemType}`);
                if (percentDisplay) percentDisplay.textContent = `${Math.round(restoredVolume * 100)}%`;
                console.log(`Unmuted ${stemType} stem to ${Math.round(restoredVolume * 100)}%`);
            }
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

        function handleMultiStemVolumeChange(stemType, value) {
            const ws = stemPlayerWavesurfers[stemType];
            if (!ws) {
                console.log(`No WaveSurfer instance for ${stemType}`);
                return;
            }

            const volume = value / 100;
            ws.setVolume(volume);

            // Update percentage display
            const percentDisplay = document.getElementById(`stem-volume-percent-${stemType}`);
            if (percentDisplay) {
                percentDisplay.textContent = `${value}%`;
            }

            // Update mute button icon based on volume
            const muteBtn = document.getElementById(`stem-mute-${stemType}`);
            if (muteBtn) {
                const icon = muteBtn.querySelector('span');
                if (icon) {
                    icon.textContent = volume === 0 ? '🔇' : '🔊';
                }
                if (volume === 0) {
                    muteBtn.classList.add('active');
                } else {
                    muteBtn.classList.remove('active');
                }
            }

            console.log(`Set ${stemType} volume to ${value}%`);
        }

        // Phase 2A: Individual Rate Control Functions

        /**
         * Calculate the final playback rate for a stem
         * Formula: finalRate = stemIndependentRate × parentRate (if unlocked)
         *       or finalRate = parentRate (if locked)
         */
        function calculateStemFinalRate(stemType) {
            const parentRate = currentRate || 1.0;
            const isLocked = stemRateLocked[stemType];

            if (isLocked) {
                // Locked: stem follows parent rate exactly
                return parentRate;
            } else {
                // Unlocked: stem rate = independent multiplier × parent rate
                const independentRate = stemIndependentRates[stemType] || 1.0;
                return independentRate * parentRate;
            }
        }

        /**
         * Update the visual display of a stem's rate and BPM
         */
        function updateStemRateDisplay(stemType, finalRate) {
            const display = document.getElementById(`stem-rate-display-${stemType}`);
            if (!display) return;

            // Calculate resulting BPM
            const resultingBPM = currentParentFileBPM
                ? (currentParentFileBPM * finalRate).toFixed(1)
                : '---';

            // Update display
            display.textContent = `${finalRate.toFixed(2)}x @ ${resultingBPM} BPM`;
        }

        /**
         * Update the rate slider position (without triggering oninput)
         */
        function updateStemRateSlider(stemType, sliderValue) {
            const slider = document.getElementById(`stem-rate-slider-${stemType}`);
            if (slider) {
                slider.value = sliderValue;
            }
        }

        /**
         * Update the lock button visual state
         */
        function updateLockButton(stemType, isLocked) {
            const lockBtn = document.getElementById(`stem-lock-${stemType}`);
            if (!lockBtn) return;

            if (isLocked) {
                lockBtn.classList.add('locked');
                lockBtn.classList.remove('unlocked');
                lockBtn.title = 'Locked to Parent Rate (click to unlock)';
            } else {
                lockBtn.classList.remove('locked');
                lockBtn.classList.add('unlocked');
                lockBtn.title = 'Independent Rate (click to lock to parent)';
            }
        }

        /**
         * Handle rate slider changes
         */
        function handleStemRateChange(stemType, sliderValue) {
            console.log(`=== handleStemRateChange(${stemType}, ${sliderValue}) ===`);

            // Convert slider value (50-200) to rate (0.5x-2.0x)
            const independentRate = sliderValue / 100;
            stemIndependentRates[stemType] = independentRate;

            // Unlock this stem (user is manually adjusting)
            if (stemRateLocked[stemType]) {
                stemRateLocked[stemType] = false;
                updateLockButton(stemType, false);
                console.log(`${stemType} unlocked (user adjusted rate manually)`);
            }

            // Calculate final rate (independent × parent)
            const finalRate = calculateStemFinalRate(stemType);

            // Apply to WaveSurfer
            const ws = stemPlayerWavesurfers[stemType];
            if (ws) {
                ws.setPlaybackRate(finalRate, false);
                console.log(`✓ ${stemType} rate set to ${finalRate.toFixed(2)}x (independent: ${independentRate.toFixed(2)}x × parent: ${(currentRate || 1.0).toFixed(2)}x)`);
            }

            // Update display
            updateStemRateDisplay(stemType, finalRate);
        }

        /**
         * Set rate to a preset value (0.5x, 1x, 2x)
         */
        function setStemRatePreset(stemType, presetRate) {
            console.log(`=== setStemRatePreset(${stemType}, ${presetRate}x) ===`);

            // Set independent rate
            stemIndependentRates[stemType] = presetRate;

            // Unlock if not already
            if (stemRateLocked[stemType]) {
                stemRateLocked[stemType] = false;
                updateLockButton(stemType, false);
                console.log(`${stemType} unlocked (preset button clicked)`);
            }

            // Update slider
            updateStemRateSlider(stemType, presetRate * 100);

            // Calculate and apply final rate
            const finalRate = calculateStemFinalRate(stemType);
            const ws = stemPlayerWavesurfers[stemType];
            if (ws) {
                ws.setPlaybackRate(finalRate, false);
                console.log(`✓ ${stemType} rate set to ${finalRate.toFixed(2)}x`);
            }

            // Update display
            updateStemRateDisplay(stemType, finalRate);
        }

        /**
         * Toggle lock/unlock state for a stem's rate
         */
        function toggleStemRateLock(stemType) {
            const wasLocked = stemRateLocked[stemType];
            const newLockState = !wasLocked;

            console.log(`=== toggleStemRateLock(${stemType}) === ${wasLocked ? 'UNLOCKED' : 'LOCKED'} → ${newLockState ? 'LOCKED' : 'UNLOCKED'}`);

            stemRateLocked[stemType] = newLockState;

            if (newLockState) {
                // Locking: reset independent rate to 1.0
                stemIndependentRates[stemType] = 1.0;
                updateStemRateSlider(stemType, 100);
                console.log(`${stemType} locked - reset to 1.0x multiplier`);
            } else {
                console.log(`${stemType} unlocked - can now set independent rate`);
            }

            // Update button appearance
            updateLockButton(stemType, newLockState);

            // Recalculate and apply final rate
            const finalRate = calculateStemFinalRate(stemType);
            const ws = stemPlayerWavesurfers[stemType];
            if (ws) {
                ws.setPlaybackRate(finalRate, false);
                console.log(`✓ ${stemType} rate updated to ${finalRate.toFixed(2)}x`);
            }

            // Update display
            updateStemRateDisplay(stemType, finalRate);
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
        function addBarMarkers(file) {
            // Use MarkerSystem module to render markers
            currentMarkers = MarkerSystem.addBarMarkers(
                file,
                wavesurfer,
                'waveform',
                { markersEnabled, markerFrequency, barStartOffset }
            );

            // Marker rendering now handled by MarkerSystem module
            // currentMarkers array is updated by MarkerSystem.addBarMarkers() above

            const waveformContainer = document.getElementById('waveform');
            if (!waveformContainer) return;

            // Add click-to-snap functionality to waveform
            waveformContainer.style.cursor = 'pointer';

            // Remove old click listeners if they exist
            if (waveformContainer._clickHandler) {
                waveformContainer.removeEventListener('click', waveformContainer._clickHandler, true);
            }

            // Create new click handler with capture phase to intercept BEFORE WaveSurfer
            const clickHandler = (e) => {
                // If markers are disabled, let WaveSurfer handle click normally
                if (!markersEnabled || currentMarkers.length === 0 || !wavesurfer) return;

                // Get click position relative to waveform container
                const rect = waveformContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const relativeX = clickX / rect.width;

                // Calculate time at click position
                const duration = wavesurfer.getDuration();
                const clickTime = relativeX * duration;

                // Find nearest marker to the left
                const snapTime = MarkerSystem.findNearestMarkerToLeft(clickTime, currentMarkers);

                // AUTO-SET LOOP POINTS (only if in edit loop mode)
                if (cycleMode) {
                    // CRITICAL: Stop event propagation BEFORE WaveSurfer handles it (unless seek mode is 'seek')
                    if (seekOnClick !== 'seek') {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                    }

                    // Check if clicking left of loop start (reset start) or right of loop end (reset end)
                    if (cycleMode && loopStart !== null && loopEnd !== null) {
                        if (snapTime < loopStart) {
                            // Clicking left of loop start: reset loop start
                            loopStart = snapTime;
                            console.log(`Loop start moved to ${snapTime.toFixed(2)}s ${seekOnClick === 'seek' ? '(seeking)' : '(NO PLAYBACK CHANGE)'}`);
                            updateLoopVisuals();
                            if (seekOnClick === 'seek') {
                                wavesurfer.seekTo(snapTime / duration);
                            }
                            return false;
                        } else if (snapTime > loopEnd) {
                            // Clicking right of loop end: reset loop end
                            loopEnd = snapTime;
                            console.log(`Loop end moved to ${snapTime.toFixed(2)}s ${seekOnClick === 'seek' ? '(seeking)' : '(NO PLAYBACK CHANGE)'}`);
                            updateLoopVisuals();
                            if (seekOnClick === 'seek') {
                                wavesurfer.seekTo(snapTime / duration);
                            }
                            return false;
                        }
                    }

                    // Normal loop setting flow
                    let justSetLoopEnd = false;

                    if (nextClickSets === 'start') {
                        loopStart = snapTime;
                        loopEnd = null;
                        nextClickSets = 'end';
                        console.log(`Loop start set to ${snapTime.toFixed(2)}s ${seekOnClick === 'seek' ? '(seeking)' : '(NO PLAYBACK CHANGE)'}`);
                        recordAction('setLoopStart', { loopStart: snapTime });
                    } else if (nextClickSets === 'end') {
                        if (snapTime <= loopStart) {
                            console.log('Loop end must be after loop start - ignoring click');
                            return;
                        }
                        loopEnd = snapTime;
                        cycleMode = true;
                        justSetLoopEnd = true;
                        console.log(`Loop end set to ${snapTime.toFixed(2)}s - Loop active! ${seekOnClick === 'clock' ? '(seeking to loop start)' : seekOnClick === 'seek' ? '(seeking)' : '(NO PLAYBACK CHANGE)'}`);
                        recordAction('setLoopEnd', { loopStart, loopEnd: snapTime, loopDuration: snapTime - loopStart });
                    }

                    updateLoopVisuals();

                    // Handle seeking based on mode
                    if (seekOnClick === 'seek') {
                        // Seek mode: jump to clicked position
                        wavesurfer.seekTo(snapTime / duration);
                    } else if (seekOnClick === 'clock' && justSetLoopEnd) {
                        // Clock mode: ONLY after setting loop end, jump to loop start
                        wavesurfer.seekTo(loopStart / duration);
                    }

                    // Important: return early to prevent any seeking (if seekOnClick is off)
                    return false;
                } else {
                    // Normal mode: Markers enabled, not in edit loop mode
                    // Seek to the nearest marker and prevent WaveSurfer from handling
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    wavesurfer.seekTo(snapTime / duration);
                    console.log(`Snapped to marker at ${snapTime.toFixed(2)}s`);
                    return false;
                }
            };

            // Add listener in CAPTURE phase to intercept before WaveSurfer's handler
            waveformContainer.addEventListener('click', clickHandler, true);
            waveformContainer._clickHandler = clickHandler; // Store reference for cleanup

            // Add hover preview for loop selection
            const mousemoveHandler = (e) => {
                // Only show preview when in edit mode and start is set but end is not
                if (!cycleMode || loopStart === null || loopEnd !== null) {
                    // Remove any existing preview
                    const existingPreview = waveformContainer.querySelector('.loop-preview');
                    if (existingPreview) existingPreview.remove();
                    return;
                }

                if (!wavesurfer || currentMarkers.length === 0) return;

                // Get mouse position
                const rect = waveformContainer.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const relativeX = mouseX / rect.width;
                const duration = wavesurfer.getDuration();
                const mouseTime = relativeX * duration;

                // Find nearest marker to the left
                const hoverSnapTime = MarkerSystem.findNearestMarkerToLeft(mouseTime, currentMarkers);

                // Only show preview if hover position is after loop start
                if (hoverSnapTime <= loopStart) {
                    const existingPreview = waveformContainer.querySelector('.loop-preview');
                    if (existingPreview) existingPreview.remove();
                    return;
                }

                // Remove existing preview
                const existingPreview = waveformContainer.querySelector('.loop-preview');
                if (existingPreview) existingPreview.remove();

                // Create new preview
                const startPercent = (loopStart / duration) * 100;
                const hoverPercent = (hoverSnapTime / duration) * 100;
                const widthPercent = hoverPercent - startPercent;

                const preview = document.createElement('div');
                preview.className = 'loop-preview';
                preview.style.left = `${startPercent}%`;
                preview.style.width = `${widthPercent}%`;
                waveformContainer.appendChild(preview);
            };

            const mouseoutHandler = () => {
                // Remove preview when mouse leaves waveform
                const existingPreview = waveformContainer.querySelector('.loop-preview');
                if (existingPreview) existingPreview.remove();
            };

            // Remove old handlers if they exist
            if (waveformContainer._mousemoveHandler) {
                waveformContainer.removeEventListener('mousemove', waveformContainer._mousemoveHandler);
            }
            if (waveformContainer._mouseoutHandler) {
                waveformContainer.removeEventListener('mouseout', waveformContainer._mouseoutHandler);
            }

            waveformContainer.addEventListener('mousemove', mousemoveHandler);
            waveformContainer.addEventListener('mouseout', mouseoutHandler);
            waveformContainer._mousemoveHandler = mousemoveHandler;
            waveformContainer._mouseoutHandler = mouseoutHandler;
        }

        // Toggle bar markers on/off
        function toggleMarkers() {
            const result = MarkerSystem.toggleMarkers({
                markersEnabled,
                audioFiles,
                currentFileId
            });

            markersEnabled = result.markersEnabled;

            // Update button state
            const btn = document.getElementById('markersBtn');
            if (btn) {
                if (markersEnabled) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }

            // Re-render markers with new state
            const file = audioFiles.find(f => f.id === currentFileId);
            if (file) {
                addBarMarkers(file);
            }
        }

        // Change marker frequency
        function setMarkerFrequency(freq) {
            const result = MarkerSystem.setMarkerFrequency({
                markerFrequency,
                audioFiles,
                currentFileId,
                multiStemPlayerExpanded
            }, freq, addBarMarkers, stemPlayerComponents);

            markerFrequency = result.markerFrequency;
        }

        // Shift bar start left (make an earlier marker be bar 1)
        function shiftBarStartLeft() {
            const result = MarkerSystem.shiftBarStartLeft({
                barStartOffset,
                markerFrequency,
                audioFiles,
                currentFileId,
                multiStemPlayerExpanded
            }, addBarMarkers, stemPlayerComponents);

            barStartOffset = result.barStartOffset;
        }

        // Shift bar start right (make a later marker be bar 1)
        function shiftBarStartRight() {
            const result = MarkerSystem.shiftBarStartRight({
                barStartOffset,
                markerFrequency,
                audioFiles,
                currentFileId,
                multiStemPlayerExpanded
            }, addBarMarkers, stemPlayerComponents);

            barStartOffset = result.barStartOffset;
        }

        // ============================================
        // VERSION 27D: PER-STEM MARKER FUNCTIONS
        // ============================================
        // Note: findNearestMarkerToLeft() moved to MarkerSystem module

        // === STEM MARKER WRAPPERS (delegate to PlayerBarComponent) ===

        // Toggle markers for a specific stem
        function toggleStemMarkers(stemType) {
            // Delegate to component if available
            if (stemPlayerComponents[stemType]) {
                stemPlayerComponents[stemType].toggleMarkers();
                return;
            }

            // Call pure function from StemMarkerSystem module
            const result = StemMarkerSystem.toggleStemMarkers({
                stemType,
                stemMarkersEnabled,
                audioFiles,
                currentFileId,
                stemPlayerWavesurfers
            }, addStemBarMarkers);

            // Apply result to app.js state
            stemMarkersEnabled = result.stemMarkersEnabled;
        }

        // Change marker frequency for a specific stem
        function setStemMarkerFrequency(stemType, freq) {
            // Delegate to component if available
            if (stemPlayerComponents[stemType]) {
                stemPlayerComponents[stemType].setMarkerFrequency(freq);
                return;
            }

            // Call pure function from StemMarkerSystem module
            const result = StemMarkerSystem.setStemMarkerFrequency({
                stemType,
                stemMarkerFrequency,
                audioFiles,
                currentFileId
            }, freq, addStemBarMarkers);

            // Apply result to app.js state
            stemMarkerFrequency = result.stemMarkerFrequency;
        }

        // Shift stem bar start left
        function shiftStemBarStartLeft(stemType) {
            // Delegate to component if available
            if (stemPlayerComponents[stemType]) {
                stemPlayerComponents[stemType].shiftBarStartLeft();
                return;
            }

            // Call pure function from StemMarkerSystem module
            const result = StemMarkerSystem.shiftStemBarStartLeft({
                stemType,
                stemBarStartOffset,
                stemMarkerFrequency,
                audioFiles,
                currentFileId
            }, addStemBarMarkers);

            // Apply result to app.js state
            stemBarStartOffset = result.stemBarStartOffset;
        }

        // Shift stem bar start right
        function shiftStemBarStartRight(stemType) {
            // Delegate to component if available
            if (stemPlayerComponents[stemType]) {
                stemPlayerComponents[stemType].shiftBarStartRight();
                return;
            }

            // Call pure function from StemMarkerSystem module
            const result = StemMarkerSystem.shiftStemBarStartRight({
                stemType,
                stemBarStartOffset,
                stemMarkerFrequency,
                audioFiles,
                currentFileId
            }, addStemBarMarkers);

            // Apply result to app.js state
            stemBarStartOffset = result.stemBarStartOffset;
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

            // Update record actions button state (not loop-related)
            const recordActionsBtn = document.getElementById('recordActionsBtn');
            if (recordActionsBtn) {
                if (recordingWaitingForStart) {
                    recordActionsBtn.classList.add('active');
                    recordActionsBtn.classList.remove('flashing');
                    recordActionsBtn.style.background = '#ff9944'; // Orange when waiting
                } else if (isRecordingActions) {
                    recordActionsBtn.classList.add('active');
                    recordActionsBtn.classList.add('flashing'); // Smooth flash while recording
                    recordActionsBtn.style.background = '#ff4444'; // Red when recording
                } else {
                    recordActionsBtn.classList.remove('active');
                    recordActionsBtn.classList.remove('flashing');
                    recordActionsBtn.style.background = '';
                }
            }

            // Update play actions button state (not loop-related)
            const playActionsBtn = document.getElementById('playActionsBtn');
            if (playActionsBtn) {
                if (isPlayingBackActions) {
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

        function toggleRecordActions() {
            if (!isRecordingActions && !recordingWaitingForStart) {
                // Start recording mode - wait for first keypress
                recordingWaitingForStart = true;
                isRecordingActions = false;
                recordedActions = [];
                recordingStartTime = null;
                console.log('[RECORD] Recording armed - waiting for first keypress to start...');
                updateLoopVisuals();
            } else {
                // Stop recording
                recordingWaitingForStart = false;
                isRecordingActions = false;
                console.log('[RECORD] Recording stopped');
                console.log(`[RECORD] Captured ${recordedActions.length} actions:`);
                recordedActions.forEach((action, i) => {
                    console.log(`  [${i}] ${action.time.toFixed(3)}s: ${action.action}`, action.data);
                });
                updateLoopVisuals();
            }
        }

        function recordAction(actionName, data = {}) {
            if (!isRecordingActions || !recordingStartTime) return;

            const currentTime = wavesurfer ? wavesurfer.getCurrentTime() : 0;
            const relativeTime = currentTime - recordingStartTime;

            const action = {
                time: relativeTime,
                playbackTime: currentTime,
                action: actionName,
                data: data
            };

            recordedActions.push(action);
            console.log(`[RECORD] ${relativeTime.toFixed(3)}s: ${actionName}`, data);
        }

        function stopPlayback() {
            // Cancel all scheduled timeouts
            playbackTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
            playbackTimeouts = [];

            // Reset state
            isPlayingBackActions = false;
            updateLoopVisuals();
            console.log('[PLAYBACK] Playback stopped');
        }

        function playRecordedActions() {
            console.log(`[PLAYBACK] playRecordedActions() called`);

            // If already playing, STOP playback instead
            if (isPlayingBackActions) {
                stopPlayback();
                return;
            }

            console.log(`[PLAYBACK] recordedActions.length = ${recordedActions.length}`);

            if (recordedActions.length === 0) {
                console.log('[PLAYBACK] No recorded actions to play');
                alert('No recorded actions to play. Press RECORD button first, then perform actions, then stop recording.');
                return;
            }

            console.log(`[PLAYBACK] Starting playback of ${recordedActions.length} actions`);
            console.log('[PLAYBACK] Recorded actions:', recordedActions);

            // Set playback state and update button
            isPlayingBackActions = true;
            updateLoopVisuals();

            // Calculate total duration of playback
            const lastAction = recordedActions[recordedActions.length - 1];
            const totalDuration = lastAction.time * 1000; // Convert to milliseconds

            // Schedule cleanup when playback finishes
            const cleanupTimeout = setTimeout(() => {
                isPlayingBackActions = false;
                playbackTimeouts = [];
                updateLoopVisuals();
                console.log('[PLAYBACK] Playback complete');
            }, totalDuration + 100); // Add 100ms buffer

            playbackTimeouts.push(cleanupTimeout);

            // Schedule each action
            recordedActions.forEach((action) => {
                const actionTimeout = setTimeout(() => {
                    console.log(`[PLAYBACK] ${action.time.toFixed(3)}s: ${action.action}`, action.data);

                    // Execute the action
                    switch(action.action) {
                        case 'initialState':
                            // Restore initial state
                            const state = action.data;
                            console.log(`[PLAYBACK] Restoring initial state - isPlaying was: ${state.isPlaying}`);
                            if (state.loopStart !== null && state.loopEnd !== null) {
                                loopStart = state.loopStart;
                                loopEnd = state.loopEnd;
                            }
                            cycleMode = state.cycleMode;
                            if (state.rate) setPlaybackRate(state.rate);
                            if (state.volume) document.getElementById('volumeSlider').value = state.volume;
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
                            updateLoopVisuals();
                            console.log('[PLAYBACK] Initial state restored');
                            break;
                        case 'shiftLoopLeft':
                            shiftLoopLeft();
                            break;
                        case 'shiftLoopRight':
                            shiftLoopRight();
                            break;
                        case 'moveStartRight':
                            moveStartRight();
                            break;
                        case 'moveEndLeft':
                            moveEndLeft();
                            break;
                        case 'halfLoopLength':
                            halfLoopLength();
                            break;
                        case 'doubleLoopLength':
                            doubleLoopLength();
                            break;
                        case 'setLoopStart':
                            if (cycleMode) {
                                loopStart = action.data.loopStart;
                                loopEnd = null;
                                nextClickSets = 'end';
                                updateLoopVisuals();
                            }
                            break;
                        case 'setLoopEnd':
                            if (cycleMode && loopStart !== null) {
                                loopEnd = action.data.loopEnd;
                                cycleMode = true;
                                updateLoopVisuals();
                            }
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
                            setPlaybackRate(action.data.rate);
                            break;
                        default:
                            console.log(`[PLAYBACK] Unknown action: ${action.action}`);
                    }
                }, action.time * 1000); // Convert to milliseconds

                playbackTimeouts.push(actionTimeout);
            });

            console.log('[PLAYBACK] All actions scheduled');
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

        function loadAudio(fileId, autoplay = true) {
            const file = audioFiles.find(f => f.id === fileId);
            if (!file) return;

            // Don't reload if this file is already loaded
            if (currentFileId === fileId) return;

            // Before changing files: if preserve is enabled and loop exists, save bar indices and cycle mode
            if (preserveLoopOnFileChange && loopStart !== null && loopEnd !== null && currentFileId && wavesurfer) {
                const currentFile = audioFiles.find(f => f.id === currentFileId);
                if (currentFile && currentFile.beatmap) {
                    preservedLoopStartBar = getBarIndexAtTime(loopStart, currentFile);
                    preservedLoopEndBar = getBarIndexAtTime(loopEnd, currentFile);
                    preservedCycleMode = cycleMode; // Save cycle mode state

                    // Calculate relative position within loop for seamless swap
                    const currentTime = wavesurfer.getCurrentTime();
                    if (currentTime >= loopStart && currentTime <= loopEnd) {
                        const loopDuration = loopEnd - loopStart;
                        preservedPlaybackPositionInLoop = (currentTime - loopStart) / loopDuration;
                        console.log(`Preserving loop: bar ${preservedLoopStartBar} to bar ${preservedLoopEndBar}, cycle mode: ${preservedCycleMode}, position in loop: ${(preservedPlaybackPositionInLoop * 100).toFixed(1)}%`);
                    } else {
                        preservedPlaybackPositionInLoop = null;
                        console.log(`Preserving loop: bar ${preservedLoopStartBar} to bar ${preservedLoopEndBar}, cycle mode: ${preservedCycleMode}`);
                    }
                }
            }

            currentFileId = fileId;

            // Reset loop when changing files (unless preserve is enabled)
            if (!preserveLoopOnFileChange) {
                resetLoop();
                preservedLoopStartBar = null;
                preservedLoopEndBar = null;
                preservedCycleMode = false;
            } else if (preservedLoopStartBar !== null && preservedLoopEndBar !== null) {
                // When preserving, temporarily clear loop points but KEEP cycle mode on
                loopStart = null;
                loopEnd = null;
                cycleMode = preservedCycleMode; // Keep cycle mode state during transition
                nextClickSets = 'start'; // Reset click state for visual feedback
                updateLoopVisuals();
            } else {
                // First time enabling preserve, or no valid loop to preserve
                // Don't reset anything, just continue
            }

            // Reset bar start offset when loading new file
            barStartOffset = 0;
            const display = document.getElementById('barStartOffsetDisplay');
            if (display) {
                display.textContent = '0';
            }

            // Destroy and reinitialize WaveSurfer
            if (wavesurfer) {
                wavesurfer.pause();
                wavesurfer.stop();
                wavesurfer.destroy();
                wavesurfer = null;
            }

            // Destroy any existing stems (Phase 4 Step 2A)
            destroyAllStems();

            initWaveSurfer();

            // Apply current volume to new wavesurfer instance
            const currentVolume = document.getElementById('volumeSlider').value;
            wavesurfer.setVolume(currentVolume / 100);

            // Apply current playback rate (natural analog - speed+pitch)
            wavesurfer.setPlaybackRate(currentRate, false);

            // Load the new file
            wavesurfer.load(file.file_url);

            document.getElementById('playerFilename').textContent = file.name;
            document.getElementById('playerTime').textContent = '0:00 / 0:00';
            document.getElementById('playPauseIcon').textContent = '▶';

            // Add bar markers when waveform is ready
            wavesurfer.once('ready', async () => {
                // Ensure parent volume is restored (in case it was muted by stems)
                const volumeSlider = document.getElementById('volumeSlider');
                const currentVolume = volumeSlider ? volumeSlider.value / 100 : 1;
                wavesurfer.setVolume(currentVolume);
                console.log(`Restored parent volume to ${(currentVolume * 100).toFixed(0)}%`);

                // Load file into parent player component (handles markers)
                if (parentPlayerComponent) {
                    parentPlayerComponent.loadFile(file);
                } else {
                    // Fallback to old function if component not initialized
                    addBarMarkers(file);
                }

                // BPM Lock: Auto-adjust playback rate to match locked BPM
                if (bpmLockEnabled && lockedBPM !== null && file.bpm) {
                    const rateAdjustment = lockedBPM / file.bpm;
                    setPlaybackRate(rateAdjustment);
                    console.log(`[BPM LOCK] Adjusted rate to ${rateAdjustment.toFixed(3)}x (locked: ${lockedBPM} BPM, file: ${file.bpm} BPM)`);
                }

                // Restore loop from preserved bar indices (if preserve mode is on)
                if (preserveLoopOnFileChange && preservedLoopStartBar !== null && preservedLoopEndBar !== null) {
                    const newLoopStart = getTimeForBarIndex(preservedLoopStartBar, file);
                    const newLoopEnd = getTimeForBarIndex(preservedLoopEndBar, file);

                    if (newLoopStart !== null && newLoopEnd !== null) {
                        loopStart = newLoopStart;
                        loopEnd = newLoopEnd;
                        cycleMode = preservedCycleMode; // Restore cycle mode state
                        console.log(`Restored loop: ${newLoopStart.toFixed(2)}s to ${newLoopEnd.toFixed(2)}s (bar ${preservedLoopStartBar} to ${preservedLoopEndBar}), cycle mode: ${cycleMode}`);
                        updateLoopVisuals();

                        // Seamless swap: restore playback position within loop
                        if (preservedPlaybackPositionInLoop !== null && autoplay) {
                            const newLoopDuration = loopEnd - loopStart;
                            const newPlaybackTime = loopStart + (preservedPlaybackPositionInLoop * newLoopDuration);
                            wavesurfer.seekTo(newPlaybackTime / wavesurfer.getDuration());
                            console.log(`Seamless swap: restored playback to ${(preservedPlaybackPositionInLoop * 100).toFixed(1)}% through loop (${newPlaybackTime.toFixed(2)}s)`);
                            preservedPlaybackPositionInLoop = null; // Clear after use
                        }
                    } else {
                        console.log('Could not restore loop: bar indices out of range for new file');
                        preservedLoopStartBar = null;
                        preservedLoopEndBar = null;
                        preservedPlaybackPositionInLoop = null;
                    }
                }

                // Phase 1: Pre-load stems if file has stems (NEW system - silent background loading)
                if (file.has_stems) {
                    console.log('🎵 File has stems - pre-loading in background (Phase 1)...');
                    try {
                        await preloadMultiStemWavesurfers(fileId);
                        console.log('✅ Stems pre-loaded successfully and ready');

                        // Show STEMS button
                        const stemsBtn = document.getElementById('stemsBtn');
                        if (stemsBtn) {
                            stemsBtn.style.display = 'block';
                        }
                    } catch (error) {
                        console.error('❌ Failed to pre-load stems:', error);
                    }
                }

                // Auto-play parent file if requested
                if (autoplay) {
                    wavesurfer.play();
                    document.getElementById('playPauseIcon').textContent = '⏸';
                }
            });

            // Update active file highlighting without re-rendering entire list
            document.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('active');
            });
            const currentFileItem = document.querySelector(`.file-item:has(input#checkbox-${fileId})`);
            if (currentFileItem) {
                currentFileItem.classList.add('active');
            }

            // Phase 4: Update STEMS button visibility/state
            updateStemsButton();
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
            Object.keys(stemPlayerWavesurfers).forEach(stemType => {
                const stemWS = stemPlayerWavesurfers[stemType];
                if (stemWS) {
                    const finalRate = calculateStemFinalRate(stemType);
                    stemWS.setPlaybackRate(finalRate, false);
                    updateStemRateDisplay(stemType, finalRate);
                    console.log(`✓ ${stemType} rate set to ${finalRate.toFixed(2)}x (${stemRateLocked[stemType] ? 'locked' : `independent: ${stemIndependentRates[stemType].toFixed(2)}x`})`);
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
                getRecordingWaitingForStart: () => recordingWaitingForStart,
                setRecordingWaitingForStart: (val) => { recordingWaitingForStart = val; },
                setIsRecordingActions: (val) => { isRecordingActions = val; },
                setRecordingStartTime: (val) => { recordingStartTime = val; },
                getRecordedActions: () => recordedActions,
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

        // Initialize view tab click handlers
        ViewManager.initViewTabs();

// Expose functions to global scope for HTML onclick handlers
window.handleTagClick = handleTagClick;
window.toggleShowAllTags = toggleShowAllTags;
window.handleBPMClick = handleBPMClick;
window.handleKeyClick = handleKeyClick;
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
