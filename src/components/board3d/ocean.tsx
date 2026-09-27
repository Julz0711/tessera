'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useBoardKit, useBoardPalette } from './themes';

/** What surrounds the island: the theme's own sea (clouds, space…) or the classic ocean. */
export function Sea({ shelfRadius }: { shelfRadius: number }) {
  const ThemeSea = useBoardKit().Sea;
  return ThemeSea ? <ThemeSea shelfRadius={shelfRadius} /> : <Ocean shelfRadius={shelfRadius} />;
}

/**
 * Faceted low-poly sea; a lighter shelf shows through around the island. The swells are baked in
 * once and never move: shimmering facets under the board distract from the game.
 */
export function Ocean({ shelfRadius = 6.4 }: { /** Radius of the lighter shallows around the island. */ shelfRadius?: number }) {
  const sea = useBoardPalette().sea;
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(46, 46, 46, 46);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const d = Math.hypot(x, z);
      const swell = Math.sin(x * 0.75) * 0.035 + Math.cos(z * 0.62) * 0.035;
      pos.setY(i, -0.05 + swell - (d > 9 ? (d - 9) * 0.03 : 0));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const water = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: sea.shallow,
        flatShading: true,
        roughness: 0.32,
        metalness: 0.05,
        transparent: true,
        opacity: 0.9,
      }),
    [sea.shallow],
  );
  const shelf = useMemo(() => new THREE.MeshStandardMaterial({ color: sea.shelf, flatShading: true, roughness: 1 }), [sea.shelf]);
  const floor = useMemo(() => new THREE.MeshStandardMaterial({ color: sea.deep, roughness: 1 }), [sea.deep]);
  useEffect(() => () => [water, shelf, floor].forEach((m) => m.dispose()), [water, shelf, floor]);

  return (
    <group>
      <mesh geometry={geo} material={water} receiveShadow />
      <mesh material={shelf} position={[0, -0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[shelfRadius, 12]} />
      </mesh>
      <mesh material={floor} position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[30, 12]} />
      </mesh>
    </group>
  );
}
