'use client';

import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MOUSE } from 'three';
import type * as THREE from 'three';
import { STANDARD_HEX_COORDS, getTopology, type Topology } from '@/engine/board/topology';
import { PALETTES } from '@/client/themes';
import type { BoardProps, BoardScene, BoardTargets } from '@/components/board/types';
import { barbarianTrackLayout } from '@/components/board/barbarian';
import { Barbarians } from './barbarians';
import { City, CityWall, HarborPiece, Merchant, MetropolisTower, NumberToken, Road, Robber, Settlement } from './pieces';
import { Targets } from './targets';
import { Pirate, Ship, TreasureChest } from './voyage';
import { HexTile } from './terrain';
import { HORIZON_HALF, Sea } from './ocean';
import { displayFont, resetTextureCache } from './textures';
import { KnightPieces } from './knights';
import { PieceScale } from './pieceScale';
import { BoardThemeContext } from './themes';
import { Weather } from './weather';

/** Aiming the camera slightly "below" the island centre lifts it above the bottom dock. */
const GAME_TARGET_Z = 1.3;
/** The sea's swells peak at y≈0.02 and the seams between tiles bottom out at y≈0.01. */
const ISLAND_LIFT = 0.08;

/**
 * Centre of a board, how far its corners reach from there (the large map sits off-centre) and how
 * much wider than tall it is (Long Isle).
 */
function boardFrame(topo: Topology): { cx: number; cz: number; extent: number; aspect: number } {
  const xs = topo.hexes.map((h) => h.x);
  const zs = topo.hexes.map((h) => h.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  const extent = Math.max(...topo.vertices.map((v) => Math.hypot(v.x - cx, v.y - cz)));
  const aspect = (Math.max(...xs) - Math.min(...xs) + 2) / (Math.max(...zs) - Math.min(...zs) + 2);
  return { cx, cz, extent, aspect };
}

const STANDARD_EXTENT = boardFrame(getTopology(STANDARD_HEX_COORDS)).extent;

/** Whether the screen is clearly wider than tall (desktop, a phone on its side). */
function useLandscape(): boolean {
  const [landscape, setLandscape] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-aspect-ratio: 6/5)');
    const update = () => setLandscape(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return landscape;
}

/** Keeps a panned camera over the island: pulls the orbit target back (camera and all) past `radius`. */
function keepOverIsland(controls: { target: THREE.Vector3; object: THREE.Camera }, radius: number): void {
  const t = controls.target;
  const dz = t.z - GAME_TARGET_Z;
  const d = Math.hypot(t.x, dz);
  if (d <= radius) return;
  const k = radius / d;
  const x = t.x * k;
  const z = GAME_TARGET_Z + dz * k;
  controls.object.position.x += x - t.x;
  controls.object.position.z += z - t.z;
  t.set(x, t.y, z);
}

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
function FitCamera({ showcase, scale }: { showcase: boolean; scale: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const k = (aspect < 1 ? 1 + (1 - aspect) * 1.25 : aspect < 1.3 ? 1.08 : 1) * scale;
    const shift = showcase && aspect > 1.2 ? -Math.min(4.2, (aspect - 1) * 5) : 0;
    const base = showcase ? [0, 8.6, 11] : [0, 12.2, 9.4];
    camera.position.set(base[0] * k + shift, base[1] * k, base[2] * k);
    camera.lookAt(shift, 0, showcase ? 0.3 : GAME_TARGET_Z);
  }, [camera, size.width, size.height, showcase, scale]);
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
  popup,
  shadows,
  onVertex,
  onEdge,
  onHex,
  fontsReady,
}: {
  scene: BoardScene;
  targets: BoardTargets;
  popup?: ReactNode;
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
        const rolled = scene.highlightToken !== null && hex.token === scene.highlightToken && !hex.fog;
        const producing = rolled && hex.id !== scene.robber;
        return (
          <HexTile
            key={hex.id}
            hex={hex}
            x={t.x}
            z={t.y}
            shadows={shadows}
            producing={producing}
            blocked={rolled && hex.id === scene.robber}
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
          <HarborPiece key={h.edge} harbor={h} topo={topo} hexes={scene.board.hexes} />
        ))}
      </group>
      {scene.roads.map((owner, e) =>
        owner === null ? null : (
          <Road key={`r${e}`} x={topo.edges[e].x} z={topo.edges[e].y} angle={topo.edges[e].angle} color={scene.colors[owner]} />
        ),
      )}
      {(scene.ships ?? []).map((owner, e) =>
        owner === null ? null : (
          <Ship key={`s${e}`} x={topo.edges[e].x} z={topo.edges[e].y} angle={topo.edges[e].angle} color={scene.colors[owner]} selected={targets.selectedEdge === e} />
        ),
      )}
      {(scene.board.treasures ?? []).map((tr) =>
        tr.takenBy !== undefined ? null : (
          <TreasureChest key={`t${tr.vertex}`} x={topo.vertices[tr.vertex].x} y={0.02} z={topo.vertices[tr.vertex].y} />
        ),
      )}
      {scene.pirate != null && <Pirate x={topo.hexes[scene.pirate].x} z={topo.hexes[scene.pirate].y} />}
      {scene.buildings.map((b, v) => {
        if (!b) return null;
        const p = topo.vertices[v];
        if (!b.city) return <Settlement key={`b${v}`} x={p.x} z={p.y} color={scene.colors[b.owner]} />;
        return (
          <group key={`b${v}`}>
            <City x={p.x} z={p.y} color={scene.colors[b.owner]} />
            {b.wall && <CityWall x={p.x} z={p.y} color={scene.colors[b.owner]} />}
            {b.metropolis && <MetropolisTower x={p.x} z={p.y} color={scene.colors[b.owner]} track={b.metropolis} />}
          </group>
        );
      })}
      {scene.merchant && (
        <Merchant x={topo.hexes[scene.merchant.hex].x} z={topo.hexes[scene.merchant.hex].y} color={scene.colors[scene.merchant.owner]} />
      )}
      <KnightPieces scene={scene} topo={topo} />
      <Robber x={robberHex.x} z={robberHex.y + 0.46} />
      {scene.barbarian && <Barbarians barbarian={scene.barbarian} topo={topo} />}
      <Targets targets={targets} topo={topo} board={scene.board} color={scene.myColor} popup={popup} onVertex={onVertex} onEdge={onEdge} onHex={onHex} />
    </group>
  );
}

