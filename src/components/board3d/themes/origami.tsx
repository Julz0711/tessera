'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { Terrain } from '@/engine/types';
import { mat } from '../materials';
import { usePieceScale } from '../pieceScale';
import { CORNERS, EDGE, TILE_TOP, TOKEN_CLEAR, inFront, polar, seeded, spread, type Prop } from '../terrainKit';
import { useBoardPalette } from './index';
import { gableRoof, roofMat } from './shared';
import type { KnightFigureProps, ModelProps, PieceColors, ThemeKit } from './types';

/**
 * Origami: the island folded from paper. Few, crisp facets and soft even light (the palette) make
 * every shape read as a fold; the models are the classics: pyramid trees, accordion fields, a
 * pinwheel, a crane, a fox and paper boats on a pleated paper sea.
 */
const y = TILE_TOP;

type Tri = [number, number, number][];

/**
 * A folded shape from flat triangles. Paper has two sides, so every triangle is added twice, once
 * each way round: it shows from both sides with ordinary materials.
 */
function paper(tris: Tri[]): THREE.BufferGeometry {
  const positions: number[] = [];
  for (const [a, b, c] of tris) positions.push(...a, ...b, ...c, ...a, ...c, ...b);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

/**
 * The crane, beak towards +x: a diamond body, a neck and a tail rising to points, a head folded
 * down and two wings spread wide.
 */
const CRANE = (() => {
  const F: [number, number, number] = [0.07, 0.06, 0];
  const K: [number, number, number] = [-0.07, 0.06, 0];
  const T: [number, number, number] = [0, 0.1, 0];
  const D: [number, number, number] = [0, 0, 0];
  const L: [number, number, number] = [0, 0.06, 0.03];
  const R: [number, number, number] = [0, 0.06, -0.03];
  const neckTip: [number, number, number] = [0.2, 0.22, 0];
  const tailTip: [number, number, number] = [-0.21, 0.2, 0];
  const beak: [number, number, number] = [0.25, 0.18, 0];
  const wing = (s: number): Tri[] => [
    [[0.06, 0.09, 0.01 * s], [-0.06, 0.09, 0.01 * s], [0.0, 0.16, 0.26 * s]],
    [[0.06, 0.09, 0.01 * s], [0.0, 0.16, 0.26 * s], [0.03, 0.12, 0.2 * s]],
  ];
  return paper([
    [F, T, L],
    [F, L, D],
    [F, D, R],
    [F, R, T],
    [K, L, T],
    [K, D, L],
    [K, R, D],
    [K, T, R],
    [[0.04, 0.07, 0.01], [0.06, 0.05, 0], neckTip],
    [[0.04, 0.07, -0.01], [0.06, 0.05, 0], neckTip],
    [[0.19, 0.225, 0.006], [0.19, 0.225, -0.006], beak],
    [[-0.04, 0.07, 0.01], [-0.06, 0.05, 0], tailTip],
    [[-0.04, 0.07, -0.01], [-0.06, 0.05, 0], tailTip],
    ...wing(1),
    ...wing(-1),
  ]);
})();

/** One blade of a pinwheel, facing +z; four of them turned a quarter each make the wheel. */
const BLADE = paper([
  [
    [0, 0, 0],
    [0.075, 0, 0],
    [0.075, 0.075, 0.018],
  ],
]);

/** Origami's own low-poly geometries (shared, module-scoped like terrainKit's TG). */
const G = {
  // forest: square-based pyramid trees in two tiers on a paper-tube trunk
  tree: new THREE.ConeGeometry(0.12, 0.24, 4),
  treeTop: new THREE.ConeGeometry(0.085, 0.18, 4),
  tube: new THREE.CylinderGeometry(0.018, 0.018, 0.1, 5),
  // hills: folded ridges (triangular prisms lying down, ridge up) and paper bricks
  ridge: new THREE.CylinderGeometry(0.07, 0.07, 0.26, 3).rotateX(-Math.PI / 2),
  // pasture: faceted paper sheep and a pinwheel on its stick
  sheep: new THREE.OctahedronGeometry(0.075, 0),
  sheepHead: new THREE.TetrahedronGeometry(0.038, 0),
  blade: new THREE.ConeGeometry(0.028, 0.08, 3),
  stick: new THREE.CylinderGeometry(0.005, 0.005, 0.26, 4),
  // fields: accordion folds (one slope each way)
  foldUp: new THREE.BoxGeometry(0.3, 0.003, 0.06).rotateX(-0.9),
  foldDown: new THREE.BoxGeometry(0.3, 0.003, 0.06).rotateX(0.9),
  // mountains: sharp three-sided paper peaks with white caps
  peak: new THREE.ConeGeometry(0.2, 0.42, 3),
  cap: new THREE.ConeGeometry(0.074, 0.155, 3),
  pebble: new THREE.TetrahedronGeometry(0.05, 0),
  // desert: low folded dunes
  dune: new THREE.ConeGeometry(0.2, 0.07, 4),
};

const PINWHEEL = ['#f28aa6', '#f0cf6a', '#6fb3dc', '#8fd08a'];

/** Origami's own props per terrain; gold (and anything unlisted) keeps the classic look. */
function props(terrain: Terrain, seed: number): Prop[] | null {
  const rand = seeded(seed * 7919 + terrain.length * 31 + 809);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const out: Prop[] = [];

  switch (terrain) {
    case 'forest': {
      // Pyramid trees folded in two tiers, each on a rolled paper trunk.
      const greens = ['#4f9160', '#5a9a6a', '#468657'];
      const trees = [...spread(rand, 7, TOKEN_CLEAR + 0.06, 0.56, { avoidFront: true }), ...spread(rand, 9, 0.6, EDGE - 0.08)];
      trees.forEach(([x, z, a]) => {
        const s = (inFront(a) ? 0.62 : 0.8) + rand() * 0.22;
        const turn = rand() * 3;
        out.push({ geo: G.tube, color: '#c9a27a', p: [x, y + 0.05 * s, z], s });
        out.push({ geo: G.tree, color: pick(greens), p: [x, y + 0.19 * s, z], s, r: [0, turn, 0] });
        out.push({ geo: G.treeTop, color: pick(greens), p: [x, y + 0.32 * s, z], s, r: [0, turn, 0] });
      });
      break;
    }
    case 'hills': {
      // Ridges folded out of terracotta paper, and a stack of little paper bricks.
      const ridges = [CORNERS[3], CORNERS[4], CORNERS[5]].sort(() => rand() - 0.5).slice(0, 2);
      for (const a of ridges) {
        const [x, z] = polar(a, 0.6);
        out.push({ geo: G.ridge, color: pick(['#d9825a', '#c9744d']), p: [x, y + 0.035, z], r: [0, -a, 0], s: [1, 1 + rand() * 0.3, 1] });
      }
      const sa = pick([CORNERS[0], CORNERS[1], CORNERS[2]]);
      const [sx, sz] = polar(sa, 0.6);
      for (let layer = 0; layer < 3; layer++) {
        for (let i = 0; i < 2; i++) {
          out.push({ geo: 'brick', color: layer % 2 ? '#c26a44' : '#e0906a', p: [sx + (i - 0.5) * 0.075, y + 0.017 + layer * 0.034, sz], r: [0, -sa + Math.PI / 2, 0] });
        }
      }
      for (const [x, z] of spread(rand, 3, 0.5, EDGE - 0.1)) out.push({ geo: G.pebble, color: '#b86a48', p: [x, y + 0.02, z], r: [rand(), rand() * 3, 0] });
      break;
    }
    case 'pasture': {
      // Faceted paper sheep, spiky paper grass and a pinwheel turned to the camera.
      for (const [x, z] of spread(rand, 10, TOKEN_CLEAR + 0.04, EDGE - 0.04)) {
        out.push({ geo: G.blade, color: rand() > 0.5 ? '#9fcf74' : '#88b060', p: [x, y + 0.04, z], r: [0, rand() * 3, 0] });
      }
      for (const [x, z] of spread(rand, 3, 0.5, 0.64)) {
        const a = rand() * Math.PI * 2;
        out.push({ geo: G.sheep, color: '#fbf8f0', p: [x, y + 0.065, z], s: [1.35, 0.9, 1], r: [0, a, 0] });
        out.push({ geo: G.sheepHead, color: '#4a4550', p: [x + Math.cos(a) * 0.1, y + 0.08, z - Math.sin(a) * 0.1], r: [0, a, 0] });
      }
      const [wx, wz] = polar(pick([CORNERS[3], CORNERS[4], CORNERS[5]]), 0.62);
      out.push({ geo: G.stick, color: '#c9a27a', p: [wx, y + 0.13, wz] });
      PINWHEEL.forEach((color, k) => out.push({ geo: BLADE, color, p: [wx, y + 0.26, wz + 0.01], r: [0, 0, (k * Math.PI) / 2] }));
      break;
    }
    case 'fields': {
      // Three plots of yellow paper folded like an accordion: rows of wheat in pleats.
      const offset = rand() * Math.PI * 2;
      for (let k = 0; k < 3; k++) {
        const a = offset + (k * Math.PI * 2) / 3;
        const [px, pz] = polar(a, 0.6);
        const rot = -a + Math.PI / 2;
        for (let i = 0; i < 6; i++) {
          const [dx, dz] = polar(a, (i - 2.5) * 0.037);
          out.push({ geo: i % 2 ? G.foldDown : G.foldUp, color: i % 2 ? '#e3bd55' : '#f5d77a', p: [px + dx, y + 0.026, pz + dz], r: [0, rot, 0] });
        }
      }
      break;
    }
    case 'mountains': {
      // Sharp three-sided peaks folded from grey paper, their tips in white.
      const peaks = [CORNERS[3], CORNERS[4], CORNERS[5]].sort(() => rand() - 0.5).slice(0, 3);
      peaks.forEach((a, i) => {
        const [x, z] = polar(a, 0.6);
        const s = (i === 2 ? 0.7 : 0.85) + rand() * 0.2;
        const turn = rand() * 3;
        out.push({ geo: G.peak, color: pick(['#a3a9b8', '#959bab', '#aeb4c2']), p: [x, y + 0.21 * s, z], s, r: [0, turn, 0] });
        out.push({ geo: G.cap, color: '#fbfcff', p: [x, y + (0.42 - 0.0775) * s, z], s: s * 1.03, r: [0, turn, 0] });
      });
      for (const [x, z] of spread(rand, 3, 0.5, EDGE - 0.08)) out.push({ geo: G.pebble, color: '#8f95a5', p: [x, y + 0.02, z], r: [rand(), rand() * 3, 0] });
      break;
    }
    case 'desert': {
      // A big paper crane at the back (the robber stands in front of the centre), and folded dunes.
      out.push({ geo: CRANE, color: '#e8604a', p: [0.02, y, -0.36], s: 1.25, r: [0, 0.35, 0] });
      for (const [x, z] of spread(rand, 4, 0.45, 0.66)) out.push({ geo: G.dune, color: pick(['#ecdcb8', '#e0cfa6']), p: [x, y + 0.035, z], r: [0, rand() * 3, 0] });
      break;
    }
    default:
      // Gold looks the same in every theme.
      return null;
  }
  return out;
}

/**
 * The folded paper boat, bow towards +x: two sloping sides (a trapezoid each, wide at the top) and
 * the tall triangle folded up between them.
 */
const BOAT = paper([
  ...[1, -1].flatMap((s): Tri[] => [
    [[-0.12, 0.06, 0.035 * s], [0.12, 0.06, 0.035 * s], [0.07, 0, 0]],
    [[-0.12, 0.06, 0.035 * s], [0.07, 0, 0], [-0.07, 0, 0]],
  ]),
  [[-0.07, 0.04, 0], [0.07, 0.04, 0], [0, 0.17, 0]],
]);

/** A folded paper boat. */
function PaperBoat({ color = '#ffffff' }: { color?: string }) {
  return <mesh geometry={BOAT} material={mat(color)} castShadow />;
}

const FLEET = [
  { a: 0.4, r: 1.6, turn: 0.6, color: '#ffffff' },
  { a: 1.9, r: 2.6, turn: -0.4, color: '#f7e2a0' },
  { a: 3.1, r: 1.9, turn: 1.4, color: '#ffffff' },
  { a: 4.2, r: 3.2, turn: 0.2, color: '#f28aa6' },
  { a: 5.4, r: 2.2, turn: -1.1, color: '#ffffff' },
];

/** The sea: a sheet of blue paper folded into sharp pleats (they never move), with paper boats afloat. */
function Sea({ shelfRadius }: { shelfRadius: number }) {
  const sea = useBoardPalette().sea;
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(60, 60, 4, 150);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    // Every row of vertices is a fold, alternately a ridge and a valley.
    for (let i = 0; i < pos.count; i++) pos.setY(i, Math.floor(i / 5) % 2 ? 0.05 : -0.05);
    g.computeVertexNormals();
    return g;
  }, []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: sea.shallow, flatShading: true, roughness: 1 }), [sea.shallow]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => geo.dispose(), [geo]);
  const out = shelfRadius - 2;
  return (
    <group>
      <mesh geometry={geo} material={material} position={[0, -0.08, 0]} receiveShadow />
      {FLEET.map((b, i) => (
        <group key={i} position={[Math.cos(b.a) * (out + b.r), -0.02, Math.sin(b.a) * (out + b.r)]} rotation={[0, b.turn, 0]} scale={1.6}>
          <PaperBoat color={b.color} />
        </group>
      ))}
    </group>
  );
}

