// Galaxy View - 3D particle visualization with game controls
// Phase 1: Basic Three.js implementation with WASD + mouse controls

let scene = null;
let camera = null;
let renderer = null;
let particles = [];
let raycaster = null;
let mouse = new THREE.Vector2();
let animationFrameId = null;
let isPointerLocked = false;

// Camera movement
let moveSpeed = 5.0;
let lookSensitivity = 0.002;
let keys = {};
let velocity = new THREE.Vector3();
let pitch = 0;
let yaw = 0;

// Audio files data
let audioFilesData = [];
let currentFileData = null;

// Load Three.js dynamically
let THREE = null;
let threeLoaded = false;

async function loadThreeJS() {
    if (threeLoaded) return true;

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = () => {
            THREE = window.THREE;
            threeLoaded = true;
            console.log('Three.js loaded successfully');
            resolve(true);
        };
        script.onerror = () => {
            console.error('Failed to load Three.js');
            reject(false);
        };
        document.head.appendChild(script);
    });
}

export async function init(data = {}) {
    console.log('Galaxy view initializing...');

    // Load Three.js first
    await loadThreeJS();

    // Store audio files data
    if (data.audioFiles) {
        audioFilesData = data.audioFiles;
    }
    if (data.currentFile) {
        currentFileData = data.currentFile;
    }

    // Show galaxy container
    const container = document.getElementById('galaxyViewContainer');
    if (!container) {
        console.error('Galaxy view container not found');
        return;
    }

    container.style.display = 'block';
    container.innerHTML = '';
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';

    // Create instructions overlay
    const instructions = document.createElement('div');
    instructions.id = 'galaxyInstructions';
    instructions.style.cssText = `
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        padding: 15px 25px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 14px;
        text-align: center;
        z-index: 100;
        pointer-events: none;
    `;
    instructions.innerHTML = `
        <strong>🌌 Galaxy View - Phase 1</strong><br>
        Click to lock pointer | ESC to unlock<br>
        WASD to move | Mouse to look | Click particles to load file
    `;
    container.appendChild(instructions);

    // Setup Three.js scene
    setupScene(container);

    // Create particles from audio files
    createParticles();

    // Setup controls
    setupControls(container);

    // Start animation loop
    startAnimation();

    console.log('Galaxy view initialized with Three.js');
}

export function update(data = {}) {
    console.log('Galaxy view update called', data);

    if (data.currentFile) {
        currentFileData = data.currentFile;
        highlightCurrentFile();
    }

    if (data.audioFiles) {
        audioFilesData = data.audioFiles;
        recreateParticles();
    }
}

export async function destroy() {
    console.log('Galaxy view destroying...');

    // Stop animation
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Remove event listeners
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
    document.removeEventListener('pointerlockchange', onPointerLockChange);
    document.removeEventListener('mousemove', onMouseMove);

    // Cleanup Three.js
    if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('click', onClick);
        if (renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
    }

    if (scene) {
        // Dispose geometries and materials
        particles.forEach(p => {
            if (p.geometry) p.geometry.dispose();
            if (p.material) p.material.dispose();
        });
        particles = [];
        scene.clear();
        scene = null;
    }

    if (renderer) {
        renderer.dispose();
        renderer = null;
    }

    camera = null;
    raycaster = null;

    // Hide container
    const container = document.getElementById('galaxyViewContainer');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }

    console.log('Galaxy view destroyed');
}

/**
 * Setup Three.js scene
 */
