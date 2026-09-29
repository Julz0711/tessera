'use client';

import type { FC } from 'react';
import * as THREE from 'three';
import type { BoardThemeId } from '@/client/themes';
import { mat } from '../materials';
import { Hover, lit } from './shared';
import type { PieceColors } from './types';

/**
 * Voyagers pieces on the 3D board, per theme: a player's ship, the pirate and a Veiled Isles
 * treasure. Ships and the pirate are drawn in the piece's own frame: x runs along the edge (about
 * 0.46 long), y = 0 is the water (or cloud, or space) line, z is across. The caller places, turns
 * and scales them (the pirate at 1.6×). Spread `o` into every `mat()` so a placement preview is
 * see-through. Ships wear the owner's colour; the pirate is always dark with a touch of red.
 */
export interface VoyageKit {
  Ship: FC<{ c: PieceColors; o: { opacity?: number } }>;
  Pirate: FC<{ o: { opacity?: number } }>;
  Treasure: FC;
}

type O = { opacity?: number };

const PIRATE = { hull: '#2d2c33', dark: '#111111', sail: '#3a3942', red: '#d9483b' };
const CREAM = '#f6eddb';
const GOLD = '#f2c14e';

// A four-sided hull, wider at the deck than at the keel; its corners point fore, aft and to the sides.
const PAPER_HULL = new THREE.CylinderGeometry(1, 0.45, 1, 4);

// Shared shapes, built once.
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 4),
  sphere: new THREE.SphereGeometry(1, 10, 8),
  ring: new THREE.TorusGeometry(1, 0.18, 5, 12),
  // A lateen/fan sail: a flat triangle in the x/y plane.
  tri: (() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    g.computeVertexNormals();
    return g;
  })(),
};

const sided = (color: string, o: O) => {
  const m = mat(color, o) as THREE.MeshStandardMaterial;
  m.side = THREE.DoubleSide;
  return m;
};

/** A block: size [x, y, z] at position [x, y, z]. */
function Block({ s, p, m, r }: { s: [number, number, number]; p: [number, number, number]; m: THREE.Material; r?: [number, number, number] }) {
  return <mesh geometry={G.box} material={m} scale={s} position={p} rotation={r} castShadow />;
}

function Mast({ h, x = 0, m }: { h: number; x?: number; m: THREE.Material }) {
  return <mesh geometry={G.cyl} material={m} scale={[0.012, h, 0.012]} position={[x, h / 2 + 0.05, 0]} />;
}

// ── Classic ──────────────────────────────────────────────────────────────────

function Sailboat({ hull, trim, sail, o }: { hull: string; trim: string; sail: string; o: O }) {
  return (
    <group>
      <Block s={[0.46, 0.09, 0.15]} p={[0, 0.07, 0]} m={mat(hull, o)} />
      <Block s={[0.32, 0.06, 0.09]} p={[0, 0.02, 0]} m={mat(trim, o)} />
      <Mast h={0.3} m={mat(trim, o)} />
      <Block s={[0.18, 0.2, 0.02]} p={[0.04, 0.27, 0]} m={mat(sail, o)} />
    </group>
  );
}

function Chest({ body, lid, lock = GOLD }: { body: string; lid: string; lock?: string }) {
  return (
    <group>
      <Block s={[0.2, 0.11, 0.14]} p={[0, 0.055, 0]} m={mat(body)} />
      <mesh geometry={G.cyl} material={mat(lid)} scale={[0.07, 0.2, 0.07]} position={[0, 0.11, 0]} rotation={[0, 0, Math.PI / 2]} castShadow />
      <Block s={[0.04, 0.05, 0.02]} p={[0, 0.1, 0.075]} m={mat(lock, { metal: 0.6, rough: 0.4 })} />
    </group>
  );
}

const classic: VoyageKit = {
  Ship: ({ c, o }) => <Sailboat hull={c.hex} trim={c.dark} sail={CREAM} o={o} />,
  Pirate: ({ o }) => <Sailboat hull={PIRATE.hull} trim={PIRATE.dark} sail={PIRATE.sail} o={o} />,
  Treasure: () => <Chest body="#a0692e" lid="#c9893f" />,
};

// ── Night: a lantern at the stern ────────────────────────────────────────────

function Lantern({ color, o }: { color: string; o: O }) {
  return <Block s={[0.04, 0.05, 0.04]} p={[-0.2, 0.15, 0]} m={lit(color, 1.8, o)} />;
}

