'use client';

import type { FC } from 'react';
import * as THREE from 'three';
import type { BoardThemeId } from '@/client/themes';
import { mat } from './materials';
import { gableRoof, lit, roofMat } from './themes/shared';
import type { ModelProps } from './themes/types';

/**
 * Metropolises (C&K): each theme's grander take on its city, standing in the city's place and
 * flying or showing `accent` (the improvement track's colour) so you can tell which track it is.
 * Drawn like a city model: y = 0 is the tile top, already scaled for the Board size setting.
 */
export type MetropolisProps = ModelProps & { accent: string };

const G = {
  pole: new THREE.CylinderGeometry(0.008, 0.008, 0.24, 4),
  flag: new THREE.BoxGeometry(0.13, 0.075, 0.01),
  keep: new THREE.BoxGeometry(0.24, 0.5, 0.24),
  merlon: new THREE.BoxGeometry(0.06, 0.06, 0.06),
  tower: new THREE.CylinderGeometry(0.075, 0.08, 0.36, 8),
  towerRoof: new THREE.ConeGeometry(0.1, 0.16, 8),
  door: new THREE.BoxGeometry(0.08, 0.12, 0.01),
  window: new THREE.BoxGeometry(0.045, 0.06, 0.01),
  tier: [0.4, 0.31, 0.23, 0.16].map((w) => new THREE.BoxGeometry(w, 0.1, w)),
  eave: [0.34, 0.27, 0.2, 0.14].map((r) => new THREE.ConeGeometry(r, 0.09, 4)),
  jewel: new THREE.IcosahedronGeometry(0.04, 0),
  spire: new THREE.CylinderGeometry(0.008, 0.012, 0.1, 4),
  hall: new THREE.BoxGeometry(0.46, 0.18, 0.26),
  hallRoof: gableRoof(0.32, 0.5, 0.22),
  stave: new THREE.BoxGeometry(0.12, 0.3, 0.12),
  staveRoof: new THREE.ConeGeometry(0.1, 0.22, 4),
  saloon: new THREE.BoxGeometry(0.44, 0.26, 0.26),
  facade: new THREE.BoxGeometry(0.5, 0.4, 0.03),
  bellTower: new THREE.BoxGeometry(0.13, 0.3, 0.13),
  bellRoof: new THREE.ConeGeometry(0.11, 0.1, 4),
  sign: new THREE.BoxGeometry(0.32, 0.08, 0.012),
  porch: new THREE.BoxGeometry(0.54, 0.025, 0.1),
  pyramid: new THREE.ConeGeometry(0.36, 0.48, 4),
  cap: new THREE.ConeGeometry(0.085, 0.1, 4),
  mooring: new THREE.CylinderGeometry(0.13, 0.15, 0.4, 10),
  mooringCap: new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
  mast: new THREE.CylinderGeometry(0.012, 0.012, 0.16, 5),
  envelope: new THREE.SphereGeometry(0.1, 14, 10),
  band: new THREE.CylinderGeometry(0.101, 0.101, 0.07, 14, 1, true),
  fin: new THREE.BoxGeometry(0.06, 0.08, 0.008),
  porthole: new THREE.TorusGeometry(0.045, 0.012, 6, 14),
  slab: new THREE.BoxGeometry(0.17, 0.48, 0.17),
  spireTower: new THREE.BoxGeometry(0.19, 0.74, 0.19),
  neonBand: new THREE.BoxGeometry(0.205, 0.035, 0.205),
  strip: new THREE.BoxGeometry(0.02, 0.6, 0.006),
  antenna: new THREE.CylinderGeometry(0.008, 0.008, 0.16, 4),
  beacon: new THREE.SphereGeometry(0.03, 8, 6),
  dome: new THREE.SphereGeometry(0.25, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
  plinth: new THREE.CylinderGeometry(0.3, 0.3, 0.07, 16),
  ring: new THREE.TorusGeometry(0.33, 0.018, 6, 32),
  light: new THREE.SphereGeometry(0.022, 6, 4),
  base: new THREE.BoxGeometry(0.5, 0.14, 0.28),
  peak: new THREE.ConeGeometry(0.1, 0.3, 4),
  peakTall: new THREE.ConeGeometry(0.13, 0.5, 4),
};

/** A flagpole standing at `y` with the track's flag at its top. */
function Flag({ x = 0, y, z = 0, accent, o }: { x?: number; y: number; z?: number; accent: string; o: ModelProps['o'] }) {
  return (
    <group position={[x, y, z]}>
      <mesh geometry={G.pole} material={mat('#3b2a1a', o)} position={[0, 0.12, 0]} />
      <mesh geometry={G.flag} material={mat(accent, o)} position={[0.068, 0.2, 0]} />
    </group>
  );
}

/** Classic: a battlemented keep between two round towers. */
function ClassicMetropolis({ c, o, ghost, accent }: MetropolisProps) {
  const s = !ghost;
  return (
    <>
      <mesh geometry={G.keep} material={mat(c.hex, o)} position={[0, 0.25, 0]} castShadow={s} />
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => (
        <mesh key={`${a}${b}`} geometry={G.merlon} material={mat(c.hex, o)} position={[a * 0.09, 0.53, b * 0.09]} castShadow={s} />
      ))}
      {[-0.19, 0.19].map((x) => (
        <group key={x} position={[x, 0, 0.03]}>
          <mesh geometry={G.tower} material={mat(c.hex, o)} position={[0, 0.18, 0]} castShadow={s} />
          <mesh geometry={G.towerRoof} material={mat(c.dark, o)} position={[0, 0.44, 0]} castShadow={s} />
        </group>
      ))}
      <mesh geometry={G.door} material={mat(c.dark, o)} position={[0, 0.06, 0.121]} />
      <Flag y={0.5} accent={accent} o={o} />
    </>
  );
}

