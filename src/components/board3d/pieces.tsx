'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Topology } from '@/engine/board/topology';
import type { Harbor, PlayerColor } from '@/engine/types';
import { PLAYER_COLORS } from '@/shared/colors';
import { GEO, mat } from './materials';
import { usePieceScale } from './pieceScale';
import { TILE_TOP } from './terrain';
import { ClassicCity, ClassicRobber, ClassicSettlement } from './models';
import { useBoardKit, useBoardPalette } from './themes';
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

export function Road({ x, z, angle, color, ghost = false }: { x: number; z: number; angle: number; color: PlayerColor; ghost?: boolean }) {
  const c = PLAYER_COLORS[color];
  const ref = useAppear(ghost);
  const k = usePieceScale();
  const Decor = useBoardKit().Road;
  return (
    <group ref={ref} position={[x, TILE_TOP + 0.06, z]} rotation={[0, -angle, 0]} scale={ghost ? 1 : 0.001}>
      {/* Thicker or thinner, never longer: the road still spans exactly one edge. */}
      <mesh geometry={GEO.road} material={mat(c.hex, ghost ? { opacity: 0.55 } : {})} position={[0, 0.045 * (k - 1), 0]} scale={[1, k, k]} castShadow={!ghost} />
      {Decor && <Decor ghost={ghost} />}
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

export function City({ x, z, color, ghost = false }: { x: number; z: number; color: PlayerColor; ghost?: boolean }) {
  const c = PLAYER_COLORS[color];
  const o = ghost ? { opacity: 0.55 } : {};
  const ref = useAppear(ghost);
  const k = usePieceScale();
  const Model = useBoardKit().City ?? ClassicCity;
  return (
    <group ref={ref} position={[x, TILE_TOP, z]} scale={ghost ? 1 : 0.001}>
      <group scale={k}>
        <Model c={c} o={o} ghost={ghost} />
      </group>
    </group>
  );
}

const CK_GEO = {
  wall: new THREE.CylinderGeometry(0.32, 0.35, 0.11, 6, 1, true),
  wallTop: new THREE.TorusGeometry(0.335, 0.028, 4, 6),
  crenel: new THREE.BoxGeometry(0.07, 0.06, 0.045),
  tower: new THREE.BoxGeometry(0.13, 0.46, 0.13),
  towerRoof: new THREE.ConeGeometry(0.12, 0.16, 4),
  pole: new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4),
  flag: new THREE.BoxGeometry(0.12, 0.07, 0.008),
  merchantBody: new THREE.ConeGeometry(0.1, 0.28, 6),
  merchantHead: new THREE.IcosahedronGeometry(0.065, 0),
  merchantHat: new THREE.CylinderGeometry(0.035, 0.08, 0.06, 6),
};

const TRACK_FLAG = { trade: '#e9c35a', politics: '#3a74d8', science: '#3f9b4f' } as const;

/** Angles (hex corners) around the wall ring where a crenellation block sits. */
const CRENEL_ANGLES = [0, 1, 2, 3, 4, 5].map((i) => (i * Math.PI) / 3);

/**
 * Stone wall ringing a city (C&K). Light sandstone with a dark battlement top so it stays
 * readable against every terrain colour, including grey mountains where a plain grey wall
 * used to disappear.
 */
export function CityWall({ x, z }: { x: number; z: number }) {
  const stone = mat('#e8d9b5');
  const dark = mat('#5b4a36');
  const k = usePieceScale();
  return (
    <group position={[x, TILE_TOP, z]} rotation={[0, Math.PI / 6, 0]} scale={k}>
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

/** Metropolis: a tall tower beside the city flying the track's flag. */
export function MetropolisTower({ x, z, color, track }: { x: number; z: number; color: PlayerColor; track: 'trade' | 'politics' | 'science' }) {
  const c = PLAYER_COLORS[color];
  const k = usePieceScale();
  return (
    <group position={[x + 0.16 * k, TILE_TOP, z - 0.12 * k]} scale={k}>
      <mesh geometry={CK_GEO.tower} material={mat(c.hex)} position={[0, 0.23, 0]} castShadow />
      <mesh geometry={CK_GEO.towerRoof} material={mat(c.dark)} position={[0, 0.54, 0]} rotation={[0, Math.PI / 4, 0]} castShadow />
      <mesh geometry={CK_GEO.pole} material={mat('#5a3d22')} position={[0, 0.71, 0]} />
      <mesh geometry={CK_GEO.flag} material={mat(TRACK_FLAG[track])} position={[0.06, 0.78, 0]} />
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
export function Robber({ x, z, ghost = false }: { x: number; z: number; ghost?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3(x, 0, z));
  const k = usePieceScale();
  const o = ghost ? { opacity: 0.55 } : {};
  const Model = useBoardKit().Robber ?? ClassicRobber;
  target.current.set(x, 0, z);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    g.position.lerp(target.current, 0.12);
    const dist = g.position.distanceTo(target.current);
    g.position.y = TILE_TOP + Math.min(0.6, dist * 0.5);
  });
  return (
    <group ref={ref} position={[x, TILE_TOP, z]}>
      <group scale={k}>
        <Model o={o} ghost={ghost} />
      </group>
    </group>
  );
}

/** Height of a harbor's rate sign above the water (times the Board size scale). */
const SIGN_Y = 0.3;

/** A little wooden pier out at sea with its rate sign on a pole. */
export function HarborPiece({ harbor, topo }: { harbor: Harbor; topo: Topology }) {
  const face = useMemo(() => new THREE.MeshBasicMaterial({ map: harborTexture(harbor.kind) }), [harbor.kind]);
  const label = useRef<THREE.Group>(null);
  const k = usePieceScale();
  const Decor = useBoardKit().Harbor;
  useFrame((state) => {
    if (label.current) faceCamera(label.current, state.camera);
  });
  const e = topo.edges[harbor.edge];
  const at = harborAnchor(topo, harbor.edge, 0.62);
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
        <mesh key={i} geometry={GEO.plank} material={mat('#8a6139')} position={[p.mx, 0.03, p.mz]} rotation={[0, p.rot, 0]} scale={[1, 1, p.l]} />
      ))}
      <mesh geometry={GEO.pier} material={mat('#9c6f42')} position={[px, 0.04, pz]} rotation={[0, Math.atan2(ox, oz), 0]} castShadow />
      {Decor && <Decor x={px} z={pz} rot={Math.atan2(ox, oz)} />}
      <mesh geometry={GEO.post} material={mat('#6b4a2b')} position={[px + oz * 0.2, 0.05, pz - ox * 0.2]} />
      <mesh geometry={GEO.post} material={mat('#6b4a2b')} position={[px - oz * 0.2, 0.05, pz + ox * 0.2]} />
      {/* The sign stands on a pole from the pier, up to the underside of its disc. */}
      <mesh
        geometry={GEO.post}
        material={mat('#6b4a2b')}
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
