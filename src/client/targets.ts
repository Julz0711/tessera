import {
  legalCitySpots,
  legalRoadSpots,
  legalSettlementSpots,
  legalSetupRoads,
  robberTargets,
} from '@/engine/queries';
import type { PlayerView } from '@/engine/view';
import type { KnightCustomization } from '@/shared/knight';
import { NO_TARGETS, type BoardScene, type BoardTargets } from '@/components/board/types';

export type BuildMode = 'road' | 'settlement' | 'city' | null;

export function sceneFromView(view: PlayerView, styles: (KnightCustomization | null)[] = []): BoardScene {
  const me = view.viewer;
  const dice = view.turn.dice;
  return {
    board: view.board,
    robber: view.robber,
    buildings: view.buildings,
    roads: view.roads,
    knights: view.knights,
    merchant: view.merchant,
    colors: view.players.map((p) => p.color),
    styles,
    myColor: me !== null ? view.players[me].color : null,
    highlightToken: dice && view.turn.rolled ? dice.red + dice.yellow : null,
  };
}

/** Which board spots the viewer can click right now, given the game state and chosen build mode. */
export function computeTargets(view: PlayerView | null, mode: BuildMode): BoardTargets {
  if (!view || view.viewer === null || view.phase === 'ended') return NO_TARGETS;
  const me = view.viewer;

  if (view.phase === 'setup') {
    const setup = view.setup;
    if (!setup || setup.order[setup.index] !== me) return NO_TARGETS;
    return setup.placing === 'settlement'
      ? { ...NO_TARGETS, kind: 'settlement', vertices: legalSettlementSpots(view, me, true) }
      : { ...NO_TARGETS, kind: 'road', edges: legalSetupRoads(view) };
  }

  const prompt = view.pending.find((p) => p.seat === me);
  if (prompt) {
    if (prompt.kind === 'freeRoads') return { ...NO_TARGETS, kind: 'road', edges: legalRoadSpots(view, me) };
    if (prompt.kind === 'robber') {
      return { ...NO_TARGETS, kind: 'robber', hexes: robberTargets(view, me, (s) => view.players[s].publicVP) };
    }
    return NO_TARGETS;
  }
  if (view.pending.length || view.turn.seat !== me || !view.turn.rolled) return NO_TARGETS;

  switch (mode) {
    case 'road':
      return { ...NO_TARGETS, kind: 'road', edges: legalRoadSpots(view, me) };
    case 'settlement':
      return { ...NO_TARGETS, kind: 'settlement', vertices: legalSettlementSpots(view, me) };
    case 'city':
      return { ...NO_TARGETS, kind: 'city', vertices: legalCitySpots(view, me) };
    default:
      return NO_TARGETS;
  }
}
