'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { getTopology } from '@/engine/board/topology';
import { SEA } from '@/client/palette';
import type { BoardProps, BoardScene, BoardTargets } from '@/components/board/types';
import { City, HarborPiece, NumberToken, Road, Robber, Settlement } from './pieces';
import { Targets } from './targets';
import { HexTile } from './terrain';
import { Ocean } from './ocean';
import { displayFont, resetTextureCache } from './textures';
import { KnightPieces } from './knights';

/** Aiming the camera slightly "below" the island centre lifts it above the bottom dock. */
const GAME_TARGET_Z = 1.3;

/** Waits for the display font so canvas textures (tokens, harbors) use it. */
function useFontReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const family = displayFont();
    Promise.race([document.fonts.load(`800 100px ${family}`), new Promise((r) => setTimeout(r, 1500))])
      .catch(() => undefined)
      .then(() => {
        if (!alive) return;
        resetTextureCache();
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

/**
 * Pulls the camera back on narrow/portrait screens so the whole island fits. In showcase mode on
 * wide screens the camera aims left of the island so it sits to the right of the page copy.
 */
function FitCamera({ showcase }: { showcase: boolean }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const k = aspect < 1 ? 1 + (1 - aspect) * 1.25 : aspect < 1.3 ? 1.08 : 1;
    const shift = showcase && aspect > 1.2 ? -Math.min(4.2, (aspect - 1) * 5) : 0;
    const base = showcase ? [0, 8.6, 11] : [0, 12.2, 9.4];
    camera.position.set(base[0] * k + shift, base[1] * k, base[2] * k);
    camera.lookAt(shift, 0, showcase ? 0.3 : GAME_TARGET_Z);
  }, [camera, size.width, size.height, showcase]);
  return null;
}

function Spin({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.06;
  });
  return <group ref={ref}>{children}</group>;
}

function Island({
  scene,
  targets,
  shadows,
  onVertex,
  onEdge,
  onHex,
  fontsReady,
}: {
  scene: BoardScene;
  targets: BoardTargets;
  shadows: boolean;
  onVertex?: (id: number) => void;
  onEdge?: (id: number) => void;
  onHex?: (id: number) => void;
  fontsReady: boolean;
}) {
  const topo = getTopology(scene.board.hexes);
  const robberHex = topo.hexes[scene.robber];
  const hexTargetSet = useMemo(() => new Set(targets.hexes), [targets.hexes]);
  return (
    <group>
      {scene.board.hexes.map((hex) => {
        const t = topo.hexes[hex.id];
        const producing = scene.highlightToken !== null && hex.token === scene.highlightToken && hex.id !== scene.robber;
        return (
          <HexTile
            key={hex.id}
            hex={hex}
            x={t.x}
            z={t.y}
            shadows={shadows}
            producing={producing}
            onClick={hexTargetSet.has(hex.id) && onHex ? () => onHex(hex.id) : undefined}
          />
        );
      })}
      <group key={fontsReady ? 'fonts' : 'fallback'}>
        {scene.board.hexes.map((hex) =>
          hex.token ? (
            <NumberToken
              key={hex.id}
              n={hex.token}
              x={topo.hexes[hex.id].x}
              z={topo.hexes[hex.id].y}
              lit={scene.highlightToken === hex.token && hex.id !== scene.robber}
            />
          ) : null,
        )}
        {scene.board.harbors.map((h) => (
          <HarborPiece key={h.edge} harbor={h} topo={topo} />
        ))}
      </group>
      {scene.roads.map((owner, e) =>
        owner === null ? null : (
          <Road key={`r${e}`} x={topo.edges[e].x} z={topo.edges[e].y} angle={topo.edges[e].angle} color={scene.colors[owner]} />
        ),
      )}
      {scene.buildings.map((b, v) => {
        if (!b) return null;
        const p = topo.vertices[v];
        return b.city ? (
          <City key={`b${v}`} x={p.x} z={p.y} color={scene.colors[b.owner]} />
        ) : (
          <Settlement key={`b${v}`} x={p.x} z={p.y} color={scene.colors[b.owner]} />
        );
      })}
      <KnightPieces scene={scene} topo={topo} />
      <Robber x={robberHex.x} z={robberHex.y + 0.46} />
      <Targets targets={targets} topo={topo} color={scene.myColor} onVertex={onVertex} onEdge={onEdge} onHex={onHex} />
    </group>
  );
}

export default function Board3D({ scene, targets, onVertex, onEdge, onHex, showcase = false, quality = 'high' }: BoardProps) {
  const shadows = quality === 'high';
  const fontsReady = useFontReady();
  const island = (
    <Island scene={scene} targets={targets} shadows={shadows} onVertex={onVertex} onEdge={onEdge} onHex={onHex} fontsReady={fontsReady} />
  );
  const backdrop = showcase ? '#061419' : SEA.sky;
  return (
    <Canvas
      shadows={shadows ? 'percentage' : false}
      dpr={[1, quality === 'high' ? 2 : 1.25]}
      camera={{ position: [0, 11, 8.5], fov: 38, near: 0.1, far: 120 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerMissed={() => {
        document.body.style.cursor = '';
      }}
    >
      <color attach="background" args={[backdrop]} />
      <fog attach="fog" args={[backdrop, showcase ? 14 : 18, showcase ? 34 : 44]} />
      <hemisphereLight args={['#e6f3ff', '#1d3b2c', 0.9]} />
      <ambientLight intensity={0.18} />
      <directionalLight
        position={[5, 12, 6]}
        intensity={1.9}
        color="#fff4e0"
        castShadow={shadows}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />
      <Ocean animate={quality === 'high'} />
      <FitCamera showcase={showcase} />
      {showcase ? (
        <Spin>{island}</Spin>
      ) : (
        <>
          {island}
          <OrbitControls
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            minDistance={6}
            maxDistance={24}
            minPolarAngle={0.12}
            maxPolarAngle={1.2}
            target={[0, 0, GAME_TARGET_Z]}
          />
        </>
      )}
    </Canvas>
  );
}
