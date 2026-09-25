'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef, useState } from 'react';
import type * as THREE from 'three';
import type { Topology } from '@/engine/board/topology';
import type { PlayerColor } from '@/engine/types';
import type { BoardTargets } from '@/components/board/types';
import { GEO, mat } from './materials';
import { City, Road, Settlement } from './pieces';
import { TILE_TOP } from './terrain';

const AMBER = '#f2b33d';

function usePulse(offset = 0) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(state.clock.elapsedTime * 4 + offset) * 0.15;
    ref.current.scale.set(s, s, s);
  });
  return ref;
}

function pointer(e: ThreeEvent<PointerEvent>, on: boolean, set: (v: boolean) => void) {
  e.stopPropagation();
  set(on);
  document.body.style.cursor = on ? 'pointer' : '';
}

function click(e: ThreeEvent<MouseEvent>, fn: () => void) {
  if (e.delta > 6) return;
  e.stopPropagation();
  document.body.style.cursor = '';
  fn();
}

/** Build hints are offered, not asked for: still and cream (legible on every terrain), where a pick pulses amber. */
const hintMat = (hover: boolean) => mat(hover ? '#fff3cf' : '#f6eddb', { opacity: hover ? 1 : 0.9, emissive: '#f6eddb' });

function VertexTarget({
  x,
  z,
  id,
  kind,
  hint,
  color,
  onPick,
}: {
  x: number;
  z: number;
  id: number;
  kind: BoardTargets['kind'];
  hint?: boolean;
  color: PlayerColor | null;
  onPick: (id: number) => void;
}) {
  const [hover, setHover] = useState(false);
  const pulse = usePulse(id);
  const subtle = kind === 'knightAction';
  const lift = kind === 'city' ? 0.5 : kind === 'knightAction' ? 0.06 : 0.36;
  return (
    <group>
      {hover && color && kind === 'settlement' && <Settlement x={x} z={z} color={color} ghost />}
      {hover && color && kind === 'city' && <City x={x} z={z} color={color} ghost />}
      <mesh
        ref={hint && !subtle ? undefined : pulse}
        geometry={GEO.targetRing}
        material={
          subtle
            ? mat(hover ? '#fff3cf' : '#f6eddb', { opacity: hover ? 0.9 : 0.45 })
            : hint
              ? hintMat(hover)
              : mat(hover ? '#fff3cf' : AMBER, { emissive: AMBER })
        }
        position={[x, TILE_TOP + lift, z]}
        rotation={[Math.PI / 2, 0, 0]}
        scale={subtle ? 1.5 : 1}
      />
      <mesh
        geometry={GEO.targetHit}
        position={[x, TILE_TOP + 0.2, z]}
        visible={false}
        onPointerOver={(e) => pointer(e, true, setHover)}
        onPointerOut={(e) => pointer(e, false, setHover)}
        onClick={(e) => click(e, () => onPick(id))}
      />
    </group>
  );
}

function EdgeTarget({
  x,
  z,
  angle,
  id,
  hint,
  color,
  onPick,
}: {
  x: number;
  z: number;
  angle: number;
  id: number;
  hint?: boolean;
  color: PlayerColor | null;
  onPick: (id: number) => void;
}) {
  const [hover, setHover] = useState(false);
  const bar = usePulse(id * 0.7);
  return (
    <group>
      {hover && color && <Road x={x} z={z} angle={angle} color={color} ghost />}
      {hint ? (
        // A small ring on the edge's midpoint, like colonist's road hints.
        <mesh geometry={GEO.targetRing} material={hintMat(hover)} position={[x, TILE_TOP + 0.1, z]} rotation={[Math.PI / 2, 0, 0]} scale={0.7} />
      ) : (
        <mesh
          ref={bar}
          geometry={GEO.road}
          material={mat(hover ? '#fff3cf' : AMBER, { opacity: hover ? 0.2 : 0.75, emissive: AMBER })}
          position={[x, TILE_TOP + 0.08, z]}
          rotation={[0, -angle, 0]}
          scale={[0.7, 0.6, 0.6]}
        />
      )}
      <mesh
        geometry={GEO.edgeHit}
        position={[x, TILE_TOP + 0.08, z]}
        rotation={[0, -angle, 0]}
        visible={false}
        onPointerOver={(e) => pointer(e, true, setHover)}
        onPointerOut={(e) => pointer(e, false, setHover)}
        onClick={(e) => click(e, () => onPick(id))}
      />
    </group>
  );
}

function HexTarget({ x, z, id, onPick }: { x: number; z: number; id: number; onPick: (id: number) => void }) {
  const [hover, setHover] = useState(false);
  const ring = usePulse(id);
  return (
    <group>
      <mesh ref={ring} geometry={GEO.hexRing} material={mat(hover ? '#fff3cf' : AMBER, { emissive: AMBER })} position={[x, TILE_TOP + 0.08, z]} rotation={[Math.PI / 2, 0, Math.PI / 6]} />
      <mesh
        geometry={GEO.hexTile}
        position={[x, 0.05, z]}
        scale={[0.9, 1.4, 0.9]}
        visible={false}
        onPointerOver={(e) => pointer(e, true, setHover)}
        onPointerOut={(e) => pointer(e, false, setHover)}
        onClick={(e) => click(e, () => onPick(id))}
      />
    </group>
  );
}

export function Targets({
  targets,
  topo,
  color,
  onVertex,
  onEdge,
  onHex,
}: {
  targets: BoardTargets;
  topo: Topology;
  color: PlayerColor | null;
  onVertex?: (id: number) => void;
  onEdge?: (id: number) => void;
  onHex?: (id: number) => void;
}) {
  return (
    <group>
      {onVertex &&
        targets.vertices.map((id) => (
          <VertexTarget
            key={`v${id}`}
            id={id}
            x={topo.vertices[id].x}
            z={topo.vertices[id].y}
            kind={targets.vertexKinds?.[id] ?? targets.kind}
            hint={targets.hint}
            color={color}
            onPick={onVertex}
          />
        ))}
      {onEdge &&
        targets.edges.map((id) => (
          <EdgeTarget key={`e${id}`} id={id} x={topo.edges[id].x} z={topo.edges[id].y} angle={topo.edges[id].angle} hint={targets.hint} color={color} onPick={onEdge} />
        ))}
      {onHex && targets.hexes.map((id) => <HexTarget key={`h${id}`} id={id} x={topo.hexes[id].x} z={topo.hexes[id].y} onPick={onHex} />)}
    </group>
  );
}
