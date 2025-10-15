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

    // Build complete stem player bar HTML
    return `
        <div class="stem-player-bar" id="stem-player-${stemType}">
            <!-- Top Row: Play/Mute/Loop + Waveform + Info + Volume -->
            <div class="stem-player-main-row">
                <div class="stem-player-controls">
                    ${genControl('playPause')}
                    ${genControl('mute')}
                    ${genControl('loop')}
                </div>

                ${genControl('waveform')}

                <div class="stem-player-info">
                    <div class="stem-player-filename">${displayName}</div>
                    ${genControl('timeDisplay')}
                </div>

                <div class="stem-player-volume">
                    <span>🔊</span>
                    ${genControl('volumeSlider')}
                    ${genControl('volumeDisplay')}
                </div>
            </div>

            <!-- Bottom Row: Rate Controls -->
            <div class="stem-player-rate-row">
                <!-- Lock Toggle Button -->
                ${genControl('rateLock')}

                <!-- Rate Preset Buttons -->
                <div class="stem-rate-presets">
                    ${genControl('ratePreset05')}
                    ${genControl('ratePreset1')}
                    ${genControl('ratePreset2')}
                </div>

                <!-- Rate Slider with Label -->
                <div class="stem-rate-control">
                    <label class="stem-rate-label">Rate:</label>
                    ${genControl('rateSlider')}
                    ${genControl('rateDisplay')}
                </div>
            </div>
        </div>
    `.trim();
}