const HOUSE = {
  body: new THREE.BoxGeometry(0.24, 0.16, 0.22),
  roof: gableRoof(0.3, 0.27, 0.14),
  door: new THREE.BoxGeometry(0.05, 0.08, 0.006),
  window: new THREE.BoxGeometry(0.04, 0.04, 0.006),
};

/** A paper house: a folded body in the owner's colour under a folded roof, a white door and window. */
function Settlement({ c, o, ghost }: ModelProps) {
  return (
    <>
      <mesh geometry={HOUSE.body} material={mat(c.hex, o)} position={[0, 0.08, 0]} castShadow={!ghost} />
      <mesh geometry={HOUSE.roof} material={roofMat(c.dark, o)} position={[0, 0.16, 0]} castShadow={!ghost} />
      <mesh geometry={HOUSE.door} material={mat('#ffffff', o)} position={[-0.05, 0.045, 0.112]} />
      <mesh geometry={HOUSE.window} material={mat('#ffffff', o)} position={[0.055, 0.09, 0.112]} />
    </>
  );
}

const CASTLE = {
  hall: new THREE.BoxGeometry(0.22, 0.16, 0.2),
  hallRoof: gableRoof(0.26, 0.24, 0.12),
  tower: new THREE.BoxGeometry(0.12, 0.3, 0.12),
  towerRoof: new THREE.ConeGeometry(0.1, 0.16, 4).rotateY(Math.PI / 4),
  pole: new THREE.CylinderGeometry(0.004, 0.004, 0.1, 4),
  pennant: paper([
    [
      [0, 0, 0],
      [0, 0.045, 0],
      [0.07, 0.022, 0],
    ],
  ]),
};

