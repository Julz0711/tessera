'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Topology } from '@/engine/board/topology';
import type { Harbor, PlayerColor } from '@/engine/types';
import { PLAYER_COLORS } from '@/shared/colors';
import { GEO, mat } from './materials';
import { TILE_TOP } from './terrain';
import { harborTexture, tokenTexture } from './textures';

const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();

/** Turns a flat label around Y so it reads upright from the camera's current azimuth. */
function faceCamera(obj: THREE.Object3D, camera: THREE.Camera): void {
  const parentYaw = obj.parent ? tmpEuler.setFromQuaternion(obj.parent.getWorldQuaternion(tmpQuat), 'YXZ').y : 0;
  obj.rotation.y = Math.atan2(camera.position.x, camera.position.z) - parentYaw;
}

export function NumberToken({ n, x, z, lit }: { n: number; x: number; z: number; lit: boolean }) {
  const face = useMemo(() => new THREE.MeshBasicMaterial({ map: tokenTexture(n) }), [n]);
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const target = lit ? 0.12 + Math.sin(state.clock.elapsedTime * 5) * 0.02 : 0;
    ref.current.position.y += (TILE_TOP + target - ref.current.position.y) * 0.2;
    faceCamera(ref.current, state.camera);
  });
  return (
    <group ref={ref} position={[x, TILE_TOP, z]}>
      <mesh geometry={GEO.tokenDisc} material={mat(lit ? '#f2b33d' : '#d9c9a6')} position={[0, 0.03, 0]} castShadow />
      <mesh geometry={GEO.tokenFace} material={face} position={[0, 0.062, 0]} rotation={[-Math.PI / 2, 0, 0]} />
    </group>
  );
}

export function Road({ x, z, angle, color, ghost = false }: { x: number; z: number; angle: number; color: PlayerColor; ghost?: boolean }) {
  const c = PLAYER_COLORS[color];
  return (
    <mesh
      geometry={GEO.road}
      material={mat(c.hex, ghost ? { opacity: 0.55 } : {})}
      position={[x, TILE_TOP + 0.06, z]}
      rotation={[0, -angle, 0]}
      castShadow={!ghost}
    />
  );
}

