// === CORE UTILITIES MODULE ===
// Pure helper functions with no external dependencies
// Safe to integrate first

/**
 * Generates a deterministic pseudo-random number from a seed
 * Used to ensure consistent particle positions across renders
 * @param {number} seed - The seed value for random generation
 * @returns {number} A pseudo-random number between 0 and 1
 * @example
 * const random = seededRandom(12345); // Always returns same value for same seed
 * const x = seededRandom(fileIndex * 3 + 1) * 100; // Consistent position
 */
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

/**
 * Creates a texture for particle sprites using HTML Canvas
 * Supports multiple shapes with smooth alpha gradients for visual quality
 * @param {string} shape - Shape type: 'circle', 'square', 'disc', or 'ring'
 * @returns {THREE.CanvasTexture} Three.js texture ready for use in materials
 * @example
 * const texture = createParticleTexture('circle');
 * const material = new THREE.MeshBasicMaterial({ map: texture });
 */
function createParticleTexture(shape) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d', { alpha: true });
    const centerX = 64;
    const centerY = 64;

    // Ensure transparent background
    ctx.clearRect(0, 0, 128, 128);

    switch(shape) {
        case 'circle':
            // Soft circle with gradient - smooth falloff to transparent
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'square':
            // Square with gradient fade
            const sqGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50);
            sqGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            sqGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.5)');
            sqGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = sqGradient;
            ctx.fillRect(14, 14, 100, 100);
            break;

        case 'disc':
            // Hard-edged circle with soft outer edge
            const discGradient = ctx.createRadialGradient(centerX, centerY, 45, centerX, centerY, 58);
            discGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            discGradient.addColorStop(0.8, 'rgba(255, 255, 255, 1)');
            discGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = discGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 58, 0, Math.PI * 2);
            ctx.fill();
            break;

        case 'ring':
            // Ring/donut shape with soft edges
            const ringGradient = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, 58);
            ringGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            ringGradient.addColorStop(0.3, 'rgba(255, 255, 255, 1)');
            ringGradient.addColorStop(0.7, 'rgba(255, 255, 255, 1)');
            ringGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = ringGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 58, 0, Math.PI * 2);
            ctx.fill();
            // Cut out center to create donut
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            break;

        default:
            // Default to circle if unknown shape
            const defaultGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60);
            defaultGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            defaultGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = defaultGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
            ctx.fill();
    }

    // THREE.CanvasTexture is required - ensure THREE is loaded
    if (typeof THREE !== 'undefined') {
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    } else {
        console.warn('THREE.js not loaded, returning canvas element instead');
        return canvas;
    }
}

/**
 * Formats time in seconds to MM:SS display format
 * @param {number} seconds - Time in seconds to format
 * @returns {string} Formatted time string as "M:SS" or "MM:SS"
 * @example
 * formatTime(65);    // Returns "1:05"
 * formatTime(3661);  // Returns "61:01"
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Converts HSL color values to RGB hex string
 * Useful for converting hue-based colors to Three.js compatible format
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-1)
 * @param {number} l - Lightness (0-1)
 * @returns {string} Hex color string like "#ff0000"
 * @example
 * const hexColor = hslToHex(180, 0.5, 0.5); // Returns "#40bfbf" (cyan)
 */
function hslToHex(h, s, l) {
    h = h / 360; // Normalize hue to 0-1
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h * 12) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Maps a value from one range to another (linear interpolation)
 * Useful for converting file properties to 3D coordinates
 * @param {number} value - Input value to map
 * @param {number} inMin - Minimum of input range
 * @param {number} inMax - Maximum of input range
 * @param {number} outMin - Minimum of output range
 * @param {number} outMax - Maximum of output range
 * @returns {number} Mapped value in output range
 * @example
 * const x = mapRange(120, 60, 180, -100, 100); // Maps BPM to position
 */
function mapRange(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Clamps a value between min and max bounds
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped value
 * @example
 * clamp(150, 0, 100);  // Returns 100
 * clamp(-10, 0, 100);  // Returns 0
 * clamp(50, 0, 100);   // Returns 50
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Simple hash function for strings (for consistent tag-based positioning)
 * Generates a deterministic number from a string
 * @param {string} str - String to hash
 * @returns {number} Hash value between 0 and 1
 * @example
 * const position = hashString("drums") * 100; // Consistent position for tag
 */
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    // Normalize to 0-1 range
    return Math.abs(hash) / 2147483647;
}

/**
 * Linearly interpolates between two values
 * @param {number} a - Start value
 * @param {number} b - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 * @example
 * lerp(0, 100, 0.5);   // Returns 50
 * lerp(10, 20, 0.25);  // Returns 12.5
 */
function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Smoothly interpolates using cubic easing (ease-in-out)
 * @param {number} t - Progress value (0-1)
 * @returns {number} Eased value (0-1)
 * @example
 * const eased = smoothstep(0.5); // Returns 0.5 with smooth acceleration/deceleration
 */
function smoothstep(t) {
    return t * t * (3 - 2 * t);
}

/**
 * Gets a key value from musical key notation
 * Converts musical key names to numeric values for positioning
 * @param {string} key - Musical key like "C", "F#maj", "Dmin"
 * @returns {number} Numeric value 0-11 representing the key
 * @example
 * getKeyValue("C");      // Returns 0
 * getKeyValue("F#maj");  // Returns 6
 * getKeyValue("Amin");   // Returns 9
 */
function getKeyValue(key) {
    if (!key) return 0;
    const keyMap = {
        'C': 0, 'C#': 1, 'Db': 1,
        'D': 2, 'D#': 3, 'Eb': 3,
        'E': 4, 'Fb': 4,
        'F': 5, 'F#': 6, 'Gb': 6,
        'G': 7, 'G#': 8, 'Ab': 8,
        'A': 9, 'A#': 10, 'Bb': 10,
        'B': 11, 'Cb': 11
    };
    // Remove mode indicators (maj/min) and get base key
    const keyName = key.split('/')[0]
        .replace('maj', '')
        .replace('min', '')
        .replace('m', '')
        .trim();
    return keyMap[keyName] || 0;
}

// Export for module usage (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        seededRandom,
        createParticleTexture,
        formatTime,
        hslToHex,
        mapRange,
        clamp,
        hashString,
        lerp,
        smoothstep,
        getKeyValue
    };
}

// Example usage demonstrations:
/*
// 1. Creating consistent random positions for particles
const fileIndex = 5;
const x = seededRandom(fileIndex * 3 + 1) * 200 - 100; // -100 to 100
const y = seededRandom(fileIndex * 3 + 2) * 200 - 100;
const z = seededRandom(fileIndex * 3 + 3) * 200 - 100;

// 2. Creating particle textures
const circleTexture = createParticleTexture('circle');
const ringTexture = createParticleTexture('ring');

// 3. Formatting playback time
const currentTime = 125.5; // seconds
console.log(formatTime(currentTime)); // "2:05"

// 4. Converting musical properties to positions
const bpm = 128;
const xPos = mapRange(bpm, 60, 180, -100, 100); // Map BPM to X coordinate

// 5. Getting consistent positions from tags
const tagHash = hashString("drums");
const zPos = tagHash * 100 - 50; // -50 to 50

// 6. Smooth animation interpolation
const startPos = 0;
const endPos = 100;
const progress = 0.3;
const currentPos = lerp(startPos, endPos, smoothstep(progress));
*/