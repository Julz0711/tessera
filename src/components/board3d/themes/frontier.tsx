'use client';

import * as THREE from 'three';
import type { Terrain } from '@/engine/types';
import { mat } from '../materials';
import { usePieceScale } from '../pieceScale';
import { CORNERS, EDGE, TILE_TOP, TOKEN_CLEAR, inFront, polar, seeded, spread, type Prop } from '../terrainKit';
import { gableRoof, roofMat } from './shared';
import type { KnightFigureProps, ModelProps, PieceColors, ThemeKit } from './types';

const y = TILE_TOP;

/** Frontier's own low-poly geometries (shared, module-scoped like terrainKit's TG). */
const G = {
  // forest: a third, narrow tier for tall ponderosa pines, and a chopping stump
  pineTip: new THREE.ConeGeometry(0.05, 0.16, 6),
  stump: new THREE.CylinderGeometry(0.035, 0.04, 0.05, 7),
  // pasture: the windpump's tower, wheel and tail vane
  pumpTower: new THREE.CylinderGeometry(0.012, 0.035, 0.36, 4),
  pumpWheel: new THREE.CylinderGeometry(0.075, 0.075, 0.012, 12),
  pumpHub: new THREE.CylinderGeometry(0.018, 0.018, 0.03, 6),
  pumpVane: new THREE.BoxGeometry(0.006, 0.035, 0.1),
  // fields: a scarecrow
  pole: new THREE.BoxGeometry(0.014, 0.24, 0.014),
  arms: new THREE.BoxGeometry(0.16, 0.014, 0.014),
  shirt: new THREE.BoxGeometry(0.08, 0.07, 0.03),
  head: new THREE.IcosahedronGeometry(0.028, 0),
  hat: new THREE.ConeGeometry(0.045, 0.04, 7),
  // mountains: a timber-framed mine entrance and an ore cart on rails
  mineMouth: new THREE.BoxGeometry(0.1, 0.1, 0.02),
  mineBeam: new THREE.BoxGeometry(0.02, 0.12, 0.02),
  mineLintel: new THREE.BoxGeometry(0.15, 0.022, 0.024),
  cart: new THREE.BoxGeometry(0.07, 0.04, 0.05),
  track: new THREE.BoxGeometry(0.008, 0.008, 0.2),
  // desert: a red-rock mesa, a saguaro's upturned arms, a cow skull
  mesa: new THREE.CylinderGeometry(0.16, 0.22, 0.2, 7),
  mesaCap: new THREE.CylinderGeometry(0.15, 0.16, 0.035, 7),
  armUp: new THREE.CylinderGeometry(0.02, 0.02, 0.08, 6),
  skull: new THREE.BoxGeometry(0.035, 0.022, 0.045),
  horn: new THREE.ConeGeometry(0.008, 0.045, 5),
};

