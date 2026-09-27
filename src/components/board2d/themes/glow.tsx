/**
 * Glowing marks for the 2D board's light-up themes (Cyberpunk, Orbital). A wide, faint stroke or
 * disc under the crisp one reads as glow and stays cheap to redraw while the board pans and zooms
 * (SVG blur filters don't).
 */

/** A glowing line along `d`. */
export function Neon({ d, color, width = 2.4, fill }: { d: string; color: string; width?: number; fill?: string }) {
  return (
    <g fill={fill ?? 'none'} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={color} strokeWidth={width * 3.2} strokeOpacity="0.25" />
      <path d={d} stroke={color} strokeWidth={width} />
    </g>
  );
}

/** A glowing dot. */
export function Glow({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r * 2.4} fill={color} opacity="0.25" />
      <circle cx={x} cy={y} r={r} fill={color} />
    </g>
  );
}
