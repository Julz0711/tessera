'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import type { PlayerColor } from '@/engine/types';
import { TurntableKnight } from '@/components/board3d/knights';

/**
 * Points the camera so the whole turntable fits with a margin. The knight spins about the y axis,
 * so every point is fitted at the worst angle it reaches: swung to the side (it mustn't leave the
 * frame's width) and swung towards the camera (where it looms largest, so it mustn't leave the
 * height). That keeps the helmet, sword and shield inside the frame at every angle.
 */
function FitCamera({ children, margin = 1.06 }: { children: React.ReactNode; margin?: number }) {
  const group = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / s.size.height);
  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;
    root.updateWorldMatrix(true, true);
    const points: [number, number][] = []; // [distance from the axis, height] of every vertex
    const v = new THREE.Vector3();
    root.traverse((o) => {
      const pos = (o as THREE.Mesh).isMesh ? (o as THREE.Mesh).geometry.getAttribute('position') : undefined;
      if (!pos) return;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        points.push([Math.hypot(v.x, v.z), v.y]);
      }
    });
    if (!points.length) return;
    const ys = points.map(([, y]) => y);
    const centre = new THREE.Vector3(0, (Math.min(...ys) + Math.max(...ys)) / 2, 0);
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const sinH = Math.sin(Math.atan(tanV * aspect));
    const distance =
      margin * Math.max(...points.map(([r, y]) => Math.max(r / sinH, Math.abs(y - centre.y) / tanV + r)));
    // Keep the slightly raised viewpoint, just far enough away.
    camera.position.copy(centre).addScaledVector(new THREE.Vector3(0, 0.6, 3).normalize(), distance);
    camera.lookAt(centre);
    camera.updateProjectionMatrix();
  }, [camera, aspect]);
  return <group ref={group}>{children}</group>;
}

/** A small 3D turntable of the player's knight (loaded client-side only). */
export default function KnightPreview3D({ color, size = 180 }: { color: PlayerColor; size?: number }) {
  return (
    <div style={{ width: size, height: size }} className="relative">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.6, 3], fov: 32 }} gl={{ alpha: true, antialias: true }}>
        <hemisphereLight args={['#fff6e8', '#2a3b33', 1.1]} />
        <directionalLight position={[2, 4, 3]} intensity={1.6} castShadow />
        <FitCamera>
          <TurntableKnight color={color} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.72, 0]} receiveShadow>
            <circleGeometry args={[0.8, 7]} />
            <meshStandardMaterial color="#e2cf9f" flatShading />
          </mesh>
        </FitCamera>
      </Canvas>
    </div>
  );
}
