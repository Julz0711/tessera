'use client';

import * as THREE from 'three';
import type { Terrain } from '@/engine/types';
import { mat } from '../materials';
import { usePieceScale } from '../pieceScale';
import { classicProps } from '../terrain';
import { CORNERS, EDGE, TG, TILE_TOP, TOKEN_CLEAR, inFront, polar, seeded, spread, type Prop } from '../terrainKit';
import { gableRoof, roofMat } from './shared';
import type { KnightFigureProps, ModelProps, PieceColors, ThemeKit } from './types';

const y = TILE_TOP;

/** Sakura Isle's own low-poly geometries (shared, module-scoped like terrainKit's TG). */
const G = {
  // forest: fallen blossom petals
  petal: new THREE.BoxGeometry(0.05, 0.006, 0.032),
  // fields: flooded paddy plots and rows of rice tufts
  paddy: new THREE.BoxGeometry(0.32, 0.022, 0.24),
  riceRow: new THREE.BoxGeometry(0.24, 0.05, 0.02),
  // pasture: stone lantern (toro)
  toroBase: new THREE.CylinderGeometry(0.045, 0.05, 0.045, 6),
  toroPost: new THREE.CylinderGeometry(0.016, 0.02, 0.1, 6),
  toroBox: new THREE.BoxGeometry(0.072, 0.058, 0.072),
  toroRoof: new THREE.ConeGeometry(0.062, 0.045, 4),
  // mountains: one big volcano
  // A flat-topped cone; the snow cap is its top third, a hair wider so it sits on the slope.
  volcano: new THREE.CylinderGeometry(0.05, 0.34, 0.5, 8),
  volcanoSnow: new THREE.CylinderGeometry(0.054, 0.153, 0.17, 8),
  crater: new THREE.CylinderGeometry(0.036, 0.036, 0.012, 8),
  // desert: raked sand rings (concentric, so the token stays clear by construction)
  // hills: one step of the climbing kiln's earthen ramp (height set per step by scale), pots
  kilnStep: new THREE.BoxGeometry(0.13, 1, 0.16),
  pot: new THREE.SphereGeometry(0.035, 7, 5),
  potNeck: new THREE.CylinderGeometry(0.016, 0.02, 0.02, 7),
  // torii in the rock garden: two posts, a tie beam and a wide top beam with a dark cap
  toriiPost: new THREE.CylinderGeometry(0.016, 0.019, 0.22, 6),
  toriiTie: new THREE.BoxGeometry(0.3, 0.02, 0.022),
  toriiBeam: new THREE.BoxGeometry(0.38, 0.026, 0.03),
  toriiCap: new THREE.BoxGeometry(0.42, 0.018, 0.04),
  ring0: new THREE.TorusGeometry(0.48, 0.011, 4, 28),
  ring1: new THREE.TorusGeometry(0.58, 0.011, 4, 28),
  ring2: new THREE.TorusGeometry(0.68, 0.011, 4, 28),
};

const SHIP_DANGER = '#c23a2a';

/** A Japanese junk: a broad hull with a raised, boxy stern castle and a red battened sail. */
const SHIP = {
  hull: new THREE.BoxGeometry(0.22, 0.07, 0.4),
  bowBlock: new THREE.BoxGeometry(0.16, 0.08, 0.07),
  sternCastle: new THREE.BoxGeometry(0.17, 0.1, 0.09),
  mast: new THREE.CylinderGeometry(0.012, 0.012, 0.34, 5),
  sail: new THREE.BoxGeometry(0.2, 0.22, 0.012),
  batten: new THREE.BoxGeometry(0.2, 0.012, 0.014),
};
const BATTENS = [-0.075, -0.025, 0.025, 0.075];

