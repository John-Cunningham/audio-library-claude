/**
 * Galaxy View - Refactored Thin Coordinator
 * This is how galaxyView.js should look after proper modularization
 * It coordinates components but doesn't implement business logic
 */

// Three.js is loaded globally via script tags in index.html
// Using global THREE object and its components

import GalaxyInitializer from '../core/galaxyInitializer.js';
import GalaxyParticleSystem from '../components/galaxyParticleSystem.js';
import GalaxyInteraction from '../components/galaxyInteraction.js';

class GalaxyView {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.container = null;
        this.animationId = null;
        this.isActive = false;

        // Components
        this.initializer = new GalaxyInitializer();
        this.particleSystem = null;
        this.interaction = null;

        // Animation state
        this.animationTime = 0;

        // Audio reactivity
        this.audioContext = null;
        this.audioConnected = false;
        this.audioAnalyzer = null;
        this.audioDataArray = null;
        this.audioBufferLength = 0;
    }

    /**
     * Initialize and render the galaxy view
     * @param {HTMLElement} container - Container to render into
     */
    async render(container) {
        console.log('🌌 ========== GALAXY VIEW RENDER STARTING ==========');
        console.log('🌌 Container:', container?.id);
        console.log('🌌 window.wavesurfer exists:', !!window.wavesurfer);
        console.log('🌌 window.wavesurfer.isPlaying():', window.wavesurfer?.isPlaying());
        console.log('🌌 window.audioFiles count:', window.audioFiles?.length);

        this.container = container;
        this.isActive = true;

        // Initialize Three.js scene
        console.log('🌌 Calling initScene()...');
        this.initScene();

        // Initialize all Galaxy View systems
        this.initializer.initialize(this.scene);

        // Get particle system reference
        this.particleSystem = this.initializer.particleSystem;

        // Initialize interaction handler
        this.interaction = new GalaxyInteraction(this.camera, this.renderer, this.container);

        // Load the exact options menu HTML from reference
        await this.loadOptionsMenu();

        // Load particles if audio files exist
        if (window.audioFiles && window.audioFiles.length > 0) {
            console.log('🌌 Loading', window.audioFiles.length, 'files into Galaxy View');
            this.particleSystem.createParticles(window.audioFiles);
        } else {
            console.warn('⚠️ No audio files found to display in Galaxy View');
        }

        // Start animation loop
        this.animate();

        console.log('🌌 Galaxy View rendered successfully');
    }

    /**
     * Initialize Three.js scene
     */
    initScene() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x000000, 100, window.visibilityDistance || 900);

        // Camera setup
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 2000);
        this.camera.position.set(0, 10, 30);

        // Expose camera and scene globally (needed by controls)
        window.camera = this.camera;
        window.scene = this.scene;

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Post-processing (using global THREE objects loaded from CDN)
        this.composer = new THREE.EffectComposer(this.renderer);
        const renderScene = new THREE.RenderPass(this.scene, this.camera);
        this.bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            window.bloomStrength || 0.5,  // bloom strength
            0.4,  // radius
            0.85  // threshold
        );
        this.composer.addPass(renderScene);
        this.composer.addPass(this.bloomPass);

        // Expose bloom pass for dynamic updates
        window.bloomPass = this.bloomPass;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const light1 = new THREE.PointLight(0x667eea, 1.5, 100);
        light1.position.set(50, 50, 50);
        this.scene.add(light1);

        const light2 = new THREE.PointLight(0x764ba2, 1.5, 100);
        light2.position.set(-50, -50, -50);
        this.scene.add(light2);

        // Add stars background
        this.addStarsBackground();

        // Setup event listeners
        this.setupEventListeners();

        // Setup audio analyzer (will retry when wavesurfer loads)
        this.setupAudioAnalyzer();

        // Listen for when wavesurfer is created/ready
        this.setupAudioRetry();

        // Listen for audio playback to connect analyzer
        this.setupAudioPlaybackListener();
    }

    /**
     * Setup audio analyzer for audio reactivity
     */
    setupAudioAnalyzer() {
        console.log('');
        console.log('🎤 ==========================================');
        console.log('🎤 AUDIO ANALYZER SETUP ATTEMPT');
        console.log('🎤 ==========================================');

        try {
            console.log('🎤 Step 1: Check if WaveSurfer exists');
            console.log('🎤   window.wavesurfer:', !!window.wavesurfer);

            if (!window.wavesurfer) {
                console.warn('🎤   ⚠️ WaveSurfer not found - will retry later');
                console.log('🎤 ==========================================');
                console.log('');
                return;
            }

            console.log('🎤   ✅ WaveSurfer found!');
            console.log('');
            console.log('🎤 Step 2: Get media element');

            // Try to get media element
            const mediaElement = window.wavesurfer.media;
            console.log('🎤   Media element:', {
                exists: !!mediaElement,
                type: typeof mediaElement,
                hasAudioContext: !!mediaElement?.audioContext,
                hasGainNode: !!mediaElement?.gainNode
            });

            // Check if media element has a property pointing to real element
            console.log('[AudioSetup] Inspecting media object properties:', Object.keys(mediaElement || {}));
            console.log('[AudioSetup] Media element.audio:', mediaElement?.audio);
            console.log('[AudioSetup] Media element.audioEl:', mediaElement?.audioEl);
            console.log('[AudioSetup] Media element.element:', mediaElement?.element);
            console.log('[AudioSetup] Media element instanceof HTMLMediaElement:', mediaElement instanceof HTMLMediaElement);
            console.log('[AudioSetup] Media element instanceof HTMLAudioElement:', mediaElement instanceof HTMLAudioElement);

            // Try alternative methods to get audio element
            console.log('[AudioSetup] Searching for audio elements in DOM...');
            const audioElements = document.querySelectorAll('audio');
            console.log('[AudioSetup] Found audio elements:', audioElements.length);
            audioElements.forEach((el, i) => {
                console.log(`[AudioSetup] Audio ${i}:`, {
                    src: el.src?.substring(0, 50),
                    paused: el.paused,
                    currentTime: el.currentTime,
                    duration: el.duration
                });
            });

            // Check for wavesurfer container
            if (window.wavesurfer.container) {
                console.log('[AudioSetup] WaveSurfer container:', window.wavesurfer.container);
                const containerAudio = window.wavesurfer.container.querySelector('audio');
                console.log('[AudioSetup] Audio in container:', containerAudio);
            }

            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('[AudioSetup] Audio context created:', this.audioContext.state);

            // Create analyzer
            this.audioAnalyzer = this.audioContext.createAnalyser();
            this.audioAnalyzer.fftSize = 256;
            this.audioAnalyzer.smoothingTimeConstant = 0.8;
            this.audioBufferLength = this.audioAnalyzer.frequencyBinCount;
            this.audioDataArray = new Uint8Array(this.audioBufferLength);
            console.log('[AudioSetup] Analyzer created, buffer length:', this.audioBufferLength);

            // WaveSurfer v7 uses Web Audio API (AudioBufferSourceNode), NOT HTMLMediaElement!
            // The media object already has audioContext and gainNode
            console.log('[AudioSetup] 🎯 WaveSurfer v7 detected - using Web Audio API approach');

            // Check if media object has Web Audio nodes
            if (mediaElement.audioContext && mediaElement.gainNode) {
                console.log('[AudioSetup] ✅ Found WaveSurfer audio context and gain node!');
                console.log('[AudioSetup] Using WaveSurfer audioContext:', mediaElement.audioContext.state);

                // Use WaveSurfer's existing audio context instead of creating new one
                this.audioContext = mediaElement.audioContext;

                // Recreate analyzer with WaveSurfer's context
                this.audioAnalyzer = this.audioContext.createAnalyser();
                this.audioAnalyzer.fftSize = 256;
                this.audioAnalyzer.smoothingTimeConstant = 0.8;
                this.audioBufferLength = this.audioAnalyzer.frequencyBinCount;
                this.audioDataArray = new Uint8Array(this.audioBufferLength);

                console.log('[AudioSetup] Analyzer created with WaveSurfer context');
                console.log('[AudioSetup] Attempting to connect to WaveSurfer audio graph...');

                try {
                    // Connect analyzer to WaveSurfer's gain node
                    // Audio flow: bufferNode → gainNode → destination
                    // We want: bufferNode → gainNode → analyzer → destination

                    // Disconnect gainNode from destination
                    mediaElement.gainNode.disconnect();

                    // Reconnect: gainNode → analyzer → destination
                    mediaElement.gainNode.connect(this.audioAnalyzer);
                    this.audioAnalyzer.connect(this.audioContext.destination);

                    this.audioConnected = true;
                    console.log('🎵✅ Audio analyzer SUCCESSFULLY connected to WaveSurfer audio graph!');
                } catch (error) {
                    console.error('[AudioSetup] ❌ Failed to connect to audio graph:', error.message);
                    console.error('[AudioSetup] Error details:', error);

                    // Fallback: try connecting in parallel instead of series
                    try {
                        console.log('[AudioSetup] Trying parallel connection instead...');
                        // Reconnect gainNode to destination first
                        mediaElement.gainNode.connect(this.audioContext.destination);
                        // Also connect gainNode to analyzer (parallel tap)
                        mediaElement.gainNode.connect(this.audioAnalyzer);

                        this.audioConnected = true;
                        console.log('🎵✅ Audio analyzer connected in PARALLEL to WaveSurfer audio graph!');
                    } catch (fallbackError) {
                        console.error('[AudioSetup] ❌ Parallel connection also failed:', fallbackError.message);
                    }
                }
            } else {
                console.warn('[AudioSetup] ⚠️ Media object does not have audioContext or gainNode');
                console.warn('[AudioSetup] Properties found:', Object.keys(mediaElement || {}));
            }

            console.log('[AudioSetup] ========== AUDIO ANALYZER SETUP COMPLETE ==========');
            console.log('[AudioSetup] Final status:', {
                connected: this.audioConnected,
                bufferLength: this.audioBufferLength,
                contextState: this.audioContext?.state,
                mediaElement: this.connectedMediaElement?.tagName
            });
        } catch (error) {
            console.error('[AudioSetup] ❌ CRITICAL ERROR in audio analyzer setup:', error);
            console.error('[AudioSetup] Error stack:', error.stack);
        }
    }

    /**
     * Setup periodic retry for audio analyzer connection
     * REMOVED: This was giving up after 5 attempts which was too soon
     */
    setupAudioRetry() {
        // This function is now a no-op
        // Audio connection is handled by setupAudioPlaybackListener() instead
        console.log('[AudioRetry] Audio retry handled by continuous listener, not limited retries');
    }

    /**
     * Setup listener for audio playback to connect analyzer
     */
    setupAudioPlaybackListener() {
        // Set up interval to check for wavesurfer and auto-connect when audio reactivity is on
        this.audioCheckInterval = setInterval(() => {
            // Try to connect if:
            // 1. Audio reactivity is enabled
            // 2. We're not already connected
            // 3. Wavesurfer exists
            if (window.audioReactivityEnabled && !this.audioConnected && window.wavesurfer) {
                console.log('[🔄 AUTO-CONNECT] Attempting audio analyzer connection...');
                console.log('[🔄 AUTO-CONNECT] Reactivity:', window.audioReactivityEnabled, '| Connected:', this.audioConnected, '| WaveSurfer:', !!window.wavesurfer);
                this.setupAudioAnalyzer();

                if (this.audioConnected) {
                    console.log('[🔄 AUTO-CONNECT] ✅ SUCCESS - Audio analyzer connected!');
                }
            }
        }, 1000); // Check every 1 second (more aggressive)

        // Expose manual reconnect function
        window.reconnectGalaxyAudio = () => {
            console.log('[🔧 MANUAL RECONNECT] User triggered reconnect');
            this.setupAudioAnalyzer();
        };

        console.log('[AudioPlayback] ✅ Continuous auto-connect enabled (checks every 1s)');
    }

    /**
     * Reconnect audio analyzer when audio file changes
     */
    reconnectAudioAnalyzer() {
        // For WaveSurfer v7, we don't need to reconnect - the media element stays the same
        // Just ensure analyzer is still connected
        if (!this.audioConnected && this.audioAnalyzer && window.wavesurfer) {
            console.log('[AudioReconnect] Checking audio connection...');
            const mediaElement = window.wavesurfer.media;
            if (mediaElement) {
                console.log('[AudioReconnect] Media element still available');
                // Connection should persist, just mark as connected
                this.audioConnected = true;
            }
        }
    }

    /**
     * Add stars background
     */
    addStarsBackground() {
        const starsGeometry = new THREE.BufferGeometry();
        const starCount = 5000;
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 2000;
            positions[i + 1] = (Math.random() - 0.5) * 2000;
            positions[i + 2] = (Math.random() - 0.5) * 2000;
        }

        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.7,
            transparent: true,
            opacity: 0.8
        });

        const starField = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(starField);
    }

    /**
     * Load the exact options menu HTML from the reference file
     */
    async loadOptionsMenu() {
        try {
            // Fetch the exact HTML we extracted from the reference
            const response = await fetch('./galaxyOptionsMenuExact.html');
            const menuHTML = await response.text();

            // Create a container div and insert the menu
            const menuContainer = document.createElement('div');
            menuContainer.innerHTML = menuHTML;
            document.body.appendChild(menuContainer.firstElementChild);

            console.log('✅ Exact options menu from reference loaded successfully');

            // Initialize preset list
            if (window.updatePresetList) {
                window.updatePresetList();
            }

        } catch (error) {
            console.error('Failed to load options menu:', error);
            // Fallback to programmatic menu if needed
            this.createFallbackMenu();
        }
    }

    /**
     * Create fallback menu if exact HTML fails to load
     */
    createFallbackMenu() {
        // Use our modular menu component as fallback
        import('../components/galaxyOptionsMenu.js').then(module => {
            const GalaxyOptionsMenu = module.default;
            const menu = new GalaxyOptionsMenu();
            menu.render(document.body);
            console.log('📋 Fallback menu rendered');
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Mouse/keyboard/touch events are handled by interaction module
        // Just ensure the renderer is accessible
        window.galaxyRenderer = this.renderer;
        window.galaxyScene = this.scene;
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        if (!this.camera || !this.renderer) return;

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        if (this.composer) {
            this.composer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isActive) return;

        this.animationId = requestAnimationFrame(() => this.animate());

        // Update animation time
        this.animationTime += 0.01;

        // Check if we need to reconnect audio analyzer (e.g., after file change)
        if (!this.audioConnected && window.wavesurfer && window.wavesurfer.backend && window.wavesurfer.backend.gainNode) {
            this.reconnectAudioAnalyzer();
        }

        // Update camera if FPS controls are active
        this.updateCamera();

        // Update particles animation
        this.updateParticles();

        // Render
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Update camera based on input
     */
    updateCamera() {
        // Use interaction component to update camera movement
        if (this.interaction) {
            this.interaction.updateCameraMovement();
        }
    }

    /**
     * Update particle animations
     */
    updateParticles() {
        if (!window.particles || !window.particleSystem) return;

        const dummy = new THREE.Object3D();
        const time = this.animationTime;
        const orbitSpeed = window.orbitSpeed || 0.0015;
        const orbitRadius = window.orbitRadius || 80;

        // Audio reactivity - calculate current amplitude
        let audioAmplitude = 0;
        let bassAmplitude = 0;
        let midsAmplitude = 0;
        let highsAmplitude = 0;

        if (window.audioReactivityEnabled && this.audioAnalyzer && this.audioDataArray) {
            try {
                this.audioAnalyzer.getByteFrequencyData(this.audioDataArray);

                // Debug: Log first few values once every 60 frames
                if (Math.floor(this.animationTime * 10) % 60 === 0) {
                    const firstValues = Array.from(this.audioDataArray.slice(0, 5));
                    console.log('[AudioReactivity] First 5 frequency values:', firstValues);
                    console.log('[AudioReactivity] Wavesurfer playing:', window.wavesurfer?.isPlaying());
                    console.log('[AudioReactivity] Audio connected:', this.audioConnected);
                }

                // Calculate frequency band amplitudes
                const bassEnd = Math.floor(this.audioBufferLength * 0.1); // 0-10% = bass
                const midsEnd = Math.floor(this.audioBufferLength * 0.4); // 10-40% = mids
                // 40-100% = highs

                let bassSum = 0, midsSum = 0, highsSum = 0;

                for (let i = 0; i < this.audioBufferLength; i++) {
                    const value = this.audioDataArray[i] / 255.0;
                    if (i < bassEnd) {
                        bassSum += value;
                    } else if (i < midsEnd) {
                        midsSum += value;
                    } else {
                        highsSum += value;
                    }
                }

                bassAmplitude = bassSum / bassEnd;
                midsAmplitude = midsSum / (midsEnd - bassEnd);
                highsAmplitude = highsSum / (this.audioBufferLength - midsEnd);

                // Calculate overall amplitude based on frequency mode
                switch (window.audioFrequencyMode) {
                    case 'bass':
                        audioAmplitude = bassAmplitude;
                        break;
                    case 'mids':
                        audioAmplitude = midsAmplitude;
                        break;
                    case 'highs':
                        audioAmplitude = highsAmplitude;
                        break;
                    default:
                        // All frequencies - weighted average
                        audioAmplitude = (bassAmplitude + midsAmplitude + highsAmplitude) / 3;
                }

                // Apply reactivity strength
                audioAmplitude *= (window.audioReactivityStrength || 1.0);

                // Update UI display values (update every ~10 frames to reduce overhead)
                if (Math.floor(this.animationTime * 60) % 10 === 0) {
                    const amplitudeEl = document.getElementById('audioAmplitudeValue');
                    const bassEl = document.getElementById('audioBassValue');
                    const midsEl = document.getElementById('audioMidsValue');
                    const highsEl = document.getElementById('audioHighsValue');

                    if (amplitudeEl) amplitudeEl.textContent = audioAmplitude.toFixed(2);
                    if (bassEl) bassEl.textContent = bassAmplitude.toFixed(2);
                    if (midsEl) midsEl.textContent = midsAmplitude.toFixed(2);
                    if (highsEl) highsEl.textContent = highsAmplitude.toFixed(2);
                }
            } catch (error) {
                // Silently handle errors
            }
        }

        // Crosshair hover detection
        let hoveredCluster = null;
        if (window.mouseInteractionEnabled && window.isPointerLocked) {
            // Ray from camera center (crosshair position)
            const rayOrigin = this.camera.position.clone();
            const rayDirection = new THREE.Vector3(0, 0, -1);
            rayDirection.applyQuaternion(this.camera.quaternion);

            let closestDistance = Infinity;
            const hoverThreshold = window.particleSize * 2;

            window.particles.forEach(cluster => {
                const distanceToCluster = rayOrigin.distanceTo(cluster.centerPosition);

                // Check if ray intersects cluster
                const toCluster = cluster.centerPosition.clone().sub(rayOrigin);
                const projection = toCluster.dot(rayDirection);

                if (projection > 0) {
                    const closestPoint = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(projection));
                    const clusterDistance = closestPoint.distanceTo(cluster.centerPosition);

                    if (clusterDistance < hoverThreshold && distanceToCluster < closestDistance) {
                        closestDistance = distanceToCluster;
                        hoveredCluster = cluster;
                    }
                }
            });
        }

        // Update hover effects and audio reactivity for all clusters
        window.particles.forEach((cluster, clusterIndex) => {
            const isHovered = (cluster === hoveredCluster);

            // Smoothly interpolate hover effect
            if (isHovered) {
                cluster.hoverEffect = Math.min(cluster.hoverEffect + 0.1, window.hoverScale - 1);
            } else {
                cluster.hoverEffect = Math.max(cluster.hoverEffect - 0.05, 0);
            }

            // Apply audio reactivity
            if (window.audioReactivityEnabled && audioAmplitude > 0) {
                // Global reactivity - all particles react to audio
                const globalReactivity = window.globalAudioReactivity || 0.5;
                const targetScale = 1.0 + (audioAmplitude * globalReactivity);

                // Smooth interpolation
                cluster.audioScale += (targetScale - cluster.audioScale) * 0.15;
            } else {
                // Return to normal scale
                cluster.audioScale += (1.0 - cluster.audioScale) * 0.1;
            }

            // Apply size gradient (particles get smaller/larger based on distance from center)
            const distFromCenter = cluster.centerPosition.length();
            const maxDist = 200; // Approximate max distance in galaxy

            if (window.sizeGradient !== 0) {
                const gradientFactor = (distFromCenter / maxDist) * window.sizeGradient;
                cluster.sizeMultiplier = 1.0 + gradientFactor;
            } else {
                cluster.sizeMultiplier = 1.0;
            }

            // Apply density gradient (particles get more/less opaque based on distance from center)
            if (window.densityGradient !== 0) {
                const normalizedDist = distFromCenter / maxDist;
                // Positive gradient = denser in center, negative = denser at edges
                const densityFactor = window.densityGradient > 0 ?
                    (1.0 - normalizedDist * Math.abs(window.densityGradient)) :
                    (normalizedDist * Math.abs(window.densityGradient));
                cluster.opacityMultiplier = Math.max(0.1, Math.min(1.0, densityFactor));
            } else {
                cluster.opacityMultiplier = 1.0;
            }
        });

        window.particles.forEach((cluster, clusterIndex) => {
            // Calculate animated cluster center position based on rotation mode
            let animatedCenter = cluster.centerPosition.clone();

            if (window.motionEnabled && window.rotationMode) {
                const basePos = cluster.centerPosition.clone();

                switch (window.rotationMode) {
                    case 'collective':
                        // All particles rotate together as a sphere around origin
                        const rotationAngle = time * orbitSpeed;

                        switch (window.rotationAxis) {
                            case 'y':
                                animatedCenter.x = basePos.x * Math.cos(rotationAngle) - basePos.z * Math.sin(rotationAngle);
                                animatedCenter.z = basePos.x * Math.sin(rotationAngle) + basePos.z * Math.cos(rotationAngle);
                                break;
                            case 'x':
                                animatedCenter.y = basePos.y * Math.cos(rotationAngle) - basePos.z * Math.sin(rotationAngle);
                                animatedCenter.z = basePos.y * Math.sin(rotationAngle) + basePos.z * Math.cos(rotationAngle);
                                break;
                            case 'z':
                                animatedCenter.x = basePos.x * Math.cos(rotationAngle) - basePos.y * Math.sin(rotationAngle);
                                animatedCenter.y = basePos.x * Math.sin(rotationAngle) + basePos.y * Math.cos(rotationAngle);
                                break;
                            case 'all':
                                // Rotate around all axes
                                const angle = time * orbitSpeed * 0.5;
                                animatedCenter.applyAxisAngle(new THREE.Vector3(1, 0, 0), angle);
                                animatedCenter.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle * 0.7);
                                animatedCenter.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle * 0.5);
                                break;
                        }
                        break;

                    case 'spiral':
                        // Spiral galaxy - speed varies by distance from center
                        const distFromCenter = Math.sqrt(basePos.x * basePos.x + basePos.z * basePos.z);
                        const spiralSpeed = orbitSpeed * (1 + distFromCenter * 0.005);
                        const spiralAngle = time * spiralSpeed + clusterIndex * 0.1;

                        animatedCenter.x = basePos.x * Math.cos(spiralAngle) - basePos.z * Math.sin(spiralAngle);
                        animatedCenter.z = basePos.x * Math.sin(spiralAngle) + basePos.z * Math.cos(spiralAngle);
                        // Add slight vertical wave
                        animatedCenter.y = basePos.y + Math.sin(spiralAngle * 2) * 5;
                        break;

                    case 'individual':
                        // Each particle orbits independently
                        const phase = clusterIndex * 0.5;
                        const orbitAngle = time * orbitSpeed + phase;
                        const radius = orbitRadius * (0.5 + Math.random() * 0.5);

                        animatedCenter.x = basePos.x + Math.cos(orbitAngle) * radius * 0.1;
                        animatedCenter.y = basePos.y + Math.sin(orbitAngle * 0.7) * radius * 0.1;
                        animatedCenter.z = basePos.z + Math.sin(orbitAngle) * radius * 0.1;
                        break;
                }
            }

            // Now update all sub-particles for this cluster
            cluster.subParticles.forEach(subParticle => {
                // Calculate animated position
                let animatedOffset = subParticle.offset.clone();

                if (!subParticle.isCenterParticle && window.motionEnabled) {
                    // Apply animation based on motion path
                    const subTime = time * window.subParticleAnimationSpeed;
                    const motionScale = window.subParticleMotionSpeed * 0.1;

                    switch (window.subParticleMotionPath) {
                        case 'circular':
                            animatedOffset.x += Math.sin(subTime + subParticle.phase) * motionScale;
                            animatedOffset.y += Math.cos(subTime + subParticle.phase) * motionScale;
                            break;
                        case 'spiral':
                            const spiralRadius = motionScale * (1 + Math.sin(subTime * 0.5));
                            animatedOffset.x += Math.sin(subTime + subParticle.phase) * spiralRadius;
                            animatedOffset.z += Math.cos(subTime + subParticle.phase) * spiralRadius;
                            break;
                        case 'random':
                            animatedOffset.x += Math.sin(subTime * 1.3 + subParticle.phase) * motionScale;
                            animatedOffset.y += Math.sin(subTime * 1.7 + subParticle.phase * 2) * motionScale;
                            animatedOffset.z += Math.sin(subTime * 1.1 + subParticle.phase * 3) * motionScale;
                            break;
                        case 'natural':
                        default:
                            animatedOffset.x += Math.sin(subTime + subParticle.phase) * motionScale * 0.5;
                            animatedOffset.y += Math.sin(subTime * 0.7 + subParticle.phase) * motionScale * 0.3;
                            animatedOffset.z += Math.cos(subTime * 0.5 + subParticle.phase) * motionScale * 0.4;
                    }
                }

                // Apply position (animated center + offset)
                dummy.position.copy(animatedCenter).add(animatedOffset);

                // Apply scale
                const baseScale = subParticle.isCenterParticle ?
                    window.particleSize * window.mainToSubSizeRatio :
                    window.particleSize * window.subParticleScale;

                const scale = baseScale * cluster.audioScale * (1 + cluster.hoverEffect) * (cluster.sizeMultiplier || 1.0);
                dummy.scale.set(scale, scale, 1);

                // Make particle face camera (billboard effect)
                dummy.lookAt(this.camera.position);

                // Update matrix
                dummy.updateMatrix();
                window.particleSystem.setMatrixAt(subParticle.instanceIndex, dummy.matrix);

                // Update color with opacity multiplier for density gradient effect
                if (window.particleSystem.instanceColor && cluster.opacityMultiplier !== undefined) {
                    const baseColor = new THREE.Color(cluster.color);
                    const opacityFactor = cluster.opacityMultiplier || 1.0;
                    baseColor.multiplyScalar(opacityFactor);
                    window.particleSystem.setColorAt(subParticle.instanceIndex, baseColor);
                }
            });
        });

        window.particleSystem.instanceMatrix.needsUpdate = true;
        if (window.particleSystem.instanceColor) {
            window.particleSystem.instanceColor.needsUpdate = true;
        }
    }

    /**
     * Destroy the galaxy view
     */
    destroy() {
        this.isActive = false;

        // Cancel animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Clean up audio retry interval
        if (this.audioRetryInterval) {
            clearInterval(this.audioRetryInterval);
            this.audioRetryInterval = null;
        }

        // Clean up audio check interval
        if (this.audioCheckInterval) {
            clearInterval(this.audioCheckInterval);
            this.audioCheckInterval = null;
        }

        // Clean up interaction handlers
        if (this.interaction) {
            this.interaction.destroy();
            this.interaction = null;
        }

        // Clean up particle system
        if (this.particleSystem) {
            this.particleSystem.clearParticles();
        }

        // Remove renderer
        if (this.renderer) {
            this.container.removeChild(this.renderer.domElement);
            this.renderer.dispose();
        }

        // Remove options menu
        const menu = document.getElementById('optionsMenu2');
        if (menu) {
            menu.remove();
        }

        // Clean up Three.js
        if (this.scene) {
            this.scene.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }

        console.log('🌌 Galaxy View destroyed');
    }
}

