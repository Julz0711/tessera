'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { Terrain } from '@/engine/types';
import { reducedMotion } from '@/client/fx';
import { mat } from '../materials';
import { ClassicCity, ClassicSettlement } from '../models';
import { CORNERS, polar, seeded } from '../terrainKit';
import type { ModelProps, ThemeKit } from './types';

/**
 * Night: the classic island after dark. The palette (src/client/themes.ts) brings dim moonlight
 * and a murky sky; here every tile gets its own warm light (a lantern or a campfire) that pools on
 * the ground, towns glow from their windows, and small lanterns line the roads. The light pools are
 * additive glow decals rather than real lights, so a full board stays cheap to draw.
 */
const WARM = '#ffc15a';
const FLAME = '#ff9a3c';

const GEO = {
  window: new THREE.BoxGeometry(0.065, 0.065, 0.012),
  lanternPost: new THREE.CylinderGeometry(0.008, 0.01, 0.13, 5),
  lantern: new THREE.BoxGeometry(0.035, 0.04, 0.035),
  tallPost: new THREE.CylinderGeometry(0.011, 0.014, 0.24, 5),
  tallLantern: new THREE.BoxGeometry(0.05, 0.06, 0.05),
  lanternCap: new THREE.ConeGeometry(0.045, 0.035, 4),
  log: new THREE.CylinderGeometry(0.014, 0.014, 0.13, 5),
  flame: new THREE.ConeGeometry(0.04, 0.11, 5),
  ember: new THREE.ConeGeometry(0.028, 0.06, 5),
  pool: new THREE.CircleGeometry(1, 24),
};

let glowTexture: THREE.CanvasTexture | null = null;

/** A soft warm disc, bright in the middle and fading out: light falling on the ground. */
function glow(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255, 190, 110, 0.75)');
  grad.addColorStop(0.35, 'rgba(255, 160, 80, 0.32)');
  grad.addColorStop(1, 'rgba(255, 140, 60, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(c);
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

const poolMaterials = new Map<number, THREE.MeshBasicMaterial>();

function poolMaterial(strength: number): THREE.MeshBasicMaterial {
  let m = poolMaterials.get(strength);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ map: glow(), transparent: true, opacity: strength, blending: THREE.AdditiveBlending, depthWrite: false });
    poolMaterials.set(strength, m);
  }
  return m;
}

/** Light pooling on the ground around (x, z). */
function Pool({ x = 0, z = 0, r, strength = 1 }: { x?: number; z?: number; r: number; strength?: number }) {
  return <mesh geometry={GEO.pool} material={poolMaterial(strength)} position={[x, 0.006, z]} rotation={[-Math.PI / 2, 0, 0]} scale={r} renderOrder={1} />;
}

const lit = (glowStrength: number) => mat(WARM, { rough: 1, emissive: WARM, glow: glowStrength });

function Window({ p, ry = 0, o }: { p: [number, number, number]; ry?: number; o: { opacity?: number } }) {
  return <mesh geometry={GEO.window} material={mat(WARM, { ...o, rough: 1, emissive: WARM, glow: 1.3 })} position={p} rotation={[0, ry, 0]} />;
}

function Settlement(props: ModelProps) {
  // The house body is 0.24 wide: one window at the front (towards the camera), one at the side.
  return (
    <>
      <ClassicSettlement {...props} />
      <Window p={[0, 0.1, 0.123]} o={props.o} />
      <Window p={[0.123, 0.1, 0]} ry={Math.PI / 2} o={props.o} />
      {!props.ghost && <Pool r={0.3} strength={0.7} />}
    </>
  );
}

function City(props: ModelProps) {
  return (
    <>
      <ClassicCity {...props} />
      <Window p={[0.0, 0.1, 0.153]} o={props.o} />
      <Window p={[0.16, 0.1, 0.153]} o={props.o} />
      <Window p={[-0.1, 0.26, 0.078]} o={props.o} />
      {!props.ghost && <Pool r={0.42} strength={0.85} />}
    </>
  );
}

/** A lantern on a short post beside the road. */
function Road({ ghost }: { ghost: boolean }) {
  if (ghost) return null;
  return (
    <group position={[0.12, 0, 0.09]}>
      <mesh geometry={GEO.lanternPost} material={mat('#3a2f22')} position={[0, 0.02, 0]} />
      <mesh geometry={GEO.lantern} material={lit(1.5)} position={[0, 0.1, 0]} />
    </group>
  );
}

/** A campfire's flames, flickering (still with reduced motion). */
function Flames() {
  const outer = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const phase = useRef(Math.random() * 10);
  useFrame((state) => {
    if (!outer.current || !inner.current) return;
    const t = state.clock.elapsedTime * 7 + phase.current;
    const k = reducedMotion() ? 1 : 1 + Math.sin(t) * 0.12 + Math.sin(t * 2.3) * 0.08;
    outer.current.scale.set(1, k, 1);
    inner.current.scale.set(1, 2 - k, 1);
  });
  return (
    <>
      <mesh ref={outer} geometry={GEO.flame} material={mat(FLAME, { rough: 1, emissive: FLAME, glow: 1.6 })} position={[0, 0.06, 0]} />
      <mesh ref={inner} geometry={GEO.ember} material={lit(2)} position={[0, 0.04, 0]} />
    </>
  );
}

/** Where a tile's light stands: out towards an edge, on the far side from the camera. */
function lightSpot(seed: number): [number, number] {
  const rand = seeded(seed * 3301 + 7);
  // The three corners away from the camera, so the light never hides the number.
  const back = [CORNERS[3], CORNERS[4], CORNERS[5]];
  return polar(back[Math.floor(rand() * back.length)] + (rand() - 0.5) * 0.4, 0.64);
}

/** Every tile's own light: a campfire out in the wild, a lantern where people work. */
function Tile({ terrain, seed }: { terrain: Terrain; seed: number }) {
  if (terrain === 'gold') return null; // gold glows on its own
  const [x, z] = lightSpot(seed);
  const campfire = terrain === 'forest' || terrain === 'desert' || terrain === 'mountains';
  return (
    <group position={[x, 0, z]}>
      {campfire ? (
        <>
          <mesh geometry={GEO.log} material={mat('#4a3322')} position={[0, 0.014, 0]} rotation={[0, 0.5, Math.PI / 2]} />
          <mesh geometry={GEO.log} material={mat('#3e2b1c')} position={[0, 0.014, 0]} rotation={[0, -0.7, Math.PI / 2]} />
          <Flames />
        </>
      ) : (
        <>
          <mesh geometry={GEO.tallPost} material={mat('#2f261c')} position={[0, 0.12, 0]} />
          <mesh geometry={GEO.tallLantern} material={lit(1.8)} position={[0, 0.25, 0]} />
          <mesh geometry={GEO.lanternCap} material={mat('#2f261c')} position={[0, 0.297, 0]} rotation={[0, Math.PI / 4, 0]} />
        </>
      )}
      <Pool r={campfire ? 0.5 : 0.44} strength={campfire ? 1 : 0.85} />
    </group>
  );
}

export const night: ThemeKit = { Settlement, City, Road, Tile };
