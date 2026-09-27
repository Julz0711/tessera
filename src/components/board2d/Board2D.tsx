"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minus, Plus } from "lucide-react";
import { PIPS } from "@/engine/constants";
import { getTopology, type Topology } from "@/engine/board/topology";
import type { PlayerColor, Terrain } from "@/engine/types";
import { CARD_COLORS } from "@/client/palette";
import { PALETTES, type BoardPalette, type BoardThemeId, type TileColors } from "@/client/themes";
import { THEME_BARBARIAN_SHIPS, THEME_GLYPHS, type BarbarianShipGlyph } from "./themes";
import { PLAYER_COLORS } from "@/shared/colors";
import { harborAnchor } from "@/components/board/harbor";
import { BARBARIAN_HEADER_H, barbarianTrackLayout, type BarbarianLayout } from "@/components/board/barbarian";
import type { BoardProps, BoardScene } from "@/components/board/types";
import { useZoomPan } from "./useZoomPan";
import { useZoomHost } from "@/client/hud";

/** Whether the screen is wide enough for the desktop HUD (Tailwind's `lg`). */
function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

const S = 100; // world units → SVG units
/** How much of its hex a tile fills; the rest is a strip of beach between neighbours. */
const TILE_SIZE = 0.93;

function hexPoints(topo: Topology, hexId: number, scale = 1): string {
  const h = topo.hexes[hexId];
  return h.vertices
    .map((v) => {
      const p = topo.vertices[v];
      const x = h.x + (p.x - h.x) * scale;
      const y = h.y + (p.y - h.y) * scale;
      return `${(x * S).toFixed(1)},${(y * S).toFixed(1)}`;
    })
    .join(" ");
}

function TerrainGlyphs({
  terrain,
  cx,
  cy,
  c,
}: {
  terrain: Terrain;
  cx: number;
  cy: number;
  c: TileColors;
}) {
  const spots = [
    [-40, -34],
    [40, -34],
    [-50, 22],
    [50, 22],
    [0, 52],
  ];
  const at = (i: number) => ({ x: cx + spots[i][0], y: cy + spots[i][1] });
  switch (terrain) {
    case "forest":
      return (
        <g fill={c.accent} opacity="0.9">
          {[0, 1, 2, 3, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <path
                key={i}
                d={`M${x} ${y - 16}l11 20h-22Z M${x} ${y - 6}l13 20h-26Z`}
              />
            );
          })}
        </g>
      );
    case "hills":
      return (
        <g fill={c.accent} opacity="0.75">
          {[0, 1, 4].map((i) => {
            const { x, y } = at(i);
            return <path key={i} d={`M${x - 22} ${y + 8}q22-30 44 0Z`} />;
          })}
        </g>
      );
    case "pasture":
      return (
        <g>
          {[0, 3].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <ellipse cx={x} cy={y} rx="12" ry="8" fill={c.accent} />
                <circle cx={x + 11} cy={y - 3} r="4.5" fill="#3a3530" />
              </g>
            );
          })}
          {[1, 2, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <path
                key={i}
                d={`M${x - 6} ${y + 6}l3-10 3 10 3-12 3 12`}
                stroke="#6a9446"
                strokeWidth="2.5"
                fill="none"
              />
            );
          })}
        </g>
      );
    case "fields":
      return (
        <g stroke="#a8862f" strokeWidth="3" strokeLinecap="round" opacity="0.8">
          {[0, 1, 2, 3, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <path
                key={i}
                d={`M${x - 8} ${y + 10}v-20M${x} ${y + 10}v-24M${x + 8} ${y + 10}v-20`}
              />
            );
          })}
        </g>
      );
    case "mountains":
      return (
        <g>
          {[0, 1, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={`M${x - 20} ${y + 12}l20-30 20 30Z`} fill="#6f737c" />
                <path
                  d={`M${x - 7} ${y - 8}l7-10 7 10-4 3-3-3-3 3Z`}
                  fill={c.accent}
                />
              </g>
            );
          })}
        </g>
      );
    case "gold":
      return (
        <g>
          {[0, 1, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g
                key={i}
                fill="#ffd84a"
                stroke="#6b4306"
                strokeWidth="2.5"
                strokeLinejoin="round"
              >
                <path d={`M${x - 17} ${y + 8}l3-10 9-4 7 6-2 8Z`} />
                <path d={`M${x - 1} ${y + 9}l2-11 10-3 6 8-4 6Z`} />
              </g>
            );
          })}
          {[2, 3].map((i) => {
            const { x, y } = at(i);
            return (
              <path
                key={i}
                d={sparkle(x, y, 14)}
                fill="#fffbe6"
                stroke="#6b4306"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            );
          })}
        </g>
      );
    case "desert":
      return (
        <g fill={c.accent} opacity="0.8">
          {[0, 1, 2, 3].map((i) => {
            const { x, y } = at(i);
            return <path key={i} d={`M${x - 20} ${y + 6}q20-16 40 0Z`} />;
          })}
          <path
            d={`M${cx - 4} ${cy + 22}v-30a4 4 0 0 1 8 0v30Z M${cx + 4} ${cy}h8v-10`}
            fill="#5f8f4a"
            stroke="#5f8f4a"
            strokeWidth="3"
          />
        </g>
      );
  }
}

