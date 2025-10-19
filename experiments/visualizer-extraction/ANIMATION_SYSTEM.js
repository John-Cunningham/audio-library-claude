// === ANIMATION & REACTIVITY MODULE ===

// MOTION MODES:
// - 'none': Static positions
// - 'collective': All particles move together in patterns
// - 'individual': Each particle has its own orbit
// - 'random': Chaotic individual movements
// - 'audio': Movement driven by audio amplitude
// - 'wave': Wave pattern through particles

// REQUIRED GLOBAL VARIABLES:
let animationTime = 0;              // Global animation timer
let motionEnabled = true;           // Toggle all motion on/off
let motionMode = 'collective';      // Current motion mode
let orbitSpeed = 0.0000015;         // Base rotation speed
let orbitRadius = 80;               // Motion amplitude
let audioReactivityEnabled = true;  // Toggle audio reactivity
let audioReactivityStrength = 40;   // Audio effect strength (0-100)
let globalAudioReactivity = 4.4;    // Global audio pulse strength
let clusterSpreadOnAudio = 20;      // How much clusters expand with audio
let hoveredCluster = null;          // Currently hovered cluster for effects
let hoverScale = 1.5;               // Scale multiplier on hover
let hoverSlowdown = 10;             // Time slowdown factor on hover (1-100)
let mouseInteractionEnabled = true; // Enable mouse effects
let hiddenCategories = new Set();   // Hidden file categories

// Wave motion parameters
let waveAmplitude = 50;             // Wave height
let waveFrequency = 0.001;          // Wave speed
let waveDirection = { x: 1, y: 0, z: 0 }; // Wave propagation direction

/**
 * Main animation update function - call this in your render loop
 * Updates all particle positions based on motion mode and audio
 *
 * @param {number} deltaTime - Time since last frame in seconds
 * @param {THREE.Camera} camera - Camera for billboard facing
 * @param {THREE.InstancedMesh} particleSystem - The instanced mesh
 * @param {Array} particles - Array of cluster objects
 * @param {boolean} audioPlaying - Whether audio is currently playing
 */