/** Frontier's own props per terrain; gold (and anything unlisted) keeps the classic look. */
function props(terrain: Terrain, seed: number): Prop[] | null {
  const rand = seeded(seed * 7919 + terrain.length * 31 + 307);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const out: Prop[] = [];

  switch (terrain) {
    case 'forest': {
      // Tall, narrow ponderosa pines, and a stump beside a pile of cut logs.
      const pines = ['#2f5a33', '#355f38', '#2a4f2e'];
      const trees = [...spread(rand, 7, TOKEN_CLEAR + 0.06, 0.56, { avoidFront: true }), ...spread(rand, 8, 0.6, EDGE - 0.08)];
      trees.forEach(([x, z, a]) => {
        const s = (inFront(a) ? 0.62 : 0.8) + rand() * 0.22;
        out.push({ geo: 'trunk', color: '#5a3d24', p: [x, y + 0.05 * s, z], s });
        out.push({ geo: 'coneTree', color: pick(pines), p: [x, y + 0.2 * s, z], s: [s * 0.85, s, s * 0.85], r: [0, rand() * 3, 0] });
        out.push({ geo: 'coneTreeTop', color: pick(pines), p: [x, y + 0.33 * s, z], s: [s * 0.85, s, s * 0.85], r: [0, rand() * 3, 0] });
        out.push({ geo: G.pineTip, color: pick(pines), p: [x, y + 0.43 * s, z], s, r: [0, rand() * 3, 0] });
      });
      const [lx, lz, la] = spread(rand, 1, 0.5, 0.56)[0];
      for (let i = 0; i < 3; i++) {
        out.push({ geo: 'logs', color: '#9a7048', p: [lx, y + 0.025 + (i === 2 ? 0.045 : 0), lz + (i === 2 ? 0 : (i - 0.5) * 0.05)], r: [0, -la, Math.PI / 2] });
      }
      const [sx, sz] = polar(la + 0.45, 0.54);
      out.push({ geo: G.stump, color: '#8a6139', p: [sx, y + 0.025, sz] });
      break;
    }
    case 'hills': {
      // An adobe yard: mud bricks drying in rows, a beehive oven (horno) and a heap of wet clay.
      const corners = rand() > 0.5 ? [0, 2, 4] : [1, 3, 5];
      const [ka, ba, ma] = corners.map((k) => CORNERS[k]);
      const [kx, kz] = polar(ka, 0.6);
      const [mdx, mdz] = polar(ka, 0.085);
      out.push({ geo: 'kilnDome', color: '#d08a5a', p: [kx, y, kz] });
      out.push({ geo: 'kilnMouth', color: '#3b2216', p: [kx - mdx, y + 0.022, kz - mdz], r: [0, -ka + Math.PI / 2, 0] });
      const [bx, bz] = polar(ba, 0.6);
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < 3; i++) {
          const [dx, dz] = polar(ba, (row - 0.5) * 0.07);
          const [ex, ez] = polar(ba + Math.PI / 2, (i - 1) * 0.085);
          out.push({ geo: 'brick', color: (row + i) % 2 ? '#e0a070' : '#d8955f', p: [bx + dx + ex, y + 0.017, bz + dz + ez], r: [0, -ba + Math.PI / 2, 0] });
        }
      }
      const [mx, mz] = polar(ma, 0.62);
      out.push({ geo: 'mound', color: '#b85d37', p: [mx, y + 0.015, mz], s: [0.9, 0.4, 0.9], r: [0, rand() * 3, 0] });
      for (const [x, z] of spread(rand, 3, 0.5, EDGE - 0.1)) out.push({ geo: 'tuft', color: '#a3a35a', p: [x, y + 0.045, z] });
      break;
    }
    case 'pasture': {
      // A sheep ranch: prairie grass, a split-rail fence and a windpump.
      for (const [x, z] of spread(rand, 10, TOKEN_CLEAR + 0.04, EDGE - 0.04)) {
        out.push({ geo: 'tuft', color: rand() > 0.5 ? '#8fa24a' : '#a3b35a', p: [x, y + 0.045, z], r: [0, rand() * 3, 0] });
      }
      for (const [x, z] of spread(rand, 3, 0.5, 0.64)) {
        const a = rand() * Math.PI * 2;
        out.push({ geo: 'sheepBody', color: '#f4f1e6', p: [x, y + 0.07, z], s: [1.35, 1, 1], r: [0, a, 0] });
        out.push({ geo: 'sheepHead', color: '#3a3530', p: [x + Math.cos(a) * 0.1, y + 0.085, z - Math.sin(a) * 0.1], r: [0, a, 0] });
      }
      const fa = CORNERS[Math.floor(rand() * 6)];
      const [fx, fz] = polar(fa, 0.66);
      for (let i = -1; i <= 1; i++) {
        const [dx, dz] = polar(fa + Math.PI / 2, i * 0.1);
        out.push({ geo: 'post', color: '#7a5433', p: [fx + dx, y + 0.04, fz + dz] });
      }
      for (const h of [0.035, 0.065]) out.push({ geo: 'rail', color: '#8a6139', p: [fx, y + h, fz], r: [0, -fa + Math.PI / 2, 0] });
      // The windpump stands at a far corner, its wheel turned to the camera.
      const back = [CORNERS[3], CORNERS[4], CORNERS[5]].filter((a) => a !== fa);
      const [wx, wz] = polar(pick(back), 0.62);
      out.push({ geo: G.pumpTower, color: '#6b5a4a', p: [wx, y + 0.18, wz], r: [0, Math.PI / 4, 0] });
      out.push({ geo: G.pumpWheel, color: '#b8bcc0', p: [wx, y + 0.37, wz + 0.02], r: [Math.PI / 2, 0, 0] });
      out.push({ geo: G.pumpHub, color: '#5a4a3a', p: [wx, y + 0.37, wz + 0.02], r: [Math.PI / 2, 0, 0] });
      out.push({ geo: G.pumpVane, color: '#8a6139', p: [wx, y + 0.37, wz - 0.05] });
      break;
    }
    case 'fields': {
      // Tall corn in three plots around the token, a scarecrow and a couple of hay bales.
      const offset = rand() * Math.PI * 2;
      const corn = ['#e8c35a', '#dcb44a', '#f0d070'];
      for (let k = 0; k < 3; k++) {
        const a = offset + (k * Math.PI * 2) / 3;
        const [px, pz] = polar(a, 0.6);
        const rot = -a + Math.PI / 2;
        out.push({ geo: 'soil', color: '#8a6a2e', p: [px, y + 0.015, pz], r: [0, rot, 0] });
        for (let row = 0; row < 5; row++) {
          const [dx, dz] = polar(a, (row - 2) * 0.045);
          out.push({ geo: 'wheatRow', color: corn[(row + k) % corn.length], p: [px + dx, y + 0.07, pz + dz], s: [1, 1.5, 1], r: [0, rot, 0] });
        }
      }
      // The scarecrow takes whichever gap isn't in front of the token (it's tall); bales fill the rest.
      const gaps = [Math.PI / 3, Math.PI, (5 * Math.PI) / 3].map((g) => offset + g);
      const tall = gaps.find((a) => !inFront(a)) ?? gaps[0];
      const [sx, sz] = polar(tall, 0.6);
      out.push({ geo: G.pole, color: '#6b4a2a', p: [sx, y + 0.12, sz] });
      out.push({ geo: G.arms, color: '#6b4a2a', p: [sx, y + 0.18, sz] });
      out.push({ geo: G.shirt, color: '#a8352a', p: [sx, y + 0.165, sz] });
      out.push({ geo: G.head, color: '#e0c070', p: [sx, y + 0.235, sz] });
      out.push({ geo: G.hat, color: '#4a3322', p: [sx, y + 0.27, sz] });
      for (const a of gaps.filter((g) => g !== tall)) {
        const [bx, bz] = polar(a, 0.6);
        out.push({ geo: 'bale', color: rand() > 0.5 ? '#d6ab45' : '#e2bb58', p: [bx, y + 0.055, bz], r: [0, -a + rand() * 0.6, 0] });
      }
      break;
    }
    case 'mountains': {
      // Bare granite peaks behind the token, and a silver mine with an ore cart at its mouth.
      const peaks = [CORNERS[3], CORNERS[4], CORNERS[5]].sort(() => rand() - 0.5).slice(0, 2);
      for (const a of peaks) {
        const [x, z] = polar(a, 0.6);
        const s = 0.8 + rand() * 0.25;
        out.push({ geo: 'peak', color: pick(['#8a8580', '#7d7873', '#958f89']), p: [x, y + 0.18 * s, z], s, r: [0, rand() * 3, 0] });
        out.push({ geo: 'snow', color: '#b3aca4', p: [x, y + 0.33 * s, z], s, r: [0, rand() * 3, 0] });
      }
      // The mine sits at a side corner, its timber-framed mouth facing the camera.
      const [mx, mz] = polar(rand() > 0.5 ? CORNERS[0] : CORNERS[2], 0.62);
      out.push({ geo: 'mound', color: '#7d7873', p: [mx, y + 0.02, mz - 0.04], s: [0.9, 0.7, 0.8] });
      out.push({ geo: G.mineMouth, color: '#1f1a14', p: [mx, y + 0.05, mz + 0.075] });
      for (const d of [-0.06, 0.06]) out.push({ geo: G.mineBeam, color: '#7a5433', p: [mx + d, y + 0.06, mz + 0.09] });
      out.push({ geo: G.mineLintel, color: '#8a6139', p: [mx, y + 0.125, mz + 0.09] });
      for (const d of [-0.022, 0.022]) out.push({ geo: G.track, color: '#6a6a6a', p: [mx + d, y + 0.004, mz + 0.19] });
      out.push({ geo: G.cart, color: '#5a5a5a', p: [mx, y + 0.028, mz + 0.2] });
      out.push({ geo: 'rock', color: '#9a9ea6', p: [mx, y + 0.055, mz + 0.2], s: 0.55 });
      for (const [x, z] of spread(rand, 3, 0.5, EDGE - 0.08)) out.push({ geo: 'rock', color: pick(['#9a948c', '#86807a']), p: [x, y + 0.03, z], r: [rand(), rand(), 0] });
      break;
    }
    case 'desert': {
      // Red-rock country: a mesa, a saguaro, a sun-bleached cow skull and sandstone drifts. (The
      // robber stands in front of the centre.)
      const ma = pick([CORNERS[3], CORNERS[4], CORNERS[5]]);
      const [mx, mz] = polar(ma, 0.52);
      out.push({ geo: G.mesa, color: '#b0603a', p: [mx, y + 0.1, mz], r: [0, rand() * 3, 0] });
      out.push({ geo: G.mesaCap, color: '#c9784a', p: [mx, y + 0.217, mz], r: [0, rand() * 3, 0] });
      const sa = pick(CORNERS.filter((a) => a !== ma && !inFront(a)));
      const [sx, sz] = polar(sa, 0.58);
      out.push({ geo: 'cactus', color: '#5f8f4a', p: [sx, y + 0.11, sz] });
      out.push({ geo: 'cactusArm', color: '#5f8f4a', p: [sx + 0.03, y + 0.12, sz], r: [0, 0, Math.PI / 2], s: [1, 0.5, 1] });
      out.push({ geo: G.armUp, color: '#5f8f4a', p: [sx + 0.05, y + 0.16, sz] });
      out.push({ geo: 'cactusArm', color: '#5f8f4a', p: [sx - 0.025, y + 0.09, sz], r: [0, 0, Math.PI / 2], s: [1, 0.4, 1] });
      out.push({ geo: G.armUp, color: '#5f8f4a', p: [sx - 0.045, y + 0.12, sz], s: [1, 0.8, 1] });
      const [kx, kz] = polar(pick([CORNERS[0], CORNERS[2]]), 0.62);
      out.push({ geo: G.skull, color: '#f1ead8', p: [kx, y + 0.012, kz] });
      out.push({ geo: G.horn, color: '#e8dfc8', p: [kx - 0.035, y + 0.022, kz - 0.012], r: [0, 0, Math.PI / 2 - 0.5] });
      out.push({ geo: G.horn, color: '#e8dfc8', p: [kx + 0.035, y + 0.022, kz - 0.012], r: [0, 0, -Math.PI / 2 + 0.5] });
      for (const [x, z] of spread(rand, 3, 0.3, 0.5)) out.push({ geo: 'dune', color: rand() > 0.5 ? '#d9a67c' : '#e3b890', p: [x, y - 0.01, z], s: [1.1, 0.3, 0.9] });
      break;
    }
    default:
      // Gold looks the same in every theme.
      return null;
  }
  return out;
}

