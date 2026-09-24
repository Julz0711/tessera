'use client';

import { Canvas } from '@react-three/fiber';
import type { PlayerColor } from '@/engine/types';
import type { KnightCustomization } from '@/shared/knight';
import { TurntableKnight } from '@/components/board3d/knights';

/** A small 3D turntable of the player's knight (loaded client-side only). */
export default function KnightPreview3D({ knight, color, size = 180 }: { knight: KnightCustomization; color: PlayerColor; size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="relative">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.6, 3], fov: 32 }} gl={{ alpha: true, antialias: true }}>
        <hemisphereLight args={['#fff6e8', '#2a3b33', 1.1]} />
        <directionalLight position={[2, 4, 3]} intensity={1.6} castShadow />
        <TurntableKnight knight={knight} color={color} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.72, 0]} receiveShadow>
          <circleGeometry args={[0.8, 7]} />
          <meshStandardMaterial color="#e2cf9f" flatShading />
        </mesh>
      </Canvas>
    </div>
  );
}
