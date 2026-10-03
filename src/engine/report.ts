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
  /** A running game's report (`buildReport(…, { live: true })`): public information only. */
  live?: boolean;
  stats: GameStats | null;
  players: { name: string; color: PlayerColor; isBot: boolean; vp: number; rank: number; points: Record<string, number>;
    remaining: number; unusedDev: number; unusedProgress: number; improvements: Record<string, number>;
    rating?: { pool: string | null; before: number | null; after: number | null; delta: number | null; reason: string | null } }[];
}
export function standings(vps: number[], winner: number | null): number[] {
  return vps.map((vp, seat) => seat === winner ? 1 : vps.filter((v, other) => other !== seat && (other === winner || v > vp)).length + 1);
}
/**
 * The stats a running game can show everyone: hidden information taken out. Which development cards
 * were bought stays secret (the counts don't), and the VP timeline is the public one; samples from
 * before `publicVp` was recorded are dropped where hidden VP could be in them (Classic).
 */
export function liveStats(s: Pick<GameState, 'mode' | 'stats'>): GameStats | null {
  if (!s.stats) return null;
  const { details, ...rest } = s.stats;
  const out: GameStats = structuredClone(rest);
  if (details) {
    const counters = Object.fromEntries(Object.entries(details.counters).filter(([key]) => !key.startsWith('devBought:')));
    const timeline = details.timeline
      .filter((sample) => sample.publicVp || s.mode !== 'classic')
      .map(({ publicVp, ...sample }) => ({ ...sample, vp: publicVp ?? sample.vp }));
    out.details = structuredClone({ ...details, counters, timeline });
  }
  return out;
}

/**
 * Explicit report allowlist: no seeds, deck order, identities or raw action payloads. `live`: the
 * report of a game still running, with nothing hidden in it: public points only (the ranking follows
 * them, no winner yet) and `liveStats`.
 */
export function buildReport(s: Q & Pick<GameState, 'winner' | 'stats'>, opts: { live?: boolean } = {}): GameReport {
  const live = !!opts.live;
  const vps = s.players.map((_, seat) => victoryPoints(s, seat, !live));
  const ranks = standings(vps, live ? null : s.winner);
  return { version: 1, mode: s.mode, map: s.settings.map, diceMode: s.settings.dice ?? 'random', target: s.settings.vpToWin, turns: s.turn.n,
    winner: live ? null : s.winner, stats: live ? liveStats(s) : s.stats ?? null, ...(live ? { live: true } : {}),
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
        if (!live) points['VP cards'] = p.devCards.filter((c) => c.type === 'victoryPoint').length;
      } else {
        points.Defender = p.defender; points['Progress VP'] = p.progressVP; points.Merchant = s.merchant?.owner === seat ? 1 : 0;
      }
      return { name: p.name, color: p.color, isBot: p.isBot, vp: vps[seat], rank: ranks[seat], points,
        remaining: handTotal(p.hand), unusedDev: p.devCards.length, unusedProgress: p.progress.length, improvements: { ...p.improvements } };
    }),
  };
}
export const reportMapName = (report: GameReport) => MAPS[report.map]?.name ?? report.map;
