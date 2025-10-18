/**
 * Stem Marker System Module
 *
 * Handles bar/beat markers for individual stem waveforms
 * Uses pure functions - all state is passed in, no internal state
 *
 * Architecture:
 * - All marker state lives in app.js (single source of truth)
 * - Functions accept state parameters, return new state
 * - Similar to parent marker system but for individual stems
 *
 * Created: 2025-10-18
 * Part of: Refactoring Phase 4 - Stem Marker System extraction
 */

/**
 * Toggle markers on/off for a specific stem
 * @param {Object} state - { stemMarkersEnabled, stemType, audioFiles, currentFileId, stemPlayerWavesurfers }
 * @param {Function} addStemMarkersCallback - Callback to re-render stem markers
 * @returns {Object} - { stemMarkersEnabled: { [stemType]: boolean } }
 */
export function toggleStemMarkers(state, addStemMarkersCallback) {
    const { stemType, stemMarkersEnabled, audioFiles, currentFileId } = state;

    const newStemMarkersEnabled = {
        ...stemMarkersEnabled,
        [stemType]: !stemMarkersEnabled[stemType]
    };

    console.log(`[${stemType}] Bar markers: ${newStemMarkersEnabled[stemType] ? 'ON' : 'OFF'}`);

    // Update button state
    const btn = document.getElementById(`stem-markers-btn-${stemType}`);
    if (btn) {
        if (newStemMarkersEnabled[stemType]) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    // Re-render markers (or clear them)
    if (addStemMarkersCallback) {
        const file = audioFiles.find(f => f.id === currentFileId);
        if (file) {
            addStemMarkersCallback(stemType, file);
        }
    }

    return { stemMarkersEnabled: newStemMarkersEnabled };
}

/**
 * Set marker frequency for a specific stem
 * @param {Object} state - { stemType, stemMarkerFrequency, audioFiles, currentFileId }
 * @param {string} freq - New frequency ('bar', 'bar2', 'bar4', 'bar8', 'halfbar', 'beat')
 * @param {Function} addStemMarkersCallback - Callback to re-render stem markers
 * @returns {Object} - { stemMarkerFrequency: { [stemType]: string } }
 */
export function setStemMarkerFrequency(state, freq, addStemMarkersCallback) {
    const { stemType, stemMarkerFrequency, audioFiles, currentFileId } = state;

    const newStemMarkerFrequency = {
        ...stemMarkerFrequency,
        [stemType]: freq
    };

    console.log(`[${stemType}] Marker frequency: ${freq}`);

    // Re-render current file's markers
    if (addStemMarkersCallback) {
        const file = audioFiles.find(f => f.id === currentFileId);
        if (file) {
            addStemMarkersCallback(stemType, file);
        }
    }

    return { stemMarkerFrequency: newStemMarkerFrequency };
}

/**
 * Get shift increment based on stem's marker frequency
 * @param {string} frequency - Current marker frequency for this stem
 * @returns {number} - Shift increment in bars
 */
export function getStemShiftIncrement(frequency) {
    switch (frequency) {
        case 'bar8': return 8;
        case 'bar4': return 4;
        case 'bar2': return 2;
        case 'bar': return 1;
        case 'halfbar': return 0.5;
        case 'beat': return 0.25;
        default: return 1;
    }
}

/**
 * Shift stem bar start offset left
 * @param {Object} state - { stemType, stemBarStartOffset, stemMarkerFrequency, audioFiles, currentFileId }
 * @param {Function} addStemMarkersCallback - Callback to re-render stem markers
 * @returns {Object} - { stemBarStartOffset: { [stemType]: number } }
 */
export function shiftStemBarStartLeft(state, addStemMarkersCallback) {
    const { stemType, stemBarStartOffset, stemMarkerFrequency, audioFiles, currentFileId } = state;

    const increment = getStemShiftIncrement(stemMarkerFrequency[stemType]);
    const newStemBarStartOffset = {
        ...stemBarStartOffset,
        [stemType]: stemBarStartOffset[stemType] - increment
    };

    console.log(`[${stemType}] Bar start offset: ${newStemBarStartOffset[stemType]} (shifted by -${increment})`);

    // Update display
    const display = document.getElementById(`stem-bar-offset-${stemType}`);
    if (display) {
        display.textContent = newStemBarStartOffset[stemType].toFixed(2).replace(/\.?0+$/, '');
    }

    // Re-render markers
    if (addStemMarkersCallback) {
        const file = audioFiles.find(f => f.id === currentFileId);
        if (file) {
            addStemMarkersCallback(stemType, file);
        }
    }

    return { stemBarStartOffset: newStemBarStartOffset };
}

/**
 * Shift stem bar start offset right
 * @param {Object} state - { stemType, stemBarStartOffset, stemMarkerFrequency, audioFiles, currentFileId }
 * @param {Function} addStemMarkersCallback - Callback to re-render stem markers
 * @returns {Object} - { stemBarStartOffset: { [stemType]: number } }
 */
export function shiftStemBarStartRight(state, addStemMarkersCallback) {
    const { stemType, stemBarStartOffset, stemMarkerFrequency, audioFiles, currentFileId } = state;

    const increment = getStemShiftIncrement(stemMarkerFrequency[stemType]);
    const newStemBarStartOffset = {
        ...stemBarStartOffset,
        [stemType]: stemBarStartOffset[stemType] + increment
    };

    console.log(`[${stemType}] Bar start offset: ${newStemBarStartOffset[stemType]} (shifted by +${increment})`);

    // Update display
    const display = document.getElementById(`stem-bar-offset-${stemType}`);
    if (display) {
        display.textContent = newStemBarStartOffset[stemType].toFixed(2).replace(/\.?0+$/, '');
    }

    // Re-render markers
    if (addStemMarkersCallback) {
        const file = audioFiles.find(f => f.id === currentFileId);
        if (file) {
            addStemMarkersCallback(stemType, file);
        }
    }

    return { stemBarStartOffset: newStemBarStartOffset };
}

/**
 * Find nearest marker to the left for a specific stem
 * @param {number} clickTime - Time to search from
 * @param {Array<number>} stemCurrentMarkers - Array of marker times for this stem
 * @returns {number} - Nearest marker time (or clickTime if no markers)
 */
export function findStemNearestMarkerToLeft(clickTime, stemCurrentMarkers) {
    if (stemCurrentMarkers.length === 0) return clickTime;

    let nearestMarker = 0;
    for (let markerTime of stemCurrentMarkers) {
        if (markerTime <= clickTime && markerTime > nearestMarker) {
            nearestMarker = markerTime;
        }
    }

    return nearestMarker;
}

/**
 * Add bar markers to stem waveform
 * Core rendering function that creates marker DOM elements for a specific stem
 *
 * @param {string} stemType - Type of stem ('vocals', 'drums', 'bass', 'other')
 * @param {Object} file - Audio file with beatmap data
 * @param {Object} stemPlayerWavesurfers - Object containing all stem wavesurfer instances
 * @param {Object} config - { stemMarkersEnabled, stemMarkerFrequency, stemBarStartOffset, stemCurrentMarkers }
 * @returns {Array<number>} - Array of marker times for this stem
 */
export function addStemBarMarkers(stemType, file, stemPlayerWavesurfers, config) {
    const ws = stemPlayerWavesurfers[stemType];
    if (!ws) return [];

    const waveformContainer = document.getElementById(`multi-stem-waveform-${stemType}`);
    if (!waveformContainer) return [];

    // Don't add markers if disabled or no data
    if (!config.stemMarkersEnabled[stemType] || !file.beatmap) {
        // Clear any existing markers if disabled
        const existingContainer = waveformContainer.querySelector('.marker-container');
        if (existingContainer) existingContainer.remove();
        return [];
    }

    // Get the duration to calculate marker positions
    const duration = ws.getDuration();
    if (!duration) return [];

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
    const barOffset = Math.floor(config.stemBarStartOffset[stemType]);
    const fractionalBeats = Math.round((config.stemBarStartOffset[stemType] - barOffset) * 4);

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
    switch (config.stemMarkerFrequency[stemType]) {
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

    console.log(`[${stemType}] Adding ${filteredBeats.length} markers (frequency: ${config.stemMarkerFrequency[stemType]}, barOffset: ${barOffset}, beatOffset: ${fractionalBeats})`);

    // Create marker times array
    const markerTimes = [];

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
        markerTimes.push(beat.time);
    });

    return markerTimes;
}
