'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Terrain } from '@/engine/types';
import { mat } from '../materials';
import { usePieceScale } from '../pieceScale';
import { CORNERS, EDGE, TILE_TOP, TOKEN_CLEAR, inFront, polar, seeded, spread, type Prop } from '../terrainKit';
import { useBoardPalette } from './index';
import { gableRoof, lit, roofMat, rockBase } from './shared';
import type { KnightFigureProps, ModelProps, PieceColors, ThemeKit } from './types';

const y = TILE_TOP;

const BRASS = '#b08d57';
const COPPER = '#b87333';
const SMOKE = '#f3ece4';

/** A flat gear with `teeth` teeth, `r` to the tips, standing in the xy plane. */
function gearGeometry(r: number, teeth: number, depth: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = Math.floor(i / 2) % 2 === 0 ? r : r * 0.8;
    if (i === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, r * 0.28, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** Skyport's own low-poly geometries (shared, module-scoped like terrainKit's TG). */
const G = {
  // smoke from chimneys and stacks: loose puffs, held still
  puff: new THREE.IcosahedronGeometry(0.035, 0),
  // forest: a steam sawmill (boiler, stack and a saw blade)
  boiler: new THREE.CylinderGeometry(0.04, 0.04, 0.1, 8).rotateZ(Math.PI / 2),
  stack: new THREE.CylinderGeometry(0.014, 0.018, 0.16, 6),
  saw: new THREE.CylinderGeometry(0.045, 0.045, 0.006, 12).rotateX(Math.PI / 2),
  // hills: the brickworks' tall chimney
  chimney: new THREE.BoxGeometry(0.06, 0.36, 0.06),
  chimneyBand: new THREE.BoxGeometry(0.07, 0.025, 0.07),
  // pasture: a brass wind turbine
  mast: new THREE.CylinderGeometry(0.01, 0.014, 0.3, 6),
  blade: new THREE.BoxGeometry(0.022, 0.1, 0.006),
  hub: new THREE.SphereGeometry(0.018, 8, 6),
  // fields: a steam tractor
  tractor: new THREE.BoxGeometry(0.11, 0.05, 0.06),
  bigWheel: new THREE.CylinderGeometry(0.035, 0.035, 0.02, 10).rotateX(Math.PI / 2),
  smallWheel: new THREE.CylinderGeometry(0.02, 0.02, 0.016, 8).rotateX(Math.PI / 2),
  // mountains: a mine headframe with its winding wheel
  leg: new THREE.BoxGeometry(0.014, 0.3, 0.014),
  winding: new THREE.TorusGeometry(0.045, 0.008, 5, 14),
  // desert: giant gears half-buried in the sand
  gearBig: gearGeometry(0.2, 10, 0.04),
  gearSmall: gearGeometry(0.12, 7, 0.035),
};

/** Still smoke: a few puffs rising from (x, top, z). */
function smoke(out: Prop[], x: number, top: number, z: number): void {
  [
    [0, 0.03, 0, 0.9],
    [0.02, 0.08, -0.01, 1.2],
    [0.05, 0.14, -0.02, 1.45],
  ].forEach(([dx, dy, dz, s]) => out.push({ geo: G.puff, color: SMOKE, p: [x + dx, top + dy, z + dz], s }));
}

/** Skyport's own props per terrain; gold (and anything unlisted) keeps the classic look. */
function props(terrain: Terrain, seed: number): Prop[] | null {
  const rand = seeded(seed * 7919 + terrain.length * 31 + 503);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const out: Prop[] = [];

  switch (terrain) {
    case 'forest': {
      // A wood of firs and round oaks, and a steam sawmill at its edge (the trees keep clear of it).
      const firs = ['#2c5a36', '#305f3a', '#26502f'];
      const leaves = ['#3f7a45', '#4a8650', '#35703d'];
      const [mx, mz] = polar(pick([CORNERS[0], CORNERS[2]]), 0.6);
      const trees = [...spread(rand, 7, TOKEN_CLEAR + 0.06, 0.56, { avoidFront: true }), ...spread(rand, 8, 0.6, EDGE - 0.08)].filter(
        ([x, z]) => Math.hypot(x - mx, z - mz) > 0.17,
      );
      trees.forEach(([x, z, a], i) => {
        const s = (inFront(a) ? 0.62 : 0.8) + rand() * 0.22;
        out.push({ geo: 'trunk', color: '#5a4230', p: [x, y + 0.05 * s, z], s });
        if (i % 2) out.push({ geo: 'canopy', color: pick(leaves), p: [x, y + 0.17 * s, z], s: [s, s * 1.1, s], r: [0, rand() * 3, 0] });
        else {
          out.push({ geo: 'coneTree', color: pick(firs), p: [x, y + 0.2 * s, z], s, r: [0, rand() * 3, 0] });
          out.push({ geo: 'coneTreeTop', color: pick(firs), p: [x, y + 0.34 * s, z], s, r: [0, rand() * 3, 0] });
        }
      });
      out.push({ geo: G.boiler, color: '#6b5a4a', p: [mx - 0.03, y + 0.04, mz] });
      out.push({ geo: G.stack, color: '#3a2e26', p: [mx + 0.03, y + 0.1, mz] });
      smoke(out, mx + 0.03, y + 0.18, mz);
      out.push({ geo: G.saw, color: '#c9ccd0', p: [mx - 0.06, y + 0.045, mz + 0.05] });
      for (let i = 0; i < 2; i++) out.push({ geo: 'logs', color: '#9a7048', p: [mx + 0.02, y + 0.025, mz + 0.06 + i * 0.05], r: [0, 0, Math.PI / 2] });
      break;
    }
    case 'hills': {
      // A brickworks: a tall smoking chimney, stacks of fired bricks and a clay heap.
      const [ca, sa, ma] = (rand() > 0.5 ? [3, 1, 5] : [5, 1, 3]).map((k) => CORNERS[k]);
      const [cx, cz] = polar(ca, 0.6);
      out.push({ geo: G.chimney, color: '#7a3a22', p: [cx, y + 0.18, cz] });
      out.push({ geo: G.chimneyBand, color: '#4a2012', p: [cx, y + 0.35, cz] });
      smoke(out, cx, y + 0.38, cz);
      for (const a of [sa, ma + 0.5]) {
        const [sx, sz] = polar(a, 0.6);
        for (let layer = 0; layer < 3; layer++) {
          for (let i = 0; i < 2; i++) {
            out.push({ geo: 'brick', color: layer % 2 ? '#a24a2c' : '#b8583a', p: [sx + (i - 0.5) * 0.075, y + 0.017 + layer * 0.034, sz], r: [0, -a + Math.PI / 2, 0] });
          }
        }
      }
      const [mx, mz] = polar(ma, 0.62);
      out.push({ geo: 'mound', color: '#b85d37', p: [mx, y + 0.015, mz], s: [0.9, 0.4, 0.9], r: [0, rand() * 3, 0] });
      break;
    }
    case 'pasture': {
      // Sheep grazing under a brass wind turbine.
      for (const [x, z] of spread(rand, 10, TOKEN_CLEAR + 0.04, EDGE - 0.04)) {
        out.push({ geo: 'tuft', color: rand() > 0.5 ? '#8cb85e' : '#9dc070', p: [x, y + 0.045, z], r: [0, rand() * 3, 0] });
      }
      for (const [x, z] of spread(rand, 3, 0.5, 0.64)) {
        const a = rand() * Math.PI * 2;
        out.push({ geo: 'sheepBody', color: '#f4f1e6', p: [x, y + 0.07, z], s: [1.35, 1, 1], r: [0, a, 0] });
        out.push({ geo: 'sheepHead', color: '#3a3530', p: [x + Math.cos(a) * 0.1, y + 0.085, z - Math.sin(a) * 0.1], r: [0, a, 0] });
      }
      const [tx, tz] = polar(pick([CORNERS[3], CORNERS[4], CORNERS[5]]), 0.62);
      out.push({ geo: G.mast, color: BRASS, p: [tx, y + 0.15, tz] });
      const turn = rand() * Math.PI;
      for (let k = 0; k < 3; k++) {
        const a = turn + (k * Math.PI * 2) / 3;
        out.push({ geo: G.blade, color: '#e8dcc0', p: [tx + Math.sin(a) * 0.055, y + 0.3 + Math.cos(a) * 0.055, tz + 0.02], r: [0, 0, -a] });
      }
      out.push({ geo: G.hub, color: BRASS, p: [tx, y + 0.3, tz + 0.02] });
      break;
    }
    case 'fields': {
      // Wheat in three plots, and a steam tractor in one of the gaps.
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
      const gaps = [Math.PI / 3, Math.PI, (5 * Math.PI) / 3].map((g) => offset + g);
      const ta = gaps.find((a) => !inFront(a)) ?? gaps[0];
      const [tx, tz] = polar(ta, 0.6);
      const turn = -ta + Math.PI / 2;
      const [fx, fz] = polar(ta + Math.PI / 2, 0.04);
      out.push({ geo: G.tractor, color: '#6b4a3a', p: [tx, y + 0.055, tz], r: [0, turn, 0] });
      out.push({ geo: G.bigWheel, color: '#3a2a20', p: [tx - fx, y + 0.035, tz - fz], r: [0, turn, 0] });
      out.push({ geo: G.smallWheel, color: '#3a2a20', p: [tx + fx, y + 0.02, tz + fz], r: [0, turn, 0] });
      out.push({ geo: G.stack, color: '#2a2018', p: [tx + fx * 0.6, y + 0.12, tz + fz * 0.6], s: [1, 0.6, 1] });
      smoke(out, tx + fx * 0.6, y + 0.17, tz + fz * 0.6);
      for (const a of gaps.filter((g) => g !== ta)) {
        const [bx, bz] = polar(a, 0.6);
        out.push({ geo: 'bale', color: '#d6ab45', p: [bx, y + 0.055, bz], r: [0, -a + rand() * 0.6, 0] });
      }
      break;
    }
    case 'mountains': {
      // Grey peaks with a mine headframe: an A-frame of girders under its winding wheel.
      const peaks = [CORNERS[3], CORNERS[4], CORNERS[5]].sort(() => rand() - 0.5);
      for (const a of peaks.slice(0, 2)) {
        const [x, z] = polar(a, 0.6);
        const s = 0.8 + rand() * 0.25;
        out.push({ geo: 'peak', color: pick(['#868a93', '#7b7f88', '#94989f']), p: [x, y + 0.18 * s, z], s, r: [0, rand() * 3, 0] });
        out.push({ geo: 'snow', color: '#eef1f4', p: [x, y + 0.33 * s, z], s, r: [0, rand() * 3, 0] });
      }
      const [hx, hz] = polar(pick([CORNERS[0], CORNERS[2]]), 0.6);
      for (const d of [-1, 1]) out.push({ geo: G.leg, color: BRASS, p: [hx + d * 0.035, y + 0.14, hz], r: [0, 0, d * 0.22] });
      out.push({ geo: G.leg, color: '#8a6a3a', p: [hx, y + 0.13, hz - 0.05], r: [0.35, 0, 0] });
      out.push({ geo: G.winding, color: '#5a5048', p: [hx, y + 0.29, hz] });
      for (const [x, z] of spread(rand, 3, 0.5, EDGE - 0.08)) out.push({ geo: 'rock', color: pick(['#9a9ea6', '#80848d']), p: [x, y + 0.03, z], r: [rand(), rand(), 0] });
      break;
    }
    case 'desert': {
      // Giant brass gears half-sunk in the sand, left from some fallen machine. They lean back, so
      // their faces show from above.
      const [bx, bz] = polar(pick([CORNERS[3], CORNERS[4]]), 0.42);
      out.push({ geo: G.gearBig, color: BRASS, p: [bx, y + 0.05, bz], r: [-1.05, rand() * 0.6 - 0.3, 0.3] });
      const [sx, sz] = polar(CORNERS[5], 0.6);
      out.push({ geo: G.gearSmall, color: '#c9a25a', p: [sx, y + 0.04, sz], r: [-0.9, -0.4, 0.2] });
      const [lx, lz] = polar(pick([CORNERS[0], CORNERS[2]]), 0.6);
      out.push({ geo: G.gearSmall, color: '#9a7a48', p: [lx, y + 0.01, lz], r: [-Math.PI / 2, 0, rand() * 3], s: 0.7 });
      for (const [x, z] of spread(rand, 4, 0.3, 0.58)) out.push({ geo: 'dune', color: rand() > 0.5 ? '#d2c09c' : '#e0d2b2', p: [x, y - 0.01, z], s: [1.2, 0.35, 1] });
      break;
    }
    default:
      // Gold looks the same in every theme.
      return null;
  }
  return out;
}

/** Under every tile: the island's rocky underside, hanging over the clouds. */
function Base({ seed }: { seed: number }) {
  const depth = 0.9 + ((seed * 37) % 7) * 0.12;
  return <mesh geometry={rockBase(seed, depth)} material={mat('#7d6a58')} position={[0, -0.35 - depth / 2, 0]} />;
}

const PUFF = new THREE.IcosahedronGeometry(1, 1);

/** Where the cloud floor lies (the island's rocky roots dip into it). */
const CLOUD_FLOOR = -1.15;

/**
 * The sea of clouds: a wide, softly swelling cloud floor far below the island (its swells baked in,
 * never moving, like the ocean's), clusters of puffs heaped on it, and a few little floating
 * islands in the distance.
 */
function Sea({ shelfRadius }: { shelfRadius: number }) {
  const sea = useBoardPalette().sea;
  const ref = useRef<THREE.InstancedMesh>(null);
  const floorGeo = useMemo(() => {
    const g = new THREE.PlaneGeometry(64, 64, 64, 64);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, Math.sin(x * 0.9) * Math.cos(z * 0.8) * 0.18 + Math.sin(x * 0.37 + z * 0.52) * 0.3 + Math.sin(x * 1.7 + z * 0.3) * 0.12);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const puffs = useMemo(() => {
    const rand = seeded(4242);
    const inner = shelfRadius - 2.5;
    const out: { p: [number, number, number]; s: [number, number, number]; turn: number; tint: boolean }[] = [];
    for (let k = 0; k < 110; k++) {
      const a = rand() * Math.PI * 2;
      // Heaped thickest close to the island, thinning out towards the horizon.
      const r = inner + rand() ** 1.6 * (26 - inner);
      const [cx, cz] = [Math.cos(a) * r, Math.sin(a) * r];
      // A cluster: three or four puffs heaped together, the biggest in the middle.
      const n = 3 + Math.floor(rand() * 2);
      for (let i = 0; i < n; i++) {
        const size = ((i === 0 ? 0.75 : 0.4) + rand() * 0.35) * (r < inner + 5 ? 1.25 : 1);
        const d = i === 0 ? 0 : 0.45 + rand() * 0.3;
        const b = rand() * Math.PI * 2;
        // Low and wide: even the biggest puff's top stays under the island's rim (world y ≈ -0.15).
        out.push({
          p: [cx + Math.cos(b) * d, CLOUD_FLOOR + size * 0.2, cz + Math.sin(b) * d],
          s: [size * 1.3, size * 0.45, size],
          turn: rand() * 3,
          tint: rand() > 0.6,
        });
      }
    }
    return out;
  }, [shelfRadius]);
  // Clouds are lit through: a soft glow keeps their shaded sides from going grey like rock.
  const cloud = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#efe6f2', emissiveIntensity: 0.3, flatShading: true, roughness: 1 }), []);
  const floor = useMemo(
    () => new THREE.MeshStandardMaterial({ color: sea.shallow, emissive: '#f2e4ea', emissiveIntensity: 0.35, flatShading: true, roughness: 1 }),
    [sea.shallow],
  );
  useEffect(() => () => [cloud, floor].forEach((m) => m.dispose()), [cloud, floor]);
  useEffect(() => () => floorGeo.dispose(), [floorGeo]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    puffs.forEach((pf, i) => {
      o.position.set(...pf.p);
      o.scale.set(...pf.s);
      o.rotation.set(0, pf.turn, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(pf.tint ? sea.shallow : '#ffffff'));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [puffs, sea.shallow]);
  return (
    <group>
      <mesh geometry={floorGeo} material={floor} position={[0, CLOUD_FLOOR, 0]} />
      <instancedMesh ref={ref} args={[PUFF, cloud, puffs.length]} />
      {ISLETS.map((it, i) => (
        <Islet key={i} {...it} />
      ))}
    </group>
  );
}

const ISLETS = [
  { x: -9, y: 0.4, z: -11, s: 0.9 },
  { x: 6, y: -0.2, z: -13, s: 1.2 },
  { x: 13, y: 0.6, z: -6, s: 0.7 },
  { x: -14, y: -0.3, z: -3, s: 1 },
];
const ISLET = {
  top: new THREE.CylinderGeometry(1, 1, 0.2, 6),
  rock: new THREE.ConeGeometry(1, 1.6, 6),
};

/** A little island floating far off: a grassy top, a rock beneath and a tree or two. */
function Islet({ x, y: h, z, s }: { x: number; y: number; z: number; s: number }) {
  return (
    <group position={[x, h, z]} scale={s}>
      <mesh geometry={ISLET.top} material={mat('#8fb86a')} />
      <mesh geometry={ISLET.rock} material={mat('#7d6a58')} position={[0, -0.9, 0]} rotation={[Math.PI, 0, 0]} />
      <mesh geometry={ISLET.rock} material={mat('#3f7045')} position={[0.3, 0.5, -0.2]} scale={[0.25, 0.4, 0.25]} />
      <mesh geometry={ISLET.rock} material={mat('#35703d')} position={[-0.25, 0.4, 0.2]} scale={[0.2, 0.32, 0.2]} />
    </group>
  );
}

const COTTAGE = {
  body: new THREE.BoxGeometry(0.24, 0.16, 0.22),
  roof: gableRoof(0.28, 0.26, 0.12),
  pipe: new THREE.CylinderGeometry(0.018, 0.018, 0.2, 8),
  cap: new THREE.CylinderGeometry(0.03, 0.022, 0.025, 8),
  porthole: new THREE.CylinderGeometry(0.036, 0.036, 0.01, 12).rotateX(Math.PI / 2),
  rim: new THREE.TorusGeometry(0.038, 0.008, 5, 12),
};

/** A workshop cottage: a copper chimney pipe and a round porthole window. */
function Settlement({ c, o, ghost }: ModelProps) {
  return (
    <>
      <mesh geometry={COTTAGE.body} material={mat(c.hex, o)} position={[0, 0.08, 0]} castShadow={!ghost} />
      <mesh geometry={COTTAGE.pipe} material={mat(COPPER, { ...o, metal: 0.4, rough: 0.45 })} position={[0.08, 0.22, -0.04]} castShadow={!ghost} />
      <mesh geometry={COTTAGE.cap} material={mat(BRASS, o)} position={[0.08, 0.33, -0.04]} />
      <mesh geometry={COTTAGE.roof} material={roofMat(c.dark, o)} position={[0, 0.16, 0]} castShadow={!ghost} />
      <mesh geometry={COTTAGE.porthole} material={lit('#f2d98a', 0.6, o)} position={[0, 0.085, 0.112]} />
      <mesh geometry={COTTAGE.rim} material={mat(BRASS, o)} position={[0, 0.085, 0.115]} />
    </>
  );
}

const CLOCK = {
  tower: new THREE.BoxGeometry(0.15, 0.42, 0.15),
  roof: new THREE.ConeGeometry(0.13, 0.15, 4).rotateY(Math.PI / 4),
  face: new THREE.CylinderGeometry(0.05, 0.05, 0.01, 16).rotateX(Math.PI / 2),
  rim: new THREE.TorusGeometry(0.052, 0.009, 5, 16),
  hand: new THREE.BoxGeometry(0.008, 0.04, 0.004),
  hall: new THREE.BoxGeometry(0.2, 0.17, 0.2),
  hallRoof: gableRoof(0.23, 0.22, 0.1),
};

/** A clocktower with a real clock face, beside a workshop hall. */
function City({ c, o, ghost }: ModelProps) {
  return (
    <>
      <mesh geometry={CLOCK.tower} material={mat(c.hex, o)} position={[-0.08, 0.21, -0.02]} castShadow={!ghost} />
      <mesh geometry={CLOCK.roof} material={mat(c.dark, o)} position={[-0.08, 0.495, -0.02]} castShadow={!ghost} />
      <mesh geometry={CLOCK.face} material={mat('#f6eddb', o)} position={[-0.08, 0.33, 0.058]} />
      <mesh geometry={CLOCK.rim} material={mat(BRASS, o)} position={[-0.08, 0.33, 0.061]} />
      <mesh geometry={CLOCK.hand} material={mat('#1f1a14', o)} position={[-0.08, 0.345, 0.066]} />
      <mesh geometry={CLOCK.hand} material={mat('#1f1a14', o)} position={[-0.068, 0.336, 0.066]} rotation={[0, 0, -1.2]} scale={[1, 0.75, 1]} />
      <mesh geometry={CLOCK.hall} material={mat(c.hex, o)} position={[0.1, 0.085, 0.02]} castShadow={!ghost} />
      <mesh geometry={CLOCK.hallRoof} material={roofMat(c.dark, o)} position={[0.1, 0.17, 0.02]} castShadow={!ghost} />
    </>
  );
}

const BRUTE = {
  body: new THREE.CylinderGeometry(0.12, 0.11, 0.2, 8),
  rivets: new THREE.CylinderGeometry(0.123, 0.123, 0.02, 8),
  head: new THREE.BoxGeometry(0.12, 0.09, 0.1),
  eye: new THREE.SphereGeometry(0.014, 6, 4),
  leg: new THREE.BoxGeometry(0.05, 0.13, 0.06),
  arm: new THREE.BoxGeometry(0.04, 0.16, 0.04),
  key: new THREE.BoxGeometry(0.012, 0.012, 0.07),
  bow: new THREE.TorusGeometry(0.03, 0.009, 5, 10),
};

/** The robber: a clockwork brute, brass-bellied, eyes glowing, its wind-up key turning on its back. */
function Robber({ o, ghost }: { o: { opacity?: number }; ghost: boolean }) {
  const brass = mat(BRASS, { ...o, metal: 0.45, rough: 0.45 });
  const dark = mat('#6b5236', o);
  return (
    <>
      {[-0.05, 0.05].map((x) => (
        <mesh key={x} geometry={BRUTE.leg} material={dark} position={[x, 0.065, 0]} castShadow={!ghost} />
      ))}
      <mesh geometry={BRUTE.body} material={brass} position={[0, 0.23, 0]} castShadow={!ghost} />
      <mesh geometry={BRUTE.rivets} material={dark} position={[0, 0.25, 0]} />
      {[-0.14, 0.14].map((x) => (
        <mesh key={x} geometry={BRUTE.arm} material={dark} position={[x, 0.22, 0.01]} rotation={[0, 0, x > 0 ? 0.15 : -0.15]} castShadow={!ghost} />
      ))}
      <mesh geometry={BRUTE.head} material={mat('#9a7a48', o)} position={[0, 0.385, 0]} castShadow={!ghost} />
      {[-0.03, 0.03].map((x) => (
        <mesh key={x} geometry={BRUTE.eye} material={lit('#ff9a2e', 1.6, o)} position={[x, 0.395, 0.05]} />
      ))}
      <mesh geometry={BRUTE.key} material={brass} position={[0, 0.25, -0.145]} />
      <mesh geometry={BRUTE.bow} material={brass} position={[0, 0.25, -0.19]} rotation={[0, Math.PI / 2, 0]} />
    </>
  );
}

/** A sky-marine in riveted brass armour: aviator goggles pushed up on the brow, a sabre, a back tank. */
const KNIGHT = {
  leg: new THREE.BoxGeometry(0.055, 0.15, 0.065),
  torso: new THREE.CylinderGeometry(0.075, 0.09, 0.17, 6),
  tabard: new THREE.BoxGeometry(0.1, 0.14, 0.02),
  tank: new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8),
  arm: new THREE.BoxGeometry(0.045, 0.13, 0.045),
  cap: new THREE.SphereGeometry(0.072, 9, 6, 0, Math.PI * 2, 0, Math.PI / 1.85),
  earflap: new THREE.BoxGeometry(0.02, 0.05, 0.04),
  strap: new THREE.BoxGeometry(0.1, 0.014, 0.012),
  lens: new THREE.CylinderGeometry(0.021, 0.021, 0.014, 12).rotateX(Math.PI / 2),
  face: new THREE.CircleGeometry(0.046, 16),
  hilt: new THREE.CylinderGeometry(0.009, 0.009, 0.06, 6),
  blade: new THREE.BoxGeometry(0.19, 0.024, 0.01),
  guard: new THREE.TorusGeometry(0.022, 0.006, 4, 10),
};

function Knight({ cloth, dark, faceMat, faceGeo, shadows, headY }: KnightFigureProps) {
  const s = shadows;
  const brass = mat(BRASS, { metal: 0.5, rough: 0.4 });
  return (
    <>
      <mesh geometry={KNIGHT.leg} material={brass} position={[-0.035, 0.075, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.leg} material={brass} position={[0.035, 0.075, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.torso} material={brass} position={[0, 0.235, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.tabard} material={cloth} position={[0, 0.225, 0.078]} />
      <mesh geometry={KNIGHT.tank} material={mat(COPPER, { metal: 0.4, rough: 0.45 })} position={[0, 0.24, -0.09]} castShadow={s} />
      <mesh geometry={KNIGHT.arm} material={brass} position={[-0.11, 0.25, 0.01]} rotation={[0, 0, 0.25]} castShadow={s} />
      <mesh geometry={KNIGHT.arm} material={brass} position={[0.11, 0.25, 0.02]} rotation={[0.5, 0, -0.2]} castShadow={s} />
      {/* a snug leather flight cap with ear flaps, goggles resting on the brow above the face */}
      <mesh geometry={KNIGHT.cap} material={dark} position={[0, headY, 0]} castShadow={s} />
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={KNIGHT.earflap} material={dark} position={[side * 0.07, headY - 0.05, 0.01]} />
      ))}
      <mesh geometry={KNIGHT.strap} material={mat('#3a2e22')} position={[0, headY + 0.02, 0.07]} />
      {[-0.028, 0.028].map((x) => (
        <mesh key={x} geometry={KNIGHT.lens} material={brass} position={[x, headY + 0.02, 0.073]} />
      ))}
      {faceMat ? (
        <mesh geometry={faceGeo ?? KNIGHT.face} material={faceMat} position={[0, headY - 0.05, 0.0755]} />
      ) : (
        <mesh geometry={KNIGHT.face} material={mat('#c9a27a')} position={[0, headY - 0.05, 0.0755]} />
      )}
      {/* the sabre, its blade curving forward */}
      <group position={[0.14, 0.2, 0.07]}>
        <mesh geometry={KNIGHT.hilt} material={dark} position={[0, -0.02, 0]} />
        <mesh geometry={KNIGHT.blade} material={brass} position={[0.08, 0.06, 0]} rotation={[0, 0, 0.18]} castShadow={s} />
        <mesh geometry={KNIGHT.guard} material={brass} rotation={[Math.PI / 2, 0, 0]} />
      </group>
    </>
  );
}

const PIPE = {
  pipe: new THREE.CylinderGeometry(0.018, 0.018, 0.6, 8).rotateZ(Math.PI / 2),
  flange: new THREE.CylinderGeometry(0.026, 0.026, 0.016, 8).rotateZ(Math.PI / 2),
};

/** A copper steam pipe laid along the road, with brass flanges at its joints. */
function Road({ ghost }: { ghost: boolean; c: PieceColors }) {
  const k = usePieceScale();
  if (ghost) return null;
  const top = 0.045 * (2 * k - 1);
  return (
    <group position={[0, top + 0.016, 0]}>
      <mesh geometry={PIPE.pipe} material={mat(COPPER, { metal: 0.4, rough: 0.45 })} />
      {[-0.2, 0, 0.2].map((x) => (
        <mesh key={x} geometry={PIPE.flange} material={mat(BRASS, { metal: 0.4, rough: 0.45 })} position={[x, 0, 0]} />
      ))}
    </group>
  );
}

const AIRSHIP = {
  // A short brass catwalk bridges the gap from the pier's deck (±0.23) out to the mast.
  catwalk: new THREE.BoxGeometry(0.58, 0.025, 0.12),
  mast: new THREE.CylinderGeometry(0.014, 0.024, 0.44, 6),
  mastTop: new THREE.SphereGeometry(0.024, 6, 4),
  envelope: new THREE.SphereGeometry(1, 12, 8),
  gondola: new THREE.BoxGeometry(0.1, 0.03, 0.04),
  fin: new THREE.BoxGeometry(0.06, 0.05, 0.006),
};

/** A mooring mast at the pier's end with an airship tied to it (clear of the floating rate sign). */
function Harbor({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {/* Deck level (0.065, matching HarborPiece's pier) out to the mast at x=0.85 — clear of the sign's
          screen-facing billboard (radius up to 0.26, centred near x=0): close offsets still read as
          overlapping the sign from the default camera, since the billboard always faces it. */}
      <mesh geometry={AIRSHIP.catwalk} material={mat(BRASS, { metal: 0.3, rough: 0.5 })} position={[0.52, 0.053, 0]} castShadow />
      {/* The mast now starts at deck level and rises to where the airship's nose ties on. */}
      <mesh geometry={AIRSHIP.mast} material={mat(BRASS)} position={[0.85, 0.28, 0]} castShadow />
      <mesh geometry={AIRSHIP.mastTop} material={mat('#6b5236')} position={[0.85, 0.5, 0]} />
      <group position={[1.04, 0.5, 0.02]}>
        {/* The envelope's tapered end (its sphere pole) lands right on the mast top, so the nose reads as tied on. */}
        <mesh geometry={AIRSHIP.envelope} material={mat('#e3d3b0')} scale={[0.19, 0.07, 0.07]} castShadow />
        <mesh geometry={AIRSHIP.gondola} material={mat('#6b4a2a')} position={[0, -0.085, 0]} castShadow />
        {[0.04, -0.04].map((fy) => (
          <mesh key={fy} geometry={AIRSHIP.fin} material={mat('#b3402e')} position={[0.17, fy, 0]} />
        ))}
        <mesh geometry={AIRSHIP.fin} material={mat('#b3402e')} position={[0.17, 0, 0]} rotation={[Math.PI / 2, 0, 0]} />
      </group>
    </group>
  );
}

const SHIP_DANGER = '#e0503a';

/** A propeller blade, and its hub. */
const PROP = {
  blade: new THREE.BoxGeometry(0.09, 0.012, 0.02),
  hub: new THREE.SphereGeometry(0.012, 6, 4),
};

/**
 * The barbarian ship as a dark pirate airship, floating well above the sea-steps: a soot-dark
 * envelope, a gondola slung beneath, tail fins and two side propellers.
 */
function BarbarianShip({ danger }: { danger: boolean }) {
  const envelopeMat = mat(danger ? SHIP_DANGER : '#2b241e', danger ? { emissive: SHIP_DANGER, glow: 0.35 } : {});
  const trimMat = mat(danger ? '#e0503a' : '#7a6a5a', danger ? { emissive: SHIP_DANGER, glow: 0.2 } : { metal: 0.3, rough: 0.5 });
  const gondolaMat = mat('#241c14');
  return (
    <group position={[0, 0.3, 0]}>
      {/* the envelope, its long axis along z (bow and stern both taper, like a blimp) */}
      <mesh geometry={AIRSHIP.envelope} material={envelopeMat} scale={[0.075, 0.07, 0.19]} castShadow />
      <mesh geometry={AIRSHIP.gondola} material={gondolaMat} position={[0, -0.085, 0.02]} castShadow />
      {/* tail fins at the stern */}
      {[0.045, -0.045].map((fy) => (
        <mesh key={fy} geometry={AIRSHIP.fin} material={trimMat} position={[0, fy, -0.16]} />
      ))}
      <mesh geometry={AIRSHIP.fin} material={trimMat} position={[0, 0, -0.16]} rotation={[Math.PI / 2, 0, 0]} />
      {/* two side propellers on the gondola */}
      {[-0.05, 0.05].map((px) => (
        <group key={px} position={[px, -0.09, 0]}>
          <mesh geometry={PROP.hub} material={gondolaMat} />
          <mesh geometry={PROP.blade} material={mat('#3a2f26')} rotation={[0, 0, Math.PI / 2]} />
          <mesh geometry={PROP.blade} material={mat('#3a2f26')} />
        </group>
      ))}
    </group>
  );
}

/** Skyport: a steampunk island floating over a sea of clouds, with airships at its harbors. */
export const skyport: ThemeKit = { props, Settlement, City, Robber, Road, Harbor, Base, Sea, BarbarianShip, Knight };
