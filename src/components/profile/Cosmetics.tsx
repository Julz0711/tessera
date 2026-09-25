import { shade } from '@/client/palette';
import type { PlayerColor } from '@/engine/types';
import type { KnightLook } from '@/shared/knight';
import { KnightBadge } from '@/components/knight/KnightBadge';
import { Lock } from 'lucide-react';
import {
  FRAMES,
  TITLES,
  frameInfo,
  isUnlocked,
  requirementProgress,
  requirementText,
  titleInfo,
  type Cosmetics,
  type FrameId,
  type Requirement,
  type Tier,
  type TitleId,
  type UnlockStats,
} from '@/shared/cosmetics';

/**
 * Portrait frames and title tags. Frames are low-poly like the cards: a faceted band lit from the
 * top-left, with an ink outline, plus a few ornaments (laurels, rivets, gems, a crown).
 */

const INK = '#1b1b1b';
const LIGHT = (-135 * Math.PI) / 180; // top-left

export const TIER_COLOR: Record<Tier, string> = {
  common: '#6f6a5f',
  bronze: '#b0703a',
  silver: '#7d8a99',
  gold: '#c88a12',
  epic: '#8a4cc4',
};

// Rounded so server and browser render identical markup (their trig can differ in the last bits).
const round = (v: number) => Math.round(v * 100) / 100;
const pt = (r: number, a: number): [number, number] => [round(50 + r * Math.cos(a)), round(50 + r * Math.sin(a))];
const P = (pts: [number, number][]) => pts.map((p) => p.map((v) => v.toFixed(2)).join(',')).join(' ');
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Band between r1 and r2 cut into n quads, each shaded by how much it faces the light. */
function FacetRing({ r1, r2, n, base, offset = 0 }: { r1: number; r2: number; n: number; base: string; offset?: number }) {
  const quads = Array.from({ length: n }, (_, i) => {
    const a0 = offset + (i / n) * Math.PI * 2;
    const a1 = offset + ((i + 1) / n) * Math.PI * 2;
    const lit = Math.cos((a0 + a1) / 2 - LIGHT);
    // Alternate a touch so neighbouring facets read as separate planes.
    const fill = shade(base, lit * 0.32 + (i % 2 ? 0.04 : -0.04));
    return <polygon key={i} points={P([pt(r1, a0), pt(r2, a0), pt(r2, a1), pt(r1, a1)])} fill={fill} stroke={fill} strokeWidth="0.4" />;
  });
  return (
    <g>
      {quads}
      <circle cx="50" cy="50" r={r2} fill="none" stroke={INK} strokeWidth="1.6" />
      <circle cx="50" cy="50" r={r1} fill="none" stroke={INK} strokeWidth="1.3" />
    </g>
  );
}

function Rivet({ at, color }: { at: [number, number]; color: string }) {
  return (
    <g>
      <circle cx={at[0]} cy={at[1]} r="2.4" fill={shade(color, -0.35)} stroke={INK} strokeWidth="0.9" />
      <circle cx={at[0] - 0.7} cy={at[1] - 0.7} r="0.9" fill={shade(color, 0.6)} />
    </g>
  );
}

/** A leaf as two facets (light and dark half), pointing along `dir`. */
function Leaf({ at, dir, color, len = 8, wid = 3.2 }: { at: [number, number]; dir: number; color: string; len?: number; wid?: number }) {
  const [x, y] = at;
  const tip: [number, number] = [round(x + Math.cos(dir) * len), round(y + Math.sin(dir) * len)];
  const mid: [number, number] = [x + Math.cos(dir) * len * 0.45, y + Math.sin(dir) * len * 0.45];
  const side = (s: number): [number, number] => [mid[0] + Math.cos(dir + (s * Math.PI) / 2) * wid, mid[1] + Math.sin(dir + (s * Math.PI) / 2) * wid];
  return (
    <g stroke={INK} strokeWidth="0.8" strokeLinejoin="round">
      <polygon points={P([at, side(-1), tip])} fill={shade(color, 0.28)} />
      <polygon points={P([at, tip, side(1)])} fill={shade(color, -0.18)} />
    </g>
  );
}

