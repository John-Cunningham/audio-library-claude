/**
 * Galaxy View - 3D Audio File Visualizer
 *
 * Clean extraction from reference visualizer following modular architecture.
 *
 * Displays audio files as clusters of particles in 3D space with:
 * - FPS-style camera controls (WASD + mouse look)
 * - Real-time audio reactivity (particles pulse to music)
 * - Multiple visualization modes (tags, BPM, key, length)
 * - Particle clustering and orbital motion
 * - Click-to-play interaction
 *
 * @module GalaxyView
 */

export class GalaxyView {
    constructor(containerId, options = {}) {
        // Container
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Galaxy View container '#${containerId}' not found`);
        }

        // Dependencies (injected)
        this.playerStateManager = options.playerStateManager;
        this.onFileClick = options.onFileClick || (() => {});

        // Configuration
        this.config = {
            particleSize: options.particleSize || 17.5,
            particlesPerCluster: options.particlesPerCluster || 48,
            clusterRadius: options.clusterRadius || 10,
            moveSpeed: options.moveSpeed || 3.0,
            lookSensitivity: options.lookSensitivity || 0.002,
            orbitSpeed: options.orbitSpeed || 0.0000015,
            orbitRadius: options.orbitRadius || 80,
            visibilityDistance: options.visibilityDistance || 900,
            audioReactivity: options.audioReactivity !== false,
            globalAudioReactivity: options.globalAudioReactivity || 4.4,
            bloomStrength: options.bloomStrength || 0,
            hoverSlowdown: options.hoverSlowdown || 0.1,
            hoverScale: options.hoverScale || 1.0,
            colorMode: options.colorMode || 'tags',
            xAxisMode: options.xAxisMode || 'bpm',
            yAxisMode: options.yAxisMode || 'key',
            zAxisMode: options.zAxisMode || 'tags'
        };

        // Three.js core
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.bloomPass = null;
        this.raycaster = null;
        this.mouse = new THREE.Vector2();

        // Particle system
        this.particleSystem = null;
        this.particles = []; // Array of cluster objects
        this.audioFiles = [];

        // State
        this.isActive = false;
        this.isPointerLocked = false;
        this.animationId = null;
        this.animationTime = 0;

        // Camera state
        this.pitch = 0;
        this.yaw = 0;
        this.keys = {};
        this.velocity = new THREE.Vector3();

        // Audio reactivity
        this.currentAudioAmplitude = 0;
        this.bassAmplitude = 0;
        this.midsAmplitude = 0;
        this.highsAmplitude = 0;

        // Event listeners (bound methods for easy removal)
        this.boundOnKeyDown = this.onKeyDown.bind(this);
        this.boundOnKeyUp = this.onKeyUp.bind(this);
        this.boundOnMouseMove = this.onMouseMove.bind(this);
        this.boundOnClick = this.onClick.bind(this);
        this.boundOnResize = this.onWindowResize.bind(this);
        this.boundOnPointerLockChange = this.onPointerLockChange.bind(this);
    }

    /**
     * Initialize galaxy view with audio files data
     * @param {Array} audioFiles - Array of audio file objects
     */
    init(audioFiles) {
        console.log('🌌 Galaxy View: Initializing with', audioFiles.length, 'files');

        this.audioFiles = audioFiles;

        // Initialize global window properties for controls
        this.initializeGlobalControls();

        this.initScene();
        this.detectFrequentTags();
        this.createParticles();
        this.setupEventListeners();

        console.log('✅ Galaxy View: Initialization complete');
    }

    /**
     * Initialize global window properties for galaxy controls
     */
    initializeGlobalControls() {
        // Motion controls
        window.orbitSpeed = this.config.orbitSpeed;
        window.orbitRadius = this.config.orbitRadius;
        window.motionEnabled = true;

        // Rotation controls
        window.rotationMode = 'static'; // static, collective, spiral, individual
        window.rotationAxis = 'all'; // x, y, z, all

        // Particle appearance
        window.particleSize = this.config.particleSize;
        window.particleBrightness = 0.8;
        window.particleShape = 'circle'; // circle, square, triangle, star

        // Visibility
        window.visibilityDistance = this.config.visibilityDistance;

        // Axis scaling
        window.xAxisScale = 1.0;
        window.yAxisScale = 1.0;
        window.zAxisScale = 1.0;

        // Sub-particle controls
        window.subParticleScale = 0.3;
        window.mainToSubSizeRatio = 2.0;
        window.subParticleMotionSpeed = 3.6;
        window.subParticleAnimationSpeed = 0.5;
        window.subParticleMotionPath = 'natural'; // static, circular, spiral, random, natural
        window.subParticleShape = 'sphere'; // sphere, cube, plane

        // Visual gradients
        window.sizeGradient = 0;
        window.densityGradient = 0;

        // Audio reactivity
        window.audioReactivityEnabled = this.config.audioReactivity;
        window.audioReactivityStrength = 40;
        window.globalAudioReactivity = this.config.globalAudioReactivity;
        window.audioFrequencyMode = 'all'; // all, bass, mids, highs

        // Crosshair hover
        window.mouseInteractionEnabled = false;
        window.hoverSlowdown = this.config.hoverSlowdown;
        window.hoverScale = this.config.hoverScale;

        console.log('✅ Global galaxy controls initialized');
    }

    /**
     * Initialize Three.js scene
     */
    initScene() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, 10, this.config.visibilityDistance);

        // Camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, this.config.visibilityDistance * 2);
        this.camera.position.set(0, 10, 30);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Post-processing (bloom)
        const renderScene = new THREE.RenderPass(this.scene, this.camera);
        this.bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
            this.config.bloomStrength,
            1.0,
            0.1
        );

        this.composer = new THREE.EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(this.bloomPass);

        // Raycaster for click detection
        this.raycaster = new THREE.Raycaster();

        // Add crosshair
        this.addCrosshair();

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const light1 = new THREE.PointLight(0x667eea, 1.5, 100);
        light1.position.set(50, 50, 50);
        this.scene.add(light1);

        const light2 = new THREE.PointLight(0x764ba2, 1.5, 100);
        light2.position.set(-50, -50, -50);
        this.scene.add(light2);

        // Stars background
        this.addStarsBackground();
    }

    /**
     * Add crosshair at center of screen
     */
    addCrosshair() {
        const crosshairSize = 20;
        const crosshairThickness = 2;
        const crosshairColor = 0xffffff;
        const crosshairOpacity = 0.6;

        // Create crosshair geometry
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            // Horizontal line
            -crosshairSize, 0, 0,
            crosshairSize, 0, 0,
            // Vertical line
            0, -crosshairSize, 0,
            0, crosshairSize, 0,
        ]);

        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

        const material = new THREE.LineBasicMaterial({
            color: crosshairColor,
            opacity: crosshairOpacity,
            transparent: true,
            linewidth: crosshairThickness
        });

        const crosshair = new THREE.LineSegments(geometry, material);

        // Position crosshair in front of camera (moves with camera)
        this.crosshair = crosshair;
        this.camera.add(this.crosshair);
        this.crosshair.position.set(0, 0, -50); // 50 units in front of camera
    }

    /**
     * Add stars background
     */
    addStarsBackground() {
        const starsGeometry = new THREE.BufferGeometry();
        const starCount = 5000;
        const positions = new Float32Array(starCount * 3);

        // Create stars in a cube around the scene
        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 2000;     // X
            positions[i + 1] = (Math.random() - 0.5) * 2000; // Y
            positions[i + 2] = (Math.random() - 0.5) * 2000; // Z
        }

        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.7,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });

        const starField = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(starField);

        console.log('✨ Added', starCount, 'stars to background');
    }

    /**
     * Detect frequent tags for color assignment
     */
    detectFrequentTags() {
        const categoryCounts = new Map();

        this.audioFiles.forEach(file => {
            const category = this.extractCategoryFromFile(file);
            categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
        });

        // For simplicity, we'll use a basic color palette
        // In production, implement the full category detection from reference
        console.log('📊 Detected categories:', Array.from(categoryCounts.keys()));
    }

    /**
     * Extract category from file (tags/filename)
     */
    extractCategoryFromFile(file) {
        // Priority 1: First tag
        if (file.tags && file.tags.length > 0) {
            return file.tags[0].toLowerCase().trim();
        }

        // Priority 2: Filename prefix
        if (file.name) {
            const match = file.name.match(/^([a-z]+)[-_\s]/i);
            if (match) {
                return match[1].toLowerCase();
            }
        }

        return 'other';
    }

    /**
     * Get color for file based on current mode
     */
    getColorForFile(file) {
        if (this.config.colorMode === 'tags') {
            return this.getColorByTag(file);
        } else if (this.config.colorMode === 'bpm') {
            return this.getColorByBPM(file.bpm);
        } else if (this.config.colorMode === 'key') {
            return this.getColorByKey(file.key);
        } else if (this.config.colorMode === 'length') {
            return this.getColorByLength(file.length);
        }
        return { hue: 200, sat: 0.6 };
    }

    /**
     * Color by tag/category
     */
    getColorByTag(file) {
        const category = this.extractCategoryFromFile(file);
        const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const hue = (hash * 37) % 360;
        return { hue, sat: 0.7 };
    }

    /**
     * Color by BPM range
     */
    getColorByBPM(bpm) {
        if (!bpm) return { hue: 0, sat: 0 };
        if (bpm < 80) return { hue: 240, sat: 0.8 };
        if (bpm < 100) return { hue: 180, sat: 0.8 };
        if (bpm < 120) return { hue: 120, sat: 0.8 };
        if (bpm < 140) return { hue: 60, sat: 0.8 };
        if (bpm < 160) return { hue: 30, sat: 0.8 };
        return { hue: 0, sat: 0.8 };
    }

    /**
     * Color by musical key
     */
    getColorByKey(key) {
        const keyColorMap = {
            'Cmaj': 0, 'Gmaj': 30, 'Dmaj': 60, 'Amaj': 90, 'Emaj': 120, 'Bmaj': 150,
            'F#maj': 180, 'Dbmaj': 210, 'Abmaj': 240, 'Ebmaj': 270, 'Bbmaj': 300, 'Fmaj': 330,
            'Cmin': 15, 'Gmin': 45, 'Dmin': 75, 'Amin': 105, 'Emin': 135, 'Bmin': 165,
            'F#min': 195, 'Dbmin': 225, 'Abmin': 255, 'Ebmin': 285, 'Bbmin': 315, 'Fmin': 345
        };
        if (key && keyColorMap[key] !== undefined) {
            return { hue: keyColorMap[key], sat: 0.8 };
        }
        return { hue: 0, sat: 0 };
    }

    /**
     * Color by length/duration
     */
    getColorByLength(length) {
        if (!length) return { hue: 0, sat: 0 };
        if (length < 30) return { hue: 0, sat: 0.8 };
        if (length < 60) return { hue: 30, sat: 0.8 };
        if (length < 120) return { hue: 60, sat: 0.8 };
        if (length < 180) return { hue: 120, sat: 0.8 };
        if (length < 240) return { hue: 180, sat: 0.8 };
        if (length < 300) return { hue: 240, sat: 0.8 };
        return { hue: 280, sat: 0.8 };
    }

    /**
     * Calculate position for file based on axis modes
     */
    calculateFilePosition(file, index) {
        const range = 300;
        const x = this.calculateAxisValue(file, this.config.xAxisMode, range);
        const y = this.calculateAxisValue(file, this.config.yAxisMode, range);
        const z = this.calculateAxisValue(file, this.config.zAxisMode, range);
        return { x, y, z };
    }

    /**
     * Calculate axis value based on mode
     */
    calculateAxisValue(file, mode, range) {
        const keyToPosition = {
            'Cmaj': 0, 'Gmaj': 1, 'Dmaj': 2, 'Amaj': 3, 'Emaj': 4, 'Bmaj': 5,
            'F#maj': 6, 'Dbmaj': 7, 'Abmaj': 8, 'Ebmaj': 9, 'Bbmaj': 10, 'Fmaj': 11
        };

        switch (mode) {
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

            case 'length':
                if (file.length) {
                    const normalized = Math.min(file.length / 300, 1);
                    return normalized * range - (range / 2);
                }
                return (Math.random() - 0.5) * range;

            case 'random':
            default:
                return (Math.random() - 0.5) * range;
        }
    }

    /**
     * Create particle system
     */
    createParticles() {
        // Remove old system
        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
            if (this.particleSystem.geometry) this.particleSystem.geometry.dispose();
            if (this.particleSystem.material) this.particleSystem.material.dispose();
        }

        this.particles = [];

        // Calculate total particles
        const totalParticles = this.audioFiles.length * this.config.particlesPerCluster;

        // Create geometry
        const geometry = new THREE.PlaneGeometry(1, 1);

        // Create material with particle texture
        const material = new THREE.MeshBasicMaterial({
            map: this.createParticleTexture(),
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        // Create instanced mesh
        this.particleSystem = new THREE.InstancedMesh(geometry, material, totalParticles);
        this.particleSystem.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        let instanceIndex = 0;

        // Create clusters
        this.audioFiles.forEach((file, fileIndex) => {
            const centerPos = this.calculateFilePosition(file, fileIndex);
            const colorData = this.getColorForFile(file);
            const baseColor = new THREE.Color().setHSL(colorData.hue / 360, colorData.sat, 0.6);

            const cluster = {
                file,
                centerPosition: new THREE.Vector3(centerPos.x, centerPos.y, centerPos.z),
                color: baseColor.clone(),
                colorData,
                fileIndex,
                subParticles: [],
                customTime: null,
                lastRealTime: null
            };

            // Create sub-particles in cluster
            for (let i = 0; i < this.config.particlesPerCluster; i++) {
                const offset = new THREE.Vector3(
                    (Math.random() - 0.5) * this.config.clusterRadius,
                    (Math.random() - 0.5) * this.config.clusterRadius,
                    (Math.random() - 0.5) * this.config.clusterRadius
                );

                const orbitPhase = Math.random() * Math.PI * 2;

                cluster.subParticles.push({
                    instanceIndex,
                    offset,
                    orbitPhase,
                    isCenterParticle: i === 0
                });

                // Set initial position
                dummy.position.set(
                    centerPos.x + offset.x,
                    centerPos.y + offset.y,
                    centerPos.z + offset.z
                );
                dummy.scale.setScalar(this.config.particleSize);
                dummy.updateMatrix();
                this.particleSystem.setMatrixAt(instanceIndex, dummy.matrix);
                this.particleSystem.setColorAt(instanceIndex, baseColor);

                instanceIndex++;
            }

            this.particles.push(cluster);
        });

        this.particleSystem.instanceMatrix.needsUpdate = true;
        if (this.particleSystem.instanceColor) {
            this.particleSystem.instanceColor.needsUpdate = true;
        }

        this.scene.add(this.particleSystem);

        console.log(`✨ Created ${totalParticles} particles in ${this.particles.length} clusters`);
    }

    /**
     * Create particle texture (circle)
     */
    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        window.addEventListener('resize', this.boundOnResize);
        document.addEventListener('keydown', this.boundOnKeyDown);
        document.addEventListener('keyup', this.boundOnKeyUp);
        document.addEventListener('mousemove', this.boundOnMouseMove);
        document.addEventListener('click', this.boundOnClick);
        document.addEventListener('pointerlockchange', this.boundOnPointerLockChange);

        // Request pointer lock on canvas click
        this.renderer.domElement.addEventListener('click', () => {
            this.renderer.domElement.requestPointerLock();
        });
    }

    /**
     * Remove event listeners
     */
    removeEventListeners() {
        window.removeEventListener('resize', this.boundOnResize);
        document.removeEventListener('keydown', this.boundOnKeyDown);
        document.removeEventListener('keyup', this.boundOnKeyUp);
        document.removeEventListener('mousemove', this.boundOnMouseMove);
        document.removeEventListener('click', this.boundOnClick);
        document.removeEventListener('pointerlockchange', this.boundOnPointerLockChange);
    }

    /**
     * Keyboard down handler
     */
    onKeyDown(event) {
        this.keys[event.key.toLowerCase()] = true;
        if (event.key === 'Shift') this.keys.shift = true;
    }

    /**
     * Keyboard up handler
     */
    onKeyUp(event) {
        this.keys[event.key.toLowerCase()] = false;
        if (event.key === 'Shift') this.keys.shift = false;
    }

    /**
     * Mouse move handler (for camera look)
     */
    onMouseMove(event) {
        if (!this.isPointerLocked) return;

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        this.yaw -= movementX * this.config.lookSensitivity;
        this.pitch -= movementY * this.config.lookSensitivity;

        // Clamp pitch to prevent camera flipping
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    }

    /**
     * Click handler (for particle selection)
     */
    onClick(event) {
        if (!this.isPointerLocked) return;

        // Raycast from center of screen
        this.mouse.x = 0;
        this.mouse.y = 0;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.particleSystem, true);

        if (intersects.length > 0) {
            const instanceId = intersects[0].instanceId;

            // Find which cluster this instance belongs to
            const cluster = this.particles.find(c =>
                c.subParticles.some(sp => sp.instanceIndex === instanceId)
            );

            if (cluster && this.onFileClick) {
                console.log('🎯 Clicked particle for file:', cluster.file.name);
                this.onFileClick(cluster.file);
            }
        }
    }

    /**
     * Pointer lock change handler
     */
    onPointerLockChange() {
        this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
    }

    /**
     * Window resize handler
     */
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.composer.setSize(width, height);
    }

    /**
     * Update camera movement (WASD)
     */
    updateMovement() {
        // Calculate forward/right vectors
        const forward = new THREE.Vector3(
            Math.sin(this.yaw),
            0,
            Math.cos(this.yaw)
        );
        const right = new THREE.Vector3(
            Math.cos(this.yaw),
            0,
            -Math.sin(this.yaw)
        );

        // Reset velocity
        this.velocity.set(0, 0, 0);

        // Speed modifier
        const speed = this.keys.shift ? this.config.moveSpeed * 2 : this.config.moveSpeed;

        // WASD movement (W = forward, S = backward, A = left, D = right)
        if (this.keys['w']) this.velocity.add(forward.clone().multiplyScalar(-speed)); // Forward (negative Z in Three.js)
        if (this.keys['s']) this.velocity.add(forward.clone().multiplyScalar(speed));  // Backward
        if (this.keys['a']) this.velocity.add(right.clone().multiplyScalar(-speed));   // Left
        if (this.keys['d']) this.velocity.add(right.clone().multiplyScalar(speed));    // Right
        if (this.keys['q']) this.velocity.y += speed; // Up
        if (this.keys['e']) this.velocity.y -= speed; // Down

        // Apply velocity to camera
        this.camera.position.add(this.velocity);

        // Update camera rotation
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;
    }

    /**
     * Update particles animation
     */
    updateParticles() {
        if (!this.particleSystem) return;

        const dummy = new THREE.Object3D();

        this.particles.forEach((cluster) => {
            // Initialize custom time if needed
            if (cluster.customTime === null) {
                cluster.customTime = this.animationTime;
            }

            const deltaTime = cluster.lastRealTime !== null ? (this.animationTime - cluster.lastRealTime) : 0;
            cluster.lastRealTime = this.animationTime;
            cluster.customTime += deltaTime;

            const clusterAnimationTime = cluster.customTime;

            // Check if this is the currently playing file
            const currentFileId = this.playerStateManager?.getCurrentFile?.();
            const isPlaying = (cluster.file.id === currentFileId);

            // Audio-reactive spread
            let spreadFactor = 1.0;
            if (this.config.audioReactivity && this.currentAudioAmplitude > 0) {
                if (isPlaying) {
                    spreadFactor = 1.0 + this.currentAudioAmplitude * 0.3;
                } else {
                    spreadFactor = 1.0 + this.currentAudioAmplitude * 0.05;
                }
            }

            const basePos = cluster.centerPosition;

            // Update sub-particles
            cluster.subParticles.forEach(subParticle => {
                let finalX, finalY, finalZ;

                if (subParticle.isCenterParticle) {
                    // Center particle stays at cluster center
                    finalX = basePos.x;
                    finalY = basePos.y;
                    finalZ = basePos.z;
                } else {
                    // Orbital motion (V37 pattern: use orbitSpeed as multiplier)
                    const time = clusterAnimationTime * this.config.orbitSpeed * 1000;
                    const orbitRadius = this.config.orbitRadius * 0.05;

                    const orbitX = Math.sin(time + subParticle.orbitPhase) * orbitRadius;
                    const orbitY = Math.sin(time * 0.8 + subParticle.orbitPhase * 0.7) * (orbitRadius * 0.3);
                    const orbitZ = Math.cos(time + subParticle.orbitPhase) * orbitRadius;

                    finalX = basePos.x + subParticle.offset.x * spreadFactor + orbitX;
                    finalY = basePos.y + subParticle.offset.y * spreadFactor + orbitY;
                    finalZ = basePos.z + subParticle.offset.z * spreadFactor + orbitZ;
                }

                // Update instance matrix
                dummy.position.set(finalX, finalY, finalZ);

                // Audio-reactive particle size
                let sizeMultiplier = 1.0;
                if (isPlaying) {
                    // Playing file gets base 1.2x + audio reactive scaling
                    if (this.config.audioReactivity && this.currentAudioAmplitude > 0) {
                        sizeMultiplier = 1.2 + (this.currentAudioAmplitude * 0.4); // More pronounced pulsing
                    } else {
                        sizeMultiplier = 1.2;
                    }
                } else if (this.config.audioReactivity && this.currentAudioAmplitude > 0) {
                    // Non-playing files get subtle pulsing
                    sizeMultiplier = 1.0 + (this.currentAudioAmplitude * 0.1);
                }

                dummy.scale.setScalar(this.config.particleSize * sizeMultiplier);
                dummy.updateMatrix();
                this.particleSystem.setMatrixAt(subParticle.instanceIndex, dummy.matrix);
            });
        });

        this.particleSystem.instanceMatrix.needsUpdate = true;
    }

    /**
     * Update audio data from frequency analyzer
     * @param {Uint8Array} frequencies - Frequency data
     */
    updateAudioData(frequencies) {
        if (!frequencies || frequencies.length === 0) return;

        const sum = frequencies.reduce((a, b) => a + b, 0);
        this.currentAudioAmplitude = Math.min((sum / frequencies.length / 128) * 3, 5);

        const bassEnd = Math.floor(frequencies.length * 0.2);
        const midsEnd = Math.floor(frequencies.length * 0.6);

        const bassSlice = frequencies.slice(0, bassEnd);
        const midsSlice = frequencies.slice(bassEnd, midsEnd);
        const highsSlice = frequencies.slice(midsEnd);

        this.bassAmplitude = bassSlice.reduce((a, b) => a + b, 0) / bassSlice.length / 128;
        this.midsAmplitude = midsSlice.reduce((a, b) => a + b, 0) / midsSlice.length / 128;
        this.highsAmplitude = highsSlice.reduce((a, b) => a + b, 0) / highsSlice.length / 128;

        // Update UI displays
        this.updateAudioReactivityDisplays();
    }

    /**
     * Update audio reactivity display elements in UI
     */
    updateAudioReactivityDisplays() {
        const currentAmpElem = document.getElementById('audioAmplitudeDisplay');
        const bassElem = document.getElementById('bassAmplitudeDisplay');
        const midsElem = document.getElementById('midsAmplitudeDisplay');
        const highsElem = document.getElementById('highsAmplitudeDisplay');

        if (currentAmpElem) currentAmpElem.textContent = this.currentAudioAmplitude.toFixed(2);
        if (bassElem) bassElem.textContent = this.bassAmplitude.toFixed(2);
        if (midsElem) midsElem.textContent = this.midsAmplitude.toFixed(2);
        if (highsElem) highsElem.textContent = this.highsAmplitude.toFixed(2);
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isActive) return;

        this.animationId = requestAnimationFrame(() => this.animate());

        // Increment animation time (constant 0.01 per frame, matching V37)
        // orbitSpeed is used as multiplier in calculations (line 631), not as time increment
        this.animationTime += 0.01;

        // Update camera movement
        this.updateMovement();

        // Update particles
        this.updateParticles();

        // Render
        this.composer.render();
    }

    /**
     * Show galaxy view and start animation
     */
    show() {
        this.container.style.display = 'block';
        this.isActive = true;

        // Resize to container
        this.onWindowResize();

        // Start animation if not already running
        if (!this.animationId) {
            this.animate();
        }

        console.log('🌌 Galaxy View shown');
    }

    /**
     * Hide galaxy view and pause animation
     */
    hide() {
        this.container.style.display = 'none';
        this.isActive = false;

        // Release pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        console.log('🌌 Galaxy View hidden');
    }

    /**
     * Set color mode and recreate particles
     */
    setColorMode(mode) {
        this.config.colorMode = mode;
        this.createParticles();
        console.log('🎨 Color mode changed to:', mode);
    }

    /**
     * Set axis mode and recreate particles
     */
    setAxisMode(axis, mode) {
        if (axis === 'x') {
            this.config.xAxisMode = mode;
        } else if (axis === 'y') {
            this.config.yAxisMode = mode;
        } else if (axis === 'z') {
            this.config.zAxisMode = mode;
        }
        this.createParticles();
        console.log(`📐 ${axis.toUpperCase()}-axis mode changed to:`, mode);
    }

    /**
     * Set bloom strength
     */
    setBloom(value) {
        this.config.bloomStrength = value;
        if (this.bloomPass) {
            this.bloomPass.strength = value;
        }
        console.log('✨ Bloom strength set to:', value);
    }

    /**
     * Set particle size
     */
    setParticleSize(size) {
        this.config.particleSize = size;
        // Particle size will be applied in next updateParticles() call
        console.log('📏 Particle size set to:', size);
    }

    /**
     * Set movement speed
     */
    setMoveSpeed(speed) {
        this.config.moveSpeed = speed;
        console.log('🏃 Movement speed set to:', speed);
    }

    /**
     * Set look sensitivity
     */
    setLookSensitivity(sensitivity) {
        this.config.lookSensitivity = sensitivity;
        console.log('👀 Look sensitivity set to:', sensitivity);
    }

    /**
     * Save current configuration as a preset
     * @param {string} name - Preset name
     */
    savePreset(name) {
        if (!name || !name.trim()) {
            console.warn('⚠️ Preset name is required');
            return false;
        }

        const presetData = {
            // Particle settings
            particleSize: this.config.particleSize,
            particlesPerCluster: this.config.particlesPerCluster,
            clusterRadius: this.config.clusterRadius,

            // Motion settings
            moveSpeed: this.config.moveSpeed,
            lookSensitivity: this.config.lookSensitivity,
            orbitSpeed: this.config.orbitSpeed,
            orbitRadius: this.config.orbitRadius,

            // Visual settings
            visibilityDistance: this.config.visibilityDistance,
            bloomStrength: this.config.bloomStrength,

            // Audio settings
            audioReactivity: this.config.audioReactivity,

            // Visualization modes
            colorMode: this.config.colorMode,
            xAxisMode: this.config.xAxisMode,
            yAxisMode: this.config.yAxisMode,
            zAxisMode: this.config.zAxisMode
        };

        localStorage.setItem(`galaxyPreset_${name}`, JSON.stringify(presetData));
        console.log(`💾 Saved preset: ${name}`, presetData);

        return true;
    }

    /**
     * Load a saved preset
     * @param {string} name - Preset name
     */
    loadPreset(name) {
        if (!name) {
            console.warn('⚠️ Preset name is required');
            return false;
        }

        const saved = localStorage.getItem(`galaxyPreset_${name}`);
        if (!saved) {
            console.warn(`⚠️ Preset "${name}" not found`);
            return false;
        }

        try {
            const presetData = JSON.parse(saved);
            console.log(`📂 Loading preset: ${name}`, presetData);

            // Apply particle settings
            if (presetData.particleSize !== undefined) {
                this.config.particleSize = presetData.particleSize;
            }
            if (presetData.particlesPerCluster !== undefined) {
                this.config.particlesPerCluster = presetData.particlesPerCluster;
            }
            if (presetData.clusterRadius !== undefined) {
                this.config.clusterRadius = presetData.clusterRadius;
            }

            // Apply motion settings
            if (presetData.moveSpeed !== undefined) {
                this.config.moveSpeed = presetData.moveSpeed;
            }
            if (presetData.lookSensitivity !== undefined) {
                this.config.lookSensitivity = presetData.lookSensitivity;
            }
            if (presetData.orbitSpeed !== undefined) {
                this.config.orbitSpeed = presetData.orbitSpeed;
            }
            if (presetData.orbitRadius !== undefined) {
                this.config.orbitRadius = presetData.orbitRadius;
            }

            // Apply visual settings
            if (presetData.visibilityDistance !== undefined) {
                this.config.visibilityDistance = presetData.visibilityDistance;
                if (this.scene && this.scene.fog) {
                    this.scene.fog.far = presetData.visibilityDistance;
                }
            }
            if (presetData.bloomStrength !== undefined) {
                this.config.bloomStrength = presetData.bloomStrength;
                if (this.bloomPass) {
                    this.bloomPass.strength = presetData.bloomStrength;
                }
            }

            // Apply audio settings
            if (presetData.audioReactivity !== undefined) {
                this.config.audioReactivity = presetData.audioReactivity;
            }

            // Apply visualization modes (these require particle recreation)
            let needsRecreation = false;
            if (presetData.colorMode && presetData.colorMode !== this.config.colorMode) {
                this.config.colorMode = presetData.colorMode;
                needsRecreation = true;
            }
            if (presetData.xAxisMode && presetData.xAxisMode !== this.config.xAxisMode) {
                this.config.xAxisMode = presetData.xAxisMode;
                needsRecreation = true;
            }
            if (presetData.yAxisMode && presetData.yAxisMode !== this.config.yAxisMode) {
                this.config.yAxisMode = presetData.yAxisMode;
                needsRecreation = true;
            }
            if (presetData.zAxisMode && presetData.zAxisMode !== this.config.zAxisMode) {
                this.config.zAxisMode = presetData.zAxisMode;
                needsRecreation = true;
            }

            // Recreate particles if visualization modes changed
            if (needsRecreation) {
                this.createParticles();
            }

            console.log(`✅ Loaded preset: ${name}`);
            return true;

        } catch (error) {
            console.error(`❌ Error loading preset "${name}":`, error);
            return false;
        }
    }

    /**
     * Delete a saved preset
     * @param {string} name - Preset name
     */
    deletePreset(name) {
        if (!name) {
            console.warn('⚠️ Preset name is required');
            return false;
        }

        const key = `galaxyPreset_${name}`;
        if (!localStorage.getItem(key)) {
            console.warn(`⚠️ Preset "${name}" not found`);
            return false;
        }

        localStorage.removeItem(key);
        console.log(`🗑️ Deleted preset: ${name}`);
        return true;
    }

    /**
     * Get list of all saved presets
     * @returns {Array<string>} Array of preset names
     */
    getPresetList() {
        const presets = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('galaxyPreset_')) {
                const name = key.replace('galaxyPreset_', '');
                presets.push(name);
            }
        }
        return presets.sort();
    }

    /**
     * Populate preset dropdown with saved presets
     * @param {string} dropdownId - ID of the select element
     */
    populatePresetDropdown(dropdownId = 'presetSelect') {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) {
            console.warn(`⚠️ Dropdown element #${dropdownId} not found`);
            return;
        }

