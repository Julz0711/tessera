'use client';

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { Topology } from '@/engine/board/topology';
import type { Harbor, Hex, PlayerColor, Track } from '@/engine/types';
import { TRACK_STYLE } from '@/client/progressText';
import { PLAYER_COLORS } from '@/shared/colors';
import { GEO, mat } from './materials';
import { usePieceScale } from './pieceScale';
import { TILE_TOP } from './terrain';
import { ClassicCity, ClassicRobber, ClassicSettlement } from './models';
import { useBoardKit, useBoardPalette, useBoardThemeId } from './themes';
import { METROPOLIS } from './metropolis';
import { harborTexture, tokenTexture } from './textures';
import { harborAnchor } from '../board/harbor';
import { faceCamera } from './faceCamera';

export function NumberToken({ n, x, z, lit }: { n: number; x: number; z: number; lit: boolean }) {
  const palette = useBoardPalette();
  const face = useMemo(() => new THREE.MeshBasicMaterial({ map: tokenTexture(n, palette.token) }), [n, palette.token]);
  const ref = useRef<THREE.Group>(null);
  const k = usePieceScale();
  useFrame((state) => {
    if (!ref.current) return;
    const target = lit ? 0.12 + Math.sin(state.clock.elapsedTime * 5) * 0.02 : 0;
    ref.current.position.y += (TILE_TOP + target - ref.current.position.y) * 0.2;
    faceCamera(ref.current, state.camera);
  });
  return (
    <group ref={ref} position={[x, TILE_TOP, z]}>
      <group scale={k}>
        <mesh geometry={GEO.tokenDisc} material={mat(lit ? '#f2b33d' : palette.token.disc)} position={[0, 0.03, 0]} castShadow />
        <mesh geometry={GEO.tokenFace} material={face} position={[0, 0.062, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      </group>
    </group>
  );
}

/** Pops a freshly placed piece into view (ease-out-back scale). Ghost previews appear instantly. */
export function useAppear(instant = false) {
  const ref = useRef<THREE.Group>(null);
  const progress = useRef(instant ? 1 : 0);
  useFrame((_, dt) => {
    const g = ref.current;
    if (!g || progress.current >= 1) return;
    progress.current = Math.min(1, progress.current + dt * 3.5);
    const k = progress.current - 1;
    const eased = 1 + 2.70158 * k * k * k + 1.70158 * k * k;
    g.scale.setScalar(Math.max(0.001, eased));
  });
  return ref;
}

/** Half the road box's length: a road reaches this far each way from its edge's midpoint. */
const ROAD_HALF = 0.31;
/** A walled city's wall reaches about this far from its corner (times the Board size). */
const WALL_REACH = 0.37;

/**
 * `walled`: whether the city at the edge's first / second corner (`a`, `b`; local -x / +x) has a
 * wall. That end of the road then stops at the wall instead of running through it.
 */
export function Road({ x, z, angle, color, ghost = false, walled }: { x: number; z: number; angle: number; color: PlayerColor; ghost?: boolean; walled?: [boolean, boolean] }) {
  const c = PLAYER_COLORS[color];
  const ref = useAppear(ghost);
  const k = usePieceScale();
  const Decor = useBoardKit().Road;
  // The road starts ROAD_HALF short of the edge's middle, i.e. 0.5 - ROAD_HALF from each corner.
  const trim = Math.max(0, WALL_REACH * k - (0.5 - ROAD_HALF));
  const [ta, tb] = walled ? walled.map((w) => (w ? trim : 0)) : [0, 0];
  const shift = (ta - tb) / 2;
  return (
    <group ref={ref} position={[x, TILE_TOP + 0.06, z]} rotation={[0, -angle, 0]} scale={ghost ? 1 : 0.001}>
      {/* Thicker or thinner, never longer: the road still spans exactly one edge (less a city wall). */}
      <mesh
        geometry={GEO.road}
        material={mat(c.hex, ghost ? { opacity: 0.55 } : {})}
        position={[shift, 0.045 * (k - 1), 0]}
        scale={[(2 * ROAD_HALF - ta - tb) / (2 * ROAD_HALF), k, k]}
        castShadow={!ghost}
      />
      {Decor && (
        <group position={[shift, 0, 0]}>
          <Decor ghost={ghost} c={c} />
        </group>
      )}
    </group>
  );
}

export function Settlement({ x, z, color, ghost = false }: { x: number; z: number; color: PlayerColor; ghost?: boolean }) {
  const c = PLAYER_COLORS[color];
  const o = ghost ? { opacity: 0.55 } : {};
  const ref = useAppear(ghost);
  const k = usePieceScale();
  const Model = useBoardKit().Settlement ?? ClassicSettlement;
  return (
    <group ref={ref} position={[x, TILE_TOP, z]} scale={ghost ? 1 : 0.001}>
      <group scale={k}>
        <Model c={c} o={o} ghost={ghost} />
      </group>
    </group>
  );
}

/** A city, or with `metropolis` set (C&K) the theme's metropolis in its place, showing that track's colour. */
export function City({ x, z, color, ghost = false, metropolis = null }: { x: number; z: number; color: PlayerColor; ghost?: boolean; metropolis?: Track | null }) {
  const c = PLAYER_COLORS[color];
  const o = ghost ? { opacity: 0.55 } : {};
  const ref = useAppear(ghost);
  const k = usePieceScale();
  const Model = useBoardKit().City ?? ClassicCity;
  const Metropolis = METROPOLIS[useBoardThemeId()];
  return (
    <group ref={ref} position={[x, TILE_TOP, z]} scale={ghost ? 1 : 0.001}>
      <group scale={k}>
        {metropolis ? <Metropolis c={c} o={o} ghost={ghost} accent={TRACK_STYLE[metropolis].color} /> : <Model c={c} o={o} ghost={ghost} />}
      </group>
    </group>
  );
}

const CK_GEO = {
  wall: new THREE.CylinderGeometry(0.32, 0.35, 0.11, 6, 1, true),
  wallTop: new THREE.TorusGeometry(0.335, 0.028, 4, 6),
  crenel: new THREE.BoxGeometry(0.07, 0.06, 0.045),
  merchantBody: new THREE.ConeGeometry(0.1, 0.28, 6),
  merchantHead: new THREE.IcosahedronGeometry(0.065, 0),
  merchantHat: new THREE.CylinderGeometry(0.035, 0.08, 0.06, 6),
};

/** Angles (hex corners) around the wall ring where a crenellation block sits. */
const CRENEL_ANGLES = [0, 1, 2, 3, 4, 5].map((i) => (i * Math.PI) / 3);

/**
 * Classic stone wall ringing a city (C&K). Light sandstone with a dark battlement top so it stays
 * readable against every terrain colour, including grey mountains where a plain grey wall used to
 * disappear. The fallback for any theme that doesn't supply its own `CityWall`.
 */
function ClassicCityWall() {
  const stone = mat('#e8d9b5');
  const dark = mat('#5b4a36');
  return (
    <group rotation={[0, Math.PI / 6, 0]}>
      <mesh geometry={CK_GEO.wall} material={stone} position={[0, 0.055, 0]} castShadow />
      <mesh geometry={CK_GEO.wallTop} material={dark} position={[0, 0.11, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {CRENEL_ANGLES.map((a, i) => (
        <mesh
          key={i}
          geometry={CK_GEO.crenel}
          material={dark}
          position={[Math.sin(a) * 0.335, 0.14, Math.cos(a) * 0.335]}
          rotation={[0, a, 0]}
          castShadow
        />
      ))}
    </group>
  );
}

/** The wall ring around a walled city (C&K); themes may draw their own (a stockade, a brass ring…). */
export function CityWall({ x, z, color }: { x: number; z: number; color: PlayerColor }) {
  const c = PLAYER_COLORS[color];
  const k = usePieceScale();
  const Themed = useBoardKit().CityWall;
  return (
    <group position={[x, TILE_TOP, z]} scale={k}>
      {Themed ? <Themed c={c} /> : <ClassicCityWall />}
    </group>
  );
}

/** The merchant (C&K): a little trader in the owner's color on the hex. */
export function Merchant({ x, z, color }: { x: number; z: number; color: PlayerColor }) {
  const c = PLAYER_COLORS[color];
  const k = usePieceScale();
  return (
    <group position={[x - 0.45, TILE_TOP, z - 0.15]} scale={k}>
      <mesh geometry={CK_GEO.merchantBody} material={mat(c.hex)} position={[0, 0.14, 0]} castShadow />
      <mesh geometry={CK_GEO.merchantHead} material={mat('#e8c9a5')} position={[0, 0.32, 0]} castShadow />
      <mesh geometry={CK_GEO.merchantHat} material={mat('#e3b94a', { metal: 0.5, rough: 0.4 })} position={[0, 0.39, 0]} />
    </group>
  );
}

/** The robber hops over to a new hex; a ghost previews a move waiting for confirmation. */
/**
 * Where the robber stands from its hex's centre: beside the number token, not in front of it, and on
 * the other side from the merchant (west of centre), who may share the hex.
 */
export const ROBBER_OFFSET = { x: 0.5, z: 0.08 };

/**
 * Stands a figure on the ground: measures its lowest point in its own frame and lifts or drops it
 * so the feet meet y = 0, whatever a theme's model does, so no knight or robber hovers.
 */
export function Grounded({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    g.position.y = 0;
    g.updateWorldMatrix(true, true);
    const inv = g.matrixWorld.clone().invert();
    const box = new THREE.Box3();
    const m = new THREE.Matrix4();
    g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(m.multiplyMatrices(inv, mesh.matrixWorld)));
    });
    if (!box.isEmpty()) g.position.y = -box.min.y;
  });
  return <group ref={ref}>{children}</group>;
}

