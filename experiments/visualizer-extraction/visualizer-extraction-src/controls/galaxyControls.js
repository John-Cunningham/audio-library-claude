/**
 * Galaxy View Controls Module
 * Centralizes all control update functions for the Galaxy View
 * Extracted from visualizer_V37_for_extraction.html
 */

// Toggle Control Functions
export function toggleCrosshair() {
    window.crosshairEnabled = !window.crosshairEnabled;
    const crosshair = document.querySelector('.crosshair');
    const btn = document.getElementById('crosshairToggleBtn');
    const galaxyBtn = document.getElementById('galaxyCrosshairToggle');

    crosshair.style.display = window.crosshairEnabled ? 'block' : 'none';
    if (btn) btn.textContent = `Crosshair: ${window.crosshairEnabled ? 'ON' : 'OFF'}`;
    if (galaxyBtn) galaxyBtn.textContent = `Crosshair: ${window.crosshairEnabled ? 'ON' : 'OFF'}`;
}

export function toggleInfoWindow() {
    window.infoWindowEnabled = !window.infoWindowEnabled;
    const infoWindow = document.getElementById('infoWindow');
    const galaxyBtn = document.getElementById('galaxyInfoToggle');

    if (window.infoWindowEnabled) {
        infoWindow.classList.add('visible');
        if (window.updateInfoWindow) window.updateInfoWindow();
    } else {
        infoWindow.classList.remove('visible');
    }

    if (galaxyBtn) galaxyBtn.textContent = `Info Window: ${window.infoWindowEnabled ? 'ON' : 'OFF'}`;
}

export function toggleMoveJoystick() {
    window.moveJoystickEnabled = !window.moveJoystickEnabled;
    const moveJoystick = document.getElementById('joystickZone');
    const galaxyBtn = document.getElementById('galaxyMoveJoystickToggle');

    if (moveJoystick) {
        moveJoystick.style.display = window.moveJoystickEnabled ? 'block' : 'none';
    }
    if (galaxyBtn) galaxyBtn.textContent = `Move Joystick: ${window.moveJoystickEnabled ? 'ON' : 'OFF'}`;
}

export function toggleLookJoystick() {
    window.lookJoystickEnabled = !window.lookJoystickEnabled;
    const lookJoystick = document.getElementById('lookJoystickZone');
    const galaxyBtn = document.getElementById('galaxyLookJoystickToggle');

    if (lookJoystick) {
        lookJoystick.style.display = window.lookJoystickEnabled ? 'flex' : 'none';
    }
    if (galaxyBtn) galaxyBtn.textContent = `Look Joystick: ${window.lookJoystickEnabled ? 'ON' : 'OFF'}`;
}

export function togglePlayButton() {
    window.playButtonEnabled = !window.playButtonEnabled;
    const playBtn = document.getElementById('playBtn');
    const galaxyBtn = document.getElementById('galaxyPlayButtonToggle');

    if (playBtn) {
        playBtn.style.display = window.playButtonEnabled ? 'flex' : 'none';
    }
    if (galaxyBtn) galaxyBtn.textContent = `Play Button: ${window.playButtonEnabled ? 'ON' : 'OFF'}`;
}

export function toggleTooltips() {
    window.tooltipsEnabled = !window.tooltipsEnabled;
    const btn = document.getElementById('galaxyTooltipsToggle');
    if (btn) btn.textContent = `Tooltips: ${window.tooltipsEnabled ? 'ON' : 'OFF'}`;
}

// Database Selection
export function handleDatabaseChange(value) {
    if (!value) return;

    window.currentDatabase = value;
    console.log('Database changed to:', value);

    // Trigger data reload
    if (window.updateDataSources) {
        window.updateDataSources();
    }
}

// Search Functions
export function handleGalaxySearch(value) {
    if (window.handleSearch) {
        window.handleSearch(value);
    }
}

