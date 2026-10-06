/**
 * The app's badge: a hex of sea with one low-poly peak in it, lit from the left, with a snowcap.
 * Ink outline with a white rim, so it holds on dark and light backgrounds and stays readable at
 * favicon size (src/app/icon.svg is the same drawing).
 */
export function Logomark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25Z" fill="#ffffff" stroke="#ffffff" strokeWidth="4.4" strokeLinejoin="round" />
      <path d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25Z" fill="#2a7d8e" />
      <path d="M5.5 22.1 16 7.5l10.5 14.6L16 28.8Z" fill="#9ccf6c" />
      <path d="M16 7.5l10.5 14.6L16 28.8Z" fill="#5e8c46" />
      <path d="M16 7.5 12.2 12.8l3.8 1.9 3.8-1.9Z" fill="#ffffff" />
      <path d="M16 7.5v7.2l3.8-1.9Z" fill="#d2dee0" />
      <path d="M16 2.5 27.7 9.25v13.5L16 29.5 4.3 22.75V9.25Z" fill="none" stroke="#131a1d" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
