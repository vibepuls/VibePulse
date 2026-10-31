import { AudioTrackConfig } from '../types/template';

export class TemplateAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private startTime = 0;
  private scheduledNodes: AudioNode[] = [];
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private masterGain: GainNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getAudioContext(): AudioContext {
    this.initContext();
    return this.ctx!;
  }

  public getMediaStreamDestination(): MediaStreamAudioDestinationNode {
    this.initContext();
    if (!this.destinationNode && this.ctx && this.masterGain) {
      this.destinationNode = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.destinationNode);
    }
    return this.destinationNode!;
  }

  public stop() {
    if (!this.ctx) return;
    this.isPlaying = false;
    this.scheduledNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // Node already stopped
      }
    });
    this.scheduledNodes = [];
  }

  public play(track: AudioTrackConfig, beatMarkers: number[], loop = true, offsetSeconds = 0) {
    this.stop();
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    this.isPlaying = true;
    const now = this.ctx.currentTime;
    this.startTime = now - offsetSeconds;

    const duration = track.duration;
    const bpm = track.bpm;
    const beatInterval = 60 / bpm;

    // Schedule musical elements based on track preset
    this.scheduleTrackElements(track, beatMarkers, duration, beatInterval, offsetSeconds);

    if (loop) {
      const remainingTime = duration - offsetSeconds;
      if (remainingTime > 0) {
        const loopTimer = window.setTimeout(() => {
          if (this.isPlaying) {
            this.play(track, beatMarkers, true, 0);
          }
        }, remainingTime * 1000);
        // Track the timer
        (this as unknown as { _loopTimer?: number })._loopTimer = loopTimer;
      }
    }
  }

  private scheduleTrackElements(
    track: AudioTrackConfig,
    beatMarkers: number[],
    duration: number,
    beatInterval: number,
    offsetSeconds: number
  ) {
    if (!this.ctx || !this.masterGain) return;
    const baseTime = this.ctx.currentTime - offsetSeconds;

    // 1. Kick & 808 Bass on beat markers
    beatMarkers.forEach((marker) => {
      const eventTime = baseTime + marker;
      if (eventTime >= this.ctx!.currentTime && marker < duration) {
        if (track.synthesizerPreset === 'heavy-808') {
          this.trigger808Bass(eventTime, 55); // A1 note
        } else if (track.synthesizerPreset === 'dance-lead') {
          this.triggerPunchyKick(eventTime);
          this.triggerSnareClap(eventTime + beatInterval * 0.5);
        } else if (track.synthesizerPreset === 'cyber-bass') {
          this.triggerCyberSawBass(eventTime, 65);
        } else {
          this.triggerPunchyKick(eventTime);
        }
      }
    });

    // 2. Continuous rhythmic grid (hi-hats, percussions)
    const totalBeats = Math.floor(duration / (beatInterval / 2));
    for (let i = 0; i < totalBeats; i++) {
      const time = baseTime + i * (beatInterval / 2);
      if (time >= this.ctx.currentTime && i * (beatInterval / 2) < duration) {
        if (i % 2 === 1) {
          // Off-beat Hi-Hat
          this.triggerHiHat(time, track.genre === 'phonk' ? 0.3 : 0.2);
        }
        if (i % 4 === 2) {
          // Snare on beat 2 & 4
          this.triggerSnareClap(time);
        }
      }
    }

    // 3. Melodic chord progression & atmospheric pads
    const chordInterval = beatInterval * 4;
    const chordCount = Math.ceil(duration / chordInterval);
    for (let c = 0; c < chordCount; c++) {
      const chordTime = baseTime + c * chordInterval;
      if (chordTime >= this.ctx.currentTime - chordInterval && chordTime < baseTime + duration) {
        const chordNotes = this.getProgressionChords(track.genre, c % 4);
        chordNotes.forEach((freq, noteIdx) => {
          this.triggerSynthPad(
            Math.max(chordTime, this.ctx!.currentTime),
            freq,
            chordInterval * 0.95,
            track.synthesizerPreset,
            0.15 + noteIdx * 0.05
          );
        });
      }
    }
  }

  private triggerPunchyKick(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.12);

    gain.gain.setValueAtTime(1.0, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.26);
    this.scheduledNodes.push(osc, gain);
  }

  private trigger808Bass(time: number, freq = 50) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * 1.8, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.08);

    gain.gain.setValueAtTime(1.1, time);
    gain.gain.exponentialRampToValueAtTime(0.7, time + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.72);
    this.scheduledNodes.push(osc, gain);
  }

  private triggerCyberSawBass(time: number, freq = 65) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.frequency.exponentialRampToValueAtTime(250, time + 0.4);

    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.46);
    this.scheduledNodes.push(osc, filter, gain);
  }

  private triggerSnareClap(time: number) {
    if (!this.ctx || !this.masterGain) return;
    // White noise buffer for snare snap
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 800;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.15);
    this.scheduledNodes.push(whiteNoise, filter, gain);
  }

  private triggerHiHat(time: number, volume = 0.2) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.05);
    this.scheduledNodes.push(whiteNoise, filter, gain);
  }

  private triggerSynthPad(time: number, freq: number, duration: number, preset: string, vol = 0.2) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    if (preset === 'cyber-bass' || preset === 'heavy-808') {
      osc.type = 'sawtooth';
      filter.frequency.setValueAtTime(900, time);
    } else if (preset === 'ambient-strings') {
      osc.type = 'triangle';
      filter.frequency.setValueAtTime(1400, time);
    } else {
      osc.type = 'sine';
      filter.frequency.setValueAtTime(2200, time);
    }

    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.15);
    gain.gain.setValueAtTime(vol, time + duration - 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.05);
    this.scheduledNodes.push(osc, filter, gain);
  }

  private getProgressionChords(genre: string, step: number): number[] {
    // Musical chords (Frequencies in Hz)
    if (genre === 'phonk' || genre === 'synthwave') {
      // Dark minor progression: C minor -> Ab major -> Bb major -> G minor
      const progressions = [
        [130.81, 155.56, 196.0], // C3, Eb3, G3
        [103.83, 130.81, 155.56], // Ab2, C3, Eb3
        [116.54, 146.83, 174.61], // Bb2, D3, F3
        [98.0, 116.54, 146.83], // G2, Bb2, D3
      ];
      return progressions[step % progressions.length];
    } else if (genre === 'cinematic' || genre === 'acoustic') {
      // Emotional major: D major -> B minor -> G major -> A major
      const progressions = [
        [146.83, 185.0, 220.0], // D3, F#3, A3
        [123.47, 146.83, 185.0], // B2, D3, F#3
        [98.0, 123.47, 146.83], // G2, B2, D3
        [110.0, 138.59, 164.81], // A2, C#3, E3
      ];
      return progressions[step % progressions.length];
    } else {
      // Pop / Dance energetic: F minor -> Db major -> Eb major -> C minor
      const progressions = [
        [174.61, 207.65, 261.63], // F3, Ab3, C4
        [138.59, 174.61, 207.65], // Db3, F3, Ab3
        [155.56, 196.0, 233.08], // Eb3, G3, Bb3
        [130.81, 155.56, 196.0], // C3, Eb3, G3
      ];
      return progressions[step % progressions.length];
    }
  }

  public setVolume(vol: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.ctx.currentTime);
    }
  }
}

export const globalAudioEngine = new TemplateAudioEngine();
