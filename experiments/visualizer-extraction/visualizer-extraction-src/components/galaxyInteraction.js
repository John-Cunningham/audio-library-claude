/**
 * Galaxy Interaction Component
 * Handles keyboard, mouse, and touch input for Galaxy View
 * Extracted for better modularity
 */

export class GalaxyInteraction {
    constructor(camera, renderer, container) {
        this.camera = camera;
        this.renderer = renderer;
        this.container = container;

        // Movement state
        this.keys = {};
        this.isShiftPressed = false;
        this.isPointerLocked = false;

        // Camera rotation
        this.yaw = 0;
        this.pitch = 0;
        this.lookSensitivity = 0.002;

        // Movement settings
        this.moveSpeed = 10;
        this.sprintMultiplier = 2;

        // Mouse state
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();

        // Touch/mobile detection
        this.isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

        // Bind event handlers
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onClick = this.onClick.bind(this);
        this.onPointerLockChange = this.onPointerLockChange.bind(this);

        // Setup event listeners
        this.setupEventListeners();

        // Expose to window for controls
        window.keys = this.keys;
        window.isShiftPressed = false;
        window.isPointerLocked = false;
        window.yaw = 0;
        window.pitch = 0;
    }

    setupEventListeners() {
        // Keyboard
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);

        // Mouse
        document.addEventListener('mousemove', this.onMouseMove);
        this.renderer.domElement.addEventListener('click', this.onClick);

