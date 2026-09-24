/** A small low-poly hex island mark (brand-neutral, works for any product name). */
export function Logomark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M16 1.5 29 9v14l-13 7.5L3 23V9Z" fill="#2a7d8e" stroke="#061419" strokeWidth="1.5" />
      <path d="M16 6 25 11.2v9.6L16 26l-9-5.2v-9.6Z" fill="#e7c35c" />
      <path d="M16 6 25 11.2 16 16.4 7 11.2Z" fill="#a3d170" />
      <path d="M16 16.4V26l9-5.2v-9.6Z" fill="#c8764b" />
      <path d="m12.5 13.5 3.5-5 3.5 5Z" fill="#3d7a45" />
    </svg>
  );
}
