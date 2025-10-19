/**
 * Galaxy Options Menu Component
 * Generates and manages the complete options menu for Galaxy View
 * Follows modular architecture pattern - keeps HTML generation separate from logic
 */

export class GalaxyOptionsMenu {
    constructor() {
        this.menuId = 'optionsMenu2';
        this.isCollapsed = false;
    }

    /**
     * Generate the complete options menu HTML
     * @returns {string} HTML string for the menu
     */
    generateHTML() {
        return `
            <div class="mode-controls mode-controls-left" id="${this.menuId}">
                ${this.generateTitleBar()}
                ${this.generateToggleControls()}
                ${this.generateFileBrowser()}
                ${this.generateMovementCamera()}
                ${this.generateVisualizationModes()}
                ${this.generateGalaxyDynamics()}
                ${this.generateSubParticleDynamics()}
                ${this.generateVisualGradients()}
                ${this.generateAudioReactivity()}
                ${this.generateCrosshairHoverEffects()}
                ${this.generatePresets()}
                <div class="options-resize-handle" id="optionsResizeHandle">⋮</div>
            </div>
        `;
    }

    generateTitleBar() {
        return `
            <div class="options-title-bar" onclick="toggleOptionsMenu2()">
                <h2>Options</h2>
                <span class="options-collapse-icon" id="optionsCollapseIcon2">−</span>
            </div>
        `;
    }

    generateToggleControls() {
        return `
            <h3 onclick="toggleSection(this)" class="collapsed">Toggle Controls</h3>
            <div class="collapsible-content collapsed">
                <div class="mode-section">
                    <button class="btn" onclick="toggleCrosshair()" style="width: 100%; margin-bottom: 10px;" id="galaxyCrosshairToggle">
                        Crosshair: ON
                    </button>
                </div>
                <div class="mode-section">
                    <button class="btn" onclick="toggleTooltips()" style="width: 100%; margin-bottom: 10px;" id="galaxyTooltipsToggle">
                        Tooltips: ON
                    </button>
                </div>
                <div class="mode-section">
                    <button class="btn" onclick="toggleInfoWindow()" style="width: 100%; margin-bottom: 10px;" id="galaxyInfoToggle">
                        Info Window: OFF
                    </button>
                </div>
                <div class="mode-section">
                    <button class="btn" onclick="toggleFullscreen()" style="width: 100%; margin-bottom: 10px;">
                        Toggle Fullscreen
                    </button>
                </div>
                <div class="mode-section">
                    <button class="btn" onclick="toggleMoveJoystick()" style="width: 100%; margin-bottom: 10px;" id="galaxyMoveJoystickToggle">
                        Move Joystick: ON
                    </button>
                </div>
                <div class="mode-section">
                    <button class="btn" onclick="toggleLookJoystick()" style="width: 100%; margin-bottom: 10px;" id="galaxyLookJoystickToggle">
                        Look Joystick: ON
                    </button>
                </div>
                <div class="mode-section">
                    <button class="btn" onclick="togglePlayButton()" style="width: 100%;" id="galaxyPlayButtonToggle">
                        Play Button: ON
                    </button>
                </div>
            </div>
        `;
    }

