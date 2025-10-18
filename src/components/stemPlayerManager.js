/**
 * Stem Player Manager Module
 *
 * Manages multi-stem player initialization, lifecycle, and synchronization
 * Architecture: 1 parent player + 4 stem players (vocals, drums, bass, other)
 * Each uses PlayerBarComponent class
 *
 * State Management:
 * - All state lives in app.js (single source of truth)
 * - Functions accept state parameters and callbacks
 * - Returns new state or void (for lifecycle functions)
 *
 * Created: 2025-10-17
 * Part of: Refactoring Phase 4 - Stem Player extraction
 * Extended: 2025-10-18 - Added 5 core lifecycle functions (617 lines)
 */

/**
 * Preload all stem files from database
 * @param {Object} supabase - Supabase client
 * @returns {Object} - allStemFiles organized by parent file ID
 */
export async function preloadAllStems(supabase) {
    try {
        console.log('Preloading all stem files...');
        const { data, error} = await supabase
            .from('audio_files_stems')
            .select('*');

        if (error) throw error;

        // Organize stems by parent file ID
        const allStemFiles = {};
        if (data) {
            data.forEach(stem => {
                if (!allStemFiles[stem.audio_file_id]) {
                    allStemFiles[stem.audio_file_id] = {};
                }
                allStemFiles[stem.audio_file_id][stem.stem_type] = stem;
            });
        }

        console.log(`✅ Preloaded stems for ${Object.keys(allStemFiles).length} files`);
        return allStemFiles;
    } catch (error) {
        console.error('Error preloading stems:', error);
        return {};
    }
}

/**
 * Fetch stem files for a specific parent audio file
 * @param {Object} supabase - Supabase client
 * @param {string} parentFileId - Parent audio file ID
 * @returns {Object} - Stems organized by type {vocals, drums, bass, other}
 */
