// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩]/g;

export const NAME_MAX = 20;
export const CHAT_MAX = 300;

/** Display names: no control/bidi characters, collapsed whitespace, 1–20 chars. */
export function sanitizeName(input: unknown, fallback = 'Player'): string {
  if (typeof input !== 'string') return fallback;
  const clean = input.replace(CONTROL, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX).trim();
  return clean || fallback;
}

/** Chat text: rendered as plain text by the client; here we strip invisible characters and cap length. */
export function sanitizeChat(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX);
}
