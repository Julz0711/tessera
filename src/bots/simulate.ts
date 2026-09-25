import {
  actorsFor,
  applyAction,
  createGame,
  viewFor,
  type Action,
  type GameState,
  type MapId,
  type Mode,
  type PlayerColor,
} from '@/engine';
import { botAction } from './index';

export interface SimulationResult {
  state: GameState;
  actions: number;
  error?: string;
}

const COLORS: PlayerColor[] = ['red', 'blue', 'orange', 'white', 'green', 'purple'];

/** Seats that may act right now: owed decisions plus pending trade responses. */
export function seatsToAsk(s: GameState): number[] {
  const seats = new Set(actorsFor(s));
  if (!s.pending.length) {
    for (const t of s.trades) {
      for (const seat of t.to) if (seat !== t.from && !t.accepted.includes(seat) && !t.declined.includes(seat)) seats.add(seat);
    }
  }
  return [...seats];
}

/** Plays a full bot-only game; stops at the first rejected action (a bot or engine bug). */
export function simulateGame(seed: number, players: number, mode: Mode = 'classic', maxActions = 6000, map: MapId = 'standard'): SimulationResult {
  let s = createGame({
    seed,
    mode,
    settings: { map },
    players: Array.from({ length: players }, (_, i) => ({ id: `bot${i}`, name: `Bot ${i + 1}`, color: COLORS[i], isBot: true })),
  });
  let actions = 0;
  while (s.phase !== 'ended') {
    if (actions >= maxActions) return { state: s, actions, error: `No winner after ${maxActions} actions (turn ${s.turn.n})` };
    let acted = false;
    for (const seat of seatsToAsk(s)) {
      let action: Action | null;
      try {
        action = botAction(viewFor(s, seat), seat, { tradeTimedOut: true });
      } catch (err) {
        return { state: s, actions, error: `Bot ${seat} crashed: ${(err as Error).stack}` };
      }
      if (!action) continue;
      const r = applyAction(s, seat, action);
      if (!r.ok) return { state: s, actions, error: `Seat ${seat} ${JSON.stringify(action)} rejected: ${r.error}` };
      s = r.state;
      actions++;
      acted = true;
      break;
    }
    if (!acted) return { state: s, actions, error: `Stalled: nobody can act (pending=${JSON.stringify(s.pending)})` };
  }
  return { state: s, actions };
}
