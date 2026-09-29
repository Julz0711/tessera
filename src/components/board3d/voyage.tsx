'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type * as THREE from 'three';
import type { PlayerColor } from '@/engine/types';
import { reducedMotion } from '@/client/fx';
import { PLAYER_COLORS } from '@/shared/colors';
import { mat } from './materials';
import { usePieceScale } from './pieceScale';
import { useAppear } from './pieces';
import { useBoardThemeId } from './themes';
import { VOYAGE_KITS } from './themes/voyage';

/**
 * Voyagers pieces on the 3D board: ships, the pirate and Veiled Isles treasures. These wrappers
 * place, turn and animate them; each theme's look lives in themes/voyage.tsx.
 */

/** Water level inside the lifted island group: just above the swells. */
const WATER = 0.02;
const GHOST = { opacity: 0.55 };

/** A ship on an edge, in the owner's colour, turned along it. */
export function Ship({ x, z, angle, color, ghost = false, selected = false }: { x: number; z: number; angle: number; color: PlayerColor; ghost?: boolean; selected?: boolean }) {
  const c = PLAYER_COLORS[color];
  const ref = useAppear(ghost);
  const k = usePieceScale();
  const { Ship: Model } = VOYAGE_KITS[useBoardThemeId()];
  return (
    <group ref={ref} position={[x, WATER, z]} rotation={[0, -angle, 0]} scale={ghost ? 1 : 0.001}>
      <group scale={k}>
        <Model c={c} o={ghost ? GHOST : {}} />
        {selected && (
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mat('#f2b33d', { emissive: '#f2b33d' })}>
            <ringGeometry args={[0.3, 0.36, 24]} />
          </mesh>
        )}
      </group>
    </group>
  );
}

/** The pirate: the theme's dark craft, gliding to its new sea hex and rocking gently. */
export function Pirate({ x, z, ghost = false }: { x: number; z: number; ghost?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const target = useRef<[number, number]>([x, z]);
  const k = usePieceScale();
  const { Pirate: Model } = VOYAGE_KITS[useBoardThemeId()];
  target.current = [x, z];
  useFrame((state) => {
    const g = ref.current;
    if (!g || ghost) return;
    g.position.x += (target.current[0] - g.position.x) * 0.08;
    g.position.z += (target.current[1] - g.position.z) * 0.08;
    g.rotation.x = reducedMotion() ? 0 : Math.sin(state.clock.elapsedTime * 1.3) * 0.05;
  });
  return (
    <group ref={ref} position={[x, WATER, z]}>
      <group scale={1.6 * k}>
        <Model o={ghost ? GHOST : {}} />
      </group>
    </group>
  );
}

/** A treasure on its corner, in the theme's style. */
export function TreasureChest({ x, y, z }: { x: number; y: number; z: number }) {
  const k = usePieceScale();
  const { Treasure: Model } = VOYAGE_KITS[useBoardThemeId()];
  return (
    <group position={[x, y, z]} scale={k}>
      <Model />
    </group>
  );
}
