'use client';

import * as THREE from 'three';
import type { Terrain } from '@/engine/types';
import { mat } from '../materials';
import { usePieceScale } from '../pieceScale';
import { CORNERS, EDGE, TILE_TOP, TOKEN_CLEAR, inFront, polar, seeded, spread, type Prop } from '../terrainKit';
import type { ModelProps, PieceColors, ThemeKit } from './types';

const y = TILE_TOP;

/** The Nile's own low-poly geometries (shared, module-scoped like terrainKit's TG). */
const G = {
  // forest: date palms (a slim trunk, drooping fronds and a cluster of dates)
  palmTrunk: new THREE.CylinderGeometry(0.014, 0.022, 0.24, 5),
  frond: new THREE.BoxGeometry(0.15, 0.008, 0.04),
  dates: new THREE.IcosahedronGeometry(0.02, 0),
  // hills: clay jars
  jar: new THREE.SphereGeometry(0.035, 7, 5),
  jarNeck: new THREE.CylinderGeometry(0.014, 0.02, 0.025, 7),
  // pasture: the shaduf (a water lever) by a little channel
  shadufPost: new THREE.CylinderGeometry(0.012, 0.014, 0.2, 5),
  shadufBeam: new THREE.BoxGeometry(0.3, 0.012, 0.012),
  bucket: new THREE.CylinderGeometry(0.02, 0.016, 0.03, 6),
  channel: new THREE.BoxGeometry(0.26, 0.012, 0.04),
  // fields: an irrigation canal along the outside of each plot
  canal: new THREE.BoxGeometry(0.32, 0.012, 0.04),
  // mountains: granite cliffs, cut blocks and an unfinished obelisk left lying in the quarry
  cliff: new THREE.CylinderGeometry(0.12, 0.18, 0.24, 5),
  block: new THREE.BoxGeometry(0.06, 0.045, 0.06),
  obelisk: new THREE.CylinderGeometry(0.02, 0.034, 0.3, 4),
  // desert: pyramids (a face turned to the camera) and a small sphinx
  pyramid: new THREE.ConeGeometry(0.3, 0.34, 4).rotateY(Math.PI / 4),
  sphinxBody: new THREE.BoxGeometry(0.05, 0.035, 0.12),
  sphinxHead: new THREE.BoxGeometry(0.038, 0.05, 0.04),
};

/** A date palm at (x, z), `s` times its full size. */
function palm(out: Prop[], rand: () => number, x: number, z: number, s: number): void {
  const lean = (rand() - 0.5) * 0.25;
  out.push({ geo: G.palmTrunk, color: '#7a5a3a', p: [x, y + 0.12 * s, z], s, r: [0, 0, lean] });
  const top = y + 0.24 * s;
  const tx = x - Math.sin(lean) * 0.12 * s;
  const turn = rand() * Math.PI * 2;
  for (let k = 0; k < 5; k++) {
    const a = turn + (k * Math.PI * 2) / 5;
    out.push({ geo: G.frond, color: k % 2 ? '#5f8f3c' : '#6a9a44', p: [tx + Math.cos(a) * 0.065 * s, top - 0.02 * s, z - Math.sin(a) * 0.065 * s], s, r: [0, a, -0.45] });
  }
  out.push({ geo: G.dates, color: '#8a4a22', p: [tx, top - 0.025 * s, z], s });
}

