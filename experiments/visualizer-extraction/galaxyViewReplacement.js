// === GALAXY VIEW REPLACEMENT ===
// Drop-in replacement for src/views/galaxyView.js
// Preserves EXACT appearance from visualizer_V37_for_extraction.html
// Connects to global window.audioFiles and window.wavesurfer

// GLOBAL VARIABLES (from original visualizer)
let scene, camera, renderer, particleSystem, particles = [];
let composer, bloomPass;
let raycaster, mouse;
let animationId = null;
let isGalaxyViewActive = false;

// Animation variables
let animationTime = 0;
let orbitSpeed = 0.0000015;
let orbitRadius = 80;
let galaxyCenterX = 0;
let galaxyCenterY = 0;
let galaxyCenterZ = 0;
let rotationMode = 'collective';
let rotationAxis = 'y';
let motionEnabled = true;

// Particle settings (exact from original)
let particleSize = 17.5;
let particleShape = 'circle';
let particleBrightness = 0.8;
let visibilityDistance = 900;
let particlesPerCluster = 48;
let clusterRadius = 10;
let clusterSpreadOnAudio = 3.0;
let subParticleScale = 0.3;
let mainToSubSizeRatio = 2.0;
let subParticleMotionSpeed = 3.6;
let subParticleShape = 'default';
let subParticleMotionPath = 'natural';
let subParticleAnimationSpeed = 0.5;
let maxParticleCount = 0;
let sizeGradient = 0.0;
let densityGradient = 0.0;
let bloomStrength = 0.0;

// Visualization modes
let currentColorMode = 'tags';
let currentXMode = 'bpm';
let currentYMode = 'key';
let currentZMode = 'tags';
let xAxisScale = 1.0;
let yAxisScale = 1.0;
let zAxisScale = 1.0;

// Crosshair control
let crosshairEnabled = true; // Default to ON

// Mouse interaction
let mouseInteractionEnabled = true;
let hoveredCluster = null;
let hoverSlowdown = 0.1;
let hoverScale = 1.0;
let mouse3D = new THREE.Vector3();
let mouseWorldPos = new THREE.Vector3();

// Audio reactivity
let audioContext = null;
let analyser = null;
let audioDataArray = null;
let currentAudioAmplitude = 0;
let bassAmplitude = 0;
let midsAmplitude = 0;
let highsAmplitude = 0;
let audioFrequencyMode = 'all';
let audioReactivityEnabled = true;
let audioReactivityStrength = 40.0;
let globalAudioReactivity = 4.4;

// Hidden categories for visibility toggle
let hiddenCategories = new Set();

// FPS controls
let moveSpeed = 3.0;
let lookSensitivity = 0.002;
let keys = {};
let isShiftPressed = false;
let pitch = 0, yaw = 0;
let isPointerLocked = false;

// Category colors (exact from original)
const mainCategoryColors = {
    'drm': { hue: 0, sat: 0.8, name: 'Red' },
    'drums': { hue: 0, sat: 0.8, name: 'Red' },
    'inst': { hue: 30, sat: 0.8, name: 'Orange' },
    'vox': { hue: 240, sat: 0.8, name: 'Blue' },
    'bass': { hue: 280, sat: 0.8, name: 'Purple' },
    'gtr': { hue: 60, sat: 0.8, name: 'Yellow' },
    'pno': { hue: 180, sat: 0.8, name: 'Cyan' },
    'piano': { hue: 180, sat: 0.8, name: 'Cyan' },
    'syn': { hue: 120, sat: 0.8, name: 'Green' },
    'perc': { hue: 15, sat: 0.85, name: 'Coral' },
    'pad': { hue: 200, sat: 0.75, name: 'Sky' },
    'lead': { hue: 320, sat: 0.8, name: 'Magenta' },
    'fx': { hue: 160, sat: 0.7, name: 'Teal' },
    'arp': { hue: 270, sat: 0.8, name: 'Violet' },
    'other': { hue: 0, sat: 0, name: 'Gray' }
};

// Musical key to position mapping
const keyToPosition = {
    'Cmaj': 0, 'C#maj': 1, 'Dbmaj': 1, 'Dmaj': 2, 'D#maj': 3, 'Ebmaj': 3,
    'Emaj': 4, 'Fmaj': 5, 'F#maj': 6, 'Gbmaj': 6, 'Gmaj': 7, 'G#maj': 8,
    'Abmaj': 8, 'Amaj': 9, 'A#maj': 10, 'Bbmaj': 10, 'Bmaj': 11,
    'Cmin': 0.5, 'C#min': 1.5, 'Dbmin': 1.5, 'Dmin': 2.5, 'D#min': 3.5,
    'Ebmin': 3.5, 'Emin': 4.5, 'Fmin': 5.5, 'F#min': 6.5, 'Gbmin': 6.5,
    'Gmin': 7.5, 'G#min': 8.5, 'Abmin': 8.5, 'Amin': 9.5, 'A#min': 10.5,
    'Bbmin': 10.5, 'Bmin': 11.5
};

// Key color map (circle of fifths)
const keyColorMap = {
    'Cmaj': 0, 'Gmaj': 30, 'Dmaj': 60, 'Amaj': 90, 'Emaj': 120, 'Bmaj': 150,
    'F#maj': 180, 'Dbmaj': 210, 'Abmaj': 240, 'Ebmaj': 270, 'Bbmaj': 300, 'Fmaj': 330,
    'Cmin': 15, 'Gmin': 45, 'Dmin': 75, 'Amin': 105, 'Emin': 135, 'Bmin': 165,
    'F#min': 195, 'Dbmin': 225, 'Abmin': 255, 'Ebmin': 285, 'Bbmin': 315, 'Fmin': 345
};

/**
 * Main initialization function - call this to render the galaxy view
 * @param {HTMLElement} container - Container element to render into
 */
