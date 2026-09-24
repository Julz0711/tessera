'use client';

import { memo, useMemo } from 'react';
import type { Hex, Terrain } from '@/engine/types';
import { TERRAIN_COLORS } from '@/client/palette';
import { GEO, mat } from './materials';

export const TILE_TOP = 0.13;

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Evenly spread positions in an annulus around the token. */
function ring(rand: () => number, count: number, rMin: number, rMax: number): [number, number][] {
  const start = rand() * Math.PI * 2;
  return Array.from({ length: count }, (_, i) => {
    const a = start + (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.6;
    const r = rMin + rand() * (rMax - rMin);
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
}

interface Prop {
  geo: keyof typeof GEO;
  color: string;
  p: [number, number, number];
  r?: [number, number, number];
  s?: [number, number, number] | number;
}

function propsFor(terrain: Terrain, seed: number): Prop[] {
  const rand = seeded(seed * 7919 + terrain.length * 31);
  const out: Prop[] = [];
  const y = TILE_TOP;
  switch (terrain) {
    case 'forest': {
      const greens = ['#2c6a3a', '#357a42', '#23572f', '#3f8a4c'];
      for (const [x, z] of ring(rand, 6, 0.48, 0.76)) {
        const h = 0.85 + rand() * 0.4;
        out.push({ geo: 'trunk', color: '#6b4a2b', p: [x, y + 0.06, z] });
        out.push({ geo: 'treeCone', color: greens[Math.floor(rand() * greens.length)], p: [x, y + 0.12 + 0.19 * h, z], s: [1, h, 1], r: [0, rand() * 3, 0] });
        if (rand() > 0.45) out.push({ geo: 'treeConeSmall', color: '#4a9a58', p: [x, y + 0.3 + 0.25 * h, z], s: [1, h, 1], r: [0, rand() * 3, 0] });
      }
      break;
    }
    case 'hills': {
      const clays = ['#b8643c', '#a8552f', '#c7774c'];
      for (const [x, z] of ring(rand, 3, 0.5, 0.7)) {
        const s = 0.9 + rand() * 0.6;
        out.push({ geo: 'mound', color: clays[Math.floor(rand() * clays.length)], p: [x, y + 0.02, z], s: [s, 0.55 * s, s], r: [0, rand() * 3, 0] });
      }
      const [bx, bz] = ring(rand, 1, 0.55, 0.6)[0];
      const a = rand() * Math.PI;
      for (let i = 0; i < 3; i++) {
        out.push({ geo: 'brick', color: '#9c3f25', p: [bx + (i - 1) * 0.02, y + 0.025 + (i === 2 ? 0.05 : 0), bz + (i === 2 ? 0 : (i - 0.5) * 0.07)], r: [0, a, 0] });
      }
      break;
    }
    case 'pasture': {
      for (const [x, z] of ring(rand, 9, 0.45, 0.8)) {
        out.push({ geo: 'tuft', color: rand() > 0.5 ? '#79b04a' : '#8cc15a', p: [x, y + 0.05, z], r: [0, rand() * 3, 0] });
      }
      for (const [x, z] of ring(rand, 2, 0.5, 0.62)) {
        const a = rand() * Math.PI * 2;
        out.push({ geo: 'sheepBody', color: '#f4f1e6', p: [x, y + 0.08, z], s: [1.35, 1, 1], r: [0, a, 0] });
        out.push({ geo: 'sheepHead', color: '#3a3530', p: [x + Math.cos(a) * 0.11, y + 0.1, z - Math.sin(a) * 0.11], r: [0, a, 0] });
      }
      break;
    }
    case 'fields': {
      for (const [x, z] of ring(rand, 14, 0.47, 0.8)) {
        out.push({ geo: 'wheat', color: rand() > 0.5 ? '#e0b646' : '#f0cf6a', p: [x, y + 0.1, z], s: [1, 0.8 + rand() * 0.5, 1] });
      }
      const [x, z] = ring(rand, 1, 0.55, 0.6)[0];
      out.push({ geo: 'bale', color: '#d6a743', p: [x, y + 0.06, z], r: [Math.PI / 2, rand() * 3, 0] });
      break;
    }
    case 'mountains': {
      for (const [x, z] of ring(rand, 3, 0.5, 0.64)) {
        const s = 0.75 + rand() * 0.4;
        out.push({ geo: 'peak', color: rand() > 0.5 ? '#868a93' : '#9a9ea6', p: [x, y + 0.35 * s, z], s, r: [0, rand() * 3, 0] });
        out.push({ geo: 'snow', color: '#eef1f4', p: [x, y + 0.7 * s - 0.08 * s, z], s, r: [0, rand() * 3, 0] });
      }
      break;
    }
    case 'desert': {
      for (const [x, z] of ring(rand, 3, 0.3, 0.62)) {
        const s = 0.7 + rand() * 0.5;
        out.push({ geo: 'dune', color: rand() > 0.5 ? '#dcc38a' : '#e8d4a2', p: [x, y - 0.01, z], s: [s * 1.3, 0.35, s] });
      }
      const [cx, cz] = ring(rand, 1, 0.2, 0.3)[0];
      out.push({ geo: 'cactus', color: '#5f8f4a', p: [cx, y + 0.13, cz] });
      out.push({ geo: 'cactusArm', color: '#5f8f4a', p: [cx + 0.05, y + 0.17, cz], r: [0, 0, 0.9] });
      for (const [x, z] of ring(rand, 2, 0.55, 0.7)) out.push({ geo: 'rock', color: '#b49a6a', p: [x, y + 0.03, z] });
      break;
    }
  }
  return out;
}

export const TerrainProps = memo(function TerrainProps({ terrain, seed, shadows }: { terrain: Terrain; seed: number; shadows: boolean }) {
  const props = useMemo(() => propsFor(terrain, seed), [terrain, seed]);
  return (
    <group>
      {props.map((p, i) => (
        <mesh
          key={i}
          geometry={GEO[p.geo]}
          material={mat(p.color)}
          position={p.p}
          rotation={p.r ?? [0, 0, 0]}
          scale={p.s ?? 1}
          castShadow={shadows}
        />
      ))}
    </group>
  );
});

export function HexTile({
  hex,
  x,
  z,
  shadows,
  producing,
  onClick,
}: {
  hex: Hex;
  x: number;
  z: number;
  shadows: boolean;
  producing: boolean;
  onClick?: () => void;
}) {
  const colors = TERRAIN_COLORS[hex.terrain];
  const materials = useMemo(() => [mat(colors.side), mat(colors.top), mat(colors.side)], [colors]);
  return (
    <group position={[x, producing ? 0.06 : 0, z]}>
      <mesh geometry={GEO.hexBeach} material={mat('#e6d3a3')} position={[0, -0.09, 0]} receiveShadow={shadows} />
      <mesh
        geometry={GEO.hexTile}
        material={materials}
        receiveShadow={shadows}
        onClick={
          onClick
            ? (e) => {
                if (e.delta > 6) return;
                e.stopPropagation();
                onClick();
              }
            : undefined
        }
      />
      <TerrainProps terrain={hex.terrain} seed={hex.id + 1} shadows={shadows} />
    </group>
  );
}