/** The Nile's own props per terrain; gold (and anything unlisted) keeps the classic look. */
function props(terrain: Terrain, seed: number): Prop[] | null {
  const rand = seeded(seed * 7919 + terrain.length * 31 + 409);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const out: Prop[] = [];

  switch (terrain) {
    case 'forest': {
      // An oasis of date palms.
      const trees = [...spread(rand, 5, TOKEN_CLEAR + 0.08, 0.56, { avoidFront: true }), ...spread(rand, 6, 0.62, EDGE - 0.1)];
      for (const [x, z, a] of trees) palm(out, rand, x, z, (inFront(a) ? 0.7 : 0.9) + rand() * 0.2);
      for (const [x, z] of spread(rand, 4, 0.5, EDGE - 0.06)) out.push({ geo: 'tuft', color: '#6a9a44', p: [x, y + 0.045, z] });
      break;
    }
    case 'hills': {
      // A mudbrick yard: rows of bricks drying in the sun, clay jars and a heap of Nile mud.
      const corners = rand() > 0.5 ? [0, 2, 4] : [1, 3, 5];
      const [b1, b2, ja] = corners.map((k) => CORNERS[k]);
      for (const ba of [b1, b2]) {
        const [bx, bz] = polar(ba, 0.6);
        for (let row = 0; row < 2; row++) {
          for (let i = 0; i < 3; i++) {
            const [dx, dz] = polar(ba, (row - 0.5) * 0.07);
            const [ex, ez] = polar(ba + Math.PI / 2, (i - 1) * 0.085);
            out.push({ geo: 'brick', color: (row + i) % 2 ? '#c98a5a' : '#b8764a', p: [bx + dx + ex, y + 0.017, bz + dz + ez], r: [0, -ba + Math.PI / 2, 0] });
          }
        }
      }
      const [jx, jz] = polar(ja, 0.6);
      [[0, 0, 1.2], [0.07, 0.04, 0.85], [-0.06, 0.05, 0.75]].forEach(([dx, dz, k], i) => {
        const color = ['#a85a34', '#94502e', '#c07448'][i];
        out.push({ geo: G.jar, color, p: [jx + dx, y + 0.038 * k, jz + dz], s: [k, k * 1.25, k] });
        out.push({ geo: G.jarNeck, color, p: [jx + dx, y + 0.09 * k, jz + dz], s: k });
      });
      const [mx, mz] = polar(ja + Math.PI / 3, 0.62);
      out.push({ geo: 'mound', color: '#7a4a2e', p: [mx, y + 0.01, mz], s: [0.8, 0.35, 0.8], r: [0, rand() * 3, 0] });
      break;
    }
    case 'pasture': {
      // Goats and sheep grazing by a shaduf, the lever that lifts water into the fields.
      for (const [x, z] of spread(rand, 9, TOKEN_CLEAR + 0.04, EDGE - 0.04)) {
        out.push({ geo: 'tuft', color: rand() > 0.5 ? '#8fb05a' : '#9fbe6c', p: [x, y + 0.045, z], r: [0, rand() * 3, 0] });
      }
      spread(rand, 3, 0.5, 0.64).forEach(([x, z], i) => {
        const a = rand() * Math.PI * 2;
        const goat = i === 1;
        out.push({ geo: 'sheepBody', color: goat ? '#d9c7a0' : '#f4f1e6', p: [x, y + 0.07, z], s: goat ? [1.35, 0.85, 0.85] : [1.35, 1, 1], r: [0, a, 0] });
        out.push({ geo: 'sheepHead', color: goat ? '#6b5236' : '#3a3530', p: [x + Math.cos(a) * 0.1, y + 0.09, z - Math.sin(a) * 0.1], r: [0, a, 0] });
      });
      const sa = pick([CORNERS[3], CORNERS[4], CORNERS[5]]);
      const [sx, sz] = polar(sa, 0.62);
      out.push({ geo: G.shadufPost, color: '#6b4a2a', p: [sx, y + 0.1, sz] });
      // The long arm dips its bucket towards the channel; the counterweight rides high.
      out.push({ geo: G.shadufBeam, color: '#8a6a44', p: [sx, y + 0.2, sz], r: [0, 0, 0.35] });
      out.push({ geo: G.bucket, color: '#5a3d22', p: [sx - 0.13, y + 0.1, sz] });
      out.push({ geo: 'stone', color: '#9a948a', p: [sx + 0.14, y + 0.25, sz], s: 0.6 });
      out.push({ geo: G.channel, color: '#3fa3b8', p: [sx - 0.1, y + 0.006, sz + 0.07] });
      break;
    }
    case 'fields': {
      // Wheat in three plots, each fed by a blue irrigation canal along its outer edge.
      const offset = rand() * Math.PI * 2;
      const golds = ['#e8c35a', '#dcb44a', '#f0d070'];
      for (let k = 0; k < 3; k++) {
        const a = offset + (k * Math.PI * 2) / 3;
        const [px, pz] = polar(a, 0.58);
        const rot = -a + Math.PI / 2;
        out.push({ geo: 'soil', color: '#8f6a2a', p: [px, y + 0.015, pz], r: [0, rot, 0] });
        for (let row = 0; row < 4; row++) {
          const [dx, dz] = polar(a, (row - 1.8) * 0.045);
          out.push({ geo: 'wheatRow', color: golds[(row + k) % golds.length], p: [px + dx, y + 0.055, pz + dz], r: [0, rot, 0] });
        }
        const [cx, cz] = polar(a, 0.73);
        out.push({ geo: G.canal, color: '#3fa3b8', p: [cx, y + 0.006, cz], r: [0, rot, 0], emissive: '#1f6f80' });
      }
      break;
    }
    case 'mountains': {
      // A granite quarry: grey cliffs, cut blocks, and an unfinished obelisk lying where it cracked.
      const cliffs = [CORNERS[3], CORNERS[4], CORNERS[5]].sort(() => rand() - 0.5).slice(0, 2);
      for (const a of cliffs) {
        const [x, z] = polar(a, 0.6);
        const s = 0.85 + rand() * 0.25;
        out.push({ geo: G.cliff, color: pick(['#8f8a82', '#7f7a73', '#9b958c']), p: [x, y + 0.12 * s, z], s, r: [0, rand() * 3, 0] });
      }
      const qa = pick([CORNERS[0], CORNERS[2]]);
      const [qx, qz] = polar(qa, 0.6);
      [[0, 0, 0], [0.065, 0.01, 0], [0.03, 0.045, 0.005]].forEach(([dx, dy, dz]) => {
        out.push({ geo: G.block, color: '#d8cfbf', p: [qx + dx - 0.03, y + 0.022 + dy, qz + dz], r: [0, rand() * 0.3, 0] });
      });
      const [ox, oz] = polar(qa + (qa < Math.PI / 2 ? -1 : 1) * 1.1, 0.62);
      out.push({ geo: G.obelisk, color: '#c2bbae', p: [ox, y + 0.03, oz], r: [0, rand() * 3, Math.PI / 2] });
      for (const [x, z] of spread(rand, 3, 0.5, EDGE - 0.08)) out.push({ geo: 'rock', color: pick(['#9a948a', '#86807a']), p: [x, y + 0.03, z], r: [rand(), rand(), 0] });
      break;
    }
    case 'desert': {
      // The great pyramid behind the centre (the robber stands in front of it), a smaller one at a
      // far corner, a sphinx, a palm and drifts of sand.
      out.push({ geo: G.pyramid, color: '#d4a84a', p: [0, y + 0.17, -0.34] });
      const pa = pick([CORNERS[3], CORNERS[5]]);
      const [px, pz] = polar(pa, 0.64);
      out.push({ geo: G.pyramid, color: '#c99c42', p: [px, y + 0.085, pz], s: 0.5 });
      const [sx, sz] = polar(pa === CORNERS[3] ? CORNERS[0] : CORNERS[2], 0.62);
      out.push({ geo: G.sphinxBody, color: '#d9b56a', p: [sx, y + 0.018, sz] });
      out.push({ geo: G.sphinxHead, color: '#cfa85c', p: [sx, y + 0.055, sz + 0.05] });
      const [tx, tz] = polar(pa === CORNERS[3] ? CORNERS[5] : CORNERS[3], 0.62);
      palm(out, rand, tx, tz, 0.8);
      for (const [x, z] of spread(rand, 3, 0.35, 0.55)) out.push({ geo: 'dune', color: rand() > 0.5 ? '#e6cf96' : '#f0dcaa', p: [x, y - 0.01, z], s: [1.1, 0.3, 0.9] });
      break;
    }
    default:
      // Gold looks the same in every theme.
      return null;
  }
  return out;
}