        // Pointer lock (desktop only)
        if (!this.isMobile) {
            document.addEventListener('pointerlockchange', this.onPointerLockChange);
        }
    }

    onKeyDown(event) {
        console.log('[GalaxyInteraction] onKeyDown called, key:', event.key, 'target:', event.target.tagName);

        // Don't capture keys when typing in input fields
        if (event.target.matches('input, textarea')) {
            console.log('[GalaxyInteraction] Ignoring key - typing in input field');
            return;
        }

        this.keys[event.key.toLowerCase()] = true;
        window.keys = this.keys;

        if (event.shiftKey) {
            this.isShiftPressed = true;
            window.isShiftPressed = true;
        }

        // Space for play/pause
        if (event.key === ' ') {
            console.log('[GalaxyInteraction] Spacebar pressed, isPointerLocked:', this.isPointerLocked);
            console.log('[GalaxyInteraction] window.playPause exists:', !!window.playPause);
            event.preventDefault();
            if (window.playPause) {
                console.log('[GalaxyInteraction] Calling window.playPause()');
                window.playPause();
            } else {
                console.warn('[GalaxyInteraction] window.playPause not found!');
            }
        }

        // ESC to exit pointer lock
        if (event.key === 'Escape' && this.isPointerLocked) {
            document.exitPointerLock();
        }

        // Prevent arrow keys from scrolling
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault();
        }
    }

    onKeyUp(event) {
        this.keys[event.key.toLowerCase()] = false;
        window.keys = this.keys;

        if (!event.shiftKey) {
            this.isShiftPressed = false;
            window.isShiftPressed = false;
        }
    }

    onMouseMove(event) {
        if (this.isPointerLocked) {
            // FPS-style camera rotation when pointer locked
            const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
            const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

            this.yaw -= movementX * this.lookSensitivity * (window.lookSensitivity || 0.5);
            this.pitch -= movementY * this.lookSensitivity * (window.lookSensitivity || 0.5);

            // Clamp pitch
            this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));

            // Update window for other systems
            window.yaw = this.yaw;
            window.pitch = this.pitch;
        } else {
            // Update mouse position for raycasting when not locked
            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        }
    }

    onClick(event) {
        // Don't handle click if clicking on UI elements
        if (event.target.closest('.mode-controls, .options-menu')) {
            return;
        }

        if (!this.isPointerLocked && !this.isMobile) {
            // Request pointer lock on canvas click
            this.renderer.domElement.requestPointerLock();
        }

        // Handle particle clicks for file loading
        if (window.particles && window.particleSystem) {
            this.handleParticleClick();
        }
    }

    handleParticleClick() {
        // Use raycaster to detect clicked particles
        let rayOrigin, rayDirection;

        if (this.isPointerLocked) {
            // When pointer locked, ray from camera center (crosshair position)
            rayOrigin = this.camera.position.clone();
            rayDirection = new THREE.Vector3(0, 0, -1);
            rayDirection.applyQuaternion(this.camera.quaternion);
        } else {
            // When not locked, use mouse position
            this.raycaster.setFromCamera(this.mouse, this.camera);
            rayOrigin = this.raycaster.ray.origin;
            rayDirection = this.raycaster.ray.direction;
        }

        // Check for intersections with particles
        let closestDistance = Infinity;
        let closestFile = null;

        window.particles.forEach(cluster => {
            cluster.subParticles.forEach(subParticle => {
                const worldPos = cluster.centerPosition.clone().add(subParticle.offset);
                const distance = rayOrigin.distanceTo(worldPos);

                // Check if ray intersects particle (simplified sphere check)
                const toParticle = worldPos.clone().sub(rayOrigin);
                const projection = toParticle.dot(rayDirection);

                if (projection > 0) {
                    const closestPoint = rayOrigin.clone().add(rayDirection.clone().multiplyScalar(projection));
                    const particleDistance = closestPoint.distanceTo(worldPos);

                    const particleRadius = window.particleSize * 0.5;
                    if (particleDistance < particleRadius && distance < closestDistance) {
                        closestDistance = distance;
                        closestFile = cluster.file;
                    }
                }
            });
        });

        // Load the clicked file
        if (closestFile) {
            console.log('🎵 Loading file from Galaxy View:', closestFile.name);

            // loadAudio expects a fileId (number/string), not the file object
            if (window.loadAudio && closestFile.id !== undefined) {
                window.loadAudio(closestFile.id);
            } else if (window.loadAndPlayFile) {
                // Fallback if different function name is used
                window.loadAndPlayFile(closestFile);
            } else {
                console.error('No file loading function found');
            }
        }
    }

    onPointerLockChange() {
        this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
        window.isPointerLocked = this.isPointerLocked;

        // Update crosshair visibility
        const crosshair = document.querySelector('.crosshair');
        if (crosshair) {
            if (this.isPointerLocked && window.crosshairEnabled) {
                crosshair.style.display = 'block';
            } else {
                crosshair.style.display = 'none';
            }
        }

        console.log('Pointer lock:', this.isPointerLocked ? 'enabled' : 'disabled');
    }

    /**
     * Update camera movement based on input
     * Call this in the animation loop
     */
    updateCameraMovement() {
        // Apply rotation
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;

        // Calculate movement
        const direction = new THREE.Vector3();
        const forward = new THREE.Vector3(0, 0, -1);
        const right = new THREE.Vector3(1, 0, 0);

        forward.applyQuaternion(this.camera.quaternion);
        right.applyQuaternion(this.camera.quaternion);

        // WASD movement
        if (this.keys['w'] || this.keys['arrowup']) direction.add(forward);
        if (this.keys['s'] || this.keys['arrowdown']) direction.sub(forward);
        if (this.keys['a'] || this.keys['arrowleft']) direction.sub(right);
        if (this.keys['d'] || this.keys['arrowright']) direction.add(right);

        direction.normalize();

        // Apply movement with speed and sprint
        if (direction.length() > 0) {
            const speed = (window.moveSpeed || this.moveSpeed) * 0.1;
            const sprint = this.isShiftPressed ? this.sprintMultiplier : 1;

            this.camera.position.add(direction.multiplyScalar(speed * sprint));
        }

        // Vertical movement (Q/E or Page Up/Down)
        if (this.keys['q'] || this.keys['pageup']) {
            this.camera.position.y += (window.moveSpeed || this.moveSpeed) * 0.1;
        }
        if (this.keys['e'] || this.keys['pagedown']) {
            this.camera.position.y -= (window.moveSpeed || this.moveSpeed) * 0.1;
        }
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('mousemove', this.onMouseMove);
        this.renderer.domElement.removeEventListener('click', this.onClick);

        if (!this.isMobile) {
            document.removeEventListener('pointerlockchange', this.onPointerLockChange);
        }
    }
}

export default GalaxyInteraction;