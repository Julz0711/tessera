import type { ReactNode } from 'react';
import { Glow, Neon } from './glow';
import { OUTLINE, pc, RoadBase } from './shared';
import type { BarbarianShipGlyph, KnightGlyph, PieceGlyph, RoadGlyph, TileGlyphs, ThemePieces } from './types';

const PINK = '#ff3d9a';
const CYAN = '#3de8ff';
const MINT = '#3dffb0';

/** Cyberpunk's settlement: a neon-edged block, a crisp glow line traced round the coloured body. */
const cyberpunkSettlement: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g>
      <rect x={x - 14} y={y - 12} width="28" height="27" fill={c.hex} stroke={c.dark} strokeWidth={OUTLINE} />
      <Neon d={`M${x - 14} ${y - 12}h28v27h-28Z`} color={c.hex} width={1.6} />
      <rect x={x - 9} y={y - 6} width="6" height="6" fill="#0d0b14" />
      <rect x={x + 3} y={y - 6} width="6" height="6" fill="#0d0b14" />
    </g>
  );
};

/** Cyberpunk's city: a skyscraper, a neon-edged tower with a grid of lit windows. */
const cyberpunkCity: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g>
      <rect x={x - 14} y={y - 28} width="28" height="45" fill={c.hex} stroke={c.dark} strokeWidth={OUTLINE} />
      <Neon d={`M${x - 14} ${y - 28}h28v45h-28Z`} color={c.hex} width={1.6} />
      {[-18, -8, 2, 12].flatMap((dy) =>
        [-8, 4].map((dx) => (
          <rect key={`${dx}${dy}`} x={x + dx} y={y + dy} width="5" height="6" fill={(dx + dy) % 3 === 0 ? MINT : CYAN} opacity="0.9" />
        )),
      )}
    </g>
  );
};

/** Cyberpunk's road: a glowing neon strip, a soft colour halo under the crisp coloured lane. */
const cyberpunkRoad: RoadGlyph = ({ x1, y1, x2, y2, color, ghost, k = 1 }) => {
  const seg = { x1, y1, x2, y2 };
  const c = pc(color);
  if (ghost) return <RoadBase {...seg} color={color} ghost k={k} />;
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.hex} strokeWidth={26 * k} strokeOpacity="0.22" strokeLinecap="round" />
      <RoadBase {...seg} color={color} k={k} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeWidth={2 * k} strokeOpacity="0.35" strokeLinecap="round" />
    </>
  );
};

/** Cyberpunk's knight: a street samurai's helmet, a glowing cyan visor slit. */
const cyberpunkKnight: KnightGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth="2" strokeLinejoin="round">
      <path d={`M${x - 9} ${y + 9}q-2-15 9-15t9 15q-9 3-18 0Z`} fill={c.hex} />
      <rect x={x - 7} y={y - 2} width="14" height="3" fill={CYAN} opacity="0.9" />
    </g>
  );
};

export const cyberpunkPieces: ThemePieces = { settlement: cyberpunkSettlement, city: cyberpunkCity, road: cyberpunkRoad, knight: cyberpunkKnight };

