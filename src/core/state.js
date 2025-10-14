// Global application state
class AppState {
    constructor() {
        this.currentFile = null;
        this.currentView = 'library';
        this.isPlaying = false;
        this.volume = 1.0;
        this.rate = 1.0;
        this.pitch = 0;
        this.loop = false;
        this.markersEnabled = true;
        this.markerFrequency = 'bar';
        this.stemsVisible = false;
        this.stemsData = null;
        this.loopStart = null;
        this.loopEnd = null;
        this.editLoopMode = false;
        this.seekOnClick = false;

        // Event listeners
        this.listeners = {};
    }

    // Event system
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    // State updates with events
    setCurrentFile(file) {
        this.currentFile = file;
        this.emit('fileChanged', file);
    }

    setPlaying(playing) {
        this.isPlaying = playing;
        this.emit('playingChanged', playing);
    }

    setVolume(volume) {
        this.volume = volume;
        this.emit('volumeChanged', volume);
    }

    setRate(rate) {
        this.rate = rate;
        this.emit('rateChanged', rate);
    }

    setPitch(pitch) {
        this.pitch = pitch;
        this.emit('pitchChanged', pitch);
    }

    setLoop(loop) {
        this.loop = loop;
        this.emit('loopChanged', loop);
    }

    setLoopPoints(start, end) {
        this.loopStart = start;
        this.loopEnd = end;
        this.emit('loopPointsChanged', { start, end });
    }

    setMarkersEnabled(enabled) {
        this.markersEnabled = enabled;
        this.emit('markersChanged', enabled);
    }

    setMarkerFrequency(frequency) {
        this.markerFrequency = frequency;
        this.emit('markerFrequencyChanged', frequency);
    }

    setView(view) {
        this.currentView = view;
        this.emit('viewChanged', view);
    }

    setStemsVisible(visible) {
        this.stemsVisible = visible;
        this.emit('stemsVisibilityChanged', visible);
    }

    setStemsData(data) {
        this.stemsData = data;
        this.emit('stemsDataChanged', data);
    }

    setEditLoopMode(enabled) {
        this.editLoopMode = enabled;
        this.emit('editLoopModeChanged', enabled);
    }

    setSeekOnClick(enabled) {
        this.seekOnClick = enabled;
        this.emit('seekOnClickChanged', enabled);
    }
}

export const state = new AppState();
