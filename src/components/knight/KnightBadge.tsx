import { useId } from 'react';
import type { PlayerColor } from '@/engine/types';
import { PLAYER_COLORS } from '@/shared/colors';
import { KNIGHT_STEEL, faceFrame, faceUrl, type KnightLook } from '@/shared/knight';

/**
 * Portrait of the player's knight: one basic knight in the player's color. If the player uploaded
 * a face, it shows in the helmet's face opening; otherwise the knight keeps its visor.
 */
export function KnightBadge({
  knight,
  color,
  size = 56,
  ring = true,
}: {
  knight: KnightLook;
  color: PlayerColor;
  size?: number;
  ring?: boolean;
}) {
  const pc = PLAYER_COLORS[color];
  const clip = useId().replace(/:/g, '');
  const steel = KNIGHT_STEEL;
  const frame = faceFrame(knight);
  // The face box is exactly the clip ellipse's box (32×37, centred at 50,46), like the customizer's
  // photo window, so the helmet shows just what the player framed there. Panning/zooming is a
  // translate-after-scale around that centre, so a drag feels the same size on screen at any zoom.
  const faceTransform = `translate(${frame.x * 32 + 50} ${frame.y * 37 + 46}) scale(${frame.zoom}) translate(-50 -46)`;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Knight">
      <defs>
        <clipPath id={`face-${clip}`}>
          <ellipse cx="50" cy="46" rx="16" ry="18.5" />
        </clipPath>
        <clipPath id={`ring-${clip}`}>
          <circle cx="50" cy="50" r="48" />
        </clipPath>
      </defs>
      {ring && <circle cx="50" cy="50" r="48" fill={pc.hex} opacity="0.22" />}
      <g clipPath={ring ? `url(#ring-${clip})` : undefined}>
        {/* cape */}
        <path d="M24 60 50 50l26 10 8 40H16Z" fill={pc.hex} stroke={pc.dark} strokeWidth="2.5" />
        {/* shoulders & tabard */}
        <path d="M22 100c0-20 11-34 28-34s28 14 28 34Z" fill={steel.base} stroke={steel.trim} strokeWidth="3" />
        <path d="M38 70h24l-3 30H41Z" fill={pc.hex} stroke={pc.dark} strokeWidth="2" />
        <path d="M50 74v22M43 84h14" stroke={pc.ink} strokeWidth="2.5" strokeLinecap="round" />
        {/* plume */}
        <path d="M50 14c3-9 14-13 21-9-9 1-13 7-15 13Z" fill={pc.hex} stroke={pc.dark} strokeWidth="1.5" />
        {/* helmet with a generous face opening */}
        <path d="M27 67V43c0-17 10-28 23-31 13 3 23 14 23 31v24Z" fill={steel.base} stroke={steel.trim} strokeWidth="3" strokeLinejoin="round" />
        <ellipse cx="50" cy="46" rx="17.5" ry="20" fill={steel.trim} />
        {knight.face ? (
          // The clip sits on a wrapper: on the image itself it would be scaled and panned along with
          // the photo, so a zoomed face spilled out of the helmet.
          <g clipPath={`url(#face-${clip})`}>
            <image
              href={faceUrl(knight.face)}
              x="34"
              y="27.5"
              width="32"
              height="37"
              preserveAspectRatio="xMidYMid slice"
              transform={faceTransform}
            />
          </g>
        ) : (
          <g>
            <ellipse cx="50" cy="46" rx="16" ry="18.5" fill={steel.visor} />
            <path d="M37 41h26M37 48h26M50 30v32" stroke={steel.base} strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
          </g>
        )}
        <path d="M27 61h46" stroke={steel.trim} strokeWidth="3" />
      </g>
    </svg>
  );
}
