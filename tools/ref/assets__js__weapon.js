import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MAG_SIZE = 30;
const FIRE_COOLDOWN = 0.12;
const IS_ANDROID = /Android/i.test(navigator.userAgent);
const IS_MOBILE = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || IS_ANDROID;

function findClip(clips, needle) {
  const lower = needle.toLowerCase();
  return clips.find((c) => c.name.toLowerCase().includes(lower)) || null;
}

function prepareMaterials(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = false;
    obj.receiveShadow = false;
    obj.frustumCulled = false;
    obj.renderOrder = 1000;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const nextMats = mats.map((m) => {
      if (!m) return m;
      const color = m.color ? m.color.clone() : new THREE.Color(0xcccccc);
      const map = m.map || null;
      // Unlit + no depth test so the viewmodel always draws on top
      return new THREE.MeshBasicMaterial({
        color,
        map,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      });
    });
    obj.material = nextMats.length === 1 ? nextMats[0] : nextMats;
  });
}

export class Weapon {
  constructor({ camera, scene, audio, effects, onAmmoChange }) {
    this.camera = camera;
    this.scene = scene;
    this.audio = audio;
    this.effects = effects;
    this.onAmmoChange = onAmmoChange;

    this.root = new THREE.Group();
    this.model = null;
    this.mixer = null;
    this.actions = {};
    this.current = null;
    this.ready = false;
    this.ammo = MAG_SIZE;
    this.reloading = false;
    this.cooldown = 0;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2(0, 0);

    // Center-bottom of the view
    this.localOffset = new THREE.Vector3(
      IS_MOBILE ? 0.06 : 0.04,
      IS_MOBILE ? -0.62 : -0.52,
      IS_ANDROID ? -1.05 : -0.95
    );
    this._camPos = new THREE.Vector3();
    this._camQuat = new THREE.Quaternion();
    this._camScale = new THREE.Vector3();
    this._worldOffset = new THREE.Vector3();
  }

  async load(url = 'assets/models/fps-akm.glb') {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    const model = gltf.scene;
    prepareMaterials(model);
    this.model = model;

    // Slightly smaller; yaw 110°
    const scale = IS_ANDROID ? 0.34 : IS_MOBILE ? 0.3 : 0.24;
    model.scale.setScalar(scale);
    model.rotation.set(0, (100 * Math.PI) / 180, 0);
    model.position.set(0, 0, 0);

    this.root.clear();
    this.root.add(model);
    this.root.visible = true;
    // Parent to SCENE and sync each frame — more reliable than camera.add with MindAR
    this.scene.add(this.root);
    this.effects.attachMuzzle(this.root, new THREE.Vector3(0, 0.02, -0.55));

    this.mixer = new THREE.AnimationMixer(model);
    const clips = gltf.animations || [];
    const idle = findClip(clips, 'idle');
    const shoot = findClip(clips, 'shoot');
    const reload = findClip(clips, 'reload');

    if (idle) this.actions.idle = this.mixer.clipAction(idle);
    if (shoot) {
      this.actions.shoot = this.mixer.clipAction(shoot);
      this.actions.shoot.setLoop(THREE.LoopOnce, 1);
      this.actions.shoot.clampWhenFinished = true;
    }
    if (reload) {
      this.actions.reload = this.mixer.clipAction(reload);
      this.actions.reload.setLoop(THREE.LoopOnce, 1);
      this.actions.reload.clampWhenFinished = true;
    }

    this.mixer.addEventListener('finished', (e) => {
      if (e.action === this.actions.reload) {
        this.reloading = false;
        this.ammo = MAG_SIZE;
        this.onAmmoChange?.(this.ammo, MAG_SIZE);
        this.play('idle');
      } else if (e.action === this.actions.shoot) {
        if (!this.reloading) this.play('idle');
      }
    });

    this.play('idle');
    this.mixer.update(0.016);
    this.syncToCamera();
    this.ready = true;
    this.onAmmoChange?.(this.ammo, MAG_SIZE);
  }

  /** Keep gun locked to the phone camera view every frame. */
  syncToCamera() {
    if (!this.camera || !this.root) return;
    this.camera.updateMatrixWorld(true);
    this.camera.matrixWorld.decompose(this._camPos, this._camQuat, this._camScale);

    // Push beyond near clip
    const near = Math.max(this.camera.near || 0.1, 0.05);
    const z = -Math.max(Math.abs(this.localOffset.z), near + 0.55);
    this._worldOffset.set(this.localOffset.x, this.localOffset.y, z);
    this._worldOffset.applyQuaternion(this._camQuat);

    this.root.position.copy(this._camPos).add(this._worldOffset);
    this.root.quaternion.copy(this._camQuat);
  }

  play(name) {
    const next = this.actions[name];
    if (!next) return;
    if (this.current === next && next.isRunning()) return;
    if (this.current && this.current !== next) {
      this.current.fadeOut(0.08);
    }
    next.reset().fadeIn(0.05).play();
    this.current = next;
  }

  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;
    this.mixer?.update(dt);
    this.syncToCamera();
  }

  tryReload() {
    if (!this.ready || this.reloading || this.ammo >= MAG_SIZE) return false;
    this.reloading = true;
    this.audio.reload();
    this.play('reload');
    if (!this.actions.reload) {
      setTimeout(() => {
        this.reloading = false;
        this.ammo = MAG_SIZE;
        this.onAmmoChange?.(this.ammo, MAG_SIZE);
        this.play('idle');
      }, 900);
    }
    return true;
  }

  fire(targets) {
    if (!this.ready || this.reloading) return { hit: false, fired: false };
    if (this.cooldown > 0) return { hit: false, fired: false };

    if (this.ammo <= 0) {
      this.audio.empty();
      this.tryReload();
      return { hit: false, fired: false };
    }

    this.ammo -= 1;
    this.cooldown = FIRE_COOLDOWN;
    this.onAmmoChange?.(this.ammo, MAG_SIZE);
    this.audio.shoot();
    this.effects.flashMuzzle();
    this.play('shoot');

    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(targets, true);
    if (hits.length > 0) {
      const h = hits[0];
      return { hit: true, fired: true, point: h.point.clone(), object: h.object };
    }
    return { hit: false, fired: true };
  }

  get magSize() {
    return MAG_SIZE;
  }
}
