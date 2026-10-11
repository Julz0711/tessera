'use client';

import { MousePointer2, SmilePlus } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMouseScreen } from '@/client/cursors';
import { usePrefs } from '@/client/prefs';
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

/** Shares your mouse pointer with the other players (off by default; wide screens with a mouse only). Seeing theirs is a setting. */
export function CursorToggle() {
  const on = usePrefs((s) => s.shareCursor);
  const mouse = useMouseScreen();
  if (!mouse) return null;
  return (
    <button
      type="button"
      className={`btn h-10 w-10 p-0 ${on ? 'btn-primary' : 'btn-dark'}`}
      onClick={() => usePrefs.getState().set({ shareCursor: !on })}
      aria-label="Share my mouse pointer"
      aria-pressed={on}
      title={on ? 'Sharing your pointer: the others see it on the board' : 'Share your mouse pointer with the other players'}
    >
      <MousePointer2 size={18} />
    </button>
  );
}

/** The smiley button and its grid of quick reactions, with a short cooldown after each one. */
export function ReactionPicker({ dock = false }: { /** In the dock: a labelled key like its neighbours, opening upwards. */ dock?: boolean }) {
  const [open, setOpen] = useState(false);
  const last = useGame((s) => s.lastReactionAt);
  const cooling = useUntil(last + REACTION_COOLDOWN_MS);

  // Y opens and closes the picker.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.key.toLowerCase() !== 'y') return;
      const el = e.target as Element | null;
      if (el && typeof el.closest === 'function' && el.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
        aria-keyshortcuts="Y"
        title={cooling ? 'Wait a moment…' : 'Quick reaction (Y)'}
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
              className={`btn h-10 p-0 ${r.emote ? `${r.text.length > 2 ? 'col-span-2' : ''} text-sm` : 'text-xl'}`}
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
export function ReactionBubble({ playerId, side }: { playerId: string; side: 'left' | 'right' | 'below' }) {
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

/**
 * A player's latest reaction taking over their whole card: a blank canvas (the card's own background and
 * colour stripe) with the reaction big in the middle. It sits absolutely over the card, so the card never
 * changes size; the card's contents stay mounted underneath and are simply covered.
 */
export function ReactionCover({ playerId, color }: { playerId: string; color: string }) {
  const r = useGame((s) => s.reactions[playerId]);
  const visible = useUntil(r ? r.at + REACTION_SHOW_MS : 0);
  // Stays mounted a moment longer so it can fade and shrink away.
  const mounted = useUntil(r ? r.at + REACTION_SHOW_MS + 220 : 0);
  if (!r || !mounted) return null;
  const text = reactionText(r.reaction);
  const emote = isEmote(r.reaction);
  return (
    <span
      key={r.at}
      data-reaction
      className={`pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-hidden rounded-[inherit] bg-paper transition duration-200 [container-type:inline-size] ${
        visible ? 'animate-pop' : 'scale-95'
      }`}
      // Opacity and filter inline: a waiting card fades and greys its children, and the cover must stay solid.
      style={{ boxShadow: `inset 5px 0 0 ${color}`, opacity: visible ? 1 : 0, filter: 'none' }}
      role="status"
      aria-label={`Reacted ${text}`}
    >
      <span className={`whitespace-nowrap pl-2 font-black leading-none text-ink ${emote ? 'font-display text-[min(2.25rem,17cqw)] uppercase' : 'text-5xl'}`}>{text}</span>
    </span>
  );
}