        // Clear existing options except the first (placeholder)
        dropdown.innerHTML = '<option value="">-- Select Preset --</option>';

        // Get all presets
        const presets = this.getPresetList();

        // Add preset options
        presets.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            dropdown.appendChild(option);
        });

        console.log(`📋 Populated preset dropdown with ${presets.length} presets`);
    }

    // ============================================================================
    // GALAXY CONTROLS - UI Control Methods
    // ============================================================================

    /**
     * Update orbit speed
     */
    updateMotionSpeed(value) {
        this.config.orbitSpeed = parseFloat(value);
        const textElem = document.getElementById('speedValue');
        const inputElem = document.getElementById('speedInput');
        if (textElem) textElem.textContent = (value * 100).toFixed(1);
        if (inputElem) inputElem.value = value;
    }

    /**
     * Update orbit radius (amplitude of motion)
     */
    updateMotionRadius(value) {
        this.config.orbitRadius = parseFloat(value);
        const elem = document.getElementById('radiusValue');
        if (elem) elem.textContent = value;
    }

    /**
     * Update cluster spread (radius of sub-particle cluster)
     */
    updateClusterSpread(value) {
        this.config.clusterRadius = parseFloat(value);
        const elem = document.getElementById('clusterSpreadValue');
        if (elem) elem.textContent = value;

        // Update existing clusters' sub-particle offsets
        if (this.particles.length > 0 && this.particleSystem) {
            this.particles.forEach(cluster => {
                cluster.subParticles.forEach(subParticle => {
                    // Scale the offset based on new cluster radius
                    const currentRadius = Math.sqrt(
                        subParticle.offset.x ** 2 +
                        subParticle.offset.y ** 2 +
                        subParticle.offset.z ** 2
                    );
                    if (currentRadius > 0) {
                        const scale = this.config.clusterRadius / currentRadius;
                        subParticle.offset.multiplyScalar(scale);
                    }
                });
            });
        }
    }

    /**
     * Update number of sub-particles per cluster
     */
    updateSubParticleCount(value) {
        const newCount = parseInt(value);
        this.config.particlesPerCluster = newCount;
        const elem = document.getElementById('subParticleCountValue');
        if (elem) elem.textContent = value;

        // Recreate particles with new count
        this.createParticles();
    }

    /**
     * Update bloom strength
     */
    updateBloomStrength(value) {
        this.config.bloomStrength = parseFloat(value);
        const elem = document.getElementById('bloomStrengthValue');
        if (elem) elem.textContent = value;

        if (this.bloomPass) {
            this.bloomPass.strength = this.config.bloomStrength;
        }
    }

    /**
     * Update global audio reactivity
     */
    updateGlobalReactivity(value) {
        this.config.globalAudioReactivity = parseFloat(value);
        const elem = document.getElementById('globalReactivityValue');
        if (elem) elem.textContent = value;
    }

    /**
     * Toggle audio reactivity on/off
     */
    toggleAudioReactivity() {
        this.config.audioReactivity = !this.config.audioReactivity;
        const btn = document.getElementById('audioReactivityToggle');
        if (btn) {
            btn.textContent = `Audio Reactivity: ${this.config.audioReactivity ? 'ON' : 'OFF'}`;
            btn.style.background = this.config.audioReactivity ? 'rgba(102,126,234,0.3)' : 'rgba(255,255,255,0.1)';
        }
    }

    /**
     * Update hover slowdown (speed when hovering)
     */
    updateHoverSpeed(value) {
        this.config.hoverSlowdown = parseFloat(value) / 100; // Convert percentage to decimal
        const elem = document.getElementById('hoverSpeedValue');
        if (elem) elem.textContent = value;
    }

    /**
     * Update hover scale (size when hovering)
     */
    updateHoverScale(value) {
        this.config.hoverScale = parseFloat(value);
        const elem = document.getElementById('hoverScaleValue');
        if (elem) elem.textContent = value;
    }

    /**
     * Update particle settings (called by control functions)
     * @param {Object} settings - Settings object with properties to update
     */
    updateParticleSettings(settings = {}) {
        // This method is called by various control functions
        // Most settings are already handled by individual update methods
        // This acts as a general-purpose update handler for any additional settings

        // Log what settings are being updated (helpful for debugging)
        if (Object.keys(settings).length > 0) {
            console.log('🎛️ Particle settings updated:', settings);
        }

        // Apply any config updates
        Object.keys(settings).forEach(key => {
            if (this.config.hasOwnProperty(key)) {
                this.config[key] = settings[key];
            }
        });
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.hide();

        // Stop animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Remove event listeners
        this.removeEventListeners();

        // Dispose Three.js resources
        if (this.particleSystem) {
            if (this.particleSystem.geometry) this.particleSystem.geometry.dispose();
            if (this.particleSystem.material) this.particleSystem.material.dispose();
        }

        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        console.log('🌌 Galaxy View destroyed');
    }
}
