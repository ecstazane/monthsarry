import * as THREE from 'three';
import gsap from 'gsap';

class Vinyl3DManager {
  constructor() {
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.vinylGroup = null;
    this.spinGroup = null;
    
    // Lights
    this.ambientLight = null;
    this.keyLight = null;
    this.lampSpotLight = null;
    this.pointLight = null;

    // Lighting state
    this.isIlluminated = false;
    
    // Spin state
    this.isSpinning = false;
    this.currentRotationSpeed = 0;
    this.targetRotationSpeed = 0;
    this.maxRotationSpeed = 0.025;

    this.rafId = null;
    this.clock = new THREE.Clock();
  }

  init(container) {
    this.container = container;

    // 1. Scene Setup
    this.scene = new THREE.Scene();

    // 2. Camera — looking straight down at the vinyl (top-down view like the reference)
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    // Position camera above and slightly in front, looking down
    this.camera.position.set(0, 9, 2.5);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    // 4. Lighting
    this.setupLighting();

    // 5. Vinyl
    this.createVinylStructure();

    // 6. Position vinyl to the left, partially off-screen (like the reference photo)
    this.positionVinyl();

    // 7. Resize handler
    window.addEventListener('resize', () => this.onResize());

    // 8. Start render loop
    this.animate();
  }

  setupLighting() {
    // Soft Ambient Light (starts dim for dark room)
    this.ambientLight = new THREE.AmbientLight(0xfff5e6, 0.15);
    this.scene.add(this.ambientLight);

    // Key Light from upper-left (like the reference — light catches the grooves)
    this.keyLight = new THREE.DirectionalLight(0xfff7ea, 0.3);
    this.keyLight.position.set(-5, 8, 4);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.scene.add(this.keyLight);

    // Warm Lampshade Spotlight
    this.lampSpotLight = new THREE.SpotLight(0xffe2a0, 0.1, 18, Math.PI / 3, 0.5, 1);
    this.lampSpotLight.position.set(-2, 8, 2);
    this.lampSpotLight.target.position.set(-2, 0, 0);
    this.scene.add(this.lampSpotLight);
    this.scene.add(this.lampSpotLight.target);

    // Specular rim light to catch groove edges
    this.pointLight = new THREE.PointLight(0xffffff, 0.2, 14);
    this.pointLight.position.set(2, 6, 3);
    this.scene.add(this.pointLight);
  }

  positionVinyl() {
    if (!this.vinylGroup) return;
    const w = window.innerWidth;

    if (w <= 480) {
      // Small phone — vinyl large, shifted far left & up
      this.vinylGroup.position.set(-3.2, 0, 0);
      this.vinylGroup.scale.set(1.3, 1.3, 1.3);
    } else if (w <= 768) {
      // Tablet / larger phone
      this.vinylGroup.position.set(-3.5, 0, 0);
      this.vinylGroup.scale.set(1.4, 1.4, 1.4);
    } else {
      // Desktop — vinyl large, cropped left like reference
      this.vinylGroup.position.set(-3.0, 0, 0);
      this.vinylGroup.scale.set(1.5, 1.5, 1.5);
    }
  }

  setLightState(illuminated) {
    this.isIlluminated = illuminated;

    const duration = illuminated ? 1.8 : 1.2;
    const ease = illuminated ? 'power2.out' : 'power2.inOut';

    gsap.to(this.ambientLight, {
      intensity: illuminated ? 1.2 : 0.15,
      duration, ease, overwrite: 'auto'
    });

    gsap.to(this.keyLight, {
      intensity: illuminated ? 3.0 : 0.3,
      duration, ease, overwrite: 'auto'
    });

    gsap.to(this.lampSpotLight, {
      intensity: illuminated ? 5.0 : 0.1,
      duration: illuminated ? 2.0 : 1.2,
      ease, overwrite: 'auto'
    });

    gsap.to(this.pointLight, {
      intensity: illuminated ? 1.4 : 0.2,
      duration, ease, overwrite: 'auto'
    });
  }

