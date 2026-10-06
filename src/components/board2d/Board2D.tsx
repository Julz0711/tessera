"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minus, Plus } from "lucide-react";
import { PIPS, TERRAIN_RESOURCE } from "@/engine/constants";
import { getTopology, type Topology } from "@/engine/board/topology";
import type { Hex, PlayerColor, Terrain, Track } from "@/engine/types";
import { CARD_COLORS } from "@/client/palette";
import { PALETTES, type BoardPalette, type BoardThemeId, type TileColors } from "@/client/themes";
import { THEME_ACCENTS, THEME_PIECES } from "./themes";
import { classicAccents, GoldNuggets } from "./themes/classic";
import { castlePath, OUTLINE, Pennant, ROAD_WEIGHT, RoadBase } from "./themes/shared";
import { TRACK_STYLE } from "@/client/progressText";
import { VOYAGE_GLYPHS } from "./themes/voyage";
import { PLAYER_COLORS } from "@/shared/colors";
import { harborAnchor, pirateSpot } from "@/components/board/harbor";
import type { BoardProps, BoardScene } from "@/components/board/types";
import { useZoomPan } from "./useZoomPan";
import { useWide, useZoomHost } from "@/client/hud";
import { usePrefs } from "@/client/prefs";
import { BoardArt } from "@/components/game/cardArt";

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
/** The board a quarter turn clockwise: every position turned about the origin, so tokens and pieces stay upright. */
const turnedCache = new WeakMap<Topology, Topology>();
function turned(topo: Topology): Topology {
  let t = turnedCache.get(topo);
  if (!t) {
    t = {
      ...topo,
      hexes: topo.hexes.map((h) => ({ ...h, x: -h.y, y: h.x })),
      vertices: topo.vertices.map((v) => ({ ...v, x: -v.y, y: v.x })),
      edges: topo.edges.map((e) => ({ ...e, x: -e.y, y: e.x, angle: e.angle + Math.PI / 2 })),
    };
    turnedCache.set(topo, t);
  }
  return t;
}

/** Whether the land (and fog) spans clearly wider than it is tall. */
function landIsWide(topo: Topology, hexes: readonly Hex[]): boolean {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  hexes.forEach((h, i) => {
    if (h.terrain === "sea" && !h.fog) return;
    const t = topo.hexes[i];
    minX = Math.min(minX, t.x); maxX = Math.max(maxX, t.x);
    minY = Math.min(minY, t.y); maxY = Math.max(maxY, t.y);
  });
  return maxX - minX > (maxY - minY) * 1.25;
}

/** A screen held upright (clearly taller than wide). */
function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const update = () => setPortrait(window.innerHeight > window.innerWidth * 1.3);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return portrait;
}

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

/**
 * Sticker outline for a piece you can pick: an amber band with an ink edge traced round its
 * silhouette, the board's take on the app's ink-outlined, amber "do this" keys.
 */
