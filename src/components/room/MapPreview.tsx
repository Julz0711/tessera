'use client';

import { useMemo } from 'react';
import { generateBoard } from '@/engine/board/generate';
import { getTopology, type Topology } from '@/engine/board/topology';
import type { MapId } from '@/engine/types';
import { FOG, SEA, TERRAIN_COLORS } from '@/client/palette';

const S = 100; // world units → SVG units, matches Board2D's convention
/** Previews show one fixed board per map, so they don't reshuffle on every render. */
const PREVIEW_SEED = 20260926;

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
 * Tiny static rendering of a map for the lobby's map picker: a real board of that map (fixed seed),
 * fog shown as fog, so every map's shape, lakes, gold and hidden parts read as they will in play.
 */
export function MapPreview({ map, size = 64, className }: { map: MapId; size?: number; className?: string }) {
  const board = useMemo(() => generateBoard({ rng: PREVIEW_SEED }, map), [map]);
  const topo = getTopology(board.hexes);

  const xs = topo.vertices.map((v) => v.x * S);
  const ys = topo.vertices.map((v) => v.y * S);
  const pad = S * 0.08;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - Math.min(...xs) + pad * 2;
  const h = Math.max(...ys) - Math.min(...ys) + pad * 2;

  return (
    <svg width={size} height={size} viewBox={`${minX} ${minY} ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className={className} aria-hidden="true">
      <rect x={minX} y={minY} width={w} height={h} rx={S * 0.15} fill={SEA.shallow} opacity={0.16} />
      {board.hexes.map((hx) => {
        const swatch = hx.fog ? FOG : TERRAIN_COLORS[hx.terrain];
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
