import { handTotal } from './hand';
import { MAPS } from './maps';
import type { DiceMode, GameState, GameStats, MapId, Mode, PlayerColor } from './types';
import { islandPoints, victoryPoints } from './vp';
import type { Q } from './queries';

export interface GameReport {
  version: 1;
  mode: Mode;
  map: MapId;
  diceMode: DiceMode;
  target: number;
  turns: number;
  winner: number | null;
  startedAt?: string;
  endedAt?: string;
  stats: GameStats | null;
  players: { name: string; color: PlayerColor; isBot: boolean; vp: number; rank: number; points: Record<string, number>;
    remaining: number; unusedDev: number; unusedProgress: number; improvements: Record<string, number>;
    rating?: { pool: string | null; before: number | null; after: number | null; delta: number | null; reason: string | null } }[];
}
export function standings(vps: number[], winner: number | null): number[] {
  return vps.map((vp, seat) => seat === winner ? 1 : vps.filter((v, other) => other !== seat && (other === winner || v > vp)).length + 1);
}
/** Explicit report allowlist: no seeds, deck order, identities or raw action payloads. */
export function buildReport(s: Q & Pick<GameState, 'winner' | 'stats'>): GameReport {
  const vps = s.players.map((_, seat) => victoryPoints(s, seat));
  const ranks = standings(vps, s.winner);
  return { version: 1, mode: s.mode, map: s.settings.map, diceMode: s.settings.dice ?? 'random', target: s.settings.vpToWin, turns: s.turn.n,
    winner: s.winner, stats: s.stats ?? null,
    players: s.players.map((p, seat) => {
      const owned = s.buildings.filter((b) => b?.owner === seat);
      const points: Record<string, number> = {
        Settlements: owned.filter((b) => !b!.city).length,
        Cities: owned.filter((b) => b!.city).length * 2,
        Metropolises: owned.filter((b) => b!.metropolis).length * 2,
        'Longest route': s.longestRoad === seat ? 2 : 0,
        'Island discoveries': islandPoints(s, seat),
      };
      if (s.mode === 'classic') {
        points['Largest army'] = s.largestArmy === seat ? 2 : 0;
        points['VP cards'] = p.devCards.filter((c) => c.type === 'victoryPoint').length;
      } else {
        points.Defender = p.defender; points['Progress VP'] = p.progressVP; points.Merchant = s.merchant?.owner === seat ? 1 : 0;
      }
      return { name: p.name, color: p.color, isBot: p.isBot, vp: vps[seat], rank: ranks[seat], points,
        remaining: handTotal(p.hand), unusedDev: p.devCards.length, unusedProgress: p.progress.length, improvements: { ...p.improvements } };
    }),
  };
}
export const reportMapName = (report: GameReport) => MAPS[report.map]?.name ?? report.map;