export function renderGalaxyView(container) {
    isGalaxyViewActive = true;

    // Initialize Three.js scene
    initScene(container);

    // Load particles from global audioFiles
    if (window.audioFiles && window.audioFiles.length > 0) {
        createParticles(window.audioFiles);
    }

    // Connect to global wavesurfer if it exists
    if (window.wavesurfer) {
        connectToWavesurfer(window.wavesurfer);
    }

    // Start animation loop
    animate();

    // Load options menu UI
    loadOptionsMenu();

    // Initialize stats display
    updateStats();

    // Periodically update file count to ensure it stays correct
    setInterval(() => {
        if (window.audioFiles && window.audioFiles.length > 0) {
            updateFileCount();
        }
    }, 1000);

    return {
        destroy: destroyGalaxyView,
        updateFiles: (files) => createParticles(files),
        connectAudio: (wavesurfer) => connectToWavesurfer(wavesurfer)
    };
}

/**
 * Initialize Three.js scene (exact from original)
 */
function initScene(container) {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, visibilityDistance);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, visibilityDistance * 2);
    camera.position.set(0, 10, 30);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Setup post-processing for bloom effect
    if (typeof THREE.EffectComposer !== 'undefined') {
        const renderScene = new THREE.RenderPass(scene, camera);
        bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            bloomStrength,
            1.0,
            0.1
        );

        composer = new THREE.EffectComposer(renderer);
        composer.addPass(renderScene);
        composer.addPass(bloomPass);
    }

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Lighting (exact from original)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const light1 = new THREE.PointLight(0x667eea, 1.5, 100);
    light1.position.set(50, 50, 50);
    scene.add(light1);

    const light2 = new THREE.PointLight(0x764ba2, 1.5, 100);
    light2.position.set(-50, -50, -50);
    scene.add(light2);

    // Add stars background
    addStarsBackground();

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    renderer.domElement.addEventListener('click', onClick);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Pointer lock for FPS navigation (desktop only)
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    if (!isMobile) {
        renderer.domElement.addEventListener('click', () => {
            renderer.domElement.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            isPointerLocked = document.pointerLockElement === renderer.domElement;

            // Update crosshair visibility based on pointer lock state
            const crosshair = document.querySelector('.crosshair');
            if (crosshair) {
                // Show crosshair when pointer is locked AND crosshair is enabled
                // Hide when pointer is not locked
                if (isPointerLocked && crosshairEnabled) {
                    crosshair.style.display = 'block';
                } else {
                    crosshair.style.display = 'none';
                }
            }
        });
    }
}

/**
 * Create particle system from audio files (exact from original)
 */
