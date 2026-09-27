'use client';

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Terrain } from '@/engine/types';
import { shade } from '@/client/palette';
import { mat } from '../materials';
import { Ocean } from '../ocean';
import { usePieceScale } from '../pieceScale';
import { CORNERS, EDGE, TILE_TOP, TOKEN_CLEAR, inFront, polar, seeded, spread, type Prop } from '../terrainKit';
import { Hover, Pool, beamMat, lit } from './shared';
import type { KnightFigureProps, ModelProps, PieceColors, ThemeKit } from './types';

/**
 * Cyberpunk: the island as a megacity district at night, in the rain. The palette brings dim city
 * light and a smoggy sky; here every tile has a neon sign pooling pink or cyan light, towns glow in
 * their owner's colour (so the board lights up as the game goes on), and the black water around
 * mirrors the neon, with a skyline on the horizon. Like Night, the light pools are additive decals,
 * not real lights.
 */
const PINK = '#ff3d9a';
const CYAN = '#3de8ff';
const MINT = '#3dffb0';
const AMBER = '#ffe066';

const y = TILE_TOP;

/** Cyberpunk's own low-poly geometries (shared, module-scoped like terrainKit's TG). */
const G = {
  // forest: grow lamps and a stretch of chain-link fence
  lampPost: new THREE.CylinderGeometry(0.008, 0.01, 0.26, 5),
  lampHead: new THREE.BoxGeometry(0.07, 0.018, 0.03),
  fence: new THREE.BoxGeometry(0.3, 0.1, 0.004),
  fencePost: new THREE.CylinderGeometry(0.006, 0.006, 0.12, 4),
  // hills: scrap and a hydraulic press
  scrap: new THREE.BoxGeometry(0.05, 0.02, 0.03),
  pressLeg: new THREE.BoxGeometry(0.02, 0.2, 0.02),
  pressBeam: new THREE.BoxGeometry(0.18, 0.03, 0.05),
  pressRam: new THREE.BoxGeometry(0.1, 0.06, 0.05),
  pressSlit: new THREE.BoxGeometry(0.14, 0.012, 0.052),
  // pasture: robot sheep
  robotHead: new THREE.BoxGeometry(0.05, 0.045, 0.05),
  visor: new THREE.BoxGeometry(0.052, 0.012, 0.02),
  antenna: new THREE.CylinderGeometry(0.003, 0.003, 0.05, 4),
  antennaTip: new THREE.SphereGeometry(0.009, 6, 4),
  // fields: hydroponic racks with glowing grow-light strips
  rackPost: new THREE.BoxGeometry(0.012, 0.2, 0.012),
  shelf: new THREE.BoxGeometry(0.26, 0.012, 0.08),
  crop: new THREE.BoxGeometry(0.24, 0.03, 0.06),
  growLight: new THREE.BoxGeometry(0.24, 0.006, 0.012),
  // mountains: glowing ore veins and an excavator
  vein: new THREE.BoxGeometry(0.012, 0.1, 0.012),
  cab: new THREE.BoxGeometry(0.08, 0.05, 0.06),
  track: new THREE.BoxGeometry(0.1, 0.022, 0.07),
  boom: new THREE.BoxGeometry(0.14, 0.018, 0.018),
  bucket: new THREE.BoxGeometry(0.035, 0.03, 0.04),
  // desert: a crashed flying car and a broken holo billboard
  car: new THREE.BoxGeometry(0.2, 0.05, 0.09),
  canopy: new THREE.BoxGeometry(0.08, 0.035, 0.07),
  billboardPost: new THREE.CylinderGeometry(0.012, 0.015, 0.3, 5),
  billboard: new THREE.BoxGeometry(0.26, 0.14, 0.012),
  crack: new THREE.BoxGeometry(0.16, 0.004, 0.012),
};

