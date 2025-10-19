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
            bloomStrength: options.bloomStrength || 0,
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

        this.initScene();
        this.detectFrequentTags();
        this.createParticles();
        this.setupEventListeners();

        console.log('✅ Galaxy View: Initialization complete');
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
     * Add stars background
     */
    addStarsBackground() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsVertices = [];
        const starsSizes = [];
        const starsColors = [];
        const starsCount = 2000;

        for (let i = 0; i < starsCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const radius = this.config.visibilityDistance * 0.9;

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);

            starsVertices.push(x, y, z);
            starsSizes.push(Math.random() * 2 + 0.5);

            const brightness = 0.7 + Math.random() * 0.3;
            starsColors.push(brightness, brightness, brightness + 0.1);
        }

        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        starsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starsSizes, 1));
        starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starsColors, 3));

        const starsMaterial = new THREE.PointsMaterial({
            size: 0.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });

        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
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
                    // Orbital motion
                    const time = clusterAnimationTime * 1000;
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
                dummy.scale.setScalar(this.config.particleSize * (isPlaying ? 1.2 : 1.0));
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
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isActive) return;

        this.animationId = requestAnimationFrame(() => this.animate());

        // Increment animation time
        this.animationTime += this.config.orbitSpeed;

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
