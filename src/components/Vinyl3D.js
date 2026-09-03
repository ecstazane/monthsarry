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
    
    // Physics & Rotation State
    this.isSpinning = false;
    this.currentRotationSpeed = 0;
    this.targetRotationSpeed = 0;
    this.maxRotationSpeed = 0.035;
    
    // Position & Transform Target States
    this.scrollProgress = 0;
    this.basePosition = { x: -2.2, y: 0.0, z: 0 };
    this.baseRotation = { x: 0.3, y: 0.35, z: -0.1 };

    this.rafId = null;
    this.clock = new THREE.Clock();
  }

  init(container) {
    this.container = container;

    // 1. Scene Setup
    this.scene = new THREE.Scene();

    // 2. Camera Setup
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 8);

    // 3. Renderer Setup
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

    // 4. Lighting Setup
    this.setupLighting();

    // 5. Create Concentric Vinyl Structure
    this.createVinylStructure();

    // 6. Responsive Handling
    window.addEventListener('resize', () => this.onResize());
    this.adjustLayoutForViewport();

    // 7. Start Render Loop
    this.animate();
  }

  setupLighting() {
    // Soft Ambient Light (starts dark)
    this.ambientLight = new THREE.AmbientLight(0xfff5e6, 0.12);
    this.scene.add(this.ambientLight);

    // Key Directional Light (starts dark)
    this.keyLight = new THREE.DirectionalLight(0xfff7ea, 0.25);
    this.keyLight.position.set(-4, 6, 6);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.width = 1024;
    this.keyLight.shadow.mapSize.height = 1024;
    this.scene.add(this.keyLight);

    // Warm Lampshade Spotlight
    this.lampSpotLight = new THREE.SpotLight(0xffe2a0, 0.1, 15, Math.PI / 3, 0.5, 1);
    this.lampSpotLight.position.set(-1.5, 5, 3);
    this.lampSpotLight.target.position.set(-2, 0, 0);
    this.scene.add(this.lampSpotLight);
    this.scene.add(this.lampSpotLight.target);

    // Specular Point Light
    this.pointLight = new THREE.PointLight(0xffffff, 0.2, 10);
    this.pointLight.position.set(-2, 2, 4);
    this.scene.add(this.pointLight);
  }

  setLightState(illuminated) {
    this.isIlluminated = illuminated;

    const duration = illuminated ? 1.8 : 1.2;
    const ease = illuminated ? 'power2.out' : 'power2.inOut';

    // GSAP animations with overwrite to handle rapid play/pause toggles cleanly
    gsap.to(this.ambientLight, {
      intensity: illuminated ? 1.1 : 0.12,
      duration: duration,
      ease: ease,
      overwrite: 'auto'
    });

    gsap.to(this.keyLight, {
      intensity: illuminated ? 2.8 : 0.25,
      duration: duration,
      ease: ease,
      overwrite: 'auto'
    });

    gsap.to(this.lampSpotLight, {
      intensity: illuminated ? 4.8 : 0.1,
      duration: illuminated ? 2.0 : 1.2,
      ease: ease,
      overwrite: 'auto'
    });

    gsap.to(this.pointLight, {
      intensity: illuminated ? 1.2 : 0.2,
      duration: duration,
      ease: ease,
      overwrite: 'auto'
    });
  }

  createVinylStructure() {
    this.vinylGroup = new THREE.Group();
    this.spinGroup = new THREE.Group();

    const vinylRadius = 2.4;
    const vinylThickness = 0.08;
    const labelRadius = 0.92;
    const holeRadius = 0.12;

    // 1. BLACK VINYL RECORD DISC
    const grooveTexture = this.generateGrooveTexture();

    const recordGeometry = new THREE.CylinderGeometry(vinylRadius, vinylRadius, vinylThickness, 128);
    const recordMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.32,
      metalness: 0.12,
      roughnessMap: grooveTexture,
      bumpMap: grooveTexture,
      bumpScale: 0.012,
      envMapIntensity: 1.2
    });

    const recordMesh = new THREE.Mesh(recordGeometry, recordMaterial);
    recordMesh.position.set(0, 0, 0);
    recordMesh.castShadow = true;
    recordMesh.receiveShadow = true;
    this.spinGroup.add(recordMesh);

    // 2. WHITE CENTER LABEL (PERFECTLY CONCENTRIC AT ORIGIN 0,0)
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

    // 3. BLACK CENTER HOLE (PERFECTLY CONCENTRIC AT ORIGIN 0,0)
    const holeGeometry = new THREE.CircleGeometry(holeRadius, 64);
    const holeMaterial = new THREE.MeshBasicMaterial({
      color: 0x080808,
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

    this.vinylGroup.position.set(this.basePosition.x, this.basePosition.y, this.basePosition.z);
    this.vinylGroup.rotation.set(this.baseRotation.x, this.baseRotation.y, this.baseRotation.z);

    this.scene.add(this.vinylGroup);
  }

  generateGrooveTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, 1024, 1024);

    const centerX = 512;
    const centerY = 512;

    ctx.lineWidth = 1.5;
    for (let r = 90; r < 500; r += 2.2) {
      const alpha = 0.25 + 0.45 * Math.sin(r * 0.35);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

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

    const centerX = 512;
    const centerY = 512;

    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 512, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#383630';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 480, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(centerX - 460, centerY);
    ctx.lineTo(centerX + 460, centerY);
    ctx.stroke();

    ctx.fillStyle = '#22211d';
    ctx.font = 'bold 56px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('STEREO', centerX - 240, centerY);

    ctx.font = '500 32px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('SIDE A', centerX + 240, centerY - 45);
    ctx.fillText('33 RPM', centerX + 240, centerY + 45);

    ctx.font = '600 36px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('BLESSED', centerX, centerY - 260);
    ctx.fillText('11TH MONTHSARY', centerX, centerY + 260);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    return texture;
  }

  setSpinning(spinning) {
    this.isSpinning = spinning;
    this.targetRotationSpeed = spinning ? this.maxRotationSpeed : 0;
  }

  updateScroll(progress) {
    this.scrollProgress = progress;

    if (!this.vinylGroup) return;

    const isMobile = window.innerWidth <= 768;

    if (progress < 0.3) {
      const p = progress / 0.3;
      const startX = isMobile ? -0.8 : this.basePosition.x;
      const targetX = isMobile ? -0.4 : -2.0;

      this.vinylGroup.position.x = THREE.MathUtils.lerp(startX, targetX, p);
      this.vinylGroup.position.y = THREE.MathUtils.lerp(this.basePosition.y, 0.1, p);
      this.vinylGroup.position.z = THREE.MathUtils.lerp(0, -0.8, p);

      this.vinylGroup.rotation.x = THREE.MathUtils.lerp(this.baseRotation.x, 0.35, p);
      this.vinylGroup.rotation.y = THREE.MathUtils.lerp(this.baseRotation.y, 0.2, p);
    } else {
      const p = (progress - 0.3) / 0.7;
      this.vinylGroup.position.x = THREE.MathUtils.lerp(-2.0, -1.2, p);
      this.vinylGroup.position.y = THREE.MathUtils.lerp(0.1, -0.4, p);
      this.vinylGroup.position.z = THREE.MathUtils.lerp(-0.8, -2.0, p);
      
      this.vinylGroup.rotation.x = THREE.MathUtils.lerp(0.35, 0.2, p);
      this.vinylGroup.rotation.y = THREE.MathUtils.lerp(0.2, 0.05, p);
    }
  }

  adjustLayoutForViewport() {
    if (!this.vinylGroup) return;
    const width = window.innerWidth;

    if (width <= 480) {
      this.basePosition = { x: -0.6, y: 1.1, z: -1.2 };
      this.vinylGroup.scale.set(0.72, 0.72, 0.72);
    } else if (width <= 768) {
      this.basePosition = { x: -1.5, y: 0.6, z: -0.6 };
      this.vinylGroup.scale.set(0.85, 0.85, 0.85);
    } else {
      this.basePosition = { x: -2.2, y: 0.0, z: 0 };
      this.vinylGroup.scale.set(1.0, 1.0, 1.0);
    }

    if (this.scrollProgress === 0) {
      this.vinylGroup.position.set(this.basePosition.x, this.basePosition.y, this.basePosition.z);
    }
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.adjustLayoutForViewport();
  }

  animate() {
    this.rafId = requestAnimationFrame(() => this.animate());

    this.currentRotationSpeed = THREE.MathUtils.lerp(
      this.currentRotationSpeed,
      this.targetRotationSpeed,
      0.035
    );

    if (this.spinGroup && Math.abs(this.currentRotationSpeed) > 0.0001) {
      this.spinGroup.rotation.y += this.currentRotationSpeed;
    }

    if (this.vinylGroup) {
      const time = this.clock.getElapsedTime();
      this.vinylGroup.position.y += Math.sin(time * 1.2) * 0.0006;
      
      if (this.pointLight && this.isIlluminated) {
        this.pointLight.position.x = -2 + Math.sin(time * 0.8) * 1.0;
        this.pointLight.position.y = 2 + Math.cos(time * 0.6) * 0.8;
      }
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
