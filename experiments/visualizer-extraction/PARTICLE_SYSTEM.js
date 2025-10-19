// === PARTICLE SYSTEM MODULE ===

// REQUIRED GLOBAL VARIABLES (define these in your main file):
let particleSystem = null;        // THREE.InstancedMesh for all particles
let particles = [];               // Array of cluster objects
let particlesPerCluster = 48;     // Number of sub-particles per file
let particleSize = 5;              // Base size of particles
let subParticleScale = 0.3;       // Sub-particles are smaller than main
let clusterRadius = 10;            // Spread radius for sub-particles
let particleShape = 'circle';      // Shape: 'circle', 'square', 'disc', 'ring'
let particleBrightness = 0.8;      // Base particle brightness/opacity
let subParticleShape = 'default';  // Cluster shape: 'default', 'sphere', 'spiked'
let densityGradient = 0;          // 0-1, adds more particles near center
let maxParticleCount = 0;         // Maximum particles limit (0 = unlimited)

// REQUIRED CONSTANTS:
const KEY_COLORS = {
    'C': { hue: 0, sat: 0.7 },      // Red
    'G': { hue: 30, sat: 0.7 },     // Orange
    'D': { hue: 60, sat: 0.7 },     // Yellow
    'A': { hue: 90, sat: 0.7 },     // Yellow-green
    'E': { hue: 120, sat: 0.7 },    // Green
    'B': { hue: 150, sat: 0.7 },    // Cyan-green
    'F#': { hue: 180, sat: 0.7 },   // Cyan
    'C#': { hue: 210, sat: 0.7 },   // Blue-cyan
    'G#': { hue: 240, sat: 0.7 },   // Blue
    'D#': { hue: 270, sat: 0.7 },   // Purple
    'A#': { hue: 300, sat: 0.7 },   // Magenta
    'F': { hue: 330, sat: 0.7 }     // Pink
};

const BPM_COLORS = [
    { min: 0, max: 90, hue: 240, sat: 0.7 },    // Blue - slow
    { min: 90, max: 110, hue: 180, sat: 0.7 },  // Cyan - downtempo
    { min: 110, max: 128, hue: 120, sat: 0.7 }, // Green - house
    { min: 128, max: 140, hue: 60, sat: 0.7 },  // Yellow - techno
    { min: 140, max: 160, hue: 30, sat: 0.7 },  // Orange - trance
    { min: 160, max: 180, hue: 0, sat: 0.7 },   // Red - dnb
    { min: 180, max: 999, hue: 300, sat: 0.7 }  // Magenta - hardcore
];

// Tag-based categories and their colors
const CATEGORY_COLORS = {
    'drums': { hue: 0, sat: 0.8 },     // Red
    'inst': { hue: 30, sat: 0.7 },     // Orange
    'vox': { hue: 60, sat: 0.7 },      // Yellow
    'bass': { hue: 120, sat: 0.8 },    // Green
    'gtr': { hue: 180, sat: 0.7 },     // Cyan
    'pno': { hue: 240, sat: 0.7 },     // Blue
    'piano': { hue: 240, sat: 0.7 },   // Blue (same as pno)
    'syn': { hue: 270, sat: 0.8 },     // Purple
    'perc': { hue: 90, sat: 0.6 },     // Yellow-green
    'pad': { hue: 200, sat: 0.6 },     // Light blue
    'lead': { hue: 300, sat: 0.8 },    // Magenta
    'fx': { hue: 150, sat: 0.6 },      // Cyan-green
    'arp': { hue: 210, sat: 0.7 },     // Sky blue
    'other': { hue: 0, sat: 0.3 }      // Gray
};

/**
 * Creates particle system from audio files using instanced mesh rendering
 * @param {Array} audioFiles - Array of file objects with {id, name, bpm, key, tags, etc}
 * @param {THREE.Scene} scene - Three.js scene to add particles to
 * @param {Object} config - Configuration options
 * @param {string} config.colorMode - 'tags', 'key', 'bpm', or 'length'
 * @param {string} config.xMode - X-axis mode: 'bpm', 'key', 'tags', 'length', 'random'
 * @param {string} config.yMode - Y-axis mode: 'bpm', 'key', 'tags', 'length', 'random'
 * @param {string} config.zMode - Z-axis mode: 'bpm', 'key', 'tags', 'length', 'random'
 * @param {number} config.xScale - X-axis scale multiplier (default 1.0)
 * @param {number} config.yScale - Y-axis scale multiplier (default 1.0)
 * @param {number} config.zScale - Z-axis scale multiplier (default 1.0)
 */
