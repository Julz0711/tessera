'use client';

/**
 * Background music: calm and generative, synthesized live with WebAudio (no files to download), in
 * the mood of the board theme. A slow chord progression on a soft pad, a bass note under each chord
 * (a drone too, for some themes) and a sparse melody wandering over the scale in small steps, so it
 * never quite repeats. It plays through the sound effects' master bus (master volume, compressor,
 * reverb) at its own, lower level.
 *
 * Scheduling follows the usual WebAudio pattern: a timer wakes every 250 ms and books the notes of
 * the next second on the audio clock, so the timing stays exact however busy the page is. A hidden
 * tab goes quiet and picks up again where it is when it's back.
 */
import { useEffect } from 'react';
import { usePrefs } from './prefs';
import type { BoardThemeId } from './themes';
import { audioGraph, setVolume } from './sound';

type Lead = 'pluck' | 'bell' | 'box' | 'arp';

interface Mood {
  bpm: number;
  /** MIDI note of the key's root in the bass register (48 = C3). */
  root: number;
  /** The progression, one chord per two bars: semitones above the root, voiced an octave up. */
  chords: number[][];
  /** Melody notes: semitones above the root, played two octaves up. */
  scale: number[];
  pad: OscillatorType;
  /** Low-pass cutoff of the pad in Hz: lower is darker. */
  cutoff: number;
  lead: Lead;
  /** Chance of a melody note on each beat. */
  density: number;
  /** A low root (and fifth) held under everything. */
  drone?: boolean;
}

const MAJOR_PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
const MINOR_PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22];
const LYDIAN = [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19];

/** One mood per board theme. */
const MOODS: Record<BoardThemeId, Mood> = {
  // C major, I–V–vi–IV: a sunny island, plucked like a lute.
  classic: { bpm: 66, root: 48, chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], scale: MAJOR_PENTA, pad: 'triangle', cutoff: 1200, lead: 'pluck', density: 0.42 },
  // A minor, i–VI–III–VII under the moon: slower, darker, bells.
  night: { bpm: 56, root: 45, chords: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]], scale: MINOR_PENTA, pad: 'sine', cutoff: 800, lead: 'bell', density: 0.3 },
  // E in-scale (E F A B C), open fifths and a koto-like pluck.
  sakura: { bpm: 60, root: 52, chords: [[0, 7, 12], [5, 8, 12], [1, 5, 8], [0, 5, 7]], scale: [0, 1, 5, 7, 8, 12, 13, 17, 19, 20], pad: 'triangle', cutoff: 1000, lead: 'pluck', density: 0.34 },
  // D dorian over a drone, i–IV–i–VII: cold water and wide fjords.
  nordic: { bpm: 58, root: 50, chords: [[0, 3, 7], [5, 9, 12], [0, 3, 7], [10, 14, 17]], scale: [0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17], pad: 'sawtooth', cutoff: 650, lead: 'bell', density: 0.28, drone: true },
  // G major, I–IV–I–V: a campfire guitar on the prairie.
  frontier: { bpm: 72, root: 43, chords: [[0, 4, 7], [5, 9, 12], [0, 4, 7], [7, 11, 14]], scale: MAJOR_PENTA, pad: 'triangle', cutoff: 1400, lead: 'pluck', density: 0.45 },
  // D phrygian dominant over a drone: D–Eb–D–Cm along the river.
  nile: { bpm: 64, root: 50, chords: [[0, 4, 7], [1, 5, 8], [0, 4, 7], [10, 13, 17]], scale: [0, 1, 4, 5, 7, 8, 10, 12, 13, 16], pad: 'triangle', cutoff: 1000, lead: 'pluck', density: 0.38, drone: true },
  // F lydian, airy: Fmaj7–G/F–Am7–C among the clouds.
  skyport: { bpm: 62, root: 53, chords: [[0, 4, 7, 11], [2, 6, 9], [4, 7, 11, 14], [7, 11, 14]], scale: LYDIAN, pad: 'sine', cutoff: 1500, lead: 'bell', density: 0.3 },
  // A minor synthwave: a soft, filtered arpeggio over a warm saw pad.
  cyberpunk: { bpm: 84, root: 45, chords: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]], scale: [0, 2, 3, 5, 7, 8, 10, 12], pad: 'sawtooth', cutoff: 900, lead: 'arp', density: 1 },
  // E lydian, slow and far apart: Emaj7–F#/E–C#m7–Amaj7, adrift.
  orbital: { bpm: 54, root: 52, chords: [[0, 4, 7, 11], [2, 6, 9], [9, 12, 16, 19], [5, 9, 12, 16]], scale: LYDIAN, pad: 'sine', cutoff: 1000, lead: 'bell', density: 0.22 },
  // D major on a music box: D–A–Bm–G.
  origami: { bpm: 68, root: 50, chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], scale: MAJOR_PENTA, pad: 'triangle', cutoff: 1300, lead: 'box', density: 0.5 },
};

