import type { TileAccents } from './types';

/** A four-pointed glint. */
export function sparkle(x: number, y: number, s: number): string {
  const k = s * 0.28;
  return `M${x} ${y - s}L${x + k} ${y - k}L${x + s} ${y}L${x + k} ${y + k}L${x} ${y + s}L${x - k} ${y + k}L${x - s} ${y}L${x - k} ${y - k}Z`;
}

/** A tuft of grass, four blades leaning out from (x, y + 8). */
export function grassTuft(x: number, y: number, color: string) {
  return (
    <path
      d={`M${x - 9} ${y + 8}q1-8-4-13M${x - 3} ${y + 8}q-1-10 2-17M${x + 3} ${y + 8}q0-9 5-14M${x + 9} ${y + 8}q-1-6 4-9`}
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
  );
}

/** Two pebbles, a big one and a small one, resting on y + 7. */
export function pebbles(x: number, y: number, fill: string, stroke: string) {
  return (
    <g fill={fill} stroke={stroke} strokeWidth="2" strokeLinejoin="round">
      <path d={`M${x - 13} ${y + 7}q0-9 8-10q8 0 9 10Z`} />
      <path d={`M${x + 3} ${y + 7}q0-6 5-6q6 0 6 6Z`} />
    </g>
  );
}

/**
 * Gold (Voyagers): two nuggets and a glint, the tile's centrepiece where the other tiles show their
 * resource card. Gold looks the same in every theme, so it is always recognisable.
 */
export function GoldNuggets({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#6b4306" strokeWidth="2.5" strokeLinejoin="round">
      <g fill="#ffd84a">
        <path d={`M${x - 24} ${y + 14}l4-14 13-6 10 8-3 12Z`} />
        <path d={`M${x - 1} ${y + 15}l3-15 14-5 9 11-6 9Z`} />
      </g>
      <path d={sparkle(x + 12, y - 14, 10)} fill="#fffbe6" strokeWidth="1.5" />
    </g>
  );
}

/** The classic accessories: a little pine, pebbles, grass, a dune and a glint. */
export const classicAccents: TileAccents = {
  side: ({ terrain, x, y, c }) => {
    switch (terrain) {
      case 'forest':
        return (
          <g fill={c.accent}>
            <path d={`M${x} ${y - 13}l9 13h-18Z M${x} ${y - 4}l12 15h-24Z`} />
            <rect x={x - 2} y={y + 11} width="4" height="4" fill="#5a3d22" />
          </g>
        );
      case 'hills':
        return pebbles(x, y, c.accent, c.side);
      case 'pasture':
        return grassTuft(x, y, c.side);
      case 'fields':
        return grassTuft(x, y, c.side);
      case 'mountains':
        return pebbles(x, y, '#b8bcc4', '#5d616a');
      case 'desert':
        return <path d={`M${x - 15} ${y + 7}q15-14 30 0Z`} fill={c.accent} />;
      case 'gold':
        return <path d={sparkle(x, y, 9)} fill="#fffbe6" stroke="#6b4306" strokeWidth="1.5" strokeLinejoin="round" />;
      default:
        return null;
    }
  },
  desert: ({ x, y }) => (
    <g>
      <ellipse cx={x} cy={y + 27} rx="20" ry="5" fill="#000" opacity="0.12" />
      <g stroke="#3f6a33" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d={`M${x} ${y + 24}V${y - 22}M${x} ${y + 6}h-13v-13M${x} ${y - 2}h13v-11`} />
      </g>
      <g stroke="#5f8f4a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d={`M${x} ${y + 24}V${y - 22}M${x} ${y + 6}h-13v-13M${x} ${y - 2}h13v-11`} />
      </g>
    </g>
  ),
};
