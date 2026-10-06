'use client';

/**
 * A row of mutually exclusive options in one track (S · M · L, On · Off): the chosen one is
 * printed as a pale blue key in the ink line, the rest sit flat in the track.
 */
export function Segmented<T extends string | boolean>({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  /** Read out for the group, e.g. the setting's name. */
  label?: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`seg ${className}`}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className="seg-opt"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