const CABIN = {
  body: new THREE.BoxGeometry(0.24, 0.15, 0.22),
  course: new THREE.BoxGeometry(0.246, 0.012, 0.226),
  roof: gableRoof(0.29, 0.27, 0.13),
  chimney: new THREE.BoxGeometry(0.05, 0.2, 0.05),
  door: new THREE.BoxGeometry(0.05, 0.08, 0.01),
};

/** The log cabin: log courses around a body in the owner's colour, a steep roof and a stone chimney. */
function Settlement({ c, o, ghost }: ModelProps) {
  return (
    <>
      <mesh geometry={CABIN.body} material={mat(c.hex, o)} position={[0, 0.075, 0]} castShadow={!ghost} />
      {[0.04, 0.085, 0.13].map((h) => (
        <mesh key={h} geometry={CABIN.course} material={mat(c.dark, o)} position={[0, h, 0]} />
      ))}
      <mesh geometry={CABIN.chimney} material={mat('#8a8580', o)} position={[0.09, 0.14, -0.05]} castShadow={!ghost} />
      <mesh geometry={CABIN.roof} material={roofMat(c.dark, o)} position={[0, 0.15, 0]} castShadow={!ghost} />
      <mesh geometry={CABIN.door} material={mat(c.dark, o)} position={[0, 0.04, 0.112]} />
    </>
  );
}