/** Two laurel branches meeting at the bottom, climbing up both sides. */
function Laurel({ color }: { color: string }) {
  const leaves: React.ReactNode[] = [];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const a = rad(90 + side * (20 + i * 22));
      const at = pt(44.5, a);
      // The ring's tangent heading up from the knot; the outer leaf splays outwards, the inner one in.
      const along = a + side * (Math.PI / 2);
      leaves.push(<Leaf key={`${side}o${i}`} at={at} dir={along - side * 0.6} color={color} len={11} wid={4.2} />);
      leaves.push(<Leaf key={`${side}i${i}`} at={at} dir={along + side * 0.55} color={shade(color, -0.1)} len={9} wid={3.4} />);
    }
  }
  const [bx, by] = pt(46, rad(90));
  return (
    <g>
      {leaves}
      {/* ribbon knot where the branches meet */}
      <g stroke={INK} strokeWidth="0.9" strokeLinejoin="round">
        <polygon points={P([[bx - 7, by - 3], [bx, by], [bx - 5, by + 5]])} fill="#b8322a" />
        <polygon points={P([[bx + 7, by - 3], [bx, by], [bx + 5, by + 5]])} fill="#8f241e" />
        <circle cx={bx} cy={by} r="2.6" fill="#d24a3f" />
      </g>
    </g>
  );
}

/** A cut gem: a rhombus split into four facets. */
function Gem({ at, color, r = 5.5 }: { at: [number, number]; color: string; r?: number }) {
  const [x, y] = at;
  const T: [number, number] = [x, y - r];
  const R: [number, number] = [x + r * 0.8, y];
  const B: [number, number] = [x, y + r];
  const L: [number, number] = [x - r * 0.8, y];
  const C: [number, number] = [x - r * 0.12, y - r * 0.15];
  return (
    <g stroke={INK} strokeWidth="0.8" strokeLinejoin="round">
      <polygon points={P([T, L, B, R])} fill={color} />
      <polygon points={P([T, L, C])} fill={shade(color, 0.55)} stroke="none" />
      <polygon points={P([T, C, R])} fill={shade(color, 0.2)} stroke="none" />
      <polygon points={P([L, B, C])} fill={shade(color, -0.1)} stroke="none" />
      <polygon points={P([C, B, R])} fill={shade(color, -0.4)} stroke="none" />
      <polygon points={P([T, L, B, R])} fill="none" />
    </g>
  );
}

function Crown() {
  const gold = '#e0a92a';
  const body: [number, number][] = [
    [31, 17], [29, 3], [39, 10], [50, 0], [61, 10], [71, 3], [69, 17],
  ];
  return (
    <g stroke={INK} strokeWidth="1.1" strokeLinejoin="round">
      <polygon points={P(body)} fill={gold} />
      {/* left facets lit, right in shade */}
      <polygon points={P([[29, 3], [39, 10], [37, 17], [31, 17]])} fill={shade(gold, 0.3)} stroke="none" />
      <polygon points={P([[50, 0], [61, 10], [63, 17], [50, 17]])} fill={shade(gold, -0.18)} stroke="none" />
      <polygon points={P([[71, 3], [69, 17], [63, 17], [61, 10]])} fill={shade(gold, -0.3)} stroke="none" />
      <polygon points={P(body)} fill="none" />
      <rect x="30" y="14" width="40" height="5" rx="1" fill={shade(gold, -0.12)} />
      <circle cx="50" cy="16.5" r="1.8" fill="#c43b33" strokeWidth="0.7" />
      <circle cx="40" cy="16.5" r="1.3" fill="#2f8f6a" strokeWidth="0.6" />
      <circle cx="60" cy="16.5" r="1.3" fill="#2f8f6a" strokeWidth="0.6" />
    </g>
  );
}

