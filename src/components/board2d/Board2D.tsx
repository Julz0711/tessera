'use client';

import { useMemo, useState } from 'react';
import { PIPS } from '@/engine/constants';
import { getTopology, type Topology } from '@/engine/board/topology';
import type { PlayerColor, Terrain } from '@/engine/types';
import { CARD_COLORS, TERRAIN_COLORS } from '@/client/palette';
import { PLAYER_COLORS } from '@/shared/colors';
import type { BoardProps } from '@/components/board/types';

const S = 100; // world units → SVG units

function hexPoints(topo: Topology, hexId: number, scale = 1): string {
  const h = topo.hexes[hexId];
  return h.vertices
    .map((v) => {
      const p = topo.vertices[v];
      const x = h.x + (p.x - h.x) * scale;
      const y = h.y + (p.y - h.y) * scale;
      return `${(x * S).toFixed(1)},${(y * S).toFixed(1)}`;
    })
    .join(' ');
}

function TerrainGlyphs({ terrain, cx, cy }: { terrain: Terrain; cx: number; cy: number }) {
  const c = TERRAIN_COLORS[terrain];
  const spots = [
    [-40, -34],
    [40, -34],
    [-50, 22],
    [50, 22],
    [0, 52],
  ];
  const at = (i: number) => ({ x: cx + spots[i][0], y: cy + spots[i][1] });
  switch (terrain) {
    case 'forest':
      return (
        <g fill={c.accent} opacity="0.9">
          {[0, 1, 2, 3, 4].map((i) => {
            const { x, y } = at(i);
            return <path key={i} d={`M${x} ${y - 16}l11 20h-22Z M${x} ${y - 6}l13 20h-26Z`} />;
          })}
        </g>
      );
    case 'hills':
      return (
        <g fill={c.accent} opacity="0.75">
          {[0, 1, 4].map((i) => {
            const { x, y } = at(i);
            return <path key={i} d={`M${x - 22} ${y + 8}q22-30 44 0Z`} />;
          })}
        </g>
      );
    case 'pasture':
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
            return <path key={i} d={`M${x - 6} ${y + 6}l3-10 3 10 3-12 3 12`} stroke="#6a9446" strokeWidth="2.5" fill="none" />;
          })}
        </g>
      );
    case 'fields':
      return (
        <g stroke="#a8862f" strokeWidth="3" strokeLinecap="round" opacity="0.8">
          {[0, 1, 2, 3, 4].map((i) => {
            const { x, y } = at(i);
            return <path key={i} d={`M${x - 8} ${y + 10}v-20M${x} ${y + 10}v-24M${x + 8} ${y + 10}v-20`} />;
          })}
        </g>
      );
    case 'mountains':
      return (
        <g>
          {[0, 1, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={`M${x - 20} ${y + 12}l20-30 20 30Z`} fill="#6f737c" />
                <path d={`M${x - 7} ${y - 8}l7-10 7 10-4 3-3-3-3 3Z`} fill={c.accent} />
              </g>
            );
          })}
        </g>
      );
    case 'desert':
      return (
        <g fill={c.accent} opacity="0.8">
          {[0, 1, 2, 3].map((i) => {
            const { x, y } = at(i);
            return <path key={i} d={`M${x - 20} ${y + 6}q20-16 40 0Z`} />;
          })}
          <path d={`M${cx - 4} ${cy + 22}v-30a4 4 0 0 1 8 0v30Z M${cx + 4} ${cy}h8v-10`} fill="#5f8f4a" stroke="#5f8f4a" strokeWidth="3" />
        </g>
      );
  }
}

function HousePath({ x, y, color, ghost }: { x: number; y: number; color: PlayerColor; ghost?: boolean }) {
  const c = PLAYER_COLORS[color];
  return (
    <path
      d={`M${x - 13} ${y + 11}v-13l13-11 13 11v13Z`}
      fill={c.hex}
      stroke={c.dark}
      strokeWidth="3.5"
      strokeLinejoin="round"
      opacity={ghost ? 0.6 : 1}
    />
  );
}

function CityPath({ x, y, color, ghost }: { x: number; y: number; color: PlayerColor; ghost?: boolean }) {
  const c = PLAYER_COLORS[color];
  return (
    <path
      d={`M${x - 20} ${y + 13}v-14l9-7 9 7v-14h7v-6h6v6h7v28Z`}
      fill={c.hex}
      stroke={c.dark}
      strokeWidth="3.5"
      strokeLinejoin="round"
      opacity={ghost ? 0.6 : 1}
    />
  );
}

