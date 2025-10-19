/**
 * Galaxy Particle System Component
 * Handles particle creation, positioning, and management
 * Extracted from galaxyView.js for better modularity
 */

// Three.js is loaded globally via script tags in index.html
// Using global THREE object

export class GalaxyParticleSystem {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.particleSystem = null;
        this.particles = [];

        // Default particle settings
        this.particleSize = options.particleSize || 17.5;
        this.particleShape = options.particleShape || 'circle';
        this.particleBrightness = options.particleBrightness || 0.8;
        this.particlesPerCluster = options.particlesPerCluster || 48;
        this.clusterRadius = options.clusterRadius || 10;
        this.subParticleScale = options.subParticleScale || 0.3;
        this.mainToSubSizeRatio = options.mainToSubSizeRatio || 2.0;
        this.subParticleShape = options.subParticleShape || 'default';
        this.densityGradient = options.densityGradient || 0.0;
        this.maxParticleCount = options.maxParticleCount || 0;

        // Axis scales
        this.xAxisScale = options.xAxisScale || 1.0;
        this.yAxisScale = options.yAxisScale || 1.0;
        this.zAxisScale = options.zAxisScale || 1.0;

        // Visualization modes
        this.currentColorMode = options.colorMode || 'tags';
        this.currentXMode = options.xMode || 'bpm';
        this.currentYMode = options.yMode || 'key';
        this.currentZMode = options.zMode || 'tags';