function createParticles(audioFiles) {
    if (!scene) return;

    // Clear existing particles
    if (particleSystem) {
        scene.remove(particleSystem);
        if (particleSystem.geometry) particleSystem.geometry.dispose();
        if (particleSystem.material) particleSystem.material.dispose();
    }
    particles = [];

    // Calculate particles needed
    const densityAddition = Math.floor(densityGradient * particlesPerCluster);
    const totalParticlesPerCluster = particlesPerCluster + densityAddition;

    let totalParticles = audioFiles.length * totalParticlesPerCluster;

    // Apply max particle limit if set
    if (maxParticleCount > 0 && totalParticles > maxParticleCount) {
        totalParticles = maxParticleCount;
    }

    // Create geometry and material
    const geometry = new THREE.PlaneGeometry(1, 1);

    // Create particle texture
    const texture = createParticleTexture(particleShape);

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: particleBrightness,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    // Create instanced mesh
    particleSystem = new THREE.InstancedMesh(geometry, material, totalParticles);
    particleSystem.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let instanceIndex = 0;

    // Create particles for each file
    audioFiles.forEach((file, fileIndex) => {
        const seed = fileIndex * 10000;

        // Calculate position based on axis modes
        const x = calculateAxisValue(file, currentXMode, 200) * xAxisScale + (seededRandom(seed + 1) - 0.5) * 5;
        const y = calculateAxisValue(file, currentYMode, 100) * yAxisScale + (seededRandom(seed + 2) - 0.5) * 5;
        const z = calculateAxisValue(file, currentZMode, 150) * zAxisScale + (seededRandom(seed + 3) - 0.5) * 5;

        // Get color for file
        const colorData = getColorForFile(file);
        const baseColor = new THREE.Color().setHSL(colorData.hue / 360, colorData.sat, 0.6);

        // Create cluster
        const cluster = {
            file,
            centerPosition: new THREE.Vector3(x, y, z),
            color: baseColor.clone(),
            colorData,
            fileIndex,
            subParticles: [],
            customTime: null,
            lastRealTime: null
        };

        // Create sub-particles for this cluster
        const actualParticlesPerCluster = Math.min(totalParticlesPerCluster, Math.floor(totalParticles / audioFiles.length));

        for (let i = 0; i < actualParticlesPerCluster && instanceIndex < totalParticles; i++) {
            let offsetX, offsetY, offsetZ;
            let isCenterParticle = false;
            let radiusVariation = 0;

            if (i < 2) {
                // First 2 particles at center
                offsetX = 0;
                offsetY = 0;
                offsetZ = 0;
                isCenterParticle = true;
                radiusVariation = 0;
            } else {
                // Generate position based on sub-particle shape
                const theta = seededRandom(seed + i * 2) * Math.PI * 2;
                const phi = Math.acos(2 * seededRandom(seed + i * 2 + 1) - 1);

                if (subParticleShape === 'sphere') {
                    radiusVariation = 1.0;
                } else if (subParticleShape === 'spiked') {
                    radiusVariation = seededRandom(seed + i * 3) < 0.5 ? 0.4 : 1.0;
                } else {
                    radiusVariation = 0.5 + seededRandom(seed + i * 3) * 0.5;
                }

                offsetX = clusterRadius * Math.sin(phi) * Math.cos(theta) * radiusVariation;
                offsetY = clusterRadius * Math.sin(phi) * Math.sin(theta) * radiusVariation;
                offsetZ = clusterRadius * Math.cos(phi) * radiusVariation;
            }

            const subParticle = {
                offset: new THREE.Vector3(offsetX, offsetY, offsetZ),
                instanceIndex: instanceIndex,
                orbitPhase: seededRandom(seed + i + 999) * Math.PI * 2,
                isCenterParticle,
                baseRadius: radiusVariation,
                randomOrbitAxis: new THREE.Vector3(
                    seededRandom(seed + i * 10) * 2 - 1,
                    seededRandom(seed + i * 20) * 2 - 1,
                    seededRandom(seed + i * 30) * 2 - 1
                ).normalize(),
                randomOrbitSpeed: 0.5 + seededRandom(seed + i * 40) * 1.5
            };

            cluster.subParticles.push(subParticle);

            // Set initial position and scale
            dummy.position.set(x + offsetX, y + offsetY, z + offsetZ);
            dummy.scale.setScalar(particleSize * (isCenterParticle ? 1 : subParticleScale));
            dummy.updateMatrix();
            particleSystem.setMatrixAt(instanceIndex, dummy.matrix);

            // Set color
            if (isCenterParticle) {
                color.setHSL(colorData.hue / 360, colorData.sat, 0.8);
            } else {
                const colorSeed = seed + i + 5000;
                const hueShift = (seededRandom(colorSeed) - 0.5) * 0.05;
                const baseLightness = 0.6 + (seededRandom(colorSeed + 1) - 0.5) * 0.1;
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

    scene.add(particleSystem);
    console.log(`Created ${particles.length} clusters with ${instanceIndex} particles`);
}

/**
 * Animation loop
 */
function animate() {
    if (!isGalaxyViewActive) return;

    animationId = requestAnimationFrame(animate);

    animationTime += 0.016;

    // Update audio amplitude
    updateAudioAmplitude();

    // Update particles
    updateParticles();

    // Update movement
    updateMovement();

    // Update targeting
    updateTargeting();

    // Render
    if (bloomStrength > 0 && composer) {
        bloomPass.strength = bloomStrength;
        composer.render();
    } else {
        renderer.render(scene, camera);
    }

    // Update stats
    updateStats();
}

/**
 * Update particle positions and effects
 */
function updateParticles() {
    if (!particleSystem || particles.length === 0) return;

    const dummy = new THREE.Object3D();

    particles.forEach((cluster, clusterIndex) => {
        // Check if category is hidden
        const category = getCategoryForFile(cluster.file);
        const isHidden = hiddenCategories.has(category);

        // Handle hover time slowdown
        let clusterTime = animationTime;
        if (hoveredCluster === cluster && mouseInteractionEnabled && hoverSlowdown < 1) {
            if (cluster.customTime === null) {
                cluster.customTime = animationTime;
                cluster.lastRealTime = animationTime;
            }
            const realDelta = animationTime - cluster.lastRealTime;
            const slowedDelta = realDelta * hoverSlowdown;
            cluster.customTime += slowedDelta;
            cluster.lastRealTime = animationTime;
            clusterTime = cluster.customTime;
        } else {
            cluster.customTime = null;
            cluster.lastRealTime = null;
        }

        // Calculate cluster motion
        let clusterOffsetX = 0, clusterOffsetY = 0, clusterOffsetZ = 0;

        if (motionEnabled) {
            switch(rotationMode) {
                case 'collective':
                    const angle = clusterTime * orbitSpeed * 1000;
                    clusterOffsetX = Math.sin(angle) * orbitRadius;
                    clusterOffsetY = Math.sin(angle * 1.5) * orbitRadius * 0.5;
                    clusterOffsetZ = Math.cos(angle) * orbitRadius;
                    break;

                case 'spiral':
                    const spiralAngle = clusterTime * orbitSpeed * 1000 + clusterIndex * 0.5;
                    const spiralRadius = orbitRadius * (1 + Math.sin(clusterTime * 0.1) * 0.3);
                    clusterOffsetX = Math.sin(spiralAngle) * spiralRadius;
                    clusterOffsetY = Math.sin(clusterTime * orbitSpeed * 500) * orbitRadius * 0.7;
                    clusterOffsetZ = Math.cos(spiralAngle) * spiralRadius;
                    break;

                case 'individual':
                    const seed = clusterIndex * 1000;
                    clusterOffsetX = Math.sin(clusterTime * orbitSpeed * 1000 + seed) * orbitRadius;
                    clusterOffsetY = Math.cos(clusterTime * orbitSpeed * 800 + seed * 1.5) * orbitRadius * 0.7;
                    clusterOffsetZ = Math.sin(clusterTime * orbitSpeed * 1200 + seed * 0.5) * orbitRadius;
                    break;
            }
        }

        // Update sub-particles
        cluster.subParticles.forEach((subParticle, subIndex) => {
            if (isHidden) {
                dummy.position.set(0, -10000, 0);
                dummy.scale.setScalar(0.001);
            } else {
                const orbitTime = clusterTime * subParticleAnimationSpeed * 0.001;
                const phase = subParticle.orbitPhase;

                let localX = subParticle.offset.x;
                let localY = subParticle.offset.y;
                let localZ = subParticle.offset.z;

                // Sub-particle animation
                if (subParticleMotionPath === 'ring') {
                    const ringAngle = orbitTime * subParticleMotionSpeed + phase;
                    const ringRadius = Math.sqrt(localX * localX + localZ * localZ);
                    localX = Math.cos(ringAngle) * ringRadius;
                    localZ = Math.sin(ringAngle) * ringRadius;
                } else if (subParticleMotionPath === 'sphere') {
                    const theta = orbitTime * subParticleMotionSpeed + phase;
                    const phi = Math.sin(orbitTime * 0.5) * Math.PI;
                    const r = subParticle.baseRadius * clusterRadius;
                    localX = r * Math.sin(phi) * Math.cos(theta);
                    localY = r * Math.sin(phi) * Math.sin(theta);
                    localZ = r * Math.cos(phi);
                }

                // Audio reactivity expansion
                let audioExpansion = 1.0;
                if (audioReactivityEnabled && currentAudioAmplitude > 0) {
                    const isPlayingFile = window.currentFileId && cluster.file.id === window.currentFileId;

                    if (isPlayingFile) {
                        audioExpansion = 1.0 + currentAudioAmplitude * (audioReactivityStrength / 10);
                    } else {
                        audioExpansion = 1.0 + currentAudioAmplitude * (globalAudioReactivity / 100);
                    }

                    if (!subParticle.isCenterParticle) {
                        audioExpansion *= (1.0 + currentAudioAmplitude * clusterSpreadOnAudio * 0.01);
                    }
                }

                const x = cluster.centerPosition.x + clusterOffsetX + localX * audioExpansion;
                const y = cluster.centerPosition.y + clusterOffsetY + localY * audioExpansion;
                const z = cluster.centerPosition.z + clusterOffsetZ + localZ * audioExpansion;

                dummy.position.set(x, y, z);

                // Scale
                let scale = particleSize * (subParticle.isCenterParticle ? 1 : subParticleScale);

                // Audio pulse
                if (audioReactivityEnabled) {
                    const isPlayingFile = window.currentFileId && cluster.file.id === window.currentFileId;
                    if (isPlayingFile) {
                        scale *= (1.0 + currentAudioAmplitude * (audioReactivityStrength / 100));
                    } else {
                        scale *= (1.0 + currentAudioAmplitude * (globalAudioReactivity * 0.005));
                    }
                }

                // Hover scale
                if (hoveredCluster === cluster && mouseInteractionEnabled && hoverScale > 1.0) {
                    scale *= hoverScale;
                }

                dummy.scale.setScalar(scale);
            }

            dummy.lookAt(camera.position);
            dummy.updateMatrix();
            particleSystem.setMatrixAt(subParticle.instanceIndex, dummy.matrix);
        });
    });

    particleSystem.instanceMatrix.needsUpdate = true;
}

/**
 * Connect to global WaveSurfer instance for audio analysis
 */
function connectToWavesurfer(wavesurfer) {
    if (!wavesurfer) {
        console.warn('⚠️ No wavesurfer instance provided to connect to');
        return;
    }

    console.log('🎵 Connecting Galaxy View to audio...');

    try {
        // Get Web Audio API context - try multiple methods
        let ctx = null;
        let sourceNode = null;

        // Method 1: Try getBackend() for WaveSurfer v7+
        if (wavesurfer.getBackend && typeof wavesurfer.getBackend === 'function') {
            const backend = wavesurfer.getBackend();
            if (backend && backend.getAudioContext) {
                ctx = backend.getAudioContext();
                console.log('✅ Got context via getBackend().getAudioContext()');
            } else if (backend && backend.ac) {
                ctx = backend.ac;
                console.log('✅ Got context via backend.ac');
            }

            // Try to get the source node
            if (backend && backend.source) {
                sourceNode = backend.source;
            }
        }

        // Method 2: Direct backend access
        if (!ctx && wavesurfer.backend) {
            if (wavesurfer.backend.ac) {
                ctx = wavesurfer.backend.ac;
                console.log('✅ Got context via backend.ac');
            } else if (wavesurfer.backend.audioContext) {
                ctx = wavesurfer.backend.audioContext;
                console.log('✅ Got context via backend.audioContext');
            }

            // Try to get the source node
            if (wavesurfer.backend.source) {
                sourceNode = wavesurfer.backend.source;
            }
        }

        // Method 3: Check for Web Audio backend with existing analyser
        if (!ctx && wavesurfer.backend && wavesurfer.backend.analyser) {
            // Already has analyser, just use it
            analyser = wavesurfer.backend.analyser;
            audioContext = analyser.context;
            audioDataArray = new Uint8Array(analyser.frequencyBinCount);
            console.log('✅ Using existing WaveSurfer analyser');

            // Display current file info
            updateCurrentFileDisplay();
            return;
        }

        if (ctx) {
            audioContext = ctx;

            // Create our own analyser
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.8;
            audioDataArray = new Uint8Array(analyser.frequencyBinCount);

            // Try to connect to the audio graph
            if (wavesurfer.backend && wavesurfer.backend.analyser) {
                // WaveSurfer already has an analyser, connect to it
                wavesurfer.backend.analyser.connect(analyser);
                console.log('✅ Connected to existing WaveSurfer analyser chain');
            } else if (wavesurfer.backend && wavesurfer.backend.gainNode) {
                // Connect via gain node
                try {
                    const gain = wavesurfer.backend.gainNode;
                    gain.connect(analyser);
                    analyser.connect(audioContext.destination);
                    console.log('✅ Connected via gain node');
                } catch (e) {
                    console.log('⚠️ Could not connect via gain node:', e.message);
                }
            }

            console.log('🎉 Audio reactivity ready! Context:', audioContext.state);

            // Update current file display
            updateCurrentFileDisplay();

            // Log initial test
            setTimeout(() => {
                if (analyser) {
                    analyser.getByteFrequencyData(audioDataArray);
                    const sum = audioDataArray.reduce((a, b) => a + b, 0);
                    console.log('📊 Audio data test - sum:', sum, 'max:', Math.max(...audioDataArray));
                }
            }, 1000);
        } else {
            console.warn('❌ Could not get audio context from WaveSurfer');
            console.log('WaveSurfer structure:', {
                hasBackend: !!wavesurfer.backend,
                hasGetBackend: !!wavesurfer.getBackend,
                backendType: wavesurfer.backend?.constructor?.name
            });
        }
    } catch (e) {
        console.error('❌ Error connecting audio:', e);
    }
}

/**
 * Update the display to show which file is currently playing
 */
function updateCurrentFileDisplay() {
    // Get current file ID from window
    const currentFileId = window.currentFileId || window.currentFile;

    if (currentFileId && window.audioFiles) {
        const currentFile = window.audioFiles.find(f => f.id === currentFileId);
        if (currentFile) {
            console.log(`🎵 Currently playing: ${currentFile.display_name || currentFile.filename}`);
            console.log(`📊 File ID: ${currentFile.id}`);
            console.log(`🏷️ Tags: ${currentFile.tags || 'none'}`);
            console.log(`🎹 Key: ${currentFile.key || 'unknown'}, BPM: ${currentFile.bpm || 'unknown'}`);

            // Update any UI elements that show current file
            const currentFileElements = document.querySelectorAll('.current-file-display');
            currentFileElements.forEach(el => {
                el.textContent = `Playing: ${currentFile.display_name || currentFile.filename}`;
                el.style.color = '#0f0';
            });

            // Highlight the current file's cluster in the galaxy
            if (particles) {
                particles.forEach((cluster, index) => {
                    if (cluster && cluster.fileData && cluster.fileData.id === currentFileId) {
                        // This is the currently playing file
                        cluster.isCurrentFile = true;
                        console.log(`✨ File cluster ${index} is now the current file - audio reactivity active`);
                    } else if (cluster) {
                        cluster.isCurrentFile = false;
                    }
                });
            }
        }
    } else {
        console.log('📻 No file currently playing');
    }
}

/**
 * Update audio amplitude from analyser
 */
function updateAudioAmplitude() {
    if (!analyser || !audioDataArray) {
        currentAudioAmplitude = 0;
        bassAmplitude = 0;
        midsAmplitude = 0;
        highsAmplitude = 0;
        return;
    }

    analyser.getByteFrequencyData(audioDataArray);

    const bufferLength = analyser.frequencyBinCount;
    const bassEnd = Math.floor(250 / (audioContext.sampleRate / 2) * bufferLength);
    const midsEnd = Math.floor(2000 / (audioContext.sampleRate / 2) * bufferLength);

    let bassSum = 0, midsSum = 0, highsSum = 0;
    let bassCount = 0, midsCount = 0, highsCount = 0;

    for (let i = 0; i < bassEnd && i < bufferLength; i++) {
        bassSum += audioDataArray[i];
        bassCount++;
    }

    for (let i = bassEnd; i < midsEnd && i < bufferLength; i++) {
        midsSum += audioDataArray[i];
        midsCount++;
    }

    for (let i = midsEnd; i < bufferLength; i++) {
        highsSum += audioDataArray[i];
        highsCount++;
    }

    const bassAvg = bassCount > 0 ? bassSum / bassCount : 0;
    const midsAvg = midsCount > 0 ? midsSum / midsCount : 0;
    const highsAvg = highsCount > 0 ? highsSum / highsCount : 0;

    bassAmplitude = Math.min((bassAvg / 128) * 3, 5);
    midsAmplitude = Math.min((midsAvg / 128) * 3, 5);
    highsAmplitude = Math.min((highsAvg / 128) * 3, 5);

    switch(audioFrequencyMode) {
        case 'bass':
            currentAudioAmplitude = bassAmplitude;
            break;
        case 'mids':
            currentAudioAmplitude = midsAmplitude;
            break;
        case 'highs':
            currentAudioAmplitude = highsAmplitude;
            break;
        default:
            currentAudioAmplitude = (bassAmplitude * 0.5 + midsAmplitude * 0.3 + highsAmplitude * 0.2);
    }
}

// === HELPER FUNCTIONS (exact from original) ===

function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

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
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
}

function getCategoryForFile(file) {
    if (!file.tags || !Array.isArray(file.tags) || file.tags.length === 0) {
        return 'other';
    }

    const firstTag = file.tags[0].toLowerCase();

    // Check if it's a main category
    if (mainCategoryColors[firstTag]) {
        return firstTag;
    }

    // Check common variations
    if (firstTag.includes('drum')) return 'drums';
    if (firstTag.includes('vox') || firstTag.includes('vocal')) return 'vox';
    if (firstTag.includes('bass')) return 'bass';
    if (firstTag.includes('gtr') || firstTag.includes('guitar')) return 'gtr';
    if (firstTag.includes('pno') || firstTag.includes('piano')) return 'piano';
    if (firstTag.includes('syn')) return 'syn';
    if (firstTag.includes('pad')) return 'pad';
    if (firstTag.includes('lead')) return 'lead';
    if (firstTag.includes('fx')) return 'fx';

    return 'other';
}

function getColorForFile(file) {
    if (currentColorMode === 'tags') {
        const category = getCategoryForFile(file);
        return mainCategoryColors[category] || mainCategoryColors['other'];
    } else if (currentColorMode === 'key') {
        return getColorByKey(file.key);
    } else if (currentColorMode === 'bpm') {
        return getColorByBPM(file.bpm);
    }
    return { hue: 200, sat: 0.6 };
}

function getColorByKey(key) {
    if (key && keyColorMap[key] !== undefined) {
        return { hue: keyColorMap[key], sat: 0.8 };
    }
    return { hue: 0, sat: 0 };
}

function getColorByBPM(bpm) {
    if (!bpm) return { hue: 0, sat: 0 };

    if (bpm < 80) return { hue: 240, sat: 0.8 };
    if (bpm < 100) return { hue: 180, sat: 0.8 };
    if (bpm < 120) return { hue: 120, sat: 0.8 };
    if (bpm < 140) return { hue: 60, sat: 0.8 };
    if (bpm < 160) return { hue: 30, sat: 0.8 };
    return { hue: 0, sat: 0.8 };
}

function calculateAxisValue(file, mode, range) {
    switch(mode) {
        case 'bpm':
            if (file.bpm) {
                const normalized = ((file.bpm - 60) / 140);
                return normalized * range - (range / 2);
            }
            return (Math.random() - 0.5) * range;

        case 'key':
            if (file.key && keyToPosition[file.key] !== undefined) {
                const normalized = keyToPosition[file.key] / 11.5;
                return normalized * range - (range / 2);
            }
            return (Math.random() - 0.5) * range;

        case 'tags':
            if (file.tags && file.tags.length > 0) {
                const tagHash = file.tags[0].split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const normalized = (tagHash % 100) / 100;
                return normalized * range - (range / 2);
            }
            return (Math.random() - 0.5) * range;

        case 'random':
        default:
            return (Math.random() - 0.5) * range;
    }
}

function addStarsBackground() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0x888888, size: 0.5 });

    const starsVertices = [];
    for (let i = 0; i < 10000; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);
}

