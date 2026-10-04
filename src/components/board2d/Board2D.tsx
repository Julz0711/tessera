"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minus, Plus } from "lucide-react";
import { PIPS, TERRAIN_RESOURCE } from "@/engine/constants";
import { getTopology, type Topology } from "@/engine/board/topology";
import type { Hex, PlayerColor, Terrain } from "@/engine/types";
import { CARD_COLORS } from "@/client/palette";
import { PALETTES, type BoardPalette, type BoardThemeId, type TileColors } from "@/client/themes";
import { THEME_ACCENTS, THEME_BARBARIAN_SHIPS, THEME_PIECES, type BarbarianShipGlyph } from "./themes";
import { classicAccents, GoldNuggets } from "./themes/classic";
import { OUTLINE, ROAD_WEIGHT, RoadBase } from "./themes/shared";
import { VOYAGE_GLYPHS } from "./themes/voyage";
import { PLAYER_COLORS } from "@/shared/colors";
import { harborAnchor, pirateSpot } from "@/components/board/harbor";
import { BARBARIAN_HEADER_H, barbarianTrackLayout, type BarbarianLayout } from "@/components/board/barbarian";
import type { BoardProps, BoardScene } from "@/components/board/types";
import { useZoomPan } from "./useZoomPan";
import { useZoomHost } from "@/client/hud";
import { BoardArt } from "@/components/game/cardArt";

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
/*
 * A tile's layout, as on colonist.io (measured off its board, in tile radii R ≈ 93 here): the
 * resource card's icon at the top, the number on a rounded square below the centre, and one small
 * accessory either side of the icon.
 */
const ICON_SIZE = 56;
const ICON_RISE = 37;
const TOKEN_DROP = 32;
const TOKEN_HALF = 30;
const ACCENT_DX = 49;
const ACCENT_RISE = 20;
/** Where the robber stands from the tile's centre: beside the number, opposite the merchant (C&K). */
const ROBBER_DX = 54;
const ROBBER_DY = 24;
const MERCHANT_DX = -54;
const MERCHANT_DY = 20;

/**
 * Whether tiles are lit up right now: after a roll, or the Inventor's swap. A roll nothing pays out
 * on (a 7) lights nothing, so it leaves the board as it is instead of dimming all of it.
 */
function lighting(scene: BoardScene): boolean {
  if (scene.highlightHexes) return true;
  const n = scene.highlightToken;
  return n !== null && scene.board.hexes.some((h) => h.token === n && !h.fog);
}

/** Whether this tile is one of those lit up (the rolled number's, or one the Inventor swapped). */
function isLit(scene: BoardScene, h: Hex): boolean {
  if (scene.highlightHexes) return scene.highlightHexes.includes(h.id);
  return h.token !== null && h.token === scene.highlightToken && !h.fog;
}

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

/**
 * A tile's drawings (colonist.io style): the resource card's icon at the top (gold's nuggets, or the
 * desert's centrepiece instead), with the theme's accessory either side, the right one mirrored.
 */
