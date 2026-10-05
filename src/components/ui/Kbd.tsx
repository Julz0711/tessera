/** A keycap for a button's keyboard shortcut. Hidden on touch screens (see .kbd in globals.css). */
/** A status line with its "(press R)" hint drawn as a keycap; the hint drops on touch screens. */
export function WithKeys({ text }: { text: string }) {
  const m = /\s*\(press (\w)\)/.exec(text);
  if (!m) return <>{text}</>;
  // One span: in a flex pill, loose text runs become separate items and lose the space between.
  return (
    <span>
      {text.slice(0, m.index)}
      <span className="kbd-hint">
        {' · press '}
        <Kbd k={m[1]} className="opacity-80!" />
      </span>
      {text.slice(m.index + m[0].length)}
    </span>
  );
}

export function Kbd({ k, className = '' }: { k: string; className?: string }) {
  return (
    <kbd aria-hidden className={`kbd ${className}`}>
      {k}
    </kbd>
  );
}