// === EVENT HANDLERS ===

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
    }
}

function onMouseMove(event) {
    if (isPointerLocked) {
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        yaw -= movementX * lookSensitivity;
        pitch -= movementY * lookSensitivity;
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    } else {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        mouse3D.set(mouse.x, mouse.y, 0.5);
        mouse3D.unproject(camera);

        const dir = mouse3D.sub(camera.position).normalize();
        const distance = 30;
        mouseWorldPos.copy(camera.position).add(dir.multiplyScalar(distance));
    }
}

function onClick(event) {
    if (!particleSystem || event.target.tagName !== 'CANVAS') return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(particleSystem);

    if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;

        // Find clicked cluster
        let clickedCluster = null;
        for (const cluster of particles) {
            for (const subParticle of cluster.subParticles) {
                if (subParticle.instanceIndex === instanceId) {
                    clickedCluster = cluster;
                    break;
                }
            }
            if (clickedCluster) break;
        }

        if (clickedCluster && window.loadAudio) {
            // Use global loadAudio function to play file
            console.log('🎵 Particle clicked, loading file:', clickedCluster.file.id, clickedCluster.file.name);
            window.loadAudio(clickedCluster.file.id);
        }
    }
}

function onKeyDown(event) {
    keys[event.key.toLowerCase()] = true;

    if (event.shiftKey) isShiftPressed = true;

    // Handle keyboard shortcuts
    switch(event.key.toLowerCase()) {
        case 'h':
            // Hide all UI
            toggleHideAll();
            break;
        case 'escape':
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            break;
    }
}

