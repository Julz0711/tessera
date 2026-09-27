'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { Terrain } from '@/engine/types';
import { faceCamera } from '../faceCamera';
import { GEO, mat } from '../materials';
import { usePieceScale } from '../pieceScale';
import { classicProps } from '../terrain';
import { CORNERS, EDGE, TG, TILE_TOP, TOKEN_CLEAR, inFront, polar, seeded, spread, type Prop } from '../terrainKit';
import { gableRoof, roofMat } from './shared';
import type { KnightFigureProps, ModelProps, PieceColors, ThemeKit } from './types';

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

const SHIP_DANGER = '#c23a2a';

/** Hull length (half) and the width of its lens-shaped plan; bow towards +z. */
const HULL_L = 0.22;
const HULL_C = 0.15;
/** Half-width of the hull at `z` (the plan is a quadratic lens). */
const hullHalfWidth = (z: number) => (HULL_C / 2) * (1 - (z / HULL_L) ** 2);

function hullGeometry(): THREE.BufferGeometry {
  const plan = new THREE.Shape();
  plan.moveTo(0, -HULL_L);
  plan.quadraticCurveTo(HULL_C, 0, 0, HULL_L);
  plan.quadraticCurveTo(-HULL_C, 0, 0, -HULL_L);
  const g = new THREE.ExtrudeGeometry(plan, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.018, bevelSegments: 1, curveSegments: 10 });
  // The plan's y becomes the length (z) and the extrusion runs downwards from the gunwale.
  g.rotateX(Math.PI / 2);
  g.translate(0, 0.1, 0);
  return g;
}

const tube = (points: [number, number, number][], radius: number) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))), 14, radius, 5);

const SHIP = {
  hull: hullGeometry(),
  // the stem rises from the bow and ends in the dragon's head; the stern post curls back over itself
  stem: tube([[0, 0.08, 0.2], [0, 0.14, 0.26], [0, 0.24, 0.28], [0, 0.31, 0.26]], 0.014),
  stern: tube([[0, 0.08, -0.2], [0, 0.15, -0.255], [0, 0.23, -0.25], [0, 0.26, -0.205], [0, 0.225, -0.18]], 0.013),
  head: new THREE.BoxGeometry(0.036, 0.04, 0.05),
  snout: new THREE.ConeGeometry(0.018, 0.05, 5).rotateX(Math.PI / 2),
  horn: new THREE.ConeGeometry(0.008, 0.035, 4),
  eye: new THREE.SphereGeometry(0.006, 5, 4),
  mast: new THREE.CylinderGeometry(0.009, 0.011, 0.3, 6),
  yard: new THREE.CylinderGeometry(0.007, 0.007, 0.26, 5).rotateZ(Math.PI / 2),
  sail: new THREE.BoxGeometry(0.23, 0.17, 0.008),
  stripe: new THREE.BoxGeometry(0.04, 0.17, 0.01),
  shield: new THREE.CylinderGeometry(0.026, 0.026, 0.008, 10).rotateZ(Math.PI / 2),
  oar: new THREE.CylinderGeometry(0.004, 0.004, 0.17, 4),
};
const SHIELD_Z = [-0.12, -0.04, 0.04, 0.12];
const OAR_Z = [-0.08, 0, 0.08];

/**
 * The barbarian ship as a Nordic drakkar: a dark, lens-shaped hull, a dragon's head on the rising
 * stem and a curled stern post, a row of shields on each gunwale, oars, and a dark striped sail.
 */
function BarbarianShip({ danger }: { danger: boolean }) {
  const hull = mat(danger ? SHIP_DANGER : '#4a3522', danger ? { emissive: SHIP_DANGER, glow: 0.35 } : {});
  const trim = mat(danger ? '#5a2a24' : '#2e2116');
  const sail = mat(danger ? '#5a2320' : '#26323c');
  const stripe = mat('#e8e2d2');
  const shields = [mat(danger ? '#8a1f14' : '#b5342a'), mat('#e8e2d2')];
  return (
    <group>
      <mesh geometry={SHIP.hull} material={hull} castShadow />
      <mesh geometry={SHIP.stem} material={trim} castShadow />
      <mesh geometry={SHIP.stern} material={trim} castShadow />
      {/* the dragon: head, snout forward, two horns and glowing eyes */}
      <group position={[0, 0.315, 0.26]}>
        <mesh geometry={SHIP.head} material={trim} />
        <mesh geometry={SHIP.snout} material={trim} position={[0, -0.004, 0.045]} />
        {[-0.012, 0.012].map((x) => (
          <mesh key={x} geometry={SHIP.horn} material={trim} position={[x, 0.03, -0.012]} rotation={[-0.5, 0, 0]} />
        ))}
        {[-0.019, 0.019].map((x) => (
          <mesh key={x} geometry={SHIP.eye} material={mat('#ffcf5a', { emissive: '#ffb020', glow: 0.8 })} position={[x, 0.006, 0.014]} />
        ))}
      </group>
      <mesh geometry={SHIP.mast} material={trim} position={[0, 0.25, 0]} />
      <mesh geometry={SHIP.yard} material={trim} position={[0, 0.37, 0]} />
      <mesh geometry={SHIP.sail} material={sail} position={[0, 0.28, 0.005]} castShadow />
      {[-0.07, 0, 0.07].map((x) => (
        <mesh key={x} geometry={SHIP.stripe} material={stripe} position={[x, 0.28, 0.006]} />
      ))}
      {SHIELD_Z.map((z, i) =>
        [-1, 1].map((side) => (
          <mesh
            key={`${z}${side}`}
            geometry={SHIP.shield}
            material={shields[(i + (side > 0 ? 1 : 0)) % 2]}
            position={[side * (hullHalfWidth(z) + 0.006), 0.09, z]}
          />
        )),
      )}
      {OAR_Z.map((z) =>
        [-1, 1].map((side) => (
          <mesh
            key={`o${z}${side}`}
            geometry={SHIP.oar}
            material={trim}
            position={[side * (hullHalfWidth(z) + 0.07), 0.04, z]}
            rotation={[0, 0, side * 1.05]}
          />
        )),
      )}
    </group>
  );
}

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