const SALOON = {
  hall: new THREE.BoxGeometry(0.26, 0.2, 0.22),
  roof: gableRoof(0.28, 0.23, 0.08),
  front: new THREE.BoxGeometry(0.3, 0.3, 0.03),
  step: new THREE.BoxGeometry(0.16, 0.05, 0.03),
  sign: new THREE.BoxGeometry(0.2, 0.05, 0.012),
  porch: new THREE.BoxGeometry(0.3, 0.012, 0.08),
  post: new THREE.BoxGeometry(0.012, 0.13, 0.012),
  leg: new THREE.CylinderGeometry(0.007, 0.009, 0.24, 4),
  tank: new THREE.CylinderGeometry(0.07, 0.07, 0.1, 10),
  tankRoof: new THREE.ConeGeometry(0.078, 0.05, 10),
};

const LEGS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
];

/** The saloon: a hall behind a tall false front with a porch, and a water tower beside it. */
function City({ c, o, ghost }: ModelProps) {
  return (
    <>
      <mesh geometry={SALOON.hall} material={mat(c.hex, o)} position={[-0.04, 0.1, -0.03]} castShadow={!ghost} />
      <mesh geometry={SALOON.roof} material={roofMat(c.dark, o)} position={[-0.04, 0.2, -0.03]} castShadow={!ghost} />
      <mesh geometry={SALOON.front} material={mat(c.hex, o)} position={[-0.04, 0.15, 0.095]} castShadow={!ghost} />
      <mesh geometry={SALOON.step} material={mat(c.hex, o)} position={[-0.04, 0.325, 0.095]} castShadow={!ghost} />
      <mesh geometry={SALOON.sign} material={mat(c.dark, o)} position={[-0.04, 0.25, 0.116]} />
      <mesh geometry={SALOON.porch} material={mat(c.dark, o)} position={[-0.04, 0.13, 0.15]} castShadow={!ghost} />
      {[-0.17, 0.09].map((x) => (
        <mesh key={x} geometry={SALOON.post} material={mat(c.dark, o)} position={[x, 0.065, 0.185]} />
      ))}
      <group position={[0.2, 0, -0.06]}>
        {LEGS.map(([dx, dz], i) => (
          <mesh key={i} geometry={SALOON.leg} material={mat('#5a4a3a', o)} position={[dx * 0.045, 0.12, dz * 0.045]} />
        ))}
        <mesh geometry={SALOON.tank} material={mat(c.dark, o)} position={[0, 0.29, 0]} castShadow={!ghost} />
        <mesh geometry={SALOON.tankRoof} material={mat(c.dark, o)} position={[0, 0.365, 0]} castShadow={!ghost} />
      </group>
    </>
  );
}

