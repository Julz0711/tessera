/**
 * Knight appearance. Every player gets the same basic knight in their color; a player may upload
 * a photo that becomes the knight's face. Without one, the knight keeps its default visor.
 *
 * `face` is the id (sha-256 hex) of an image stored by the server (see src/server/faces.ts) and
 * served from /api/face/<id> — images are never embedded in game/room payloads.
 */
export interface KnightCustomization {
  face: string | null;
}

export const DEFAULT_KNIGHT: KnightCustomization = { face: null };

const FACE_ID = /^[a-f0-9]{64}$/;

export function isFaceId(value: unknown): value is string {
  return typeof value === 'string' && FACE_ID.test(value);
}

/** Coerces untrusted input into a valid customization. */
export function sanitizeKnight(input: unknown): KnightCustomization {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  return { face: isFaceId(src.face) ? src.face : null };
}

export function faceUrl(id: string): string {
  return `/api/face/${id}`;
}

/** Armor palette of the basic knight (the player's color is used for tabard, cape and shield). */
export const KNIGHT_STEEL = { base: '#b9c2cc', trim: '#6f7b87', visor: '#1d1f22' };
