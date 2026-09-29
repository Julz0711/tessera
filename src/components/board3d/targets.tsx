'use client';

import { Html } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef, useState, type ReactNode } from 'react';
import type * as THREE from 'three';
import type { Topology } from '@/engine/board/topology';
import type { Board, PlayerColor } from '@/engine/types';
import type { BoardTargets } from '@/components/board/types';
import { GEO, mat } from './materials';
import { City, Road, Robber, Settlement } from './pieces';
import { TILE_TOP } from './terrain';
import { Pirate, Ship } from './voyage';

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

/** Build hints only show on hover: a ghost of the piece, or a cream ring (legible on every terrain). */
const hintMat = mat('#fff3cf', { opacity: 1, emissive: '#f6eddb' });

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
  const ghost = kind === 'settlement' || kind === 'city';
  const lift = kind === 'city' ? 0.5 : kind === 'knightAction' || kind === 'wall' ? 0.06 : 0.36;
  const quiet = hint && !subtle;
  return (
    <group>
      {hover && color && kind === 'settlement' && <Settlement x={x} z={z} color={color} ghost />}
      {hover && color && kind === 'city' && <City x={x} z={z} color={color} ghost />}
      {(!quiet || (hover && !ghost)) && (
        <mesh
          ref={quiet ? undefined : pulse}
          geometry={GEO.targetRing}
          material={
            subtle ? mat(hover ? '#fff3cf' : '#f6eddb', { opacity: hover ? 0.9 : 0.45 }) : quiet ? hintMat : mat(hover ? '#fff3cf' : AMBER, { emissive: AMBER })
          }
          position={[x, TILE_TOP + lift, z]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={subtle || kind === 'wall' ? 1.5 : 1}
        />
      )}
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
  ship,
  sail,
}: {
  x: number;
  z: number;
  angle: number;
  id: number;
  hint?: boolean;
  color: PlayerColor | null;
  onPick: (id: number) => void;
  ship?: boolean;
  /** One of your ships that can sail: no ghost, just a glow on hover. */
  sail?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const bar = usePulse(id * 0.7);
  return (
    <group>
      {hover && color && !sail && (ship ? <Ship x={x} z={z} angle={angle} color={color} ghost /> : <Road x={x} z={z} angle={angle} color={color} ghost />)}
      {(sail ? !hover : hint) ? null : (
        <mesh
          ref={bar}
          geometry={GEO.road}
          material={mat(hover && !sail ? '#fff3cf' : AMBER, { opacity: hover && !sail ? 0.2 : 0.75, emissive: AMBER })}
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

/** The spot whose popup is open (a build, or the robber's next hex): its ghost stays, with the popup above it. */
function ArmedSpot({ armed, topo, board, color, popup }: { armed: NonNullable<BoardTargets['armed']>; topo: Topology; board: Board; color: PlayerColor | null; popup?: ReactNode }) {
  const p = armed.target === 'edge' ? topo.edges[armed.at] : armed.target === 'hex' ? topo.hexes[armed.at] : topo.vertices[armed.at];
  const x = p.x;
  const z = p.y;
  // A hex's popup floats higher, clear of the whole tile (its number and the ghost robber stay in view).
  const lift = armed.target === 'hex' ? 1.3 : 0.45;
  return (
    <group>
      {armed.what === 'robber' && (board.hexes[armed.at].terrain === 'sea' ? <Pirate x={x} z={z} ghost /> : <Robber x={x} z={z + 0.46} ghost />)}
      {color && armed.what === 'ship' && <Ship x={x} z={z} angle={topo.edges[armed.at].angle} color={color} ghost />}
      {color && armed.what === 'road' && <Road x={x} z={z} angle={topo.edges[armed.at].angle} color={color} ghost />}
      {color && armed.what === 'settlement' && <Settlement x={x} z={z} color={color} ghost />}
      {color && armed.what === 'city' && <City x={x} z={z} color={color} ghost />}
      {(armed.what === 'knight' || armed.what === 'wall') && (
        <mesh geometry={GEO.targetRing} material={hintMat} position={[x, TILE_TOP + 0.06, z]} rotation={[Math.PI / 2, 0, 0]} scale={1.5} />
      )}
      {popup && (
        <Html position={[x, TILE_TOP + lift, z]} zIndexRange={[30, 0]} style={{ pointerEvents: 'none' }}>
          {/* Clicks on the popup mustn't reach the board (they'd count as a click away). */}
          <div
            style={{ transform: 'translate(-50%, calc(-100% - 10px))', pointerEvents: 'auto' }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {popup}
          </div>
        </Html>
      )}
    </group>
  );
}

export function Targets({
  targets,
  topo,
  board,
  color,
  popup,
  onVertex,
  onEdge,
  onHex,
}: {
  targets: BoardTargets;
  topo: Topology;
  board: Board;
  color: PlayerColor | null;
  popup?: ReactNode;
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
          <EdgeTarget
            key={`e${id}`}
            id={id}
            x={topo.edges[id].x}
            z={topo.edges[id].y}
            angle={topo.edges[id].angle}
            hint={targets.hint}
            color={color}
            onPick={onEdge}
            ship={(targets.edgeKinds?.[id] ?? targets.kind) === 'ship'}
            sail={targets.edgeKinds?.[id] === 'shipAction'}
          />
        ))}
      {onHex && targets.hexes.map((id) => <HexTarget key={`h${id}`} id={id} x={topo.hexes[id].x} z={topo.hexes[id].y} onPick={onHex} />)}
      {targets.armed && <ArmedSpot armed={targets.armed} topo={topo} board={board} color={color} popup={popup} />}
    </group>
  );
}
