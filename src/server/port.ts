import { createServer } from 'node:net';

function canListen(port: number, host: string | undefined): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    if (host) probe.listen(port, host);
    else probe.listen(port);
  });
}

/**
 * Returns `port` if free, otherwise the next free port within `extraTries`; throws if none.
 * Also probes 127.0.0.1 explicitly: on Windows another app bound only to loopback would
 * otherwise shadow us for `http://localhost:<port>` even though the wildcard bind succeeds.
 */
export async function findFreePort(port: number, host: string | undefined, extraTries: number): Promise<number> {
  for (let candidate = port; candidate <= port + extraTries; candidate++) {
    if ((await canListen(candidate, host)) && (await canListen(candidate, '127.0.0.1'))) return candidate;
  }
  throw new Error(`Port ${port} is already in use. Set PORT to a free port (e.g. PORT=3100).`);
}
