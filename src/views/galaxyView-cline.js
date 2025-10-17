// Galaxy View - 3D particle visualization of audio library
// Displays audio files as particles in 3D space positioned by BPM and musical key

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let particles = [];
let raycaster, mouse;
let audioFiles = [];
let hoveredParticle = null;
let infoPanel = null;

// Musical key to color mapping (rainbow spectrum)
const keyColors = {
    'Cmaj': 0xff0000,    'Amin': 0xff0000,    // C - Red
    'C#maj': 0xff7f00,   'A#min': 0xff7f00,   // C# - Orange
    'Dmaj': 0xffff00,    'Bmin': 0xffff00,    // D - Yellow
    'D#maj': 0x7fff00,   'Cmin': 0x7fff00,    // D# - Chartreuse
    'Emaj': 0x00ff00,    'C#min': 0x00ff00,   // E - Green
    'Fmaj': 0x00ff7f,    'Dmin': 0x00ff7f,    // F - Spring Green
    'F#maj': 0x00ffff,   'D#min': 0x00ffff,   // F# - Cyan
    'Gmaj': 0x007fff,    'Emin': 0x007fff,    // G - Azure
    'G#maj': 0x0000ff,   'Fmin': 0x0000ff,    // G# - Blue
    'Amaj': 0x7f00ff,    'F#min': 0x7f00ff,   // A - Violet
    'A#maj': 0xff00ff,   'Gmin': 0xff00ff,    // A# - Magenta
    'Bmaj': 0xff007f,    'G#min': 0xff007f    // B - Rose
};