/** The barbarian ship as a red-sailed junk: a wide hull, a raised stern castle and battened sail. */
function BarbarianShip({ danger }: { danger: boolean }) {
  const hullMat = mat(danger ? SHIP_DANGER : '#5a3a26', danger ? { emissive: SHIP_DANGER, glow: 0.35 } : {});
  const trimMat = mat('#3a271a');
  const sailMat = mat(danger ? '#f3d9d3' : '#b8362a');
  const battenMat = mat('#2a1f18');
  return (
    <group>
      <mesh geometry={SHIP.hull} material={hullMat} position={[0, 0.035, 0]} castShadow />
      <mesh geometry={SHIP.bowBlock} material={hullMat} position={[0, 0.06, 0.21]} rotation={[0.35, 0, 0]} castShadow />
      <mesh geometry={SHIP.sternCastle} material={trimMat} position={[0, 0.1, -0.16]} castShadow />
      <mesh geometry={SHIP.mast} material={trimMat} position={[0, 0.2, -0.02]} />
      <mesh geometry={SHIP.sail} material={sailMat} position={[0, 0.24, -0.02]} />
      {BATTENS.map((by) => (
        <mesh key={by} geometry={SHIP.batten} material={battenMat} position={[0, 0.24 + by, -0.013]} />
      ))}
    </group>
  );
}

/**
 * The volcano's size and place: towards a back corner, 0.6 out, its foot (radius 0.34 × 0.62 ≈ 0.21)
 * stays 0.27 inside the tile's edges (apothem 0.81) and comes no nearer the centre than ~0.39.
 */
const VOLCANO = 0.62;
const VOLCANO_OUT = 0.6;

