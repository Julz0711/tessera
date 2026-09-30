import type { Prisma } from '@/generated/prisma/client';
import type { Db } from './db';
import { PRIVACY_LOCK_KEY, PrivacyMaintenanceError } from './privacyMaintenance';

export type DeletionTarget = { kind: 'user' | 'guest'; id: string };

/** Include all knight levels and URL-form references without interpreting arbitrary text as JSON. */
function faceReferences(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') {
    const id = /^[a-f0-9]{64}$/.test(value) ? value : value.match(/\/api\/face\/([a-f0-9]{64})(?:$|[?#])/)?.[1];
    if (id) into.add(id);
  } else if (Array.isArray(value)) {
    for (const item of value) faceReferences(item, into);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) faceReferences(item, into);
  }
}

async function planDeletion(tx: Prisma.TransactionClient, target: DeletionTarget) {
  const user = target.kind === 'user' ? await tx.user.findUnique({ where: { id: target.id }, include: { profile: true } }) : null;
  const guests = await tx.guestSession.findMany({ where: target.kind === 'user' ? { migratedToUserId: target.id } : { id: target.id } });
  const guestIds = guests.map((g) => g.id);
  const players = await tx.player.findMany({ where: { OR: [
    ...(target.kind === 'user' ? [{ userId: target.id }] : []),
    { guestSessionId: { in: guestIds } },
  ] } });
  const gameIds = [...new Set(players.map((p) => p.gameId))];
  const playerIds = players.map((p) => p.id);
  const exists = !!user || guests.length > 0 || players.length > 0;
  const targetFaces = new Set<string>();
  faceReferences([user, guests, players], targetFaces);

  // A deleted account's old portrait may also be used by somebody else. Never silently
  // delete their copy or report full deletion while retaining that known shared image.
  const retainedFaces = new Set<string>();
  const referenceSources = [
    await tx.user.findMany({ where: user ? { id: { not: user.id } } : {}, select: { image: true } }),
    await tx.profile.findMany({ where: user ? { userId: { not: user.id } } : {}, select: { knight: true, avatarUrl: true, cosmetics: true, preferences: true } }),
    await tx.guestSession.findMany({ where: { id: { notIn: guestIds } }, select: { knight: true, cosmetics: true } }),
    await tx.player.findMany({ where: { id: { notIn: playerIds } }, select: { knightCustomization: true } }),
    await tx.gameSnapshot.findMany({ where: { gameId: { notIn: gameIds } }, select: { state: true } }),
    await tx.gameEvent.findMany({ where: { gameId: { notIn: gameIds } }, select: { payload: true } }),
    await tx.room.findMany({ select: { settings: true } }),
    await tx.game.findMany({ select: { settings: true } }),
  ];
  faceReferences(referenceSources, retainedFaces);
  const images = await tx.faceImage.findMany({ select: { id: true } });
  // Ownership was never stored for uploads. Sweep ALL unreferenced images, including
  // superseded or never-saved portraits; the dry run explicitly reports this wider scope.
  const unusedFaces = exists ? images.filter((f) => !retainedFaces.has(f.id)).map((f) => f.id) : [];
  const sharedPortraits = [...targetFaces].filter((id) => retainedFaces.has(id)).length;
  const unfinishedGames = await tx.game.count({ where: { id: { in: gameIds }, status: { not: 'finished' } } });
  const blockers: string[] = [];
  if (target.kind === 'guest' && guests.some((g) => g.migratedToUserId)) blockers.push('This guest has migrated to an account. Verify and process the account request instead.');
  if (unfinishedGames) blockers.push('The identity has unfinished games. Finish those games before applying deletion.');
  if (sharedPortraits) blockers.push('Target portraits are also referenced elsewhere. Review shared-image removal before applying deletion.');
  const counts = {
    users: user ? 1 : 0,
    guests: guests.length,
    players: players.length,
    games: gameIds.length,
    sessions: user ? await tx.session.count({ where: { userId: user.id } }) : 0,
    accounts: user ? await tx.account.count({ where: { userId: user.id } }) : 0,
    friendships: user ? await tx.friendship.count({ where: { OR: [{ requesterId: user.id }, { addresseeId: user.id }] } }) : 0,
    snapshots: await tx.gameSnapshot.count({ where: { gameId: { in: gameIds } } }),
    events: await tx.gameEvent.count({ where: { gameId: { in: gameIds } } }),
    unusedPortraitsAcrossDatabase: unusedFaces.length,
    sharedPortraits,
    unfinishedGames,
  };
  return { user, guestIds, playerIds, gameIds, unusedFaces, counts, blockers, exists };
}

/** Operator-only service. Default is read-only. Apply requires all app instances stopped. */
export async function deletePersonalData(db: Db, target: DeletionTarget, options: { apply?: boolean } = {}) {
  if (!['user', 'guest'].includes(target.kind) || !target.id.trim()) throw new PrivacyMaintenanceError('Provide a user or guest ID.');
  // Apply needs a fresh snapshot after acquiring the lock to see the last server's
  // committed writes. The exclusive lock then excludes app writers until commit.
  return db.$transaction(async (tx) => {
    if (options.apply) {
      // The exclusive lock lives on the SAME transaction as the writes. A lost
      // connection rolls back both, and the lock cannot expire before commit.
      const rows = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(${PRIVACY_LOCK_KEY}::bigint) AS locked`;
      if (!rows[0]?.locked) throw new PrivacyMaintenanceError('A game server or another deletion is running. Stop all instances before applying deletion.');
    }
    const plan = await planDeletion(tx, target);
    const report = { mode: options.apply ? 'apply' : 'dry-run', found: plan.exists, applied: false, counts: plan.counts, blockers: plan.blockers };
    if (!options.apply || !plan.exists || plan.blockers.length) return report;

    // Score history uses Game + Player, not replay records. Removing whole replay
    // records avoids overlooking names copied into free-form engine event text.
    await tx.gameEvent.deleteMany({ where: { gameId: { in: plan.gameIds } } });
    await tx.gameSnapshot.deleteMany({ where: { gameId: { in: plan.gameIds } } });
    await tx.player.updateMany({ where: { id: { in: plan.playerIds } }, data: {
      userId: null, guestSessionId: null, displayName: 'Deleted player', knightCustomization: { face: null },
    } });
    if (plan.user?.email) await tx.verificationToken.deleteMany({ where: { identifier: plan.user.email } });
    await tx.guestSession.deleteMany({ where: { id: { in: plan.guestIds } } });
    if (plan.user) await tx.user.delete({ where: { id: plan.user.id } });
    await tx.faceImage.deleteMany({ where: { id: { in: plan.unusedFaces } } });
    return { ...report, applied: true };
  }, { isolationLevel: options.apply ? 'ReadCommitted' : 'RepeatableRead', maxWait: 5000, timeout: 120_000 });
}
