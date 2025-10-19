// Galaxy View - 3D particle visualization with advanced instanced mesh rendering
// Phase 2A: Integrated utilities + advanced particle system with subparticle clusters

// ============================================================================
// CORE UTILITIES
// ============================================================================

/**
 * Generates a deterministic pseudo-random number from a seed
 * Used to ensure consistent particle positions across renders
 */
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

/**
 * Creates a texture for particle sprites using HTML Canvas
 * Supports multiple shapes with smooth alpha gradients
 */
function createParticleTexture(shape) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d', { alpha: true });
    const centerX = 64;
    const centerY = 64;

    ctx.clearRect(0, 0, 128, 128);

    switch(shape) {
        case 'circle':
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
            const sqGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50);
            sqGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            sqGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.5)');
            sqGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = sqGradient;
            ctx.fillRect(14, 14, 100, 100);
            break;

        case 'disc':
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
            const ringGradient = ctx.createRadialGradient(centerX, centerY, 30, centerX, centerY, 58);
            ringGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            ringGradient.addColorStop(0.3, 'rgba(255, 255, 255, 1)');
            ringGradient.addColorStop(0.7, 'rgba(255, 255, 255, 1)');
            ringGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = ringGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 58, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            break;

        default:
            const defaultGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 60);
            defaultGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            defaultGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = defaultGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
            ctx.fill();
    }

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
 * Maps a value from one range to another (linear interpolation)
 */
function mapRange(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
}

/**
 * Clamps a value between min and max bounds
 */
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Simple hash function for strings (for consistent tag-based positioning)
 */
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash) / 2147483647;
}

/**
 * Gets a key value from musical key notation
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
    const keyName = key.split('/')[0]
        .replace('maj', '')
        .replace('min', '')
        .replace('m', '')
        .trim();
    return keyMap[keyName] || 0;
}

// ============================================================================
// PARTICLE SYSTEM CONSTANTS
// ============================================================================

const KEY_COLORS = {
    'C': { hue: 0, sat: 0.7 },
    'G': { hue: 30, sat: 0.7 },
    'D': { hue: 60, sat: 0.7 },
    'A': { hue: 90, sat: 0.7 },
    'E': { hue: 120, sat: 0.7 },
    'B': { hue: 150, sat: 0.7 },
    'F#': { hue: 180, sat: 0.7 },
    'C#': { hue: 210, sat: 0.7 },
    'G#': { hue: 240, sat: 0.7 },
    'D#': { hue: 270, sat: 0.7 },
    'A#': { hue: 300, sat: 0.7 },
    'F': { hue: 330, sat: 0.7 }
};

const BPM_COLORS = [
    { min: 0, max: 90, hue: 240, sat: 0.7 },
    { min: 90, max: 110, hue: 180, sat: 0.7 },
    { min: 110, max: 128, hue: 120, sat: 0.7 },
    { min: 128, max: 140, hue: 60, sat: 0.7 },
    { min: 140, max: 160, hue: 30, sat: 0.7 },
    { min: 160, max: 180, hue: 0, sat: 0.7 },
    { min: 180, max: 999, hue: 300, sat: 0.7 }
];

const CATEGORY_COLORS = {
    'drums': { hue: 0, sat: 0.8 },
    'inst': { hue: 30, sat: 0.7 },
    'vox': { hue: 60, sat: 0.7 },
    'bass': { hue: 120, sat: 0.8 },
    'gtr': { hue: 180, sat: 0.7 },
    'pno': { hue: 240, sat: 0.7 },
    'piano': { hue: 240, sat: 0.7 },
    'syn': { hue: 270, sat: 0.8 },
    'perc': { hue: 90, sat: 0.6 },
    'pad': { hue: 200, sat: 0.6 },
    'lead': { hue: 300, sat: 0.8 },
    'fx': { hue: 150, sat: 0.6 },
    'arp': { hue: 210, sat: 0.7 },
    'other': { hue: 0, sat: 0.3 }
};

// ============================================================================
// SCENE VARIABLES
// ============================================================================

let scene = null;
let camera = null;
let renderer = null;
let raycaster = null;
let mouse = null;
let animationFrameId = null;
let isPointerLocked = false;

// ============================================================================
// PARTICLE SYSTEM VARIABLES
// ============================================================================

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

// ============================================================================
// AUDIO ANALYZER VARIABLES
// ============================================================================

let audioContext = null;           // Web Audio API context
let analyser = null;               // AnalyserNode for frequency analysis
let audioDataArray = null;         // Uint8Array for frequency data
let currentAudioAmplitude = 0;     // Overall amplitude (0-5 range)
let bassAmplitude = 0;             // Bass frequencies (20-250 Hz)
let midsAmplitude = 0;             // Mid frequencies (250-2000 Hz)
let highsAmplitude = 0;            // High frequencies (2000+ Hz)
let audioFrequencyMode = 'all';    // 'all', 'bass', 'mids', 'highs'
const AUDIO_DEBUG = false;         // Debug logging (disable for production)

// ============================================================================
// ANIMATION & MOTION VARIABLES
// ============================================================================

let animationTime = 0;              // Global animation timer
let motionEnabled = true;           // Toggle all motion on/off
let motionMode = 'collective';      // Current motion mode
let orbitSpeed = 0.0000015;         // Base rotation speed
let orbitRadius = 80;               // Motion amplitude
let audioReactivityEnabled = true;  // Toggle audio reactivity
let audioReactivityStrength = 40;   // Audio effect strength (0-100)
let globalAudioReactivity = 4.4;    // Global audio pulse strength
let clusterSpreadOnAudio = 20;      // How much clusters expand with audio
let hoveredCluster = null;          // Currently hovered cluster for effects
let hoverScale = 1.5;               // Scale multiplier on hover
let hoverSlowdown = 10;             // Time slowdown factor on hover (1-100)
let mouseInteractionEnabled = true; // Enable mouse effects
let hiddenCategories = new Set();   // Hidden file categories

// Wave motion parameters
let waveAmplitude = 50;             // Wave height
let waveFrequency = 0.001;          // Wave speed
let waveDirection = { x: 1, y: 0, z: 0 }; // Wave propagation direction

// ============================================================================
// CAMERA MOVEMENT
// ============================================================================

let moveSpeed = 5.0;
let lookSensitivity = 0.002;
let keys = {};
let velocity = null;
let pitch = 0;
let yaw = 0;

// ============================================================================
// AUDIO FILES DATA
// ============================================================================

let audioFilesData = [];
let currentFileData = null;

// ============================================================================
// THREE.JS LOADING
// ============================================================================

let THREE = null;
let threeLoaded = false;

async function loadThreeJS() {
    if (threeLoaded) return true;

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = () => {
            THREE = window.THREE;
            threeLoaded = true;
            console.log('Three.js loaded successfully');
            resolve(true);
        };
        script.onerror = () => {
            console.error('Failed to load Three.js');
            reject(false);
        };
        document.head.appendChild(script);
    });
}

// ============================================================================
// VIEW LIFECYCLE
// ============================================================================

export async function init(data = {}) {
    console.log('🌌 Galaxy view initializing (Phase 2A - Advanced Particles)...');

    // Load Three.js first
    await loadThreeJS();

    // Initialize Three.js-dependent variables
    mouse = new THREE.Vector2();
    velocity = new THREE.Vector3();

    // Store audio files data
    if (data.audioFiles) {
        audioFilesData = data.audioFiles;
        console.log('📁 Loaded', audioFilesData.length, 'audio files');
    }
    if (data.currentFile) {
        currentFileData = data.currentFile;
        console.log('🎵 Current file:', currentFileData.name);
    }

    // Show galaxy container
    const container = document.getElementById('galaxyViewContainer');
    if (!container) {
        console.error('❌ Galaxy view container not found');
        return;
    }

    // MUST show container BEFORE reading dimensions
    container.style.display = 'block';
    container.innerHTML = '';

    // Create instructions overlay
    const instructions = document.createElement('div');
    instructions.id = 'galaxyInstructions';
    instructions.style.cssText = `
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 15px 25px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 14px;
        text-align: center;
        z-index: 100;
        pointer-events: none;
    `;
    instructions.innerHTML = `
        <strong>🌌 Galaxy View - Phase 2C</strong><br>
        Full Animation System | Motion Modes | Audio Reactivity<br>
        Click to lock pointer | ESC to unlock<br>
        WASD + Mouse | Shift=Sprint | Click particles to load<br>
        <small>Motion: ${motionMode} | Audio Reactivity: ${audioReactivityEnabled ? 'ON' : 'OFF'}</small>
    `;
    container.appendChild(instructions);

    // Setup Three.js scene
    setupScene(container);

    // Create advanced particles from audio files
    console.log('✨ Creating advanced particle system...');
    createParticles();

    // Setup controls
    setupControls(container);

    // Setup audio analysis connection to global wavesurfer
    setupAudioConnection();

    // Load options menu
    loadOptionsMenu();

    // Start animation loop
    startAnimation();

    console.log('🎉 Galaxy view Phase 2C initialized (full animation + audio)!');
}

/**
 * Connect to global wavesurfer for audio analysis
 */
