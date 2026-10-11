import { describe, expect, it } from 'vitest';
import { botAction } from '@/bots';
import { seatsToAsk } from '@/bots/simulate';
import { applyAction } from '../apply';
import { BAG_REFILL_AT, DICE_VERSION, RECENT_WINDOW, balancedWeights, drawBalanced } from '../dice';
import { buildReplay, type ReplayStep } from '../replay';
import { rollDie } from '../rng';
import { createGame } from '../state';
import type { DiceBag, GameState, PlayerColor } from '../types';
import { viewFor } from '../view';
import { act, autoSetup } from './kit';

const V1_SNAPSHOT = [44, 34, 62, 51, 16, 36, 23, 46, 63, 33, 22, 64, 53, 24, 15, 41, 52, 43, 11, 35, 61, 12, 45, 13, 24, 13, 22, 55, 42, 11, 23, 62, 41, 56, 32, 36, 12, 15, 46, 51];

/** Chance of each total 2–12 with two real dice. */
const ODDS = [0, 0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1].map((n) => n / 36);

function draws(seed: number, n: number): number[] {
  const h: { rng: number; diceBag?: DiceBag } = { rng: seed };
  return Array.from({ length: n }, () => {
    const { red, yellow } = drawBalanced(h);
    return red + yellow;
  });
}

function game(dice?: 'random' | 'balanced'): GameState {
  const colors: PlayerColor[] = ['red', 'blue', 'white'];
  return createGame({
    seed: 7,
    mode: 'classic',
    settings: dice ? { dice } : undefined,
    players: colors.map((color, i) => ({ id: `p${i}`, name: `P${i}`, color, isBot: false })),
  });
}

describe('balanced dice', () => {
  it('draws valid dice and deals the same rolls from the same seed', () => {
    const a = draws(42, 200);
    expect(a.every((t) => t >= 2 && t <= 12)).toBe(true);
    expect(draws(42, 200)).toEqual(a);
    expect(draws(43, 200)).not.toEqual(a);
  });

  it('refills the bag while there are still cards left, so the end of a bag is never certain', () => {
    const h: { rng: number; diceBag?: DiceBag } = { rng: 1 };
    for (let i = 0; i < 300; i++) {
      drawBalanced(h);
      expect(h.diceBag!.cards.length).toBeGreaterThanOrEqual(BAG_REFILL_AT);
      expect(h.diceBag!.cards.length).toBeLessThan(36);
    }
  });

  it('keeps every total close to its real odds over a game, closer than real dice do', () => {
    // How much of a 60-roll game lands on the "wrong" totals, averaged over many games.
    const misplaced = (rolls: number[]) => {
      const counts = Array(13).fill(0);
      for (const t of rolls) counts[t]++;
      return counts.reduce((sum, c, t) => sum + Math.abs(c / rolls.length - ODDS[t]), 0) / 2;
    };
    let balanced = 0;
    let random = 0;
    for (let g = 0; g < 400; g++) {
      balanced += misplaced(draws(g * 31 + 5, 60));
      const h = { rng: g * 31 + 5 };
      random += misplaced(Array.from({ length: 60 }, () => rollDie(h) + rollDie(h)));
    }
    expect(balanced / 400).toBeLessThan(0.12);
    expect(balanced).toBeLessThan(random * 0.75);
  });

  it('repeats the previous total less often than real dice (1 in 9)', () => {
    const rolls = draws(9, 20000);
    let repeats = 0;
    for (let i = 1; i < rolls.length; i++) if (rolls[i] === rolls[i - 1]) repeats++;
    expect(repeats / (rolls.length - 1)).toBeLessThan(0.08);
  });

  it('keeps long-run odds of each total close to real dice', () => {
    const rolls = draws(3, 36000);
    const counts = Array(13).fill(0);
    for (const t of rolls) counts[t]++;
    for (let t = 2; t <= 12; t++) expect(Math.abs(counts[t] / rolls.length - ODDS[t])).toBeLessThan(0.012);
  });
});

