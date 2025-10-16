/**
 * playerTemplate.js
 * Template/Factory system for generating player controls
 *
 * Defines control schemas and generates HTML for parent and stem players
 * using a context-driven generation approach.
 */

/**
 * Control Definitions
 * Each control has:
 * - id: unique identifier
 * - type: 'button' | 'slider' | 'text' | 'container'
 * - showIn: ['parent', 'stem'] - which player types should show this control
 * - row: 'main' | 'rate' - which row the control belongs to
 * - order: number - sort order within the row
 * - htmlId: string or function(ctx) - DOM element ID
 * - tag: HTML tag name
 * - classes: string or function(ctx) - CSS classes
 * - innerHTML: string or function(ctx) - inner HTML content
 * - attributes: object or function(ctx) - additional HTML attributes
 *
 * Context object (ctx) contains:
 * - playerType: 'parent' | 'stem'
 * - stemType: 'vocals' | 'drums' | 'bass' | 'other' (only for stem players)
 */

export const controlDefinitions = {
    // ============================================
    // MAIN ROW CONTROLS
    // ============================================

    playPause: {
        id: 'playPause',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'main',
        order: 1,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'playPauseBtn'
            : `stem-play-pause-${ctx.stemType}`,
        tag: 'button',
        classes: (ctx) => ctx.playerType === 'parent'
            ? 'player-btn play-pause'
            : 'stem-player-btn play-pause',
        innerHTML: (ctx) => ctx.playerType === 'parent'
            ? '<span id="playPauseIcon">▶</span>'
            : '<span id="stem-play-pause-icon-' + ctx.stemType + '">||</span>',
        attributes: (ctx) => {
            const attrs = {
                onclick: ctx.playerType === 'parent'
                    ? 'playPause()'
                    : `toggleMultiStemPlay('${ctx.stemType}')`,
                title: 'Play/Pause'
            };
            return attrs;
        }
    },

    mute: {
        id: 'mute',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'main',
        order: 2,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'muteBtn'
            : `stem-mute-${ctx.stemType}`,
        tag: 'button',
        classes: (ctx) => ctx.playerType === 'parent'
            ? 'control-btn'
            : 'stem-player-btn',
        innerHTML: (ctx) => ctx.playerType === 'parent' ? '🔇 Mute' : '<span>🔊</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'toggleMute()'
                : `toggleMultiStemMute('${ctx.stemType}')`,
            title: 'Mute'
        })
    },

    loop: {
        id: 'loop',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'main',
        order: 3,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'loopBtn'
            : `stem-loop-${ctx.stemType}`,
        tag: 'button',
        classes: (ctx) => ctx.playerType === 'parent'
            ? 'control-btn'
            : 'stem-player-btn',
        innerHTML: () => '<span>LOOP</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'toggleLoop()'
                : `toggleMultiStemLoop('${ctx.stemType}')`,
            title: 'Loop'
        })
    },

    waveform: {
        id: 'waveform',
        type: 'container',
        showIn: ['parent', 'stem'],
        row: 'main',
        order: 10,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'waveform'
            : `multi-stem-waveform-${ctx.stemType}`,
        tag: 'div',
        classes: (ctx) => ctx.playerType === 'parent'
            ? ''
            : 'stem-player-waveform',
        innerHTML: () => '',
        attributes: (ctx) => ctx.playerType === 'parent' ? {
            style: 'flex: 1; height: 80px; border: 1px solid #333; cursor: pointer;'
        } : {}
    },

    volumeSlider: {
        id: 'volumeSlider',
        type: 'slider',
        showIn: ['parent', 'stem'],
        row: 'main',
        order: 20,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'volumeSlider'
            : `stem-volume-${ctx.stemType}`,
        tag: 'input',
        classes: () => '',
        innerHTML: () => '',
        attributes: (ctx) => ({
            type: 'range',
            min: '0',
            max: ctx.playerType === 'parent' ? '398' : '100',
            value: '100',
            style: ctx.playerType === 'parent'
                ? 'flex: 1; height: 4px; background: #444; border-radius: 2px; outline: none; cursor: pointer;'
                : '',
            oninput: ctx.playerType === 'parent'
                ? 'setVolume(this.value)'
                : `handleMultiStemVolumeChange('${ctx.stemType}', this.value)`,
            ondblclick: ctx.playerType === 'parent' ? 'resetVolume()' : undefined
        })
    },

    volumeDisplay: {
        id: 'volumeDisplay',
        type: 'text',
        showIn: ['parent', 'stem'],
        row: 'main',
        order: 21,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'volumePercent'
            : `stem-volume-percent-${ctx.stemType}`,
        tag: 'span',
        classes: () => '',
        innerHTML: (ctx) => ctx.playerType === 'parent'
            ? '100% (+0.0 dB)'
            : '100%',
        attributes: (ctx) => ctx.playerType === 'parent' ? {
            style: 'color: #999; font-size: 11px; min-width: 95px;'
        } : {
            style: 'color: #999; font-size: 10px; min-width: 40px;'
        }
    },

    fileName: {
        id: 'fileName',
        type: 'text',
        showIn: ['parent', 'stem'],
        row: 'main',
        order: 30,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'playerFilename'
            : null, // Stem player filename is not a single element, it's part of stem-player-filename div
        tag: 'div',
        classes: (ctx) => ctx.playerType === 'parent' ? 'player-filename' : 'stem-player-filename',
        innerHTML: (ctx) => ctx.playerType === 'parent'
            ? 'No file selected'
            : ctx.stemType.toUpperCase(),
        attributes: () => ({})
    },

    timeDisplay: {
        id: 'timeDisplay',
        type: 'text',
        showIn: ['parent', 'stem'],
        row: 'main',
        order: 31,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'playerTime'
            : `multi-stem-time-${ctx.stemType}`,
        tag: 'div',
        classes: (ctx) => ctx.playerType === 'parent' ? 'player-time' : 'stem-player-time',
        innerHTML: () => '0:00 / 0:00',
        attributes: () => ({})
    },

    // ============================================
    // RATE ROW CONTROLS
    // ============================================

    rateLock: {
        id: 'rateLock',
        type: 'button',
        showIn: ['stem'],
        row: 'rate',
        order: 1,
        htmlId: (ctx) => `stem-lock-${ctx.stemType}`,
        tag: 'button',
        classes: () => 'stem-lock-btn locked',
        innerHTML: () => '<span class="lock-icon">🔒</span><span class="lock-text">LOCK</span>',
        attributes: (ctx) => ({
            onclick: `toggleStemRateLock('${ctx.stemType}')`,
            title: 'Lock to Parent Rate'
        })
    },

    ratePreset05: {
        id: 'ratePreset05',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'rate',
        order: 10,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'ratePreset05'
            : null, // Stem rate presets don't have individual IDs
        tag: 'button',
        classes: (ctx) => ctx.playerType === 'parent'
            ? 'control-btn rate-preset-btn'
            : 'stem-rate-preset-btn',
        innerHTML: () => '0.5x',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'setPlaybackRate(0.5)'
                : `setStemRatePreset('${ctx.stemType}', 0.5)`,
            title: 'Half Speed'
        })
    },

    ratePreset1: {
        id: 'ratePreset1',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'rate',
        order: 11,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'ratePreset1'
            : null, // Stem rate presets don't have individual IDs
        tag: 'button',
        classes: (ctx) => ctx.playerType === 'parent'
            ? 'control-btn rate-preset-btn'
            : 'stem-rate-preset-btn',
        innerHTML: () => '1x',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'setPlaybackRate(1.0)'
                : `setStemRatePreset('${ctx.stemType}', 1.0)`,
            title: 'Normal Speed'
        })
    },

    ratePreset2: {
        id: 'ratePreset2',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'rate',
        order: 12,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'ratePreset2'
            : null, // Stem rate presets don't have individual IDs
        tag: 'button',
        classes: (ctx) => ctx.playerType === 'parent'
            ? 'control-btn rate-preset-btn'
            : 'stem-rate-preset-btn',
        innerHTML: () => '2x',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'setPlaybackRate(2.0)'
                : `setStemRatePreset('${ctx.stemType}', 2.0)`,
            title: 'Double Speed'
        })
    },

    rateSlider: {
        id: 'rateSlider',
        type: 'slider',
        showIn: ['parent', 'stem'],
        row: 'rate',
        order: 20,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'rateSlider'
            : `stem-rate-slider-${ctx.stemType}`,
        tag: 'input',
        classes: (ctx) => ctx.playerType === 'parent' ? '' : 'stem-rate-slider',
        innerHTML: () => '',
        attributes: (ctx) => ({
            type: 'range',
            min: ctx.playerType === 'parent' ? '0.025' : '50',
            max: ctx.playerType === 'parent' ? '4.0' : '200',
            step: ctx.playerType === 'parent' ? '0.025' : '1',
            value: ctx.playerType === 'parent' ? '1.0' : '100',
            style: ctx.playerType === 'parent'
                ? 'flex: 1; height: 4px; background: #444; border-radius: 2px; outline: none; cursor: pointer;'
                : '',
            oninput: ctx.playerType === 'parent'
                ? 'setPlaybackRate(parseFloat(this.value))'
                : `handleStemRateChange('${ctx.stemType}', this.value)`,
            ondblclick: ctx.playerType === 'parent' ? 'resetRate()' : undefined
        })
    },

    rateDisplay: {
        id: 'rateDisplay',
        type: 'text',
        showIn: ['parent', 'stem'],
        row: 'rate',
        order: 21,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'rateValue'
            : `stem-rate-display-${ctx.stemType}`,
        tag: 'span',
        classes: (ctx) => ctx.playerType === 'parent' ? '' : 'stem-rate-display',
        innerHTML: (ctx) => {
            if (ctx.playerType === 'parent') {
                return '1.0x';
            } else {
                // For stems, include BPM placeholder (will be updated dynamically)
                const initialRate = ctx.initialRate || 1.0;
                const initialBPM = ctx.initialBPM || '---';
                return `${initialRate.toFixed(2)}x @ ${initialBPM} BPM`;
            }
        },
        attributes: (ctx) => ({
            style: ctx.playerType === 'parent'
                ? 'color: #999; font-size: 11px; min-width: 35px; text-align: right;'
                : 'color: #999; font-size: 11px; min-width: 100px;'
        })
    },

    // ============================================
    // TRANSPORT CONTROLS (PARENT ONLY)
    // ============================================

    previousBtn: {
        id: 'previousBtn',
        type: 'button',
        showIn: ['parent'],
        row: 'transport',
        order: 1,
        htmlId: () => 'prevBtn',
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span>◄◄</span>',
        attributes: () => ({
            onclick: 'previousTrack()',
            title: 'Previous'
        })
    },

    nextBtn: {
        id: 'nextBtn',
        type: 'button',
        showIn: ['parent'],
        row: 'transport',
        order: 2,
        htmlId: () => 'nextBtn',
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span>►►</span>',
        attributes: () => ({
            onclick: 'nextTrack()',
            title: 'Next'
        })
    },

    shuffleBtn: {
        id: 'shuffleBtn',
        type: 'button',
        showIn: ['parent'],
        row: 'transport',
        order: 3,
        htmlId: () => 'shuffleBtn',
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span>SHFL</span>',
        attributes: () => ({
            onclick: 'toggleShuffle()',
            title: 'Shuffle'
        })
    },

    // ============================================
    // MARKER CONTROLS
    // ============================================

    markersBtn: {
        id: 'markersBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'markers',
        order: 1,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'markersBtn'
            : `stem-markers-btn-${ctx.stemType}`,
        tag: 'button',
        classes: (ctx) => ctx.playerType === 'parent'
            ? 'player-btn active'
            : 'stem-player-btn',
        innerHTML: () => '<span>MARKS</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'toggleMarkers()'
                : `toggleStemMarkers('${ctx.stemType}')`,
            title: 'Toggle markers (M)'
        })
    },

    markerFrequencySelect: {
        id: 'markerFrequencySelect',
        type: 'select',
        showIn: ['parent', 'stem'],
        row: 'markers',
        order: 2,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'markerFrequencySelect'
            : `stem-marker-freq-${ctx.stemType}`,
        tag: 'select',
        classes: () => '',
        innerHTML: () => `
            <option value="bar8">Every 8 bars</option>
            <option value="bar4">Every 4 bars</option>
            <option value="bar2">Every 2 bars</option>
            <option value="bar" selected>Every bar</option>
            <option value="halfbar">Half bar</option>
            <option value="beat">Every beat</option>
        `,
        attributes: (ctx) => ({
            onchange: ctx.playerType === 'parent'
                ? 'setMarkerFrequency(this.value)'
                : `setStemMarkerFrequency('${ctx.stemType}', this.value)`,
            style: 'background: #2a2a2a; color: #999; border: 1px solid #444; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; outline: none;'
        })
    },

    shiftLabel: {
        id: 'shiftLabel',
        type: 'text',
        showIn: ['parent', 'stem'],
        row: 'markers',
        order: 3,
        htmlId: () => null,
        tag: 'span',
        classes: () => '',
        innerHTML: () => 'Shift:',
        attributes: () => ({
            style: 'color: #999; font-size: 10px;'
        })
    },

    shiftStartLeft: {
        id: 'shiftStartLeft',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'markers',
        order: 4,
        htmlId: () => null,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '◀',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'shiftBarStartLeft()'
                : `shiftStemBarStartLeft('${ctx.stemType}')`,
            title: 'Shift bar 1 to previous marker',
            style: 'padding: 2px 8px; font-size: 11px;'
        })
    },

    barStartOffsetDisplay: {
        id: 'barStartOffsetDisplay',
        type: 'text',
        showIn: ['parent', 'stem'],
        row: 'markers',
        order: 5,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'barStartOffsetDisplay'
            : `stem-bar-offset-${ctx.stemType}`,
        tag: 'span',
        classes: () => '',
        innerHTML: () => '0',
        attributes: () => ({
            style: 'color: #999; font-size: 11px; min-width: 20px; text-align: center;'
        })
    },

    shiftStartRight: {
        id: 'shiftStartRight',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'markers',
        order: 6,
        htmlId: () => null,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '▶',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'shiftBarStartRight()'
                : `shiftStemBarStartRight('${ctx.stemType}')`,
            title: 'Shift bar 1 to next marker',
            style: 'padding: 2px 8px; font-size: 11px;'
        })
    },

    // ============================================
    // METRONOME CONTROLS
    // ============================================

    metronomeBtn: {
        id: 'metronomeBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'metronome',
        order: 1,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'metronomeBtn'
            : `stem-metronome-btn-${ctx.stemType}`,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 12px; line-height: 1;">⏱</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'toggleMetronome()'
                : `toggleStemMetronome('${ctx.stemType}')`,
            title: 'Metronome (K)',
            style: 'margin: 0;'
        })
    },

    metronomeSound: {
        id: 'metronomeSound',
        type: 'select',
        showIn: ['parent', 'stem'],
        row: 'metronome',
        order: 2,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'metronomeSound'
            : `stem-metronome-sound-${ctx.stemType}`,
        tag: 'select',
        classes: () => '',
        innerHTML: () => `
            <option value="click" selected>Clk</option>
            <option value="beep">Bep</option>
            <option value="wood">Wod</option>
            <option value="cowbell">Cow</option>
        `,
        attributes: (ctx) => ({
            onchange: ctx.playerType === 'parent'
                ? 'setMetronomeSound(this.value)'
                : `setStemMetronomeSound('${ctx.stemType}', this.value)`,
            style: 'background: #2a2a2a; color: #999; border: 1px solid #444; border-radius: 3px; padding: 1px 3px; font-size: 9px; cursor: pointer; outline: none; width: 40px; height: 16px;'
        })
    },

    // ============================================
    // CYCLE/LOOP CONTROLS
    // ============================================

    cycleBtn: {
        id: 'cycleBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'cycle',
        order: 1,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'cycleBtn'
            : `stem-cycle-btn-${ctx.stemType}`,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 10px;">CYCLE</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'toggleCycleMode()'
                : `toggleStemCycleMode('${ctx.stemType}')`,
            title: 'Toggle cycle mode - Sets and plays loop (C)'
        })
    },

    seekOnClickBtn: {
        id: 'seekOnClickBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'cycle',
        order: 2,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'seekOnClickBtn'
            : `stem-seek-btn-${ctx.stemType}`,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 9px;">SEEK</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'toggleSeekOnClick()'
                : `toggleStemSeekOnClick('${ctx.stemType}')`,
            title: 'Toggle seek when clicking in Edit mode',
            style: 'display: none;'
        })
    },

    clearLoopBtn: {
        id: 'clearLoopBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'cycle',
        order: 3,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'clearLoopBtn'
            : `stem-clear-btn-${ctx.stemType}`,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 9px;">CLEAR</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'clearLoopKeepCycle()'
                : `clearStemLoopKeepCycle('${ctx.stemType}')`,
            title: 'Clear loop points (keep cycle mode on)',
            style: 'display: none;'
        })
    },

    loopStatus: {
        id: 'loopStatus',
        type: 'text',
        showIn: ['parent', 'stem'],
        row: 'cycle',
        order: 4,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'loopStatus'
            : `stem-loop-status-${ctx.stemType}`,
        tag: 'span',
        classes: () => '',
        innerHTML: () => 'Off',
        attributes: () => ({
            style: 'color: #666; font-size: 10px; min-width: 90px;'
        })
    },

    expandLoopBtn: {
        id: 'expandLoopBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'cycle',
        order: 5,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'expandLoopBtn'
            : `stem-expand-loop-${ctx.stemType}`,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 10px;">▼</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'toggleLoopControlsExpanded()'
                : `toggleStemLoopControlsExpanded('${ctx.stemType}')`,
            title: 'Show/hide loop controls',
            style: 'display: none;'
        })
    },

    // ============================================
    // LOOP MANIPULATION CONTROLS (Collapsible)
    // ============================================

    shiftLoopLeftBtn: {
        id: 'shiftLoopLeftBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'loopManip',
        order: 1,
        htmlId: () => null,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 10px;">◄</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'shiftLoopLeft()'
                : `shiftStemLoopLeft('${ctx.stemType}')`,
            title: 'Shift loop left (←)'
        })
    },

    shiftLoopRightBtn: {
        id: 'shiftLoopRightBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'loopManip',
        order: 2,
        htmlId: () => null,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 10px;">►</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'shiftLoopRight()'
                : `shiftStemLoopRight('${ctx.stemType}')`,
            title: 'Shift loop right (→)'
        })
    },

    moveStartLeftBtn: {
        id: 'moveStartLeftBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'loopManip',
        order: 3,
        htmlId: () => null,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 9px;">◄S</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'moveStartLeft()'
                : `moveStemStartLeft('${ctx.stemType}')`,
            title: 'Expand left (◄S)'
        })
    },

    moveEndRightBtn: {
        id: 'moveEndRightBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'loopManip',
        order: 4,
        htmlId: () => null,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 9px;">E►</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'moveEndRight()'
                : `moveStemEndRight('${ctx.stemType}')`,
            title: 'Expand right (E►)'
        })
    },

    halfLengthBtn: {
        id: 'halfLengthBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'loopManip',
        order: 5,
        htmlId: () => null,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 10px;">½</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'halfLoopLength()'
                : `halfStemLoopLength('${ctx.stemType}')`,
            title: 'Half (↓)'
        })
    },

    doubleLengthBtn: {
        id: 'doubleLengthBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'loopManip',
        order: 6,
        htmlId: () => null,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 10px;">2×</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'doubleLoopLength()'
                : `doubleStemLoopLength('${ctx.stemType}')`,
            title: 'Double (↑)'
        })
    },

    jumpBtn: {
        id: 'jumpBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'loopManip',
        order: 7,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'jumpBtn'
            : `stem-jump-btn-${ctx.stemType}`,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 10px;">JMP</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'toggleImmediateJump()'
                : `toggleStemImmediateJump('${ctx.stemType}')`,
            title: 'Jump on shift (J)'
        })
    },

    fadeBtn: {
        id: 'fadeBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'loopManip',
        order: 8,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'fadeBtn'
            : `stem-fade-btn-${ctx.stemType}`,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 10px;">FADE</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'toggleLoopFades()'
                : `toggleStemLoopFades('${ctx.stemType}')`,
            title: 'Loop fades'
        })
    },

    fadeTimeSlider: {
        id: 'fadeTimeSlider',
        type: 'slider',
        showIn: ['parent', 'stem'],
        row: 'loopManip',
        order: 9,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'fadeTimeSlider'
            : `stem-fade-slider-${ctx.stemType}`,
        tag: 'input',
        classes: () => '',
        innerHTML: () => '',
        attributes: (ctx) => ({
            type: 'range',
            min: '1',
            max: '250',
            step: '1',
            value: '15',
            oninput: ctx.playerType === 'parent'
                ? 'setFadeTime(parseInt(this.value))'
                : `setStemFadeTime('${ctx.stemType}', parseInt(this.value))`,
            style: 'width: 60px; height: 3px; background: #444; border-radius: 2px; outline: none; cursor: pointer;'
        })
    },

    fadeTimeValue: {
        id: 'fadeTimeValue',
        type: 'text',
        showIn: ['parent', 'stem'],
        row: 'loopManip',
        order: 10,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'fadeTimeValue'
            : `stem-fade-value-${ctx.stemType}`,
        tag: 'span',
        classes: () => '',
        innerHTML: () => '15ms',
        attributes: () => ({
            style: 'color: #999; font-size: 9px; min-width: 28px;'
        })
    },

    preserveLoopBtn: {
        id: 'preserveLoopBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'loopManip',
        order: 11,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'preserveLoopBtn'
            : `stem-preserve-btn-${ctx.stemType}`,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 10px;">KEEP</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'togglePreserveLoop()'
                : `toggleStemPreserveLoop('${ctx.stemType}')`,
            title: 'Preserve loop when changing files'
        })
    },

    bpmLockBtn: {
        id: 'bpmLockBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'loopManip',
        order: 12,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'bpmLockBtn'
            : `stem-bpm-lock-${ctx.stemType}`,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 9px;">BPM LOCK</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'toggleBPMLock()'
                : `toggleStemBPMLock('${ctx.stemType}')`,
            title: 'Lock BPM across file changes (auto-adjust playback rate)'
        })
    },

    recordActionsBtn: {
        id: 'recordActionsBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'loopManip',
        order: 13,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'recordActionsBtn'
            : `stem-record-btn-${ctx.stemType}`,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 9px;">RECORD</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'toggleRecordActions()'
                : `toggleStemRecordActions('${ctx.stemType}')`,
            title: 'Record loop actions (waits for first keypress)'
        })
    },

    playActionsBtn: {
        id: 'playActionsBtn',
        type: 'button',
        showIn: ['parent', 'stem'],
        row: 'loopManip',
        order: 14,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'playActionsBtn'
            : `stem-play-actions-${ctx.stemType}`,
        tag: 'button',
        classes: () => 'player-btn',
        innerHTML: () => '<span style="font-size: 9px;">PLAY</span>',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'playRecordedActions()'
                : `playStemRecordedActions('${ctx.stemType}')`,
            title: 'Play back recorded actions'
        })
    }
};