/** Sakura Isle's own props per terrain; falls back to the classic look where it isn't listed. */
function props(terrain: Terrain, seed: number): Prop[] | null {
  const rand = seeded(seed * 7919 + terrain.length * 31 + 101);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const out: Prop[] = [];

  switch (terrain) {
    case 'forest': {
      // Mostly cherry blossom, a few dark pines tucked in among them.
      const blossoms = ['#f4b6c8', '#eea1b8', '#f7c9d6', '#e98caa'];
      const pines = ['#2c6a3a', '#2f7440', '#245c31'];
      const trees = [...spread(rand, 7, TOKEN_CLEAR + 0.06, 0.56, { avoidFront: true }), ...spread(rand, 9, 0.6, EDGE - 0.08)];
      trees.forEach(([x, z, a], i) => {
        const s = (inFront(a) ? 0.62 : 0.8) + rand() * 0.22;
        out.push({ geo: 'trunk', color: '#5a4536', p: [x, y + 0.05 * s, z], s });
        if (i % 4 === 0) {
          out.push({ geo: 'coneTree', color: pick(pines), p: [x, y + 0.2 * s, z], s, r: [0, rand() * 3, 0] });
          out.push({ geo: 'coneTreeTop', color: pick(pines), p: [x, y + 0.34 * s, z], s, r: [0, rand() * 3, 0] });
        } else {
          out.push({ geo: 'canopy', color: pick(blossoms), p: [x, y + 0.17 * s, z], s: [s * 1.1, s, s * 1.1], r: [0, rand() * 3, 0] });
        }
      });
      // A few fallen petals scattered on the ground.
      for (const [x, z] of spread(rand, 5, TOKEN_CLEAR + 0.04, EDGE - 0.05)) {
        out.push({ geo: G.petal, color: pick(blossoms), p: [x, y + 0.006, z], r: [0, rand() * 3, 0] });
      }
      break;
    }
    case 'hills': {
      // A potter's yard: a climbing kiln (three chambers, each resting on its own step of an earthen
      // ramp) at a back corner, a cluster of glazed pots, a clay mound and a stack of bricks.
      const back = [CORNERS[3], CORNERS[4], CORNERS[5]];
      const ka = pick(back);
      // The other four corners away from the camera side, in a seeded order: one each for the pots,
      // the clay mound and the bricks.
      const [pa, ma, sa] = CORNERS.filter((c) => c !== ka && !inFront(c))
        .map((c) => [c, rand()] as const)
        .sort((u, v) => u[1] - v[1])
        .map(([c]) => c);
      for (let i = 0; i < 3; i++) {
        const [kx, kz] = polar(ka, 0.5 + i * 0.12);
        const h = 0.022 * (i + 1);
        out.push({ geo: G.kilnStep, color: i % 2 ? '#9c5634' : '#a85f3a', p: [kx, y + h / 2, kz], s: [1, h, 1], r: [0, -ka, 0] });
        out.push({ geo: 'kilnDome', color: i % 2 ? '#b86a3f' : '#c27449', p: [kx, y + h, kz], s: 0.72 });
        if (i === 2) out.push({ geo: 'kilnFlue', color: '#7a4128', p: [kx, y + h + 0.075, kz] });
      }
      // pots: a big jar and two small ones, in dark and pale glazes
      const [px, pz] = polar(pa, 0.62);
      const glazes = ['#3b3f4a', '#6b4a3a', '#cdbf9f'];
      [[0, 0, 1.2], [0.07, 0.04, 0.8], [-0.05, 0.06, 0.7]].forEach(([dx, dz, k], i) => {
        out.push({ geo: G.pot, color: glazes[i], p: [px + dx, y + 0.035 * k, pz + dz], s: [k, k * 1.15, k] });
        out.push({ geo: G.potNeck, color: glazes[i], p: [px + dx, y + 0.075 * k, pz + dz], s: k });
      });
      const [mx, mz] = polar(ma, 0.64);
      out.push({ geo: 'mound', color: '#c46b41', p: [mx, y + 0.01, mz], s: [0.9, 0.35, 0.9], r: [0, rand() * 3, 0] });
      const [sx, sz] = polar(sa, 0.6);
      for (let layer = 0; layer < 3; layer++) {
        for (let i = 0; i < 2; i++) {
          out.push({
            geo: 'brick',
            color: layer % 2 ? '#a2492e' : '#b5533a',
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
        out.push({ geo: 'tuft', color: rand() > 0.5 ? '#8fbf5e' : '#9cc27a', p: [x, y + 0.045, z], r: [0, rand() * 3, 0] });
      }
      for (const [x, z] of spread(rand, 3, 0.5, 0.64)) {
        const a = rand() * Math.PI * 2;
        out.push({ geo: 'sheepBody', color: '#f4f1e6', p: [x, y + 0.07, z], s: [1.35, 1, 1], r: [0, a, 0] });
        out.push({ geo: 'sheepHead', color: '#3a3530', p: [x + Math.cos(a) * 0.1, y + 0.085, z - Math.sin(a) * 0.1], r: [0, a, 0] });
      }
      // One or two small stone lanterns (toro) instead of the classic fence.
      const count = rand() > 0.5 ? 2 : 1;
      const spots = spread(rand, count, 0.55, 0.68, { avoidFront: true });
      for (const [tx, tz] of spots) {
        out.push({ geo: G.toroBase, color: '#9a968c', p: [tx, y + 0.022, tz] });
        out.push({ geo: G.toroPost, color: '#8f8b81', p: [tx, y + 0.075, tz] });
        out.push({ geo: G.toroBox, color: '#f0b96a', emissive: '#f0b96a', p: [tx, y + 0.15, tz] });
        out.push({ geo: G.toroRoof, color: '#7a766c', p: [tx, y + 0.2, tz], r: [0, Math.PI / 4, 0] });
      }
      break;
    }
    case 'fields': {
      // Three flooded rice paddies around the token, in rows.
      const offset = rand() * Math.PI * 2;
      const waters = ['#2c6a72', '#316f68', '#255d63'];
      const rices = ['#9db34a', '#a8bd57', '#8ea840'];
      for (let k = 0; k < 3; k++) {
        const a = offset + (k * Math.PI * 2) / 3;
        const [px, pz] = polar(a, 0.6);
        const rot = -a + Math.PI / 2;
        out.push({ geo: G.paddy, color: waters[k % waters.length], p: [px, y + 0.011, pz], r: [0, rot, 0] });
        for (let row = 0; row < 4; row++) {
          const [dx, dz] = polar(a, (row - 1.5) * 0.05);
          out.push({ geo: G.riceRow, color: rices[(row + k) % rices.length], p: [px + dx, y + 0.045, pz + dz], r: [0, rot, 0] });
        }
      }
      break;
    }
    case 'mountains': {
      // One big snow-capped volcano out at a back corner, clear of the number token, plus a few loose rocks.
      const corners = CORNERS.filter((a) => !inFront(a));
      const a = pick(corners);
      const [x, z] = polar(a, VOLCANO_OUT);
      const turn = rand() * 3;
      const k = VOLCANO;
      out.push({ geo: G.volcano, color: '#6f7486', p: [x, y + 0.25 * k, z], r: [0, turn, 0], s: k });
      out.push({ geo: G.volcanoSnow, color: '#eef1f4', p: [x, y + 0.415 * k, z], r: [0, turn, 0], s: k });
      out.push({ geo: G.crater, color: '#9aa3b3', p: [x, y + 0.502 * k, z], r: [0, turn, 0], s: k });
      for (const [rx, rz] of spread(rand, 4, 0.5, EDGE - 0.08)) out.push({ geo: 'rock', color: pick(['#9a9ea6', '#80848d']), p: [rx, y + 0.03, rz], r: [rand(), rand(), 0] });
      break;
    }
    case 'desert': {
      // A zen rock garden: raked sand rings, three dark stones, and a vermilion torii gate back and
      // left of the middle (a desert has no number token; the robber stands right of the centre).
      const ringGeo = [G.ring0, G.ring1, G.ring2];
      ringGeo.forEach((geo, i) => {
        out.push({ geo, color: i % 2 ? '#c9bb95' : '#d3c6a0', p: [0, y + 0.003, 0], r: [-Math.PI / 2, 0, 0] });
      });
      const t = 1.3;
      const tx = -0.12;
      const tz = -0.18;
      const red = '#d8412f';
      out.push(
        { geo: G.toriiPost, color: red, p: [tx - 0.13 * t, y + 0.11 * t, tz], s: t },
        { geo: G.toriiPost, color: red, p: [tx + 0.13 * t, y + 0.11 * t, tz], s: t },
        { geo: G.toriiTie, color: red, p: [tx, y + 0.17 * t, tz], s: t },
        { geo: G.toriiBeam, color: red, p: [tx, y + 0.225 * t, tz], s: t },
        { geo: G.toriiCap, color: '#2b2522', p: [tx, y + 0.25 * t, tz], s: t },
      );
      const stones = spread(rand, 5, TOKEN_CLEAR + 0.1, EDGE - 0.12).filter(([x, z]) => Math.hypot(x - tx, z - tz) > 0.34 && Math.hypot(x - 0.5, z - 0.08) > 0.24);
      for (const [x, z] of stones.slice(0, 3)) {
        out.push({ geo: 'stone', color: pick(['#454138', '#38352f', '#504b41']), p: [x, y + 0.03, z], r: [rand(), rand(), 0] });
      }
      break;
    }
    case 'gold':
      // The classic glowing heaps: gold looks the same in every theme.
      return classicProps('gold', seed);
  }
  return out;
}

/** Piece geometries, shared across renders (created once at module scope, like GEO in materials.ts). */
const PIECE_GEO = {
  pagodaBase: new THREE.BoxGeometry(0.3, 0.14, 0.3),
  pagodaRoof1: new THREE.ConeGeometry(0.34, 0.06, 4),
  pagodaTier2: new THREE.BoxGeometry(0.22, 0.12, 0.22),
  pagodaRoof2: new THREE.ConeGeometry(0.27, 0.055, 4),
  pagodaTier3: new THREE.BoxGeometry(0.15, 0.1, 0.15),
  pagodaRoof3: new THREE.ConeGeometry(0.2, 0.05, 4),
  finial: new THREE.CylinderGeometry(0.008, 0.014, 0.09, 5),
  cloak: new THREE.ConeGeometry(0.15, 0.38, 7),
  head: new THREE.IcosahedronGeometry(0.085, 0),
  // Tall enough that its slope clears the head underneath everywhere.
  hat: new THREE.ConeGeometry(0.21, 0.09, 8),
};

/**
 * A tea house: a room in the owner's colour with paper sliding doors on a low stone base, a little
 * veranda in front, under a hip-and-gable (irimoya) roof in the dark tone whose eaves flare out.
 */
function Settlement({ c, o, ghost }: ModelProps) {
  const shadow = !ghost;
  return (
    <>
      <mesh geometry={TEA.base} material={mat('#8d8a82', o)} position={[0, 0.0175, 0]} castShadow={shadow} />
      <mesh geometry={TEA.deck} material={mat('#8a6139', o)} position={[0, 0.042, 0.1]} castShadow={shadow} />
      <mesh geometry={TEA.body} material={mat(c.hex, o)} position={[0, 0.1, -0.02]} castShadow={shadow} />
      {[-0.066, 0, 0.066].map((x) => (
        <mesh key={x} geometry={TEA.door} material={mat('#f3ecd8', o)} position={[x, 0.095, 0.066]} />
      ))}
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} geometry={TEA.post} material={mat('#3a2a1e', o)} position={[x, 0.1, 0.125]} castShadow={shadow} />
      ))}
      {/* the roof in the owner's dark tone: a shallow flared eave, a steeper hip above it (the kink reads as upturned eaves), a small gable on top */}
      <group position={[0, 0, 0.0]} scale={[1.08, 1, 0.88]}>
        <mesh geometry={TEA.eave} material={mat(c.dark, o)} position={[0, 0.175, 0]} castShadow={shadow} />
        <mesh geometry={TEA.hip} material={mat(c.dark, o)} position={[0, 0.23, 0]} castShadow={shadow} />
      </group>
      <mesh geometry={TEA.gable} material={roofMat(c.dark, o)} position={[0, 0.275, 0]} castShadow={shadow} />
      <mesh geometry={TEA.ridge} material={mat('#2b2522', o)} position={[0, 0.365, 0]} />
    </>
  );
}

