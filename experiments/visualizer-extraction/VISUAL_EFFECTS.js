// === VISUAL EFFECTS MODULE ===
// Bloom/glow post-processing for enhanced visual quality
// Optional but adds significant polish to the visualization

// REQUIRED DEPENDENCIES:
// Three.js r128 and post-processing scripts must be loaded:
/*
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/ShaderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/shaders/CopyShader.js"></script>
*/

// GLOBAL VARIABLES:
let composer = null;                // EffectComposer instance
let bloomPass = null;               // UnrealBloomPass instance
let bloomStrength = 0.8;            // Bloom intensity (0-10)
let bloomRadius = 0.4;              // Bloom radius (0-1)
let bloomThreshold = 0.6;           // Brightness threshold (0-1)
let bloomEnabled = true;            // Toggle bloom on/off
let fogEnabled = true;              // Toggle fog effect
let fogNear = 100;                  // Fog start distance
let fogFar = 1000;                  // Fog end distance

/**
 * Initialize post-processing pipeline with bloom effect
 * Call this after creating your Three.js scene and renderer
 *
 * @param {THREE.Scene} scene - Three.js scene
 * @param {THREE.Camera} camera - Three.js camera
 * @param {THREE.WebGLRenderer} renderer - Three.js renderer
 * @returns {THREE.EffectComposer} The composer for rendering
 */
function initVisualEffects(scene, camera, renderer) {
    console.log('🌟 Initializing visual effects...');

    // Check if required classes are available
    if (typeof THREE.EffectComposer === 'undefined') {
        console.error('❌ THREE.EffectComposer not found. Please include post-processing scripts.');
        return null;
    }

    try {
        // Create composer for post-processing
        composer = new THREE.EffectComposer(renderer);

        // Add render pass (renders the scene)
        const renderPass = new THREE.RenderPass(scene, camera);
        composer.addPass(renderPass);

        // Create and configure bloom pass
        const bloomParams = {
            resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
            strength: bloomStrength,
            radius: bloomRadius,
            threshold: bloomThreshold
        };

        bloomPass = new THREE.UnrealBloomPass(
            bloomParams.resolution,
            bloomParams.strength,
            bloomParams.radius,
            bloomParams.threshold
        );

        // Fine-tune bloom settings
        bloomPass.threshold = bloomParams.threshold;
        bloomPass.strength = bloomParams.strength;
        bloomPass.radius = bloomParams.radius;

        composer.addPass(bloomPass);

        console.log('✅ Bloom effect initialized:', bloomParams);

        // Initialize fog if enabled
        if (fogEnabled) {
            initFog(scene);
        }

        // Add starfield background (optional)
        addStarsBackground(scene);

        return composer;

    } catch (error) {
        console.error('❌ Failed to initialize visual effects:', error);
        return null;
    }
}

/**
 * Update bloom parameters in real-time
 * @param {Object} params - Bloom parameters to update
 */
function updateBloomEffect(params = {}) {
    if (!bloomPass) {
        console.warn('⚠️ Bloom pass not initialized');
        return;
    }

    if (params.strength !== undefined) {
        bloomStrength = clamp(params.strength, 0, 10);
        bloomPass.strength = bloomStrength;
    }

    if (params.radius !== undefined) {
        bloomRadius = clamp(params.radius, 0, 1);
        bloomPass.radius = bloomRadius;
    }

    if (params.threshold !== undefined) {
        bloomThreshold = clamp(params.threshold, 0, 1);
        bloomPass.threshold = bloomThreshold;
    }

    console.log('🌟 Bloom updated:', {
        strength: bloomStrength,
        radius: bloomRadius,
        threshold: bloomThreshold
    });
}

/**
 * Toggle bloom effect on/off
 * @returns {boolean} New bloom state
 */
function toggleBloom() {
    bloomEnabled = !bloomEnabled;

    if (bloomPass) {
        bloomPass.enabled = bloomEnabled;
    }

    console.log(`🌟 Bloom ${bloomEnabled ? 'enabled' : 'disabled'}`);
    return bloomEnabled;
}

/**
 * Initialize atmospheric fog effect
 * @param {THREE.Scene} scene - Three.js scene
 */
function initFog(scene) {
    if (!scene) return;

    // Create exponential fog for depth
    const fogColor = new THREE.Color(0x000510); // Very dark blue
    scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);

    // Also set background to match fog
    scene.background = fogColor;

    console.log('🌫️ Fog initialized:', { near: fogNear, far: fogFar });
}

/**
 * Update fog parameters
 * @param {Object} params - Fog parameters
 */
function updateFog(params = {}) {
    if (!scene.fog) {
        console.warn('⚠️ Fog not initialized');
        return;
    }

    if (params.near !== undefined) {
        fogNear = params.near;
        scene.fog.near = fogNear;
    }

    if (params.far !== undefined) {
        fogFar = params.far;
        scene.fog.far = fogFar;
    }

    if (params.color !== undefined) {
        const color = new THREE.Color(params.color);
        scene.fog.color = color;
        scene.background = color;
    }

    console.log('🌫️ Fog updated:', { near: fogNear, far: fogFar });
}

/**
 * Add starfield background for space atmosphere
 * @param {THREE.Scene} scene - Three.js scene
 * @param {number} starCount - Number of stars (default 5000)
 */