function updateParticleAnimation(deltaTime, camera, particleSystem, particles, audioPlaying = false) {
    if (!particleSystem || !particles || particles.length === 0) return;

    // Update animation time
    animationTime += deltaTime;

    // Update audio amplitude if playing
    if (audioPlaying && typeof updateAudioAmplitude === 'function') {
        updateAudioAmplitude();
    }

    const dummy = new THREE.Object3D();

    // Process each cluster
    particles.forEach((cluster, clusterIndex) => {
        // Check if category is hidden
        if (hiddenCategories.size > 0) {
            const category = getCategoryForFile ? getCategoryForFile(cluster.file) : 'other';
            if (hiddenCategories.has(category)) {
                // Hide all sub-particles for this cluster
                cluster.subParticles.forEach(subParticle => {
                    dummy.position.set(0, -10000, 0); // Move far below
                    dummy.scale.setScalar(0.001);     // Make tiny
                    dummy.updateMatrix();
                    particleSystem.setMatrixAt(subParticle.instanceIndex, dummy.matrix);
                });
                return; // Skip to next cluster
            }
        }

        // Handle hover time manipulation
        let clusterTime = animationTime;
        if (hoveredCluster === cluster && mouseInteractionEnabled && hoverSlowdown > 1) {
            // Initialize custom time tracking
            if (cluster.customTime === null) {
                cluster.customTime = animationTime;
                cluster.lastRealTime = animationTime;
            }

            // Update slowed time
            const realDelta = animationTime - cluster.lastRealTime;
            const slowedDelta = realDelta / hoverSlowdown;
            cluster.customTime += slowedDelta;
            cluster.lastRealTime = animationTime;
            clusterTime = cluster.customTime;
        } else {
            // Reset custom time when not hovered
            cluster.customTime = null;
            cluster.lastRealTime = null;
        }

        // Calculate base motion offsets for the entire cluster
        let clusterOffsetX = 0, clusterOffsetY = 0, clusterOffsetZ = 0;

        if (motionEnabled) {
            switch (motionMode) {
                case 'collective':
                    // All clusters move in synchronized orbits
                    clusterOffsetX = Math.sin(clusterTime * orbitSpeed * 1000) * orbitRadius;
                    clusterOffsetY = Math.sin(clusterTime * orbitSpeed * 1500) * orbitRadius * 0.5;
                    clusterOffsetZ = Math.cos(clusterTime * orbitSpeed * 1000) * orbitRadius;
                    break;

                case 'individual':
                    // Each cluster has its own orbit based on file properties
                    const seed = clusterIndex * 1000;
                    clusterOffsetX = Math.sin(clusterTime * orbitSpeed * 1000 + seed) * orbitRadius;
                    clusterOffsetY = Math.cos(clusterTime * orbitSpeed * 800 + seed * 1.5) * orbitRadius * 0.7;
                    clusterOffsetZ = Math.sin(clusterTime * orbitSpeed * 1200 + seed * 0.5) * orbitRadius;
                    break;

                case 'random':
                    // Chaotic movement using Perlin-like noise simulation
                    const t = clusterTime * orbitSpeed * 500;
                    const noise1 = Math.sin(t + clusterIndex) * Math.cos(t * 1.3 + clusterIndex * 2);
                    const noise2 = Math.sin(t * 0.7 + clusterIndex * 3) * Math.cos(t * 1.1);
                    const noise3 = Math.cos(t * 0.9 + clusterIndex * 1.5) * Math.sin(t * 1.2);
                    clusterOffsetX = noise1 * orbitRadius;
                    clusterOffsetY = noise2 * orbitRadius;
                    clusterOffsetZ = noise3 * orbitRadius;
                    break;

                case 'audio':
                    // Movement driven entirely by audio amplitude
                    if (audioReactivityEnabled && currentAudioAmplitude > 0) {
                        const audioScale = currentAudioAmplitude * audioReactivityStrength * 0.1;
                        clusterOffsetX = Math.sin(clusterIndex * 0.5) * audioScale;
                        clusterOffsetY = currentAudioAmplitude * audioReactivityStrength * 0.5;
                        clusterOffsetZ = Math.cos(clusterIndex * 0.5) * audioScale;
                    }
                    break;

                case 'wave':
                    // Wave pattern through space
                    const wavePhase = (cluster.centerPosition.x * waveDirection.x +
                                      cluster.centerPosition.y * waveDirection.y +
                                      cluster.centerPosition.z * waveDirection.z) * 0.05;
                    const waveOffset = Math.sin(clusterTime * waveFrequency * 1000 + wavePhase) * waveAmplitude;
                    clusterOffsetX = waveDirection.x * waveOffset;
                    clusterOffsetY = waveDirection.y * waveOffset + waveOffset * 0.3; // Add vertical component
                    clusterOffsetZ = waveDirection.z * waveOffset;
                    break;

                case 'none':
                default:
                    // No motion
                    break;
            }
        }

        // Update each sub-particle in the cluster
        cluster.subParticles.forEach((subParticle, subIndex) => {
            let x = cluster.centerPosition.x + clusterOffsetX;
            let y = cluster.centerPosition.y + clusterOffsetY;
            let z = cluster.centerPosition.z + clusterOffsetZ;

            // Individual sub-particle motion (within cluster)
            if (motionEnabled && motionMode !== 'none') {
                // Orbital motion around cluster center
                const orbitTime = clusterTime * 0.0001; // Slower internal motion
                const phase = subParticle.orbitPhase;

                // Different motion patterns for sub-particles
                if (motionMode === 'individual' || motionMode === 'random') {
                    // Random orbits for each sub-particle
                    const axis = subParticle.randomOrbitAxis;
                    const speed = subParticle.randomOrbitSpeed * orbitTime;

                    // Rotate offset around random axis
                    const angle = speed + phase;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);

                    // Simplified rotation around arbitrary axis
                    const rotatedOffset = {
                        x: subParticle.offset.x * cos + subParticle.offset.z * sin,
                        y: subParticle.offset.y,
                        z: -subParticle.offset.x * sin + subParticle.offset.z * cos
                    };

                    x += rotatedOffset.x;
                    y += rotatedOffset.y;
                    z += rotatedOffset.z;
                } else {
                    // Standard offset
                    x += subParticle.offset.x;
                    y += subParticle.offset.y;
                    z += subParticle.offset.z;
                }
            } else {
                // Static positions
                x += subParticle.offset.x;
                y += subParticle.offset.y;
                z += subParticle.offset.z;
            }

            // Audio reactivity - expand/contract clusters
            if (audioReactivityEnabled && currentAudioAmplitude > 0 && !subParticle.isCenterParticle) {
                const audioExpansion = 1.0 + currentAudioAmplitude * clusterSpreadOnAudio * 0.01;

                // Different frequency bands affect different distances
                let expansionFactor = audioExpansion;

                if (audioFrequencyMode === 'bass' && bassAmplitude > 0) {
                    // Bass affects outer particles more
                    expansionFactor = 1.0 + bassAmplitude * clusterSpreadOnAudio * 0.01 *
                                     (1.0 + subParticle.distanceFromCenter);
                } else if (audioFrequencyMode === 'highs' && highsAmplitude > 0) {
                    // Highs affect inner particles more
                    expansionFactor = 1.0 + highsAmplitude * clusterSpreadOnAudio * 0.01 *
                                     (2.0 - subParticle.distanceFromCenter);
                }

                // Apply expansion to offset from center
                const expandedOffsetX = subParticle.offset.x * expansionFactor;
                const expandedOffsetY = subParticle.offset.y * expansionFactor;
                const expandedOffsetZ = subParticle.offset.z * expansionFactor;

                x = cluster.centerPosition.x + clusterOffsetX + expandedOffsetX;
                y = cluster.centerPosition.y + clusterOffsetY + expandedOffsetY;
                z = cluster.centerPosition.z + clusterOffsetZ + expandedOffsetZ;
            }

            // Set position
            dummy.position.set(x, y, z);

            // Calculate scale with various effects
            let scale = particleSize * subParticleScale;

            // Audio pulse effect
            if (audioReactivityEnabled && audioPlaying) {
                // Currently playing file pulses more
                const isCurrentFile = cluster.file.id === currentFileId;

                if (isCurrentFile) {
                    // Strong pulse for current file
                    scale *= (1.0 + currentAudioAmplitude * audioReactivityStrength * 0.01);
                } else {
                    // Subtle global pulse for other files
                    scale *= (1.0 + currentAudioAmplitude * globalAudioReactivity * 0.005);
                }
            }

            // Hover scale effect
            if (hoveredCluster === cluster && mouseInteractionEnabled && hoverScale > 1.0) {
                scale *= hoverScale;
            }

            // Distance-based scale for sub-particles (creates density gradient)
            if (!subParticle.isCenterParticle && subParticle.distanceFromCenter > 0) {
                // Outer particles slightly smaller
                scale *= (1.0 - subParticle.distanceFromCenter * 0.2);
            }

            dummy.scale.setScalar(scale);

            // Make particles face camera (billboard effect)
            dummy.lookAt(camera.position);

            // Update instance matrix
            dummy.updateMatrix();
            particleSystem.setMatrixAt(subParticle.instanceIndex, dummy.matrix);
        });
    });

    // Flag that instance matrix needs update
    particleSystem.instanceMatrix.needsUpdate = true;
}

