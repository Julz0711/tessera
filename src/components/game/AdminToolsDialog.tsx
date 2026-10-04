'use client';

import { Dices, Minus, Plus, ShieldCheck, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { CARDS, PROGRESS_DECKS, RESOURCES, TRACKS, type Card, type EventFace } from '@/engine';
import type { PlayerView } from '@/engine/view';
import { CARD_COLORS } from '@/client/palette';
import { PROGRESS_NAMES } from '@/client/describe';
import { TRACK_STYLE } from '@/client/progressText';
import { api, toast } from '@/client/store';
import { useGameDialog } from '@/client/ui';
import { PLAYER_COLORS } from '@/shared/colors';
import type { RoomDTO } from '@/shared/protocol';
import { Modal } from '@/components/ui/Modal';
import { CardChip } from './cards';

const EVENT_FACES: { id: EventFace | null; label: string }[] = [
  { id: null, label: 'Random' },
  { id: 'ship', label: 'Ship' },
  { id: 'trade', label: 'Trade' },
  { id: 'politics', label: 'Politics' },
  { id: 'science', label: 'Science' },
];

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-2 border-b border-ink/10 pb-4 last:border-0 last:pb-0">
      <h3 className="label">{title}</h3>
      {hint && <p className="-mt-1 text-xs text-ink-soft">{hint}</p>}
      {children}
    </section>
  );
}

/**
 * Admin tools for a running game (server admins only), for testing: undo the last move, give or take
 * cards, and set the next roll. The server checks every use, announces it in the chat, and the game
 * is no longer rated.
 */
