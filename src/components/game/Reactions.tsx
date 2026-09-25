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
export function ReactionPicker() {
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
    <div className="relative">
      <button
        type="button"
        className="btn btn-dark relative h-10 w-10 overflow-hidden p-0"
        onClick={() => setOpen((o) => !o)}
        aria-label="Quick reaction"
        aria-expanded={open}
        title={cooling ? 'Wait a moment…' : 'Quick reaction'}
      >
        <SmilePlus size={18} />
        {/* the cooldown drains across the button */}
        {cooling && <span key={last} className="absolute inset-x-0 bottom-0 h-1 origin-left animate-cooldown bg-amber" style={{ animationDuration: `${REACTION_COOLDOWN_MS}ms` }} />}
      </button>
      {open && (
        <div className="paper animate-pop absolute right-0 top-12 z-40 grid w-60 grid-cols-4 gap-1.5 p-2" role="menu">
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
export function ReactionBubble({ playerId, side }: { playerId: string; side: 'left' | 'below' }) {
  const r = useGame((s) => s.reactions[playerId]);
  const visible = useUntil(r ? r.at + REACTION_SHOW_MS : 0);
  const anchor = useRef<HTMLSpanElement>(null);
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const box = anchor.current?.parentElement?.getBoundingClientRect();
    // A panel that isn't displayed (the phone layout on a desktop) measures as an empty box.
    if (!visible || !box || box.width === 0) return setAt(null);
    setAt(side === 'left' ? { x: box.left - 10, y: box.top + box.height / 2 } : { x: box.left + box.width / 2, y: box.bottom + 8 });
  }, [visible, side, r?.at]);
  const text = r ? reactionText(r.reaction) : '';
  const emote = r ? isEmote(r.reaction) : false;
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
            } ${side === 'left' ? '-translate-x-full -translate-y-1/2' : '-translate-x-1/2'}`}
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