/** City wall (C&K): a wooden fort stockade of sharpened pickets, with a gate facing the settlement. */
const WALL = {
  picket: new THREE.BoxGeometry(0.05, 0.2, 0.014),
  pointTip: new THREE.ConeGeometry(0.03, 0.04, 4),
  gatePost: new THREE.BoxGeometry(0.02, 0.24, 0.02),
  gateBeam: new THREE.BoxGeometry(0.14, 0.02, 0.02),
  sign: new THREE.BoxGeometry(0.08, 0.04, 0.01),
};
const PICKET_COUNT = 16;
/** Half the angular width left clear for the gate, centred on the wall's front. */
const GATE_HALF = 0.28;

/** The city wall: a picket stockade with a gate, the owner's sign hung above it. */
function CityWall({ c }: { c: PieceColors }) {
  return (
    <group>
      {Array.from({ length: PICKET_COUNT }, (_, i) => (i / PICKET_COUNT) * Math.PI * 2)
        .filter((a) => Math.abs(a > Math.PI ? a - Math.PI * 2 : a) > GATE_HALF)
        .map((a, i) => (
          <group key={i} position={[Math.sin(a) * 0.32, 0, Math.cos(a) * 0.32]} rotation={[0, a, 0]}>
            <mesh geometry={WALL.picket} material={mat('#8a6139')} position={[0, 0.1, 0]} castShadow />
            <mesh geometry={WALL.pointTip} material={mat('#6b4a2a')} position={[0, 0.22, 0]} />
          </group>
        ))}
      {[-0.09, 0.09].map((x) => (
        <mesh key={x} geometry={WALL.gatePost} material={mat('#6b4a2a')} position={[x, 0.12, 0.32]} castShadow />
      ))}
      <mesh geometry={WALL.gateBeam} material={mat('#5a3d22')} position={[0, 0.23, 0.32]} />
      <mesh geometry={WALL.sign} material={mat(c.hex)} position={[0, 0.19, 0.335]} />
    </group>
  );
}

