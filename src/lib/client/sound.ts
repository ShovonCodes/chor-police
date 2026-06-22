'use client';

// Cues are synthesized via Web Audio (no audio files). Never throws: no-op when
// Web Audio is unavailable. AudioContext is created lazily on first play() — which
// must run inside a user gesture — and resumed to satisfy autoplay policies.

export type Cue =
  | 'shuffle'
  | 'flip'
  | 'drumroll'
  | 'reveal'
  | 'win'
  | 'lose'
  | 'whoosh'
  | 'tally-tick'
  | 'tap';

const MUTE_KEY = 'chor-police:muted';

let ctx: AudioContext | null = null;
let muted = false;
let initialized = false;

function ensureInit() {
  if (initialized) return;
  initialized = true;
  if (typeof window === 'undefined') return;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === '1';
  } catch {}
}

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function isMuted(): boolean {
  ensureInit();
  return muted;
}

export function setMuted(value: boolean): void {
  ensureInit();
  muted = value;
  try {
    window.localStorage.setItem(MUTE_KEY, value ? '1' : '0');
  } catch {}
}

export function toggleMuted(): boolean {
  setMuted(!isMuted());
  return muted;
}

function tone(
  c: AudioContext,
  opts: {
    type?: OscillatorType;
    freq: number;
    start: number;
    duration: number;
    gain?: number;
    sweepTo?: number;
  },
) {
  const { type = 'sine', freq, start, duration, gain = 0.15, sweepTo } = opts;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, start + duration);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function noise(
  c: AudioContext,
  opts: { start: number; duration: number; gain?: number; freq?: number },
) {
  const { start, duration, gain = 0.08, freq = 1200 } = opts;
  const frames = Math.floor(c.sampleRate * duration);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(start);
  src.stop(start + duration);
}

export function play(cue: Cue): void {
  ensureInit();
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume().catch(() => {});
  const t = c.currentTime;

  switch (cue) {
    case 'tap':
      tone(c, { type: 'triangle', freq: 520, start: t, duration: 0.06, gain: 0.08 });
      break;
    case 'flip':
      noise(c, { start: t, duration: 0.12, gain: 0.06, freq: 2400 });
      tone(c, { type: 'triangle', freq: 660, start: t, duration: 0.1, gain: 0.07, sweepTo: 880 });
      break;
    case 'shuffle':
      for (let i = 0; i < 5; i++) {
        noise(c, { start: t + i * 0.09, duration: 0.07, gain: 0.05, freq: 1600 + i * 200 });
      }
      break;
    case 'drumroll':
      for (let i = 0; i < 14; i++) {
        noise(c, { start: t + i * 0.05, duration: 0.04, gain: 0.05, freq: 220 });
      }
      tone(c, { type: 'sine', freq: 110, start: t + 0.75, duration: 0.25, gain: 0.18 });
      break;
    case 'reveal':
      noise(c, { start: t, duration: 0.3, gain: 0.1, freq: 1800 });
      tone(c, { type: 'sawtooth', freq: 330, start: t, duration: 0.35, gain: 0.12, sweepTo: 660 });
      tone(c, { type: 'sine', freq: 880, start: t + 0.08, duration: 0.3, gain: 0.1 });
      break;
    case 'win': {
      // Ascending major arpeggio + a bright sparkle on top — triumphant.
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => {
        tone(c, { type: 'triangle', freq: f, start: t + i * 0.11, duration: 0.2, gain: 0.16 });
        tone(c, { type: 'sine', freq: f * 2, start: t + i * 0.11, duration: 0.18, gain: 0.05 });
      });
      tone(c, { type: 'sine', freq: 1568, start: t + 0.46, duration: 0.5, gain: 0.12 });
      break;
    }
    case 'lose': {
      // Descending "sad trombone": four slurred, pitch-bending sawtooth notes.
      const notes = [392, 349, 311, 247];
      notes.forEach((f, i) =>
        tone(c, {
          type: 'sawtooth',
          freq: f,
          start: t + i * 0.2,
          duration: i === notes.length - 1 ? 0.55 : 0.22,
          gain: 0.13,
          sweepTo: f * 0.94,
        }),
      );
      break;
    }
    case 'whoosh':
      noise(c, { start: t, duration: 0.32, gain: 0.07, freq: 700 });
      tone(c, { type: 'sine', freq: 180, start: t, duration: 0.3, gain: 0.08, sweepTo: 520 });
      break;
    case 'tally-tick':
      tone(c, { type: 'square', freq: 740, start: t, duration: 0.04, gain: 0.06 });
      break;
  }
}
