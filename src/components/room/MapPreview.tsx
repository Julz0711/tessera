'use client';

import {
  BLACK_FOREST_HEX_COORDS,
  LARGE_HEX_COORDS,
  STANDARD_HEX_COORDS,
  getTopology,
  type HexCoord,
  type TopoHex,
  type Topology,
} from '@/engine/board/topology';
import type { MapId, Terrain } from '@/engine/types';
import { FOG, SEA, TERRAIN_COLORS } from '@/client/palette';

const S = 100; // world units → SVG units, matches Board2D's convention

const COORDS: Record<MapId, readonly HexCoord[]> = {
  standard: STANDARD_HEX_COORDS,
  large: LARGE_HEX_COORDS,
  blackForest: BLACK_FOREST_HEX_COORDS,
};

/** Cycled deterministically by hex index — a pleasant mix of terrain without generating a random board. */
const TERRAIN_CYCLE: Terrain[] = ['forest', 'fields', 'pasture', 'mountains', 'hills'];

type Swatch = { top: string; side: string };

function hexPoints(topo: Topology, hexId: number, scale = 0.94): string {
  const h = topo.hexes[hexId];
  return h.vertices
    .map((v) => {
      const p = topo.vertices[v];
      const x = h.x + (p.x - h.x) * scale;
      const y = h.y + (p.y - h.y) * scale;
      return `${(x * S).toFixed(1)},${(y * S).toFixed(1)}`;
    })
    .join(' ');
}

/**
 * The hex nearest the board's origin. Every coordinate list in `topology.ts` is authored centred
 * on (0,0) (see its comments), so this is always the visual middle tile — where the desert sits,
 * or, on Black Forest, the floating centre island.
 */
function centerHexId(topo: Topology): number {
  let best = 0;
  let bestDist = Infinity;
  for (const h of topo.hexes) {
    const d = h.x * h.x + h.y * h.y;
    if (d < bestDist) {
      bestDist = d;
      best = h.id;
    }
  }
  return best;
}

function standardSwatch(index: number, isCenter: boolean): Swatch {
  if (isCenter) return TERRAIN_COLORS.desert;
  return TERRAIN_COLORS[TERRAIN_CYCLE[(index * 2 + 1) % TERRAIN_CYCLE.length]];
}

/**
 * Ring 2 and the non-straight ring-3 hexes read as forest; ring 4 and the straight ring-3 hexes
 * are fogged in; the centre island (ring 0) is desert. Ring 1 is a lake, so it has no hexes.
 */
function blackForestSwatch(hex: TopoHex, isCenter: boolean): Swatch {
  if (isCenter) return TERRAIN_COLORS.desert;
  const ring = Math.max(Math.abs(hex.q), Math.abs(hex.r), Math.abs(hex.q + hex.r));
  const straight = hex.q === 0 || hex.r === 0 || hex.q + hex.r === 0;
  const fogged = ring === 4 || (ring === 3 && straight);
  return fogged ? FOG : TERRAIN_COLORS.forest;
}

/** Tiny static rendering of a map's shape and terrain flavour, for the lobby's map picker. */
export function MapPreview({ map, size = 64, className }: { map: MapId; size?: number; className?: string }) {
  const topo = getTopology(COORDS[map]);
  const centerId = centerHexId(topo);
  const center = topo.hexes[centerId];

  const xs = topo.vertices.map((v) => v.x * S);
  const ys = topo.vertices.map((v) => v.y * S);
  const pad = S * 0.08;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - Math.min(...xs) + pad * 2;
  const h = Math.max(...ys) - Math.min(...ys) + pad * 2;

  // Black Forest's ring 1 is missing (a lake) around the floating centre island; hint at the
  // water with a soft blue disc sized to reach just short of the nearest real hex (ring 2).
  const lakeRadius =
    map === 'blackForest'
      ? Math.min(...topo.hexes.filter((hx) => hx.id !== centerId).map((hx) => Math.hypot(hx.x - center.x, hx.y - center.y))) *
        S *
        0.55
      : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${minX} ${minY} ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      aria-hidden="true"
    >
      <rect x={minX} y={minY} width={w} height={h} rx={S * 0.15} fill={SEA.shallow} opacity={0.16} />
      {lakeRadius > 0 && <circle cx={center.x * S} cy={center.y * S} r={lakeRadius} fill={SEA.shallow} opacity={0.55} />}
      {topo.hexes.map((hx) => {
        const isCenter = hx.id === centerId;
        const swatch = map === 'blackForest' ? blackForestSwatch(hx, isCenter) : standardSwatch(hx.id, isCenter);
        return (
          <polygon
            key={hx.id}
            points={hexPoints(topo, hx.id)}
            fill={swatch.top}
            stroke={swatch.side}
            strokeWidth={S * 0.035}
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}
