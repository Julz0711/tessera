'use client';

import { useFrame } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Hex, Terrain } from '@/engine/types';
import { reducedMotion } from '@/client/fx';
import { mat } from './materials';
import { CORNERS, EDGE, TG, TILE_TOP, TOKEN_CLEAR, inFront, polar, seeded, spread, type Prop } from './terrainKit';
import { useBoardKit, useBoardPalette } from './themes';

export { TILE_TOP } from './terrainKit';

/** The classic props on a tile (themes fall back to these). */
export function classicProps(terrain: Terrain, seed: number): Prop[] {
  const rand = seeded(seed * 7919 + terrain.length * 31);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const out: Prop[] = [];
  const y = TILE_TOP;

  switch (terrain) {
    case 'forest': {
      // A dense woodland: two rings of cone firs and round broadleaf trees.
      const firs = ['#2c6a3a', '#2f7440', '#245c31'];
      const leaves = ['#4e9a3f', '#5aa648', '#3f8a3a'];
      const trees = [...spread(rand, 7, TOKEN_CLEAR + 0.06, 0.56, { avoidFront: true }), ...spread(rand, 9, 0.6, EDGE - 0.08)];
      trees.forEach(([x, z, a], i) => {
        const s = (inFront(a) ? 0.62 : 0.8) + rand() * 0.22;
        out.push({ geo: 'trunk', color: '#6b4a2b', p: [x, y + 0.05 * s, z], s });
        if (i % 3 === 1) {
          out.push({ geo: 'canopy', color: pick(leaves), p: [x, y + 0.17 * s, z], s: [s, s * 1.1, s], r: [0, rand() * 3, 0] });
        } else {
          out.push({ geo: 'coneTree', color: pick(firs), p: [x, y + 0.2 * s, z], s, r: [0, rand() * 3, 0] });
          out.push({ geo: 'coneTreeTop', color: pick(firs), p: [x, y + 0.34 * s, z], s, r: [0, rand() * 3, 0] });
        }
      });
      const [lx, lz, la] = spread(rand, 1, 0.5, 0.56)[0];
      for (let i = 0; i < 3; i++) {
        out.push({ geo: 'logs', color: '#8a6139', p: [lx, y + 0.025 + (i === 2 ? 0.045 : 0), lz + (i === 2 ? 0 : (i - 0.5) * 0.05)], r: [0, -la, Math.PI / 2] });
      }
      break;
    }
    case 'hills': {
      // A clay pit with a small kiln and neat brick stacks — all kept low and inside the tile.
      const corners = rand() > 0.5 ? [0, 2, 4] : [1, 3, 5];
      const [ka, ma, sa] = corners.map((k) => CORNERS[k]);
      const [kx, kz] = polar(ka, 0.6);
      const [mdx, mdz] = polar(ka, 0.085);
      out.push({ geo: 'kilnDome', color: '#b86a3f', p: [kx, y, kz] });
      out.push({ geo: 'kilnMouth', color: '#3b2216', p: [kx - mdx, y + 0.022, kz - mdz], r: [0, -ka + Math.PI / 2, 0] });
      out.push({ geo: 'kilnFlue', color: '#9a5332', p: [kx, y + 0.1, kz] });
      const [mx, mz] = polar(ma, 0.62);
      out.push({ geo: 'mound', color: '#c46b41', p: [mx, y + 0.02, mz], s: [1, 0.45, 1], r: [0, rand() * 3, 0] });
      const [m2x, m2z] = polar(ma + 0.55, 0.62);
      out.push({ geo: 'mound', color: '#b85d37', p: [m2x, y + 0.01, m2z], s: [0.7, 0.35, 0.7], r: [0, rand() * 3, 0] });
      // clay pit with a small wooden crane lifting a bucket
      const [px, pz] = polar(ma - 0.5, 0.57);
      out.push({ geo: 'pit', color: '#7d3d24', p: [px, y + 0.005, pz] });
      const [ox, oz] = polar(ma - 0.5 + Math.PI / 2, 0.09);
      const beamRot = -(ma - 0.5);
      out.push({ geo: 'cranePost', color: '#7a5433', p: [px + ox, y + 0.1, pz + oz] });
      out.push({ geo: 'cranePost', color: '#7a5433', p: [px - ox, y + 0.1, pz - oz] });
      out.push({ geo: 'craneBeam', color: '#8a6139', p: [px, y + 0.2, pz], r: [0, beamRot + Math.PI / 2, 0] });
      out.push({ geo: 'bucket', color: '#5a3d22', p: [px, y + 0.11, pz] });
      const [sx, sz] = polar(sa, 0.58);
      for (let layer = 0; layer < 3; layer++) {
        for (let i = 0; i < 2; i++) {
          out.push({
            geo: 'brick',
            color: layer % 2 ? '#b0492c' : '#c25a36',
            p: [sx + (i - 0.5) * 0.075, y + 0.017 + layer * 0.034, sz],
            r: [0, -sa + Math.PI / 2, 0],
          });
        }
      }
      for (const [x, z] of spread(rand, 3, 0.5, EDGE - 0.1)) out.push({ geo: 'tuft', color: '#8fa54a', p: [x, y + 0.045, z] });
      break;
    }
    case 'pasture': {
      for (const [x, z] of spread(rand, 10, TOKEN_CLEAR + 0.04, EDGE - 0.04)) {
        out.push({ geo: 'tuft', color: rand() > 0.5 ? '#79b04a' : '#8cc15a', p: [x, y + 0.045, z], r: [0, rand() * 3, 0] });
      }
      for (const [x, z] of spread(rand, 3, 0.5, 0.64)) {
        const a = rand() * Math.PI * 2;
        out.push({ geo: 'sheepBody', color: '#f4f1e6', p: [x, y + 0.07, z], s: [1.35, 1, 1], r: [0, a, 0] });
        out.push({ geo: 'sheepHead', color: '#3a3530', p: [x + Math.cos(a) * 0.1, y + 0.085, z - Math.sin(a) * 0.1], r: [0, a, 0] });
      }
      // a short fence and one round tree
      const fa = CORNERS[Math.floor(rand() * 6)];
      const [fx, fz] = polar(fa, 0.66);
      for (let i = -1; i <= 1; i++) {
        const [dx, dz] = polar(fa + Math.PI / 2, i * 0.1);
        out.push({ geo: 'post', color: '#8a6139', p: [fx + dx, y + 0.04, fz + dz] });
      }
      out.push({ geo: 'rail', color: '#9c7445', p: [fx, y + 0.055, fz], r: [0, -fa + Math.PI / 2, 0] });
      const [tx, tz] = polar(fa + Math.PI, 0.64);
      out.push({ geo: 'trunk', color: '#6b4a2b', p: [tx, y + 0.05, tz] });
      out.push({ geo: 'canopy', color: '#5aa648', p: [tx, y + 0.16, tz], s: 0.9 });
      break;
    }
    case 'fields': {
      // Three ploughed wheat plots around the token, with straw in the gaps between them.
      const offset = rand() * Math.PI * 2;
      const golds = ['#f0cf6a', '#e5bd4c', '#f5d97e'];
      for (let k = 0; k < 3; k++) {
        const a = offset + (k * Math.PI * 2) / 3;
        const [px, pz] = polar(a, 0.6);
        const rot = -a + Math.PI / 2;
        out.push({ geo: 'soil', color: '#8f6428', p: [px, y + 0.015, pz], r: [0, rot, 0] });
        for (let row = 0; row < 6; row++) {
          const [dx, dz] = polar(a, (row - 2.5) * 0.036);
          out.push({ geo: 'wheatRow', color: golds[(row + k) % golds.length], p: [px + dx, y + 0.055, pz + dz], r: [0, rot, 0] });
        }
      }
      // Gap 1: a conical haystack.
      const [hx, hz] = polar(offset + Math.PI / 3, 0.6);
      out.push({ geo: 'haystackBase', color: '#c99b3c', p: [hx, y + 0.03, hz] });
      out.push({ geo: 'haystackTop', color: '#dcb04c', p: [hx, y + 0.14, hz], r: [0, rand() * 3, 0] });
      // Gaps 2 and 3: round bales lying in the stubble.
      for (const [gap, count] of [
        [Math.PI, 2],
        [(5 * Math.PI) / 3, 1],
      ] as const) {
        const a = offset + gap;
        for (let i = 0; i < count; i++) {
          const [bx, bz] = polar(a + (i - (count - 1) / 2) * 0.26, 0.6);
          out.push({ geo: 'bale', color: i % 2 ? '#d6ab45' : '#e2bb58', p: [bx, y + 0.055, bz], r: [0, -a + rand() * 0.6, 0] });
        }
      }
      break;
    }
    case 'mountains': {
      // Small snowy peaks tucked into the corners behind the token, plus scattered rocks.
      const corners = CORNERS.filter((a) => !inFront(a));
      const chosen = corners.sort(() => rand() - 0.5).slice(0, 3);
      for (const a of chosen) {
        const [x, z] = polar(a, 0.6);
        const s = 0.8 + rand() * 0.25;
        out.push({ geo: 'peak', color: pick(['#868a93', '#94989f', '#7b7f88']), p: [x, y + 0.18 * s, z], s, r: [0, rand() * 3, 0] });
        out.push({ geo: 'snow', color: '#eef1f4', p: [x, y + 0.33 * s, z], s, r: [0, rand() * 3, 0] });
      }
      for (const [x, z] of spread(rand, 4, 0.5, EDGE - 0.08)) out.push({ geo: 'rock', color: pick(['#9a9ea6', '#80848d']), p: [x, y + 0.03, z], r: [rand(), rand(), 0] });
      break;
    }
    case 'gold': {
      // Heaps of big nuggets (a ring of six under a peak of three) between dark rocks, so the tile
      // reads as treasure from across the board.
      const heaps = spread(rand, 4, 0.52, EDGE - 0.2, { avoidFront: true });
      for (const [x, z] of heaps) {
        const layers: [number, number, number][] = [
          ...Array.from({ length: 6 }, (_, k) => [Math.cos((k / 6) * Math.PI * 2) * 0.095, 0.04, Math.sin((k / 6) * Math.PI * 2) * 0.095] as [number, number, number]),
          ...Array.from({ length: 3 }, (_, k) => [Math.cos((k / 3) * Math.PI * 2 + 0.5) * 0.045, 0.11, Math.sin((k / 3) * Math.PI * 2 + 0.5) * 0.045] as [number, number, number]),
          [0, 0.17, 0],
        ];
        layers.forEach(([dx, dy, dz], k) => {
          out.push({
            geo: 'nugget',
            color: k % 3 === 0 ? '#ffc21a' : k % 3 === 1 ? '#f5a600' : '#ffd84a',
            metal: true,
            p: [x + dx, y + dy, z + dz],
            r: [rand() * 3, rand() * 3, 0],
            s: 1 + rand() * 0.45,
          });
        });
      }
      for (const [x, z] of spread(rand, 4, 0.55, EDGE - 0.06)) out.push({ geo: 'rock', color: pick(['#5b4524', '#6e5530']), p: [x, y + 0.03, z], r: [rand(), rand(), 0] });
      break;
    }
    case 'desert': {
      for (const [x, z] of spread(rand, 3, 0.3, 0.52)) {
        const s = 0.75 + rand() * 0.4;
        out.push({ geo: 'dune', color: rand() > 0.5 ? '#dcc38a' : '#e8d4a2', p: [x, y - 0.01, z], s: [s * 1.3, 0.35, s] });
      }
      const [cx, cz] = spread(rand, 1, 0.2, 0.3)[0];
      out.push({ geo: 'cactus', color: '#5f8f4a', p: [cx, y + 0.11, cz] });
      out.push({ geo: 'cactusArm', color: '#5f8f4a', p: [cx + 0.05, y + 0.15, cz], r: [0, 0, 0.9] });
      for (const [x, z] of spread(rand, 2, 0.55, 0.68)) out.push({ geo: 'stone', color: '#b49a6a', p: [x, y + 0.03, z] });
      break;
    }
  }
  return out;
}

