import * as THREE from 'three';
import { MindARThree } from 'mindar-image-three';
import { GameAudio } from './audio.js';
import { Effects } from './effects.js';
import { Weapon } from './weapon.js';
import { EnemyFactory } from './enemy.js';
import { GameManager } from './game.js';

const container = document.querySelector('#ar-container');
const overlay = document.querySelector('#overlay');
const overlayTitle = document.querySelector('#overlay-title');
const overlayMessage = document.querySelector('#overlay-message');
const btnStart = document.querySelector('#btn-start');
const btnFire = document.querySelector('#btn-fire');
const btnReload = document.querySelector('#btn-reload');
const hud = document.querySelector('#hud');
const toastEl = document.querySelector('#toast');
const crosshair = document.querySelector('.crosshair');
const hudScore = document.querySelector('#hud-score');
const hudWave = document.querySelector('#hud-wave');
const hudHp = document.querySelector('#hud-hp');
const hudAmmo = document.querySelector('#hud-ammo');

const audio = new GameAudio();
const enemyFactory = new EnemyFactory();

let mindarThree = null;
let anchor = null;
let weapon = null;
let effects = null;
let game = null;
let clock = new THREE.Clock();
let cameraTargetLocal = new THREE.Vector3();
let started = false;
let assetsReady = false;

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.add('hidden'), 1400);
}

function setOverlay(title, message, buttonLabel = 'Start AR') {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  btnStart.textContent = buttonLabel;
  overlay.classList.remove('hidden');
}

function hideOverlay() {
  overlay.classList.add('hidden');
}

function updateHud({ score, wave, hp, ammo, mag }) {
  hudScore.textContent = String(score);
  hudWave.textContent = String(wave);
  hudHp.textContent = String(hp);
  if (ammo != null) {
    hudAmmo.textContent = `${ammo}/${mag ?? weapon?.magSize ?? 30}`;
  }
}

function clearEnemies() {
  if (!anchor || !game) return;
  for (const e of [...game.enemies]) {
    e.dispose(anchor.group);
  }
  game.enemies = [];
}

/** Measure tracked image width in world units (≈ meters). */
function measureTargetWorldWidth() {
  if (!anchor) return 0.3;
  const a = new THREE.Vector3(-0.5, 0, 0);
  const b = new THREE.Vector3(0.5, 0, 0);
  anchor.group.localToWorld(a);
  anchor.group.localToWorld(b);
  const w = a.distanceTo(b);
  return Number.isFinite(w) && w > 0.02 ? w : 0.3;
}

/**
 * Auto scale so orcs stay a readable size:
 * small physical target → boost scale; large target → cap.
 */
function computeEnemyVisualScale() {
  const targetW = measureTargetWorldWidth();
  // Aim for world height ≈ 85% of target width, clamped to ~28–75 cm
  const desiredWorldH = THREE.MathUtils.clamp(targetW * 0.85, 0.28, 0.75);
  const ws = new THREE.Vector3();
  anchor.group.getWorldScale(ws);
  const parentScale = Math.max(ws.x, ws.y, 0.01);
  const modelH = enemyFactory.baseHeight || 2;
  const scale = desiredWorldH / (modelH * parentScale);
  return THREE.MathUtils.clamp(scale, 0.12, 2.2);
}

function spawnEnemies(stats) {
  clearEnemies();
  const spawned = [];
  const visualScale = computeEnemyVisualScale();
  for (let i = 0; i < stats.count; i++) {
    const enemy = enemyFactory.spawn({
      position: new THREE.Vector3(0, 0, 0),
      hp: stats.hp,
      speed: stats.speed,
      visualScale,
      audio,
      onBite: () => game.onPlayerBitten(),
      onDeath: (e) => {
        e.dispose(anchor.group);
        game.onEnemyDeath(e, spawnEnemies);
      },
    });
    enemy.mixer.update(0.016);
    anchor.group.add(enemy.root);
    spawned.push(enemy);
  }
  return spawned;
}

function updateCameraChaseTarget() {
  // Project camera position into anchor local space, flatten to ground plane (y=0)
  const world = new THREE.Vector3();
  mindarThree.camera.getWorldPosition(world);
  anchor.group.worldToLocal(world);
  cameraTargetLocal.set(world.x, 0, world.z);
}

function flashCrosshair() {
  if (!crosshair) return;
  crosshair.classList.add('firing');
  clearTimeout(flashCrosshair._t);
  flashCrosshair._t = setTimeout(() => {
    crosshair.classList.remove('firing');
  }, 120);
}