const BEATS_PER_CHORD = 8;
/** How far ahead notes are booked on the audio clock (s), and how often the timer wakes (ms). */
const LOOKAHEAD = 1;
const TICK_MS = 250;
/** The music's share of the master volume at full music volume: it sits under the sound effects. */
const MUSIC_GAIN = 1.3;

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const rand = (n: number) => Math.floor(Math.random() * n);

let ctx: AudioContext | null = null;
/** Dry and reverb buses; both follow the music volume. */
let dry: GainNode | null = null;
let wet: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let mood: Mood = MOODS.classic;
/** A theme change waits for the next chord, so the old chord never clashes with the new key. */
let nextMood: Mood | null = null;
let level = 0;
let nextAt = 0;
let beat = 0;
/** The melody's place in the scale, and how many beats it rests. */
let step = 4;
let rest = 0;
let hidden = false;

/** An envelope into both buses; returns the node to feed. */
function envelope(t: number, attack: number, hold: number, release: number, peak: number, send: number): GainNode {
  const c = ctx!;
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(peak, t + attack);
  env.gain.setValueAtTime(peak, t + attack + hold);
  env.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  env.connect(dry!);
  if (send > 0) {
    const s = c.createGain();
    s.gain.value = send;
    env.connect(s).connect(wet!);
  }
  return env;
}

function osc(type: OscillatorType, freq: number, into: AudioNode, start: number, stop: number, detune = 0): void {
  const o = ctx!.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  o.detune.value = detune;
  o.connect(into);
  o.start(start);
  o.stop(stop);
}

/** A soft pad note: two slightly detuned oscillators under a low-pass, fading in and out slowly. */
function pad(midi: number, t: number, dur: number): void {
  const release = 2.6;
  const env = envelope(t, 1.8, Math.max(0, dur - 1.8), release, mood.pad === 'sawtooth' ? 0.015 : 0.026, 0.55);
  const lp = ctx!.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = mood.cutoff;
  lp.Q.value = 0.4;
  lp.connect(env);
  for (const detune of [-6, 6]) osc(mood.pad, hz(midi), lp, t, t + dur + release + 0.1, detune);
}

function bass(midi: number, t: number, dur: number): void {
  const env = envelope(t, 0.08, dur * 0.45, dur * 0.6, 0.075, 0.15);
  osc('sine', hz(midi), env, t, t + dur * 1.1);
}

function drone(midi: number, t: number, dur: number): void {
  const env = envelope(t, 2, Math.max(0, dur - 2), 2.5, 0.03, 0.4);
  osc('sine', hz(midi), env, t, t + dur + 2.6);
  osc('triangle', hz(midi + 7), env, t, t + dur + 2.6);
}