/** A viking raider: a spectacled, horned helmet, mail, a round shield and a long-hafted axe. */
const KNIGHT = {
  leg: new THREE.BoxGeometry(0.055, 0.15, 0.065),
  torso: new THREE.CylinderGeometry(0.075, 0.09, 0.17, 6),
  tunic: new THREE.BoxGeometry(0.1, 0.08, 0.021),
  cape: new THREE.BoxGeometry(0.16, 0.22, 0.02),
  arm: new THREE.BoxGeometry(0.045, 0.13, 0.045),
  dome: new THREE.SphereGeometry(0.078, 9, 6, 0, Math.PI * 2, 0, Math.PI / 1.9),
  horn: new THREE.ConeGeometry(0.017, 0.1, 6),
  brow: new THREE.BoxGeometry(0.09, 0.014, 0.012),
  face: new THREE.CircleGeometry(0.046, 16),
  shield: new THREE.CylinderGeometry(0.09, 0.09, 0.02, 14),
  boss: new THREE.IcosahedronGeometry(0.024, 0),
  cross: new THREE.BoxGeometry(0.16, 0.014, 0.006),
  haft: new THREE.CylinderGeometry(0.011, 0.011, 0.34, 6),
  axeHead: new THREE.ConeGeometry(0.055, 0.09, 3),
};

function Knight({ metal, trim, cloth, dark, faceMat, faceGeo, shadows, headY }: KnightFigureProps) {
  const s = shadows;
  return (
    <>
      <mesh geometry={KNIGHT.leg} material={trim} position={[-0.035, 0.075, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.leg} material={trim} position={[0.035, 0.075, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.torso} material={metal} position={[0, 0.235, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.tunic} material={cloth} position={[0, 0.16, 0.078]} />
      <mesh geometry={KNIGHT.cape} material={dark} position={[0, 0.22, -0.08]} rotation={[0.15, 0, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.arm} material={metal} position={[-0.11, 0.25, 0.01]} rotation={[0, 0, 0.25]} castShadow={s} />
      <mesh geometry={KNIGHT.arm} material={metal} position={[0.11, 0.25, 0.02]} rotation={[0.5, 0, -0.2]} castShadow={s} />
      {/* the dome, spectacle brow bars over the eyes, and a horn curving out from each side */}
      <mesh geometry={KNIGHT.dome} material={metal} position={[0, headY, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.brow} material={trim} position={[0, headY - 0.008, 0.073]} />
      {/* horns splayed mostly horizontal so they read clearly from the game's top-down camera */}
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={KNIGHT.horn} material={mat('#e8dfc8', { rough: 0.6 })} position={[side * 0.08, headY + 0.005, -0.005]} rotation={[0.1, 0, side * 1.3]} />
      ))}
      {faceMat ? (
        <mesh geometry={faceGeo ?? KNIGHT.face} material={faceMat} position={[0, headY - 0.05, 0.0755]} />
      ) : (
        <mesh geometry={KNIGHT.face} material={trim} position={[0, headY - 0.05, 0.0755]} />
      )}
      {/* round shield on the left arm, a cross of planks over the boss */}
      <group position={[-0.15, 0.24, 0.05]} rotation={[Math.PI / 2, 0, 0.35]}>
        <mesh geometry={KNIGHT.shield} material={cloth} castShadow={s} />
        <mesh geometry={KNIGHT.cross} material={dark} position={[0, 0, 0.012]} />
        <mesh geometry={KNIGHT.cross} material={dark} position={[0, 0, 0.012]} rotation={[0, 0, Math.PI / 2]} />
        <mesh geometry={KNIGHT.boss} material={trim} position={[0, 0, 0.015]} />
      </group>
      {/* a long-hafted axe, head forward */}
      <group position={[0.14, 0.22, 0.06]} rotation={[0, 0, -0.1]}>
        <mesh geometry={KNIGHT.haft} material={mat('#6b4a2a')} castShadow={s} />
        <mesh geometry={KNIGHT.axeHead} material={trim} position={[0.045, 0.13, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[1, 0.5, 1]} castShadow={s} />
      </group>
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

/** Split logs laid crosswise (corduroy road) and a small standing runestone beside them. */
const ROAD_GEO = {
  log: new THREE.CylinderGeometry(0.026, 0.03, 0.16, 6).rotateX(Math.PI / 2),
  runeStone: new THREE.BoxGeometry(0.02, 0.08, 0.04),
};

/** Split-log corduroy planks across the road, with a tiny runestone standing just beside it. */
function Road({ ghost }: { ghost: boolean; c: PieceColors }) {
  const k = usePieceScale();
  if (ghost) return null;
  const top = 0.045 * (2 * k - 1);
  return (
    <group position={[0, top, 0]} scale={[1, 1, k]}>
      {[-0.24, -0.12, 0, 0.12, 0.24].map((x) => (
        <mesh key={x} geometry={ROAD_GEO.log} material={mat('#6b4a2a')} position={[x, 0.026, 0]} />
      ))}
      <mesh geometry={ROAD_GEO.runeStone} material={mat('#8b939b')} position={[0.26, 0.04, 0.11]} rotation={[0, 0.3, 0.05]} />
    </group>
  );
}

/** Nordic Fjords: spruce, heather and longhouses. */
export const nordic: ThemeKit = { props, Settlement, City, Robber, Harbor, Road, BarbarianShip, Knight };
