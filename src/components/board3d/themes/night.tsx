'use client';

import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import type { Terrain } from '@/engine/types';
import { reducedMotion } from '@/client/fx';
import { KNIGHT_STEEL } from '@/shared/knight';
import { mat } from '../materials';
import { ClassicCity, ClassicSettlement } from '../models';
import { CORNERS, polar, seeded } from '../terrainKit';
import type { KnightFigureProps, ModelProps, PieceColors, ThemeKit } from './types';

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

const DANGER = '#c23a2a';

/** The barbarian longship after dark: the same hull under a dark sail, two lanterns glowing on posts fore and aft. */
const SHIP = {
  hullMid: new THREE.BoxGeometry(0.16, 0.08, 0.2),
  hullBow: new THREE.ConeGeometry(0.085, 0.16, 4),
  hullStern: new THREE.ConeGeometry(0.075, 0.11, 4),
  prowCurl: new THREE.TorusGeometry(0.06, 0.015, 4, 8, Math.PI * 1.4),
  mast: new THREE.CylinderGeometry(0.011, 0.011, 0.32, 5),
  yard: new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4),
  sail: new THREE.BoxGeometry(0.22, 0.16, 0.012),
  lanternPost: new THREE.CylinderGeometry(0.007, 0.009, 0.09, 5),
  lantern: new THREE.BoxGeometry(0.042, 0.048, 0.042),
};