export default function Board2D({ scene, targets, onVertex, onEdge, onHex }: BoardProps) {
  const topo = getTopology(scene.board.hexes);
  const [hover, setHover] = useState<string | null>(null);
  const bounds = useMemo(() => {
    const xs = topo.vertices.map((v) => v.x * S);
    const ys = topo.vertices.map((v) => v.y * S);
    const pad = 95;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    return { minX, minY, w: Math.max(...xs) + pad - minX, h: Math.max(...ys) + pad - minY };
  }, [topo]);
  const hexTargets = new Set(targets.hexes);
  const myColor = scene.myColor;

  return (
    <svg
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.w} ${bounds.h}`}
      className="h-full w-full select-none"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Game board"
    >
      {/* The sea itself is painted by the container (.sea-2d) so it spans the whole screen. */}

      {/* foam, beach & tiles */}
      {scene.board.hexes.map((h) => (
        <polygon key={`f${h.id}`} points={hexPoints(topo, h.id, 1.26)} fill="#cdeef2" opacity="0.45" />
      ))}
      {scene.board.hexes.map((h) => (
        <polygon key={`b${h.id}`} points={hexPoints(topo, h.id, 1.12)} fill="#e6d3a3" />
      ))}
      {scene.board.hexes.map((h) => {
        const t = topo.hexes[h.id];
        const c = TERRAIN_COLORS[h.terrain];
        const target = hexTargets.has(h.id);
        return (
          <g
            key={`h${h.id}`}
            onClick={target && onHex ? () => onHex(h.id) : undefined}
            onMouseEnter={target ? () => setHover(`h${h.id}`) : undefined}
            onMouseLeave={target ? () => setHover(null) : undefined}
            className={target ? 'cursor-pointer' : undefined}
          >
            <polygon points={hexPoints(topo, h.id, 0.97)} fill={c.top} stroke={c.side} strokeWidth="5" strokeLinejoin="round" />
            <TerrainGlyphs terrain={h.terrain} cx={t.x * S} cy={t.y * S} />
            {target && (
              <polygon
                points={hexPoints(topo, h.id, 0.8)}
                fill={hover === `h${h.id}` ? 'rgba(242,179,61,0.35)' : 'rgba(242,179,61,0.12)'}
                stroke="#f2b33d"
                strokeWidth="6"
                strokeDasharray="14 8"
                strokeLinejoin="round"
              />
            )}
          </g>
        );
      })}

      {/* harbors */}
      {scene.board.harbors.map((hb) => {
        const e = topo.edges[hb.edge];
        const land = topo.hexes[e.hexes[0]];
        const dx = e.x - land.x;
        const dy = e.y - land.y;
        const len = Math.hypot(dx, dy) || 1;
        const px = (e.x + (dx / len) * 0.66) * S;
        const py = (e.y + (dy / len) * 0.66) * S;
        const label = hb.kind === 'any' ? '3:1 harbor — any resource' : `2:1 harbor — ${CARD_COLORS[hb.kind].label}`;
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
                stroke="#9c6f42"
                strokeWidth="8"
                strokeDasharray="5 3"
                strokeLinecap="butt"
              />
            ))}
            {/* a little ship: hull, mast and a sail showing the rate */}
            <g transform={`translate(${px} ${py}) scale(1.35)`}>
              <path d="M-24 8h48l-9 13h-30Z" fill="#8a6139" stroke="#1f1a14" strokeWidth="2.5" strokeLinejoin="round" />
              <rect x="-1.5" y="-38" width="3" height="47" fill="#5a3d22" />
              <path d="M-19-34h36q-4 16 0 34h-36q4-18 0-34Z" fill="#f6eddb" stroke="#1f1a14" strokeWidth="2.5" strokeLinejoin="round" />
              {hb.kind === 'any' ? (
                <text y="-20" textAnchor="middle" fontSize="14" fontWeight="900" fill="#1f1a14">
                  ?
                </text>
              ) : (
                <circle cy="-24" r="6.5" fill={CARD_COLORS[hb.kind].bg} stroke="#1f1a14" strokeWidth="1.5" />
              )}
              <text y="-5" textAnchor="middle" className="display" fontSize="13" fontWeight="900" fill="#1f1a14">
                {hb.kind === 'any' ? '3:1' : '2:1'}
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
          <g key={`t${h.id}`} pointerEvents="none">
            <circle cx={t.x * S} cy={t.y * S} r="29" fill={lit ? '#f2b33d' : '#f6eddb'} stroke="#1f1a14" strokeWidth="3" />
            <text x={t.x * S} y={t.y * S + 7} textAnchor="middle" className="display" fontSize="27" fontWeight="800" fill={red ? '#c2412d' : '#1f1a14'}>
              {h.token}
            </text>
            {Array.from({ length: pips }, (_, i) => (
              <circle key={i} cx={t.x * S + (i - (pips - 1) / 2) * 6} cy={t.y * S + 18} r="2.2" fill={red ? '#c2412d' : '#1f1a14'} />
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
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.dark} strokeWidth="15" strokeLinecap="round" />
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.hex} strokeWidth="9" strokeLinecap="round" />
          </g>
        );
      })}

      {/* buildings */}
      {scene.buildings.map((b, v) => {
        if (!b) return null;
        const p = topo.vertices[v];
        const color = scene.colors[b.owner];
        return b.city ? (
          <g key={`c${v}`} pointerEvents="none">
            <CityPath x={p.x * S} y={p.y * S} color={color} />
            {b.wall && <circle cx={p.x * S} cy={p.y * S} r="27" fill="none" stroke="#6b5d4a" strokeWidth="4" strokeDasharray="6 4" />}
            {b.metropolis && <circle cx={p.x * S + 16} cy={p.y * S - 20} r="7" fill="#f2c14e" stroke="#1f1a14" strokeWidth="2" />}
          </g>
        ) : (
          <HousePath key={`s${v}`} x={p.x * S} y={p.y * S} color={color} />
        );
      })}

      {/* knights (C&K) */}
      {scene.knights.map((k, v) => {
        if (!k) return null;
        const p = topo.vertices[v];
        const c = PLAYER_COLORS[scene.colors[k.owner]];
        return (
          <g key={`k${v}`} pointerEvents="none">
            <circle cx={p.x * S} cy={p.y * S} r="17" fill={k.active ? '#f2b33d' : '#2d2c33'} stroke="#1f1a14" strokeWidth="2.5" />
            <path d={`M${p.x * S - 10} ${p.y * S - 9}h20v7c0 7-4 11-10 13-6-2-10-6-10-13Z`} fill={c.hex} stroke={c.dark} strokeWidth="2" />
            {Array.from({ length: k.level }, (_, i) => (
              <circle key={i} cx={p.x * S + (i - (k.level - 1) / 2) * 6} cy={p.y * S - 1} r="2.2" fill={c.ink} />
            ))}
          </g>
        );
      })}

      {/* robber */}
      {(() => {
        const t = topo.hexes[scene.robber];
        const x = t.x * S;
        const y = t.y * S + 46;
        return (
          <g pointerEvents="none">
            <ellipse cx={x} cy={y + 16} rx="15" ry="5" fill="#000" opacity="0.25" />
            <path d={`M${x - 12} ${y + 16}c0-14 5-24 12-24s12 10 12 24Z`} fill="#2d2c33" />
            <circle cx={x} cy={y - 12} r="8" fill="#3a3942" />
          </g>
        );
      })()}

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
            <g key={key} className="cursor-pointer" onClick={() => onEdge(eid)} onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover(null)}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="26" />
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isHover && myColor ? PLAYER_COLORS[myColor].hex : '#f2b33d'}
                strokeWidth={isHover ? 11 : 8}
                strokeLinecap="round"
                strokeDasharray={isHover ? undefined : '10 8'}
              >
                {!isHover && <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="1s" repeatCount="indefinite" />}
              </line>
            </g>
          );
        })}
      {onVertex &&
        targets.vertices.map((vid) => {
          const p = topo.vertices[vid];
          const key = `v${vid}`;
          const isHover = hover === key;
          return (
            <g key={key} className="cursor-pointer" onClick={() => onVertex(vid)} onMouseEnter={() => setHover(key)} onMouseLeave={() => setHover(null)}>
              <circle cx={p.x * S} cy={p.y * S} r="22" fill="transparent" />
              {isHover && myColor && targets.kind === 'settlement' && <HousePath x={p.x * S} y={p.y * S} color={myColor} ghost />}
              {isHover && myColor && targets.kind === 'city' && <CityPath x={p.x * S} y={p.y * S} color={myColor} ghost />}
              <circle cx={p.x * S} cy={p.y * S} r="12" fill="rgba(242,179,61,0.35)" stroke="#f2b33d" strokeWidth="4">
                <animate attributeName="r" values="10;15;10" dur="1.4s" repeatCount="indefinite" />
              </circle>
            </g>
          );
        })}
    </svg>
  );
}