/** Tea house geometries (see `Settlement`); the 4-sided cylinders turn 45° so their faces line up with the axes. */
const TEA = {
  base: new THREE.BoxGeometry(0.3, 0.035, 0.26),
  deck: new THREE.BoxGeometry(0.3, 0.014, 0.07),
  body: new THREE.BoxGeometry(0.22, 0.13, 0.17),
  door: new THREE.BoxGeometry(0.056, 0.082, 0.004),
  post: new THREE.CylinderGeometry(0.009, 0.009, 0.12, 5),
  eave: new THREE.CylinderGeometry(0.2, 0.245, 0.02, 4, 1).rotateY(Math.PI / 4),
  hip: new THREE.CylinderGeometry(0.1, 0.2, 0.09, 4, 1).rotateY(Math.PI / 4),
  gable: gableRoof(0.13, 0.19, 0.09).rotateY(Math.PI / 2),
  ridge: new THREE.BoxGeometry(0.21, 0.012, 0.016),
};

/** A small pagoda: stacked tiers in the owner's colour, each under a wide flat overhanging roof. */
function City({ c, o, ghost }: ModelProps) {
  return (
    <>
      <mesh geometry={PIECE_GEO.pagodaBase} material={mat(c.hex, o)} position={[0, 0.08, 0]} castShadow={!ghost} />
      <mesh geometry={PIECE_GEO.pagodaRoof1} material={mat(c.dark, o)} position={[0, 0.18, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={!ghost} />
      <mesh geometry={PIECE_GEO.pagodaTier2} material={mat(c.hex, o)} position={[0, 0.27, 0]} castShadow={!ghost} />
      <mesh geometry={PIECE_GEO.pagodaRoof2} material={mat(c.dark, o)} position={[0, 0.36, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={!ghost} />
      <mesh geometry={PIECE_GEO.pagodaTier3} material={mat(c.hex, o)} position={[0, 0.43, 0]} castShadow={!ghost} />
      <mesh geometry={PIECE_GEO.pagodaRoof3} material={mat(c.dark, o)} position={[0, 0.49, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={!ghost} />
      <mesh geometry={PIECE_GEO.finial} material={mat(c.dark, o)} position={[0, 0.55, 0]} castShadow={!ghost} />
    </>
  );
}

/** City wall (C&K): a low red-lacquered wooden fence under a dark tiled coping. */
const WALL = {
  fence: new THREE.CylinderGeometry(0.31, 0.34, 0.1, 6, 1, true),
  coping: new THREE.TorusGeometry(0.325, 0.02, 4, 6),
  tile: new THREE.BoxGeometry(0.075, 0.02, 0.05),
  lantern: new THREE.BoxGeometry(0.03, 0.035, 0.03),
};
const WALL_ANGLES = [0, 1, 2, 3, 4, 5].map((i) => (i * Math.PI) / 3);

/** The city wall: a red-lacquered fence under dark roof tiles, a paper lantern glowing in the owner's colour at the gate. */
function CityWall({ c }: { c: PieceColors }) {
  return (
    <group rotation={[0, Math.PI / 6, 0]}>
      <mesh geometry={WALL.fence} material={mat('#a8352a')} position={[0, 0.05, 0]} castShadow />
      <mesh geometry={WALL.coping} material={mat('#2a221c')} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {WALL_ANGLES.map((a, i) => (
        <mesh key={i} geometry={WALL.tile} material={mat('#332721')} position={[Math.sin(a) * 0.325, 0.115, Math.cos(a) * 0.325]} rotation={[0, a, 0]} />
      ))}
      <mesh geometry={WALL.lantern} material={mat(c.hex, { emissive: c.hex, glow: 0.5 })} position={[0, 0.13, 0.325]} />
    </group>
  );
}

/** A samurai in lamellar armour: a kabuto helmet with flared wings and a crescent crest, a katana at the hip. */
const KNIGHT = {
  leg: new THREE.BoxGeometry(0.05, 0.15, 0.062),
  torso: new THREE.CylinderGeometry(0.078, 0.07, 0.15, 6),
  kusazuri: new THREE.CylinderGeometry(0.07, 0.135, 0.1, 6),
  sode: new THREE.BoxGeometry(0.06, 0.075, 0.02),
  arm: new THREE.BoxGeometry(0.045, 0.12, 0.045),
  bowl: new THREE.SphereGeometry(0.078, 10, 6, 0, Math.PI * 2, 0, Math.PI / 1.7),
  wing: new THREE.BoxGeometry(0.018, 0.095, 0.1),
  crest: new THREE.TorusGeometry(0.05, 0.007, 4, 10, Math.PI),
  face: new THREE.CircleGeometry(0.046, 16),
  eyeSlit: new THREE.BoxGeometry(0.07, 0.01, 0.01),
  saya: new THREE.BoxGeometry(0.018, 0.24, 0.014),
  tsuba: new THREE.CylinderGeometry(0.02, 0.02, 0.008, 8),
};

function Knight({ trim, cloth, dark, shadows, headY }: KnightFigureProps) {
  const s = shadows;
  return (
    <>
      <mesh geometry={KNIGHT.leg} material={dark} position={[-0.032, 0.075, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.leg} material={dark} position={[0.032, 0.075, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.kusazuri} material={cloth} position={[0, 0.155, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.torso} material={cloth} position={[0, 0.245, 0]} castShadow={s} />
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} geometry={KNIGHT.sode} material={dark} position={[x, 0.29, 0.01]} rotation={[0, 0, x > 0 ? -0.3 : 0.3]} castShadow={s} />
      ))}
      <mesh geometry={KNIGHT.arm} material={dark} position={[-0.1, 0.24, 0.03]} rotation={[0.3, 0, 0.2]} castShadow={s} />
      <mesh geometry={KNIGHT.arm} material={dark} position={[0.1, 0.24, 0.03]} rotation={[0.3, 0, -0.2]} castShadow={s} />
      {/* kabuto: a rounded bowl with wings flared back from the face, and a crescent crest */}
      <mesh geometry={KNIGHT.bowl} material={dark} position={[0, headY, 0]} castShadow={s} />
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={KNIGHT.wing} material={dark} position={[side * 0.08, headY - 0.02, -0.01]} rotation={[0, side * 0.75, 0]} castShadow={s} />
      ))}
      <mesh geometry={KNIGHT.crest} material={mat('#e8c35a', { metal: 0.4, rough: 0.4 })} position={[0, headY + 0.09, -0.01]} rotation={[Math.PI / 2, 0, Math.PI / 2]} />
      <mesh geometry={KNIGHT.face} material={trim} position={[0, headY - 0.05, 0.0755]} />
      <mesh geometry={KNIGHT.eyeSlit} material={dark} position={[0, headY - 0.03, 0.078]} />
      {/* the katana, sheathed and worn diagonally at the hip */}
      <group position={[0.12, 0.16, -0.04]} rotation={[0, 0, 0.9]}>
        <mesh geometry={KNIGHT.saya} material={mat('#26201c')} castShadow={s} />
        <mesh geometry={KNIGHT.tsuba} material={mat('#8a6139', { metal: 0.3, rough: 0.5 })} position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]} />
      </group>
    </>
  );
}