    generateFileBrowser() {
        return `
            <h3 onclick="toggleSection(this)" class="collapsed" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">File Browser</h3>
            <div class="collapsible-content collapsed">
                <!-- Search Bar -->
                <div class="search-container">
                    <input type="text"
                           id="galaxySearchInput"
                           class="search-input"
                           placeholder="Search files..."
                           oninput="handleGalaxySearch(this.value)"
                           onkeydown="handleSearchKeyboard(event)">
                    <span class="search-icon">🔍</span>
                </div>

                <!-- Database Selector -->
                <div class="mode-section" style="margin-bottom: 15px;">
                    <label>Data Sources:</label>
                    <div style="margin-top: 8px;">
                        <div style="display: flex; align-items: center; padding: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; margin-bottom: 4px; cursor: pointer;">
                            <input type="checkbox" id="galaxySourceAudioFiles" checked style="margin-right: 8px;">
                            <label style="cursor: pointer; user-select: none;">Audio Files</label>
                        </div>
                        <div style="display: flex; align-items: center; padding: 6px; background: rgba(255,255,255,0.05); border-radius: 4px; cursor: pointer;">
                            <input type="checkbox" id="galaxySourceAudioStems" style="margin-right: 8px;">
                            <label style="cursor: pointer; user-select: none;">Stems</label>
                        </div>
                    </div>
                </div>

                <!-- Category Filter Buttons -->
                <div style="display: flex; gap: 8px; margin-bottom: 15px;">
                    <button onclick="showAllCategories()" style="flex: 1; padding: 8px; background: rgba(102,126,234,0.3); border: 1px solid #667eea; border-radius: 4px; color: #fff; cursor: pointer; font-size: 11px;">Show All</button>
                    <button onclick="hideAllCategories()" style="flex: 1; padding: 8px; background: rgba(234,102,102,0.3); border: 1px solid #ea6767; border-radius: 4px; color: #fff; cursor: pointer; font-size: 11px;">Hide All</button>
                </div>

                <!-- File Count -->
                <div style="color: rgba(255,255,255,0.6); font-size: 11px; margin-bottom: 10px;">
                    <span id="galaxyFileCount">0 files loaded</span>
                </div>

                <!-- Tags List -->
                <h4 style="color: #667eea; font-size: 11px; margin-bottom: 8px;">Tags</h4>
                <div id="galaxyTagsList" style="max-height: 150px; overflow-y: auto; margin-bottom: 15px;"></div>

                <!-- Files List -->
                <h4 style="color: #ea6767; font-size: 11px; margin-bottom: 8px;">Files</h4>
                <div id="galaxyFileList" style="max-height: 200px; overflow-y: auto;"></div>
            </div>
        `;
    }

    generateMovementCamera() {
        return `
            <h3 onclick="toggleSection(this)" class="collapsed">Movement & Camera</h3>
            <div class="collapsible-content collapsed">
                <div class="mode-section">
                    <label>Movement Speed: <span id="movementSpeedValue">10</span></label>
                    <input type="range" min="1" max="50" value="10" onchange="updateMovementSpeed(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Look Sensitivity: <span id="lookSensitivityValue">50</span>%</label>
                    <input type="range" min="10" max="200" value="50" onchange="updateLookSensitivity(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <button onclick="resetCamera()" style="width: 100%; padding: 8px; background: rgba(102,126,234,0.3); border: 1px solid rgba(102,126,234,0.5); color: #fff; border-radius: 4px; cursor: pointer;">
                        Reset Camera
                    </button>
                </div>
            </div>
        `;
    }

    generateVisualizationModes() {
        return `
            <h3 onclick="toggleSection(this)" class="collapsed">Visualization Modes</h3>
            <div class="collapsible-content collapsed">
                <div class="mode-section">
                    <label>Color Mode:</label>
                    <select id="galaxyColorMode" onchange="updateColorMode(this.value)" style="width: 100%; margin-top: 5px;">
                        <option value="tags">By Tags</option>
                        <option value="bpm">By BPM</option>
                        <option value="key">By Key</option>
                        <option value="duration">By Duration</option>
                        <option value="random">Random</option>
                    </select>
                </div>
                <div class="mode-section">
                    <label>X Axis:</label>
                    <select id="galaxyXAxisMode" onchange="updateXAxisMode(this.value)" style="width: 100%; margin-top: 5px;">
                        <option value="bpm">BPM</option>
                        <option value="key">Key</option>
                        <option value="duration">Duration</option>
                        <option value="tags">Tags</option>
                        <option value="random">Random</option>
                    </select>
                </div>
                <div class="mode-section">
                    <label>Y Axis:</label>
                    <select id="galaxyYAxisMode" onchange="updateYAxisMode(this.value)" style="width: 100%; margin-top: 5px;">
                        <option value="key">Key</option>
                        <option value="bpm">BPM</option>
                        <option value="duration">Duration</option>
                        <option value="tags">Tags</option>
                        <option value="random">Random</option>
                    </select>
                </div>
                <div class="mode-section">
                    <label>Z Axis:</label>
                    <select id="galaxyZAxisMode" onchange="updateZAxisMode(this.value)" style="width: 100%; margin-top: 5px;">
                        <option value="tags">Tags</option>
                        <option value="bpm">BPM</option>
                        <option value="key">Key</option>
                        <option value="duration">Duration</option>
                        <option value="random">Random</option>
                    </select>
                </div>
            </div>
        `;
    }

