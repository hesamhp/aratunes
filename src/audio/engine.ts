import type { Track } from "../data";

export type PlayMode = "file" | "gen" | null;

export interface EngineState {
  trackId: string | null;
  playing: boolean;
  track: Track | null;
  mode: PlayMode;
}

export interface Bands {
  bass: number;
  mid: number;
  treble: number;
  level: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/**
 * Player engine.
 * - If a track has a playable local file (track.src), it plays the real file
 *   through the analyser (real duration + seeking + reactive visuals).
 * - Otherwise it falls back to a seeded generative arrangement so the UI
 *   always has something to play.
 */
class GenerativeEngine {
  // audio graph
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private analyser!: AnalyserNode;
  private musicBus!: GainNode;
  private delay!: DelayNode;
  private sendGain!: GainNode;

  // generative scheduler
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private startAt = 0;
  private pausedAccum = 0;
  private endFired = false;

  // file playback
  private player: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private brokenTracks = new Set<string>();

  // shared state
  private current: Track | null = null;
  private playing = false;
  private mode: PlayMode = null;

  private listeners = new Set<() => void>();
  private snapshot: EngineState = {
    trackId: null,
    playing: false,
    track: null,
    mode: null,
  };

  private freqData: Uint8Array<ArrayBuffer> = new Uint8Array(0);
  private timeData: Uint8Array<ArrayBuffer> = new Uint8Array(0);

  onEnded: ((trackId: string) => void) | null = null;

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  getState = (): EngineState => this.snapshot;

  private emit() {
    this.snapshot = {
      trackId: this.current?.id ?? null,
      playing: this.playing,
      track: this.current,
      mode: this.mode,
    };
    this.listeners.forEach((l) => l());
  }

  private ensure() {
    if (this.ctx) return;
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.86;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyser.fftSize);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20;
    comp.knee.value = 22;
    comp.ratio.value = 5;
    comp.attack.value = 0.004;
    comp.release.value = 0.28;

    this.master = ctx.createGain();
    this.master.gain.value = 0;

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.85;

    // musicBus -> master -> comp -> analyser -> out
    this.musicBus.connect(this.master);
    this.master.connect(comp);
    comp.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // dub delay send (generative mode only)
    this.delay = ctx.createDelay(2);
    const feedback = ctx.createGain();
    feedback.gain.value = 0.34;
    const dFilter = ctx.createBiquadFilter();
    dFilter.type = "lowpass";
    dFilter.frequency.value = 2200;
    this.sendGain = ctx.createGain();
    this.sendGain.gain.value = 0.34;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    this.musicBus.connect(this.sendGain);
    this.sendGain.connect(this.delay);
    this.delay.connect(dFilter);
    dFilter.connect(feedback);
    feedback.connect(this.delay);
    dFilter.connect(wet);
    wet.connect(this.master);
  }

  /** Toggle play/pause for a track, or start it if it's a new one. */
  toggle(track: Track) {
    if (this.current?.id === track.id) {
      if (this.playing) this.pause();
      else this.resume();
      return;
    }
    void this.start(track);
  }

  async start(track: Track) {
    this.ensure();
    void this.ctx!.resume();
    this.teardownPlayback();

    this.current = track;
    this.step = 0;
    this.pausedAccum = 0;
    this.endFired = false;
    this.emit();

    const wantFile = !!track.src && !this.brokenTracks.has(track.id);
    if (wantFile) {
      await this.tryStartFile(track);
      if (this.current?.id !== track.id) return; // aborted while loading
      if (this.mode === "file") return;
    }
    this.startGen(track);
  }

  pause() {
    if (!this.ctx || !this.playing || !this.current) return;
    if (this.mode === "file" && this.player) {
      this.player.pause();
    } else if (this.mode === "gen") {
      this.pausedAccum += this.ctx.currentTime - this.startAt;
      if (this.timer !== null) {
        window.clearInterval(this.timer);
        this.timer = null;
      }
    }
    this.playing = false;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    this.emit();
  }