function createParticles(audioFiles, scene, config = {}) {
    // Default configuration
    const {
        colorMode = 'tags',
        xMode = 'bpm',
        yMode = 'key',
        zMode = 'tags',
        xScale = 1.0,
        yScale = 1.0,
        zScale = 1.0
    } = config;

    // Clear existing particles array
    particles = [];

    // Remove old particle system if it exists
    if (particleSystem) {
        scene.remove(particleSystem);
        if (particleSystem.geometry) particleSystem.geometry.dispose();
        if (particleSystem.material) particleSystem.material.dispose();
    }

    // Filter out any hidden files (if using that pattern)
    const visibleFiles = audioFiles.filter(f => !f._hiddenFromParticles);

    // Calculate particles needed
    const densityAddition = Math.floor(densityGradient * particlesPerCluster);
    const maxParticlesPerCluster = particlesPerCluster + densityAddition;
    let totalParticlesNeeded = visibleFiles.length * maxParticlesPerCluster;

    // Apply particle limit if set
    let count = totalParticlesNeeded;
    let particleReductionFactor = 1.0;

    if (maxParticleCount > 0 && totalParticlesNeeded > maxParticleCount) {
        count = maxParticleCount;
        particleReductionFactor = maxParticleCount / totalParticlesNeeded;
        console.log(`Particle limit: ${totalParticlesNeeded} → ${maxParticleCount}`);
    }

    // Create geometry - simple plane sprite
    const geometry = new THREE.PlaneGeometry(1, 1);

    // Create material with texture
    const material = new THREE.MeshBasicMaterial({
        map: createParticleTexture(particleShape),
        transparent: true,
        opacity: particleBrightness,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    // Create instanced mesh
    particleSystem = new THREE.InstancedMesh(geometry, material, count);
    particleSystem.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let instanceIndex = 0;

    // Create particles for each visible file
    visibleFiles.forEach((file, fileIndex) => {
        const centerPos = calculateFilePosition(file, fileIndex, {
            xMode, yMode, zMode,
            xScale, yScale, zScale
        });

        // Get color based on current mode
        const colorData = getColorForFile(file, colorMode);
        const baseColor = new THREE.Color().setHSL(colorData.hue / 360, colorData.sat, 0.6);

        // Store cluster data
        const cluster = {
            file,
            centerPosition: new THREE.Vector3(centerPos.x, centerPos.y, centerPos.z),
            color: baseColor.clone(),
            colorData,
            fileIndex,
            subParticles: [],
            // For animation tracking
            customTime: null,
            lastRealTime: null
        };

        // Calculate particles for this cluster
        const baseParticles = particlesPerCluster;
        const densityAddition = Math.floor(densityGradient * baseParticles);
        let totalParticles = baseParticles + densityAddition;

        // Apply reduction if limit is active
        if (particleReductionFactor < 1.0) {
            totalParticles = Math.max(1, Math.floor(totalParticles * particleReductionFactor));
        }

        // Create sub-particles
        for (let i = 0; i < totalParticles; i++) {
            let offsetX, offsetY, offsetZ;
            let isCenterParticle = false;
            let radiusVariation = 0;

            // First 2 particles at center for visibility
            if (i < 2) {
                offsetX = 0;
                offsetY = 0;
                offsetZ = 0;
                isCenterParticle = true;
                radiusVariation = 0;
            } else {
                // Generate distribution based on shape mode
                const seed = fileIndex * 10000 + i;
                const theta = seededRandom(seed * 2) * Math.PI * 2;
                const phi = Math.acos(2 * seededRandom(seed * 2 + 1) - 1);

                // Determine if this is a density gradient particle
                const isDensityParticle = i >= baseParticles;

                if (isDensityParticle) {
                    // Density particles closer to center
                    const randomRadius = seededRandom(seed * 3);
                    radiusVariation = Math.pow(randomRadius, 2.0) * 0.6;
                } else if (subParticleShape === 'sphere') {
                    // Uniform sphere
                    radiusVariation = 1.0;
                } else if (subParticleShape === 'spiked') {
                    // Spiked - inner or outer shell
                    radiusVariation = seededRandom(seed * 3) < 0.5 ? 0.4 : 1.0;
                } else {
                    // Default organic distribution
                    radiusVariation = 0.5 + seededRandom(seed * 3) * 0.5;
                }

                offsetX = clusterRadius * Math.sin(phi) * Math.cos(theta) * radiusVariation;
                offsetY = clusterRadius * Math.sin(phi) * Math.sin(theta) * radiusVariation;
                offsetZ = clusterRadius * Math.cos(phi) * radiusVariation;
            }

            // Calculate distance from center
            const actualDistance = Math.sqrt(offsetX * offsetX + offsetY * offsetY + offsetZ * offsetZ) / clusterRadius;

            // Sub-particle data
            const subParticle = {
                offset: new THREE.Vector3(offsetX, offsetY, offsetZ),
                instanceIndex: instanceIndex,
                orbitPhase: seededRandom(fileIndex * 10000 + i + 999) * Math.PI * 2,
                isCenterParticle: isCenterParticle,
                baseRadius: radiusVariation,
                distanceFromCenter: actualDistance,
                // Random orbit parameters
                randomOrbitAxis: new THREE.Vector3(
                    seededRandom(fileIndex * 20000 + i) * 2 - 1,
                    seededRandom(fileIndex * 30000 + i) * 2 - 1,
                    seededRandom(fileIndex * 40000 + i) * 2 - 1
                ).normalize(),
                randomOrbitSpeed: 0.5 + seededRandom(fileIndex * 50000 + i) * 1.5
            };

            cluster.subParticles.push(subParticle);

            // Set initial position
            dummy.position.set(
                centerPos.x + offsetX,
                centerPos.y + offsetY,
                centerPos.z + offsetZ
            );
            dummy.scale.setScalar(particleSize * subParticleScale);
            dummy.updateMatrix();

            particleSystem.setMatrixAt(instanceIndex, dummy.matrix);

            // Set color
            if (isCenterParticle) {
                color.setHSL(colorData.hue / 360, colorData.sat, 0.8);
            } else {
                const colorSeed = fileIndex * 10000 + i + 5000;
                const hueShift = (seededRandom(colorSeed) - 0.5) * 0.05;
                let baseLightness = 0.6 + (seededRandom(colorSeed + 1) - 0.5) * 0.1;
                color.setHSL(
                    (colorData.hue / 360 + hueShift + 1) % 1,
                    colorData.sat,
                    baseLightness
                );
            }
            particleSystem.setColorAt(instanceIndex, color);

            instanceIndex++;
        }

        particles.push(cluster);
    });

    // Update instance attributes
    particleSystem.instanceMatrix.needsUpdate = true;
    if (particleSystem.instanceColor) {
        particleSystem.instanceColor.needsUpdate = true;
    }

    // Add to scene
    scene.add(particleSystem);
    console.log(`Created ${particles.length} clusters with ${count} total particles`);
}

/**
 * Calculate 3D position for a file based on its properties and axis modes
 * @param {Object} file - File object with properties
 * @param {number} index - File index for random seeding
 * @param {Object} config - Position configuration
 */
function calculateFilePosition(file, index, config) {
    const {
        xMode = 'bpm',
        yMode = 'key',
        zMode = 'tags',
        xScale = 1.0,
        yScale = 1.0,
        zScale = 1.0
    } = config;

    // Use axis modes to calculate position
    let x = calculateAxisValue(file, xMode, 100);
    let y = calculateAxisValue(file, yMode, 80);
    let z = calculateAxisValue(file, zMode, 60);

    // Add slight randomness to prevent exact overlaps
    x += (seededRandom(index * 3 + 1) - 0.5) * 2;
    y += (seededRandom(index * 3 + 2) - 0.5) * 2;
    z += (seededRandom(index * 3 + 3) - 0.5) * 2;

    // Apply axis scaling
    x *= xScale;
    y *= yScale;
    z *= zScale;

    return { x, y, z };
}

/**
 * Converts file property to axis coordinate value
 * @param {Object} file - File object
 * @param {string} mode - Axis mode: 'bpm', 'key', 'tags', 'length', 'random'
 * @param {number} scale - Base scale for the axis
 */
function calculateAxisValue(file, mode, scale) {
    switch (mode) {
        case 'bpm':
            const bpm = file.bpm || 120;
            // Map BPM 60-180 to position range
            return mapRange(bpm, 60, 180, -scale, scale);

        case 'key':
            const keyValue = getKeyValue(file.key);
            // Map key 0-11 to position range
            return mapRange(keyValue, 0, 11, -scale, scale);

        case 'tags':
            // Use hash of first tag or file name
            const tag = (file.tags && file.tags[0]) || file.name || '';
            const hash = hashString(tag);
            return (hash - 0.5) * scale * 2;

        case 'length':
            const length = file.length || 180; // Default 3 minutes
            // Map length 0-600 seconds (10 min) to position
            return mapRange(length, 0, 600, -scale, scale);

        case 'random':
            // Use file ID as seed for consistent random position
            const seed = hashString(file.id || file.name || '');
            return (seed - 0.5) * scale * 2;

        default:
            return 0;
    }
}

/**
 * Determines particle color based on file properties and color mode
 * @param {Object} file - File object
 * @param {string} mode - Color mode: 'tags', 'key', 'bpm', 'length'
 * @returns {Object} Color data with hue and saturation
 */
function getColorForFile(file, mode = 'tags') {
    switch (mode) {
        case 'tags':
            const category = getCategoryForFile(file);
            return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;

        case 'key':
            const key = file.key || 'C';
            const keyBase = key.split('/')[0].replace('maj', '').replace('min', '').trim();
            return KEY_COLORS[keyBase] || { hue: 0, sat: 0.5 };

        case 'bpm':
            const bpm = file.bpm || 120;
            for (const range of BPM_COLORS) {
                if (bpm >= range.min && bpm < range.max) {
                    return { hue: range.hue, sat: range.sat };
                }
            }
            return { hue: 0, sat: 0.5 };

        case 'length':
            const length = file.length || 180;
            // Map length to hue (0-10 minutes → full hue spectrum)
            const hue = mapRange(Math.min(length, 600), 0, 600, 0, 360);
            return { hue: hue, sat: 0.7 };

        default:
            return { hue: 0, sat: 0.5 };
    }
}

/**
 * Determines category from file tags
 * @param {Object} file - File object with tags array
 * @returns {string} Category name
 */
function getCategoryForFile(file) {
    if (!file.tags || !Array.isArray(file.tags)) return 'other';

    const tags = file.tags.map(t => t.toLowerCase());

    // Check for main categories in order of priority
    const categories = ['drums', 'inst', 'vox', 'bass', 'gtr', 'pno', 'piano',
                       'syn', 'perc', 'pad', 'lead', 'fx', 'arp'];

    for (const category of categories) {
        if (tags.some(tag => tag.includes(category))) {
            return category;
        }
    }

    return 'other';
}

/**
 * Updates particle brightness across all instances
 * @param {number} brightness - New brightness value (0-10)
 */
function updateBrightness(brightness) {
    if (!particleSystem) return;

    particleBrightness = brightness;
    particleSystem.material.opacity = particleBrightness;
    particleSystem.material.needsUpdate = true;
}

/**
 * Recreates particles with current settings
 * Call this after changing particle settings or data
 * @param {Array} audioFiles - Updated audio files array
 * @param {THREE.Scene} scene - Three.js scene
 * @param {Object} config - Configuration options
 */
function recreateParticles(audioFiles, scene, config) {
    createParticles(audioFiles, scene, config);
}

// Integration notes:
// 1. Import required utilities: seededRandom, createParticleTexture, mapRange, hashString, getKeyValue
// 2. Define all global variables at the top of your main file
// 3. Ensure THREE.js is loaded before using this module
// 4. Call createParticles() after loading audio files
// 5. particles array contains cluster objects for interaction/animation
// 6. particleSystem is the THREE.InstancedMesh for rendering