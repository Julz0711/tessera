import { describe, expect, it } from 'vitest';
import { simulateGame } from '@/bots/simulate';
import { buildReport } from '@/engine/report';
import { formatStat, leaders, reportCategories, visibleRows } from '../reportCategories';

describe('report categories', () => {
  it('builds classic head-to-head categories from a real game', () => {
    const { state, error } = simulateGame(42, 3);
    expect(error).toBeFalsy();
    const report = buildReport(state);
    const cats = reportCategories(report);
    expect(cats.map((c) => c.id)).toEqual(expect.arrayContaining(['overview', 'dice', 'production', 'trading', 'robber', 'building', 'dev']));
    expect(cats.some((c) => c.id === 'progress' || c.id === 'knights')).toBe(false);
    for (const c of cats) for (const g of c.groups) for (const r of g.rows) expect(r.values).toHaveLength(3);
    // Per-seat roll counts add up to the table's dice histogram.
    const rolled = Object.entries(state.stats.details!.counters).filter(([k]) => k.startsWith('rolled:')).flatMap(([, v]) => v);
    expect(rolled.reduce((a, b) => a + b, 0)).toBe(state.stats.dice.reduce((a, b) => a + b, 0));
    const vp = cats[0].groups[0].rows[0];
    expect(vp.values).toEqual(report.players.map((p) => p.vp));
  });
  it('adds Cities & Knights categories', () => {
    const { state } = simulateGame(7, 4, 'ck');
    const ids = reportCategories(buildReport(state)).map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['progress', 'knights']));
    expect(ids).not.toContain('dev');
  });
  it('shows dashes rather than zeros for historical games without details', () => {
    const { state } = simulateGame(42, 2);
    delete state.stats.details;
    const dice = reportCategories(buildReport(state)).find((c) => c.id === 'dice')!;
    expect(dice.groups[0].rows[0].values).toEqual([null, null]);
    expect(visibleRows(dice.groups[0].rows).length).toBeGreaterThan(0);
  });
  it('marks only a strict best among the compared seats', () => {
    const row = { label: 'x', values: [3, 5, 5, 1], better: 'high' as const };
    expect(leaders(row, [0, 1, 2, 3])).toEqual([1, 2]);
    expect(leaders(row, [1, 2])).toEqual([]);
    expect(leaders({ ...row, better: 'low' }, [0, 3])).toEqual([3]);
    expect(leaders({ ...row, better: undefined }, [0, 1])).toEqual([]);
    expect(formatStat(2.25, 'signed')).toBe('+2.3');
    expect(formatStat(null)).toBe('—');
  });
});
