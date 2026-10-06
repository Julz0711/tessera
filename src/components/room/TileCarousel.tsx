"use client";

import { ChevronLeft, ChevronRight, Ship, Sparkles, Swords } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GameType } from "@/engine/maps";
import { KnightGlyph } from "@/components/ui/Glyphs";

export interface CarouselTile<T> {
  value: T;
  label: string;
  art: React.ReactNode;
}

/**
 * One row of picture tiles with an arrow key at each end (as on colonist): the row scrolls a
 * page at a time, an arrow fades once there's nothing more that way, and the picked tile is
 * scrolled into view whenever it changes.
 */
export function TileCarousel<T extends string>({
  label,
  value,
  tiles,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  tiles: readonly CarouselTile<T>[];
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  const row = useRef<HTMLDivElement>(null);
  const [ends, setEnds] = useState({ start: true, end: true });

  const measure = () => {
    const el = row.current;
    if (!el) return;
    setEnds({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
  };

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tiles.length]);

  // Keep the picked tile in view (on load, and when someone else changes it). The row is
  // `relative`, so a tile's offsetLeft is measured from the row.
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (!el || !row.current) return;
    const r = row.current;
    if (el.offsetLeft < r.scrollLeft || el.offsetLeft + el.offsetWidth > r.scrollLeft + r.clientWidth) {
      r.scrollTo({ left: el.offsetLeft - (r.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
    }
  }, [value]);

  const page = (dir: 1 | -1) => {
    const r = row.current;
    if (r) r.scrollBy({ left: dir * Math.max(120, r.clientWidth - 80), behavior: "smooth" });
  };

  // An arrow only shows while there's more that way, so the row starts flush with the panel.
  const arrow = (dir: 1 | -1) => {
    if (dir < 0 ? ends.start : ends.end) return null;
    return (
      <button
        type="button"
        // A small round key floating over the row's edge, as on colonist.
        className={`btn btn-dark absolute top-1/2 z-10 h-9 min-h-9 w-9 min-w-9 -translate-y-1/2 rounded-full! p-0 ${dir < 0 ? "-left-2" : "-right-2"}`}
        onClick={() => page(dir)}
        aria-label={`${dir < 0 ? "Previous" : "More"} ${label.toLowerCase()}s`}
      >
        {dir < 0 ? <ChevronLeft size={18} strokeWidth={3} /> : <ChevronRight size={18} strokeWidth={3} />}
      </button>
    );
  };

  return (
    <div className="relative min-w-0">
      {arrow(-1)}
      <div
        ref={row}
        role="radiogroup"
        aria-label={label}
        onScroll={measure}
        className="relative flex min-w-0 snap-x snap-mandatory gap-1.5 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tiles.map((t) => {
          const on = t.value === value;
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              onClick={() => onChange(t.value)}
              // A key like every other: white with the shaded corner, pale blue once picked.
              className={`btn w-26 shrink-0 snap-start flex-col gap-1.5 px-1.5 pb-2 pt-2.5 text-center text-[13px] font-extrabold leading-tight disabled:cursor-default ${
                on ? "btn-on" : ""
              }`}
            >
              <span className="grid h-16 place-items-center">{t.art}</span>
              <span className="flex min-h-[2lh] items-center">{t.label}</span>
            </button>
          );
        })}
      </div>
      {arrow(1)}
    </div>
  );
}

/** A small island of seven hexes in the resource colours: the plain game. */
function HexCluster({ size = 52 }: { size?: number }) {
  const r = 10;
  const w = Math.sqrt(3) * r;
  const hex = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    }).join(" ");
  const cells: [number, number, string][] = [
    [0, 0, "#e7d7a8"],
    [w, 0, "#9ccf6c"],
    [-w, 0, "#c4673f"],
    [w / 2, -1.5 * r, "#2f6b3f"],
    [-w / 2, -1.5 * r, "#e9c35a"],
    [w / 2, 1.5 * r, "#8d909b"],
    [-w / 2, 1.5 * r, "#9ccf6c"],
  ];
  return (
    <svg width={size} height={size} viewBox="-30 -30 60 60" aria-hidden>
      {cells.map(([x, y, c], i) => (
        <polygon key={i} points={hex(x, y)} fill={c} stroke="var(--color-ink)" strokeWidth={2} strokeLinejoin="round" />
      ))}
    </svg>
  );
}

/** Each game mode's picture on its tile. */
export function ModeArt({ type }: { type: GameType }) {
  const glyph = "text-ink";
  switch (type) {
    case "classic":
      return <HexCluster />;
    case "ck":
      return <KnightGlyph size={44} className={glyph} />;
    case "voyagers":
      return <Ship size={44} strokeWidth={2.25} className={glyph} />;
    case "special":
      return <Sparkles size={42} strokeWidth={2.25} className={glyph} />;
    case "duel":
      return <Swords size={42} strokeWidth={2.25} className={glyph} />;
  }
}
