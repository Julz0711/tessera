/**
 * Profile cosmetics: a frame around your portrait and a title under your name. A few are free;
 * the rest unlock by playing, winning and (signed in) climbing the rating. The server clamps
 * anything a player hasn't unlocked back to the default, so they can't be claimed by hand.
 */

export interface UnlockStats {
  gamesPlayed: number;
  gamesWon: number;
  /** Null for guests and for players without a rated game. */
  rating: number | null;
}

export type Requirement = { kind: 'free' } | { kind: 'played'; n: number } | { kind: 'won'; n: number } | { kind: 'rating'; n: number };

export type Tier = 'common' | 'bronze' | 'silver' | 'gold' | 'epic';

export const FRAMES = [
  { id: 'none', name: 'No frame', tier: 'common', req: { kind: 'free' } },
  { id: 'wood', name: 'Timber', tier: 'common', req: { kind: 'free' } },
  { id: 'rope', name: 'Harbor rope', tier: 'common', req: { kind: 'played', n: 3 } },
  { id: 'iron', name: 'Iron band', tier: 'silver', req: { kind: 'played', n: 10 } },
  { id: 'waves', name: 'Seafarer', tier: 'silver', req: { kind: 'played', n: 25 } },
  { id: 'bronze', name: 'Bronze laurel', tier: 'bronze', req: { kind: 'won', n: 1 } },
  { id: 'silver', name: 'Silver laurel', tier: 'silver', req: { kind: 'won', n: 5 } },
  { id: 'gold', name: 'Gold laurel', tier: 'gold', req: { kind: 'won', n: 15 } },
  { id: 'crown', name: 'Crown', tier: 'gold', req: { kind: 'won', n: 30 } },
  { id: 'emerald', name: 'Emerald', tier: 'epic', req: { kind: 'rating', n: 1100 } },
  { id: 'ruby', name: 'Ruby', tier: 'epic', req: { kind: 'rating', n: 1250 } },
] as const satisfies readonly { id: string; name: string; tier: Tier; req: Requirement }[];

export const TITLES = [
  { id: 'settler', name: 'Settler', tier: 'common', req: { kind: 'free' } },
  { id: 'trader', name: 'Trader', tier: 'common', req: { kind: 'free' } },
  { id: 'roadbuilder', name: 'Road Builder', tier: 'common', req: { kind: 'played', n: 5 } },
  { id: 'harbormaster', name: 'Harbormaster', tier: 'silver', req: { kind: 'played', n: 15 } },
  { id: 'merchant', name: 'Merchant Prince', tier: 'gold', req: { kind: 'played', n: 40 } },
  { id: 'knight', name: 'Knight', tier: 'bronze', req: { kind: 'won', n: 1 } },
  { id: 'baron', name: 'Baron', tier: 'silver', req: { kind: 'won', n: 5 } },
  { id: 'duke', name: 'Duke', tier: 'gold', req: { kind: 'won', n: 15 } },
  { id: 'grandduke', name: 'Grand Duke', tier: 'gold', req: { kind: 'won', n: 30 } },
  { id: 'champion', name: 'Champion', tier: 'epic', req: { kind: 'rating', n: 1150 } },
  { id: 'legend', name: 'Legend', tier: 'epic', req: { kind: 'rating', n: 1300 } },
] as const satisfies readonly { id: string; name: string; tier: Tier; req: Requirement }[];

export type FrameId = (typeof FRAMES)[number]['id'];
export type TitleId = (typeof TITLES)[number]['id'];

export interface Cosmetics {
  frame: FrameId;
  title: TitleId | null;
}

export const DEFAULT_COSMETICS: Cosmetics = { frame: 'none', title: null };

export const NO_UNLOCKS: UnlockStats = { gamesPlayed: 0, gamesWon: 0, rating: null };

const frameById = new Map<string, (typeof FRAMES)[number]>(FRAMES.map((f) => [f.id, f]));
const titleById = new Map<string, (typeof TITLES)[number]>(TITLES.map((t) => [t.id, t]));

export const frameInfo = (id: FrameId) => frameById.get(id)!;
export const titleInfo = (id: TitleId) => titleById.get(id)!;

export function sanitizeCosmetics(input: unknown): Cosmetics {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return {
    frame: typeof src.frame === 'string' && frameById.has(src.frame) ? (src.frame as FrameId) : DEFAULT_COSMETICS.frame,
    title: typeof src.title === 'string' && titleById.has(src.title) ? (src.title as TitleId) : null,
  };
}

export function isUnlocked(req: Requirement, stats: UnlockStats): boolean {
  switch (req.kind) {
    case 'free':
      return true;
    case 'played':
      return stats.gamesPlayed >= req.n;
    case 'won':
      return stats.gamesWon >= req.n;
    case 'rating':
      return stats.rating !== null && stats.rating >= req.n;
  }
}

/** Keeps only what the player has unlocked; anything else falls back to the default. */
export function clampCosmetics(input: unknown, stats: UnlockStats): Cosmetics {
  const c = sanitizeCosmetics(input);
  return {
    frame: isUnlocked(frameInfo(c.frame).req, stats) ? c.frame : DEFAULT_COSMETICS.frame,
    title: c.title && isUnlocked(titleInfo(c.title).req, stats) ? c.title : null,
  };
}

export function requirementText(req: Requirement): string {
  switch (req.kind) {
    case 'free':
      return 'Free';
    case 'played':
      return `Play ${req.n} game${req.n === 1 ? '' : 's'}`;
    case 'won':
      return `Win ${req.n} game${req.n === 1 ? '' : 's'}`;
    case 'rating':
      return `Reach ${req.n} rating`;
  }
}

/** Progress towards a requirement, for "3 / 5" style hints. */
export function requirementProgress(req: Requirement, stats: UnlockStats): { have: number; need: number } | null {
  switch (req.kind) {
    case 'free':
      return null;
    case 'played':
      return { have: Math.min(stats.gamesPlayed, req.n), need: req.n };
    case 'won':
      return { have: Math.min(stats.gamesWon, req.n), need: req.n };
    case 'rating':
      return { have: Math.min(stats.rating ?? 1000, req.n), need: req.n };
  }
}
