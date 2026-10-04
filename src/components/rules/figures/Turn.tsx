import type { ReactNode } from 'react';
import { ArrowLeftRight, Hourglass } from 'lucide-react';
import { FlatDie } from '@/components/game/Dice';
import { RoadGlyph, SettlementGlyph } from '@/components/ui/Glyphs';
import { Arrow, MiniCard } from './art-basic';

function Step({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex h-12 items-center justify-center gap-1">{children}</div>
      <span className="label text-ink-soft">{label}</span>
    </div>
  );
}

/** Roll, collect, trade, build, end. */
export function TurnFigure() {
  const steps: { label: string; icon: ReactNode }[] = [
    {
      label: 'Roll',
      icon: (
        <>
          <FlatDie value={4} size={30} />
          <FlatDie value={3} size={30} />
        </>
      ),
    },
    {
      label: 'Collect',
      icon: (
        <>
          <MiniCard card="lumber" w={22} />
          <MiniCard card="grain" w={22} />
        </>
      ),
    },
    { label: 'Trade', icon: <ArrowLeftRight size={34} strokeWidth={2.5} /> },
    {
      label: 'Build',
      icon: (
        <>
          <SettlementGlyph size={28} />
          <RoadGlyph size={28} />
        </>
      ),
    },
    { label: 'End', icon: <Hourglass size={32} strokeWidth={2.2} /> },
  ];
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-2 gap-y-4 text-ink">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-start gap-2">
          {/* phones wrap the steps onto two rows, where an arrow would start the second one */}
          {i > 0 && <Arrow size={16} className="mt-4 max-sm:hidden" />}
          <Step label={s.label}>{s.icon}</Step>
        </div>
      ))}
    </div>
  );
}