function setupAudioConnection() {
    if (window.wavesurfer) {
        // If wavesurfer is already loaded and playing, connect now
        if (window.wavesurfer.isPlaying && window.wavesurfer.isPlaying()) {
            console.log('🎵 Wavesurfer already playing, connecting audio analyzer...');
            setupAudioAnalysis(window.wavesurfer);
        }

        // Listen for when audio starts playing
        window.wavesurfer.on('play', () => {
            if (!analyser) {
                console.log('🎵 Audio started, connecting analyzer...');
                setupAudioAnalysis(window.wavesurfer);
            }
        });

        // Reconnect analyzer when new file loads
        window.wavesurfer.on('ready', () => {
            console.log('🎵 New file ready, reconnecting audio analyzer...');
            cleanupAudioAnalysis();
            if (window.wavesurfer.isPlaying && window.wavesurfer.isPlaying()) {
                setupAudioAnalysis(window.wavesurfer);
            }
        });

        console.log('✅ Audio connection listeners registered');
    } else {
        console.warn('⚠️ window.wavesurfer not found - audio reactivity will not work');
    }
}

export function update(data = {}) {
    console.log('Galaxy view update called', data);

    if (data.currentFile) {
        currentFileData = data.currentFile;
        highlightCurrentFile();
    }

    if (data.audioFiles) {
        audioFilesData = data.audioFiles;
        recreateParticles();
    }
}

export async function destroy() {
    console.log('Galaxy view destroying...');

    // Cleanup audio analysis
    cleanupAudioAnalysis();

    // Stop animation
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Remove event listeners
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    document.removeEventListener('mousemove', onMouseMove);

    // Cleanup Three.js
    if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('click', onClick);
        if (renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
    }

    // Cleanup instanced mesh
    if (particleSystem) {
        scene.remove(particleSystem);
        if (particleSystem.geometry) particleSystem.geometry.dispose();
        if (particleSystem.material) {
            if (particleSystem.material.map) particleSystem.material.map.dispose();
            particleSystem.material.dispose();
        }
        particleSystem = null;
    }

    particles = [];

    if (scene) {
        scene.clear();
        scene = null;
    }

    if (renderer) {
        renderer.dispose();
        renderer = null;
    }

    camera = null;
    raycaster = null;

    // Hide container
    const container = document.getElementById('galaxyViewContainer');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }

    console.log('Galaxy view destroyed');
}

// ============================================================================
// SCENE SETUP
// ============================================================================