export function FrameArt({ frame }: { frame: FrameId }) {
  switch (frame) {
    case 'none':
      return null;
    case 'wood':
      return (
        <g>
          <FacetRing r1={40} r2={47} n={12} base="#9a6434" />
          {[45, 135, 225, 315].map((d) => (
            <Rivet key={d} at={pt(43.5, rad(d))} color="#6b4122" />
          ))}
        </g>
      );
    case 'rope': {
      const twists = Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2;
        return <line key={i} x1={pt(40.5, a)[0]} y1={pt(40.5, a)[1]} x2={pt(46.5, a + 0.12)[0]} y2={pt(46.5, a + 0.12)[1]} stroke="#6e5226" strokeWidth="1.1" />;
      });
      return (
        <g>
          <FacetRing r1={40} r2={47} n={22} base="#c9a46a" />
          {twists}
        </g>
      );
    }
    case 'iron':
      return (
        <g>
          <FacetRing r1={40} r2={47.5} n={16} base="#8a939c" offset={rad(11.25)} />
          {Array.from({ length: 8 }, (_, i) => (
            <Rivet key={i} at={pt(43.7, rad(i * 45))} color="#c7ced6" />
          ))}
        </g>
      );
    case 'waves': {
      const crest = Array.from({ length: 12 }, (_, i) => {
        const a = rad(i * 30);
        const [x0, y0] = pt(44, a - 0.2);
        const [x1, y1] = pt(44, a + 0.2);
        const [cx, cy] = pt(47.5, a);
        return <path key={i} d={`M${x0.toFixed(2)} ${y0.toFixed(2)}Q${cx.toFixed(2)} ${cy.toFixed(2)} ${x1.toFixed(2)} ${y1.toFixed(2)}`} fill="none" stroke="#e8f6fb" strokeWidth="1.5" strokeLinecap="round" />;
      });
      return (
        <g>
          <FacetRing r1={40} r2={47.5} n={16} base="#2f7fa0" />
          {crest}
        </g>
      );
    }
    case 'bronze':
    case 'silver':
    case 'gold': {
      const metal = { bronze: '#c07a3e', silver: '#b9c2cc', gold: '#e3ad2c' }[frame];
      const leaf = { bronze: '#a8703a', silver: '#aeb9c4', gold: '#e8b631' }[frame];
      return (
        <g>
          <FacetRing r1={41.5} r2={45.5} n={16} base={metal} />
          <Laurel color={leaf} />
        </g>
      );
    }
    case 'crown':
      return (
        <g>
          <FacetRing r1={40.5} r2={47} n={16} base="#e0a92a" />
          <Laurel color="#e8b631" />
          <Crown />
        </g>
      );
    case 'emerald':
    case 'ruby': {
      const gem = frame === 'emerald' ? '#1f9e6b' : '#cf2f3d';
      return (
        <g>
          <FacetRing r1={40.5} r2={47} n={16} base="#c9ced6" offset={rad(11.25)} />
          {[0, 90, 180, 270].map((d) => (
            <Gem key={d} at={pt(43.7, rad(d - 90))} color={gem} r={d === 0 ? 7.5 : 5.5} />
          ))}
          {[45, 135, 225, 315].map((d) => (
            <Rivet key={d} at={pt(43.7, rad(d - 90))} color="#eef1f4" />
          ))}
        </g>
      );
    }
  }
}

/**
 * A portrait (knight badge or photo) inside the player's frame. Without a frame the portrait gets
 * the full size; with one it shrinks to sit inside the band.
 */
export function Framed({ frame, size, children }: { frame: FrameId | undefined; size: number; children: (inner: number) => React.ReactNode }) {
  if (!frame || frame === 'none') return <>{children(size)}</>;
  const inner = Math.round(size * 0.8);
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} title={frameInfo(frame).name}>
      <span className="grid place-items-center overflow-hidden rounded-full" style={{ width: inner, height: inner }}>
        {children(inner)}
      </span>
      <svg viewBox="0 0 100 100" width={size} height={size} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
        <FrameArt frame={frame} />
      </svg>
    </span>
  );
}

