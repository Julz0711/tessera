/** A keycap for a button's keyboard shortcut. Hidden on touch screens (see .kbd in globals.css). */
export function Kbd({ k, className = '' }: { k: string; className?: string }) {
  return (
    <kbd aria-hidden className={`kbd ${className}`}>
      {k}
    </kbd>
  );
}