// Movement & Camera Controls
export function updateMovementSpeed(value) {
    window.moveSpeed = parseFloat(value);
    document.getElementById('movementSpeedValue').textContent = value;
}

export function updateLookSensitivity(value) {
    window.lookSensitivity = parseFloat(value) / 100;
    document.getElementById('lookSensitivityValue').textContent = value;
}

export function resetCamera() {
    if (window.camera) {
        window.camera.position.set(0, 10, 30);
        window.yaw = 0;
        window.pitch = 0;
        window.camera.rotation.set(0, 0, 0);
    }
}

// Visualization Mode Controls
export function updateColorMode(value) {
    window.currentColorMode = value;
    if (window.applyVisualizationModes) {
        window.applyVisualizationModes();
    }
    // Update particle system to recalculate colors
    if (window.galaxyParticleSystem) {
        window.galaxyParticleSystem.currentColorMode = value;
        if (window.audioFiles && window.audioFiles.length > 0) {
            window.galaxyParticleSystem.createParticles(window.audioFiles);
        }
    }
}

export function updateXAxisMode(value) {
    window.currentXMode = value;
    if (window.applyVisualizationModes) {
        window.applyVisualizationModes();
    }
    // Update particle system positions
    if (window.galaxyParticleSystem) {
        window.galaxyParticleSystem.currentXMode = value;
        if (window.audioFiles && window.audioFiles.length > 0) {
            window.galaxyParticleSystem.createParticles(window.audioFiles);
        }
    }
}

export function updateYAxisMode(value) {
    window.currentYMode = value;
    if (window.applyVisualizationModes) {
        window.applyVisualizationModes();
    }
    // Update particle system positions
    if (window.galaxyParticleSystem) {
        window.galaxyParticleSystem.currentYMode = value;
        if (window.audioFiles && window.audioFiles.length > 0) {
            window.galaxyParticleSystem.createParticles(window.audioFiles);
        }
    }
}

export function updateZAxisMode(value) {
    window.currentZMode = value;
    if (window.applyVisualizationModes) {
        window.applyVisualizationModes();
    }
    // Update particle system positions
    if (window.galaxyParticleSystem) {
        window.galaxyParticleSystem.currentZMode = value;
        if (window.audioFiles && window.audioFiles.length > 0) {
            window.galaxyParticleSystem.createParticles(window.audioFiles);
        }
    }
}

// Galaxy Dynamics Controls
export function updateRotationMode(value) {
    window.rotationMode = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ rotationMode: value });
    }
}

export function updateRotationAxis(value) {
    window.rotationAxis = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ rotationAxis: value });
    }
}

export function updateMotionSpeed(value) {
    window.orbitSpeed = parseFloat(value);
    document.getElementById('speedValue').textContent = (value * 100).toFixed(1);
    document.getElementById('speedInput').value = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ orbitSpeed: window.orbitSpeed });
    }
}

export function updateMotionSpeedDirect(value) {
    const numValue = parseFloat(value);
    window.orbitSpeed = numValue;
    document.getElementById('speedValue').textContent = (numValue * 100).toFixed(1);
    document.getElementById('speedSlider').value = numValue;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ orbitSpeed: numValue });
    }
}

export function updateMotionRadius(value) {
    window.orbitRadius = parseFloat(value);
    document.getElementById('radiusValue').textContent = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ orbitRadius: window.orbitRadius });
    }
}

export function updateParticleSize(value) {
    window.particleSize = parseFloat(value);
    document.getElementById('sizeValue').textContent = value;
    // Update particle system
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ particleSize: window.particleSize });
    }
}

export function updateParticleShape(value) {
    window.particleShape = value;
    // Update particle system with new shape
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ particleShape: value });
    }
}

