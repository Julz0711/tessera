import type { GameFacts } from './facts';
import { FEATS, featById } from './feats';
import { levelFor } from './levels';
import type { UnlockState } from './catalog';

/** XP for a finished game; see `gameXp`. */
export const GAME_XP = { FINISH: 100, WIN: 60, PER_VP: 8, BOTS_ONLY: 0.25 } as const;

/**
 * XP one finished game pays: finishing, winning and victory points. A game with no other people
 * pays a quarter; an abandoned seat or an admin-edited game pays nothing.
 */
export function gameXp(f: GameFacts): number {
  if (f.abandoned || f.adminEdited) return 0;
  const raw = GAME_XP.FINISH + (f.won ? GAME_XP.WIN : 0) + GAME_XP.PER_VP * Math.max(0, f.vp);
  return Math.round(f.otherHumans > 0 ? raw : raw * GAME_XP.BOTS_ONLY);
}

/** One feat's counter. `keys`: the distinct keys collected so far (distinct-style feats). */
export interface FeatCounter {
  n: number;
  keys?: string[];
  /** When it was finished (ISO); finished feats never count again. */
  doneAt?: string;
}

/** Stored per profile / guest next to `xp`. Versioned so a later change can rebuild everyone. */
export interface ProgressRecord {
  v: 1;
  feats: Record<string, FeatCounter>;
}

export const EMPTY_PROGRESS: ProgressRecord = { v: 1, feats: {} };

/** Coerces stored JSON; returns null for missing or old-version records (they get rebuilt). */
export function readProgress(input: unknown): ProgressRecord | null {
  const src = input && typeof input === 'object' ? (input as Record<string, unknown>) : null;
  if (!src || src.v !== 1 || !src.feats || typeof src.feats !== 'object') return null;
  const feats: Record<string, FeatCounter> = {};
  for (const [id, raw] of Object.entries(src.feats as Record<string, unknown>)) {
    const def = featById(id);
    const c = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
    if (!def || !c || typeof c.n !== 'number' || !Number.isFinite(c.n)) continue;
    const counter: FeatCounter = { n: Math.max(0, Math.floor(c.n)) };
    if (Array.isArray(c.keys)) counter.keys = c.keys.filter((k): k is string => typeof k === 'string').slice(0, def.target);
    if (typeof c.doneAt === 'string') counter.doneAt = c.doneAt;
    feats[id] = counter;
  }
  return { v: 1, feats };
}

export interface GameAward {
  record: ProgressRecord;
  xp: number;
  /** XP from the game itself and from feats it finished. */
  gameXp: number;
  featXp: number;
  /** Feats this game finished. */
  completed: string[];
}

/** Adds one finished game to a player's progress. Pure: the same history always gives the same result. */
export function applyGame(record: ProgressRecord, xp: number, f: GameFacts): GameAward {
  const feats = { ...record.feats };
  const completed: string[] = [];
  let featXp = 0;
  const earns = !f.abandoned && !f.adminEdited;
  if (earns) {
    for (const def of FEATS) {
      const prev = feats[def.id] ?? { n: 0 };
      if (prev.doneAt) continue;
      const step = def.step(f);
      if (!step) continue;
      const next: FeatCounter = { ...prev };
      if ('add' in step) next.n = prev.n + step.add;
      else if (!(prev.keys ?? []).includes(step.key)) {
        next.keys = [...(prev.keys ?? []), step.key];
        next.n = next.keys.length;
      }
      if (next.n >= def.target) {
        next.n = def.target;
        next.doneAt = f.endedAt ?? new Date(0).toISOString();
        completed.push(def.id);
        featXp += def.xp;
      }
      feats[def.id] = next;
    }
  }
  const g = gameXp(f);
  return { record: { v: 1, feats }, xp: xp + g + featXp, gameXp: g, featXp, completed };
}

/** Progress rebuilt from a whole game history, oldest game first. */
export function replayGames(history: GameFacts[]): { record: ProgressRecord; xp: number } {
  let record = EMPTY_PROGRESS;
  let xp = 0;
  for (const f of history) ({ record, xp } = applyGame(record, xp, f));
  return { record, xp };
}

export const finishedFeats = (record: ProgressRecord): Set<string> =>
  new Set(Object.entries(record.feats).filter(([, c]) => c.doneAt).map(([id]) => id));

export function unlockState(xp: number, record: ProgressRecord, rating: number | null): UnlockState {
  return { level: levelFor(xp).level, feats: finishedFeats(record), rating };
}