/** The robber: a bandit hiding under a wide straw hat. */
function Robber({ o, ghost }: { o: { opacity?: number }; ghost: boolean }) {
  return (
    <>
      <mesh geometry={PIECE_GEO.cloak} material={mat('#33302e', o)} position={[0, 0.19, 0]} castShadow={!ghost} />
      <mesh geometry={PIECE_GEO.head} material={mat('#3a352f', o)} position={[0, 0.42, 0]} castShadow={!ghost} />
      <mesh geometry={PIECE_GEO.hat} material={mat('#d8c27a', o)} position={[0, 0.485, 0]} castShadow={!ghost} />
    </>
  );
}

/** Little wooden boardwalk slats across the road, a paper lantern beside them and a stray petal or two. */
const ROAD_GEO = {
  slat: new THREE.BoxGeometry(0.05, 0.016, 0.15),
  lanternPost: new THREE.CylinderGeometry(0.009, 0.011, 0.055, 6),
  lanternBox: new THREE.BoxGeometry(0.04, 0.034, 0.04),
  lanternRoof: new THREE.ConeGeometry(0.032, 0.024, 4),
  petal: new THREE.BoxGeometry(0.028, 0.004, 0.017),
};

/** A wooden boardwalk over the road, a tiny paper lantern lighting one end, and fallen blossom petals. */
function Road({ ghost }: { ghost: boolean; c: PieceColors }) {
  const k = usePieceScale();
  if (ghost) return null;
  const top = 0.045 * (2 * k - 1);
  return (
    <group position={[0, top, 0]} scale={[1, 1, k]}>
      {[-0.2, 0, 0.2].map((x) => (
        <mesh key={x} geometry={ROAD_GEO.slat} material={mat('#8a6139')} position={[x, 0.008, 0]} />
      ))}
      {/* Clear of the boardwalk (half-width 0.065), so it reads as standing beside the road, not on it. */}
      <group position={[0.25, 0, 0.17]}>
        <mesh geometry={ROAD_GEO.lanternPost} material={mat('#9a968c')} position={[0, 0.028, 0]} />
        <mesh geometry={ROAD_GEO.lanternBox} material={mat('#f0b96a', { emissive: '#f0b96a', glow: 0.6 })} position={[0, 0.073, 0]} />
        <mesh geometry={ROAD_GEO.lanternRoof} material={mat('#7a766c')} position={[0, 0.101, 0]} rotation={[0, Math.PI / 4, 0]} />
      </group>
      <mesh geometry={ROAD_GEO.petal} material={mat('#eea1b8')} position={[-0.08, 0.018, -0.05]} rotation={[0, 0.6, 0]} />
      <mesh geometry={ROAD_GEO.petal} material={mat('#f4b6c8')} position={[0.05, 0.018, 0.04]} rotation={[0, -0.4, 0]} />
    </group>
  );
}

/** Sakura Isle: blossom groves, rice paddies and pagodas. */
export const sakura: ThemeKit = { props, Settlement, City, Robber, Road, BarbarianShip, Knight, CityWall };
