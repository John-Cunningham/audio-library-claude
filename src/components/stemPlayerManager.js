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
 */

/**
 * Preload all stem files from database
 * @param {Object} supabase - Supabase client
 * @returns {Object} - allStemFiles organized by parent file ID
 */
export async function preloadAllStems(supabase) {
    try {
        console.log('Preloading all stem files...');
        const { data, error } = await supabase
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