function onKeyUp(event) {
    keys[event.key.toLowerCase()] = false;
    if (!event.shiftKey) isShiftPressed = false;
}

function updateMovement() {
    if (isPointerLocked) {
        camera.rotation.order = 'YXZ';
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
    }

    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);

    forward.applyQuaternion(camera.quaternion);
    right.applyQuaternion(camera.quaternion);

    if (keys['w'] || keys['arrowup']) direction.add(forward);
    if (keys['s'] || keys['arrowdown']) direction.sub(forward);
    if (keys['a'] || keys['arrowleft']) direction.sub(right);
    if (keys['d'] || keys['arrowright']) direction.add(right);

    direction.normalize();

    let currentSpeed = moveSpeed;
    if (isShiftPressed) {
        currentSpeed *= 3;
    }

    camera.position.add(direction.multiplyScalar(currentSpeed));
}

function updateTargeting() {
    if (!particleSystem) return;

    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObject(particleSystem);

    if (intersects.length > 0) {
        const instanceId = intersects[0].instanceId;

        let targetedCluster = null;
        for (const cluster of particles) {
            for (const subParticle of cluster.subParticles) {
                if (subParticle.instanceIndex === instanceId) {
                    targetedCluster = cluster;
                    break;
                }
            }
            if (targetedCluster) break;
        }

        if (targetedCluster) {
            hoveredCluster = mouseInteractionEnabled ? targetedCluster : null;
            updateTargetDisplay(targetedCluster.file.name);
        } else {
            hoveredCluster = null;
            updateTargetDisplay('None');
        }
    } else {
        hoveredCluster = null;
        updateTargetDisplay('None');
    }
}