export async function init(data = {}) {
    console.log('Galaxy view initializing with data:', data);
    
    // Store audio files data
    audioFiles = data.audioFiles || [];
    console.log(`Galaxy view: ${audioFiles.length} files to visualize`);

    // Show galaxy container
    const container = document.getElementById('galaxyViewContainer');
    if (!container) {
        console.error('Galaxy view container not found');
        return;
    }
    
    container.style.display = 'block';
    container.innerHTML = ''; // Clear any existing content

    // Check if we have files to visualize
    if (audioFiles.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #999;">
                <h2 style="font-size: 2em; margin-bottom: 20px;">🌌 Galaxy View</h2>
                <p>No audio files to visualize. Upload some audio files first!</p>
            </div>
        `;
        return;
    }

    // Create Three.js scene
    initThreeJS(container);
    
    // Create particles for each audio file
    createParticles();
    
    // Create info panel for hover
    createInfoPanel(container);
    
    // Start animation loop
    animate();

    console.log('Galaxy view initialized with Three.js');
}

function initThreeJS(container) {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 50, 200);

    // Create camera
    const width = container.clientWidth;
    const height = container.clientHeight || 600;
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 20, 50);
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 150;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(0, 50, 50);
    scene.add(pointLight);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(100, 20, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Add axes helper
    const axesHelper = new THREE.AxesHelper(30);
    scene.add(axesHelper);

    // Setup raycaster for hover detection
    raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 2;
    mouse = new THREE.Vector2();

    // Add mouse move listener
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onMouseClick);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function createParticles() {
    // Calculate BPM and key ranges
    const bpms = audioFiles.map(f => f.bpm).filter(b => b);
    const minBPM = Math.min(...bpms, 60);
    const maxBPM = Math.max(...bpms, 200);

    // Key positions (12 chromatic notes)
    const keyPositions = {
        'C': 0, 'C#': 1, 'D': 2, 'D#': 3,
        'E': 4, 'F': 5, 'F#': 6, 'G': 7,
        'G#': 8, 'A': 9, 'A#': 10, 'B': 11
    };

    audioFiles.forEach(file => {
        // Position by BPM (X axis)
        const bpm = file.bpm || (minBPM + maxBPM) / 2;
        const x = ((bpm - minBPM) / (maxBPM - minBPM)) * 80 - 40;

        // Position by Key (Y axis)
        const keyMatch = file.key ? file.key.match(/^([A-G]#?)/i) : null;
        const keyNote = keyMatch ? keyMatch[1] : 'C';
        const keyPos = keyPositions[keyNote] || 0;
        const y = (keyPos - 5.5) * 6; // Center around 0, spread vertically

        // Random Z for visual interest
        const z = (Math.random() - 0.5) * 30;

        // Get color based on key
        const color = keyColors[file.key] || 0x888888;

        // Create particle geometry
        const geometry = new THREE.SphereGeometry(0.8, 16, 16);
        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.5,
            shininess: 100
        });
        
        const particle = new THREE.Mesh(geometry, material);
        particle.position.set(x, y, z);
        
        // Store file data on particle
        particle.userData = {
            file: file,
            originalEmissive: color,
            originalIntensity: 0.5
        };
        
        scene.add(particle);
        particles.push(particle);
    });

    console.log(`Created ${particles.length} particles`);
}

function createInfoPanel(container) {
    infoPanel = document.createElement('div');
    infoPanel.style.cssText = `
        position: absolute;
        top: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.85);
        border: 1px solid #4a9eff;
        border-radius: 8px;
        padding: 15px;
        color: white;
        font-family: monospace;
        font-size: 13px;
        pointer-events: none;
        display: none;
        max-width: 300px;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
    `;
    container.appendChild(infoPanel);
}

function onMouseMove(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(particles);

    // Reset previous hover
    if (hoveredParticle) {
        const mat = hoveredParticle.material;
        mat.emissiveIntensity = hoveredParticle.userData.originalIntensity;
        hoveredParticle.scale.set(1, 1, 1);
    }

    if (intersects.length > 0) {
        hoveredParticle = intersects[0].object;
        const file = hoveredParticle.userData.file;
        
        // Highlight particle
        hoveredParticle.material.emissiveIntensity = 1.5;
        hoveredParticle.scale.set(1.5, 1.5, 1.5);
        
        // Update info panel
        const tags = file.tags && file.tags.length > 0 ? file.tags.join(', ') : 'None';
        const bpm = file.bpm || 'Unknown';
        const key = file.key || 'Unknown';
        const length = file.length ? formatTime(file.length) : 'Unknown';
        
        infoPanel.innerHTML = `
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #4a9eff;">
                🎵 ${file.name}
            </div>
            <div style="line-height: 1.6;">
                <div>BPM: <span style="color: #10b981;">${bpm}</span></div>
                <div>Key: <span style="color: #f59e0b;">${key}</span></div>
                <div>Length: <span style="color: #8b5cf6;">${length}</span></div>
                <div style="margin-top: 6px;">Tags: <span style="color: #6ba3ff;">${tags}</span></div>
            </div>
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333; font-size: 11px; color: #666;">
                Click to load and play
            </div>
        `;
        infoPanel.style.display = 'block';
    } else {
        hoveredParticle = null;
        infoPanel.style.display = 'none';
    }
}

function onMouseClick(event) {
    if (hoveredParticle) {
        const file = hoveredParticle.userData.file;
        console.log('Clicked file:', file.name);
        
        // Load the audio file in the main player
        if (window.loadAudio && file.id) {
            window.loadAudio(file.id, true);
        }
    }
}

function onWindowResize() {
    const container = document.getElementById('galaxyViewContainer');
    if (!container || !camera || !renderer) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 600;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function animate() {
    requestAnimationFrame(animate);

    // Rotate particles slowly
    particles.forEach(particle => {
        particle.rotation.y += 0.005;
    });

    // Update controls
    if (controls) {
        controls.update();
    }

    // Render scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

export function update(data = {}) {
    console.log('Galaxy view update called with data:', data);
    
    // If audioFiles changed, recreate particles
    if (data.audioFiles && data.audioFiles !== audioFiles) {
        audioFiles = data.audioFiles;
        
        // Clear existing particles
        particles.forEach(particle => {
            scene.remove(particle);
            particle.geometry.dispose();
            particle.material.dispose();
        });
        particles = [];
        
        // Recreate particles
        if (audioFiles.length > 0) {
            createParticles();
        }
    }
}

export async function destroy() {
    console.log('Galaxy view destroying...');

    // Remove event listeners
    if (renderer && renderer.domElement) {
        renderer.domElement.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('click', onMouseClick);
    }
    window.removeEventListener('resize', onWindowResize);

    // Dispose of Three.js objects
    particles.forEach(particle => {
        if (particle.geometry) particle.geometry.dispose();
        if