function onFire() {
  if (!game?.running || !weapon) return;
  const result = weapon.fire(game.getHitTargets());
  if (result.fired) flashCrosshair();
  if (result.hit && result.object) {
    const enemy = result.object.userData.enemy;
    if (enemy?.alive) {
      effects.spawnHit(result.point);
      enemy.takeDamage(1);
    }
  }
}

let modelPaths = {
  enemy: 'assets/models/orc-enemy.glb',
  weapon: 'assets/models/fps-akm.glb',
  enemyRandom: false,
  enemyPicked: null,
  weaponRandom: false,
  weaponPicked: null,
};

async function loadModelConfig() {
  try {
    const res = await fetch('api/models.php?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    if (!data?.ok) return;

    modelPaths.enemyRandom = !!data.enemyRandom;
    modelPaths.weaponRandom = !!data.weaponRandom;

    if (modelPaths.enemyRandom) {
      const pool = Array.isArray(data.enemyCandidates) ? data.enemyCandidates : [];
      const pick = pool.length
        ? pool[Math.floor(Math.random() * pool.length)]
        : 'orc-enemy.glb';
      modelPaths.enemyPicked = pick;
      modelPaths.enemy = 'assets/models/' + pick;
    } else if (data.enemyUrl) {
      modelPaths.enemyPicked = data.config?.enemy || null;
      modelPaths.enemy = data.enemyUrl;
    }

    if (modelPaths.weaponRandom) {
      const pool = Array.isArray(data.weaponCandidates) ? data.weaponCandidates : [];
      const pick = pool.length
        ? pool[Math.floor(Math.random() * pool.length)]
        : 'fps-akm.glb';
      modelPaths.weaponPicked = pick;
      modelPaths.weapon = 'assets/models/' + pick;
    } else if (data.weaponUrl) {
      modelPaths.weaponPicked = data.config?.weapon || null;
      modelPaths.weapon = data.weaponUrl;
    }
  } catch (err) {
    console.warn('Model config load failed, using defaults', err);
  }
}

async function prepareAssets() {
  await loadModelConfig();
  await enemyFactory.load(modelPaths.enemy);
  assetsReady = true;
  const notes = [];
  if (modelPaths.enemyRandom && modelPaths.enemyPicked) {
    notes.push('ENEMY ' + String(modelPaths.enemyPicked).replace(/\.glb$/i, ''));
  }
  if (modelPaths.weaponRandom && modelPaths.weaponPicked) {
    notes.push('GUN ' + String(modelPaths.weaponPicked).replace(/\.glb$/i, ''));
  }
  if (notes.length) showToast(notes.join(' · '));
}

function installHdCameraPatch() {
  if (!navigator.mediaDevices?.getUserMedia || navigator.mediaDevices.__hdPatched) return;
  const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (constraints = {}) => {
    const build = (videoExtra) => {
      const next = { audio: false, ...constraints };
      const video = next.video === true || next.video == null ? {} : { ...next.video };
      Object.assign(video, videoExtra);
      // Soft ideals only — Android often throws OverconstrainedError on high `min`
      if (!video.width) video.width = { ideal: 1920 };
      if (!video.height) video.height = { ideal: 1080 };
      if (!video.frameRate) video.frameRate = { ideal: 30 };
      next.video = video;
      return next;
    };

    try {
      return await original(build({}));
    } catch (err) {
      // Fallback: drop resolution hints, keep facingMode / deviceId
      console.warn('getUserMedia HD failed, retrying basic constraints', err);
      const video = constraints.video === true || constraints.video == null ? {} : { ...constraints.video };
      delete video.width;
      delete video.height;
      delete video.frameRate;
      return original({ audio: false, video });
    }
  };
  navigator.mediaDevices.__hdPatched = true;
}

/** Prefer a real rear RGB camera on Android (skip depth / IR / virtual). */
async function pickAndroidBackCameraId() {
  if (!/Android/i.test(navigator.userAgent) || !navigator.mediaDevices?.enumerateDevices) {
    return null;
  }
  try {
    const warm = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' } },
    });
    warm.getTracks().forEach((t) => t.stop());
    // Android needs a beat to fully release the camera before MindAR re-opens it
    await new Promise((r) => setTimeout(r, 350));
  } catch (_) {
    /* ignore */
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const videos = devices.filter((d) => d.kind === 'videoinput');
  if (!videos.length) return null;

  const score = (label) => {
    const l = (label || '').toLowerCase();
    if (/depth|infrared|ir\b|tof|virtual|desense|metadata/.test(l)) return -100;
    if (/back|rear|environment|world|后置/.test(l)) return 50;
    if (/camera0|camera 0|0, facing back|facing back/.test(l)) return 40;
    if (/front|user|前置|selfie/.test(l)) return -50;
    return 0;
  };

  const ranked = [...videos].sort((a, b) => score(b.label) - score(a.label));
  const best = ranked[0];
  if (!best || score(best.label) < 0) return null;
  console.log('Android camera pick:', best.label, best.deviceId);
  return best.deviceId;
}

