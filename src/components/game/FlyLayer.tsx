'use client';

import { useLayoutEffect, useRef } from 'react';
import { useFx, type Flight } from '@/client/fx';
import { CARD_COLORS } from '@/client/palette';
import { MiniArt } from './cardArt';

const DURATION = 750;
/** Cards from the bank: they pop up in the middle of the board, hang there a moment, then fly. */
const SPAWN_DURATION = 1300;

function FlyingCard({ flight }: { flight: Flight }) {
  const ref = useRef<HTMLSpanElement>(null);
  const remove = useFx((s) => s.remove);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dx = flight.to.x - flight.from.x;
    const dy = flight.to.y - flight.from.y;
    // An arc: up and over, a little bigger mid-flight, shrinking into its destination.
    const lift = -Math.min(90, 30 + Math.hypot(dx, dy) * 0.15);
    const at = (f: number, lifted: number, scale: number) =>
      `translate(calc(-50% + ${dx * f}px), calc(-50% + ${dy * f + lifted}px)) scale(${scale})`;
    const anim = flight.still
      ? // Reduced motion: fade in and out where it lands, no travel.
        el.animate(
          [
            { transform: at(0, 0, 1), opacity: 0 },
            { offset: 0.25, transform: at(0, 0, 1), opacity: 1 },
            { offset: 0.75, transform: at(0, 0, 1), opacity: 1 },
            { transform: at(0, 0, 1), opacity: 0 },
          ],
          { duration: 900, delay: flight.delay, easing: 'ease-in-out', fill: 'both' },
        )
      : flight.spawn
      ? el.animate(
          [
            { transform: at(0, 0, 0.2), opacity: 0 },
            { offset: 0.16, transform: at(0, 0, 1.3), opacity: 1 },
            { offset: 0.26, transform: at(0, 0, 1.1), opacity: 1 },
            { offset: 0.42, transform: at(0, -6, 1.12), opacity: 1 },
            { offset: 0.72, transform: at(0.55, lift, 1.05), opacity: 1 },
            { transform: at(1, 0, 0.65), opacity: 0.15 },
          ],
          { duration: SPAWN_DURATION, delay: flight.delay, easing: 'cubic-bezier(0.4, 0, 0.3, 1)', fill: 'both' },
        )
      : el.animate(
          [
            { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0 },
            { offset: 0.15, transform: at(0.1, lift * 0.4, 1), opacity: 1 },
            { offset: 0.55, transform: at(0.55, lift, 1.12), opacity: 1 },
            { transform: at(1, 0, 0.6), opacity: 0.1 },
          ],
          { duration: DURATION, delay: flight.delay, easing: 'cubic-bezier(0.45, 0, 0.3, 1)', fill: 'both' },
        );
    anim.onfinish = () => remove(flight.id);
    return () => anim.cancel();
  }, [flight, remove]);
  const c = flight.card ? CARD_COLORS[flight.card] : null;
  return (
    <span
      ref={ref}
      className={`pointer-events-none fixed z-[60] grid place-items-center rounded-md border-[1.5px] border-ink ${
        flight.big && flight.spawn ? 'h-16 w-12' : flight.big ? 'h-12 w-9' : flight.spawn ? 'h-11 w-8' : 'h-9 w-7'
      }`}
      style={{ left: flight.from.x, top: flight.from.y, background: c ? c.bg : '#1d5a6b', opacity: 0 }}
      aria-hidden
    >
      {flight.card ? (
        <MiniArt card={flight.card} size={flight.big ? (flight.spawn ? 38 : 28) : flight.spawn ? 26 : 20} />
      ) : (
        <span className="text-xs font-black text-paper">?</span>
      )}
    </span>
  );
}

/** Renders the cards currently in flight (see `fly` in client/fx). */
export function FlyLayer() {
  const flights = useFx((s) => s.flights);
  return (
    <>
      {flights.map((f) => (
        <FlyingCard key={f.id} flight={f} />
      ))}
    </>
  );
}