function updateTargetDisplay(filename) {
    const targetElement = document.getElementById('targetedFile');
    if (targetElement) {
        targetElement.textContent = filename.length > 20 ? filename.substring(0, 20) + '...' : filename;
    }
}

function updateStats() {
    // Update stats display
    const stats = {
        totalFiles: window.audioFiles ? window.audioFiles.length : 0,
        cameraPos: camera ? `${Math.round(camera.position.x)}, ${Math.round(camera.position.y)}, ${Math.round(camera.position.z)}` : '0, 0, 0'
    };

    const totalFilesElement = document.getElementById('totalFiles');
    const cameraPosElement = document.getElementById('cameraPos');

    if (totalFilesElement) totalFilesElement.textContent = stats.totalFiles;
    if (cameraPosElement) cameraPosElement.textContent = stats.cameraPos;
}

function updateBrightness() {
    if (particleSystem && particleSystem.material) {
        particleSystem.material.opacity = window.particleBrightness || particleBrightness;
        particleSystem.material.needsUpdate = true;
    }
}

function updateBloomStrength() {
    if (bloomPass) {
        bloomPass.strength = window.bloomStrength || bloomStrength;
    }
}

function toggleHideAll() {
    const elements = document.querySelectorAll('.stats-overlay, .mode-controls, .tag-legend, .tag-filter-panel');
    elements.forEach(el => {
        el.style.display = el.style.display === 'none' ? '' : 'none';
    });
}

function loadOptionsMenu() {
    // Load the complete options menu HTML
    fetch('./galaxyOptionsMenuComplete.html')
        .then(response => response.text())
        .then(html => {
            // Create a container for the menu if it doesn't exist
            let menuContainer = document.getElementById('galaxyMenuContainer');
            if (!menuContainer) {
                menuContainer = document.createElement('div');
                menuContainer.id = 'galaxyMenuContainer';
                document.body.appendChild(menuContainer);
            }
            menuContainer.innerHTML = html;

            // Initialize drag and resize functionality
            if (window.initOptionsMenu2Drag) {
                window.initOptionsMenu2Drag();
            }
            if (window.initOptionsMenu2Resize) {
                window.initOptionsMenu2Resize();
            }

            // Update file count
            updateFileCount();

            console.log('Complete options menu loaded successfully');
        })
        .catch(err => {
            console.warn('Could not load options menu:', err);
            // Try fallback to simple menu
            console.log('Trying simple options menu as fallback...');
            fetch('./galaxyOptionsMenu.html')
                .then(response => response.text())
                .then(html => {
                    let menuContainer = document.getElementById('galaxyMenuContainer');
                    if (!menuContainer) {
                        menuContainer = document.createElement('div');
                        menuContainer.id = 'galaxyMenuContainer';
                        document.body.appendChild(menuContainer);
                    }
                    menuContainer.innerHTML = html;
                    console.log('Simple options menu loaded as fallback');
                })
                .catch(err => console.error('Could not load any options menu:', err));
        });
}

function updateFileCount() {
    // Use querySelectorAll to find ALL elements with this ID (in case of duplicates)
    const fileCountElements = document.querySelectorAll('#galaxyFileCount');
    const count = window.audioFiles ? window.audioFiles.length : 0;

    if (fileCountElements.length > 0) {
        fileCountElements.forEach((el, index) => {
            el.textContent = `${count} files loaded`;
            if (index > 0) {
                console.warn('⚠️ Found duplicate galaxyFileCount element!');
            }
        });
        console.log(`📊 Updated file count display: ${count} (found ${fileCountElements.length} element(s))`);
    } else {
        console.warn('⚠️ galaxyFileCount element not found yet');
    }

    // Also update via a delayed call to catch any late-rendering elements
    setTimeout(() => {
        const delayedElements = document.querySelectorAll('#galaxyFileCount');
        delayedElements.forEach(el => {
            el.textContent = `${count} files loaded`;
        });
    }, 100);
}

