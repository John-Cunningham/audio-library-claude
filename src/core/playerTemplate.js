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
            : 'stem-control-btn',
        innerHTML: (ctx) => ctx.playerType === 'parent'
            ? '<span id="playPauseIcon">▶</span>'
            : '▶',
        attributes: (ctx) => {
            const attrs = {
                onclick: ctx.playerType === 'parent'
                    ? 'playPause()'
                    : `toggleStemPlayPause('${ctx.stemType}')`,
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
            : 'stem-control-btn',
        innerHTML: () => '🔇 Mute',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'toggleMute()'
                : `toggleStemMute('${ctx.stemType}')`
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
            : 'stem-control-btn',
        innerHTML: () => '🔁 Loop',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'toggleLoop()'
                : `toggleStemLoop('${ctx.stemType}')`
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
            : `stem-waveform-${ctx.stemType}`,
        tag: 'div',
        classes: (ctx) => ctx.playerType === 'parent'
            ? ''
            : 'stem-waveform',
        innerHTML: () => '',
        attributes: (ctx) => ctx.playerType === 'parent' ? {
            style: 'flex: 1; height: 80px; border: 1px solid #333; cursor: pointer;'
        } : {
            style: 'flex: 1; height: 50px; border: 1px solid #444; cursor: pointer;'
        }
    },

    volumeSlider: {
        id: 'volumeSlider',
        type: 'slider',
        showIn: ['parent', 'stem'],
        row: 'main',
        order: 20,
        htmlId: (ctx) => ctx.playerType === 'parent'
            ? 'volumeSlider'
            : `stem-volume-slider-${ctx.stemType}`,
        tag: 'input',
        classes: () => '',
        innerHTML: () => '',
        attributes: (ctx) => ({
            type: 'range',
            min: '0',
            max: '398',
            value: '100',
            style: ctx.playerType === 'parent'
                ? 'flex: 1; height: 4px; background: #444; border-radius: 2px; outline: none; cursor: pointer;'
                : 'width: 80px;',
            oninput: ctx.playerType === 'parent'
                ? 'setVolume(this.value)'
                : `changeStemVolume('${ctx.stemType}', this.value)`,
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
            : `stem-file-name-${ctx.stemType}`,
        tag: 'div',
        classes: (ctx) => ctx.playerType === 'parent' ? 'player-filename' : '',
        innerHTML: (ctx) => ctx.playerType === 'parent'
            ? 'No file selected'
            : ctx.stemType.toUpperCase(),
        attributes: () => ({})
    },

    timeDisplay: {
        id: 'timeDisplay',
        type: 'text',
        showIn: ['parent'],
        row: 'main',
        order: 31,
        htmlId: () => 'playerTime',
        tag: 'div',
        classes: () => 'player-time',
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
        htmlId: (ctx) => `stem-rate-lock-${ctx.stemType}`,
        tag: 'button',
        classes: () => 'stem-control-btn stem-rate-lock-btn',
        innerHTML: () => '🔒',
        attributes: (ctx) => ({
            onclick: `toggleStemRateLock('${ctx.stemType}')`,
            title: 'Lock/Unlock playback rate'
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
            : `stem-rate-preset-05-${ctx.stemType}`,
        tag: 'button',
        classes: (ctx) => ctx.playerType === 'parent'
            ? 'control-btn rate-preset-btn'
            : 'stem-control-btn stem-rate-preset-btn',
        innerHTML: () => '0.5x',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'setPlaybackRate(0.5)'
                : `setStemPlaybackRate('${ctx.stemType}', 0.5)`
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
            : `stem-rate-preset-1-${ctx.stemType}`,
        tag: 'button',
        classes: (ctx) => ctx.playerType === 'parent'
            ? 'control-btn rate-preset-btn'
            : 'stem-control-btn stem-rate-preset-btn',
        innerHTML: () => '1x',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'setPlaybackRate(1.0)'
                : `setStemPlaybackRate('${ctx.stemType}', 1.0)`
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
            : `stem-rate-preset-2-${ctx.stemType}`,
        tag: 'button',
        classes: (ctx) => ctx.playerType === 'parent'
            ? 'control-btn rate-preset-btn'
            : 'stem-control-btn stem-rate-preset-btn',
        innerHTML: () => '2x',
        attributes: (ctx) => ({
            onclick: ctx.playerType === 'parent'
                ? 'setPlaybackRate(2.0)'
                : `setStemPlaybackRate('${ctx.stemType}', 2.0)`
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
        classes: () => '',
        innerHTML: () => '',
        attributes: (ctx) => ({
            type: 'range',
            min: ctx.playerType === 'parent' ? '0.025' : '0.25',
            max: ctx.playerType === 'parent' ? '4.0' : '2.0',
            step: ctx.playerType === 'parent' ? '0.025' : '0.01',
            value: '1.0',
            style: ctx.playerType === 'parent'
                ? 'flex: 1; height: 4px; background: #444; border-radius: 2px; outline: none; cursor: pointer;'
                : 'width: 120px;',
            oninput: ctx.playerType === 'parent'
                ? 'setPlaybackRate(parseFloat(this.value))'
                : `changeStemPlaybackRate('${ctx.stemType}', this.value)`,
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
        classes: () => '',
        innerHTML: (ctx) => ctx.playerType === 'parent'
            ? '1.0x'
            : '1.00x',
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

        // Build attributes string
        const attrsStr = Object.entries(attributes || {})
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ');

        // Self-closing tags
        if (control.tag === 'input') {
            return `<${control.tag} id="${id}" ${classes ? `class="${classes}"` : ''} ${attrsStr} />`;
        }

        // Regular tags
        return `<${control.tag} id="${id}" ${classes ? `class="${classes}"` : ''} ${attrsStr}>${innerHTML}</${control.tag}>`;
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
