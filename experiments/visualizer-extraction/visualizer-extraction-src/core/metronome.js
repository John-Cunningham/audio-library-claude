// Metronome module - Audio click/beep generator for beat tracking
// Manages metronome audio context, sound generation, and beat scheduling

// State will be managed by app.js and passed in
let metronomeEnabled = false;
let metronomeSound = 'click';
let metronomeAudioContext = null;
let metronomeMasterGain = null;
let scheduledMetronomeNotes = [];
let lastMetronomeScheduleTime = 0;

export function initMetronomeAudioContext() {
    if (!metronomeAudioContext) {
        metronomeAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        // Create master gain node for instant muting
        metronomeMasterGain = metronomeAudioContext.createGain();
        metronomeMasterGain.connect(metronomeAudioContext.destination);
        metronomeMasterGain.gain.value = 1.0;
    }
    return metronomeAudioContext;
}

export function stopAllMetronomeSounds() {
    // Stop ALL scheduled audio nodes immediately
    scheduledMetronomeNotes.forEach(node => {
        try {
            if (node.stop) {
                node.stop(0);
            }
            if (node.disconnect) {
                node.disconnect();
            }
        } catch (e) {
            // Node may have already stopped, ignore error
        }
    });
    scheduledMetronomeNotes = [];
    lastMetronomeScheduleTime = 0; // Reset scheduling
}

export function playMetronomeSound(time, isDownbeat = false) {
    const ctx = initMetronomeAudioContext();

    switch(metronomeSound) {
        case 'click':
            playClickSound(ctx, time, isDownbeat);
            break;
        case 'beep':
            playBeepSound(ctx, time, isDownbeat);
            break;
        case 'wood':
            playWoodSound(ctx, time, isDownbeat);
            break;
        case 'cowbell':
            playCowbellSound(ctx, time, isDownbeat);
            break;
    }
}

function playClickSound(ctx, time, isDownbeat) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(metronomeMasterGain);

    // Higher pitch for downbeat, lower for other beats
    osc.frequency.value = isDownbeat ? 1200 : 800;

    // Short, sharp click
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.02);

    osc.start(time);
    osc.stop(time + 0.02);

    // Track nodes for cleanup
    scheduledMetronomeNotes.push(osc);
    scheduledMetronomeNotes.push(gain);
}

function playBeepSound(ctx, time, isDownbeat) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(metronomeMasterGain);

    osc.type = 'sine';
    osc.frequency.value = isDownbeat ? 880 : 440; // A5 for downbeat, A4 for beats

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    osc.start(time);
    osc.stop(time + 0.08);

    // Track nodes for cleanup
    scheduledMetronomeNotes.push(osc);
    scheduledMetronomeNotes.push(gain);
}

function playWoodSound(ctx, time, isDownbeat) {
    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate noise
    for (let i = 0; i < buffer.length; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = isDownbeat ? 800 : 600;
    filter.Q.value = 10;

    const gain = ctx.createGain();

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(metronomeMasterGain);

    gain.gain.setValueAtTime(isDownbeat ? 0.35 : 0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    noise.start(time);
    noise.stop(time + 0.05);

    // Track nodes for cleanup
    scheduledMetronomeNotes.push(noise);
    scheduledMetronomeNotes.push(filter);
    scheduledMetronomeNotes.push(gain);
}

function playCowbellSound(ctx, time, isDownbeat) {
    // Cowbell uses two square waves at specific frequencies
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'square';
    osc2.type = 'square';

    if (isDownbeat) {
        osc1.frequency.value = 800;
        osc2.frequency.value = 540;
    } else {
        osc1.frequency.value = 700;
        osc2.frequency.value = 470;
    }

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(metronomeMasterGain);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.1);
    osc2.stop(time + 0.1);

    // Track nodes for cleanup
    scheduledMetronomeNotes.push(osc1);
    scheduledMetronomeNotes.push(osc2);
    scheduledMetronomeNotes.push(gain);
}

export function scheduleMetronome(audioFiles, currentFileId, wavesurfer, barStartOffset, currentRate) {
    if (!metronomeEnabled || !wavesurfer) return;

    const file = audioFiles.find(f => f.id === currentFileId);
    if (!file || !file.beatmap || file.beatmap.length === 0) {
        console.log('No beatmap data for metronome');
        return;
    }

    const ctx = initMetronomeAudioContext();
    const currentTime = ctx.currentTime;
    const audioCurrentTime = wavesurfer.getCurrentTime();
    const playbackRate = currentRate; // Use current playback rate

    // Apply the same beat rotation as markers
    const barOffset = Math.floor(barStartOffset);
    const fractionalBeats = Math.round((barStartOffset - barOffset) * 4);

    // Schedule clicks for upcoming beats
    file.beatmap.forEach(beat => {
        const timeUntilBeat = beat.time - audioCurrentTime; // Time in audio seconds

        // Convert audio time to wallclock time by dividing by playback rate
        // At 2x rate, 1 audio second = 0.5 wallclock seconds
        const wallclockTimeUntilBeat = timeUntilBeat / playbackRate;

        // Schedule 2 wallclock seconds ahead
        if (wallclockTimeUntilBeat >= 0 && wallclockTimeUntilBeat < 2) {
            const scheduleTime = currentTime + wallclockTimeUntilBeat;

            // Apply beat rotation to determine if this is a downbeat
            let rotatedBeatNum = beat.beatNum;
            if (fractionalBeats !== 0) {
                rotatedBeatNum = beat.beatNum - fractionalBeats;
                while (rotatedBeatNum < 1) rotatedBeatNum += 4;
                while (rotatedBeatNum > 4) rotatedBeatNum -= 4;
            }

            const isDownbeat = rotatedBeatNum === 1;
            playMetronomeSound(scheduleTime, isDownbeat);
        }
    });
}

export function toggleMetronome(wavesurfer) {
    metronomeEnabled = !metronomeEnabled;
    console.log(`Metronome: ${metronomeEnabled ? 'ON' : 'OFF'}`);

    // Update button state
    const btn = document.getElementById('metronomeBtn');
    if (btn) {
        if (metronomeEnabled) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    }

    if (metronomeEnabled && wavesurfer && wavesurfer.isPlaying()) {
        // Schedule will be called from audioprocess event in app.js
    }
    
    return metronomeEnabled;
}

export function setMetronomeSound(sound) {
    metronomeSound = sound;
    console.log(`Metronome sound: ${sound}`);
}

// Getters for state (since we're managing state in this module for now)
export function isMetronomeEnabled() {
    return metronomeEnabled;
}

export function getLastMetronomeScheduleTime() {
    return lastMetronomeScheduleTime;
}

export function setLastMetronomeScheduleTime(time) {
    lastMetronomeScheduleTime = time;
}
