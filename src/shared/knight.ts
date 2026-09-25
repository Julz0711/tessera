/**
 * Knight appearance. Every player gets the same basic knight in their color; a player may upload
 * a photo that becomes the knight's face. Without one, the knight keeps its default visor.
 *
 * `face` is the id (sha-256 hex) of an image stored by the server (see src/server/faces.ts) and
 * served from /api/face/<id> — images are never embedded in game/room payloads.
 *
 * `faceX`/`faceY`/`faceZoom` frame that photo within the round face opening: `faceX`/`faceY` are
 * an offset in the frame's own units (roughly -0.5..0.5, screen/frame-relative and independent of
 * zoom) and `faceZoom` is a magnification (1..3). All three are optional and stored alongside
 * `face` in the same JSON field — no separate column — so they default to centred/1 wherever a
 * knight was saved before this existed, and look exactly as before.
 */
export interface KnightLook {
  face: string | null;
  faceX?: number;
  faceY?: number;
  faceZoom?: number;
}

/**
 * C&K knights come in three levels (basic, strong, mighty) and each can have its own look. The
 * top-level fields are knight 1 (basic); `strong` and `mighty` are knights 2 and 3. A missing
 * `strong`/`mighty` wears knight 1's look, so knights saved before this existed look the same.
 */
export interface KnightCustomization extends KnightLook {
  strong?: KnightLook;
  mighty?: KnightLook;
}

export type KnightSlot = 1 | 2 | 3;
export const KNIGHT_SLOTS: KnightSlot[] = [1, 2, 3];
export const KNIGHT_SLOT_NAMES: Record<KnightSlot, string> = { 1: 'Basic', 2: 'Strong', 3: 'Mighty' };
const SLOT_KEY = { 2: 'strong', 3: 'mighty' } as const;

export const DEFAULT_KNIGHT: KnightCustomization = { face: null };

const FACE_ID = /^[a-f0-9]{64}$/;

/** Valid ranges for the framing fields (also used by the customizer UI). */
export const FACE_OFFSET_RANGE = 0.5;
export const FACE_ZOOM_MIN = 1;
export const FACE_ZOOM_MAX = 3;

export function isFaceId(value: unknown): value is string {
  return typeof value === 'string' && FACE_ID.test(value);
}

/** A finite number clamped into [min,max], or undefined for anything else (NaN, strings, missing…). */
function clampedNumber(value: unknown, min: number, max: number): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : undefined;
}

function sanitizeLook(src: Record<string, unknown>): KnightLook {
  const out: KnightLook = { face: isFaceId(src.face) ? src.face : null };
  const faceX = clampedNumber(src.faceX, -FACE_OFFSET_RANGE, FACE_OFFSET_RANGE);
  const faceY = clampedNumber(src.faceY, -FACE_OFFSET_RANGE, FACE_OFFSET_RANGE);
  const faceZoom = clampedNumber(src.faceZoom, FACE_ZOOM_MIN, FACE_ZOOM_MAX);
  if (faceX !== undefined) out.faceX = faceX;
  if (faceY !== undefined) out.faceY = faceY;
  if (faceZoom !== undefined) out.faceZoom = faceZoom;
  return out;
}

const asRecord = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, unknown>) : null);

/** Coerces untrusted input (from clients or the DB) into a valid customization. */
export function sanitizeKnight(input: unknown): KnightCustomization {
  const src = asRecord(input) ?? {};
  const out: KnightCustomization = sanitizeLook(src);
  const strong = asRecord(src.strong);
  const mighty = asRecord(src.mighty);
  if (strong) out.strong = sanitizeLook(strong);
  if (mighty) out.mighty = sanitizeLook(mighty);
  return out;
}

/** Whether knight 2/3 has a look of its own (rather than wearing knight 1's). */
export function hasOwnLook(knight: KnightCustomization, slot: KnightSlot): boolean {
  return slot === 1 || knight[SLOT_KEY[slot]] !== undefined;
}

/** The look of one knight level (knights 2 and 3 fall back to knight 1). */
export function knightLook(knight: KnightCustomization, slot: KnightSlot): KnightLook {
  const own = slot === 1 ? undefined : knight[SLOT_KEY[slot]];
  const src = own ?? knight;
  const out: KnightLook = { face: src.face };
  if (src.faceX !== undefined) out.faceX = src.faceX;
  if (src.faceY !== undefined) out.faceY = src.faceY;
  if (src.faceZoom !== undefined) out.faceZoom = src.faceZoom;
  return out;
}

/** Sets one knight level's look; `null` for knight 2/3 goes back to wearing knight 1's. */
export function withKnightLook(knight: KnightCustomization, slot: KnightSlot, look: KnightLook | null): KnightCustomization {
  if (slot === 1) {
    const { strong, mighty } = knight;
    const next: KnightCustomization = { ...(look ?? { face: null }) };
    if (strong) next.strong = strong;
    if (mighty) next.mighty = mighty;
    return next;
  }
  const next = { ...knight };
  if (look) next[SLOT_KEY[slot]] = look;
  else delete next[SLOT_KEY[slot]];
  return next;
}

/** Normalized framing (defaults filled in) for anything that draws the face photo. */
export function faceFrame(knight: KnightLook): { x: number; y: number; zoom: number } {
  return { x: knight.faceX ?? 0, y: knight.faceY ?? 0, zoom: knight.faceZoom ?? 1 };
}

export function faceUrl(id: string): string {
  return `/api/face/${id}`;
}

/** Armor palette of the basic knight (the player's color is used for tabard, cape and shield). */
export const KNIGHT_STEEL = { base: '#b9c2cc', trim: '#6f7b87', visor: '#1d1f22' };