/**
 * Generate HTML for a player (parent or stem)
 *
 * @param {string} playerType - 'parent' or 'stem'
 * @param {object} options - Configuration options
 * @param {string} options.stemType - For stem players: 'vocals' | 'drums' | 'bass' | 'other'
 * @returns {string} Generated HTML
 */
export function generatePlayerHTML(playerType, options = {}) {
    const ctx = {
        playerType,
        stemType: options.stemType || null
    };

    // Validate context
    if (playerType === 'stem' && !ctx.stemType) {
        throw new Error('stemType is required for stem players');
    }

    // Filter controls for this player type
    const applicableControls = Object.values(controlDefinitions)
        .filter(control => control.showIn.includes(playerType));

    // Group controls by row
    const mainRowControls = applicableControls
        .filter(c => c.row === 'main')
        .sort((a, b) => a.order - b.order);

    const rateRowControls = applicableControls
        .filter(c => c.row === 'rate')
        .sort((a, b) => a.order - b.order);

    // Generate HTML for controls
    function generateControlHTML(control) {
        const id = typeof control.htmlId === 'function'
            ? control.htmlId(ctx)
            : control.htmlId;

        const classes = typeof control.classes === 'function'
            ? control.classes(ctx)
            : control.classes;

        const innerHTML = typeof control.innerHTML === 'function'
            ? control.innerHTML(ctx)
            : control.innerHTML;

        const attributes = typeof control.attributes === 'function'
            ? control.attributes(ctx)
            : control.attributes;

        // Build attributes string (filter out undefined values)
        const attrsStr = Object.entries(attributes || {})
            .filter(([key, value]) => value !== undefined)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ');

        // Build ID attribute (only if id is not null)
        const idAttr = id ? `id="${id}"` : '';

        // Self-closing tags
        if (control.tag === 'input') {
            return `<${control.tag} ${idAttr} ${classes ? `class="${classes}"` : ''} ${attrsStr} />`.replace(/\s+/g, ' ').trim();
        }

        // Regular tags
        return `<${control.tag} ${idAttr} ${classes ? `class="${classes}"` : ''} ${attrsStr}>${innerHTML}</${control.tag}>`.replace(/\s+/g, ' ').trim();
    }

    // Build HTML
    let html = '';

    // Main row
    if (mainRowControls.length > 0) {
        html += '<div class="player-row">\n';
        mainRowControls.forEach(control => {
            html += '  ' + generateControlHTML(control) + '\n';
        });
        html += '</div>\n';
    }

    // Rate row
    if (rateRowControls.length > 0) {
        html += '<div class="player-row rate-row">\n';
        rateRowControls.forEach(control => {
            html += '  ' + generateControlHTML(control) + '\n';
        });
        html += '</div>\n';
    }

    return html;
}

