import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KNIGHT,
  FACE_OFFSET_RANGE,
  FACE_ZOOM_MAX,
  FACE_ZOOM_MIN,
  faceFrame,
  hasOwnLook,
  knightLook,
  sanitizeKnight,
  withKnightLook,
} from '../knight';

const FACE = 'a'.repeat(64);
const FACE2 = 'b'.repeat(64);

describe('sanitizeKnight', () => {
  it('defaults missing/junk input to the no-face knight', () => {
    expect(sanitizeKnight(undefined)).toEqual(DEFAULT_KNIGHT);
    expect(sanitizeKnight(null)).toEqual(DEFAULT_KNIGHT);
    expect(sanitizeKnight('nope')).toEqual(DEFAULT_KNIGHT);
    expect(sanitizeKnight({})).toEqual(DEFAULT_KNIGHT);
  });

  it('keeps a valid face id and rejects a malformed one', () => {
    expect(sanitizeKnight({ face: FACE })).toEqual({ face: FACE });
    expect(sanitizeKnight({ face: 'not-a-sha256' })).toEqual({ face: null });
    expect(sanitizeKnight({ face: 123 })).toEqual({ face: null });
  });

  it('passes valid framing through unchanged', () => {
    expect(sanitizeKnight({ face: FACE, faceX: 0.25, faceY: -0.4, faceZoom: 2 })).toEqual({
      face: FACE,
      faceX: 0.25,
      faceY: -0.4,
      faceZoom: 2,
    });
  });

  it('clamps out-of-range framing instead of dropping it', () => {
    expect(sanitizeKnight({ face: FACE, faceX: 99, faceY: -99, faceZoom: 999 })).toEqual({
      face: FACE,
      faceX: FACE_OFFSET_RANGE,
      faceY: -FACE_OFFSET_RANGE,
      faceZoom: FACE_ZOOM_MAX,
    });
    expect(sanitizeKnight({ face: FACE, faceZoom: 0 })).toEqual({ face: FACE, faceZoom: FACE_ZOOM_MIN });
  });

  it('rejects non-numeric framing junk (NaN, strings, objects) rather than clamping it', () => {
    expect(sanitizeKnight({ face: FACE, faceX: 'left', faceY: {}, faceZoom: Number.NaN })).toEqual({ face: FACE });
    expect(sanitizeKnight({ face: FACE, faceX: Infinity })).toEqual({ face: FACE });
  });

  it('a knight saved before framing existed round-trips unchanged', () => {
    // No faceX/faceY/faceZoom keys at all, matching every knight saved before this feature.
    expect(sanitizeKnight({ face: FACE })).toEqual({ face: FACE });
    expect(sanitizeKnight({ face: null })).toEqual({ face: null });
  });
});

describe('faceFrame', () => {
  it('defaults to centred and 1x zoom when framing is absent', () => {
    expect(faceFrame({ face: FACE })).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('reads through explicit framing', () => {
    expect(faceFrame({ face: FACE, faceX: 0.3, faceY: -0.1, faceZoom: 2.5 })).toEqual({ x: 0.3, y: -0.1, zoom: 2.5 });
  });
});

describe('knight levels', () => {
  it('sanitizes the strong and mighty looks and drops junk', () => {
    expect(sanitizeKnight({ face: FACE, strong: { face: FACE2, faceZoom: 99 }, mighty: 'x' })).toEqual({
      face: FACE,
      strong: { face: FACE2, faceZoom: FACE_ZOOM_MAX },
    });
    expect(sanitizeKnight({ face: null, mighty: { face: 'bad' } })).toEqual({ face: null, mighty: { face: null } });
  });

  it('knights 2 and 3 wear knight 1 until they get their own look', () => {
    const k = sanitizeKnight({ face: FACE, faceX: 0.1, strong: { face: FACE2 } });
    expect(knightLook(k, 1)).toEqual({ face: FACE, faceX: 0.1 });
    expect(knightLook(k, 2)).toEqual({ face: FACE2 });
    expect(knightLook(k, 3)).toEqual({ face: FACE, faceX: 0.1 });
    expect(hasOwnLook(k, 2)).toBe(true);
    expect(hasOwnLook(k, 3)).toBe(false);
  });

  it('sets and clears one level without touching the others', () => {
    let k = withKnightLook({ face: FACE }, 3, { face: null });
    expect(k).toEqual({ face: FACE, mighty: { face: null } });
    k = withKnightLook(k, 1, { face: FACE2, faceZoom: 2 });
    expect(k).toEqual({ face: FACE2, faceZoom: 2, mighty: { face: null } });
    k = withKnightLook(k, 3, null);
    expect(k).toEqual({ face: FACE2, faceZoom: 2 });
  });
});