/** Night: the classic castle with lantern-lit windows. */
function NightMetropolis(p: MetropolisProps) {
  return (
    <>
      <ClassicMetropolis {...p} />
      {[0.24, 0.38].map((y) => (
        <mesh key={y} geometry={G.window} material={lit('#ffc15a', 1.6, p.o)} position={[0, y, 0.121]} />
      ))}
      {[-0.19, 0.19].map((x) => (
        <mesh key={x} geometry={G.window} material={lit('#ffc15a', 1.6, p.o)} position={[x, 0.22, 0.111]} />
      ))}
    </>
  );
}

/** Sakura: a four-tier pagoda with a jewel of the track's colour on its spire. */
function SakuraMetropolis({ c, o, ghost, accent }: MetropolisProps) {
  const s = !ghost;
  let y = 0;
  return (
    <>
      {G.tier.map((tier, i) => {
        const at = y + 0.05;
        y += 0.15;
        return (
          <group key={i}>
            <mesh geometry={tier} material={mat(c.hex, o)} position={[0, at, 0]} castShadow={s} />
            <mesh geometry={G.eave[i]} material={mat(c.dark, o)} position={[0, at + 0.08, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={s} />
          </group>
        );
      })}
      <mesh geometry={G.spire} material={mat(c.dark, o)} position={[0, 0.66, 0]} />
      <mesh geometry={G.jewel} material={mat(accent, o)} position={[0, 0.73, 0]} castShadow={s} />
    </>
  );
}

/** Nordic: a great longhall beside a stave-church tower flying the track's banner. */
function NordicMetropolis({ c, o, ghost, accent }: MetropolisProps) {
  const s = !ghost;
  return (
    <>
      <mesh geometry={G.hall} material={mat(c.hex, o)} position={[0.03, 0.09, 0.03]} castShadow={s} />
      <mesh geometry={G.hallRoof} material={roofMat(c.dark, o)} position={[0.03, 0.18, 0.03]} rotation={[0, Math.PI / 2, 0]} castShadow={s} />
      <mesh geometry={G.stave} material={mat(c.hex, o)} position={[-0.17, 0.15, -0.1]} castShadow={s} />
      <mesh geometry={G.staveRoof} material={mat(c.dark, o)} position={[-0.17, 0.41, -0.1]} rotation={[0, Math.PI / 4, 0]} castShadow={s} />
      <Flag x={-0.17} y={0.5} z={-0.1} accent={accent} o={o} />
    </>
  );
}

/** Frontier: a grand hotel's false front with a bell tower, its sign painted in the track's colour. */
function FrontierMetropolis({ c, o, ghost, accent }: MetropolisProps) {
  const s = !ghost;
  return (
    <>
      <mesh geometry={G.saloon} material={mat(c.hex, o)} position={[0, 0.13, -0.02]} castShadow={s} />
      <mesh geometry={G.facade} material={mat(c.hex, o)} position={[0, 0.2, 0.125]} castShadow={s} />
      <mesh geometry={G.sign} material={mat(accent, o)} position={[0, 0.3, 0.142]} />
      <mesh geometry={G.porch} material={mat(c.dark, o)} position={[0, 0.15, 0.18]} castShadow={s} />
      <mesh geometry={G.door} material={mat(c.dark, o)} position={[0, 0.06, 0.141]} />
      <mesh geometry={G.bellTower} material={mat(c.hex, o)} position={[0, 0.41, -0.02]} castShadow={s} />
      <mesh geometry={G.bellRoof} material={mat(c.dark, o)} position={[0, 0.61, -0.02]} rotation={[0, Math.PI / 4, 0]} castShadow={s} />
    </>
  );
}

/** Nile: a pyramid, its capstone in the track's colour. */
function NileMetropolis({ c, o, ghost, accent }: MetropolisProps) {
  const s = !ghost;
  return (
    <>
      <mesh geometry={G.pyramid} material={mat(c.hex, o)} position={[0, 0.24, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={s} />
      <mesh geometry={G.cap} material={mat(accent, { ...o, metal: 0.3, rough: 0.45 })} position={[0, 0.455, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={s} />
      <mesh geometry={G.door} material={mat('#2a2018', o)} position={[0, 0.06, 0.2]} rotation={[-0.64, 0, 0]} />
    </>
  );
}

/** Skyport: a brass-ringed mooring tower with an airship tied up at its mast, banded in the track's colour. */
function SkyportMetropolis({ c, o, ghost, accent }: MetropolisProps) {
  const s = !ghost;
  const brass = mat('#b08d57', { ...o, metal: 0.5, rough: 0.4 });
  return (
    <>
      <mesh geometry={G.mooring} material={mat(c.hex, o)} position={[0, 0.2, 0]} castShadow={s} />
      <mesh geometry={G.mooringCap} material={mat(c.dark, o)} position={[0, 0.4, 0]} castShadow={s} />
      <mesh geometry={G.porthole} material={brass} position={[0, 0.22, 0.145]} />
      <mesh geometry={G.mast} material={brass} position={[0, 0.58, 0]} />
      <group position={[0.02, 0.7, 0]}>
        <mesh geometry={G.envelope} material={mat(c.hex, o)} scale={[2.6, 1, 1]} castShadow={s} />
        <mesh geometry={G.band} material={mat(accent, o)} rotation={[0, 0, Math.PI / 2]} />
        <mesh geometry={G.fin} material={mat(c.dark, o)} position={[-0.27, 0.05, 0]} />
        <mesh geometry={G.fin} material={mat(c.dark, o)} position={[-0.27, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]} />
      </group>
    </>
  );
}

/** Cyberpunk: twin towers, the taller one banded in neon of the track's colour with a beacon on top. */
function CyberpunkMetropolis({ c, o, ghost, accent }: MetropolisProps) {
  const s = !ghost;
  return (
    <>
      <mesh geometry={G.slab} material={mat(c.hex, o)} position={[-0.13, 0.24, 0.02]} castShadow={s} />
      <mesh geometry={G.spireTower} material={mat(c.hex, o)} position={[0.08, 0.37, -0.02]} castShadow={s} />
      {[-0.05, 0.03].map((dx) => (
        <mesh key={dx} geometry={G.strip} material={lit('#3de8ff', 1.4, o)} position={[0.08 + dx, 0.36, 0.076]} />
      ))}
      <mesh geometry={G.strip} material={lit('#3dffb0', 1.4, o)} position={[-0.13, 0.22, 0.087]} scale={[1, 0.6, 1]} />
      <mesh geometry={G.neonBand} material={lit(accent, 1.6, o)} position={[0.08, 0.66, -0.02]} />
      <mesh geometry={G.antenna} material={mat(c.dark, o)} position={[0.08, 0.82, -0.02]} />
      <mesh geometry={G.beacon} material={lit(accent, 2, o)} position={[0.08, 0.91, -0.02]} />
    </>
  );
}

/** Orbital: a great dome girdled by a ring in the track's colour, a beacon on its mast. */
function OrbitalMetropolis({ c, o, ghost, accent }: MetropolisProps) {
  const s = !ghost;
  return (
    <>
      <mesh geometry={G.plinth} material={mat(c.dark, o)} position={[0, 0.035, 0]} castShadow={s} />
      <mesh geometry={G.dome} material={mat(c.hex, o)} position={[0, 0.07, 0]} castShadow={s} />
      <mesh geometry={G.ring} material={lit(accent, 1.2, o)} position={[0, 0.2, 0]} rotation={[Math.PI / 2 - 0.25, 0, 0.1]} />
      {[-0.6, 0.2, 1].map((a) => (
        <mesh key={a} geometry={G.light} material={lit('#7fe3ff', 1.6, o)} position={[Math.sin(a) * 0.2, 0.2, Math.cos(a) * 0.2]} />
      ))}
      <mesh geometry={G.antenna} material={mat(c.dark, o)} position={[0, 0.39, 0]} />
      <mesh geometry={G.beacon} material={lit(accent, 2, o)} position={[0, 0.48, 0]} />
    </>
  );
}

/** Origami: three folded peaks on a wide base, a paper flag of the track's colour on the tallest. */
function OrigamiMetropolis({ c, o, ghost, accent }: MetropolisProps) {
  const s = !ghost;
  return (
    <>
      <mesh geometry={G.base} material={mat(c.hex, o)} position={[0, 0.07, 0]} castShadow={s} />
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} geometry={G.peak} material={mat(x < 0 ? c.hex : c.dark, o)} position={[x, 0.29, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={s} />
      ))}
      <mesh geometry={G.peakTall} material={mat(c.hex, o)} position={[0, 0.39, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={s} />
      <Flag y={0.6} accent={accent} o={o} />
    </>
  );
}

export const METROPOLIS: Record<BoardThemeId, FC<MetropolisProps>> = {
  classic: ClassicMetropolis,
  night: NightMetropolis,
  sakura: SakuraMetropolis,
  nordic: NordicMetropolis,
  frontier: FrontierMetropolis,
  nile: NileMetropolis,
  skyport: SkyportMetropolis,
  cyberpunk: CyberpunkMetropolis,
  orbital: OrbitalMetropolis,
  origami: OrigamiMetropolis,
};
