// Utility functions - pure functions with no side effects

/**
 * Extract tags, BPM, and key from filename
 * @param {string} filename - The filename to parse
 * @returns {Object} - {tags: string[], bpm: number|null, key: string|null}
 */
export function extractTagsFromFilename(filename) {
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

/**
 * Get audio file duration
 * @param {File} file - The audio file
 * @returns {Promise<number|null>} - Duration in seconds, or null on error
 */
export function getAudioDuration(file) {
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

/**
 * Calculate BPM from onset positions with musical quantization
 * @param {number[]} onsets - Array of onset times in seconds
 * @param {number} duration - Total duration in seconds
 * @returns {number|null} - Detected BPM or null if detection failed
 */
export function calculateBPMFromOnsets(onsets, duration) {
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

/**
 * Get all unique tags with counts from audio files
 * @param {Object[]} audioFiles - Array of audio file objects
 * @returns {Object[]} - Array of {tag: string, count: number}, sorted by count then alphabetically
 */
export function getAllTags(audioFiles) {
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

/**
 * Get count for a specific tag in a file list
 * @param {string} tag - Tag to count
 * @param {Object[]} files - Array of audio file objects
 * @returns {number} - Count of files with this tag
 */
export function getTagCount(tag, files) {
    return files.filter(file => file.tags.includes(tag)).length;
}

/**
 * Get all unique BPMs with counts from audio files
 * @param {Object[]} audioFiles - Array of audio file objects
 * @returns {Object[]} - Array of {bpm: number, count: number}, sorted by BPM ascending
 */
export function getAllBPMs(audioFiles) {
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

/**
 * Get all unique keys with counts from audio files
 * @param {Object[]} audioFiles - Array of audio file objects
 * @returns {Object[]} - Array of {key: string, count: number}, sorted alphabetically
 */
export function getAllKeys(audioFiles) {
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

/**
 * Get shift increment based on current marker frequency
 * @param {string} markerFrequency - Current marker frequency setting
 * @returns {number} - Number of bars to shift
 */
export function getShiftIncrement(markerFrequency) {
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

/**
 * Find nearest marker to the left of a given time
 * @param {number} clickTime - Time to search from
 * @param {number[]} currentMarkers - Array of marker times
 * @returns {number} - Nearest marker time to the left, or 0 if none found
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
 * Get bar index at a given time
 * @param {number} time - Time in seconds
 * @param {Object} file - Audio file object with beatmap
 * @returns {number|null} - Bar index or null if not found
 */
export function getBarIndexAtTime(time, file) {
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

/**
 * Get time for a given bar marker index
 * @param {number} barIndex - Bar index to look up
 * @param {Object} file - Audio file object with beatmap
 * @returns {number|null} - Time in seconds or null if not found
 */
export function getTimeForBarIndex(barIndex, file) {
    if (!file || !file.beatmap) return null;

    // Get all bar markers (beatNum = 1)
    const barMarkers = file.beatmap.filter(m => m.beatNum === 1);
    if (barMarkers.length === 0 || barIndex < 0 || barIndex >= barMarkers.length) return null;

    return barMarkers[barIndex].time;
}

/**
 * Format seconds to MM:SS
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
export function formatTime(seconds) {
    if (isNaN(seconds) || seconds === null) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