    generateGalaxyDynamics() {
        return `
            <h3 onclick="toggleSection(this)" class="collapsed">Galaxy Dynamics</h3>
            <div class="collapsible-content collapsed">
                <div class="mode-section">
                    <button id="galaxyMotionToggle" onclick="toggleMotion()" style="width: 100%; padding: 8px; background: rgba(102,126,234,0.3); border: 1px solid rgba(102,126,234,0.5); color: #fff; border-radius: 4px; cursor: pointer; margin-bottom: 10px;">
                        Motion: ON
                    </button>
                </div>
                <div class="mode-section">
                    <label>Rotation Mode:</label>
                    <select id="rotationMode" onchange="updateRotationMode(this.value)" style="width: 100%; margin-top: 5px;">
                        <option value="collective">Collective</option>
                        <option value="individual">Individual</option>
                        <option value="mixed">Mixed</option>
                    </select>
                </div>
                <div class="mode-section">
                    <label>Rotation Axis:</label>
                    <select id="rotationAxis" onchange="updateRotationAxis(this.value)" style="width: 100%; margin-top: 5px;">
                        <option value="y">Y Axis</option>
                        <option value="x">X Axis</option>
                        <option value="z">Z Axis</option>
                        <option value="all">All Axes</option>
                    </select>
                </div>
                <div class="mode-section">
                    <label>Speed: <span id="speedValue">0.15</span></label>
                    <input type="range" id="speedSlider" min="0" max="0.01" step="0.0001" value="0.0015" onchange="updateMotionSpeed(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Radius: <span id="radiusValue">80</span></label>
                    <input type="range" min="10" max="300" value="80" onchange="updateMotionRadius(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Particle Size: <span id="sizeValue">17.5</span></label>
                    <input type="range" min="1" max="100" step="0.5" value="17.5" onchange="updateParticleSize(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Particle Shape:</label>
                    <select onchange="updateParticleShape(this.value)" style="width: 100%; margin-top: 5px;">
                        <option value="circle">Circle</option>
                        <option value="square">Square</option>
                        <option value="diamond">Diamond</option>
                        <option value="star">Star</option>
                    </select>
                </div>
                <div class="mode-section">
                    <label>Brightness: <span id="brightnessValue">0.8</span></label>
                    <input type="range" min="0.1" max="1" step="0.1" value="0.8" onchange="updateParticleBrightness(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Visibility: <span id="visibilityValue">900</span></label>
                    <input type="range" min="100" max="3000" value="900" onchange="updateVisibility(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>X Axis Scale: <span id="xAxisScaleValue">1.0</span></label>
                    <input type="range" id="xAxisScaleSlider" min="0.1" max="5" step="0.1" value="1.0" onchange="updateXAxisScale(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Y Axis Scale: <span id="yAxisScaleValue">1.0</span></label>
                    <input type="range" id="yAxisScaleSlider" min="0.1" max="5" step="0.1" value="1.0" onchange="updateYAxisScale(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Z Axis Scale: <span id="zAxisScaleValue">1.0</span></label>
                    <input type="range" id="zAxisScaleSlider" min="0.1" max="5" step="0.1" value="1.0" onchange="updateZAxisScale(this.value)" style="width: 100%;">
                </div>
            </div>
        `;
    }

