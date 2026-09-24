'use client';

import { Anchor, Scroll, ShieldHalf, Ship } from 'lucide-react';
import type { EventFace } from '@/engine/types';

const FACE_TRANSFORM: Record<number, string> = {
  1: 'rotateX(0deg) rotateY(0deg)',
  2: 'rotateX(90deg)',
  3: 'rotateY(-90deg)',
  4: 'rotateY(90deg)',
  5: 'rotateX(-90deg)',
  6: 'rotateY(180deg)',
};

const PIP_LAYOUT: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const SIDES: { value: number; transform: string }[] = [
  { value: 1, transform: 'translateZ(var(--half))' },
  { value: 6, transform: 'rotateY(180deg) translateZ(var(--half))' },
  { value: 3, transform: 'rotateY(90deg) translateZ(var(--half))' },
  { value: 4, transform: 'rotateY(-90deg) translateZ(var(--half))' },
  { value: 5, transform: 'rotateX(90deg) translateZ(var(--half))' },
  { value: 2, transform: 'rotateX(-90deg) translateZ(var(--half))' },
];

function Face({ value, pip, bg, transform }: { value: number; pip: string; bg: string; transform: string }) {
  return (
    <div
      className="absolute inset-0 grid grid-cols-3 grid-rows-3 rounded-[22%] border-2 border-ink p-[14%]"
      style={{ transform, background: bg, backfaceVisibility: 'hidden' }}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="grid place-items-center">
          {PIP_LAYOUT[value].includes(i) && <span className="block h-[70%] w-[70%] rounded-full" style={{ background: pip }} />}
        </span>
      ))}
    </div>
  );
}

/** A CSS 3D die that tumbles to `value` whenever `rollKey` changes. */
export function Die({ value, rollKey, size = 44, bg = '#f6eddb', pip = '#1f1a14' }: { value: number; rollKey: number; size?: number; bg?: string; pip?: string }) {
  // Alternate the extra spin so every new roll animates, even to the same face.
  const spin = rollKey % 2 === 0 ? 'rotateX(720deg) rotateY(1080deg)' : 'rotateX(-720deg) rotateY(-1080deg)';
  return (
    <div style={{ width: size, height: size, perspective: size * 8 }} aria-label={`Die showing ${value}`} role="img">
      <div
        className="relative h-full w-full"
        style={{
          ['--half' as string]: `${size / 2}px`,
          transformStyle: 'preserve-3d',
          transform: `${spin} ${FACE_TRANSFORM[value] ?? ''}`,
          transition: 'transform 0.95s cubic-bezier(0.22, 1.2, 0.36, 1)',
        }}
      >
        {SIDES.map((s) => (
          <Face key={s.value} value={s.value} pip={pip} bg={bg} transform={s.transform} />
        ))}
      </div>
    </div>
  );
}

const EVENT_STYLE: Record<EventFace, { bg: string; icon: React.ReactNode; label: string }> = {
  ship: { bg: '#2d2c33', icon: <Ship size={20} />, label: 'Barbarian ship' },
  trade: { bg: '#e9c35a', icon: <Anchor size={20} />, label: 'Trade gate' },
  politics: { bg: '#3a74d8', icon: <ShieldHalf size={20} />, label: 'Politics gate' },
  science: { bg: '#3f9b4f', icon: <Scroll size={20} />, label: 'Science gate' },
};

export function EventDie({ face, size = 44 }: { face: EventFace; size?: number }) {
  const s = EVENT_STYLE[face];
  return (
    <div
      className="animate-pop grid place-items-center rounded-[22%] border-2 border-ink text-white"
      style={{ width: size, height: size, background: s.bg, boxShadow: '0 3px 0 0 #1f1a14' }}
      title={s.label}
    >
      {s.icon}
    </div>
  );
}
