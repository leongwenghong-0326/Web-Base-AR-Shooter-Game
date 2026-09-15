import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

/**
 * Quaternius packs differ:
 * - Bite set: Idle / Walk / Bite_Front / HitRecieve
 * - Punch set: Idle / Walk|Run / Punch / HitReact
 * - Fly set: Flying_Idle / Fast_Flying / Headbutt|Punch / HitReact
 */
function pickClip(clips, preferredNeedles) {
  const lowerNames = clips.map((c) => ({
    clip: c,
    name: c.name.toLowerCase(),
  }));
  for (const needle of preferredNeedles) {
    const n = needle.toLowerCase();
    // Prefer clip whose trailing action name equals needle (after |)
    const exact = lowerNames.find((x) => {
      const tail = x.name.includes('|') ? x.name.split('|').pop() : x.name;
      return tail === n || tail.replace(/_/g, '') === n.replace(/_/g, '');
    });
    if (exact) return exact.clip;
    const soft = lowerNames.find((x) => x.name.includes(n));
    if (soft) return soft.clip;
  }
  return null;
}

function bindAction(mixer, clip, { once = false } = {}) {
  if (!clip) return null;
  const action = mixer.clipAction(clip);
  if (once) {
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
  }
  return action;
}

export class Enemy {
  constructor({
    model,
    animations,
    position,
    hp,
    speed,
    onBite,
    onDeath,
    audio,
    visualScale = 0.5,
  }) {
    this.root = new THREE.Group();
    this.root.position.copy(position);

    this.model = model;
    this.root.add(model);
    this.visualScale = visualScale;

    const scaleRatio = visualScale / 0.5;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed * Math.max(0.65, Math.min(1.35, scaleRatio));
    this.onBite = onBite;
    this.onDeath = onDeath;
    this.audio = audio;

    this.state = 'idle';
    this.alive = true;
    this.attackCooldown = 0;
    this.hitStun = 0;
    this.biteRange = 3 * scaleRatio;
    this.attackInterval = 1.15;

    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    this.current = null;

    const idleClip = pickClip(animations, ['idle', 'flying_idle']);
    const walkClip = pickClip(animations, ['walk', 'run', 'fast_flying']);
    const attackClip = pickClip(animations, ['bite_front', 'bite', 'punch', 'headbutt']);
    const hitClip = pickClip(animations, ['hitrecieve', 'hitreact', 'hit']);
    const deathClip = pickClip(animations, ['death']);

    this.actions.idle = bindAction(this.mixer, idleClip);
    this.actions.walk = bindAction(this.mixer, walkClip) || this.actions.idle;
    this.actions.bite = bindAction(this.mixer, attackClip, { once: true });
    this.actions.hit = bindAction(this.mixer, hitClip, { once: true });
    this.actions.death = bindAction(this.mixer, deathClip, { once: true });

    this.mixer.addEventListener('finished', (e) => {
      if (!this.alive && e.action === this.actions.death) {
        this.onDeath?.(this);
        return;
      }
      if (e.action === this.actions.hit && this.alive) {
        this.hitStun = 0;
        this.play(this.state === 'walk' ? 'walk' : 'idle');
      }
      if (e.action === this.actions.bite && this.alive) {
        this.play('idle');
      }
    });

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 7.5, 4.5),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    box.position.y = 3.4 * scaleRatio;
    box.scale.setScalar(scaleRatio);
    box.userData.enemy = this;
    this.hitbox = box;
    this.root.add(box);

    this.play('idle');
  }

  play(name) {
    const next = this.actions[name];
    if (!next) return;
    if (this.current === next && next.isRunning()) return;
    if (this.current && this.current !== next) {
      this.current.fadeOut(0.1);
    }
    next.reset().fadeIn(0.08).play();
    if (name === 'death' || name === 'hit' || name === 'bite') {
      next.setEffectiveWeight(1);
    }
    this.current = next;
  }

  takeDamage(amount = 1) {
    if (!this.alive) return false;
    this.hp -= amount;
    this.audio?.hit();
    if (this.hp <= 0) {
      this.alive = false;
      this.state = 'death';
      this.audio?.death();
      this.play('death');
      if (!this.actions.death) {
        this.onDeath?.(this);
      }
      return true;
    }
    this.hitStun = 0.35;
    this.play('hit');
    return false;
  }

  /**
   * @param {THREE.Vector3} targetPos anchor-local position to chase
   * @param {number} dt
   */
  update(targetPos, dt) {
    this.mixer.update(dt);
    if (!this.alive) return;

    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.hitStun > 0) {
      this.hitStun -= dt;
      return;
    }

    const pos = this.root.position;
    const dx = targetPos.x - pos.x;
    const dz = targetPos.z - pos.z;
    const dist = Math.hypot(dx, dz);

    if (dist > 0.001) {
      this.root.rotation.y = Math.atan2(dx, dz);
    }

    if (dist > this.biteRange) {
      const step = Math.min(this.speed * dt, dist);
      pos.x += (dx / dist) * step;
      pos.z += (dz / dist) * step;
      this.state = 'walk';
      this.play('walk');
    } else {
      this.state = 'attack';
      if (this.attackCooldown <= 0) {
        this.attackCooldown = this.attackInterval;
        this.play('bite');
        this.audio?.bite();
        this.onBite?.(this);
      } else {
        this.play('idle');
      }
    }
  }

  dispose(parent) {
    parent.remove(this.root);
    this.root.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
        else obj.material?.dispose?.();
      }
    });
  }
}

export class EnemyFactory {
  constructor() {
    this.template = null;
    this.animations = [];
    this.baseHeight = 2;
  }

  async load(url = 'assets/models/orc-enemy.glb') {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    this.template = gltf.scene;
    this.animations = gltf.animations || [];
    this.template.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.castShadow = false;
      obj.frustumCulled = false;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      const android = /Android/i.test(navigator.userAgent);
      const next = mats.map((m) => {
        if (!m) return m;
        const color = m.color ? m.color.clone() : new THREE.Color(0x4a7a3a);
        const map = m.map || null;
        if (android) {
          return new THREE.MeshBasicMaterial({
            color,
            map,
            side: THREE.DoubleSide,
          });
        }
        return new THREE.MeshLambertMaterial({
          color,
          map,
          side: THREE.DoubleSide,
          emissive: new THREE.Color(0x223322),
          emissiveIntensity: 0.35,
        });
      });
      obj.material = next.length === 1 ? next[0] : next;
    });

    const box = new THREE.Box3().setFromObject(this.template);
    const size = new THREE.Vector3();
    box.getSize(size);
    // Skinned GLBs often report bad bounds — keep a sane reference height
    this.baseHeight = size.y > 0.5 && size.y < 12 ? size.y : 2;
  }

  /**
   * @param {object} opts
   * @param {number} [opts.visualScale=0.5]
   */
  spawn(opts) {
    const visualScale = opts.visualScale ?? 0.5;
    const model = cloneSkinned(this.template);
    model.scale.setScalar(visualScale);
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);

    return new Enemy({
      model,
      animations: this.animations,
      ...opts,
      visualScale,
    });
  }
}
