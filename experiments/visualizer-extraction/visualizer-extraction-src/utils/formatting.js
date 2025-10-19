// Formatting utilities for time, BPM, keys, etc.
// import { KEY_TO_SEMITONE, SEMITONE_TO_KEY } from '../core/config.js';

// Key/semitone mapping constants (local definitions)
const KEY_TO_SEMITONE = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

const SEMITONE_TO_KEY = {
    0: 'C', 1: 'C#', 2: 'D', 3: 'Eb', 4: 'E', 5: 'F',
    6: 'F#', 7: 'G', 8: 'Ab', 9: 'A', 10: 'Bb', 11: 'B'
};

// Format time in MM:SS
export function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format rate with BPM info
export function formatRate(rate, originalBPM) {
    const rateStr = rate.toFixed(2) + 'x';
    if (originalBPM) {
        const newBPM = Math.round(originalBPM * rate);
        return `${rateStr} (${originalBPM} → ${newBPM} BPM)`;
    }
    return rateStr;
}

// Format pitch with key info
export function formatPitch(semitones, originalKey) {
    const sign = semitones > 0 ? '+' : '';
    const pitchStr = `${sign}${semitones}`;

    if (originalKey) {
        const noteMatch = originalKey.match(/^([A-G][#b]?)(maj|min)?/i);
        if (noteMatch) {
            const note = noteMatch[1];
            const mode = noteMatch[2] || '';

            const originalSemitone = KEY_TO_SEMITONE[note];
            if (originalSemitone !== undefined) {
                const newSemitone = (originalSemitone + semitones + 12) % 12;
                const newNote = SEMITONE_TO_KEY[newSemitone];
                const newKey = newNote + mode;
                return `${pitchStr} (${originalKey} → ${newKey})`;
            }
        }
    }

    return pitchStr;
}

// Convert semitones to musical interval name
export function semitoneToInterval(semitones) {
    const absValue = Math.abs(semitones);
    const intervals = [
        'Unison', 'Minor 2nd', 'Major 2nd', 'Minor 3rd',
        'Major 3rd', 'Perfect 4th', 'Tritone', 'Perfect 5th',
        'Minor 6th', 'Major 6th', 'Minor 7th', 'Major 7th', 'Octave'
    ];

    if (absValue <= 12) {
        return intervals[absValue];
    }

    const octaves = Math.floor(absValue / 12);
    const remainder = absValue % 12;
    return `${octaves} octave${octaves > 1 ? 's' : ''} + ${intervals[remainder]}`;
}

// Format file size
export function formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(2) + ' MB';
}

// Format duration as MM:SS or HH:MM:SS
export function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}
