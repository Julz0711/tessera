import type { ReactNode } from 'react';
import type { Card } from '@/engine';
import { Arrow, HarborShip, MiniCard } from './art-basic';

function Deal({ give, n, source }: { give: Card; n: number; source: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-16 items-end">{source}</div>
      <div className="flex items-center gap-2">
        <MiniCard card={give} w={26} n={n} />
        <Arrow size={16} />
        <MiniCard card="ore" w={26} n={1} />
      </div>
    </div>
  );
}

/** Bank 4:1, any-resource harbor 3:1, resource harbor 2:1. */
export function HarborsFigure() {
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-8 gap-y-4">
      <Deal give="brick" n={4} source={<span className="display text-4xl font-black leading-none text-ink">4:1</span>} />
      <Deal give="wool" n={3} source={<HarborShip rate="3:1" size={64} />} />
      <Deal give="grain" n={2} source={<HarborShip rate="2:1" kind="grain" size={64} />} />
    </div>
  );
}
