'use client';

/** Tiny synthesized sound effects (WebAudio) — no audio files to download. */
export type Sfx = 'click' | 'dice' | 'build' | 'gain' | 'turn' | 'chat' | 'robber' | 'win' | 'error' | 'trade' | 'reaction';

let ctx: AudioContext | null = null;
let volume = 0.6;

export function setVolume(v: number): void {
  volume = v;
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || volume <= 0) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType, gain: number, endFreq?: number) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain * volume, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noise(c: AudioContext, start: number, dur: number, gain: number, freq: number) {
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 1.2;
  const g = c.createGain();
  g.gain.value = gain * volume;
  src.connect(filter).connect(g).connect(c.destination);
  src.start(start);
}

export function play(sfx: Sfx): void {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (sfx) {
    case 'click':
      tone(c, 880, t, 0.05, 'sine', 0.12);
      break;
    case 'dice':
      for (let i = 0; i < 7; i++) noise(c, t + i * 0.055 + Math.random() * 0.03, 0.05, 0.5, 1800 + Math.random() * 1400);
      break;
    case 'build':
      tone(c, 150, t, 0.18, 'sine', 0.5, 70);
      noise(c, t, 0.08, 0.25, 600);
      break;
    case 'gain':
      tone(c, 1318, t, 0.16, 'triangle', 0.15);
      tone(c, 1976, t + 0.07, 0.22, 'triangle', 0.12);
      break;
    case 'turn':
      tone(c, 660, t, 0.7, 'sine', 0.22);
      tone(c, 990, t, 0.5, 'sine', 0.1);
      tone(c, 1320, t + 0.02, 0.35, 'sine', 0.05);
      break;
    case 'chat':
      tone(c, 540, t, 0.08, 'sine', 0.14, 760);
      break;
    case 'trade':
      tone(c, 784, t, 0.1, 'triangle', 0.14);
      tone(c, 1046, t + 0.09, 0.14, 'triangle', 0.14);
      break;
    case 'robber':
      tone(c, 220, t, 0.45, 'sawtooth', 0.12, 90);
      break;
    case 'win':
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(c, f, t + i * 0.11, 0.5, 'triangle', 0.18));
      break;
    case 'reaction':
      tone(c, 700, t, 0.08, 'sine', 0.1, 1100);
      break;
    case 'error':
      tone(c, 200, t, 0.12, 'square', 0.06, 150);
      break;
  }
}
