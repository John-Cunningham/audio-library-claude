        // Import modules (ROUND 1 - Foundation Modules)
        import { supabase, PREF_KEYS } from './config.js';
        import * as Utils from './utils.js';
        import { generateStemPlayerBar } from './playerTemplate.js';
        import { PlayerBarComponent } from '../components/playerBar.js';

        // Import modules (ROUND 2 - Audio Core)
        import * as Metronome from './metronome.js';

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
        let miniWaveforms = {}; // Track mini waveform instances by file ID
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
        function setTagMode(mode) {
            // If clicking the same mode, deselect it
            if (currentTagMode === mode) {
                currentTagMode = null;
            } else {
                currentTagMode = mode;
            }

            // Update button styles
            document.getElementById('modeCanHave').style.background = currentTagMode === 'canHave' ? '#3b82f6' : 'transparent';
            document.getElementById('modeCanHave').style.color = currentTagMode === 'canHave' ? 'white' : '#3b82f6';

            document.getElementById('modeMustHave').style.background = currentTagMode === 'mustHave' ? '#10b981' : 'transparent';
            document.getElementById('modeMustHave').style.color = currentTagMode === 'mustHave' ? 'white' : '#10b981';

            document.getElementById('modeExclude').style.background = currentTagMode === 'exclude' ? '#ef4444' : 'transparent';
            document.getElementById('modeExclude').style.color = currentTagMode === 'exclude' ? 'white' : '#ef4444';
        }

        // Handle search input
        function handleSearch(query) {
            searchQuery = query;
            renderTags(searchQuery);
            renderFiles();
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
                        renderFunction: renderFiles,
                        renderTagsFunction: renderTags
                    });
                } else {
                    // Just render if view already initialized
                    renderTags();
                    renderFiles();
                }
            } catch (error) {
                console.error('Error loading data:', error);
                alert('Error loading files from Supabase. Check console for details.');
            }
        }

        // Phase 4 Fix 1: Preload all stem files from database
        async function preloadAllStems() {
            try {
                console.log('Preloading all stem files...');
                const { data, error } = await supabase
                    .from('audio_files_stems')
                    .select('*');

                if (error) throw error;

                // Organize stems by parent file ID
                allStemFiles = {};
                if (data) {
                    data.forEach(stem => {
                        if (!allStemFiles[stem.audio_file_id]) {
                            allStemFiles[stem.audio_file_id] = {};
                        }
                        allStemFiles[stem.audio_file_id][stem.stem_type] = stem;
                    });
                }

                console.log(`✅ Preloaded stems for ${Object.keys(allStemFiles).length} files`);
            } catch (error) {
                console.error('Error preloading stems:', error);
            }
        }

        // Polling removed - data refreshes immediately after processing completes

        // ========================================
        // STEM PLAYBACK FUNCTIONS (Phase 4 Step 2A)
        // ========================================

        // Fetch stem files for a parent audio file from audio_files_stems table
        async function fetchStemFiles(parentFileId) {
            try {
                const { data, error } = await supabase
                    .from('audio_files_stems')
                    .select('*')
                    .eq('audio_file_id', parentFileId);

                if (error) throw error;

                // Organize stems by type
                const stems = {};
                if (data) {
                    data.forEach(stem => {
                        stems[stem.stem_type] = stem;
                    });
                }

                console.log(`Fetched ${data?.length || 0} stems for file ${parentFileId}:`, stems);
                return stems;
            } catch (error) {
                console.error('Error fetching stem files:', error);
                return {};
            }
        }

        // Destroy all stem WaveSurfer instances
        function destroyAllStems() {
            // Destroy OLD stem system (disabled at line 4163)
            Object.keys(stemWavesurfers).forEach(stemType => {
                if (stemWavesurfers[stemType]) {
                    stemWavesurfers[stemType].destroy();
                }
            });
            stemWavesurfers = {};

            // Phase 1: Destroy NEW multi-stem player system
            if (Object.keys(stemPlayerWavesurfers).length > 0) {
                console.log('Destroying multi-stem player wavesurfers');

                // Clean up event listeners from parent
                if (wavesurfer) {
                    wavesurfer.un('play');
                    wavesurfer.un('pause');
                    wavesurfer.un('seeking');
                    wavesurfer.un('audioprocess');
                }

                // Destroy all stem wavesurfers
                Object.values(stemPlayerWavesurfers).forEach(ws => {
                    if (ws) {
                        ws.destroy();
                    }
                });
                stemPlayerWavesurfers = {};
                multiStemReadyCount = 0;
                stemsPreloaded = false;

                // Clear multi-stem player UI
                const multiStemPlayer = document.getElementById('multiStemPlayer');
                if (multiStemPlayer) {
                    multiStemPlayer.innerHTML = '';
                    multiStemPlayer.classList.add('collapsed');
                }

                // Hide STEMS button
                const stemsBtn = document.getElementById('stemsBtn');
                if (stemsBtn) {
                    stemsBtn.style.display = 'none';
                    stemsBtn.classList.remove('active');
                }

                multiStemPlayerExpanded = false;
                console.log('✓ Multi-stem player cleaned up');
            }

            stemFiles = {};
            console.log('All stem WaveSurfers destroyed');
        }

        // Create WaveSurfer instance for a single stem (hidden, no container)
        function createStemWaveSurfer(stemType) {
            // Create a hidden container for this stem
            const containerId = `stem-waveform-${stemType}`;
            let container = document.getElementById(containerId);

            if (!container) {
                container = document.createElement('div');
                container.id = containerId;
                container.style.display = 'none'; // Hidden for now (Step 2A)
                document.body.appendChild(container);
            }

            const stemWS = WaveSurfer.create({
                container: `#${containerId}`,
                waveColor: '#666666',
                progressColor: '#4a9eff',
                cursorColor: '#ffffff',
                barWidth: 3,
                barRadius: 3,
                cursorWidth: 2,
                height: 40,
                barGap: 2,
                responsive: true,
                normalize: true,
                backend: 'WebAudio',
                autoScroll: false
            });

            // Phase 4 Fix 2: Set initial volume to 1.0 (will be updated by updateStemAudioState)
            stemWS.setVolume(1.0);

            console.log(`Created WaveSurfer for ${stemType} stem`);
            return stemWS;
        }

        // Load and sync all stems for a file
        async function loadStems(parentFileId, autoplay = true) {
            console.log(`Loading stems for file ${parentFileId}...`);

            // Destroy any existing stems
            destroyAllStems();

            // Phase 4 Fix 1: Use preloaded stems instead of fetching
            const stems = allStemFiles[parentFileId] || {};
            stemFiles = stems;

            // Check if we have all 4 stems
            const stemTypes = ['vocals', 'drums', 'bass', 'other'];
            const missingStems = stemTypes.filter(type => !stems[type]);

            if (missingStems.length > 0) {
                console.warn(`Missing stems: ${missingStems.join(', ')}`);
                return false; // Don't load stems if any are missing
            }

            // Create WaveSurfer instance for each stem
            stemTypes.forEach(stemType => {
                stemWavesurfers[stemType] = createStemWaveSurfer(stemType);
            });

            // Load audio for each stem
            const loadPromises = stemTypes.map(stemType => {
                return new Promise((resolve) => {
                    const stemWS = stemWavesurfers[stemType];
                    stemWS.on('ready', () => {
                        console.log(`${stemType} stem ready`);
                        resolve();
                    });
                    stemWS.load(stems[stemType].file_url);
                });
            });

            // Wait for all stems to be ready
            await Promise.all(loadPromises);
            console.log('All stems loaded and ready');

            // Sync stems with main WaveSurfer events
            syncStemsWithMain(autoplay);

            return true;
        }

        // Sync all stem WaveSurfers with main WaveSurfer
        function syncStemsWithMain(autoplay = true) {
            if (!wavesurfer) return;

            // Track whether stems were playing before seek (fixes seek resume bug)
            let stemsWerePlaying = false;

            // Sync play/pause
            wavesurfer.on('play', () => {
                stemsWerePlaying = true;
                Object.keys(stemWavesurfers).forEach(stemType => {
                    const stemWS = stemWavesurfers[stemType];
                    if (stemWS && !stemWS.isPlaying()) {
                        stemWS.play();
                    }
                });
            });

            wavesurfer.on('pause', () => {
                stemsWerePlaying = false;
                Object.keys(stemWavesurfers).forEach(stemType => {
                    const stemWS = stemWavesurfers[stemType];
                    if (stemWS && stemWS.isPlaying()) {
                        stemWS.pause();
                    }
                });
            });

            // Sync seeking - convert time to progress ratio
            wavesurfer.on('seeking', (currentTime) => {
                // The 'seeking' event passes currentTime in seconds, not progress (0-1)
                // We need to convert to progress ratio for stems
                const duration = wavesurfer.getDuration();
                const progress = duration > 0 ? currentTime / duration : 0;

                Object.keys(stemWavesurfers).forEach(stemType => {
                    const stemWS = stemWavesurfers[stemType];
                    if (stemWS) {
                        stemWS.seekTo(progress);
                    }
                });
            });

            // Sync finish
            wavesurfer.on('finish', () => {
                Object.keys(stemWavesurfers).forEach(stemType => {
                    const stemWS = stemWavesurfers[stemType];
                    if (stemWS) {
                        stemWS.seekTo(0);
                    }
                });
            });

            console.log('Stems synced with main WaveSurfer');

            // Auto-play if requested
            if (autoplay) {
                setTimeout(() => {
                    wavesurfer.play();
                }, 100); // Small delay to ensure everything is ready
            }
        }

        // Apply solo/mute logic to stems
        function updateStemAudioState() {
            // Phase 4 Step 2B: Get master volume from slider
            const masterVolume = document.getElementById('volumeSlider')?.value / 100 || 1.0;

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
        function extractTagsFromFilename(filename) {
            const tags = [];
            let bpm = null;
            let key = null;
            const nameWithoutExt = filename.replace(/\.(wav|mp3|aiff|flac|m4a|ogg)$/i, '');

            // Extract instrument/name from beginning (first word/segment)
            const nameMatch = nameWithoutExt.match(/^([A-Za-z]+)/);
            if (nameMatch) {
                tags.push(nameMatch[1].toLowerCase());
            }

            // Extract BPM (2-3 digit numbers, allow underscores/spaces around them)
            const bpmMatches = nameWithoutExt.match(/(?:^|[_\s])(\d{2,3})(?:[_\s]|$)/g);
            if (bpmMatches) {
                // Extract just the number from the first match
                const bpmNumber = bpmMatches[0].match(/\d{2,3}/)[0];
                bpm = parseInt(bpmNumber);
                tags.push(`${bpmNumber}bpm`);
            }

            // Extract musical key - must be at word boundaries or surrounded by underscores/spaces
            // Patterns: Gm, Db, C#, Abmaj, F#min, Dmaj, Fm, etc.
            const keyPatterns = [
                /(?:^|[_\s])([A-G][b#]?)(maj|min|major|minor)(?:[_\s\.]|$)/i,  // Cmaj, Gmin, Dbmaj, Fmin, etc.
                /(?:^|[_\s])([A-G][b#]?)m(?![a-z])/i,                           // Gm, C#m, Fm (minor)
                /(?:^|[_\s])([A-G][b#]?)(?=[_\s\.]|$)/                          // C, Db (standalone, default to major)
            ];

            for (let pattern of keyPatterns) {
                const match = nameWithoutExt.match(pattern);
                if (match) {
                    let note = match[1];
                    let quality = match[2];

                    // Normalize note (capitalize first letter, preserve b or #)
                    note = note.charAt(0).toUpperCase() + note.slice(1).toLowerCase();

                    // Determine if major or minor
                    if (quality && (quality.toLowerCase() === 'min' || quality.toLowerCase() === 'minor')) {
                        key = `${note}min`;
                        tags.push(`${note}min`);
                    } else if (quality && (quality.toLowerCase() === 'maj' || quality.toLowerCase() === 'major')) {
                        key = `${note}maj`;
                        tags.push(`${note}maj`);
                    } else if (pattern.source.includes('m(?!')) {
                        // Pattern matched "Gm" style
                        key = `${note}min`;
                        tags.push(`${note}min`);
                    } else {
                        // Default to major
                        key = `${note}maj`;
                        tags.push(`${note}maj`);
                    }
                    break; // Only match first key found
                }
            }

            return { tags, bpm, key };
        }

        // Get audio file duration
        function getAudioDuration(file) {
            return new Promise((resolve) => {
                const audio = new Audio();
                audio.addEventListener('loadedmetadata', () => {
                    resolve(audio.duration);
                    URL.revokeObjectURL(audio.src);
                });
                audio.addEventListener('error', () => {
                    resolve(null);
                    URL.revokeObjectURL(audio.src);
                });
                audio.src = URL.createObjectURL(file);
            });
        }

        // BPM detection removed - using filename parsing only
        // Future: Will integrate separate BPM detection solution

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

        // PREF_KEYS now imported from config.js

        // Load processing preferences from localStorage
        function loadProcessingPreferences() {
            document.getElementById('processStems').checked = localStorage.getItem(PREF_KEYS.stems) === 'true';
            document.getElementById('processBpmKey').checked = localStorage.getItem(PREF_KEYS.bpmKey) !== 'false'; // default true
            document.getElementById('processInstruments').checked = localStorage.getItem(PREF_KEYS.instruments) !== 'false'; // default true
            document.getElementById('processChords').checked = localStorage.getItem(PREF_KEYS.chords) !== 'false'; // default true
            document.getElementById('processBeatmap').checked = localStorage.getItem(PREF_KEYS.beatmap) !== 'false'; // default true
            document.getElementById('processAutoTag').checked = localStorage.getItem(PREF_KEYS.autoTag) !== 'false'; // default true
            document.getElementById('processConvertMp3').checked = localStorage.getItem(PREF_KEYS.convertMp3) === 'true'; // default false
        }

        // Save processing preferences to localStorage (only in upload mode)
        function saveProcessingPreferences() {
            // Only save if we're in upload mode (pendingUploadFiles has items)
            if (pendingUploadFiles.length > 0) {
                localStorage.setItem(PREF_KEYS.stems, document.getElementById('processStems').checked);
                localStorage.setItem(PREF_KEYS.bpmKey, document.getElementById('processBpmKey').checked);
                localStorage.setItem(PREF_KEYS.instruments, document.getElementById('processInstruments').checked);
                localStorage.setItem(PREF_KEYS.chords, document.getElementById('processChords').checked);
                localStorage.setItem(PREF_KEYS.beatmap, document.getElementById('processBeatmap').checked);
                localStorage.setItem(PREF_KEYS.autoTag, document.getElementById('processAutoTag').checked);
                localStorage.setItem(PREF_KEYS.convertMp3, document.getElementById('processConvertMp3').checked);
            }
        }

        // Add change listeners to save preferences when checkboxes change
        document.addEventListener('DOMContentLoaded', () => {
            ['processStems', 'processBpmKey', 'processInstruments', 'processChords', 'processBeatmap', 'processAutoTag', 'processConvertMp3'].forEach(id => {
                const checkbox = document.getElementById(id);
                if (checkbox) {
                    checkbox.addEventListener('change', saveProcessingPreferences);
                }
            });
        });

        // Open upload flow - trigger file picker
        function openUploadFlow() {
            const fileInput = document.getElementById('uploadFileInput');
            fileInput.value = ''; // Reset
            fileInput.click();
        }

        // Handle file selection - show tag modal
        document.addEventListener('DOMContentLoaded', () => {
            const fileInput = document.getElementById('uploadFileInput');
            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    pendingUploadFiles = Array.from(e.target.files);
                    openUploadTagModal();
                }
            });
        });

        // Open tag modal for upload
        function openUploadTagModal() {
            const modal = document.getElementById('editTagsModal');
            const modalFileCount = document.getElementById('modalFileCount');
            const tagInput = document.getElementById('tagInputField');
            const saveBtn = document.querySelector('.modal-btn-save');
            const processingOptions = document.getElementById('processingOptions');

            // Update header
            modalFileCount.textContent = `(${pendingUploadFiles.length} file${pendingUploadFiles.length > 1 ? 's' : ''} to upload)`;

            // Change button text to "Upload"
            saveBtn.textContent = 'Upload';

            // Show processing options (upload mode)
            processingOptions.style.display = 'block';

            // Change title and note for upload mode
            document.getElementById('processingOptionsTitle').textContent = 'Auto-Processing Options:';
            document.getElementById('processingNote').innerHTML = '<p style="margin: 0; font-size: 11px; color: #888; line-height: 1.4;"><strong>Note:</strong> Your selections are saved and will be remembered for next time.</p>';

            // Load saved preferences from localStorage
            loadProcessingPreferences();

            // Clear tag state
            modalTags = new Map();
            modalTagsToAdd = new Set();
            modalTagsToRemove = new Set();
            selectedModalTag = null;

            // Render empty tags (user will add what they want)
            renderModalTags();

            modal.classList.add('active');
            setTimeout(() => tagInput.focus(), 100);
        }

        // Modified saveEditedTags to handle upload mode
        async function saveEditedTags() {
            const modal = document.getElementById('editTagsModal');

            // Check if we're in upload mode
            if (pendingUploadFiles.length > 0) {
                // Upload mode - collect tags and upload files
                const tagsToApply = Array.from(modalTagsToAdd);
                modal.classList.remove('active');

                await performUpload(pendingUploadFiles, tagsToApply);
                pendingUploadFiles = [];
                return;
            }

            // Original edit tags logic - edit mode
            const filesToUpdate = Array.from(selectedFiles);

            // Check which processing options are selected
            const shouldProcessStems = document.getElementById('processStems').checked;
            const shouldProcessBpmKey = document.getElementById('processBpmKey').checked;
            const shouldProcessInstruments = document.getElementById('processInstruments').checked;
            const shouldProcessChords = document.getElementById('processChords').checked;
            const shouldProcessBeatmap = document.getElementById('processBeatmap').checked;
            const shouldProcessAutoTag = document.getElementById('processAutoTag').checked;
            const shouldConvertMp3 = document.getElementById('processConvertMp3').checked;

            try {
                // Get BPM and Key values from inputs
                const bpmInput = document.getElementById('modalBpmInput').value.trim();
                const keyInput = document.getElementById('modalKeyInput').value.trim();

                // First, update tags/BPM/Key in database
                for (let fileId of filesToUpdate) {
                    const file = audioFiles.find(f => f.id === fileId);
                    if (!file) continue;

                    // Start with current tags
                    let newTags = [...file.tags];

                    // Remove tags marked for removal
                    newTags = newTags.filter(tag => !modalTagsToRemove.has(tag));

                    // Add new tags
                    newTags = [...new Set([...newTags, ...modalTagsToAdd])];

                    // Prepare update object
                    const updateData = { tags: newTags };

                    // Update BPM if provided
                    if (bpmInput !== '') {
                        const bpmValue = parseFloat(bpmInput);
                        updateData.bpm = isNaN(bpmValue) ? null : bpmValue;
                    }

                    // Update Key if provided
                    if (keyInput !== '') {
                        updateData.key = keyInput || null;
                    }

                    // Update in database
                    await supabase
                        .from('audio_files')
                        .update(updateData)
                        .eq('id', fileId);
                }

                // Close modal
                closeEditTagsModal();

                // Clear selection
                selectedFiles.clear();

                // Now run any selected processing tasks
                const anyProcessing = shouldProcessBpmKey || shouldProcessInstruments || shouldProcessChords || shouldProcessBeatmap || shouldProcessStems || shouldProcessAutoTag || shouldConvertMp3;

                if (anyProcessing) {
                    await runSelectedProcessing(filesToUpdate, {
                        bpmKey: shouldProcessBpmKey,
                        instruments: shouldProcessInstruments,
                        chords: shouldProcessChords,
                        beatmap: shouldProcessBeatmap,
                        stems: shouldProcessStems,
                        auto_tag: shouldProcessAutoTag,
                        convert_to_mp3: shouldConvertMp3
                    });
                }

                // Reload data
                await loadData();

            } catch (error) {
                console.error('Error saving file data:', error);
                alert('Error saving file data. Check console for details.');
            }
        }

        // Run selected processing tasks with progress indication
        async function runSelectedProcessing(fileIds, options) {
            const filesToProcess = fileIds.map(id => audioFiles.find(f => f.id === id)).filter(f => f);
            const totalFiles = filesToProcess.length;

            if (totalFiles === 0) return;

            // Mark files as processing
            filesToProcess.forEach(file => processingFiles.add(file.id));
            renderFiles(); // Re-render to show spinners

            // No polling needed - we refresh after each file completes

            // Build task list description
            let tasks = [];
            if (options.bpmKey) tasks.push('BPM/Key');
            if (options.instruments) tasks.push('Instruments');
            if (options.chords) tasks.push('Chords');
            if (options.beatmap) tasks.push('Beatmap');
            if (options.stems) tasks.push('Stems');

            const taskList = tasks.join(', ');

            // Show progress bar
            showProgressBar(`Processing: ${filesToProcess[0].name}`, 0, totalFiles);

            for (let i = 0; i < filesToProcess.length; i++) {
                const file = filesToProcess[i];

                // Update progress
                updateProgress(i + 1, totalFiles, `Processing (${taskList}): ${file.name}`);

                // Estimate time based on what's being processed
                let estimatedTime = 0;
                if (options.bpmKey) estimatedTime += 15;
                if (options.instruments || options.chords || options.beatmap) estimatedTime += 15;
                if (options.stems) estimatedTime += 120;

                // Start animation
                startProgressAnimation(estimatedTime);

                try {
                    // Call Railway webhook for on-demand processing
                    const response = await fetch('https://web-production-bcf6c.up.railway.app/process-existing', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            file_id: file.id,
                            file_url: file.file_url,
                            file_name: file.name,
                            options: {
                                bpm_key: options.bpmKey,
                                instruments: options.instruments,
                                chords: options.chords,
                                beatmap: options.beatmap,
                                stems: options.stems,
                                auto_tag: options.auto_tag,
                                convert_to_mp3: options.convert_to_mp3
                            }
                        })
                    });

                    const result = await response.json();

                    if (result.status === 'success') {
                        console.log(`✓ Processing completed: ${file.name}`, result.result);

                        // Remove from processing set
                        processingFiles.delete(file.id);

                        // Reload data for this file to get updated BPM/key/etc
                        await loadData();
                    } else {
                        console.error(`✗ Processing error: ${file.name}`, result.error || result.message);
                        // Still remove from processing on error
                        processingFiles.delete(file.id);
                    }

                    completeProgress();
                } catch (error) {
                    console.error(`✗ Processing error: ${file.name}`, error);
                    // Remove from processing on error
                    processingFiles.delete(file.id);
                    await loadData(); // Refresh to remove hourglass
                    completeProgress();
                }
            }

            // Final progress
            updateProgress(totalFiles, totalFiles, 'Complete!');
            completeProgress();

            setTimeout(() => {
                hideProgressBar();
            }, 1500);
        }

        // Perform the actual upload
        async function performUpload(files, sharedTags) {
            const progressBar = document.getElementById('uploadProgressBar');
            const modalFileCount = document.getElementById('modalFileCount');

            // Check if conversion to MP3 is requested
            const shouldConvertMp3 = document.getElementById('processConvertMp3').checked;

            try {
                // Show progress bar
                progressBar.style.display = 'block';
                progressBar.style.width = '0%';

                let successCount = 0;

                for (let i = 0; i < files.length; i++) {
                    let file = files[i];
                    let originalFileName = file.name;

                    // Update modal status - Analyzing
                    modalFileCount.textContent = `Analyzing ${i + 1}/${files.length}: ${file.name}`;

                    // Convert to MP3 if requested
                    if (shouldConvertMp3) {
                        modalFileCount.textContent = `Converting to MP3 ${i + 1}/${files.length}: ${file.name}`;

                        const formData = new FormData();
                        formData.append('file', file);

                        const convertResponse = await fetch('https://web-production-bcf6c.up.railway.app/convert-for-upload', {
                            method: 'POST',
                            body: formData
                        });

                        if (!convertResponse.ok) {
                            throw new Error(`MP3 conversion failed: ${convertResponse.statusText}`);
                        }

                        const mp3Blob = await convertResponse.blob();
                        const newFileName = convertResponse.headers.get('X-Converted-Filename') || file.name.replace(/\.(wav|aiff|flac|m4a|ogg)$/i, '.mp3');

                        // Create new File object with MP3 data
                        file = new File([mp3Blob], newFileName, { type: 'audio/mpeg' });
                        console.log(`✓ Converted ${originalFileName} → ${newFileName}`);
                    }

                    // Auto-extract tags from filename
                    const extracted = extractTagsFromFilename(file.name);

                    // Combine auto-tags + shared tags (remove duplicates)
                    const allTags = [...new Set([...extracted.tags, ...sharedTags])];

                    // Get audio length
                    const length = await getAudioDuration(file);

                    // Update modal status - Uploading
                    modalFileCount.textContent = `Uploading ${i + 1}/${files.length}: ${file.name}`;

                    // Upload file to Supabase Storage
                    const fileName = `${Date.now()}-${i}-${file.name}`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('audio-files')
                        .upload(fileName, file);

                    if (uploadError) throw uploadError;

                    // Get public URL
                    const { data: urlData } = supabase.storage
                        .from('audio-files')
                        .getPublicUrl(fileName);

                    // Save metadata to database
                    const { data: dbData, error: dbError } = await supabase
                        .from('audio_files')
                        .insert([{
                            name: file.name,
                            file_url: urlData.publicUrl,
                            tags: allTags,
                            bpm: extracted.bpm,
                            key: extracted.key,
                            length: length
                        }])
                        .select();

                    if (dbError) throw dbError;
                    successCount++;

                    // Update progress bar
                    const progress = ((i + 1) / files.length) * 100;
                    progressBar.style.width = progress + '%';
                }

                // Complete
                progressBar.style.width = '100%';
                modalFileCount.textContent = `✅ Successfully uploaded ${successCount} file(s)!`;

                // Reload data
                await loadData();

                // Hide progress bar and close modal after a moment
                setTimeout(() => {
                    progressBar.style.display = 'none';
                    progressBar.style.width = '0%';
                    closeEditTagsModal();
                }, 1500);

            } catch (error) {
                console.error('Error uploading files:', error);
                modalFileCount.textContent = '❌ Error uploading files';
                progressBar.style.display = 'none';
                progressBar.style.width = '0%';

                setTimeout(() => {
                    alert('Error uploading files. Check console for details.');
                }, 100);
            }
        }

        async function uploadAudio() {
            const fileInput = document.getElementById('audioFile');
            const tagsInput = document.getElementById('audioTags');
            const statusDiv = document.getElementById('uploadStatus');

            if (!fileInput.files || fileInput.files.length === 0) {
                alert('Please select at least one audio file');
                return;
            }

            const files = Array.from(fileInput.files);
            const sharedTags = tagsInput.value
                .split(',')
                .map(tag => tag.trim().toLowerCase())
                .filter(tag => tag.length > 0);

            try {
                statusDiv.textContent = `Uploading ${files.length} file(s)...`;
                let successCount = 0;

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    statusDiv.textContent = `Uploading ${i + 1}/${files.length}: ${file.name}`;

                    // Auto-extract tags from filename
                    const extracted = extractTagsFromFilename(file.name);

                    // Combine auto-tags + shared tags (remove duplicates)
                    const allTags = [...new Set([...extracted.tags, ...sharedTags])];

                    // Get audio length
                    const length = await getAudioDuration(file);

                    // Upload file to Supabase Storage
                    const fileName = `${Date.now()}-${i}-${file.name}`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('audio-files')
                        .upload(fileName, file);

                    if (uploadError) throw uploadError;

                    // Get public URL
                    const { data: urlData } = supabase.storage
                        .from('audio-files')
                        .getPublicUrl(fileName);

                    // Save metadata to database
                    const { data: dbData, error: dbError } = await supabase
                        .from('audio_files')
                        .insert([{
                            name: file.name,
                            file_url: urlData.publicUrl,
                            tags: allTags,
                            bpm: extracted.bpm,
                            key: extracted.key,
                            length: length
                        }])
                        .select();

                    if (dbError) throw dbError;
                    successCount++;
                }

                // Reload data
                await loadData();

                // Clear inputs
                fileInput.value = '';
                tagsInput.value = '';

                statusDiv.textContent = `✅ Successfully uploaded ${successCount} file(s)!`;
                setTimeout(() => { statusDiv.textContent = ''; }, 3000);
            } catch (error) {
                console.error('Error uploading files:', error);
                statusDiv.textContent = `❌ Error uploading files. Check console for details.`;
                statusDiv.style.color = '#dc3545';
            }
        }

        // Get all unique tags with counts, sorted by count (highest first)
        function getAllTags() {
            const tagCounts = {};
            audioFiles.forEach(file => {
                file.tags.forEach(tag => {
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
            });

            // Sort by count (descending), then alphabetically
            return Object.entries(tagCounts)
                .sort((a, b) => {
                    if (b[1] !== a[1]) return b[1] - a[1]; // Sort by count
                    return a[0].localeCompare(b[0]); // Then alphabetically
                })
                .map(([tag, count]) => ({ tag, count }));
        }

        // Get count for a specific tag (used for filtered counts)
        function getTagCount(tag, files) {
            return files.filter(file => file.tags.includes(tag)).length;
        }

        // Handle tag click
        function handleTagClick(tag, event) {
            event.preventDefault();

            // Clear search bar when clicking a tag
            searchQuery = '';
            document.getElementById('searchBar').value = '';

            // Determine mode: modifier keys override currentTagMode for desktop
            let mode = currentTagMode;
            if (event.altKey) {
                mode = 'exclude';
            } else if (event.shiftKey) {
                mode = 'mustHave';
            } else if (currentTagMode === null) {
                mode = 'canHave'; // Default to canHave if no mode selected
            }

            // Check if tag is already in this mode - if so, remove it
            const element = event.currentTarget;
            const isAlreadyInMode =
                (mode === 'canHave' && filters.canHave.has(tag)) ||
                (mode === 'mustHave' && filters.mustHave.has(tag)) ||
                (mode === 'exclude' && filters.exclude.has(tag));

            // Remove from all filters first
            filters.canHave.delete(tag);
            filters.mustHave.delete(tag);
            filters.exclude.delete(tag);

            // If not already in mode, add it
            if (!isAlreadyInMode) {
                if (mode === 'canHave') {
                    filters.canHave.add(tag);
                } else if (mode === 'mustHave') {
                    filters.mustHave.add(tag);
                } else if (mode === 'exclude') {
                    filters.exclude.add(tag);
                }
            }

            renderTags();
            renderFiles();
        }

        // Select all visible tags (respects search filter)
        function selectAllVisibleTags() {
            const allTags = getAllTags();

            // Filter tags by search query (same logic as renderTags)
            const filteredTags = searchQuery
                ? allTags.filter(({ tag }) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
                : allTags;

            // Add all filtered tags to CAN HAVE
            filteredTags.forEach(({ tag }) => {
                filters.canHave.add(tag);
            });

            // Clear search bar after selecting tags
            searchQuery = '';
            document.getElementById('searchBar').value = '';

            renderTags();
            renderFiles();
        }

        // Deselect all tags
        function deselectAllTags() {
            filters.canHave.clear();
            filters.mustHave.clear();
            filters.exclude.clear();

            renderTags();
            renderFiles();
        }

        // Render tags
        function renderTags(searchQuery = '') {
            const container = document.getElementById('tagsContainer');
            const allTags = getAllTags();

            if (allTags.length === 0) {
                container.innerHTML = '<div class="empty-state" style="width: 100%; padding: 20px;">No tags yet. Upload audio files with tags to get started.</div>';
                updateActiveFiltersDisplay();
                return;
            }

            // Filter tags by search query
            const filteredTags = searchQuery
                ? allTags.filter(({ tag }) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
                : allTags;

            if (filteredTags.length === 0) {
                container.innerHTML = '<div class="empty-state" style="width: 100%; padding: 20px;">No tags match your search.</div>';
                return;
            }

            // Determine if we should show filtered counts
            // Only update counts if MUST HAVE or EXCLUDE filters are active (not CAN HAVE)
            const shouldShowFilteredCounts = filters.mustHave.size > 0 || filters.exclude.size > 0;

            let filesToCountFrom = audioFiles;
            if (shouldShowFilteredCounts) {
                // Get files that match MUST HAVE and EXCLUDE filters only
                filesToCountFrom = audioFiles.filter(file => {
                    const fileTags = new Set(file.tags);

                    // Check EXCLUDE - if file has any excluded tag, filter it out
                    for (let tag of filters.exclude) {
                        if (fileTags.has(tag)) return false;
                    }

                    // Check MUST HAVE - file must have ALL must-have tags
                    for (let tag of filters.mustHave) {
                        if (!fileTags.has(tag)) return false;
                    }

                    return true;
                });
            }

            // When searching, show all tags regardless of count
            // When not searching, separate high-count and low-count tags
            let html = '';

            if (searchQuery) {
                // Show all matching tags when searching
                html = filteredTags.map(({ tag, count }) => {
                    let className = 'tag-button';
                    if (filters.canHave.has(tag)) className += ' can-have';
                    if (filters.mustHave.has(tag)) className += ' must-have';
                    if (filters.exclude.has(tag)) className += ' exclude';

                    const displayCount = shouldShowFilteredCounts
                        ? getTagCount(tag, filesToCountFrom)
                        : count;

                    return `<button class="${className}" onclick="handleTagClick('${tag}', event)">${tag} (${displayCount})</button>`;
                }).join('');
            } else {
                // Not searching - separate by count
                const highCountTags = filteredTags.filter(({ count }) => count > 1);
                const lowCountTags = filteredTags.filter(({ count }) => count === 1);

                // Show high-count tags
                html = highCountTags.map(({ tag, count }) => {
                    let className = 'tag-button';
                    if (filters.canHave.has(tag)) className += ' can-have';
                    if (filters.mustHave.has(tag)) className += ' must-have';
                    if (filters.exclude.has(tag)) className += ' exclude';

                    const displayCount = shouldShowFilteredCounts
                        ? getTagCount(tag, filesToCountFrom)
                        : count;

                    return `<button class="${className}" onclick="handleTagClick('${tag}', event)">${tag} (${displayCount})</button>`;
                }).join('');

                // Add "more tags" pill if there are low-count tags
                if (lowCountTags.length > 0) {
                    const icon = showAllTags ? '−' : '+';
                    html += `<button class="tag-button more-tags" onclick="toggleShowAllTags()" style="background: #2a2a2a; color: #fff; border: 2px solid #fff; font-weight: 600;">${lowCountTags.length} Tags (${icon})</button>`;
                }

                // Show low-count tags if showAllTags is true
                if (showAllTags && lowCountTags.length > 0) {
                    html += lowCountTags.map(({ tag, count }) => {
                        let className = 'tag-button';
                        if (filters.canHave.has(tag)) className += ' can-have';
                        if (filters.mustHave.has(tag)) className += ' must-have';
                        if (filters.exclude.has(tag)) className += ' exclude';

                        const displayCount = shouldShowFilteredCounts
                            ? getTagCount(tag, filesToCountFrom)
                            : count;

                        return `<button class="${className}" onclick="handleTagClick('${tag}', event)">${tag} (${displayCount})</button>`;
                    }).join('');
                }
            }

            container.innerHTML = html;
            updateActiveFiltersDisplay();
        }

        // Toggle showing all tags (including low-count ones)
        function toggleShowAllTags() {
            showAllTags = !showAllTags;
            renderTags(searchQuery);
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
            renderFiles();
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
            renderFiles();
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

        // Update active filters display
        function updateActiveFiltersDisplay() {
            const display = document.getElementById('activeFilters');
            const parts = [];

            if (filters.canHave.size > 0) {
                parts.push(`CAN HAVE: ${Array.from(filters.canHave).join(', ')}`);
            }
            if (filters.mustHave.size > 0) {
                parts.push(`MUST HAVE: ${Array.from(filters.mustHave).join(', ')}`);
            }
            if (filters.exclude.size > 0) {
                parts.push(`EXCLUDE: ${Array.from(filters.exclude).join(', ')}`);
            }

            display.textContent = parts.length > 0 ? parts.join(' | ') : 'No active filters';
        }

        // Filter files based on current tag filters and search query
        function filterFiles() {
            let filtered = audioFiles;

            // Apply search query filter (searches filename AND tags)
            if (searchQuery) {
                filtered = filtered.filter(file => {
                    const nameMatch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
                    const tagMatch = file.tags && file.tags.some(tag =>
                        tag.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                    return nameMatch || tagMatch;
                });
            }

            // Apply tag filters
            if (filters.canHave.size === 0 && filters.mustHave.size === 0 && filters.exclude.size === 0) {
                return filtered;
            }

            return filtered.filter(file => {
                const fileTags = new Set(file.tags);

                // Check EXCLUDE - if file has any excluded tag, filter it out
                for (let tag of filters.exclude) {
                    if (fileTags.has(tag)) return false;
                }

                // Check MUST HAVE - file must have ALL must-have tags
                for (let tag of filters.mustHave) {
                    if (!fileTags.has(tag)) return false;
                }

                // Check CAN HAVE - if can-have filters exist, file must have at least one
                if (filters.canHave.size > 0) {
                    let hasCanHave = false;
                    for (let tag of filters.canHave) {
                        if (fileTags.has(tag)) {
                            hasCanHave = true;
                            break;
                        }
                    }
                    if (!hasCanHave) return false;
                }

                return true;
            });
        }

        // Toggle file selection
        function toggleFileSelection(fileId, event) {
            event.stopPropagation();
            if (selectedFiles.has(fileId)) {
                selectedFiles.delete(fileId);
            } else {
                selectedFiles.add(fileId);
            }
            updateSelectionUI();
        }

        // Update selection UI
        function updateSelectionUI() {
            const selectedCount = selectedFiles.size;
            const selectedCountEl = document.getElementById('selectedCount');
            const batchDeleteBtn = document.getElementById('batchDeleteBtn');
            const batchEditBtn = document.getElementById('batchEditBtn');
            const batchDetectBtn = document.getElementById('batchDetectBtn');
            const batchStemsBtn = document.getElementById('batchStemsBtn');

            if (selectedCount > 0) {
                selectedCountEl.textContent = `| ${selectedCount} selected`;
                batchDeleteBtn.disabled = false;
                batchEditBtn.disabled = false;
                batchDetectBtn.disabled = false;
                batchStemsBtn.disabled = false;
                batchDeleteBtn.style.opacity = '1';
                batchEditBtn.style.opacity = '1';
                batchDetectBtn.style.opacity = '1';
                batchStemsBtn.style.opacity = '1';
                batchDeleteBtn.style.cursor = 'pointer';
                batchEditBtn.style.cursor = 'pointer';
                batchDetectBtn.style.cursor = 'pointer';
                batchStemsBtn.style.cursor = 'pointer';
            } else {
                selectedCountEl.textContent = '';
                batchDeleteBtn.disabled = true;
                batchEditBtn.disabled = true;
                batchDetectBtn.disabled = true;
                batchStemsBtn.disabled = true;
                batchDeleteBtn.style.opacity = '0.5';
                batchEditBtn.style.opacity = '0.5';
                batchDetectBtn.style.opacity = '0.5';
                batchStemsBtn.style.opacity = '0.5';
                batchDeleteBtn.style.cursor = 'not-allowed';
                batchEditBtn.style.cursor = 'not-allowed';
                batchDetectBtn.style.cursor = 'not-allowed';
                batchStemsBtn.style.cursor = 'not-allowed';
            }

            // Update checkboxes
            const filteredFiles = filterFiles();
            filteredFiles.forEach(file => {
                const checkbox = document.getElementById(`checkbox-${file.id}`);
                if (checkbox) {
                    checkbox.checked = selectedFiles.has(file.id);
                }
            });
        }

        // Select all files
        function selectAll() {
            const filteredFiles = filterFiles();
            filteredFiles.forEach(file => selectedFiles.add(file.id));
            updateSelectionUI();
        }

        // Deselect all files
        function deselectAll() {
            selectedFiles.clear();
            updateSelectionUI();
        }

        // Sort files
        function sortFiles(files) {
            const sorted = [...files];

            sorted.sort((a, b) => {
                let valA, valB;

                switch(sortBy) {
                    case 'name':
                        valA = a.name.toLowerCase();
                        valB = b.name.toLowerCase();
                        break;
                    case 'date':
                        valA = new Date(a.created_at);
                        valB = new Date(b.created_at);
                        break;
                    case 'bpm':
                        valA = a.bpm || 0;
                        valB = b.bpm || 0;
                        break;
                    case 'key':
                        valA = a.key || '';
                        valB = b.key || '';
                        break;
                    case 'length':
                        valA = a.length || 0;
                        valB = b.length || 0;
                        break;
                }

                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });

            return sorted;
        }

        // Handle sort column click
        function handleSort(column) {
            if (sortBy === column) {
                sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                sortBy = column;
                sortOrder = column === 'date' ? 'desc' : 'asc'; // Default to newest first for date
            }
            renderFiles();
        }

        // Render files
        function renderFiles() {
            const container = document.getElementById('fileList');
            const filteredFiles = filterFiles();
            const sortedFiles = sortFiles(filteredFiles);

            document.getElementById('fileCount').textContent = `(${sortedFiles.length})`;

            if (sortedFiles.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
                        </svg>
                        <div>${audioFiles.length === 0 ? 'No audio files yet. Upload your first audio file to get started!' : 'No files match your filters.'}</div>
                    </div>
                `;
                updateSelectionUI();
                return;
            }

            // Build column headers - will be added to sticky header
            const getSortIcon = (col) => {
                if (sortBy !== col) return '↕';
                return sortOrder === 'asc' ? '↑' : '↓';
            };

            const headers = `
                <div style="display: grid; grid-template-columns: 16px 1fr 80px 110px 55px 60px 60px 40px 30px; gap: 8px; padding: 8px 10px; background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 6px; font-size: 11px; color: #999; font-weight: 600;">
                    <div></div>
                    <div onclick="handleSort('name')" style="cursor: pointer; user-select: none;">
                        Name ${getSortIcon('name')}
                    </div>
                    <div style="text-align: center;">
                        Wave
                    </div>
                    <div onclick="handleSort('date')" style="cursor: pointer; user-select: none; text-align: center;">
                        Date ${getSortIcon('date')}
                    </div>
                    <div onclick="handleSort('length')" style="cursor: pointer; user-select: none; text-align: center;">
                        Time ${getSortIcon('length')}
                    </div>
                    <div onclick="handleSort('bpm')" style="cursor: pointer; user-select: none; text-align: center;">
                        BPM ${getSortIcon('bpm')}
                    </div>
                    <div onclick="handleSort('key')" style="cursor: pointer; user-select: none; text-align: center;">
                        Key ${getSortIcon('key')}
                    </div>
                    <div style="text-align: center;">
                        Stems
                    </div>
                    <div></div>
                </div>
            `;

            const formatDate = (dateString) => {
                const date = new Date(dateString);
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const year = String(date.getFullYear()).slice(-2);
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${month}/${day}/${year} ${hours}:${minutes}`;
            };

            const formatDuration = (seconds) => {
                if (!seconds) return '-';
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                return `${mins}:${String(secs).padStart(2, '0')}`;
            };

            const fileRows = sortedFiles.map(file => {
                // Build stem expansion UI (Phase 4 Step 2B) - Vertical stack layout
                const stemsExpanded = expandedStems.has(file.id);
                const stemsHTML = stemsExpanded && file.has_stems ? `
                    <div class="stems-expansion" style="background: #0f0f0f; border: 1px solid #2a2a2a; border-top: none; border-radius: 0 0 6px 6px; padding: 15px; margin-top: -6px;">
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <!-- Vocals Stem -->
                            <div class="stem-card" style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; padding: 12px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 18px;">🎤</span>
                                    <span style="color: #fff; font-weight: 600; font-size: 14px; min-width: 60px;">Vocals</span>
                                    <div style="flex: 1;">
                                        <div id="stem-waveform-vocals-${file.id}" style="height: 80px; background: #0f0f0f; border-radius: 4px; overflow: hidden;"></div>
                                    </div>
                                    <div style="display: flex; gap: 12px; align-items: center; min-width: 250px;">
                                        <!-- Volume Slider -->
                                        <div style="display: flex; align-items: center; gap: 6px;">
                                            <span style="color: #999; font-size: 11px;">Vol</span>
                                            <input type="range" id="stem-volume-vocals-${file.id}" min="0" max="100" value="100"
                                                   style="width: 80px;" oninput="handleStemVolumeChange('vocals', this.value)">
                                            <span id="stem-volume-value-vocals-${file.id}" style="color: #999; font-size: 11px; min-width: 30px;">100%</span>
                                        </div>
                                        <!-- Mute Button -->
                                        <button id="stem-mute-vocals-${file.id}" onclick="handleStemMute('vocals')"
                                                style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; padding: 6px 10px; color: #fff; cursor: pointer; font-size: 16px;"
                                                title="Mute Vocals">🔊</button>
                                        <!-- Solo Button -->
                                        <button id="stem-solo-vocals-${file.id}" onclick="handleStemSolo('vocals')"
                                                style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; padding: 6px 10px; color: #fff; cursor: pointer; font-size: 12px; font-weight: 600;"
                                                title="Solo Vocals">S</button>
                                    </div>
                                </div>
                            </div>

                            <!-- Drums Stem -->
                            <div class="stem-card" style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; padding: 12px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 18px;">🥁</span>
                                    <span style="color: #fff; font-weight: 600; font-size: 14px; min-width: 60px;">Drums</span>
                                    <div style="flex: 1;">
                                        <div id="stem-waveform-drums-${file.id}" style="height: 80px; background: #0f0f0f; border-radius: 4px; overflow: hidden;"></div>
                                    </div>
                                    <div style="display: flex; gap: 12px; align-items: center; min-width: 250px;">
                                        <!-- Volume Slider -->
                                        <div style="display: flex; align-items: center; gap: 6px;">
                                            <span style="color: #999; font-size: 11px;">Vol</span>
                                            <input type="range" id="stem-volume-drums-${file.id}" min="0" max="100" value="100"
                                                   style="width: 80px;" oninput="handleStemVolumeChange('drums', this.value)">
                                            <span id="stem-volume-value-drums-${file.id}" style="color: #999; font-size: 11px; min-width: 30px;">100%</span>
                                        </div>
                                        <!-- Mute Button -->
                                        <button id="stem-mute-drums-${file.id}" onclick="handleStemMute('drums')"
                                                style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; padding: 6px 10px; color: #fff; cursor: pointer; font-size: 16px;"
                                                title="Mute Drums">🔊</button>
                                        <!-- Solo Button -->
                                        <button id="stem-solo-drums-${file.id}" onclick="handleStemSolo('drums')"
                                                style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; padding: 6px 10px; color: #fff; cursor: pointer; font-size: 12px; font-weight: 600;"
                                                title="Solo Drums">S</button>
                                    </div>
                                </div>
                            </div>

                            <!-- Bass Stem -->
                            <div class="stem-card" style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; padding: 12px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 18px;">🎸</span>
                                    <span style="color: #fff; font-weight: 600; font-size: 14px; min-width: 60px;">Bass</span>
                                    <div style="flex: 1;">
                                        <div id="stem-waveform-bass-${file.id}" style="height: 80px; background: #0f0f0f; border-radius: 4px; overflow: hidden;"></div>
                                    </div>
                                    <div style="display: flex; gap: 12px; align-items: center; min-width: 250px;">
                                        <!-- Volume Slider -->
                                        <div style="display: flex; align-items: center; gap: 6px;">
                                            <span style="color: #999; font-size: 11px;">Vol</span>
                                            <input type="range" id="stem-volume-bass-${file.id}" min="0" max="100" value="100"
                                                   style="width: 80px;" oninput="handleStemVolumeChange('bass', this.value)">
                                            <span id="stem-volume-value-bass-${file.id}" style="color: #999; font-size: 11px; min-width: 30px;">100%</span>
                                        </div>
                                        <!-- Mute Button -->
                                        <button id="stem-mute-bass-${file.id}" onclick="handleStemMute('bass')"
                                                style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; padding: 6px 10px; color: #fff; cursor: pointer; font-size: 16px;"
                                                title="Mute Bass">🔊</button>
                                        <!-- Solo Button -->
                                        <button id="stem-solo-bass-${file.id}" onclick="handleStemSolo('bass')"
                                                style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; padding: 6px 10px; color: #fff; cursor: pointer; font-size: 12px; font-weight: 600;"
                                                title="Solo Bass">S</button>
                                    </div>
                                </div>
                            </div>

                            <!-- Other Stem -->
                            <div class="stem-card" style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 6px; padding: 12px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <span style="font-size: 18px;">🎹</span>
                                    <span style="color: #fff; font-weight: 600; font-size: 14px; min-width: 60px;">Other</span>
                                    <div style="flex: 1;">
                                        <div id="stem-waveform-other-${file.id}" style="height: 80px; background: #0f0f0f; border-radius: 4px; overflow: hidden;"></div>
                                    </div>
                                    <div style="display: flex; gap: 12px; align-items: center; min-width: 250px;">
                                        <!-- Volume Slider -->
                                        <div style="display: flex; align-items: center; gap: 6px;">
                                            <span style="color: #999; font-size: 11px;">Vol</span>
                                            <input type="range" id="stem-volume-other-${file.id}" min="0" max="100" value="100"
                                                   style="width: 80px;" oninput="handleStemVolumeChange('other', this.value)">
                                            <span id="stem-volume-value-other-${file.id}" style="color: #999; font-size: 11px; min-width: 30px;">100%</span>
                                        </div>
                                        <!-- Mute Button -->
                                        <button id="stem-mute-other-${file.id}" onclick="handleStemMute('other')"
                                                style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; padding: 6px 10px; color: #fff; cursor: pointer; font-size: 16px;"
                                                title="Mute Other">🔊</button>
                                        <!-- Solo Button -->
                                        <button id="stem-solo-other-${file.id}" onclick="handleStemSolo('other')"
                                                style="background: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 4px; padding: 6px 10px; color: #fff; cursor: pointer; font-size: 12px; font-weight: 600;"
                                                title="Solo Other">S</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : '';

                return `
                <div class="file-item ${currentFileId === file.id ? 'active' : ''}" style="display: grid; grid-template-columns: 16px 1fr 80px 110px 55px 60px 60px 40px 30px; gap: 8px; align-items: center; ${stemsExpanded ? 'border-radius: 6px 6px 0 0;' : ''}">
                    <input type="checkbox" id="checkbox-${file.id}" ${selectedFiles.has(file.id) ? 'checked' : ''}
                           onclick="toggleFileSelection(${file.id}, event)"
                           style="width: 16px; height: 16px; cursor: pointer;">
                    <div onclick="handleFileClick(${file.id}, event)" style="cursor: pointer;">
                        <div class="file-name">🎵 ${file.name}</div>
                        <div class="file-tags">
                            ${file.tags.map(tag => `<span class="file-tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                    <div id="miniwave-${file.id}" style="height: 32px; cursor: pointer; background: #1a1a1a; border-radius: 4px;"></div>
                    <div onclick="handleFileClick(${file.id}, event)" style="text-align: center; color: #999; font-size: 11px; cursor: pointer;">
                        ${formatDate(file.created_at)}
                    </div>
                    <div onclick="handleFileClick(${file.id}, event)" style="text-align: center; color: #999; font-size: 11px; cursor: pointer;">
                        ${formatDuration(file.length)}
                    </div>
                    <div onclick="handleFileClick(${file.id}, event)" style="text-align: center; color: #999; font-size: 11px; cursor: pointer;">
                        ${file.bpm ? file.bpm : (processingFiles.has(file.id) ? '<span class="spinner">⏳</span>' : '-')}
                    </div>
                    <div onclick="handleFileClick(${file.id}, event)" style="text-align: center; color: #999; font-size: 11px; cursor: pointer;">
                        ${file.key ? file.key : (processingFiles.has(file.id) ? '<span class="spinner">⏳</span>' : '-')}
                    </div>
                    <div style="text-align: center;">
                        ${file.has_stems ?
                            `<span class="stems-icon active ${stemsExpanded ? 'expanded' : ''}" onclick="openStemsViewer(${file.id}, event)" title="${stemsExpanded ? 'Hide' : 'View'} stems">🎛️</span>` :
                            `<span class="stems-icon" onclick="generateStems(${file.id}, event)" title="Generate stems">⚙️</span>`
                        }
                    </div>
                    <button onclick="quickEditFile(${file.id}, event)" title="Edit file" style="background: transparent; border: none; color: #999; cursor: pointer; font-size: 16px; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 4px; transition: all 0.2s;">
                        ⋮
                    </button>
                </div>
                ${stemsHTML}
            `;
            }).join('');

            // Put headers in sticky section, fileRows in scrollable container
            document.getElementById('columnHeaders').innerHTML = headers;
            container.innerHTML = fileRows;
            updateSelectionUI();

            // Render mini waveforms after DOM update
            setTimeout(() => renderMiniWaveforms(sortedFiles), 0);
        }

        // Render mini waveforms for each file
        function renderMiniWaveforms(files) {
            files.forEach(file => {
                const container = document.getElementById(`miniwave-${file.id}`);
                if (!container) return;

                // If waveform already exists and is still attached, skip
                if (miniWaveforms[file.id] && container.children.length > 0) {
                    return;
                }

                // Destroy old instance if it exists but container was recreated
                if (miniWaveforms[file.id]) {
                    try {
                        miniWaveforms[file.id].destroy();
                    } catch (e) {}
                }

                // Create mini wavesurfer instance
                const miniWave = WaveSurfer.create({
                    container: container,
                    waveColor: '#444',
                    progressColor: '#666',
                    height: 32,
                    barWidth: 2,
                    barGap: 1,
                    barRadius: 2,
                    interact: true,
                    hideScrollbar: true,
                    normalize: true,
                    cursorWidth: 0
                });

                // Suppress abort errors (expected when typing quickly in search)
                miniWave.on('error', (err) => {
                    // Silently ignore AbortError - these are expected during rapid re-renders
                    if (err.name === 'AbortError') return;
                    console.error('Mini waveform error:', err);
                });

                miniWave.load(file.file_url).catch(err => {
                    // Silently ignore AbortError - these are expected during rapid re-renders
                    if (err.name === 'AbortError') return;
                    console.error('Failed to load mini waveform:', err);
                });

                // Make it interactive - click to play from that position
                miniWave.on('click', (relativeX) => {
                    loadAudio(file.id, true); // Autoplay enabled
                    setTimeout(() => {
                        if (wavesurfer) {
                            wavesurfer.seekTo(relativeX);
                            // Play is already started by loadAudio autoplay, just seek to position
                        }
                    }, 200); // Increased timeout to ensure file is loaded
                });

                // Store the instance
                miniWaveforms[file.id] = miniWave;
            });
        }

        // Track last clicked file for range selection
        let lastClickedFileId = null;

        // Handle file click - supports normal, option (range), and cmd/ctrl (multi-select)
        function handleFileClick(fileId, event) {
            const filteredFiles = filterFiles();

            if (event.altKey && lastClickedFileId) {
                // Option+click = range select from last clicked to this one
                event.preventDefault();
                event.stopPropagation();

                const lastIndex = filteredFiles.findIndex(f => f.id === lastClickedFileId);
                const currentIndex = filteredFiles.findIndex(f => f.id === fileId);

                if (lastIndex !== -1 && currentIndex !== -1) {
                    const start = Math.min(lastIndex, currentIndex);
                    const end = Math.max(lastIndex, currentIndex);

                    // Select all files in range
                    for (let i = start; i <= end; i++) {
                        selectedFiles.add(filteredFiles[i].id);
                    }
                }

                // Update all checkboxes
                document.querySelectorAll('.file-item input[type="checkbox"]').forEach(cb => {
                    const checkboxFileId = parseInt(cb.id.replace('checkbox-', ''));
                    cb.checked = selectedFiles.has(checkboxFileId);
                });

                updateSelectionUI();
            } else if (event.metaKey || event.ctrlKey) {
                // Cmd/Ctrl+click = toggle selection without changing playback
                event.preventDefault();
                event.stopPropagation();

                if (selectedFiles.has(fileId)) {
                    selectedFiles.delete(fileId);
                } else {
                    selectedFiles.add(fileId);
                }

                // Update checkbox
                const checkbox = document.getElementById(`checkbox-${fileId}`);
                if (checkbox) checkbox.checked = selectedFiles.has(fileId);

                lastClickedFileId = fileId;
                updateSelectionUI();
            } else {
                // Normal click = clear selection, select this file, and play
                selectedFiles.clear();
                selectedFiles.add(fileId);

                // Update all checkboxes
                document.querySelectorAll('.file-item input[type="checkbox"]').forEach(cb => {
                    cb.checked = false;
                });
                const checkbox = document.getElementById(`checkbox-${fileId}`);
                if (checkbox) checkbox.checked = true;

                lastClickedFileId = fileId;
                updateSelectionUI();

                // Load and respect pause state
                loadAudio(fileId, !userPaused);
            }
        }

        // Quick edit button - open edit modal for single file
        function quickEditFile(fileId, event) {
            event.preventDefault();
            event.stopPropagation();

            // Select only this file
            selectedFiles.clear();
            selectedFiles.add(fileId);

            // Update checkboxes
            document.querySelectorAll('.file-item input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });
            const checkbox = document.getElementById(`checkbox-${fileId}`);
            if (checkbox) checkbox.checked = true;

            updateSelectionUI();

            // Open edit modal
            batchEditTags();
        }

        // Open stems viewer in new window
        // Toggle stems expansion for a file (Phase 4 Step 1)
        function openStemsViewer(fileId, event) {
            event.preventDefault();
            event.stopPropagation();

            // Toggle expansion state
            if (expandedStems.has(fileId)) {
                expandedStems.delete(fileId);
            } else {
                expandedStems.add(fileId);
            }

            // Re-render to show/hide stems
            renderFiles();

            // Phase 4 Step 2B: Render waveforms in expansion containers if stems are loaded
            if (expandedStems.has(fileId) && Object.keys(stemWavesurfers).length > 0 && currentFileId === fileId) {
                setTimeout(() => {
                    renderStemWaveforms(fileId);
                    restoreStemControlStates(fileId);
                }, 100); // Small delay to ensure DOM is ready
            }
        }

        // Phase 4: Toggle stems viewer from bottom player bar STEMS button
        function toggleStemsViewer() {
            if (!currentFileId) return;

            // Toggle expansion state for current file
            if (expandedStems.has(currentFileId)) {
                expandedStems.delete(currentFileId);
            } else {
                expandedStems.add(currentFileId);
            }

            // Re-render to show/hide stems
            renderFiles();

            // Phase 4 Step 2B: Render waveforms in expansion containers if stems are loaded
            if (expandedStems.has(currentFileId) && Object.keys(stemWavesurfers).length > 0) {
                setTimeout(() => {
                    renderStemWaveforms(currentFileId);
                    restoreStemControlStates(currentFileId);
                }, 100); // Small delay to ensure DOM is ready
            }

            // Update STEMS button appearance
            updateStemsButton();
        }

        // Update STEMS button visibility and active state
        function updateStemsButton() {
            const stemsBtn = document.getElementById('stemsBtn');
            if (!stemsBtn) return;

            // Get current file
            const currentFile = audioFiles.find(f => f.id === currentFileId);

            // Show button only if current file has stems
            if (currentFile && currentFile.has_stems) {
                stemsBtn.style.display = 'block';
                // Toggle active class and text based on multi-stem player state
                if (multiStemPlayerExpanded) {
                    stemsBtn.classList.add('active');
                    stemsBtn.innerHTML = '<span>▼ STEMS</span>';
                } else {
                    stemsBtn.classList.remove('active');
                    stemsBtn.innerHTML = '<span>▲ STEMS</span>';
                }
            } else {
                stemsBtn.style.display = 'none';
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
        let stemPlaybackIndependent = {}; // {vocals: true, drums: false, ...} - whether stem should play when parent plays (user's active selection)
        let currentParentFileBPM = null; // Store parent file's original BPM for calculations

        // Phase 2B: Individual Loop Controls (Version 27b)
        let stemLoopStates = {
            vocals: { enabled: false, start: null, end: null },
            drums: { enabled: false, start: null, end: null },
            bass: { enabled: false, start: null, end: null },
            other: { enabled: false, start: null, end: null }
        };

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
            console.log('=== Pre-loading Multi-Stem Wavesurfers (Phase 1) ===');

            // 1. Fetch stem files from database
            console.log(`Fetching stem files for file ID: ${fileId}`);
            const { data, error } = await supabase
                .from('audio_files_stems')
                .select('*')
                .eq('audio_file_id', fileId);

            if (error) {
                console.error('Error fetching stems:', error);
                throw error;
            }

            if (!data || data.length === 0) {
                console.log('No stem files found');
                throw new Error('No stems found');
            }

            // 2. Organize stems by type
            stemFiles = {};
            data.forEach(stem => {
                stemFiles[stem.stem_type] = stem;
            });
            console.log('Organized stem files:', Object.keys(stemFiles));

            // Phase 2A: Get parent file BPM and initialize rate controls
            const parentFile = audioFiles.find(f => f.id === fileId);
            currentParentFileBPM = parentFile ? parentFile.bpm : null;
            console.log(`Parent file BPM: ${currentParentFileBPM}`);

            // Initialize rate control state for each stem
            const stemTypes = ['vocals', 'drums', 'bass', 'other'];
            stemTypes.forEach(type => {
                stemIndependentRates[type] = 1.0; // Start at 1x
                stemRateLocked[type] = true; // Start locked to parent
            });

            // 3. Generate UI structure in multiStemPlayer
            const multiStemPlayer = document.getElementById('multiStemPlayer');
            if (!multiStemPlayer) {
                console.error('multiStemPlayer element not found!');
                throw new Error('multiStemPlayer not found');
            }

            // Clear existing content
            multiStemPlayer.innerHTML = '';

            // stemTypes already declared above at line 2279
            const loadPromises = [];

            for (const stemType of stemTypes) {
                const stemFile = stemFiles[stemType];
                if (!stemFile) {
                    console.warn(`Missing ${stemType} stem`);
                    continue;
                }

                console.log(`Creating UI and WaveSurfer for ${stemType}`);

                // Use full filename from database (important for "empty" suffix filtering)
                const fileName = stemFile.stem_file_name || stemType;
                // Show full filename - user needs to see "empty" suffix
                const displayName = fileName;

                // Phase 2A: Calculate initial BPM display
                const initialRate = currentRate || 1.0;
                const initialBPM = currentParentFileBPM ? (currentParentFileBPM * initialRate).toFixed(1) : '---';

                // Generate stem UI HTML using template system (Phase 4: Template Refactoring)
                const stemBarHTML = generateStemPlayerBar(stemType, displayName, initialRate, initialBPM);

                multiStemPlayer.insertAdjacentHTML('beforeend', stemBarHTML);
            }

            // 4. Create WaveSurfer instances for each stem (now that DOM exists)
            for (const stemType of stemTypes) {
                const stemFile = stemFiles[stemType];
                if (!stemFile) continue;

                const container = document.getElementById(`multi-stem-waveform-${stemType}`);
                if (!container) {
                    console.error(`Container not found for ${stemType}`);
                    continue;
                }

                // Create WaveSurfer instance
                const ws = WaveSurfer.create({
                    container: container,
                    waveColor: '#555',
                    progressColor: '#667eea',
                    height: 60,
                    backend: 'WebAudio',
                    barWidth: 2,
                    responsive: true
                });

                // Load the stem file
                ws.load(stemFile.file_url);

                // Mute by default (stems are silent until user expands)
                ws.setVolume(0);

                // Store instance
                stemPlayerWavesurfers[stemType] = ws;

                // Set up time display updates and loop checking
                ws.on('audioprocess', () => {
                    const currentTime = ws.getCurrentTime();
                    const duration = ws.getDuration();
                    const timeDisplay = document.getElementById(`multi-stem-time-${stemType}`);
                    if (timeDisplay) {
                        timeDisplay.textContent = `${Utils.formatTime(currentTime)} / ${Utils.formatTime(duration)}`;
                    }

                    // Phase 4: Check if we need to loop this stem
                    const loopState = stemLoopStates[stemType];
                    if (loopState.enabled && loopState.start !== null && loopState.end !== null) {
                        if (currentTime >= loopState.end) {
                            // Loop back to start
                            ws.seekTo(loopState.start / duration);
                            console.log(`[${stemType}] Looping back to ${loopState.start.toFixed(2)}s`);
                        }
                    }
                });

                ws.on('ready', () => {
                    const duration = ws.getDuration();
                    const timeDisplay = document.getElementById(`multi-stem-time-${stemType}`);
                    if (timeDisplay) {
                        timeDisplay.textContent = `0:00 / ${Utils.formatTime(duration)}`;
                    }

                    // Phase 4: Add cycle mode click handler for this stem
                    setupStemCycleModeClickHandler(stemType, container, ws);

                    // Version 27d: Render markers if enabled
                    const file = audioFiles.find(f => f.id === currentFileId);
                    if (file && stemMarkersEnabled[stemType]) {
                        addStemBarMarkers(stemType, file);
                    }
                });

                // Wait for ready
                const readyPromise = new Promise(resolve => {
                    ws.once('ready', () => {
                        console.log(`✓ ${stemType} stem ready`);
                        resolve();
                    });
                });

                loadPromises.push(readyPromise);
            }

            // 5. Wait for all stems to be ready
            await Promise.all(loadPromises);
            console.log('All stems loaded and ready (muted, UI ready but collapsed)');

            // 6. Set up synchronization with parent
            setupParentStemSync();
            console.log('Parent-stem sync established');

            // 7. Start all stems playing (muted) to keep in sync
            if (wavesurfer && wavesurfer.isPlaying()) {
                console.log('Parent is playing - starting stems (muted)');
                const stemTypes = ['vocals', 'drums', 'bass', 'other'];
                stemTypes.forEach(type => {
                    const ws = stemPlayerWavesurfers[type];
                    if (ws) {
                        // Sync to parent position first
                        const parentProgress = wavesurfer.getCurrentTime() / wavesurfer.getDuration();
                        ws.seekTo(parentProgress);
                        // Play muted
                        ws.play();
                    }
                });
            }

            stemsPreloaded = true;
            console.log('=== Phase 1 Pre-load Complete ===');
        }

        // Phase 1: Simplified toggle - just mute/unmute, no loading/destroying
        function toggleMultiStemPlayer() {
            console.log('=== toggleMultiStemPlayer (Phase 1 - Volume Toggle Only) ===');
            console.log('currentFileId:', currentFileId);

            if (!currentFileId) {
                console.log('No current file, returning');
                return;
            }

            const multiStemPlayer = document.getElementById('multiStemPlayer');
            if (!multiStemPlayer) {
                console.log('multiStemPlayer element not found');
                return;
            }

            multiStemPlayerExpanded = !multiStemPlayerExpanded;
            console.log('multiStemPlayerExpanded:', multiStemPlayerExpanded);

            const stemTypes = ['vocals', 'drums', 'bass', 'other'];

            if (multiStemPlayerExpanded) {
                console.log('🎵 EXPANDING: Switching from parent to stems (instant)');

                // Check if parent is currently playing
                const parentIsPlaying = wavesurfer && wavesurfer.isPlaying();
                const parentTime = wavesurfer ? wavesurfer.getCurrentTime() : 0;
                const parentDuration = wavesurfer ? wavesurfer.getDuration() : 1;
                const parentProgress = parentDuration > 0 ? parentTime / parentDuration : 0;

                console.log(`Parent state: ${parentIsPlaying ? 'playing' : 'paused'} at ${parentTime.toFixed(2)}s (${(parentProgress * 100).toFixed(1)}%)`);

                // 1. SYNC ALL STEMS TO PARENT POSITION FIRST
                stemTypes.forEach(type => {
                    const ws = stemPlayerWavesurfers[type];
                    if (ws) {
                        ws.seekTo(parentProgress);
                        console.log(`✓ ${type} synced to position ${(parentProgress * 100).toFixed(1)}%`);
                    }
                });

                // 2. MUTE PARENT IMMEDIATELY (prevents double audio)
                wavesurfer.setVolume(0);
                console.log('✓ Parent muted');

                // 3. UNMUTE ALL STEMS
                stemTypes.forEach(type => {
                    const ws = stemPlayerWavesurfers[type];
                    if (ws) {
                        const volumeSlider = document.getElementById(`stem-volume-${type}`);
                        const targetVolume = volumeSlider ? volumeSlider.value / 100 : 1.0;
                        ws.setVolume(targetVolume);
                        console.log(`✓ ${type} unmuted (volume: ${targetVolume})`);
                    }
                });

                // 4. IF PARENT WAS PLAYING, START ALL STEMS
                if (parentIsPlaying) {
                    console.log('Parent was playing - starting all stems');
                    setTimeout(() => {
                        stemTypes.forEach(type => {
                            const ws = stemPlayerWavesurfers[type];
                            if (ws && !ws.isPlaying()) {
                                ws.play();
                                console.log(`✓ ${type} playing`);
                            }
                        });
                    }, 50); // Small delay to ensure seek completes
                } else {
                    console.log('Parent was paused - stems remain paused at position');
                }

                // 5. Show UI with animation (UI already exists, just reveal it)
                setTimeout(() => {
                    multiStemPlayer.classList.remove('collapsed');
                    console.log('✓ UI expanded');
                }, 10);

            } else {
                console.log('🎵 COLLAPSING: Switching from stems to parent (instant)');

                // 1. MUTE ALL STEMS IMMEDIATELY (prevents double audio)
                stemTypes.forEach(type => {
                    const ws = stemPlayerWavesurfers[type];
                    if (ws) {
                        ws.setVolume(0);
                        console.log(`✓ ${type} muted`);
                    }
                });

                // 2. UNMUTE PARENT (restore to user's volume setting)
                const volumeSlider = document.getElementById('volumeSlider');
                const volume = volumeSlider ? volumeSlider.value / 100 : 1.0;
                wavesurfer.setVolume(volume);
                console.log(`✓ Parent unmuted (volume: ${volume})`);

                // 3. Hide UI (DON'T destroy - keep stems loaded for instant re-expansion)
                multiStemPlayer.classList.add('collapsed');
                console.log('✓ UI collapsed (stems still playing muted in background)');
            }

            // Update STEMS button appearance
            const stemsBtn = document.getElementById('stemsBtn');
            if (stemsBtn) {
                stemsBtn.innerHTML = multiStemPlayerExpanded ? '<span>▼ STEMS</span>' : '<span>▲ STEMS</span>';
                if (multiStemPlayerExpanded) {
                    stemsBtn.classList.add('active');
                } else {
                    stemsBtn.classList.remove('active');
                }
            }

            console.log('=== Toggle complete ===');
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
            console.log('=== Initializing Multi-Stem Player Wavesurfers ===');
            const stemTypes = ['vocals', 'drums', 'bass', 'other'];
            multiStemReadyCount = 0;

            // Capture parent state BEFORE loading stems
            if (!wavesurfer) {
                console.log('No parent wavesurfer - cannot load stems');
                return;
            }

            const parentWasPlaying = wavesurfer.isPlaying();
            const parentCurrentTime = wavesurfer.getCurrentTime();
            const parentDuration = wavesurfer.getDuration();
            const parentProgress = parentDuration > 0 ? parentCurrentTime / parentDuration : 0;

            console.log(`Parent state: ${parentWasPlaying ? 'playing' : 'paused'} at ${parentCurrentTime.toFixed(2)}s (${(parentProgress * 100).toFixed(1)}%)`);

            multiStemAutoPlayOnReady = parentWasPlaying;

            for (const stemType of stemTypes) {
                const stemFile = stemFiles[stemType];
                if (!stemFile) {
                    console.log(`No stem file for ${stemType}, skipping`);
                    continue;
                }

                const containerId = `multi-stem-waveform-${stemType}`;
                const container = document.getElementById(containerId);
                if (!container) {
                    console.log(`No container found for ${stemType}`);
                    continue;
                }

                try {
                    console.log(`Creating WaveSurfer for ${stemType}: ${stemFile.stem_file_name}`);
                    const ws = WaveSurfer.create({
                        container: `#${containerId}`,
                        waveColor: '#555',
                        progressColor: '#667eea',
                        cursorColor: '#ffffff',
                        height: 50,
                        barWidth: 2,
                        barGap: 1,
                        barRadius: 2,
                        cursorWidth: 1,
                        normalize: true,
                        responsive: true,
                        backend: 'WebAudio',
                        interact: true,
                        hideScrollbar: true
                    });

                    // Store reference to stem data
                    ws._stemFile = stemFile;
                    ws._stemType = stemType;

                    // Load the stem file
                    ws.load(stemFile.file_url);

                    // Store instance BEFORE ready event
                    stemPlayerWavesurfers[stemType] = ws;

                    // Initialize all stems as "active" (they should play when parent plays)
                    stemPlaybackIndependent[stemType] = true;

                    // Handle ready event
                    ws.once('ready', () => {
                        multiStemReadyCount++;
                        console.log(`Stem ${multiStemReadyCount}/${stemTypes.length} ready: ${stemType}`);

                        // When all stems are ready - perform seamless switch
                        if (multiStemReadyCount === stemTypes.length) {
                            console.log('All stems ready - performing seamless audio switch');

                            // Step 1: Seek all stems to parent's current position
                            console.log(`Syncing all stems to parent position: ${parentProgress.toFixed(3)}`);
                            const stemTypes = ['vocals', 'drums', 'bass', 'other'];
                            stemTypes.forEach(type => {
                                const stemWS = stemPlayerWavesurfers[type];
                                if (stemWS) {
                                    stemWS.seekTo(parentProgress);
                                }
                            });

                            // Step 2: Mute parent player FIRST (avoid double audio)
                            console.log('Muting parent player');
                            wavesurfer.setVolume(0);

                            // Step 3: If parent was playing, start all stems at synchronized position
                            if (multiStemAutoPlayOnReady) {
                                console.log('Parent was playing - starting all stems in sync');
                                // Small delay to ensure seek completes before playing
                                setTimeout(() => {
                                    playAllStems();
                                }, 50);
                            } else {
                                console.log('Parent was paused - keeping stems paused at position');
                            }

                            // Step 4: Set up ongoing sync between parent and stems
                            setupParentStemSync();
                        }
                    });

                    // Update time display and handle loop playback
                    ws.on('timeupdate', (currentTime) => {
                        const duration = ws.getDuration();
                        const timeDisplay = document.getElementById(`multi-stem-time-${stemType}`);
                        if (timeDisplay) {
                            timeDisplay.textContent = `${Utils.formatTime(currentTime)} / ${Utils.formatTime(duration)}`;
                        }

                        // Check for loop playback
                        const loopState = stemLoopStates[stemType];
                        if (loopState.enabled && loopState.start !== null && loopState.end !== null) {
                            // If playhead reaches or passes loop end, jump back to loop start
                            if (currentTime >= loopState.end) {
                                ws.seekTo(loopState.start / duration);
                                console.log(`${stemType} looped back to ${loopState.start}s`);
                            }
                        }
                    });

                    // Handle stem reaching end of file - loop if enabled
                    ws.on('finish', () => {
                        const loopState = stemLoopStates[stemType];
                        if (loopState.enabled && loopState.start !== null && loopState.end !== null) {
                            // Loop is enabled - seek back to loop start and continue playing
                            ws.seekTo(loopState.start / ws.getDuration());
                            ws.play();
                            console.log(`${stemType} finished - looping back to ${loopState.start}s`);
                        }
                    });

                } catch (error) {
                    console.error(`Error loading multi-stem waveform for ${stemType}:`, error);
                }
            }
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

        // Set up synchronization between parent player and stems
        function setupParentStemSync() {
            if (!wavesurfer) return;

            console.log('Setting up parent-stem synchronization');

            // When parent plays, resume all stems that were playing before pause
            wavesurfer.on('play', () => {
                if (multiStemPlayerExpanded) {
                    console.log('Parent play event - resuming stems that were playing');
                    const stemTypes = ['vocals', 'drums', 'bass', 'other'];
                    stemTypes.forEach(stemType => {
                        const ws = stemPlayerWavesurfers[stemType];
                        // Only play stems that were marked as playing (not manually paused by user)
                        if (ws && stemPlaybackIndependent[stemType]) {
                            ws.play();
                            const icon = document.getElementById(`stem-play-pause-icon-${stemType}`);
                            if (icon) icon.textContent = '||';
                        }
                    });
                }
            });

            // When parent pauses, pause only NON-INDEPENDENT stems
            // Independent stems (those with their own cycles/loops) continue playing
            wavesurfer.on('pause', () => {
                if (multiStemPlayerExpanded) {
                    console.log('Parent pause event - pausing non-independent stems');
                    const stemTypes = ['vocals', 'drums', 'bass', 'other'];
                    stemTypes.forEach(stemType => {
                        const ws = stemPlayerWavesurfers[stemType];
                        const loopState = stemLoopStates[stemType];
                        const isIndependent = loopState.enabled || stemPlaybackIndependent[stemType];

                        if (ws && !isIndependent) {
                            // Only pause stems that aren't in their own loop/cycle
                            if (ws.isPlaying()) {
                                ws.pause();
                                const icon = document.getElementById(`stem-play-pause-icon-${stemType}`);
                                if (icon) icon.textContent = '▶';
                            }
                        }
                    });
                }
            });

            // When parent seeks, seek only NON-INDEPENDENT stems
            // Independent stems (those with their own cycles/loops) maintain their own position
            wavesurfer.on('seeking', (currentTime) => {
                if (multiStemPlayerExpanded) {
                    const seekPosition = currentTime / wavesurfer.getDuration();
                    console.log('Parent seek event - syncing non-independent stems to:', seekPosition);

                    const stemTypes = ['vocals', 'drums', 'bass', 'other'];
                    stemTypes.forEach(stemType => {
                        const ws = stemPlayerWavesurfers[stemType];
                        const loopState = stemLoopStates[stemType];
                        const isIndependent = loopState.enabled || stemPlaybackIndependent[stemType];

                        if (ws && !isIndependent) {
                            // Only seek stems that aren't in their own loop/cycle
                            ws.seekTo(seekPosition);
                        }
                    });
                }
            });

            // REMOVED: Bidirectional sync that made parent follow stems
            // Stems now have independent playback and loops
            // Parent controls act as MODIFIERS (rate × rate, volume × volume)
            // But parent timeline does NOT follow stem timelines
        }

        function destroyMultiStemPlayerWavesurfers() {
            console.log('Destroying multi-stem player wavesurfers');

            // Clean up event listeners before destroying
            if (wavesurfer) {
                wavesurfer.un('play');
                wavesurfer.un('pause');
                wavesurfer.un('seeking');
            }

            // Destroy all stem wavesurfers
            Object.values(stemPlayerWavesurfers).forEach(ws => {
                if (ws) {
                    ws.destroy();
                }
            });
            stemPlayerWavesurfers = {};
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
            const ws = stemPlayerWavesurfers[stemType];
            if (!ws) return;

            const loopBtn = document.getElementById(`stem-loop-${stemType}`);
            const loopState = stemLoopStates[stemType];

            // Toggle cycle mode
            stemCycleModes[stemType] = !stemCycleModes[stemType];

            if (stemCycleModes[stemType]) {
                // Entering cycle mode - enable loop editing
                stemNextClickSets[stemType] = 'start';
                loopBtn.classList.add('active', 'cycle-mode');
                console.log(`[${stemType}] CYCLE MODE ON - click waveform to set loop start/end`);
            } else {
                // Exiting cycle mode - disable loop editing
                loopBtn.classList.remove('active', 'cycle-mode');
                // Also disable loop if it was playing
                loopState.enabled = false;
                loopState.start = null;
                loopState.end = null;
                console.log(`[${stemType}] CYCLE MODE OFF - loop disabled`);
            }
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
                        return false;
                    } else if (clickTime > loopState.end) {
                        // Clicking right of loop end: move loop end
                        loopState.end = clickTime;
                        console.log(`[${stemType}] Loop end moved to ${clickTime.toFixed(2)}s`);
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
                }

                return false;
            };

            // Add listener in CAPTURE phase to intercept before WaveSurfer's handler
            waveformContainer.addEventListener('click', clickHandler, true);
            waveformContainer._clickHandler = clickHandler; // Store reference for cleanup

            console.log(`[${stemType}] Cycle mode click handler installed`);
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
            event.preventDefault();
            event.stopPropagation();

            const file = audioFiles.find(f => f.id === fileId);
            if (!file) return;

            // Show confirmation dialog
            if (!confirm(`Generate stems for "${file.name}"?\n\nThis will create 4 separate stem files (vocals, bass, drums, other) using the Demucs separation model. The process may take several minutes.`)) {
                return;
            }

            // TODO: Implement stem generation via Railway webhook
            alert('Stem generation will be implemented with Railway webhook integration.');
        }

        // Load audio file
        // Add bar markers from beatmap data
        function addBarMarkers(file) {
            const waveformContainer = document.getElementById('waveform');
            if (!waveformContainer) return;

            // Don't add markers if disabled or no data
            if (!markersEnabled || !file.beatmap || !wavesurfer) {
                // Clear any existing markers if disabled
                const existingContainer = waveformContainer.querySelector('.marker-container');
                if (existingContainer) existingContainer.remove();
                currentMarkers = [];
                return;
            }

            // Get the duration to calculate marker positions
            const duration = wavesurfer.getDuration();
            if (!duration) return;

            // Get or create marker container
            let markerContainer = waveformContainer.querySelector('.marker-container');
            if (!markerContainer) {
                markerContainer = document.createElement('div');
                markerContainer.className = 'marker-container';
                waveformContainer.appendChild(markerContainer);
            }

            // Clear existing markers
            const existingMarkers = markerContainer.querySelectorAll('.bar-marker, .beat-marker');
            existingMarkers.forEach(marker => marker.remove());
            currentMarkers = [];

            // Marker container fills the full width
            markerContainer.style.width = '100%';

            // STEP 0: Force the first beat to always be bar 1, beat 1
            // This fixes issues where Music.ai thinks the first onset is beat 3
            // (because it detected the bar started earlier in silence)
            const normalizedBeatmap = file.beatmap.map((beat, index) => {
                if (index === 0) {
                    // First beat is ALWAYS bar 1, beat 1
                    return { ...beat, beatNum: 1, originalIndex: index };
                }
                return { ...beat, originalIndex: index };
            });

            // Split barStartOffset into integer bars and fractional beats
            const barOffset = Math.floor(barStartOffset); // Integer bars
            const fractionalBeats = Math.round((barStartOffset - barOffset) * 4); // Fractional beats (0-3)

            // STEP 1: Calculate original bar numbers first
            let barNumber = 0;
            const beatmapWithOriginalBars = normalizedBeatmap.map(beat => {
                if (beat.beatNum === 1) barNumber++;
                return { ...beat, originalBarNumber: barNumber };
            });

            // STEP 2: Rotate beatNum values for fractional beat shifts
            const beatmapWithRotatedBeats = beatmapWithOriginalBars.map(beat => {
                if (fractionalBeats === 0) {
                    // No beat rotation needed
                    return { ...beat };
                } else {
                    // Rotate beatNum
                    let newBeatNum = beat.beatNum - fractionalBeats;
                    while (newBeatNum < 1) newBeatNum += 4;
                    while (newBeatNum > 4) newBeatNum -= 4;
                    return { ...beat, beatNum: newBeatNum };
                }
            });

            // STEP 3: Recalculate bar numbers after beat rotation
            barNumber = 0;
            const beatmapWithNewBars = beatmapWithRotatedBeats.map(beat => {
                if (beat.beatNum === 1) barNumber++;
                return { ...beat, barNumber };
            });

            // STEP 4: Shift bar numbers by integer bar offset
            const beatmapWithBars = beatmapWithNewBars.map(beat => {
                return { ...beat, barNumber: beat.barNumber - barOffset };
            });

            // Filter based on frequency
            let filteredBeats = [];
            switch (markerFrequency) {
                case 'bar8':
                    // Bars 1, 9, 17, 25... (every 8 bars starting from 1)
                    filteredBeats = beatmapWithBars.filter(b => b.beatNum === 1 && b.barNumber % 8 === 1);
                    break;
                case 'bar4':
                    // Bars 1, 5, 9, 13... (every 4 bars starting from 1)
                    filteredBeats = beatmapWithBars.filter(b => b.beatNum === 1 && b.barNumber % 4 === 1);
                    break;
                case 'bar2':
                    // Bars 1, 3, 5, 7... (every 2 bars starting from 1)
                    filteredBeats = beatmapWithBars.filter(b => b.beatNum === 1 && b.barNumber % 2 === 1);
                    break;
                case 'bar':
                    filteredBeats = beatmapWithBars.filter(b => b.beatNum === 1);
                    break;
                case 'halfbar':
                    // Bars + halfway through bar (beat 3 in 4/4 time)
                    filteredBeats = beatmapWithBars.filter(b => b.beatNum === 1 || b.beatNum === 3);
                    break;
                case 'beat':
                    filteredBeats = beatmapWithBars;
                    break;
            }

            // Don't automatically add a marker at time 0
            // The beatmap from Music.ai should already have markers at the correct audio onsets
            // If there's silence at the beginning, the first marker should be at the first onset, not time 0

            // Debug: Log first few beats of original beatmap
            console.log(`[BEATMAP DEBUG] First 5 beats from original beatmap:`, file.beatmap.slice(0, 5));

            // Debug: Log first few filtered beats
            console.log(`[BEATMAP DEBUG] First 5 filtered beats after processing:`, filteredBeats.slice(0, 5));

            console.log(`Adding ${filteredBeats.length} markers (frequency: ${markerFrequency}, barOffset: ${barOffset}, beatOffset: ${fractionalBeats}) for ${file.name}`);

            // Add a marker div for each filtered beat
            filteredBeats.forEach((beat) => {
                const marker = document.createElement('div');
                const isBar = beat.beatNum === 1;
                const isEmphasisBar = isBar && (beat.barNumber % 4 === 1); // Bars 1, 5, 9, 13...

                // Different styles for emphasis bars, regular bars, and beats
                if (isEmphasisBar) {
                    // Every 4th bar: bright red
                    marker.className = 'bar-marker';
                    marker.title = `Bar ${beat.barNumber} - Beatmap[${beat.originalIndex}] - Click to snap`;
                } else if (isBar) {
                    // Regular bars (2, 3, 4, 6, 7, 8...): orange like beats
                    marker.className = 'beat-marker';
                    marker.title = `Bar ${beat.barNumber} - Beatmap[${beat.originalIndex}] - Click to snap`;
                } else {
                    // Actual beats: orange
                    marker.className = 'beat-marker';
                    marker.title = `Beat ${beat.beatNum} - Beatmap[${beat.originalIndex}]`;
                }

                // Calculate position as percentage of duration
                const position = (beat.time / duration) * 100;
                marker.style.left = `${position}%`;

                // Add bar number label at bottom for bars (beatNum === 1)
                if (isBar) {
                    const barLabel = document.createElement('span');
                    barLabel.textContent = beat.barNumber;
                    barLabel.style.cssText = `
                        position: absolute;
                        left: 2px;
                        bottom: 0;
                        font-size: 9px;
                        color: ${isEmphasisBar ? '#ff4444' : '#ff9944'};
                        font-weight: bold;
                        pointer-events: none;
                        user-select: none;
                        text-shadow: 0 0 2px rgba(0,0,0,0.8);
                    `;
                    marker.appendChild(barLabel);
                }

                // Add beatmap index label at top for all markers
                const indexLabel = document.createElement('span');
                indexLabel.textContent = beat.originalIndex;
                indexLabel.style.cssText = `
                    position: absolute;
                    left: 2px;
                    top: 0;
                    font-size: 8px;
                    color: #666;
                    font-weight: normal;
                    pointer-events: none;
                    user-select: none;
                    text-shadow: 0 0 2px rgba(0,0,0,0.8);
                `;
                marker.appendChild(indexLabel);

                // Store marker time for click-to-snap
                currentMarkers.push(beat.time);

                markerContainer.appendChild(marker);
            });

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
                const snapTime = findNearestMarkerToLeft(clickTime);

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
                const hoverSnapTime = findNearestMarkerToLeft(mouseTime);

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
            markersEnabled = !markersEnabled;
            console.log(`Bar markers: ${markersEnabled ? 'ON' : 'OFF'}`);

            // Update button state
            const btn = document.getElementById('markersBtn');
            if (btn) {
                if (markersEnabled) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }

            // Re-render markers (or clear them)
            const file = audioFiles.find(f => f.id === currentFileId);
            if (file) {
                addBarMarkers(file);
            }
        }

        // Change marker frequency
        function setMarkerFrequency(freq) {
            markerFrequency = freq;
            console.log(`Marker frequency: ${freq}`);

            // Re-render current file
            const file = audioFiles.find(f => f.id === currentFileId);
            if (file) {
                addBarMarkers(file);
            }
        }

        // Get shift increment based on marker frequency
        function getShiftIncrement() {
            switch (markerFrequency) {
                case 'bar8': return 8;      // Shift by 8 bars
                case 'bar4': return 4;      // Shift by 4 bars
                case 'bar2': return 2;      // Shift by 2 bars
                case 'bar': return 1;       // Shift by 1 bar
                case 'halfbar': return 0.5; // Shift by half bar (2 beats in 4/4)
                case 'beat': return 0.25;   // Shift by 1 beat (quarter bar in 4/4)
                default: return 1;
            }
        }

        // Shift bar start left (make an earlier marker be bar 1)
        function shiftBarStartLeft() {
            const increment = getShiftIncrement();
            barStartOffset -= increment;
            console.log(`Bar start offset: ${barStartOffset} (shifted by -${increment})`);

            // Update display
            const display = document.getElementById('barStartOffsetDisplay');
            if (display) {
                display.textContent = barStartOffset.toFixed(2).replace(/\.?0+$/, ''); // Remove trailing zeros
            }

            // Re-render markers
            const file = audioFiles.find(f => f.id === currentFileId);
            if (file) {
                addBarMarkers(file);
            }
        }

        // Shift bar start right (make a later marker be bar 1)
        function shiftBarStartRight() {
            const increment = getShiftIncrement();
            barStartOffset += increment;
            console.log(`Bar start offset: ${barStartOffset} (shifted by +${increment})`);

            // Update display
            const display = document.getElementById('barStartOffsetDisplay');
            if (display) {
                display.textContent = barStartOffset.toFixed(2).replace(/\.?0+$/, ''); // Remove trailing zeros
            }

            // Re-render markers
            const file = audioFiles.find(f => f.id === currentFileId);
            if (file) {
                addBarMarkers(file);
            }
        }

        // Find nearest marker to the left of a given time
        function findNearestMarkerToLeft(clickTime) {
            if (currentMarkers.length === 0) return clickTime;

            // Find the largest marker time that is <= clickTime
            let nearestMarker = 0;
            for (let markerTime of currentMarkers) {
                if (markerTime <= clickTime && markerTime > nearestMarker) {
                    nearestMarker = markerTime;
                }
            }

            return nearestMarker;
        }

        // ============================================
        // VERSION 27D: PER-STEM MARKER FUNCTIONS
        // ============================================

        // Toggle markers for a specific stem
        function toggleStemMarkers(stemType) {
            stemMarkersEnabled[stemType] = !stemMarkersEnabled[stemType];
            console.log(`[${stemType}] Bar markers: ${stemMarkersEnabled[stemType] ? 'ON' : 'OFF'}`);

            // Update button state
            const btn = document.getElementById(`stem-markers-btn-${stemType}`);
            if (btn) {
                if (stemMarkersEnabled[stemType]) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }

            // Re-render markers (or clear them)
            const file = audioFiles.find(f => f.id === currentFileId);
            if (file) {
                addStemBarMarkers(stemType, file);
            }
        }

        // Change marker frequency for a specific stem
        function setStemMarkerFrequency(stemType, freq) {
            stemMarkerFrequency[stemType] = freq;
            console.log(`[${stemType}] Marker frequency: ${freq}`);

            // Re-render current file's markers
            const file = audioFiles.find(f => f.id === currentFileId);
            if (file) {
                addStemBarMarkers(stemType, file);
            }
        }

        // Get shift increment based on stem's marker frequency
        function getStemShiftIncrement(stemType) {
            switch (stemMarkerFrequency[stemType]) {
                case 'bar8': return 8;
                case 'bar4': return 4;
                case 'bar2': return 2;
                case 'bar': return 1;
                case 'halfbar': return 0.5;
                case 'beat': return 0.25;
                default: return 1;
            }
        }

        // Shift stem bar start left
        function shiftStemBarStartLeft(stemType) {
            const increment = getStemShiftIncrement(stemType);
            stemBarStartOffset[stemType] -= increment;
            console.log(`[${stemType}] Bar start offset: ${stemBarStartOffset[stemType]} (shifted by -${increment})`);

            // Update display
            const display = document.getElementById(`stem-bar-offset-${stemType}`);
            if (display) {
                display.textContent = stemBarStartOffset[stemType].toFixed(2).replace(/\.?0+$/, '');
            }

            // Re-render markers
            const file = audioFiles.find(f => f.id === currentFileId);
            if (file) {
                addStemBarMarkers(stemType, file);
            }
        }

        // Shift stem bar start right
        function shiftStemBarStartRight(stemType) {
            const increment = getStemShiftIncrement(stemType);
            stemBarStartOffset[stemType] += increment;
            console.log(`[${stemType}] Bar start offset: ${stemBarStartOffset[stemType]} (shifted by +${increment})`);

            // Update display
            const display = document.getElementById(`stem-bar-offset-${stemType}`);
            if (display) {
                display.textContent = stemBarStartOffset[stemType].toFixed(2).replace(/\.?0+$/, '');
            }

            // Re-render markers
            const file = audioFiles.find(f => f.id === currentFileId);
            if (file) {
                addStemBarMarkers(stemType, file);
            }
        }

        // Add bar markers to stem waveform (adapted from parent addBarMarkers)
        function addStemBarMarkers(stemType, file) {
            const ws = stemPlayerWavesurfers[stemType];
            if (!ws) return;

            const waveformContainer = document.getElementById(`multi-stem-waveform-${stemType}`);
            if (!waveformContainer) return;

            // Don't add markers if disabled or no data
            if (!stemMarkersEnabled[stemType] || !file.beatmap) {
                // Clear any existing markers if disabled
                const existingContainer = waveformContainer.querySelector('.marker-container');
                if (existingContainer) existingContainer.remove();
                stemCurrentMarkers[stemType] = [];
                return;
            }

            // Get the duration to calculate marker positions
            const duration = ws.getDuration();
            if (!duration) return;

            // Get or create marker container
            let markerContainer = waveformContainer.querySelector('.marker-container');
            if (!markerContainer) {
                markerContainer = document.createElement('div');
                markerContainer.className = 'marker-container';
                waveformContainer.appendChild(markerContainer);
            }

            // Clear existing markers
            const existingMarkers = markerContainer.querySelectorAll('.bar-marker, .beat-marker');
            existingMarkers.forEach(marker => marker.remove());
            stemCurrentMarkers[stemType] = [];

            // Marker container fills the full width
            markerContainer.style.width = '100%';

            // Normalize beatmap (force first beat to be bar 1, beat 1)
            const normalizedBeatmap = file.beatmap.map((beat, index) => {
                if (index === 0) {
                    return { ...beat, beatNum: 1, originalIndex: index };
                }
                return { ...beat, originalIndex: index };
            });

            // Split stemBarStartOffset into integer bars and fractional beats
            const barOffset = Math.floor(stemBarStartOffset[stemType]);
            const fractionalBeats = Math.round((stemBarStartOffset[stemType] - barOffset) * 4);

            // Calculate original bar numbers
            let barNumber = 0;
            const beatmapWithOriginalBars = normalizedBeatmap.map(beat => {
                if (beat.beatNum === 1) barNumber++;
                return { ...beat, originalBarNumber: barNumber };
            });

            // Rotate beatNum values for fractional beat shifts
            const beatmapWithRotatedBeats = beatmapWithOriginalBars.map(beat => {
                if (fractionalBeats === 0) {
                    return { ...beat };
                } else {
                    let newBeatNum = beat.beatNum - fractionalBeats;
                    while (newBeatNum < 1) newBeatNum += 4;
                    while (newBeatNum > 4) newBeatNum -= 4;
                    return { ...beat, beatNum: newBeatNum };
                }
            });

            // Recalculate bar numbers after beat rotation
            barNumber = 0;
            const beatmapWithNewBars = beatmapWithRotatedBeats.map(beat => {
                if (beat.beatNum === 1) barNumber++;
                return { ...beat, barNumber };
            });

            // Shift bar numbers by integer bar offset
            const beatmapWithBars = beatmapWithNewBars.map(beat => {
                return { ...beat, barNumber: beat.barNumber - barOffset };
            });

            // Filter based on frequency
            let filteredBeats = [];
            switch (stemMarkerFrequency[stemType]) {
                case 'bar8':
                    filteredBeats = beatmapWithBars.filter(b => b.beatNum === 1 && b.barNumber % 8 === 1);
                    break;
                case 'bar4':
                    filteredBeats = beatmapWithBars.filter(b => b.beatNum === 1 && b.barNumber % 4 === 1);
                    break;
                case 'bar2':
                    filteredBeats = beatmapWithBars.filter(b => b.beatNum === 1 && b.barNumber % 2 === 1);
                    break;
                case 'bar':
                    filteredBeats = beatmapWithBars.filter(b => b.beatNum === 1);
                    break;
                case 'halfbar':
                    filteredBeats = beatmapWithBars.filter(b => b.beatNum === 1 || b.beatNum === 3);
                    break;
                case 'beat':
                    filteredBeats = beatmapWithBars;
                    break;
            }

            console.log(`[${stemType}] Adding ${filteredBeats.length} markers (frequency: ${stemMarkerFrequency[stemType]}, barOffset: ${barOffset}, beatOffset: ${fractionalBeats})`);

            // Add a marker div for each filtered beat
            filteredBeats.forEach((beat) => {
                const marker = document.createElement('div');
                const isBar = beat.beatNum === 1;
                const isEmphasisBar = isBar && (beat.barNumber % 4 === 1);

                if (isEmphasisBar) {
                    marker.className = 'bar-marker';
                    marker.title = `Bar ${beat.barNumber}`;
                } else if (isBar) {
                    marker.className = 'beat-marker';
                    marker.title = `Bar ${beat.barNumber}`;
                } else {
                    marker.className = 'beat-marker';
                    marker.title = `Beat ${beat.beatNum}`;
                }

                // Calculate position as percentage of duration
                const position = (beat.time / duration) * 100;
                marker.style.left = `${position}%`;

                // Add bar number label at bottom for bars (beatNum === 1)
                if (isBar) {
                    const barLabel = document.createElement('span');
                    barLabel.textContent = beat.barNumber;
                    barLabel.style.cssText = `
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        transform: translateX(-50%);
                        font-size: 9px;
                        color: rgba(255, 255, 255, 0.5);
                        pointer-events: none;
                        white-space: nowrap;
                    `;
                    marker.appendChild(barLabel);
                }

                markerContainer.appendChild(marker);

                // Store marker time for snap-to-marker functionality
                stemCurrentMarkers[stemType].push(beat.time);
            });
        }

        // Find nearest marker to the left for stem
        function findStemNearestMarkerToLeft(stemType, clickTime) {
            if (stemCurrentMarkers[stemType].length === 0) return clickTime;

            let nearestMarker = 0;
            for (let markerTime of stemCurrentMarkers[stemType]) {
                if (markerTime <= clickTime && markerTime > nearestMarker) {
                    nearestMarker = markerTime;
                }
            }

            return nearestMarker;
        }

        // ============================================
        // END PER-STEM MARKER FUNCTIONS
        // ============================================

        // Toggle Cycle Mode (combined edit + active loop)
        function toggleCycleMode() {
            cycleMode = !cycleMode;

            if (cycleMode) {
                // Entering cycle mode - can edit loop AND loop is active
                // Do NOT reset loop markers - they stay where they were
                nextClickSets = 'start';
                console.log('CYCLE MODE ON - click to set loop start/end, loop will play');
            } else {
                // Exiting cycle mode - editing disabled AND loop disabled
                console.log('CYCLE MODE OFF - loop disabled');
            }

            updateLoopVisuals();
        }

        function toggleSeekOnClick() {
            // Cycle through: off → seek → clock → off
            if (seekOnClick === 'off') {
                seekOnClick = 'seek';
            } else if (seekOnClick === 'seek') {
                seekOnClick = 'clock';
            } else {
                seekOnClick = 'off';
            }
            console.log(`Seek mode: ${seekOnClick.toUpperCase()}`);
            updateLoopVisuals();
        }

        function resetLoop() {
            loopStart = null;
            loopEnd = null;
            cycleMode = false;
            nextClickSets = 'start';
            updateLoopVisuals();
            console.log('Loop cleared');
        }

        function clearLoopKeepCycle() {
            loopStart = null;
            loopEnd = null;
            nextClickSets = 'start';
            // Keep cycleMode = true so user can immediately set new loop
            updateLoopVisuals();
            console.log('Loop cleared (cycle mode still ON - click to set new loop)');
        }

        function updateLoopVisuals() {
            const cycleBtn = document.getElementById('cycleBtn');
            const seekOnClickBtn = document.getElementById('seekOnClickBtn');
            const loopStatus = document.getElementById('loopStatus');
            const expandLoopBtn = document.getElementById('expandLoopBtn');
            const loopControlsContainer = document.getElementById('loopControlsContainer');
            const jumpBtn = document.getElementById('jumpBtn');

            // Update button state based on cycle mode
            if (cycleMode) {
                cycleBtn.classList.add('active');
            } else {
                cycleBtn.classList.remove('active');
            }

            // Show/hide seek on click button (only in cycle mode)
            if (seekOnClickBtn) {
                seekOnClickBtn.style.display = cycleMode ? 'inline-block' : 'none';

                // Update button text and state based on mode
                const buttonText = seekOnClick === 'off' ? 'SEEK' : seekOnClick.toUpperCase();
                seekOnClickBtn.querySelector('span').textContent = buttonText;

                // Active state when not off
                if (seekOnClick !== 'off') {
                    seekOnClickBtn.classList.add('active');
                } else {
                    seekOnClickBtn.classList.remove('active');
                }
            }

            // Show/hide clear loop button (only in cycle mode)
            const clearLoopBtn = document.getElementById('clearLoopBtn');
            if (clearLoopBtn) {
                clearLoopBtn.style.display = cycleMode ? 'inline-block' : 'none';
            }

            // Update status text
            const hasLoop = loopStart !== null && loopEnd !== null;
            if (!cycleMode && !hasLoop) {
                loopStatus.textContent = 'Off';
                loopStatus.style.color = '#666';
            } else if (cycleMode && loopStart === null) {
                loopStatus.textContent = 'Click start';
                loopStatus.style.color = '#f59e0b';
            } else if (cycleMode && loopEnd === null) {
                loopStatus.textContent = 'Click end →';
                loopStatus.style.color = '#f59e0b';
            } else if (hasLoop) {
                const duration = loopEnd - loopStart;
                let statusText = `${duration.toFixed(1)}s`;

                // Add bar/beat count if file has beatmap data
                const currentFile = audioFiles.find(f => f.id === currentFileId);
                if (currentFile && currentFile.beatmap && currentFile.beatmap.length > 0) {
                    // Calculate number of beats in loop
                    const beatsInLoop = currentFile.beatmap.filter(beat =>
                        beat.time >= loopStart && beat.time < loopEnd
                    ).length;

                    // Calculate bars (assuming 4 beats per bar)
                    const bars = Math.floor(beatsInLoop / 4);
                    const remainingBeats = beatsInLoop % 4;

                    if (bars > 0 && remainingBeats === 0) {
                        // Exact bar count
                        statusText += ` (${bars} ${bars === 1 ? 'Bar' : 'Bars'})`;
                    } else if (bars > 0) {
                        // Bars + beats
                        statusText += ` (${bars} ${bars === 1 ? 'Bar' : 'Bars'}, ${remainingBeats} ${remainingBeats === 1 ? 'Beat' : 'Beats'})`;
                    } else if (beatsInLoop > 0) {
                        // Just beats
                        statusText += ` (${beatsInLoop} ${beatsInLoop === 1 ? 'Beat' : 'Beats'})`;
                    }
                }

                loopStatus.textContent = statusText;
                loopStatus.style.color = '#10b981';
            }

            // Show/hide expand button and loop controls based on loop state
            const showExpandBtn = cycleMode && loopStart !== null && loopEnd !== null;
            if (expandLoopBtn) {
                expandLoopBtn.style.display = showExpandBtn ? 'inline-block' : 'none';
                expandLoopBtn.querySelector('span').textContent = loopControlsExpanded ? '▲' : '▼';
            }

            // Show/hide loop controls container
            if (loopControlsContainer) {
                loopControlsContainer.style.display = (showExpandBtn && loopControlsExpanded) ? 'flex' : 'none';
            }

            // Update jump button state and text
            if (jumpBtn) {
                const buttonText = immediateJump === 'off' ? 'JMP' : immediateJump.toUpperCase();
                jumpBtn.querySelector('span').textContent = buttonText;

                if (immediateJump !== 'off') {
                    jumpBtn.classList.add('active');
                } else {
                    jumpBtn.classList.remove('active');
                }
            }

            // Update fade button state
            const fadeBtn = document.getElementById('fadeBtn');
            if (fadeBtn) {
                if (loopFadesEnabled) {
                    fadeBtn.classList.add('active');
                } else {
                    fadeBtn.classList.remove('active');
                }
            }

            // Update preserve loop button state
            const preserveLoopBtn = document.getElementById('preserveLoopBtn');
            if (preserveLoopBtn) {
                if (preserveLoopOnFileChange) {
                    preserveLoopBtn.classList.add('active');
                } else {
                    preserveLoopBtn.classList.remove('active');
                }
            }

            // Update BPM lock button state
            const bpmLockBtn = document.getElementById('bpmLockBtn');
            if (bpmLockBtn) {
                if (bpmLockEnabled) {
                    bpmLockBtn.classList.add('active');
                } else {
                    bpmLockBtn.classList.remove('active');
                }
            }

            // Update record actions button state
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

            // Update play actions button state
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

            // Update visual loop region
            updateLoopRegion();
        }

        function toggleLoopControlsExpanded() {
            loopControlsExpanded = !loopControlsExpanded;
            console.log(`Loop controls ${loopControlsExpanded ? 'expanded' : 'collapsed'}`);
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
            // Cycle through: off → on → clock → off
            if (immediateJump === 'off') {
                immediateJump = 'on';
            } else if (immediateJump === 'on') {
                immediateJump = 'clock';
            } else {
                immediateJump = 'off';
            }
            console.log(`Jump mode: ${immediateJump.toUpperCase()}`);
            updateLoopVisuals();
        }

        function toggleLoopFades() {
            loopFadesEnabled = !loopFadesEnabled;
            console.log(`Loop fades: ${loopFadesEnabled ? 'ON' : 'OFF'}`);
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
            preserveLoopOnFileChange = !preserveLoopOnFileChange;
            console.log(`Preserve loop on file change: ${preserveLoopOnFileChange ? 'ON' : 'OFF'}`);
            updateLoopVisuals();
        }

        function toggleBPMLock() {
            bpmLockEnabled = !bpmLockEnabled;

            if (bpmLockEnabled) {
                // When enabling, lock to current file's BPM
                const currentFile = audioFiles.find(f => f.id === currentFileId);
                if (currentFile && currentFile.bpm) {
                    lockedBPM = currentFile.bpm;
                    console.log(`[BPM LOCK] Enabled - locked to ${lockedBPM} BPM`);
                } else {
                    console.log('[BPM LOCK] Enabled but no BPM data for current file');
                    lockedBPM = null;
                }
            } else {
                console.log('[BPM LOCK] Disabled');
                lockedBPM = null;
            }

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
            if (!cycleMode || loopStart === null || loopEnd === null) {
                console.log('No active loop to shift');
                return;
            }

            const loopDuration = loopEnd - loopStart;
            const newStart = loopStart - loopDuration;
            const newEnd = loopEnd - loopDuration;

            // Don't allow shifting before 0
            if (newStart < 0) {
                console.log('Cannot shift loop before start of track');
                return;
            }

            loopStart = newStart;
            loopEnd = newEnd;
            console.log(`Loop shifted left: ${loopStart.toFixed(2)}s - ${loopEnd.toFixed(2)}s`);
            recordAction('shiftLoopLeft', { loopStart, loopEnd, loopDuration });

            // Jump to relative position in new loop if immediate jump is enabled
            if (immediateJump === 'on' && wavesurfer) {
                const currentTime = wavesurfer.getCurrentTime();
                const oldLoopStart = loopStart + loopDuration; // Old loop start before shift
                const oldLoopEnd = loopEnd + loopDuration; // Old loop end before shift

                // Calculate position relative to old loop
                let relativePosition = 0;
                if (currentTime >= oldLoopStart && currentTime <= oldLoopEnd) {
                    relativePosition = (currentTime - oldLoopStart) / loopDuration;
                }

                // Apply same relative position to new loop
                const newTime = loopStart + (relativePosition * loopDuration);
                wavesurfer.seekTo(newTime / wavesurfer.getDuration());
                console.log(`Jumped to relative position in new loop: ${newTime.toFixed(2)}s (${(relativePosition * 100).toFixed(1)}% through loop)`);
            } else if (immediateJump === 'clock' && wavesurfer) {
                // Clock mode: schedule jump to loop start on next beat marker
                pendingJumpTarget = loopStart;
                console.log(`Clock mode: will jump to loop start (${loopStart.toFixed(2)}s) on next beat`);
            }

            updateLoopVisuals();
        }

        function shiftLoopRight() {
            if (!cycleMode || loopStart === null || loopEnd === null || !wavesurfer) {
                console.log('No active loop to shift');
                return;
            }

            const loopDuration = loopEnd - loopStart;
            const trackDuration = wavesurfer.getDuration();
            const newStart = loopStart + loopDuration;
            const newEnd = loopEnd + loopDuration;

            // Don't allow shifting past end of track
            if (newEnd > trackDuration) {
                console.log('Cannot shift loop past end of track');
                return;
            }

            loopStart = newStart;
            loopEnd = newEnd;
            console.log(`Loop shifted right: ${loopStart.toFixed(2)}s - ${loopEnd.toFixed(2)}s`);
            recordAction('shiftLoopRight', { loopStart, loopEnd, loopDuration });

            // Jump to relative position in new loop if immediate jump is enabled
            if (immediateJump === 'on' && wavesurfer) {
                const currentTime = wavesurfer.getCurrentTime();
                const oldLoopStart = loopStart - loopDuration; // Old loop start before shift
                const oldLoopEnd = loopEnd - loopDuration; // Old loop end before shift

                // Calculate position relative to old loop
                let relativePosition = 0;
                if (currentTime >= oldLoopStart && currentTime <= oldLoopEnd) {
                    relativePosition = (currentTime - oldLoopStart) / loopDuration;
                }

                // Apply same relative position to new loop
                const newTime = loopStart + (relativePosition * loopDuration);
                wavesurfer.seekTo(newTime / wavesurfer.getDuration());
                console.log(`Jumped to relative position in new loop: ${newTime.toFixed(2)}s (${(relativePosition * 100).toFixed(1)}% through loop)`);
            } else if (immediateJump === 'clock' && wavesurfer) {
                // Clock mode: schedule jump to loop start on next beat marker
                pendingJumpTarget = loopStart;
                console.log(`Clock mode: will jump to loop start (${loopStart.toFixed(2)}s) on next beat`);
            }

            updateLoopVisuals();
        }

        function halfLoopLength() {
            if (!cycleMode || loopStart === null || loopEnd === null) {
                console.log('No active loop to modify');
                return;
            }

            const loopDuration = loopEnd - loopStart;
            const newDuration = loopDuration / 2;

            // Don't allow loops shorter than 0.1 seconds
            if (newDuration < 0.1) {
                console.log('Loop too short to halve');
                return;
            }

            loopEnd = loopStart + newDuration;
            console.log(`Loop halved: ${loopStart.toFixed(2)}s - ${loopEnd.toFixed(2)}s (${newDuration.toFixed(1)}s)`);
            recordAction('halfLoopLength', { loopStart, loopEnd, loopDuration: newDuration });

            // Handle jump based on mode
            if (immediateJump === 'on' && wavesurfer) {
                wavesurfer.seekTo(loopStart / wavesurfer.getDuration());
                console.log(`Jumped to loop start: ${loopStart.toFixed(2)}s`);
            } else if (immediateJump === 'clock' && wavesurfer) {
                pendingJumpTarget = loopStart;
                console.log(`Clock mode: will jump to loop start (${loopStart.toFixed(2)}s) on next beat`);
            }

            updateLoopVisuals();
        }

        function doubleLoopLength() {
            if (!cycleMode || loopStart === null || loopEnd === null || !wavesurfer) {
                console.log('No active loop to modify');
                return;
            }

            const loopDuration = loopEnd - loopStart;
            const newDuration = loopDuration * 2;
            const newEnd = loopStart + newDuration;
            const trackDuration = wavesurfer.getDuration();

            // Don't allow loop to extend past end of track
            if (newEnd > trackDuration) {
                console.log('Cannot double loop - would exceed track duration');
                return;
            }

            loopEnd = newEnd;
            console.log(`Loop doubled: ${loopStart.toFixed(2)}s - ${loopEnd.toFixed(2)}s (${newDuration.toFixed(1)}s)`);
            recordAction('doubleLoopLength', { loopStart, loopEnd, loopDuration: newDuration });

            // Handle jump based on mode
            if (immediateJump === 'on' && wavesurfer) {
                wavesurfer.seekTo(loopStart / wavesurfer.getDuration());
                console.log(`Jumped to loop start: ${loopStart.toFixed(2)}s`);
            } else if (immediateJump === 'clock' && wavesurfer) {
                pendingJumpTarget = loopStart;
                console.log(`Clock mode: will jump to loop start (${loopStart.toFixed(2)}s) on next beat`);
            }

            updateLoopVisuals();
        }

        // Shift+Left Arrow: Move loop START marker to the LEFT (expand loop from left)
        function moveStartLeft() {
            if (!cycleMode || loopStart === null || loopEnd === null || currentMarkers.length === 0) {
                console.log('No active loop or no markers available');
                return;
            }

            // Find the previous marker before current start (search backwards)
            let prevMarker = null;
            for (let i = currentMarkers.length - 1; i >= 0; i--) {
                const markerTime = currentMarkers[i];
                if (markerTime < loopStart) {
                    prevMarker = markerTime;
                    break; // Take first marker before start (searching backwards)
                }
            }

            if (prevMarker === null) {
                console.log('No marker found before loop start');
                return;
            }

            loopStart = prevMarker;
            console.log(`Start marker moved left to ${loopStart.toFixed(2)}s (loop now ${(loopEnd - loopStart).toFixed(1)}s)`);
            recordAction('moveStartLeft', { loopStart, loopEnd, loopDuration: loopEnd - loopStart });

            // Handle jump based on mode
            if (immediateJump === 'on' && wavesurfer) {
                wavesurfer.seekTo(loopStart / wavesurfer.getDuration());
                console.log(`Jumped to new loop start: ${loopStart.toFixed(2)}s`);
            } else if (immediateJump === 'clock' && wavesurfer) {
                pendingJumpTarget = loopStart;
                console.log(`Clock mode: will jump to loop start (${loopStart.toFixed(2)}s) on next beat`);
            }

            updateLoopVisuals();
        }

        // Shift+Up Arrow: Move loop END marker to the RIGHT (expand loop)
        function moveEndRight() {
            if (!cycleMode || loopStart === null || loopEnd === null || currentMarkers.length === 0) {
                console.log('No active loop or no markers available');
                return;
            }

            // Find the next marker after current end
            let nextMarker = null;
            for (const markerTime of currentMarkers) {
                if (markerTime > loopEnd) {
                    nextMarker = markerTime;
                    break; // Take first marker after end
                }
            }

            if (nextMarker === null) {
                console.log('No marker found after loop end');
                return;
            }

            loopEnd = nextMarker;
            console.log(`End marker moved right to ${loopEnd.toFixed(2)}s (loop now ${(loopEnd - loopStart).toFixed(1)}s)`);
            recordAction('moveEndRight', { loopStart, loopEnd, loopDuration: loopEnd - loopStart });

            // Handle jump based on mode
            if (immediateJump === 'on' && wavesurfer) {
                wavesurfer.seekTo(loopStart / wavesurfer.getDuration());
                console.log(`Jumped to new loop start: ${loopStart.toFixed(2)}s`);
            } else if (immediateJump === 'clock' && wavesurfer) {
                pendingJumpTarget = loopStart;
                console.log(`Clock mode: will jump to loop start (${loopStart.toFixed(2)}s) on next beat`);
            }

            updateLoopVisuals();
        }

        // Move start marker right to next marker (shrink loop from left)
        function moveStartRight() {
            if (!cycleMode || loopStart === null || loopEnd === null || currentMarkers.length === 0) {
                console.log('No active loop or no markers available');
                return;
            }

            // Find the next marker after current start
            let nextMarker = null;
            for (const markerTime of currentMarkers) {
                if (markerTime > loopStart && markerTime < loopEnd) {
                    nextMarker = markerTime;
                    break; // Take first marker after start
                }
            }

            if (nextMarker === null) {
                console.log('No marker found between start and end');
                return;
            }

            loopStart = nextMarker;
            console.log(`Start marker moved right to ${loopStart.toFixed(2)}s (loop now ${(loopEnd - loopStart).toFixed(1)}s)`);
            recordAction('moveStartRight', { loopStart, loopEnd, loopDuration: loopEnd - loopStart });

            // Handle jump based on mode
            if (immediateJump === 'on' && wavesurfer) {
                wavesurfer.seekTo(loopStart / wavesurfer.getDuration());
                console.log(`Jumped to new loop start: ${loopStart.toFixed(2)}s`);
            } else if (immediateJump === 'clock' && wavesurfer) {
                pendingJumpTarget = loopStart;
                console.log(`Clock mode: will jump to loop start (${loopStart.toFixed(2)}s) on next beat`);
            }

            updateLoopVisuals();
        }

        // Move end marker left to previous marker (shrink loop from right)
        function moveEndLeft() {
            if (!cycleMode || loopStart === null || loopEnd === null || currentMarkers.length === 0) {
                console.log('No active loop or no markers available');
                return;
            }

            // Find the previous marker before current end (search backwards)
            let prevMarker = null;
            for (let i = currentMarkers.length - 1; i >= 0; i--) {
                const markerTime = currentMarkers[i];
                if (markerTime < loopEnd && markerTime > loopStart) {
                    prevMarker = markerTime;
                    break; // Take first marker before end
                }
            }

            if (prevMarker === null) {
                console.log('No marker found between start and end');
                return;
            }

            loopEnd = prevMarker;
            console.log(`End marker moved left to ${loopEnd.toFixed(2)}s (loop now ${(loopEnd - loopStart).toFixed(1)}s)`);
            recordAction('moveEndLeft', { loopStart, loopEnd, loopDuration: loopEnd - loopStart });

            // Handle jump based on mode
            if (immediateJump === 'on' && wavesurfer) {
                wavesurfer.seekTo(loopStart / wavesurfer.getDuration());
                console.log(`Jumped to new loop start: ${loopStart.toFixed(2)}s`);
            } else if (immediateJump === 'clock' && wavesurfer) {
                pendingJumpTarget = loopStart;
                console.log(`Clock mode: will jump to loop start (${loopStart.toFixed(2)}s) on next beat`);
            }

            updateLoopVisuals();
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
                const filteredFiles = filterFiles();
                const sortedFiles = sortFiles(filteredFiles);
                if (sortedFiles.length > 0) {
                    loadAudio(sortedFiles[0].id, true); // Load and play the top file
                }
                return;
            }

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
            isLooping = !isLooping;
            const loopBtn = document.getElementById('loopBtn');
            const shuffleBtn = document.getElementById('shuffleBtn');

            loopBtn.classList.toggle('active', isLooping);

            // Gray out shuffle button when loop is active (loop overrides shuffle)
            if (isLooping) {
                shuffleBtn.style.opacity = '0.4';
                shuffleBtn.style.cursor = 'not-allowed';
            } else {
                shuffleBtn.style.opacity = '1';
                shuffleBtn.style.cursor = 'pointer';
            }
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
            const filteredFiles = filterFiles();
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
            const filteredFiles = filterFiles();
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

        // Delete file
        async function deleteFile(fileId, event) {
            event.stopPropagation();

            if (!confirm('Are you sure you want to delete this file?')) return;

            try {
                const file = audioFiles.find(f => f.id === fileId);
                if (!file) return;

                // Extract filename from URL
                const urlParts = file.file_url.split('/');
                const fileName = urlParts[urlParts.length - 1];

                // Delete from storage
                const { error: storageError } = await supabase.storage
                    .from('audio-files')
                    .remove([fileName]);

                if (storageError) throw storageError;

                // Delete from database
                const { error: dbError } = await supabase
                    .from('audio_files')
                    .delete()
                    .eq('id', fileId);

                if (dbError) throw dbError;

                // Update UI
                if (currentFileId === fileId) {
                    currentFileId = null;
                    if (wavesurfer) {
                        wavesurfer.destroy();
                        wavesurfer = null;
                    }
                    document.getElementById('playerFilename').textContent = 'No file selected';
                    document.getElementById('playerTime').textContent = '0:00 / 0:00';
                    document.getElementById('playPauseIcon').textContent = '▶';
                }

                // Clean up mini waveform
                if (miniWaveforms[fileId]) {
                    miniWaveforms[fileId].destroy();
                    delete miniWaveforms[fileId];
                }

                // Reload data
                await loadData();
            } catch (error) {
                console.error('Error deleting file:', error);
                alert('Error deleting file. Check console for details.');
            }
        }

        // Batch delete selected files
        async function batchDelete() {
            if (selectedFiles.size === 0) return;

            if (!confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)?`)) return;

            try {
                const filesToDelete = Array.from(selectedFiles);

                for (let fileId of filesToDelete) {
                    const file = audioFiles.find(f => f.id === fileId);
                    if (!file) continue;

                    // Extract filename from URL
                    const urlParts = file.file_url.split('/');
                    const fileName = urlParts[urlParts.length - 1];

                    // Delete from storage
                    await supabase.storage
                        .from('audio-files')
                        .remove([fileName]);

                    // Delete from database
                    await supabase
                        .from('audio_files')
                        .delete()
                        .eq('id', fileId);
                }

                // Clear selection
                selectedFiles.clear();

                // Clear player if current file was deleted
                if (filesToDelete.includes(currentFileId)) {
                    currentFileId = null;
                    if (wavesurfer) {
                        wavesurfer.destroy();
                        wavesurfer = null;
                    }
                    document.getElementById('playerFilename').textContent = 'No file selected';
                    document.getElementById('playerTime').textContent = '0:00 / 0:00';
                    document.getElementById('playPauseIcon').textContent = '▶';
                }

                // Clean up mini waveforms for deleted files
                filesToDelete.forEach(fileId => {
                    if (miniWaveforms[fileId]) {
                        miniWaveforms[fileId].destroy();
                        delete miniWaveforms[fileId];
                    }
                });

                // Reload data
                await loadData();
                alert(`Successfully deleted ${filesToDelete.length} file(s)`);
            } catch (error) {
                console.error('Error batch deleting files:', error);
                alert('Error deleting files. Check console for details.');
            }
        }

        // Modal state
        let modalTags = new Map(); // Map of tag -> count
        let modalTagsToAdd = new Set();
        let modalTagsToRemove = new Set();
        let selectedModalTag = null; // Currently selected tag pill

        // Open edit tags modal
        function batchEditTags() {
            if (selectedFiles.size === 0) return;

            // Reset modal state
            modalTags.clear();
            modalTagsToAdd.clear();
            modalTagsToRemove.clear();
            selectedModalTag = null;

            // Count tags across selected files
            const filesToEdit = Array.from(selectedFiles).map(id => audioFiles.find(f => f.id === id));
            filesToEdit.forEach(file => {
                if (!file) return;
                file.tags.forEach(tag => {
                    modalTags.set(tag, (modalTags.get(tag) || 0) + 1);
                });
            });

            // Populate BPM and Key fields if editing single file
            if (selectedFiles.size === 1) {
                const file = filesToEdit[0];
                document.getElementById('modalBpmInput').value = file.bpm || '';
                document.getElementById('modalKeyInput').value = file.key || '';
            } else {
                // Clear fields for multiple file edit
                document.getElementById('modalBpmInput').value = '';
                document.getElementById('modalKeyInput').value = '';
                document.getElementById('modalBpmInput').placeholder = 'Leave blank to keep existing';
            }

            // Update modal title
            document.getElementById('modalFileCount').textContent = `(${selectedFiles.size} file${selectedFiles.size > 1 ? 's' : ''})`;

            // Reset button text to "Save Changes"
            document.querySelector('.modal-btn-save').textContent = 'Save Changes';

            // Show processing options (edit mode) - reset all to unchecked
            const processingOptions = document.getElementById('processingOptions');
            processingOptions.style.display = 'block';

            // Change title and note for edit mode
            document.getElementById('processingOptionsTitle').textContent = 'Run Processing:';
            document.getElementById('processingNote').innerHTML = '<p style="margin: 0; font-size: 11px; color: #888; line-height: 1.4;"><strong>Note:</strong> Check boxes to run processing on selected file(s). Unchecked items will not be processed.</p>';

            // Reset all checkboxes to unchecked (edit mode defaults)
            document.getElementById('processStems').checked = false;
            document.getElementById('processBpmKey').checked = false;
            document.getElementById('processInstruments').checked = false;
            document.getElementById('processChords').checked = false;
            document.getElementById('processBeatmap').checked = false;
            document.getElementById('processAutoTag').checked = false;
            document.getElementById('processConvertMp3').checked = false;

            // Render tag pills
            renderModalTags();

            // Show modal
            document.getElementById('editTagsModal').classList.add('active');

            // Focus input
            setTimeout(() => document.getElementById('tagInputField').focus(), 100);
        }

        // Batch detect BPM/Key/Instruments using Music.ai
        async function batchDetect() {
            if (selectedFiles.size === 0) return;

            const filesToProcess = Array.from(selectedFiles).map(id => audioFiles.find(f => f.id === id));
            const totalFiles = filesToProcess.length;

            if (!confirm(`Detect BPM, Key, and Instruments for ${totalFiles} file(s)?`)) return;

            // Show progress bar
            showProgressBar(`Detecting: ${filesToProcess[0].name}`, 0, totalFiles);

            for (let i = 0; i < filesToProcess.length; i++) {
                const file = filesToProcess[i];

                // Update progress
                updateProgress(i + 1, totalFiles, `Detecting: ${file.name}`);

                // Start animation (estimate 15 seconds per file)
                startProgressAnimation(15);

                try {
                    // Call Python script
                    const response = await fetch('http://localhost:8000/detect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            audio_file_id: file.id,
                            file_url: file.file_url,
                            filename: file.name
                        })
                    });

                    const result = await response.json();

                    if (result.status === 'complete') {
                        console.log(`✓ Completed: ${file.name}`, result.data);
                        completeProgress();
                    } else if (result.status === 'error') {
                        console.error(`✗ Error: ${file.name}`, result.message);
                        completeProgress();
                    }
                } catch (error) {
                    console.error(`✗ Error: ${file.name}`, error);
                    completeProgress();
                }
            }

            // Final progress
            updateProgress(totalFiles, totalFiles, 'Complete!');
            completeProgress();

            setTimeout(async () => {
                hideProgressBar();
                await loadData(); // Reload to show updated data
            }, 1500);
        }

        // Batch separate stems using Music.ai
        async function batchSeparateStems() {
            if (selectedFiles.size === 0) return;

            const filesToProcess = Array.from(selectedFiles).map(id => audioFiles.find(f => f.id === id));
            const totalFiles = filesToProcess.length;

            if (!confirm(`Separate stems for ${totalFiles} file(s)? This may take several minutes per file.`)) return;

            // Show progress bar
            showProgressBar(`Separating: ${filesToProcess[0].name}`, 0, totalFiles);

            for (let i = 0; i < filesToProcess.length; i++) {
                const file = filesToProcess[i];

                // Update progress
                updateProgress(i + 1, totalFiles, `Separating: ${file.name}`);

                // Start animation (estimate 120 seconds per file for stems)
                startProgressAnimation(120);

                try {
                    // Call Python script (process_stems.py)
                    const response = await fetch('http://localhost:8000/stems', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            audio_file_id: file.id,
                            file_url: file.file_url
                        })
                    });

                    const result = await response.json();

                    if (result.status === 'complete') {
                        console.log(`✓ Completed: ${file.name}`, result.stems);
                        completeProgress();
                    } else if (result.status === 'error') {
                        console.error(`✗ Error: ${file.name}`, result.message);
                        completeProgress();
                    }
                } catch (error) {
                    console.error(`✗ Error: ${file.name}`, error);
                    completeProgress();
                }
            }

            // Final progress
            updateProgress(totalFiles, totalFiles, 'Complete!');
            completeProgress();

            setTimeout(async () => {
                hideProgressBar();
                await loadData(); // Reload to show updated data
            }, 1500);
        }

        // Progress bar functions
        let progressInterval = null;
        let progressStartTime = null;

        function showProgressBar(text, current, total) {
            const bar = document.getElementById('progressBar');
            bar.style.height = '40px';
            bar.style.opacity = '1';
            document.getElementById('progressText').textContent = text;
            document.getElementById('progressCounter').textContent = `${current}/${total}`;
            document.getElementById('progressBarFill').style.width = '0%';
        }

        function hideProgressBar() {
            const bar = document.getElementById('progressBar');
            bar.style.opacity = '0';
            setTimeout(() => {
                bar.style.height = '0';
            }, 300);
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
        }

        function startProgressAnimation(estimatedSeconds) {
            // Animate progress bar over estimated time
            progressStartTime = Date.now();
            const incrementMs = 100; // Update every 100ms
            const totalMs = estimatedSeconds * 1000;

            if (progressInterval) clearInterval(progressInterval);

            progressInterval = setInterval(() => {
                const elapsed = Date.now() - progressStartTime;
                const progress = Math.min((elapsed / totalMs) * 95, 95); // Cap at 95% until actually complete
                document.getElementById('progressBarFill').style.width = progress + '%';

                if (progress >= 95) {
                    clearInterval(progressInterval);
                    progressInterval = null;
                }
            }, incrementMs);
        }

        function completeProgress() {
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            document.getElementById('progressBarFill').style.width = '100%';
        }

        function showProgressModal(title, files) {
            // Not used anymore, kept for compatibility
        }

        function updateProgress(current, total, statusText) {
            document.getElementById('progressText').textContent = statusText;
            document.getElementById('progressCounter').textContent = `${current}/${total}`;
        }

        function updateQueueItem(fileId, status, errorMessage = '') {
            // Not used anymore, kept for compatibility
        }

        function closeProgressModal() {
            // Not used anymore, kept for compatibility
        }

        // Render tag pills in modal
        function renderModalTags() {
            const container = document.getElementById('tagInputContainer');
            const input = document.getElementById('tagInputField');

            // Clear container except input
            container.innerHTML = '';

            // Add existing tags as pills
            Array.from(modalTags.entries())
                .filter(([tag]) => !modalTagsToRemove.has(tag))
                .sort((a, b) => b[1] - a[1]) // Sort by count descending
                .forEach(([tag, count]) => {
                    const pill = document.createElement('div');
                    pill.className = 'tag-pill-editable';
                    if (selectedModalTag === tag) {
                        pill.classList.add('selected');
                    }
                    pill.innerHTML = `
                        ${tag} <span class="count">${count}</span>
                    `;
                    pill.onclick = () => selectModalTag(tag);
                    container.appendChild(pill);
                });

            // Add tags to add
            modalTagsToAdd.forEach(tag => {
                const pill = document.createElement('div');
                pill.className = 'tag-pill-editable';
                if (selectedModalTag === tag) {
                    pill.classList.add('selected');
                } else {
                    pill.style.borderColor = '#10b981';
                    pill.style.background = 'rgba(16, 185, 129, 0.2)';
                }
                pill.innerHTML = `${tag} <span class="count">+</span>`;
                pill.onclick = () => selectModalTag(tag);
                container.appendChild(pill);
            });

            // Re-add input field
            container.appendChild(input);
        }

        // Select tag pill
        function selectModalTag(tag) {
            if (selectedModalTag === tag) {
                selectedModalTag = null; // Deselect if clicking same tag
            } else {
                selectedModalTag = tag;
            }
            renderModalTags();
        }

        // Remove selected tag
        function removeSelectedModalTag() {
            if (selectedModalTag) {
                if (modalTags.has(selectedModalTag)) {
                    modalTagsToRemove.add(selectedModalTag);
                } else if (modalTagsToAdd.has(selectedModalTag)) {
                    modalTagsToAdd.delete(selectedModalTag);
                }
                selectedModalTag = null;
                renderModalTags();
            }
        }

        // Close modal
        function closeEditTagsModal() {
            document.getElementById('editTagsModal').classList.remove('active');
            document.getElementById('tagInputField').value = '';
            document.getElementById('tagSuggestions').style.display = 'none';

            // Clear BPM and Key inputs
            document.getElementById('modalBpmInput').value = '';
            document.getElementById('modalKeyInput').value = '';
            document.getElementById('modalBpmInput').placeholder = 'e.g., 120 or 97.833';

            // Clear pending upload files if user cancels
            pendingUploadFiles = [];

            // Reset button text
            document.querySelector('.modal-btn-save').textContent = 'Save Changes';

            // Clear main search bar and filters
            searchQuery = '';
            document.getElementById('searchBar').value = '';
            filters.canHave.clear();
            filters.mustHave.clear();
            filters.exclude.clear();

            // Re-render to show cleared state
            renderTags();
            renderFiles();
        }

        // Handle tag input
        document.addEventListener('DOMContentLoaded', () => {
            const tagInput = document.getElementById('tagInputField');
            const suggestionsContainer = document.getElementById('tagSuggestions');
            const modal = document.getElementById('editTagsModal');

            tagInput.addEventListener('input', (e) => {
                const value = e.target.value.trim().toLowerCase();

                if (value.length === 0) {
                    suggestionsContainer.style.display = 'none';
                    return;
                }

                // Get all available tags
                const allTags = getAllTags();
                const suggestions = allTags
                    .map(({ tag }) => tag)
                    .filter(tag => {
                        return tag.includes(value) &&
                               !modalTags.has(tag) &&
                               !modalTagsToAdd.has(tag) &&
                               !modalTagsToRemove.has(tag);
                    })
                    .slice(0, 10);

                if (suggestions.length > 0) {
                    suggestionsContainer.innerHTML = suggestions
                        .map(tag => `<div class="tag-suggestion-item" onclick="addModalTag('${tag}')">${tag}</div>`)
                        .join('');
                    suggestionsContainer.style.display = 'block';
                } else {
                    suggestionsContainer.style.display = 'none';
                }
            });

            tagInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && tagInput.value.trim()) {
                    e.preventDefault();
                    addModalTag(tagInput.value.trim());
                } else if ((e.key === 'Backspace' || e.key === 'Delete') && tagInput.value === '') {
                    e.preventDefault();
                    if (selectedModalTag) {
                        // Delete selected tag
                        removeSelectedModalTag();
                    } else if (e.key === 'Backspace') {
                        // Backspace with no selection - select last tag
                        const allTags = Array.from(modalTags.keys()).filter(tag => !modalTagsToRemove.has(tag));
                        const newTags = Array.from(modalTagsToAdd);
                        const lastTag = newTags.length > 0 ? newTags[newTags.length - 1] : allTags[allTags.length - 1];
                        if (lastTag) {
                            selectedModalTag = lastTag;
                            renderModalTags();
                        }
                    }
                }
            });

            // Global keyboard handler for modal (when input is not focused)
            document.addEventListener('keydown', (e) => {
                // Only handle if modal is open and input is not focused
                if (!modal.classList.contains('active') || document.activeElement === tagInput) return;

                if (e.key === 'Backspace' || e.key === 'Delete') {
                    e.preventDefault();
                    if (selectedModalTag) {
                        removeSelectedModalTag();
                    } else if (e.key === 'Backspace') {
                        // Select last tag
                        const allTags = Array.from(modalTags.keys()).filter(tag => !modalTagsToRemove.has(tag));
                        const newTags = Array.from(modalTagsToAdd);
                        const lastTag = newTags.length > 0 ? newTags[newTags.length - 1] : allTags[allTags.length - 1];
                        if (lastTag) {
                            selectedModalTag = lastTag;
                            renderModalTags();
                        }
                    }
                } else if (e.key === 'Escape') {
                    closeEditTagsModal();
                }
            });

            // Close suggestions when clicking outside
            document.addEventListener('click', (e) => {
                if (!suggestionsContainer.contains(e.target) && e.target !== tagInput) {
                    suggestionsContainer.style.display = 'none';
                }
            });
        });

        // Add tag to modal
        function addModalTag(tag) {
            if (!tag) return;

            // Check if tag already exists (case-insensitive)
            const tagLower = tag.toLowerCase();
            const existingInModal = Array.from(modalTags.keys()).find(t => t.toLowerCase() === tagLower);
            const existingInToAdd = Array.from(modalTagsToAdd).find(t => t.toLowerCase() === tagLower);
            const existingInToRemove = Array.from(modalTagsToRemove).find(t => t.toLowerCase() === tagLower);

            // If it's in the remove set, take it out (user is re-adding it)
            if (existingInToRemove) {
                modalTagsToRemove.delete(existingInToRemove);
                renderModalTags();
                document.getElementById('tagInputField').value = '';
                document.getElementById('tagSuggestions').style.display = 'none';
                return;
            }

            // Don't add if it already exists and isn't being removed
            if (existingInModal || existingInToAdd) {
                return;
            }

            // Add the new tag
            modalTagsToAdd.add(tag);
            renderModalTags();
            document.getElementById('tagInputField').value = '';
            document.getElementById('tagSuggestions').style.display = 'none';
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts if user is typing in an input field or modal is open
            const modal = document.getElementById('editTagsModal');
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || modal.classList.contains('active')) {
                return;
            }

            // Don't trigger shortcuts if modifier keys are held (allow browser shortcuts like Cmd+R)
            if (e.metaKey || e.ctrlKey || e.altKey) {
                return;
            }

            // If recording is waiting for first keypress, start recording now
            if (recordingWaitingForStart && wavesurfer) {
                recordingWaitingForStart = false;
                isRecordingActions = true;
                recordingStartTime = wavesurfer.getCurrentTime();

                // Capture playing state immediately
                const isCurrentlyPlaying = wavesurfer.isPlaying();
                console.log(`[RECORD] Capturing initial state - wavesurfer.isPlaying() = ${isCurrentlyPlaying}`);

                // Record initial state
                const initialState = {
                    playbackTime: recordingStartTime,
                    loopStart: loopStart,
                    loopEnd: loopEnd,
                    cycleMode: cycleMode,
                    rate: currentRate,
                    volume: parseInt(document.getElementById('volumeSlider').value),
                    isPlaying: isCurrentlyPlaying,
                    currentFileId: currentFileId,
                    markersEnabled: markersEnabled,
                    metronomeEnabled: Metronome.isMetronomeEnabled(),
                    loopFadesEnabled: loopFadesEnabled,
                    immediateJump: immediateJump,
                    seekOnClick: seekOnClick
                };

                recordedActions.push({
                    time: 0,
                    playbackTime: recordingStartTime,
                    action: 'initialState',
                    data: initialState
                });

                console.log(`[RECORD] Recording started at ${recordingStartTime.toFixed(3)}s`);
                console.log('[RECORD] Initial state captured:', initialState);
                updateLoopVisuals();
            }

            const filteredFiles = filterFiles();
            if (filteredFiles.length === 0) return;

            const currentIndex = filteredFiles.findIndex(f => f.id === currentFileId);

            switch(e.key.toLowerCase()) {
                case 'arrowleft':
                    e.preventDefault();
                    if (e.shiftKey && cycleMode && loopStart !== null && loopEnd !== null) {
                        // Shift+Left: Move START marker left (expand from left)
                        moveStartLeft();
                    } else if (cycleMode && loopStart !== null && loopEnd !== null) {
                        // In cycle mode with full loop: Left arrow = shift loop left
                        shiftLoopLeft();
                    } else {
                        // Left: Previous track
                        previousTrack();
                    }
                    break;

                case 'arrowright':
                    e.preventDefault();
                    if (e.shiftKey && cycleMode && loopStart !== null && loopEnd !== null) {
                        // Shift+Right: Move START marker right (shrink from left)
                        moveStartRight();
                    } else if (cycleMode && loopStart !== null && loopEnd !== null) {
                        // In cycle mode with full loop: Right arrow = shift loop right
                        shiftLoopRight();
                    } else {
                        // Right: Next track
                        nextTrack();
                    }
                    break;

                case 'arrowup':
                    e.preventDefault();
                    if (e.shiftKey && cycleMode && loopStart !== null && loopEnd !== null) {
                        // Shift+Up: Move END marker right (expand loop)
                        moveEndRight();
                    } else if (cycleMode) {
                        // In edit loop mode: Up arrow = double loop length
                        doubleLoopLength();
                    } else {
                        // Up: Play previous file (respect pause state)
                        if (currentIndex > 0) {
                            loadAudio(filteredFiles[currentIndex - 1].id, !userPaused);
                        } else {
                            // Wrap to last file
                            loadAudio(filteredFiles[filteredFiles.length - 1].id, !userPaused);
                        }
                    }
                    break;

                case 'arrowdown':
                    e.preventDefault();
                    if (e.shiftKey && cycleMode && loopStart !== null && loopEnd !== null) {
                        // Shift+Down: Move END marker left (shrink loop)
                        moveEndLeft();
                    } else if (cycleMode) {
                        // In edit loop mode: Down arrow = half loop length
                        halfLoopLength();
                    } else {
                        // Down: Play next file (respect pause state)
                        if (currentIndex < filteredFiles.length - 1) {
                            loadAudio(filteredFiles[currentIndex + 1].id, !userPaused);
                        } else {
                            // Wrap to first file
                            loadAudio(filteredFiles[0].id, !userPaused);
                        }
                    }
                    break;

                case ' ':
                case 'spacebar':
                    e.preventDefault();
                    // Play/pause
                    playPause();
                    break;

                case 'm':
                    e.preventDefault();
                    // Toggle bar markers
                    toggleMarkers();
                    break;

                case 'k':
                    e.preventDefault();
                    // Toggle metronome
                    Metronome.toggleMetronome(wavesurfer);
                    break;

                case 'enter':
                    e.preventDefault();
                    // Open edit tags for current file
                    if (currentFileId) {
                        selectedFiles.clear();
                        selectedFiles.add(currentFileId);

                        // Update checkboxes
                        document.querySelectorAll('.file-item input[type="checkbox"]').forEach(cb => {
                            cb.checked = false;
                        });
                        const checkbox = document.getElementById(`checkbox-${currentFileId}`);
                        if (checkbox) checkbox.checked = true;

                        batchEditTags();
                    }
                    break;

                case 'c':
                    e.preventDefault();
                    // C: Toggle cycle mode (edit + play loop)
                    toggleCycleMode();
                    break;

                case 'f':
                    e.preventDefault();
                    // F: Focus search field
                    document.getElementById('searchBar').focus();
                    break;

                case '-':
                case '_':
                    e.preventDefault();
                    // Minus key: Decrease volume by 10%
                    {
                        const volumeSlider = document.getElementById('volumeSlider');
                        const currentVolume = parseInt(volumeSlider.value);
                        const newVolume = Math.max(0, currentVolume - 10);
                        volumeSlider.value = newVolume;
                        setVolume(newVolume);
                    }
                    break;

                case '=':
                case '+':
                    e.preventDefault();
                    // Equals/Plus key: Increase volume by 10%
                    {
                        const volumeSlider = document.getElementById('volumeSlider');
                        const currentVolume = parseInt(volumeSlider.value);
                        const newVolume = Math.min(398, currentVolume + 10);
                        volumeSlider.value = newVolume;
                        setVolume(newVolume);
                    }
                    break;

                case 'l':
                    e.preventDefault();
                    if (e.shiftKey) {
                        // Shift+L: Clear/reset loop
                        resetLoop();
                    } else {
                        // L: Toggle loop
                        toggleLoop();
                    }
                    break;

                case 'r':
                    e.preventDefault();
                    // R: Toggle shuffle
                    toggleShuffle();
                    break;

                case 'j':
                    e.preventDefault();
                    // Toggle immediate jump on shift
                    toggleImmediateJump();
                    break;

                case ',':
                case '<':
                    e.preventDefault();
                    // Comma: Previous track
                    previousTrack();
                    break;

                case '.':
                case '>':
                    e.preventDefault();
                    // Period: Next track
                    nextTrack();
                    break;

                case 's':
                    e.preventDefault();
                    // Toggle shuffle
                    toggleShuffle();
                    break;

                case 'h':
                    e.preventDefault();
                    // Half loop length
                    halfLoopLength();
                    break;

                case 'd':
                    e.preventDefault();
                    // Double loop length
                    doubleLoopLength();
                    break;
            }
        });

        // Initialize on load
        loadData();

        // Initialize view tab click handlers
        ViewManager.initViewTabs();

// Expose functions to global scope for HTML onclick handlers
window.handleFileClick = handleFileClick;
window.handleTagClick = handleTagClick;
window.toggleShowAllTags = toggleShowAllTags;
window.handleBPMClick = handleBPMClick;
window.handleKeyClick = handleKeyClick;
window.handleSort = handleSort;
window.toggleFileSelection = toggleFileSelection;
window.openStemsViewer = openStemsViewer;
window.generateStems = generateStems;
window.quickEditFile = quickEditFile;
window.addModalTag = addModalTag;
window.setTagMode = setTagMode;
window.handleSearch = handleSearch;
window.handleSearchKeydown = handleSearchKeydown;
window.selectAllVisibleTags = selectAllVisibleTags;
window.deselectAllTags = deselectAllTags;
window.openUploadFlow = openUploadFlow;
window.selectAll = selectAll;
window.deselectAll = deselectAll;
window.batchDelete = batchDelete;
window.batchEditTags = batchEditTags;
window.batchDetect = batchDetect;
window.batchSeparateStems = batchSeparateStems;
window.closeEditTagsModal = closeEditTagsModal;
window.saveEditedTags = saveEditedTags;
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
// Store references to old functions before overwriting
        const _oldToggleMarkers = toggleMarkers;
        const _oldSetMarkerFrequency = setMarkerFrequency;
        const _oldShiftBarStartLeft = shiftBarStartLeft;
        const _oldShiftBarStartRight = shiftBarStartRight;

// CRITICAL: Expose setter to sync component markers to global array
        // This allows waveform click handler (cycle mode) to access marker data
        // TODO: Remove once waveform click handling is moved into component
        window.updateCurrentMarkers = (markers) => {
            currentMarkers = markers;
        };
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
window.toggleStemsViewer = toggleStemsViewer;
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

// TODO: Add more function exports as they are implemented:
// Metronome: toggleStemMetronome, setStemMetronomeSound
// Cycle/Loop: toggleStemSeekOnClick, clearStemLoopKeepCycle, toggleStemLoopControlsExpanded
// Loop manipulation: shiftStemLoopLeft, shiftStemLoopRight, moveStemStartLeft, moveStemEndRight, halfStemLoopLength, doubleStemLoopLength
// Loop modes: toggleStemImmediateJump, toggleStemLoopFades, setStemFadeTime, toggleStemPreserveLoop, toggleStemBPMLock
// Recording: toggleStemRecordActions, playStemRecordedActions
