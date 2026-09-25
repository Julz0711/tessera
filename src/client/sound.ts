'use client';

/**
 * The game's sound design, synthesized with WebAudio (no audio files to download).
 *
 * Three tiers, so the ear learns what matters:
 * - subtle UI ticks (clicks, panels, chat) — short, soft, high;
 * - game feedback (dice, building, cards, trades, knights) — woody and warm;
 * - alerts and rewards (your turn, offers, robber, barbarians, awards, metropolis, win) — longer,
 *   brighter, in C major / pentatonic, with more reverb.
 *
 * Everything goes through one master bus (volume → gentle compressor → speakers) with a shared
 * reverb send, so layered sounds blend instead of clipping.
 */
export type Sfx =
  // subtle UI
  | 'click'
  | 'open'
  | 'close'
  | 'error'
  | 'chat'
  | 'reaction'
  // game feedback
  | 'dice'
  | 'road'
  | 'settlement'
  | 'city'
  | 'wall'
  | 'build'
  | 'gain'
  | 'card'
  | 'trade'
  | 'steal'
  | 'knight'
  | 'knightUp'
  | 'improve'
  | 'barbarianStep'
  // alerts
  | 'turn'
  | 'offer'
  | 'stolen'
  | 'robber'
  | 'alert'
  | 'barbarianAttack'
  // rewards
  | 'award'
  | 'repelled'
  | 'metropolis'
  | 'win'
  | 'lose';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let reverb: GainNode | null = null;
let volume = 0.6;

export function setVolume(v: number): void {
  volume = v;
  if (master && ctx) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
}

/** A soft, synthetic room: decaying stereo noise used as a convolution impulse. */
function impulse(c: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || volume <= 0) return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(comp).connect(ctx.destination);
    const conv = ctx.createConvolver();
    conv.buffer = impulse(ctx, 1.6, 3);
    reverb = ctx.createGain();
    reverb.gain.value = 1;
    reverb.connect(conv).connect(master);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface Voice {
  /** Seconds from now. */
  at?: number;
  dur: number;
  gain: number;
  /** 0..1 of the signal also sent to the reverb. */
  wet?: number;
}

