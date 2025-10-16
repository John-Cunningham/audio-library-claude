/**
 * PlayerBarComponent - Reusable player control component
 * Can be instantiated for parent player OR stem players
 *
 * Usage:
 *   const parentPlayer = new PlayerBarComponent({
 *     playerType: 'parent',
 *     waveform: parentWaveform
 *   });
 *
 *   const vocalsPlayer = new PlayerBarComponent({
 *     playerType: 'stem',
 *     stemType: 'vocals',
 *     waveform: vocalsWaveform
 *   });
 */

import { state } from '../core/state.js';
import { formatTime } from '../utils/formatting.js';

export class PlayerBarComponent {
    constructor(options = {}) {
        // Configuration
        this.playerType = options.playerType; // 'parent' or 'stem'
        this.stemType = options.stemType;     // 'vocals', 'drums', 'bass', 'other' (required if stem)
        this.waveform = options.waveform;     // WaveformComponent instance
        this.container = options.container;   // Optional: container element for rendering HTML
        this.currentFile = null;              // Current audio file object

        // Validate configuration
        if (this.playerType === 'stem' && !this.stemType) {
            throw new Error('stemType is required for stem players');
        }

        // Loop/Cycle State
        this.loopStart = null;
        this.loopEnd = null;
        this.cycleMode = false;
        this.nextClickSets = 'start';
        this.seekOnClick = false;
        this.loopControlsExpanded = false;

        // Marker State (per-instance)
        this.markersEnabled = false;
        this.markerFrequency = 'bar'; // 'bar8', 'bar4', 'bar2', 'bar', 'halfbar', 'beat'
        this.barStartOffset = 0;      // Bar number shift (can be fractional: 2.75 = 2 bars + 3 beats)
        this.currentMarkers = [];     // Array of marker times in seconds

        // Metronome State
        this.metronomeEnabled = false;
        this.metronomeSound = 'click';

        // Rate/Volume State
        this.rate = 1.0;
        this.volume = 1.0;
        this.muted = false;

        console.log(`[PlayerBarComponent] Created ${this.playerType}${this.stemType ? ' (' + this.stemType + ')' : ''} player`);
    }

    /**
     * Initialize the player component
     * Binds all event handlers to DOM elements
     */
    init() {
        console.log(`[PlayerBarComponent] Initializing ${this.playerType}${this.stemType ? ' (' + this.stemType + ')' : ''} player`);

        // Bind all control event handlers
        this.setupMarkerControls();
        this.setupTransportControls();
        this.setupRateControls();
        this.setupVolumeControls();
        this.setupLoopControls();
        this.setupMetronomeControls();

        // Listen for waveform events (if waveform exists)
        if (this.waveform) {
            // These would come from waveform component
            // For now, placeholder
        }

        console.log(`[PlayerBarComponent] ${this.playerType}${this.stemType ? ' (' + this.stemType + ')' : ''} player initialized`);
    }

    // ============================================
    // MARKER CONTROLS
    // ============================================

    setupMarkerControls() {
        // Get element IDs based on player type
        const markersBtnId = this.playerType === 'parent'
            ? 'markersBtn'
            : `stem-markers-btn-${this.stemType}`;

        const markerFreqId = this.playerType === 'parent'
            ? 'markerFrequencySelect'
            : `stem-marker-freq-${this.stemType}`;

        const shiftLeftBtnId = this.playerType === 'parent'
            ? 'shiftBarStartLeftBtn'  // This might not exist yet, need to check template
            : `stem-shift-left-${this.stemType}`;

        const shiftRightBtnId = this.playerType === 'parent'
            ? 'shiftBarStartRightBtn'
            : `stem-shift-right-${this.stemType}`;

        const barOffsetDisplayId = this.playerType === 'parent'
            ? 'barStartOffsetDisplay'
            : `stem-bar-offset-${this.stemType}`;

        // Bind markers toggle button
        const markersBtn = document.getElementById(markersBtnId);
        if (markersBtn) {
            markersBtn.addEventListener('click', () => this.toggleMarkers());
        }

        // Bind marker frequency selector
        const markerFreqSelect = document.getElementById(markerFreqId);
        if (markerFreqSelect) {
            markerFreqSelect.addEventListener('change', (e) => this.setMarkerFrequency(e.target.value));
        }

        // Bind shift left button (using template's existing onclick or adding listener)
        const shiftLeftBtn = this.getShiftLeftButton();
        if (shiftLeftBtn) {
            shiftLeftBtn.addEventListener('click', () => this.shiftBarStartLeft());
        }

        // Bind shift right button
        const shiftRightBtn = this.getShiftRightButton();
        if (shiftRightBtn) {
            shiftRightBtn.addEventListener('click', () => this.shiftBarStartRight());
        }
    }