const HOUSE = {
  body: new THREE.BoxGeometry(0.24, 0.16, 0.22),
  parapet: new THREE.BoxGeometry(0.26, 0.025, 0.24),
  catcher: new THREE.BoxGeometry(0.075, 0.12, 0.075),
  catcherTop: new THREE.BoxGeometry(0.09, 0.02, 0.09),
  vent: new THREE.BoxGeometry(0.05, 0.04, 0.01),
  door: new THREE.BoxGeometry(0.05, 0.085, 0.01),
};

/** A flat-roofed mudbrick house with a windcatcher on the roof. */
function Settlement({ c, o, ghost }: ModelProps) {
  return (
    <>
      <mesh geometry={HOUSE.body} material={mat(c.hex, o)} position={[0, 0.08, 0]} castShadow={!ghost} />
      <mesh geometry={HOUSE.parapet} material={mat(c.dark, o)} position={[0, 0.17, 0]} castShadow={!ghost} />
      <mesh geometry={HOUSE.catcher} material={mat(c.hex, o)} position={[0.05, 0.24, -0.04]} castShadow={!ghost} />
      <mesh geometry={HOUSE.catcherTop} material={mat(c.dark, o)} position={[0.05, 0.305, -0.045]} rotation={[-0.35, 0, 0]} castShadow={!ghost} />
      <mesh geometry={HOUSE.vent} material={mat('#2a2018', o)} position={[0.05, 0.265, -0.001]} />
      <mesh geometry={HOUSE.door} material={mat(c.dark, o)} position={[-0.05, 0.043, 0.112]} />
    </>
  );
}

