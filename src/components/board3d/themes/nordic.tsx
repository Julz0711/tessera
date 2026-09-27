'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { Terrain } from '@/engine/types';
import { faceCamera } from '../faceCamera';
import { GEO, mat } from '../materials';
import { classicProps } from '../terrain';
import { CORNERS, EDGE, TG, TILE_TOP, TOKEN_CLEAR, inFront, polar, seeded, spread, type Prop } from '../terrainKit';
import type { ModelProps, ThemeKit } from './types';

const y = TILE_TOP;

/** Nordic Fjords' own low-poly geometries (shared, module-scoped like terrainKit's TG). */
const G = {
  // forest: a thin white birch trunk and a third, spikier tier for dense dark spruce
  birchTrunk: new THREE.CylinderGeometry(0.014, 0.02, 0.17, 5),
  spruceTip: new THREE.ConeGeometry(0.055, 0.14, 6),
  // pasture / fields: a low dry-stone wall
  stoneWall: new THREE.BoxGeometry(0.09, 0.05, 0.045),
  // mountains: a shard of blue glacier ice at a peak's foot
  glacier: new THREE.ConeGeometry(0.045, 0.1, 5),
  // desert: standing rune stones (frozen tundra)
  runeStone: new THREE.BoxGeometry(0.045, 0.26, 0.11),
};

/** A ridged gable (tent) roof: two sloped rectangular faces meeting at a ridge, closed by two triangular gables at ±z. */
function gableRoof(width: number, length: number, height: number): THREE.BufferGeometry {
  const hw = width / 2;
  const hl = length / 2;
  const fl: [number, number, number] = [-hw, 0, hl];
  const fr: [number, number, number] = [hw, 0, hl];
  const bl: [number, number, number] = [-hw, 0, -hl];
  const br: [number, number, number] = [hw, 0, -hl];
  const rf: [number, number, number] = [0, height, hl];
  const rb: [number, number, number] = [0, height, -hl];
  const tris = [fl, rb, bl, fl, rf, rb, fr, br, rb, fr, rb, rf, fl, fr, rf, br, bl, rb];
  const positions = new Float32Array(tris.length * 3);
  tris.forEach((v, i) => positions.set(v, i * 3));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

/** A material for the custom gable roof geometry: double-sided as a safety net for its hand-built winding. */
const roofMatCache = new Map<string, THREE.MeshStandardMaterial>();
function roofMat(color: string, o: { opacity?: number }): THREE.MeshStandardMaterial {
  const op = o.opacity ?? 1;
  const key = `${color}|${op}`;
  let m = roofMatCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.82, transparent: op < 1, opacity: op, side: THREE.DoubleSide });
    roofMatCache.set(key, m);
  }
  return m;
}

const LONGHOUSE = {
  plinth: new THREE.BoxGeometry(0.21, 0.02, 0.36),
  body: new THREE.BoxGeometry(0.19, 0.14, 0.34),
  roof: gableRoof(0.21, 0.4, 0.2),
};

const CHURCH = {
  plinth: new THREE.BoxGeometry(0.44, 0.02, 0.28),
  tower: new THREE.BoxGeometry(0.2, 0.18, 0.2),
  roofMid: new THREE.ConeGeometry(0.15, 0.16, 4),
  roofTop: new THREE.ConeGeometry(0.08, 0.14, 4),
};

const TROLL = {
  body: new THREE.IcosahedronGeometry(0.16, 0),
  head: new THREE.IcosahedronGeometry(0.11, 0),
  club: new THREE.CylinderGeometry(0.03, 0.05, 0.17, 6),
};

const MOOR = {
  post: new THREE.CylinderGeometry(0.022, 0.028, 0.34, 6),
  shield: new THREE.CylinderGeometry(0.095, 0.095, 0.016, 16),
  boss: new THREE.SphereGeometry(0.022, 8, 6),
};

