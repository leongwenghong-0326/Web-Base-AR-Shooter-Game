import * as THREE from 'three';
import { GameAudio } from './audio.js';
import { Effects } from './effects.js';
import { Weapon } from './weapon.js?v=1789446000';
import { EnemyFactory } from './enemy.js';
import { GameManager } from './game.js';

/** Lazy-loaded - MindAR bundle is large and was blocking page ready. */
let MindARThree = null;
async function loadMindARThree() {
  if (MindARThree) return MindARThree;
  const mod = await import('mindar-image-three');
  MindARThree = mod.MindARThree;
  if (!MindARThree) throw new Error('MindAR failed to load (MindARThree missing).');
  return MindARThree;
}

const cfg = window.AR_GAME_CONFIG || {};
const container = document.getElementById('ar-root');
const startGate = document.getElementById('startGate');
const startError = document.getElementById('startError');
const btnStartAr = document.getElementById('btnStartAr');
const gameOverlay = document.getElementById('gameOverlay');
const gameOverEl = document.getElementById('gameOver');
const hud = document.getElementById('hud');
const hudScore = document.getElementById('hudScore');
const hudWave = document.getElementById('hudWave');
const hudHp = document.getElementById('hudHp');
const hudAmmo = document.getElementById('hudAmmo');
const crosshair = document.getElementById('crosshair');
const banner = document.getElementById('banner');
const btnFire = document.getElementById('btn-fire');
const btnReload = document.getElementById('btn-reload');
const btnRestart = document.getElementById('btnRestart');
const overScore = document.getElementById('overScore');
const overWave = document.getElementById('overWave');
const toastEl = document.getElementById('toast');

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
let bannerTimer = null;

const modelPaths = {
  enemy: 'assets/models/orc-enemy.glb',
  weapon: 'assets/models/fps-akm.glb',
  enemyRandom: false,
  enemyPicked: null,
  enemyPool: [],
  weaponRandom: false,
  weaponPicked: null,
  weaponPool: [],
};

function setLoadStatus(text) {
  if (btnStartAr) btnStartAr.textContent = text;
  showToast(text);
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(label + ' timed out (' + ms / 1000 + 's). Check WiFi / tunnel.'));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}


function showToast(text) {
  if (!toastEl) return;
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove('show'), 1600);
}

function showBanner(text, cls = '', ms = 1400) {
  if (!banner) return;
  banner.textContent = text;
  banner.className = 'banner show' + (cls ? ' ' + cls : '');
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => banner.classList.remove('show'), ms);
}

function showStartError(msg) {
  if (!startError) return;
  if (!msg) {
    startError.classList.add('hidden');
    startError.textContent = '';
    return;
  }
  startError.classList.remove('hidden');
  startError.textContent = msg;
}

function updateHud({ score, wave, hp, ammo, mag }) {
  if (hudScore) hudScore.textContent = String(score);
  if (hudWave) hudWave.textContent = String(wave);
  if (hudHp) hudHp.textContent = String(hp);
  if (ammo != null && hudAmmo) {
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

function measureTargetWorldWidth() {
  if (!anchor) return 0.3;
  const a = new THREE.Vector3(-0.5, 0, 0);
  const b = new THREE.Vector3(0.5, 0, 0);
  anchor.group.localToWorld(a);
  anchor.group.localToWorld(b);
  const w = a.distanceTo(b);
  return Number.isFinite(w) && w > 0.02 ? w : 0.3;
}

function computeEnemyVisualScale() {
  const targetW = measureTargetWorldWidth();
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
      position: new THREE.Vector3((i - (stats.count - 1) / 2) * 0.35, 0, 0),
      hp: stats.hp,
      speed: stats.speed,
      visualScale,
      audio,
      onBite: () => game.onPlayerBitten(),
      onDeath: (e) => {
        e.dispose(anchor.group);
        game.onEnemyDeath(e, spawnEnemiesAsync);
      },
    });
    enemy.mixer.update(0.016);
    anchor.group.add(enemy.root);
    spawned.push(enemy);
  }
  return spawned;
}

async function spawnEnemiesAsync(stats) {
  try {
    await rollEnemyIfRandom();
  } catch (err) {
    console.warn('Random enemy roll failed, keeping previous model', err);
  }
  return spawnEnemies(stats);
}

