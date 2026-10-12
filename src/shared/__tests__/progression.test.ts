import { describe, expect, it } from 'vitest';
import type { GameReport } from '@/engine/report';
import {
  applyGame,
  clampLoadout,
  DEFAULT_LOADOUT,
  EMPTY_PROGRESS,
  FEATS,
  gameFacts,
  gameXp,
  ITEMS,
  isUnlocked,
  levelFor,
  readProgress,
  replayGames,
  sanitizeLoadout,
  SLOTS,
  START_STATE,
  unlockState,
  xpForLevel,
  xpToNext,
  type GameFacts,
} from '../progression';

const facts = (over: Partial<GameFacts> = {}): GameFacts => ({
  gameId: 'g', pool: 'classic', map: 'standard', endedAt: '2026-10-01T12:00:00.000Z', abandoned: false, adminEdited: false,
  won: false, vp: 6, otherHumans: 2, longestRoad: false, largestArmy: false, defender: 0, playerTrades: 2, ...over,
});

describe('level curve', () => {
  it('matches the designed totals', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(150);
    expect(xpForLevel(10)).toBe(1500);
    expect(xpForLevel(30)).toBe(6420);
    expect(xpForLevel(50)).toBe(14720);
    expect(xpForLevel(100)).toBe(69730);
    expect(xpToNext(1)).toBe(150);
    expect(xpToNext(99)).toBe(1945);
    // Past level 100 every level costs what level 100 does.
    expect(xpToNext(100)).toBe(2000);
    expect(xpToNext(150)).toBe(2000);
    expect(xpForLevel(101)).toBe(69730 + 2000);
  });

  it('grows about 2.65% per level, never shrinking', () => {
    for (let L = 1; L < 100; L++) expect(xpToNext(L + 1)).toBeGreaterThanOrEqual(xpToNext(L));
    expect(xpToNext(99) / xpToNext(1)).toBeGreaterThan(12);
    expect(xpToNext(99) / xpToNext(1)).toBeLessThan(14);
  });

  it('turns XP back into a level with progress inside it', () => {
    expect(levelFor(0)).toEqual({ level: 1, into: 0, need: 150, xp: 0 });
    expect(levelFor(149).level).toBe(1);
    expect(levelFor(150)).toMatchObject({ level: 2, into: 0, need: 155 });
    for (const L of [1, 2, 7, 29, 30, 31, 64, 99, 100, 101, 250]) {
      expect(levelFor(xpForLevel(L)).level).toBe(L);
      expect(levelFor(xpForLevel(L + 1) - 1).level).toBe(L);
    }
    expect(levelFor(-5).level).toBe(1);
    expect(levelFor(Number.NaN).level).toBe(1);
  });
});

describe('game XP', () => {
  it('pays for finishing, winning and points', () => {
    expect(gameXp(facts({ vp: 6 }))).toBe(100 + 48);
    expect(gameXp(facts({ vp: 10, won: true }))).toBe(100 + 60 + 80);
  });

  it('pays a quarter against bots only, and nothing for abandoned or edited games', () => {
    expect(gameXp(facts({ vp: 10, won: true, otherHumans: 0 }))).toBe(60);
    expect(gameXp(facts({ abandoned: true }))).toBe(0);
    expect(gameXp(facts({ adminEdited: true }))).toBe(0);
  });
});