const night: VoyageKit = {
  Ship: ({ c, o }) => (
    <group>
      <Sailboat hull={c.hex} trim={c.dark} sail="#e9e2cf" o={o} />
      <Lantern color="#ffd27a" o={o} />
    </group>
  ),
  Pirate: ({ o }) => (
    <group>
      <Sailboat hull={PIRATE.hull} trim={PIRATE.dark} sail={PIRATE.sail} o={o} />
      <Lantern color={PIRATE.red} o={o} />
    </group>
  ),
  Treasure: () => (
    <group>
      <Chest body="#8a5a28" lid="#b07a3a" lock="#ffe08a" />
      <Block s={[0.05, 0.03, 0.01]} p={[0, 0.1, 0.078]} m={lit('#ffe08a', 2)} />
    </group>
  ),
};

// ── Sakura: junks with ribbed fan sails ──────────────────────────────────────

function Junk({ hull, trim, sail, o }: { hull: string; trim: string; sail: string; o: O }) {
  return (
    <group>
      <Block s={[0.44, 0.08, 0.15]} p={[0, 0.06, 0]} m={mat(hull, o)} />
      <Block s={[0.08, 0.06, 0.15]} p={[0.22, 0.12, 0]} m={mat(hull, o)} r={[0, 0, 0.5]} />
      <Block s={[0.08, 0.06, 0.15]} p={[-0.22, 0.12, 0]} m={mat(hull, o)} r={[0, 0, -0.5]} />
      <Mast h={0.32} m={mat(trim, o)} />
      <mesh geometry={G.tri} material={sided(sail, o)} scale={[0.2, 0.26, 1]} position={[0.005, 0.1, 0]} castShadow />
      {[0.14, 0.2, 0.26].map((y) => (
        <Block key={y} s={[0.17 * (1 - (y - 0.1) / 0.26), 0.008, 0.012]} p={[0.09 * (1 - (y - 0.1) / 0.26) + 0.005, y, 0.004]} m={mat(trim, o)} />
      ))}
    </group>
  );
}

const sakura: VoyageKit = {
  Ship: ({ c, o }) => <Junk hull={c.hex} trim={c.dark} sail="#f7e3d6" o={o} />,
  Pirate: ({ o }) => <Junk hull={PIRATE.hull} trim={PIRATE.dark} sail="#6b1f24" o={o} />,
  Treasure: () => (
    <group>
      <Block s={[0.2, 0.12, 0.14]} p={[0, 0.06, 0]} m={mat('#8c1d22', { rough: 0.3 })} />
      <Block s={[0.21, 0.035, 0.15]} p={[0, 0.13, 0]} m={mat('#2a1a1a', { rough: 0.3 })} />
      <mesh geometry={G.cyl} material={mat(GOLD, { metal: 0.6, rough: 0.35 })} scale={[0.022, 0.01, 0.022]} position={[0, 0.07, 0.072]} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  ),
};

// ── Nordic: longships with striped square sails ──────────────────────────────

function Longship({ hull, trim, a, b, o, dragon = false }: { hull: string; trim: string; a: string; b: string; o: O; dragon?: boolean }) {
  return (
    <group>
      <Block s={[0.5, 0.07, 0.13]} p={[0, 0.05, 0]} m={mat(hull, o)} />
      <Block s={[0.04, 0.16, 0.04]} p={[0.26, 0.11, 0]} m={mat(trim, o)} r={[0, 0, -0.35]} />
      <Block s={[0.04, 0.12, 0.04]} p={[-0.26, 0.09, 0]} m={mat(trim, o)} r={[0, 0, 0.35]} />
      {dragon && <mesh geometry={G.cone} material={mat(trim, o)} scale={[0.035, 0.07, 0.035]} position={[0.31, 0.2, 0]} rotation={[0, 0, -Math.PI / 2]} />}
      {[-0.12, 0, 0.12].map((x) => (
        <mesh key={x} geometry={G.cyl} material={mat('#e9dcc0', o)} scale={[0.028, 0.01, 0.028]} position={[x, 0.07, 0.068]} rotation={[Math.PI / 2, 0, 0]} />
      ))}
      <Mast h={0.32} m={mat(trim, o)} />
      <Block s={[0.02, 0.18, 0.22]} p={[0, 0.27, 0]} m={mat(a, o)} />
      <Block s={[0.022, 0.18, 0.05]} p={[0, 0.27, 0]} m={mat(b, o)} />
      <Block s={[0.022, 0.18, 0.04]} p={[0, 0.27, 0.08]} m={mat(b, o)} />
      <Block s={[0.022, 0.18, 0.04]} p={[0, 0.27, -0.08]} m={mat(b, o)} />
    </group>
  );
}