// Export the view class
export default GalaxyView;

// Also create convenience functions for compatibility
export function renderGalaxyView(container) {
    const view = new GalaxyView();
    view.render(container);
    window.galaxyView = view;
}

export function destroyGalaxyView() {
    if (window.galaxyView) {
        window.galaxyView.destroy();
        window.galaxyView = null;
    }
}

// ViewManager expects these exports
let galaxyViewInstance = null;

/**
 * Initialize the Galaxy View (required by ViewManager)
 */
export async function init(data = {}) {
    console.log('🌌 Initializing Galaxy View');

    // Get container
    const container = document.getElementById('galaxyViewContainer');
    if (!container) {
        console.error('Galaxy View container not found');
        return;
    }

    // Show container
    container.style.display = 'block';

    // Create and render the view
    galaxyViewInstance = new GalaxyView();
    await galaxyViewInstance.render(container);

    // Also expose globally for compatibility
    window.galaxyView = galaxyViewInstance;

    // Load audio files if provided
    if (data.audioFiles || window.audioFiles) {
        update({ audioFiles: data.audioFiles || window.audioFiles });
    }
}

/**
 * Update the Galaxy View (required by ViewManager)
 */
export function update(data = {}) {
    if (!galaxyViewInstance) {
        console.warn('Galaxy View not initialized');
        return;
    }

    // Update with new audio files if provided
    if (data.audioFiles && galaxyViewInstance.particleSystem) {
        console.log('🌌 Updating Galaxy View with', data.audioFiles.length, 'files');
        galaxyViewInstance.particleSystem.createParticles(data.audioFiles);
    }
}

/**
 * Destroy the Galaxy View (required by ViewManager)
 */
export async function destroy() {
    console.log('🌌 Destroying Galaxy View');

    // Hide container
    const container = document.getElementById('galaxyViewContainer');
    if (container) {
        container.style.display = 'none';
    }

    // Destroy the view instance
    if (galaxyViewInstance) {
        galaxyViewInstance.destroy();
        galaxyViewInstance = null;
    }

    // Clear global reference
    if (window.galaxyView) {
        window.galaxyView = null;
    }
}