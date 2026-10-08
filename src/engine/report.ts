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
 * The stats a running game can show everyone: the dice and nothing else (rolls, per-player roll
 * totals, die faces, expectations, droughts). Production, trades, hands and the timeline would
 * tell too much about the others' position, so they are zeroed or left empty until the game ends.
 */
export function liveStats(s: Pick<GameState, 'mode' | 'stats'>): GameStats | null {
  if (!s.stats) return null;
  const { details, dice, produced } = s.stats;
  const zeros = (a: number[]) => a.map(() => 0);
  const out: GameStats = { dice: dice.slice(), produced: produced.map((h) => Object.fromEntries(Object.keys(h).map((k) => [k, 0])) as typeof h),
    otherGain: zeros(s.stats.otherGain), stolen: zeros(s.stats.stolen), lost: zeros(s.stats.lost), discarded: zeros(s.stats.discarded),
    bankTrades: zeros(s.stats.bankTrades), playerTrades: zeros(s.stats.playerTrades), devBought: zeros(s.stats.devBought),
    knightsPlayed: zeros(s.stats.knightsPlayed), progressPlayed: zeros(s.stats.progressPlayed) };
  if (s.stats.partial) out.partial = true;
  if (details) {
    const counters = Object.fromEntries(Object.entries(details.counters).filter(([key]) => key === 'rolls' || key === 'sevens' || key.startsWith('rolled:')));
    out.details = structuredClone({ ...details, counters, hands: {}, timeline: [], milestones: [] });
  }
  return out;
}

/**
 * Explicit report allowlist: no seeds, deck order, identities or raw action payloads. `live`: the
 * report of a game still running, with nothing hidden in it: public points only (the ranking follows
 * them, no winner yet), no hand sizes, and `liveStats` (the dice only).
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
        remaining: live ? 0 : handTotal(p.hand), unusedDev: live ? 0 : p.devCards.length, unusedProgress: live ? 0 : p.progress.length, improvements: { ...p.improvements } };
    }),
  };
}
export const reportMapName = (report: GameReport) => MAPS[report.map]?.name ?? report.map;
