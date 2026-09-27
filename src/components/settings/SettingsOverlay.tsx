'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useSettingsUI } from '@/client/settingsUI';
import { SettingsPanel } from './SettingsPanel';

/** The global settings overlay: mounted once in the root layout, opened from anywhere via `useSettingsUI`. */
export function SettingsOverlay() {
  const open = useSettingsUI((s) => s.open);
  const hide = useSettingsUI((s) => s.hide);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, hide]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-sea-950/60 p-3 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) hide();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="paper animate-pop grid w-full max-w-[min(1100px,94vw)] grid-rows-[auto_1fr] gap-4 p-5 outline-none"
        style={{ height: '90dvh' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="display text-2xl font-black">Settings</h2>
          <button type="button" onClick={hide} className="btn btn-ghost -mr-2 -mt-1 h-9 w-9 p-0" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0">
          <SettingsPanel />
        </div>
      </div>
    </div>
  );
}
