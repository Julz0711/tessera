import { describe, expect, it } from 'vitest';
import { botAction } from '@/bots';
import { ACCURACY_ELO, LOSS_THRESHOLDS, accuracyEloNudge, accuracyFromLoss, classify } from '@/bots/analysis/accuracy';
import { analyseGame, interleave } from '@/bots/analysis/analyse';
import { describeAction } from '@/bots/analysis/describeAction';
import { winChances } from '@/bots/analysis/evaluate';
import { vertexScore } from '@/bots/eval';
import { seatsToAsk } from '@/bots/simulate';
import { applyAction, createGame, legalSettlementSpots, viewFor, type Action, type GameState, type MapId, type Mode } from '@/engine';
import type { ReplayStep } from '@/engine/replay';

/**
 * Plays a bot game to its end, recording (seat, action) like the server's stored events. `worst`: that
 * seat opens on the worst corner on the board instead (a deliberate blunder). `saboteur`: that seat
 * plays like a bot but ends its turn instead of every other build it wants (whenever the action count is
 * even), so it sits on affordable cities, settlements and knights all game.
 */
function record(seed: number, mode: Mode, players = 3, map: MapId = 'standard', worst?: number, saboteur?: number) {
  const initial = createGame({
    seed,
    mode,
    settings: { map },
    players: Array.from({ length: players }, (_, i) => ({ id: `b${i}`, name: `Bot ${i}`, color: (['red', 'blue', 'orange', 'white'] as const)[i], isBot: i !== saboteur })),
  });
  const stored = JSON.parse(JSON.stringify(initial)) as GameState;
  const steps: ReplayStep[] = [];
  let s = initial;
  while (s.phase !== 'ended' && steps.length < 6000) {
    const seat = seatsToAsk(s)[0];
    let action = botAction(viewFor(s, seat), seat, { tradeTimedOut: true })!;
    if (seat === worst && steps.length === 0) {
      const view = viewFor(s, seat);
      const spots = legalSettlementSpots(s, seat, true).sort((a, b) => vertexScore(view, seat, a) - vertexScore(view, seat, b));
      action = { type: 'buildSettlement', vertex: spots[0] };
    }
    if (seat === saboteur && action.type.startsWith('build') && steps.length % 2 === 0 && applyAction(s, seat, { type: 'endTurn' }).ok) {
      action = { type: 'endTurn' };
    }
    const r = applyAction(s, seat, action);
    if (!r.ok) throw new Error(r.error);
    s = r.state;
    steps.push({ seat, action: JSON.parse(JSON.stringify(action)) as Action });
  }
  return { initial: stored, steps };
}

const unlimited = { maxWork: 1e9, maxMs: 1e9 };

describe('accuracy formula', () => {
  it('is 100 without loss, falls with the average loss and stays within 1..100', () => {
    expect(accuracyFromLoss(0)).toBe(100);
    expect(accuracyFromLoss(1)).toBeCloseTo(83.5, 0);
    expect(accuracyFromLoss(2.5)).toBeCloseTo(63.6, 0);
    expect(accuracyFromLoss(5)).toBeCloseTo(40, 0);
    expect(accuracyFromLoss(1000)).toBe(1);
    expect(accuracyFromLoss(-3)).toBe(100);
    let prev = 101;
    for (let loss = 0; loss <= 40; loss += 0.5) {
      const a = accuracyFromLoss(loss);
      expect(a).toBeLessThanOrEqual(prev);
      expect(a).toBeGreaterThanOrEqual(1);
      prev = a;
    }
  });

  it('classifies losses by the thresholds', () => {
    expect(classify(0)).toBeNull();
    expect(classify(LOSS_THRESHOLDS.inaccuracy - 0.1)).toBeNull();
    expect(classify(LOSS_THRESHOLDS.inaccuracy)).toBe('inaccuracy');
    expect(classify(LOSS_THRESHOLDS.mistake)).toBe('mistake');
    expect(classify(LOSS_THRESHOLDS.blunder - 0.1)).toBe('mistake');
    expect(classify(LOSS_THRESHOLDS.blunder)).toBe('blunder');
    expect(classify(100)).toBe('blunder');
  });

  it('nudges Elo by (accuracy − 75) / 10, capped at ±3', () => {
    expect(accuracyEloNudge(ACCURACY_ELO.pivot)).toBe(0);
    expect(accuracyEloNudge(79)).toBe(0);
    expect(accuracyEloNudge(85)).toBe(1);
    expect(accuracyEloNudge(65)).toBe(-1);
    expect(accuracyEloNudge(100)).toBe(3);
    expect(accuracyEloNudge(1)).toBe(-3);
    for (let a = 1; a <= 100; a++) expect(Math.abs(accuracyEloNudge(a))).toBeLessThanOrEqual(ACCURACY_ELO.cap);
  });
});