describe('dice setting in a game', () => {
  it('rolls random dice by default, without a bag', () => {
    let s = autoSetup(game());
    expect(s.settings.dice).toBe('random');
    s = act(s, s.turn.seat, { type: 'rollDice' });
    expect(s.diceBag).toBeUndefined();
  });

  it('draws balanced dice from a bag that players never see', () => {
    let s = autoSetup(game('balanced'));
    s = act(s, s.turn.seat, { type: 'rollDice' });
    expect(s.turn.dice).toBeTruthy();
    expect(s.diceBag!.cards).toHaveLength(35);
    for (let seat = 0; seat < 3; seat++) expect('diceBag' in viewFor(s, seat)).toBe(false);
  });
});

type Holder = { rng: number; diceBag?: DiceBag; settings?: { diceVersion?: number } };

/** Rolls with 4 seats taking turns; returns totals and rollers. */
function rolls(seed: number, n: number, version: number | undefined, seats = 4) {
  const h: Holder = { rng: seed, settings: { diceVersion: version } };
  const totals: number[] = [];
  const rollers: number[] = [];
  for (let i = 0; i < n; i++) {
    const d = drawBalanced(h, i % seats);
    totals.push(d.red + d.yellow);
    rollers.push(i % seats);
  }
  return { totals, rollers, h };
}

const sevenShares = (r: { totals: number[]; rollers: number[] }, seats = 4) => {
  const c = Array(seats).fill(0);
  r.totals.forEach((t, i) => { if (t === 7) c[r.rollers[i]]++; });
  const sum = c.reduce((a, b) => a + b, 0) || 1;
  return c.map((x) => x / sum);
};

/** Mean deviation of each seat's seven share from 1/4, over many short games. */
function sevenSkew(version: number | undefined, useRandom = false) {
  let skew = 0;
  const games = 300;
  for (let g = 0; g < games; g++) {
    const r = rolls(g * 17 + 3, 80, version);
    if (useRandom) {
      const h = { rng: g * 17 + 3 };
      r.totals = r.totals.map(() => rollDie(h) + rollDie(h));
    }
    skew += sevenShares(r).reduce((a, x) => a + Math.abs(x - 0.25), 0) / 4;
  }
  return skew / games;
}