export default function Board3D({
  scene,
  targets,
  popup,
  onBackground,
  onVertex,
  onEdge,
  onHex,
  showcase = false,
  quality = 'high',
  pieceScale = 1,
  theme = 'classic',
  weather = false,
}: BoardProps) {
  const shadows = quality === 'high';
  const palette = PALETTES[theme];
  // Where the last press started: a click away closes the build popup, a drag (orbit/pan) doesn't.
  const pressed = useRef<{ x: number; y: number } | null>(null);
  const fontsReady = useFontReady();
  const landscape = useLandscape();
  const frame = useMemo(() => {
    const topo = getTopology(scene.board.hexes);
    const base = boardFrame(topo);
    // The barbarian track sits west of the island. A landscape screen has sea to spare beside the
    // island; a portrait one pulls the camera back so the track stays on-screen.
    if (!scene.barbarian || landscape) return base;
    const track = barbarianTrackLayout(topo, scene.barbarian.distance + 1);
    return { ...base, extent: Math.max(base.extent, track.reach) };
  }, [scene.board.hexes, scene.barbarian, landscape]);
  // Bigger maps pull the camera, fog, shadows and sea shelf out to match; a long, wide island a
  // little further, so its ends stay clear of the side panel.
  const scale = Math.max(1, frame.extent / STANDARD_EXTENT) * (1 + Math.max(0, frame.aspect - 1.3) * 0.12);
  const island = (
    // Lifted clear of the swells so no water shows in the seams between tiles.
    <group position={[-frame.cx, ISLAND_LIFT, -frame.cz]}>
      <PieceScale.Provider value={pieceScale}>
        <Island scene={scene} targets={targets} popup={popup} shadows={shadows} onVertex={onVertex} onEdge={onEdge} onHex={onHex} fontsReady={fontsReady} />
      </PieceScale.Provider>
    </group>
  );
  const backdrop = showcase ? '#061419' : palette.sea.sky;
  return (
    <Canvas
      shadows={shadows ? 'percentage' : false}
      dpr={[1, quality === 'high' ? 2 : 1.25]}
      camera={{ position: [0, 11, 8.5], fov: 38, near: 0.1, far: HORIZON_HALF }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onPointerDown={(e) => {
        pressed.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMissed={(e) => {
        document.body.style.cursor = '';
        const p = pressed.current;
        if (onBackground && p && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 6) onBackground();
      }}
    >
      <BoardThemeContext.Provider value={theme}>
        <color attach="background" args={[backdrop]} />
        <fog attach="fog" args={[backdrop, (showcase ? 14 : 18) * scale * (palette.light.haze ?? 1), (showcase ? 34 : 44) * scale * (palette.light.haze ?? 1)]} />
        <hemisphereLight args={[palette.light.sky, palette.light.ground, palette.light.hemi]} />
        <ambientLight intensity={palette.light.ambient} />
        <directionalLight
          position={palette.light.sunPosition ?? [5, 12, 6]}
          intensity={palette.light.sunIntensity}
          color={palette.light.sun}
          castShadow={shadows}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-7 * scale}
          shadow-camera-right={7 * scale}
          shadow-camera-top={7 * scale}
          shadow-camera-bottom={-7 * scale}
          shadow-camera-near={1}
          shadow-camera-far={30}
          shadow-bias={-0.0006}
          shadow-normalBias={0.02}
        />
        <Sea shelfRadius={frame.extent + 2} />
        {weather && !showcase && <Weather theme={theme} radius={frame.extent + 1.5} quality={quality} />}
        <FitCamera showcase={showcase} scale={scale} />
        {showcase ? (
          <Spin>{island}</Spin>
        ) : (
          <>
            {island}
            <OrbitControls
              makeDefault
              // Pan with the middle or right button (or Ctrl/Shift + drag, two fingers on touch), across the table.
              mouseButtons={{ LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.PAN, RIGHT: MOUSE.PAN }}
              screenSpacePanning={false}
              onChange={(e) => e && keepOverIsland(e.target, frame.extent * 0.8)}
              enableDamping
              dampingFactor={0.08}
              minDistance={6}
              maxDistance={24 * scale}
              minPolarAngle={0.12}
              maxPolarAngle={1.2}
              target={[0, 0, GAME_TARGET_Z]}
            />
          </>
        )}
      </BoardThemeContext.Provider>
    </Canvas>
  );
}