        // Color mapping
        this.tagColors = {};
        this.colorIndex = 0;
        this.availableColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#FD79A8', '#A29BFE', '#6C5CE7', '#74B9FF', '#00B894',
            '#FDCB6E', '#E17055', '#00CEC9', '#FF7675', '#55A3FF'
        ];
    }

    /**
     * Create particles from audio files
     */
    createParticles(audioFiles) {
        if (!this.scene) return;

        // Clear existing particles
        this.clearParticles();

        // Calculate particles needed
        const densityAddition = Math.floor(this.densityGradient * this.particlesPerCluster);
        const totalParticlesPerCluster = this.particlesPerCluster + densityAddition;

        let totalParticles = audioFiles.length * totalParticlesPerCluster;

        // Apply max particle limit if set
        if (this.maxParticleCount > 0 && totalParticles > this.maxParticleCount) {
            totalParticles = this.maxParticleCount;
        }

        // Create geometry and material
        const geometry = new THREE.PlaneGeometry(1, 1);
        const texture = this.createParticleTexture(this.particleShape);

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: this.particleBrightness,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        // Create instanced mesh
        this.particleSystem = new THREE.InstancedMesh(geometry, material, totalParticles);
        this.particleSystem.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        let instanceIndex = 0;

        // Create particle clusters
        audioFiles.forEach((file, fileIndex) => {
            const position = this.calculateFilePosition(file, fileIndex);
            const fileColor = this.getColorForFile(file);

            const cluster = {
                file: file,
                centerPosition: new THREE.Vector3(position.x, position.y, position.z),
                color: fileColor,
                subParticles: [],
                hoverEffect: 0,
                audioScale: 1,
                sizeMultiplier: 1,
                opacityMultiplier: 1
            };

            // Create sub-particles for this cluster
            for (let i = 0; i < totalParticlesPerCluster && instanceIndex < totalParticles; i++) {
                const isCenterParticle = (i === 0);
                let offset = new THREE.Vector3();
                let particleRadius = 1;

                if (!isCenterParticle) {
                    // Create offset for sub-particles
                    particleRadius = Math.random() * 0.8 + 0.2;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    offset.set(
                        Math.sin(phi) * Math.cos(theta) * this.clusterRadius * particleRadius,
                        Math.sin(phi) * Math.sin(theta) * this.clusterRadius * particleRadius,
                        Math.cos(phi) * this.clusterRadius * particleRadius
                    );
                }

                const subParticle = {
                    offset: offset,
                    baseRadius: particleRadius,
                    phase: Math.random() * Math.PI * 2,
                    isCenterParticle: isCenterParticle,
                    instanceIndex: instanceIndex
                };

                cluster.subParticles.push(subParticle);

                // Set initial transform
                dummy.position.copy(cluster.centerPosition).add(offset);
                const scale = isCenterParticle ? this.particleSize : this.particleSize * this.subParticleScale;
                dummy.scale.set(scale, scale, 1);
                dummy.updateMatrix();

                this.particleSystem.setMatrixAt(instanceIndex, dummy.matrix);
                this.particleSystem.setColorAt(instanceIndex, color.set(fileColor));

                instanceIndex++;
            }

            this.particles.push(cluster);
        });

        this.particleSystem.instanceMatrix.needsUpdate = true;
        if (this.particleSystem.instanceColor) {
            this.particleSystem.instanceColor.needsUpdate = true;
        }

        this.scene.add(this.particleSystem);

        // Expose to window for controls
        window.particles = this.particles;
        window.particleSystem = this.particleSystem;
    }

    /**
     * Clear existing particles
     */
    clearParticles() {
        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
            if (this.particleSystem.geometry) this.particleSystem.geometry.dispose();
            if (this.particleSystem.material) {
                if (this.particleSystem.material.map) this.particleSystem.material.map.dispose();
                this.particleSystem.material.dispose();
            }
            this.particleSystem = null;
        }
        this.particles = [];
    }

    /**
     * Calculate position for a file based on visualization modes
     */
    calculateFilePosition(file, index) {
        const getAxisValue = (mode, file, index) => {
            switch (mode) {
                case 'bpm':
                    return file.bpm ? (file.bpm - 120) * 2 : Math.random() * 100 - 50;
                case 'key':
                    const keyMap = {
                        'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
                        'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
                    };
                    const key = file.key?.replace('maj', '').replace('min', '').trim();
                    return keyMap[key] !== undefined ? (keyMap[key] - 6) * 15 : Math.random() * 100 - 50;
                case 'duration':
                    return file.duration ? (file.duration - 180) * 0.5 : Math.random() * 100 - 50;
                case 'tags':
                    const tagHash = file.tags?.join('').split('').reduce((a, b) => a + b.charCodeAt(0), 0) || 0;
                    return (tagHash % 200) - 100;
                case 'random':
                default:
                    return Math.random() * 200 - 100;
            }
        };

        return {
            x: getAxisValue(this.currentXMode, file, index) * this.xAxisScale,
            y: getAxisValue(this.currentYMode, file, index) * this.yAxisScale,
            z: getAxisValue(this.currentZMode, file, index) * this.zAxisScale
        };
    }

    /**
     * Get color for a file based on visualization mode
     */
    getColorForFile(file) {
        switch (this.currentColorMode) {
            case 'tags':
                const tag = file.tags?.[0] || 'default';
                if (!this.tagColors[tag]) {
                    this.tagColors[tag] = this.availableColors[this.colorIndex % this.availableColors.length];
                    this.colorIndex++;
                }
                return this.tagColors[tag];

            case 'bpm':
                const bpm = file.bpm || 120;
                const hue = (bpm - 60) / 140; // Normalize 60-200 BPM to 0-1
                return new THREE.Color().setHSL(hue, 0.7, 0.5);

            case 'key':
                const keyColors = {
                    'C': '#FF0000', 'G': '#FFA500', 'D': '#FFFF00',
                    'A': '#00FF00', 'E': '#0000FF', 'B': '#4B0082',
                    'F': '#8B00FF', 'Bb': '#FF1493', 'Eb': '#00CED1',
                    'Ab': '#FFD700', 'Db': '#32CD32', 'Gb': '#FF69B4'
                };
                const key = file.key?.replace('maj', '').replace('min', '').trim();
                return keyColors[key] || '#FFFFFF';

            case 'duration':
                const duration = file.duration || 180;
                const intensity = Math.min(duration / 300, 1); // Normalize to 0-1
                return new THREE.Color(intensity, 1 - intensity, 0.5);

            case 'random':
            default:
                return this.availableColors[Math.floor(Math.random() * this.availableColors.length)];
        }
    }

    /**
     * Create particle texture based on shape
     */
    createParticleTexture(shape) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = canvas.width / 2;

        // Create gradient
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        switch (shape) {
            case 'circle':
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
                break;

            case 'square':
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                break;

            case 'diamond':
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.rotate(Math.PI / 4);
                ctx.fillStyle = gradient;
                ctx.fillRect(-radius * 0.7, -radius * 0.7, radius * 1.4, radius * 1.4);
                ctx.restore();
                break;

            case 'star':
                this.drawStar(ctx, centerX, centerY, 5, radius * 0.8, radius * 0.4, gradient);
                break;

            default:
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Helper to draw star shape
     */
    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, fillStyle) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);

        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }

        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();
    }

    /**
     * Update cluster positions when axis scales change
     */
    updateClusterPositions() {
        if (this.particles.length === 0) return;

        this.particles.forEach((cluster, index) => {
            const newPos = this.calculateFilePosition(cluster.file, index);
            cluster.centerPosition.set(newPos.x, newPos.y, newPos.z);
        });
    }

    /**
     * Update particle settings
     */
    updateSettings(settings) {
        Object.assign(this, settings);

        // Update material if needed
        if (this.particleSystem && this.particleSystem.material) {
            if (settings.particleBrightness !== undefined) {
                // Clamp brightness to valid opacity range (0-1)
                const opacity = Math.max(0, Math.min(1, this.particleBrightness));
                this.particleSystem.material.opacity = opacity;
                console.log('[ParticleSystem] Updated brightness:', this.particleBrightness, '→ opacity:', opacity);
            }

            if (settings.particleShape !== undefined) {
                const newTexture = this.createParticleTexture(this.particleShape);
                if (this.particleSystem.material.map) {
                    this.particleSystem.material.map.dispose();
                }
                this.particleSystem.material.map = newTexture;
                this.particleSystem.material.needsUpdate = true;
            }
        }

        // Update axis scales
        if (settings.xAxisScale !== undefined || settings.yAxisScale !== undefined || settings.zAxisScale !== undefined) {
            this.updateClusterPositions();
        }

        // Recreate if particle count changed
        if (settings.particlesPerCluster !== undefined) {
            const audioFiles = window.audioFiles || [];
            if (audioFiles.length > 0) {
                this.createParticles(audioFiles);
            }
        }
    }
}

// Export for use in other modules
export default GalaxyParticleSystem;