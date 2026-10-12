/**
 * Bot-vs-bot tournament: how often one bot version beats another over many seeded games, with seats
 * rotated so position doesn't favour either. Used to check that a bot change really helps.
 */
import { victoryPoints, type MapId, type Mode } from '@/engine';
import { simulateGame } from './simulate';
import type { botAction } from './index';

type Bot = typeof botAction;

export interface TournamentOptions {
  games: number;
  /** Seats at the table; the challenger holds `challengerSeats` of them (rotated), the rest are the baseline. */
  players?: number;
  challengerSeats?: number;
  mode?: Mode;
  map?: MapId;
  seed?: number;
}

export interface TournamentResult {
  games: number;
  /** Games won by a challenger seat, per challenger seat at the table (the fair share is 1/players). */
  challengerWins: number;
  /** Fair share of wins for the challenger side (challengerSeats / players), summed over games. */
  expectedWins: number;
  /** Mean final victory points per challenger seat and per baseline seat. */
  challengerVp: number;
  baselineVp: number;
  errors: string[];
  /** 95% confidence interval of the challenger's win share (normal approximation). */
  winShare: { value: number; low: number; high: number };
}

export function runTournament(challenger: Bot, baseline: Bot, opts: TournamentOptions): TournamentResult {
  const players = opts.players ?? 4;
  const mine = opts.challengerSeats ?? 1;
  const errors: string[] = [];
  let wins = 0;
  let played = 0;
  let cVp = 0;
  let bVp = 0;
  for (let g = 0; g < opts.games; g++) {
    // Rotate which seats the challenger sits in, so turn order evens out.
    const first = g % players;
    const isChallenger = (seat: number) => (seat - first + players) % players < mine;
    const result = simulateGame((opts.seed ?? 1) + g * 7919, players, opts.mode ?? 'classic', 12000, opts.map ?? 'standard', (seat) => (isChallenger(seat) ? challenger : baseline));
    if (result.error) {
      errors.push(`game ${g}: ${result.error.split('\n')[0]}`);
      continue;
    }
    played++;
    const s = result.state;
    if (s.winner !== null && isChallenger(s.winner)) wins++;
    for (let seat = 0; seat < players; seat++) {
      const vp = victoryPoints(s, seat);
      if (isChallenger(seat)) cVp += vp / mine;
      else bVp += vp / (players - mine);
    }
  }
  const p = played ? wins / played : 0;
  const share = mine / players;
  const se = Math.sqrt((Math.max(p, 0.01) * (1 - Math.min(p, 0.99))) / Math.max(played, 1));
  return {
    games: played,
    challengerWins: wins,
    expectedWins: played * share,
    challengerVp: played ? cVp / played : 0,
    baselineVp: played ? bVp / played : 0,
    errors,
    winShare: { value: p, low: Math.max(0, p - 1.96 * se), high: Math.min(1, p + 1.96 * se) },
  };
}