export const TerrainProps = memo(function TerrainProps({ terrain, seed, shadows }: { terrain: Terrain; seed: number; shadows: boolean }) {
  const kit = useBoardKit();
  const props = useMemo(() => kit.props?.(terrain, seed) ?? classicProps(terrain, seed), [kit, terrain, seed]);
  return (
    <group>
      {props.map((p, i) => (
        <mesh
          key={i}
          geometry={typeof p.geo === 'string' ? TG[p.geo] : p.geo}
          material={mat(p.color, {
            ...(p.metal ? { metal: 0.35, rough: 0.3, emissive: p.emissive ?? '#ff9d00' } : p.emissive ? { emissive: p.emissive, glow: 0.9 } : {}),
            opacity: p.opacity,
          })}
          position={p.p}
          rotation={p.r ?? [0, 0, 0]}
          scale={p.s ?? 1}
          castShadow={shadows && p.opacity === undefined}
        />
      ))}
    </group>
  );
});

/** Black Forest: an undiscovered tile, blanketed in low cloud. */
const FogClouds = memo(function FogClouds({ seed, shadows }: { seed: number; shadows: boolean }) {
  const cloud = useBoardPalette().fog.cloud;
  const puffs = useMemo(() => {
    const rand = seeded(seed * 4801 + 17);
    return Array.from({ length: 7 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + rand() * 0.6;
      const r = i === 0 ? 0 : 0.42 + rand() * 0.24;
      const size = 0.9 + rand() * 0.55;
      return {
        p: [Math.cos(a) * r, TILE_TOP + 0.1 + rand() * 0.08, Math.sin(a) * r] as [number, number, number],
        s: [size * 1.25, size * 0.6, size] as [number, number, number],
        color: rand() > 0.5 ? cloud : '#e3e7ec',
      };
    });
  }, [seed, cloud]);
  return (
    <group>
      {puffs.map((c, i) => (
        <mesh key={i} geometry={TG.cloud} material={mat(c.color, { rough: 1 })} position={c.p} scale={c.s} castShadow={shadows} />
      ))}
    </group>
  );
});

