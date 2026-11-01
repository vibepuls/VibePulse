/** Small original Web Audio soundscape; no remote audio assets or licenses required. */
export class AudioManager {
  constructor() {
    this.context = null; this.master = null; this.engineOsc = null; this.engineGain = null;
    this.engineFilter = null; this.hornNodes = []; this.muted = true; this.started = false; this.ambienceSource = null; this.ambienceGain = null; this.weatherType = 'clear';
  }
  async start() {
    if (this.muted) return false;
    const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Ctx) return false;
    if (!this.context) {
      this.context = new Ctx();
      this.master = this.context.createGain(); this.master.gain.value = 0.24; this.master.connect(this.context.destination);
      this.engineOsc = this.context.createOscillator(); this.engineOsc.type = 'sawtooth';
      this.engineFilter = this.context.createBiquadFilter(); this.engineFilter.type = 'lowpass'; this.engineFilter.frequency.value = 170;
      this.engineGain = this.context.createGain(); this.engineGain.gain.value = 0.0001;
      this.engineOsc.connect(this.engineFilter); this.engineFilter.connect(this.engineGain); this.engineGain.connect(this.master); this.engineOsc.start();
      const bufferSize = this.context.sampleRate * 2;
      const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i=0;i<bufferSize;i++) data[i] = (Math.random()*2-1) * 0.35;
      this.ambienceSource = this.context.createBufferSource(); this.ambienceSource.buffer = buffer; this.ambienceSource.loop = true;
      const ambienceFilter = this.context.createBiquadFilter(); ambienceFilter.type = 'lowpass'; ambienceFilter.frequency.value = 520;
      this.ambienceGain = this.context.createGain(); this.ambienceGain.gain.value = 0.0001;
      this.ambienceSource.connect(ambienceFilter); ambienceFilter.connect(this.ambienceGain); this.ambienceGain.connect(this.master); this.ambienceSource.start();
    }
    try { await this.context.resume(); this.started = true; this.applyWeather(this.weatherType); return true; } catch { return false; }
  }
  setMuted(value) {
    this.muted = Boolean(value);
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.24, this.context.currentTime, 0.04);
    if (!this.muted) this.start();
  }
  updateEngine(speed = 0, walking = false) {
    if (!this.started || !this.context || !this.engineOsc) return;
    const now = this.context.currentTime, normalized = Math.min(1, Math.abs(speed) / 42);
    this.engineOsc.frequency.setTargetAtTime(walking ? 68 : 58 + normalized * 150, now, 0.08);
    this.engineFilter.frequency.setTargetAtTime(120 + normalized * 780, now, 0.08);
    this.engineGain.gain.setTargetAtTime(this.muted || walking ? 0.0001 : 0.018 + normalized * 0.065, now, 0.12);
  }
  tone(frequency, duration = 0.18, type = 'sine', gain = 0.12) {
    if (this.muted || !this.context || !this.master) return;
    const now = this.context.currentTime, osc = this.context.createOscillator(), amp = this.context.createGain();
    osc.type = type; osc.frequency.value = frequency; amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.015); amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp); amp.connect(this.master); osc.start(now); osc.stop(now + duration + 0.03);
  }
  setWeather(type = 'clear') { this.weatherType = type; this.applyWeather(type); }
  applyWeather(type = 'clear') {
    if (!this.context || !this.ambienceGain) return;
    const level = type === 'monsoon' ? 0.075 : type === 'rain' ? 0.045 : type === 'smog' ? 0.008 : 0.0001;
    this.ambienceGain.gain.setTargetAtTime(this.muted ? 0.0001 : level, this.context.currentTime, 0.25);
  }
  horn() { this.tone(220, 0.35, 'square', 0.08); this.tone(277, 0.31, 'square', 0.055); }
  rickshawBell() { this.tone(1450, 0.12, 'sine', 0.09); this.tone(1850, 0.16, 'sine', 0.07); }
  missionComplete() { this.tone(660, 0.12); setTimeout(() => this.tone(880, 0.18), 100); }
  dispose() { try { this.engineOsc?.stop(); this.ambienceSource?.stop(); this.context?.close(); } catch {} this.context = null; this.started = false; }
}
