import { describe, expect, it } from 'vitest';
import { BAG_REFILL_AT, drawBalanced } from '../dice';
import { rollDie } from '../rng';
import { createGame } from '../state';
import type { DiceBag, GameState, PlayerColor } from '../types';
import { viewFor } from '../view';
import { act, autoSetup } from './kit';

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