/** The barbarian ship by night: a dark-sailed longship with lanterns glowing fore and aft. */
function BarbarianShip({ danger }: { danger: boolean }) {
  const hullMat = mat(danger ? DANGER : '#3a2c1c', danger ? { emissive: DANGER, glow: 0.35 } : {});
  const trimMat = mat('#4a3a28');
  const sailMat = mat(danger ? '#5a2e2c' : '#3a3f52');
  const lanternMat = lit(2.4);
  return (
    <group>
      <mesh geometry={SHIP.hullMid} material={hullMat} position={[0, 0.04, 0]} castShadow />
      <mesh geometry={SHIP.hullBow} material={hullMat} position={[0, 0.04, 0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow />
      <mesh geometry={SHIP.hullStern} material={hullMat} position={[0, 0.04, -0.155]} rotation={[-Math.PI / 2, 0, 0]} castShadow />
      <mesh geometry={SHIP.prowCurl} material={trimMat} position={[0, 0.1, 0.27]} rotation={[0.3, 0, 0]} />
      <mesh geometry={SHIP.mast} material={trimMat} position={[0, 0.21, 0]} />
      <mesh geometry={SHIP.yard} material={trimMat} position={[0, 0.31, 0]} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={SHIP.sail} material={sailMat} position={[0, 0.26, 0]} />
      {/* Lanterns on short posts at the bow and stern, glowing warm against the dark sail. */}
      {[0.16, -0.13].map((z) => (
        <group key={z} position={[0, 0.09, z]}>
          <mesh geometry={SHIP.lanternPost} material={trimMat} position={[0, 0.03, 0]} />
          <mesh geometry={SHIP.lantern} material={lanternMat} position={[0, 0.08, 0]} />
        </group>
      ))}
    </group>
  );
}

/** A knight after dark, by lantern-light: the classic figure, but with a lit lantern instead of a shield. */
const KNIGHT = {
  leg: new THREE.BoxGeometry(0.055, 0.15, 0.065),
  torso: new THREE.CylinderGeometry(0.075, 0.09, 0.17, 6),
  tabard: new THREE.BoxGeometry(0.1, 0.14, 0.02),
  cape: new THREE.BoxGeometry(0.17, 0.25, 0.02),
  arm: new THREE.BoxGeometry(0.045, 0.13, 0.045),
  helmet: new THREE.CylinderGeometry(0.072, 0.075, 0.13, 8),
  dome: new THREE.SphereGeometry(0.073, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
  face: new THREE.CircleGeometry(0.048, 18),
  visorSlit: new THREE.BoxGeometry(0.075, 0.012, 0.01),
  blade: new THREE.BoxGeometry(0.02, 0.24, 0.01),
  guard: new THREE.BoxGeometry(0.08, 0.018, 0.02),
  lanternCage: new THREE.BoxGeometry(0.052, 0.075, 0.052),
  lanternRoof: new THREE.ConeGeometry(0.042, 0.035, 4),
  handle: new THREE.TorusGeometry(0.024, 0.006, 4, 8),
};

/** Knight: the classic figure, holding a lit lantern up in its shield hand instead of a shield. */
function Knight({ metal, trim, cloth, faceMat, faceGeo, shadows, headY }: KnightFigureProps) {
  const s = shadows;
  return (
    <>
      <mesh geometry={KNIGHT.leg} material={trim} position={[-0.035, 0.075, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.leg} material={trim} position={[0.035, 0.075, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.torso} material={metal} position={[0, 0.235, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.tabard} material={cloth} position={[0, 0.225, 0.078]} />
      <mesh geometry={KNIGHT.cape} material={cloth} position={[0, 0.22, -0.085]} rotation={[0.18, 0, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.arm} material={metal} position={[-0.13, 0.26, 0.01]} rotation={[0, 0, 0.8]} castShadow={s} />
      <mesh geometry={KNIGHT.arm} material={metal} position={[0.11, 0.25, 0.02]} rotation={[0.5, 0, -0.2]} castShadow={s} />
      <mesh geometry={KNIGHT.helmet} material={metal} position={[0, headY - 0.05, 0]} castShadow={s} />
      <mesh geometry={KNIGHT.dome} material={metal} position={[0, headY + 0.015, 0]} castShadow={s} />
      {faceMat ? (
        <mesh geometry={faceGeo ?? KNIGHT.face} material={faceMat} position={[0, headY - 0.05, 0.0755]} />
      ) : (
        <>
          <mesh geometry={KNIGHT.face} material={mat(KNIGHT_STEEL.visor)} position={[0, headY - 0.05, 0.0755]} />
          <mesh geometry={KNIGHT.visorSlit} material={metal} position={[0, headY - 0.04, 0.078]} />
          <mesh geometry={KNIGHT.visorSlit} material={metal} position={[0, headY - 0.065, 0.078]} />
        </>
      )}
      {/* the lantern, held out to the left at shoulder height: the cage itself glows warm (like the
          tile and road lanterns above), so nothing opaque hides the light. */}
      <group position={[-0.2, 0.28, 0.05]}>
        <mesh geometry={KNIGHT.handle} material={trim} position={[0, 0.045, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={KNIGHT.lanternCage} material={lit(2.6)} castShadow={s} />
        <mesh geometry={KNIGHT.lanternRoof} material={trim} position={[0, 0.055, 0]} rotation={[0, Math.PI / 4, 0]} />
      </group>
      <group position={[0.14, 0.2, 0.07]}>
        <mesh geometry={KNIGHT.blade} material={mat('#dfe5ea', { rough: 0.35, metal: 0.6 })} position={[0, 0.15, 0]} castShadow={s} />
        <mesh geometry={KNIGHT.guard} material={mat('#8a6139')} position={[0, 0.02, 0]} />
      </group>
    </>
  );
}

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

/** City wall (C&K): the classic stone ring, three of its corners lit by a small glowing torch. */
const WALL = {
  ring: new THREE.CylinderGeometry(0.32, 0.35, 0.11, 6, 1, true),
  top: new THREE.TorusGeometry(0.335, 0.028, 4, 6),
  crenel: new THREE.BoxGeometry(0.07, 0.06, 0.045),
  torchPost: new THREE.CylinderGeometry(0.01, 0.012, 0.07, 5),
  torchFlame: new THREE.ConeGeometry(0.022, 0.05, 5),
  banner: new THREE.BoxGeometry(0.05, 0.045, 0.006),
};
const WALL_ANGLES = [0, 1, 2, 3, 4, 5].map((i) => (i * Math.PI) / 3);

/** The city wall: the classic ring, a torch glowing at alternating corners, a banner at the gate. */
function CityWall({ c }: { c: PieceColors }) {
  const stone = mat('#e8d9b5');
  const dark = mat('#5b4a36');
  return (
    <group rotation={[0, Math.PI / 6, 0]}>
      <mesh geometry={WALL.ring} material={stone} position={[0, 0.055, 0]} castShadow />
      <mesh geometry={WALL.top} material={dark} position={[0, 0.11, 0]} rotation={[Math.PI / 2, 0, 0]} />
      {WALL_ANGLES.map((a, i) => (
        <mesh key={i} geometry={WALL.crenel} material={dark} position={[Math.sin(a) * 0.335, 0.14, Math.cos(a) * 0.335]} rotation={[0, a, 0]} castShadow />
      ))}
      {[0, 2, 4].map((i) => {
        const a = WALL_ANGLES[i];
        return (
          <group key={i} position={[Math.sin(a) * 0.335, 0.14, Math.cos(a) * 0.335]} rotation={[0, a, 0]}>
            <mesh geometry={WALL.torchPost} material={dark} position={[0, 0.04, 0]} />
            <mesh geometry={WALL.torchFlame} material={lit(2.4)} position={[0, 0.085, 0]} />
          </group>
        );
      })}
      {/* A small banner in the owner's colour on the front crenel. */}
      <mesh geometry={WALL.banner} material={mat(c.hex)} position={[0, 0.185, 0.335]} />
    </group>
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

export const night: ThemeKit = { Settlement, City, Road, Tile, BarbarianShip, Knight, CityWall };
