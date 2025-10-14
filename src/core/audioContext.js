// Web Audio API context management
class AudioManager {
    constructor() {
        this.context = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return this.context;

        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.initialized = true;

        console.log('AudioContext initialized:', {
            sampleRate: this.context.sampleRate,
            state: this.context.state
        });

        return this.context;
    }

    async resume() {
        if (!this.context) return;

        if (this.context.state === 'suspended') {
            await this.context.resume();
            console.log('AudioContext resumed');
        }
    }

    async suspend() {
        if (!this.context) return;

        if (this.context.state === 'running') {
            await this.context.suspend();
            console.log('AudioContext suspended');
        }
    }

    getContext() {
        if (!this.initialized) {
            this.init();
        }
        return this.context;
    }

    getCurrentTime() {
        return this.context ? this.context.currentTime : 0;
    }
}

export const audioManager = new AudioManager();
