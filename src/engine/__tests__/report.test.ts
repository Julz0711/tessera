import { describe, expect, it } from 'vitest';
import { simulateGame } from '@/bots/simulate';
import { newGame } from './kit';
import { applyAction } from '../apply';
import { viewFor } from '../view';
import { buildReport } from '../report';
import { reportCsv } from '../reportMetrics';
import { recordSpend, recordDetailedEvent, rollProbabilities, sampleStats } from '../detailedStats';
import { handTotal } from '../hand';

describe('detailed reports', () => {
  it('keeps secret counters out of live player and spectator views', () => {
    const s = newGame(2);
    s.stats.details!.counters['devBought:victoryPoint'] = [1, 0];
    sampleStats(s);
    expect(viewFor(s, 0).stats.details).toBeUndefined();
    expect(viewFor(s, null).stats.details).toBeUndefined();
    s.phase = 'ended';
    expect(viewFor(s, null).stats.details?.counters['devBought:victoryPoint']).toEqual([1, 0]);
  });
  it('builds a live report with only public information in it', () => {
    const s = newGame(2);
    s.players[0].devCards.push({ type: 'victoryPoint', boughtOn: 0 });
    s.stats.details!.counters['devBought:victoryPoint'] = [1, 0];
    s.stats.details!.counters.rolls = [3, 2];
    sampleStats(s);
    const full = buildReport(s);
    expect(full.players[0].vp).toBe(1);
    expect(full.players[0].points['VP cards']).toBe(1);
    const live = buildReport(s, { live: true });
    expect(live.live).toBe(true);
    expect(live.winner).toBeNull();
    // The hidden VP card counts nowhere: not in the points, the breakdown or the timeline.
    expect(live.players[0].vp).toBe(0);
    expect(live.players[0].points['VP cards']).toBeUndefined();
    expect(live.stats!.details!.timeline.at(-1)!.vp).toEqual([0, 0]);
    expect(live.stats!.details!.counters['devBought:victoryPoint']).toBeUndefined();
    expect(live.stats!.details!.counters.rolls).toEqual([3, 2]);
    // Building it leaves the game's own stats alone.
    expect(s.stats.details!.counters['devBought:victoryPoint']).toEqual([1, 0]);
    expect(JSON.stringify(live)).not.toContain('publicVp');
  });
  it('leaves Classic timeline samples without public points out of a live report', () => {
    const s = newGame(2);
    s.stats.details!.timeline.push({ turn: 1, vp: [3, 2], production: [0, 0], spent: [0, 0], hand: [0, 0], improvements: [0, 0] });
    sampleStats(s, 2);
    expect(buildReport(s, { live: true }).stats!.details!.timeline.map((t) => t.turn)).toEqual([2]);
  });
  it('uses actual balanced bag weights and Alchemist when computing expectations', () => {
    const s = newGame(2);
    s.settings.dice = 'balanced'; s.diceBag = { cards: Array.from({ length: 20 }, (_, i) => i), last: 7 };
    const probabilities = rollProbabilities(s);
    expect(probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(probabilities[12]).toBe(0);
    expect(probabilities[7]).not.toBeCloseTo(6 / 36);
    s.turn.alchemist = { red: 6, yellow: 6 };
    expect(rollProbabilities(s)[12]).toBe(1);
    expect(rollProbabilities(s)[7]).toBe(0);
  });
  it('tracks spending and symmetric trade volumes without changing the input state on invalid actions', () => {
    const s = newGame(2);
    recordSpend(s, 0, { brick: 1, lumber: 1 }, 'road');
    recordDetailedEvent(s, { seq: 1, type: 'trade', seat: 0, partner: 1, give: { wool: 2 }, get: { ore: 1 } });
    expect(handTotal(s.stats.details!.hands.spent[0])).toBe(2);
    expect(s.stats.details!.hands.tradeGiven[0].wool).toBe(2);
    expect(s.stats.details!.hands.tradeReceived[1].wool).toBe(2);
    const snapshot = structuredClone(s);
    expect(applyAction(s, 0, { type: 'buildCity', vertex: -1 }).ok).toBe(false);
    expect(s).toEqual(snapshot);
  });
  it('marks resumed historical tracking as partial', () => {
    const s = newGame(2); delete s.stats.details; s.turn.n = 25;
    recordDetailedEvent(s, { seq: 1, type: 'shipMoved', seat: 0, from: 1, to: 2 });
    expect(s.stats.details).toMatchObject({ complete: false, fromTurn: 25 });
  });
  it('reconciles complete reports with final VP and recorded dice over a real game', () => {
    const { state: s, error } = simulateGame(42, 3);
    expect(error).toBeFalsy();
    const report = buildReport(s);
    for (const p of report.players) expect(Object.values(p.points).reduce((a, b) => a + b, 0)).toBe(p.vp);
    expect(s.stats.details!.expectedDice.reduce((a, b) => a + b, 0)).toBeCloseTo(s.stats.dice.reduce((a, b) => a + b, 0));
    expect(s.stats.details!.timeline.at(-1)?.vp).toEqual(report.players.map((p) => p.vp));
    expect(s.stats.details!.complete).toBe(true);
    expect(JSON.stringify(report)).not.toContain('rng');
    report.players[0].name = '=SUM(A1)';
    expect(reportCsv(report)).toContain("'=SUM(A1)");
  });
});
