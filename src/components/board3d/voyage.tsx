'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { PlayerColor } from '@/engine/types';
import { PLAYER_COLORS } from '@/shared/colors';
import { mat } from './materials';
import { usePieceScale } from './pieceScale';
import { useAppear } from './pieces';

/** Voyagers pieces on the 3D board: ships, the pirate and Veiled Isles treasure chests. */

const HULL = new THREE.BoxGeometry(0.46, 0.09, 0.15);
const KEEL = new THREE.BoxGeometry(0.32, 0.06, 0.09);
const MAST = new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5);
const SAIL = new THREE.BoxGeometry(0.02, 0.2, 0.18);
const CHEST = new THREE.BoxGeometry(0.2, 0.11, 0.14);
const LID = new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8, 1, false, 0, Math.PI);
const LOCK = new THREE.BoxGeometry(0.04, 0.05, 0.02);

/** Water level inside the lifted island group: just above the swells. */
const WATER = 0.02;

function Boat({ hull, trim, sail, opacity }: { hull: string; trim: string; sail: string; opacity?: number }) {
  const o = opacity !== undefined ? { opacity } : {};
  return (
    <group>
      <mesh geometry={HULL} material={mat(hull, o)} position={[0, 0.07, 0]} castShadow={!opacity} />
      <mesh geometry={KEEL} material={mat(trim, o)} position={[0, 0.02, 0]} />
      <mesh geometry={MAST} material={mat(trim, o)} position={[0, 0.25, 0]} />
      <mesh geometry={SAIL} material={mat(sail, o)} position={[0.04, 0.27, 0]} rotation={[0, Math.PI / 2, 0]} castShadow={!opacity} />
    </group>
  );
}

/** A ship on an edge, in the owner's colour, turned along it. */
export function Ship({ x, z, angle, color, ghost = false, selected = false }: { x: number; z: number; angle: number; color: PlayerColor; ghost?: boolean; selected?: boolean }) {
  const c = PLAYER_COLORS[color];
  const ref = useAppear(ghost);
  const k = usePieceScale();
  return (
    <group ref={ref} position={[x, WATER, z]} rotation={[0, -angle, 0]} scale={ghost ? 1 : 0.001}>
      <group scale={k}>
        <Boat hull={c.hex} trim={c.dark} sail="#f6eddb" opacity={ghost ? 0.55 : undefined} />
        {selected && (
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#f2b33d', { emissive: '#f2b33d' })}>
            <ringGeometry args={[0.3, 0.36, 24]} />
          </mesh>
        )}
      </group>
    </group>
  );
}

/** The pirate: a larger black ship that glides to its new sea hex. */
export function Pirate({ x, z, ghost = false }: { x: number; z: number; ghost?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3(x, WATER, z));
  const k = usePieceScale();
  target.current.set(x, WATER, z);
  useFrame((state) => {
    const g = ref.current;
    if (!g || ghost) return;
    g.position.lerp(target.current, 0.08);
    g.rotation.z = Math.sin(state.clock.elapsedTime * 1.3) * 0.05;
  });
  return (
    <group ref={ref} position={[x, WATER, z]}>
      <group scale={1.6 * k}>
        <Boat hull="#2d2c33" trim="#111111" sail="#3a3942" opacity={ghost ? 0.55 : undefined} />
      </group>
    </group>
  );
}

/** A closed chest on a treasure corner. */
export function TreasureChest({ x, y, z }: { x: number; y: number; z: number }) {
  const k = usePieceScale();
  return (
    <group position={[x, y, z]} scale={k}>
      <mesh geometry={CHEST} material={mat('#a0692e')} position={[0, 0.055, 0]} castShadow />
      <mesh geometry={LID} material={mat('#c9893f')} position={[0, 0.11, 0]} rotation={[0, 0, Math.PI / 2]} castShadow />
      <mesh geometry={LOCK} material={mat('#f2c14e', { metal: 0.6, rough: 0.4 })} position={[0, 0.1, 0.075]} />
    </group>
  );
}
