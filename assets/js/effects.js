import * as THREE from 'three';

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.muzzleLight = new THREE.PointLight(0xffcc66, 0, 2.5, 2);
    this.muzzleLight.visible = false;
    scene.add(this.muzzleLight);

    this.sparks = [];
    this.muzzleFlashUntil = 0;
  }

  attachMuzzle(parent, localPos = new THREE.Vector3(0, 0.05, -0.55)) {
    parent.add(this.muzzleLight);
    this.muzzleLight.position.copy(localPos);
  }

  flashMuzzle(durationMs = 60) {
    this.muzzleLight.intensity = 3.2;
    this.muzzleLight.visible = true;
    this.muzzleFlashUntil = performance.now() + durationMs;
  }

  spawnHit(worldPos) {
    const geo = new THREE.SphereGeometry(0.025, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(worldPos);
    this.scene.add(mesh);
    this.sparks.push({
      mesh,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        Math.random() * 0.6 + 0.2,
        (Math.random() - 0.5) * 0.8
      ),
      life: 0.28,
    });

    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.012, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xffee88 })
      );
      p.position.copy(worldPos);
      this.scene.add(p);
      this.sparks.push({
        mesh: p,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.4,
          Math.random() * 1.1,
          (Math.random() - 0.5) * 1.4
        ),
        life: 0.2 + Math.random() * 0.15,
      });
    }
  }

  update(dt) {
    if (this.muzzleLight.visible && performance.now() > this.muzzleFlashUntil) {
      this.muzzleLight.intensity = 0;
      this.muzzleLight.visible = false;
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.vel.y -= 2.5 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.scale.multiplyScalar(0.96);
      if (s.life <= 0) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
        this.sparks.splice(i, 1);
      }
    }
  }
}