/** Nordic Fjords' own props per terrain; falls back to the classic look where it isn't listed. */
function props(terrain: Terrain, seed: number): Prop[] | null {
  const rand = seeded(seed * 7919 + terrain.length * 31 + 211);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const out: Prop[] = [];

  switch (terrain) {
    case 'forest': {
      // Dense dark spruce (three stacked tapering cones) with a few white-trunked birches mixed in.
      const spruces = ['#1b3324', '#20402c', '#294f34'];
      const birchLeaf = ['#a8cf7a', '#9bc36a'];
      const trees = [...spread(rand, 7, TOKEN_CLEAR + 0.06, 0.56, { avoidFront: true }), ...spread(rand, 9, 0.6, EDGE - 0.08)];
      trees.forEach(([x, z, a], i) => {
        const s = (inFront(a) ? 0.62 : 0.8) + rand() * 0.22;
        if (i % 5 === 4) {
          out.push({ geo: G.birchTrunk, color: '#e9e6da', p: [x, y + 0.075 * s, z], s });
          out.push({ geo: 'canopy', color: pick(birchLeaf), p: [x, y + 0.19 * s, z], s: [s * 0.85, s * 0.9, s * 0.85], r: [0, rand() * 3, 0] });
        } else {
          out.push({ geo: 'trunk', color: '#3c2a1a', p: [x, y + 0.05 * s, z], s });
          out.push({ geo: 'coneTree', color: pick(spruces), p: [x, y + 0.19 * s, z], s: [s * 1.05, s, s * 1.05], r: [0, rand() * 3, 0] });
          out.push({ geo: 'coneTreeTop', color: pick(spruces), p: [x, y + 0.32 * s, z], s, r: [0, rand() * 3, 0] });
          out.push({ geo: G.spruceTip, color: pick(spruces), p: [x, y + 0.41 * s, z], s, r: [0, rand() * 3, 0] });
        }
      });
      const [lx, lz, la] = spread(rand, 1, 0.5, 0.56)[0];
      for (let i = 0; i < 3; i++) {
        out.push({ geo: 'logs', color: '#7a5a38', p: [lx, y + 0.025 + (i === 2 ? 0.045 : 0), lz + (i === 2 ? 0 : (i - 0.5) * 0.05)], r: [0, -la, Math.PI / 2] });
      }
      break;
    }
    case 'hills': {
      // The classic clay kiln, given a small turf cap so its roof reads as sod, not bare clay.
      const base = classicProps('hills', seed);
      const kiln = base.find((p) => p.geo === 'kilnDome');
      if (kiln) {
        const [kx, ky, kz] = kiln.p;
        base.push({ geo: 'kilnDome', color: '#5f7a45', p: [kx, ky + 0.055, kz], s: [0.82, 0.32, 0.82] });
      }
      return base;
    }
    case 'pasture': {
      // Purple heather instead of green turf, classic sheep, and a low dry-stone wall.
      const heather = ['#8f6fa0', '#a688b8', '#7a5c8c'];
      for (const [x, z] of spread(rand, 10, TOKEN_CLEAR + 0.04, EDGE - 0.04)) {
        out.push({ geo: 'tuft', color: pick(heather), p: [x, y + 0.045, z], r: [0, rand() * 3, 0], s: 0.85 });
      }
      for (const [x, z] of spread(rand, 3, 0.5, 0.64)) {
        const a = rand() * Math.PI * 2;
        out.push({ geo: 'sheepBody', color: '#f4f1e6', p: [x, y + 0.07, z], s: [1.35, 1, 1], r: [0, a, 0] });
        out.push({ geo: 'sheepHead', color: '#3a3530', p: [x + Math.cos(a) * 0.1, y + 0.085, z - Math.sin(a) * 0.1], r: [0, a, 0] });
      }
      const fa = CORNERS[Math.floor(rand() * 6)];
      const [fx, fz] = polar(fa, 0.66);
      for (let i = -1; i <= 1; i++) {
        const [dx, dz] = polar(fa + Math.PI / 2, i * 0.09);
        out.push({ geo: G.stoneWall, color: i % 2 ? '#8a8a82' : '#9c9c92', p: [fx + dx, y + 0.025, fz + dz], r: [0, -fa + Math.PI / 2, 0] });
      }
      break;
    }
    case 'fields': {
      // Barley rows in small stone-walled plots, with hay in the gaps between them.
      const offset = rand() * Math.PI * 2;
      const barley = ['#e6cf7a', '#d9c06a', '#f0dd94'];
      for (let k = 0; k < 3; k++) {
        const a = offset + (k * Math.PI * 2) / 3;
        const [px, pz] = polar(a, 0.6);
        const rot = -a + Math.PI / 2;
        out.push({ geo: 'soil', color: '#8a7026', p: [px, y + 0.015, pz], r: [0, rot, 0] });
        for (let row = 0; row < 6; row++) {
          const [dx, dz] = polar(a, (row - 2.5) * 0.036);
          out.push({ geo: 'wheatRow', color: barley[(row + k) % barley.length], p: [px + dx, y + 0.055, pz + dz], r: [0, rot, 0] });
        }
        for (const side of [-1, 1]) {
          const [wx, wz] = polar(a + Math.PI / 2, side * 0.17);
          out.push({ geo: G.stoneWall, color: '#9c9c92', p: [px + wx, y + 0.025, pz + wz], s: [1.7, 1, 0.6], r: [0, rot, 0] });
        }
      }
      const [hx, hz] = polar(offset + Math.PI / 3, 0.6);
      out.push({ geo: 'haystackBase', color: '#c99b3c', p: [hx, y + 0.03, hz] });
      out.push({ geo: 'haystackTop', color: '#dcb04c', p: [hx, y + 0.14, hz], r: [0, rand() * 3, 0] });
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
      // Sheer grey peaks with bright snow, and a touch of blue glacier ice at one foot.
      const corners = CORNERS.filter((a) => !inFront(a));
      const chosen = corners.sort(() => rand() - 0.5).slice(0, 3);
      chosen.forEach((a, idx) => {
        const [x, z] = polar(a, 0.6);
        const s = 0.85 + rand() * 0.25;
        out.push({ geo: 'peak', color: pick(['#7b7f88', '#868a93', '#6c7078']), p: [x, y + 0.18 * s, z], s, r: [0, rand() * 3, 0] });
        out.push({ geo: 'snow', color: '#f5f9ff', p: [x, y + 0.33 * s, z], s, r: [0, rand() * 3, 0] });
        if (idx === 0) {
          const [gx, gz] = polar(a + 0.6, 0.16 * s);
          out.push({ geo: G.glacier, color: '#a9e2f2', p: [x + gx, y + 0.06, z + gz], s: 1.3, r: [0, rand() * 3, 0.25] });
        }
      });
      for (const [x, z] of spread(rand, 4, 0.5, EDGE - 0.08)) out.push({ geo: 'rock', color: pick(['#9a9ea6', '#80848d']), p: [x, y + 0.03, z], r: [rand(), rand(), 0] });
      break;
    }
    case 'desert': {
      // Frozen tundra: low snow drifts and a small circle of standing rune stones.
      for (const [x, z] of spread(rand, 4, 0.3, 0.58)) {
        const s = 0.75 + rand() * 0.4;
        out.push({ geo: 'dune', color: rand() > 0.5 ? '#e9f1f6' : '#f4f9fc', p: [x, y - 0.01, z], s: [s * 1.3, 0.3, s] });
      }
      const stones = spread(rand, 3, 0.35, 0.6, { avoidFront: true });
      stones.forEach(([x, z], i) => {
        out.push({ geo: G.runeStone, color: i % 2 ? '#8b939b' : '#a3aab2', p: [x, y + 0.14, z], r: [0, rand() * 3, (rand() - 0.5) * 0.14] });
      });
      for (const [x, z] of spread(rand, 2, 0.55, 0.68)) out.push({ geo: 'stone', color: '#b7bfc6', p: [x, y + 0.03, z] });
      break;
    }
    case 'gold': {
      // Keep the classic glowing gold heaps — gold must stay the brightest tile — plus a small
      // grassy burial mound tucked behind them.
      const base = classicProps('gold', seed);
      const spot = spread(rand, 1, 0.6, EDGE - 0.1, { avoidFront: true })[0];
      if (spot) {
        const [x, z] = spot;
        base.push({ geo: 'mound', color: '#4f6b3a', p: [x, y + 0.02, z], s: [1.1, 0.4, 1.1], r: [0, rand() * 3, 0] });
      }
      return base;
    }
  }
  return out;
}