export async function fetchStemFiles(supabase, parentFileId) {
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

/**
 * Destroy all stem WaveSurfer instances and clean up UI
 * @param {Object} state - { stemWavesurfers, stemPlayerWavesurfers, stemPlayerComponents, wavesurfer }
 * @returns {Object} - New state with cleared instances
 */
export function destroyAllStems(state) {
    // Destroy OLD stem system
    Object.keys(state.stemWavesurfers).forEach(stemType => {
        if (state.stemWavesurfers[stemType]) {
            state.stemWavesurfers[stemType].destroy();
        }
    });

    // Destroy NEW multi-stem player system
    if (Object.keys(state.stemPlayerWavesurfers).length > 0) {
        console.log('Destroying multi-stem player wavesurfers');

        // Clean up event listeners from parent
        if (state.wavesurfer) {
            state.wavesurfer.un('play');
            state.wavesurfer.un('pause');
            state.wavesurfer.un('seeking');
            state.wavesurfer.un('audioprocess');
        }

        // Destroy all stem wavesurfers
        Object.values(state.stemPlayerWavesurfers).forEach(ws => {
            if (ws) {
                ws.destroy();
            }
        });

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

        console.log('✓ Multi-stem player cleaned up');
    }

    console.log('All stem WaveSurfers destroyed');

    return {
        stemWavesurfers: {},
        stemPlayerWavesurfers: {},
        stemPlayerComponents: {},
        stemFiles: {},
        multiStemReadyCount: 0,
        stemsPreloaded: false,
        multiStemPlayerExpanded: false
    };
}

/**
 * Update STEMS button visibility and state
 * @param {Object} state - { allStemFiles, currentFileId, multiStemPlayerExpanded }
 */
export function updateStemsButton(state) {
    const stemsBtn = document.getElementById('stemsBtn');
    if (!stemsBtn) return;

    // Check if current file has stems
    const hasStem = state.allStemFiles[state.currentFileId];

    if (hasStem && Object.keys(hasStem).length > 0) {
        stemsBtn.style.display = 'flex';
        if (state.multiStemPlayerExpanded) {
            stemsBtn.classList.add('active');
        } else {
            stemsBtn.classList.remove('active');
        }
    } else {
        stemsBtn.style.display = 'none';
        stemsBtn.classList.remove('active');
    }
}

/**
 * Create WaveSurfer instance for a single stem (hidden, no container)
 * @param {string} stemType - Type of stem (vocals, drums, bass, other)
 * @param {Object} WaveSurfer - WaveSurfer constructor
 * @returns {Object} - WaveSurfer instance
 */
export function createStemWaveSurfer(stemType, WaveSurfer) {
    // Create a hidden container for this stem
    const containerId = `stem-waveform-${stemType}`;
    let container = document.getElementById(containerId);

    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.display = 'none'; // Hidden for now
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

    // Set initial volume to 1.0
    stemWS.setVolume(1.0);

    console.log(`Created WaveSurfer for ${stemType} stem`);
    return stemWS;
}

/**
 * Sync all stem WaveSurfers with main WaveSurfer
 * Sets up event listeners for play, pause, seeking, and finish
 * @param {Object} state - { wavesurfer, stemWavesurfers }
 * @param {boolean} autoplay - Whether to auto-play after syncing
 */
export function syncStemsWithMain(state, autoplay = true) {
    if (!state.wavesurfer) return;

    // Track whether stems were playing before seek
    let stemsWerePlaying = false;

    // Sync play/pause
    state.wavesurfer.on('play', () => {
        stemsWerePlaying = true;
        Object.keys(state.stemWavesurfers).forEach(stemType => {
            const stemWS = state.stemWavesurfers[stemType];
            if (stemWS && !stemWS.isPlaying()) {
                stemWS.play();
            }
        });
    });

    state.wavesurfer.on('pause', () => {
        stemsWerePlaying = false;
        Object.keys(state.stemWavesurfers).forEach(stemType => {
            const stemWS = state.stemWavesurfers[stemType];
            if (stemWS && stemWS.isPlaying()) {
                stemWS.pause();
            }
        });
    });

    // Sync seeking - convert time to progress ratio
    state.wavesurfer.on('seeking', (currentTime) => {
        const duration = state.wavesurfer.getDuration();
        const progress = duration > 0 ? currentTime / duration : 0;

        Object.keys(state.stemWavesurfers).forEach(stemType => {
            const stemWS = state.stemWavesurfers[stemType];
            if (stemWS) {
                stemWS.seekTo(progress);
            }
        });
    });

    // Sync finish
    state.wavesurfer.on('finish', () => {
        Object.keys(state.stemWavesurfers).forEach(stemType => {
            const stemWS = state.stemWavesurfers[stemType];
            if (stemWS) {
                stemWS.seekTo(0);
            }
        });
    });

    console.log('Stems synced with main WaveSurfer');

    // Auto-play if requested
    if (autoplay) {
        setTimeout(() => {
            state.wavesurfer.play();
        }, 100); // Small delay to ensure everything is ready
    }
}

/**
 * Load stems for a specific parent file (OLD system)
 * @param {string} parentFileId - Parent audio file ID
 * @param {Object} state - { allStemFiles }
 * @param {Object} WaveSurfer - WaveSurfer constructor
 * @param {boolean} autoplay - Whether to autoplay after loading
 * @returns {Promise<Object>} - { success, stemWavesurfers, stemFiles }
 */
export async function loadStems(parentFileId, state, WaveSurfer, autoplay = true) {
    console.log(`Loading stems for file ${parentFileId}...`);

    // Use preloaded stems
    const stems = state.allStemFiles[parentFileId] || {};

    // Check if we have all 4 stems
    const stemTypes = ['vocals', 'drums', 'bass', 'other'];
    const missingStems = stemTypes.filter(type => !stems[type]);

    if (missingStems.length > 0) {
        console.warn(`Missing stems: ${missingStems.join(', ')}`);
        return { success: false };
    }

    // Create WaveSurfer instance for each stem
    const newStemWavesurfers = {};
    stemTypes.forEach(stemType => {
        newStemWavesurfers[stemType] = createStemWaveSurfer(stemType, WaveSurfer);
    });

    // Load audio for each stem
    const loadPromises = stemTypes.map(stemType => {
        return new Promise((resolve) => {
            const stemWS = newStemWavesurfers[stemType];
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

    return { success: true, stemWavesurfers: newStemWavesurfers, stemFiles: stems, autoplay };
}

/**
 * Preload multi-stem wavesurfers (NEW system - Phase 1)
 * Creates UI and WaveSurfer instances for all stems, ready for instant expansion
 * @param {string} fileId - Parent audio file ID
 * @param {Object} dependencies - { supabase, audioFiles, currentRate, WaveSurfer, PlayerBarComponent, Utils, generateStemPlayerBar }
 * @param {Object} state - Current stem state
 * @param {Object} callbacks - { addStemBarMarkers }
 * @returns {Promise<Object>} - New state with initialized stems
 */
export async function preloadMultiStemWavesurfers(fileId, dependencies, state, callbacks) {
    console.log('=== Pre-loading Multi-Stem Wavesurfers (Phase 1) ===');

    const { supabase, audioFiles, currentRate, WaveSurfer, PlayerBarComponent, Utils, generateStemPlayerBar } = dependencies;
    const { addStemBarMarkers } = callbacks;

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
    const stemFiles = {};
    data.forEach(stem => {
        stemFiles[stem.stem_type] = stem;
    });
    console.log('Organized stem files:', Object.keys(stemFiles));

    // Phase 2A: Get parent file BPM and initialize rate controls
    const parentFile = audioFiles.find(f => f.id === fileId);
    const currentParentFileBPM = parentFile ? parentFile.bpm : null;
    console.log(`Parent file BPM: ${currentParentFileBPM}`);

    // Initialize rate control state for each stem
    const stemTypes = ['vocals', 'drums', 'bass', 'other'];
    const stemIndependentRates = {};
    const stemRateLocked = {};
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

    const loadPromises = [];

    for (const stemType of stemTypes) {
        const stemFile = stemFiles[stemType];
        if (!stemFile) {
            console.warn(`Missing ${stemType} stem`);
            continue;
        }

        console.log(`Creating UI and WaveSurfer for ${stemType}`);

        // Use full filename from database
        const fileName = stemFile.stem_file_name || stemType;
        const displayName = fileName;

        // Phase 2A: Calculate initial BPM display
        const initialRate = currentRate || 1.0;
        const initialBPM = currentParentFileBPM ? (currentParentFileBPM * initialRate).toFixed(1) : '---';

        // Generate stem UI HTML using template system
        const stemBarHTML = generateStemPlayerBar(stemType, displayName, initialRate, initialBPM);

        multiStemPlayer.insertAdjacentHTML('beforeend', stemBarHTML);
    }

    // 4. Create WaveSurfer instances for each stem
    const stemPlayerWavesurfers = {};
    const stemPlayerComponents = {};

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

        // Mute by default
        ws.setVolume(0);

        // Store instance
        stemPlayerWavesurfers[stemType] = ws;

        // Create PlayerBarComponent for this stem
        stemPlayerComponents[stemType] = new PlayerBarComponent({
            playerType: 'stem',
            stemType: stemType,
            waveform: ws
        });
        stemPlayerComponents[stemType].init();
        console.log(`[STEM COMPONENTS] Created and initialized PlayerBarComponent for ${stemType} stem`);

        // Set up time display updates and loop checking
        ws.on('audioprocess', () => {
            const currentTime = ws.getCurrentTime();
            const duration = ws.getDuration();
            const timeDisplay = document.getElementById(`multi-stem-time-${stemType}`);
            if (timeDisplay) {
                timeDisplay.textContent = `${Utils.formatTime(currentTime)} / ${Utils.formatTime(duration)}`;
            }

            // Check if we need to loop this stem
            const loopState = state.stemLoopStates[stemType];
            if (loopState.enabled && loopState.start !== null && loopState.end !== null) {
                if (currentTime >= loopState.end) {
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

            // Load file into PlayerBarComponent
            const file = audioFiles.find(f => f.id === state.currentFileId);
            if (file) {
                if (stemPlayerComponents[stemType]) {
                    stemPlayerComponents[stemType].loadFile(file);
                    console.log(`[STEM COMPONENTS] Loaded file into ${stemType} component (markers: ${stemPlayerComponents[stemType].markersEnabled})`);
                }

                // Fallback for markers if component not handling
                if (state.stemMarkersEnabled[stemType] && !stemPlayerComponents[stemType]) {
                    addStemBarMarkers(stemType, file);
                }
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

    return {
        stemFiles,
        stemPlayerWavesurfers,
        stemPlayerComponents,
        stemIndependentRates,
        stemRateLocked,
        currentParentFileBPM,
        stemsPreloaded: true
    };
}

/**
 * Toggle multi-stem player expanded/collapsed state
 * @param {Object} state - Current state
 * @param {Object} dependencies - { wavesurfer, stemPlayerWavesurfers }
 * @returns {Object} - New state
 */
export function toggleMultiStemPlayer(state, dependencies) {
    console.log('=== toggleMultiStemPlayer (Phase 1 - Volume Toggle Only) ===');
    console.log('currentFileId:', state.currentFileId);

    if (!state.currentFileId) {
        console.log('No current file, returning');
        return state;
    }

    const multiStemPlayer = document.getElementById('multiStemPlayer');
    if (!multiStemPlayer) {
        console.log('multiStemPlayer element not found');
        return state;
    }

    const newExpanded = !state.multiStemPlayerExpanded;
    console.log('multiStemPlayerExpanded:', newExpanded);

    const stemTypes = ['vocals', 'drums', 'bass', 'other'];
    const { wavesurfer, stemPlayerWavesurfers } = dependencies;

    if (newExpanded) {
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

        // 2. MUTE PARENT IMMEDIATELY
        wavesurfer.setVolume(0);
        console.log('✓ Parent muted');

        // 3. UNMUTE ALL STEMS
        const parentVolumeSlider = document.getElementById('volumeSlider');
        const parentVolume = parentVolumeSlider ? parentVolumeSlider.value / 100 : 1.0;

        stemTypes.forEach(type => {
            const ws = stemPlayerWavesurfers[type];
            if (ws) {
                const volumeSlider = document.getElementById(`stem-volume-${type}`);
                const targetVolume = (volumeSlider && volumeSlider.value != 100)
                    ? volumeSlider.value / 100
                    : parentVolume;
                ws.setVolume(targetVolume);
                if (volumeSlider && volumeSlider.value == 100) {
                    volumeSlider.value = parentVolume * 100;
                }
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
            }, 50);
        } else {
            console.log('Parent was paused - stems remain paused at position');
        }

        // 5. Show UI
        setTimeout(() => {
            multiStemPlayer.classList.remove('collapsed');
            console.log('✓ UI expanded');
        }, 10);

    } else {
        console.log('🎵 COLLAPSING: Switching from stems to parent (instant)');

        // 1. MUTE ALL STEMS IMMEDIATELY
        stemTypes.forEach(type => {
            const ws = stemPlayerWavesurfers[type];
            if (ws) {
                ws.setVolume(0);
                console.log(`✓ ${type} muted`);
            }
        });

        // 2. UNMUTE PARENT
        const volumeSlider = document.getElementById('volumeSlider');
        const volume = volumeSlider ? volumeSlider.value / 100 : 1.0;
        wavesurfer.setVolume(volume);
        console.log(`✓ Parent unmuted (volume: ${volume})`);

        // 3. Hide UI
        multiStemPlayer.classList.add('collapsed');
        console.log('✓ UI collapsed (stems still playing muted in background)');
    }

    // Update STEMS button appearance
    const stemsBtn = document.getElementById('stemsBtn');
    if (stemsBtn) {
        stemsBtn.innerHTML = newExpanded ? '<span>▼ STEMS</span>' : '<span>▲ STEMS</span>';
        if (newExpanded) {
            stemsBtn.classList.add('active');
        } else {
            stemsBtn.classList.remove('active');
        }
    }

    console.log('=== Toggle complete ===');
    return { multiStemPlayerExpanded: newExpanded };
}

/**
 * Initialize multi-stem player wavesurfers (LEGACY - may not be used)
 * @param {Object} state - Current state
 * @param {Object} dependencies - { wavesurfer, WaveSurfer, Utils, stemFiles, audioFiles, currentFileId }
 * @param {Function} playAllStems - Callback to play all stems
 * @param {Function} setupParentStemSync - Callback to setup sync
 * @returns {Promise<Object>} - New state
 */
export async function initializeMultiStemPlayerWavesurfers(state, dependencies, playAllStems, setupParentStemSync) {
    console.log('=== Initializing Multi-Stem Player Wavesurfers ===');
    const stemTypes = ['vocals', 'drums', 'bass', 'other'];
    let multiStemReadyCount = 0;

    const { wavesurfer, WaveSurfer, Utils, stemFiles, audioFiles, currentFileId } = dependencies;

    // Capture parent state BEFORE loading stems
    if (!wavesurfer) {
        console.log('No parent wavesurfer - cannot load stems');
        return state;
    }

    const parentWasPlaying = wavesurfer.isPlaying();
    const parentCurrentTime = wavesurfer.getCurrentTime();
    const parentDuration = wavesurfer.getDuration();
    const parentProgress = parentDuration > 0 ? parentCurrentTime / parentDuration : 0;

    console.log(`Parent state: ${parentWasPlaying ? 'playing' : 'paused'} at ${parentCurrentTime.toFixed(2)}s (${(parentProgress * 100).toFixed(1)}%)`);

    const multiStemAutoPlayOnReady = parentWasPlaying;
    const stemPlayerWavesurfers = {};
    const stemPlaybackIndependent = {};

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

            ws._stemFile = stemFile;
            ws._stemType = stemType;
            ws.load(stemFile.file_url);

            stemPlayerWavesurfers[stemType] = ws;
            stemPlaybackIndependent[stemType] = true;

            // Handle ready event
            ws.once('ready', () => {
                multiStemReadyCount++;
                console.log(`Stem ${multiStemReadyCount}/${stemTypes.length} ready: ${stemType}`);

                // When all stems are ready
                if (multiStemReadyCount === stemTypes.length) {
                    console.log('All stems ready - performing seamless audio switch');

                    // Sync all stems to parent position
                    console.log(`Syncing all stems to parent position: ${parentProgress.toFixed(3)}`);
                    stemTypes.forEach(type => {
                        const stemWS = stemPlayerWavesurfers[type];
                        if (stemWS) {
                            stemWS.seekTo(parentProgress);
                        }
                    });

                    // Mute parent
                    console.log('Muting parent player');
                    wavesurfer.setVolume(0);

                    // If parent was playing, start all stems
                    if (multiStemAutoPlayOnReady) {
                        console.log('Parent was playing - starting all stems in sync');
                        setTimeout(() => {
                            playAllStems();
                        }, 50);
                    } else {
                        console.log('Parent was paused - keeping stems paused at position');
                    }

                    // Setup sync
                    setupParentStemSync();
                }
            });

            // Update time display and handle loop
            ws.on('timeupdate', (currentTime) => {
                const duration = ws.getDuration();
                const timeDisplay = document.getElementById(`multi-stem-time-${stemType}`);
                if (timeDisplay) {
                    timeDisplay.textContent = `${Utils.formatTime(currentTime)} / ${Utils.formatTime(duration)}`;
                }

                // Check for loop playback
                const loopState = state.stemLoopStates[stemType];
                const followsParent = stemPlaybackIndependent[stemType] && !loopState.enabled;

                if (followsParent && state.cycleMode && state.loopStart !== null && state.loopEnd !== null) {
                    if (currentTime >= state.loopEnd) {
                        ws.seekTo(state.loopStart / duration);
                    }
                } else if (loopState.enabled && loopState.start !== null && loopState.end !== null) {
                    if (currentTime >= loopState.end) {
                        ws.seekTo(loopState.start / duration);
                        console.log(`${stemType} looped back to ${loopState.start}s`);
                    }
                }
            });

            // Handle finish
            ws.on('finish', () => {
                const loopState = state.stemLoopStates[stemType];
                const followsParent = stemPlaybackIndependent[stemType] && !loopState.enabled;

                if (followsParent && state.cycleMode && state.loopStart !== null && state.loopEnd !== null) {
                    ws.seekTo(state.loopStart / ws.getDuration());
                    ws.play();
                } else if (loopState.enabled && loopState.start !== null && loopState.end !== null) {
                    ws.seekTo(loopState.start / ws.getDuration());
                    ws.play();
                    console.log(`${stemType} finished - looping back to ${loopState.start}s`);
                }
            });

        } catch (error) {
            console.error(`Error loading multi-stem waveform for ${stemType}:`, error);
        }
    }

    return { stemPlayerWavesurfers, stemPlaybackIndependent };
}

/**
 * Setup parent-stem synchronization
 * @param {Object} state - Current state
 * @param {Object} dependencies - { wavesurfer, stemPlayerWavesurfers, multiStemPlayerExpanded, stemPlaybackIndependent, stemLoopStates }
 */
export function setupParentStemSync(state, dependencies) {
    const { wavesurfer, stemPlayerWavesurfers, multiStemPlayerExpanded, stemPlaybackIndependent, stemLoopStates } = dependencies;

    if (!wavesurfer) return;

    console.log('Setting up parent-stem synchronization');

    const stemTypes = ['vocals', 'drums', 'bass', 'other'];

    // When parent plays, resume stems that follow parent
    wavesurfer.on('play', () => {
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
    });

    // When parent pauses, pause stems that follow parent
    wavesurfer.on('pause', () => {
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
    });

    // When parent seeks, seek stems that follow parent
    wavesurfer.on('seeking', (currentTime) => {
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
    });
}
