'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Topology } from '@/engine/board/topology';
import type { KnightLevel, PlayerColor } from '@/engine/types';
import { PLAYER_COLORS } from '@/shared/colors';
import { DEFAULT_KNIGHT, KNIGHT_STEEL, faceUrl, type KnightCustomization } from '@/shared/knight';
import type { BoardScene } from '@/components/board/types';
import { mat } from './materials';
import { useAppear } from './pieces';
import { TILE_TOP } from './terrain';

const faceCache = new Map<string, THREE.Texture>();

function faceTexture(id: string): THREE.Texture {
  let tex = faceCache.get(id);
  if (!tex) {
    tex = new THREE.TextureLoader().load(faceUrl(id));
    tex.colorSpace = THREE.SRGBColorSpace;
    faceCache.set(id, tex);
  }
  return tex;
}

const G = {
  base: new THREE.CylinderGeometry(0.17, 0.19, 0.05, 10),
  stud: new THREE.IcosahedronGeometry(0.028, 0),
  leg: new THREE.BoxGeometry(0.055, 0.15, 0.065),
  torso: new THREE.CylinderGeometry(0.075, 0.09, 0.17, 6),
  tabard: new THREE.BoxGeometry(0.1, 0.14, 0.02),
  cape: new THREE.BoxGeometry(0.17, 0.25, 0.02),
  arm: new THREE.BoxGeometry(0.045, 0.13, 0.045),
  helmet: new THREE.CylinderGeometry(0.072, 0.075, 0.13, 8),
  dome: new THREE.SphereGeometry(0.073, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2),
  face: new THREE.CircleGeometry(0.048, 18),
  visorSlit: new THREE.BoxGeometry(0.075, 0.012, 0.01),
  plume: new THREE.ConeGeometry(0.03, 0.16, 5),
  shield: new THREE.CylinderGeometry(0.085, 0.085, 0.022, 14),
  boss: new THREE.IcosahedronGeometry(0.022, 0),
  blade: new THREE.BoxGeometry(0.022, 0.26, 0.01),
  guard: new THREE.BoxGeometry(0.08, 0.018, 0.02),
};

/**
 * The basic low-poly knight (~0.6 units tall at scale 1) in the player's color, optionally wearing
 * the player's uploaded face. `level` adds gold studs on the base; an active knight glows.
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
  const faceMat = useMemo(
    () => (knight.face ? new THREE.MeshBasicMaterial({ map: faceTexture(knight.face) }) : null),
    [knight.face],
  );
  const metal = mat(KNIGHT_STEEL.base, { rough: 0.45, metal: 0.55 });
  const trim = mat(KNIGHT_STEEL.trim, { rough: 0.5, metal: 0.4 });
  const cloth = mat(pc.hex);
  const s = shadows;
  const headY = 0.46;
  return (
    <group>
      {level !== undefined && (
        <group>
          <mesh geometry={G.base} material={active ? mat(pc.hex, { emissive: '#f2b33d' }) : mat(pc.dark)} position={[0, 0.025, 0]} castShadow={s} />
          {Array.from({ length: level }, (_, i) => (
            <mesh
              key={i}
              geometry={G.stud}
              material={mat('#f2c14e', { metal: 0.6, rough: 0.3 })}
              position={[Math.cos(i * 0.9 - 0.9) * 0.15, 0.06, Math.sin(i * 0.9 - 0.9) * 0.15 + 0.03]}
            />
          ))}
        </group>
      )}
      <group position={[0, level !== undefined ? 0.05 : 0, 0]}>
        <mesh geometry={G.leg} material={trim} position={[-0.035, 0.075, 0]} castShadow={s} />
        <mesh geometry={G.leg} material={trim} position={[0.035, 0.075, 0]} castShadow={s} />
        <mesh geometry={G.torso} material={metal} position={[0, 0.235, 0]} castShadow={s} />
        <mesh geometry={G.tabard} material={cloth} position={[0, 0.225, 0.078]} />
        <mesh geometry={G.cape} material={cloth} position={[0, 0.22, -0.085]} rotation={[0.18, 0, 0]} castShadow={s} />
        <mesh geometry={G.arm} material={metal} position={[-0.11, 0.25, 0.01]} rotation={[0, 0, 0.25]} castShadow={s} />
        <mesh geometry={G.arm} material={metal} position={[0.11, 0.25, 0.02]} rotation={[0.5, 0, -0.2]} castShadow={s} />
        {/* helmet with a face opening */}
        <mesh geometry={G.helmet} material={metal} position={[0, headY - 0.05, 0]} castShadow={s} />
        <mesh geometry={G.dome} material={metal} position={[0, headY + 0.015, 0]} castShadow={s} />
        {faceMat ? (
          <mesh geometry={G.face} material={faceMat} position={[0, headY - 0.05, 0.0755]} />
        ) : (
          <>
            <mesh geometry={G.face} material={mat(KNIGHT_STEEL.visor)} position={[0, headY - 0.05, 0.0755]} />
            <mesh geometry={G.visorSlit} material={metal} position={[0, headY - 0.04, 0.078]} />
            <mesh geometry={G.visorSlit} material={metal} position={[0, headY - 0.065, 0.078]} />
          </>
        )}
        <mesh geometry={G.plume} material={cloth} position={[0, headY + 0.1, -0.03]} rotation={[-0.6, 0, 0]} castShadow={s} />
        {/* shield (left) and sword (right) */}
        <group position={[-0.14, 0.24, 0.05]} rotation={[Math.PI / 2, 0, 0.35]}>
          <mesh geometry={G.shield} material={cloth} castShadow={s} />
          <mesh geometry={G.boss} material={trim} position={[0, -0.015, 0]} />
        </group>
        <group position={[0.14, 0.2, 0.07]}>
          <mesh geometry={G.blade} material={mat('#dfe5ea', { rough: 0.35, metal: 0.6 })} position={[0, 0.15, 0]} castShadow={s} />
          <mesh geometry={G.guard} material={mat('#8a6139')} position={[0, 0.02, 0]} />
        </group>
      </group>
    </group>
  );
}

/** A knight on the board: pops in when recruited; active knights stand ready with a gentle bob. */
function BoardKnight({ x, z, active, children }: { x: number; z: number; active: boolean; children: React.ReactNode }) {
  const ref = useAppear();
  const bob = useRef<THREE.Group>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame((state) => {
    if (!bob.current) return;
    bob.current.position.y = active ? Math.abs(Math.sin(state.clock.elapsedTime * 2.2 + phase)) * 0.05 : 0;
  });
  return (
    <group ref={ref} position={[x, TILE_TOP, z]} scale={0.001}>
      <group scale={0.62}>
        <group ref={bob}>{children}</group>
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
          <BoardKnight key={`k${k.id}`} x={p.x} z={p.y} active={k.active}>
            <KnightModel knight={scene.styles[k.owner] ?? undefined} color={scene.colors[k.owner]} level={k.level} active={k.active} />
          </BoardKnight>
        );
      })}
    </group>
  );
}

/** Slowly turning knight used for previews (profile page). */
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
