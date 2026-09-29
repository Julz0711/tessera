import { BARBARIAN_DISTANCE, barbarianStrength, knightStrength } from '@/engine';
import type { PlayerView } from '@/engine/view';
import type { KnightCustomization } from '@/shared/knight';
import type { BoardScene } from '@/components/board/types';

export function sceneFromView(view: PlayerView, styles: (KnightCustomization | null)[] = []): BoardScene {
  const me = view.viewer;
  const dice = view.turn.dice;
  return {
    board: view.board,
    robber: view.robber,
    buildings: view.buildings,
    roads: view.roads,
    ships: view.ships,
    pirate: view.pirate ?? null,
    knights: view.knights,
    merchant: view.merchant,
    colors: view.players.map((p) => p.color),
    styles,
    myColor: me !== null ? view.players[me].color : null,
    highlightToken: dice && view.turn.rolled ? dice.red + dice.yellow : null,
    barbarian:
      view.mode === 'ck'
        ? {
            position: view.barbarian.position,
            distance: BARBARIAN_DISTANCE,
            strength: barbarianStrength(view),
            defense: view.players.reduce((n, _, s) => n + knightStrength(view, s), 0),
          }
        : undefined,
  };
}
