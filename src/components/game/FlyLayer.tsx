'use client';

import { useLayoutEffect, useRef } from 'react';
import { useFx, type Flight } from '@/client/fx';
import { CARD_COLORS } from '@/client/palette';
import { MiniArt } from './cardArt';

const DURATION = 750;

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
    const anim = el.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0 },
        { offset: 0.15, transform: `translate(calc(-50% + ${dx * 0.1}px), calc(-50% + ${dy * 0.1 + lift * 0.4}px)) scale(1)`, opacity: 1 },
        { offset: 0.55, transform: `translate(calc(-50% + ${dx * 0.55}px), calc(-50% + ${dy * 0.55 + lift}px)) scale(1.12)`, opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`, opacity: 0.1 },
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
      className={`pointer-events-none fixed z-[60] grid place-items-center rounded-[5px] border-2 border-ink shadow-token ${flight.big ? 'h-12 w-9' : 'h-8 w-6'}`}
      style={{ left: flight.from.x, top: flight.from.y, background: c ? c.bg : '#1d5a6b', opacity: 0 }}
      aria-hidden
    >
      {flight.card ? <MiniArt card={flight.card} size={flight.big ? 28 : 18} /> : <span className="text-xs font-black text-paper">?</span>}
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
