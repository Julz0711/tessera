'use client';

import { Dices } from 'lucide-react';
import type { PlayerColor } from '@/engine/types';
import {
  ARMORS,
  ARMOR_COLORS,
  CREST_COLORS,
  EMBLEMS,
  HELMETS,
  LABELS,
  WEAPONS,
  randomKnight,
  type KnightCustomization,
} from '@/shared/knight';
import { EmblemShape, KnightBadge } from './KnightBadge';

function Chip({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border-2 px-2.5 py-1 text-xs font-bold transition ${
        active ? 'border-ink bg-ink text-paper' : 'border-ink/25 bg-white/50 text-ink hover:border-ink/60'
      }`}
    >
      {children}
    </button>
  );
}

export function KnightCustomizer({
  value,
  color,
  onChange,
  compact = false,
}: {
  value: KnightCustomization;
  color: PlayerColor;
  onChange: (k: KnightCustomization) => void;
  compact?: boolean;
}) {
  const set = (patch: Partial<KnightCustomization>) => onChange({ ...value, ...patch });
  return (
    <div className={`flex gap-4 ${compact ? 'flex-col sm:flex-row' : 'flex-col sm:flex-row'}`}>
      <div className="flex flex-col items-center gap-2">
        <div className="animate-bob">
          <KnightBadge knight={value} color={color} size={compact ? 104 : 132} />
        </div>
        <button type="button" className="btn btn-ghost text-xs" onClick={() => onChange(randomKnight())}>
          <Dices size={14} /> Surprise me
        </button>
      </div>
      <div className="grid flex-1 gap-2.5">
        <Row label="Helmet">
          {HELMETS.map((h) => (
            <Chip key={h} active={value.helmet === h} onClick={() => set({ helmet: h })}>
              {LABELS.helmet[h]}
            </Chip>
          ))}
        </Row>
        <Row label="Armor">
          {ARMORS.map((a) => (
            <button
              key={a}
              type="button"
              title={LABELS.armor[a]}
              aria-pressed={value.armor === a}
              onClick={() => set({ armor: a })}
              className={`h-7 w-7 rounded-full border-2 transition ${value.armor === a ? 'scale-110 border-ink ring-2 ring-amber' : 'border-ink/40'}`}
              style={{ background: `linear-gradient(135deg, ${ARMOR_COLORS[a].base}, ${ARMOR_COLORS[a].trim})` }}
            />
          ))}
        </Row>
        <Row label="Emblem">
          {EMBLEMS.map((e) => (
            <button
              key={e}
              type="button"
              title={LABELS.emblem[e]}
              aria-pressed={value.emblem === e}
              onClick={() => set({ emblem: e })}
              className={`grid h-8 w-8 place-items-center rounded-lg border-2 transition ${
                value.emblem === e ? 'border-ink bg-ink' : 'border-ink/25 bg-white/50 hover:border-ink/60'
              }`}
            >
              <svg width="20" height="20" viewBox="-10 -10 20 20">
                <EmblemShape emblem={e} fill={value.emblem === e ? '#f6eddb' : '#1f1a14'} />
              </svg>
            </button>
          ))}
        </Row>
        <Row label="Weapon">
          {WEAPONS.map((w) => (
            <Chip key={w} active={value.weapon === w} onClick={() => set({ weapon: w })}>
              {LABELS.weapon[w]}
            </Chip>
          ))}
        </Row>
        <Row label="Crest">
          {CREST_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Crest ${c}`}
              aria-pressed={value.crest === c}
              onClick={() => set({ crest: c })}
              className={`h-6 w-6 rounded-full border-2 transition ${value.crest === c ? 'scale-110 border-ink ring-2 ring-amber' : 'border-ink/40'}`}
              style={{ background: c }}
            />
          ))}
          <label className="ml-2 flex cursor-pointer items-center gap-1.5 text-xs font-bold text-ink-soft">
            <input type="checkbox" checked={value.cape} onChange={(e) => set({ cape: e.target.checked })} className="accent-ink" />
            Cape
          </label>
        </Row>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="label w-16 shrink-0">{label}</span>
      {children}
    </div>
  );
}
