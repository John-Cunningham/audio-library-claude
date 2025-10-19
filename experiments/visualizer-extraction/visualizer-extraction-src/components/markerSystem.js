/**
 * Marker System Module
 *
 * Handles bar/beat markers for waveforms (both parent and stem players)
 * Uses pure functions - all state is passed in, no internal state
 *
 * Architecture:
 * - All marker state lives in app.js (single source of truth)
 * - Functions accept state parameters, return new state
 * - Parent and stem players share the same marker logic
 *
 * Created: 2025-10-17
 * Part of: Refactoring Phase 3 - Marker System extraction
 */

/**
 * Toggle markers on/off
 * @param {Object} state - { markersEnabled, audioFiles, currentFileId }
 * @param {Function} addMarkersCallback - Callback to re-render markers
 * @returns {Object} - { markersEnabled }
 */
export function toggleMarkers(state, addMarkersCallback) {
    const newMarkersEnabled = !state.markersEnabled;
    console.log(`Bar markers: ${newMarkersEnabled ? 'ON' : 'OFF'}`);

    return { markersEnabled: newMarkersEnabled };
}

/**
 * Set marker frequency and update display
 * @param {Object} state - { markerFrequency, audioFiles, currentFileId, multiStemPlayerExpanded }
 * @param {string} freq - New frequency ('bar', 'bar2', 'bar4', 'bar8', 'halfbar', 'beat')
 * @param {Function} addMarkersCallback - Callback to re-render markers
 * @param {Object} stemPlayerComponents - Stem player components (for sync)
 * @returns {Object} - { markerFrequency }
 */
export function setMarkerFrequency(state, freq, addMarkersCallback, stemPlayerComponents) {
    console.log(`Marker frequency: ${freq}`);

    // Re-render current file
    if (addMarkersCallback) {
        const file = state.audioFiles.find(f => f.id === state.currentFileId);
        if (file) {
            addMarkersCallback(file, state.markersEnabled, freq);
        }
    }

    // Sync to stems if expanded
    if (state.multiStemPlayerExpanded && stemPlayerComponents) {
        const stemTypes = ['vocals', 'drums', 'bass', 'other'];
        stemTypes.forEach(stemType => {
            if (stemPlayerComponents[stemType]) {
                stemPlayerComponents[stemType].setMarkerFrequency(freq);
            }
        });
    }

    return { markerFrequency: freq };
}

/**
 * Get shift increment based on marker frequency
 * @param {string} frequency - Current marker frequency
 * @returns {number} - Shift increment in bars
 */
