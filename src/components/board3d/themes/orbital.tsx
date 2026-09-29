'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Terrain } from '@/engine/types';
import { reducedMotion } from '@/client/fx';
import { shade } from '@/client/palette';
import { mat } from '../materials';
import { usePieceScale } from '../pieceScale';
import { CORNERS, EDGE, TILE_TOP, TOKEN_CLEAR, inFront, polar, seeded, spread, type Prop } from '../terrainKit';
import { Hover, Pool, beamMat, lit, rockBase } from './shared';
import type { KnightFigureProps, ModelProps, PieceColors, ThemeKit } from './types';

/**
 * Orbital: the island as an asteroid colony adrift in space. Stars, nebulae and a ringed planet
 * replace the sea, every tile sits on a chunk of rock, and the settlers live under domes.
 */
const CYAN = '#7fe3ff';
const TEAL = '#5ce1c6';

const y = TILE_TOP;

/** Orbital's own low-poly geometries (shared, module-scoped like terrainKit's TG). */
const G = {
  // forest: alien trees with glowing bulbs, and glass biodomes over saplings
  bulb: new THREE.IcosahedronGeometry(0.07, 0),
  dome: new THREE.SphereGeometry(0.16, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  domeFloor: new THREE.CylinderGeometry(0.17, 0.17, 0.02, 12),
  // hills: a gantry printer laying bricks of regolith
  gantryPost: new THREE.BoxGeometry(0.016, 0.22, 0.016),
  gantryBeam: new THREE.BoxGeometry(0.2, 0.018, 0.018),
  nozzle: new THREE.BoxGeometry(0.03, 0.03, 0.03),
  // pasture: a glass helmet on every sheep, and a light mast over the meadow
  helmet: new THREE.SphereGeometry(0.048, 10, 8),
  mast: new THREE.CylinderGeometry(0.007, 0.009, 0.24, 5),
  lamp: new THREE.BoxGeometry(0.05, 0.02, 0.05),
  // fields: glass greenhouse tunnels over the wheat (a half-shell, arching up, its axis along z)
  tunnel: new THREE.CylinderGeometry(0.125, 0.125, 0.3, 10, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2),
  // mountains: ore crystals and a drill rig
  crystal: new THREE.OctahedronGeometry(0.035, 0),
  drillLeg: new THREE.BoxGeometry(0.01, 0.24, 0.01),
  beacon: new THREE.SphereGeometry(0.014, 6, 4),
  // desert: an impact crater and a wrecked satellite
  craterRim: new THREE.TorusGeometry(0.2, 0.045, 4, 14).rotateX(Math.PI / 2),
  craterFloor: new THREE.CylinderGeometry(0.19, 0.19, 0.01, 14),
  satBody: new THREE.BoxGeometry(0.07, 0.05, 0.05),
  satPanel: new THREE.BoxGeometry(0.12, 0.005, 0.06),
  dish: new THREE.SphereGeometry(0.035, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
};

/** Orbital's own props per terrain; gold (and anything unlisted) keeps the classic look. */
function props(terrain: Terrain, seed: number): Prop[] | null {
  const rand = seeded(seed * 7919 + terrain.length * 31 + 701);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const out: Prop[] = [];

  switch (terrain) {
    case 'forest': {
      // Slim alien pines and trees with glowing bulbs, and two glass biodomes sheltering saplings.
      const domes = [CORNERS[3], CORNERS[5]].map((a) => polar(a + (rand() - 0.5) * 0.3, 0.6));
      const pines = ['#1f4d3a', '#245842', '#1a4432'];
      const trees = [...spread(rand, 6, TOKEN_CLEAR + 0.06, 0.56, { avoidFront: true }), ...spread(rand, 8, 0.6, EDGE - 0.08)].filter(([x, z]) =>
        domes.every(([dx, dz]) => Math.hypot(x - dx, z - dz) > 0.22),
      );
      trees.forEach(([x, z, a], i) => {
        const s = (inFront(a) ? 0.62 : 0.8) + rand() * 0.22;
        if (i % 3 === 0) {
          out.push({ geo: 'trunk', color: '#4a4f60', p: [x, y + 0.07 * s, z], s: [s, s * 1.4, s] });
          out.push({ geo: G.bulb, color: TEAL, p: [x, y + 0.2 * s, z], s, r: [0, rand() * 3, 0], emissive: '#1f8f70' });
        } else {
          out.push({ geo: 'trunk', color: '#3a3226', p: [x, y + 0.05 * s, z], s });
          out.push({ geo: 'coneTree', color: pick(pines), p: [x, y + 0.2 * s, z], s: [s * 0.8, s, s * 0.8], r: [0, rand() * 3, 0] });
          out.push({ geo: 'coneTreeTop', color: pick(pines), p: [x, y + 0.34 * s, z], s: [s * 0.8, s, s * 0.8], r: [0, rand() * 3, 0] });
        }
      });
      for (const [dx, dz] of domes) {
        out.push({ geo: G.domeFloor, color: '#4a5068', p: [dx, y + 0.01, dz] });
        out.push({ geo: 'coneTree', color: '#2c6a3a', p: [dx - 0.04, y + 0.1, dz], s: 0.5 });
        out.push({ geo: 'coneTree', color: '#2f7440', p: [dx + 0.05, y + 0.09, dz + 0.03], s: 0.45 });
        out.push({ geo: G.dome, color: '#bff6ff', p: [dx, y + 0.02, dz], opacity: 0.3 });
      }
      break;
    }
    case 'hills': {
      // Red regolith, and a gantry printer laying down bricks.
      const [ga, ma, sa] = (rand() > 0.5 ? [3, 5, 1] : [5, 3, 1]).map((k) => CORNERS[k]);
      const [gx, gz] = polar(ga, 0.6);
      for (const d of [-0.09, 0.09]) out.push({ geo: G.gantryPost, color: '#b8c0d0', p: [gx + d, y + 0.11, gz] });
      out.push({ geo: G.gantryBeam, color: '#d0d6e2', p: [gx, y + 0.22, gz] });
      out.push({ geo: G.nozzle, color: CYAN, p: [gx, y + 0.19, gz], emissive: CYAN });
      for (let i = 0; i < 2; i++) {
        for (let layer = 0; layer < 2; layer++) out.push({ geo: 'brick', color: '#9c4f2e', p: [gx + (i - 0.5) * 0.075, y + 0.017 + layer * 0.034, gz] });
      }
      const [mx, mz] = polar(ma, 0.6);
      out.push({ geo: 'mound', color: '#9c4f2e', p: [mx, y + 0.015, mz], s: [0.9, 0.45, 0.9], r: [0, rand() * 3, 0] });
      const [sx, sz] = polar(sa, 0.62);
      out.push({ geo: 'mound', color: '#b8613f', p: [sx, y + 0.01, sz], s: [0.7, 0.3, 0.7], r: [0, rand() * 3, 0] });
      for (const [x, z] of spread(rand, 4, 0.5, EDGE - 0.08)) out.push({ geo: 'rock', color: '#7a3a22', p: [x, y + 0.025, z], s: 0.7, r: [rand(), rand(), 0] });
      break;
    }
    case 'pasture': {
      // A grow-lit meadow; the sheep wear glass helmets.
      for (const [x, z] of spread(rand, 10, TOKEN_CLEAR + 0.04, EDGE - 0.04)) {
        out.push({ geo: 'tuft', color: rand() > 0.5 ? '#6fa84f' : '#8fc46a', p: [x, y + 0.045, z], r: [0, rand() * 3, 0] });
      }
      for (const [x, z] of spread(rand, 3, 0.5, 0.64)) {
        const a = rand() * Math.PI * 2;
        const [hx, hz] = [x + Math.cos(a) * 0.1, z - Math.sin(a) * 0.1];
        out.push({ geo: 'sheepBody', color: '#f4f1e6', p: [x, y + 0.07, z], s: [1.35, 1, 1], r: [0, a, 0] });
        out.push({ geo: 'sheepHead', color: '#3a3530', p: [hx, y + 0.085, hz], r: [0, a, 0] });
        out.push({ geo: G.helmet, color: '#cff6ff', p: [hx, y + 0.09, hz], opacity: 0.35 });
      }
      const [lx, lz] = polar(pick([CORNERS[3], CORNERS[4], CORNERS[5]]), 0.62);
      out.push({ geo: G.mast, color: '#8a93a8', p: [lx, y + 0.12, lz] });
      out.push({ geo: G.lamp, color: '#fff2c8', p: [lx, y + 0.245, lz], emissive: '#fff2c8' });
      break;
    }
    case 'fields': {
      // Wheat under three glass greenhouse tunnels around the token.
      const offset = rand() * Math.PI * 2;
      const golds = ['#e8c35a', '#dcb44a', '#f0d070'];
      for (let k = 0; k < 3; k++) {
        const a = offset + (k * Math.PI * 2) / 3;
        const [px, pz] = polar(a, 0.6);
        out.push({ geo: 'soil', color: '#6e5a3a', p: [px, y + 0.015, pz], r: [0, -a + Math.PI / 2, 0] });
        for (let row = 0; row < 4; row++) {
          const [dx, dz] = polar(a, (row - 1.5) * 0.05);
          out.push({ geo: 'wheatRow', color: golds[(row + k) % golds.length], p: [px + dx, y + 0.055, pz + dz], r: [0, -a + Math.PI / 2, 0] });
        }
        out.push({ geo: G.tunnel, color: '#e8fbff', p: [px, y + 0.03, pz], r: [0, -a, 0], opacity: 0.28 });
      }
      break;
    }
    case 'mountains': {
      // Ore rock studded with glowing crystals, and a drill rig with a red beacon.
      const peaks = [CORNERS[3], CORNERS[4], CORNERS[5]].sort(() => rand() - 0.5);
      for (const a of peaks.slice(0, 2)) {
        const [x, z] = polar(a, 0.6);
        const s = 0.8 + rand() * 0.25;
        out.push({ geo: 'peak', color: pick(['#555a6e', '#5e6378', '#4c5064']), p: [x, y + 0.18 * s, z], s, r: [0, rand() * 3, 0] });
        for (let i = 0; i < 3; i++) {
          const [cx, cz] = polar(a + Math.PI + (i - 1) * 0.5, 0.2 * s);
          out.push({ geo: G.crystal, color: CYAN, p: [x + cx, y + 0.05, z + cz], s: [1, 2.4, 1], r: [rand() * 0.5, rand() * 3, rand() * 0.5], emissive: CYAN });
        }
      }
      const [dx, dz] = polar(pick([CORNERS[0], CORNERS[2]]), 0.6);
      for (let i = 0; i < 3; i++) {
        const b = (i * Math.PI * 2) / 3;
        out.push({ geo: G.drillLeg, color: '#b8c0d0', p: [dx + Math.cos(b) * 0.03, y + 0.11, dz + Math.sin(b) * 0.03], r: [Math.sin(b) * 0.18, 0, -Math.cos(b) * 0.18] });
      }
      out.push({ geo: G.beacon, color: '#ff4d4d', p: [dx, y + 0.235, dz], emissive: '#ff4d4d' });
      for (const [x, z] of spread(rand, 3, 0.5, EDGE - 0.08)) out.push({ geo: 'rock', color: pick(['#6c7186', '#5e6378']), p: [x, y + 0.03, z], r: [rand(), rand(), 0] });
      break;
    }
    case 'desert': {
      // An impact crater at the back, and a wrecked satellite (the robber stands in front of the centre).
      out.push({ geo: G.craterFloor, color: '#6f6c80', p: [0, y + 0.003, -0.36] });
      out.push({ geo: G.craterRim, color: '#a9a7b8', p: [0, y + 0.01, -0.36], s: [1, 0.5, 1] });
      const [sx, sz] = polar(pick([CORNERS[0], CORNERS[2]]), 0.58);
      out.push({ geo: G.satBody, color: '#c9ced6', p: [sx, y + 0.035, sz], r: [0.3, 0.6, 0.4] });
      out.push({ geo: G.satPanel, color: '#3a5a9a', p: [sx - 0.09, y + 0.02, sz + 0.02], r: [0.2, 0.6, 0.25] });
      out.push({ geo: G.satPanel, color: '#3a5a9a', p: [sx + 0.09, y + 0.055, sz - 0.02], r: [0.2, 0.6, 0.45] });
      out.push({ geo: G.dish, color: '#dfe3ea', p: [sx + 0.02, y + 0.06, sz + 0.04], r: [-0.9, 0, 0.3] });
      for (const [x, z] of spread(rand, 5, 0.5, 0.72)) out.push({ geo: 'rock', color: pick(['#8b879a', '#9a96aa']), p: [x, y + 0.02, z], s: 0.6, r: [rand(), rand(), 0] });
      break;
    }
    default:
      // Gold looks the same in every theme.
      return null;
  }
  return out;
}

/** Under every tile: the asteroid's rock, adrift in space. */
function Base({ seed }: { seed: number }) {
  const depth = 1.2 + ((seed * 53) % 9) * 0.13;
  return <mesh geometry={rockBase(seed, depth)} material={mat('#4a4d5c')} position={[0, -0.35 - depth / 2, 0]} />;
}

const PLANET = new THREE.SphereGeometry(3.6, 24, 16);
const PLANET_RING = new THREE.RingGeometry(4.8, 6.6, 48);

/**
 * Space instead of the sea: stars all around and far below, two soft nebulae, and a ringed planet.
 * Nothing moves; distance haze leaves the sky alone.
 */
function Sea() {
  const stars = useMemo(() => {
    const rand = seeded(1969);
    const n = 1400;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const u = rand() * 2 - 1;
      const t = rand() * Math.PI * 2;
      const r = 40 + rand() * 20;
      const s = Math.sqrt(1 - u * u);
      pos.set([Math.cos(t) * s * r, u * r - 8, Math.sin(t) * s * r], i * 3);
      c.set(rand() > 0.85 ? (rand() > 0.5 ? '#bcd4ff' : '#ffe2b8') : '#ffffff').multiplyScalar(0.5 + rand() * 0.5);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  const materials = useMemo(
    () => ({
      stars: new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, fog: false }),
      planet: new THREE.MeshStandardMaterial({ color: '#7a68e0', emissive: '#2a1f6b', emissiveIntensity: 0.5, flatShading: true, roughness: 0.9, fog: false }),
      ring: new THREE.MeshBasicMaterial({ color: '#c9bdff', transparent: true, opacity: 0.25, side: THREE.DoubleSide, fog: false, depthWrite: false }),
    }),
    [],
  );
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);
  useEffect(() => () => stars.dispose(), [stars]);
  return (
    <group>
      <points geometry={stars} material={materials.stars} />
      <Pool x={-9} y={-16} z={-6} r={14} color="#5a2a8a" strength={0.55} />
      <Pool x={11} y={-18} z={4} r={12} color="#1f4f8f" strength={0.5} />
      <group position={[-25, -25, -17]} rotation={[0.35, 0, -0.3]}>
        <mesh geometry={PLANET} material={materials.planet} />
        <mesh geometry={PLANET_RING} material={materials.ring} rotation={[-Math.PI / 2, 0, 0]} />
      </group>
    </group>
  );
}

const HAB = {
  base: new THREE.CylinderGeometry(0.14, 0.15, 0.06, 12),
  dome: new THREE.SphereGeometry(0.13, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  band: new THREE.TorusGeometry(0.126, 0.012, 4, 20).rotateX(Math.PI / 2),
  antenna: new THREE.CylinderGeometry(0.004, 0.004, 0.12, 4),
  tip: new THREE.SphereGeometry(0.012, 6, 4),
};

/** A hab dome: a dome in the owner's colour on a dark base, a lit window band and an antenna. */
function Settlement({ c, o, ghost }: ModelProps) {
  return (
    <>
      <mesh geometry={HAB.base} material={mat(c.dark, o)} position={[0, 0.03, 0]} castShadow={!ghost} />
      <mesh geometry={HAB.dome} material={mat(c.hex, o)} position={[0, 0.06, 0]} scale={[1, 1.25, 1]} castShadow={!ghost} />
      <mesh geometry={HAB.band} material={lit(CYAN, 1.3, o)} position={[0, 0.09, 0]} />
      <mesh geometry={HAB.antenna} material={mat('#b8c0d0', o)} position={[0.06, 0.2, -0.03]} />
      <mesh geometry={HAB.tip} material={lit('#ff4d4d', 1.8, o)} position={[0.06, 0.26, -0.03]} />
    </>
  );
}

const ARCO = {
  spire: new THREE.CylinderGeometry(0.045, 0.1, 0.46, 8),
  deck: new THREE.CylinderGeometry(0.14, 0.14, 0.02, 12),
  pod: new THREE.SphereGeometry(0.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  podBase: new THREE.CylinderGeometry(0.11, 0.11, 0.03, 12),
  beacon: new THREE.SphereGeometry(0.016, 6, 4),
};

/** An arcology spire with two ring decks and a red beacon, beside a smaller dome. */
function City({ c, o, ghost }: ModelProps) {
  return (
    <>
      <mesh geometry={ARCO.spire} material={mat(c.hex, o)} position={[-0.05, 0.23, -0.02]} castShadow={!ghost} />
      <mesh geometry={ARCO.deck} material={mat(c.dark, o)} position={[-0.05, 0.16, -0.02]} castShadow={!ghost} />
      <mesh geometry={ARCO.deck} material={mat(c.dark, o)} position={[-0.05, 0.31, -0.02]} scale={[0.75, 1, 0.75]} castShadow={!ghost} />
      <mesh geometry={ARCO.beacon} material={lit('#ff4d4d', 2, o)} position={[-0.05, 0.47, -0.02]} />
      <mesh geometry={ARCO.podBase} material={mat(c.dark, o)} position={[0.13, 0.015, 0.06]} castShadow={!ghost} />
      <mesh geometry={ARCO.pod} material={mat(c.hex, o)} position={[0.13, 0.03, 0.06]} castShadow={!ghost} />
    </>
  );
}

/** City wall (C&K): a metal ring of light posts glowing in the owner's colour, under a faint shield dome. */
const WALL = {
  ring: new THREE.CylinderGeometry(0.32, 0.35, 0.09, 6, 1, true),
  band: new THREE.TorusGeometry(0.335, 0.012, 4, 6),
  post: new THREE.CylinderGeometry(0.008, 0.01, 0.09, 5),
  lamp: new THREE.SphereGeometry(0.014, 8, 6),
  dome: new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
};
const POST_ANGLES = [0, 1, 2, 3, 4, 5].map((i) => (i * Math.PI) / 3);

/** The city wall: a metal ring with a light post glowing in the owner's colour at each corner, under a faint shield dome. */
function CityWall({ c }: { c: PieceColors }) {
  const glow = shade(c.hex, 0.4);
  return (
    <group rotation={[0, Math.PI / 6, 0]}>
      <mesh geometry={WALL.ring} material={mat('#4a4f60', { metal: 0.4, rough: 0.4 })} position={[0, 0.045, 0]} castShadow />
      <mesh geometry={WALL.band} material={mat('#8a93a8', { metal: 0.5, rough: 0.3 })} position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {POST_ANGLES.map((a, i) => (
        <group key={i} position={[Math.sin(a) * 0.335, 0.09, Math.cos(a) * 0.335]}>
          <mesh geometry={WALL.post} material={mat('#8a93a8')} position={[0, 0.045, 0]} />
          <mesh geometry={WALL.lamp} material={lit(glow, 1.8)} position={[0, 0.095, 0]} />
        </group>
      ))}
      <mesh geometry={WALL.dome} material={mat(CYAN, { opacity: 0.14, rough: 0.2 })} position={[0, 0.09, 0]} scale={[1, 0.5, 1]} />
    </group>
  );
}

const UFO = {
  saucer: new THREE.SphereGeometry(1, 16, 8),
  dome: new THREE.SphereGeometry(0.08, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  light: new THREE.SphereGeometry(0.014, 6, 4),
  beam: new THREE.ConeGeometry(0.22, 0.4, 16, 1, true),
};

const RIM = Array.from({ length: 6 }, (_, i) => (i * Math.PI) / 3);

/** The robber: a pirate saucer hovering over the tile, beaming the harvest up. */
function Robber({ o, ghost }: { o: { opacity?: number }; ghost: boolean }) {
  return (
    <>
      {!ghost && (
        <>
          <mesh geometry={UFO.beam} material={beamMat('#7dffb0', 0.18)} position={[0, 0.21, 0]} />
          <Pool r={0.26} color="#7dffb0" strength={0.6} />
        </>
      )}
      <Hover height={0.44}>
        <mesh geometry={UFO.saucer} material={mat('#9aa3b8', { ...o, metal: 0.45, rough: 0.4 })} scale={[0.2, 0.05, 0.2]} castShadow={!ghost} />
        <mesh geometry={UFO.dome} material={mat(CYAN, { ...o, opacity: (o.opacity ?? 1) * 0.75 })} position={[0, 0.02, 0]} />
        {RIM.map((a) => (
          <mesh key={a} geometry={UFO.light} material={lit('#ffe14d', 1.8, o)} position={[Math.cos(a) * 0.17, -0.005, Math.sin(a) * 0.17]} />
        ))}
      </Hover>
    </>
  );
}

/** A trooper in a pressure suit: a glass bubble helmet over the face, a chest panel, a blaster. */
const KNIGHT = {
  leg: new THREE.BoxGeometry(0.06, 0.15, 0.07),
  torso: new THREE.CylinderGeometry(0.08, 0.09, 0.17, 8),
  panel: new THREE.BoxGeometry(0.06, 0.05, 0.014),
  light: new THREE.BoxGeometry(0.014, 0.014, 0.006),
  pack: new THREE.BoxGeometry(0.09, 0.14, 0.05),
  arm: new THREE.BoxGeometry(0.05, 0.13, 0.05),
  ring: new THREE.TorusGeometry(0.082, 0.012, 4, 14),
  bubble: new THREE.SphereGeometry(0.095, 12, 8),
  face: new THREE.CircleGeometry(0.046, 16),
  gunBody: new THREE.BoxGeometry(0.09, 0.03, 0.03),
  gunBarrel: new THREE.CylinderGeometry(0.008, 0.009, 0.09, 8).rotateZ(Math.PI / 2),
};

function Knight({ trim, cloth, dark, faceMat, faceGeo, shadows, headY }: KnightFigureProps) {
  const s = shadows;
  return (
    <>
      <mesh geometry={KNIGHT.leg} material={cloth} position={[-0.038, 0.075, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.leg} material={cloth} position={[0.038, 0.075, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.torso} material={cloth} position={[0, 0.235, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.panel} material={dark} position={[0, 0.24, 0.083]} />
      <mesh geometry={KNIGHT.light} material={lit(CYAN, 1.8)} position={[-0.014, 0.25, 0.091]} />
      <mesh geometry={KNIGHT.light} material={lit('#ff4d4d', 1.8)} position={[0.014, 0.25, 0.091]} />
      <mesh geometry={KNIGHT.pack} material={dark} position={[0, 0.24, -0.075]} castShadow={s} />
      <mesh geometry={KNIGHT.arm} material={cloth} position={[-0.115, 0.25, 0.01]} rotation={[0, 0, 0.25]} castShadow={s} />
      <mesh geometry={KNIGHT.arm} material={cloth} position={[0.115, 0.25, 0.02]} rotation={[0.5, 0, -0.2]} castShadow={s} />
      {/* the ring collar, then face and helmet lamp inside a clear bubble helmet */}
      <mesh geometry={KNIGHT.ring} material={dark} position={[0, headY - 0.09, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {faceMat ? (
        <mesh geometry={faceGeo ?? KNIGHT.face} material={faceMat} position={[0, headY - 0.05, 0.0755]} />
      ) : (
        <mesh geometry={KNIGHT.face} material={mat('#c9a27a')} position={[0, headY - 0.05, 0.0755]} />
      )}
      <mesh geometry={KNIGHT.bubble} material={mat(CYAN, { opacity: 0.32, rough: 0.15 })} position={[0, headY - 0.01, 0]} castShadow={s} />
      {/* a two-handed blaster */}
      <group position={[0.15, 0.19, 0.06]} rotation={[0, 0.5, 0]}>
        <mesh geometry={KNIGHT.gunBody} material={trim} castShadow={s} />
        <mesh geometry={KNIGHT.gunBarrel} material={trim} position={[0.08, 0, 0]} />
      </group>
    </>
  );
}

const RUNWAY = new THREE.SphereGeometry(0.012, 6, 4);

/** Runway lights along both edges of the road, glowing in the owner's colour. */
function Road({ ghost, c }: { ghost: boolean; c: PieceColors }) {
  const k = usePieceScale();
  if (ghost) return null;
  const top = 0.045 * (2 * k - 1);
  const light = lit(shade(c.hex, 0.4), 1.8);
  return (
    <group position={[0, top + 0.004, 0]}>
      {[-0.22, -0.075, 0.075, 0.22].flatMap((x) =>
        [-1, 1].map((side) => <mesh key={`${x}${side}`} geometry={RUNWAY} material={light} position={[x, 0, side * 0.05 * k]} />),
      )}
    </group>
  );
}

/**
 * The raider's hull: a sharp arrowhead/manta plan (bow at +z), swept wings and a concave notch
 * between the two engine nacelles at the stern. A shallow bevel gives its edges a hard, angular
 * highlight instead of the saucer's soft curve.
 */
function raiderHull(): THREE.BufferGeometry {
  const plan = new THREE.Shape();
  plan.moveTo(0, 0.22); // bow
  plan.lineTo(0.045, 0.12);
  plan.lineTo(0.19, -0.02); // starboard wingtip
  plan.lineTo(0.09, -0.17); // starboard nacelle root
  plan.lineTo(0, -0.09); // stern notch, drawn in
  plan.lineTo(-0.09, -0.17); // port nacelle root
  plan.lineTo(-0.19, -0.02); // port wingtip
  plan.lineTo(-0.045, 0.12);
  plan.closePath();
  const g = new THREE.ExtrudeGeometry(plan, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.011, bevelSegments: 1, curveSegments: 1 });
  g.rotateX(Math.PI / 2);
  g.translate(0, 0.095, 0);
  return g;
}

const RAIDER = {
  hull: raiderHull(),
  canopy: new THREE.SphereGeometry(0.055, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  fin: new THREE.BoxGeometry(0.012, 0.05, 0.09),
  nacelle: new THREE.CylinderGeometry(0.028, 0.034, 0.11, 8),
  nacelleGlow: new THREE.CircleGeometry(0.026, 12),
  navLight: new THREE.IcosahedronGeometry(0.009, 0),
  // Sized so that once the ship group's 1.7 scale and its HULL_CLEAR (0.075) lift are applied, the
  // beam's narrow end touches the hull's underside and its wide end just reaches the sea-step.
  beam: new THREE.ConeGeometry(0.05, 0.095, 12, 1, true),
  // glowing trim along the leading edges, a reactor core on the spine, and engine exhaust plumes
  trim: new THREE.BoxGeometry(0.009, 0.006, 0.27),
  core: new THREE.CylinderGeometry(0.03, 0.03, 0.01, 6),
  plume: new THREE.ConeGeometry(0.026, 0.15, 10, 1, true).rotateX(-Math.PI / 2),
};

/** The engines' exhaust: a flickering plume behind each nacelle, and a pulsing reactor core. */
function Exhaust({ glow }: { glow: string }) {
  const plumes = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (reducedMotion()) return;
    const t = state.clock.elapsedTime;
    plumes.current?.scale.set(1, 1, 0.85 + Math.sin(t * 17) * 0.1 + Math.sin(t * 7.3) * 0.08);
    core.current?.scale.setScalar(0.9 + Math.sin(t * 3) * 0.12);
  });
  return (
    <>
      <group ref={plumes} position={[0, 0.09, -0.205]}>
        {[-0.09, 0.09].map((x) => (
          <mesh key={x} geometry={RAIDER.plume} material={beamMat(glow, 0.55)} position={[x, 0, -0.075]} />
        ))}
      </group>
      <mesh ref={core} geometry={RAIDER.core} material={lit(glow, 2.6)} position={[0, 0.114, -0.04]} />
    </>
  );
}

/** A wingtip nav light that blinks by popping its scale, held still with reduced motion. */
function NavLight({ x, z, color }: { x: number; z: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const phase = useRef(Math.random() * 10);
  useFrame((state) => {
    if (!ref.current) return;
    const on = reducedMotion() || Math.sin(state.clock.elapsedTime * 3 + phase.current) > 0.85;
    ref.current.scale.setScalar(on ? 1 : 0.3);
  });
  return <mesh ref={ref} geometry={RAIDER.navLight} material={lit(color, 2.4)} position={[x, 0.1, z]} />;
}

/**
 * The barbarian ship as a menacing alien raider: a sharp arrowhead hull with a dark glass canopy,
 * hull fins at the wingtips, twin glowing engine nacelles at the stern, blinking nav lights, and a
 * faint tractor beam reaching down towards its step.
 */
function BarbarianShip({ danger }: { danger: boolean }) {
  const hullMat = mat(danger ? '#8a3044' : '#9aa1c2', { metal: 0.6, rough: 0.25 });
  const finMat = mat(danger ? '#4f1824' : '#454a66', { metal: 0.45, rough: 0.35 });
  const glow = danger ? '#ff4d4d' : CYAN;
  return (
    <group>
      <mesh geometry={RAIDER.hull} material={hullMat} castShadow />
      {/* a dark glass canopy just aft of the bow */}
      <mesh geometry={RAIDER.canopy} material={lit(danger ? '#ff4d4d' : '#b06bff', 1.1)} position={[0, 0.11, 0.09]} scale={[1, 0.7, 1.3]} />
      {/* glowing trim down both leading edges, bow to wingtip */}
      {[-1, 1].map((side) => (
        <mesh key={`t${side}`} geometry={RAIDER.trim} material={lit(glow, 2.2)} position={[side * 0.085, 0.113, 0.095]} rotation={[0, -side * 0.66, 0]} />
      ))}
      <Exhaust glow={glow} />
      {/* angled fins at the wingtips */}
      {[-1, 1].map((side) => (
        <mesh key={side} geometry={RAIDER.fin} material={finMat} position={[side * 0.185, 0.12, -0.02]} rotation={[0, 0, side * 0.55]} />
      ))}
      {/* twin engine nacelles at the stern, glowing from behind */}
      {[-0.09, 0.09].map((x) => (
        <group key={x} position={[x, 0.09, -0.15]}>
          <mesh geometry={RAIDER.nacelle} material={finMat} rotation={[Math.PI / 2, 0, 0]} castShadow />
          <mesh geometry={RAIDER.nacelleGlow} material={lit(glow, 2.8)} position={[0, 0, -0.056]} rotation={[0, Math.PI, 0]} />
        </group>
      ))}
      {/* nav lights: red to port, green to starboard, blinking */}
      <NavLight x={-0.185} z={-0.02} color="#ff4d4d" />
      <NavLight x={0.185} z={-0.02} color="#7dffb0" />
      {/* a faint tractor beam reaching down towards the sea-step below */}
      <mesh geometry={RAIDER.beam} material={beamMat(glow, 0.14)} position={[0, -0.003, 0]} />
    </group>
  );
}

/** Orbital: an asteroid colony in space, with domes, a UFO for a robber and shuttles at the harbors. */
export const orbital: ThemeKit = { props, Settlement, City, Robber, Road, Base, Sea, BarbarianShip, Knight, CityWall };