const nordic: VoyageKit = {
  Ship: ({ c, o }) => <Longship hull={c.hex} trim={c.dark} a={CREAM} b={c.hex} o={o} />,
  Pirate: ({ o }) => <Longship hull={PIRATE.hull} trim={PIRATE.dark} a={PIRATE.sail} b="#7a1f24" o={o} dragon />,
  Treasure: () => <Chest body="#6b4a2b" lid="#8a6440" lock="#b8c0c8" />,
};

// ── Frontier: paddle steamers and an outlaw gunboat ──────────────────────────

function Steamer({ hull, trim, cabin, flag, o }: { hull: string; trim: string; cabin: string; flag?: string; o: O }) {
  return (
    <group>
      <Block s={[0.46, 0.07, 0.17]} p={[0, 0.05, 0]} m={mat(hull, o)} />
      <Block s={[0.24, 0.09, 0.13]} p={[0.02, 0.13, 0]} m={mat(cabin, o)} />
      <mesh geometry={G.cyl} material={mat('#2a2622', o)} scale={[0.025, 0.2, 0.025]} position={[0.08, 0.26, 0]} />
      {/* the stern paddle wheel */}
      <mesh geometry={G.ring} material={mat(trim, o)} scale={[0.07, 0.07, 0.25]} position={[-0.25, 0.08, 0]} />
      {flag && (
        <group position={[0.18, 0.18, 0]}>
          <mesh geometry={G.cyl} material={mat(trim, o)} scale={[0.008, 0.16, 0.008]} position={[0, 0.08, 0]} />
          <Block s={[0.08, 0.05, 0.005]} p={[0.04, 0.14, 0]} m={mat(flag, o)} />
        </group>
      )}
    </group>
  );
}

const frontier: VoyageKit = {
  Ship: ({ c, o }) => <Steamer hull={c.hex} trim={c.dark} cabin="#f1e3c4" o={o} />,
  Pirate: ({ o }) => <Steamer hull={PIRATE.hull} trim={PIRATE.dark} cabin="#4a4540" flag={PIRATE.dark} o={o} />,
  Treasure: () => (
    <group>
      <Block s={[0.2, 0.13, 0.14]} p={[0, 0.065, 0]} m={mat('#6d7074', { metal: 0.5, rough: 0.5 })} />
      <Block s={[0.21, 0.015, 0.15]} p={[0, 0.1, 0]} m={mat('#2b2d30', { metal: 0.5 })} />
      <Block s={[0.04, 0.05, 0.02]} p={[0, 0.06, 0.075]} m={mat(GOLD, { metal: 0.6, rough: 0.4 })} />
    </group>
  ),
};

// ── Nile: feluccas with tall lateen sails ────────────────────────────────────

function Felucca({ hull, trim, sail, o }: { hull: string; trim: string; sail: string; o: O }) {
  return (
    <group>
      <Block s={[0.42, 0.07, 0.13]} p={[0, 0.05, 0]} m={mat(hull, o)} />
      <Block s={[0.1, 0.05, 0.13]} p={[0.22, 0.09, 0]} m={mat(hull, o)} r={[0, 0, 0.45]} />
      <Block s={[0.1, 0.05, 0.13]} p={[-0.22, 0.09, 0]} m={mat(hull, o)} r={[0, 0, -0.45]} />
      {/* A lateen rig: the sail's long edge hangs from a slanted yard, low at the bow and high at the
          stern, hoisted to the top of a short mast. */}
      <Mast h={0.28} x={-0.03} m={mat(trim, o)} />
      <mesh geometry={G.cyl} material={mat(trim, o)} scale={[0.008, 0.58, 0.008]} position={[0.02, 0.28, 0]} rotation={[0, 0, Math.PI / 4]} />
      <mesh geometry={G.tri} material={sided(sail, o)} scale={[0.36, 0.36, 1]} position={[-0.16, 0.1, 0.014]} castShadow />
    </group>
  );
}

const nile: VoyageKit = {
  Ship: ({ c, o }) => <Felucca hull={c.hex} trim={c.dark} sail="#f3ead3" o={o} />,
  Pirate: ({ o }) => <Felucca hull={PIRATE.hull} trim={PIRATE.dark} sail={PIRATE.sail} o={o} />,
  Treasure: () => (
    <group>
      <Block s={[0.2, 0.12, 0.14]} p={[0, 0.06, 0]} m={mat('#d9a441', { metal: 0.4, rough: 0.4 })} />
      {[-0.06, 0, 0.06].map((x) => (
        <Block key={x} s={[0.02, 0.121, 0.141]} p={[x, 0.06, 0]} m={mat('#2f5e9e')} />
      ))}
      <mesh geometry={G.cone} material={mat('#e8bd5a', { metal: 0.4 })} scale={[0.14, 0.06, 0.1]} position={[0, 0.15, 0]} rotation={[0, Math.PI / 4, 0]} />
    </group>
  ),
};

