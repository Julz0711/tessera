import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Plain HTTP endpoints owned by the game server (same module graph as the socket server).
 * Returns true when the request was handled here; otherwise Next.js handles it.
 */
export async function handleHttp(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url ?? '/';
  if (url === '/api/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return true;
  }
  return false;
}