function updateCameraChaseTarget() {
  const world = new THREE.Vector3();
  mindarThree.camera.getWorldPosition(world);
  anchor.group.worldToLocal(world);
  cameraTargetLocal.set(world.x, 0, world.z);
}

function flashCrosshair() {
  if (!crosshair) return;
  crosshair.classList.add('is-firing');
  clearTimeout(flashCrosshair._t);
  flashCrosshair._t = setTimeout(() => crosshair.classList.remove('is-firing'), 120);
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

function modelFileUrl(filename) {
  const name = String(filename || '').replace(/^.*[\\/]/, '');
  return 'assets/models/' + name + (name.includes('?') ? '' : ('?t=' + Date.now()));
}

function pickRandom(pool, fallback) {
  const list = Array.isArray(pool) ? pool.filter(Boolean) : [];
  if (!list.length) return fallback;
  return list[Math.floor(Math.random() * list.length)];
}

async function loadModelConfig() {
  try {
    const res = await fetch((cfg.modelsApi || 'api/models.php') + '?t=' + Date.now(), { cache: 'no-store' });
    const data = await res.json();
    if (!data?.ok) return;

    modelPaths.enemyRandom = !!data.enemyRandom || String(data.config?.enemy || '').toLowerCase() === 'random';
    modelPaths.weaponRandom = !!data.weaponRandom || String(data.config?.weapon || '').toLowerCase() === 'random';
    modelPaths.enemyPool = Array.isArray(data.enemyCandidates) ? data.enemyCandidates.slice() : [];
    modelPaths.weaponPool = Array.isArray(data.weaponCandidates) ? data.weaponCandidates.slice() : [];

    if (modelPaths.enemyRandom) {
      const pick = pickRandom(modelPaths.enemyPool, 'orc-enemy.glb');
      modelPaths.enemyPicked = pick;
      modelPaths.enemy = modelFileUrl(pick);
    } else if (data.enemyUrl) {
      modelPaths.enemyPicked = data.config?.enemy || null;
      modelPaths.enemy = data.enemyUrl;
    }

    if (modelPaths.weaponRandom) {
      const pick = pickRandom(modelPaths.weaponPool, 'fps-akm.glb');
      modelPaths.weaponPicked = pick;
      modelPaths.weapon = modelFileUrl(pick);
    } else if (data.weaponUrl) {
      modelPaths.weaponPicked = data.config?.weapon || null;
      modelPaths.weapon = data.weaponUrl;
    }
  } catch (err) {
    console.warn('Model config load failed, using defaults', err);
  }
}

/** When enemy=random, roll a new GLB for this wave and reload the factory. */
async function rollEnemyIfRandom() {
  if (!modelPaths.enemyRandom) return false;
  const pick = pickRandom(modelPaths.enemyPool, modelPaths.enemyPicked || 'orc-enemy.glb');
  modelPaths.enemyPicked = pick;
  modelPaths.enemy = modelFileUrl(pick);
  await withTimeout(enemyFactory.load(modelPaths.enemy), 25000, 'Enemy model');
  showToast('RANDOM ENEMY: ' + String(pick).replace(/\.glb$/i, ''));
  return true;
}

async function prepareAssets() {
  setLoadStatus('Loading models...');
  await withTimeout(loadModelConfig(), 10000, 'Model config');
  try {
    await withTimeout(enemyFactory.load(modelPaths.enemy), 25000, 'Enemy model');
  } catch (err) {
    console.error(err);
    throw new Error('Unable to load selected enemy model. Please check the GLB file / network.');
  }
  const notes = [];
  if (modelPaths.enemyPicked) notes.push((modelPaths.enemyRandom ? 'RANDOM ENEMY: ' : 'Enemy: ') + String(modelPaths.enemyPicked).replace(/\.glb$/i, ''));
  if (modelPaths.weaponPicked) notes.push('Weapon: ' + String(modelPaths.weaponPicked).replace(/\.glb$/i, ''));
  if (notes.length) showToast(notes.join(' | '));
}

function installHdCameraPatch() {
  if (!navigator.mediaDevices?.getUserMedia || navigator.mediaDevices.__hdPatched) return;
  const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (constraints = {}) => {
    try {
      return await original({ audio: false, ...constraints });
    } catch (err) {
      console.warn('getUserMedia failed, retrying basic rear camera', err);
      return original({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
    }
  };
  navigator.mediaDevices.__hdPatched = true;
}

async function warmCamera() {
  // Intentionally no-op: opening then closing the camera before MindAR
  // breaks Start AR on many phones (second getUserMedia never opens).
}

function coverArVideo() {
  const video = container?.querySelector('video');
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
}

function bindArVideo() {
  const video = container?.querySelector('video');
  if (video) {
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.play().catch(() => {});
    if (video.videoWidth) coverArVideo();
    else video.addEventListener('loadedmetadata', coverArVideo, { once: true });
  }
  coverArVideo();
}

async function startAR() {
  if (!cfg.mindReady || !cfg.mindUrl) {
    throw new Error('Missing targets.mind. Open Compile page once to generate it, then retry.');
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera API unavailable. Open this page in Chrome or Safari (not in-app browser).');
  }
  if (!window.isSecureContext) {
    throw new Error('Camera needs HTTPS. Use the Cloudflare tunnel link.');
  }

  const ua = navigator.userAgent || '';
  if (/FBAN|FBAV|Instagram|Line\/|WhatsApp|MicroMessenger|TikTok/i.test(ua)) {
    throw new Error('Open in Chrome or Safari (not an in-app browser). Camera is blocked here.');
  }

  setLoadStatus('Unlocking audio...');
  await withTimeout(Promise.resolve(audio.unlock()), 5000, 'Audio unlock').catch(() => {});
  installHdCameraPatch();

  if (!mindarThree) {
    setLoadStatus('Loading AR engine...');
    const MindAR = await withTimeout(loadMindARThree(), 60000, 'MindAR download');
    setLoadStatus('Preparing AR...');
    mindarThree = new MindAR({
      container,
      imageTargetSrc: cfg.mindUrl,
      uiLoading: 'no',
      uiScanning: 'no',
      uiError: 'yes',
      warmupTolerance: 1,
      missTolerance: 10,
      filterMinCF: 0.001,
      filterBeta: 1000,
    });

    const { renderer, scene, camera } = mindarThree;
    scene.background = null;
    renderer.autoClear = true;
    renderer.setClearColor(0x000000, 0);
    if (typeof renderer.setClearAlpha === 'function') renderer.setClearAlpha(0);
    renderer.domElement.style.background = 'transparent';
    renderer.domElement.style.zIndex = '2';
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x556655, 1.2));
    const dir = new THREE.DirectionalLight(0xffffff, 1.1);
    dir.position.set(1, 2, 1);
    scene.add(dir);

    const gunLight = new THREE.PointLight(0xfff5e6, 1.2, 3, 2);
    gunLight.position.set(0.1, 0.15, 0.05);
    camera.add(gunLight);
    scene.add(camera);

    anchor = mindarThree.addAnchor(0);

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
      onToast: (t) => {
        showToast(t);
        if (String(t).startsWith('WAVE')) showBanner(t, 'wave', 1400);
      },
      onGameOver: (score, wave) => {
        gameOverlay.classList.add('hidden');
        hud.classList.add('hidden');
        clearEnemies();
        clearInterval(btnFire._auto);
        if (overScore) overScore.textContent = String(score);
        if (overWave) overWave.textContent = String(wave);
        gameOverEl.classList.remove('hidden');
      },
    });

    weapon = new Weapon({
      camera,
      scene,
      audio,
      effects,
      onAmmoChange: (ammo, mag) => game.emitHud(ammo, mag),
    });

    anchor.onTargetFound = () => {
      game.targetFound = true;
      showToast('TARGET LOCKED');
      showBanner('TARGET LOCKED', 'locked', 1400);
      if (game.running && game.wave === 0) {
        game.startFirstWave(spawnEnemiesAsync);
      }
    };
    anchor.onTargetLost = () => {
      game.targetFound = false;
      showToast('TARGET LOST');
      showBanner('TARGET LOST', 'lost', 1600);
    };

    clock = new THREE.Clock();

    // One camera request only - MindAR owns getUserMedia
    setLoadStatus('Allow camera...');
    await withTimeout(mindarThree.start(), 45000, 'MindAR camera start');
    bindArVideo();
    window.addEventListener('resize', () => {
      mindarThree.resize?.();
      coverArVideo();
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        mindarThree.resize?.();
        coverArVideo();
      }, 250);
    });

    renderer.domElement.style.zIndex = '2';
    renderer.setAnimationLoop(() => {
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

    startGate.classList.add('hidden');
    gameOverlay.classList.remove('hidden');
    hud.classList.remove('hidden');
    showToast('LOADING MODELS...');

    try {
      setLoadStatus('Loading models...');
      await prepareAssets();
    } catch (err) {
      console.error(err);
      throw new Error('Unable to load enemy model. Check network / tunnel, then retry.');
    }

    try {
      setLoadStatus('Loading weapon...');
      await withTimeout(weapon.load(modelPaths.weapon), 40000, 'Weapon model');
    } catch (err) {
      console.error(err);
      throw new Error('Unable to load weapon model. Check network / tunnel, then retry.');
    }
  } else {
    setLoadStatus('Allow camera...');
    await withTimeout(mindarThree.start(), 45000, 'MindAR camera start');
    bindArVideo();
    startGate.classList.add('hidden');
    gameOverlay.classList.remove('hidden');
    hud.classList.remove('hidden');
    try {
      await prepareAssets();
    } catch (_) {}
    if (weapon && modelPaths.weapon) {
      setLoadStatus('Loading weapon...');
      await withTimeout(weapon.load(modelPaths.weapon), 40000, 'Weapon model');
    }
  }

  if (weapon) {
    weapon.ammo = weapon.magSize;
    weapon.reloading = false;
    weapon.cooldown = 0;
    weapon.play('idle');
    weapon.onAmmoChange?.(weapon.ammo, weapon.magSize);
  }

  game.reset();
  clearEnemies();
  gameOverEl.classList.add('hidden');
  startGate.classList.add('hidden');
  gameOverlay.classList.remove('hidden');
  hud.classList.remove('hidden');
  started = true;

  if (game.targetFound) {
    game.startFirstWave(spawnEnemiesAsync);
  } else {
    showToast('SCAN TARGET IMAGE');
    showBanner('SCAN TARGET', 'lost', 2000);
  }
}