function setupScene(container) {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 10, 800);

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        2000
    );
    camera.position.set(0, 50, 200);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Raycaster for mouse picking
    raycaster = new THREE.Raycaster();

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Handle window resize
    window.addEventListener('resize', () => {
        if (!camera || !renderer || !container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

// ============================================================================
// ADVANCED PARTICLE SYSTEM
// ============================================================================

/**
 * Create advanced particle system with instanced mesh rendering
 */
function createParticles() {
    const config = {
        colorMode: 'key',  // Color by musical key
        xMode: 'bpm',      // X-axis: BPM
        yMode: 'key',      // Y-axis: Musical key
        zMode: 'tags',     // Z-axis: Tags
        xScale: 1.0,
        yScale: 1.0,
        zScale: 1.0
    };

    // Clear existing particles array
    particles = [];

    // Remove old particle system if it exists
    if (particleSystem) {
        scene.remove(particleSystem);
        if (particleSystem.geometry) particleSystem.geometry.dispose();
        if (particleSystem.material) {
            if (particleSystem.material.map) particleSystem.material.map.dispose();
            particleSystem.material.dispose();
        }
    }

    if (!audioFilesData || audioFilesData.length === 0) {
        console.warn('⚠️ No audio files to visualize');
        return;
    }

    // Filter out any hidden files
    const visibleFiles = audioFilesData.filter(f => !f._hiddenFromParticles);

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
        const centerPos = calculateFilePosition(file, fileIndex, config);

        // Get color based on current mode
        const colorData = getColorForFile(file, config.colorMode);
        const baseColor = new THREE.Color().setHSL(colorData.hue / 360, colorData.sat, 0.6);

        // Store cluster data
        const cluster = {
            file,
            centerPosition: new THREE.Vector3(centerPos.x, centerPos.y, centerPos.z),
            color: baseColor.clone(),
            colorData,
            fileIndex,
            subParticles: [],
            // Animation time tracking (for hover slowdown)
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
            // Generate seed for this particle (used for positioning and animation)
            const seed = fileIndex * 10000 + i;

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
                const theta = seededRandom(seed * 2) * Math.PI * 2;
                const phi = Math.acos(2 * seededRandom(seed * 2 + 1) - 1);

                // Determine if this is a density gradient particle
                const isDensityParticle = i >= baseParticles;

                if (isDensityParticle) {
                    const randomRadius = seededRandom(seed * 3);
                    radiusVariation = Math.pow(randomRadius, 2.0) * 0.6;
                } else if (subParticleShape === 'sphere') {
                    radiusVariation = 1.0;
                } else if (subParticleShape === 'spiked') {
                    radiusVariation = seededRandom(seed * 3) < 0.5 ? 0.4 : 1.0;
                } else {
                    radiusVariation = 0.5 + seededRandom(seed * 3) * 0.5;
                }

                offsetX = clusterRadius * Math.sin(phi) * Math.cos(theta) * radiusVariation;
                offsetY = clusterRadius * Math.sin(phi) * Math.sin(theta) * radiusVariation;
                offsetZ = clusterRadius * Math.cos(phi) * radiusVariation;
            }

            // Calculate distance from center
            const actualDistance = Math.sqrt(offsetX * offsetX + offsetY * offsetY + offsetZ * offsetZ) / clusterRadius;

            // Sub-particle data with orbit properties for animation
            const subParticle = {
                offset: new THREE.Vector3(offsetX, offsetY, offsetZ),
                instanceIndex: instanceIndex,
                isCenterParticle: isCenterParticle,
                baseRadius: radiusVariation,
                distanceFromCenter: actualDistance,
                // Animation properties
                orbitPhase: seededRandom(seed * 4) * Math.PI * 2,
                randomOrbitAxis: new THREE.Vector3(
                    seededRandom(seed * 5) * 2 - 1,
                    seededRandom(seed * 6) * 2 - 1,
                    seededRandom(seed * 7) * 2 - 1
                ).normalize(),
                randomOrbitSpeed: 0.5 + seededRandom(seed * 8) * 1.5
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
    console.log(`✅ Created ${particles.length} clusters with ${count} total particles`);
}

/**
 * Calculate 3D position for a file based on its properties and axis modes
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
 */
function calculateAxisValue(file, mode, scale) {
    switch (mode) {
        case 'bpm':
            const bpm = file.bpm || 120;
            return mapRange(bpm, 60, 180, -scale, scale);

        case 'key':
            const keyValue = getKeyValue(file.key);
            return mapRange(keyValue, 0, 11, -scale, scale);

        case 'tags':
            const tag = (file.tags && file.tags[0]) || file.name || '';
            const hash = hashString(tag);
            return (hash - 0.5) * scale * 2;

        case 'length':
            const length = file.length || 180;
            return mapRange(length, 0, 600, -scale, scale);

        case 'random':
            const seed = hashString(file.id || file.name || '');
            return (seed - 0.5) * scale * 2;

        default:
            return 0;
    }
}

/**
 * Determines particle color based on file properties and color mode
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
            const hue = mapRange(Math.min(length, 600), 0, 600, 0, 360);
            return { hue: hue, sat: 0.7 };

        default:
            return { hue: 0, sat: 0.5 };
    }
}

/**
 * Determines category from file tags
 */
function getCategoryForFile(file) {
    if (!file.tags || !Array.isArray(file.tags)) return 'other';

    const tags = file.tags.map(t => t.toLowerCase());
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
 * Recreate particles (when file list changes)
 */
function recreateParticles() {
    createParticles();
    highlightCurrentFile();
}

/**
 * Highlight currently playing file
 */
function highlightCurrentFile() {
    if (!currentFileData || !particleSystem) return;

    // Find the cluster for the current file
    particles.forEach(cluster => {
        const isCurrentFile = cluster.file.id === currentFileData.id;

        // Store if this is the active cluster (for audio reactivity)
        cluster.isPlaying = isCurrentFile;

        // Update all subparticles in this cluster
        cluster.subParticles.forEach(subParticle => {
            const idx = subParticle.instanceIndex;

            // Get current matrix
            const matrix = new THREE.Matrix4();
            particleSystem.getMatrixAt(idx, matrix);

            // Extract position and update scale
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            matrix.decompose(position, quaternion, scale);

            // Make playing file bigger and brighter
            if (isCurrentFile) {
                if (subParticle.isCenterParticle) {
                    scale.setScalar(particleSize * subParticleScale * 2.0); // 2x larger
                } else {
                    scale.setScalar(particleSize * subParticleScale * 1.5); // 1.5x larger
                }

                // Brighter color
                const color = new THREE.Color();
                particleSystem.getColorAt(idx, color);
                color.multiplyScalar(1.5);
                particleSystem.setColorAt(idx, color);
            } else {
                // Reset to normal size
                scale.setScalar(particleSize * subParticleScale);
            }

            // Update matrix
            matrix.compose(position, quaternion, scale);
            particleSystem.setMatrixAt(idx, matrix);
        });
    });

    particleSystem.instanceMatrix.needsUpdate = true;
    if (particleSystem.instanceColor) {
        particleSystem.instanceColor.needsUpdate = true;
    }
}

/**
 * Main animation update function - updates all particle positions based on motion mode and audio
 * This is the core animation loop from the reference visualizer
 */
function updateParticleAnimation(deltaTime) {
    if (!particleSystem || !particles || particles.length === 0) return;

    // Update animation time
    animationTime += deltaTime;

    const audioPlaying = window.wavesurfer && window.wavesurfer.isPlaying && window.wavesurfer.isPlaying();
    const dummy = new THREE.Object3D();
    const currentFileId = currentFileData ? currentFileData.id : null;

    // Process each cluster
    particles.forEach((cluster, clusterIndex) => {
        // Check if category is hidden
        if (hiddenCategories.size > 0) {
            const category = getCategoryForFile(cluster.file);
            if (hiddenCategories.has(category)) {
                // Hide all sub-particles for this cluster
                cluster.subParticles.forEach(subParticle => {
                    dummy.position.set(0, -10000, 0);
                    dummy.scale.setScalar(0.001);
                    dummy.updateMatrix();
                    particleSystem.setMatrixAt(subParticle.instanceIndex, dummy.matrix);
                });
                return;
            }
        }

        // Handle hover time manipulation
        let clusterTime = animationTime;
        if (hoveredCluster === cluster && mouseInteractionEnabled && hoverSlowdown > 1) {
            if (cluster.customTime === null) {
                cluster.customTime = animationTime;
                cluster.lastRealTime = animationTime;
            }

            const realDelta = animationTime - cluster.lastRealTime;
            const slowedDelta = realDelta / hoverSlowdown;
            cluster.customTime += slowedDelta;
            cluster.lastRealTime = animationTime;
            clusterTime = cluster.customTime;
        } else {
            cluster.customTime = null;
            cluster.lastRealTime = null;
        }

        // Calculate base motion offsets for the entire cluster
        let clusterOffsetX = 0, clusterOffsetY = 0, clusterOffsetZ = 0;

        if (motionEnabled) {
            switch (motionMode) {
                case 'collective':
                    clusterOffsetX = Math.sin(clusterTime * orbitSpeed * 1000) * orbitRadius;
                    clusterOffsetY = Math.sin(clusterTime * orbitSpeed * 1500) * orbitRadius * 0.5;
                    clusterOffsetZ = Math.cos(clusterTime * orbitSpeed * 1000) * orbitRadius;
                    break;

                case 'individual':
                    const seed = clusterIndex * 1000;
                    clusterOffsetX = Math.sin(clusterTime * orbitSpeed * 1000 + seed) * orbitRadius;
                    clusterOffsetY = Math.cos(clusterTime * orbitSpeed * 800 + seed * 1.5) * orbitRadius * 0.7;
                    clusterOffsetZ = Math.sin(clusterTime * orbitSpeed * 1200 + seed * 0.5) * orbitRadius;
                    break;

                case 'random':
                    const t = clusterTime * orbitSpeed * 500;
                    const noise1 = Math.sin(t + clusterIndex) * Math.cos(t * 1.3 + clusterIndex * 2);
                    const noise2 = Math.sin(t * 0.7 + clusterIndex * 3) * Math.cos(t * 1.1);
                    const noise3 = Math.cos(t * 0.9 + clusterIndex * 1.5) * Math.sin(t * 1.2);
                    clusterOffsetX = noise1 * orbitRadius;
                    clusterOffsetY = noise2 * orbitRadius;
                    clusterOffsetZ = noise3 * orbitRadius;
                    break;

                case 'audio':
                    if (audioReactivityEnabled && currentAudioAmplitude > 0) {
                        const audioScale = currentAudioAmplitude * audioReactivityStrength * 0.1;
                        clusterOffsetX = Math.sin(clusterIndex * 0.5) * audioScale;
                        clusterOffsetY = currentAudioAmplitude * audioReactivityStrength * 0.5;
                        clusterOffsetZ = Math.cos(clusterIndex * 0.5) * audioScale;
                    }
                    break;

                case 'wave':
                    const wavePhase = (cluster.centerPosition.x * waveDirection.x +
                                      cluster.centerPosition.y * waveDirection.y +
                                      cluster.centerPosition.z * waveDirection.z) * 0.05;
                    const waveOffset = Math.sin(clusterTime * waveFrequency * 1000 + wavePhase) * waveAmplitude;
                    clusterOffsetX = waveDirection.x * waveOffset;
                    clusterOffsetY = waveDirection.y * waveOffset + waveOffset * 0.3;
                    clusterOffsetZ = waveDirection.z * waveOffset;
                    break;

                case 'none':
                default:
                    break;
            }
        }

        // Update each sub-particle in the cluster
        cluster.subParticles.forEach((subParticle) => {
            let x = cluster.centerPosition.x + clusterOffsetX;
            let y = cluster.centerPosition.y + clusterOffsetY;
            let z = cluster.centerPosition.z + clusterOffsetZ;

            // Individual sub-particle motion (within cluster)
            if (motionEnabled && motionMode !== 'none') {
                const orbitTime = clusterTime * 0.0001;
                const phase = subParticle.orbitPhase;

                if (motionMode === 'individual' || motionMode === 'random') {
                    const axis = subParticle.randomOrbitAxis;
                    const speed = subParticle.randomOrbitSpeed * orbitTime;

                    const angle = speed + phase;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);

                    const rotatedOffset = {
                        x: subParticle.offset.x * cos + subParticle.offset.z * sin,
                        y: subParticle.offset.y,
                        z: -subParticle.offset.x * sin + subParticle.offset.z * cos
                    };

                    x += rotatedOffset.x;
                    y += rotatedOffset.y;
                    z += rotatedOffset.z;
                } else {
                    x += subParticle.offset.x;
                    y += subParticle.offset.y;
                    z += subParticle.offset.z;
                }
            } else {
                x += subParticle.offset.x;
                y += subParticle.offset.y;
                z += subParticle.offset.z;
            }

            // Audio reactivity - expand/contract clusters
            if (audioReactivityEnabled && currentAudioAmplitude > 0 && !subParticle.isCenterParticle) {
                const audioExpansion = 1.0 + currentAudioAmplitude * clusterSpreadOnAudio * 0.01;

                let expansionFactor = audioExpansion;

                if (audioFrequencyMode === 'bass' && bassAmplitude > 0) {
                    expansionFactor = 1.0 + bassAmplitude * clusterSpreadOnAudio * 0.01 *
                                     (1.0 + subParticle.distanceFromCenter);
                } else if (audioFrequencyMode === 'highs' && highsAmplitude > 0) {
                    expansionFactor = 1.0 + highsAmplitude * clusterSpreadOnAudio * 0.01 *
                                     (2.0 - subParticle.distanceFromCenter);
                }

                const expandedOffsetX = subParticle.offset.x * expansionFactor;
                const expandedOffsetY = subParticle.offset.y * expansionFactor;
                const expandedOffsetZ = subParticle.offset.z * expansionFactor;

                x = cluster.centerPosition.x + clusterOffsetX + expandedOffsetX;
                y = cluster.centerPosition.y + clusterOffsetY + expandedOffsetY;
                z = cluster.centerPosition.z + clusterOffsetZ + expandedOffsetZ;
            }

            // Set position
            dummy.position.set(x, y, z);

            // Calculate scale with various effects
            let scale = particleSize * subParticleScale;

            // Audio pulse effect
            if (audioReactivityEnabled && audioPlaying) {
                const isCurrentFile = currentFileId && cluster.file.id === currentFileId;

                if (isCurrentFile) {
                    scale *= (1.0 + currentAudioAmplitude * audioReactivityStrength * 0.01);
                } else {
                    scale *= (1.0 + currentAudioAmplitude * globalAudioReactivity * 0.005);
                }
            }

            // Hover scale effect
            if (hoveredCluster === cluster && mouseInteractionEnabled && hoverScale > 1.0) {
                scale *= hoverScale;
            }

            // Distance-based scale for sub-particles
            if (!subParticle.isCenterParticle && subParticle.distanceFromCenter > 0) {
                scale *= (1.0 - subParticle.distanceFromCenter * 0.2);
            }

            dummy.scale.setScalar(scale);

            // Make particles face camera (billboard effect)
            dummy.lookAt(camera.position);

            // Update instance matrix
            dummy.updateMatrix();
            particleSystem.setMatrixAt(subParticle.instanceIndex, dummy.matrix);
        });
    });

    // Flag that instance matrix needs update
    particleSystem.instanceMatrix.needsUpdate = true;
}

// ============================================================================
// AUDIO ANALYZER
// ============================================================================

/**
 * Sets up audio analyzer connected to WaveSurfer instance
 * This taps into WaveSurfer's audio chain without breaking playback
 */
function setupAudioAnalysis(wavesurferInstance) {
    if (!wavesurferInstance) {
        console.error('❌ Audio Analysis: No WaveSurfer instance provided');
        return false;
    }

    try {
        // Give WaveSurfer a moment to initialize its audio chain
        setTimeout(() => {
            // Get the media element from WaveSurfer v7
            const mediaElement = wavesurferInstance.getMediaElement();

            if (!mediaElement) {
                console.error('❌ Audio Analysis: No media element found');
                return false;
            }

            if (AUDIO_DEBUG) {
                console.log('📊 Audio Analysis: Media element found:', mediaElement);
            }

            // Try to get audio context
            if (!mediaElement.audioContext) {
                console.error('❌ Audio Analysis: No audioContext on media element');

                // Try alternative approach
                if (wavesurferInstance.backend && wavesurferInstance.backend.ac) {
                    audioContext = wavesurferInstance.backend.ac;
                    console.log('✓ Audio Analysis: Got context from backend');
                } else {
                    console.error('❌ Audio Analysis: Could not find audio context');
                    return false;
                }
            } else {
                audioContext = mediaElement.audioContext;
            }

            // Get the gain node
            const gainNode = mediaElement.gainNode;

            if (!audioContext || !gainNode) {
                console.error('❌ Audio Analysis: Missing audioContext or gainNode');
                return false;
            }

            if (AUDIO_DEBUG) {
                console.log('📊 Audio Analysis: Audio context state:', audioContext.state);
                console.log('📊 Audio Analysis: Sample rate:', audioContext.sampleRate);
            }

            // Clean up any existing analyser
            if (analyser) {
                try {
                    analyser.disconnect();
                    analyser = null;
                } catch (e) {
                    // Ignore disconnect errors
                }
            }

            // Create new analyser node
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;                     // 256 bins for frequency data
            analyser.smoothingTimeConstant = 0.8;       // Smoothing (0-1)
            analyser.minDecibels = -90;                 // Minimum power value
            analyser.maxDecibels = -10;                 // Maximum power value

            // Insert analyser into the audio chain
            try {
                // Disconnect gain from destination
                gainNode.disconnect();

                // Reconnect through analyser
                gainNode.connect(analyser);
                analyser.connect(audioContext.destination);

                console.log('✅ Audio Analysis: Analyser connected to audio chain');
            } catch (error) {
                console.error('❌ Audio Analysis: Failed to insert analyser:', error);

                // Try to restore original connection if we failed
                try {
                    gainNode.connect(audioContext.destination);
                } catch (e) {
                    console.error('❌ Audio Analysis: Failed to restore connection');
                }
                return false;
            }

            // Prepare data array for frequency data
            const bufferLength = analyser.frequencyBinCount;
            audioDataArray = new Uint8Array(bufferLength);

            console.log('✅ Galaxy View: Audio analysis setup complete');

            // Resume context if suspended (common on mobile/autoplay restrictions)
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log('✅ Audio Analysis: Audio context resumed');
                }).catch(err => {
                    console.warn('⚠️ Audio Analysis: Could not resume context:', err);
                });
            }

            return true;

        }, 100); // Small delay to ensure WaveSurfer is ready

    } catch (error) {
        console.error('❌ Audio Analysis setup error:', error);
        return false;
    }
}

/**
 * Updates audio amplitude values from analyzer
 * Call this every frame in animation loop
 */
function updateAudioAmplitude() {
    if (!analyser || !audioDataArray) {
        // No analyser available, set all to 0
        currentAudioAmplitude = 0;
        bassAmplitude = 0;
        midsAmplitude = 0;
        highsAmplitude = 0;
        return;
    }

    // Get frequency data (0-255 for each frequency bin)
    analyser.getByteFrequencyData(audioDataArray);

    // Calculate frequency ranges based on sample rate
    const bufferLength = analyser.frequencyBinCount;
    const sampleRate = audioContext.sampleRate;
    const nyquist = sampleRate / 2; // Maximum frequency we can represent

    // Calculate bin indices for frequency bands
    const binWidth = nyquist / bufferLength;

    // Frequency band boundaries
    const bassEnd = Math.floor(250 / binWidth);    // Bass: 0-250 Hz
    const midsEnd = Math.floor(2000 / binWidth);   // Mids: 250-2000 Hz
    // Highs: 2000+ Hz (rest of the bins)

    // Calculate amplitudes for each frequency band
    let bassSum = 0, midsSum = 0, highsSum = 0;
    let bassCount = 0, midsCount = 0, highsCount = 0;

    // Bass: 20-250 Hz (skip first bin as it's often DC offset)
    for (let i = 1; i < bassEnd && i < bufferLength; i++) {
        bassSum += audioDataArray[i];
        bassCount++;
    }

    // Mids: 250-2000 Hz
    for (let i = bassEnd; i < midsEnd && i < bufferLength; i++) {
        midsSum += audioDataArray[i];
        midsCount++;
    }

    // Highs: 2000+ Hz
    for (let i = midsEnd; i < bufferLength; i++) {
        highsSum += audioDataArray[i];
        highsCount++;
    }

    // Calculate averages (0-255 range)
    const bassAvg = bassCount > 0 ? bassSum / bassCount : 0;
    const midsAvg = midsCount > 0 ? midsSum / midsCount : 0;
    const highsAvg = highsCount > 0 ? highsSum / highsCount : 0;

    // Normalize to 0-1 range and apply amplification
    bassAmplitude = Math.min((bassAvg / 128) * 3, 5);
    midsAmplitude = Math.min((midsAvg / 128) * 3, 5);
    highsAmplitude = Math.min((highsAvg / 128) * 3, 5);

    // Set overall amplitude based on selected frequency mode
    switch (audioFrequencyMode) {
        case 'bass':
            currentAudioAmplitude = bassAmplitude;
            break;
        case 'mids':
            currentAudioAmplitude = midsAmplitude;
            break;
        case 'highs':
            currentAudioAmplitude = highsAmplitude;
            break;
        case 'all':
        default:
            // Weighted average - bass has more visual impact
            currentAudioAmplitude = (bassAmplitude * 0.5 + midsAmplitude * 0.3 + highsAmplitude * 0.2);
            break;
    }
}

/**
 * Cleans up audio analyzer when switching files or destroying view
 */
function cleanupAudioAnalysis() {
    if (analyser) {
        try {
            analyser.disconnect();
        } catch (e) {
            // Ignore disconnect errors
        }
        analyser = null;
    }

    audioDataArray = null;
    currentAudioAmplitude = 0;
    bassAmplitude = 0;
    midsAmplitude = 0;
    highsAmplitude = 0;

    console.log('🧹 Galaxy View: Audio analysis cleaned up');
}

// ============================================================================
// ANIMATION CONTROLS
// ============================================================================

/**
 * Sets the current motion mode
 */
function setMotionMode(mode) {
    const validModes = ['none', 'collective', 'individual', 'random', 'audio', 'wave'];
    if (validModes.includes(mode)) {
        motionMode = mode;
        console.log(`🎭 Motion mode set to: ${mode}`);
    }
}

/**
 * Toggles motion on/off
 */
function toggleMotion() {
    motionEnabled = !motionEnabled;
    console.log(`🎭 Motion ${motionEnabled ? 'enabled' : 'disabled'}`);
    return motionEnabled;
}

/**
 * Sets audio reactivity parameters
 */
function setAudioReactivity(params) {
    if (params.enabled !== undefined) audioReactivityEnabled = params.enabled;
    if (params.strength !== undefined) audioReactivityStrength = clamp(params.strength, 0, 100);
    if (params.globalStrength !== undefined) globalAudioReactivity = clamp(params.globalStrength, 0, 10);
    if (params.clusterSpread !== undefined) clusterSpreadOnAudio = clamp(params.clusterSpread, 0, 100);

    console.log('🎵 Audio reactivity updated:', {
        enabled: audioReactivityEnabled,
        strength: audioReactivityStrength,
        global: globalAudioReactivity,
        spread: clusterSpreadOnAudio
    });
}

/**
 * Toggles visibility of a category
 */
function toggleCategoryVisibility(category) {
    if (hiddenCategories.has(category)) {
        hiddenCategories.delete(category);
        console.log(`👁️ Showing category: ${category}`);
    } else {
        hiddenCategories.add(category);
        console.log(`👁️ Hiding category: ${category}`);
    }
}

// ============================================================================
// OPTIONS MENU
// ============================================================================

/**
 * Loads and integrates the Galaxy View options menu
 */
function loadOptionsMenu() {
    console.log('📋 Loading Galaxy View options menu...');

    // Fetch the complete options menu HTML
    fetch('experiments/visualizer-extraction/galaxyOptionsMenuComplete.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load options menu: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            // Create container for the menu
            const menuContainer = document.createElement('div');
            menuContainer.id = 'galaxyMenuContainer';
            menuContainer.innerHTML = html;
            document.body.appendChild(menuContainer);

            console.log('✅ Options menu HTML injected');

            // Wire up controls to Galaxy View variables
            wireUpMenuControls();

            // The HTML's <script> tag will execute when innerHTML is set, defining
            // initOptionsMenu2Drag and initOptionsMenu2Resize functions.
            // We need to call them manually since DOMContentLoaded has already fired.
            setTimeout(() => {
                if (typeof window.initOptionsMenu2Drag === 'function') {
                    window.initOptionsMenu2Drag();
                    console.log('✅ Menu drag functionality initialized');
                } else {
                    console.warn('⚠️ initOptionsMenu2Drag not found');
                }

                if (typeof window.initOptionsMenu2Resize === 'function') {
                    window.initOptionsMenu2Resize();
                    console.log('✅ Menu resize functionality initialized');
                } else {
                    console.warn('⚠️ initOptionsMenu2Resize not found');
                }
            }, 100); // Small delay to ensure scripts have executed

            console.log('✅ Galaxy View options menu loaded successfully');
        })
        .catch(error => {
            console.error('❌ Failed to load options menu:', error);
            console.warn('Galaxy View will work without options menu (controls via console)');
        });
}

