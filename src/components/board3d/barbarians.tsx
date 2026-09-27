'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Topology } from '@/engine/board/topology';
import { BARBARIAN_HEADER_H, BARBARIAN_STEP_R, barbarianTrackLayout } from '../board/barbarian';
import { faceCamera } from './faceCamera';
import { mat } from './materials';
import { usePieceScale } from './pieceScale';
import { useBoardKit, useBoardPalette } from './themes';
import { barbarianStatusTexture } from './textures';

export interface BarbarianInfo {
  position: number;
  distance: number;
  strength: number;
  defense: number;
}

/** Wood tones for the sea-steps and hull when a theme doesn't set its own pier colours. */
const NEUTRAL_WOOD = { deck: '#9c6f42', plank: '#8a6139', post: '#6b4a2b' };
const DANGER = '#e0503a';
const LANDING = '#f2b33d';
/** Floats the hull just clear of the step plates (their top sits at ~0.035) so it reads as resting on the water beside them, not sunk into one. */
const HULL_CLEAR = 0.075;

/** Shared, cheap low-poly geometry for the whole track — built once at module load. */
const GEO = {
  // a low hexagonal raft plate; neighbours nearly touch, with a thin seam of sea between them
  plate: new THREE.CylinderGeometry(BARBARIAN_STEP_R * 0.93, BARBARIAN_STEP_R * 0.96, 0.07, 6),
  plateTop: new THREE.CylinderGeometry(BARBARIAN_STEP_R * 0.74, BARBARIAN_STEP_R * 0.74, 0.012, 6),
  // the longship: a tapered hull, mast, striped sail and a shield-wall along the gunwales
  hullMid: new THREE.BoxGeometry(0.16, 0.08, 0.2),
  hullBow: new THREE.ConeGeometry(0.085, 0.16, 4),
  hullStern: new THREE.ConeGeometry(0.075, 0.11, 4),
  prowCurl: new THREE.TorusGeometry(0.06, 0.015, 4, 8, Math.PI * 1.4),
  mast: new THREE.CylinderGeometry(0.011, 0.011, 0.32, 5),
  yard: new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4),
  sail: new THREE.BoxGeometry(0.22, 0.16, 0.012),
  stripe: new THREE.BoxGeometry(0.034, 0.16, 0.014),
  shield: new THREE.CylinderGeometry(0.032, 0.032, 0.016, 8),
  // the status sign above the field (a 2:1 plane)
  sign: new THREE.PlaneGeometry(0.96, 0.48),
};

/** A hexagonal sea-step; the landing (last) step glows warm orange, red when the barbarians are close. */
function Step({ x, z, landing, danger, wood }: { x: number; z: number; landing: boolean; danger: boolean; wood: typeof NEUTRAL_WOOD }) {
  const glow = landing ? (danger ? DANGER : LANDING) : null;
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={GEO.plate} material={glow ? mat(glow, { emissive: glow, glow: 0.6 }) : mat(wood.post)} castShadow />
      <mesh geometry={GEO.plateTop} material={glow ? mat('#fbe3b0', { emissive: glow, glow: 0.4 }) : mat(wood.deck)} position={[0, 0.041, 0]} />
    </group>
  );
}

/** The steps rise and fall together on the swell, so the strip stays joined. */
function Swell({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current) ref.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.015;
  });
  return <group ref={ref}>{children}</group>;
}

/** The dark field on the water under the status sign and the steps, like the 2D board's panel. */
function Field({ x, top, bottom, width }: { x: number; top: number; bottom: number; width: number }) {
  const geometry = useMemo(() => {
    const [w, h, rr] = [width, bottom - top, 0.16];
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + rr, 0);
    shape.lineTo(w / 2 - rr, 0);
    shape.quadraticCurveTo(w / 2, 0, w / 2, rr);
    shape.lineTo(w / 2, h - rr);
    shape.quadraticCurveTo(w / 2, h, w / 2 - rr, h);
    shape.lineTo(-w / 2 + rr, h);
    shape.quadraticCurveTo(-w / 2, h, -w / 2, h - rr);
    shape.lineTo(-w / 2, rr);
    shape.quadraticCurveTo(-w / 2, 0, -w / 2 + rr, 0);
    // Shape y runs down the field (world +z) once laid flat.
    return new THREE.ShapeGeometry(shape).rotateX(Math.PI / 2);
  }, [width, top, bottom]);
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: '#0b2233', transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }), []);
  return <mesh geometry={geometry} material={material} position={[x, 0.005, top]} />;
}

/** Above the field, turned to the camera: the barbarians' strength against the island's knight defense. */
function StatusSign({ x, z, strength, defense }: { x: number; z: number; strength: number; defense: number }) {
  const ref = useRef<THREE.Group>(null);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ map: barbarianStatusTexture(strength, defense), transparent: true, depthWrite: false, fog: false, toneMapped: false }),
    [strength, defense],
  );
  useFrame((state) => {
    if (ref.current) faceCamera(ref.current, state.camera);
  });
  return (
    <group ref={ref} position={[x, 0.3, z]}>
      {/* Stood up to face the default camera (about 50° above the table); drawn after the field under it. */}
      <mesh geometry={GEO.sign} material={material} rotation={[-0.68, 0, 0]} renderOrder={2} />
    </group>
  );
}