    /**
     * Get shift left button from template-generated HTML
     * The template uses onclick, so we need to find by looking for the button with that onclick
     */
    getShiftLeftButton() {
        if (this.playerType === 'parent') {
            // Find button with onclick="shiftBarStartLeft()"
            const buttons = document.querySelectorAll('button');
            for (let btn of buttons) {
                if (btn.getAttribute('onclick') === 'shiftBarStartLeft()') {
                    return btn;
                }
            }
        } else {
            // Find button with onclick="shiftStemBarStartLeft('vocals')" etc
            const buttons = document.querySelectorAll('button');
            for (let btn of buttons) {
                if (btn.getAttribute('onclick') === `shiftStemBarStartLeft('${this.stemType}')`) {
                    return btn;
                }
            }
        }
        return null;
    }

    /**
     * Get shift right button from template-generated HTML
     */
    getShiftRightButton() {
        if (this.playerType === 'parent') {
            const buttons = document.querySelectorAll('button');
            for (let btn of buttons) {
                if (btn.getAttribute('onclick') === 'shiftBarStartRight()') {
                    return btn;
                }
            }
        } else {
            const buttons = document.querySelectorAll('button');
            for (let btn of buttons) {
                if (btn.getAttribute('onclick') === `shiftStemBarStartRight('${this.stemType}')`) {
                    return btn;
                }
            }
        }
        return null;
    }

    /**
     * Toggle bar markers on/off
     */
    toggleMarkers() {
        this.markersEnabled = !this.markersEnabled;
        console.log(`[${this.getLogPrefix()}] Bar markers: ${this.markersEnabled ? 'ON' : 'OFF'}`);

        // Update button state
        const btnId = this.playerType === 'parent' ? 'markersBtn' : `stem-markers-btn-${this.stemType}`;
        const btn = document.getElementById(btnId);
        if (btn) {
            if (this.markersEnabled) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }

        // Re-render markers (or clear them)
        if (this.currentFile) {
            this.addBarMarkers(this.currentFile);
        }
    }

    /**
     * Set marker frequency (bar8, bar4, bar2, bar, halfbar, beat)
     */
    setMarkerFrequency(freq) {
        this.markerFrequency = freq;
        console.log(`[${this.getLogPrefix()}] Marker frequency: ${freq}`);

        // Re-render current file's markers
        if (this.currentFile) {
            this.addBarMarkers(this.currentFile);
        }
    }