describe('balanced dice v2', () => {
  it('keeps the totals within a hair of their 36ths over a long run', () => {
    const { totals } = rolls(11, 50000, DICE_VERSION);
    const counts = Array(13).fill(0);
    for (const t of totals) counts[t]++;
    for (let t = 2; t <= 12; t++) expect(Math.abs(counts[t] / totals.length - ODDS[t])).toBeLessThan(0.01);
  });

  it('never repeats a total rolled three or more times in the last five rolls', () => {
    const { totals } = rolls(5, 20000, DICE_VERSION);
    for (let i = RECENT_WINDOW; i < totals.length; i++) {
      const seen = totals.slice(i - RECENT_WINDOW, i).filter((t) => t === totals[i]).length;
      expect(seen).toBeLessThan(3);
    }
  });

  it('weighs recent totals 100%, 66%, 32% and 0%', () => {
    const six = [2 * 6 + 2, 0]; // a six (red 3, yellow 3) and a two
    const w = (recent: number[]) => balancedWeights(six, { cards: [], last: 6, recent }, 0)[0];
    expect(w([])).toBe(1);
    expect(w([6, 4])).toBeCloseTo(0.66, 5);
    expect(w([6, 6, 9])).toBeCloseTo(0.32, 5);
    expect(w([6, 6, 6])).toBe(0);
  });

  it('spreads sevens evenly over the seats, tighter than v1 and plain dice', () => {
    for (const x of sevenShares(rolls(2, 20000, DICE_VERSION))) expect(Math.abs(x - 0.25)).toBeLessThan(0.02);
    const v2 = sevenSkew(DICE_VERSION);
    expect(v2).toBeLessThan(sevenSkew(undefined) * 0.85);
    expect(v2).toBeLessThan(sevenSkew(undefined, true) * 0.85);
  });

  it('lowers the seven chance of a player who is on a seven streak', () => {
    const base: DiceBag = { cards: [], last: 7, recent: [], sevens: [2, 2, 2, 2], rolled: [0, 1, 2, 3] };
    const seven = [2 * 6 + 3];
    const none = balancedWeights(seven, { ...base, streak: null }, 0)[0];
    const own = balancedWeights(seven, { ...base, streak: { seat: 0, count: 2 } }, 0)[0];
    const other = balancedWeights(seven, { ...base, streak: { seat: 1, count: 2 } }, 0)[0];
    expect(own).toBeCloseTo(none - 0.8, 5);
    expect(other).toBeCloseTo(Math.min(2, none + 0.8), 5);
    expect(balancedWeights([...seven, 0], { ...base, streak: { seat: 0, count: 9 } }, 0)[0]).toBe(0);
  });

  it('is deterministic for a seed and tracks its counters across refills', () => {
    const a = rolls(8, 500, DICE_VERSION);
    expect(rolls(8, 500, DICE_VERSION).totals).toEqual(a.totals);
    expect(rolls(9, 500, DICE_VERSION).totals).not.toEqual(a.totals);
    expect(a.h.diceBag!.sevens!.reduce((x, y) => x + y, 0)).toBe(a.totals.filter((t) => t === 7).length);
    expect(a.h.diceBag!.recent).toEqual(a.totals.slice(-RECENT_WINDOW));
    expect(a.h.diceBag!.cards.length).toBeGreaterThanOrEqual(BAG_REFILL_AT);
  });

  it('is on for new games and survives a JSON round trip mid-game', () => {
    let s = autoSetup(game('balanced'));
    expect(s.settings.diceVersion).toBe(DICE_VERSION);
    s = act(s, s.turn.seat, { type: 'rollDice' });
    expect(JSON.parse(JSON.stringify(s)).diceBag).toEqual(s.diceBag);
    expect(s.diceBag!.rolled).toEqual([s.turn.seat]);
  });
});

describe('balanced dice v1 (games saved before v2)', () => {
  it('reproduces the original rolls exactly when the game has no dice version', () => {
    const h: Holder = { rng: 42 };
    const out = Array.from({ length: 40 }, () => { const d = drawBalanced(h, 3); return d.red * 10 + d.yellow; });
    expect(out).toEqual(V1_SNAPSHOT);
    expect(h.diceBag!.recent).toBeUndefined();
  });

  it('still rebuilds an old-style balanced game through replay', () => {
    const initial = createGame({
      seed: 21,
      mode: 'classic',
      settings: { dice: 'balanced' },
      players: [0, 1, 2].map((i) => ({ id: `b${i}`, name: `Bot ${i}`, color: (['red', 'blue', 'orange'] as const)[i], isBot: true })),
    });
    delete initial.settings.diceVersion;
    const stored = JSON.parse(JSON.stringify(initial)) as GameState;
    const steps: ReplayStep[] = [];
    let s = initial;
    while (s.phase !== 'ended' && steps.length < 6000) {
      const seat = seatsToAsk(s)[0];
      const action = botAction(viewFor(s, seat), seat, { tradeTimedOut: true })!;
      const r = applyAction(s, seat, action);
      if (!r.ok) throw new Error(r.error);
      s = r.state;
      steps.push({ seat, action: JSON.parse(JSON.stringify(action)) });
    }
    expect(s.diceBag!.recent).toBeUndefined();
    const replay = buildReplay({ initial: stored, steps });
    expect(replay.stopped).toBe(false);
    expect(replay.stateAt(replay.total)).toEqual(s);
  });
});
