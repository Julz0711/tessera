'use client';

import { ensureSession } from './session';

const SIZE = 160;

/**
 * Crops the picked image to a centred square, re-encodes it as a small JPEG in the browser (so
 * the server only ever stores a tiny raster image) and uploads it. Returns the face id.
 */
export async function uploadFace(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file');
  if (file.size > 20 * 1024 * 1024) throw new Error('That image is too big');
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Couldn't read that image");
  });
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const g = canvas.getContext('2d')!;
  const side = Math.min(bitmap.width, bitmap.height);
  g.fillStyle = '#e8dcc3';
  g.fillRect(0, 0, SIZE, SIZE);
  g.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  if (!blob) throw new Error("Couldn't process that image");
  await ensureSession();
  const res = await fetch('/api/face', { method: 'POST', headers: { 'content-type': 'image/jpeg' }, body: blob, credentials: 'same-origin' });
  const body = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok || !body.id) throw new Error(body.error ?? 'Upload failed');
  return body.id;
}
