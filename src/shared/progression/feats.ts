import type { GameFacts } from './facts';

/**
 * Feats: milestones with a counter and a target. Each finished game moves the counters (see
 * `applyGame`); reaching the target pays `xp` once and unlocks the catalog items that name the
 * feat. A feat either counts (`add`) or collects distinct keys (`key`: maps won on, days played…).
 */
export interface FeatDef {
  id: string;
  name: string;
  description: string;
  target: number;
  xp: number;
  /** How this game moves the counter: a number to add, a distinct key to collect, or null. */
  step: (f: GameFacts) => { add: number } | { key: string } | null;
}

const count = (yes: boolean) => (yes ? { add: 1 } : null);

export const FEATS: readonly FeatDef[] = [
  { id: 'first-landfall', name: 'First landfall', description: 'Finish your first game', target: 1, xp: 250, step: () => ({ add: 1 }) },
  { id: 'knighted', name: 'Knighted', description: 'Win your first game', target: 1, xp: 250, step: (f) => count(f.won) },
  { id: 'baron', name: 'Baron', description: 'Win 5 games', target: 5, xp: 500, step: (f) => count(f.won) },
  { id: 'duke', name: 'Duke', description: 'Win 15 games', target: 15, xp: 750, step: (f) => count(f.won) },
  { id: 'grand-duke', name: 'Grand Duke', description: 'Win 30 games', target: 30, xp: 1000, step: (f) => count(f.won) },
  { id: 'pathfinder', name: 'Pathfinder', description: 'Hold the longest road at the end of 10 games', target: 10, xp: 500, step: (f) => count(f.longestRoad) },
  { id: 'marshal', name: 'Marshal', description: 'Hold the largest army at the end of 10 games', target: 10, xp: 500, step: (f) => count(f.largestArmy) },
  { id: 'island-hopper', name: 'Island Hopper', description: 'Win on 5 different maps', target: 5, xp: 500, step: (f) => (f.won ? { key: f.map } : null) },
  { id: 'all-hands', name: 'All hands', description: 'Play Classic, Voyagers and Knights & Barbarians', target: 3, xp: 500,
    step: (f) => (f.pool === 'classic' || f.pool === 'voyagers' || f.pool === 'ck' ? { key: f.pool } : null) },
  { id: 'full-house', name: 'Full house', description: 'Finish 10 games with 3 or more other people', target: 10, xp: 500, step: (f) => count(f.otherHumans >= 3) },
  { id: 'bulwark', name: 'Bulwark', description: 'Earn 10 Defender of Catan points', target: 10, xp: 500, step: (f) => (f.defender > 0 ? { add: f.defender } : null) },
  { id: 'self-made', name: 'Self-Made', description: 'Win a game without trading with other players', target: 1, xp: 500, step: (f) => count(f.won && f.playerTrades === 0) },
  { id: 'regular', name: 'Regular', description: 'Play on 10 different days', target: 10, xp: 500, step: (f) => (f.endedAt ? { key: f.endedAt.slice(0, 10) } : null) },
];

const byId = new Map(FEATS.map((f) => [f.id, f]));
export const featById = (id: string): FeatDef | undefined => byId.get(id);
