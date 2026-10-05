import { alongRoad, OUTLINE, pc, Pennant, RoadBase } from './shared';
import type { BarbarianShipGlyph, MetropolisGlyph, PieceGlyph, RoadGlyph, ThemePieces, TileAccents } from './types';

/** A folded peak: its left face in `light`, its right face in `dark`, standing on (x, y). */
function Fold({ x, y, w, h, light, dark }: { x: number; y: number; w: number; h: number; light: string; dark: string }) {
  return (
    <g>
      <path d={`M${x - w} ${y}L${x} ${y - h}V${y}Z`} fill={light} />
      <path d={`M${x} ${y - h}L${x + w} ${y}H${x}Z`} fill={dark} />
    </g>
  );
}

/** Origami's settlement: a folded paper house, a two-tone creased roof over a paper box. */
const origamiSettlement: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <rect x={x - 13} y={y - 1} width="26" height="16" fill={c.hex} />
      <Fold x={x} y={y - 1} w={17} h={17} light={c.hex} dark={c.dark} />
    </g>
  );
};

/** Origami's city: a wider paper keep, two creased folds of different heights over a shared seam. */
const origamiCity: PieceGlyph = ({ x, y, color }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <rect x={x - 22} y={y - 2} width="44" height="19" fill={c.hex} />
      <line x1={x} y1={y - 2} x2={x} y2={y + 17} stroke={c.dark} strokeWidth="1.4" opacity="0.5" />
      <Fold x={x - 11} y={y - 2} w={12} h={15} light={c.hex} dark={c.dark} />
      <Fold x={x + 11} y={y - 2} w={12} h={23} light={c.hex} dark={c.dark} />
    </g>
  );
};

/** Origami's road: a folded paper strip, alternating light and dark pleats crossing the coloured lane. */
const origamiRoad: RoadGlyph = ({ x1, y1, x2, y2, color, ghost, k = 1 }) => {
  const seg = { x1, y1, x2, y2 };
  const c = pc(color);
  if (ghost) return <RoadBase {...seg} color={color} ghost k={k} />;
  return (
    <>
      <RoadBase {...seg} color={color} k={k} />
      {[-0.28, -0.09, 0.09, 0.28].map((t, i) => {
        const a = alongRoad(seg, t, 6 * k);
        const b = alongRoad(seg, t, -6 * k);
        return <line key={t} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={i % 2 ? c.dark : '#ffffff'} strokeOpacity={i % 2 ? 0.5 : 0.35} strokeWidth={1.6 * k} />;
      })}
    </>
  );
};

/** Origami's metropolis: three folded peaks on a wide base, a paper flag of the track's colour on the tallest. */
const origamiMetropolis: MetropolisGlyph = ({ x, y, color, accent }) => {
  const c = pc(color);
  return (
    <g stroke={c.dark} strokeWidth={OUTLINE} strokeLinejoin="round">
      <Pennant x={x} y={y - 31} h={12} accent={accent} dark={c.dark} />
      <rect x={x - 25} y={y - 2} width="50" height="19" fill={c.hex} />
      <Fold x={x - 15} y={y - 2} w={10} h={15} light={c.hex} dark={c.dark} />
      <Fold x={x + 15} y={y - 2} w={10} h={20} light={c.hex} dark={c.dark} />
      <Fold x={x} y={y - 2} w={12} h={29} light={c.hex} dark={c.dark} />
    </g>
  );
};

export const origamiPieces: ThemePieces = { settlement: origamiSettlement, city: origamiCity, road: origamiRoad, metropolis: origamiMetropolis };

/** Origami on the 2D board: a folded black paper boat, its two faces shaded like every other fold, flying a red paper flag. */
export const origamiShip: BarbarianShipGlyph = ({ danger }) => {
  const light = danger ? '#c23a2a' : '#3a3942';
  const dark = danger ? '#8a1f14' : '#1f1e22';
  return (
    <g pointerEvents="none">
      <path d="M-24 10L0-2L24 10L14 18H-14Z" fill={light} stroke="#0d0c0f" strokeWidth="2" strokeLinejoin="round" />
      <path d="M0-2L24 10L14 18H0Z" fill={dark} />
      <line x1="0" y1="-2" x2="0" y2="-26" stroke="#0d0c0f" strokeWidth="2" />
      <path d="M0-26l17 7-17 7Z" fill={danger ? '#ffdede' : '#e0503a'} stroke="#0d0c0f" strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  );
};


/** Origami's tile accents: small folded paper bits, each with a light and a dark face. */
export const origamiAccents: TileAccents = {
  side: ({ terrain, x, y, c }) => {
    switch (terrain) {
      case 'forest':
        return (
          <g>
            <rect x={x - 1.5} y={y + 5} width="3" height="6" fill="#c9a27a" />
            <Fold x={x} y={y + 7} w={10} h={14} light="#6aa878" dark={c.accent} />
            <Fold x={x} y={y - 2} w={7.5} h={11} light="#7bb887" dark={c.side} />
          </g>
        );
      case 'hills':
        return (
          <g>
            <Fold x={x - 6} y={y + 9} w={9} h={16} light="#e8a07c" dark={c.accent} />
            <Fold x={x + 7} y={y + 9} w={8} h={11} light="#e8a07c" dark={c.side} />
          </g>
        );
      case 'pasture':
        return (
          <g>
            <Fold x={x - 8} y={y + 9} w={3} h={11} light="#9fcf74" dark={c.side} />
            <Fold x={x - 1} y={y + 9} w={3} h={15} light="#9fcf74" dark={c.side} />
            <Fold x={x + 6} y={y + 9} w={3} h={11} light="#9fcf74" dark={c.side} />
          </g>
        );
      case 'fields':
        return (
          <g>
            {[0, 1, 2, 3, 4].map((k) => (
              <rect key={k} x={x - 12.5 + k * 5} y={y - 9} width="5" height="19" fill={k % 2 ? c.side : c.accent} />
            ))}
          </g>
        );
      case 'mountains':
        return (
          <g>
            <Fold x={x} y={y + 10} w={13} h={22} light="#b8bdc9" dark={c.side} />
            <Fold x={x} y={y - 4} w={5} h={8} light={c.accent} dark="#d7dbe4" />
          </g>
        );
      case 'desert':
        return <Fold x={x} y={y + 8} w={14} h={9} light="#f7ecd2" dark={c.accent} />;
      default:
        return null;
    }
  },
  desert: ({ x, y, c }) => (
    // A paper crane over a folded dune, scaled up from the old centrepiece.
    <g>
      <Fold x={x} y={y + 26} w={28} h={12} light="#f7ecd2" dark={c.accent} />
      <g transform={`translate(${x + 2} ${y + 14}) scale(0.95)`}>
        <path d="M-4-4L6-30L14-2Z" fill="#b8432f" />
        <path d="M-10-2L-32-22L-14 2Z" fill="#b8432f" />
        <path d="M-16 0L0-8L16 0L0 8Z" fill="#e8604a" />
        <path d="M0-8L16 0L0 8Z" fill="#cf5440" />
        <path d="M10-2L30-24L14 2Z" fill="#e8604a" />
        <path d="M30-24L37-18L28-19Z" fill="#b8432f" />
        <path d="M-8-4L-2-34L10-2Z" fill="#f07a64" />
      </g>
    </g>
  ),
};
