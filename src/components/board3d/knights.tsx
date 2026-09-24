'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Topology } from '@/engine/board/topology';
import type { KnightLevel, PlayerColor } from '@/engine/types';
import { PLAYER_COLORS } from '@/shared/colors';
import { ARMOR_COLORS, DEFAULT_KNIGHT, type Emblem, type KnightCustomization } from '@/shared/knight';
import type { BoardScene } from '@/components/board/types';
import { drawEmblem } from '@/components/knight/emblems';
import { mat } from './materials';
import { TILE_TOP } from './terrain';

const emblemCache = new Map<string, THREE.CanvasTexture>();

function emblemTexture(emblem: Emblem, color: PlayerColor): THREE.CanvasTexture {
  const key = `${emblem}|${color}`;
  const hit = emblemCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const pc = PLAYER_COLORS[color];
  g.fillStyle = pc.hex;
  g.fillRect(0, 0, 128, 128);
  g.translate(64, 64);
  g.scale(4.2, 4.2);
  drawEmblem(g, emblem, pc.ink);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  emblemCache.set(key, tex);
  return tex;
}

const G = {
  base: new THREE.CylinderGeometry(0.17, 0.19, 0.05, 10),
  stud: new THREE.IcosahedronGeometry(0.028, 0),
  leg: new THREE.BoxGeometry(0.055, 0.15, 0.065),
  torso: new THREE.CylinderGeometry(0.075, 0.09, 0.17, 6),
  tabard: new THREE.BoxGeometry(0.1, 0.13, 0.02),
  cape: new THREE.BoxGeometry(0.17, 0.24, 0.02),
  arm: new THREE.BoxGeometry(0.045, 0.13, 0.045),
  head: new THREE.IcosahedronGeometry(0.068, 0),
  bascinet: new THREE.ConeGeometry(0.072, 0.13, 6),
  greathelm: new THREE.CylinderGeometry(0.07, 0.07, 0.12, 7),
  crown: new THREE.CylinderGeometry(0.058, 0.07, 0.04, 7, 1, true),
  horn: new THREE.ConeGeometry(0.018, 0.1, 5),
  plume: new THREE.ConeGeometry(0.03, 0.16, 5),
  visor: new THREE.BoxGeometry(0.1, 0.018, 0.02),
  shield: new THREE.CylinderGeometry(0.085, 0.085, 0.022, 14),
  shieldFace: new THREE.CircleGeometry(0.075, 16),
  blade: new THREE.BoxGeometry(0.022, 0.26, 0.01),
  guard: new THREE.BoxGeometry(0.08, 0.018, 0.02),
  shaft: new THREE.CylinderGeometry(0.012, 0.012, 0.38, 5),
  lanceTip: new THREE.ConeGeometry(0.025, 0.1, 5),
  axeHead: new THREE.BoxGeometry(0.07, 0.07, 0.012),
  maceHead: new THREE.IcosahedronGeometry(0.04, 0),
};

/**
 * Low-poly knight built from primitives; ~0.55 units tall at scale 1.
 * `level` adds gold studs on the base; an active knight glows.
 */