/** The longhouse: a low, elongated body with a long steep gable roof. */
function Settlement({ c, o, ghost }: ModelProps) {
  return (
    <>
      <mesh geometry={LONGHOUSE.plinth} material={mat(c.dark, o)} position={[0, 0.01, 0]} castShadow={!ghost} />
      <mesh geometry={LONGHOUSE.body} material={mat(c.hex, o)} position={[0, 0.08, 0]} castShadow={!ghost} />
      <mesh geometry={LONGHOUSE.roof} material={roofMat(c.dark, o)} position={[0, 0.15, 0]} castShadow={!ghost} />
    </>
  );
}

/** The stave church: a taller body under three stacked, steep pointed roofs. */
function City({ c, o, ghost }: ModelProps) {
  return (
    <>
      <mesh geometry={CHURCH.plinth} material={mat(c.dark, o)} position={[0.02, 0.01, 0]} castShadow={!ghost} />
      <mesh geometry={GEO.cityBase} material={mat(c.hex, o)} position={[0.02, 0.1, 0]} castShadow={!ghost} />
      <mesh geometry={CHURCH.tower} material={mat(c.hex, o)} position={[-0.11, 0.27, -0.02]} castShadow={!ghost} />
      <mesh geometry={CHURCH.roofMid} material={mat(c.dark, o)} position={[-0.11, 0.43, -0.02]} rotation={[0, Math.PI / 4, 0]} castShadow={!ghost} />
      <mesh geometry={CHURCH.roofTop} material={mat(c.dark, o)} position={[-0.11, 0.55, -0.02]} rotation={[0, Math.PI / 4, 0]} castShadow={!ghost} />
      <mesh
        geometry={GEO.houseRoof}
        material={mat(c.dark, o)}
        position={[0.13, 0.26, 0.02]}
        rotation={[0, Math.PI / 4, 0]}
        scale={[0.85, 0.7, 0.85]}
        castShadow={!ghost}
      />
    </>
  );
}