export function AdminToolsDialog({ view, room }: { view: PlayerView; room: RoomDTO }) {
  const open = useGameDialog((s) => s.open === 'admin');
  const hide = useGameDialog((s) => s.hide);
  const [busy, setBusy] = useState(false);
  const [seat, setSeat] = useState(view.viewer ?? 0);
  const [cards, setCards] = useState<Partial<Record<Card, number>>>({});
  const [dice, setDice] = useState({ red: 3, yellow: 4 });
  const [event, setEvent] = useState<EventFace | null>(null);
  if (!open) return null;

  const ck = view.mode === 'ck';
  const kinds = ck ? CARDS : RESOURCES;
  const running = view.phase !== 'ended';
  const run = async (cmd: Parameters<typeof api.admin>[0]) => {
    setBusy(true);
    const r = await api.admin(cmd);
    setBusy(false);
    if (r.ok) toast(r.message, 'good');
    return r.ok;
  };
  const bump = (c: Card, by: number) => setCards((h) => ({ ...h, [c]: Math.max(-20, Math.min(20, (h[c] ?? 0) + by)) }));
  const changes = Object.entries(cards).filter(([, n]) => n) as [Card, number][];

  return (
    <Modal open onClose={hide} title="Admin tools" wide>
      <div className="grid gap-4">
        <p className="flex items-start gap-2 rounded-xl bg-amber/20 p-3 text-sm">
          <ShieldCheck size={18} className="mt-0.5 shrink-0" />
          For testing. Every change is announced in the chat, and this game will no longer be rated.
        </p>

        <Section title="Undo" hint="Puts the game back to before the last move (any player's, bots' too). Press again to go further back; bots wait a few seconds after each change.">
          <div>
            <button type="button" className="btn px-4 py-2" disabled={busy || !running} onClick={() => void run({ type: 'undo' })}>
              <Undo2 size={16} /> Undo last move
            </button>
          </div>
        </Section>

        <Section title="Cards" hint="Give (+) or take (−) cards. They come from and go back to the bank, so the bank's stock limits a give.">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Player">
            {view.players.map((p, i) => {
              const c = PLAYER_COLORS[p.color];
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={seat === i}
                  onClick={() => setSeat(i)}
                  className={`btn px-3 py-1.5 text-sm ${seat === i ? '' : 'opacity-60'}`}
                  style={{ ['--btn-bg' as string]: c.hex, ['--btn-fg' as string]: c.ink }}
                >
                  {room.seats[i]?.name ?? p.name}
                  {i === view.viewer ? ' (you)' : ''}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2 sm:grid-cols-3">
            {kinds.map((c) => {
              const n = cards[c] ?? 0;
              return (
                <div key={c} className="flex items-center justify-between gap-1 rounded-lg border-2 border-ink/15 px-1.5 py-1">
                  <span className="flex min-w-0 items-center gap-1 text-xs font-bold">
                    <CardChip card={c} />
                    <span className="truncate">{CARD_COLORS[c].label}</span>
                  </span>
                  <span className="flex items-center gap-0.5">
                    <button type="button" className="btn h-6 w-6 p-0" onClick={() => bump(c, -1)} aria-label={`One ${CARD_COLORS[c].label} less`}>
                      <Minus size={12} />
                    </button>
                    <span className={`w-7 text-center text-sm font-black tabular ${n > 0 ? 'text-moss' : n < 0 ? 'text-danger' : 'text-ink-faint'}`}>
                      {n > 0 ? `+${n}` : n}
                    </span>
                    <button type="button" className="btn h-6 w-6 p-0" onClick={() => bump(c, 1)} aria-label={`One ${CARD_COLORS[c].label} more`}>
                      <Plus size={12} />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary px-4 py-2"
              disabled={busy || !running || !changes.length}
              onClick={async () => {
                if (await run({ type: 'cards', seat, cards: Object.fromEntries(changes) })) setCards({});
              }}
            >
              Apply to {view.players[seat]?.name}
            </button>
            <button type="button" className="btn px-3 py-2" disabled={!changes.length} onClick={() => setCards({})}>
              Clear
            </button>
          </div>
        </Section>

        {ck && (
          <Section title="Progress cards" hint={`Hands ${view.players[seat]?.name ?? 'the player'} (picked above) that card from its deck. A victory point card scores at once; a 5th card asks for a discard.`}>
            <div className="grid gap-2 sm:grid-cols-3">
              {TRACKS.map((t) => (
                <div key={t} className="grid content-start gap-1 rounded-lg border-2 border-ink/15 p-1.5" style={{ background: `${TRACK_STYLE[t].color}22` }}>
                  <span className="label">{TRACK_STYLE[t].label}</span>
                  {PROGRESS_DECKS[t].map(([type]) => (
                    <button
                      key={type}
                      type="button"
                      className="btn justify-start px-2 py-1 text-xs"
                      disabled={busy || !running}
                      onClick={() => void run({ type: 'progress', seat, card: type })}
                    >
                      <Plus size={12} /> {PROGRESS_NAMES[type]}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Next roll" hint="Whoever rolls next gets these dice (the chat only says that they were set).">
          <div className="grid gap-2">
            {(['red', 'yellow'] as const).map((die) => (
              <div key={die} className="flex flex-wrap items-center gap-1.5">
                <span className="label w-14">{die}</span>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={dice[die] === n}
                    className={`btn h-8 w-8 p-0 text-sm ${dice[die] === n ? 'btn-primary' : ''}`}
                    onClick={() => setDice((d) => ({ ...d, [die]: n }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            ))}
            {ck && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="label w-14">event</span>
                {EVENT_FACES.map((f) => (
                  <button
                    key={f.label}
                    type="button"
                    aria-pressed={event === f.id}
                    className={`btn px-2.5 py-1 text-xs ${event === f.id ? 'btn-primary' : ''}`}
                    onClick={() => setEvent(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
            <div>
              <button
                type="button"
                className="btn px-4 py-2"
                disabled={busy || !running}
                onClick={() => void run({ type: 'nextRoll', red: dice.red, yellow: dice.yellow, event })}
              >
                <Dices size={16} /> Set the next roll: {dice.red + dice.yellow}
              </button>
            </div>
          </div>
        </Section>
      </div>
    </Modal>
  );
}
