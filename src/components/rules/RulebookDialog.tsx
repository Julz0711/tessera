'use client';

import { BookOpen } from 'lucide-react';
import { Fragment, useMemo, useRef, useState } from 'react';
import { RULEBOOK, type RuleChapter, type RuleMode } from '@/config/rulebook';
import { Modal } from '@/components/ui/Modal';
import { RuleFigure } from './figures';

const MODE_NAMES: Record<RuleMode, string> = { classic: 'Classic', ck: 'Knights & Barbarians', voyagers: 'Voyagers', special: 'Special', duel: '1v1' };

/** Inline **bold** in rule text. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith('**') && part.endsWith('**') ? <strong key={i} className="font-black text-ink">{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

function applies(chapter: RuleChapter, modes: RuleMode[] | null): boolean {
  return !modes || chapter.applies === 'all' || chapter.applies.some((m) => modes.includes(m));
}

/**
 * The rulebook: chapters down the side (a row of chips on phones), the chosen one on the right. In a
 * game it opens on that game's rules (`modes`: its type and mode) with a switch to show every mode.
 */
export function RulebookDialog({ open, onClose, modes }: { open: boolean; onClose: () => void; modes?: RuleMode[] }) {
  const [everything, setEverything] = useState(!modes);
  const shown = useMemo(() => RULEBOOK.filter((c) => applies(c, everything ? null : (modes ?? null))), [everything, modes]);
  const [chosen, setChosen] = useState(RULEBOOK[0].id);
  const chapter = shown.find((c) => c.id === chosen) ?? shown[0];
  const page = useRef<HTMLDivElement>(null);
  const pick = (id: string) => {
    setChosen(id);
    page.current?.scrollTo({ top: 0 });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      expansive
      title={
        <span className="flex items-center gap-2">
          <BookOpen size={22} /> Rules
        </span>
      }
    >
      {modes && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-soft">Showing</span>
          <div className="flex rounded-[6px] border-[1.5px] border-ink/25 p-0.5" role="radiogroup" aria-label="Which rules to show">
            {[false, true].map((all) => (
              <button
                key={String(all)}
                type="button"
                role="radio"
                aria-checked={everything === all}
                className={`rounded-lg px-3 py-1 font-bold ${everything === all ? 'bg-ink text-paper' : 'text-ink-soft'}`}
                onClick={() => setEverything(all)}
              >
                {all ? 'All modes' : `This game (${modes.map((m) => MODE_NAMES[m]).join(', ')})`}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* A fixed height on wider screens, the chapter list and the chapter each scrolling inside it: the
          dialog keeps its size and place whichever chapter is open (as the settings panel does). */}
      <div className="grid gap-4 md:h-[min(70dvh,720px)] md:grid-cols-[13rem_1fr]">
        <nav aria-label="Chapters" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scroll-thin md:mx-0 md:min-h-0 md:flex-col md:overflow-x-visible md:overflow-y-auto md:px-0 md:pr-1">
          {shown.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c.id)}
              aria-current={c.id === chapter.id ? 'page' : undefined}
              className={`btn shrink-0 justify-start whitespace-nowrap px-3 py-1.5 text-left text-sm md:whitespace-normal ${c.id === chapter.id ? 'btn-primary' : ''}`}
            >
              {c.title}
            </button>
          ))}
        </nav>
        <article ref={page} className="min-w-0 md:min-h-0 md:overflow-y-auto md:pr-2 md:scroll-thin">
          <h3 className="display mb-1 text-xl font-black">{chapter.title}</h3>
          {chapter.applies !== 'all' && chapter.applies.map((m) => MODE_NAMES[m]).join(' · ') !== chapter.title && (
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-ink-faint">{chapter.applies.map((m) => MODE_NAMES[m]).join(' · ')}</p>
          )}
          {chapter.sections.map((s) => (
            <section key={s.title} className="mb-5">
              <h4 className="mb-1.5 text-base font-black">{s.title}</h4>
              <div className="grid gap-2 text-sm leading-relaxed text-ink-soft">
                {s.body.map((b, i) =>
                  typeof b === 'string' ? (
                    <p key={i}>
                      <Rich text={b} />
                    </p>
                  ) : 'figure' in b ? (
                    <RuleFigure key={i} id={b.figure} />
                  ) : (
                    <ul key={i} className="grid list-disc gap-1 pl-5">
                      {b.map((item, j) => (
                        <li key={j}>
                          <Rich text={item} />
                        </li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </section>
          ))}
        </article>
      </div>
    </Modal>
  );
}