// ── Skyport: airships floating over the clouds ───────────────────────────────

function Airship({ envelope, trim, gondola, o, stripe }: { envelope: string; trim: string; gondola: string; o: O; stripe?: string }) {
  return (
    <Hover height={0.18} amount={0.015}>
      <mesh geometry={G.sphere} material={mat(envelope, o)} scale={[0.22, 0.08, 0.08]} castShadow />
      {stripe && <mesh geometry={G.sphere} material={mat(stripe, o)} scale={[0.222, 0.02, 0.082]} />}
      <Block s={[0.05, 0.07, 0.005]} p={[-0.2, 0.02, 0]} m={mat(trim, o)} />
      <Block s={[0.05, 0.005, 0.07]} p={[-0.2, 0, 0]} m={mat(trim, o)} />
      <Block s={[0.12, 0.04, 0.05]} p={[0, -0.1, 0]} m={mat(gondola, o)} />
    </Hover>
  );
}

const skyport: VoyageKit = {
  Ship: ({ c, o }) => <Airship envelope={c.hex} trim={c.dark} gondola="#6b4f36" o={o} />,
  Pirate: ({ o }) => <Airship envelope="#2b241e" trim={PIRATE.dark} gondola="#171310" stripe={PIRATE.red} o={o} />,
  Treasure: () => (
    <Hover height={0.05} amount={0.012}>
      <Block s={[0.16, 0.12, 0.14]} p={[0, 0.06, 0]} m={mat('#b98a55')} />
      <mesh geometry={G.cyl} material={mat('#3a2f26')} scale={[0.004, 0.1, 0.004]} position={[0, 0.17, 0]} />
      <mesh geometry={G.sphere} material={mat(PIRATE.red)} scale={[0.05, 0.055, 0.05]} position={[0, 0.25, 0]} castShadow />
    </Hover>
  ),
};

// ── Cyberpunk: neon hover-boats ──────────────────────────────────────────────

/** A hull outline seen from above (bow at +x), extruded upward from y = 0. */
function hullFromAbove(points: [number, number][], depth: number, bevel: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, z)));
  const g = bevel
    ? new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1 })
    : new THREE.ShapeGeometry(shape);
  return g.rotateX(-Math.PI / 2);
}

const SPEEDBOAT: [number, number][] = [[-0.21, -0.07], [0.05, -0.08], [0.25, 0], [0.05, 0.08], [-0.21, 0.07]];
const HOVER_HULL = hullFromAbove(SPEEDBOAT, 0.04, 0.012);
const UNDERGLOW = hullFromAbove(SPEEDBOAT.map(([x, z]) => [x * 0.85, z * 0.85]), 0, 0);

/** A hover speedboat: pointed hull, glass canopy, neon side strips, twin engines and an underglow. */
function Hoverboat({ hull, trim, neon, o }: { hull: string; trim: string; neon: string; o: O }) {
  const body = mat(hull, { ...o, rough: 0.35, metal: 0.5 });
  const dark = mat(trim, { ...o, rough: 0.4, metal: 0.5 });
  return (
    <Hover height={0.06} amount={0.008}>
      <mesh geometry={HOVER_HULL} material={body} castShadow />
      <mesh geometry={UNDERGLOW} material={lit(neon, 1.8, { opacity: Math.min(0.7, o.opacity ?? 1) })} position={[0, -0.03, 0]} />
      {[-0.084, 0.084].map((z) => (
        <Block key={z} s={[0.26, 0.012, 0.006]} p={[-0.04, 0.03, z]} m={lit(neon, 2.2, o)} />
      ))}
      <mesh geometry={G.sphere} material={mat('#1d2233', { ...o, rough: 0.15, metal: 0.6 })} scale={[0.11, 0.045, 0.055]} position={[0, 0.055, 0]} castShadow />
      <Block s={[0.012, 0.02, 0.1]} p={[0.1, 0.06, 0]} m={lit(neon, 2, o)} />
      {[-0.045, 0.045].map((z) => (
        <group key={z}>
          <mesh geometry={G.cyl} material={dark} scale={[0.026, 0.07, 0.026]} position={[-0.225, 0.03, z]} rotation={[0, 0, Math.PI / 2]} />
          <mesh geometry={G.sphere} material={lit(neon, 2.4, o)} scale={[0.01, 0.022, 0.022]} position={[-0.262, 0.03, z]} />
        </group>
      ))}
      <Block s={[0.05, 0.06, 0.008]} p={[-0.19, 0.085, 0]} m={dark} r={[0, 0, 0.35]} />
    </Hover>
  );
}