export function Settlement({ x, z, color, ghost = false }: { x: number; z: number; color: PlayerColor; ghost?: boolean }) {
  const c = PLAYER_COLORS[color];
  const o = ghost ? { opacity: 0.55 } : {};
  return (
    <group position={[x, TILE_TOP, z]}>
      <mesh geometry={GEO.houseBody} material={mat(c.hex, o)} position={[0, 0.09, 0]} castShadow={!ghost} />
      <mesh geometry={GEO.houseRoof} material={mat(c.dark, o)} position={[0, 0.26, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={!ghost} />
    </group>
  );
}

export function City({ x, z, color, ghost = false }: { x: number; z: number; color: PlayerColor; ghost?: boolean }) {
  const c = PLAYER_COLORS[color];
  const o = ghost ? { opacity: 0.55 } : {};
  return (
    <group position={[x, TILE_TOP, z]}>
      <mesh geometry={GEO.cityBase} material={mat(c.hex, o)} position={[0.04, 0.09, 0.02]} castShadow={!ghost} />
      <mesh geometry={GEO.cityTower} material={mat(c.hex, o)} position={[-0.1, 0.17, -0.02]} castShadow={!ghost} />
      <mesh geometry={GEO.cityRoof} material={mat(c.dark, o)} position={[-0.1, 0.42, -0.02]} rotation={[0, Math.PI / 4, 0]} castShadow={!ghost} />
      <mesh geometry={GEO.houseRoof} material={mat(c.dark, o)} position={[0.1, 0.24, 0.02]} rotation={[0, Math.PI / 4, 0]} scale={[0.9, 0.7, 0.9]} castShadow={!ghost} />
    </group>
  );
}

const CK_GEO = {
  wall: new THREE.CylinderGeometry(0.31, 0.33, 0.09, 6, 1, true),
  wallTop: new THREE.TorusGeometry(0.32, 0.025, 4, 6),
  tower: new THREE.BoxGeometry(0.13, 0.46, 0.13),
  towerRoof: new THREE.ConeGeometry(0.12, 0.16, 4),
  pole: new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4),
  flag: new THREE.BoxGeometry(0.12, 0.07, 0.008),
  merchantBody: new THREE.ConeGeometry(0.1, 0.28, 6),
  merchantHead: new THREE.IcosahedronGeometry(0.065, 0),
  merchantHat: new THREE.CylinderGeometry(0.035, 0.08, 0.06, 6),
};

const TRACK_FLAG = { trade: '#e9c35a', politics: '#3a74d8', science: '#3f9b4f' } as const;

/** Stone wall ringing a city (C&K). */
export function CityWall({ x, z }: { x: number; z: number }) {
  const stone = mat('#8f8a80');
  return (
    <group position={[x, TILE_TOP, z]} rotation={[0, Math.PI / 6, 0]}>
      <mesh geometry={CK_GEO.wall} material={stone} position={[0, 0.045, 0]} castShadow />
      <mesh geometry={CK_GEO.wallTop} material={mat('#a39e93')} position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  );
}

/** Metropolis: a tall tower beside the city flying the track's flag. */
export function MetropolisTower({ x, z, color, track }: { x: number; z: number; color: PlayerColor; track: 'trade' | 'politics' | 'science' }) {
  const c = PLAYER_COLORS[color];
  return (
    <group position={[x + 0.16, TILE_TOP, z - 0.12]}>
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
  return (
    <group position={[x - 0.45, TILE_TOP, z - 0.15]}>
      <mesh geometry={CK_GEO.merchantBody} material={mat(c.hex)} position={[0, 0.14, 0]} castShadow />
      <mesh geometry={CK_GEO.merchantHead} material={mat('#e8c9a5')} position={[0, 0.32, 0]} castShadow />
      <mesh geometry={CK_GEO.merchantHat} material={mat('#e3b94a', { metal: 0.5, rough: 0.4 })} position={[0, 0.39, 0]} />
    </group>
  );
}

export function Robber({ x, z }: { x: number; z: number }) {
  const ref = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3(x, 0, z));
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
      <mesh geometry={GEO.robberBody} material={mat('#2d2c33')} position={[0, 0.21, 0]} castShadow />
      <mesh geometry={GEO.robberHead} material={mat('#3a3942')} position={[0, 0.47, 0]} castShadow />
    </group>
  );
}

/** A little wooden pier out at sea with a floating rate token. */
export function HarborPiece({ harbor, topo }: { harbor: Harbor; topo: Topology }) {
  const face = useMemo(() => new THREE.MeshBasicMaterial({ map: harborTexture(harbor.kind) }), [harbor.kind]);
  const label = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (label.current) faceCamera(label.current, state.camera);
  });
  const e = topo.edges[harbor.edge];
  const land = topo.hexes[e.hexes[0]];
  const dx = e.x - land.x;
  const dz = e.y - land.y;
  const len = Math.hypot(dx, dz) || 1;
  const ox = dx / len;
  const oz = dz / len;
  const px = e.x + ox * 0.62;
  const pz = e.y + oz * 0.62;
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
      <mesh geometry={GEO.post} material={mat('#6b4a2b')} position={[px + oz * 0.2, 0.05, pz - ox * 0.2]} />
      <mesh geometry={GEO.post} material={mat('#6b4a2b')} position={[px - oz * 0.2, 0.05, pz + ox * 0.2]} />
      <group ref={label} position={[px + ox * 0.05, 0.3, pz + oz * 0.05]}>
        <mesh geometry={GEO.harborDisc} material={mat('#f6eddb')} castShadow />
        <mesh geometry={GEO.harborFace} material={face} position={[0, 0.027, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      </group>
    </group>
  );
}
