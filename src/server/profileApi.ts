import { ratingPoolFor, RATING_POOLS, type RatingPool } from '@/shared/ratings';
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
  if (typeof src.buildHints === 'boolean') out.buildHints = src.buildHints;
  if (typeof src.confirmBuilds === 'boolean') out.confirmBuilds = src.confirmBuilds;
  if (typeof src.weather === 'boolean') out.weather = src.weather;
  if (typeof src.autoDeclineTrades === 'boolean') out.autoDeclineTrades = src.autoDeclineTrades;
  if (typeof src.musicVolume === 'number' && Number.isFinite(src.musicVolume)) out.musicVolume = Math.min(1, Math.max(0, src.musicVolume));
  if (src.boardScale === 'small' || src.boardScale === 'medium' || src.boardScale === 'large') out.boardScale = src.boardScale;
  if (src.motion === 'system' || src.motion === 'full' || src.motion === 'reduced') out.motion = src.motion;
  if (src.hudScale === 'small' || src.hudScale === 'medium' || src.hudScale === 'large') out.hudScale = src.hudScale;
  if (typeof src.boardTheme === 'string' && /^[a-z0-9_-]{1,32}$/i.test(src.boardTheme)) out.boardTheme = src.boardTheme;
  // Layout and per-sound volumes: the shape is checked strictly here; the client's own sanitizers drop unknown keys.
  if (src.hudLayout && typeof src.hudLayout === 'object') {
    const layout: NonNullable<ProfilePreferences['hudLayout']> = {};
    for (const [panel, v] of Object.entries(src.hudLayout as Record<string, unknown>).slice(0, 16)) {
      const p = v as { slot?: unknown; order?: unknown } | null;
      if (p && typeof p.slot === 'string' && p.slot.length <= 24 && typeof p.order === 'number' && Number.isFinite(p.order)) {
        layout[panel.slice(0, 24)] = { slot: p.slot, order: p.order };
      }
    }
    out.hudLayout = layout;
  }
  if (src.sfxVolume && typeof src.sfxVolume === 'object') {
    const vols: Record<string, number> = {};
    for (const [k, v] of Object.entries(src.sfxVolume as Record<string, unknown>).slice(0, 64)) {
      if (typeof v === 'number' && Number.isFinite(v)) vols[k.slice(0, 32)] = Math.min(1, Math.max(0, v));
    }
    out.sfxVolume = vols;
  }
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
    map: (me.game.settings as { map?: string } | null)?.map,
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

export function favoriteMode(history: GameSummary[]): RatingPool | null {
  if (!history.length) return null;
  const counts = new Map<RatingPool, number>(RATING_POOLS.map((pool) => [pool, 0]));
  for (const game of history) {
    const pool = ratingPoolFor(game.mode, game.map);
    counts.set(pool, counts.get(pool)! + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0][0];
}