export function updateParticleBrightness(value) {
    console.log('[galaxyControls] ========== updateParticleBrightness ==========');
    console.log('[galaxyControls] Raw value received:', value);
    console.log('[galaxyControls] Value type:', typeof value);
    console.log('[galaxyControls] Value is undefined:', value === undefined);
    console.log('[galaxyControls] Value is null:', value === null);

    // Handle undefined/null values by using current value or default
    if (value === undefined || value === null || value === '') {
        console.warn('[galaxyControls] ⚠️ Invalid value received, using current or default');
        value = window.particleBrightness || 0.8;
        console.log('[galaxyControls] Using fallback value:', value);
    }

    const parsedValue = parseFloat(value);
    console.log('[galaxyControls] Parsed value:', parsedValue);
    console.log('[galaxyControls] Is valid number:', !isNaN(parsedValue));

    // Validate the parsed value
    if (isNaN(parsedValue)) {
        console.error('[galaxyControls] ❌ Failed to parse brightness value!');
        return; // Don't update if invalid
    }

    // Clamp to valid range (0.1 to 10.0 based on slider min/max)
    const clampedValue = Math.max(0.1, Math.min(10.0, parsedValue));
    window.particleBrightness = clampedValue;
    console.log('[galaxyControls] Final brightness value:', window.particleBrightness);

    // Update UI
    const brightnessEl = document.getElementById('brightnessValue');
    if (brightnessEl) {
        brightnessEl.textContent = clampedValue.toFixed(1);
        console.log('[galaxyControls] ✅ Updated UI element');
    } else {
        console.warn('[galaxyControls] brightnessValue element not found');
    }

    // Update particle system brightness
    if (window.updateParticleSettings) {
        console.log('[galaxyControls] Calling window.updateParticleSettings with:', window.particleBrightness);
        window.updateParticleSettings({ particleBrightness: window.particleBrightness });
        console.log('[galaxyControls] ✅ Brightness update complete');
    } else {
        console.warn('[galaxyControls] window.updateParticleSettings not found!');
    }
    console.log('[galaxyControls] ==========================================');
}

export function updateVisibility(value) {
    window.visibilityDistance = parseFloat(value);
    document.getElementById('visibilityValue').textContent = value;

    if (window.scene && window.scene.fog) {
        window.scene.fog.far = window.visibilityDistance;
    }
    if (window.camera) {
        window.camera.far = window.visibilityDistance * 2;
        window.camera.updateProjectionMatrix();
    }
}

export function toggleMotion() {
    window.motionEnabled = !window.motionEnabled;
    const btn = document.getElementById('motionToggle');
    const galaxyBtn = document.getElementById('galaxyMotionToggle');

    if (btn) {
        btn.textContent = `Motion: ${window.motionEnabled ? 'ON' : 'OFF'}`;
        btn.style.background = window.motionEnabled ? 'rgba(102,126,234,0.3)' : 'rgba(255,255,255,0.1)';
    }
    if (galaxyBtn) galaxyBtn.textContent = `Motion: ${window.motionEnabled ? 'ON' : 'OFF'}`;
}

// Axis Scale Controls
export function updateXAxisScale(value) {
    window.xAxisScale = parseFloat(value);
    document.getElementById('xAxisScaleValue').textContent = value;
    if (window.updateClusterPositions) window.updateClusterPositions();
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ xAxisScale: window.xAxisScale });
    }
}

export function updateYAxisScale(value) {
    window.yAxisScale = parseFloat(value);
    document.getElementById('yAxisScaleValue').textContent = value;
    if (window.updateClusterPositions) window.updateClusterPositions();
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ yAxisScale: window.yAxisScale });
    }
}

export function updateZAxisScale(value) {
    window.zAxisScale = parseFloat(value);
    document.getElementById('zAxisScaleValue').textContent = value;
    if (window.updateClusterPositions) window.updateClusterPositions();
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ zAxisScale: window.zAxisScale });
    }
}