/** Cyberpunk's own props per terrain; gold (and anything unlisted) keeps the classic look. */
function props(terrain: Terrain, seed: number): Prop[] | null {
  const rand = seeded(seed * 7919 + terrain.length * 31 + 601);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const out: Prop[] = [];

  switch (terrain) {
    case 'forest': {
      // The last grove: gene-tuned pines under grow lamps, behind a stretch of chain-link fence.
      const pines = ['#1d4a35', '#22533c', '#193f2d'];
      const trees = [...spread(rand, 6, TOKEN_CLEAR + 0.06, 0.56, { avoidFront: true }), ...spread(rand, 8, 0.6, EDGE - 0.08)];
      trees.forEach(([x, z, a]) => {
        const s = (inFront(a) ? 0.62 : 0.8) + rand() * 0.22;
        out.push({ geo: 'trunk', color: '#3a2e26', p: [x, y + 0.05 * s, z], s });
        out.push({ geo: 'coneTree', color: pick(pines), p: [x, y + 0.2 * s, z], s, r: [0, rand() * 3, 0] });
        out.push({ geo: 'coneTreeTop', color: pick(pines), p: [x, y + 0.34 * s, z], s, r: [0, rand() * 3, 0], emissive: rand() > 0.6 ? MINT : undefined });
      });
      for (const a of [CORNERS[3], CORNERS[5]]) {
        const [lx, lz] = polar(a, 0.5);
        out.push({ geo: G.lampPost, color: '#5a606e', p: [lx, y + 0.13, lz] });
        out.push({ geo: G.lampHead, color: MINT, p: [lx, y + 0.265, lz], emissive: MINT });
      }
      const fa = pick([CORNERS[0], CORNERS[2]]);
      const [fx, fz] = polar(fa, 0.68);
      const rot = -fa + Math.PI / 2;
      out.push({ geo: G.fence, color: '#8a93a3', p: [fx, y + 0.06, fz], r: [0, rot, 0] });
      for (const d of [-0.15, 0.15]) {
        const [dx, dz] = polar(fa + Math.PI / 2, d);
        out.push({ geo: G.fencePost, color: '#5a606e', p: [fx + dx, y + 0.06, fz + dz] });
      }
      break;
    }
    case 'hills': {
      // A rust-red scrapyard: heaps of scrap, and a hydraulic press stamping bricks.
      const [pa, ha, sa] = (rand() > 0.5 ? [3, 5, 1] : [5, 3, 1]).map((k) => CORNERS[k]);
      const [px, pz] = polar(pa, 0.6);
      for (const d of [-0.08, 0.08]) out.push({ geo: G.pressLeg, color: '#6a7080', p: [px + d, y + 0.1, pz] });
      out.push({ geo: G.pressBeam, color: '#5a606e', p: [px, y + 0.2, pz] });
      out.push({ geo: G.pressRam, color: '#4a4f5c', p: [px, y + 0.155, pz] });
      out.push({ geo: G.pressSlit, color: '#ff8a5c', p: [px, y + 0.12, pz], emissive: '#ff6a2c' });
      for (let i = 0; i < 2; i++) out.push({ geo: 'brick', color: '#b35a3e', p: [px + (i - 0.5) * 0.075, y + 0.017, pz] });
      const [hx, hz] = polar(ha, 0.6);
      out.push({ geo: 'mound', color: '#6e3322', p: [hx, y + 0.015, hz], s: [1, 0.5, 1], r: [0, rand() * 3, 0] });
      for (let i = 0; i < 4; i++) {
        out.push({ geo: G.scrap, color: pick(['#8a93a3', '#c9a227', '#5a606e']), p: [hx + (rand() - 0.5) * 0.18, y + 0.06 + rand() * 0.03, hz + (rand() - 0.5) * 0.18], r: [rand(), rand() * 3, rand()] });
      }
      const [sx, sz] = polar(sa, 0.6);
      for (let layer = 0; layer < 3; layer++) {
        for (let i = 0; i < 2; i++) {
          out.push({ geo: 'brick', color: layer % 2 ? '#a24a2c' : '#b35a3e', p: [sx + (i - 0.5) * 0.075, y + 0.017 + layer * 0.034, sz], r: [0, -sa + Math.PI / 2, 0] });
        }
      }
      break;
    }
    case 'pasture': {
      // Robot sheep with glowing visors, grazing on synthetic turf.
      for (const [x, z] of spread(rand, 10, TOKEN_CLEAR + 0.04, EDGE - 0.04)) {
        out.push({ geo: 'tuft', color: rand() > 0.5 ? '#4f8a50' : '#5f9a5a', p: [x, y + 0.045, z], r: [0, rand() * 3, 0] });
      }
      for (const [x, z] of spread(rand, 3, 0.5, 0.64)) {
        const a = rand() * Math.PI * 2;
        const [hx, hz] = [x + Math.cos(a) * 0.1, z - Math.sin(a) * 0.1];
        out.push({ geo: 'sheepBody', color: '#e8eef2', p: [x, y + 0.07, z], s: [1.35, 1, 1], r: [0, a, 0] });
        out.push({ geo: G.robotHead, color: '#2a2f3a', p: [hx, y + 0.09, hz], r: [0, a, 0] });
        out.push({ geo: G.visor, color: CYAN, p: [hx + Math.cos(a) * 0.012, y + 0.095, hz - Math.sin(a) * 0.012], r: [0, a + Math.PI / 2, 0], emissive: CYAN });
        out.push({ geo: G.antenna, color: '#8a93a3', p: [hx, y + 0.135, hz] });
        out.push({ geo: G.antennaTip, color: PINK, p: [hx, y + 0.16, hz], emissive: PINK });
      }
      break;
    }
    case 'fields': {
      // Stacked hydroponic racks of grain under yellow grow-lights, around the token.
      const offset = rand() * Math.PI * 2;
      for (let k = 0; k < 3; k++) {
        const a = offset + (k * Math.PI * 2) / 3;
        const [px, pz] = polar(a, 0.6);
        const rot = -a + Math.PI / 2;
        // Racks in front of the token stay one shelf high.
        const levels = inFront(a) ? 1 : 3;
        const [ex, ez] = polar(a + Math.PI / 2, 0.12);
        for (const d of [-1, 1]) out.push({ geo: G.rackPost, color: '#5a606e', p: [px + ex * d, y + 0.035 * levels, pz + ez * d], s: [1, levels / 3 + 0.05, 1] });
        for (let l = 0; l < levels; l++) {
          const h = y + 0.02 + l * 0.065;
          out.push({ geo: G.shelf, color: '#3a3f4c', p: [px, h, pz], r: [0, rot, 0] });
          out.push({ geo: G.crop, color: pick(['#d9b44e', '#c9a640', '#e3c25a']), p: [px, h + 0.02, pz], r: [0, rot, 0] });
          out.push({ geo: G.growLight, color: AMBER, p: [px, h + 0.058, pz], r: [0, rot, 0], emissive: AMBER });
        }
      }
      break;
    }
    case 'mountains': {
      // Slate peaks shot through with glowing cyan ore, and an excavator at their foot.
      const peaks = [CORNERS[3], CORNERS[4], CORNERS[5]].sort(() => rand() - 0.5);
      for (const a of peaks.slice(0, 2)) {
        const [x, z] = polar(a, 0.6);
        const s = 0.8 + rand() * 0.25;
        out.push({ geo: 'peak', color: pick(['#4a4e5c', '#545868', '#43475a']), p: [x, y + 0.18 * s, z], s, r: [0, rand() * 3, 0] });
        out.push({ geo: G.vein, color: CYAN, p: [x - 0.03 * s, y + 0.15 * s, z + 0.1 * s], s, r: [0.45, 0, 0.4], emissive: CYAN });
        out.push({ geo: G.vein, color: CYAN, p: [x + 0.05 * s, y + 0.09 * s, z + 0.09 * s], s: s * 0.7, r: [0.4, 0, -0.5], emissive: CYAN });
      }
      const [ex, ez] = polar(pick([CORNERS[0], CORNERS[2]]), 0.6);
      out.push({ geo: G.track, color: '#2a2d38', p: [ex, y + 0.011, ez] });
      out.push({ geo: G.cab, color: '#c9a227', p: [ex - 0.01, y + 0.047, ez] });
      out.push({ geo: G.boom, color: '#c9a227', p: [ex + 0.07, y + 0.1, ez], r: [0, 0, 0.6] });
      out.push({ geo: G.bucket, color: '#8a7a3a', p: [ex + 0.13, y + 0.05, ez] });
      out.push({ geo: 'stone', color: '#5e6272', p: [ex + 0.13, y + 0.02, ez + 0.08], s: 0.7 });
      for (const [x, z] of spread(rand, 3, 0.5, EDGE - 0.08)) out.push({ geo: 'rock', color: pick(['#5e6272', '#4a4e5c']), p: [x, y + 0.03, z], r: [rand(), rand(), 0] });
      break;
    }
    case 'desert': {
      // A dead zone: cracked asphalt, a crashed flying car and a broken holo billboard.
      for (let i = 0; i < 5; i++) {
        const [x, z] = polar(rand() * Math.PI * 2, 0.3 + rand() * 0.4);
        out.push({ geo: G.crack, color: '#3a352f', p: [x, y + 0.002, z], r: [0, rand() * 3, 0], s: [0.6 + rand() * 0.8, 1, 1] });
      }
      const [bx, bz] = polar(pick([CORNERS[3], CORNERS[4]]), 0.5);
      out.push({ geo: G.billboardPost, color: '#5a606e', p: [bx, y + 0.15, bz] });
      out.push({ geo: G.billboard, color: PINK, p: [bx, y + 0.34, bz], r: [0, 0, 0.08], emissive: PINK });
      const [cx, cz] = polar(CORNERS[5], 0.55);
      out.push({ geo: G.car, color: '#c8ccd6', p: [cx, y + 0.02, cz], r: [0.1, -0.6, 0.35] });
      out.push({ geo: G.canopy, color: '#1c1f28', p: [cx - 0.01, y + 0.05, cz], r: [0.1, -0.6, 0.35] });
      out.push({ geo: 'stone', color: '#ff2d4a', p: [cx - 0.09, y + 0.005, cz - 0.05], s: 0.3, emissive: '#ff2d4a' });
      for (const [x, z] of spread(rand, 3, 0.55, 0.7)) out.push({ geo: 'rock', color: '#6a6470', p: [x, y + 0.02, z], s: 0.6, r: [rand(), rand(), 0] });
      break;
    }
    default:
      // Gold looks the same in every theme.
      return null;
  }
  return out;
}