// === CROSSHAIR TOGGLE FUNCTION ===
window.toggleCrosshair = () => {
    crosshairEnabled = !crosshairEnabled;
    const crosshair = document.querySelector('.crosshair');
    if (crosshair) {
        crosshair.style.display = crosshairEnabled ? 'block' : 'none';
    }

    // Update button text if exists
    const btn = document.getElementById('crosshairToggleBtn');
    if (btn) btn.textContent = `Crosshair: ${crosshairEnabled ? 'ON' : 'OFF'}`;

    const galaxyBtn = document.getElementById('galaxyCrosshairToggle');
    if (galaxyBtn) galaxyBtn.textContent = `Crosshair: ${crosshairEnabled ? 'ON' : 'OFF'}`;

    console.log(`🎯 Crosshair: ${crosshairEnabled ? 'ON' : 'OFF'}`);
    return crosshairEnabled;
};

// Expose globally so it can be called from outside
window.updateGalaxyFileCount = updateFileCount;

/**
 * Clean up and destroy the galaxy view
 */
function destroyGalaxyView() {
    isGalaxyViewActive = false;

    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    if (particleSystem) {
        scene.remove(particleSystem);
        if (particleSystem.geometry) particleSystem.geometry.dispose();
        if (particleSystem.material) particleSystem.material.dispose();
    }

    if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
    }

    // Clean up event listeners
    window.removeEventListener('resize', onWindowResize);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);

    console.log('Galaxy view destroyed');
}

