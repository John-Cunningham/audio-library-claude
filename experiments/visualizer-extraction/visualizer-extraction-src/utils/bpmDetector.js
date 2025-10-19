/**
 * BPM Detection Utility
 *
 * Analyzes onset detection data to calculate tempo (BPM)
 * Uses interval clustering and statistical analysis for robust detection
 *
 * @module bpmDetector
 */

/**
 * Calculate BPM from onset detection data
 *
 * @param {number[]} onsets - Array of onset times in seconds
 * @param {number} duration - Total duration of audio in seconds
 * @returns {number|null} - Detected BPM (60-200 range) or null if detection fails
 *
 * @example
 * const bpm = calculateBPMFromOnsets([0.5, 1.0, 1.5, 2.0], 3.0);
 * // Returns: 120 (one beat every 0.5 seconds)
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