/** The robber: a lumbering troll, bulky and mossy, clearly not a player's piece. */
function Robber({ o, ghost }: { o: { opacity?: number }; ghost: boolean }) {
  return (
    <>
      <mesh geometry={TROLL.body} material={mat('#5b6b52', o)} position={[0, 0.19, 0]} scale={[1, 1.15, 0.95]} castShadow={!ghost} />
      <mesh geometry={TROLL.head} material={mat('#6b7a60', o)} position={[0, 0.42, 0.02]} castShadow={!ghost} />
      <mesh geometry={TROLL.club} material={mat('#4a3a28', o)} position={[0.15, 0.29, 0.05]} rotation={[0, 0, -0.65]} castShadow={!ghost} />
    </>
  );
}

/** A mooring post at the pier's sea end, flying a small round painted shield. */
function Harbor({ x, z, rot }: { x: number; z: number; rot: number }) {
  // A mooring pile just past the end of the pier (the pier runs 0.23 each way along local x),
  // low enough and far enough out that the shield stays clear of the floating rate sign above
  // the pier (radius 0.21, up to 0.26 at the large board size). Like the sign, the shield turns
  // to face the camera, so it never shows as a thin edge.
  const shield = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (shield.current) faceCamera(shield.current, state.camera);
  });
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {/* 0.44 tall: from its top by the shield down past the waterline, so it stands in the sea. */}
      <mesh geometry={MOOR.post} material={mat('#4a3a28')} position={[0.37, 0.04, 0]} scale={[1, 1.3, 1]} castShadow />
      <group ref={shield} position={[0.37, 0.19, 0]}>
        <mesh geometry={MOOR.shield} material={mat('#b5342a')} position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]} castShadow />
        <mesh geometry={MOOR.shield} material={mat('#e8e2d2')} position={[0, 0, 0.04]} rotation={[Math.PI / 2, 0, 0]} scale={[0.55, 0.55, 1]} />
        <mesh geometry={MOOR.boss} material={mat('#d8c27a', { metal: 0.4, rough: 0.4 })} position={[0, 0, 0.054]} />
      </group>
    </group>
  );
}

/** Nordic Fjords: spruce, heather and longhouses. */
export const nordic: ThemeKit = { props, Settlement, City, Robber, Harbor };
