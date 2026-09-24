'use client';

import { memo, useMemo } from 'react';
import * as THREE from 'three';
import type { Hex, Terrain } from '@/engine/types';
import { TERRAIN_COLORS } from '@/client/palette';
import { mat } from './materials';

/** Height of the playable tile surface. */
export const TILE_TOP = 0.13;
/** Props stay outside this radius so the number token is always visible… */
const TOKEN_CLEAR = 0.42;
/** …and inside this one so nothing spills over the tile edge. */
const EDGE = 0.8;

const TG = {
  base: new THREE.CylinderGeometry(1.0, 1.03, 0.16, 6),
  top: new THREE.CylinderGeometry(0.935, 0.955, 0.12, 6),
  beach: new THREE.CylinderGeometry(1.08, 1.14, 0.2, 6),
  // forest
  coneTree: new THREE.ConeGeometry(0.12, 0.3, 6),
  coneTreeTop: new THREE.ConeGeometry(0.085, 0.2, 6),
  trunk: new THREE.CylinderGeometry(0.022, 0.03, 0.1, 5),
  canopy: new THREE.IcosahedronGeometry(0.11, 0),
  logs: new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6),
  // hills
  mound: new THREE.IcosahedronGeometry(0.16, 0),
  brick: new THREE.BoxGeometry(0.07, 0.033, 0.035),
  kiln: new THREE.BoxGeometry(0.15, 0.12, 0.14),
  chimney: new THREE.BoxGeometry(0.045, 0.12, 0.045),
  pit: new THREE.CylinderGeometry(0.13, 0.11, 0.02, 8),
  // pasture
  tuft: new THREE.ConeGeometry(0.03, 0.09, 4),
  sheepBody: new THREE.IcosahedronGeometry(0.075, 0),
  sheepHead: new THREE.BoxGeometry(0.045, 0.045, 0.05),
  post: new THREE.BoxGeometry(0.02, 0.08, 0.02),
  rail: new THREE.BoxGeometry(0.2, 0.015, 0.012),
  // fields
  soil: new THREE.BoxGeometry(0.32, 0.03, 0.24),
  wheatRow: new THREE.BoxGeometry(0.29, 0.055, 0.022),
  // hills: a little wooden crane over the clay pit
  cranePost: new THREE.BoxGeometry(0.018, 0.2, 0.018),
  craneBeam: new THREE.BoxGeometry(0.2, 0.018, 0.018),
  bucket: new THREE.CylinderGeometry(0.025, 0.02, 0.035, 6),
  barn: new THREE.BoxGeometry(0.15, 0.11, 0.13),
  // Triangular prism lying along X with its apex up: a gable roof.
  roof: new THREE.CylinderGeometry(0.085, 0.085, 0.17, 3).rotateX(-Math.PI / 2).rotateY(Math.PI / 2),
  door: new THREE.BoxGeometry(0.05, 0.07, 0.005),
  // mountains
  peak: new THREE.ConeGeometry(0.21, 0.36, 5),
  snow: new THREE.ConeGeometry(0.09, 0.13, 5),
  rock: new THREE.DodecahedronGeometry(0.055, 0),
  // desert
  dune: new THREE.SphereGeometry(0.22, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2),
  cactus: new THREE.CylinderGeometry(0.03, 0.035, 0.22, 6),
  cactusArm: new THREE.CylinderGeometry(0.022, 0.022, 0.08, 6),
  stone: new THREE.DodecahedronGeometry(0.06, 0),
};

type GeoKey = keyof typeof TG;

interface Prop {
  geo: GeoKey;
  color: string;
  p: [number, number, number];
  r?: [number, number, number];
  s?: [number, number, number] | number;
}

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

/** Angle measured in the board plane (x right, z towards the default camera). */
const polar = (a: number, r: number): [number, number] => [Math.cos(a) * r, Math.sin(a) * r];
/** The strip in front of the token (towards the camera) is reserved for low props. */
const inFront = (a: number) => {
  const d = Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2));
  return Math.abs(d) < 0.75;
};
const CORNERS = [0, 1, 2, 3, 4, 5].map((k) => Math.PI / 6 + (k * Math.PI) / 3);

function spread(rand: () => number, count: number, rMin: number, rMax: number, opts: { avoidFront?: boolean } = {}): [number, number, number][] {
  const out: [number, number, number][] = [];
  const start = rand() * Math.PI * 2;
  for (let i = 0; out.length < count && i < count * 4; i++) {
    const a = start + (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    if (opts.avoidFront && inFront(a)) continue;
    const r = rMin + rand() * (rMax - rMin);
    const [x, z] = polar(a, r);
    out.push([x, z, a]);
  }
  return out;
}

function propsFor(terrain: Terrain, seed: number): Prop[] {
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
      out.push({ geo: 'kiln', color: '#9c4a2b', p: [kx, y + 0.06, kz], r: [0, -ka, 0] });
      out.push({ geo: 'chimney', color: '#7a3a22', p: [kx + Math.cos(ka) * 0.03, y + 0.17, kz + Math.sin(ka) * 0.03] });
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
      // Three ploughed wheat plots around the token, and a little barn.
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
      const ba = offset + Math.PI / 3;
      const [bx, bz] = polar(ba, 0.6);
      const brot = -ba + Math.PI / 2;
      out.push({ geo: 'barn', color: '#b5452f', p: [bx, y + 0.055, bz], r: [0, brot, 0] });
      out.push({ geo: 'roof', color: '#6e3a24', p: [bx, y + 0.152, bz], r: [0, brot, 0] });
      const [ddx, ddz] = polar(ba, 0.066);
      out.push({ geo: 'door', color: '#f2ead8', p: [bx - ddx, y + 0.045, bz - ddz], r: [0, brot, 0] });
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
  const props = useMemo(() => propsFor(terrain, seed), [terrain, seed]);
  return (
    <group>
      {props.map((p, i) => (
        <mesh key={i} geometry={TG[p.geo]} material={mat(p.color)} position={p.p} rotation={p.r ?? [0, 0, 0]} scale={p.s ?? 1} castShadow={shadows} />
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
  const top = useMemo(() => [mat(colors.side), mat(colors.top), mat(colors.side)], [colors]);
  return (
    <group position={[x, producing ? 0.06 : 0, z]}>
      <mesh geometry={TG.beach} material={mat('#e6d3a3')} position={[0, -0.12, 0]} receiveShadow={shadows} />
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
      <TerrainProps terrain={hex.terrain} seed={hex.id + 1} shadows={shadows} />
    </group>
  );
}