const SPARKLE = new THREE.OctahedronGeometry(0.05, 0);

/** Gold field: little four-point glints that twinkle over the heaps, each on its own beat. */
const GoldSparkles = memo(function GoldSparkles({ seed }: { seed: number }) {
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fffbe0', transparent: true, depthWrite: false }), []);
  useEffect(() => () => material.dispose(), [material]);
  const glints = useMemo(() => {
    const rand = seeded(seed * 1231 + 5);
    return spread(rand, 7, 0.45, EDGE - 0.12).map(([x, z]) => ({ p: [x, TILE_TOP + 0.12 + rand() * 0.12, z] as [number, number, number], phase: rand() * Math.PI * 2, speed: 1.6 + rand() * 1.4 }));
  }, [seed]);
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const still = reducedMotion();
    glints.forEach((g, i) => {
      const m = refs.current[i];
      if (!m) return;
      // Mostly hidden, with a quick flash once per cycle; reduced motion keeps a steady glint.
      const s = still ? 0.5 : Math.max(0, Math.sin(t * g.speed + g.phase)) ** 6;
      m.scale.set(s * 0.6, s * 1.8, s * 0.6);
      m.rotation.y = still ? g.phase : t * 2 + g.phase;
    });
  });
  return (
    <group>
      {glints.map((g, i) => (
        <mesh key={i} ref={(m) => void (refs.current[i] = m)} geometry={SPARKLE} material={material} position={g.p} scale={0} />
      ))}
    </group>
  );
});

