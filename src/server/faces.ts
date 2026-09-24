/**
 * Knight face images: small user-uploaded portraits, content-addressed by sha-256.
 * Only raster formats are accepted (checked by magic bytes, never by the client's claim),
 * kept in a bounded in-memory cache and — when a database is configured — persisted.
 */
import { createHash } from 'node:crypto';
import { getDb } from './db';

export const FACE_MAX_BYTES = 64 * 1024;
const MEMORY_BUDGET = 48 * 1024 * 1024;

interface Face {
  mime: string;
  data: Buffer;
}

const cache = new Map<string, Face>();
let cachedBytes = 0;

export function sniffImage(buf: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length > 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function remember(id: string, face: Face): void {
  if (cache.has(id)) return;
  cache.set(id, face);
  cachedBytes += face.data.length;
  // Evict oldest entries (Map preserves insertion order) beyond the memory budget.
  for (const [key, value] of cache) {
    if (cachedBytes <= MEMORY_BUDGET) break;
    cache.delete(key);
    cachedBytes -= value.data.length;
  }
}

export class FaceError extends Error {}

export async function storeFace(data: Buffer): Promise<string> {
  if (data.length > FACE_MAX_BYTES) throw new FaceError('Image is too large');
  const mime = sniffImage(data);
  if (!mime) throw new FaceError('Please upload a JPEG, PNG or WebP image');
  const id = createHash('sha256').update(data).digest('hex');
  remember(id, { mime, data });
  const db = getDb();
  if (db) {
    await db.faceImage
      .upsert({ where: { id }, create: { id, mime, data: new Uint8Array(data) }, update: {} })
      .catch((err: unknown) => console.error('[faces] persist failed', err));
  }
  return id;
}

export async function loadFace(id: string): Promise<Face | null> {
  const hit = cache.get(id);
  if (hit) return hit;
  const db = getDb();
  if (!db) return null;
  try {
    const row = await db.faceImage.findUnique({ where: { id } });
    if (!row) return null;
    const face = { mime: row.mime, data: Buffer.from(row.data) };
    remember(id, face);
    return face;
  } catch (err) {
    console.error('[faces] load failed', err);
    return null;
  }
}