    generateSubParticleDynamics() {
        return `
            <h3 onclick="toggleSection(this)" class="collapsed">Sub-Particle Dynamics</h3>
            <div class="collapsible-content collapsed">
                <div class="mode-section">
                    <label>Cluster Spread: <span id="clusterSpreadValue">10</span></label>
                    <input type="range" min="0" max="50" value="10" onchange="updateClusterSpread(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Sub-Particle Size: <span id="subParticleSizeValue">0.3</span></label>
                    <input type="range" min="0.1" max="2" step="0.1" value="0.3" onchange="updateSubParticleSize(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Main/Sub Ratio: <span id="mainToSubRatioValue">2.0</span></label>
                    <input type="range" min="0.5" max="5" step="0.1" value="2.0" onchange="updateMainToSubRatio(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Sub-Particle Count: <span id="subParticleCountValue">48</span></label>
                    <input type="range" min="1" max="100" value="48" onchange="updateSubParticleCount(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Sub-Motion Speed: <span id="subParticleMotionValue">3.6</span></label>
                    <input type="range" min="0" max="20" step="0.1" value="3.6" onchange="updateSubParticleMotion(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Animation Speed: <span id="subParticleSpeedValue">0.5</span></label>
                    <input type="range" id="subParticleSpeedSlider" min="0" max="2" step="0.1" value="0.5" onchange="updateSubParticleSpeed(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Motion Path:</label>
                    <select id="motionPathSelect" onchange="updateMotionPath(this.value)" style="width: 100%; margin-top: 5px;">
                        <option value="natural">Natural</option>
                        <option value="circular">Circular</option>
                        <option value="spiral">Spiral</option>
                        <option value="random">Random</option>
                    </select>
                </div>
                <div class="mode-section">
                    <label>Sub-Particle Shape:</label>
                    <select id="subParticleShapeSelect" onchange="updateSubParticleShape(this.value)" style="width: 100%; margin-top: 5px;">
                        <option value="default">Default</option>
                        <option value="mixed">Mixed</option>
                        <option value="uniform">Uniform</option>
                    </select>
                </div>
            </div>
        `;
    }

    generateVisualGradients() {
        return `
            <h3 onclick="toggleSection(this)" class="collapsed">Visual Gradients</h3>
            <div class="collapsible-content collapsed">
                <div class="mode-section">
                    <label>Size Gradient: <span id="sizeGradientValue">0.0</span></label>
                    <input type="range" id="sizeGradientSlider" min="0" max="1" step="0.1" value="0.0" onchange="updateSizeGradient(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Density Gradient: <span id="densityGradientValue">0.0</span></label>
                    <input type="range" id="densityGradientSlider" min="0" max="1" step="0.1" value="0.0" onchange="updateDensityGradient(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Bloom/Glow: <span id="bloomStrengthValue">0.0</span></label>
                    <input type="range" id="bloomStrengthSlider" min="0" max="1" step="0.1" value="0.0" onchange="updateBloomStrength(this.value)" style="width: 100%;">
                </div>
            </div>
        `;
    }

    generateAudioReactivity() {
        return `
            <h3 onclick="toggleSection(this)" class="collapsed">Audio Reactivity</h3>
            <div class="collapsible-content collapsed">
                <div class="mode-section">
                    <button id="audioReactivityToggle" onclick="toggleAudioReactivity()" style="width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 4px; cursor: pointer; margin-bottom: 10px;">
                        Audio Reactivity: OFF
                    </button>
                </div>
                <div class="mode-section">
                    <label>Strength: <span id="audioStrengthValue">1.0</span></label>
                    <input type="range" min="0" max="5" step="0.1" value="1.0" onchange="updateAudioStrength(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Global Reactivity: <span id="globalReactivityValue">0.5</span></label>
                    <input type="range" min="0" max="2" step="0.1" value="0.5" onchange="updateGlobalReactivity(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Frequency Mode:</label>
                    <select id="frequencyModeSelect" onchange="updateFrequencyMode(this.value)" style="width: 100%; margin-top: 5px;">
                        <option value="bass">Bass</option>
                        <option value="mids">Mids</option>
                        <option value="highs">Highs</option>
                        <option value="full">Full Spectrum</option>
                    </select>
                </div>
                <div class="mode-section">
                    <label>Stem Galaxy Offset: <span id="stemOffsetValue">100</span></label>
                    <input type="range" min="0" max="500" value="100" onchange="updateStemOffset(this.value)" style="width: 100%;">
                </div>
            </div>
        `;
    }

