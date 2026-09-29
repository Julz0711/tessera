'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useBoardKit, useBoardPalette } from './themes';

/** What surrounds the island: the theme's own sea (clouds, space…) or the classic ocean. */
export function Sea({ shelfRadius }: { shelfRadius: number }) {
  const ThemeSea = useBoardKit().Sea;
  return ThemeSea ? <ThemeSea shelfRadius={shelfRadius} /> : <Ocean shelfRadius={shelfRadius} />;
}

/** The faceted water reaches this far from the island's centre… */
const SEA_HALF = 60;
/** …and a flat sheet of the same water, and the seabed, far past the fog, so no edge ever shows. */
export const HORIZON_HALF = 600;

let shelfFade: THREE.CanvasTexture | null = null;

/** Opaque in the middle, fading out towards the rim: the shallows blend into the deep water. */
function shelfAlpha(): THREE.CanvasTexture {
  if (shelfFade) return shelfFade;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.62, '#ffffff');
  grad.addColorStop(1, '#000000');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  shelfFade = new THREE.CanvasTexture(c);
  return shelfFade;
}

/**
 * Faceted low-poly sea; lighter shallows show through around the island and fade into the deep.
 * The swells are baked in once and never move: shimmering facets under the board distract from the
 * game. The water stays level all the way out to the fog.
 */
export function Ocean({ shelfRadius = 6.4 }: { /** Radius of the lighter shallows around the island. */ shelfRadius?: number }) {
  const sea = useBoardPalette().sea;
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(SEA_HALF * 2, SEA_HALF * 2, 200, 200);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, -0.05 + Math.sin(x * 0.75) * 0.035 + Math.cos(z * 0.62) * 0.035);
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
  const shelf = useMemo(
    () => new THREE.MeshStandardMaterial({ color: sea.shelf, roughness: 1, transparent: true, alphaMap: shelfAlpha(), depthWrite: false }),
    [sea.shelf],
  );
  const floor = useMemo(() => new THREE.MeshStandardMaterial({ color: sea.deep, roughness: 1 }), [sea.deep]);
  useEffect(() => () => [water, shelf, floor].forEach((m) => m.dispose()), [water, shelf, floor]);

  return (
    <group>
      <mesh geometry={geo} material={water} receiveShadow />
      {/* A ring from just inside the faceted water's edge out to the horizon (not under the island,
          where a second layer of water would hide the shallows), just below the swells' troughs. */}
      <mesh material={water} position={[0, -0.13, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[SEA_HALF * 0.96, HORIZON_HALF, 64, 1]} />
      </mesh>
      {/* A little wider than the shallows' radius: the fade starts about where the old hard edge was. */}
      <mesh material={shelf} position={[0, -0.16, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[shelfRadius * 1.35, 64]} />
      </mesh>
      <mesh material={floor} position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HORIZON_HALF * 2, HORIZON_HALF * 2]} />
      </mesh>
    </group>
  );
}
