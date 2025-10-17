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

// Note: state.js doesn't export a 'state' object, it exports individual variables
// We don't need to import state here since we manage our own instance state
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
        // Note: HTML button starts with class="active", so markers are enabled by default
        this.markersEnabled = true;   // Match HTML button's initial "active" state
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
        this.setupWaveformClickHandler(); // Install click handler for snap-to-marker and cycle mode
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

        // Note: Don't bind markersBtn here - it already has onclick="toggleMarkers()" in HTML
        // which calls the window wrapper that delegates to this.toggleMarkers()
        // Adding another addEventListener would cause double-firing

        // Note: Don't bind markerFreqSelect here - it already has onchange="setMarkerFrequency(this.value)" in HTML
        // which calls the window wrapper that delegates to this.setMarkerFrequency()
        // Adding another addEventListener would cause double-firing

        // Note: Don't bind shift buttons here - they already have onclick="shiftBarStartLeft()" in HTML
        // which calls the window wrapper that delegates to this.shiftBarStartLeft()
        // Adding another addEventListener would cause double-firing
    }

    /**
     * Setup waveform click handler for snap-to-marker and cycle mode
     * This handler intercepts clicks on the waveform to provide:
     * 1. Snap-to-marker functionality (when markers enabled)
     * 2. Cycle mode loop point setting (when in cycle mode)
     */
    setupWaveformClickHandler() {
        // Only setup for parent player (not stems)
        if (this.playerType !== 'parent') {
            return;
        }

        const waveformContainer = document.getElementById('waveform');
        if (!waveformContainer) {
            console.warn(`[${this.getLogPrefix()}] Waveform container not found`);
            return;
        }

        // Remove old click handler if it exists
        if (waveformContainer._clickHandler) {
            waveformContainer.removeEventListener('click', waveformContainer._clickHandler, true);
        }

        // Create click handler with closure over component instance
        const clickHandler = (e) => {
            // Access global loop/cycle state from app.js
            // TODO: Move these into component state when refactoring loop controls
            const cycleMode = window.cycleMode || false;
            const seekOnClick = window.seekOnClick || false;

            // If markers are disabled AND not in cycle mode, let WaveSurfer handle click normally
            if (!this.markersEnabled || this.currentMarkers.length === 0) {
                // If cycle mode is ON, we still need to handle clicks even if markers are off
                if (!cycleMode) {
                    return; // Let WaveSurfer handle normal click (no snap, no loop setting)
                }
            }

            if (!this.waveform) return;

            // Get click position relative to waveform container
            const rect = waveformContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const relativeX = clickX / rect.width;

            // Calculate time at click position
            const duration = this.waveform.getDuration();
            const clickTime = relativeX * duration;

            // Find nearest marker to the left (or use exact click time if no markers)
            const snapTime = this.currentMarkers.length > 0
                ? this.findNearestMarkerToLeft(clickTime)
                : clickTime;

            // AUTO-SET LOOP POINTS (only if in cycle mode)
            if (cycleMode) {
                // CRITICAL: Stop event propagation BEFORE WaveSurfer handles it (unless seek mode is 'seek')
                if (seekOnClick !== 'seek') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }

                // Check if clicking left of loop start (reset start) or right of loop end (reset end)
                if (window.loopStart !== null && window.loopEnd !== null) {
                    if (snapTime < window.loopStart) {
                        // Clicking left of loop start: reset loop start
                        window.loopStart = snapTime;
                        console.log(`Loop start moved to ${snapTime.toFixed(2)}s ${seekOnClick === 'seek' ? '(seeking)' : '(NO PLAYBACK CHANGE)'}`);
                        if (window.updateLoopVisuals) window.updateLoopVisuals();
                        if (seekOnClick === 'seek') {
                            this.waveform.seekTo(snapTime / duration);
                        }
                        return false;
                    } else if (snapTime > window.loopEnd) {
                        // Clicking right of loop end: reset loop end
                        window.loopEnd = snapTime;
                        console.log(`Loop end moved to ${snapTime.toFixed(2)}s ${seekOnClick === 'seek' ? '(seeking)' : '(NO PLAYBACK CHANGE)'}`);
                        if (window.updateLoopVisuals) window.updateLoopVisuals();
                        if (seekOnClick === 'seek') {
                            this.waveform.seekTo(snapTime / duration);
                        }
                        return false;
                    }
                }

                // Normal loop setting flow
                let justSetLoopEnd = false;

                if (window.nextClickSets === 'start') {
                    window.loopStart = snapTime;
                    window.loopEnd = null;
                    window.nextClickSets = 'end';
                    console.log(`Loop start set to ${snapTime.toFixed(2)}s ${seekOnClick === 'seek' ? '(seeking)' : '(NO PLAYBACK CHANGE)'}`);
                    if (window.recordAction) {
                        window.recordAction('setLoopStart', { loopStart: snapTime });
                    }
                } else if (window.nextClickSets === 'end') {
                    if (snapTime <= window.loopStart) {
                        console.log('Loop end must be after loop start - ignoring click');
                        return;
                    }
                    window.loopEnd = snapTime;
                    window.cycleMode = true;
                    justSetLoopEnd = true;
                    console.log(`Loop end set to ${snapTime.toFixed(2)}s - Loop active! ${seekOnClick === 'clock' ? '(seeking to loop start)' : seekOnClick === 'seek' ? '(seeking)' : '(NO PLAYBACK CHANGE)'}`);
                    if (window.recordAction) {
                        window.recordAction('setLoopEnd', {
                            loopStart: window.loopStart,
                            loopEnd: snapTime,
                            loopDuration: snapTime - window.loopStart
                        });
                    }
                }

                if (window.updateLoopVisuals) window.updateLoopVisuals();

                // Handle seeking based on mode
                if (seekOnClick === 'seek') {
                    // Seek mode: jump to clicked position
                    this.waveform.seekTo(snapTime / duration);
                } else if (seekOnClick === 'clock' && justSetLoopEnd) {
                    // Clock mode: ONLY after setting loop end, jump to loop start
                    this.waveform.seekTo(window.loopStart / duration);
                }

                // Important: return early to prevent any seeking (if seekOnClick is off)
                return false;
            } else {
                // Normal mode: Markers enabled, not in cycle mode
                // Seek to the nearest marker and prevent WaveSurfer from handling
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.waveform.seekTo(snapTime / duration);
                console.log(`Snapped to marker at ${snapTime.toFixed(2)}s`);
                return false;
            }
        };

        // Add listener in CAPTURE phase to intercept before WaveSurfer's handler
        waveformContainer.addEventListener('click', clickHandler, true);
        waveformContainer._clickHandler = clickHandler; // Store reference for cleanup

        console.log(`[${this.getLogPrefix()}] Waveform click handler installed`);
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

        // CRITICAL: Sync markersEnabled to global variable for waveform click handler
        if (this.playerType === 'parent' && typeof window !== 'undefined' && window.updateMarkersEnabled) {
            window.updateMarkersEnabled(this.markersEnabled);
        }

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

            // CRITICAL: Sync empty markers to global array
            if (this.playerType === 'parent' && typeof window !== 'undefined' && window.updateCurrentMarkers) {
                window.updateCurrentMarkers([]);
            }
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

        // Debug: Log first few beats of original beatmap from Music.ai
        console.log(`[BEATMAP DEBUG] ===== ORIGINAL Music.ai beatmap (first 10 beats) =====`);
        file.beatmap.slice(0, 10).forEach((beat, idx) => {
            console.log(`  [${idx}] time: ${beat.time.toFixed(3)}s, beatNum: ${beat.beatNum}, barNumber: ${beat.barNumber || 'N/A'}`);
        });

        // Normalize beatmap (force first beat to be bar 1, beat 1)
        // This fixes issues where Music.ai thinks the first onset is beat 3
        // (because it detected the bar started earlier in silence)
        const normalizedBeatmap = file.beatmap.map((beat, index) => {
            if (index === 0) {
                // First beat is ALWAYS bar 1, beat 1
                return { ...beat, beatNum: 1, originalIndex: index };
            }
            return { ...beat, originalIndex: index };
        });

        console.log(`[BEATMAP DEBUG] ===== AFTER normalization (first 10 beats) =====`);
        normalizedBeatmap.slice(0, 10).forEach((beat, idx) => {
            console.log(`  [${idx}] time: ${beat.time.toFixed(3)}s, beatNum: ${beat.beatNum}, originalIndex: ${beat.originalIndex}`);
        });

        // Split barStartOffset into integer bars and fractional beats
        const barOffset = Math.floor(this.barStartOffset);
        const fractionalBeats = Math.round((this.barStartOffset - barOffset) * 4);

        console.log(`[SHIFT DEBUG] barStartOffset: ${this.barStartOffset}, barOffset: ${barOffset}, fractionalBeats: ${fractionalBeats}`);

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

        // Debug: Log first 3 beats after all transformations
        console.log(`[SHIFT DEBUG] First 3 beats after transformations:`, beatmapWithBars.slice(0, 3).map(b => ({
            time: b.time.toFixed(2),
            beatNum: b.beatNum,
            barNumber: b.barNumber,
            originalIndex: b.originalIndex
        })));

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

        // Debug: Show first 5 filtered beats that will be displayed
        console.log(`[SHIFT DEBUG] First 5 FILTERED beats (frequency=${this.markerFrequency}):`, filteredBeats.slice(0, 5).map(b => ({
            time: b.time.toFixed(2),
            beatNum: b.beatNum,
            barNumber: b.barNumber,
            isBar: b.beatNum === 1,
            isEmphasisBar: b.beatNum === 1 && b.barNumber % 4 === 1
        })));

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

        // CRITICAL: Sync instance markers to global array for app.js waveform click handler
        // This allows the cycle mode click handler in app.js to access marker data
        // TODO: Remove this once waveform click handling is moved into component
        if (this.playerType === 'parent' && typeof window !== 'undefined') {
            // Access the global currentMarkers array from app.js module scope
            // We'll expose a setter function to update it
            if (window.updateCurrentMarkers) {
                console.log(`[${this.getLogPrefix()}] Syncing ${this.currentMarkers.length} markers to global array`);
                window.updateCurrentMarkers(this.currentMarkers);
            } else {
                console.error(`[${this.getLogPrefix()}] window.updateCurrentMarkers is not defined!`);
            }
        }

        // Add hover preview for loop selection (only for parent player)
        if (this.playerType === 'parent') {
            this.setupHoverPreview(waveformContainer);
        }
    }

    /**
     * Setup hover preview handlers for cycle mode
     * Shows blue preview of loop region as you move mouse (before clicking to set end)
     */
    setupHoverPreview(waveformContainer) {
        const mousemoveHandler = (e) => {
            // Only show preview when in edit mode and start is set but end is not
            if (!window.cycleMode || window.loopStart === null || window.loopEnd !== null) {
                // Remove any existing preview
                const existingPreview = waveformContainer.querySelector('.loop-preview');
                if (existingPreview) existingPreview.remove();
                return;
            }

            if (!this.waveform || this.currentMarkers.length === 0) return;

            // Get mouse position
            const rect = waveformContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const relativeX = mouseX / rect.width;
            const duration = this.waveform.getDuration();
            const mouseTime = relativeX * duration;

            // Find nearest marker to the left
            const hoverSnapTime = this.findNearestMarkerToLeft(mouseTime);

            // Only show preview if hover position is after loop start
            if (hoverSnapTime <= window.loopStart) {
                const existingPreview = waveformContainer.querySelector('.loop-preview');
                if (existingPreview) existingPreview.remove();
                return;
            }

            // Remove existing preview
            const existingPreview = waveformContainer.querySelector('.loop-preview');
            if (existingPreview) existingPreview.remove();

            // Create new preview
            const startPercent = (window.loopStart / duration) * 100;
            const hoverPercent = (hoverSnapTime / duration) * 100;
            const widthPercent = hoverPercent - startPercent;

            const preview = document.createElement('div');
            preview.className = 'loop-preview';
            preview.style.left = `${startPercent}%`;
            preview.style.width = `${widthPercent}%`;
            waveformContainer.appendChild(preview);
        };

        const mouseoutHandler = () => {
            // Remove preview when mouse leaves waveform
            const existingPreview = waveformContainer.querySelector('.loop-preview');
            if (existingPreview) existingPreview.remove();
        };

        // Remove old handlers if they exist
        if (waveformContainer._mousemoveHandler) {
            waveformContainer.removeEventListener('mousemove', waveformContainer._mousemoveHandler);
        }
        if (waveformContainer._mouseoutHandler) {
            waveformContainer.removeEventListener('mouseout', waveformContainer._mouseoutHandler);
        }

        waveformContainer.addEventListener('mousemove', mousemoveHandler);
        waveformContainer.addEventListener('mouseout', mouseoutHandler);
        waveformContainer._mousemoveHandler = mousemoveHandler;
        waveformContainer._mouseoutHandler = mouseoutHandler;
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
    // TRANSPORT CONTROLS
    // ============================================

    setupTransportControls() {
        // Note: Transport controls have onclick handlers in HTML that call window wrappers
        // Window wrappers delegate to these component methods
        // No need to add addEventListener here to avoid double-firing
    }

    /**
     * Play/Pause toggle
     * Called from window.playPause() wrapper
     */
    playPause() {
        if (!this.waveform) {
            console.warn(`[${this.getLogPrefix()}] No waveform instance`);
            return;
        }

        this.waveform.playPause();

        // Update play/pause icon
        const icon = document.getElementById('playPauseIcon');
        if (icon) {
            icon.textContent = this.waveform.isPlaying() ? '⏸' : '▶';
        }

        console.log(`[${this.getLogPrefix()}] ${this.waveform.isPlaying() ? 'Playing' : 'Paused'}`);
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