const SIGN = {
  post: new THREE.CylinderGeometry(0.01, 0.012, 0.24, 5),
  panel: new THREE.BoxGeometry(0.09, 0.05, 0.012),
};

/** Where a tile's neon sign stands: out towards a far corner, so it never hides the number. */
function signSpot(seed: number): [number, number] {
  const rand = seeded(seed * 3301 + 11);
  const back = [CORNERS[3], CORNERS[4], CORNERS[5]];
  return polar(back[Math.floor(rand() * back.length)] + (rand() - 0.5) * 0.4, 0.66);
}

/** Every tile's neon sign, pooling pink or cyan light on the ground. */
function Tile({ terrain, seed }: { terrain: Terrain; seed: number }) {
  if (terrain === 'gold') return null; // gold glows on its own
  const [x, z] = signSpot(seed);
  const color = seed % 2 ? PINK : CYAN;
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={SIGN.post} material={mat('#3a3f4c')} position={[0, 0.12, 0]} />
      <mesh geometry={SIGN.panel} material={lit(color, 1.8)} position={[0, 0.26, 0]} />
      <Pool r={0.46} color={color} strength={0.75} />
    </group>
  );
}

const STREAK = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const TOWER = new THREE.BoxGeometry(1, 1, 1);

/**
 * Black water mirroring the neon (streaks of light laid on the sea, which never move), and a
 * skyline of towers with lit windows on the horizon.
 */