/** One melody note in the mood's voice. */
function lead(midi: number, t: number, dur: number): void {
  const f = hz(midi);
  switch (mood.lead) {
    case 'pluck': {
      const lp = ctx!.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(f * 6, t);
      lp.frequency.exponentialRampToValueAtTime(f * 1.4, t + 0.5);
      lp.connect(envelope(t, 0.006, 0, 0.9 + dur * 0.4, 0.06, 0.35));
      osc('triangle', f, lp, t, t + 2);
      break;
    }
    case 'bell': {
      const env = envelope(t, 0.005, 0, 2.2, 0.045, 0.5);
      osc('sine', f, env, t, t + 2.4);
      const shimmer = envelope(t, 0.005, 0, 0.9, 0.012, 0.5);
      osc('sine', f * 2.76, shimmer, t, t + 1);
      break;
    }
    case 'box': {
      // A music box: an octave up, short and bright.
      const env = envelope(t, 0.004, 0, 1.2, 0.035, 0.45);
      osc('sine', f * 2, env, t, t + 1.3);
      osc('sine', f * 4, envelope(t, 0.004, 0, 0.4, 0.008, 0.3), t, t + 0.5);
      break;
    }
    case 'arp':
      break;
  }
}

/** Cyberpunk: eighth notes up and down the chord, quiet and filtered. */
function arp(chord: number[], t: number, spb: number): void {
  const tones = [...chord, chord[0] + 12];
  const order = [...tones, ...tones.slice(1, -1).reverse()];
  for (let half = 0; half < 2; half++) {
    const i = (beat * 2 + half) % order.length;
    const at = t + half * (spb / 2);
    const lp = ctx!.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    lp.connect(envelope(at, 0.005, 0, 0.28, 0.03, 0.3));
    osc('sawtooth', hz(mood.root + 24 + order[i]), lp, at, at + 0.35);
  }
}

/** The melody's move on this beat: mostly small steps; a chord tone when the chord changes; rests between phrases. */
function melody(chord: number[], t: number, spb: number): void {
  if (rest > 0) {
    rest--;
    return;
  }
  // Phrases breathe: now and then the melody stops for a bar or two.
  if (beat % 16 === 15 && Math.random() < 0.45) {
    rest = 4 + rand(5);
    return;
  }
  if (Math.random() > mood.density) return;
  const scale = mood.scale;
  const chordTones = scale.map((n, i) => ({ n, i })).filter(({ n }) => chord.some((c) => (((c - n) % 12) + 12) % 12 === 0));
  if (beat % BEATS_PER_CHORD === 0 && chordTones.length) {
    // Land near where it was, on a note of the new chord.
    step = chordTones.reduce((best, x) => (Math.abs(x.i - step) < Math.abs(best.i - step) ? x : best)).i;
  } else {
    const moves = [-2, -1, -1, -1, 1, 1, 1, 2];
    step = Math.max(0, Math.min(scale.length - 1, step + moves[rand(moves.length)]));
  }
  const at = t + (Math.random() < 0.22 ? spb / 2 : 0);
  lead(mood.root + 24 + scale[step], at, spb * (Math.random() < 0.3 ? 2 : 1));
}

function scheduleBeat(t: number): void {
  if (nextMood && beat % BEATS_PER_CHORD === 0) {
    mood = nextMood;
    nextMood = null;
    step = Math.min(step, mood.scale.length - 1);
  }
  const spb = 60 / mood.bpm;
  const chord = mood.chords[Math.floor(beat / BEATS_PER_CHORD) % mood.chords.length];
  if (beat % BEATS_PER_CHORD === 0) {
    const dur = spb * BEATS_PER_CHORD;
    for (const n of chord) pad(mood.root + 12 + n, t, dur);
    bass(mood.root + (chord[0] % 12), t, dur);
    if (mood.drone) drone(mood.root - 12, t, dur);
  }
  if (mood.lead === 'arp') arp(chord, t, spb);
  else melody(chord, t, spb);
}

