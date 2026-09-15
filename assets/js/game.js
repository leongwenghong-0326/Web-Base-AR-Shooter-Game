export class GameManager {
  constructor({ audio, onHud, onToast, onGameOver }) {
    this.audio = audio;
    this.onHud = onHud;
    this.onToast = onToast;
    this.onGameOver = onGameOver;

    this.running = false;
    this.targetFound = false;
    this.wave = 0;
    this.score = 0;
    this.playerHp = 5;
    this.maxPlayerHp = 5;
    this.enemies = [];
    this.pendingSpawn = null;
    this.waveClearing = false;
  }

  reset() {
    this.wave = 0;
    this.score = 0;
    this.playerHp = this.maxPlayerHp;
    this.enemies = [];
    this.pendingSpawn = null;
    this.waveClearing = false;
    this.running = true;
    this.emitHud();
  }

  emitHud(ammo, mag) {
    this.onHud?.({
      score: this.score,
      wave: Math.max(this.wave, 1),
      hp: this.playerHp,
      ammo,
      mag,
    });
  }

  waveStats(wave) {
    const speed = 0.28 * (1 + 0.12 * (wave - 1));
    const hp = 4 + (wave - 1);
    return { count: 1, speed, hp };
  }

  startFirstWave(spawnFn) {
    this.wave = 1;
    this.spawnWave(spawnFn);
  }

  async spawnWave(spawnFn) {
    const stats = this.waveStats(this.wave);
    this.waveClearing = false;
    this.onToast?.(`WAVE ${this.wave}`);
    this.audio?.wave();
    this.enemies = await Promise.resolve(spawnFn(stats));
    this.emitHud();
  }

  onEnemyDeath(enemy, spawnFn) {
    this.enemies = this.enemies.filter((e) => e !== enemy);
    this.score += 100 + this.wave * 25;
    this.emitHud();

    if (this.enemies.length === 0 && this.running && !this.waveClearing) {
      this.waveClearing = true;
      this.wave += 1;
      setTimeout(() => {
        if (!this.running) return;
        this.spawnWave(spawnFn);
      }, 1200);
    }
  }

  onPlayerBitten() {
    if (!this.running) return;
    this.playerHp = Math.max(0, this.playerHp - 1);
    this.emitHud();
    if (this.playerHp <= 0) {
      this.running = false;
      this.onGameOver?.(this.score, this.wave);
    }
  }

  getHitTargets() {
    return this.enemies.filter((e) => e.alive).map((e) => e.hitbox);
  }
}