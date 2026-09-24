import { applyAction } from '../apply';
import { emptyHand } from '../hand';
import { legalSettlementSpots, legalSetupRoads } from '../queries';
import { createGame } from '../state';
import type { Action, GameState, Mode, PartialHand, PlayerColor } from '../types';

const COLORS: PlayerColor[] = ['red', 'blue', 'orange', 'white'];

export function newGame(players = 3, seed = 1, mode: Mode = 'classic'): GameState {
  return createGame({
    seed,
    mode,
    players: Array.from({ length: players }, (_, i) => ({ id: `p${i}`, name: `P${i}`, color: COLORS[i], isBot: false })),
  });
}

export function act(s: GameState, seat: number, action: Action): GameState {
  const r = applyAction(s, seat, action);
  if (!r.ok) throw new Error(`Rejected ${action.type}: ${r.error}`);
  return r.state;
}

export function reject(s: GameState, seat: number, action: Action): string {
  const r = applyAction(s, seat, action);
  if (r.ok) throw new Error(`Expected ${action.type} to be rejected`);
  return r.error;
}

/** Places starting pieces on the first legal spots, in snake order. */
export function autoSetup(s: GameState): GameState {
  while (s.phase === 'setup') {
    const seat = s.setup!.order[s.setup!.index];
    const v = legalSettlementSpots(s, seat, true)[0];
    s = act(s, seat, { type: 'buildSettlement', vertex: v });
    const e = legalSetupRoads(s)[0];
    s = act(s, seat, { type: 'buildRoad', edge: e });
  }
  return s;
}

/** Test helper: set a player's hand (mutates; for arranging scenarios only). */
export function setHand(s: GameState, seat: number, cards: PartialHand): void {
  s.players[seat].hand = { ...emptyHand(), ...cards };
}

/** Clears the board of all pieces (for hand-built scenarios). */
export function clearBoard(s: GameState): void {
  s.buildings = s.buildings.map(() => null);
  s.roads = s.roads.map(() => null);
  s.knights = s.knights.map(() => null);
}

/** Forces the next roll's dice by searching for a seed that yields the wanted total. */
export function rollTotal(s: GameState, total: number): GameState {
  for (let attempt = 0; attempt < 5000; attempt++) {
    const trial = structuredClone(s);
    trial.rng = (s.rng + attempt * 2654435761) >>> 0;
    const r = applyAction(trial, trial.turn.seat, { type: 'rollDice' });
    if (r.ok && r.state.turn.dice && r.state.turn.dice.red + r.state.turn.dice.yellow === total) return r.state;
  }
  throw new Error(`Could not roll ${total}`);
}