    /**
     * Get shift increment based on marker frequency
     */
    getShiftIncrement() {
        switch (this.markerFrequency) {
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
     * Shift bar start left
     */
    shiftBarStartLeft() {
        const increment = this.getShiftIncrement();
        this.barStartOffset -= increment;
        console.log(`[${this.getLogPrefix()}] Bar start offset: ${this.barStartOffset} (shifted by -${increment})`);

        // Update display
        const displayId = this.playerType === 'parent'
            ? 'barStartOffsetDisplay'
            : `stem-bar-offset-${this.stemType}`;
        const display = document.getElementById(displayId);
        if (display) {
            display.textContent = this.barStartOffset.toFixed(2).replace(/\.?0+$/, '');
        }

        // Re-render markers
        if (this.currentFile) {
            this.addBarMarkers(this.currentFile);
        }
    }

    /**
     * Shift bar start right
     */
    shiftBarStartRight() {
        const increment = this.getShiftIncrement();
        this.barStartOffset += increment;
        console.log(`[${this.getLogPrefix()}] Bar start offset: ${this.barStartOffset} (shifted by +${increment})`);

        // Update display
        const displayId = this.playerType === 'parent'
            ? 'barStartOffsetDisplay'
            : `stem-bar-offset-${this.stemType}`;
        const display = document.getElementById(displayId);
        if (display) {
            display.textContent = this.barStartOffset.toFixed(2).replace(/\.?0+$/, '');
        }

        // Re-render markers
        if (this.currentFile) {
            this.addBarMarkers(this.currentFile);
        }
    }

    /**
     * Add bar markers to waveform
     * Adapted from app.js addBarMarkers() and addStemBarMarkers()
     */
    addBarMarkers(file) {
        // Get waveform container based on player type
        const waveformContainerId = this.playerType === 'parent'
            ? 'waveform'
            : `multi-stem-waveform-${this.stemType}`;

        const waveformContainer = document.getElementById(waveformContainerId);
        if (!waveformContainer) {
            console.warn(`[${this.getLogPrefix()}] Waveform container not found: ${waveformContainerId}`);
            return;
        }

        // Get wavesurfer instance (parent or stem)
        const ws = this.waveform; // This should be the wavesurfer instance
        if (!ws) {
            console.warn(`[${this.getLogPrefix()}] Waveform instance not found`);
            return;
        }

        // Don't add markers if disabled or no beatmap data
        if (!this.markersEnabled || !file.beatmap) {
            // Clear any existing markers if disabled
            const existingContainer = waveformContainer.querySelector('.marker-container');
            if (existingContainer) existingContainer.remove();
            this.currentMarkers = [];
            return;
        }

        // Get the duration to calculate marker positions
        const duration = ws.getDuration();
        if (!duration) return;

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
        this.currentMarkers = [];

        // Marker container fills the full width
        markerContainer.style.width = '100%';

        // Normalize beatmap (force first beat to be bar 1, beat 1)
        const normalizedBeatmap = file.beatmap.map((beat, index) => {
            if (index === 0) {
                return { ...beat, beatNum: 1, originalIndex: index };
            }
            return { ...beat, originalIndex: index };
        });

        // Split barStartOffset into integer bars and fractional beats
        const barOffset = Math.floor(this.barStartOffset);
        const fractionalBeats = Math.round((this.barStartOffset - barOffset) * 4);

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
        switch (this.markerFrequency) {
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

        console.log(`[${this.getLogPrefix()}] Adding ${filteredBeats.length} markers (frequency: ${this.markerFrequency}, barOffset: ${barOffset}, beatOffset: ${fractionalBeats})`);

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
            this.currentMarkers.push(beat.time);
        });
    }

    /**
     * Find nearest marker to the left of click time
     */
    findNearestMarkerToLeft(clickTime) {
        if (this.currentMarkers.length === 0) return clickTime;

        let nearestMarker = 0;
        for (let markerTime of this.currentMarkers) {
            if (markerTime <= clickTime && markerTime > nearestMarker) {
                nearestMarker = markerTime;
            }
        }

        return nearestMarker;
    }

    /**
     * Load a file into this player
     */
    loadFile(file) {
        this.currentFile = file;

        // Add markers if enabled
        if (this.markersEnabled && file.beatmap) {
            this.addBarMarkers(file);
        }
    }

    // ============================================
    // TRANSPORT CONTROLS (PLACEHOLDER)
    // ============================================

    setupTransportControls() {
        // TODO: Implement transport controls (play, pause, prev, next)
        // These are mostly parent-only
    }

    // ============================================
    // RATE CONTROLS (PLACEHOLDER)
    // ============================================

    setupRateControls() {
        // TODO: Implement rate controls
    }

    // ============================================
    // VOLUME CONTROLS (PLACEHOLDER)
    // ============================================

    setupVolumeControls() {
        // TODO: Implement volume controls
    }

    // ============================================
    // LOOP CONTROLS (PLACEHOLDER)
    // ============================================

    setupLoopControls() {
        // TODO: Implement loop/cycle controls
    }

    // ============================================
    // METRONOME CONTROLS (PLACEHOLDER)
    // ============================================

    setupMetronomeControls() {
        // TODO: Implement metronome controls
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Get logging prefix for console messages
     */
    getLogPrefix() {
        if (this.playerType === 'parent') {
            return 'Parent';
        } else {
            return this.stemType;
        }
    }
}
