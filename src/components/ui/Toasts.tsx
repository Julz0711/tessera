'use client';

import { useGame } from '@/client/store';

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top,0px))] z-60 flex flex-col items-center gap-2 px-3" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-pop max-w-full break-words rounded-[5px] border-[1.5px] border-ink px-4 py-2 text-sm font-bold shadow-float ${
            t.tone === 'error' ? 'bg-terracotta text-white' : t.tone === 'good' ? 'bg-moss text-white' : 'bg-paper text-ink'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
