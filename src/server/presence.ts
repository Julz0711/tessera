/**
 * Who is connected right now, for friends' status and room invites. The realtime server fills
 * this in; the HTTP API reads it. Keys are identity keys (`u:<userId>`), never sent to clients.
 */
export type PresenceStatus = 'offline' | 'online' | 'lobby' | 'playing';

export interface PresenceInfo {
  status: PresenceStatus;
  /** The room they're in (only ever shown to friends). */
  roomCode: string | null;
}

interface PresenceSource {
  lookup(identityKey: string): PresenceInfo;
  /** Delivers a friend invite to every open socket of that identity; false if none. */
  invite(identityKey: string, invite: { from: string; roomCode: string }): boolean;
}

let source: PresenceSource = {
  lookup: () => ({ status: 'offline', roomCode: null }),
  invite: () => false,
};

export function setPresenceSource(s: PresenceSource): void {
  source = s;
}

export const presenceOf = (identityKey: string): PresenceInfo => source.lookup(identityKey);
export const sendInvite = (identityKey: string, invite: { from: string; roomCode: string }): boolean => source.invite(identityKey, invite);