/** A paper castle: a hall and two folded towers, a pennant flying from the taller one. */
function City({ c, o, ghost }: ModelProps) {
  return (
    <>
      <mesh geometry={CASTLE.hall} material={mat(c.hex, o)} position={[0.02, 0.08, 0.02]} castShadow={!ghost} />
      <mesh geometry={CASTLE.hallRoof} material={roofMat(c.dark, o)} position={[0.02, 0.16, 0.02]} castShadow={!ghost} />
      <mesh geometry={CASTLE.tower} material={mat(c.hex, o)} position={[-0.14, 0.15, -0.03]} castShadow={!ghost} />
      <mesh geometry={CASTLE.towerRoof} material={mat(c.dark, o)} position={[-0.14, 0.38, -0.03]} castShadow={!ghost} />
      <mesh geometry={CASTLE.tower} material={mat(c.hex, o)} position={[0.17, 0.11, -0.05]} scale={[0.8, 0.75, 0.8]} castShadow={!ghost} />
      <mesh geometry={CASTLE.towerRoof} material={mat(c.dark, o)} position={[0.17, 0.28, -0.05]} scale={0.8} castShadow={!ghost} />
      <mesh geometry={CASTLE.pole} material={mat('#8a8070', o)} position={[-0.14, 0.5, -0.03]} />
      <mesh geometry={CASTLE.pennant} material={mat('#ffffff', o)} position={[-0.14, 0.505, -0.03]} />
    </>
  );
}

