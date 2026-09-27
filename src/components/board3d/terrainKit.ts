/**
 * Shared building blocks for terrain props: tile measurements, shared low-poly geometries, the
 * prop description and the seeded placement helpers. Board themes (./themes) build on these.
 */
import * as THREE from 'three';

/** Height of the playable tile surface. */
export const TILE_TOP = 0.13;
/** Props stay outside this radius so the number token is always visible… */
export const TOKEN_CLEAR = 0.42;
/** …and inside this one so nothing spills over the tile edge. */
export const EDGE = 0.8;

export const TG = {
  base: new THREE.CylinderGeometry(1.0, 1.03, 0.16, 6),
  top: new THREE.CylinderGeometry(0.935, 0.955, 0.12, 6),
  beach: new THREE.CylinderGeometry(1.08, 1.14, 0.2, 6),
  // forest
  coneTree: new THREE.ConeGeometry(0.12, 0.3, 6),
  coneTreeTop: new THREE.ConeGeometry(0.085, 0.2, 6),
  trunk: new THREE.CylinderGeometry(0.022, 0.03, 0.1, 5),
  canopy: new THREE.IcosahedronGeometry(0.11, 0),
  logs: new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6),
  // hills
  mound: new THREE.IcosahedronGeometry(0.16, 0),
  brick: new THREE.BoxGeometry(0.07, 0.033, 0.035),
  // beehive clay kiln (a dome, so it can't be mistaken for a player's settlement)
  kilnDome: new THREE.SphereGeometry(0.09, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
  kilnMouth: new THREE.BoxGeometry(0.05, 0.045, 0.025),
  kilnFlue: new THREE.CylinderGeometry(0.017, 0.022, 0.05, 6),
  pit: new THREE.CylinderGeometry(0.13, 0.11, 0.02, 8),
  // pasture
  tuft: new THREE.ConeGeometry(0.03, 0.09, 4),
  sheepBody: new THREE.IcosahedronGeometry(0.075, 0),
  sheepHead: new THREE.BoxGeometry(0.045, 0.045, 0.05),
  post: new THREE.BoxGeometry(0.02, 0.08, 0.02),
  rail: new THREE.BoxGeometry(0.2, 0.015, 0.012),
  // fields
  soil: new THREE.BoxGeometry(0.32, 0.03, 0.24),
  wheatRow: new THREE.BoxGeometry(0.29, 0.055, 0.022),
  // hills: a little wooden crane over the clay pit
  cranePost: new THREE.BoxGeometry(0.018, 0.2, 0.018),
  craneBeam: new THREE.BoxGeometry(0.2, 0.018, 0.018),
  bucket: new THREE.CylinderGeometry(0.025, 0.02, 0.035, 6),
  // straw: a conical haystack and round bales lying on their side (axis along X)
  haystackBase: new THREE.CylinderGeometry(0.11, 0.115, 0.06, 8),
  haystackTop: new THREE.ConeGeometry(0.113, 0.16, 8),
  bale: new THREE.CylinderGeometry(0.055, 0.055, 0.085, 8).rotateZ(Math.PI / 2),
  // mountains
  peak: new THREE.ConeGeometry(0.21, 0.36, 5),
  snow: new THREE.ConeGeometry(0.09, 0.13, 5),
  rock: new THREE.DodecahedronGeometry(0.055, 0),
  // desert
  dune: new THREE.SphereGeometry(0.22, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2),
  cactus: new THREE.CylinderGeometry(0.03, 0.035, 0.22, 6),
  cactusArm: new THREE.CylinderGeometry(0.022, 0.022, 0.08, 6),
  stone: new THREE.DodecahedronGeometry(0.06, 0),
  // gold (Black Forest)
  nugget: new THREE.IcosahedronGeometry(0.06, 0),
  // fog (Black Forest)
  cloud: new THREE.IcosahedronGeometry(0.2, 1),
};

export type GeoKey = keyof typeof TG;

/** One prop on a tile: a shared geometry (by name) or a theme's own, placed and coloured. */
export interface Prop {
  geo: GeoKey | THREE.BufferGeometry;
  color: string;
  p: [number, number, number];
  r?: [number, number, number];
  s?: [number, number, number] | number;
  /** Shiny (gold nuggets). */
  metal?: boolean;
  /** Glows in this colour (lit windows, lanterns, lava). */
  emissive?: string;
}

export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Angle measured in the board plane (x right, z towards the default camera). */
export const polar = (a: number, r: number): [number, number] => [Math.cos(a) * r, Math.sin(a) * r];
/** The strip in front of the token (towards the camera) is reserved for low props. */
export const inFront = (a: number) => {
  const d = Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2));
  return Math.abs(d) < 0.75;
};
export const CORNERS = [0, 1, 2, 3, 4, 5].map((k) => Math.PI / 6 + (k * Math.PI) / 3);

export function spread(rand: () => number, count: number, rMin: number, rMax: number, opts: { avoidFront?: boolean } = {}): [number, number, number][] {
  const out: [number, number, number][] = [];
  const start = rand() * Math.PI * 2;
  for (let i = 0; out.length < count && i < count * 4; i++) {
    const a = start + (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    if (opts.avoidFront && inFront(a)) continue;
    const r = rMin + rand() * (rMax - rMin);
    const [x, z] = polar(a, r);
    out.push([x, z, a]);
  }
  return out;
}