function TileArt({ terrain, cx, cy, c, theme }: { terrain: Terrain; cx: number; cy: number; c: TileColors; theme: BoardThemeId }) {
  const accents = THEME_ACCENTS[theme];
  const ay = cy - ACCENT_RISE;
  const side = (right: boolean) => {
    const x = right ? cx + ACCENT_DX : cx - ACCENT_DX;
    const p = { terrain, x, y: ay, c, right };
    const art = accents?.side(p) ?? classicAccents.side(p);
    return right ? <g transform={`translate(${2 * x} 0) scale(-1 1)`}>{art}</g> : art;
  };
  const resource = TERRAIN_RESOURCE[terrain];
  return (
    <g pointerEvents="none">
      {side(false)}
      {side(true)}
      {resource ? (
        <BoardArt card={resource} cx={cx} cy={cy - ICON_RISE} size={ICON_SIZE} />
      ) : terrain === "gold" ? (
        <GoldNuggets x={cx} y={cy - ICON_RISE} />
      ) : terrain === "desert" ? (
        (accents?.desert ?? classicAccents.desert!)({ x: cx, y: cy + 4, c })
      ) : null}
    </g>
  );
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

/** The classic settlement: a simple gabled house, filled in the owner's colour. */
function classicSettlement({ x, y, color }: { x: number; y: number; color: PlayerColor }) {
  const c = PLAYER_COLORS[color];
  return (
    <path
      d={`M${x - 17} ${y + 14}v-17l17-14 17 14v17Z`}
      fill={c.hex}
      stroke={c.dark}
      strokeWidth={OUTLINE}
      strokeLinejoin="round"
    />
  );
}

/** The classic city: a keep beside a tower, filled in the owner's colour. */
function classicCity({ x, y, color }: { x: number; y: number; color: PlayerColor }) {
  const c = PLAYER_COLORS[color];
  return (
    <path
      d={`M${x - 26} ${y + 17}v-18l12-9 12 9v-18h9v-8h8v8h9v36Z`}
      fill={c.hex}
      stroke={c.dark}
      strokeWidth={OUTLINE}
      strokeLinejoin="round"
    />
  );
}

/**
 * A city wall (C&K), flat like every other piece: a rampart behind the city in the owner's colour
 * and outline, a low band along its foot with a merlon standing up at each end, so a walled city
 * reads as a wider, battlemented silhouette.
 */
function CityWallBlock({ x, y, color }: { x: number; y: number; color: PlayerColor }) {
  const c = PLAYER_COLORS[color];
  return (
    <path
      d={`M${x - 40} ${y + 25}V${y - 3}h8v8h64v-8h8V${y + 25}Z`}
      fill={c.hex}
      stroke={c.dark}
      strokeWidth={OUTLINE}
      strokeLinejoin="round"
    />
  );
}

/** A settlement: the theme's own drawing (THEME_PIECES) where it has one, else the classic house. */
function HousePath({
  x,
  y,
  color,
  ghost,
  k = 1,
  theme,
}: {
  x: number;
  y: number;
  color: PlayerColor;
  ghost?: boolean;
  k?: number;
  theme?: BoardThemeId;
}) {
  const glyph = (theme && THEME_PIECES[theme]?.settlement) || classicSettlement;
  return (
    <g transform={grow(x, y, k)} opacity={ghost ? 0.6 : 1}>
      {glyph({ x, y, color })}
    </g>
  );
}

/** A city: the theme's own drawing (THEME_PIECES) where it has one, else the classic keep and tower. */
function CityPath({
  x,
  y,
  color,
  ghost,
  k = 1,
  theme,
}: {
  x: number;
  y: number;
  color: PlayerColor;
  ghost?: boolean;
  k?: number;
  theme?: BoardThemeId;
}) {
  const glyph = (theme && THEME_PIECES[theme]?.city) || classicCity;
  return (
    <g transform={grow(x, y, k)} opacity={ghost ? 0.6 : 1}>
      {glyph({ x, y, color })}
    </g>
  );
}

/** A road: the theme's own drawing (THEME_PIECES) where it has one, else the classic two-tone line. */
function RoadPath({
  x1,
  y1,
  x2,
  y2,
  color,
  ghost,
  k = 1,
  theme,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: PlayerColor;
  ghost?: boolean;
  k?: number;
  theme?: BoardThemeId;
}) {
  const glyph = (theme && THEME_PIECES[theme]?.road) || RoadBase;
  return (
    <g pointerEvents="none" opacity={ghost ? 0.7 : undefined}>
      {glyph({ x1, y1, x2, y2, color, ghost, k: k * ROAD_WEIGHT })}
    </g>
  );
}

/** The classic knight's emblem: a small crest, filled in the owner's colour (the crossed-swords look). */
function classicKnightEmblem({ x, y, color }: { x: number; y: number; color: PlayerColor }) {
  const c = PLAYER_COLORS[color];
  return (
    <path
      d={`M${x - 13} ${y - 12}h26v9c0 9-5 14-13 17-8-2.5-13-8-13-17Z`}
      fill={c.hex}
      stroke={c.dark}
      strokeWidth="2.5"
    />
  );
}

/** A knight's emblem: the theme's own drawing (THEME_PIECES) where it has one, else the classic crest. */
function KnightEmblem({
  x,
  y,
  color,
  theme,
}: {
  x: number;
  y: number;
  color: PlayerColor;
  theme?: BoardThemeId;
}) {
  const glyph = (theme && THEME_PIECES[theme]?.knight) || classicKnightEmblem;
  return <>{glyph({ x, y, color })}</>;
}

/** A ship on an edge (Voyagers), in the theme's style and the owner's colour. */
function ShipPiece({
  topo,
  edge,
  color,
  theme,
  ghost,
  selected,
  k = 1,
}: {
  topo: Topology;
  edge: number;
  color: PlayerColor;
  theme: BoardThemeId;
  ghost?: boolean;
  selected?: boolean;
  k?: number;
}) {
  const e = topo.edges[edge];
  // Angled along the edge, never upside down. On the vertical edges it stays level: a boat standing
  // on its end reads badly, and every theme's craft is drawn side-on.
  let deg = (e.angle * 180) / Math.PI;
  if (deg > 90) deg -= 180;
  if (deg <= -90) deg += 180;
  if (Math.abs(deg) > 60) deg = 0;
  return (
    <g pointerEvents="none" opacity={ghost ? 0.7 : 1} transform={`translate(${e.x * S} ${e.y * S}) rotate(${deg.toFixed(1)}) scale(${k * 0.85})`}>
      {selected && <ellipse rx="40" ry="20" fill="none" stroke="#f2b33d" strokeWidth="5" strokeDasharray="8 5" />}
      {VOYAGE_GLYPHS[theme].ship({ color })}
    </g>
  );
}

/** The pirate (Voyagers): the theme's dark craft in its sea hex (see `pirateSpot`). */
function PirateShip({ x, y, theme, ghost, k = 1 }: { x: number; y: number; theme: BoardThemeId; ghost?: boolean; k?: number }) {
  return (
    <g pointerEvents="none" opacity={ghost ? 0.6 : 1} transform={`translate(${x} ${y}) scale(${k * 1.3})`}>
      <title>Pirate</title>
      {!ghost && <ellipse cy="20" rx="30" ry="6" fill="#000" opacity="0.25" />}
      {VOYAGE_GLYPHS[theme].pirate()}
    </g>
  );
}

/** A treasure on a corner (Veiled Isles): what's inside stays hidden until a road or ship reaches it. */
function TreasureChest({ x, y, theme, k = 1 }: { x: number; y: number; theme: BoardThemeId; k?: number }) {
  return (
    <g pointerEvents="none" transform={`translate(${x} ${y}) scale(${k})`}>
      <title>Treasure</title>
      {VOYAGE_GLYPHS[theme].treasure()}
    </g>
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
    // A slate figure with the pieces' dark outline, so it stands out on dark forest as well as on pale desert.
    <g pointerEvents="none" transform={grow(x, y, k * 1.25)} opacity={ghost ? 0.6 : 1}>
      {!ghost && (
        <ellipse cx={x} cy={y + 16} rx="15" ry="5" fill="#000" opacity="0.3" />
      )}
      <g stroke="#1f1a14" strokeWidth="2.5" strokeLinejoin="round">
        <path d={`M${x - 12} ${y + 16}c0-14 5-24 12-24s12 10 12 24Z`} fill="#5d5c68" />
        <circle cx={x} cy={y - 12} r="8" fill="#76757f" />
      </g>
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
  // The lamp stands out by the upper-left or upper-right corner, beyond the tile's accessory: the
  // top corner is the resource icon's.
  const spot = (id: number) => {
    const a = (((id * 7 + 3) % 2 ? 11 : 7) * Math.PI) / 6;
    const t = topo.hexes[id];
    return {
      x: (t.x + Math.cos(a) * 0.78) * S,
      y: (t.y + Math.sin(a) * 0.78) * S,
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
        (isLit(scene, h) && h.id !== scene.robber) ? null : (
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
            {/* A lantern on a post, not a dot: a round lamp near a corner reads as a build spot. */}
            <line x1={x} y1={y + 3} x2={x} y2={y + 15} stroke={gloom.lampRim} strokeWidth="3" strokeLinecap="round" />
            <rect
              x={x - 4.5}
              y={y - 7}
              width="9"
              height="10"
              rx="2"
              fill={lights[i].lamp}
              stroke={gloom.lampRim}
              strokeWidth="2"
            />
            <path d={`M${x - 6} ${y - 7}L${x} ${y - 12}L${x + 6} ${y - 7}Z`} fill={gloom.lampRim} />
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

/** Width of the lane beside the barbarian steps that holds the voyage arrow. */
const BARBARIAN_ARROW_LANE = 22;

/** A slim arrow pointing down the barbarian track, from the first step to the landing. */
function VoyageArrow({ x, from, to, danger }: { x: number; from: number; to: number; danger: boolean }) {
  const color = danger ? "#ff8a73" : "#f6eddb";
  return (
    <g opacity={danger ? 0.95 : 0.7} stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d={`M${x} ${from} V${to - 4}`} strokeWidth="4" strokeDasharray="2 9" />
      <path d={`M${x - 8} ${to - 12} L${x} ${to} L${x + 8} ${to - 12}`} strokeWidth="4.5" />
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
  // The field leaves a lane on its outer (west) side for the arrow of the voyage.
  const left = Math.min(...xs) - r - 10 - BARBARIAN_ARROW_LANE;
  const width = Math.max(...xs) - Math.min(...xs) + 2 * r + 20 + BARBARIAN_ARROW_LANE;
  const hx = layout.header.x * S;
  const hy = layout.header.y * S;
  const top = hy - (BARBARIAN_HEADER_H * S) / 2 - 4;
  const bottom = steps[steps.length - 1].y * S + r + 10;
  const ship = steps[barbarian.position];
  const paper = "#f6eddb";
  return (
    <g pointerEvents="none">
      <rect x={left} y={top} width={width} height={bottom - top} rx="16" fill="#0b2233" opacity="0.5" />
      {/* the way the ship sails: down the steps to the landing, where it attacks the island */}
      <VoyageArrow x={left + BARBARIAN_ARROW_LANE / 2 + 4} from={steps[0].y * S - r * 0.5} to={steps[steps.length - 1].y * S + r * 0.35} danger={danger} />
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
  const harborEdges = scene.board.harbors.map((h) => h.edge);
  const pirate = scene.pirate != null ? pirateSpot(topo, scene.board.hexes, scene.pirate, harborEdges) : null;
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
      minX = Math.min(minX, (barbLayout.at(0).x - barbLayout.r) * S - 30 - BARBARIAN_ARROW_LANE);
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
  const land = scene.board.hexes.filter((h) => h.terrain !== "sea" || h.fog);
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
  // Phones pinch and drag instead: the only button there is the way back, once zoomed in.
  const zoomControls = !zoomHost ? (
    !atHome && (
      <button type="button" className="btn btn-dark absolute bottom-2 left-2 z-10 h-10 w-10 p-0" onClick={reset} aria-label="Reset zoom">
        <Maximize2 size={18} />
      </button>
    )
  ) : (
        <div className="flex gap-1.5">
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
        {land.map((h) => (
          <polygon
            key={`f${h.id}`}
            points={hexPoints(topo, h.id, 1.26)}
            fill={palette.sea.foam}
            opacity="0.45"
          />
        ))}
        {land.map((h) => (
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
          const sea = h.terrain === "sea" && !h.fog;
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
              {sea ? (
                // Open water (Voyagers): the sea shows through, with a faint outline for the hex grid.
                <polygon
                  points={hexPoints(topo, h.id, TILE_SIZE)}
                  fill={palette.sea.shallow}
                  fillOpacity="0.25"
                  stroke={palette.sea.foam}
                  strokeOpacity="0.35"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
              ) : (
                <polygon
                  points={hexPoints(topo, h.id, TILE_SIZE)}
                  fill={c.top}
                  stroke={c.side}
                  strokeWidth="5"
                  strokeLinejoin="round"
                />
              )}
              {sea ? null : h.fog ? (
                <FogGlyphs cx={t.x * S} cy={t.y * S} fog={palette.fog} />
              ) : (
                <TileArt terrain={h.terrain} cx={t.x * S} cy={t.y * S} c={palette.terrain[h.terrain]} theme={theme} />
              )}
              {/* after a roll (or the Inventor's swap): the tiles that pay out glow, the rest of the board steps back */}
              {lighting(scene) && !sea &&
                (isLit(scene, h) ? (
                  <polygon
                    points={hexPoints(topo, h.id, 0.9)}
                    fill="none"
                    stroke={h.id === scene.robber && !scene.highlightHexes ? "#d9483b" : "#f2b33d"}
                    strokeWidth="9"
                    strokeLinejoin="round"
                    strokeDasharray={
                      h.id === scene.robber && !scene.highlightHexes ? "16 10" : undefined
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
              {/* A tile you can pick (robber, Inventor…): a solid cream ring with dark edges, the
                  build hints' look, so it reads on yellow fields as well as dark forest. */}
              {target && (
                <g pointerEvents="none">
                  <polygon
                    points={hexPoints(topo, h.id, 0.84)}
                    fill={hover === `h${h.id}` ? "rgba(255,243,207,0.35)" : "none"}
                    stroke="#1f1a14"
                    strokeOpacity="0.55"
                    strokeWidth="10"
                    strokeLinejoin="round"
                  />
                  <polygon
                    points={hexPoints(topo, h.id, 0.84)}
                    fill="none"
                    stroke={hover === `h${h.id}` ? "#fff3cf" : "#f6eddb"}
                    strokeWidth="5"
                    strokeLinejoin="round"
                  />
                </g>
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
          const at = harborAnchor(topo, scene.board.hexes, hb.edge, 0.66, harborEdges);
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
          const lit = scene.highlightHexes ? scene.highlightHexes.includes(h.id) : scene.highlightToken === h.token && h.id !== scene.robber;
          const pips = PIPS[h.token];
          const ty = t.y * S + TOKEN_DROP;
          return (
            <g
              key={`t${h.id}`}
              pointerEvents="none"
              transform={grow(t.x * S, ty, ps)}
            >
              <rect
                x={t.x * S - TOKEN_HALF}
                y={ty - TOKEN_HALF + 4}
                width={TOKEN_HALF * 2}
                height={TOKEN_HALF * 2}
                rx="10"
                fill="#000"
                opacity="0.25"
              />
              <rect
                x={t.x * S - TOKEN_HALF}
                y={ty - TOKEN_HALF}
                width={TOKEN_HALF * 2}
                height={TOKEN_HALF * 2}
                rx="10"
                fill={lit ? "#f2b33d" : TOKEN.face}
                stroke={TOKEN.rim}
                strokeWidth="2.5"
              />
              <text
                x={t.x * S}
                y={ty + 10}
                textAnchor="middle"
                className="display"
                fontSize={h.token >= 10 ? 36 : 40}
                fontWeight="900"
                fill={red ? TOKEN.hot : TOKEN.ink}
              >
                {h.token}
              </text>
              {Array.from({ length: pips }, (_, i) => (
                <circle
                  key={i}
                  cx={t.x * S + (i - (pips - 1) / 2) * 7}
                  cy={ty + 20}
                  r="2.6"
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
          const k = 0.16;
          const x1 = (a.x + (b.x - a.x) * k) * S;
          const y1 = (a.y + (b.y - a.y) * k) * S;
          const x2 = (b.x + (a.x - b.x) * k) * S;
          const y2 = (b.y + (a.y - b.y) * k) * S;
          return (
            <RoadPath
              key={`r${eid}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              color={scene.colors[owner]}
              k={ps}
              theme={theme}
            />
          );
        })}

        {/* ships (Voyagers) */}
        {(scene.ships ?? []).map((owner, eid) =>
          owner === null ? null : (
            <ShipPiece key={`sh${eid}`} topo={topo} edge={eid} color={scene.colors[owner]} theme={theme} k={ps} selected={targets.selectedEdge === eid} />
          ),
        )}

        {/* treasures (Veiled Isles): a chest on each corner not yet reached */}
        {(scene.board.treasures ?? []).map((tr) =>
          tr.takenBy !== undefined ? null : (
            <TreasureChest key={`tr${tr.vertex}`} x={topo.vertices[tr.vertex].x * S} y={topo.vertices[tr.vertex].y * S} theme={theme} k={ps} />
          ),
        )}

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
              {b.wall && <CityWallBlock x={p.x * S} y={p.y * S} color={color} />}
              <CityPath x={p.x * S} y={p.y * S} color={color} theme={theme} />
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
              theme={theme}
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
              <KnightEmblem x={p.x * S} y={p.y * S} color={scene.colors[k.owner]} theme={theme} />
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
            const x = t.x * S + MERCHANT_DX;
            const y = t.y * S + MERCHANT_DY;
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
          x={topo.hexes[scene.robber].x * S + ROBBER_DX}
          y={topo.hexes[scene.robber].y * S + ROBBER_DY}
          k={ps}
        />
        {/* pirate (Voyagers) */}
        {pirate && (
          <PirateShip x={pirate.x * S} y={pirate.y * S} theme={theme} k={ps} />
        )}

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
                {targets.edgeKinds?.[eid] === "shipAction" ? (
                  // A ship that can sail: a soft glow on hover says it can be picked up.
                  isHover && (
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#f2b33d"
                      strokeOpacity="0.45"
                      strokeWidth="26"
                      strokeLinecap="round"
                    />
                  )
                ) : targets.hint ? (
                  // Build hints only show on hover: a preview of the road (or ship).
                  isHover &&
                  myColor && ((targets.edgeKinds?.[eid] ?? targets.kind) === "ship" ? (
                    <ShipPiece topo={topo} edge={eid} color={myColor} theme={theme} k={ps} ghost />
                  ) : (
                    <RoadPath
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      color={myColor}
                      ghost
                      k={ps}
                      theme={theme}
                    />
                  ))
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
                    theme={theme}
                  />
                )}
                {isHover && myColor && kind === "city" && (
                  <CityPath
                    x={p.x * S}
                    y={p.y * S}
                    color={myColor}
                    ghost
                    k={ps}
                    theme={theme}
                  />
                )}
                {kind === "cityImprove" ? (
                  // Your city (C&K): no marker until hovered, then a ring round it, like a wall hint.
                  isHover && <HintRing x={p.x * S} y={p.y * S} r={30} filled={false} hover />
                ) : kind === "knightAction" ? (
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
        {armed?.target === "hex" &&
          (scene.board.hexes[armed.at].terrain === "sea" ? (
            <PirateShip x={topo.hexes[armed.at].x * S} y={topo.hexes[armed.at].y * S} theme={theme} k={ps} ghost />
          ) : (
            <RobberFigure
              x={topo.hexes[armed.at].x * S + ROBBER_DX}
              y={topo.hexes[armed.at].y * S + ROBBER_DY}
              k={ps}
              ghost
            />
          ))}
        {armed &&
          armed.target !== "hex" &&
          myColor &&
          (() => {
            if (armed.target === "edge" && armed.what === "ship") {
              return <ShipPiece topo={topo} edge={armed.at} color={myColor} theme={theme} k={ps} ghost />;
            }
            if (armed.target === "edge") {
              const e = topo.edges[armed.at];
              const a = topo.vertices[e.a];
              const b = topo.vertices[e.b];
              const k = 0.2;
              return (
                <RoadPath
                  x1={(a.x + (b.x - a.x) * k) * S}
                  y1={(a.y + (b.y - a.y) * k) * S}
                  x2={(b.x + (a.x - b.x) * k) * S}
                  y2={(b.y + (a.y - b.y) * k) * S}
                  color={myColor}
                  ghost
                  k={ps}
                  theme={theme}
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
                    theme={theme}
                  />
                ) : armed.what === "city" ? (
                  <CityPath
                    x={p.x * S}
                    y={p.y * S}
                    color={myColor}
                    ghost
                    k={ps}
                    theme={theme}
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