function setupScene(container) {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 10, 800);

    // Camera
    camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        2000
    );
    camera.position.set(0, 50, 200);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Raycaster for mouse picking
    raycaster = new THREE.Raycaster();

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Handle window resize
    window.addEventListener('resize', () => {
        if (!camera || !renderer || !container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

/**
 * Create particles from audio files
 */
function createParticles() {
    // Clear existing particles
    particles.forEach(p => {
        if (p.geometry) p.geometry.dispose();
        if (p.material) p.material.dispose();
        scene.remove(p);
    });
    particles = [];

    if (!audioFilesData || audioFilesData.length === 0) {
        console.log('No audio files to visualize');
        return;
    }

    console.log(`Creating ${audioFilesData.length} particles...`);

    audioFilesData.forEach((file, index) => {
        // Position based on BPM and key (simple layout)
        const bpm = file.bpm || 120;
        const keyValue = getKeyValue(file.key);

        const x = ((bpm - 80) / 100) * 400 - 200;  // BPM 80-180 → -200 to +200
        const y = (keyValue / 12) * 200 - 100;     // 12 keys → -100 to +100
        const z = (Math.random() - 0.5) * 100;     // Random depth

        // Create particle
        const geometry = new THREE.SphereGeometry(3, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: getColorForFile(file),
            emissive: getColorForFile(file),
            emissiveIntensity: 0.3,
            metalness: 0.5,
            roughness: 0.5
        });

        const particle = new THREE.Mesh(geometry, material);
        particle.position.set(x, y, z);
        particle.userData = { file: file, originalScale: 1.0 };

        scene.add(particle);
        particles.push(particle);
    });

    console.log(`Created ${particles.length} particles`);
}

/**
 * Recreate particles (when file list changes)
 */
function recreateParticles() {
    createParticles();
    highlightCurrentFile();
}

/**
 * Highlight currently playing file
 */
function highlightCurrentFile() {
    if (!currentFileData) return;

    particles.forEach(p => {
        const isCurrentFile = p.userData.file.id === currentFileData.id;
        if (isCurrentFile) {
            p.material.emissiveIntensity = 0.8;
            p.scale.setScalar(1.5);
        } else {
            p.material.emissiveIntensity = 0.3;
            p.scale.setScalar(1.0);
        }
    });
}

/**
 * Get numeric value from musical key
 */
function getKeyValue(key) {
    if (!key) return 0;
    const keyMap = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
    const keyName = key.split('/')[0].replace('maj', '').replace('min', '').trim();
    return keyMap[keyName] || 0;
}

/**
 * Get color based on file properties
 */
function getColorForFile(file) {
    // Simple color based on key
    const keyValue = getKeyValue(file.key);
    const hue = (keyValue / 12) * 360;
    return new THREE.Color().setHSL(hue / 360, 0.7, 0.5);
}

/**
 * Setup keyboard and mouse controls
 */
function setupControls(container) {
    // Pointer lock
    container.addEventListener('click', () => {
        if (!isPointerLocked) {
            container.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Click to select particle
    renderer.domElement.addEventListener('click', onClick);
}

function onPointerLockChange() {
    isPointerLocked = document.pointerLockElement !== null;
    const instructions = document.getElementById('galaxyInstructions');
    if (instructions) {
        instructions.style.display = isPointerLocked ? 'none' : 'block';
    }
}

function onMouseMove(event) {
    if (!isPointerLocked) {
        // Update mouse position for raycasting
        const container = document.getElementById('galaxyViewContainer');
        if (!container || !renderer) return;

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    } else {
        // Camera look controls
        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        yaw -= movementX * lookSensitivity;
        pitch -= movementY * lookSensitivity;

        // Limit pitch to prevent flipping
        pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
    }
}

function onKeyDown(event) {
    keys[event.code] = true;
}

function onKeyUp(event) {
    keys[event.code] = false;
}

function onClick(event) {
    if (isPointerLocked) return; // Don't click particles when pointer is locked

    // Raycast to find clicked particle
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(particles);

    if (intersects.length > 0) {
        const clickedParticle = intersects[0].object;
        const file = clickedParticle.userData.file;

        console.log('Clicked particle:', file.name);

        // Load file using global function
        if (window.loadAudio) {
            window.loadAudio(file.id, true);
        }
    }
}

/**
 * Update camera position based on WASD keys
 */
function updateMovement(delta) {
    if (!isPointerLocked) return;

    // Update camera rotation
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    // Movement direction
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3(0, 1, 0);

    forward.applyQuaternion(camera.quaternion);
    right.applyQuaternion(camera.quaternion);

    // Reset velocity
    velocity.set(0, 0, 0);

    // WASD movement
    if (keys['KeyW']) velocity.add(forward);
    if (keys['KeyS']) velocity.sub(forward);
    if (keys['KeyA']) velocity.sub(right);
    if (keys['KeyD']) velocity.add(right);
    if (keys['Space']) velocity.add(up);
    if (keys['ShiftLeft'] || keys['ShiftRight']) velocity.sub(up);

    // Normalize and apply speed
    if (velocity.length() > 0) {
        velocity.normalize().multiplyScalar(moveSpeed);
        camera.position.add(velocity);
    }
}

/**
 * Animation loop
 */
function startAnimation() {
    let lastTime = performance.now();

    function animate() {
        if (!scene || !camera || !renderer) return;

        const currentTime = performance.now();
        const delta = (currentTime - lastTime) / 1000; // seconds
        lastTime = currentTime;

        // Update movement
        updateMovement(delta);

        // Render scene
        renderer.render(scene, camera);

        animationFrameId = requestAnimationFrame(animate);
    }

    animate();
}