/** City wall (C&K): a fence of paper panels folded zigzag around the city, a pennant at the gate. */
const WALL = {
  panel: new THREE.BoxGeometry(0.1, 0.16, 0.006),
  pole: new THREE.CylinderGeometry(0.004, 0.004, 0.22, 4),
};
const PANEL_COUNT = 12;

/** The city wall: paper panels pleated zigzag around the city, a pennant in the owner's colour at the gate. */
function CityWall({ c }: { c: PieceColors }) {
  return (
    <group>
      {Array.from({ length: PANEL_COUNT }, (_, i) => {
        const a = (i / PANEL_COUNT) * Math.PI * 2;
        const fold = i % 2 ? 0.5 : -0.5;
        return (
          <mesh
            key={i}
            geometry={WALL.panel}
            material={mat(i % 2 ? '#f5f1e4' : '#e8e2d2')}
            position={[Math.sin(a) * 0.33, 0.08, Math.cos(a) * 0.33]}
            rotation={[0, a + fold, 0]}
            castShadow
          />
        );
      })}
      <mesh geometry={WALL.pole} material={mat('#8a8070')} position={[0, 0.11, 0.33]} />
      <mesh geometry={CASTLE.pennant} material={mat(c.hex)} position={[0, 0.19, 0.33]} />
    </group>
  );
}

