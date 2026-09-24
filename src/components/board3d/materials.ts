import * as THREE from 'three';

const cache = new Map<string, THREE.Material>();

/** Shared flat-shaded (low-poly) material per color. */
export function mat(color: string, opts: { rough?: number; metal?: number; opacity?: number; emissive?: string } = {}): THREE.Material {
  const key = `${color}|${opts.rough ?? 0.85}|${opts.metal ?? 0}|${opts.opacity ?? 1}|${opts.emissive ?? ''}`;
  let m = cache.get(key);
  if (!m) {
    const params: THREE.MeshStandardMaterialParameters = {
      color,
      flatShading: true,
      roughness: opts.rough ?? 0.85,
      metalness: opts.metal ?? 0,
      transparent: (opts.opacity ?? 1) < 1,
      opacity: opts.opacity ?? 1,
    };
    if (opts.emissive) {
      params.emissive = new THREE.Color(opts.emissive);
      params.emissiveIntensity = 0.35;
    }
    m = new THREE.MeshStandardMaterial(params);
    cache.set(key, m);
  }
  return m;
}

/** Shared geometries for pieces and targets (terrain props live in terrain.tsx). */
export const GEO = {
  hexTile: new THREE.CylinderGeometry(0.965, 1.0, 0.26, 6, 1),
  tokenDisc: new THREE.CylinderGeometry(0.33, 0.34, 0.06, 20),
  tokenFace: new THREE.CircleGeometry(0.31, 28),
  road: new THREE.BoxGeometry(0.62, 0.09, 0.13),
  houseBody: new THREE.BoxGeometry(0.24, 0.18, 0.24),
  houseRoof: new THREE.ConeGeometry(0.21, 0.16, 4),
  cityBase: new THREE.BoxGeometry(0.42, 0.18, 0.26),
  cityTower: new THREE.BoxGeometry(0.19, 0.34, 0.19),
  cityRoof: new THREE.ConeGeometry(0.16, 0.16, 4),
  robberBody: new THREE.ConeGeometry(0.15, 0.42, 7),
  robberHead: new THREE.IcosahedronGeometry(0.1, 0),
  pier: new THREE.BoxGeometry(0.46, 0.05, 0.22),
  plank: new THREE.BoxGeometry(0.06, 0.04, 1),
  post: new THREE.CylinderGeometry(0.025, 0.025, 0.3, 5),
  harborFace: new THREE.CircleGeometry(0.2, 24),
  harborDisc: new THREE.CylinderGeometry(0.21, 0.22, 0.05, 20),
  targetRing: new THREE.TorusGeometry(0.11, 0.028, 6, 18),
  targetHit: new THREE.SphereGeometry(0.2, 8, 6),
  edgeHit: new THREE.BoxGeometry(0.55, 0.14, 0.2),
  hexRing: new THREE.TorusGeometry(0.62, 0.05, 6, 6),
};
