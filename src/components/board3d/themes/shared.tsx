'use client';

import { useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { reducedMotion } from '@/client/fx';
import { mat } from '../materials';
import { seeded } from '../terrainKit';

/**
 * Pieces several board themes share: a ridged gable roof, glowing materials, coloured light pooling
 * on the ground, see-through beams and a gentle hover for things that float.
 */

/** A ridged gable (tent) roof: two sloped rectangular faces meeting at a ridge, closed by two triangular gables at ±z. */
export function gableRoof(width: number, length: number, height: number): THREE.BufferGeometry {
  const hw = width / 2;
  const hl = length / 2;
  const fl: [number, number, number] = [-hw, 0, hl];
  const fr: [number, number, number] = [hw, 0, hl];
  const bl: [number, number, number] = [-hw, 0, -hl];
  const br: [number, number, number] = [hw, 0, -hl];
  const rf: [number, number, number] = [0, height, hl];
  const rb: [number, number, number] = [0, height, -hl];
  const tris = [fl, rb, bl, fl, rf, rb, fr, br, rb, fr, rb, rf, fl, fr, rf, br, bl, rb];
  const positions = new Float32Array(tris.length * 3);
  tris.forEach((v, i) => positions.set(v, i * 3));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

/** A material for the custom gable roof geometry: double-sided as a safety net for its hand-built winding. */
const roofMatCache = new Map<string, THREE.MeshStandardMaterial>();
export function roofMat(color: string, o: { opacity?: number }): THREE.MeshStandardMaterial {
  const op = o.opacity ?? 1;
  const key = `${color}|${op}`;
  let m = roofMatCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.82, transparent: op < 1, opacity: op, side: THREE.DoubleSide });
    roofMatCache.set(key, m);
  }
  return m;
}

/** Something that gives off its own light (a lit window, a neon sign): it glows in its own colour. */
export const lit = (color: string, glow = 1.4, o: { opacity?: number } = {}) => mat(color, { ...o, rough: 1, emissive: color, glow });

let glowTexture: THREE.CanvasTexture | null = null;

/** A soft white disc, bright in the middle and fading out; each use tints it. */
function glow(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.34)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(c);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

const POOL = new THREE.CircleGeometry(1, 24);
const poolMaterials = new Map<string, THREE.MeshBasicMaterial>();

function poolMaterial(color: string, strength: number): THREE.MeshBasicMaterial {
  const key = `${color}|${strength}`;
  let m = poolMaterials.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ map: glow(), color, transparent: true, opacity: strength, blending: THREE.AdditiveBlending, depthWrite: false });
    poolMaterials.set(key, m);
  }
  return m;
}

/**
 * Coloured light pooling on the ground around (x, z). An additive decal rather than a real light,
 * so a full board stays cheap to draw (the same trick as Night's lanterns).
 */
export function Pool({ x = 0, y = 0.006, z = 0, r, color, strength = 1 }: { x?: number; y?: number; z?: number; r: number; color: string; strength?: number }) {
  return <mesh geometry={POOL} material={poolMaterial(color, strength)} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} scale={r} renderOrder={1} />;
}

const beamMaterials = new Map<string, THREE.MeshBasicMaterial>();

/** A see-through shaft of light (a tractor beam, a scanner's cone): additive, lit from inside. */
export function beamMat(color: string, opacity: number): THREE.MeshBasicMaterial {
  const key = `${color}|${opacity}`;
  let m = beamMaterials.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    beamMaterials.set(key, m);
  }
  return m;
}

/** Floats its children at `height`, bobbing gently (held still with reduced motion). */
export function Hover({ height, amount = 0.025, speed = 1.6, children }: { height: number; amount?: number; speed?: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const phase = useRef(Math.random() * 10);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.position.y = height + (reducedMotion() ? 0 : Math.sin(state.clock.elapsedTime * speed + phase.current) * amount);
  });
  return (
    <group ref={ref} position={[0, height, 0]}>
      {children}
    </group>
  );
}

/**
 * Jagged rock under a floating island's tile: a downward point, its rim roughened per tile so
 * neighbours don't line up. Shared per seed; the shape is all that varies.
 */
const baseCache = new Map<number, THREE.BufferGeometry>();
export function rockBase(seed: number, depth: number): THREE.BufferGeometry {
  const key = seed * 1000 + Math.round(depth * 100);
  let g = baseCache.get(key);
  if (!g) {
    // Point down; the hexagon keeps a corner towards +z, like the tile above it.
    g = new THREE.ConeGeometry(1.02, depth, 6, 3);
    g.rotateX(Math.PI);
    const pos = g.attributes.position;
    const rand = seeded(seed * 5227 + 31);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      // Leave the top rim alone (it meets the neighbouring tiles); roughen everything below it.
      if (y > depth / 2 - 0.01) continue;
      const k = 0.78 + rand() * 0.4;
      pos.setX(i, pos.getX(i) * k);
      pos.setZ(i, pos.getZ(i) * k);
      pos.setY(i, y + (rand() - 0.5) * 0.12);
    }
    g.computeVertexNormals();
    baseCache.set(key, g);
  }
  return g;
}
