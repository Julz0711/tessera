/**
 * Guest → profile upgrade (PRD §6). Runs once per guest session, inside a transaction:
 * the guest's finished games are attached to the user (unless that game already has the user),
 * stats are added to the profile, and the guest's look carries over where the profile has none.
 * `guest_sessions.migratedToUserId` makes the migration idempotent — no duplicate identities.
 */
import { sanitizeName } from '@/shared/text';
import { getDb } from './db';

export async function ensureProfile(userId: string, name?: string | null, image?: string | null): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db.profile.upsert({
    where: { userId },
    create: { userId, displayName: sanitizeName(name ?? '', 'Player'), avatarUrl: image ?? null },
    update: {},
  });
}

export async function migrateGuestToUser(guestId: string, userId: string, isNewUser = false): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  return db.$transaction(async (tx) => {
    const guest = await tx.guestSession.findUnique({ where: { id: guestId } });
    if (!guest || guest.migratedToUserId) return false;

    const players = await tx.player.findMany({ where: { guestSessionId: guestId, userId: null } });
    for (const p of players) {
      const clash = await tx.player.findFirst({ where: { gameId: p.gameId, userId } });
      if (!clash) await tx.player.update({ where: { id: p.id }, data: { userId } });
    }

    const profile = await tx.profile.findUnique({ where: { userId } });
    if (profile) {
      await tx.profile.update({
        where: { userId },
        data: {
          gamesPlayed: { increment: guest.gamesPlayed },
          gamesWon: { increment: guest.gamesWon },
          displayName: isNewUser && guest.displayName ? guest.displayName : undefined,
          color: profile.color ?? guest.color,
          knight: profile.knight ?? guest.knight ?? undefined,
          cosmetics: profile.cosmetics ?? guest.cosmetics ?? undefined,
        },
      });
    } else {
      await tx.profile.create({
        data: {
          userId,
          displayName: guest.displayName ?? 'Player',
          color: guest.color,
          knight: guest.knight ?? undefined,
          cosmetics: guest.cosmetics ?? undefined,
          gamesPlayed: guest.gamesPlayed,
          gamesWon: guest.gamesWon,
        },
      });
    }

    await tx.guestSession.update({ where: { id: guestId }, data: { migratedToUserId: userId, migratedAt: new Date() } });
    return true;
  });
}