const cyberpunk: VoyageKit = {
  Ship: ({ c, o }) => <Hoverboat hull={c.hex} trim={c.dark} neon={c.hex} o={o} />,
  Pirate: ({ o }) => <Hoverboat hull="#15161d" trim="#050508" neon={PIRATE.red} o={o} />,
  Treasure: () => (
    <group>
      <Block s={[0.2, 0.09, 0.13]} p={[0, 0.045, 0]} m={mat('#1d2233', { rough: 0.35, metal: 0.5 })} />
      <Block s={[0.14, 0.012, 0.132]} p={[0, 0.06, 0]} m={lit('#2de2e6', 2.2)} />
    </group>
  ),
};

// ── Orbital: shuttles and a pirate cruiser, drifting in space ─────────────────

const CYAN = '#5ee7ff';

const orbital: VoyageKit = {
  Ship: ({ c, o }) => (
    <Hover height={0.14} amount={0.012}>
      <mesh geometry={G.sphere} material={mat(c.hex, { ...o, rough: 0.4, metal: 0.3 })} scale={[0.2, 0.06, 0.08]} castShadow />
      <Block s={[0.1, 0.012, 0.26]} p={[-0.06, 0, 0]} m={mat(c.dark, o)} />
      <mesh geometry={G.sphere} material={mat('#1c1f2c', { ...o, rough: 0.2 })} scale={[0.05, 0.035, 0.04]} position={[0.12, 0.03, 0]} />
      <mesh geometry={G.sphere} material={lit(CYAN, 2, o)} scale={[0.02, 0.025, 0.025]} position={[-0.2, 0, 0]} />
    </Hover>
  ),
  Pirate: ({ o }) => (
    <Hover height={0.16} amount={0.012}>
      <mesh geometry={G.cone} material={mat('#23262f', { ...o, rough: 0.4, metal: 0.5 })} scale={[0.14, 0.36, 0.05]} rotation={[0, 0, -Math.PI / 2]} castShadow />
      <Block s={[0.08, 0.02, 0.28]} p={[-0.12, 0, 0]} m={mat('#101218', o)} />
      {[0.1, -0.1].map((z) => (
        <mesh key={z} geometry={G.sphere} material={lit(PIRATE.red, 2, o)} scale={0.022} position={[-0.17, 0, z]} />
      ))}
    </Hover>
  ),
  Treasure: () => (
    <Hover height={0.07} amount={0.01}>
      <mesh geometry={G.sphere} material={mat('#c9ced8', { metal: 0.6, rough: 0.35 })} scale={[0.11, 0.06, 0.06]} castShadow />
      <mesh geometry={G.sphere} material={lit(CYAN, 2)} scale={0.015} position={[0.06, 0.04, 0.04]} />
      <mesh geometry={G.sphere} material={lit(GOLD, 2)} scale={0.015} position={[-0.06, 0.04, 0.04]} />
    </Hover>
  ),
};

// ── Origami: folded paper boats ──────────────────────────────────────────────

function PaperBoat({ fill, o }: { fill: string; o: O }) {
  const m = mat(fill, { ...o, rough: 1 });
  return (
    <group>
      {/* a folded paper boat: a hull wider at the top than the keel, pointed at both ends, and a centre sail */}
      <mesh geometry={PAPER_HULL} material={m} scale={[0.26, 0.1, 0.09]} position={[0, 0.07, 0]} castShadow />
      <mesh geometry={G.cone} material={m} scale={[0.13, 0.2, 0.02]} position={[0, 0.2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow />
    </group>
  );
}

const origami: VoyageKit = {
  Ship: ({ c, o }) => <PaperBoat fill={c.hex} o={o} />,
  Pirate: ({ o }) => <PaperBoat fill={PIRATE.hull} o={o} />,
  Treasure: () => (
    <group>
      <Block s={[0.18, 0.1, 0.14]} p={[0, 0.05, 0]} m={mat('#e8c46a', { rough: 1 })} />
      <mesh geometry={G.cone} material={mat('#f3d98c', { rough: 1 })} scale={[0.14, 0.07, 0.11]} position={[0, 0.135, 0]} rotation={[0, Math.PI / 4, 0]} castShadow />
    </group>
  ),
};

/** Every theme's Voyagers pieces (classic for the themes that don't draw their own). */
export const VOYAGE_KITS: Record<BoardThemeId, VoyageKit> = { classic, night, sakura, nordic, frontier, nile, skyport, cyberpunk, orbital, origami };