export function KnightModel({
  knight = DEFAULT_KNIGHT,
  color,
  level,
  active,
  shadows = true,
}: {
  knight?: KnightCustomization;
  color: PlayerColor;
  level?: KnightLevel;
  active?: boolean;
  shadows?: boolean;
}) {
  const pc = PLAYER_COLORS[color];
  const armor = ARMOR_COLORS[knight.armor];
  const face = useMemo(() => new THREE.MeshBasicMaterial({ map: emblemTexture(knight.emblem, color) }), [knight.emblem, color]);
  const metal = mat(armor.base, { rough: 0.45, metal: 0.55 });
  const trim = mat(armor.trim, { rough: 0.5, metal: 0.4 });
  const cloth = mat(pc.hex);
  const dark = mat('#1d1f22');
  const wood = mat('#8a6139');
  const steel = mat('#dfe5ea', { rough: 0.35, metal: 0.6 });
  const s = shadows;
  const headY = 0.47;
  return (
    <group>
      {level !== undefined && (
        <group>
          <mesh geometry={G.base} material={active ? mat(pc.hex, { emissive: '#f2b33d' }) : mat(pc.dark)} position={[0, 0.025, 0]} castShadow={s} />
          {Array.from({ length: level }, (_, i) => (
            <mesh key={i} geometry={G.stud} material={mat('#f2c14e', { metal: 0.6, rough: 0.3 })} position={[Math.cos(i * 0.9 - 0.9) * 0.15, 0.06, Math.sin(i * 0.9 - 0.9) * 0.15 + 0.03]} />
          ))}
        </group>
      )}
      <group position={[0, level !== undefined ? 0.05 : 0, 0]}>
        <mesh geometry={G.leg} material={trim} position={[-0.035, 0.075, 0]} castShadow={s} />
        <mesh geometry={G.leg} material={trim} position={[0.035, 0.075, 0]} castShadow={s} />
        <mesh geometry={G.torso} material={metal} position={[0, 0.235, 0]} castShadow={s} />
        <mesh geometry={G.tabard} material={cloth} position={[0, 0.225, 0.078]} />
        {knight.cape && <mesh geometry={G.cape} material={cloth} position={[0, 0.22, -0.085]} rotation={[0.18, 0, 0]} castShadow={s} />}
        <mesh geometry={G.arm} material={metal} position={[-0.11, 0.25, 0.01]} rotation={[0, 0, 0.25]} castShadow={s} />
        <mesh geometry={G.arm} material={metal} position={[0.11, 0.25, 0.02]} rotation={[0.5, 0, -0.2]} castShadow={s} />
        {/* head & helmet */}
        <mesh geometry={G.head} material={metal} position={[0, headY - 0.07, 0]} castShadow={s} />
        {knight.helmet === 'bascinet' && (
          <>
            <mesh geometry={G.bascinet} material={metal} position={[0, headY, 0]} castShadow={s} />
            <mesh geometry={G.visor} material={dark} position={[0, headY - 0.07, 0.06]} />
            <mesh geometry={G.stud} material={mat(knight.crest)} position={[0, headY + 0.07, 0]} />
          </>
        )}
        {knight.helmet === 'greathelm' && (
          <>
            <mesh geometry={G.greathelm} material={metal} position={[0, headY - 0.04, 0]} castShadow={s} />
            <mesh geometry={G.visor} material={dark} position={[0, headY - 0.04, 0.066]} />
          </>
        )}
        {knight.helmet === 'crowned' && (
          <>
            <mesh geometry={G.greathelm} material={metal} position={[0, headY - 0.04, 0]} castShadow={s} />
            <mesh geometry={G.visor} material={dark} position={[0, headY - 0.05, 0.066]} />
            <mesh geometry={G.crown} material={mat('#e3b94a', { metal: 0.7, rough: 0.3 })} position={[0, headY + 0.04, 0]} />
            <mesh geometry={G.stud} material={mat(knight.crest)} position={[0, headY + 0.04, 0.062]} />
          </>
        )}
        {knight.helmet === 'horned' && (
          <>
            <mesh geometry={G.greathelm} material={metal} position={[0, headY - 0.04, 0]} castShadow={s} />
            <mesh geometry={G.visor} material={dark} position={[0, headY - 0.05, 0.066]} />
            <mesh geometry={G.horn} material={mat('#efe6d2')} position={[-0.085, headY + 0.03, 0]} rotation={[0, 0, 0.9]} />
            <mesh geometry={G.horn} material={mat('#efe6d2')} position={[0.085, headY + 0.03, 0]} rotation={[0, 0, -0.9]} />
          </>
        )}
        {knight.helmet === 'plumed' && (
          <>
            <mesh geometry={G.greathelm} material={metal} position={[0, headY - 0.04, 0]} castShadow={s} />
            <mesh geometry={G.visor} material={dark} position={[0, headY - 0.05, 0.066]} />
            <mesh geometry={G.plume} material={mat(knight.crest)} position={[0, headY + 0.06, -0.03]} rotation={[-0.6, 0, 0]} castShadow={s} />
          </>
        )}
        {/* shield (left) */}
        <group position={[-0.14, 0.24, 0.05]} rotation={[Math.PI / 2, 0, 0.35]}>
          <mesh geometry={G.shield} material={trim} castShadow={s} />
          <mesh geometry={G.shieldFace} material={face} position={[0, -0.012, 0]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
        {/* weapon (right hand) */}
        <group position={[0.14, 0.2, 0.07]}>
          {knight.weapon === 'sword' && (
            <>
              <mesh geometry={G.blade} material={steel} position={[0, 0.15, 0]} castShadow={s} />
              <mesh geometry={G.guard} material={wood} position={[0, 0.02, 0]} />
            </>
          )}
          {knight.weapon === 'lance' && (
            <>
              <mesh geometry={G.shaft} material={wood} position={[0, 0.16, 0]} castShadow={s} />
              <mesh geometry={G.lanceTip} material={steel} position={[0, 0.39, 0]} />
            </>
          )}
          {knight.weapon === 'axe' && (
            <>
              <mesh geometry={G.shaft} material={wood} position={[0, 0.1, 0]} scale={[1, 0.7, 1]} castShadow={s} />
              <mesh geometry={G.axeHead} material={steel} position={[0.035, 0.22, 0]} />
            </>
          )}
          {knight.weapon === 'mace' && (
            <>
              <mesh geometry={G.shaft} material={wood} position={[0, 0.08, 0]} scale={[1, 0.6, 1]} castShadow={s} />
              <mesh geometry={G.maceHead} material={mat('#9aa3ab', { metal: 0.6, rough: 0.4 })} position={[0, 0.21, 0]} />
            </>
          )}
        </group>
      </group>
    </group>
  );
}

/** C&K knights standing on intersections. */
export function KnightPieces({ scene, topo }: { scene: BoardScene; topo: Topology }) {
  return (
    <group>
      {scene.knights.map((k, v) => {
        if (!k) return null;
        const p = topo.vertices[v];
        return (
          <group key={`k${v}`} position={[p.x, TILE_TOP, p.y]} scale={0.62}>
            <KnightModel knight={scene.styles[k.owner] ?? undefined} color={scene.colors[k.owner]} level={k.level} active={k.active} />
          </group>
        );
      })}
    </group>
  );
}

/** Slowly turning knight used for previews (profile page, create screen). */
export function TurntableKnight({ knight, color }: { knight: KnightCustomization; color: PlayerColor }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.7;
  });
  return (
    <group ref={ref} scale={2.6} position={[0, -0.7, 0]}>
      <KnightModel knight={knight} color={color} level={1} active />
    </group>
  );
}
