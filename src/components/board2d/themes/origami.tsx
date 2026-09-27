import type { TileGlyphs } from './types';

/** A folded peak: its left face in `light`, its right face in `dark`, standing on (x, y). */
function Fold({ x, y, w, h, light, dark }: { x: number; y: number; w: number; h: number; light: string; dark: string }) {
  return (
    <g>
      <path d={`M${x - w} ${y}L${x} ${y - h}V${y}Z`} fill={light} />
      <path d={`M${x} ${y - h}L${x + w} ${y}H${x}Z`} fill={dark} />
    </g>
  );
}

const PINWHEEL = ['#f28aa6', '#f0cf6a', '#6fb3dc', '#8fd08a'];

/**
 * Origami on the 2D board: every tile is a sheet of paper folded down the middle, and the drawings
 * are folded too (a light and a dark face each).
 */
export const origamiGlyphs: TileGlyphs = ({ terrain, cx, cy, c }) => {
  const spots = [
    [-40, -34],
    [40, -34],
    [-50, 22],
    [50, 22],
    [0, 52],
  ];
  const at = (i: number) => ({ x: cx + spots[i][0], y: cy + spots[i][1] });
  // The sheet's fold: its right half catches more light, with a crease down the middle.
  const sheet = (
    <g>
      <path d={`M${cx} ${cy - 93}L${cx + 80.5} ${cy - 46.5}V${cy + 46.5}L${cx} ${cy + 93}Z`} fill="#ffffff" opacity="0.12" />
      <path d={`M${cx} ${cy - 93}V${cy + 93}`} stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.5" />
    </g>
  );
  switch (terrain) {
    case 'forest':
      // Pyramid trees in two tiers on paper-tube trunks.
      return (
        <g>
          {sheet}
          {[0, 1, 2, 3, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <rect x={x - 2} y={y + 6} width="4" height="9" fill="#c9a27a" />
                <Fold x={x} y={y + 8} w={12} h={18} light="#6aa878" dark={c.accent} />
                <Fold x={x} y={y - 3} w={9} h={15} light="#7bb887" dark={c.side} />
              </g>
            );
          })}
        </g>
      );
    case 'hills': {
      // Ridges folded out of terracotta paper, and paper bricks.
      const b = at(4);
      return (
        <g>
          {sheet}
          {[0, 1].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <Fold x={x - 9} y={y + 10} w={13} h={20} light="#e8a07c" dark={c.accent} />
                <Fold x={x + 9} y={y + 10} w={11} h={15} light="#e8a07c" dark={c.side} />
              </g>
            );
          })}
          <g stroke={c.side} strokeWidth="1">
            <rect x={b.x - 12} y={b.y + 2} width="11" height="7" fill="#e0906a" />
            <rect x={b.x + 1} y={b.y + 2} width="11" height="7" fill={c.accent} />
            <rect x={b.x - 6} y={b.y - 5} width="11" height="7" fill="#e0906a" />
          </g>
        </g>
      );
    }
    case 'pasture': {
      // Faceted paper sheep, paper grass and a pinwheel.
      const w = at(1);
      return (
        <g>
          {sheet}
          {[0, 3].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <path d={`M${x - 12} ${y}l5-7h14l5 7Z`} fill={c.accent} />
                <path d={`M${x - 12} ${y}l5 7h14l5-7Z`} fill="#dcd8cc" />
                <path d={`M${x + 10} ${y - 7}l8 2-3 6Z`} fill="#4a4550" />
              </g>
            );
          })}
          <path d={`M${w.x} ${w.y + 16}v-24`} stroke="#c9a27a" strokeWidth="2" />
          {PINWHEEL.map((color, k) => (
            <path key={color} d={`M${w.x} ${w.y - 10}l11 0 0 11Z`} fill={color} transform={`rotate(${k * 90} ${w.x} ${w.y - 10})`} />
          ))}
          {[2, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <Fold x={x - 4} y={y + 6} w={3} h={11} light="#9fcf74" dark={c.side} />
                <Fold x={x + 4} y={y + 6} w={3} h={14} light="#9fcf74" dark={c.side} />
              </g>
            );
          })}
        </g>
      );
    }
    case 'fields':
      // Yellow paper folded like an accordion: light and dark pleats side by side.
      return (
        <g>
          {sheet}
          {[0, 1, 2, 3].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                {[0, 1, 2, 3, 4, 5].map((k) => (
                  <rect key={k} x={x - 15 + k * 5} y={y - 11} width="5" height="22" fill={k % 2 ? c.side : c.accent} />
                ))}
              </g>
            );
          })}
        </g>
      );
    case 'mountains':
      // Sharp peaks folded from grey paper, their tips in white.
      return (
        <g>
          {sheet}
          {[0, 1, 4].map((i) => {
            const { x, y } = at(i);
            return (
              <g key={i}>
                <Fold x={x} y={y + 12} w={20} h={32} light="#b8bdc9" dark={c.side} />
                <Fold x={x} y={y - 8} w={7.5} h={12} light={c.accent} dark="#d7dbe4" />
              </g>
            );
          })}
        </g>
      );
    case 'desert': {
      // A big paper crane at the back, and folded dunes (the robber stands in the middle).
      const x = cx - 2;
      const y = cy - 34;
      return (
        <g>
          {sheet}
          <path d={`M${x - 4} ${y - 4}L${x + 6} ${y - 30}L${x + 14} ${y - 2}Z`} fill="#b8432f" />
          <path d={`M${x - 10} ${y - 2}L${x - 32} ${y - 22}L${x - 14} ${y + 2}Z`} fill="#b8432f" />
          <path d={`M${x - 16} ${y}L${x} ${y - 8}L${x + 16} ${y}L${x} ${y + 8}Z`} fill="#e8604a" />
          <path d={`M${x} ${y - 8}L${x + 16} ${y}L${x} ${y + 8}Z`} fill="#cf5440" />
          <path d={`M${x + 10} ${y - 2}L${x + 30} ${y - 24}L${x + 14} ${y + 2}Z`} fill="#e8604a" />
          <path d={`M${x + 30} ${y - 24}L${x + 37} ${y - 18}L${x + 28} ${y - 19}Z`} fill="#b8432f" />
          <path d={`M${x - 8} ${y - 4}L${x - 2} ${y - 34}L${x + 10} ${y - 2}Z`} fill="#f07a64" />
          {[
            [cx - 50, cy + 24],
            [cx + 48, cy + 20],
            [cx + 40, cy + 52],
          ].map(([dx, dy], i) => (
            <Fold key={i} x={dx} y={dy} w={16} h={8} light="#f7ecd2" dark={c.accent} />
          ))}
        </g>
      );
    }
    default:
      return null;
  }
};