  resume() {
    if (!this.ctx || !this.current || this.playing) return;
    void this.ctx.resume();
    if (this.mode === "file" && this.player) {
      void this.player.play();
    } else if (this.mode === "gen") {
      this.startAt = this.ctx.currentTime;
      this.nextTime = this.ctx.currentTime + 0.1;
      this.timer = window.setInterval(this.tick, 60);
    }
    this.playing = true;
    this.master.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.1);
    this.emit();
  }

  stop() {
    this.teardownPlayback();
    this.current = null;
    this.playing = false;
    this.pausedAccum = 0;
    if (this.ctx) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    }
    this.emit();
  }

  /** 0..1 — file mode only */
  seek(ratio: number) {
    if (this.mode !== "file" || !this.player) return;
    const d = this.player.duration;
    if (Number.isFinite(d) && d > 0) {
      this.player.currentTime = Math.min(0.999, Math.max(0, ratio)) * d;
    }
  }

  getElapsed() {
    if (this.mode === "file" && this.player) return this.player.currentTime;
    if (!this.current || !this.ctx) return 0;
    return (
      this.pausedAccum + (this.playing ? this.ctx.currentTime - this.startAt : 0)
    );
  }

  getDuration() {
    if (
      this.mode === "file" &&
      this.player &&
      Number.isFinite(this.player.duration) &&
      this.player.duration > 0
    ) {
      return this.player.duration;
    }
    return this.current?.previewSec ?? 0;
  }

  // ---------- internal ----------

  private teardownPlayback() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (this.player) {
      this.player.onended = null;
      this.player.pause();
      this.player = null;
    }
    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch {
        /* noop */
      }
      this.mediaSource = null;
    }
    this.mode = null;
    this.playing = false;
  }

  private async tryStartFile(track: Track) {
    const ctx = this.ctx!;
    // cheap existence check — missing local files silently fall back
    let ok = false;
    try {
      const res = await fetch(track.src!, { method: "HEAD" });
      ok = res.ok;
    } catch {
      ok = false;
    }
    if (!ok) {
      this.brokenTracks.add(track.id);
      return;
    }
    if (this.current?.id !== track.id) return;

    const el = new Audio(track.src!);
    el.preload = "auto";
    const src = ctx.createMediaElementSource(el);
    src.connect(this.musicBus);
    this.player = el;
    this.mediaSource = src;
    this.mode = "file";
    this.sendGain.gain.setTargetAtTime(0, ctx.currentTime, 0.06);

    el.onended = () => {
      this.playing = false;
      this.emit();
      this.onEnded?.(track.id);
    };

    this.master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.12);
    try {
      await el.play();
      this.playing = true;
      this.emit();
    } catch {
      this.teardownPlayback();
    }
  }

  private startGen(track: Track) {
    const ctx = this.ctx!;
    this.mode = "gen";
    this.sendGain.gain.setTargetAtTime(0.34, ctx.currentTime, 0.06);

    const spb = 60 / track.audio.bpm;
    this.delay.delayTime.setTargetAtTime(spb * 0.75, ctx.currentTime, 0.05);
    this.master.gain.setTargetAtTime(0.9, ctx.currentTime, 0.12);

    this.startAt = ctx.currentTime;
    this.nextTime = ctx.currentTime + 0.1;
    this.playing = true;
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = window.setInterval(this.tick, 60);
    this.emit();
  }

  private tick = () => {
    if (!this.ctx || !this.playing || !this.current) return;
    const a = this.current.audio;
    const spb = 60 / a.bpm;
    const stepDur = spb / 2; // 8th notes

    while (this.nextTime < this.ctx.currentTime + 0.24) {
      this.scheduleStep(this.step, this.nextTime);
      this.nextTime += stepDur;
      this.step++;
    }

    if (!this.endFired && this.getElapsed() >= this.current.previewSec) {
      this.endFired = true;
      const id = this.current.id;
      window.setTimeout(() => this.onEnded?.(id), 120);
    }
  };

  private scheduleStep(step: number, t: number) {
    const track = this.current;
    if (!track) return;
    const a = track.audio;
    const bar = Math.floor(step / 8);
    const pos = step % 8;
    const rnd = mulberry32(a.seed * 977 + bar * 131 + 7);
    const spb = 60 / a.bpm;
    t += (rnd() - 0.5) * a.humanize;

    const fast = a.bpm >= 110;

    // kick
    if (a.kick) {
      const kickPos = fast ? pos % 2 === 0 : pos === 0 || pos === 5;
      if (kickPos) this.kickN(t);
      if (rnd() < 0.85) this.tickN(t, pos % 2 === 0 ? 0.035 : 0.02);
    }

    // bass
    if (pos === 0 || (fast ? pos === 6 : pos === 3)) {
      const deg = rnd() < 0.7 ? 0 : a.scale[Math.floor(rnd() * 2) + 1] || 0;
      this.bassN(t, a.root + (pos === 0 ? 0 : deg), rnd() < 0.5 && fast ? 0.55 : 0.9);
    }

    // arp pluck
    if (rnd() < a.arpProb) {
      const maxDeg = a.scale.length;
      const deg = a.scale[Math.floor(rnd() * maxDeg)];
      const oct = rnd() < 0.3 ? 24 : 12;
      const midi = a.root + oct + deg;
      this.pluckN(t, midi, 0.09 + rnd() * 0.05);
      if (rnd() < 0.16) this.pluckN(t + spb / 4, midi + 12, 0.05);
    }

    // pad
    const padEvery = a.kick ? 4 : 2;
    if (pos === 0 && bar % padEvery === 0) {
      const s = a.scale;
      const chord = [s[0], s[2 % s.length], s[4 % s.length]];
      this.padN(t, chord.map((d) => a.root + 12 + d), padEvery * spb * 8, a.padWave, a.brightness);
    }

    // sparkle
    if (rnd() < 0.1) {
      const deg = a.scale[Math.floor(rnd() * a.scale.length)];
      this.bellN(t, a.root + 24 + deg);
    }
  }

  // ---------- voices ----------

  private pluckN(t: number, midi: number, vel: number) {
    const ctx = this.ctx!;
    const a = this.current!.audio;
    const o = ctx.createOscillator();
    o.type = a.arpWave;
    o.frequency.value = midiToFreq(midi);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(a.brightness * 2.2, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(220, a.brightness * 0.4), t + 0.35);
    f.Q.value = 1.1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(f);
    f.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.6);
  }

  private bassN(t: number, midi: number, len: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = midiToFreq(midi - 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.24, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 320;
    o.connect(f);
    f.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + len + 0.05);
  }

  private kickN(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.85, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    o.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.28);
  }

  private tickN(t: number, vel: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = 7600;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    o.connect(f);
    f.connect(g);
    g.connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.06);
  }

  private padN(t: number, midis: number[], dur: number, wave: OscillatorType, cutoff: number) {
    const ctx = this.ctx!;
    midis.forEach((midi, i) => {
      const o = ctx.createOscillator();
      o.type = wave;
      o.frequency.value = midiToFreq(midi);
      o.detune.value = (i - 1) * 7;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = Math.min(1800, cutoff * 0.9);
      const g = ctx.createGain();
      const atk = Math.min(1.4, dur * 0.3);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + atk);
      g.gain.setValueAtTime(0.05, t + dur * 0.6);
      g.gain.linearRampToValueAtTime(0, t + dur * 1.02);
      o.connect(f);
      f.connect(g);
      g.connect(this.musicBus);
      o.start(t);
      o.stop(t + dur * 1.05);
    });
  }

  private bellN(t: number, midi: number) {
    const ctx = this.ctx!;
    [1, 2.01].forEach((mult, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = midiToFreq(midi) * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(i === 0 ? 0.06 : 0.02, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      o.connect(g);
      g.connect(this.musicBus);
      o.start(t);
      o.stop(t + 2.5);
    });
  }

  // ---------- visuals ----------

  getSpectrum(): Uint8Array | null {
    return this.freqData.length ? this.freqData : null;
  }

  getBands(): Bands {
    if (!this.analyser || !this.playing) {
      return { bass: 0, mid: 0, treble: 0, level: 0 };
    }
    this.analyser.getByteFrequencyData(this.freqData);
    const avg = (from: number, to: number) => {
      let s = 0;
      for (let i = from; i < to; i++) s += this.freqData[i];
      return s / (to - from) / 255;
    };
    const bass = avg(1, 8);
    const mid = avg(10, 60);
    const treble = avg(80, 220);

    this.analyser.getByteTimeDomainData(this.timeData);
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i += 4) {
      const v = (this.timeData[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / (this.timeData.length / 4));
    return { bass, mid, treble, level: Math.min(1, rms * 2.6) };
  }
}

export const engine = new GenerativeEngine();