    generateCrosshairHoverEffects() {
        return `
            <h3 onclick="toggleSection(this)" class="collapsed">Crosshair Hover Effects</h3>
            <div class="collapsible-content collapsed">
                <div class="mode-section">
                    <button id="mouseInteractionToggle" onclick="toggleMouseInteraction()" style="width: 100%; padding: 8px; background: rgba(102,126,234,0.3); border: 1px solid rgba(102,126,234,0.5); color: #fff; border-radius: 4px; cursor: pointer; margin-bottom: 10px;">
                        Crosshair Hover: ON
                    </button>
                </div>
                <div class="mode-section">
                    <label>Hover Speed: <span id="hoverSpeedValue">100</span>%</label>
                    <input type="range" id="hoverSpeedSlider" min="0" max="100" value="100" onchange="updateHoverSpeed(this.value)" style="width: 100%;">
                </div>
                <div class="mode-section">
                    <label>Hover Scale: <span id="hoverScaleValue">2.0</span></label>
                    <input type="range" id="hoverScaleSlider" min="0.5" max="5" step="0.1" value="2.0" onchange="updateHoverScale(this.value)" style="width: 100%;">
                </div>
            </div>
        `;
    }

    generatePresets() {
        return `
            <h3 onclick="toggleSection(this)" class="collapsed">Presets</h3>
            <div class="collapsible-content collapsed">
                <div class="mode-section">
                    <input type="text" id="presetNameInput" placeholder="Enter preset name..." style="width: 100%; margin-bottom: 10px;">
                    <button onclick="savePreset()" style="width: 100%; padding: 8px; background: rgba(102,126,234,0.3); border: 1px solid rgba(102,126,234,0.5); color: #fff; border-radius: 4px; cursor: pointer;">
                        Save Preset
                    </button>
                </div>
                <div class="mode-section" style="margin-top: 10px;">
                    <select id="presetSelect" style="width: 100%; margin-bottom: 10px;">
                        <option value="">-- Select Preset --</option>
                    </select>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="loadPreset(document.getElementById('presetSelect').value)" style="flex: 1; padding: 8px; background: rgba(102,234,102,0.3); border: 1px solid rgba(102,234,102,0.5); color: #fff; border-radius: 4px; cursor: pointer;">
                            Load
                        </button>
                        <button onclick="deletePreset()" style="flex: 1; padding: 8px; background: rgba(234,102,102,0.3); border: 1px solid rgba(234,102,102,0.5); color: #fff; border-radius: 4px; cursor: pointer;">
                            Delete
                        </button>
                    </div>
                </div>
                <div class="mode-section" style="margin-top: 10px;">
                    <label style="display: flex; align-items: center;">
                        <input type="checkbox" id="saveCameraCheckbox" style="margin-right: 8px;">
                        Save Camera Position
                    </label>
                </div>
            </div>
        `;
    }

    /**
     * Render the menu into a container
     * @param {HTMLElement} container - Container to render into
     */
    render(container) {
        // Check if menu already exists
        const existingMenu = document.getElementById(this.menuId);
        if (existingMenu) {
            existingMenu.remove();
        }

        // Insert the menu HTML
        container.insertAdjacentHTML('beforeend', this.generateHTML());

        // Initialize menu functionality
        this.initializeDragHandle();
        this.initializeResizeHandle();
    }

    /**
     * Initialize draggable functionality
     */
    initializeDragHandle() {
        const menu = document.getElementById(this.menuId);
        const titleBar = menu.querySelector('.options-title-bar');

        if (!titleBar) return;

        let isDragging = false;
        let startX, startY, startLeft, startTop;

        titleBar.addEventListener('mousedown', (e) => {
            if (e.target === titleBar || e.target.tagName === 'H2') {
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                const rect = menu.getBoundingClientRect();
                startLeft = rect.left;
                startTop = rect.top;
                e.preventDefault();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            menu.style.left = `${startLeft + deltaX}px`;
            menu.style.top = `${startTop + deltaY}px`;
            menu.style.right = 'auto';
            menu.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    /**
     * Initialize resize functionality
     */
    initializeResizeHandle() {
        const menu = document.getElementById(this.menuId);
        const handle = menu.querySelector('.options-resize-handle');

        if (!handle) return;

        let isResizing = false;
        let startY, startHeight;

        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startY = e.clientY;
            startHeight = menu.offsetHeight;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const deltaY = e.clientY - startY;
            const newHeight = Math.max(200, startHeight + deltaY);
            menu.style.height = `${newHeight}px`;
            menu.style.maxHeight = `${newHeight}px`;
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
        });
    }
}

// Export for use in other modules
export default GalaxyOptionsMenu;

// Also expose to window for immediate use
window.GalaxyOptionsMenu = GalaxyOptionsMenu;