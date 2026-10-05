'use client';

import { SmilePlus } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, useGame } from '@/client/store';
import { REACTIONS, REACTION_COOLDOWN_MS, REACTION_SHOW_MS, isEmote, reactionText } from '@/shared/reactions';

/** Re-renders until `until` (epoch ms) has passed; returns whether it's still in the future. */
function useUntil(until: number): boolean {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until <= Date.now()) return;
    const t = setTimeout(() => setNow(Date.now()), until - Date.now() + 20);
    return () => clearTimeout(t);
  }, [until, now]);
  return until > now;
}

/** The smiley button and its grid of quick reactions, with a short cooldown after each one. */
export function ReactionPicker({ dock = false }: { /** In the dock: a labelled key like its neighbours, opening upwards. */ dock?: boolean }) {
  const [open, setOpen] = useState(false);
  const last = useGame((s) => s.lastReactionAt);
  const cooling = useUntil(last + REACTION_COOLDOWN_MS);

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  const send = (id: (typeof REACTIONS)[number]['id']) => {
    setOpen(false);
    void api.react(id);
  };

  return (
    <div className={dock ? "relative flex" : "relative"}>
      <button
        type="button"
        className={`btn relative overflow-hidden ${dock ? 'h-full w-full flex-col gap-0.5 px-0 py-1.5 text-[10px] sm:min-w-16 sm:px-2.5 sm:text-[11px]' : 'btn-dark h-10 w-10 p-0'}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Quick reaction"
        aria-expanded={open}
        title={cooling ? 'Wait a moment…' : 'Quick reaction'}
      >
        <SmilePlus size={dock ? 20 : 18} />
        {dock && <span className="whitespace-nowrap leading-none">React</span>}
        {/* the cooldown drains across the button */}
        {cooling && <span key={last} className="absolute inset-x-0 bottom-0 h-1 origin-left animate-cooldown bg-amber" style={{ animationDuration: `${REACTION_COOLDOWN_MS}ms` }} />}
      </button>
      {open && (
        <div className={`paper animate-pop absolute z-40 ${dock ? 'right-0 bottom-full mb-3' : 'left-0 top-12'} grid w-60 grid-cols-4 gap-1.5 p-2`} role="menu">
          {REACTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              role="menuitem"
              disabled={cooling}
              onClick={() => send(r.id)}
              className={`btn h-10 p-0 ${r.emote ? 'col-span-2 text-sm' : 'text-xl'}`}
            >
              {r.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * A player's latest reaction as a speech bubble beside their avatar; it fades after a few seconds.
 * Rendered into the page body at the avatar's position, so scrolling panels don't clip it.
 */
/** `cover`: an emoji takes the place of the portrait it sits in, rather than popping up beside it. */
export function ReactionBubble({ playerId, side, cover = false }: { playerId: string; side: 'left' | 'right' | 'below'; cover?: boolean }) {
  const r = useGame((s) => s.reactions[playerId]);
  const visible = useUntil(r ? r.at + REACTION_SHOW_MS : 0);
  const anchor = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const avatar = anchor.current?.parentElement;
    const box = avatar?.getBoundingClientRect();
    // A panel that isn't displayed (the phone layout on a desktop) measures as an empty box.
    if (!visible || !box || box.width === 0) return setAt(null);
    // Beside the card, the bubble keeps clear of the whole player card, not just the avatar inside it.
    const card = avatar?.closest('li')?.getBoundingClientRect() ?? box;
    const mid = box.top + box.height / 2;
    setAt(side === 'left' ? { x: card.left - 10, y: mid } : side === 'right' ? { x: card.right + 10, y: mid } : { x: box.left + box.width / 2, y: box.bottom + 10 });
  }, [visible, side, r?.at]);
  const text = r ? reactionText(r.reaction) : '';
  const emote = r ? isEmote(r.reaction) : false;
  // An emoji takes the portrait's place for a moment, as on colonist; a phrase needs a bubble.
  if (cover && r && visible && !emote) {
    return (
      <span
        key={r.at}
        className="pointer-events-none absolute inset-0 grid animate-pop place-items-center rounded-full border-2 border-ink bg-paper text-2xl leading-none"
        role="status"
        aria-label={`Reacted ${text}`}
      >
        {text}
      </span>
    );
  }
  return (
    <span ref={anchor} className="hidden">
      {r &&
        visible &&
        at &&
        createPortal(
          <span
            key={r.at}
            className={`pointer-events-none fixed z-50 animate-pop whitespace-nowrap rounded-2xl border-2 border-ink bg-paper px-2.5 py-1 font-black text-ink shadow-token ${
              emote ? 'text-sm' : 'text-2xl leading-none'
            } ${side === 'left' ? '-translate-x-full -translate-y-1/2' : side === 'right' ? '-translate-y-1/2' : '-translate-x-1/2'}`}
            style={{ left: at.x, top: at.y }}
            role="status"
          >
            {text}
          </span>,
          document.body,
        )}
    </span>
  );
}