describe('game analysis', () => {
  it('orders decisions so any prefix covers the whole game', () => {
    const order = interleave(Array.from({ length: 11 }, (_, i) => i));
    expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: 11 }, (_, i) => i));
    expect(order.slice(0, 6)).toEqual([0, 8, 4, 2, 6, 10]);
  });

  it('turns a position into win chances that sum to one (certain once the game is won)', () => {
    const { initial, steps } = record(3, 'classic');
    const chances = winChances(initial);
    expect(chances.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    let s = initial;
    for (const step of steps) s = (applyAction(s, step.seat, step.action) as { state: GameState }).state;
    expect(winChances(s)[s.winner!]).toBe(1);
  });

  it('grades a recorded bot game deterministically, within 1..100, verdicts matching the thresholds', () => {
    const game = record(7, 'classic');
    const a = analyseGame(game, unlimited);
    const b = analyseGame(game, unlimited);
    expect({ ...a, ms: 0 }).toEqual({ ...b, ms: 0 });
    expect(a.partial).toBe(false);
    expect(a.search.level).toBe(0);
    for (const p of a.players) {
      expect(p.complete).toBe(true);
      expect(p.analysed).toBe(p.decisions);
      expect(p.decisions).toBeGreaterThan(5);
      expect(p.accuracy).toBeGreaterThanOrEqual(1);
      expect(p.accuracy).toBeLessThanOrEqual(100);
      // The stored average is rounded to a tenth.
      expect(Math.abs(p.accuracy! - accuracyFromLoss(p.averageLoss))).toBeLessThan(1);
      const mine = a.moves.filter((m) => m.seat === p.seat);
      expect(mine.filter((m) => m.verdict === 'blunder').length).toBe(p.blunders);
      expect(mine.filter((m) => m.verdict === 'mistake').length).toBe(p.mistakes);
      expect(mine.filter((m) => m.verdict === 'inaccuracy').length).toBe(p.inaccuracies);
    }
    for (const m of a.moves) {
      expect(classify(m.loss)).toBe(m.verdict);
      expect(m.loss).toBeCloseTo(m.winBest - m.winPlayed, 0);
      expect(m.played).not.toBe(m.best);
      expect(m.step).toBeGreaterThanOrEqual(0);
      expect(m.step).toBeLessThan(game.steps.length);
    }
  });

  it('flags a terrible opening placement', () => {
    const game = record(5, 'classic', 4, 'standard', 0);
    const a = analyseGame(game, { ...unlimited, prioritySeats: [0] });
    const opening = a.moves.find((m) => m.step === 0);
    expect(opening?.verdict).toBeTruthy();
    expect(opening!.best).toMatch(/^Place a settlement on /);
  });

  it('keeps to its work budget, cutting back and marking the result partial, humans first', () => {
    const game = record(7, 'classic');
    const full = analyseGame(game, unlimited);
    const maxWork = Math.round(full.work / 4);
    const cut = analyseGame(game, { maxWork, maxMs: 1e9, prioritySeats: [1] });
    expect(cut.partial).toBe(true);
    expect(cut.search.level).toBeGreaterThan(0);
    // It stops at the first decision that starts over budget: at most one decision's worth over.
    expect(cut.work).toBeLessThan(maxWork + 400);
    expect(cut.players[1].analysed).toBeGreaterThan(cut.players[0].analysed);
    expect(cut.players.some((p) => !p.complete)).toBe(true);
    for (const p of cut.players) if (p.analysed) expect(p.accuracy).toBeGreaterThanOrEqual(1);
    // Deterministic under a work budget too.
    expect({ ...analyseGame(game, { maxWork, maxMs: 1e9, prioritySeats: [1] }), ms: 0 }).toEqual({ ...cut, ms: 0 });
  });

  it('handles Cities & Knights and sea maps', () => {
    for (const [mode, map] of [['ck', 'standard'], ['classic', 'farShores'], ['ck', 'veiledIsles']] as const) {
      const game = record(4, mode, 3, map);
      const a = analyseGame(game, { maxWork: 1500, maxMs: 1e9 });
      expect(a.players.some((p) => p.analysed > 0)).toBe(true);
      for (const p of a.players) if (p.accuracy !== null) expect(p.accuracy).toBeGreaterThanOrEqual(1);
    }
  });

  it('stops gracefully where the history breaks off', () => {
    const game = record(7, 'classic');
    const broken = { initial: game.initial, steps: [...game.steps.slice(0, 60), { seat: 0, action: { type: 'buildCity', vertex: -1 } as Action }, ...game.steps.slice(60)] };
    const a = analyseGame(broken, unlimited);
    expect(a.partial).toBe(true);
    expect(a.moves.every((m) => m.step < 60)).toBe(true);
    expect(a.players.every((p) => !p.complete)).toBe(true);
  });

  it('names moves in plain words', () => {
    const { initial } = record(7, 'classic');
    const playing: GameState = { ...initial, phase: 'play' };
    const desert = initial.board.hexes.findIndex((h) => h.terrain === 'desert');
    const tile = initial.board.hexes.findIndex((h) => h.token === 6);
    expect(describeAction(initial, { type: 'endTurn' })).toBe('End the turn');
    expect(describeAction(initial, { type: 'buildSettlement', vertex: 0 })).toMatch(/^Place a settlement on \S/);
    expect(describeAction(playing, { type: 'buildSettlement', vertex: 0 })).toMatch(/^Build a settlement on \S/);
    expect(describeAction(playing, { type: 'buildCity', vertex: 0 })).toMatch(/^Build a city on \S/);
    expect(describeAction(playing, { type: 'buildRoad', edge: 0 })).toMatch(/^Build a road (between|along|on the coast)/);
    expect(describeAction(initial, { type: 'moveRobber', hex: desert, victim: null })).toBe('Move the robber to the desert');
    expect(describeAction(initial, { type: 'moveRobber', hex: tile, victim: 1 })).toMatch(/^Move the robber to the 6 \w+ tile, robbing Bot 1$/);
    expect(describeAction(initial, { type: 'bankTrade', give: 'wool', get: 'ore', count: 1 })).toBe('Trade wool for ore with the bank');
    expect(describeAction(initial, { type: 'buyDevCard' })).toBe('Buy a development card');
    expect(describeAction(initial, { type: 'playMonopoly', resource: 'ore' })).toBe('Play Monopoly on ore');

    const ck = record(7, 'ck').initial;
    expect(describeAction(ck, { type: 'buildKnight', vertex: 0 })).toBe('Build a knight');
    expect(describeAction(ck, { type: 'buildKnight', vertex: 0 }, true)).toMatch(/^Build a knight on \S/);
    expect(describeAction(ck, { type: 'activateKnight', vertex: 0 })).toBe('Activate a knight');
    expect(describeAction(ck, { type: 'buildWall', vertex: 0 })).toBe('Build a city wall');
    expect(describeAction(ck, { type: 'improveCity', track: 'science' })).toBe('Improve Science to level 1');
    expect(describeAction(ck, { type: 'chooseDeck', track: 'trade' })).toBe('Draw a Trade progress card');
  });

  // A seat that ends its turn instead of every other build it wants: it must come out clearly worst,
  // with real mistakes, while the bots around it keep a normal score. (C&K seed 7 seat 2 is the game that
  // first showed the analysis was too lenient: 89.3 with a single inaccuracy.)
  it.each([
    ['classic', 7, 2],
    ['ck', 7, 2],
  ] as const)('marks down a %s player who skips half their builds (seed %i, seat %i)', (mode, seed, seat) => {
    const game = record(seed, mode, 4, 'standard', undefined, seat);
    const a = analyseGame(game, { prioritySeats: [seat] });
    expect(a.partial).toBe(false);
    const saboteur = a.players[seat];
    const bots = a.players.filter((p) => p.seat !== seat);
    expect(saboteur.accuracy).toBeLessThan(60);
    for (const p of bots) {
      expect(saboteur.accuracy!).toBeLessThan(p.accuracy!);
      expect(p.accuracy).toBeGreaterThanOrEqual(65);
      expect(p.blunders).toBeLessThanOrEqual(1);
    }
    // Sitting on an affordable city or settlement is a blunder; mistakes counts those and the lesser ones.
    expect(saboteur.blunders).toBeGreaterThanOrEqual(1);
    expect(saboteur.mistakes + saboteur.blunders).toBeGreaterThanOrEqual(2);
    expect(a.moves.some((m) => m.seat === seat && m.played === 'End the turn' && /^Build a (city|settlement) on /.test(m.best))).toBe(true);
  });
});
