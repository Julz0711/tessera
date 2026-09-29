import type { MapId, Mode } from './types';

export type MapRuleset = 'base' | 'seafarers';

export interface MapDefinition {
  id: MapId;
  name: string;
  blurb: string;
  maxPlayers: number;
  /** Rules modules that must be enabled before this map can be selected. */
  requires: readonly MapRuleset[];
  /** Card/city rules this map has been tested with. */
  modes: readonly Mode[];
}

const BASE_MODES = ['classic', 'ck'] as const;

/**
 * Player-facing metadata and compatibility live here rather than in lobby components. Future
 * Seafarers scenarios must declare `requires: ['seafarers']`; the engine and room server enforce
 * that tag instead of treating it as decoration.
 */
export const MAPS = {
  standard: { id: 'standard', name: 'Standard', blurb: 'The classic 19-hex island.', maxPlayers: 4, requires: ['base'], modes: BASE_MODES },
  large: { id: 'large', name: 'Large (5–6)', blurb: 'A bigger island for 5–6 players, with a bigger bank and deck.', maxPlayers: 6, requires: ['base'], modes: BASE_MODES },
  blackForest: { id: 'blackForest', name: 'Black Forest', blurb: 'Start inside a ring of forest; the rest of the island is hidden under fog until you explore it.', maxPlayers: 6, requires: ['base'], modes: BASE_MODES },
  goldRush: { id: 'goldRush', name: 'Gold Rush', blurb: 'A ring island around seven hexes of fog, one of them a gold field on a 6 or 8. Build inward to find it.', maxPlayers: 6, requires: ['base'], modes: BASE_MODES },
  vulcan: { id: 'vulcan', name: 'Vulcan', blurb: 'Start in the four far corners. Ore lies only around the volcano, a gold 6 in the fog-covered middle.', maxPlayers: 4, requires: ['base'], modes: BASE_MODES },
  heartlake: { id: 'heartlake', name: 'Heartlake', blurb: 'A ring island around a lake. Three 3:1 harbors line the lake shore, reachable from the middle.', maxPlayers: 4, requires: ['base'], modes: BASE_MODES },
  longIsle: { id: 'longIsle', name: 'Long Isle', blurb: 'A long, thin island: more coast, more harbors within reach, and tighter races for the long road.', maxPlayers: 4, requires: ['base'], modes: BASE_MODES },
  fourLakes: { id: 'fourLakes', name: 'Four Lakes', blurb: 'A big pinwheel island with four lakes cut into it, and harbors on their shores. For up to 6.', maxPlayers: 6, requires: ['base'], modes: BASE_MODES },
} as const satisfies Record<MapId, MapDefinition>;

export const mapDefinition = (id: MapId): MapDefinition => MAPS[id];

export function mapSupports(id: MapId, mode: Mode, enabled: ReadonlySet<MapRuleset> = new Set(['base'])): boolean {
  const map = MAPS[id];
  return map.modes.includes(mode) && map.requires.every((tag) => enabled.has(tag));
}