// Sub-Particle Dynamics Controls
export function updateClusterSpread(value) {
    window.clusterRadius = parseFloat(value);
    document.getElementById('clusterSpreadValue').textContent = value;

    // Update existing cluster sub-particle offsets
    if (window.particles && window.particles.length > 0 && window.particleSystem) {
        window.particles.forEach(cluster => {
            cluster.subParticles.forEach(subParticle => {
                if (subParticle.isCenterParticle) return;

                const normalized = subParticle.offset.clone().normalize();
                subParticle.offset.copy(normalized.multiplyScalar(window.clusterRadius * subParticle.baseRadius));
            });
        });
    }

    if (window.updateParticleSettings) {
        window.updateParticleSettings({ clusterRadius: window.clusterRadius });
    }
}

export function updateSubParticleSize(value) {
    window.subParticleScale = parseFloat(value);
    document.getElementById('subParticleSizeValue').textContent = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ subParticleScale: window.subParticleScale });
    }
}

export function updateMainToSubRatio(value) {
    window.mainToSubSizeRatio = parseFloat(value);
    document.getElementById('mainToSubRatioValue').textContent = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ mainToSubSizeRatio: window.mainToSubSizeRatio });
    }
}

export function updateSubParticleCount(value) {
    const newCount = parseInt(value);
    const oldCount = window.particlesPerCluster;
    console.log(`Updating sub-particle count from ${oldCount} to ${newCount}`);
    window.particlesPerCluster = newCount;
    document.getElementById('subParticleCountValue').textContent = value;

    // Recreate particles when count changes
    if (window.audioFiles && window.audioFiles.length > 0) {
        console.log(`Recreating ${window.audioFiles.length} clusters with ${window.particlesPerCluster} particles each`);
        if (window.createParticles) window.createParticles();
    }
}

export function updateSubParticleMotion(value) {
    window.subParticleMotionSpeed = parseFloat(value);
    document.getElementById('subParticleMotionValue').textContent = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ subParticleMotionSpeed: window.subParticleMotionSpeed });
    }
}

export function updateSubParticleSpeed(value) {
    window.subParticleAnimationSpeed = parseFloat(value);
    document.getElementById('subParticleSpeedValue').textContent = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ subParticleAnimationSpeed: window.subParticleAnimationSpeed });
    }
}

export function updateMotionPath(value) {
    window.subParticleMotionPath = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ subParticleMotionPath: value });
    }
}

export function updateSubParticleShape(value) {
    window.subParticleShape = value;
    // Recreate particles with new shape
    if (window.createParticles) window.createParticles();
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ subParticleShape: value });
    }
}

// Visual Gradients Controls
export function updateSizeGradient(value) {
    window.sizeGradient = parseFloat(value);
    document.getElementById('sizeGradientValue').textContent = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ sizeGradient: window.sizeGradient });
    }
}

export function updateDensityGradient(value) {
    window.densityGradient = parseFloat(value);
    document.getElementById('densityGradientValue').textContent = value;
    if (window.createParticles) window.createParticles();
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ densityGradient: window.densityGradient });
    }
}

export function updateBloomStrength(value) {
    window.bloomStrength = parseFloat(value);
    document.getElementById('bloomStrengthValue').textContent = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ bloomStrength: window.bloomStrength });
    }
}

// Audio Reactivity Controls
export function toggleAudioReactivity() {
    window.audioReactivityEnabled = !window.audioReactivityEnabled;
    const btn = document.getElementById('audioReactivityToggle');
    btn.textContent = `Audio Reactivity: ${window.audioReactivityEnabled ? 'ON' : 'OFF'}`;
    btn.style.background = window.audioReactivityEnabled ? 'rgba(102,126,234,0.3)' : 'rgba(255,255,255,0.1)';

    console.log('');
    console.log('🎵 ========================================');
    console.log('🎵 AUDIO REACTIVITY TOGGLE');
    console.log('🎵 ========================================');
    console.log('🎵 New state:', window.audioReactivityEnabled ? 'ON ✅' : 'OFF ❌');
    console.log('🎵 WaveSurfer exists:', !!window.wavesurfer);
    console.log('🎵 WaveSurfer playing:', window.wavesurfer?.isPlaying());

    // If turning ON, try to connect audio analyzer immediately
    if (window.audioReactivityEnabled) {
        console.log('🎵 User enabled - triggering immediate connection attempt');
        if (window.reconnectGalaxyAudio) {
            window.reconnectGalaxyAudio();
            console.log('🎵 Reconnect function called');
        } else {
            console.warn('🎵 ⚠️ reconnectGalaxyAudio function not found!');
            console.warn('🎵 ⚠️ Galaxy View may not be initialized yet');
        }
    } else {
        console.log('🎵 User disabled - audio analyzer will disconnect');
    }

    console.log('🎵 ========================================');
    console.log('');

    if (window.updateParticleSettings) {
        window.updateParticleSettings({ audioReactivityEnabled: window.audioReactivityEnabled });
    }
}