const FOX = {
  body: new THREE.ConeGeometry(0.12, 0.3, 3),
  head: new THREE.ConeGeometry(0.075, 0.17, 3),
  ear: new THREE.ConeGeometry(0.03, 0.07, 3),
  tail: new THREE.ConeGeometry(0.05, 0.22, 3),
  tip: new THREE.ConeGeometry(0.03, 0.06, 3),
};

/** The robber: a fox folded from black paper, snout down, tail out behind. */
function Robber({ o, ghost }: { o: { opacity?: number }; ghost: boolean }) {
  const ink = mat('#3a3942', o);
  return (
    <>
      <mesh geometry={FOX.body} material={ink} position={[0, 0.15, 0]} castShadow={!ghost} />
      <mesh geometry={FOX.tail} material={ink} position={[0.1, 0.1, -0.1]} rotation={[-0.6, 0, -1]} castShadow={!ghost} />
      <mesh geometry={FOX.tip} material={mat('#fbf8f0', o)} position={[0.19, 0.16, -0.17]} rotation={[-0.6, 0, -1]} />
      {/* Lowered onto the body's tapering top so the snout tucks in rather than hovering above it. */}
      <mesh geometry={FOX.head} material={ink} position={[0, 0.27, 0.04]} rotation={[Math.PI - 0.5, 0, 0]} castShadow={!ghost} />
      {[-0.045, 0.045].map((x) => (
        <mesh key={x} geometry={FOX.ear} material={ink} position={[x, 0.37, -0.01]} rotation={[-0.2, 0, x > 0 ? -0.3 : 0.3]} castShadow={!ghost} />
      ))}
    </>
  );
}