const TEMPLE = {
  pylon: new THREE.CylinderGeometry(0.075, 0.11, 0.3, 4).rotateY(Math.PI / 4),
  cornice: new THREE.BoxGeometry(0.12, 0.025, 0.12),
  lintel: new THREE.BoxGeometry(0.14, 0.045, 0.08),
  gate: new THREE.BoxGeometry(0.07, 0.17, 0.02),
  obelisk: new THREE.CylinderGeometry(0.018, 0.032, 0.36, 4).rotateY(Math.PI / 4),
  tip: new THREE.ConeGeometry(0.026, 0.045, 4).rotateY(Math.PI / 4),
};

/** A temple: two sloping gate towers (pylons) with a lintel between them, and an obelisk. */
function City({ c, o, ghost }: ModelProps) {
  return (
    <>
      {[-0.11, 0.11].map((x) => (
        <group key={x} position={[x - 0.04, 0, -0.02]}>
          <mesh geometry={TEMPLE.pylon} material={mat(c.hex, o)} position={[0, 0.15, 0]} castShadow={!ghost} />
          <mesh geometry={TEMPLE.cornice} material={mat(c.dark, o)} position={[0, 0.31, 0]} castShadow={!ghost} />
        </group>
      ))}
      <mesh geometry={TEMPLE.lintel} material={mat(c.hex, o)} position={[-0.04, 0.2, -0.02]} castShadow={!ghost} />
      <mesh geometry={TEMPLE.gate} material={mat('#2a2018', o)} position={[-0.04, 0.085, 0.02]} />
      <mesh geometry={TEMPLE.obelisk} material={mat(c.hex, o)} position={[0.21, 0.18, 0.08]} castShadow={!ghost} />
      <mesh geometry={TEMPLE.tip} material={mat('#e8c35a', { ...o, metal: 0.3, rough: 0.45 })} position={[0.21, 0.382, 0.08]} castShadow={!ghost} />
    </>
  );
}

const MUMMY = {
  body: new THREE.CylinderGeometry(0.085, 0.07, 0.34, 7),
  band: new THREE.CylinderGeometry(0.09, 0.09, 0.018, 7),
  head: new THREE.IcosahedronGeometry(0.078, 0),
  eye: new THREE.BoxGeometry(0.024, 0.014, 0.01),
  arm: new THREE.BoxGeometry(0.035, 0.035, 0.16),
  loose: new THREE.BoxGeometry(0.018, 0.12, 0.006),
};

/** The robber: a mummy shuffling forward, arms out, a loose bandage trailing. */
function Robber({ o, ghost }: { o: { opacity?: number }; ghost: boolean }) {
  const wrap = mat('#e6dcc2', o);
  const band = mat('#c9bc9c', o);
  return (
    <>
      <mesh geometry={MUMMY.body} material={wrap} position={[0, 0.17, 0]} castShadow={!ghost} />
      {[0.08, 0.17, 0.26].map((h, i) => (
        <mesh key={h} geometry={MUMMY.band} material={band} position={[0, h, 0]} rotation={[0, 0, (i - 1) * 0.18]} />
      ))}
      <mesh geometry={MUMMY.head} material={wrap} position={[0, 0.41, 0]} castShadow={!ghost} />
      {[-0.028, 0.028].map((x) => (
        <mesh key={x} geometry={MUMMY.eye} material={mat('#2a1f18', o)} position={[x, 0.42, 0.07]} />
      ))}
      {[-0.07, 0.07].map((x) => (
        <mesh key={x} geometry={MUMMY.arm} material={wrap} position={[x, 0.3, 0.09]} castShadow={!ghost} />
      ))}
      <mesh geometry={MUMMY.loose} material={band} position={[0.075, 0.2, -0.05]} rotation={[0.3, 0, 0.15]} />
    </>
  );
}

const CURB = new THREE.BoxGeometry(0.6, 1, 0.022);