export function updateAudioStrength(value) {
    window.audioReactivityStrength = parseFloat(value);
    document.getElementById('audioStrengthValue').textContent = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ audioReactivityStrength: window.audioReactivityStrength });
    }
}

export function updateGlobalReactivity(value) {
    window.globalAudioReactivity = parseFloat(value);
    document.getElementById('globalReactivityValue').textContent = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ globalAudioReactivity: window.globalAudioReactivity });
    }
}

export function updateFrequencyMode(value) {
    window.audioFrequencyMode = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ audioFrequencyMode: value });
    }
}

// Crosshair Hover Effects Controls
export function toggleMouseInteraction() {
    window.mouseInteractionEnabled = !window.mouseInteractionEnabled;
    const btn = document.getElementById('mouseInteractionToggle');
    btn.textContent = `Crosshair Hover: ${window.mouseInteractionEnabled ? 'ON' : 'OFF'}`;
    btn.style.background = window.mouseInteractionEnabled ? 'rgba(102,126,234,0.3)' : 'rgba(255,255,255,0.1)';
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ mouseInteractionEnabled: window.mouseInteractionEnabled });
    }
}

export function updateHoverSpeed(value) {
    window.hoverSlowdown = parseFloat(value) / 100;
    document.getElementById('hoverSpeedValue').textContent = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ hoverSlowdown: window.hoverSlowdown });
    }
}

export function updateHoverScale(value) {
    window.hoverScale = parseFloat(value);
    document.getElementById('hoverScaleValue').textContent = value;
    if (window.updateParticleSettings) {
        window.updateParticleSettings({ hoverScale: window.hoverScale });
    }
}

// Stem Galaxy Controls
export function updateStemOffset(value) {
    window.stemGalaxyOffset = parseFloat(value);
    document.getElementById('stemOffsetValue').textContent = value;

    // Reload data to apply new offset
    if (window.updateDataSources) window.updateDataSources();
}

// Tag Filter Functions
export function toggleTagFilterPanel() {
    const panel = document.getElementById('tagFilterPanel');
    panel.classList.toggle('hidden');

    if (!panel.classList.contains('hidden')) {
        if (window.renderTagFilterButtons) window.renderTagFilterButtons();
    }

    // Update color legend position
    setTimeout(() => {
        if (window.updateColorLegendPosition) window.updateColorLegendPosition();
    }, 10);
}

export function setFilterMode(mode) {
    // Toggle mode selection
    if (window.currentFilterMode === mode) {
        window.currentFilterMode = null;
    } else {
        window.currentFilterMode = mode;
    }

    // Update button states
    document.getElementById('canHaveBtn').classList.toggle('active', window.currentFilterMode === 'canHave');
    document.getElementById('mustHaveBtn').classList.toggle('active', window.currentFilterMode === 'mustHave');
    document.getElementById('excludeBtn').classList.toggle('active', window.currentFilterMode === 'exclude');
}

export function handleTagFilterSearch(value) {
    window.tagFilterSearchTerm = value.toLowerCase().trim();
    if (window.renderTagFilterButtons) window.renderTagFilterButtons();
}