describe('feats', () => {
  it('have unique ids and sane targets', () => {
    expect(new Set(FEATS.map((f) => f.id)).size).toBe(FEATS.length);
    for (const f of FEATS) expect(f.target).toBeGreaterThan(0);
  });

  it('finish once, pay their XP once, and stop counting', () => {
    let a = applyGame(EMPTY_PROGRESS, 0, facts({ won: true, vp: 10 }));
    expect(a.completed).toEqual(expect.arrayContaining(['first-landfall', 'knighted']));
    expect(a.featXp).toBe(250 + 250);
    expect(a.xp).toBe(240 + 500);
    a = applyGame(a.record, a.xp, facts({ won: true, vp: 10 }));
    expect(a.completed).not.toContain('knighted');
    expect(a.record.feats.baron.n).toBe(2);
    expect(a.record.feats.knighted).toMatchObject({ n: 1, doneAt: '2026-10-01T12:00:00.000Z' });
  });

  it('collect distinct keys', () => {
    let rec = EMPTY_PROGRESS;
    for (const map of ['standard', 'standard', 'a', 'b', 'c']) rec = applyGame(rec, 0, facts({ won: true, map })).record;
    expect(rec.feats['island-hopper']).toMatchObject({ n: 4, keys: ['standard', 'a', 'b', 'c'] });
    const done = applyGame(rec, 0, facts({ won: true, map: 'd' }));
    expect(done.completed).toContain('island-hopper');
  });

  it('ignore abandoned and admin-edited games', () => {
    const a = applyGame(EMPTY_PROGRESS, 0, facts({ abandoned: true }));
    expect(a.record.feats).toEqual({});
    expect(a.xp).toBe(0);
  });

  it('replay a history to the same result as applying it game by game', () => {
    const history = [facts({ won: true }), facts({ longestRoad: true }), facts({ pool: 'ck', defender: 3 }), facts({ won: true, playerTrades: 0 })];
    let rec = EMPTY_PROGRESS;
    let xp = 0;
    for (const f of history) ({ record: rec, xp } = applyGame(rec, xp, f));
    expect(replayGames(history)).toEqual({ record: rec, xp });
  });

  it('read stored records defensively', () => {
    expect(readProgress(null)).toBeNull();
    expect(readProgress({ v: 2, feats: {} })).toBeNull();
    expect(readProgress({ v: 1, feats: { knighted: { n: 1, doneAt: 'x' }, bogus: { n: 3 }, baron: { n: 'x' } } }))
      .toEqual({ v: 1, feats: { knighted: { n: 1, doneAt: 'x' } } });
  });
});

describe('catalog and loadout', () => {
  it('has unique ids and something free in every slot', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
    for (const slot of SLOTS) expect(ITEMS.some((i) => i.slot === slot && isUnlocked(i.unlock, START_STATE))).toBe(true);
  });

  it('only names feats that exist', () => {
    for (const i of ITEMS) if (i.unlock.kind === 'feat') expect(FEATS.map((f) => f.id)).toContain(i.unlock.id);
  });

  it('sanitizes unknown or mismatched ids to the default', () => {
    expect(sanitizeLoadout(null)).toEqual(DEFAULT_LOADOUT);
    expect(sanitizeLoadout({ character: 'banner.a', banner: 'nope', title: null })).toEqual(DEFAULT_LOADOUT);
  });

  it('keeps only what is unlocked', () => {
    const want = { character: 'character.c', banner: 'banner.e', title: 'title.f', surround: 'surround.c' };
    expect(clampLoadout(want, START_STATE)).toEqual(DEFAULT_LOADOUT);
    const unlock = unlockState(xpForLevel(10), { v: 1, feats: { pathfinder: { n: 10, doneAt: 'x' } } }, 1200);
    expect(clampLoadout(want, unlock)).toEqual(want);
    expect(clampLoadout(want, { ...unlock, rating: 1100 }).title).toBeNull();
  });
});

describe('game facts', () => {
  const report = {
    version: 1, mode: 'classic', map: 'standard', diceMode: 'random', target: 10, turns: 40, winner: 1,
    stats: { playerTrades: [3, 0, 1] },
    players: [
      { vp: 7, points: { 'Longest route': 2, 'Largest army': 0 } },
      { vp: 10, points: { 'Longest route': 0, 'Largest army': 2 } },
      { vp: 4, points: {} },
    ],
  } as unknown as GameReport;
  const seats = [{ seat: 0, isBot: false, owned: true }, { seat: 1, isBot: true, owned: true }, { seat: 2, isBot: true, owned: false }];
  const meta = { gameId: 'g1', endedAt: null, adminEdited: false };

  it('reads awards and opponents from the report', () => {
    expect(gameFacts(report, 0, seats, meta)).toMatchObject({ won: false, vp: 7, longestRoad: true, largestArmy: false, otherHumans: 1, playerTrades: 3 });
  });

  it('treats a seat a bot took over as abandoned: it never wins', () => {
    expect(gameFacts(report, 1, seats, meta)).toMatchObject({ abandoned: true, won: false, largestArmy: true });
  });

  it('marks admin-edited reports', () => {
    expect(gameFacts({ ...report, adminEdited: true }, 0, seats, meta).adminEdited).toBe(true);
  });
});
