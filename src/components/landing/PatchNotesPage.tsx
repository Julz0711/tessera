'use client';

import { ArrowLeft, ArrowLeftRight, Dices, Hand, Map as MapIcon, Move, ScrollText, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { LATEST_PATCH, PATCH_NOTES, PATCH_SEEN_KEY, type PatchSectionIcon } from '@/config/patchNotes';
import { MapPreview } from '@/components/room/MapPreview';
import { Logomark } from '@/components/ui/Logomark';
import { MAPS } from '@/engine/maps';

const ICON: Record<PatchSectionIcon, React.ReactNode> = {
  players: <Users size={17} />,
  turn: <Dices size={17} />,
  trade: <ArrowLeftRight size={17} />,
  log: <ScrollText size={17} />,
  hand: <Hand size={17} />,
  map: <MapIcon size={17} />,
  board: <Move size={17} />,
};

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function PatchNotesPage() {
  // Opening the notes clears the "new" dot on the home page.
  useEffect(() => {
    try {
      localStorage.setItem(PATCH_SEEN_KEY, LATEST_PATCH);
    } catch {
      // Storage can be unavailable (private windows); the dot then just stays.
    }
  }, []);

  return (
    <main className="page-safe-top min-h-dvh bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-2xl gap-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-foam/70 hover:text-paper">
            <ArrowLeft size={16} /> Home
          </Link>
          <Logomark size={28} />
        </div>
        {PATCH_NOTES.map((patch, i) => (
          <article key={patch.version} className="paper animate-rise p-5 sm:p-7" style={{ animationDelay: `${i * 80}ms` }}>
            {/* the page title sits in the first card, as on every other page */}
            {i === 0 && (
              <h1 className="display mb-5 flex items-center gap-2 border-b-2 border-ink/10 pb-5 text-4xl font-black">
                <ScrollText size={30} /> Patch notes
              </h1>
            )}
            <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="display text-3xl font-black">
                Patch {patch.version}
                {i === 0 && <span className="ml-2 rounded-md bg-amber px-1.5 py-0.5 align-middle text-xs font-black uppercase tracking-caps text-ink">Latest</span>}
              </h2>
              <time dateTime={patch.date} className="text-sm font-bold text-ink-faint">
                {formatDate(patch.date)}
              </time>
            </header>
            <p className="mt-1 text-ink-soft">{patch.summary}</p>
            <div className="mt-5 grid gap-5">
              {patch.sections.map((section) => (
                <section key={section.title}>
                  <h3 className="flex items-center gap-2 font-bold">
                    <span className="grid h-7 w-7 place-items-center rounded-lg border-2 border-ink bg-paper-2 text-ink">{ICON[section.icon]}</span>
                    {section.title}
                  </h3>
                  <ul className="mt-2 grid gap-1.5 pl-9 text-[15px] leading-snug">
                    {section.items.map((item) => (
                      <li key={item} className="relative before:absolute before:-left-4 before:top-[0.55em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-amber-deep">
                        {item}
                      </li>
                    ))}
                  </ul>
                  {section.maps && (
                    <div className="mt-3 flex flex-wrap gap-2.5 pl-9">
                      {section.maps.map((map) => (
                        <figure key={map} className="grid w-[112px] justify-items-center gap-1 rounded-xl border-2 border-ink bg-paper-2 p-2">
                          <MapPreview map={map} size={92} />
                          <figcaption className="text-center text-xs font-bold leading-tight">{MAPS[map].name}</figcaption>
                        </figure>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