export function clearAllTagFilters() {
    if (window.tagFilters) {
        window.tagFilters.canHave.clear();
        window.tagFilters.mustHave.clear();
        window.tagFilters.exclude.clear();
    }
    window.currentFilterMode = null;

    // Update button states
    document.getElementById('canHaveBtn').classList.remove('active');
    document.getElementById('mustHaveBtn').classList.remove('active');
    document.getElementById('excludeBtn').classList.remove('active');

    if (window.renderTagFilterButtons) window.renderTagFilterButtons();
    if (window.applyTagFilters) window.applyTagFilters();
}

// Category Controls
export function showAllCategories() {
    if (window.hiddenCategories) {
        window.hiddenCategories.clear();
    }

    // Clear search fields
    const searchInputs = document.querySelectorAll('#fileSearchInput, #galaxySearchInput');
    searchInputs.forEach(input => {
        if (input) input.value = '';
    });

    // Clear search term and filtered file IDs
    window.searchTerm = '';
    if (window.searchFilteredFileIds) {
        window.searchFilteredFileIds = new Set();
    }

    // Recreate particles
    if (window.particleSystem && window.scene) {
        window.scene.remove(window.particleSystem);
        window.particleSystem = null;
    }
    if (window.createParticles) window.createParticles();
    if (window.updateTagLegend) window.updateTagLegend();

    // Update Galaxy Menu
    if (window.populateGalaxyTagsList) window.populateGalaxyTagsList();
    if (window.populateGalaxyFileList) window.populateGalaxyFileList();

    console.log('All categories shown - particles recreated');
}

export function hideAllCategories() {
    // Get all unique categories from current files
    const allCategories = new Set();
    if (window.audioFiles) {
        window.audioFiles.forEach(file => {
            const category = window.getCategoryForFile ? window.getCategoryForFile(file) : '';
            allCategories.add(category);
        });
    }

    // Add all categories to hidden set
    if (window.hiddenCategories) {
        allCategories.forEach(cat => window.hiddenCategories.add(cat));
    }

    // Update legend to show hidden state
    if (window.updateTagLegend) window.updateTagLegend();

    console.log('All categories hidden');
}

// UI Toggle Functions
export function toggleHideAll() {
    window.allUIHidden = !window.allUIHidden;

    const elementsToToggle = [
        '.stats-overlay',
        '.mode-controls',
        '#controlsHint',
        '#multiStemPlayer',
        '.play-btn',
        '#tagLegend',
        '#tagFilterPanel',
        '#infoWindow',
        '#optionsMenu2'
    ];

    elementsToToggle.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = window.allUIHidden ? 'none' : '';
        }
    });
}

// Panel Toggle Functions
export function toggleControlsHint() {
    const hint = document.getElementById('controlsHint');
    const isHidden = hint.style.display === 'none';
    hint.style.display = isHidden ? 'block' : 'none';
}

export function toggleKeyboardCommands() {
    const commands = document.getElementById('keyCommands');
    const isHidden = commands.style.display === 'none';
    commands.style.display = isHidden ? 'block' : 'none';
}

export function toggleModeControls() {
    const modeControls = document.querySelector('.mode-controls');
    const isHidden = modeControls.style.display === 'none';
    modeControls.style.display = isHidden ? 'block' : 'none';
}

export function toggleStatsOverlay() {
    const statsOverlay = document.querySelector('.stats-overlay');
    const isHidden = statsOverlay.style.display === 'none';
    statsOverlay.style.display = isHidden ? 'block' : 'none';
}

export function toggleColorLegend() {
    const legend = document.getElementById('tagLegend');
    const searchInput = document.getElementById('fileSearchInput');

    if (legend.style.display === 'none') {
        legend.style.display = 'flex';
    } else {
        // Clear search when closing
        if (searchInput) {
            searchInput.value = '';
            if (window.handleSearch) window.handleSearch('');
        }
        legend.style.display = 'none';
    }
}