/** The low-poly Viking longship: hull, curled prow, striped sail and a row of round shields. */
function Longship({ danger, wood }: { danger: boolean; wood: typeof NEUTRAL_WOOD }) {
  const hullMat = mat(danger ? DANGER : wood.deck, danger ? { emissive: DANGER, glow: 0.35 } : {});
  const trimMat = mat(wood.post);
  const sailMat = mat(danger ? '#f3d9d3' : '#f6eddb');
  const stripeMat = mat(danger ? '#8a1f14' : '#a83b2e');
  const shieldA = mat(danger ? '#8a1f14' : '#a83b2e');
  const shieldB = mat('#f6eddb');
  const shields = [-0.06, 0, 0.06];
  return (
    <group>
      {/* hull */}
      <mesh geometry={GEO.hullMid} material={hullMat} position={[0, 0.04, 0]} castShadow />
      <mesh geometry={GEO.hullBow} material={hullMat} position={[0, 0.04, 0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow />
      <mesh geometry={GEO.hullStern} material={hullMat} position={[0, 0.04, -0.155]} rotation={[-Math.PI / 2, 0, 0]} castShadow />
      <mesh geometry={GEO.prowCurl} material={trimMat} position={[0, 0.1, 0.27]} rotation={[0.3, 0, 0]} />
      {/* mast, yard and striped sail */}
      <mesh geometry={GEO.mast} material={trimMat} position={[0, 0.21, 0]} />
      <mesh geometry={GEO.yard} material={trimMat} position={[0, 0.31, 0]} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={GEO.sail} material={sailMat} position={[0, 0.26, 0]} />
      <mesh geometry={GEO.stripe} material={stripeMat} position={[-0.07, 0.26, 0.008]} />
      <mesh geometry={GEO.stripe} material={stripeMat} position={[0.07, 0.26, 0.008]} />
      {/* shield-wall along both gunwales */}
      {shields.map((sz, i) => (
        <group key={`l${i}`}>
          <mesh geometry={GEO.shield} material={i % 2 ? shieldA : shieldB} position={[-0.1, 0.07, sz]} rotation={[0, 0, Math.PI / 2]} />
          <mesh geometry={GEO.shield} material={i % 2 ? shieldB : shieldA} position={[0.1, 0.07, sz]} rotation={[0, 0, Math.PI / 2]} />
        </group>
      ))}
    </group>
  );
}

/** The barbarian ship: glides to its current step and bobs at anchor. */
function Ship({ x, z, danger, wood, k }: { x: number; z: number; danger: boolean; wood: typeof NEUTRAL_WOOD; k: number }) {
  const anchor = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3(x, HULL_CLEAR, z));
  target.current.set(x, HULL_CLEAR, z);
  const ShipModel = useBoardKit().BarbarianShip;
  useFrame((state) => {
    const g = anchor.current;
    if (!g) return;
    g.position.lerp(target.current, 0.1);
    const t = state.clock.elapsedTime;
    g.position.y = HULL_CLEAR + Math.sin(t * 1.3) * 0.025;
    if (tilt.current) {
      tilt.current.rotation.z = Math.sin(t * 1.1) * 0.05;
      tilt.current.rotation.x = Math.cos(t * 0.9) * 0.03;
    }
  });
  return (
    <group ref={anchor} position={[x, HULL_CLEAR, z]} scale={k}>
      <group ref={tilt} scale={1.7}>
        {ShipModel ? <ShipModel danger={danger} /> : <Longship danger={danger} wood={wood} />}
      </group>
    </group>
  );
}

/**
 * The barbarian ship's voyage (C&K), on the board: a column of sea-steps west of the island with
 * the landing highlighted, and the ship itself sailing down it. `topo` positions everything in the
 * same topology-local units as the rest of the island, so it lines up on every board size/layout.
 */
export function Barbarians({ barbarian, topo }: { barbarian: BarbarianInfo; topo: Topology }) {
  const palette = useBoardPalette();
  const wood = palette.pier ?? NEUTRAL_WOOD;
  const k = usePieceScale();
  const steps = barbarian.distance + 1;
  const layout = useMemo(() => barbarianTrackLayout(topo, steps), [topo, steps]);
  const danger = barbarian.position >= barbarian.distance - 2;
  return (
    <group>
      <Swell>
        {Array.from({ length: steps }, (_, i) => (
          <Step key={i} x={layout.at(i).x} z={layout.at(i).y} landing={i === barbarian.distance} danger={danger} wood={wood} />
        ))}
      </Swell>
      <Field
        x={layout.header.x}
        top={layout.header.y - BARBARIAN_HEADER_H / 2 - 0.05}
        bottom={layout.at(steps - 1).y + layout.r + 0.1}
        width={(Math.sqrt(3) / 2) * layout.r * 2 + (Math.sqrt(3) / 2) * layout.r + 0.2}
      />
      <StatusSign x={layout.header.x} z={layout.header.y} strength={barbarian.strength} defense={barbarian.defense} />
      <Ship x={layout.at(barbarian.position).x} z={layout.at(barbarian.position).y} danger={danger} wood={wood} k={k} />
    </group>
  );
}
