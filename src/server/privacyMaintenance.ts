import pg from 'pg';

// Session advisory locks need a direct connection (not a transaction-pooling endpoint).
// Every app instance holds the shared lock; deletion holds the exclusive lock.
export const PRIVACY_LOCK_KEY = 741936205;

export class PrivacyMaintenanceError extends Error {}

export async function acquirePrivacyLock(url: string, mode: 'server' | 'deletion', onLost: () => void) {
  if (new URL(url).hostname.includes('-pooler.')) {
    throw new PrivacyMaintenanceError('Session maintenance locks need a direct database connection. Set DIRECT_DATABASE_URL to the unpooled endpoint for the same database.');
  }
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  let releasing = false;
  let lost = false;
  const handleLost = () => {
    if (releasing || lost) return;
    lost = true;
    onLost();
  };
  client.on('error', handleLost);
  client.on('end', handleLost);
  try {
    await client.connect();
    const fn = mode === 'server' ? 'pg_try_advisory_lock_shared' : 'pg_try_advisory_lock';
    const result = await client.query<{ locked: boolean }>(`SELECT ${fn}($1) AS locked`, [PRIVACY_LOCK_KEY]);
    if (!result.rows[0]?.locked) {
      throw new PrivacyMaintenanceError(mode === 'server'
        ? 'Privacy maintenance is running. Start the game server after it completes.'
        : 'A game server or another deletion is running. Stop all instances before applying deletion.');
    }
    return {
      assertHeld() {
        if (lost) throw new PrivacyMaintenanceError('Maintenance connection lost; deletion was cancelled.');
      },
      async release() {
        releasing = true;
        await client.end();
      },
    };
  } catch (err) {
    releasing = true;
    await client.end().catch(() => undefined);
    throw err;
  }
}