function tick(): void {
  if (!ctx || !dry || hidden) return;
  // Wake a suspended context: browsers only allow it once the page has had a click or key press.
  if (ctx.state === 'suspended' && (navigator.userActivation?.hasBeenActive ?? true)) void ctx.resume();
  const now = ctx.currentTime;
  // After a stall (a suspended context, a throttled timer) carry on from now instead of catching up.
  if (nextAt < now) nextAt = now + 0.05;
  while (nextAt < now + LOOKAHEAD) {
    scheduleBeat(nextAt);
    nextAt += 60 / mood.bpm;
    beat++;
  }
}

function fadeTo(value: number, seconds: number): void {
  if (!ctx || !dry || !wet) return;
  for (const bus of [dry, wet]) {
    bus.gain.cancelScheduledValues(ctx.currentTime);
    bus.gain.setTargetAtTime(value, ctx.currentTime, seconds / 3);
  }
}

function onVisibility(): void {
  hidden = document.visibilityState === 'hidden';
  if (hidden) fadeTo(0, 0.5);
  else {
    fadeTo(level * MUSIC_GAIN, 1.5);
    tick();
  }
}

/** Starts the music in the mood of `theme` at `volume` (0..1), or updates it if it's already playing. */
export function startMusic(theme: BoardThemeId, volume: number): void {
  const next = MOODS[theme] ?? MOODS.classic;
  if (volume <= 0) return stopMusic();
  level = volume;
  if (timer && dry) {
    if (next !== mood) nextMood = next;
    fadeTo(level * MUSIC_GAIN, 0.6);
    return;
  }
  const graph = audioGraph();
  if (!graph) return; // muted: turning the sound back up starts it
  ctx = graph.ctx;
  mood = next;
  nextMood = null;
  dry = ctx.createGain();
  wet = ctx.createGain();
  dry.gain.value = 0;
  wet.gain.value = 0;
  dry.connect(graph.master);
  wet.connect(graph.reverb);
  hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
  fadeTo(hidden ? 0 : level * MUSIC_GAIN, 3);
  nextAt = ctx.currentTime + 0.3;
  beat = 0;
  rest = 0;
  step = Math.floor(mood.scale.length / 2);
  timer = setInterval(tick, TICK_MS);
  document.addEventListener('visibilitychange', onVisibility);
  tick();
}

/** Fades the music out and stops booking notes. */
export function stopMusic(): void {
  if (timer) clearInterval(timer);
  timer = null;
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
  const [d, w, c] = [dry, wet, ctx];
  dry = wet = null;
  if (!d || !w || !c) return;
  for (const bus of [d, w]) {
    bus.gain.cancelScheduledValues(c.currentTime);
    bus.gain.setTargetAtTime(0, c.currentTime, 0.2);
  }
  // Notes already booked play out silently; drop the buses once they have.
  setTimeout(() => {
    d.disconnect();
    w.disconnect();
  }, 4000);
}

export const MUSIC_MOOD_NAMES: Record<BoardThemeId, string> = {
  classic: 'Pastoral',
  night: 'Nocturne',
  sakura: 'Garden',
  nordic: 'Fjord',
  frontier: 'Prairie',
  nile: 'River',
  skyport: 'Clouds',
  cyberpunk: 'Neon',
  orbital: 'Drift',
  origami: 'Music box',
};

/**
 * Plays the background music while mounted (the game screen), following the settings: the master
 * and music volumes, and the board theme's mood.
 */
export function useBackgroundMusic(): void {
  const volume = usePrefs((p) => p.volume);
  const music = usePrefs((p) => p.musicVolume);
  const theme = usePrefs((p) => p.boardTheme);
  useEffect(() => {
    setVolume(volume);
    if (volume > 0 && music > 0) startMusic(theme, music);
    else stopMusic();
  }, [volume, music, theme]);
  useEffect(() => () => stopMusic(), []);
}
