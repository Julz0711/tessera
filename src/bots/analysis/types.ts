import type { Verdict } from './accuracy';

/** One flagged decision (inaccuracies and worse; the rest only count towards accuracy). */
export interface FlaggedMove {
  /** Index of the action in the replay's steps; the replay shows it at `step` (before) and `step + 1` (after). */
  step: number;
  seat: number;
  verdict: Verdict;
  /** Win chance lost against the best candidate, in percentage points. */
  loss: number;
  /**
   * The decider's win chance (0–100) after the move played and after the best candidate, levelled: as if
   * the decider had an even chance (1 in n) before the move (half way down when it led; evaluate.ts).
   */
  winPlayed: number;
  winBest: number;
  played: string;
  best: string;
}

export interface PlayerAccuracy {
  seat: number;
  /** 1–100, or null when none of this seat's decisions were analysed. */
  accuracy: number | null;
  /**
   * Decisions (moves with more than one sensible option) and how many were analysed. Moves the analysis
   * never got to count as decisions until looked at, so a partial analysis may overstate them.
   */
  decisions: number;
  analysed: number;
  /** Mean win% lost per analysed decision. */
  averageLoss: number;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  /** Every decision of this seat was analysed. */
  complete: boolean;
}

/** Stored per game (games.analysis) and sent with the replay and the end screen. */
export interface GameAnalysis {
  version: 1;
  players: PlayerAccuracy[];
  moves: FlaggedMove[];
  /** Some decisions were left out to stay within the time budget (or the history ended early). */
  partial: boolean;
  /** What the search used, after any cut-backs for the budget. */
  search: { candidates: number; rollouts: number; horizonTurns: number; level: number };
  /** Simulated actions and wall time spent. */
  work: number;
  ms: number;
}

/** GET /api/games/:id/analysis. `pending`: queued or running on this server; `unavailable`: never coming. */
export type AnalysisStatus =
  | { status: 'ready'; analysis: GameAnalysis; elo: (number | null)[] }
  | { status: 'pending' }
  | { status: 'unavailable' };
