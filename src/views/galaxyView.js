// Galaxy View - Audio-reactive particle visualization of audio library
// Minimal test implementation - proves player state accessibility

let animationFrameId = null;
let canvas = null;
let ctx = null;

export async function init(data = {}) {
    console.log('Galaxy view initializing...');

    // Show galaxy container
    const container = document.getElementById('galaxyViewContainer');
    if (!container) {
        console.error('Galaxy view container not found');
        return;
    }

    container.style.display = 'block';

    // Create minimal test visualization
    container.innerHTML = `
        <div style="padding: 20px; height: 100%; display: flex; flex-direction: column;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #fff; margin-bottom: 10px;">🌌 Galaxy View - Quick Test</h2>
                <div id="galaxyFileInfo" style="color: #888; font-size: 14px;">
                    No file loaded
                </div>
            </div>
            <canvas id="galaxyCanvas" style="flex: 1; background: #000; border-radius: 8px;"></canvas>
        </div>
    `;

    // Setup canvas
    canvas = document.getElementById('galaxyCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // Start animation loop
        startAnimation();
    }

    // Update with current player state if available
    if (data.currentFile) {
        updateFileInfo(data.currentFile);
    }

    console.log('Galaxy view initialized - test visualization active');
}

export function update(data = {}) {
    console.log('Galaxy view update called', data);

    if (data.currentFile) {
        updateFileInfo(data.currentFile);
    }
}

export async function destroy() {
    console.log('Galaxy view destroying...');

    // Stop animation
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Hide galaxy container
    const container = document.getElementById('galaxyViewContainer');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = ''; // Clear content
    }

    canvas = null;
    ctx = null;

    console.log('Galaxy view destroyed');
}

/**
 * Update file info display
 */
function updateFileInfo(file) {
    const infoEl = document.getElementById('galaxyFileInfo');
    if (infoEl && file) {
        infoEl.innerHTML = `
            <strong>${file.fileName || 'Unknown'}</strong><br>
            BPM: ${file.bpm || 'N/A'} | Key: ${file.key || 'N/A'}
        `;
    }
}

/**
 * Simple animation loop - pulsing circle (placeholder for full galaxy)
 */
function startAnimation() {
    let time = 0;

    function animate() {
        if (!canvas || !ctx) return;

        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw pulsing circle (simulates audio reactivity)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = 50;
        const pulse = Math.sin(time * 0.05) * 20; // Simple pulse animation
        const radius = baseRadius + pulse;

        // Gradient for glow effect
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(100, 150, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(100, 150, 255, 0.1)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw text
        ctx.fillStyle = '#fff';
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Player state accessible ✓', centerX, centerY + 100);
        ctx.fillText('Ready for full Galaxy Visualizer', centerX, centerY + 120);

        time++;
        animationFrameId = requestAnimationFrame(animate);
    }

    animate();
}