/**
 * Wires up options menu controls to Galaxy View variables and functions
 */
function wireUpMenuControls() {
    // Expose variables directly to window (for inline event handlers in HTML)
    window.audioReactivityStrength = audioReactivityStrength;
    window.audioFrequencyMode = audioFrequencyMode;
    window.moveSpeed = moveSpeed;
    window.lookSensitivity = lookSensitivity;
    window.particleSize = particleSize;
    window.particleBrightness = particleBrightness;
    window.particlesPerCluster = particlesPerCluster;
    window.clusterRadius = clusterRadius;
    window.particleShape = particleShape;

    // Expose recreateParticles to window
    window.recreateParticles = () => recreateParticles();

    // Global functions expected by options menu HTML

    // UI Toggle Functions (stubs - these features don't exist yet)
    window.toggleCrosshair = function() {
        console.log('🎯 Crosshair toggle not implemented yet');
    };

    window.toggleTooltips = function() {
        console.log('💬 Tooltips toggle not implemented yet');
    };

    window.toggleInfoWindow = function() {
        console.log('ℹ️ Info window toggle not implemented yet');
    };

    window.toggleFullscreen = function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            console.log('🖥️ Entered fullscreen');
        } else {
            document.exitFullscreen();
            console.log('🖥️ Exited fullscreen');
        }
    };

    window.toggleMoveJoystick = function() {
        console.log('🕹️ Move joystick toggle not implemented yet');
    };

    window.toggleLookJoystick = function() {
        console.log('🕹️ Look joystick toggle not implemented yet');
    };

    window.togglePlayButton = function() {
        console.log('▶️ Play button toggle not implemented yet');
    };

    // Options menu collapse/expand functions (from HTML's script section)
    // Scripts in innerHTML don't execute, so we define them here
    window.toggleOptionsMenu2 = function() {
        const menu = document.getElementById('optionsMenu2');
        const icon = document.getElementById('optionsCollapseIcon2');

        if (menu && icon) {
            menu.classList.toggle('options-collapsed');
            icon.textContent = menu.classList.contains('options-collapsed') ? '☰' : '−';
        }
    };

    window.toggleSection = function(header) {
        header.classList.toggle('collapsed');
        const content = header.nextElementSibling;
        if (content) {
            content.classList.toggle('collapsed');
        }
    };

    // Initialize drag functionality
    window.initOptionsMenu2Drag = function() {
        const menu = document.getElementById('optionsMenu2');
        const titleBar = menu?.querySelector('.options-title-bar');

        if (!menu || !titleBar) return;

        let isDragging = false;
        let startX, startY;
        let startMenuX, startMenuY;

        // Mouse events
        titleBar.addEventListener('mousedown', (e) => {
            if (e.target === titleBar || e.target.tagName === 'H2') {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;

                const rect = menu.getBoundingClientRect();
                startMenuX = rect.left;
                startMenuY = rect.top;

                menu.classList.add('dragging');
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            const newX = Math.max(0, Math.min(window.innerWidth - menu.offsetWidth, startMenuX + deltaX));
            const newY = Math.max(0, Math.min(window.innerHeight - menu.offsetHeight, startMenuY + deltaY));

            menu.style.left = newX + 'px';
            menu.style.top = newY + 'px';
            menu.style.right = 'auto';
            menu.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                menu.classList.remove('dragging');
            }
        });

        // Touch events
        titleBar.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            isDragging = true;
            startX = touch.clientX;
            startY = touch.clientY;

            const rect = menu.getBoundingClientRect();
            startMenuX = rect.left;
            startMenuY = rect.top;

            menu.classList.add('dragging');
            e.preventDefault();
        });

        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;

            const touch = e.touches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;

            const newX = Math.max(0, Math.min(window.innerWidth - menu.offsetWidth, startMenuX + deltaX));
            const newY = Math.max(0, Math.min(window.innerHeight - menu.offsetHeight, startMenuY + deltaY));

            menu.style.left = newX + 'px';
            menu.style.top = newY + 'px';
            menu.style.right = 'auto';
            menu.style.bottom = 'auto';

            e.preventDefault();
        });

        document.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                menu.classList.remove('dragging');
            }
        });
    };

    // Initialize resize functionality
    window.initOptionsMenu2Resize = function() {
        const menu = document.getElementById('optionsMenu2');
        const resizeHandle = document.getElementById('optionsResizeHandle');

        if (!resizeHandle || !menu) return;

        let isResizing = false;
        let startWidth, startHeight;
        let startX, startY;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = menu.offsetWidth;
            startHeight = menu.offsetHeight;

            e.preventDefault();
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const newWidth = Math.max(220, Math.min(400, startWidth + e.clientX - startX));
            const newHeight = Math.max(300, Math.min(window.innerHeight - 40, startHeight + e.clientY - startY));

            menu.style.width = newWidth + 'px';
            menu.style.maxHeight = newHeight + 'px';
            menu.style.maxWidth = newWidth + 'px';
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
        });
    };

    // Database source toggles (stub)
    window.toggleGalaxyDbSource = function(source, event) {
        console.log(`📊 Database source toggle for ${source} not implemented yet`);
    };

    // Category visibility
    window.showAllCategories = function() {
        hiddenCategories.clear();
        console.log('👁️ Showing all categories');
    };

    window.hideAllCategories = function() {
        const allCategories = ['drums', 'inst', 'vox', 'bass', 'gtr', 'pno', 'syn', 'perc', 'pad', 'lead', 'fx', 'arp', 'other'];
        allCategories.forEach(cat => hiddenCategories.add(cat));
        console.log('👁️ Hiding all categories');
    };

    // Motion mode control
    window.updateRotationMode = function(mode) {
        // Map menu values to our motion modes
        const modeMap = {
            'collective': 'collective',
            'spiral': 'individual',  // Map spiral to individual for now
            'individual': 'individual',
            'random': 'random',
            'audio': 'audio',
            'wave': 'wave',
            'none': 'none'
        };
        const mappedMode = modeMap[mode] || mode;
        setMotionMode(mappedMode);
    };

    window.updateRotationAxis = function(axis) {
        console.log(`🔄 Rotation axis: ${axis} (not fully implemented)`);
        // This would control wave direction or other axis-specific behavior
    };

    // Motion speed/radius controls
    window.updateMotionSpeed = function(value) {
        orbitSpeed = parseFloat(value) * 0.000001;  // Convert slider value to orbit speed
        const speedDisplay = document.getElementById('galaxyMotionSpeedValue');
        if (speedDisplay) speedDisplay.textContent = value;
        console.log(`🔄 Motion speed: ${value}`);
    };

    window.updateMotionRadius = function(value) {
        orbitRadius = parseFloat(value);
        const radiusDisplay = document.getElementById('galaxyMotionRadiusValue');
        if (radiusDisplay) radiusDisplay.textContent = value;
        console.log(`🔄 Motion radius: ${orbitRadius}`);
    };

    // Stem offset (stub - not applicable to Galaxy View)
    window.updateStemOffset = function(value) {
        console.log(`🎚️ Stem offset: ${value} (not applicable to Galaxy View)`);
    };

    // Search handler (stub)
    window.handleSearch = function(query) {
        console.log(`🔍 Search: "${query}" (not implemented yet)`);
    };

    // Brightness update
    window.updateBrightness = function() {
        particleBrightness = window.particleBrightness;
        recreateParticles();
    };

    // Bloom strength (stub - Phase 2E will implement visual effects)
    window.updateBloomStrength = function() {
        console.log('✨ Bloom strength update (visual effects Phase 2E)');
    };

    // Preset save/load (stubs)
    window.savePreset = function(name) {
        const state = {
            motionMode,
            orbitSpeed,
            orbitRadius,
            audioReactivityStrength,
            particlesPerCluster,
            particleSize,
            clusterRadius,
            particleBrightness
        };
        localStorage.setItem(`galaxyPreset_${name}`, JSON.stringify(state));
        console.log(`💾 Saved preset: ${name}`);
    };

    window.loadPreset = function(name) {
        const saved = localStorage.getItem(`galaxyPreset_${name}`);
        if (saved) {
            const state = JSON.parse(saved);
            // Apply saved state
            motionMode = state.motionMode || motionMode;
            orbitSpeed = state.orbitSpeed || orbitSpeed;
            orbitRadius = state.orbitRadius || orbitRadius;
            audioReactivityStrength = state.audioReactivityStrength || audioReactivityStrength;
            particlesPerCluster = state.particlesPerCluster || particlesPerCluster;
            particleSize = state.particleSize || particleSize;
            clusterRadius = state.clusterRadius || clusterRadius;
            particleBrightness = state.particleBrightness || particleBrightness;
            recreateParticles();
            console.log(`📂 Loaded preset: ${name}`);
        } else {
            console.log(`❌ Preset not found: ${name}`);
        }
    };

    // Expose Galaxy View controls object
    window.galaxyViewControls = {
        setMotionMode: (mode) => setMotionMode(mode),
        toggleMotion: () => toggleMotion(),
        setAudioReactivity: (params) => setAudioReactivity(params),
        toggleCategory: (category) => toggleCategoryVisibility(category),
        getState: () => ({
            motionMode,
            motionEnabled,
            orbitSpeed,
            orbitRadius,
            audioReactivityEnabled,
            audioReactivityStrength,
            globalAudioReactivity,
            clusterSpreadOnAudio,
            audioFrequencyMode,
            particlesPerCluster,
            particleSize,
            clusterRadius,
            particleBrightness,
            moveSpeed,
            lookSensitivity
        })
    };

    console.log('✅ Galaxy View controls wired up for options menu');
}