function Sea({ shelfRadius }: { shelfRadius: number }) {
  const streaks = useRef<THREE.InstancedMesh>(null);
  const towers = useRef<THREE.InstancedMesh>(null);
  const layout = useMemo(() => {
    const rand = seeded(2077);
    const lights = [PINK, CYAN, AMBER, PINK, CYAN];
    const inner = shelfRadius - 1.4;
    const s = Array.from({ length: 60 }, (_, i) => {
      const a = rand() * Math.PI * 2;
      const r = inner + rand() * 9;
      return { p: [Math.cos(a) * r, 0.0, Math.sin(a) * r] as const, w: 0.05 + rand() * 0.06, l: 0.4 + rand() * 0.9, color: lights[i % lights.length] };
    });
    const t = Array.from({ length: 46 }, () => {
      const a = rand() * Math.PI * 2;
      const r = 20 + rand() * 7;
      const h = 2 + rand() * 6;
      return { p: [Math.cos(a) * r, h / 2 - 0.2, Math.sin(a) * r] as const, s: [0.9 + rand() * 1.4, h, 0.9 + rand() * 1.4] as const, turn: rand() * 3 };
    });
    return { s, t };
  }, [shelfRadius]);
  const streakMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }), []);
  const towerMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#0d0b18', flatShading: true, roughness: 0.9 }), []);
  useEffect(() => () => [streakMat, towerMat].forEach((m) => m.dispose()), [streakMat, towerMat]);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const sm = streaks.current;
    if (sm) {
      layout.s.forEach((st, i) => {
        o.position.set(...st.p);
        o.rotation.set(0, 0, 0);
        o.scale.set(st.w, 1, st.l);
        o.updateMatrix();
        sm.setMatrixAt(i, o.matrix);
        sm.setColorAt(i, c.set(st.color));
      });
      sm.instanceMatrix.needsUpdate = true;
      if (sm.instanceColor) sm.instanceColor.needsUpdate = true;
    }
    const tm = towers.current;
    if (tm) {
      layout.t.forEach((tw, i) => {
        o.position.set(...tw.p);
        o.rotation.set(0, tw.turn, 0);
        o.scale.set(...tw.s);
        o.updateMatrix();
        tm.setMatrixAt(i, o.matrix);
      });
      tm.instanceMatrix.needsUpdate = true;
    }
  }, [layout]);
  return (
    <group>
      <Ocean shelfRadius={shelfRadius} />
      <instancedMesh ref={streaks} args={[STREAK, streakMat, layout.s.length]} renderOrder={1} />
      <instancedMesh ref={towers} args={[TOWER, towerMat, layout.t.length]} />
      <Windows towers={layout.t} />
    </group>
  );
}

