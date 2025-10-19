/**
 * Galaxy View Initializer
 * This module ensures ALL functions needed by the reference options menu are properly exposed
 * This allows us to drop in the EXACT HTML from the reference file without modification
 */

import { initializeControls } from '../controls/galaxyControls.js';
import GalaxyParticleSystem from '../components/galaxyParticleSystem.js';

export class GalaxyInitializer {
    constructor() {
        this.particleSystem = null;
        this.isInitialized = false;
    }

    /**
     * Initialize all Galaxy View components and expose everything to window
     * This ensures the reference menu HTML will "just work"
     */
    initialize(scene) {
        if (this.isInitialized) return;

        console.log('🌌 Initializing Galaxy View with full compatibility...');

        // Initialize particle system
        this.particleSystem = new GalaxyParticleSystem(scene);

        // Initialize all control functions
        initializeControls();

        // Expose all state variables to window (needed by reference menu)
        this.exposeStateVariables();

        // Expose all functions that the reference menu expects
        this.exposeFunctions();

        // Expose component instances
        window.galaxyParticleSystem = this.particleSystem;

        this.isInitialized = true;
        console.log('✅ Galaxy View initialized - all controls ready');
    }

    /**
     * Expose all state variables that the reference menu expects
     */
    exposeStateVariables() {
        // Toggle states
        window.crosshairEnabled = window.crosshairEnabled ?? true;
        window.tooltipsEnabled = window.tooltipsEnabled ?? true;
        window.infoWindowEnabled = window.infoWindowEnabled ?? false;
        window.moveJoystickEnabled = window.moveJoystickEnabled ?? true;
        window.lookJoystickEnabled = window.lookJoystickEnabled ?? true;
        window.playButtonEnabled = window.playButtonEnabled ?? true;

        // Movement & Camera
        window.moveSpeed = window.moveSpeed ?? 10;
        window.lookSensitivity = window.lookSensitivity ?? 0.5;
        window.isPointerLocked = false;
        window.isShiftPressed = false;
        window.keys = {};
        window.yaw = 0;
        window.pitch = 0;

        // Visualization modes
        window.currentColorMode = window.currentColorMode ?? 'tags';
        window.currentXMode = window.currentXMode ?? 'bpm';
        window.currentYMode = window.currentYMode ?? 'key';
        window.currentZMode = window.currentZMode ?? 'tags';

        // Galaxy dynamics
        window.motionEnabled = window.motionEnabled ?? true;
        window.rotationMode = window.rotationMode ?? 'collective';
        window.rotationAxis = window.rotationAxis ?? 'y';
        window.orbitSpeed = window.orbitSpeed ?? 0.0015;
        window.orbitRadius = window.orbitRadius ?? 80;
        window.particleSize = window.particleSize ?? 17.5;
        window.particleShape = window.particleShape ?? 'circle';
        window.particleBrightness = window.particleBrightness ?? 0.8;
        window.visibilityDistance = window.visibilityDistance ?? 900;

        // Axis scales
        window.xAxisScale = window.xAxisScale ?? 1.0;
        window.yAxisScale = window.yAxisScale ?? 1.0;
        window.zAxisScale = window.zAxisScale ?? 1.0;

        // Sub-particle dynamics
        window.clusterRadius = window.clusterRadius ?? 10;
        window.subParticleScale = window.subParticleScale ?? 0.3;
        window.mainToSubSizeRatio = window.mainToSubSizeRatio ?? 2.0;
        window.particlesPerCluster = window.particlesPerCluster ?? 48;
        window.subParticleMotionSpeed = window.subParticleMotionSpeed ?? 3.6;
        window.subParticleAnimationSpeed = window.subParticleAnimationSpeed ?? 0.5;
        window.subParticleMotionPath = window.subParticleMotionPath ?? 'natural';
        window.subParticleShape = window.subParticleShape ?? 'default';

        // Visual gradients
        window.sizeGradient = window.sizeGradient ?? 0.0;
        window.densityGradient = window.densityGradient ?? 0.0;
        window.bloomStrength = window.bloomStrength ?? 0.0;

        // Audio reactivity
        window.audioReactivityEnabled = window.audioReactivityEnabled ?? false;
        window.audioReactivityStrength = window.audioReactivityStrength ?? 1.0;
        window.globalAudioReactivity = window.globalAudioReactivity ?? 0.5;
        window.audioFrequencyMode = window.audioFrequencyMode ?? 'bass';
        window.stemGalaxyOffset = window.stemGalaxyOffset ?? 100;

        // Crosshair hover effects
        window.mouseInteractionEnabled = window.mouseInteractionEnabled ?? true;
        window.hoverSlowdown = window.hoverSlowdown ?? 1.0;
        window.hoverScale = window.hoverScale ?? 2.0;

        // Database & search
        window.currentDatabase = window.currentDatabase ?? 'audioFiles';
        window.searchTerm = window.searchTerm ?? '';
        window.searchFilteredFileIds = window.searchFilteredFileIds ?? new Set();
        window.hiddenCategories = window.hiddenCategories ?? new Set();

        // Tag filters
        window.tagFilters = window.tagFilters ?? {
            canHave: new Set(),
            mustHave: new Set(),
            exclude: new Set()
        };
        window.currentFilterMode = null;
        window.tagFilterSearchTerm = '';

        // UI state
        window.allUIHidden = false;
    }