/** A four-pointed glint. */
function sparkle(x: number, y: number, s: number): string {
  const k = s * 0.28;
  return `M${x} ${y - s}L${x + k} ${y - k}L${x + s} ${y}L${x + k} ${y + k}L${x} ${y + s}L${x - k} ${y + k}L${x - s} ${y}L${x - k} ${y - k}Z`;
}

function Cloud({
  x,
  y,
  s,
  fog,
}: {
  x: number;
  y: number;
  s: number;
  fog: BoardPalette["fog"];
}) {
  const puffs = (
    <>
      <ellipse cx="0" cy="6" rx="30" ry="9" />
      <circle cx="-14" cy="0" r="11" />
      <circle cx="2" cy="-6" r="15" />
      <circle cx="17" cy="1" r="10" />
    </>
  );
  // Outline pass first, then the fill over it, so overlapping puffs read as one cloud.
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g fill={fog.side} stroke={fog.side} strokeWidth="5">
        {puffs}
      </g>
      <g fill={fog.cloud}>{puffs}</g>
    </g>
  );
}

/** Black Forest: an undiscovered tile under drifting cloud. */
function FogGlyphs({
  cx,
  cy,
  fog,
}: {
  cx: number;
  cy: number;
  fog: BoardPalette["fog"];
}) {
  return (
    <g>
      <Cloud x={cx - 30} y={cy - 40} s={1} fog={fog} />
      <Cloud x={cx + 36} y={cy + 6} s={1.1} fog={fog} />
      <Cloud x={cx - 24} y={cy + 46} s={0.9} fog={fog} />
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        className="display"
        fontSize="36"
        fontWeight="900"
        fill={fog.side}
      >
        ?
      </text>
    </g>
  );
}

/** Build-hint marker: a cream ring with thin dark edges, legible on every terrain. */
function HintRing({
  x,
  y,
  r,
  filled,
  hover,
}: {
  x: number;
  y: number;
  r: number;
  filled: boolean;
  hover: boolean;
}) {
  return (
    <g opacity={hover ? 1 : 0.9}>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke="#1f1a14"
        strokeOpacity="0.55"
        strokeWidth="5.5"
      />
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={filled ? "rgba(246,237,219,0.6)" : "none"}
        stroke={hover ? "#fff3cf" : "#f6eddb"}
        strokeWidth="2.75"
      />
    </g>
  );
}

/** Scales a piece drawn around (x, y) by `k` (the "Board size" setting) without moving it. */
function grow(x: number, y: number, k: number): string | undefined {
  return k === 1
    ? undefined
    : `translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})`;
}

function HousePath({
  x,
  y,
  color,
  ghost,
  k = 1,
}: {
  x: number;
  y: number;
  color: PlayerColor;
  ghost?: boolean;
  k?: number;
}) {
  const c = PLAYER_COLORS[color];
  return (
    <path
      transform={grow(x, y, k)}
      d={`M${x - 17} ${y + 14}v-17l17-14 17 14v17Z`}
      fill={c.hex}
      stroke={c.dark}
      strokeWidth="4.5"
      strokeLinejoin="round"
      opacity={ghost ? 0.6 : 1}
    />
  );
}

function CityPath({
  x,
  y,
  color,
  ghost,
  k = 1,
}: {
  x: number;
  y: number;
  color: PlayerColor;
  ghost?: boolean;
  k?: number;
}) {
  const c = PLAYER_COLORS[color];
  return (
    <path
      transform={grow(x, y, k)}
      d={`M${x - 26} ${y + 17}v-18l12-9 12 9v-18h9v-8h8v8h9v36Z`}
      fill={c.hex}
      stroke={c.dark}
      strokeWidth="4.5"
      strokeLinejoin="round"
      opacity={ghost ? 0.6 : 1}
    />
  );
}

/** The robber, standing below the hex's number token; a ghost previews a move waiting for confirmation. */
function RobberFigure({
  x,
  y,
  ghost,
  k = 1,
}: {
  x: number;
  y: number;
  ghost?: boolean;
  k?: number;
}) {
  return (
    <g pointerEvents="none" transform={grow(x, y, k)} opacity={ghost ? 0.6 : 1}>
      {!ghost && (
        <ellipse cx={x} cy={y + 16} rx="15" ry="5" fill="#000" opacity="0.25" />
      )}
      <path
        d={`M${x - 12} ${y + 16}c0-14 5-24 12-24s12 10 12 24Z`}
        fill="#2d2c33"
      />
      <circle cx={x} cy={y - 12} r="8" fill="#3a3942" />
    </g>
  );
}

/**
 * Night-time on the 2D board (Night, Cyberpunk): the island dims, and each tile's lamp and every
 * town cast light again.
 */