/** A stone causeway: sandstone kerbs along both sides of the road. */
function Road({ ghost }: { ghost: boolean; c: PieceColors }) {
  const k = usePieceScale();
  if (ghost) return null;
  // Kerbs rise from the tile (0.06 below the road's frame) to the road's top, which grows with
  // the Board size (pieces.tsx).
  const h = 0.045 * (2 * k - 1) + 0.06;
  return (
    <group position={[0, -0.06 + h / 2, 0]} scale={[1, h, 1]}>
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={CURB} material={mat('#d8c8a0')} position={[0, 0, side * (0.065 * k + 0.008)]} />
      ))}
    </group>
  );
}

/** A lateen sail: a tall triangle on a slanting yard, drawn from both sides. */
const SAIL = (() => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.1, 0.05, 0, 0.1, 0.03, 0, 0.13, 0.34, 0]), 3));
  g.computeVertexNormals();
  return g;
})();
const SAIL_MAT = new THREE.MeshStandardMaterial({ color: '#f4efe0', flatShading: true, roughness: 0.9, side: THREE.DoubleSide });

const FELUCCA = {
  hull: new THREE.BoxGeometry(0.26, 0.045, 0.08),
  bow: new THREE.ConeGeometry(0.04, 0.08, 4).rotateZ(-Math.PI / 2),
  mast: new THREE.CylinderGeometry(0.006, 0.008, 0.3, 5),
  yard: new THREE.CylinderGeometry(0.004, 0.004, 0.36, 4),
};

const SHIP_DANGER = '#c23a2a';
/** The lateen sail's danger tint: same double-sided material as SAIL_MAT, but pale red. */
const SAIL_MAT_DANGER = new THREE.MeshStandardMaterial({ color: '#f3d9d3', flatShading: true, roughness: 0.9, side: THREE.DoubleSide });

/** A reed boat: a papyrus-bundle hull curling up at both ends, under a triangular lateen sail. */
const SHIP = {
  hull: new THREE.CylinderGeometry(0.065, 0.065, 0.34, 7),
  curl: new THREE.TorusGeometry(0.06, 0.02, 4, 8, Math.PI * 1.1),
  mast: new THREE.CylinderGeometry(0.009, 0.011, 0.32, 5),
  yard: new THREE.CylinderGeometry(0.006, 0.006, 0.34, 4),
};

/** The barbarian ship as a reed boat: a papyrus hull curling up at bow and stern, a lateen sail. */
function BarbarianShip({ danger }: { danger: boolean }) {
  const hullMat = mat(danger ? SHIP_DANGER : '#d4a84a', danger ? { emissive: SHIP_DANGER, glow: 0.3 } : {});
  const trimMat = mat(danger ? '#8a4a2a' : '#5a3d22');
  const sailMat = danger ? SAIL_MAT_DANGER : SAIL_MAT;
  return (
    <group>
      <mesh geometry={SHIP.hull} material={hullMat} position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow />
      <mesh geometry={SHIP.curl} material={hullMat} position={[0, 0.13, 0.17]} rotation={[0, Math.PI / 2, 0]} />
      <mesh geometry={SHIP.curl} material={hullMat} position={[0, 0.13, -0.17]} rotation={[0, -Math.PI / 2, Math.PI]} />
      <mesh geometry={SHIP.mast} material={trimMat} position={[0, 0.22, 0]} />
      <mesh geometry={SHIP.yard} material={trimMat} position={[0, 0.24, 0]} rotation={[0, 0, -0.72]} />
      <mesh geometry={SAIL} material={sailMat} position={[0, 0.07, 0]} rotation={[0, Math.PI / 2, 0]} scale={1.1} castShadow />
    </group>
  );
}

/** A felucca moored beside the pier, its white lateen sail up (clear of the floating rate sign). */
function Harbor({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <group position={[0.44, -0.08, 0.07]}>
        <mesh geometry={FELUCCA.hull} material={mat('#8a6139')} castShadow />
        <mesh geometry={FELUCCA.bow} material={mat('#8a6139')} position={[0.17, 0, 0]} castShadow />
        <mesh geometry={FELUCCA.mast} material={mat('#5a3d22')} position={[0.02, 0.17, 0]} />
        <mesh geometry={FELUCCA.yard} material={mat('#5a3d22')} position={[0.02, 0.19, 0]} rotation={[0, 0, -0.72]} />
        <mesh geometry={SAIL} material={SAIL_MAT} castShadow />
      </group>
    </group>
  );
}

/** Nile: palms and mudbrick, wheat along the canals, pyramids, temples, a mummy and feluccas. */
export const nile: ThemeKit = { props, Settlement, City, Robber, Road, Harbor, BarbarianShip };