/**
 * Sets the current motion mode
 * @param {string} mode - Motion mode name
 */
function setMotionMode(mode) {
    const validModes = ['none', 'collective', 'individual', 'random', 'audio', 'wave'];
    if (validModes.includes(mode)) {
        motionMode = mode;
        console.log(`🎭 Motion mode set to: ${mode}`);
    }
}

/**
 * Toggles motion on/off
 * @returns {boolean} New motion state
 */
function toggleMotion() {
    motionEnabled = !motionEnabled;
    console.log(`🎭 Motion ${motionEnabled ? 'enabled' : 'disabled'}`);
    return motionEnabled;
}

/**
 * Sets audio reactivity parameters
 * @param {Object} params - Reactivity parameters
 */
function setAudioReactivity(params) {
    if (params.enabled !== undefined) audioReactivityEnabled = params.enabled;
    if (params.strength !== undefined) audioReactivityStrength = clamp(params.strength, 0, 100);
    if (params.globalStrength !== undefined) globalAudioReactivity = clamp(params.globalStrength, 0, 10);
    if (params.clusterSpread !== undefined) clusterSpreadOnAudio = clamp(params.clusterSpread, 0, 100);

    console.log('🎵 Audio reactivity updated:', {
        enabled: audioReactivityEnabled,
        strength: audioReactivityStrength,
        global: globalAudioReactivity,
        spread: clusterSpreadOnAudio
    });
}