/** A folded paper knight: a faceted body of cones and prisms, a triangular blade and shield. */
const KNIGHT = {
  leg: new THREE.TetrahedronGeometry(0.05, 0),
  torso: new THREE.ConeGeometry(0.11, 0.2, 4),
  arm: new THREE.ConeGeometry(0.028, 0.13, 4),
  head: new THREE.OctahedronGeometry(0.072, 0),
  crest: new THREE.ConeGeometry(0.05, 0.1, 4),
  face: new THREE.CircleGeometry(0.044, 6),
  hilt: new THREE.CylinderGeometry(0.007, 0.007, 0.05, 4),
};
const KNIGHT_BLADE = paper([[
  [0, -0.02, 0],
  [0, 0.22, 0],
  [0.03, 0.1, 0],
]]);
const KNIGHT_SHIELD = paper([[
  [-0.07, 0.075, 0],
  [0.07, 0.075, 0],
  [0, -0.075, 0],
]]);

function Knight({ cloth, dark, faceMat, faceGeo, shadows, headY }: KnightFigureProps) {
  const s = shadows;
  return (
    <>
      <mesh geometry={KNIGHT.leg} material={dark} position={[-0.035, 0.05, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.leg} material={dark} position={[0.035, 0.05, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.torso} material={cloth} position={[0, 0.19, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.arm} material={cloth} position={[-0.13, 0.23, 0]} rotation={[0, 0, 1.3]} castShadow={s} />
      <mesh geometry={KNIGHT.arm} material={cloth} position={[0.13, 0.2, 0]} rotation={[0, 0, -1.5]} castShadow={s} />
      {/* a faceted head under a folded, pointed crest */}
      <mesh geometry={KNIGHT.head} material={dark} position={[0, headY, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.crest} material={dark} position={[0, headY + 0.1, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={s} />
      {faceMat ? (
        <mesh geometry={faceGeo ?? KNIGHT.face} material={faceMat} position={[0, headY - 0.05, 0.0755]} />
      ) : (
        <mesh geometry={KNIGHT.face} material={mat('#fbf8f0')} position={[0, headY - 0.05, 0.0755]} />
      )}
      {/* a folded paper blade and a triangular shield, both flat and double-sided */}
      <group position={[-0.14, 0.24, 0.03]} rotation={[0, 0.5, 0]}>
        <mesh geometry={KNIGHT_SHIELD} material={cloth} castShadow={s} />
      </group>
      <group position={[0.14, 0.16, 0.05]}>
        <mesh geometry={KNIGHT.hilt} material={dark} position={[0, -0.02, 0]} />
        <mesh geometry={KNIGHT_BLADE} material={mat('#e8e2d2')} castShadow={s} />
      </group>
    </>
  );
}

const CREASE = new THREE.BoxGeometry(0.56, 0.004, 0.008);

/** A strip of paper: the road, with a white crease folded down its middle. */
function Road({ ghost }: { ghost: boolean; c: PieceColors }) {
  const k = usePieceScale();
  if (ghost) return null;
  return <mesh geometry={CREASE} material={mat('#ffffff', { opacity: 0.8 })} position={[0, 0.045 * (2 * k - 1) + 0.002, 0]} />;
}

/** A paper boat moored beside the pier (clear of the floating rate sign). */
function Harbor({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, -0.09, z]} rotation={[0, rot, 0]}>
      <group position={[0.42, 0, 0.05]} scale={1.3}>
        <PaperBoat />
      </group>
    </group>
  );
}

/** The barbarian ship as a folded black paper boat, flying a small red paper flag. */
function BarbarianShip({ danger }: { danger: boolean }) {
  return (
    <group rotation={[0, Math.PI / 2, 0]} scale={2.2}>
      <PaperBoat color={danger ? '#8a1f14' : '#2a2a2e'} />
      <mesh geometry={CASTLE.pole} material={mat('#1f1a14')} position={[0, 0.15, 0]} scale={[1, 0.55, 1]} />
      <mesh geometry={CASTLE.pennant} material={mat(danger ? '#ffdede' : '#e0503a')} position={[0, 0.19, 0]} />
    </group>
  );
}

/** Origami: pyramid trees, accordion fields, a crane and a fox, all folded from paper. */
export const origami: ThemeKit = { props, Settlement, City, Robber, Road, Harbor, Sea, BarbarianShip, Knight, CityWall };
