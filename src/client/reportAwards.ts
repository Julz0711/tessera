import type { GameReport } from '@/engine/report';
import { formatStat, reportCategories, type StatCategory } from './reportCategories';

/** An end-of-game award: the stat it's for, the best value, and who has it (ties share it). */
export interface Award {
  title: string;
  stat: string;
  value: string;
  seats: number[];
}

/** The awards in these stat categories (rows marked `award`, won by the highest positive value). */
export function awardsFrom(categories: StatCategory[]): Award[] {
  return categories
    .flatMap((c) => c.groups.flatMap((g) => g.rows))
    .filter((r) => r.award)
    .flatMap((row) => {
      const known = row.values.map((v, seat) => ({ v, seat })).filter((e): e is { v: number; seat: number } => e.v !== null);
      const best = Math.max(...known.map((e) => e.v));
      if (!known.length || best <= 0) return [];
      return [{ title: row.award!, stat: row.label, value: formatStat(best, row.format), seats: known.filter((e) => e.v === best).map((e) => e.seat) }];
    });
}

/** The awards of a game report. */
export function reportAwards(report: GameReport): Award[] {
  return awardsFrom(reportCategories(report));
}