async function startAR() {
  await audio.unlock();
  await prepareAssets();
  installHdCameraPatch();

  if (!mindarThree) {
    // On Android, prefer facingMode over deviceId — deviceId often picks a bad lens
    let environmentDeviceId = null;
    if (!/Android/i.test(navigator.userAgent)) {
      environmentDeviceId = await pickAndroidBackCameraId();
    } else {
      // Still warm permission, but let MindAR use facingMode: environment
      try {
        const warm = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' } },
        });
        warm.getTracks().forEach((t) => t.stop());
        await new Promise((r) => setTimeout(r, 350));
      } catch (_) {
        /* ignore */
      }
    }

    mindarThree = new MindARThree({
      container,
      imageTargetSrc: document.body.dataset.mindSrc || 'assets/targets/targets.mind',
      uiLoading: 'yes',
      uiScanning: 'no',
      uiError: 'yes',
      // Easier lock on phones
      warmupTolerance: 1,
      missTolerance: 10,
      filterMinCF: 0.001,
      filterBeta: 1000,
      ...(environmentDeviceId ? { environmentDeviceId } : {}),
    });

    const { renderer, scene, camera } = mindarThree;
    scene.background = null;
    renderer.autoClear = true;
    renderer.setClearColor(0x000000, 0);
    if (typeof renderer.setClearAlpha === 'function') {
      renderer.setClearAlpha(0);
    }
    renderer.domElement.style.background = 'transparent';
    renderer.domElement.style.zIndex = '2';

    // Bright lighting for mobile PBR models
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const hemi = new THREE.HemisphereLight(0xffffff, 0x556655, 1.2);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(1, 2, 1);
    scene.add(dir);

    const gunLight = new THREE.PointLight(0xfff5e6, 1.2, 3, 2);
    gunLight.position.set(0.1, 0.15, 0.05);
    camera.add(gunLight);
    scene.add(camera);

    anchor = mindarThree.addAnchor(0);

    // Visible marker pad so tracking success is obvious
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 0.55),
      new THREE.MeshBasicMaterial({
        color: 0x3d8b5f,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.001;
    anchor.group.add(pad);

    effects = new Effects(scene);

    game = new GameManager({
      audio,
      onHud: updateHud,
      onToast: showToast,
      onGameOver: (score, wave) => {
        hud.classList.add('hidden');
        clearEnemies();
        clearInterval(btnFire._auto);
        setOverlay(
          'Game Over',
          `Score ${score} · Reached wave ${wave}. Keep the target in view and try again.`,
          'Restart'
        );
      },
    });

    weapon = new Weapon({
      camera,
      scene,
      audio,
      effects,
      onAmmoChange: (ammo, mag) => game.emitHud(ammo, mag),
    });
    await weapon.load(modelPaths.weapon);

    anchor.onTargetFound = () => {
      game.targetFound = true;
      showToast('TARGET LOCKED');
      if (game.running && game.wave === 0) {
        game.startFirstWave(spawnEnemies);
      }
    };
    anchor.onTargetLost = () => {
      game.targetFound = false;
      showToast('TARGET LOST');
    };

    clock = new THREE.Clock();
    await mindarThree.start();

    // Prefer sharper canvas on phones (MindAR also sets DPR; clamp for perf)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mindarThree.resize?.();

    const coverVideo = () => {
      const video = container.querySelector('video');
      if (!video || !video.videoWidth) return;
      const cw = container.clientWidth || window.innerWidth;
      const ch = container.clientHeight || window.innerHeight;
      const ratio = video.videoWidth / video.videoHeight;
      const containerRatio = cw / ch;
      let w;
      let h;
      if (ratio > containerRatio) {
        h = ch;
        w = h * ratio;
      } else {
        w = cw;
        h = w / ratio;
      }
      video.style.setProperty('width', `${w}px`, 'important');
      video.style.setProperty('height', `${h}px`, 'important');
      video.style.setProperty('top', `${(ch - h) / 2}px`, 'important');
      video.style.setProperty('left', `${(cw - w) / 2}px`, 'important');
      video.style.setProperty('transform', 'none', 'important');
      video.style.setProperty('object-fit', 'cover', 'important');
      video.style.setProperty('z-index', '1', 'important');
    };

    // Fix MindAR video stacking + ensure playback + fullscreen cover
    const video = container.querySelector('video');
    if (video) {
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.play().catch(() => {});
      const showRes = () => {
        coverVideo();
        if (video.videoWidth) {
          showToast(`CAM ${video.videoWidth}x${video.videoHeight}`);
        }
      };
      if (video.videoWidth) showRes();
      else video.addEventListener('loadedmetadata', showRes, { once: true });
    }
    coverVideo();
    window.addEventListener('resize', () => {
      mindarThree.resize?.();
      coverVideo();
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        mindarThree.resize?.();
        coverVideo();
      }, 250);
    });

    renderer.domElement.style.zIndex = '2';
    if (mindarThree.cssRenderer?.domElement) {
      const cssEl = mindarThree.cssRenderer.domElement;
      cssEl.style.zIndex = '3';
      cssEl.style.pointerEvents = 'none';
      cssEl.style.background = 'transparent';
    }

    renderer.setAnimationLoop(() => {
      // Re-assert transparent clear every frame (some builds reset it)
      renderer.setClearColor(0x000000, 0);
      const dt = Math.min(clock.getDelta(), 0.05);
      weapon?.update(dt);
      effects?.update(dt);

      if (game?.running && game.targetFound && anchor) {
        updateCameraChaseTarget();
        for (const e of game.enemies) {
          e.update(cameraTargetLocal, dt);
        }
      }

      renderer.render(scene, camera);
    });
  } else {
    // Restart path: MindAR already initialized
    try {
      await mindarThree.start();
    } catch (_) {
      // already running
    }
    // Re-roll random weapon (and refresh model if selection changed)
    if (weapon && modelPaths.weapon) {
      await weapon.load(modelPaths.weapon);
    }
  }

  // Reset weapon ammo / state
  if (weapon) {
    weapon.ammo = weapon.magSize;
    weapon.reloading = false;
    weapon.cooldown = 0;
    weapon.play('idle');
    weapon.onAmmoChange?.(weapon.ammo, weapon.magSize);
  }

  game.reset();
  clearEnemies();
  hud.classList.remove('hidden');
  hideOverlay();
  started = true;

  if (game.targetFound) {
    game.startFirstWave(spawnEnemies);
  } else {
    showToast('SCAN TARGET IMAGE');
  }
}