/**
 * Get control definition by ID
 *
 * @param {string} controlId - Control identifier
 * @returns {object|null} Control definition or null if not found
 */
export function getControlDefinition(controlId) {
    return controlDefinitions[controlId] || null;
}

/**
 * Get all controls for a specific row
 *
 * @param {string} row - 'main' or 'rate'
 * @param {string} playerType - 'parent' or 'stem'
 * @returns {array} Array of control definitions
 */
export function getRowControls(row, playerType) {
    return Object.values(controlDefinitions)
        .filter(control =>
            control.row === row &&
            control.showIn.includes(playerType)
        )
        .sort((a, b) => a.order - b.order);
}

/**
 * Generate complete stem player bar HTML with proper container structure
 * This matches the exact structure used in app.js preloadMultiStemWavesurfers
 *
 * @param {string} stemType - 'vocals' | 'drums' | 'bass' | 'other'
 * @param {string} displayName - Display name for the stem
 * @param {number} initialRate - Initial playback rate (default: 1.0)
 * @param {string} initialBPM - Initial BPM display (default: '---')
 * @returns {string} Complete stem player bar HTML
 */
export function generateStemPlayerBar(stemType, displayName, initialRate = 1.0, initialBPM = '---') {
    const ctx = {
        playerType: 'stem',
        stemType,
        initialRate,
        initialBPM
    };

    // Get controls
    const mainControls = getRowControls('main', 'stem');
    const rateControls = getRowControls('rate', 'stem');

    // Generate control HTMLs
    function genControl(controlId) {
        const control = controlDefinitions[controlId];
        if (!control) return '';

        const id = typeof control.htmlId === 'function' ? control.htmlId(ctx) : control.htmlId;
        const classes = typeof control.classes === 'function' ? control.classes(ctx) : control.classes;
        const innerHTML = typeof control.innerHTML === 'function' ? control.innerHTML(ctx) : control.innerHTML;
        const attributes = typeof control.attributes === 'function' ? control.attributes(ctx) : control.attributes;

        const attrsStr = Object.entries(attributes || {})
            .filter(([key, value]) => value !== undefined)
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ');

        const idAttr = id ? `id="${id}"` : '';

        if (control.tag === 'input') {
            return `<${control.tag} ${idAttr} ${classes ? `class="${classes}"` : ''} ${attrsStr} />`.replace(/\s+/g, ' ').trim();
        }
        return `<${control.tag} ${idAttr} ${classes ? `class="${classes}"` : ''} ${attrsStr}>${innerHTML}</${control.tag}>`.replace(/\s+/g, ' ').trim();
    }

    // Build complete stem player bar HTML with ALL controls
    return `
        <div class="stem-player-bar" id="stem-player-${stemType}">
            <!-- Row 1: Waveform -->
            <div style="width: 100%; padding: 8px 12px; background: #0f0f0f; border-bottom: 1px solid #2a2a2a; position: relative;">
                ${genControl('waveform')}
            </div>

            <!-- Row 2: All Controls (matching parent player structure) -->
            <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; flex-wrap: nowrap; overflow-x: auto;">

                <!-- Play/Pause/Mute/Loop Controls with Volume underneath -->
                <div style="display: flex; flex-direction: column; gap: 4px; flex-shrink: 0;">
                    <div style="text-align: center;">
                        <span style="color: #999; font-size: 11px;">Controls:</span>
                    </div>
                    <div style="display: flex; gap: 12px; align-items: center;">
                        ${genControl('playPause')}
                        ${genControl('mute')}
                        ${genControl('loop')}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                        <span style="font-size: 10px;">🔊</span>
                        ${genControl('volumeSlider')}
                        ${genControl('volumeDisplay')}
                    </div>
                </div>

                <!-- Rate Controls with Lock -->
                <div style="display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; min-width: 240px;">
                    <div style="text-align: center;">
                        <span style="color: #999; font-size: 11px;">Rate:</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${genControl('rateLock')}
                        ${genControl('ratePreset05')}
                        ${genControl('ratePreset1')}
                        ${genControl('ratePreset2')}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                        ${genControl('rateSlider')}
                        ${genControl('rateDisplay')}
                    </div>
                </div>

                <!-- File Info -->
                <div style="display: flex; flex-direction: column; gap: 4px; min-width: 200px; max-width: 300px; flex-shrink: 0;">
                    <div style="color: #fff; font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayName}</div>
                    ${genControl('timeDisplay')}
                </div>

                <!-- Marker Controls -->
                <div style="display: flex; align-items: center; gap: 8px; padding: 0 12px; border-left: 1px solid #333;">
                    ${genControl('markersBtn')}
                    ${genControl('markerFrequencySelect')}
                    <div style="display: flex; align-items: center; gap: 4px; border-left: 1px solid #333; padding-left: 8px;">
                        ${genControl('shiftLabel')}
                        ${genControl('shiftStartLeft')}
                        ${genControl('barStartOffsetDisplay')}
                        ${genControl('shiftStartRight')}
                    </div>
                </div>

                <!-- Metronome Controls -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 0 6px; border-left: 1px solid #333;">
                    ${genControl('metronomeBtn')}
                    ${genControl('metronomeSound')}
                </div>

                <!-- Cycle/Loop Controls -->
                <div style="display: flex; align-items: center; gap: 8px; padding: 0 12px; border-left: 1px solid #333;">
                    ${genControl('cycleBtn')}
                    ${genControl('seekOnClickBtn')}
                    ${genControl('clearLoopBtn')}
                    ${genControl('loopStatus')}
                    ${genControl('expandLoopBtn')}

                    <!-- Loop Manipulation Buttons (Collapsible) -->
                    <div id="stem-loop-controls-${stemType}" style="display: none; align-items: center; gap: 6px;">
                        ${genControl('shiftLoopLeftBtn')}
                        ${genControl('shiftLoopRightBtn')}
                        ${genControl('moveStartLeftBtn')}
                        ${genControl('moveEndRightBtn')}
                        ${genControl('halfLengthBtn')}
                        ${genControl('doubleLengthBtn')}
                        ${genControl('jumpBtn')}
                        ${genControl('fadeBtn')}
                        <div style="display: flex; align-items: center; gap: 4px;">
                            ${genControl('fadeTimeSlider')}
                            ${genControl('fadeTimeValue')}
                        </div>
                        ${genControl('preserveLoopBtn')}
                        ${genControl('bpmLockBtn')}
                        ${genControl('recordActionsBtn')}
                        ${genControl('playActionsBtn')}
                    </div>
                </div>

            </div>
        </div>
    `.trim();
}
