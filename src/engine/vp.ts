import type { Q } from './queries';

/** Victory points; `includeHidden` adds unrevealed VP development cards (classic). */
export function victoryPoints(s: Q, seat: number, includeHidden = true): number {
  let vp = 0;
  for (const b of s.buildings) {
    if (!b || b.owner !== seat) continue;
    vp += b.city ? 2 : 1;
    if (b.metropolis) vp += 2;
  }
  if (s.longestRoad === seat) vp += 2;
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