// Export all functions to window for global access
export function initializeControls() {
    // Expose all control functions to window
    window.toggleCrosshair = toggleCrosshair;
    window.toggleInfoWindow = toggleInfoWindow;
    window.toggleMoveJoystick = toggleMoveJoystick;
    window.toggleLookJoystick = toggleLookJoystick;
    window.togglePlayButton = togglePlayButton;
    window.toggleTooltips = toggleTooltips;
    window.handleDatabaseChange = handleDatabaseChange;
    window.handleGalaxySearch = handleGalaxySearch;
    window.updateMovementSpeed = updateMovementSpeed;
    window.updateLookSensitivity = updateLookSensitivity;
    window.resetCamera = resetCamera;
    window.updateColorMode = updateColorMode;
    window.updateXAxisMode = updateXAxisMode;
    window.updateYAxisMode = updateYAxisMode;
    window.updateZAxisMode = updateZAxisMode;
    window.updateRotationMode = updateRotationMode;
    window.updateRotationAxis = updateRotationAxis;
    window.updateMotionSpeed = updateMotionSpeed;
    window.updateMotionSpeedDirect = updateMotionSpeedDirect;
    window.updateMotionRadius = updateMotionRadius;
    window.updateParticleSize = updateParticleSize;
    window.updateParticleShape = updateParticleShape;
    window.updateParticleBrightness = updateParticleBrightness;
    window.updateVisibility = updateVisibility;
    window.toggleMotion = toggleMotion;
    window.updateXAxisScale = updateXAxisScale;
    window.updateYAxisScale = updateYAxisScale;
    window.updateZAxisScale = updateZAxisScale;
    window.updateClusterSpread = updateClusterSpread;
    window.updateSubParticleSize = updateSubParticleSize;
    window.updateMainToSubRatio = updateMainToSubRatio;
    window.updateSubParticleCount = updateSubParticleCount;
    window.updateSubParticleMotion = updateSubParticleMotion;
    window.updateSubParticleSpeed = updateSubParticleSpeed;
    window.updateMotionPath = updateMotionPath;
    window.updateSubParticleShape = updateSubParticleShape;
    window.updateSizeGradient = updateSizeGradient;
    window.updateDensityGradient = updateDensityGradient;
    window.updateBloomStrength = updateBloomStrength;
    window.toggleAudioReactivity = toggleAudioReactivity;
    window.updateAudioStrength = updateAudioStrength;
    window.updateGlobalReactivity = updateGlobalReactivity;
    window.updateFrequencyMode = updateFrequencyMode;
    window.toggleMouseInteraction = toggleMouseInteraction;
    window.updateHoverSpeed = updateHoverSpeed;
    window.updateHoverScale = updateHoverScale;
    window.updateStemOffset = updateStemOffset;
    window.toggleTagFilterPanel = toggleTagFilterPanel;
    window.setFilterMode = setFilterMode;
    window.handleTagFilterSearch = handleTagFilterSearch;
    window.clearAllTagFilters = clearAllTagFilters;
    window.showAllCategories = showAllCategories;
    window.hideAllCategories = hideAllCategories;
    window.toggleHideAll = toggleHideAll;
    window.toggleControlsHint = toggleControlsHint;
    window.toggleKeyboardCommands = toggleKeyboardCommands;
    window.toggleModeControls = toggleModeControls;
    window.toggleStatsOverlay = toggleStatsOverlay;
    window.toggleColorLegend = toggleColorLegend;

    // Aliases for HTML compatibility (some sliders use different names)
    window.updateBrightness = updateParticleBrightness;
    window.recreateParticles = () => {
        if (window.createParticles) {
            window.createParticles();
        }
    };
    window.handleSearch = (value) => {
        window.searchTerm = value;
        if (window.handleGalaxySearch) {
            window.handleGalaxySearch(value);
        }
    };

    console.log('Galaxy Controls initialized - all functions exposed to window');
}

// Initialize on module load
initializeControls();