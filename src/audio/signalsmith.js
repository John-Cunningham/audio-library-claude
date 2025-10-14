// Signalsmith Stretch wrapper for time/pitch shifting
import { audioManager } from '../core/audioContext.js';

export class SignalsmithProcessor {
    constructor() {
        this.stretchNode = null;
        this.gainNode = null;
        this.audioBuffer = null;
        this.isPlaying = false;
        this.currentPitch = 0;
        this.currentTempo = 1.0;
        this.ready = false;
    }

    async init() {
        if (!window.SignalsmithStretch) {
            await new Promise(resolve => {
                if (window.signalsmithReady) {
                    resolve();
                } else {
                    window.onSignalsmithReady = resolve;
                }
            });
        }

        const context = audioManager.getContext();
        this.stretchNode = await window.SignalsmithStretch(context);
        this.gainNode = context.createGain();
        this.stretchNode.connect(this.gainNode);

        console.log('SignalsmithProcessor initialized');
    }

    async loadAudio(url) {
        try {
            console.log('Loading audio for Signalsmith:', url);

            if (!this.stretchNode) {
                await this.init();
            }

            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const context = audioManager.getContext();
            this.audioBuffer = await context.decodeAudioData(arrayBuffer);

            // Add channel buffers to stretch node
            const channelBuffers = [];
            for (let ch = 0; ch < this.audioBuffer.numberOfChannels; ch++) {
                channelBuffers.push(this.audioBuffer.getChannelData(ch));
            }
            await this.stretchNode.addBuffers(channelBuffers);

            // Configure stretch parameters
            this.stretchNode.configure({
                blockMs: 30,
                intervalMs: 10
            });

            this.ready = true;
            console.log('Signalsmith audio loaded successfully');
        } catch (error) {
            console.error('Failed to load audio for Signalsmith:', error);
            throw error;
        }
    }

    connect(destination) {
        if (this.gainNode) {
            this.gainNode.connect(destination);
        }
    }

    disconnect() {
        if (this.gainNode) {
            this.gainNode.disconnect();
        }
    }

    play(startTime = 0) {
        if (!this.ready || !this.stretchNode) {
            console.warn('SignalsmithProcessor not ready');
            return;
        }

        const context = audioManager.getContext();

        this.stretchNode.schedule({
            active: true,
            input: startTime,
            output: context.currentTime,
            rate: this.currentTempo,
            semitones: this.currentPitch
        });

        this.isPlaying = true;
    }

    stop() {
        if (this.stretchNode) {
            this.stretchNode.stop();
        }
        this.isPlaying = false;
    }

    setTempo(tempo) {
        this.currentTempo = tempo;
        if (this.isPlaying && this.stretchNode) {
            // Reschedule with new tempo
            this.stretchNode.stop();
            const context = audioManager.getContext();
            this.stretchNode.schedule({
                active: true,
                input: 0, // This should be current position - handled by caller
                output: context.currentTime,
                rate: tempo,
                semitones: this.currentPitch
            });
        }
    }

    setPitch(semitones) {
        this.currentPitch = semitones;
        if (this.isPlaying && this.stretchNode) {
            // Reschedule with new pitch
            this.stretchNode.stop();
            const context = audioManager.getContext();
            this.stretchNode.schedule({
                active: true,
                input: 0, // This should be current position - handled by caller
                output: context.currentTime,
                rate: this.currentTempo,
                semitones: semitones
            });
        }
    }

    setVolume(volume) {
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }

    reschedule(inputTime) {
        if (!this.isPlaying || !this.stretchNode) return;

        this.stretchNode.stop();
        const context = audioManager.getContext();
        this.stretchNode.schedule({
            active: true,
            input: inputTime,
            output: context.currentTime,
            rate: this.currentTempo,
            semitones: this.currentPitch
        });
    }
}
