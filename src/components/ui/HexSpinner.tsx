/** Six small hexes around a centre, as a ring: pointy-top hexes of circumradius 4.1 at distance 9.1. */
const RING = [0, 1, 2, 3, 4, 5].map((i) => {
  const a = (i * Math.PI) / 3;
  const cx = 16 + 9.1 * Math.cos(a);
  const cy = 16 + 9.1 * Math.sin(a);
  const pts = [0, 1, 2, 3, 4, 5].map((k) => {
    const t = (Math.PI / 3) * k - Math.PI / 2;
    return `${(cx + 4.1 * Math.cos(t)).toFixed(2)} ${(cy + 4.1 * Math.sin(t)).toFixed(2)}`;
  });
  return `M${pts.join('L')}Z`;
});

/*
 * Plain CSS keyframes, no JS loop. The resting style of every part is a readable still frame, so
 * the global reduced-motion rule (animations cut to one 0.001ms run) leaves a clean static glyph;
 * on top of that, reduced motion gets a slow fade instead of the sequence (unless Animations is "full").
 */
const CSS = `
.hexspin-b{animation:hexspin-lit 1.2s ease-in-out infinite}
@keyframes hexspin-lit{0%,100%{opacity:.18}15%,30%{opacity:1}60%{opacity:.18}}
@keyframes hexspin-fade{0%,100%{opacity:1}50%{opacity:.35}}
@media (prefers-reduced-motion:reduce){
:root:not([data-motion='full']) svg.hexspin .hexspin-b{animation:hexspin-fade 2.4s ease-in-out infinite!important;opacity:1}
}
:root[data-motion='reduced'] svg.hexspin .hexspin-b{animation:hexspin-fade 2.4s ease-in-out infinite!important;opacity:1}
`;

/**
 * Hex loading spinner, pure SVG + CSS, drawn in currentColor so it takes the text colour of a dark
 * or a light button: a ring of six hexes lighting in turn. Readable from 16px (buttons) to ~96px
 * (startup). Pass `decorative` when a label sits next to it ("Joining…").
 */
export function HexSpinner({
  size = 24,
  className,
  decorative = false,
}: {
  size?: number;
  className?: string;
  decorative?: boolean;
}) {
  const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'status', 'aria-label': 'Loading' };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={`hexspin inline-block shrink-0 ${className ?? ''}`}
      {...a11y}
    >
      <style>{CSS}</style>
      {RING.map((d, i) => (
        <path
          key={i}
          className="hexspin-b"
          d={d}
          fill="currentColor"
          stroke="currentColor"
          strokeWidth={1}
          strokeLinejoin="round"
          style={{ animationDelay: `${-1.2 + i * 0.2}s` }}
        />
      ))}
    </svg>
  );
}
