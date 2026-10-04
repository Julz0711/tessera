'use client';

import { useMemo } from 'react';
import { getTopology, type Hex, type KnightLevel, type PlayerColor, type Terrain } from '@/engine';
import { usePrefs } from '@/client/prefs';
import { NO_TARGETS, type BoardScene } from '@/components/board/types';
import Board2D from '@/components/board2d/Board2D';
import { DEFAULT_KNIGHT } from '@/shared/knight';

/** A tile of a snippet, in axial coordinates (q to the east, r to the south-east). */
export interface MiniHex {
  q: number;
  r: number;
  terrain: Terrain;
  token?: number | null;
}

/**
 * A spot on a snippet: `[tile, n]` — the tile's index in `hexes`, then its corner (0–5: N, NE, SE, S,
 * SW, NW) for buildings and knights, or its side (0–5: side n joins corner n and corner n + 1) for roads.
 */
export type Spot = [tile: number, n: number];

export interface MiniPieces {
  settlements?: { at: Spot; seat: number }[];
  cities?: { at: Spot; seat: number; wall?: boolean }[];
  roads?: { at: Spot; seat: number }[];
  ships?: { at: Spot; seat: number }[];
  knights?: { at: Spot; seat: number; level: KnightLevel; active: boolean }[];
  /** The robber's tile (index in `hexes`); none when unset. */
  robber?: number;
  /** Tiles lit up as if their number was just rolled. */
  lit?: number[];
}

/**
 * A few tiles of the real 2D board with pieces on them, for rulebook pictures. It draws in the
 * player's chosen 2D theme, so the pictures look like their game.
 */
export function MiniBoard({
  hexes,
  pieces = {},
  colors = ['red', 'blue', 'orange', 'white'],
  height = 200,
  label,
}: {
  hexes: MiniHex[];
  pieces?: MiniPieces;
  /** Colour of each seat used in `pieces`. */
  colors?: PlayerColor[];
  height?: number;
  /** What the picture shows, for screen readers. */
  label: string;
}) {
  const theme = usePrefs((p) => p.boardTheme);
  const scene = useMemo<BoardScene>(() => {
    const board: Hex[] = hexes.map((h, id) => ({ id, q: h.q, r: h.r, terrain: h.terrain, token: h.token ?? null }));
    const topo = getTopology(board);
    const corner = ([t, n]: Spot) => topo.hexes[t].vertices[n];
    const side = ([t, n]: Spot) => topo.hexes[t].edges[n];
    const buildings: BoardScene['buildings'] = topo.vertices.map(() => null);
    const roads: BoardScene['roads'] = topo.edges.map(() => null);
    const ships: (number | null)[] = topo.edges.map(() => null);
    const knights: BoardScene['knights'] = topo.vertices.map(() => null);
    for (const s of pieces.settlements ?? []) buildings[corner(s.at)] = { owner: s.seat, city: false, wall: false, metropolis: null };
    for (const c of pieces.cities ?? []) buildings[corner(c.at)] = { owner: c.seat, city: true, wall: !!c.wall, metropolis: null };
    for (const r of pieces.roads ?? []) roads[side(r.at)] = r.seat;
    for (const r of pieces.ships ?? []) ships[side(r.at)] = r.seat;
    (pieces.knights ?? []).forEach((k, i) => {
      knights[corner(k.at)] = { id: i + 1, owner: k.seat, level: k.level, active: k.active, activatedOn: -1, promotedOn: -1 };
    });
    return {
      board: { hexes: board, harbors: [] },
      robber: pieces.robber ?? -1,
      buildings,
      roads,
      ships,
      knights,
      merchant: null,
      colors,
      styles: colors.map(() => DEFAULT_KNIGHT),
      myColor: null,
      highlightToken: null,
      highlightHexes: pieces.lit ?? null,
    };
  }, [hexes, pieces, colors]);
  return (
    <div role="img" aria-label={label} className="sea-2d overflow-hidden rounded-lg" style={{ height }}>
      <Board2D scene={scene} targets={NO_TARGETS} theme={theme} fitPad={45} />
    </div>
  );
}
