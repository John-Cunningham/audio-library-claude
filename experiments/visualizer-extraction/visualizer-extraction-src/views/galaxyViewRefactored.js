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
     * Populate Galaxy File Browser - File List
     */
    populateGalaxyFileList() {
        const container = document.getElementById('galaxyFileList');
        if (!container) return;

        const particles = this.particleSystem?.particles || [];
        const searchFilteredFileIds = window.searchFilteredFileIds || new Set();

        let visibleFiles = [];
        if (searchFilteredFileIds.size > 0) {
            visibleFiles = particles.map(p => p.file).filter(f => searchFilteredFileIds.has(f.id));
        } else {
            visibleFiles = particles.map(p => p.file);
        }

        if (visibleFiles.length === 0) {
            container.innerHTML = '<div style="color: rgba(255,255,255,0.4); font-size: 10px; padding: 8px;">No files loaded</div>';
            return;
        }

        visibleFiles.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        let html = '';
        visibleFiles.forEach(file => {
            const tags = file.tags_array || file.tags || [];
            const category = tags.length > 0 ? tags[0] : 'Uncategorized';
            const color = window.getColorForCategory ? window.getColorForCategory(category) : { hue: 200, sat: 0.5 };
            const hexColor = `hsl(${color.hue}, ${color.sat * 100}%, 60%)`;

            html += `
                <div style="display: flex; align-items: center; padding: 4px 6px; margin-bottom: 2px; background: rgba(255,255,255,0.02); border-radius: 3px; cursor: pointer; font-size: 10px; color: rgba(255,255,255,0.9);"
                     onclick="if(window.loadAudio) window.loadAudio('${file.id}', true);"
                     onmouseover="this.style.background='rgba(102,126,234,0.2)';"
                     onmouseout="this.style.background='rgba(255,255,255,0.02)';">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: ${hexColor}; margin-right: 6px;"></div>
                    <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${file.name}</div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * Populate Galaxy File Browser - Tag Legend (Colors section)
     * Generates color legend directly since tagLegendContent may not exist
     */
    populateGalaxyTagLegend() {
        const container = document.getElementById('galaxyTagLegend');
        if (!container) return;

        // Get all unique categories from loaded files
        const audioFiles = window.audioFiles || [];
        const categories = new Map();

        audioFiles.forEach(file => {
            const tags = file.tags_array || file.tags || [];
            const category = tags.length > 0 ? tags[0] : 'Uncategorized';
            if (!categories.has(category)) {
                const colorData = window.getColorForCategory ? window.getColorForCategory(category) : { hue: 200, sat: 0.5 };
                categories.set(category, colorData);
            }
        });

        console.log(`📊 Found ${categories.size} categories:`, Array.from(categories.keys()));
        console.log(`🎨 Color data sample:`, Array.from(categories.entries()).slice(0, 3));

        // Generate HTML for each category
        let html = '';
        Array.from(categories.entries()).sort((a, b) => a[0].localeCompare(b[0])).forEach(([category, colorData]) => {
            const color = `hsl(${colorData.hue}, ${colorData.sat * 100}%, 60%)`;
            html += `
                <div class="tag-legend-item" data-category="${category}" style="display: flex; align-items: center; padding: 4px 6px; margin-bottom: 2px; background: rgba(255,255,255,0.02); border-radius: 3px; cursor: pointer; font-size: 10px;">
                    <div class="tag-legend-color" style="width: 12px; height: 12px; border-radius: 50%; background: ${color}; margin-right: 8px; flex-shrink: 0;"></div>
                    <div class="tag-legend-name" style="flex: 1; color: rgba(255,255,255,0.9);">${category}</div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Add click handlers to make categories toggleable
        const items = container.querySelectorAll('.tag-legend-item');
        items.forEach(item => {
            const category = item.dataset.category;
            if (!category) return;

            const colorDot = item.querySelector('.tag-legend-color');
            const nameDiv = item.querySelector('.tag-legend-name');

            if (colorDot && nameDiv) {
                // Create toggle function for both dot and name
                const toggleVisibility = (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (window.hiddenCategories.has(category)) {
                        // Show category
                        window.hiddenCategories.delete(category);
                        colorDot.style.opacity = '1';
                        colorDot.style.filter = 'none';
                    } else {
                        // Hide category
                        window.hiddenCategories.add(category);
                        colorDot.style.opacity = '0.3';
                        colorDot.style.filter = 'grayscale(100%)';
                    }

                    // Update main legend too (sync visual state)
                    const mainLegendItems = document.querySelectorAll('#tagLegendContent .tag-legend-item');
                    mainLegendItems.forEach(mainItem => {
                        if (mainItem.dataset.category === category) {
                            const mainColorDot = mainItem.querySelector('.tag-legend-color');
                            if (mainColorDot) {
                                if (window.hiddenCategories.has(category)) {
                                    mainColorDot.style.opacity = '0.3';
                                    mainColorDot.style.filter = 'grayscale(100%)';
                                } else {
                                    mainColorDot.style.opacity = '1';
                                    mainColorDot.style.filter = 'none';
                                }
                            }
                        }
                    });

                    // Update particle visibility in Galaxy View
                    if (this.particleSystem && this.particleSystem.updateParticleVisibility) {
                        this.particleSystem.updateParticleVisibility();
                    }
                };

                // Attach click handlers to both dot and name
                colorDot.addEventListener('click', toggleVisibility);
                nameDiv.addEventListener('click', toggleVisibility);

                // Initialize visual state if category is already hidden
                if (window.hiddenCategories && window.hiddenCategories.has(category)) {
                    colorDot.style.opacity = '0.3';
                    colorDot.style.filter = 'grayscale(100%)';
                }
            }
        });
    }

    /**
     * Populate Galaxy File Browser - Tags List
     * Copied exactly from visualizer_V37_for_extraction.html:3629
     */
    populateGalaxyTagsList() {
        const container = document.getElementById('galaxyTagsList');
        if (!container) return;

        // Get visible files based on search and filters
        const searchFilteredFileIds = window.searchFilteredFileIds || new Set();
        let visibleFiles = [];
        if (searchFilteredFileIds.size > 0) {
            visibleFiles = (window.audioFiles || []).filter(f => searchFilteredFileIds.has(f.id));
        } else {
            const particles = this.particleSystem?.particles || [];
            visibleFiles = particles.map(p => p.file);
        }

        // Collect all unique tags from visible files
        const tagCounts = new Map();
        visibleFiles.forEach(file => {
            if (file.tags && Array.isArray(file.tags)) {
                file.tags.forEach(tag => {
                    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                });
            }
        });

        if (tagCounts.size === 0) {
            container.innerHTML = '<div style="color: rgba(255,255,255,0.4); font-size: 10px; padding: 4px;">No tags found</div>';
            return;
        }

        // Sort tags by count (descending) then alphabetically
        const sortedTags = Array.from(tagCounts.entries()).sort((a, b) => {
            if (b[1] !== a[1]) return b[1] - a[1]; // Sort by count descending
            return a[0].localeCompare(b[0]); // Then alphabetically
        });

        let html = '<div style="display: flex; flex-wrap: wrap; gap: 4px;">';
        sortedTags.forEach(([tag, count]) => {
            html += `
                <div style="display: inline-flex; align-items: center; padding: 3px 8px; background: rgba(102,126,234,0.2); border: 1px solid rgba(102,126,234,0.4); border-radius: 12px; cursor: pointer; font-size: 9px;"
                     onclick="if(window.handleTagClick) window.handleTagClick('${tag.replace(/'/g, "\\'")}');"
                     onmouseover="this.style.background='rgba(102,126,234,0.3)';"
                     onmouseout="this.style.background='rgba(102,126,234,0.2)';">
                    <span>${tag}</span>
                    <span style="margin-left: 4px; color: rgba(255,255,255,0.5);">(${count})</span>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;
    }

    /**
     * Update Galaxy File Count display
     */
    updateGalaxyFileCount() {
        const galaxyFileCount = document.getElementById('galaxyFileCount');
        if (!galaxyFileCount) return;

        const particles = this.particleSystem?.particles || [];
        const searchFilteredFileIds = window.searchFilteredFileIds || new Set();
        const visibleCount = searchFilteredFileIds.size > 0 ? searchFilteredFileIds.size : particles.length;
        const totalCount = (window.audioFiles || []).length;
        galaxyFileCount.textContent = `${visibleCount} visible (${totalCount} total)`;
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

            // Populate File Browser UI
            this.populateGalaxyFileList();
            this.populateGalaxyTagLegend();
            this.populateGalaxyTagsList();
            this.updateGalaxyFileCount();
            console.log('🌌 File Browser UI populated');
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
        // Fog settings copied from reference (line 3356): near=10, far=visibilityDistance
        this.scene.fog = new THREE.Fog(0x000000, 10, window.visibilityDistance || 900);

        // Camera setup
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 2000);
        // Position camera further back to see particle cloud spread (-100 to +100)
        this.camera.position.set(0, 50, 200);
        // Point camera at center of particle cloud
        this.camera.lookAt(0, 0, 0);

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
            window.bloomStrength || 0.0,  // bloom strength (starts at 0)
            0.8,  // radius (increased for more spread)
            0.1  // threshold (lowered so particles can bloom)
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
        // Track the current media element so we can detect when it changes
        this.lastMediaElement = null;

        // Set up interval to check for wavesurfer and auto-connect when audio reactivity is on
        this.audioCheckInterval = setInterval(() => {
            // Only run if audio reactivity is enabled
            if (!window.audioReactivityEnabled) {
                return;
            }

            // Check if WaveSurfer exists
            if (!window.wavesurfer) {
                this.audioConnected = false;
                this.lastMediaElement = null;
                return;
            }

            // Get current media element
            const currentMedia = window.wavesurfer.media;

            // Check if media element changed (new file loaded)
            const mediaChanged = currentMedia !== this.lastMediaElement;

            // Try to connect if:
            // 1. Not connected yet, OR
            // 2. Media element changed (new file loaded)
            if (!this.audioConnected || mediaChanged) {
                if (mediaChanged && this.lastMediaElement !== null) {
                    console.log('[🔄 AUTO-CONNECT] 🎵 New file detected - reconnecting...');
                    this.audioConnected = false; // Force reconnection
                }

                console.log('[🔄 AUTO-CONNECT] Attempting audio analyzer connection...');
                console.log('[🔄 AUTO-CONNECT] Reactivity:', window.audioReactivityEnabled, '| Connected:', this.audioConnected, '| WaveSurfer:', !!window.wavesurfer, '| Media changed:', mediaChanged);

                this.setupAudioAnalyzer();
                this.lastMediaElement = currentMedia;

                if (this.audioConnected) {
                    console.log('[🔄 AUTO-CONNECT] ✅ SUCCESS - Audio analyzer connected!');
                }
            }
        }, 1000); // Check every 1 second

        // Expose manual reconnect function
        window.reconnectGalaxyAudio = () => {
            console.log('[🔧 MANUAL RECONNECT] User triggered reconnect');
            this.audioConnected = false; // Force reconnection
            this.setupAudioAnalyzer();
        };

        // Expose File Browser population functions
        window.populateGalaxyFileList = () => this.populateGalaxyFileList();
        window.populateGalaxyTagLegend = () => this.populateGalaxyTagLegend();
        window.populateGalaxyTagsList = () => this.populateGalaxyTagsList();
        window.updateGalaxyFileCount = () => this.updateGalaxyFileCount();

        console.log('[AudioPlayback] ✅ Continuous auto-connect enabled (checks every 1s, detects file changes)');
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

            // Populate menu with current values (sets toggle button states)
            if (window.populateGalaxyMenu) {
                window.populateGalaxyMenu();
            }

            // Load default preset if set (copied from visualizer_V37_for_extraction.html:9065)
            const defaultPreset = localStorage.getItem('visualizerDefaultPreset');
            if (defaultPreset) {
                const presets = JSON.parse(localStorage.getItem('visualizerPresets') || '{}');
                if (presets[defaultPreset]) {
                    console.log(`Loading default preset: ${defaultPreset}`);
                    if (window.loadPreset) {
                        window.loadPreset(defaultPreset);
                    }
                    const select = document.getElementById('presetSelect');
                    if (select) select.value = defaultPreset;
                }
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
        if (!window.particles || !window.particleSystem) {
            // Only log once to avoid spam
            if (!this._particleUpdateWarningLogged) {
                console.warn('⚠️ updateParticles: particles or particleSystem not found', {
                    particles: !!window.particles,
                    particleSystem: !!window.particleSystem
                });
                this._particleUpdateWarningLogged = true;
            }
            return;
        }

        // DEBUG: Check if critical window variables are set (only log once)
        if (!this._windowVarsChecked) {
            console.log('🔍 Window variables check:', {
                particleSize: window.particleSize,
                subParticleScale: window.subParticleScale,
                mainToSubSizeRatio: window.mainToSubSizeRatio,
                clusterRadius: window.clusterRadius
            });
            this._windowVarsChecked = true;
        }

        const dummy = new THREE.Object3D();
        const time = this.animationTime;
        const orbitSpeed = window.orbitSpeed !== undefined ? window.orbitSpeed : 0.0015;
        const orbitRadius = window.orbitRadius !== undefined ? window.orbitRadius : 80;

        // Audio reactivity - calculate current amplitude
        let audioAmplitude = 0;
        let bassAmplitude = 0;
        let midsAmplitude = 0;
        let highsAmplitude = 0;

        if (window.audioReactivityEnabled && this.audioAnalyzer && this.audioDataArray) {
            try {
                this.audioAnalyzer.getByteFrequencyData(this.audioDataArray);

                // Debug: Log first few values once every 60 frames
                // DISABLED: Too much console spam
                // if (Math.floor(this.animationTime * 10) % 60 === 0) {
                //     const firstValues = Array.from(this.audioDataArray.slice(0, 5));
                //     console.log('[AudioReactivity] First 5 frequency values:', firstValues);
                //     console.log('[AudioReactivity] Wavesurfer playing:', window.wavesurfer?.isPlaying());
                //     console.log('[AudioReactivity] Audio connected:', this.audioConnected);
                // }

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

        // Crosshair hover detection - check individual sub-particles
        let hoveredCluster = null;
        let hoveredFileName = null;
        if (window.mouseInteractionEnabled && window.isPointerLocked) {
            // Ray from camera center (crosshair position)
            const rayOrigin = this.camera.position.clone();
            const rayDirection = new THREE.Vector3(0, 0, -1);
            rayDirection.applyQuaternion(this.camera.quaternion);

            let closestDistance = Infinity;
            const hoverThreshold = window.particleSize * 2;

            // Check each sub-particle in each cluster
            window.particles.forEach(cluster => {
                cluster.subParticles.forEach(subParticle => {
                    // Use stored world position from animation loop (or fallback)
                    const worldPos = subParticle.worldPosition || cluster.centerPosition.clone().add(subParticle.offset);
                    const distanceToParticle = rayOrigin.distanceTo(worldPos);

                    // Check if ray intersects this sub-particle
                    const toParticle = worldPos.clone().sub(rayOrigin);
                    const projection = toParticle.dot(rayDirection);

                    if (projection > 0) {
                        const closestPoint = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(projection));
                        const particleDistance = closestPoint.distanceTo(worldPos);

                        if (particleDistance < hoverThreshold && distanceToParticle < closestDistance) {
                            closestDistance = distanceToParticle;
                            hoveredCluster = cluster;
                            hoveredFileName = cluster.file?.name || 'Unknown';
                        }
                    }
                });
            });
        }

        // Update tooltip
        if (hoveredCluster && window.tooltipsEnabled !== false) {
            this.showFileTooltip(hoveredCluster);
        } else {
            this.hideFileTooltip();
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
                // Check if this cluster is the currently playing file
                const isPlayingFile = window.currentFileId && cluster.file && cluster.file.id === window.currentFileId;

                // Debug logging (only for first cluster to avoid console spam)
                if (clusterIndex === 0 && Math.random() < 0.01) {
                    console.log('[Audio Reactivity Debug]', {
                        currentFileId: window.currentFileId,
                        clusterFileId: cluster.file?.id,
                        isPlayingFile: isPlayingFile,
                        pulseStrength: window.audioReactivityStrength,
                        globalReactivity: window.globalAudioReactivity
                    });
                }

                if (isPlayingFile) {
                    // Playing file uses pulse strength (audioReactivityStrength)
                    const pulseStrength = window.audioReactivityStrength !== undefined ? window.audioReactivityStrength : 1.0;
                    const targetScale = 1.0 + (audioAmplitude * pulseStrength);
                    cluster.audioScale += (targetScale - cluster.audioScale) * 0.15;
                } else {
                    // All other particles use global reactivity (only if > 0)
                    const globalReactivity = window.globalAudioReactivity !== undefined ? window.globalAudioReactivity : 0.5;
                    if (globalReactivity > 0) {
                        const targetScale = 1.0 + (audioAmplitude * globalReactivity);
                        cluster.audioScale += (targetScale - cluster.audioScale) * 0.15;
                    } else {
                        // If global reactivity is 0, return to normal scale
                        cluster.audioScale += (1.0 - cluster.audioScale) * 0.1;
                    }
                }
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
            // Handle hover time slowdown - maintain continuity
            const isHovered = (cluster === hoveredCluster);

            // Calculate delta time since last frame
            const deltaTime = cluster.lastRealTime !== null ? (time - cluster.lastRealTime) : 0;
            cluster.lastRealTime = time;

            // Initialize custom time if needed
            if (cluster.customTime === null) {
                cluster.customTime = time;
            }

            // Advance custom time based on hover state
            if (isHovered && window.mouseInteractionEnabled && window.hoverSlowdown < 1) {
                // Hovering: advance at slow speed
                cluster.customTime += deltaTime * window.hoverSlowdown;
            } else {
                // Not hovering: advance at normal speed
                cluster.customTime += deltaTime;
            }

            const clusterTime = cluster.customTime;

            // Calculate animated cluster center position based on rotation mode
            let animatedCenter = cluster.centerPosition.clone();

            if (window.motionEnabled && window.rotationMode) {
                const basePos = cluster.centerPosition.clone();

                switch (window.rotationMode) {
                    case 'collective':
                        // COLLECTIVE: All clusters rotate together as a sphere around origin
                        // Amplitude controls how far particles rotate from their base positions
                        const angle = clusterTime * orbitSpeed * 1000;
                        const amplitudeScale = orbitRadius * 0.1;

                        // Start with base position
                        let centerX = basePos.x;
                        let centerY = basePos.y;
                        let centerZ = basePos.z;

                        if (window.rotationAxis === 'y' || window.rotationAxis === 'all') {
                            const cosY = Math.cos(angle);
                            const sinY = Math.sin(angle);
                            const tempX = (basePos.x * amplitudeScale) * cosY - (basePos.z * amplitudeScale) * sinY;
                            const tempZ = (basePos.x * amplitudeScale) * sinY + (basePos.z * amplitudeScale) * cosY;
                            centerX = tempX;
                            centerZ = tempZ;
                        }

                        if (window.rotationAxis === 'x' || window.rotationAxis === 'all') {
                            const cosX = Math.cos(angle * 0.7);
                            const sinX = Math.sin(angle * 0.7);
                            const tempY = (centerY * amplitudeScale) * cosX - centerZ * sinX;
                            const tempZ = (centerY * amplitudeScale) * sinX + centerZ * cosX;
                            centerY = tempY;
                            centerZ = tempZ;
                        }

                        if (window.rotationAxis === 'z' || window.rotationAxis === 'all') {
                            const cosZ = Math.cos(angle * 0.5);
                            const sinZ = Math.sin(angle * 0.5);
                            const tempX = centerX * cosZ - (centerY * amplitudeScale) * sinZ;
                            const tempY = centerX * sinZ + (centerY * amplitudeScale) * cosZ;
                            centerX = tempX;
                            centerY = tempY;
                        }

                        animatedCenter.set(centerX, centerY, centerZ);
                        break;

                    case 'spiral':
                        // SPIRAL: Galaxy arm rotation with drift based on amplitude
                        const dx = basePos.x;
                        const dz = basePos.z;
                        const distFromCenter = Math.sqrt(dx * dx + dz * dz);
                        const currentAngle = Math.atan2(dz, dx);
                        const spiralAngle = currentAngle + (clusterTime * orbitSpeed * 1000 * (1 + distFromCenter * 0.01));

                        const spiralX = Math.cos(spiralAngle) * distFromCenter;
                        const spiralZ = Math.sin(spiralAngle) * distFromCenter;
                        const driftX = (spiralX - dx) * (orbitRadius * 0.01);
                        const driftZ = (spiralZ - dz) * (orbitRadius * 0.01);

                        animatedCenter.x = basePos.x + driftX;
                        animatedCenter.z = basePos.z + driftZ;
                        animatedCenter.y = basePos.y;
                        break;

                    case 'individual':
                        // INDIVIDUAL: Each cluster orbits around its own base position
                        // Amplitude controls orbit size directly
                        const offset = clusterIndex * 0.1;
                        animatedCenter.x = basePos.x + Math.sin(clusterTime * orbitSpeed * 1000 + offset) * orbitRadius;
                        animatedCenter.z = basePos.z + Math.cos(clusterTime * orbitSpeed * 1000 + offset) * orbitRadius;
                        animatedCenter.y = basePos.y + Math.sin(clusterTime * orbitSpeed * 800 + offset * 0.7) * (orbitRadius * 0.3);
                        break;
                }
            }

            // Now update all sub-particles for this cluster
            cluster.subParticles.forEach(subParticle => {
                // Calculate animated position
                let animatedOffset = subParticle.offset.clone();

                // Apply audio reactivity: expand sub-particles from center based on audio amplitude
                if (!subParticle.isCenterParticle && window.audioReactivityEnabled && audioAmplitude > 0) {
                    const isPlayingFile = window.currentFileId && cluster.file && cluster.file.id === window.currentFileId;
                    let audioExpansion = 0;

                    if (isPlayingFile) {
                        // Playing file uses pulse strength
                        const pulseStrength = window.audioReactivityStrength !== undefined ? window.audioReactivityStrength : 1.0;
                        audioExpansion = audioAmplitude * pulseStrength * 0.5;
                    } else if (window.globalAudioReactivity > 0) {
                        // Other files use global reactivity
                        audioExpansion = audioAmplitude * window.globalAudioReactivity * 0.5;
                    }

                    // Scale the offset outward based on audio
                    animatedOffset.multiplyScalar(1.0 + audioExpansion);
                }

                if (!subParticle.isCenterParticle && window.motionEnabled) {
                    // Apply animation based on motion path (use cluster's slowed time)
                    const subTime = clusterTime * window.subParticleAnimationSpeed;
                    const motionScale = window.subParticleMotionSpeed * 2.0;

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

                // DEBUG: Detect NaN in position (only log first occurrence)
                if ((isNaN(dummy.position.x) || isNaN(dummy.position.y) || isNaN(dummy.position.z)) && !this._nanPositionLogged) {
                    console.error('❌ NaN position detected!', {
                        animatedCenter: {x: animatedCenter.x, y: animatedCenter.y, z: animatedCenter.z},
                        animatedOffset: {x: animatedOffset.x, y: animatedOffset.y, z: animatedOffset.z},
                        finalPosition: {x: dummy.position.x, y: dummy.position.y, z: dummy.position.z},
                        basePosition: {x: cluster.centerPosition.x, y: cluster.centerPosition.y, z: cluster.centerPosition.z},
                        rotationMode: window.rotationMode,
                        motionEnabled: window.motionEnabled
                    });
                    this._nanPositionLogged = true;
                }

                // Store world position for click detection and hover
                subParticle.worldPosition = dummy.position.clone();

                // Apply scale
                // Main/Sub Size Ratio: 1.0 = same size, higher = center particle larger
                let baseScale;
                if (subParticle.isCenterParticle) {
                    baseScale = window.particleSize * window.subParticleScale * window.mainToSubSizeRatio;
                } else {
                    baseScale = window.particleSize * window.subParticleScale;
                }

                // Apply size gradient based on distance from center particle
                if (!subParticle.isCenterParticle && window.sizeGradient > 0) {
                    // Calculate normalized distance (0 = at center, 1 = max radius)
                    const distanceFromCenter = subParticle.baseRadius; // Already normalized 0.2-1.0
                    // Apply gradient: closer particles = larger, distant particles = smaller
                    const sizeMultiplier = 1.0 - (distanceFromCenter * window.sizeGradient * 0.5);
                    baseScale *= Math.max(0.1, sizeMultiplier); // Clamp to prevent invisible particles
                }

                const scale = baseScale * cluster.audioScale * (1 + cluster.hoverEffect) * (cluster.sizeMultiplier || 1.0);

                // DEBUG: Detect NaN in scale calculation (only log first occurrence)
                if (isNaN(scale) && !this._nanScaleLogged) {
                    console.error('❌ NaN scale detected!', {
                        baseScale,
                        audioScale: cluster.audioScale,
                        hoverEffect: cluster.hoverEffect,
                        sizeMultiplier: cluster.sizeMultiplier,
                        finalScale: scale,
                        position: dummy.position
                    });
                    this._nanScaleLogged = true;
                }

                dummy.scale.set(scale, scale, 1);

                // Make particle face camera (billboard effect)
                // TEMP DISABLED: Testing if lookAt causes NaN
                // if (this.camera && this.camera.position) {
                //     dummy.lookAt(this.camera.position);
                // }

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
     * Show file tooltip
     */
    showFileTooltip(cluster) {
        const tooltip = document.getElementById('fileTooltip');
        const tooltipTitle = document.getElementById('tooltipTitle');
        const tooltipMetadata = document.getElementById('tooltipMetadata');
        const tooltipTags = document.getElementById('tooltipTags');

        if (!tooltip || !cluster?.file) return;

        tooltipTitle.textContent = cluster.file.name;

        let metadata = '';
        if (cluster.file.id) {
            const cleanId = cluster.file.id.toString().replace(/^audio_files_/, '');
            metadata += `ID: ${cleanId}`;
        }
        if (cluster.file.bpm) metadata += (metadata ? ' • ' : '') + `${cluster.file.bpm} BPM`;
        if (cluster.file.key) metadata += (metadata ? ' • ' : '') + cluster.file.key;
        tooltipMetadata.textContent = metadata;

        // Tags
        tooltipTags.innerHTML = '';
        const tags = cluster.file.tags_array || cluster.file.tags || [];
        if (tags.length > 0) {
            tags.forEach(tag => {
                const chip = document.createElement('div');
                chip.className = 'tag-chip';
                chip.textContent = tag;
                tooltipTags.appendChild(chip);
            });
        }

        tooltip.classList.add('active');
        // Position at center-right
        tooltip.style.left = '55%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translateY(-50%)';
    }

    /**
     * Hide file tooltip
     */
    hideFileTooltip() {
        const tooltip = document.getElementById('fileTooltip');
        if (tooltip) {
            tooltip.classList.remove('active');
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