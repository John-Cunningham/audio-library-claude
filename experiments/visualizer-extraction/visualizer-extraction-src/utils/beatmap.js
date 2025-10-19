// Beatmap utilities for marker calculations
import { MARKER_FREQUENCIES } from '../core/config.js';

// Find nearest visible marker to the left of target time
export function findNearestBeat(beatmap, targetTime, markerFrequency = 'bar') {
    if (!beatmap || beatmap.length === 0) return null;

    // Filter to only visible markers based on frequency
    const visibleBeats = getVisibleBeats(beatmap, markerFrequency);

    if (visibleBeats.length === 0) return null;

    // Find the last visible marker at or before targetTime
    let nearestBeat = null;

    for (let i = 0; i < visibleBeats.length; i++) {
        if (visibleBeats[i].time <= targetTime) {
            nearestBeat = visibleBeats[i];
        } else {
            break; // Stop when we find first marker after target
        }
    }

    // If no marker found before target, use first visible marker
    return nearestBeat || visibleBeats[0];
}

// Filter beatmap to only include visible markers based on frequency
export function getVisibleBeats(beatmap, markerFrequency = 'bar') {
    if (!beatmap || beatmap.length === 0) return [];

    return beatmap.filter((beat, index) => {
        if (markerFrequency === 'bar') {
            return beat.beatNum === 1; // Only downbeats
        } else if (markerFrequency === 'bar2') {
            // Every 2 bars - count bars from start
            const barsSinceStart = beatmap.slice(0, index + 1).filter(b => b.beatNum === 1).length;
            return beat.beatNum === 1 && (barsSinceStart - 1) % 2 === 0;
        } else if (markerFrequency === 'bar4') {
            // Every 4 bars
            const barsSinceStart = beatmap.slice(0, index + 1).filter(b => b.beatNum === 1).length;
            return beat.beatNum === 1 && (barsSinceStart - 1) % 4 === 0;
        } else if (markerFrequency === 'bar8') {
            // Every 8 bars
            const barsSinceStart = beatmap.slice(0, index + 1).filter(b => b.beatNum === 1).length;
            return beat.beatNum === 1 && (barsSinceStart - 1) % 8 === 0;
        } else if (markerFrequency === 'halfbar') {
            // Every half bar (beats 1 and 3 in 4/4 time)
            return beat.beatNum === 1 || beat.beatNum === 3;
        } else if (markerFrequency === 'beat') {
            return true; // All beats
        }
        return false;
    });
}

// Adjust beat times for tempo stretching
export function adjustBeatmapForTempo(beatmap, tempo) {
    if (!beatmap || tempo === 1.0) return beatmap;

    return beatmap.map(beat => ({
        ...beat,
        time: beat.time / tempo
    }));
}

// Calculate position percentage from time and duration
export function timeToPercent(time, duration) {
    if (!duration || duration === 0) return 0;
    return (time / duration) * 100;
}

// Calculate time from position percentage and duration
export function percentToTime(percent, duration) {
    if (!duration) return 0;
    return (percent / 100) * duration;
}