  createVinylStructure() {
    this.vinylGroup = new THREE.Group();
    this.spinGroup = new THREE.Group();

    const vinylRadius = 3.0;
    const vinylThickness = 0.1;
    const labelRadius = 1.15;
    const holeRadius = 0.15;

    // ── BLACK VINYL DISC ──
    const grooveTexture = this.generateGrooveTexture();

    const recordGeometry = new THREE.CylinderGeometry(vinylRadius, vinylRadius, vinylThickness, 128);
    const recordMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.28,
      metalness: 0.15,
      roughnessMap: grooveTexture,
      bumpMap: grooveTexture,
      bumpScale: 0.018,
      envMapIntensity: 1.4
    });

    const recordMesh = new THREE.Mesh(recordGeometry, recordMaterial);
    recordMesh.position.set(0, 0, 0);
    recordMesh.castShadow = true;
    recordMesh.receiveShadow = true;
    this.spinGroup.add(recordMesh);

    // ── OUTER RIM (subtle raised edge) ──
    const rimGeometry = new THREE.TorusGeometry(vinylRadius, 0.035, 16, 128);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x151515,
      roughness: 0.2,
      metalness: 0.3,
    });
    const rimMesh = new THREE.Mesh(rimGeometry, rimMaterial);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.set(0, 0, 0);
    this.spinGroup.add(rimMesh);

    // ── WHITE CENTER LABEL ──
    const labelTexture = this.generateLabelTexture();

    const labelGeometry = new THREE.CircleGeometry(labelRadius, 128);
    const labelMaterial = new THREE.MeshStandardMaterial({
      map: labelTexture,
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    const topLabelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
    topLabelMesh.rotation.x = -Math.PI / 2;
    topLabelMesh.position.set(0, vinylThickness / 2 + 0.001, 0);
    this.spinGroup.add(topLabelMesh);

    const botLabelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
    botLabelMesh.rotation.x = Math.PI / 2;
    botLabelMesh.position.set(0, -vinylThickness / 2 - 0.001, 0);
    this.spinGroup.add(botLabelMesh);

    // ── CENTER SPINDLE HOLE ──
    const holeGeometry = new THREE.CircleGeometry(holeRadius, 64);
    const holeMaterial = new THREE.MeshBasicMaterial({
      color: 0x060606,
      side: THREE.DoubleSide
    });

    const topHoleMesh = new THREE.Mesh(holeGeometry, holeMaterial);
    topHoleMesh.rotation.x = -Math.PI / 2;
    topHoleMesh.position.set(0, vinylThickness / 2 + 0.002, 0);
    this.spinGroup.add(topHoleMesh);

    const botHoleMesh = new THREE.Mesh(holeGeometry, holeMaterial);
    botHoleMesh.rotation.x = Math.PI / 2;
    botHoleMesh.position.set(0, -vinylThickness / 2 - 0.002, 0);
    this.spinGroup.add(botHoleMesh);

    this.vinylGroup.add(this.spinGroup);
    this.scene.add(this.vinylGroup);
  }

  generateGrooveTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Base dark surface
    ctx.fillStyle = '#222222';
    ctx.fillRect(0, 0, 1024, 1024);

    const cx = 512;
    const cy = 512;

    // Concentric groove rings — tighter spacing for realism
    for (let r = 100; r < 490; r += 1.8) {
      const alpha = 0.15 + 0.35 * Math.sin(r * 0.4);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Subtle radial scratches for realism
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const length = 100 + Math.random() * 350;
      const startR = 80 + Math.random() * 100;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * startR, cy + Math.sin(angle) * startR);
      ctx.lineTo(cx + Math.cos(angle) * (startR + length), cy + Math.sin(angle) * (startR + length));
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  generateLabelTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    const cx = 512;
    const cy = 512;

    // Off-white paper background
    ctx.fillStyle = '#f0ede5';
    ctx.beginPath();
    ctx.arc(cx, cy, 512, 0, Math.PI * 2);
    ctx.fill();

    // Subtle paper texture noise
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy < 512 * 512) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.04})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Outer border ring
    ctx.strokeStyle = '#2a2820';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 478, 0, Math.PI * 2);
    ctx.stroke();

    // Inner decorative ring
    ctx.strokeStyle = '#4a4840';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 440, 0, Math.PI * 2);
    ctx.stroke();

    // Horizontal divider line
    ctx.strokeStyle = '#2a2820';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 440, cy);
    ctx.lineTo(cx + 440, cy);
    ctx.stroke();

    // "STEREO" text on the left
    ctx.fillStyle = '#1e1d19';
    ctx.font = 'bold 52px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('STEREO', cx - 400, cy);

    // "SIDE A" and "33 RPM" on the right
    ctx.textAlign = 'right';
    ctx.font = '500 30px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('SIDE A', cx + 400, cy - 40);
    ctx.fillText('33 RPM', cx + 400, cy + 40);

    // Top text — song title
    ctx.textAlign = 'center';
    ctx.font = '600 38px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('CAPTIVATED', cx, cy - 200);

    // Bottom text — occasion
    ctx.font = '500 32px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('11TH MONTHSARY', cx, cy + 200);

    // Tiny credits text
    ctx.font = '400 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#5a5850';
    ctx.fillText('FOR BABY ♥', cx, cy + 300);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    return texture;
  }

  setSpinning(spinning) {
    this.isSpinning = spinning;
    this.targetRotationSpeed = spinning ? this.maxRotationSpeed : 0;
  }

  // No-op — vinyl stays fixed, no scroll movement
  updateScroll(_progress) {
    // Intentionally empty — vinyl only spins, does not move
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.positionVinyl();
  }

  animate() {
    this.rafId = requestAnimationFrame(() => this.animate());

    // Smooth spin acceleration/deceleration
    this.currentRotationSpeed = THREE.MathUtils.lerp(
      this.currentRotationSpeed,
      this.targetRotationSpeed,
      0.03
    );

    // Spin the vinyl around Y axis
    if (this.spinGroup && Math.abs(this.currentRotationSpeed) > 0.0001) {
      this.spinGroup.rotation.y += this.currentRotationSpeed;
    }

    // Subtle specular light movement when illuminated
    if (this.pointLight && this.isIlluminated) {
      const time = this.clock.getElapsedTime();
      this.pointLight.position.x = 2 + Math.sin(time * 0.6) * 0.8;
      this.pointLight.position.z = 3 + Math.cos(time * 0.4) * 0.5;
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.renderer && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

export const Vinyl3D = new Vinyl3DManager();