/**
 * Sets hover interaction parameters
 * @param {Object} params - Hover parameters
 */
function setHoverEffects(params) {
    if (params.enabled !== undefined) mouseInteractionEnabled = params.enabled;
    if (params.scale !== undefined) hoverScale = clamp(params.scale, 1, 3);
    if (params.slowdown !== undefined) hoverSlowdown = clamp(params.slowdown, 1, 100);

    console.log('🖱️ Hover effects updated:', {
        enabled: mouseInteractionEnabled,
        scale: hoverScale,
        slowdown: hoverSlowdown
    });
}

/**
 * Sets wave motion parameters
 * @param {Object} params - Wave parameters
 */
function setWaveMotion(params) {
    if (params.amplitude !== undefined) waveAmplitude = params.amplitude;
    if (params.frequency !== undefined) waveFrequency = params.frequency;
    if (params.direction !== undefined) {
        const dir = params.direction;
        const length = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
        if (length > 0) {
            waveDirection = {
                x: dir.x / length,
                y: dir.y / length,
                z: dir.z / length
            };
        }
    }
}

/**
 * Toggles visibility of a category
 * @param {string} category - Category name to toggle
 */
function toggleCategoryVisibility(category) {
    if (hiddenCategories.has(category)) {
        hiddenCategories.delete(category);
        console.log(`👁️ Showing category: ${category}`);
    } else {
        hiddenCategories.add(category);
        console.log(`👁️ Hiding category: ${category}`);
    }
}

// === USAGE EXAMPLE ===
/*
// In your main animation loop:
function animate() {
    const deltaTime = clock.getDelta();

    // Update particle animation
    updateParticleAnimation(
        deltaTime,
        camera,
        particleSystem,
        particles,
        wavesurfer && wavesurfer.isPlaying()
    );

    // Update other systems...
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Setting motion modes:
setMotionMode('collective');  // Synchronized motion
setMotionMode('individual');  // Independent orbits
setMotionMode('audio');       // Audio-driven
setMotionMode('wave');        // Wave pattern

// Configuring audio reactivity:
setAudioReactivity({
    enabled: true,
    strength: 50,        // 0-100
    globalStrength: 5,   // 0-10
    clusterSpread: 30    // 0-100
});

// Configuring hover effects:
setHoverEffects({
    enabled: true,
    scale: 1.5,          // 1-3
    slowdown: 10         // 1-100
});

// Setting wave motion:
setWaveMotion({
    amplitude: 100,
    frequency: 0.002,
    direction: { x: 1, y: 0.5, z: 0 }
});
*/

// === PERFORMANCE NOTES ===
/*
1. Instance matrix updates are expensive with many particles
   - Consider updating only visible particles
   - Use LOD (Level of Detail) for distant clusters

2. Audio analysis runs every frame
   - Consider throttling to 30-60 fps if needed
   - Cache amplitude values if multiple systems use them

3. Hover detection needs raycasting (not included here)
   - Set hoveredCluster from your raycasting code
   - Consider spatial indexing for many particles

4. Motion calculations can be optimized:
   - Pre-calculate sin/cos values for common angles
   - Use lookup tables for complex functions
   - Consider GPU computation for very large datasets
*/