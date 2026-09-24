'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { SEA } from '@/client/palette';

/** Faceted low-poly sea with gentle swells; a lighter shelf shows through around the island. */
export function Ocean({ animate }: { animate: boolean }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(46, 46, 46, 46);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const base = useMemo(() => Float32Array.from(geo.attributes.position.array as Float32Array), [geo]);
  const water = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: SEA.shallow,
        flatShading: true,
        roughness: 0.32,
        metalness: 0.05,
        transparent: true,
        opacity: 0.9,
      }),
    [],
  );
  const shelf = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7fd0d3', flatShading: true, roughness: 1 }), []);
  const floor = useMemo(() => new THREE.MeshStandardMaterial({ color: SEA.deep, roughness: 1 }), []);

  const update = (t: number) => {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      const d = Math.hypot(x, z);
      const swell = Math.sin(x * 0.75 + t * 0.9) * 0.035 + Math.cos(z * 0.62 + t * 0.7) * 0.035;
      pos.setY(i, -0.05 + swell - (d > 9 ? (d - 9) * 0.03 : 0));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
  };

  useMemo(() => update(0), []); // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((state) => {
    if (animate) update(state.clock.elapsedTime);
  });

  return (
    <group>
      <mesh geometry={geo} material={water} receiveShadow />
      <mesh material={shelf} position={[0, -0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6.4, 12]} />
      </mesh>
      <mesh material={floor} position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[30, 12]} />
      </mesh>
    </group>
  );
}