btnStart.addEventListener('click', async () => {
  btnStart.disabled = true;
  const prevLabel = btnStart.textContent;
  btnStart.textContent = 'Loading…';
  try {
    await startAR();
    btnStart.textContent = 'Restart';
  } catch (err) {
    console.error(err);
    setOverlay(
      'Failed to start',
      String(err?.message || err).includes('targets.mind') || String(err?.message || err).includes('404')
        ? 'Missing targets.mind. Open compile-target.php once to generate it, then retry.'
        : `Could not start AR: ${err?.message || err}. Use localhost/HTTPS and allow camera.`,
      'Retry'
    );
    btnStart.textContent = prevLabel || 'Start AR';
  } finally {
    btnStart.disabled = false;
  }
});

btnFire.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  onFire();
  // Hold-to-fire for mobile
  clearInterval(btnFire._auto);
  btnFire._auto = setInterval(onFire, 140);
});
const stopAutoFire = () => clearInterval(btnFire._auto);
btnFire.addEventListener('pointerup', stopAutoFire);
btnFire.addEventListener('pointerleave', stopAutoFire);
btnFire.addEventListener('pointercancel', stopAutoFire);

btnReload.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  weapon?.tryReload();
});

// Desktop: click the AR view to fire (ignore HUD controls)
container.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.btn-fire, .btn-reload, .overlay, .btn')) return;
  onFire();
});

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'KeyF') {
    e.preventDefault();
    onFire();
  }
  if (e.code === 'KeyR') {
    weapon?.tryReload();
  }
});

// Preflight: warn if targets.mind is missing
fetch('assets/targets/targets.mind', { method: 'HEAD' })
  .then((r) => {
    if (!r.ok) {
      setOverlay(
        'Target missing',
        'assets/targets/targets.mind was not found. Open compile-target.php once to generate it.',
        'Retry'
      );
    }
  })
  .catch(() => {});