// ============================================================================
// CONTROLS
// ============================================================================

function setupControls(container) {
    // Pointer lock
    container.addEventListener('click', () => {
        if (!isPointerLocked) {
            container.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Click to select particle
    renderer.domElement.addEventListener('click', onClick);
}

function onPointerLockChange() {
    isPointerLocked = document.pointerLockElement !== null;
    const instructions = document.getElementById('galaxyInstructions');
    if (instructions) {
        instructions.style.display = isPointerLocked ? 'none' : 'block';
    }
}

function onMouseMove(event) {
    if (!isPointerLocked) {
        // Update mouse position for raycasting
        const container = document.getElementById('galaxyViewContainer');
        if (!container || !renderer) return;

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    } else {
        // Camera look controls
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        yaw -= movementX * lookSensitivity;
        pitch -= movementY * lookSensitivity;

        // Limit pitch to prevent flipping
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    }
}

function onKeyDown(event) {
    keys[event.code] = true;
}

function onKeyUp(event) {
    keys[event.code] = false;
}

function onClick(event) {
    if (isPointerLocked) return; // Don't click particles when pointer is locked

    // Raycast to find clicked particle cluster
    raycaster.setFromCamera(mouse, camera);

    // Raycast against the instanced mesh
    const intersects = raycaster.intersectObject(particleSystem);

    if (intersects.length > 0) {
        const intersection = intersects[0];
        const instanceId = intersection.instanceId;

        // Find which cluster this instance belongs to
        let clickedCluster = null;
        for (const cluster of particles) {
            const subParticle = cluster.subParticles.find(sp => sp.instanceIndex === instanceId);
            if (subParticle) {
                clickedCluster = cluster;
                break;
            }
        }

        if (clickedCluster) {
            const file = clickedCluster.file;
            console.log('✅ Clicked cluster:', file.name, 'ID:', file.id);

            // Load file using global function
            if (window.loadAudio) {
                window.loadAudio(file.id, true);
            } else {
                console.error('❌ window.loadAudio not found!');
            }
        }
    }
}

function updateMovement(delta) {
    if (!isPointerLocked) return;

    // Update camera rotation
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    // Movement direction
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);

    forward.applyQuaternion(camera.quaternion);
    right.applyQuaternion(camera.quaternion);

    // Reset velocity
    velocity.set(0, 0, 0);

    // Check if Shift is held (sprint mode)
    const isSprinting = keys['ShiftLeft'] || keys['ShiftRight'];
    const currentSpeed = isSprinting ? moveSpeed * 2.5 : moveSpeed;

    // WASD movement
    if (keys['KeyW']) velocity.add(forward);
    if (keys['KeyS']) velocity.sub(forward);
    if (keys['KeyA']) velocity.sub(right);
    if (keys['KeyD']) velocity.add(right);

    // Normalize and apply speed
    if (velocity.length() > 0) {
        velocity.normalize().multiplyScalar(currentSpeed);
        camera.position.add(velocity);
    }
}

// ============================================================================
// ANIMATION LOOP
// ============================================================================

function startAnimation() {
    let lastTime = performance.now();

    function animate() {
        if (!scene || !camera || !renderer) return;

        const currentTime = performance.now();
        const delta = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        // Update audio analysis
        updateAudioAmplitude();

        // Update particle animation (motion modes + audio reactivity)
        updateParticleAnimation(delta);

        // Update camera movement
        updateMovement(delta);

        // Render scene
        renderer.render(scene, camera);

        animationFrameId = requestAnimationFrame(animate);
    }

    animate();
}