export function TitleTag({ title, className = '' }: { title: TitleId | null | undefined; className?: string }) {
  if (!title) return null;
  const t = titleInfo(title);
  const c = TIER_COLOR[t.tier];
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 text-[10px] font-black uppercase leading-4 tracking-wider ${className}`}
      style={{ color: c, background: `${c}1f`, boxShadow: `inset 0 0 0 1px ${c}55` }}
    >
      {t.name}
    </span>
  );
}

/** A player's portrait — photo or knight — in their frame. */
export function PlayerPortrait({
  knight,
  color,
  avatarUrl,
  frame,
  size,
}: {
  knight: KnightLook;
  color: PlayerColor;
  avatarUrl?: string | null;
  frame?: FrameId;
  size: number;
}) {
  return (
    <Framed frame={frame} size={size}>
      {(s) =>
        avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" width={s} height={s} className="shrink-0 rounded-full border-2 border-ink object-cover" style={{ width: s, height: s }} referrerPolicy="no-referrer" />
        ) : (
          <KnightBadge knight={knight} color={color} size={s} />
        )
      }
    </Framed>
  );
}

function Progress({ req, stats }: { req: Requirement; stats: UnlockStats }) {
  const p = requirementProgress(req, stats);
  return (
    <span className="grid gap-0.5 text-[10px] font-bold leading-tight text-ink-faint">
      <span className="flex items-center justify-center gap-1">
        <Lock size={10} /> {requirementText(req)}
      </span>
      {p && req.kind !== 'rating' && (
        <span className="mx-auto h-1 w-12 overflow-hidden rounded-full bg-ink/10">
          <span className="block h-full rounded-full bg-amber-deep" style={{ width: `${(p.have / p.need) * 100}%` }} />
        </span>
      )}
    </span>
  );
}

/** Frame and title picker for the settings page. Locked items show what unlocks them. */
export function CosmeticsPicker({
  value,
  onChange,
  stats,
  knight,
  color,
}: {
  value: Cosmetics;
  onChange: (next: Cosmetics) => void;
  stats: UnlockStats;
  knight: KnightLook;
  color: PlayerColor;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
        {FRAMES.map((f) => {
          const open = isUnlocked(f.req, stats);
          const on = value.frame === f.id;
          return (
            <button
              key={f.id}
              type="button"
              disabled={!open}
              onClick={() => onChange({ ...value, frame: f.id })}
              aria-pressed={on}
              className={`grid justify-items-center gap-1 rounded-xl border-2 p-2 transition ${
                on ? 'border-ink bg-amber/25 shadow-[0_2px_0_0_#000]' : 'border-transparent bg-paper-2/70 hover:border-ink/30'
              } ${open ? '' : 'cursor-not-allowed'}`}
            >
              <span className={open ? '' : 'opacity-45 grayscale'}>
                <Framed frame={f.id} size={60}>
                  {(s) => <KnightBadge knight={knight} color={color} size={s} />}
                </Framed>
              </span>
              <span className="text-xs font-extrabold leading-tight" style={{ color: open ? TIER_COLOR[f.tier] : undefined }}>
                {f.name}
              </span>
              {!open && <Progress req={f.req} stats={stats} />}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange({ ...value, title: null })}
          className={`btn px-2.5 py-1 text-xs ${value.title === null ? 'btn-primary' : ''}`}
        >
          No title
        </button>
        {TITLES.map((t) => {
          const open = isUnlocked(t.req, stats);
          const on = value.title === t.id;
          const p = requirementProgress(t.req, stats);
          return (
            <button
              key={t.id}
              type="button"
              disabled={!open}
              onClick={() => onChange({ ...value, title: t.id })}
              aria-pressed={on}
              title={open ? t.name : `${requirementText(t.req)}${p && t.req.kind !== 'rating' ? ` (${p.have}/${p.need})` : ''}`}
              className={`flex items-center gap-1 rounded-lg border-2 px-2 py-1 text-xs font-black uppercase tracking-wider transition ${
                on ? 'border-ink shadow-[0_2px_0_0_#000]' : open ? 'border-transparent hover:border-ink/30' : 'cursor-not-allowed border-transparent opacity-50'
              }`}
              style={{ color: open ? TIER_COLOR[t.tier] : undefined, background: open ? `${TIER_COLOR[t.tier]}1f` : 'rgb(0 0 0 / 0.05)' }}
            >
              {!open && <Lock size={11} />}
              {t.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
