/**
 * Procedural game audio via Web Audio API (no external sound files).
 */
export class GameAudio {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.master = null;
  }

  async unlock() {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.unlocked = true;
  }

  _beep(freq, dur, type = 'square', gain = 0.2, slideTo = null) {
    if (!this.ctx || !this.unlocked) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    }
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise(dur, gain = 0.15) {
    if (!this.ctx || !this.unlocked) return;
    const t0 = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  shoot() {
    this._noise(0.06, 0.22);
    this._beep(420, 0.07, 'sawtooth', 0.12, 120);
  }

  empty() {
    this._beep(140, 0.08, 'square', 0.1);
  }

  reload() {
    this._beep(220, 0.08, 'triangle', 0.1);
    setTimeout(() => this._beep(320, 0.1, 'triangle', 0.1), 120);
    setTimeout(() => this._beep(180, 0.12, 'square', 0.08), 280);
  }

  hit() {
    this._beep(880, 0.05, 'square', 0.1, 400);
    this._noise(0.04, 0.1);
  }

  death() {
    this._beep(300, 0.25, 'sawtooth', 0.16, 60);
    this._noise(0.2, 0.12);
  }

  bite() {
    this.attack();
  }

  attack() {
    this._beep(90, 0.18, 'sawtooth', 0.18, 50);
  }

  wave() {
    this._beep(440, 0.12, 'triangle', 0.12);
    setTimeout(() => this._beep(660, 0.14, 'triangle', 0.12), 100);
    setTimeout(() => this._beep(880, 0.16, 'triangle', 0.1), 220);
  }
}