function addStarsBackground(scene, starCount = 5000) {
    console.log('⭐ Creating starfield...');

    // Create geometry for stars
    const starsGeometry = new THREE.BufferGeometry();
    const starsVertices = [];
    const starsSizes = [];
    const starsColors = [];

    // Generate random star positions
    for (let i = 0; i < starCount; i++) {
        // Random position in large sphere
        const radius = 1000 + Math.random() * 1000;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);

        starsVertices.push(x, y, z);

        // Varied star sizes for depth
        const size = Math.random() * 1.5 + 0.5;
        starsSizes.push(size);

        // Varied star colors (white to blue-white)
        const brightness = 0.5 + Math.random() * 0.5;
        const tint = Math.random() * 0.2; // Slight blue tint
        starsColors.push(brightness, brightness, brightness + tint);
    }

    // Set attributes
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    starsGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starsSizes, 1));
    starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starsColors, 3));

    // Create material
    const starsMaterial = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending
    });

    // Create and add stars to scene
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    stars.name = 'starfield';
    scene.add(stars);

    console.log(`✅ Added ${starCount} stars to background`);
    return stars;
}

/**
 * Create gradient skybox for atmosphere
 * @param {THREE.Scene} scene - Three.js scene
 * @param {number} size - Skybox size
 */
function addGradientSkybox(scene, size = 2000) {
    console.log('🌌 Creating gradient skybox...');

    // Create sphere geometry (inside faces)
    const skyboxGeometry = new THREE.SphereGeometry(size, 32, 32);

    // Custom shader for gradient
    const skyboxMaterial = new THREE.ShaderMaterial({
        uniforms: {
            topColor: { value: new THREE.Color(0x0A0A2E) },    // Dark blue
            bottomColor: { value: new THREE.Color(0x000000) }  // Black
        },
        vertexShader: `
            varying vec3 vWorldPosition;
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 topColor;
            uniform vec3 bottomColor;
            varying vec3 vWorldPosition;
            void main() {
                float h = normalize(vWorldPosition).y * 0.5 + 0.5;
                vec3 color = mix(bottomColor, topColor, h);
                gl_FragColor = vec4(color, 1.0);
            }
        `,
        side: THREE.BackSide
    });

    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    skybox.name = 'skybox';
    scene.add(skybox);

    console.log('✅ Gradient skybox added');
    return skybox;
}

/**
 * Handle window resize for post-processing
 * Call this in your window resize handler
 * @param {THREE.Camera} camera - Three.js camera
 * @param {THREE.WebGLRenderer} renderer - Three.js renderer
 */
function handleEffectsResize(camera, renderer) {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (composer) {
        composer.setSize(width, height);
    }

    if (bloomPass) {
        bloomPass.resolution.set(width, height);
    }

    console.log('🔄 Effects resized:', { width, height });
}

/**
 * Render scene with or without effects
 * Use this instead of renderer.render() in your animation loop
 * @param {THREE.Scene} scene - Three.js scene
 * @param {THREE.Camera} camera - Three.js camera
 * @param {THREE.WebGLRenderer} renderer - Three.js renderer
 */
function renderWithEffects(scene, camera, renderer) {
    if (bloomEnabled && composer) {
        // Render with post-processing
        composer.render();
    } else {
        // Render without effects
        renderer.render(scene, camera);
    }
}

/**
 * Clean up visual effects when destroying view
 */
function cleanupVisualEffects() {
    if (composer) {
        composer.dispose();
        composer = null;
    }

    bloomPass = null;
    console.log('🧹 Visual effects cleaned up');
}

// Helper function for clamping values (if not imported from utilities)
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// === USAGE EXAMPLE ===
/*
// 1. Initialize after creating scene/camera/renderer:
const composer = initVisualEffects(scene, camera, renderer);

// 2. In your animation loop, use composer instead of renderer:
function animate() {
    updateParticleAnimation(...);

    // Render with effects
    renderWithEffects(scene, camera, renderer);
    // OR if you saved the composer:
    // composer.render();

    requestAnimationFrame(animate);
}

// 3. Update bloom in real-time:
updateBloomEffect({
    strength: 1.5,
    radius: 0.5,
    threshold: 0.4
});

// 4. Toggle effects:
toggleBloom(); // On/off

// 5. Handle window resize:
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    handleEffectsResize(camera, renderer);
});

// 6. Clean up when done:
cleanupVisualEffects();
*/

// === PERFORMANCE NOTES ===
/*
1. Bloom is expensive on mobile/low-end GPUs
   - Consider detecting device and disabling by default
   - Provide quality presets (low/medium/high)

2. Resolution affects performance significantly
   - Consider using lower resolution for bloom pass
   - bloomPass.resolution.set(width/2, height/2);

3. Multiple passes compound performance impact
   - Limit to essential effects only
   - Consider selective bloom (only certain objects)

4. Tips for optimization:
   - Reduce bloom resolution on mobile
   - Use lower threshold to bloom fewer pixels
   - Disable on battery-powered devices
   - Provide user toggle for effects
*/

// === TROUBLESHOOTING ===
/*
1. Black screen after enabling bloom:
   - Check that all required scripts are loaded
   - Verify Three.js version compatibility (r128)
   - Check console for shader compilation errors

2. No visible bloom effect:
   - Increase bloom strength
   - Lower bloom threshold
   - Ensure particles are bright enough
   - Check that composer is being used for rendering

3. Performance issues:
   - Reduce bloom resolution
   - Lower particle count
   - Disable on mobile devices
   - Use simpler particle textures

4. Bloom too intense:
   - Reduce bloom strength
   - Increase bloom threshold
   - Adjust particle brightness
*/