const WINDOW = new THREE.PlaneGeometry(1, 1);

/** Lit windows on the skyline's towers: a few bands of light on the face of each. */
function Windows({ towers }: { towers: { p: readonly [number, number, number]; s: readonly [number, number, number]; turn: number }[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const bands = useMemo(() => {
    const rand = seeded(1982);
    const out: { m: THREE.Matrix4; color: string }[] = [];
    const o = new THREE.Object3D();
    const inner = new THREE.Object3D();
    for (const t of towers) {
      o.position.set(...t.p);
      o.rotation.set(0, t.turn, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      const n = 2 + Math.floor(rand() * 4);
      for (let i = 0; i < n; i++) {
        const side = Math.floor(rand() * 4);
        const along = side % 2 ? t.s[2] : t.s[0];
        const off = (side % 2 ? t.s[0] : t.s[2]) / 2 + 0.01;
        inner.position.set(0, (rand() - 0.5) * t.s[1] * 0.8, off);
        inner.rotation.set(0, 0, 0);
        inner.scale.set(along * (0.5 + rand() * 0.4), 0.1 + rand() * 0.12, 1);
        inner.updateMatrix();
        const m = new THREE.Matrix4().makeRotationY((side * Math.PI) / 2).multiply(inner.matrix);
        out.push({ m: o.matrix.clone().multiply(m), color: rand() > 0.5 ? (rand() > 0.5 ? PINK : CYAN) : AMBER });
      }
    }
    return out;
  }, [towers]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), []);
  useEffect(() => () => material.dispose(), [material]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const c = new THREE.Color();
    bands.forEach((b, i) => {
      m.setMatrixAt(i, b.m);
      m.setColorAt(i, c.set(b.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [bands]);
  return <instancedMesh ref={ref} args={[WINDOW, material, bands.length]} />;
}

const CAPSULE = {
  body: new THREE.BoxGeometry(0.2, 0.3, 0.18),
  strip: new THREE.BoxGeometry(0.16, 0.02, 0.01),
  sign: new THREE.BoxGeometry(0.012, 0.13, 0.05),
  unit: new THREE.BoxGeometry(0.07, 0.04, 0.06),
};

/** A capsule apartment block: window strips glowing in the owner's colour, a neon sign on its side. */
function Settlement({ c, o, ghost }: ModelProps) {
  const glow = shade(c.hex, 0.3);
  return (
    <>
      <mesh geometry={CAPSULE.body} material={mat(c.hex, o)} position={[0, 0.15, 0]} castShadow={!ghost} />
      {[0.08, 0.15, 0.22].map((h) => (
        <mesh key={h} geometry={CAPSULE.strip} material={lit(glow, 1.4, o)} position={[0, h, 0.091]} />
      ))}
      <mesh geometry={CAPSULE.sign} material={lit(CYAN, 1.8, o)} position={[0.107, 0.2, 0.03]} />
      <mesh geometry={CAPSULE.unit} material={mat(c.dark, o)} position={[-0.04, 0.32, -0.02]} castShadow={!ghost} />
      {!ghost && <Pool r={0.3} color={glow} strength={0.6} />}
    </>
  );
}

const CORP = {
  base: new THREE.BoxGeometry(0.34, 0.16, 0.26),
  tower: new THREE.BoxGeometry(0.16, 0.46, 0.16),
  band: new THREE.BoxGeometry(0.165, 0.018, 0.165),
  ring: new THREE.TorusGeometry(0.15, 0.008, 4, 24).rotateX(Math.PI / 2),
  mast: new THREE.CylinderGeometry(0.005, 0.007, 0.12, 4),
  beacon: new THREE.SphereGeometry(0.014, 6, 4),
};

/** A megacorp tower on a podium: glowing bands in the owner's colour, a holo ring, a red beacon. */
function City({ c, o, ghost }: ModelProps) {
  const glow = shade(c.hex, 0.3);
  return (
    <>
      <mesh geometry={CORP.base} material={mat(c.hex, o)} position={[0.02, 0.08, 0.02]} castShadow={!ghost} />
      <mesh geometry={CORP.tower} material={mat(c.hex, o)} position={[-0.05, 0.23, -0.03]} castShadow={!ghost} />
      {[0.2, 0.29, 0.38].map((h) => (
        <mesh key={h} geometry={CORP.band} material={lit(glow, 1.4, o)} position={[-0.05, h, -0.03]} />
      ))}
      <mesh geometry={CORP.ring} material={beamMat(PINK, ghost ? 0.3 : 0.8)} position={[-0.05, 0.43, -0.03]} />
      <mesh geometry={CORP.mast} material={mat('#8a93a3', o)} position={[-0.05, 0.52, -0.03]} />
      <mesh geometry={CORP.beacon} material={lit('#ff4d4d', 2, o)} position={[-0.05, 0.585, -0.03]} />
      {!ghost && <Pool r={0.45} color={glow} strength={0.7} />}
    </>
  );
}

/** City wall (C&K): a dark precast concrete barrier, ringed at the top by a glowing neon strip. */
const WALL = {
  ring: new THREE.CylinderGeometry(0.32, 0.35, 0.13, 6, 1, true),
  cap: new THREE.CylinderGeometry(0.335, 0.335, 0.02, 6),
  strip: new THREE.TorusGeometry(0.335, 0.01, 4, 6),
  panel: new THREE.BoxGeometry(0.09, 0.05, 0.01),
};
const PANEL_ANGLES = [0, 1, 2, 3, 4, 5].map((i) => (i * Math.PI) / 3);

/** The city wall: a dark concrete barrier, its top strip glowing in the owner's colour like the road's. */
function CityWall({ c }: { c: PieceColors }) {
  const glow = shade(c.hex, 0.3);
  return (
    <group rotation={[0, Math.PI / 6, 0]}>
      <mesh geometry={WALL.ring} material={mat('#2a2d38')} position={[0, 0.065, 0]} castShadow />
      <mesh geometry={WALL.cap} material={mat('#3a3f4c')} position={[0, 0.14, 0]} />
      <mesh geometry={WALL.strip} material={lit(glow, 1.6)} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {PANEL_ANGLES.map((a, i) => (
        <mesh key={i} geometry={WALL.panel} material={mat('#1c1f28')} position={[Math.sin(a) * 0.335, 0.065, Math.cos(a) * 0.335]} rotation={[0, a, 0]} />
      ))}
    </group>
  );
}

const DRONE = {
  body: new THREE.BoxGeometry(0.12, 0.05, 0.12),
  arm: new THREE.BoxGeometry(0.26, 0.012, 0.018),
  rotor: new THREE.CylinderGeometry(0.05, 0.05, 0.004, 12),
  eye: new THREE.SphereGeometry(0.02, 8, 6),
  scan: new THREE.ConeGeometry(0.2, 0.34, 16, 1, true),
};

/** The robber: a surveillance drone hovering over the tile, its red eye scanning the ground. */
function Robber({ o, ghost }: { o: { opacity?: number }; ghost: boolean }) {
  return (
    <>
      {!ghost && (
        <>
          <mesh geometry={DRONE.scan} material={beamMat('#ff2d4a', 0.16)} position={[0, 0.2, 0]} />
          <Pool r={0.24} color="#ff2d4a" strength={0.7} />
        </>
      )}
      <Hover height={0.4}>
        <mesh geometry={DRONE.body} material={mat('#1c1f28', o)} castShadow={!ghost} />
        {[Math.PI / 4, -Math.PI / 4].map((a) => (
          <mesh key={a} geometry={DRONE.arm} material={mat('#3a3f4c', o)} rotation={[0, a, 0]} />
        ))}
        {[
          [0.09, 0.09],
          [-0.09, 0.09],
          [0.09, -0.09],
          [-0.09, -0.09],
        ].map(([rx, rz], i) => (
          <mesh key={i} geometry={DRONE.rotor} material={mat('#9aa0ad', { ...o, opacity: (o.opacity ?? 1) * 0.6 })} position={[rx, 0.022, rz]} />
        ))}
        <mesh geometry={DRONE.eye} material={lit('#ff2d4a', 2.2, o)} position={[0, -0.01, 0.06]} />
      </Hover>
    </>
  );
}

/** A street samurai: an angular helm with a glowing neon visor slit, a neon-piped coat, an energy blade. */
const KNIGHT = {
  leg: new THREE.BoxGeometry(0.055, 0.15, 0.065),
  torso: new THREE.CylinderGeometry(0.075, 0.09, 0.17, 6),
  tabard: new THREE.BoxGeometry(0.1, 0.14, 0.02),
  cape: new THREE.BoxGeometry(0.17, 0.25, 0.02),
  stripe: new THREE.BoxGeometry(0.02, 0.24, 0.008),
  arm: new THREE.BoxGeometry(0.045, 0.13, 0.045),
  helm: new THREE.BoxGeometry(0.15, 0.16, 0.14),
  antenna: new THREE.CylinderGeometry(0.004, 0.004, 0.08, 4),
  antennaTip: new THREE.SphereGeometry(0.009, 6, 4),
  face: new THREE.CircleGeometry(0.046, 16),
  visorRing: new THREE.TorusGeometry(0.05, 0.006, 4, 20),
  hilt: new THREE.CylinderGeometry(0.009, 0.009, 0.06, 6),
  blade: new THREE.BoxGeometry(0.022, 0.26, 0.008),
};

function Knight({ metal, trim, cloth, faceMat, faceGeo, shadows, headY }: KnightFigureProps) {
  const s = shadows;
  const neon = MINT;
  return (
    <>
      <mesh geometry={KNIGHT.leg} material={trim} position={[-0.035, 0.075, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.leg} material={trim} position={[0.035, 0.075, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.torso} material={metal} position={[0, 0.235, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.tabard} material={cloth} position={[0, 0.225, 0.078]} />
      <mesh geometry={KNIGHT.cape} material={mat('#15171e')} position={[0, 0.22, -0.085]} rotation={[0.18, 0, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.stripe} material={lit(neon, 1.8)} position={[0, 0.22, -0.076]} rotation={[0.18, 0, 0]} />
      <mesh geometry={KNIGHT.arm} material={metal} position={[-0.11, 0.25, 0.01]} rotation={[0, 0, 0.25]} castShadow={s} />
      <mesh geometry={KNIGHT.arm} material={metal} position={[0.11, 0.25, 0.02]} rotation={[0.5, 0, -0.2]} castShadow={s} />
      {/* an angular helm; a thin antenna, and a neon ring framing the face */}
      <mesh geometry={KNIGHT.helm} material={metal} position={[0, headY, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.antenna} material={trim} position={[0.05, headY + 0.1, -0.03]} rotation={[0.3, 0, 0]} />
      <mesh geometry={KNIGHT.antennaTip} material={lit(neon, 1.8)} position={[0.06, headY + 0.14, -0.05]} />
      {faceMat ? (
        <mesh geometry={faceGeo ?? KNIGHT.face} material={faceMat} position={[0, headY - 0.05, 0.0755]} />
      ) : (
        <mesh geometry={KNIGHT.face} material={mat('#0d0e12')} position={[0, headY - 0.05, 0.0755]} />
      )}
      <mesh geometry={KNIGHT.visorRing} material={lit(neon, 2)} position={[0, headY - 0.05, 0.076]} />
      {/* the energy blade, glowing instead of steel */}
      <group position={[0.14, 0.2, 0.07]}>
        <mesh geometry={KNIGHT.hilt} material={trim} position={[0, -0.02, 0]} />
        <mesh geometry={KNIGHT.blade} material={lit(neon, 2.2)} position={[0, 0.13, 0]} />
      </group>
    </>
  );
}

const STRIP = new THREE.BoxGeometry(0.56, 0.008, 0.03);

/** A neon-edged street: a glowing strip in the owner's colour along the top of the road. */
function Road({ ghost, c }: { ghost: boolean; c: PieceColors }) {
  const k = usePieceScale();
  if (ghost) return null;
  return <mesh geometry={STRIP} material={lit(shade(c.hex, 0.3), 1.5)} position={[0, 0.045 * (2 * k - 1) + 0.004, 0]} />;
}

const DOCK = {
  leg: new THREE.BoxGeometry(0.016, 0.34, 0.016),
  beam: new THREE.BoxGeometry(0.02, 0.02, 0.2),
  boom: new THREE.BoxGeometry(0.02, 0.02, 0.3),
  container: new THREE.BoxGeometry(0.12, 0.05, 0.05),
  barge: new THREE.BoxGeometry(0.17, 0.035, 0.09),
};

/** Container docks: a gantry crane over the water beside the pier, and containers stacked on a barge. */
function Harbor({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <group position={[0.4, 0, 0]}>
        {[
          [-0.05, -0.08],
          [0.05, -0.08],
          [-0.05, 0.08],
          [0.05, 0.08],
        ].map(([lx, lz], i) => (
          <mesh key={i} geometry={DOCK.leg} material={mat('#c9a227')} position={[lx, 0.05, lz]} castShadow />
        ))}
        <mesh geometry={DOCK.beam} material={mat('#c9a227')} position={[-0.05, 0.22, 0]} />
        <mesh geometry={DOCK.beam} material={mat('#c9a227')} position={[0.05, 0.22, 0]} />
        <mesh geometry={DOCK.boom} material={mat('#b08a20')} position={[0, 0.24, 0.1]} />
        <mesh geometry={DOCK.container} material={mat('#3aa0a0')} position={[0, 0.1, 0.18]} castShadow />
      </group>
      <mesh geometry={DOCK.barge} material={mat('#2a2d38')} position={[-0.4, -0.085, 0.03]} />
      {['#b3402e', '#3a74d8', '#8a93a3'].map((col, i) => (
        <mesh key={col} geometry={DOCK.container} material={mat(col)} position={[-0.4 + (i % 2) * 0.015, -0.043 + i * 0.05, 0.03]} castShadow />
      ))}
    </group>
  );
}

const SHIP = {
  hull: new THREE.BoxGeometry(0.19, 0.08, 0.42),
  deck: new THREE.BoxGeometry(0.15, 0.02, 0.36),
  cockpit: new THREE.BoxGeometry(0.1, 0.05, 0.14),
  fin: new THREE.BoxGeometry(0.02, 0.06, 0.1),
  strip: new THREE.BoxGeometry(0.014, 0.016, 0.34),
};

/** The barbarian ship as a neon hover-speedboat: a low dark hull with cyan and magenta glow strips. */
function BarbarianShip({ danger }: { danger: boolean }) {
  const hullTone = danger ? '#4a1a22' : '#2a2f42';
  const hullMat = mat(hullTone, { metal: 0.35, rough: 0.35, emissive: hullTone, glow: 0.5 });
  const deckMat = mat(danger ? '#3a161c' : '#1c1f2c', { metal: 0.3, rough: 0.4 });
  const stripColor = danger ? '#ff2d4a' : undefined;
  return (
    <group>
      <mesh geometry={SHIP.hull} material={hullMat} position={[0, 0.06, 0]} castShadow />
      <mesh geometry={SHIP.deck} material={deckMat} position={[0, 0.105, 0]} castShadow />
      <mesh geometry={SHIP.cockpit} material={mat('#0d0b18', { opacity: 0.85 })} position={[0, 0.135, 0.02]} />
      <mesh geometry={SHIP.fin} material={hullMat} position={[0, 0.12, -0.18]} />
      <mesh geometry={SHIP.strip} material={lit(stripColor ?? CYAN, 2.2)} position={[-0.096, 0.045, 0]} />
      <mesh geometry={SHIP.strip} material={lit(stripColor ?? PINK, 2.2)} position={[0.096, 0.045, 0]} />
    </group>
  );
}

/** Cyberpunk: neon, rain-black water and a megacity skyline. */
export const cyberpunk: ThemeKit = { props, Settlement, City, Robber, Road, Harbor, Tile, Sea, BarbarianShip, Knight, CityWall };