let starting = false;
async function handleStart() {
  if (!btnStartAr || starting) return;
  starting = true;
  btnStartAr.disabled = true;
  const prev = btnStartAr.textContent;
  setLoadStatus('Starting...');
  showStartError('');
  try {
    await startAR();
    btnStartAr.textContent = 'Restart';
  } catch (err) {
    console.error(err);
    let msg = err?.message || String(err);
    if (err?.name === 'NotAllowedError') msg = 'Camera permission denied. Allow camera and try again.';
    if (err?.name === 'NotFoundError') msg = 'No camera found on this device.';
    if (err?.name === 'NotReadableError') msg = 'Camera busy. Close other camera apps and retry.';
    showStartError(msg);
    showToast(msg);
    btnStartAr.textContent = prev || 'Start AR';
    startGate.classList.remove('hidden');
  } finally {
    starting = false;
    btnStartAr.disabled = false;
  }
}

window.__AR_GAME_READY = true;
window.__AR_startAR = handleStart;
if (btnStartAr) {
  btnStartAr.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleStart();
  });
}
if (btnRestart) {
  btnRestart.addEventListener('click', async () => {
    gameOverEl.classList.add('hidden');
    await handleStart();
  });
}

btnFire?.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  onFire();
  clearInterval(btnFire._auto);
  btnFire._auto = setInterval(onFire, 140);
});
const stopAutoFire = () => clearInterval(btnFire?._auto);
btnFire?.addEventListener('pointerup', stopAutoFire);
btnFire?.addEventListener('pointerleave', stopAutoFire);
btnFire?.addEventListener('pointercancel', stopAutoFire);
btnFire?.addEventListener('touchend', stopAutoFire);

btnReload?.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  weapon?.tryReload();
});

container?.addEventListener('pointerdown', (e) => {
  if (e.target.closest('#btn-fire, #btn-reload, .start-gate, .game-over, .interactive')) return;
  onFire();
});

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'KeyF') {
    e.preventDefault();
    onFire();
  }
  if (e.code === 'KeyR') weapon?.tryReload();
});

document.addEventListener('gesturestart', (e) => e.preventDefault());
document.body.addEventListener(
  'touchmove',
  (e) => {
    if (started) e.preventDefault();
  },
  { passive: false }
);