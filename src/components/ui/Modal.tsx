'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
  expansive = false,
  dismissable = true,
  dim = true,
  top = false,
  clearHand = !dismissable,
}: {
  open: boolean;
  onClose?: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  expansive?: boolean;
  dismissable?: boolean;
  /** Darken and blur the screen behind the dialog. */
  dim?: boolean;
  /**
   * Pin the dialog near the top instead of centring it, so content that changes height (tabs,
   * charts) grows downwards and the controls at the top stay put. Phones keep their bottom sheet.
   */
  top?: boolean;
  /**
   * Phones: open at the top instead of as a bottom sheet, so the hand stays in view. On by default
   * for the game's choices that can't be dismissed (Aqueduct, gold, a discard…), which are about
   * the cards you hold.
   */
  clearHand?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Dialogs go straight into <body>: one opened from a scaled part of the game screen (the HUD size
  // setting is a CSS zoom) would inherit the zoom, its full-screen box would outgrow the screen, and
  // the sheet would sit off-centre and run off the edges.
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Native modal dialogs make the background inert and handle stacked dialogs.
    dialog.showModal();
    contentRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, host]);
  if (!open || !host) return null;
  return createPortal(
    <dialog
      ref={ref}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : 'Game dialog'}
      className={`app-dialog ${clearHand ? 'dialog-clear-hand' : ''} fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-3 open:grid open:place-items-center ${dim ? 'backdrop:bg-sea-950/60 backdrop:backdrop-blur-[2px]' : 'backdrop:bg-transparent'}`}
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dismissable) onClose?.();
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Tab') return;
        e.stopPropagation();
        const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]',
        )).filter((el) => el.tabIndex >= 0 && !el.matches(':disabled') && el.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        const active = document.activeElement;
        if (!first || !controls.includes(active as HTMLElement)) {
          e.preventDefault();
          (e.shiftKey ? last : first)?.focus();
          if (!first) contentRef.current?.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && dismissable) onClose?.();
      }}
    >
      <div
        ref={contentRef}
        tabIndex={-1}
        className={`dialog-sheet paper animate-pop w-full overflow-y-auto p-5 outline-none scroll-thin max-h-[92dvh] ${top ? 'dialog-top' : ''} ${expansive ? 'max-w-6xl' : wide ? 'max-w-2xl' : 'max-w-md'}`}
      >
        {(title || (dismissable && onClose)) && (
          <div className="dialog-heading mb-3 flex items-start justify-between gap-3">
            {title && <h2 id={titleId} className="display text-2xl font-black leading-tight">{title}</h2>}
            {dismissable && onClose && (
              <button type="button" onClick={onClose} className="btn btn-ghost -mr-2 -mt-1 h-11 w-11 shrink-0 p-0" aria-label="Close">
                <X size={18} />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </dialog>,
    host,
  );
}
