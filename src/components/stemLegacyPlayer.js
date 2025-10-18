/**
 * Legacy Stem Player Module (OLD System)
 *
 * Handles the original stem player system used in the Library View file list.
 * This system renders visual-only waveforms inline when users expand stems
 * in the file list. It coexists with the new multi-stem player in the bottom bar.
 *
 * Architecture:
 * - Uses stemWavesurfers (old system) instead of stemPlayerWavesurfers (new system)
 * - Renders visual waveforms in file list expansion areas
 * - Manages volume/mute/solo controls for inline stems
 *
 * Created: 2025-10-18
 * Part of: Refactoring Phase - Separation of OLD and NEW stem systems
 */

/**
 * Render visual waveforms for stems in file list expansion
 * Creates visual-only WaveSurfer instances (no playback controls)
 *
 * @param {number} fileId - File ID to render stems for
 * @param {Object} stemFiles - Stem files object { vocals: {...}, drums: {...}, etc }
 * @param {Object} WaveSurfer - WaveSurfer constructor
 */
export function renderStemWaveforms(fileId, stemFiles, WaveSurfer) {
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

/**
 * Restore stem control states (volume, mute, solo) after file list expansion
 *
 * @param {number} fileId - File ID to restore controls for
 * @param {Object} stemFiles - Stem files object
 * @param {Object} state - State object containing stemVolumes, stemMuted, stemSoloed
 */
export function restoreStemControlStates(fileId, stemFiles, state) {
    const { stemVolumes, stemMuted, stemSoloed } = state;
    const stemTypes = ['vocals', 'drums', 'bass', 'other'];

    stemTypes.forEach(stemType => {
        // Get stem file ID
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

/**
 * Update legacy stem volumes (solo/mute logic)
 * Applies master volume and handles solo/mute states for OLD stem system
 *
 * @param {Object} state - State object
 * @param {number} state.masterVolume - Master volume (0-1)
 * @param {Object} state.stemWavesurfers - OLD stem WaveSurfer instances
 * @param {Object} state.stemFiles - Stem files data
 * @param {Object} state.stemVolumes - Individual stem volumes by file ID
 * @param {Object} state.stemMuted - Muted state by file ID
 * @param {Object} state.stemSoloed - Solo state by file ID
 */
export function updateLegacyStemVolumes(state) {
    const { masterVolume, stemWavesurfers, stemFiles, stemVolumes, stemMuted, stemSoloed } = state;

    // Check if any stems are soloed (using stem file IDs)
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
