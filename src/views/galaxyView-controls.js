// Galaxy View Controls - All menu control handlers and UI functions
// Exported functions are called by the loaded options menu HTML

/**
 * Wires up all options menu controls to Galaxy View
 * Call this after the options menu HTML is loaded
 *
 * @param {Object} context - Object containing references to galaxyView variables/functions
 */
export function wireUpMenuControls(context) {
    const {
        recreateParticles,
        updateClusterPositions,
        setMotionMode,
        hiddenCategories,
        particleSystem,
        createParticleTexture,
        particles,
        scene,
        audioFilesData,
        updateFileCount,
        getAxisScales,
        setAxisScales,
        getBloomPass
    } = context;

    // Expose recreateParticles to window
    window.recreateParticles = () => {
        console.log('🌐 window.recreateParticles called from menu');
        recreateParticles();
    };

    // ========================================================================
    // UI TOGGLE FUNCTIONS
    // ========================================================================

    let crosshairEnabled = true; // Start enabled
    window.toggleCrosshair = function() {
        crosshairEnabled = !crosshairEnabled;
        const crosshair = document.getElementById('crosshair');
        const btn = document.getElementById('galaxyCrosshairToggle');

        if (crosshair) {
            crosshair.style.display = crosshairEnabled ? 'block' : 'none';
        }
        if (btn) {
            btn.textContent = `Crosshair: ${crosshairEnabled ? 'ON' : 'OFF'}`;
        }
        console.log(`🎯 Crosshair ${crosshairEnabled ? 'enabled' : 'disabled'}`);
    };

    // Show crosshair by default when Galaxy View initializes
    setTimeout(() => {
        const crosshair = document.getElementById('crosshair');
        if (crosshair && crosshairEnabled) {
            crosshair.style.display = 'block';
            console.log('🎯 Crosshair shown on init');
        }
    }, 200);

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

    // ========================================================================
    // OPTIONS MENU UI FUNCTIONS
    // ========================================================================

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

    // ========================================================================
    // DRAG AND RESIZE FUNCTIONALITY
    // ========================================================================

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

    // ========================================================================
    // DATABASE & CATEGORY CONTROLS
    // ========================================================================

    window.toggleGalaxyDbSource = function(source, event) {
        console.log(`📊 Database source toggle for ${source} not implemented yet`);
    };

    window.showAllCategories = function() {
        hiddenCategories.clear();
        console.log('👁️ Showing all categories');
    };

    window.hideAllCategories = function() {
        const allCategories = ['drums', 'inst', 'vox', 'bass', 'gtr', 'pno', 'syn', 'perc', 'pad', 'lead', 'fx', 'arp', 'other'];
        allCategories.forEach(cat => hiddenCategories.add(cat));
        console.log('👁️ Hiding all categories');
    };

    // ========================================================================
    // GALAXY DYNAMICS CONTROLS
    // ========================================================================

    window.updateRotationMode = function(mode) {
        const modeMap = {
            'collective': 'collective',
            'spiral': 'individual',
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

    window.updateMotionSpeed = function(value) {
        // Convert slider value (0-100) to orbit speed
        // At 0: no motion. At 50: default speed. At 100: 2x speed
        window.orbitSpeed = parseFloat(value) * 0.00003;
        const speedDisplay = document.getElementById('galaxyMotionSpeedValue');
        if (speedDisplay) speedDisplay.textContent = value;
        console.log(`🔄 Motion speed set to: ${value} (orbitSpeed: ${window.orbitSpeed})`);
    };

    window.updateMotionRadius = function(value) {
        window.orbitRadius = parseFloat(value);
        const radiusDisplay = document.getElementById('galaxyMotionRadiusValue');
        if (radiusDisplay) radiusDisplay.textContent = value;
        console.log(`🔄 Motion radius: ${window.orbitRadius}`);
    };

    window.updateStemOffset = function(value) {
        console.log(`🎚️ Stem offset: ${value} (not applicable to Galaxy View)`);
    };

    // handleSearch is implemented in galaxyView.js and exposed there
    // Don't create a stub here - it will override the real implementation

    // ========================================================================
    // PARTICLE APPEARANCE CONTROLS
    // ========================================================================

    window.updateParticleSize = (value) => {
        window.particleSize = parseFloat(value);
        const display = document.getElementById('galaxyParticleSizeValue');
        if (display) display.textContent = value;
        console.log('📏 Particle size set to:', window.particleSize);
    };

    window.updateParticleBrightness = (value) => {
        window.particleBrightness = parseFloat(value);
        const display = document.getElementById('galaxyBrightnessValue');
        if (display) display.textContent = value;
        if (particleSystem && particleSystem.material) {
            particleSystem.material.opacity = window.particleBrightness;
            particleSystem.material.needsUpdate = true;
        }
        console.log('✨ Brightness updated to:', window.particleBrightness);
    };

    window.updateVisibility = (value) => {
        window.visibilityDistance = parseFloat(value);
        const display = document.getElementById('galaxyVisibilityValue');
        if (display) display.textContent = value;
        if (scene && scene.fog) {
            scene.fog.far = window.visibilityDistance;
        }
        console.log('👁️ Visibility distance updated to:', window.visibilityDistance);
    };

    window.updateSubParticleCount = (value) => {
        const newCount = parseInt(value);
        const oldCount = window.particlesPerCluster;
        console.log(`Updating sub-particle count from ${oldCount} to ${newCount}`);
        window.particlesPerCluster = newCount;
        const display = document.getElementById('subParticleCountValue');
        if (display) display.textContent = value;
        recreateParticles();
    };

    window.updateClusterSpread = (value) => {
        window.clusterRadius = parseFloat(value);
        const display = document.getElementById('clusterSpreadValue');
        if (display) display.textContent = value;

        // Update existing cluster sub-particle offsets using stored base radius (more efficient than recreating)
        if (particles.length > 0 && particleSystem) {
            particles.forEach(cluster => {
                cluster.subParticles.forEach(subParticle => {
                    // Skip center particles
                    if (subParticle.isCenterParticle) {
                        return;
                    }
                    // Recalculate offset with new radius using stored baseRadius
                    const normalized = subParticle.offset.clone().normalize();
                    subParticle.offset.copy(normalized.multiplyScalar(window.clusterRadius * subParticle.baseRadius));
                });
            });
        }
        console.log('💫 Cluster spread updated to:', value);
    };

    window.updateParticleShape = (value) => {
        window.particleShape = value;
        const display = document.getElementById('particleShapeDisplay');
        if (display) display.textContent = value;

        if (particleSystem && particleSystem.material) {
            particleSystem.material.map = createParticleTexture(value);
            particleSystem.material.needsUpdate = true;
        }
        console.log('🔷 Particle shape updated to:', value);
    };

    // ========================================================================
    // AUDIO REACTIVITY CONTROLS
    // ========================================================================

    window.updateAudioStrength = (value) => {
        window.audioReactivityStrength = parseFloat(value);
        const display = document.getElementById('audioStrengthValue');
        if (display) display.textContent = value;
        console.log('🔊 Audio strength updated to:', window.audioReactivityStrength);
    };

    window.updateGlobalReactivity = (value) => {
        window.globalAudioReactivity = parseFloat(value);
        const display = document.getElementById('globalReactivityValue');
        if (display) display.textContent = value;
        console.log('🌍 Global audio reactivity updated to:', window.globalAudioReactivity);
    };

    // ========================================================================
    // VISUAL EFFECTS CONTROLS
    // ========================================================================

    window.updateBloomStrength = (value) => {
        window.bloomStrength = parseFloat(value);
        const display = document.getElementById('bloomStrengthValue');
        if (display) display.textContent = value;

        // Update bloom pass strength if it exists
        const bloomPass = getBloomPass();
        if (bloomPass) {
            bloomPass.strength = window.bloomStrength;
            console.log('✨ Bloom strength updated to:', value);
        } else {
            console.log('✨ Bloom strength set to:', value, '(bloom pass not initialized yet)');
        }
    };

    // ========================================================================
    // ADVANCED V37 CONTROLS
    // ========================================================================

    // Axis Scale Controls
    window.updateXAxisScale = (value) => {
        const parsedValue = parseFloat(value);
        setAxisScales(parsedValue, undefined, undefined);
        const display = document.getElementById('xAxisScaleValue');
        if (display) display.textContent = value;
        updateClusterPositions();
        console.log('📏 X-Axis scale updated to:', value);
    };

    window.updateYAxisScale = (value) => {
        const parsedValue = parseFloat(value);
        setAxisScales(undefined, parsedValue, undefined);
        const display = document.getElementById('yAxisScaleValue');
        if (display) display.textContent = value;
        updateClusterPositions();
        console.log('📏 Y-Axis scale updated to:', value);
    };

    window.updateZAxisScale = (value) => {
        const parsedValue = parseFloat(value);
        setAxisScales(undefined, undefined, parsedValue);
        const display = document.getElementById('zAxisScaleValue');
        if (display) display.textContent = value;
        updateClusterPositions();
        console.log('📏 Z-Axis scale updated to:', value);
    };

    // Sub-Particle Advanced Controls
    window.updateSubParticleSize = (value) => {
        window.subParticleScale = parseFloat(value);
        const display = document.getElementById('subParticleSizeValue');
        if (display) display.textContent = value;
        recreateParticles();
        console.log('🔹 Sub-particle size updated to:', value);
    };

    window.updateMainToSubRatio = (value) => {
        window.mainToSubRatio = parseFloat(value);
        const display = document.getElementById('mainToSubRatioValue');
        if (display) display.textContent = value;
        console.log('⚖️ Main/Sub ratio updated to:', value, '(not yet implemented)');
    };

    window.updateSubParticleMotion = (value) => {
        window.subParticleMotionDistance = parseFloat(value);
        const display = document.getElementById('subParticleMotionValue');
        if (display) display.textContent = value;
        console.log('🌀 Sub-particle motion distance updated to:', value, '(not yet implemented)');
    };

    window.updateSubParticleSpeed = (value) => {
        window.subParticleSpeed = parseFloat(value);
        const display = document.getElementById('subParticleSpeedValue');
        if (display) display.textContent = value;
        console.log('⚡ Sub-particle speed updated to:', value, '(not yet implemented)');
    };

    window.updateMotionPath = (value) => {
        window.motionPath = value;
        console.log('🛤️ Motion path updated to:', value, '(not yet implemented)');
    };

    window.updateSubParticleShape = (value) => {
        window.subParticleShape = value;
        recreateParticles();
        console.log('🔷 Sub-particle shape updated to:', value);
    };

    // Visual Gradient Controls
    window.updateSizeGradient = (value) => {
        window.sizeGradient = parseFloat(value);
        const display = document.getElementById('sizeGradientValue');
        if (display) display.textContent = value;
        console.log('📊 Size gradient updated to:', value, '(not yet implemented)');
    };

    window.updateDensityGradient = (value) => {
        window.densityGradient = parseFloat(value);
        const display = document.getElementById('densityGradientValue');
        if (display) display.textContent = value;
        recreateParticles();
        console.log('📈 Density gradient updated to:', value);
    };

    // Audio Reactivity Advanced Controls
    window.updateFrequencyMode = (value) => {
        window.audioFrequencyMode = value;
        console.log('🎚️ Frequency mode updated to:', value);
    };

    window.toggleAudioReactivity = () => {
        window.audioReactivityEnabled = !window.audioReactivityEnabled;
        const btn = document.getElementById('audioReactivityToggle');
        if (btn) {
            btn.textContent = `Audio Reactivity: ${window.audioReactivityEnabled ? 'ON' : 'OFF'}`;
            btn.style.color = window.audioReactivityEnabled ? '#667eea' : '#888';
        }
        console.log('🎵 Audio reactivity:', window.audioReactivityEnabled ? 'ON' : 'OFF');
    };

    // Hover Effects Controls
    window.updateHoverSpeed = (value) => {
        window.hoverSlowdown = 100 / parseFloat(value);
        const display = document.getElementById('hoverSpeedValue');
        if (display) display.textContent = value;
        console.log('🐌 Hover speed updated to:', value, '% (slowdown factor:', window.hoverSlowdown, ')');
    };

    window.updateHoverScale = (value) => {
        window.hoverScale = parseFloat(value);
        const display = document.getElementById('hoverScaleValue');
        if (display) display.textContent = value;
        console.log('🔍 Hover scale updated to:', value);
    };

    window.toggleMouseInteraction = () => {
        window.mouseInteractionEnabled = !window.mouseInteractionEnabled;
        const btn = document.getElementById('mouseInteractionToggle');
        if (btn) {
            btn.textContent = `Crosshair Hover: ${window.mouseInteractionEnabled ? 'ON' : 'OFF'}`;
            btn.style.color = window.mouseInteractionEnabled ? '#667eea' : '#888';
        }
        console.log('🖱️ Mouse interaction:', window.mouseInteractionEnabled ? 'ON' : 'OFF');
    };

    window.toggleMotion = () => {
        window.motionEnabled = !window.motionEnabled;
        const btn = document.getElementById('motionToggle');
        if (btn) {
            btn.textContent = `Motion: ${window.motionEnabled ? 'ON' : 'OFF'}`;
            btn.style.color = window.motionEnabled ? '#667eea' : '#888';
        }
        console.log('🎭 Motion:', window.motionEnabled ? 'ON' : 'OFF');
        return window.motionEnabled;
    };

    // ========================================================================
    // PRESET SAVE/LOAD
    // ========================================================================

    window.savePreset = function(name) {
        // Get name from input if not provided
        if (!name) {
            const input = document.getElementById('presetNameInput');
            name = input ? input.value.trim() : '';
        }

        if (!name) {
            console.warn('⚠️ No preset name provided');
            return;
        }

        const state = {
            motionMode: window.motionMode,
            orbitSpeed: window.orbitSpeed,
            orbitRadius: window.orbitRadius,
            audioReactivityStrength: window.audioReactivityStrength,
            particlesPerCluster: window.particlesPerCluster,
            particleSize: window.particleSize,
            clusterRadius: window.clusterRadius,
            particleBrightness: window.particleBrightness
        };
        localStorage.setItem(`galaxyPreset_${name}`, JSON.stringify(state));
        console.log(`💾 Saved preset: ${name}`);

        // Update the preset select dropdown
        updatePresetList();
    };

    window.loadPreset = function(name) {
        const saved = localStorage.getItem(`galaxyPreset_${name}`);
        if (saved) {
            const state = JSON.parse(saved);
            window.motionMode = state.motionMode || window.motionMode;
            window.orbitSpeed = state.orbitSpeed || window.orbitSpeed;
            window.orbitRadius = state.orbitRadius || window.orbitRadius;
            window.audioReactivityStrength = state.audioReactivityStrength || window.audioReactivityStrength;
            window.particlesPerCluster = state.particlesPerCluster || window.particlesPerCluster;
            window.particleSize = state.particleSize || window.particleSize;
            window.clusterRadius = state.clusterRadius || window.clusterRadius;
            window.particleBrightness = state.particleBrightness || window.particleBrightness;
            recreateParticles();
            console.log(`📂 Loaded preset: ${name}`);
        } else {
            console.log(`❌ Preset not found: ${name}`);
        }
    };

    // Helper function to update the preset dropdown list
    function updatePresetList() {
        const select = document.getElementById('presetSelect');
        if (!select) return;

        // Get all preset names from localStorage
        const presets = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('galaxyPreset_')) {
                const name = key.replace('galaxyPreset_', '');
                presets.push(name);
            }
        }

        // Clear and rebuild the select options
        select.innerHTML = '<option value="">-- Select Preset --</option>';
        presets.sort().forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
    }

    // Initialize preset list on load
    setTimeout(() => updatePresetList(), 300);

    // ========================================================================
    // ADVANCED PRESET MANAGEMENT (V37)
    // ========================================================================

    window.deletePreset = function() {
        const select = document.getElementById('presetSelect');
        const name = select ? select.value : '';

        if (!name) {
            console.warn('⚠️ No preset selected');
            return;
        }

        localStorage.removeItem(`galaxyPreset_${name}`);
        console.log(`🗑️ Deleted preset: ${name}`);
        updatePresetList();
    };

    window.setDefaultPreset = function() {
        const select = document.getElementById('presetSelect');
        const name = select ? select.value : '';

        if (!name) {
            console.warn('⚠️ No preset selected');
            return;
        }

        localStorage.setItem('galaxyDefaultPreset', name);
        console.log(`⭐ Set default preset: ${name}`);
    };

    window.exportPresetsAsJSON = function() {
        const presets = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('galaxyPreset_')) {
                const name = key.replace('galaxyPreset_', '');
                presets[name] = JSON.parse(localStorage.getItem(key));
            }
        }

        const json = JSON.stringify(presets, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `galaxy-presets-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log('📥 Exported', Object.keys(presets).length, 'presets');
    };

    window.importPresetsFromJSON = function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const presets = JSON.parse(e.target.result);
                let count = 0;

                for (const [name, state] of Object.entries(presets)) {
                    localStorage.setItem(`galaxyPreset_${name}`, JSON.stringify(state));
                    count++;
                }

                updatePresetList();
                console.log(`📤 Imported ${count} presets`);
            } catch (error) {
                console.error('❌ Failed to import presets:', error);
            }
        };
        reader.readAsText(file);
    };

    window.syncPresetsToCloud = function() {
        console.log('☁️ Cloud sync not yet implemented (requires Supabase setup)');
        const status = document.getElementById('cloudSyncStatus');
        if (status) status.textContent = 'Cloud sync requires Supabase configuration';
    };

    window.loadPresetsFromCloud = function() {
        console.log('⬇️ Cloud sync not yet implemented (requires Supabase setup)');
        const status = document.getElementById('cloudSyncStatus');
        if (status) status.textContent = 'Cloud sync requires Supabase configuration';
    };

    console.log('✅ Galaxy View controls wired up for options menu');
}

/**
 * Wires up additional controls that need special initialization
 * Sets initial dropdown values after menu is loaded
 */
export function wireUpAdditionalControls() {
    console.log('🔧 Wiring up additional menu controls...');

    const colorModeSelect = document.getElementById('galaxyColorMode');
    const xModeSelect = document.getElementById('galaxyXAxisMode');
    const yModeSelect = document.getElementById('galaxyYAxisMode');
    const zModeSelect = document.getElementById('galaxyZAxisMode');

    if (colorModeSelect) {
        colorModeSelect.value = window.currentColorMode;
        console.log('  Color mode dropdown found, set to:', window.currentColorMode);
    }

    if (xModeSelect) {
        xModeSelect.value = window.currentXMode;
        console.log('  X axis dropdown found, set to:', window.currentXMode);
    }

    if (yModeSelect) {
        yModeSelect.value = window.currentYMode;
        console.log('  Y axis dropdown found, set to:', window.currentYMode);
    }

    if (zModeSelect) {
        zModeSelect.value = window.currentZMode;
        console.log('  Z axis dropdown found, set to:', window.currentZMode);
    }

    console.log('✅ Additional controls wired up');
}