const RING = new THREE.RingGeometry(0.8, 0.94, 6, 1, Math.PI / 2);

/** A glowing, gently pulsing hexagon outline laid on a tile (a rolled number: gold = pays out, red = robber blocks it). */
function HexRing({ color }: { color: string }) {
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false }), [color]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((state) => {
    material.opacity = 0.55 + Math.sin(state.clock.elapsedTime * 6) * 0.3;
  });
  return <mesh geometry={RING} material={material} position={[0, 0.136, 0]} rotation={[-Math.PI / 2, 0, 0]} />;
}

function SeaTile({ x, z, onClick }: { x: number; z: number; onClick?: () => void }) {
  if (!onClick) return null;
  return (
    <mesh
      geometry={TG.top}
      position={[x, -0.05, z]}
      visible={false}
      onClick={(e) => {
        if (e.delta > 6) return;
        e.stopPropagation();
        onClick();
      }}
    />
  );
}

export function HexTile({
  hex,
  x,
  z,
  shadows,
  producing,
  blocked = false,
  onClick,
}: {
  hex: Hex;
  x: number;
  z: number;
  shadows: boolean;
  producing: boolean;
  /** The rolled number is on this tile, but the robber stops it paying out. */
  blocked?: boolean;
  onClick?: () => void;
}) {
  const palette = useBoardPalette();
  const kit = useBoardKit();
  // Open water (Voyagers): the sea shows through; only an invisible tile catches clicks for the pirate.
  if (hex.terrain === 'sea' && !hex.fog) return <SeaTile x={x} z={z} onClick={onClick} />;
  const colors = hex.fog ? palette.fog : palette.terrain[hex.terrain];
  // Gold fields glow a little so they stand out from the wheat-yellow fields.
  const gold = hex.terrain === 'gold' && !hex.fog;
  const top = useMemo(() => [mat(colors.side), mat(colors.top, gold ? { rough: 0.5, emissive: '#b85e00' } : {}), mat(colors.side)], [colors, gold]);
  return (
    <group position={[x, producing ? 0.06 : 0, z]}>
      <mesh geometry={TG.beach} material={mat(palette.beach)} position={[0, -0.12, 0]} receiveShadow={shadows} />
      <mesh geometry={TG.base} material={mat(colors.side)} position={[0, -0.07, 0]} receiveShadow={shadows} />
      <mesh
        geometry={TG.top}
        material={top}
        position={[0, 0.07, 0]}
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
      {hex.fog ? <FogClouds seed={hex.id + 1} shadows={shadows} /> : <TerrainProps terrain={hex.terrain} seed={hex.id + 1} shadows={shadows} />}
      {gold && <GoldSparkles seed={hex.id + 1} />}
      {!hex.fog && kit.Tile && (
        <group position={[0, TILE_TOP, 0]}>
          <kit.Tile terrain={hex.terrain} seed={hex.id + 1} />
        </group>
      )}
      {kit.Base && (
        <group position={[0, TILE_TOP, 0]}>
          <kit.Base seed={hex.id + 1} />
        </group>
      )}
      {producing && <HexRing color="#f2b33d" />}
      {blocked && <HexRing color="#d9483b" />}
    </group>
  );
}