export function getShiftIncrement(frequency) {
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
 * Shift bar start offset left
 * @param {Object} state - { barStartOffset, markerFrequency, audioFiles, currentFileId, multiStemPlayerExpanded }
 * @param {Function} addMarkersCallback - Callback to re-render markers
 * @param {Object} stemPlayerComponents - Stem player components (for sync)
 * @returns {Object} - { barStartOffset }
 */
export function shiftBarStartLeft(state, addMarkersCallback, stemPlayerComponents) {
    const increment = getShiftIncrement(state.markerFrequency);
    const newBarStartOffset = state.barStartOffset - increment;
    console.log(`Bar start offset: ${newBarStartOffset} (shifted by -${increment})`);

    // Update display
    const display = document.getElementById('barStartOffsetDisplay');
    if (display) {
        display.textContent = newBarStartOffset.toFixed(2).replace(/\.?0+$/, '');
    }

    // Re-render markers
    if (addMarkersCallback) {
        const file = state.audioFiles.find(f => f.id === state.currentFileId);
        if (file) {
            addMarkersCallback(file, state.markersEnabled, state.markerFrequency, newBarStartOffset);
        }
    }

    // Sync to stems if expanded
    if (state.multiStemPlayerExpanded && stemPlayerComponents) {
        const stemTypes = ['vocals', 'drums', 'bass', 'other'];
        stemTypes.forEach(stemType => {
            if (stemPlayerComponents[stemType]) {
                stemPlayerComponents[stemType].shiftBarStartLeft();
            }
        });
    }

    return { barStartOffset: newBarStartOffset };
}

/**
 * Shift bar start offset right
 * @param {Object} state - { barStartOffset, markerFrequency, audioFiles, currentFileId, multiStemPlayerExpanded }
 * @param {Function} addMarkersCallback - Callback to re-render markers
 * @param {Object} stemPlayerComponents - Stem player components (for sync)
 * @returns {Object} - { barStartOffset }
 */
export function shiftBarStartRight(state, addMarkersCallback, stemPlayerComponents) {
    const increment = getShiftIncrement(state.markerFrequency);
    const newBarStartOffset = state.barStartOffset + increment;
    console.log(`Bar start offset: ${newBarStartOffset} (shifted by +${increment})`);

    // Update display
    const display = document.getElementById('barStartOffsetDisplay');
    if (display) {
        display.textContent = newBarStartOffset.toFixed(2).replace(/\.?0+$/, '');
    }

    // Re-render markers
    if (addMarkersCallback) {
        const file = state.audioFiles.find(f => f.id === state.currentFileId);
        if (file) {
            addMarkersCallback(file, state.markersEnabled, state.markerFrequency, newBarStartOffset);
        }
    }

    // Sync to stems if expanded
    if (state.multiStemPlayerExpanded && stemPlayerComponents) {
        const stemTypes = ['vocals', 'drums', 'bass', 'other'];
        stemTypes.forEach(stemType => {
            if (stemPlayerComponents[stemType]) {
                stemPlayerComponents[stemType].shiftBarStartRight();
            }
        });
    }

    return { barStartOffset: newBarStartOffset };
}

/**
 * Find nearest marker to the left of a given time
 * @param {number} clickTime - Time to search from
 * @param {Array<number>} currentMarkers - Array of marker times
 * @returns {number} - Nearest marker time (or clickTime if no markers)
 */
export function findNearestMarkerToLeft(clickTime, currentMarkers) {
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

/**
 * Add bar markers to waveform
 * Core rendering function that creates marker DOM elements
 *
 * @param {Object} file - Audio file with beatmap data
 * @param {Object} wavesurfer - WaveSurfer instance
 * @param {string} waveformContainerId - ID of waveform container
 * @param {Object} config - { markersEnabled, markerFrequency, barStartOffset }
 * @returns {Array<number>} - Array of marker times
 */
export function addBarMarkers(file, wavesurfer, waveformContainerId, config) {
    const waveformContainer = document.getElementById(waveformContainerId);
    if (!waveformContainer) return [];

    // Don't add markers if disabled or no data
    if (!config.markersEnabled || !file.beatmap || !wavesurfer) {
        // Clear any existing markers if disabled
        const existingContainer = waveformContainer.querySelector('.marker-container');
        if (existingContainer) existingContainer.remove();
        return [];
    }

    // Get the duration to calculate marker positions
    const duration = wavesurfer.getDuration();
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

    // STEP 0: Force the first beat to always be bar 1, beat 1
    const normalizedBeatmap = file.beatmap.map((beat, index) => {
        if (index === 0) {
            return { ...beat, beatNum: 1, originalIndex: index };
        }
        return { ...beat, originalIndex: index };
    });

    // Split barStartOffset into integer bars and fractional beats
    const barOffset = Math.floor(config.barStartOffset);
    const fractionalBeats = Math.round((config.barStartOffset - barOffset) * 4);

    // STEP 1: Calculate original bar numbers first
    let barNumber = 0;
    const beatmapWithOriginalBars = normalizedBeatmap.map(beat => {
        if (beat.beatNum === 1) barNumber++;
        return { ...beat, originalBarNumber: barNumber };
    });

    // STEP 2: Rotate beatNum values for fractional beat shifts
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
    switch (config.markerFrequency) {
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
        default:
            filteredBeats = beatmapWithBars.filter(b => b.beatNum === 1);
    }

    // Create markers array to return
    const markerTimes = [];

    // Create marker elements
    filteredBeats.forEach(beat => {
        const markerTime = beat.time;
        const markerPos = (markerTime / duration) * 100;

        const markerEl = document.createElement('div');
        const isBar = beat.beatNum === 1;
        markerEl.className = isBar ? 'bar-marker' : 'beat-marker';
        markerEl.style.left = `${markerPos}%`;

        // Add bar number label to bar markers
        if (isBar && beat.barNumber > 0) {
            markerEl.setAttribute('data-bar', beat.barNumber);
        }

        markerContainer.appendChild(markerEl);
        markerTimes.push(markerTime);
    });

    return markerTimes;
}