/** Routes a source through its own envelope into the master bus (and the reverb). */
function out(c: AudioContext, node: AudioNode, v: Voice, attack = 0.005): { start: number; end: number } {
  const start = c.currentTime + 0.01 + (v.at ?? 0);
  const end = start + v.dur;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(v.gain, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  node.connect(g);
  g.connect(master!);
  if (v.wet) {
    const send = c.createGain();
    send.gain.value = v.wet;
    g.connect(send).connect(reverb!);
  }
  return { start, end };
}

/** A plain oscillator note, optionally gliding to `to`. */
function note(c: AudioContext, freq: number, v: Voice & { type?: OscillatorType; to?: number; attack?: number }) {
  const osc = c.createOscillator();
  osc.type = v.type ?? 'sine';
  const { start, end } = out(c, osc, v, v.attack);
  osc.frequency.setValueAtTime(freq, start);
  if (v.to) osc.frequency.exponentialRampToValueAtTime(v.to, end);
  osc.start(start);
  osc.stop(end + 0.05);
}

/** A bell: a sine plus two inharmonic partials that die away faster. */
function bell(c: AudioContext, freq: number, v: Voice) {
  note(c, freq, v);
  note(c, freq * 2.76, { ...v, gain: v.gain * 0.3, dur: v.dur * 0.5 });
  note(c, freq * 5.4, { ...v, gain: v.gain * 0.12, dur: v.dur * 0.3 });
}

/** A plucked string: a bright triangle through a closing low-pass filter. */
function pluck(c: AudioContext, freq: number, v: Voice) {
  const osc = c.createOscillator();
  osc.type = 'triangle';
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  osc.connect(lp);
  const { start, end } = out(c, lp, v, 0.003);
  lp.frequency.setValueAtTime(freq * 8, start);
  lp.frequency.exponentialRampToValueAtTime(freq * 1.2, end);
  osc.frequency.value = freq;
  osc.start(start);
  osc.stop(end + 0.05);
}

/** A brassy note for fanfares: sawtooth through a filter that opens with the swell. */
function brass(c: AudioContext, freq: number, v: Voice) {
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 2;
  osc.connect(lp);
  const { start, end } = out(c, lp, v, 0.04);
  lp.frequency.setValueAtTime(freq * 1.5, start);
  lp.frequency.exponentialRampToValueAtTime(freq * 5, start + Math.min(0.12, v.dur / 2));
  lp.frequency.exponentialRampToValueAtTime(freq * 2, end);
  osc.frequency.value = freq;
  osc.start(start);
  osc.stop(end + 0.05);
}

/** A burst of filtered noise (dice, wood, whooshes). */
function noise(c: AudioContext, v: Voice & { freq: number; q?: number; type?: BiquadFilterType; to?: number }) {
  const len = Math.ceil(c.sampleRate * v.dur);
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const f = c.createBiquadFilter();
  f.type = v.type ?? 'bandpass';
  f.Q.value = v.q ?? 1.2;
  src.connect(f);
  const { start, end } = out(c, f, v, 0.002);
  f.frequency.setValueAtTime(v.freq, start);
  if (v.to) f.frequency.exponentialRampToValueAtTime(v.to, end);
  src.start(start);
  src.stop(end + 0.05);
}

/** A hollow wooden knock (pieces put down on the table). */
function knock(c: AudioContext, freq: number, v: Voice) {
  note(c, freq, { ...v, to: freq * 0.6 });
  noise(c, { ...v, dur: Math.min(0.05, v.dur), gain: v.gain * 0.6, freq: freq * 4, q: 3 });
}

/** Low drum: a sine that drops in pitch. */
function drum(c: AudioContext, freq: number, v: Voice) {
  note(c, freq, { ...v, to: freq * 0.45 });
}

const hz = (semitonesFromA4: number) => 440 * Math.pow(2, semitonesFromA4 / 12);
// C major / pentatonic notes used throughout (relative to A4).
const N = { C4: hz(-9), D4: hz(-7), E4: hz(-5), G4: hz(-2), A4: hz(0), C5: hz(3), D5: hz(5), E5: hz(7), G5: hz(10), A5: hz(12), C6: hz(15), E6: hz(19), G3: hz(-14), C3: hz(-21), E3: hz(-17) };

export function play(sfx: Sfx): void {
  const c = audio();
  if (!c) return;
  switch (sfx) {
    // ── subtle UI ──────────────────────────────────────────────────────────
    case 'click':
      note(c, 1400, { dur: 0.04, gain: 0.05, to: 1100 });
      break;
    case 'open':
      noise(c, { dur: 0.14, gain: 0.05, freq: 900, to: 2600, q: 0.8 });
      note(c, N.E5, { at: 0.03, dur: 0.1, gain: 0.04 });
      break;
    case 'close':
      noise(c, { dur: 0.12, gain: 0.04, freq: 2400, to: 800, q: 0.8 });
      break;
    case 'error':
      note(c, 220, { dur: 0.1, gain: 0.07, type: 'square', to: 180 });
      note(c, 180, { at: 0.09, dur: 0.14, gain: 0.07, type: 'square', to: 150 });
      break;
    case 'chat':
      note(c, N.A5, { dur: 0.09, gain: 0.05, to: N.E6 });
      break;
    case 'reaction':
      note(c, N.E5, { dur: 0.08, gain: 0.07, to: N.A5 });
      note(c, N.C6, { at: 0.06, dur: 0.1, gain: 0.05 });
      break;

    // ── game feedback ──────────────────────────────────────────────────────
    case 'dice':
      // two dice tumbling on wood, then settling
      for (let i = 0; i < 9; i++) {
        const at = i * 0.05 + Math.random() * 0.025;
        knock(c, 700 + Math.random() * 500, { at, dur: 0.05, gain: 0.12 * (1 - i / 12) });
      }
      knock(c, 520, { at: 0.5, dur: 0.07, gain: 0.14 });
      break;
    case 'road':
      knock(c, 330, { dur: 0.12, gain: 0.3 });
      knock(c, 440, { at: 0.07, dur: 0.1, gain: 0.2 });
      break;
    case 'settlement':
      knock(c, 260, { dur: 0.16, gain: 0.35 });
      pluck(c, N.C5, { at: 0.05, dur: 0.35, gain: 0.12, wet: 0.2 });
      pluck(c, N.G5, { at: 0.12, dur: 0.4, gain: 0.1, wet: 0.2 });
      break;
    case 'city':
      knock(c, 200, { dur: 0.2, gain: 0.4 });
      knock(c, 260, { at: 0.1, dur: 0.18, gain: 0.3 });
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => pluck(c, f, { at: 0.12 + i * 0.07, dur: 0.6, gain: 0.12, wet: 0.35 }));
      break;
    case 'wall':
      drum(c, 110, { dur: 0.3, gain: 0.4 });
      noise(c, { at: 0.02, dur: 0.18, gain: 0.12, freq: 500, q: 0.7 });
      knock(c, 180, { at: 0.12, dur: 0.15, gain: 0.25 });
      break;
    case 'build':
      knock(c, 280, { dur: 0.14, gain: 0.3 });
      break;
    case 'gain':
      bell(c, N.E6, { dur: 0.35, gain: 0.08, wet: 0.3 });
      bell(c, N.G5 * 2, { at: 0.07, dur: 0.4, gain: 0.07, wet: 0.3 });
      break;
    case 'card':
      noise(c, { dur: 0.12, gain: 0.08, freq: 3000, to: 5000, q: 0.6 });
      pluck(c, N.A5, { at: 0.05, dur: 0.3, gain: 0.08, wet: 0.25 });
      break;
    case 'trade':
      pluck(c, N.G4, { dur: 0.25, gain: 0.14, wet: 0.2 });
      pluck(c, N.C5, { at: 0.09, dur: 0.3, gain: 0.14, wet: 0.2 });
      bell(c, N.E6, { at: 0.18, dur: 0.3, gain: 0.05, wet: 0.3 });
      break;
    case 'steal':
      noise(c, { dur: 0.22, gain: 0.1, freq: 1200, to: 4000, q: 0.9 });
      pluck(c, N.E5, { at: 0.1, dur: 0.2, gain: 0.08 });
      break;
    case 'knight':
      note(c, 1900, { dur: 0.25, gain: 0.05, to: 2400, type: 'triangle' });
      knock(c, 240, { dur: 0.15, gain: 0.3 });
      break;
    case 'knightUp':
      [N.G4, N.C5, N.E5].forEach((f, i) => brass(c, f, { at: i * 0.08, dur: 0.25, gain: 0.08, wet: 0.2 }));
      break;
    case 'improve':
      [N.C5, N.D5, N.E5, N.G5].forEach((f, i) => bell(c, f, { at: i * 0.07, dur: 0.4, gain: 0.07, wet: 0.35 }));
      break;
    case 'barbarianStep':
      drum(c, 90, { dur: 0.35, gain: 0.35 });
      drum(c, 90, { at: 0.3, dur: 0.3, gain: 0.25 });
      break;

    // ── alerts ─────────────────────────────────────────────────────────────
    case 'turn':
      // a warm two-note bell: "your move"
      bell(c, N.G5, { dur: 0.9, gain: 0.14, wet: 0.45 });
      bell(c, N.C6, { at: 0.16, dur: 1.1, gain: 0.14, wet: 0.45 });
      break;
    case 'offer':
      pluck(c, N.E5, { dur: 0.3, gain: 0.14, wet: 0.3 });
      pluck(c, N.A5, { at: 0.1, dur: 0.3, gain: 0.14, wet: 0.3 });
      pluck(c, N.E5, { at: 0.2, dur: 0.4, gain: 0.12, wet: 0.3 });
      break;
    case 'stolen':
      note(c, N.E4, { dur: 0.35, gain: 0.12, type: 'triangle', to: N.C4 });
      noise(c, { dur: 0.25, gain: 0.08, freq: 3500, to: 900, q: 0.9 });
      break;
    case 'robber':
      note(c, 180, { dur: 0.6, gain: 0.1, type: 'sawtooth', to: 80 });
      drum(c, 70, { at: 0.05, dur: 0.5, gain: 0.35 });
      break;
    case 'alert':
      bell(c, N.A5, { dur: 0.5, gain: 0.12, wet: 0.35 });
      bell(c, N.A5, { at: 0.18, dur: 0.6, gain: 0.1, wet: 0.35 });
      break;
    case 'barbarianAttack':
      [0, 0.22, 0.44].forEach((at) => drum(c, 80, { at, dur: 0.4, gain: 0.45 }));
      brass(c, N.C3, { at: 0.1, dur: 1.1, gain: 0.12, wet: 0.4 });
      brass(c, hz(-18), { at: 0.1, dur: 1.1, gain: 0.08, wet: 0.4 });
      break;

    // ── rewards ────────────────────────────────────────────────────────────
    case 'award':
      [N.C5, N.E5, N.G5].forEach((f, i) => brass(c, f, { at: i * 0.1, dur: 0.35, gain: 0.08, wet: 0.35 }));
      brass(c, N.C6, { at: 0.3, dur: 0.8, gain: 0.09, wet: 0.45 });
      break;
    case 'repelled':
      [N.G4, N.C5, N.E5, N.G5].forEach((f, i) => brass(c, f, { at: i * 0.09, dur: 0.4, gain: 0.08, wet: 0.35 }));
      drum(c, 90, { dur: 0.3, gain: 0.3 });
      break;
    case 'metropolis': {
      // a small fanfare: rising triad, a held major chord and bells on top
      drum(c, 90, { dur: 0.4, gain: 0.35 });
      [N.C5, N.E5, N.G5].forEach((f, i) => brass(c, f, { at: i * 0.11, dur: 0.3, gain: 0.09, wet: 0.35 }));
      [N.C4, N.G4, N.C5, N.E5, N.G5].forEach((f) => brass(c, f, { at: 0.36, dur: 1.3, gain: 0.06, wet: 0.5 }));
      [N.C6, N.E6, N.G5 * 2, N.C6 * 2].forEach((f, i) => bell(c, f, { at: 0.4 + i * 0.12, dur: 0.9, gain: 0.05, wet: 0.5 }));
      break;
    }
    case 'win':
      drum(c, 90, { dur: 0.4, gain: 0.35 });
      drum(c, 90, { at: 0.24, dur: 0.4, gain: 0.35 });
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => brass(c, f, { at: 0.1 + i * 0.13, dur: 0.35, gain: 0.09, wet: 0.35 }));
      [N.C4, N.E4, N.G4, N.C5, N.E5, N.G5, N.C6].forEach((f) => brass(c, f, { at: 0.62, dur: 1.8, gain: 0.05, wet: 0.55 }));
      [N.E6, N.G5 * 2, N.C6 * 2].forEach((f, i) => bell(c, f, { at: 0.7 + i * 0.15, dur: 1.2, gain: 0.05, wet: 0.55 }));
      break;
    case 'lose':
      [N.G4, N.E4, N.C4].forEach((f, i) => pluck(c, f, { at: i * 0.22, dur: 0.7, gain: 0.12, wet: 0.4 }));
      break;
  }
}
