import { islandsAt } from './board/sea';
import { MAPS } from './maps';
import { topo, type Q } from './queries';

/**
 * Voyagers: islands (other than the seat's home islands) where the seat has a settlement or city.
 * Each one earned its special points with the first settlement there; settlements are never removed,
 * so counting islands built on now gives the same total.
 */
export function foreignIslands(s: Q, seat: number): number[] {
  const home = s.homeIslands?.[seat];
  if (!home || !MAPS[s.settings.map]?.islandVP) return [];
  const t = topo(s);
  const out = new Set<number>();
  s.buildings.forEach((b, v) => {
    if (b?.owner !== seat) return;
    for (const i of islandsAt(s.board, t, v)) if (!home.includes(i)) out.add(i);
  });
  return [...out];
}

export const islandPoints = (s: Q, seat: number): number => foreignIslands(s, seat).length * (MAPS[s.settings.map]?.islandVP ?? 0);

/** Victory points; `includeHidden` adds unrevealed VP development cards (classic). */
export function victoryPoints(s: Q, seat: number, includeHidden = true): number {
  let vp = 0;
  for (const b of s.buildings) {
    if (!b || b.owner !== seat) continue;
    vp += b.city ? 2 : 1;
    if (b.metropolis) vp += 2;
  }
  if (s.longestRoad === seat) vp += 2;
  vp += islandPoints(s, seat);
  const p = s.players[seat];
  if (s.mode === 'classic') {
    if (s.largestArmy === seat) vp += 2;
    if (includeHidden) vp += p.devCards.filter((c) => c.type === 'victoryPoint').length;
  } else {
    vp += p.defender + p.progressVP;
    if (s.merchant && s.merchant.owner === seat) vp += 1;
  }
  return vp;
}

export function publicVictoryPoints(s: Q, seat: number): number {
  return victoryPoints(s, seat, false);
}