const OUTLAW = {
  coat: new THREE.ConeGeometry(0.14, 0.36, 7),
  head: new THREE.IcosahedronGeometry(0.075, 0),
  bandana: new THREE.ConeGeometry(0.068, 0.08, 6),
  brim: new THREE.CylinderGeometry(0.15, 0.15, 0.014, 14),
  crown: new THREE.CylinderGeometry(0.058, 0.07, 0.085, 8),
};

/** The robber: an outlaw in a long coat, a red bandana over his face and a wide-brimmed hat. */
function Robber({ o, ghost }: { o: { opacity?: number }; ghost: boolean }) {
  return (
    <>
      <mesh geometry={OUTLAW.coat} material={mat('#3a2f28', o)} position={[0, 0.18, 0]} castShadow={!ghost} />
      <mesh geometry={OUTLAW.head} material={mat('#c9a27a', o)} position={[0, 0.41, 0]} castShadow={!ghost} />
      <mesh geometry={OUTLAW.bandana} material={mat('#b3302a', o)} position={[0, 0.375, 0.035]} rotation={[Math.PI, 0, 0]} scale={[1, 1, 0.7]} />
      <mesh geometry={OUTLAW.brim} material={mat('#2a1f18', o)} position={[0, 0.465, 0]} castShadow={!ghost} />
      <mesh geometry={OUTLAW.crown} material={mat('#2a1f18', o)} position={[0, 0.51, 0]} castShadow={!ghost} />
    </>
  );
}

/** A sheriff standing watch: a wide-brimmed hat, a long duster coat, a tin star and a rifle. */
const KNIGHT = {
  leg: new THREE.BoxGeometry(0.055, 0.15, 0.065),
  coat: new THREE.ConeGeometry(0.13, 0.28, 8),
  vest: new THREE.BoxGeometry(0.09, 0.09, 0.025),
  star: new THREE.IcosahedronGeometry(0.016, 0),
  arm: new THREE.BoxGeometry(0.045, 0.13, 0.045),
  head: new THREE.IcosahedronGeometry(0.075, 0),
  face: new THREE.CircleGeometry(0.046, 16),
  brim: new THREE.CylinderGeometry(0.15, 0.15, 0.015, 12),
  crown: new THREE.CylinderGeometry(0.06, 0.07, 0.085, 10),
  barrel: new THREE.CylinderGeometry(0.009, 0.009, 0.34, 6),
  stock: new THREE.BoxGeometry(0.03, 0.05, 0.09),
};