function Gloom({
  scene,
  topo,
  gloom,
}: {
  scene: BoardProps["scene"];
  topo: Topology;
  gloom: NonNullable<BoardPalette["gloom2d"]>;
}) {
  // The lamp stands towards one of the three far corners (up the screen), as in 3D.
  const spot = (id: number) => {
    const a = Math.PI / 6 + ((3 + ((id * 7 + 3) % 3)) * Math.PI) / 3;
    const t = topo.hexes[id];
    return {
      x: (t.x + Math.cos(a) * 0.64) * S,
      y: (t.y + Math.sin(a) * 0.64) * S,
    };
  };
  const lights = gloom.lights;
  // Towns in their owner's colour; a black town borrows a light grey so it still glows.
  const owners = gloom.ownerGlow ? [...new Set(scene.colors)] : [];
  const townGlow = (color: PlayerColor) =>
    color === "black" ? "#b8b0d0" : PLAYER_COLORS[color].hex;
  return (
    <g pointerEvents="none">
      <defs>
        {lights.map((l, i) => (
          <radialGradient key={i} id={`gloom-glow-${i}`}>
            <stop offset="0%" stopColor={l.glow[0]} stopOpacity="0.7" />
            <stop offset="35%" stopColor={l.glow[1]} stopOpacity="0.3" />
            <stop offset="100%" stopColor={l.glow[2]} stopOpacity="0" />
          </radialGradient>
        ))}
        {owners.map((color) => (
          <radialGradient key={color} id={`gloom-town-${color}`}>
            <stop offset="0%" stopColor={townGlow(color)} stopOpacity="0.75" />
            <stop offset="35%" stopColor={townGlow(color)} stopOpacity="0.3" />
            <stop offset="100%" stopColor={townGlow(color)} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
      {/* Gold and the tiles paying out after a roll stay bright. */}
      {scene.board.hexes.map((h) =>
        h.terrain === "gold" ||
        (h.token !== null &&
          h.token === scene.highlightToken &&
          h.id !== scene.robber) ? null : (
          <polygon
            key={h.id}
            points={hexPoints(topo, h.id, 1.12)}
            fill={gloom.shade}
            opacity={gloom.opacity}
          />
        ),
      )}
      {scene.board.hexes.map((h) => {
        if (h.fog || h.terrain === "gold") return null;
        const { x, y } = spot(h.id);
        const i = h.id % lights.length;
        return (
          <g key={h.id}>
            <circle cx={x} cy={y} r="46" fill={`url(#gloom-glow-${i})`} />
            <circle
              cx={x}
              cy={y}
              r="6"
              fill={lights[i].lamp}
              stroke={gloom.lampRim}
              strokeWidth="2"
            />
          </g>
        );
      })}
      {scene.buildings.map((b, v) =>
        b ? (
          <circle
            key={v}
            cx={topo.vertices[v].x * S}
            cy={topo.vertices[v].y * S}
            r={b.city ? 44 : 32}
            fill={
              gloom.ownerGlow
                ? `url(#gloom-town-${scene.colors[b.owner]})`
                : "url(#gloom-glow-0)"
            }
          />
        ) : null,
      )}
    </g>
  );
}

/** A flat pointy-top hexagon, sized like the barbarian track's little sea-steps. */
function hexStepPoints(cx: number, cy: number, r: number): string {
  const w = r * (Math.sqrt(3) / 2);
  return [
    [cx, cy - r],
    [cx + w, cy - r / 2],
    [cx + w, cy + r / 2],
    [cx, cy + r],
    [cx - w, cy + r / 2],
    [cx - w, cy - r / 2],
  ]
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
}

type PierColors = { deck: string; plank: string; post: string };

/** The classic barbarian longship: hull, curled prow, a striped sail and a few shields along the gunwale. */
const classicShip: BarbarianShipGlyph = ({ danger, wood }) => {
  const hull = danger ? "#8a1f14" : wood.deck;
  const sail = danger ? "#f3d9d3" : "#f6eddb";
  const stripe = danger ? "#8a1f14" : "#a83b2e";
  return (
    <g pointerEvents="none">
      <path d="M-26 8h52l-10 14h-32Z" fill={hull} stroke="#1f1a14" strokeWidth="2.5" strokeLinejoin="round" />
      {/* curled prow */}
      <path d="M26 8q14-2 14-14q0-8-8-8" fill="none" stroke={wood.post} strokeWidth="3.5" strokeLinecap="round" />
      <rect x="-1.5" y="-36" width="3" height="45" fill={wood.post} />
      <path d="M-18-32h34q-4 16 0 32h-34q4-16 0-32Z" fill={sail} stroke="#1f1a14" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="-7" y="-32" width="5" height="32" fill={stripe} />
      <rect x="6" y="-32" width="5" height="32" fill={stripe} />
      <circle cx="-14" cy="15" r="4" fill={stripe} stroke="#1f1a14" strokeWidth="1.2" />
      <circle cx="0" cy="16" r="4" fill={sail} stroke="#1f1a14" strokeWidth="1.2" />
      <circle cx="14" cy="15" r="4" fill={stripe} stroke="#1f1a14" strokeWidth="1.2" />
    </g>
  );
};

/** The ship for the barbarian track's current step: the theme's own glyph, or the classic longship. */
function BarbarianShipGlyph({
  x,
  y,
  danger,
  wood,
  ps,
  theme,
}: {
  x: number;
  y: number;
  danger: boolean;
  wood: PierColors;
  ps: number;
  theme: BoardThemeId;
}) {
  const glyph = THEME_BARBARIAN_SHIPS[theme] ?? classicShip;
  return <g transform={`translate(${x} ${y}) scale(${1.15 * ps})`}>{glyph({ danger, wood })}</g>;
}

/** One sword pointing up, centred on its grip's top (a blade, crossguard, grip and pommel). */
function Sword({ angle }: { angle: number }) {
  return (
    <g transform={`rotate(${angle})`}>
      <path d="M0 -14 L2.4 -10.5 L2.4 3.5 L-2.4 3.5 L-2.4 -10.5 Z" />
      <rect x="-6" y="3.5" width="12" height="2.6" rx="1" />
      <rect x="-1.3" y="6.1" width="2.6" height="5" />
      <circle cy="12.4" r="2.1" />
    </g>
  );
}

/** Two swords crossing: the island's knight defense. */
function CrossedSwords({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={color} stroke="#0b2233" strokeWidth="0.8" strokeLinejoin="round">
      <Sword angle={-40} />
      <Sword angle={40} />
    </g>
  );
}

/** A small ship silhouette: the barbarians' strength. */
function ShipIcon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={color}>
      <path d="M-13 3 H13 L8 10 H-8 Z" />
      <rect x="-1" y="-13" width="2" height="16" />
      <path d="M1 -12 L11 -3 L1 -1 Z" />
      <path d="M-1 -10 L-9 -1 L-1 0 Z" />
    </g>
  );
}

/**
 * The barbarian ship's voyage (C&K): a dark field west of the island with the status on top
 * (barbarian strength against the island's knight defense) and a zigzag strip of touching hex steps
 * below, the landing (last step) warm orange, the ship on its current step.
 */
function BarbarianTrack2D({
  barbarian,
  layout,
  palette,
  theme,
}: {
  barbarian: NonNullable<BoardScene["barbarian"]>;
  layout: BarbarianLayout;
  palette: BoardPalette;
  theme: BoardThemeId;
}) {
  const wood = palette.pier ?? { deck: "#9c6f42", plank: "#8a6139", post: "#6b4a2b" };
  const danger = barbarian.position >= barbarian.distance - 2;
  const losing = barbarian.strength > barbarian.defense;
  const r = layout.r * S;
  const steps = Array.from({ length: barbarian.distance + 1 }, (_, i) => layout.at(i));
  const xs = steps.map((p) => p.x * S);
  const left = Math.min(...xs) - r - 10;
  const width = Math.max(...xs) - Math.min(...xs) + 2 * r + 20;
  const hx = layout.header.x * S;
  const hy = layout.header.y * S;
  const top = hy - (BARBARIAN_HEADER_H * S) / 2 - 4;
  const bottom = steps[steps.length - 1].y * S + r + 10;
  const ship = steps[barbarian.position];
  const paper = "#f6eddb";
  return (
    <g pointerEvents="none">
      <rect x={left} y={top} width={width} height={bottom - top} rx="16" fill="#0b2233" opacity="0.5" />
      <g aria-label={`Barbarians ${barbarian.strength}, knights ${barbarian.defense}`}>
        <ShipIcon x={hx - 38} y={hy} color={losing ? "#ff8a73" : paper} />
        <text x={hx - 20} y={hy + 8} className="display" fontSize="22" fontWeight="900" fill={losing ? "#ff8a73" : paper}>
          {barbarian.strength}
        </text>
        <CrossedSwords x={hx + 16} y={hy} color={losing ? paper : "#8fe0a8"} />
        <text x={hx + 32} y={hy + 8} className="display" fontSize="22" fontWeight="900" fill={losing ? paper : "#8fe0a8"}>
          {barbarian.defense}
        </text>
      </g>
      {steps.map((p, i) => {
        const landing = i === barbarian.distance;
        return (
          <polygon
            key={i}
            points={hexStepPoints(p.x * S, p.y * S, r * 0.94)}
            fill={landing ? (danger ? "#e0503a" : "#f2994a") : wood.deck}
            stroke={landing ? "#8a3a14" : wood.post}
            strokeWidth="2.5"
            strokeLinejoin="round"
            opacity={landing ? 1 : 0.7}
          />
        );
      })}
      <BarbarianShipGlyph x={ship.x * S} y={ship.y * S} danger={danger} wood={wood} ps={1} theme={theme} />
    </g>
  );
}

export default function Board2D({
  scene,
  targets,
  popup,
  onBackground,
  onVertex,
  onEdge,
  onHex,
  interactive,
  pieceScale = 1,
  theme = "classic",
}: BoardProps) {
  const palette = PALETTES[theme];
  const TOKEN = palette.token;
  const ps = pieceScale;
  const topo = getTopology(scene.board.hexes);
  const [hover, setHover] = useState<string | null>(null);
  const barbarian = scene.barbarian;
  const barbLayout = useMemo(
    () => (barbarian ? barbarianTrackLayout(topo, barbarian.distance + 1) : null),
    [topo, barbarian],
  );
  const bounds = useMemo(() => {
    const xs = topo.vertices.map((v) => v.x * S);
    const ys = topo.vertices.map((v) => v.y * S);
    const pad = 95;
    let minX = Math.min(...xs) - pad;
    let minY = Math.min(...ys) - pad;
    // Room for the barbarian track's steps and badges, west of the island.
    if (barbLayout) {
      minX = Math.min(minX, (barbLayout.at(0).x - barbLayout.r) * S - 30);
      minY = Math.min(minY, (barbLayout.header.y - BARBARIAN_HEADER_H / 2) * S - 20);
    }
    return {
      minX,
      minY,
      w: Math.max(...xs) + pad - minX,
      h: Math.max(...ys) + pad - minY,
    };
  }, [topo, barbLayout]);
  const hexTargets = new Set(targets.hexes);
  const myColor = scene.myColor;
  const {
    svgRef,
    viewBox,
    zoom,
    atHome,
    minZoom,
    maxZoom,
    zoomIn,
    zoomOut,
    reset,
    svgHandlers,
  } = useZoomPan(bounds, !!interactive);
  const wideHud = useWide();
  const hostEl = useZoomHost((s) => s.el);
  const zoomHost = wideHud ? hostEl : null;
  const zoomControls = (
        <div className={zoomHost ? "flex gap-1.5" : "absolute bottom-2 left-2 z-10 flex flex-col gap-1.5"}>
          <button
            type="button"
            className="btn btn-dark h-10 w-10 p-0"
            onClick={zoomIn}
            disabled={zoom >= maxZoom - 1e-6}
            aria-label="Zoom in"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            className="btn btn-dark h-10 w-10 p-0"
            onClick={zoomOut}
            disabled={zoom <= minZoom + 1e-6}
            aria-label="Zoom out"
          >
            <Minus size={18} />
          </button>
          <button
            type="button"
            className="btn btn-dark h-10 w-10 p-0"
            onClick={reset}
            disabled={atHome}
            aria-label="Reset zoom"
          >
            <Maximize2 size={18} />
          </button>
        </div>
  );

  // The popup floats above its spot in screen space, so it keeps its size at any zoom.
  const armed = targets.armed;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [popupAt, setPopupAt] = useState<{
    x: number;
    y: number;
    below: boolean;
  } | null>(null);
  const [resized, setResized] = useState(0);
  useEffect(() => {
    const onResize = () => setResized((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const hasPopup = !!popup;
  useLayoutEffect(() => {
    const ctm = svgRef.current?.getScreenCTM();
    const box = wrapRef.current?.getBoundingClientRect();
    if (!armed || !hasPopup || !ctm || !box) {
      setPopupAt(null);
      return;
    }
    const spot =
      armed.target === "edge"
        ? topo.edges[armed.at]
        : armed.target === "hex"
          ? topo.hexes[armed.at]
          : topo.vertices[armed.at];
    // Above its spot, or below it near the top edge (where the top bar would cover it). A hex's
    // popup clears the whole tile, so its number and the ghost robber stay in view.
    const reach = armed.target === "hex" ? S : 0;
    const above = new DOMPoint(spot.x * S, spot.y * S - reach).matrixTransform(
      ctm,
    );
    const below = above.y - box.top < 140;
    const p =
      below && reach
        ? new DOMPoint(spot.x * S, spot.y * S + reach).matrixTransform(ctm)
        : above;
    // Keep the (up to 3-wide) popup from running off the left/right edge on narrow screens: its
    // horizontal center is clamped so it always has room, the same way the vertical flip keeps it
    // from going off the top.
    const margin = Math.min(140, box.width / 2);
    const x = Math.min(Math.max(p.x - box.left, margin), box.width - margin);
    setPopupAt({ x, y: p.y - box.top, below });
  }, [armed, hasPopup, viewBox, topo, resized, svgRef]);

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        // The game screen frames the board in the space its panels leave free, but a zoomed-in board
        // keeps going to the screen edges (under the panels, like the 3D canvas) instead of being cut
        // off at that frame.
        className={`h-full w-full select-none ${interactive ? "overflow-visible" : ""}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Game board"
        {...svgHandlers}
        // A click that reaches the board itself (no target took it) closes the build popup.
        onClick={onBackground ? () => onBackground() : undefined}
      >
        {/* The sea itself is painted by the container (.sea-2d) so it spans the whole screen. */}

        {/* foam, beach & tiles */}
        {scene.board.hexes.map((h) => (
          <polygon
            key={`f${h.id}`}
            points={hexPoints(topo, h.id, 1.26)}
            fill={palette.sea.foam}
            opacity="0.45"
          />
        ))}
        {scene.board.hexes.map((h) => (
          <polygon
            key={`b${h.id}`}
            points={hexPoints(topo, h.id, 1.12)}
            fill={palette.beach}
          />
        ))}
        {scene.board.hexes.map((h) => {
          const t = topo.hexes[h.id];
          const c = h.fog ? palette.fog : palette.terrain[h.terrain];
          const target = hexTargets.has(h.id);
          return (
            <g
              key={`h${h.id}`}
              onClick={
                target && onHex
                  ? (ev) => {
                      ev.stopPropagation();
                      onHex(h.id);
                    }
                  : undefined
              }
              onMouseEnter={target ? () => setHover(`h${h.id}`) : undefined}
              onMouseLeave={target ? () => setHover(null) : undefined}
              className={target ? "cursor-pointer" : undefined}
              data-hex-anchor={h.id}
            >
              <polygon
                points={hexPoints(topo, h.id, TILE_SIZE)}
                fill={c.top}
                stroke={c.side}
                strokeWidth="5"
                strokeLinejoin="round"
              />
              {h.fog ? (
                <FogGlyphs cx={t.x * S} cy={t.y * S} fog={palette.fog} />
              ) : (
                (THEME_GLYPHS[theme]?.({
                  terrain: h.terrain,
                  cx: t.x * S,
                  cy: t.y * S,
                  c: palette.terrain[h.terrain],
                }) ?? (
                  <TerrainGlyphs
                    terrain={h.terrain}
                    cx={t.x * S}
                    cy={t.y * S}
                    c={palette.terrain[h.terrain]}
                  />
                ))
              )}
              {/* after a roll: the tiles that pay out glow, the rest of the board steps back */}
              {scene.highlightToken !== null &&
                (h.token === scene.highlightToken && !h.fog ? (
                  <polygon
                    points={hexPoints(topo, h.id, 0.9)}
                    fill="none"
                    stroke={h.id === scene.robber ? "#d9483b" : "#f2b33d"}
                    strokeWidth="9"
                    strokeLinejoin="round"
                    strokeDasharray={
                      h.id === scene.robber ? "16 10" : undefined
                    }
                    pointerEvents="none"
                  >
                    <animate
                      attributeName="stroke-opacity"
                      values="1;0.45;1"
                      dur="0.9s"
                      repeatCount="indefinite"
                    />
                  </polygon>
                ) : (
                  <polygon
                    points={hexPoints(topo, h.id, TILE_SIZE)}
                    fill="#0b2530"
                    opacity="0.28"
                    pointerEvents="none"
                  />
                ))}
              {target && (
                <polygon
                  points={hexPoints(topo, h.id, 0.8)}
                  fill={
                    hover === `h${h.id}`
                      ? "rgba(242,179,61,0.35)"
                      : "rgba(242,179,61,0.12)"
                  }
                  stroke="#f2b33d"
                  strokeWidth="6"
                  strokeDasharray="14 8"
                  strokeLinejoin="round"
                />
              )}
            </g>
          );
        })}

        {palette.gloom2d && (
          <Gloom scene={scene} topo={topo} gloom={palette.gloom2d} />
        )}

        {/* harbors */}
        {scene.board.harbors.map((hb) => {
          const e = topo.edges[hb.edge];
          const at = harborAnchor(topo, hb.edge, 0.66);
          const px = at.x * S;
          const py = at.y * S;
          const label =
            hb.kind === "any"
              ? "3:1 harbor: any resource"
              : `2:1 harbor: ${CARD_COLORS[hb.kind].label}`;
          return (
            <g key={`hb${hb.edge}`} pointerEvents="none">
              <title>{label}</title>
              {/* wooden piers from both corners */}
              {[e.a, e.b].map((v) => (
                <line
                  key={v}
                  x1={topo.vertices[v].x * S}
                  y1={topo.vertices[v].y * S}
                  x2={px}
                  y2={py + 10}
                  stroke={palette.pier?.deck ?? "#9c6f42"}
                  strokeWidth="8"
                  strokeDasharray="5 3"
                  strokeLinecap="butt"
                />
              ))}
              {/* a little ship: hull, mast and a sail showing the rate */}
              <g transform={`translate(${px} ${py}) scale(${1.35 * ps})`}>
                <path
                  d="M-24 8h48l-9 13h-30Z"
                  fill="#8a6139"
                  stroke="#1f1a14"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <rect x="-1.5" y="-38" width="3" height="47" fill="#5a3d22" />
                <path
                  d="M-19-34h36q-4 16 0 34h-36q4-18 0-34Z"
                  fill="#f6eddb"
                  stroke="#1f1a14"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                {hb.kind === "any" ? (
                  <text
                    y="-20"
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="900"
                    fill="#1f1a14"
                  >
                    ?
                  </text>
                ) : (
                  <circle
                    cy="-24"
                    r="6.5"
                    fill={CARD_COLORS[hb.kind].bg}
                    stroke="#1f1a14"
                    strokeWidth="1.5"
                  />
                )}
                <text
                  y="-5"
                  textAnchor="middle"
                  className="display"
                  fontSize="13"
                  fontWeight="900"
                  fill="#1f1a14"
                >
                  {hb.kind === "any" ? "3:1" : "2:1"}
                </text>
              </g>
            </g>
          );
        })}

        {/* tokens */}
        {scene.board.hexes.map((h) => {
          if (!h.token) return null;
          const t = topo.hexes[h.id];
          const red = h.token === 6 || h.token === 8;
          const lit = scene.highlightToken === h.token && h.id !== scene.robber;
          const pips = PIPS[h.token];
          return (
            <g
              key={`t${h.id}`}
              pointerEvents="none"
              transform={grow(t.x * S, t.y * S, ps)}
            >
              <circle
                cx={t.x * S}
                cy={t.y * S}
                r="29"
                fill={lit ? "#f2b33d" : TOKEN.face}
                stroke={TOKEN.rim}
                strokeWidth="5"
              />
              <text
                x={t.x * S}
                y={t.y * S + 7}
                textAnchor="middle"
                className="display"
                fontSize="27"
                fontWeight="800"
                fill={red ? TOKEN.hot : TOKEN.ink}
              >
                {h.token}
              </text>
              {Array.from({ length: pips }, (_, i) => (
                <path
                  key={i}
                  d={`M${t.x * S + (i - (pips - 1) / 2) * 6} ${t.y * S + 15.5}l2.5 2.5-2.5 2.5-2.5-2.5Z`}
                  fill={red ? TOKEN.hot : TOKEN.ink}
                />
              ))}
            </g>
          );
        })}

        {/* roads */}
        {scene.roads.map((owner, eid) => {
          if (owner === null) return null;
          const e = topo.edges[eid];
          const a = topo.vertices[e.a];
          const b = topo.vertices[e.b];
          const c = PLAYER_COLORS[scene.colors[owner]];
          const k = 0.16;
          const x1 = (a.x + (b.x - a.x) * k) * S;
          const y1 = (a.y + (b.y - a.y) * k) * S;
          const x2 = (b.x + (a.x - b.x) * k) * S;
          const y2 = (b.y + (a.y - b.y) * k) * S;
          return (
            <g key={`r${eid}`} pointerEvents="none">
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={c.dark}
                strokeWidth={20 * ps}
                strokeLinecap="round"
              />
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={c.hex}
                strokeWidth={12 * ps}
                strokeLinecap="round"
              />
            </g>
          );
        })}

        {/* buildings */}
        {scene.buildings.map((b, v) => {
          if (!b) return null;
          const p = topo.vertices[v];
          const color = scene.colors[b.owner];
          return b.city ? (
            <g
              key={`c${v}`}
              pointerEvents="none"
              transform={grow(p.x * S, p.y * S, ps)}
            >
              <CityPath x={p.x * S} y={p.y * S} color={color} />
              {b.wall && (
                <g>
                  {/* dark outline first so the ring reads on every hex colour, incl. grey mountains */}
                  <circle
                    cx={p.x * S}
                    cy={p.y * S}
                    r="35"
                    fill="none"
                    stroke="#3a2f22"
                    strokeWidth="9"
                  />
                  <circle
                    cx={p.x * S}
                    cy={p.y * S}
                    r="35"
                    fill="none"
                    stroke="#e8d9b5"
                    strokeWidth="6"
                  />
                  {/* battlement notches: dark teeth dashed over the light stone ring */}
                  <circle
                    cx={p.x * S}
                    cy={p.y * S}
                    r="35"
                    fill="none"
                    stroke="#5b4a36"
                    strokeWidth="6"
                    strokeDasharray="8 6"
                  />
                </g>
              )}
              {b.metropolis && (
                <circle
                  cx={p.x * S + 21}
                  cy={p.y * S - 26}
                  r="9"
                  fill="#f2c14e"
                  stroke="#1f1a14"
                  strokeWidth="2.5"
                />
              )}
            </g>
          ) : (
            <HousePath
              key={`s${v}`}
              x={p.x * S}
              y={p.y * S}
              color={color}
              k={ps}
            />
          );
        })}

        {/* knights (C&K) */}
        {scene.knights.map((k, v) => {
          if (!k) return null;
          const p = topo.vertices[v];
          const c = PLAYER_COLORS[scene.colors[k.owner]];
          return (
            <g
              key={`k${v}`}
              pointerEvents="none"
              transform={grow(p.x * S, p.y * S, ps)}
            >
              <circle
                cx={p.x * S}
                cy={p.y * S}
                r="23"
                fill={k.active ? "#f2b33d" : "#2d2c33"}
                stroke="#1f1a14"
                strokeWidth={k.active ? 4.5 : 3}
              />
              <path
                d={`M${p.x * S - 13} ${p.y * S - 12}h26v9c0 9-5 14-13 17-8-2.5-13-8-13-17Z`}
                fill={c.hex}
                stroke={c.dark}
                strokeWidth="2.5"
              />
              {Array.from({ length: k.level }, (_, i) => (
                <circle
                  key={i}
                  cx={p.x * S + (i - (k.level - 1) / 2) * 8}
                  cy={p.y * S + 2}
                  r="3"
                  fill={c.ink}
                  stroke={c.dark}
                  strokeWidth="0.75"
                />
              ))}
            </g>
          );
        })}

        {/* merchant (C&K) */}
        {scene.merchant &&
          (() => {
            const t = topo.hexes[scene.merchant.hex];
            const c = PLAYER_COLORS[scene.colors[scene.merchant.owner]];
            const x = t.x * S - 44;
            const y = t.y * S - 8;
            return (
              <g pointerEvents="none" transform={grow(x, y, ps)}>
                <title>Merchant</title>
                <path
                  d={`M${x - 11} ${y + 14}c0-12 4-20 11-20s11 8 11 20Z`}
                  fill={c.hex}
                  stroke={c.dark}
                  strokeWidth="2.5"
                />
                <circle
                  cx={x}
                  cy={y - 11}
                  r="6.5"
                  fill="#e8c9a5"
                  stroke="#1f1a14"
                  strokeWidth="1.5"
                />
                <path
                  d={`M${x - 8} ${y - 15}h16l-3-6h-10Z`}
                  fill="#e3b94a"
                  stroke="#1f1a14"
                  strokeWidth="1.5"
                />
              </g>
            );
          })()}

        {/* robber */}
        <RobberFigure
          x={topo.hexes[scene.robber].x * S}
          y={topo.hexes[scene.robber].y * S + 46}
          k={ps}
        />

        {/* barbarian ship's voyage (C&K) */}
        {barbarian && barbLayout && (
          <BarbarianTrack2D barbarian={barbarian} layout={barbLayout} palette={palette} theme={theme} />
        )}

        {/* targets */}
        {onEdge &&
          targets.edges.map((eid) => {
            const e = topo.edges[eid];
            const a = topo.vertices[e.a];
            const b = topo.vertices[e.b];
            const k = 0.2;
            const key = `e${eid}`;
            const x1 = (a.x + (b.x - a.x) * k) * S;
            const y1 = (a.y + (b.y - a.y) * k) * S;
            const x2 = (b.x + (a.x - b.x) * k) * S;
            const y2 = (b.y + (a.y - b.y) * k) * S;
            const isHover = hover === key;
            return (
              <g
                key={key}
                className="cursor-pointer"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onEdge(eid);
                }}
                onMouseEnter={() => setHover(key)}
                onMouseLeave={() => setHover(null)}
              >
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth="26"
                />
                {targets.hint ? (
                  // Build hints only show on hover: a preview of the road.
                  isHover &&
                  myColor && (
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={PLAYER_COLORS[myColor].hex}
                      strokeWidth={11 * ps}
                      strokeLinecap="round"
                      opacity="0.7"
                    />
                  )
                ) : (
                  <>
                    {/* dark underlay so the amber reads on light tiles */}
                    {!isHover && (
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#1f1a14"
                        strokeOpacity="0.4"
                        strokeWidth="12"
                        strokeLinecap="round"
                      />
                    )}
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={
                        isHover && myColor
                          ? PLAYER_COLORS[myColor].hex
                          : "#f2b33d"
                      }
                      strokeWidth={isHover ? 11 : 8}
                      strokeLinecap="round"
                      strokeDasharray={isHover ? undefined : "10 8"}
                    >
                      {!isHover && (
                        <animate
                          attributeName="stroke-dashoffset"
                          from="0"
                          to="-36"
                          dur="1s"
                          repeatCount="indefinite"
                        />
                      )}
                    </line>
                  </>
                )}
              </g>
            );
          })}
        {onVertex &&
          targets.vertices.map((vid) => {
            const p = topo.vertices[vid];
            const key = `v${vid}`;
            const isHover = hover === key;
            const kind = targets.vertexKinds?.[vid] ?? targets.kind;
            return (
              <g
                key={key}
                className="cursor-pointer"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onVertex(vid);
                }}
                onMouseEnter={() => setHover(key)}
                onMouseLeave={() => setHover(null)}
              >
                <circle cx={p.x * S} cy={p.y * S} r="22" fill="transparent" />
                {isHover && myColor && kind === "settlement" && (
                  <HousePath
                    x={p.x * S}
                    y={p.y * S}
                    color={myColor}
                    ghost
                    k={ps}
                  />
                )}
                {isHover && myColor && kind === "city" && (
                  <CityPath
                    x={p.x * S}
                    y={p.y * S}
                    color={myColor}
                    ghost
                    k={ps}
                  />
                )}
                {kind === "knightAction" ? (
                  <circle
                    cx={p.x * S}
                    cy={p.y * S}
                    r="21"
                    fill="none"
                    stroke={isHover ? "#f2b33d" : "#f6eddb"}
                    strokeOpacity={isHover ? 1 : 0.6}
                    strokeWidth="3"
                    strokeDasharray="5 4"
                  />
                ) : targets.hint ? (
                  // Build hints only show on hover: the piece itself (above), or a ring for knights and walls.
                  isHover &&
                  (kind === "knight" || kind === "wall") && (
                    <HintRing
                      x={p.x * S}
                      y={p.y * S}
                      r={kind === "wall" ? 30 : 16}
                      filled={false}
                      hover
                    />
                  )
                ) : (
                  <g>
                    <circle
                      cx={p.x * S}
                      cy={p.y * S}
                      r="12"
                      fill="none"
                      stroke="#1f1a14"
                      strokeOpacity="0.4"
                      strokeWidth="8"
                    >
                      <animate
                        attributeName="r"
                        values="10;15;10"
                        dur="1.4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    <circle
                      cx={p.x * S}
                      cy={p.y * S}
                      r="12"
                      fill="rgba(242,179,61,0.35)"
                      stroke="#f2b33d"
                      strokeWidth="4"
                    >
                      <animate
                        attributeName="r"
                        values="10;15;10"
                        dur="1.4s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  </g>
                )}
              </g>
            );
          })}

        {/* the spot whose popup is open keeps its ghost */}
        {armed?.target === "hex" && (
          <RobberFigure
            x={topo.hexes[armed.at].x * S}
            y={topo.hexes[armed.at].y * S + 46}
            k={ps}
            ghost
          />
        )}
        {armed &&
          armed.target !== "hex" &&
          myColor &&
          (() => {
            if (armed.target === "edge") {
              const e = topo.edges[armed.at];
              const a = topo.vertices[e.a];
              const b = topo.vertices[e.b];
              const k = 0.2;
              return (
                <line
                  x1={(a.x + (b.x - a.x) * k) * S}
                  y1={(a.y + (b.y - a.y) * k) * S}
                  x2={(b.x + (a.x - b.x) * k) * S}
                  y2={(b.y + (a.y - b.y) * k) * S}
                  stroke={PLAYER_COLORS[myColor].hex}
                  strokeWidth={11 * ps}
                  strokeLinecap="round"
                  opacity="0.7"
                  pointerEvents="none"
                />
              );
            }
            const p = topo.vertices[armed.at];
            return (
              <g pointerEvents="none">
                {armed.what === "settlement" ? (
                  <HousePath
                    x={p.x * S}
                    y={p.y * S}
                    color={myColor}
                    ghost
                    k={ps}
                  />
                ) : armed.what === "city" ? (
                  <CityPath
                    x={p.x * S}
                    y={p.y * S}
                    color={myColor}
                    ghost
                    k={ps}
                  />
                ) : (
                  <HintRing
                    x={p.x * S}
                    y={p.y * S}
                    r={armed.what === "wall" ? 30 : 16}
                    filled={false}
                    hover
                  />
                )}
              </g>
            );
          })()}
      </svg>
      {popup && popupAt && (
        <div
          className="absolute z-30"
          style={{
            left: popupAt.x,
            top: popupAt.y,
            transform: popupAt.below
              ? "translate(-50%, 22px)"
              : "translate(-50%, calc(-100% - 16px))",
          }}
        >
          {popup}
        </div>
      )}
      {/* On wide screens the zoom buttons live in the HUD (wherever the player put them), a row there. */}
      {interactive && (zoomHost ? createPortal(zoomControls, zoomHost) : zoomControls)}
    </div>
  );
}