// Export functions for global access if needed
if (typeof window !== 'undefined') {
    // Expose variables directly on window for options menu
    window.particleSize = particleSize;
    window.particlesPerCluster = particlesPerCluster;
    window.clusterRadius = clusterRadius;
    window.particleShape = particleShape;
    window.particleBrightness = particleBrightness;
    window.orbitSpeed = orbitSpeed;
    window.orbitRadius = orbitRadius;
    window.motionEnabled = motionEnabled;
    window.moveSpeed = moveSpeed;
    window.lookSensitivity = lookSensitivity;
    window.visibilityDistance = visibilityDistance;
    window.currentColorMode = currentColorMode;
    window.currentXMode = currentXMode;
    window.currentYMode = currentYMode;
    window.currentZMode = currentZMode;
    window.xAxisScale = xAxisScale;
    window.yAxisScale = yAxisScale;
    window.zAxisScale = zAxisScale;
    window.audioReactivityStrength = audioReactivityStrength;
    window.globalAudioReactivity = globalAudioReactivity;
    window.audioFrequencyMode = audioFrequencyMode;
    window.bloomStrength = bloomStrength;
    window.rotationMode = rotationMode;
    window.rotationAxis = rotationAxis;

    // Expose functions that update these values and recreate particles
    // Update particle size - matches reference exactly
    window.updateParticleSize = (value) => {
        particleSize = parseFloat(value);
        window.particleSize = particleSize;
        const el = document.getElementById('galaxyParticleSizeValue');
        if (el) el.textContent = value;
        // Size is applied in the animation loop via instance matrix scaling
        console.log('📏 Particle size set to:', particleSize);
    };

    window.recreateParticles = () => {
        console.log('🔄 Recreating particles...');

        // CRITICAL: Sync local variables from window before recreating
        particleSize = window.particleSize !== undefined ? window.particleSize : particleSize;
        particlesPerCluster = window.particlesPerCluster !== undefined ? window.particlesPerCluster : particlesPerCluster;
        clusterRadius = window.clusterRadius !== undefined ? window.clusterRadius : clusterRadius;
        particleShape = window.particleShape !== undefined ? window.particleShape : particleShape;
        particleBrightness = window.particleBrightness !== undefined ? window.particleBrightness : particleBrightness;
        orbitSpeed = window.orbitSpeed !== undefined ? window.orbitSpeed : orbitSpeed;
        orbitRadius = window.orbitRadius !== undefined ? window.orbitRadius : orbitRadius;
        visibilityDistance = window.visibilityDistance !== undefined ? window.visibilityDistance : visibilityDistance;
        currentColorMode = window.currentColorMode !== undefined ? window.currentColorMode : currentColorMode;
        currentXMode = window.currentXMode !== undefined ? window.currentXMode : currentXMode;
        currentYMode = window.currentYMode !== undefined ? window.currentYMode : currentYMode;
        currentZMode = window.currentZMode !== undefined ? window.currentZMode : currentZMode;
        rotationMode = window.rotationMode !== undefined ? window.rotationMode : rotationMode;
        rotationAxis = window.rotationAxis !== undefined ? window.rotationAxis : rotationAxis;

        console.log('Synced values - Particle size:', particleSize, 'Particles per cluster:', particlesPerCluster);

        createParticles(window.audioFiles);
        updateFileCount();
    };

    // Update particle brightness - matches reference exactly
    window.updateParticleBrightness = (value) => {
        particleBrightness = parseFloat(value);
        window.particleBrightness = particleBrightness;
        const el = document.getElementById('galaxyBrightnessValue');
        if (el) el.textContent = value;
        if (particleSystem && particleSystem.material) {
            particleSystem.material.opacity = particleBrightness;
            particleSystem.material.needsUpdate = true;
        }
        console.log('✨ Brightness updated to:', particleBrightness);
    };

    // Update bloom strength - matches reference
    window.updateBloomStrength = (value) => {
        bloomStrength = parseFloat(value);
        window.bloomStrength = bloomStrength;
        const el = document.getElementById('bloomStrengthValue');
        if (el) el.textContent = value;
        // Bloom is applied in animation loop
        if (bloomPass) {
            bloomPass.strength = bloomStrength;
        }
        console.log('🌟 Bloom strength updated to:', value);
    };

    // Update audio reactivity strength (current file)
    window.updateAudioStrength = (value) => {
        audioReactivityStrength = parseFloat(value);
        window.audioReactivityStrength = audioReactivityStrength;
        const el = document.getElementById('audioStrengthValue');
        if (el) el.textContent = value;
        console.log('🔊 Audio strength updated to:', value);
    };

    // Update global audio reactivity (all particles)
    window.updateGlobalReactivity = (value) => {
        globalAudioReactivity = parseFloat(value);
        window.globalAudioReactivity = globalAudioReactivity;
        const el = document.getElementById('globalReactivityValue');
        if (el) el.textContent = value;
        console.log('🌍 Global audio reactivity updated to:', value);
    };

    // Add missing slider functions
    window.updateMotionSpeed = (value) => {
        window.orbitSpeed = parseFloat(value);
        orbitSpeed = window.orbitSpeed;
        const el = document.getElementById('speedValue');
        if (el) el.textContent = value;
        console.log('🔄 Motion speed updated to:', orbitSpeed);
    };

    window.updateMotionRadius = (value) => {
        window.orbitRadius = parseInt(value);
        orbitRadius = window.orbitRadius;
        const el = document.getElementById('radiusValue');
        if (el) el.textContent = value;
        console.log('🔄 Motion radius updated to:', orbitRadius);
    };

    window.updateStemOffset = (value) => {
        // This would offset stem particles if they exist
        window.stemOffset = parseInt(value);
        const el = document.getElementById('stemOffsetValue');
        if (el) el.textContent = value;
        console.log('🔄 Stem offset updated to:', value);
    };

    // Update visibility distance - matches reference
    window.updateVisibility = (value) => {
        visibilityDistance = parseFloat(value);
        window.visibilityDistance = visibilityDistance;
        const el = document.getElementById('galaxyVisibilityValue');
        if (el) el.textContent = value;
        console.log('👁️ Visibility distance updated to:', value);
    };

    // Update particle shape - requires recreation
    window.updateParticleShape = (value) => {
        particleShape = value;
        window.particleShape = value;
        if (particleSystem && particleSystem.material) {
            particleSystem.material.map = createParticleTexture(value);
            particleSystem.material.needsUpdate = true;
        }
        console.log('🔷 Particle shape updated to:', value);
    };

    // Update axis scales - matches reference
    window.updateXAxisScale = (value) => {
        xAxisScale = parseFloat(value);
        window.xAxisScale = xAxisScale;
        const el = document.getElementById('xAxisScaleValue');
        if (el) el.textContent = value;
        updateClusterPositions();
        console.log('📏 X-axis scale updated to:', value);
    };

    window.updateYAxisScale = (value) => {
        yAxisScale = parseFloat(value);
        window.yAxisScale = yAxisScale;
        const el = document.getElementById('yAxisScaleValue');
        if (el) el.textContent = value;
        updateClusterPositions();
        console.log('📏 Y-axis scale updated to:', value);
    };

    window.updateZAxisScale = (value) => {
        zAxisScale = parseFloat(value);
        window.zAxisScale = zAxisScale;
        const el = document.getElementById('zAxisScaleValue');
        if (el) el.textContent = value;
        updateClusterPositions();
        console.log('📏 Z-axis scale updated to:', value);
    };

    // Update cluster positions after scale changes
    function updateClusterPositions() {
        if (particles.length > 0) {
            particles.forEach((cluster, index) => {
                const newPos = calculateFilePosition(cluster.file, index);
                cluster.centerPosition.set(newPos.x, newPos.y, newPos.z);
            });
        }
    }

    // Update cluster spread - matches reference (modifies existing offsets)
    window.updateClusterSpread = (value) => {
        clusterRadius = parseFloat(value);
        window.clusterRadius = clusterRadius;
        const el = document.getElementById('clusterSpreadValue');
        if (el) el.textContent = value;

        // Update existing cluster sub-particle offsets using stored base radius
        if (particles.length > 0 && particleSystem) {
            particles.forEach(cluster => {
                cluster.subParticles.forEach(subParticle => {
                    // Skip center particles
                    if (subParticle.isCenterParticle) {
                        return;
                    }
                    // Recalculate offset with new radius using stored baseRadius
                    const normalized = subParticle.offset.clone().normalize();
                    subParticle.offset.copy(normalized.multiplyScalar(clusterRadius * (subParticle.baseRadius || 1)));
                });
            });
        }
        console.log('💫 Cluster spread updated to:', value);
    };

    // Update sub-particle size - applied in animation loop
    window.updateSubParticleSize = (value) => {
        subParticleScale = parseFloat(value);
        window.subParticleScale = subParticleScale;
        const el = document.getElementById('subParticleSizeValue');
        if (el) el.textContent = value;
        // Size is applied in animation loop
        console.log('✨ Sub-particle size updated to:', value);
    };

    // Update main to sub ratio - applied in animation loop
    window.updateMainToSubRatio = (value) => {
        mainToSubSizeRatio = parseFloat(value);
        window.mainToSubSizeRatio = mainToSubSizeRatio;
        const el = document.getElementById('mainToSubRatioValue');
        if (el) el.textContent = value;
        // Size is applied in the animation loop via instance matrix scaling
        console.log('📊 Main/Sub ratio updated to:', value);
    };

    // Update sub-particle count - MUST recreate (instance count changes)
    window.updateSubParticleCount = (value) => {
        const newCount = parseInt(value);
        const oldCount = particlesPerCluster;
        console.log(`Updating sub-particle count from ${oldCount} to ${newCount}`);
        particlesPerCluster = newCount;
        window.particlesPerCluster = newCount;
        const el = document.getElementById('subParticleCountValue');
        if (el) el.textContent = value;

        // Must recreate because InstancedMesh requires fixed instance count
        if (window.audioFiles && window.audioFiles.length > 0) {
            console.log(`Recreating ${window.audioFiles.length} clusters with ${particlesPerCluster} particles each`);
            createParticles(window.audioFiles);
        }
    };

    window.galaxyView = {
        render: renderGalaxyView,
        destroy: destroyGalaxyView,
        updateFiles: (files) => createParticles(files),
        connectAudio: (wavesurfer) => connectToWavesurfer(wavesurfer),
        // Also keep settings object for reference
        settings: {
            particleSize,
            particleShape,
            particleBrightness,
            motionEnabled,
            rotationMode,
            orbitSpeed,
            orbitRadius,
            audioReactivityEnabled,
            audioReactivityStrength,
            globalAudioReactivity,
            currentColorMode,
            currentXMode,
            currentYMode,
            currentZMode,
            bloomStrength
        }
    };
}