import { applyAction } from './apply';
import type { Action, GameEvent, GameState } from './types';
import { victoryPoints } from './vp';

/** What the server sends for a finished game: the opening state and every action taken, in order. */
export interface ReplayData {
  gameId: string;
  /** The state the game began from (RNG, decks and fogged hexes included: the game is over). */
  initial: GameState;
  steps: ReplayStep[];
  /** Set when the stored actions stop before the game's end (a gap in the history). */
  incomplete?: boolean;
}

export interface ReplayStep {
  seat: number;
  action: Action;
}

/** `mistake` / `blunder`: flagged moves from the game analysis (added by the viewer, not by `buildReplay`). */
export type ReplayMarkerKind = 'seven' | 'longestRoad' | 'largestArmy' | 'barbarian' | 'win' | 'mistake' | 'blunder';

/** A moment worth jumping to; `step` is the number of actions applied when it happened. */
export interface ReplayMarker {
  step: number;
  kind: ReplayMarkerKind;
  seat: number | null;
  label: string;
}

export interface ReplayTurn {
  /** First step of the turn (the action count when `turnStarted` was emitted). */
  step: number;
  n: number;
  seat: number;
}

/** A game rebuilt from its actions. `stateAt(k)` is the state after the first `k` actions. */
export interface Replay {
  /** Actions that applied cleanly: steps 0..total exist. */
  total: number;
  /** The history ended before the game did: an action failed to apply (admin edit) or was missing. */
  stopped: boolean;
  /** Total victory points per seat after each step (`points[0]` is the start). */
  points: number[][];
  turns: ReplayTurn[];
  markers: ReplayMarker[];
  steps: ReplayStep[];
  stateAt(step: number): GameState;
}

const CHECKPOINT_EVERY = 20;

function markersFor(events: GameEvent[], step: number, names: string[]): ReplayMarker[] {
  const out: ReplayMarker[] = [];
  for (const ev of events) {
    switch (ev.type) {
      case 'diceRolled':
        if (ev.dice.red + ev.dice.yellow === 7) out.push({ step, kind: 'seven', seat: ev.seat, label: `${names[ev.seat]} rolled a 7` });
        break;
      case 'longestRoad':
        out.push({ step, kind: 'longestRoad', seat: ev.seat, label: ev.seat === null ? 'Longest Road lost' : `${names[ev.seat]} took Longest Road (${ev.length})` });
        break;
      case 'largestArmy':
        out.push({ step, kind: 'largestArmy', seat: ev.seat, label: ev.seat === null ? 'Largest Army lost' : `${names[ev.seat]} took Largest Army (${ev.knights})` });
        break;
      case 'barbarianAttack':
        out.push({ step, kind: 'barbarian', seat: null, label: ev.won ? 'Barbarians repelled' : 'Barbarians overran the island' });
        break;
      case 'gameOver':
        out.push({ step, kind: 'win', seat: ev.winner, label: `${names[ev.winner]} wins` });
        break;
    }
  }
  return out;
}

/**
 * Re-applies the actions with the engine (it is deterministic: the seeded RNG lives in the state).
 * Full states are only kept as checkpoints (every few actions and at each turn start), so scrubbing
 * recomputes forward from the nearest one instead of holding the whole game in memory.
 */
export function buildReplay(data: Pick<ReplayData, 'initial' | 'steps' | 'incomplete'>): Replay {
  let state = data.initial;
  // Snapshots from before Voyagers have no ships.
  state.ships ??= state.roads.map(() => null);
  state.turn.shipsBuilt ??= [];
  state.turn.shipsMoved ??= false;
  const names = state.players.map((p) => p.name);
  const seats = state.players.map((_, i) => i);
  const score = (s: GameState) => seats.map((seat) => victoryPoints(s, seat));

  const checkpoints = new Map<number, GameState>([[0, state]]);
  const checkpointSteps = [0];
  const points = [score(state)];
  const turns: ReplayTurn[] = [];
  const markers: ReplayMarker[] = [];
  const applied: ReplayStep[] = [];
  let stopped = !!data.incomplete;
  for (const step of data.steps) {
    const result = applyAction(state, step.seat, step.action);
    if (!result.ok) {
      stopped = true;
      break;
    }
    state = result.state;
    applied.push(step);
    const n = applied.length;
    points.push(score(state));
    markers.push(...markersFor(result.events, n, names));
    let turnStart = false;
    for (const ev of result.events) {
      if (ev.type === 'turnStarted') {
        turns.push({ step: n, n: ev.n, seat: ev.seat });
        turnStart = true;
      }
    }
    if (turnStart || n - checkpointSteps[checkpointSteps.length - 1] >= CHECKPOINT_EVERY) {
      checkpoints.set(n, state);
      checkpointSteps.push(n);
    }
  }
  if (state.phase !== 'ended') stopped = true;

  const total = applied.length;
  // Stepping forward one action at a time is the common case: continue from the last answer.
  let last: { step: number; state: GameState } = { step: total, state };
  return {
    total,
    stopped,
    points,
    turns,
    markers,
    steps: applied,
    stateAt(step) {
      const target = Math.max(0, Math.min(total, Math.round(step)));
      if (target === last.step) return last.state;
      let from = 0;
      let lo = 0;
      let hi = checkpointSteps.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (checkpointSteps[mid] <= target) {
          from = checkpointSteps[mid];
          lo = mid + 1;
        } else hi = mid - 1;
      }
      let s = checkpoints.get(from)!;
      let at = from;
      if (last.step <= target && last.step > at) {
        s = last.state;
        at = last.step;
      }
      for (; at < target; at++) {
        const r = applyAction(s, applied[at].seat, applied[at].action);
        if (!r.ok) break;
        s = r.state;
      }
      last = { step: target, state: s };
      return s;
    },
  };
}