function HaloFilter() {
  return (
    <defs>
      <filter id="piece-halo" x="-60%" y="-60%" width="220%" height="220%">
        <feMorphology in="SourceAlpha" operator="dilate" radius="3.5" result="band" />
        <feMorphology in="SourceAlpha" operator="dilate" radius="5.5" result="edge" />
        <feFlood floodColor="#1f1a14" />
        <feComposite in2="edge" operator="in" result="ink" />
        <feFlood floodColor="#f2b33d" />
        <feComposite in2="band" operator="in" result="amber" />
        <feMerge>
          <feMergeNode in="ink" />
          <feMergeNode in="amber" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

/**
 * A building redrawn with the halo on top of itself. Idle it breathes (a target to click);
 * hovered it holds and grows a touch. `preview` swaps in a city, for a settlement you'd upgrade.
 */
function PieceHalo({
  x,
  y,
  b,
  color,
  theme,
  k,
  hover,
  preview,
}: {
  x: number;
  y: number;
  b: { city?: boolean; metropolis?: Track | null };
  color: PlayerColor;
  theme: BoardThemeId;
  k: number;
  hover: boolean;
  preview?: "city";
}) {
  const piece =
    preview === "city" ? (
      <CityPath x={x} y={y} color={color} theme={theme} />
    ) : b.metropolis ? (
      <MetropolisPath x={x} y={y} color={color} track={b.metropolis} theme={theme} />
    ) : b.city ? (
      <CityPath x={x} y={y} color={color} theme={theme} />
    ) : (
      <HousePath x={x} y={y} color={color} theme={theme} />
    );
  return (
    <g pointerEvents="none" transform={grow(x, y, k * (hover ? 1.08 : 1))}>
      <g filter="url(#piece-halo)" opacity={hover ? 1 : undefined}>
        {piece}
        {!hover && (
          <animate attributeName="opacity" values="0.25;1;0.25" dur="1.6s" repeatCount="indefinite" />
        )}
      </g>
    </g>
  );
}

/** Build-hint marker: an amber ring with ink edges, matching the piece halo. */
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
        strokeWidth="7"
      />
      <circle
        cx={x}
        cy={y}
        r={r}
        fill={filled ? "rgba(242,179,61,0.35)" : "none"}
        stroke="#f2b33d"
        strokeWidth="3.5"
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

/** The classic metropolis: a castle keep between two towers, its banner in the track's colour. */
function classicMetropolis({ x, y, color, accent }: { x: number; y: number; color: PlayerColor; accent: string }) {
  const c = PLAYER_COLORS[color];
  return (
    <g>
      <Pennant x={x} y={y - 30} h={13} accent={accent} dark={c.dark} />
      <path d={castlePath(x, y)} fill={c.hex} stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round" />
      <path d={`M${x - 5} ${y + 17}v-8a5 5 0 0 1 10 0v8Z`} fill={c.dark} />
    </g>
  );
}

/** A metropolis (C&K): the theme's own drawing (THEME_PIECES) where it has one, else the classic castle. */
function MetropolisPath({ x, y, color, track, theme }: { x: number; y: number; color: PlayerColor; track: Track; theme?: BoardThemeId }) {
  const glyph = (theme && THEME_PIECES[theme]?.metropolis) || classicMetropolis;
  return <>{glyph({ x, y, color, accent: TRACK_STYLE[track].color })}</>;
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

/** A knight's emblem: one plain crest in the owner's colour, the same in every theme (themed knights read as clutter). */
function KnightEmblem({ x, y, color }: { x: number; y: number; color: PlayerColor }) {
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
  if (Math.abs(deg) > 45) deg = 0;
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
  fitPad = 95,
}: BoardProps) {
  const palette = PALETTES[theme];
  const TOKEN = palette.token;
  // Pieces stand a touch larger than the tokens and harbours they sit beside.
  const ps = pieceScale * 1.12;
  const wideHud = useWide();
  const portrait = usePortrait();
  const turnPref = usePrefs((s) => s.turnBoard);
  const flat = getTopology(scene.board.hexes);
  // A phone held upright turns a wide map a quarter turn, so it runs down the tall screen.
  const turn = !!interactive && !wideHud && portrait && turnPref && landIsWide(flat, scene.board.hexes);
  const topo = turn ? turned(flat) : flat;
  const harborEdges = scene.board.harbors.map((h) => h.edge);
  const pirate = scene.pirate != null ? pirateSpot(topo, scene.board.hexes, scene.pirate, harborEdges) : null;
  const [hover, setHover] = useState<string | null>(null);
  // Phones frame the land (and fog), not the open sea round it, so the island gets every pixel the
  // narrow screen has; the sea is still there to pan to.
  const tight = !!interactive && !wideHud;
  // Which hexes are land, as a key: the frame only moves when that does, not on every new scene.
  const landKey = tight ? scene.board.hexes.map((h) => (h.terrain !== "sea" || h.fog ? 1 : 0)).join("") : "";
  const bounds = useMemo(() => {
    const ids = landKey
      ? [...new Set(topo.hexes.flatMap((h, i) => (landKey[i] === "1" ? h.vertices : [])))]
      : null;
    const verts = ids?.length ? ids.map((id) => topo.vertices[id]) : topo.vertices;
    const xs = verts.map((v) => v.x * S);
    const ys = verts.map((v) => v.y * S);
    const pad = tight ? Math.min(fitPad, 75) : fitPad;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    return {
      minX,
      minY,
      w: Math.max(...xs) + pad - minX,
      h: Math.max(...ys) + pad - minY,
    };
  }, [topo, fitPad, tight, landKey]);
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
  const hostEl = useZoomHost((s) => s.el);
  const zoomHost = wideHud ? hostEl : null;
  // Wide screens zoom with the wheel and drag; their buttons are an accessibility setting.
  const zoomButtons = usePrefs((s) => s.zoomButtons);
  // Phones pinch and drag instead: the only button there is the way back, once zoomed in.
  const zoomControls = wideHud && !zoomButtons ? null : !zoomHost ? (
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

  // Everything inside the board, kept apart from the view: panning and zooming change only the
  // svg's viewBox, many times a second, and rebuilding the whole island for each of those made
  // dragging the board stutter. Topology, pieces, hints and the rest all follow from these inputs.
  const tilesLayer = useMemo(
    () => (
      <>
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
                      fill="none"
                      stroke="#1f1a14"
                      strokeOpacity="0.55"
                      strokeWidth="10"
                      strokeLinejoin="round"
                    />
                    <polygon
                      points={hexPoints(topo, h.id, 0.84)}
                      fill="none"
                      stroke="#f6eddb"
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
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- derived values (topo, land…) follow from these
    [scene, targets, theme, onHex],
  );
  const piecesLayer = useMemo(
    () => (
      <>
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
                <g transform={`translate(${px} ${py}) scale(${1.35 * pieceScale})`}>
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
                transform={grow(t.x * S, ty, pieceScale)}
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
                {b.metropolis ? (
                  <MetropolisPath x={p.x * S} y={p.y * S} color={color} track={b.metropolis} theme={theme} />
                ) : (
                  <CityPath x={p.x * S} y={p.y * S} color={color} theme={theme} />
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
                <KnightEmblem x={p.x * S} y={p.y * S} color={scene.colors[k.owner]} />
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

          {/* robber (a rulebook snippet may have none: robber -1) */}
          {topo.hexes[scene.robber] && (
            <RobberFigure
              x={topo.hexes[scene.robber].x * S + ROBBER_DX}
              y={topo.hexes[scene.robber].y * S + ROBBER_DY}
              k={ps}
            />
          )}
          {/* pirate (Voyagers) */}
          {pirate && (
            <PirateShip x={pirate.x * S} y={pirate.y * S} theme={theme} k={ps} />
          )}


      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- derived values (topo, pirate…) follow from these
    [scene, targets, theme, ps],
  );
  // The only layer that follows the pointer: hovering a spot rebuilds just the hints and targets.
  const targetsLayer = useMemo(
    () => (
      <>
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
          <HaloFilter />
          {onVertex &&
            targets.vertices.map((vid) => {
              const p = topo.vertices[vid];
              const key = `v${vid}`;
              const isHover = hover === key;
              const kind = targets.vertexKinds?.[vid] ?? targets.kind;
              const own = scene.buildings[vid];
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
                  {isHover && myColor && kind === "city" && !own && (
                    <CityPath
                      x={p.x * S}
                      y={p.y * S}
                      color={myColor}
                      ghost
                      k={ps}
                      theme={theme}
                    />
                  )}
                  {own && (kind === "city" || kind === "cityImprove" || kind === "wall" || !targets.hint) && kind !== "knightAction" ? (
                    // A building of yours: traced with the halo. A settlement to upgrade previews its city;
                    // your cities (C&K improvements) and build hints stay unmarked until hovered.
                    (isHover || (!targets.hint && kind !== "cityImprove")) && (
                      <PieceHalo
                        x={p.x * S}
                        y={p.y * S}
                        b={own}
                        color={scene.colors[own.owner]}
                        theme={theme}
                        k={ps}
                        hover={isHover}
                        preview={kind === "city" && isHover ? "city" : undefined}
                      />
                    )
                  ) : kind === "cityImprove" ? (
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
                  ) : armed.what === "city" && scene.buildings[armed.at] ? (
                    <PieceHalo
                      x={p.x * S}
                      y={p.y * S}
                      b={scene.buildings[armed.at]!}
                      color={myColor}
                      theme={theme}
                      k={ps}
                      hover
                      preview="city"
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
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- derived values (topo, armed…) follow from these
    [scene, targets, theme, ps, hover, onVertex, onEdge],
  );
  // The hovered pickable tile (robber, Inventor…) lights up between the tiles and the pieces.
  const hoveredHex = hover?.startsWith("h") ? Number(hover.slice(1)) : null;
  const content = (
    <>
      {tilesLayer}
      {hoveredHex !== null && hexTargets.has(hoveredHex) && (
        <g pointerEvents="none">
          <polygon points={hexPoints(topo, hoveredHex, 0.84)} fill="rgba(255,243,207,0.35)" />
          <polygon points={hexPoints(topo, hoveredHex, 0.84)} fill="none" stroke="#fff3cf" strokeWidth="5" strokeLinejoin="round" />
        </g>
      )}
      {piecesLayer}
      {targetsLayer}
    </>
  );

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
        {content}
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
