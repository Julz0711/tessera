import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KNIGHT,
  FACE_OFFSET_RANGE,
  FACE_ZOOM_MAX,
  FACE_ZOOM_MIN,
  sanitizeKnight,
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

describe('knight levels', () => {
  it('sanitizes the strong and mighty looks and drops junk', () => {
    expect(sanitizeKnight({ face: FACE, strong: { face: FACE2, faceZoom: 99 }, mighty: 'x' })).toEqual({
      face: FACE,
      strong: { face: FACE2, faceZoom: FACE_ZOOM_MAX },
    });
    expect(sanitizeKnight({ face: null, mighty: { face: 'bad' } })).toEqual({ face: null, mighty: { face: null } });
  });
});