/** Cyberpunk on the 2D board: a fenced grove, a scrapyard press, robot sheep, grow racks, ore veins and a dead zone. */
export const cyberpunkGlyphs: TileGlyphs = ({ terrain, cx, cy, c }) => {
  const spots = [
    [-40, -34],
    [40, -34],
    [-50, 22],
    [50, 22],
    [0, 52],
  ];
  const at = (i: number) => ({ x: cx + spots[i][0], y: cy + spots[i][1] });
  const pine = (x: number, y: number) => `M${x} ${y - 16}l11 20h-22Z M${x} ${y - 6}l13 20h-26Z`;
  switch (terrain) {
    case 'forest': {
      // Pines with glowing tips, a grow lamp and a stretch of chain-link fence.
      const lamp = at(1);
      const f = at(3);
      const links = [0, 1, 2, 3].map((k) => `M${f.x - 18 + k * 9} ${f.y - 8}l9 18M${f.x - 9 + k * 9} ${f.y - 8}l-9 18`).join('');
      return (
        <g>
          {[0, 2, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={pine(x, y)} fill="#12281f" />
                <Glow x={x} y={y - 17} r={2.6} color={c.accent} />
              </g>
            );
          })}
          <path d={pine(lamp.x - 8, lamp.y + 2)} fill="#12281f" />
          <circle cx={lamp.x + 12} cy={lamp.y + 8} r="15" fill={c.accent} opacity="0.14" />
          <path d={`M${lamp.x + 12} ${lamp.y + 14}v-26`} stroke="#8a93a3" strokeWidth="2.4" />
          <Neon d={`M${lamp.x + 6} ${lamp.y - 13.5}h12`} color={c.accent} width={4} />
          <path d={`M${f.x - 18} ${f.y + 10}v-18M${f.x} ${f.y + 10}v-18M${f.x + 18} ${f.y + 10}v-18M${f.x - 18} ${f.y - 8}h36M${f.x - 18} ${f.y + 10}h36`} stroke="#8a93a3" strokeWidth="1.8" />
          <path d={links} stroke="#8a93a3" strokeWidth="0.9" opacity="0.75" />
        </g>
      );
    }
    case 'hills': {
      // Scrap heaps and a hydraulic press stamping bricks.
      const p = at(1);
      const bricks: ReactNode[] = [];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          bricks.push(<rect key={`${row}${col}`} x={p.x - 17 + col * 11.5 + (row ? 5 : 0)} y={p.y + 2 + row * 8} width={row ? 10 : 10.5} height="6.5" />);
        }
      }
      return (
        <g>
          {[0, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={`M${x - 22} ${y + 8}q22-30 44 0Z`} fill="#5e2c1e" opacity="0.9" />
                <rect x={x - 7} y={y - 7} width="6" height="4" fill="#8a93a3" transform={`rotate(20 ${x - 4} ${y - 5})`} />
                <rect x={x + 4} y={y - 3} width="5" height="3" fill="#c9a227" />
              </g>
            );
          })}
          <g fill="#b35a3e" stroke="#4e2418" strokeWidth="1">
            {bricks}
          </g>
          <path d={`M${p.x - 16} ${p.y + 14}v-30M${p.x + 16} ${p.y + 14}v-30M${p.x - 18} ${p.y - 17}h36`} stroke="#8a93a3" strokeWidth="3" />
          <rect x={p.x - 7} y={p.y - 15} width="14" height="9" fill="#5a606e" />
          <Neon d={`M${p.x - 10} ${p.y - 4.5}h20`} color={c.accent} width={3} />
        </g>
      );
    }
    case 'pasture':
      // Robot sheep with glowing visors on synthetic turf.
      return (
        <g>
          {[0, 3].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={`M${x - 6} ${y + 6}v6M${x + 5} ${y + 6}v6`} stroke="#5a606e" strokeWidth="2.4" />
                <ellipse cx={x} cy={y} rx="12" ry="8" fill={c.accent} stroke="#9aa3b0" strokeWidth="1" />
                <path d={`M${x + 10} ${y - 8}l-2-6`} stroke="#8a93a3" strokeWidth="1.2" />
                <Glow x={x + 8} y={y - 14.5} r={1.7} color={PINK} />
                <rect x={x + 7} y={y - 8} width="10" height="8" rx="2" fill="#2a2f3a" />
                <Neon d={`M${x + 9} ${y - 5}h6`} color={CYAN} width={1.8} />
              </g>
            );
          })}
          {[1, 2, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={`M${x - 6} ${y + 6}l3-10 3 10 3-12 3 12`} stroke={c.side} strokeWidth="2.5" fill="none" />
                <Glow x={x + 3} y={y - 6} r={1.5} color={MINT} />
              </g>
            );
          })}
        </g>
      );
    case 'fields': {
      // Hydroponic racks of grain under yellow grow-lights, and sacks of grain.
      const sacks = at(4);
      return (
        <g>
          {[0, 1, 2, 3].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <rect x={x - 14} y={y - 14} width="28" height="28" rx="1.5" fill="#15131f" fillOpacity="0.45" stroke={c.side} strokeWidth="1.6" />
                {[-7, 1, 9].map((dy) => (
                  <g key={dy}>
                    <path d={`M${x - 8} ${y + dy - 1}v-4M${x - 3} ${y + dy - 1}v-5M${x + 2} ${y + dy - 1}v-4M${x + 7} ${y + dy - 1}v-5`} stroke="#8fcf4a" strokeWidth="1.3" />
                    <Neon d={`M${x - 10} ${y + dy}h20`} color={c.accent} width={2.2} />
                  </g>
                ))}
              </g>
            );
          })}
          <g fill="#d9c28a" stroke="#8a7440" strokeWidth="1">
            <ellipse cx={sacks.x - 7} cy={sacks.y + 3} rx="7" ry="5" />
            <ellipse cx={sacks.x + 7} cy={sacks.y + 4} rx="7" ry="5" />
            <ellipse cx={sacks.x} cy={sacks.y - 3} rx="7" ry="5" />
          </g>
        </g>
      );
    }
    case 'mountains': {
      // Slate peaks with glowing cyan ore veins, and an excavator.
      const e = at(3);
      return (
        <g>
          {[0, 1, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={`M${x - 20} ${y + 12}l20-30 20 30Z`} fill="#3a3e4c" />
                <Neon d={`M${x - 9} ${y + 10}l5-9 3 4 5-10`} color={c.accent} width={2} />
              </g>
            );
          })}
          <path d={`M${e.x - 16} ${e.y + 12}h20`} stroke="#2a2d38" strokeWidth="3.5" strokeLinecap="round" />
          <rect x={e.x - 14} y={e.y + 1} width="16" height="9" rx="1.5" fill="#c9a227" />
          <path d={`M${e.x - 2} ${e.y + 3}l10-13 8 7`} stroke="#c9a227" strokeWidth="3" fill="none" strokeLinejoin="round" />
          <path d={`M${e.x + 15} ${e.y - 5}l5 7h-9Z`} fill="#8a7a3a" />
          <Glow x={e.x - 10} y={e.y - 1} r={2} color="#ff8a1a" />
        </g>
      );
    }
    case 'desert': {
      // Cracked asphalt, a broken holo billboard and a crashed flying car (the robber stands in the middle).
      const bx = cx - 26;
      const by = cy - 54;
      const x = cx + 38;
      const y = cy - 30;
      return (
        <g>
          <path d={`M${cx - 64} ${cy + 16}l14-5 8 7 16-4M${cx + 22} ${cy + 46}l12-9 10 3 12-8M${cx - 58} ${cy - 18}l12 6 6-8`} stroke={c.side} strokeWidth="1.8" fill="none" strokeLinejoin="round" />
          <path d={`M${bx} ${by + 16}v24`} stroke="#5a606e" strokeWidth="2.6" />
          <rect x={bx - 17} y={by - 4} width="34" height="20" rx="2" fill={c.accent} fillOpacity="0.16" />
          <Neon d={`M${bx - 17} ${by - 4}h34v20h-34Z`} color={c.accent} width={2} />
          <Neon d={`M${bx - 8} ${by + 11}l8-11 8 11Z`} color={CYAN} width={1.8} />
          <rect x={bx + 7} y={by - 8} width="14" height="4" fill={c.accent} opacity="0.5" />
          <g fill="#6a6470" opacity="0.7">
            <circle cx={x + 9} cy={y - 13} r="4.5" />
            <circle cx={x + 14} cy={y - 20} r="5.5" />
          </g>
          <g transform={`rotate(-24 ${x} ${y})`}>
            <rect x={x - 17} y={y - 6} width="34" height="12" rx="6" fill="#c8ccd6" stroke="#7a808c" strokeWidth="1" />
            <rect x={x - 5} y={y - 4} width="12" height="6" rx="3" fill="#1c1f28" />
          </g>
          <Glow x={x - 15} y={y + 6} r={2.2} color="#ff2d4a" />
        </g>
      );
    }
    default:
      return null;
  }
};

/** Cyberpunk on the 2D board: a low, dark hover-speedboat with cyan and magenta glow strips. */
export const cyberpunkShip: BarbarianShipGlyph = ({ danger }) => {
  const hull = danger ? '#c23a2a' : '#141220';
  const stripColor = danger ? '#ff2d4a' : undefined;
  return (
    <g pointerEvents="none">
      <path d="M-28 10h56l-9 6h-38Z" fill={hull} stroke="#05030a" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M-10-4h20l5 12h-30Z" fill="#0d0b18" stroke="#05030a" strokeWidth="2" strokeLinejoin="round" />
      <rect x="-20" y="-24" width="5" height="18" fill={hull} />
      <Neon d="M-25 6h48" color={stripColor ?? CYAN} width={2.6} />
      <Neon d="M-25 13h48" color={stripColor ?? PINK} width={2.6} />
    </g>
  );
};
