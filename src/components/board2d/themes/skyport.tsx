import type { BarbarianShipGlyph, TileGlyphs } from './types';

const BRASS = '#b08d57';
const SMOKE = '#f3ece4';

/** Puffs of smoke, as [x, y, r]. */
function Smoke({ puffs }: { puffs: [number, number, number][] }) {
  return (
    <g fill={SMOKE} opacity="0.9">
      {puffs.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} />
      ))}
    </g>
  );
}

/** The outline of a gear with `teeth` teeth, `r` to the tips. */
function gearPoints(x: number, y: number, r: number, teeth: number): string {
  const n = teeth * 4;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = Math.floor(i / 2) % 2 === 0 ? r : r * 0.78;
    return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`;
  }).join(' ');
}

/** Skyport on the 2D board: a sawmill, a brickworks chimney, a wind turbine, a steam tractor, a headframe and buried gears. */
export const skyportGlyphs: TileGlyphs = ({ terrain, cx, cy, c }) => {
  const spots = [
    [-40, -34],
    [40, -34],
    [-50, 22],
    [50, 22],
    [0, 52],
  ];
  const at = (i: number) => ({ x: cx + spots[i][0], y: cy + spots[i][1] });
  switch (terrain) {
    case 'forest': {
      const mill = at(4);
      return (
        <g>
          {[0, 1, 2, 3].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <rect x={x - 2} y={y + 2} width="4" height="12" fill="#5a4230" />
                <circle cx={x} cy={y - 4} r="11" fill={c.accent} />
                <circle cx={x - 3} cy={y - 8} r="4" fill="#4a8052" opacity="0.7" />
              </g>
            );
          })}
          <circle cx={mill.x - 5} cy={mill.y + 4} r="7" fill="#7a6a5a" />
          <rect x={mill.x + 1} y={mill.y - 15} width="5" height="18" fill="#4a3a2e" />
          <Smoke
            puffs={[
              [mill.x + 5, mill.y - 20, 4],
              [mill.x + 10, mill.y - 26, 5],
            ]}
          />
        </g>
      );
    }
    case 'hills': {
      const ch = at(1);
      return (
        <g>
          <rect x={ch.x - 5} y={ch.y - 26} width="10" height="40" fill={c.accent} />
          <rect x={ch.x - 6.5} y={ch.y - 28} width="13" height="4" fill="#4a2012" />
          <Smoke
            puffs={[
              [ch.x + 3, ch.y - 33, 5],
              [ch.x + 9, ch.y - 40, 6.5],
            ]}
          />
          {[0, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i} fill="#c46d47" stroke={c.side} strokeWidth="1">
                {[0, 1].map((row) =>
                  [0, 1, 2].map((col) => <rect key={`${row}${col}`} x={x - 17 + col * 11.5 + (row ? 5 : 0)} y={y - 6 + row * 8} width={row ? 10 : 10.5} height="6.5" />),
                )}
              </g>
            );
          })}
        </g>
      );
    }
    case 'pasture': {
      const t = at(1);
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
          <path d={`M${t.x} ${t.y + 14}v-22`} stroke="#7a5f36" strokeWidth="3" />
          {[0, 120, 240].map((a) => (
            <ellipse key={a} cx={t.x} cy={t.y - 18} rx="3" ry="9" fill={BRASS} transform={`rotate(${a} ${t.x} ${t.y - 9})`} />
          ))}
          <circle cx={t.x} cy={t.y - 9} r="3" fill="#7a5f36" />
          {[2, 4].map((i) => {
            const { x, y } = at(i);
            return <path key={i} d={`M${x - 6} ${y + 6}l3-10 3 10 3-12 3 12`} stroke={c.side} strokeWidth="2.5" fill="none" />;
          })}
        </g>
      );
    }
    case 'fields': {
      const t = at(4);
      return (
        <g>
          <g stroke={c.side} strokeWidth="3" strokeLinecap="round" opacity="0.85">
            {[0, 1, 2, 3].map((i) => {
              const { x, y } = at(i);
              return <path key={i} d={`M${x - 8} ${y + 10}v-20M${x} ${y + 10}v-24M${x + 8} ${y + 10}v-20`} />;
            })}
          </g>
          <rect x={t.x - 6} y={t.y - 4} width="17" height="9" rx="1.5" fill="#6b4a3a" />
          <circle cx={t.x - 6} cy={t.y + 6} r="7" fill="none" stroke="#3a2a20" strokeWidth="2.6" />
          <circle cx={t.x + 9} cy={t.y + 8} r="4" fill="none" stroke="#3a2a20" strokeWidth="2.2" />
          <rect x={t.x + 5} y={t.y - 13} width="3" height="9" fill="#3a2a20" />
          <Smoke puffs={[[t.x + 7, t.y - 17, 3.5]]} />
        </g>
      );
    }
    case 'mountains': {
      const h = at(1);
      return (
        <g>
          {[0, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={`M${x - 20} ${y + 12}l20-30 20 30Z`} fill="#6f6b66" />
                <path d={`M${x - 7} ${y - 8}l7-10 7 10-4 3-3-3-3 3Z`} fill="#eef1f4" />
              </g>
            );
          })}
          <path d={`M${h.x - 10} ${h.y + 14}L${h.x} ${h.y - 14}L${h.x + 10} ${h.y + 14}M${h.x - 6} ${h.y + 2}h12M${h.x - 3} ${h.y - 6}h6`} stroke={c.accent} strokeWidth="2.5" fill="none" />
          <circle cx={h.x} cy={h.y - 16} r="6" fill="none" stroke={c.accent} strokeWidth="2" />
          <path d={`M${h.x - 6} ${h.y - 16}h12M${h.x} ${h.y - 22}v12`} stroke={c.accent} strokeWidth="1.2" />
        </g>
      );
    }
    case 'desert':
      // Gears sunk in the sand at the back (the robber stands in the middle).
      return (
        <g>
          <polygon points={gearPoints(cx - 16, cy - 42, 21, 8)} fill={c.accent} stroke="#7a5f36" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx={cx - 16} cy={cy - 42} r="6" fill="#7a5f36" />
          <polygon points={gearPoints(cx + 22, cy - 32, 13, 6)} fill={BRASS} stroke="#7a5f36" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx={cx + 22} cy={cy - 32} r="3.6" fill="#7a5f36" />
          <path d={`M${cx - 52} ${cy - 20}q52-14 104 0v9h-104Z`} fill={c.top} />
        </g>
      );
    default:
      return null;
  }
};

/** Skyport on the 2D board: a dark pirate airship, drawn a little higher above its step. */
export const skyportShip: BarbarianShipGlyph = ({ danger }) => {
  const envelope = danger ? '#c23a2a' : '#2b241e';
  const trim = danger ? '#e0503a' : BRASS;
  return (
    <g pointerEvents="none" transform="translate(0 -14)">
      <ellipse cx="0" cy="0" rx="26" ry="11" fill={envelope} stroke="#171310" strokeWidth="2.5" />
      <path d="M-26 0q4 6 14 7M26 0q-4 6-14 7" fill="none" stroke={trim} strokeWidth="2" />
      <rect x="-9" y="9" width="18" height="7" rx="2" fill="#241c14" stroke="#171310" strokeWidth="2" />
      {[-5, 5].map((px) => (
        <line key={px} x1={px} y1="16" x2={px} y2="21" stroke={trim} strokeWidth="2" />
      ))}
      <path d="M18 4l9-3-2 6Z M18-4l9 3-2-6Z" fill={trim} />
    </g>
  );
};
