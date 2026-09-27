'use client';

import * as THREE from 'three';
import type { Terrain } from '@/engine/types';
import { mat } from '../materials';
import { classicProps } from '../terrain';
import { CORNERS, EDGE, TG, TILE_TOP, TOKEN_CLEAR, inFront, polar, seeded, spread, type Prop } from '../terrainKit';
import type { ModelProps, ThemeKit } from './types';

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
      // A zen rock garden: raked sand rings, three dark stones, and a vermilion torii gate in the
      // middle (a desert has no number token; the robber stands in front of the centre).
      const ringGeo = [G.ring0, G.ring1, G.ring2];
      ringGeo.forEach((geo, i) => {
        out.push({ geo, color: i % 2 ? '#c9bb95' : '#d3c6a0', p: [0, y + 0.003, 0], r: [-Math.PI / 2, 0, 0] });
      });
      const t = 1.3;
      const tz = 0;
      const red = '#d8412f';
      out.push(
        { geo: G.toriiPost, color: red, p: [-0.13 * t, y + 0.11 * t, tz], s: t },
        { geo: G.toriiPost, color: red, p: [0.13 * t, y + 0.11 * t, tz], s: t },
        { geo: G.toriiTie, color: red, p: [0, y + 0.17 * t, tz], s: t },
        { geo: G.toriiBeam, color: red, p: [0, y + 0.225 * t, tz], s: t },
        { geo: G.toriiCap, color: '#2b2522', p: [0, y + 0.25 * t, tz], s: t },
      );
      const stones = spread(rand, 5, TOKEN_CLEAR + 0.1, EDGE - 0.12).filter(([x, z]) => Math.hypot(x, z - tz) > 0.34);
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
  houseBody: new THREE.BoxGeometry(0.24, 0.14, 0.24),
  houseRoof: new THREE.ConeGeometry(0.3, 0.13, 4),
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

/** Minka farmhouse: a wide, low, overhanging hip roof over a body in the owner's colour. */
function Settlement({ c, o, ghost }: ModelProps) {
  return (
    <>
      <mesh geometry={PIECE_GEO.houseBody} material={mat(c.hex, o)} position={[0, 0.08, 0]} castShadow={!ghost} />
      <mesh geometry={PIECE_GEO.houseRoof} material={mat(c.dark, o)} position={[0, 0.19, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={!ghost} />
    </>
  );
}

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

/** Sakura Isle: blossom groves, rice paddies and pagodas. */
export const sakura: ThemeKit = { props, Settlement, City, Robber };
