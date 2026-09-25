import type { Mode, PlayerColor } from '@/engine/types';
import { isPlayerColor } from '@/shared/colors';
import { clampCosmetics } from '@/shared/cosmetics';
import { sanitizeKnight } from '@/shared/knight';
import type { GameSummary, ProfileData, ProfilePreferences, ProfileUpdate } from '@/shared/protocol';
import { sanitizeName } from '@/shared/text';
import { cosmeticStateFor } from './cosmetics';
import { getDb } from './db';
import type { ServerIdentity } from './identity';

export function sanitizePreferences(input: unknown): ProfilePreferences {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out: ProfilePreferences = {};
  if (src.view === '3d' || src.view === '2d') out.view = src.view;
  if (src.graphics === 'high' || src.graphics === 'low') out.graphics = src.graphics;
  if (typeof src.volume === 'number' && Number.isFinite(src.volume)) out.volume = Math.min(1, Math.max(0, src.volume));
  if (src.language === 'en') out.language = 'en';
  if (typeof src.useProviderAvatar === 'boolean') out.useProviderAvatar = src.useProviderAvatar;
  return out;
}

/** Game history for an identity, newest first. */
export async function historyFor(identity: ServerIdentity, take = 25): Promise<GameSummary[]> {
  const db = getDb();
  if (!db) return [];
  const where = identity.kind === 'user' ? { userId: identity.id } : { guestSessionId: identity.id };
  const rows = await db.player.findMany({
    where: { ...where, game: { status: 'finished' } },
    include: { game: { include: { players: { orderBy: { seat: 'asc' } } } } },
    orderBy: { game: { startedAt: 'desc' } },
    take,
  });
  return rows.map((me) => ({
    gameId: me.gameId,
    mode: me.game.mode as Mode,
    startedAt: me.game.startedAt.toISOString(),
    endedAt: me.game.endedAt?.toISOString() ?? null,
    status: me.game.status,
    won: me.won,
    rank: me.rank,
    finalVp: me.finalVp,
    ratingDelta: me.ratingDelta,
    players: me.game.players.map((p) => ({
      name: p.displayName,
      color: (isPlayerColor(p.color) ? p.color : 'red') as PlayerColor,
      vp: p.finalVp,
      isBot: p.isBot,
      isYou: p.id === me.id,
      won: p.won,
    })),
  }));
}

export async function ratingFor(identity: ServerIdentity): Promise<ProfileData['rating']> {
  const db = getDb();
  if (!db || identity.kind !== 'user') return null;
  const p = await db.profile.findUnique({ where: { userId: identity.id }, select: { rating: true, ratedGames: true } });
  if (!p) return { rating: 1000, ratedGames: 0, place: null };
  const place = p.ratedGames > 0 ? (await db.profile.count({ where: { ratedGames: { gt: 0 }, rating: { gt: p.rating } } })) + 1 : null;
  return { rating: p.rating, ratedGames: p.ratedGames, place };
}

export async function linkedProviders(identity: ServerIdentity): Promise<string[]> {
  const db = getDb();
  if (!db || identity.kind !== 'user') return [];
  const accounts = await db.account.findMany({ where: { userId: identity.id }, select: { provider: true } });
  return accounts.map((a) => a.provider);
}

export async function preferencesFor(identity: ServerIdentity): Promise<ProfilePreferences> {
  const db = getDb();
  if (!db || identity.kind !== 'user') return {};
  const profile = await db.profile.findUnique({ where: { userId: identity.id }, select: { preferences: true } });
  return sanitizePreferences(profile?.preferences);
}

export async function updateProfile(identity: ServerIdentity, input: unknown): Promise<void> {
  const db = getDb();
  if (!db) return;
  const src = (input && typeof input === 'object' ? input : {}) as ProfileUpdate;
  const data: Record<string, unknown> = {};
  if (typeof src.displayName === 'string') data.displayName = sanitizeName(src.displayName);
  if (src.color !== undefined && isPlayerColor(src.color)) data.color = src.color;
  if (src.knight !== undefined) data.knight = sanitizeKnight(src.knight);
  if (src.cosmetics !== undefined) data.cosmetics = clampCosmetics(src.cosmetics, (await cosmeticStateFor(identity)).unlocks);
  if (identity.kind === 'user') {
    if (src.preferences !== undefined) {
      const current = await preferencesFor(identity);
      data.preferences = { ...current, ...sanitizePreferences(src.preferences) };
    }
    await db.profile.upsert({
      where: { userId: identity.id },
      create: { userId: identity.id, displayName: (data.displayName as string) ?? 'Player', ...data },
      update: data,
    });
  } else {
    await db.guestSession.upsert({
      where: { id: identity.id },
      create: { id: identity.id, expiresAt: new Date(Date.now() + 30 * 86400_000), ...data },
      update: data,
    });
  }
}

export function favoriteMode(history: GameSummary[]): Mode | null {
  if (!history.length) return null;
  const ck = history.filter((g) => g.mode === 'ck').length;
  return ck > history.length / 2 ? 'ck' : 'classic';
}
