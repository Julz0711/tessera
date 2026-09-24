'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  dismissable = true,
}: {
  open: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  dismissable?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismissable, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-sea-950/60 p-3 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissable) onClose?.();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={`paper animate-pop max-h-[92dvh] w-full overflow-y-auto p-5 outline-none scroll-thin ${wide ? 'max-w-2xl' : 'max-w-md'}`}
      >
        {(title || (dismissable && onClose)) && (
          <div className="mb-3 flex items-start justify-between gap-3">
            {title && <h2 className="display text-2xl font-black leading-tight">{title}</h2>}
            {dismissable && onClose && (
              <button type="button" onClick={onClose} className="btn btn-ghost -mr-2 -mt-1 h-9 w-9 p-0" aria-label="Close">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