export function Robber({ x, z, ghost = false }: { x: number; z: number; ghost?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3(x, TILE_TOP, z));
  const k = usePieceScale();
  const o = ghost ? { opacity: 0.55 } : {};
  const Model = useBoardKit().Robber ?? ClassicRobber;
  target.current.set(x, TILE_TOP, z);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    // Slide across, hopping up in proportion to the distance left; standing still it rests on the tile.
    g.position.y = TILE_TOP;
    g.position.lerp(target.current, 0.12);
    const dist = Math.hypot(g.position.x - x, g.position.z - z);
    g.position.y = TILE_TOP + (dist < 0.002 ? 0 : Math.min(0.6, dist * 0.5));
  });
  return (
    <group ref={ref} position={[x, TILE_TOP, z]}>
      <group scale={k}>
        <Grounded>
          <Model o={o} ghost={ghost} />
        </Grounded>
      </group>
    </group>
  );
}

/** Height of a harbor's rate sign above the water (times the Board size scale). */
const SIGN_Y = 0.3;

/** The classic wooden pier (themes may paint it: a metal gantry, paper strips…). */
const WOOD_PIER = { deck: '#9c6f42', plank: '#8a6139', post: '#6b4a2b' };

/** A little wooden pier out at sea with its rate sign on a pole. */
export function HarborPiece({ harbor, topo, hexes, harbors }: { harbor: Harbor; topo: Topology; hexes: readonly Pick<Hex, 'terrain'>[]; harbors: readonly number[] }) {
  const face = useMemo(() => new THREE.MeshBasicMaterial({ map: harborTexture(harbor.kind) }), [harbor.kind]);
  const label = useRef<THREE.Group>(null);
  const k = usePieceScale();
  const Decor = useBoardKit().Harbor;
  const pier = useBoardPalette().pier ?? WOOD_PIER;
  useFrame((state) => {
    if (label.current) faceCamera(label.current, state.camera);
  });
  const e = topo.edges[harbor.edge];
  const at = harborAnchor(topo, hexes, harbor.edge, 0.62, harbors);
  const [ox, oz, px, pz] = [at.ox, at.oy, at.x, at.y];
  const planks = [e.a, e.b].map((v) => {
    const vx = topo.vertices[v].x;
    const vz = topo.vertices[v].y;
    const mx = (vx + px) / 2;
    const mz = (vz + pz) / 2;
    const l = Math.hypot(px - vx, pz - vz);
    return { mx, mz, l, rot: Math.atan2(px - vx, pz - vz) };
  });
  return (
    <group>
      {planks.map((p, i) => (
        <mesh key={i} geometry={GEO.plank} material={mat(pier.plank)} position={[p.mx, 0.03, p.mz]} rotation={[0, p.rot, 0]} scale={[1, 1, p.l]} />
      ))}
      <mesh geometry={GEO.pier} material={mat(pier.deck)} position={[px, 0.04, pz]} rotation={[0, Math.atan2(ox, oz), 0]} castShadow />
      {Decor && <Decor x={px} z={pz} rot={Math.atan2(ox, oz)} />}
      <mesh geometry={GEO.post} material={mat(pier.post)} position={[px + oz * 0.2, 0.05, pz - ox * 0.2]} />
      <mesh geometry={GEO.post} material={mat(pier.post)} position={[px - oz * 0.2, 0.05, pz + ox * 0.2]} />
      {/* The sign stands on a pole from the pier, up to the underside of its disc. */}
      <mesh
        geometry={GEO.post}
        material={mat(pier.post)}
        position={[px + ox * 0.05, (0.065 + SIGN_Y * k) / 2, pz + oz * 0.05]}
        scale={[0.7, (SIGN_Y * k - 0.065) / 0.3, 0.7]}
      />
      <group ref={label} position={[px + ox * 0.05, SIGN_Y * k, pz + oz * 0.05]} scale={k}>
        <mesh geometry={GEO.harborDisc} material={mat('#f6eddb')} castShadow />
        <mesh geometry={GEO.harborFace} material={face} position={[0, 0.027, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      </group>
    </group>
  );
}
