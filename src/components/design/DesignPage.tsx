'use client';

import { ArrowLeft, Check, Hammer, Hourglass, Landmark, Settings, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { PlayerColor } from '@/engine';
import { AskCard, DevCardFace, ResourceCard } from '@/components/game/cards';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { RoadGlyph, SettlementGlyph } from '@/components/ui/Glyphs';
import { CURSOR_LABELS, CURSOR_OPTIONS, CURSOR_SVGS } from '@/components/ui/cursors';
import { HexSpinner } from '@/components/ui/HexSpinner';
import { Kbd } from '@/components/ui/Kbd';
import { Logomark } from '@/components/ui/Logomark';
import { Segmented } from '@/components/ui/Segmented';

/**
 * The design language on one page: every control in each of its states, as the app draws them.
 * Built from the real classes and components, so it drifts only when they do. Not linked from the
 * app (admin page aside) and not indexed.
 */
export function DesignPage() {
  const [seg, setSeg] = useState('m');
  const [on, setOn] = useState(true);
  const [tile, setTile] = useState(0);
  const [color, setColor] = useState<PlayerColor>('red');

  return (
    <main className="page-safe-top min-h-dvh bg-[radial-gradient(ellipse_at_top,_#0f2f3b_0%,_#061419_60%)] px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-4xl gap-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-foam/70 hover:text-paper">
            <ArrowLeft size={16} /> Home
          </Link>
          <Logomark size={28} />
        </div>

        <section className="paper grid gap-8 p-5 sm:p-7">
          <header>
            <h1 className="display text-4xl font-black">Design language</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Ink line, white keys, one shaded corner. Amber is the next action, pale blue is what&apos;s picked, red ends or
              removes. Two radii: 4px controls, 6px panels. No drop shadows.
            </p>
          </header>

          <Block title="Colours">
            <div className="flex flex-wrap gap-3">
              {[
                ['Ink', 'bg-ink', 'Lines, text'],
                ['Paper', 'bg-paper', 'Keys, cards'],
                ['Paper 2', 'bg-paper-2', 'Insets'],
                ['Amber', 'bg-amber', 'Next action'],
                ['Pick', 'bg-pick', 'Selected'],
                ['Sea 800', 'bg-sea-800', 'HUD, dark keys'],
                ['Sea 500', 'bg-sea-500', 'Switches'],
                ['Danger', 'bg-danger', 'End, leave, remove'],
              ].map(([name, bg, use]) => (
                <div key={name} className="grid w-24 gap-1">
                  <span className={`h-12 rounded-md border-2 border-ink ${bg}`} />
                  <span className="text-xs font-black">{name}</span>
                  <span className="text-[11px] text-ink-faint">{use}</span>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Type">
            <p className="display text-4xl font-black">Display, for titles</p>
            <p className="font-bold">Bold body, for names and headings</p>
            <p className="text-sm text-ink-soft">Soft body, for explanations.</p>
            <span className="label">Label, for sections</span>
          </Block>

          <Block title="Buttons" hint="Hover: the shaded corner sweeps over the key. Press: it dips to 97%. Disabled: a pale key, contents faded.">
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn px-4 py-2">Default</button>
              <button type="button" className="btn btn-primary px-4 py-2"><Check size={16} /> Primary</button>
              <button type="button" className="btn btn-on px-4 py-2">Picked</button>
              <button type="button" className="btn btn-dark px-4 py-2"><Settings size={16} /> Dark</button>
              <button type="button" className="btn btn-danger px-4 py-2"><Trash2 size={16} /> Danger</button>
              <button type="button" className="btn btn-ghost px-4 py-2">Ghost</button>
              <button type="button" className="btn px-4 py-2" disabled>Disabled</button>
              <button type="button" className="btn h-10 w-10 p-0" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="game-actions flex flex-wrap gap-2">
              {[
                { label: 'Build', icon: <Hammer size={24} />, cls: '', k: 'D' },
                { label: 'Open', icon: <Hammer size={24} />, cls: 'btn-on', k: 'D' },
                { label: 'Trade', icon: <Landmark size={24} />, cls: '', k: 'T', off: true },
                { label: 'End turn', icon: <Hourglass size={24} />, cls: 'btn-danger', k: 'E' },
              ].map((b) => (
                <button key={b.label} type="button" disabled={b.off} className={`btn relative h-22 w-22 flex-col gap-1 rounded-[6px] text-sm ${b.cls}`}>
                  <Kbd k={b.k} className="absolute left-1 top-1 text-[11px]" />
                  {b.icon}
                  {b.label}
                </button>
              ))}
            </div>
          </Block>

          <Block title="Choices" hint="One of a few: segmented. One of many with pictures: tiles. On or off: a switch.">
            <Segmented label="Size" value={seg} onChange={setSeg} options={[{ value: 's', label: 'Small' }, { value: 'm', label: 'Medium' }, { value: 'l', label: 'Large' }]} />
            <div className="flex flex-wrap gap-2">
              {[{ icon: <RoadGlyph size={22} />, name: 'Road' }, { icon: <SettlementGlyph size={22} />, name: 'Settlement' }].map((t, i) => (
                <button
                  key={t.name}
                  type="button"
                  aria-pressed={tile === i}
                  onClick={() => setTile(i)}
                  className={`flex items-center gap-2 rounded-lg border-2 border-ink px-3 py-2 text-sm font-black transition ${tile === i ? 'bg-pick' : 'bg-white hover:bg-paper-2'}`}
                >
                  {t.icon} {t.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label="Example switch"
              onClick={() => setOn(!on)}
              className={`relative h-6 w-11 rounded-md border-2 border-ink transition ${on ? 'bg-sea-500' : 'bg-paper-3'}`}
            >
              <span className={`absolute top-[2px] h-4 w-4 rounded-sm border-2 border-ink bg-paper transition-all ${on ? 'left-5.5' : 'left-[2px]'}`} />
            </button>
            <ColorPicker value={color} onChange={setColor} />
          </Block>

          <Block title="Inputs">
            <input className="input max-w-sm" placeholder="Your name" aria-label="Example input" />
          </Block>

          <Block title="Cards and badges" hint="Counts are hexes inside the card's corner. Tags are small ink-lined chips.">
            <div className="flex flex-wrap items-end gap-2">
              <ResourceCard card="brick" count={3} size="md" />
              <ResourceCard card="grain" count={0} size="md" />
              <AskCard size="md" />
              <DevCardFace type="knight" size="md" />
              <DevCardFace type="monopoly" size="md" />
              <span className="relative inline-grid h-10 w-10 place-items-center rounded-md border-2 border-ink bg-paper">
                <span className="hex-badge -right-2 -top-2.5 w-6 text-[11px]">4</span>
              </span>
              <span className="rounded-[4px] border-2 border-ink bg-white px-1.5 py-px text-[11px] font-black uppercase tracking-caps">Voyagers</span>
              <span className="rounded-[4px] bg-amber px-1.5 py-0.5 text-xs font-black uppercase tracking-caps">Latest</span>
            </div>
          </Block>

          <Block title="Loading spinner" hint="A ring of six hexes lighting in turn, drawn in the text colour. 48 to 64px above the text on startup and full-screen waits, 16px inside buttons (decorative when a label sits next to it).">
            <div className="grid items-center gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="grid h-28 place-items-center rounded-[6px] border-2 border-ink bg-sea-950 text-paper">
                <HexSpinner size={64} />
              </div>
              <div className="grid h-28 place-items-center rounded-[6px] border-2 border-ink bg-paper text-ink">
                <HexSpinner size={64} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn" disabled>
                  <HexSpinner size={16} decorative /> Joining…
                </button>
                <button type="button" className="btn btn-dark" disabled>
                  <HexSpinner size={16} decorative /> Joining…
                </button>
              </div>
            </div>
          </Block>

          <Block title="Cursor (options)" hint="Three in-theme cursor sets, each with a default arrow and a pointer for clickable things. Shown at 2x on dark and light; hover the boxes to try them live. Not applied app-wide yet.">
            <div className="grid gap-4">
              {(['a', 'b', 'c'] as const).map((k) => (
                <div key={k} className="grid gap-2">
                  <div className="text-sm font-black">{CURSOR_LABELS[k]}</div>
                  <div className="grid items-center gap-3 sm:grid-cols-[auto_1fr_1fr_auto]">
                    <div className="flex gap-2">
                      {[CURSOR_SVGS[k].default, CURSOR_SVGS[k].pointer].map((s, i) => (
                        <div key={i} className="flex gap-1">
                          <span
                            aria-hidden
                            className="grid h-20 w-20 place-items-center rounded-[6px] border-2 border-ink bg-sea-950"
                            dangerouslySetInnerHTML={{ __html: s.replace('width="32" height="32"', 'width="64" height="64"') }}
                          />
                          <span
                            aria-hidden
                            className="grid h-20 w-20 place-items-center rounded-[6px] border-2 border-ink bg-paper"
                            dangerouslySetInnerHTML={{ __html: s.replace('width="32" height="32"', 'width="64" height="64"') }}
                          />
                        </div>
                      ))}
                    </div>
                    <div
                      className="grid h-20 place-items-center rounded-[6px] border-2 border-ink bg-sea-950 text-xs font-bold text-paper"
                      style={{ cursor: CURSOR_OPTIONS[k].default }}
                    >
                      Hover (dark)
                    </div>
                    <div
                      className="grid h-20 place-items-center rounded-[6px] border-2 border-ink bg-paper text-xs font-bold text-ink"
                      style={{ cursor: CURSOR_OPTIONS[k].default }}
                    >
                      Hover (light)
                    </div>
                    <button type="button" className="btn" style={{ cursor: CURSOR_OPTIONS[k].pointer }}>
                      Sample button
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Panels" hint="Paper for content, deep sea for the HUD, an inset (paper 2 in the ink line) for notes inside a card.">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="paper p-4 text-sm font-bold">Paper</div>
              <div className="rounded-[6px] border-2 border-ink bg-sea-800 p-4 text-sm font-bold text-paper">HUD</div>
              <div className="rounded-[6px] border-2 border-ink bg-paper-2 p-4 text-sm font-bold">Inset</div>
            </div>
          </Block>
        </section>
      </div>
    </main>
  );
}

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t-2 border-ink/10 pt-5">
      <div>
        <h2 className="label">{title}</h2>
        {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