function Knight({ trim, cloth, dark, faceMat, faceGeo, shadows, headY }: KnightFigureProps) {
  const s = shadows;
  return (
    <>
      <mesh geometry={KNIGHT.leg} material={dark} position={[-0.035, 0.075, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.leg} material={dark} position={[0.035, 0.075, 0]} castShadow={s} />
      {/* the duster: a long open coat over the body */}
      <mesh geometry={KNIGHT.coat} material={cloth} position={[0, 0.29, 0]} rotation={[Math.PI, 0, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.vest} material={dark} position={[0, 0.26, 0.06]} />
      <mesh geometry={KNIGHT.star} material={mat('#e8c35a', { metal: 0.4, rough: 0.35 })} position={[0.025, 0.285, 0.073]} />
      <mesh geometry={KNIGHT.arm} material={cloth} position={[-0.13, 0.28, 0.02]} rotation={[0, 0, 0.35]} castShadow={s} />
      <mesh geometry={KNIGHT.arm} material={cloth} position={[0.12, 0.26, 0.03]} rotation={[0.6, 0, -0.3]} castShadow={s} />
      {/* a bare head under a wide-brimmed hat, the face open to the sun */}
      <mesh geometry={KNIGHT.head} material={mat('#c9a27a')} position={[0, headY - 0.02, 0]} castShadow={s} />
      {faceMat ? (
        <mesh geometry={faceGeo ?? KNIGHT.face} material={faceMat} position={[0, headY - 0.06, 0.0755]} />
      ) : null}
      <mesh geometry={KNIGHT.crown} material={dark} position={[0, headY + 0.075, -0.005]} />
      <mesh geometry={KNIGHT.brim} material={dark} position={[0, headY + 0.04, -0.005]} rotation={[0.05, 0, 0]} castShadow={s} />
      {/* the rifle, slung diagonally across the body */}
      <group position={[0.02, 0.24, 0.02]} rotation={[0, 0, 0.95]}>
        <mesh geometry={KNIGHT.barrel} material={trim} castShadow={s} />
        <mesh geometry={KNIGHT.stock} material={mat('#6b4a2a')} position={[0, -0.19, 0]} />
      </group>
    </>
  );
}

const RAIL = {
  tie: new THREE.BoxGeometry(0.032, 0.012, 0.17),
  rail: new THREE.BoxGeometry(0.6, 0.012, 0.014),
};

/** Railroad track: wooden crossties and two steel rails along the road, which becomes the ballast. */
function Road({ ghost }: { ghost: boolean; c: PieceColors }) {
  const k = usePieceScale();
  if (ghost) return null;
  // The road grows with the Board size in height and width (pieces.tsx); the track sits on top.
  const top = 0.045 * (2 * k - 1);
  return (
    <group position={[0, top, 0]} scale={[1, 1, k]}>
      {[-0.24, -0.12, 0, 0.12, 0.24].map((x) => (
        <mesh key={x} geometry={RAIL.tie} material={mat('#4a3322')} position={[x, 0.006, 0]} />
      ))}
      {[-0.035, 0.035].map((z) => (
        <mesh key={z} geometry={RAIL.rail} material={mat('#a4a9ae', { metal: 0.4, rough: 0.5 })} position={[0, 0.016, z]} />
      ))}
    </group>
  );
}

const SHIP_DANGER = '#c23a2a';

/** An outlaws' paddle steamer: a white hull, a red-roofed deck cabin, twin smokestacks and a big stern wheel. */
const SHIP = {
  hull: new THREE.BoxGeometry(0.18, 0.07, 0.44),
  deck: new THREE.BoxGeometry(0.14, 0.08, 0.24),
  stack: new THREE.CylinderGeometry(0.014, 0.016, 0.16, 6),
  wheel: new THREE.CylinderGeometry(0.09, 0.09, 0.08, 12),
  puff: new THREE.IcosahedronGeometry(0.035, 0),
};
const STACKS: [number, number][] = [
  [-0.03, 0.05],
  [0.03, 0.05],
];

/** The barbarian ship as an outlaws' paddle steamer: twin smokestacks fore, a big stern wheel aft. */
function BarbarianShip({ danger }: { danger: boolean }) {
  const hullMat = mat(danger ? SHIP_DANGER : '#efe8d8', danger ? { emissive: SHIP_DANGER, glow: 0.3 } : {});
  const deckMat = mat(danger ? '#8a1f14' : '#b3402e');
  const smoke = mat(danger ? '#f3ddd3' : '#efe8d8', { opacity: 0.9 });
  return (
    <group>
      <mesh geometry={SHIP.hull} material={hullMat} position={[0, 0.035, 0]} castShadow />
      <mesh geometry={SHIP.deck} material={deckMat} position={[0, 0.11, 0.06]} castShadow />
      {STACKS.map(([sx, sz]) => (
        <mesh key={sx} geometry={SHIP.stack} material={mat('#2a2622')} position={[sx, 0.24, sz]} castShadow />
      ))}
      {STACKS.map(([sx, sz]) => (
        <mesh key={`p${sx}`} geometry={SHIP.puff} material={smoke} position={[sx, 0.34, sz - 0.02]} />
      ))}
      <mesh geometry={SHIP.wheel} material={mat('#8a4a2a')} position={[0, 0.07, -0.24]} rotation={[Math.PI / 2, 0, 0]} castShadow />
    </group>
  );
}

/** Frontier: pines and ranches, adobe and silver mines, saloons, railroads and an outlaw. */
export const frontier: ThemeKit = { props, Settlement, City, Robber, Road, BarbarianShip, Knight, CityWall };