    /**
     * Expose all functions that the reference menu needs
     * These are the functions called by onclick handlers in the menu HTML
     */
    exposeFunctions() {
        // Functions that might not exist yet but are needed by the menu

        // Fullscreen toggle
        window.toggleFullscreen = window.toggleFullscreen || function() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        };

        // Options menu 2 toggle
        window.toggleOptionsMenu2 = window.toggleOptionsMenu2 || function() {
            const menu = document.getElementById('optionsMenu2');
            if (!menu) return;

            const collapseIcon = document.getElementById('optionsCollapseIcon2');
            const isCollapsed = menu.classList.contains('options-collapsed');

            if (isCollapsed) {
                menu.classList.remove('options-collapsed');
                if (collapseIcon) collapseIcon.textContent = '−';
            } else {
                menu.classList.add('options-collapsed');
                if (collapseIcon) collapseIcon.textContent = '+';
            }
        };

        // Section toggle for collapsible content
        window.toggleSection = window.toggleSection || function(header) {
            header.classList.toggle('collapsed');
            const content = header.nextElementSibling;
            if (content && content.classList.contains('collapsible-content')) {
                content.classList.toggle('collapsed');
            }
        };

        // Search keyboard handler
        window.handleSearchKeyboard = window.handleSearchKeyboard || function(event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.target.blur();
                if (event.target.value) {
                    event.target.value = '';
                    if (window.handleGalaxySearch) {
                        window.handleGalaxySearch('');
                    }
                }
            }
        };

        // Database source toggle
        window.toggleGalaxyDbSource = window.toggleGalaxyDbSource || function(source, event) {
            event.stopPropagation();
            console.log('Toggle data source:', source);
            // Implementation will be added when integrating with data loading
        };

        // Preset functions
        window.savePreset = window.savePreset || function() {
            const presetName = document.getElementById('presetNameInput')?.value?.trim();
            if (!presetName) {
                alert('Please enter a preset name');
                return;
            }

            const settings = window.getCurrentSettings ? window.getCurrentSettings() : {};
            const presets = JSON.parse(localStorage.getItem('visualizerPresets') || '{}');
            presets[presetName] = settings;
            localStorage.setItem('visualizerPresets', JSON.stringify(presets));

            if (window.updatePresetList) window.updatePresetList();
            document.getElementById('presetNameInput').value = '';
            alert(`Preset "${presetName}" saved!`);
        };

        window.loadPreset = window.loadPreset || function(presetName) {
            if (!presetName) return;

            const presets = JSON.parse(localStorage.getItem('visualizerPresets') || '{}');
            const settings = presets[presetName];

            if (settings && window.applySettings) {
                window.applySettings(settings);
            }
        };

        window.deletePreset = window.deletePreset || function() {
            const presetName = document.getElementById('presetSelect')?.value;
            if (!presetName) {
                alert('Please select a preset to delete');
                return;
            }

            if (confirm(`Delete preset "${presetName}"?`)) {
                const presets = JSON.parse(localStorage.getItem('visualizerPresets') || '{}');
                delete presets[presetName];
                localStorage.setItem('visualizerPresets', JSON.stringify(presets));
                if (window.updatePresetList) window.updatePresetList();
            }
        };

        window.updatePresetList = window.updatePresetList || function() {
            const presets = JSON.parse(localStorage.getItem('visualizerPresets') || '{}');
            const select = document.getElementById('presetSelect');
            if (!select) return;

            select.innerHTML = '<option value="">-- Select Preset --</option>';
            Object.keys(presets).sort().forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                select.appendChild(option);
            });
        };

        window.getCurrentSettings = window.getCurrentSettings || function() {
            return {
                // All current state variables
                crosshairEnabled: window.crosshairEnabled,
                tooltipsEnabled: window.tooltipsEnabled,
                infoWindowEnabled: window.infoWindowEnabled,
                moveJoystickEnabled: window.moveJoystickEnabled,
                lookJoystickEnabled: window.lookJoystickEnabled,
                playButtonEnabled: window.playButtonEnabled,
                moveSpeed: window.moveSpeed,
                lookSensitivity: window.lookSensitivity,
                currentColorMode: window.currentColorMode,
                currentXMode: window.currentXMode,
                currentYMode: window.currentYMode,
                currentZMode: window.currentZMode,
                motionEnabled: window.motionEnabled,
                rotationMode: window.rotationMode,
                rotationAxis: window.rotationAxis,
                orbitSpeed: window.orbitSpeed,
                orbitRadius: window.orbitRadius,
                particleSize: window.particleSize,
                particleShape: window.particleShape,
                particleBrightness: window.particleBrightness,
                visibilityDistance: window.visibilityDistance,
                xAxisScale: window.xAxisScale,
                yAxisScale: window.yAxisScale,
                zAxisScale: window.zAxisScale,
                clusterRadius: window.clusterRadius,
                subParticleScale: window.subParticleScale,
                mainToSubSizeRatio: window.mainToSubSizeRatio,
                particlesPerCluster: window.particlesPerCluster,
                subParticleMotionSpeed: window.subParticleMotionSpeed,
                subParticleAnimationSpeed: window.subParticleAnimationSpeed,
                subParticleMotionPath: window.subParticleMotionPath,
                subParticleShape: window.subParticleShape,
                sizeGradient: window.sizeGradient,
                densityGradient: window.densityGradient,
                bloomStrength: window.bloomStrength,
                audioReactivityEnabled: window.audioReactivityEnabled,
                audioReactivityStrength: window.audioReactivityStrength,
                globalAudioReactivity: window.globalAudioReactivity,
                audioFrequencyMode: window.audioFrequencyMode,
                stemGalaxyOffset: window.stemGalaxyOffset,
                mouseInteractionEnabled: window.mouseInteractionEnabled,
                hoverSlowdown: window.hoverSlowdown,
                hoverScale: window.hoverScale
            };
        };

        window.applySettings = window.applySettings || function(settings) {
            // Apply all settings
            Object.keys(settings).forEach(key => {
                if (window.hasOwnProperty(key)) {
                    window[key] = settings[key];
                }
            });

            // Update UI elements if they exist
            const updateUI = (id, value) => {
                const el = document.getElementById(id);
                if (el) {
                    if (el.type === 'range' || el.type === 'select-one') {
                        el.value = value;
                    } else if (el.type === 'checkbox') {
                        el.checked = value;
                    } else {
                        el.textContent = value;
                    }
                }
            };

            // Update all UI elements based on settings
            if (settings.currentColorMode) updateUI('galaxyColorMode', settings.currentColorMode);
            if (settings.currentXMode) updateUI('galaxyXAxisMode', settings.currentXMode);
            if (settings.currentYMode) updateUI('galaxyYAxisMode', settings.currentYMode);
            if (settings.currentZMode) updateUI('galaxyZAxisMode', settings.currentZMode);
            // ... etc for all settings
        };

        // Update info window function
        window.updateInfoWindow = window.updateInfoWindow || function() {
            if (!window.infoWindowEnabled) return;

            // Update file count
            const fileCountEl = document.getElementById('infoFileCount');
            if (fileCountEl && window.particles) {
                fileCountEl.textContent = window.particles.length;
            }

            // Update camera position
            if (window.camera) {
                const x = window.camera.position.x.toFixed(0);
                const y = window.camera.position.y.toFixed(0);
                const z = window.camera.position.z.toFixed(0);
                const posEl = document.getElementById('infoCameraPos');
                if (posEl) posEl.textContent = `${x}, ${y}, ${z}`;
            }
        };

        // Apply visualization modes
        window.applyVisualizationModes = window.applyVisualizationModes || function() {
            if (window.galaxyParticleSystem && window.audioFiles) {
                // Update particle system settings
                window.galaxyParticleSystem.currentColorMode = window.currentColorMode;
                window.galaxyParticleSystem.currentXMode = window.currentXMode;
                window.galaxyParticleSystem.currentYMode = window.currentYMode;
                window.galaxyParticleSystem.currentZMode = window.currentZMode;

                // Recreate particles with new modes
                window.galaxyParticleSystem.createParticles(window.audioFiles);
            }
        };

        // Update cluster positions
        window.updateClusterPositions = window.updateClusterPositions || function() {
            if (window.galaxyParticleSystem) {
                window.galaxyParticleSystem.xAxisScale = window.xAxisScale;
                window.galaxyParticleSystem.yAxisScale = window.yAxisScale;
                window.galaxyParticleSystem.zAxisScale = window.zAxisScale;
                window.galaxyParticleSystem.updateClusterPositions();
            }
        };

        // Update particle system settings when controls change
        window.updateParticleSettings = window.updateParticleSettings || function(settings) {
            if (window.galaxyParticleSystem) {
                window.galaxyParticleSystem.updateSettings(settings);
            }

            // Handle bloom strength updates
            if (settings.bloomStrength !== undefined && window.bloomPass) {
                window.bloomPass.strength = settings.bloomStrength;
            }

            // Handle visibility/fog distance updates
            if (settings.visibilityDistance !== undefined) {
                if (window.scene && window.scene.fog) {
                    window.scene.fog.far = settings.visibilityDistance;
                }
                if (window.camera) {
                    window.camera.far = settings.visibilityDistance * 2;
                    window.camera.updateProjectionMatrix();
                }
            }
        };

        // Create particles wrapper
        window.createParticles = window.createParticles || function() {
            if (window.galaxyParticleSystem && window.audioFiles) {
                window.galaxyParticleSystem.particlesPerCluster = window.particlesPerCluster;
                window.galaxyParticleSystem.createParticles(window.audioFiles);
            }
        };

        // Particle texture creation
        window.createParticleTexture = window.createParticleTexture || function(shape) {
            if (window.galaxyParticleSystem) {
                return window.galaxyParticleSystem.createParticleTexture(shape);
            }
        };

        console.log('✅ All functions exposed for reference menu compatibility');
    }
}

// Export for use
export default GalaxyInitializer;