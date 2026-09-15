/**
 * Procedural SFX via Web Audio API (no external audio files required).
 */
export class GameAudio {
  constructor() {
    this.ctx = null;
    this.unlocked = false;
    this.master = null;
  }

  async unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.unlocked = true;
  }

  #noiseBuffer(duration = 0.12) {
    const len = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    }
    return buffer;
  }

  #tone(freq, duration, type = 'square', gain = 0.2) {
    if (!this.unlocked) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration);
  }

  shoot() {
    if (!this.unlocked) return;
    const t0 = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.#noiseBuffer(0.1);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(1.15, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
    noise.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    noise.start(t0);
    this.#tone(160, 0.09, 'sawtooth', 0.42);
    this.#tone(90, 0.06, 'square', 0.28);
  }

  reload() {
    if (!this.unlocked) return;
    this.#tone(420, 0.05, 'triangle', 0.12);
    setTimeout(() => this.#tone(280, 0.08, 'triangle', 0.14), 90);
    setTimeout(() => this.#tone(520, 0.05, 'square', 0.08), 200);
  }

  hit() {
    if (!this.unlocked) return;
    this.#tone(140, 0.08, 'sawtooth', 0.2);
    this.#tone(90, 0.1, 'square', 0.12);
  }

  death() {
    if (!this.unlocked) return;
    this.#tone(110, 0.25, 'sawtooth', 0.22);
    setTimeout(() => this.#tone(70, 0.35, 'triangle', 0.18), 80);
  }

  bite() {
    if (!this.unlocked) return;
    this.#tone(80, 0.12, 'sawtooth', 0.25);
    this.#tone(160, 0.08, 'square', 0.1);
  }

  empty() {
    this.#tone(900, 0.04, 'square', 0.08);
  }

  wave() {
    this.#tone(330, 0.1, 'triangle', 0.12);
    setTimeout(() => this.#tone(440, 0.12, 'triangle', 0.12), 100);
  }
}
