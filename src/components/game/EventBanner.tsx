'use client';

import { Anchor, Castle, Route, Shield, ShieldCheck, Swords, VenetianMask, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { create } from 'zustand';

/** How long each banner stays up. */
const SHOW_MS = 3000;
/** The fade at the end of that time. */
const FADE_MS = 350;

export type BannerIcon = 'robber' | 'pirate' | 'barbarians' | 'metropolis' | 'road' | 'army' | 'defender';

export interface Banner {
  id: number;
  icon: BannerIcon;
  title: string;
  text: string;
  /** Accent colour: the player the event is about. */
  color: string;
  tone: 'info' | 'good' | 'bad';
}

const ICONS: Record<BannerIcon, LucideIcon> = {
  robber: VenetianMask,
  pirate: Anchor,
  barbarians: Swords,
  metropolis: Castle,
  road: Route,
  army: Shield,
  defender: ShieldCheck,
};

let nextId = 1;

/** Banners waiting to show, one at a time, oldest first (a burst of events queues up instead of piling on). */
const useBanners = create<{ queue: Banner[]; push(b: Omit<Banner, 'id'>): void; shift(): void }>((set) => ({
  queue: [],
  push: (b) => set((s) => ({ queue: [...s.queue, { ...b, id: nextId++ }].slice(-4) })),
  shift: () => set((s) => ({ queue: s.queue.slice(1) })),
}));

export const pushBanner = (b: Omit<Banner, 'id'>) => useBanners.getState().push(b);

/** A big announcement across the top of the board for major events (robber, barbarians, metropolis…). */
export function EventBanner() {
  const banner = useBanners((s) => s.queue[0] ?? null);
  const shift = useBanners((s) => s.shift);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!banner) return;
    setLeaving(false);
    const fade = setTimeout(() => setLeaving(true), SHOW_MS - FADE_MS);
    const done = setTimeout(shift, SHOW_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, [banner, shift]);

  if (!banner) return null;
  const Icon = ICONS[banner.icon];
  const ring = banner.tone === 'bad' ? 'ring-danger/60' : banner.tone === 'good' ? 'ring-moss/60' : 'ring-amber/60';
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[18%] z-40 flex justify-center px-4" role="status" aria-live="polite">
      <div
        key={banner.id}
        className={`paper animate-rise flex max-w-lg items-center gap-4 border-l-8 px-5 py-3.5 ring-4 transition-opacity ${ring} ${leaving ? 'opacity-0' : 'opacity-100'}`}
        style={{ borderLeftColor: banner.color, transitionDuration: `${FADE_MS}ms` }}
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-ink text-paper" style={{ background: banner.color }}>
          <Icon size={26} strokeWidth={2.4} />
        </span>
        <span className="grid min-w-0">
          <span className="display text-2xl font-black leading-tight">{banner.title}</span>
          <span className="text-sm font-bold text-ink-soft">{banner.text}</span>
        </span>
      </div>
    </div>
  );
}
