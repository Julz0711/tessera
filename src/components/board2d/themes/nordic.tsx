import type { TileGlyphs } from './types';

/** Nordic Fjords on the 2D board: dense spruce and birch, heather, snow drifts and rune stones. */
export const nordicGlyphs: TileGlyphs = ({ terrain, cx, cy, c }) => {
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
      // Narrow, three-tiered spruce at three spots; a thin white birch trunk with a light canopy at the other two.
      return (
        <g>
          <g fill={c.accent} opacity="0.9">
            {[0, 2, 4].map((i) => {
              const { x, y } = at(i);
              return <path key={i} d={`M${x} ${y - 22}l7 13h-14Z M${x} ${y - 11}l9 15h-18Z M${x} ${y}l11 17h-22Z`} />;
            })}
          </g>
          <g opacity="0.9">
            {[1, 3].map((i) => {
              const { x, y } = at(i);
              return (
                <g key={i}>
                  <rect x={x - 1.6} y={y - 6} width="3.2" height="20" fill="#e8e4da" />
                  <ellipse cx={x} cy={y - 12} rx="9" ry="7" fill="#a8cf7a" />
                </g>
              );
            })}
          </g>
        </g>
      );
    case 'pasture':
      // Classic sheep kept as-is; the grass-blade tufts become small purple heather dot clusters.
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
          <g fill="#96729f" opacity="0.85">
            {[1, 2, 4].map((i) => {
              const { x, y } = at(i);
              return (
                <g key={i}>
                  <circle cx={x - 5} cy={y} r="3.2" />
                  <circle cx={x + 2} cy={y - 3} r="3.6" />
                  <circle cx={x + 6} cy={y + 3} r="2.8" />
                </g>
              );
            })}
          </g>
        </g>
      );
    case 'mountains':
      // Same silhouette as classic, but the snow cap is enlarged to cover much more of the peak.
      return (
        <g>
          {[0, 1, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={`M${x - 20} ${y + 12}l20-30 20 30Z`} fill="#6f737c" />
                <path d={`M${x - 13} ${y - 2}l13-22 13 22-6 5-7-5-7 5Z`} fill={c.accent} />
              </g>
            );
          })}
        </g>
      );
    case 'desert':
      // Frozen tundra: pale snow-drift curves (as classic's dune shape, recoloured icy white) plus a small ring of standing rune stones.
      return (
        <g>
          <g fill="#f4f9fc" stroke={c.accent} strokeWidth="1" opacity="0.95">
            {[0, 1, 2, 3].map((i) => {
              const { x, y } = at(i);
              return <path key={i} d={`M${x - 20} ${y + 6}q20-16 40 0Z`} />;
            })}
          </g>
          <g fill="#7c8791" stroke="#5f6a73" strokeWidth="1.4">
            <rect x={cx - 6} y={cy + 4} width="4" height="19" rx="1" transform={`rotate(-8 ${cx - 4} ${cy + 14})`} />
            <rect x={cx + 1} y={cy + 1} width="4" height="23" rx="1" transform={`rotate(4 ${cx + 3} ${cy + 13})`} />
            <rect x={cx + 8} y={cy + 6} width="3.5" height="15" rx="1" transform={`rotate(11 ${cx + 10} ${cy + 14})`} />
          </g>
        </g>
      );
    default:
      return null;
  }
};
