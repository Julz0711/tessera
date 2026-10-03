import { describe, expect, it, vi } from 'vitest';
import { legalSettlementSpots, legalSetupRoads, viewFor, type GameState } from '@/engine';
import { DEFAULT_KNIGHT } from '@/shared/knight';
import type { ChatMessage } from '@/shared/protocol';
import type { ServerIdentity } from '../identity';
import { noopPersistence, type Persistence } from '../persistence';
import { Room, type RoomIO } from '../room';

const guest = (id: string): ServerIdentity => ({ key: `g:${id}`, kind: 'guest', id, displayName: id, avatarUrl: null });
const profile = (color: 'red' | 'blue') => ({ name: color, color, knight: DEFAULT_KNIGHT });

/** Two people (no bots, so nothing moves on its own); socket s1 belongs to an admin. */
function table(mode: 'classic' | 'ck' = 'classic') {
  const chat: ChatMessage[] = [];
  const io: RoomIO = {
    send: (_sid, event, ...args) => {
      if (event === 'chat:message') chat.push(args[0] as ChatMessage);
    },
    detach: () => {},
    isAdmin: (sid) => sid === 's1',
  };
  const snapshots: GameState[] = [];
  const actions: number[] = [];
  const persistence: Persistence = {
    ...noopPersistence,
    enabled: true,
    snapshot: (_id, state) => void snapshots.push(state),
    gameAction: (_id, seq) => void actions.push(seq),
  };
  const room = new Room('ABCDEFGH', guest('a'), { mode }, { io, persistence, botDelayScale: 0 });
  room.join('s1', guest('a'), { profile: profile('red') });
  room.join('s2', guest('b'), { profile: profile('blue') });
  room.start('s1');
  const socketOf = (seat: number) => (room.seats[seat].identityKey === 'g:a' ? 's1' : 's2');
  return { room, chat, snapshots, actions, socketOf };
}

/** The current setup player's settlement (and then road), as the engine's own setup helper picks them. */
function setupMove(t: ReturnType<typeof table>) {
  const g = t.room.game!;
  const seat = g.setup!.order[g.setup!.index];
  if (g.setup!.placing === 'settlement') t.room.act(t.socketOf(seat), { type: 'buildSettlement', vertex: legalSettlementSpots(g, seat, true)[0] });
  else t.room.act(t.socketOf(seat), { type: 'buildRoad', edge: legalSetupRoads(g)[0] });
}

describe('admin tools', () => {
  it('are only for admins, and only they are told they have them', () => {
    const t = table();
    expect(t.room.dto('s1').you.isAdmin).toBe(true);
    expect(t.room.dto('s2').you.isAdmin).toBeUndefined();
    expect(() => t.room.admin('s2', { type: 'undo' })).toThrow(/Only admins/);
    t.room.close('done');
  });

  it('undo puts back the state before the last move; new moves never reuse a stored seq', () => {
    const t = table();
    const before = t.room.game!;
    setupMove(t);
    const after = t.room.game!;
    expect(after.buildings.some(Boolean)).toBe(true);
    expect(t.room.admin('s1', { type: 'undo' })).toMatch(/undid the last move/);
    const undone = t.room.game!;
    expect(undone.buildings).toEqual(before.buildings);
    expect(undone.seq).toBeGreaterThan(after.seq);
    expect(undone.adminEdited).toBe(true);
    // Saved as a snapshot, so a restart restores this state rather than replaying the undone move.
    expect(t.snapshots.at(-1)).toBe(undone);
    expect(t.chat.at(-1)).toMatchObject({ system: true, text: expect.stringMatching(/admin undid/) });
    // The same move can be made again, under a fresh seq.
    setupMove(t);
    expect(t.actions.at(-1)).toBeGreaterThan(undone.seq);
    expect(() => t.room.admin('s1', { type: 'undo' })).not.toThrow();
    expect(() => t.room.admin('s1', { type: 'undo' })).toThrow(/Nothing to undo/);
    t.room.close('done');
  });

  it('gives and takes cards through the bank, and that can be undone too', () => {
    const t = table();
    const bank = t.room.game!.bank.ore;
    expect(t.room.admin('s1', { type: 'cards', seat: 1, cards: { ore: 2, wool: -1 } })).toMatch(/\+2 ore/);
    expect(t.room.game!.players[1].hand.ore).toBe(2);
    expect(t.room.game!.bank.ore).toBe(bank - 2);
    // Nothing to take: the hand holds no wool.
    expect(t.room.game!.players[1].hand.wool).toBe(0);
    expect(() => t.room.admin('s1', { type: 'cards', seat: 1, cards: { paper: 1 } })).toThrow(/Unknown card/);
    expect(() => t.room.admin('s1', { type: 'cards', seat: 1, cards: { wool: -2 } })).toThrow(/Nothing changed/);
    expect(() => t.room.admin('s1', { type: 'cards', seat: 7, cards: { ore: 1 } })).toThrow(/Unknown player/);
    t.room.admin('s1', { type: 'undo' });
    expect(t.room.game!.players[1].hand.ore).toBe(0);
    expect(t.room.game!.bank.ore).toBe(bank);
    t.room.close('done');
  });

  it('sets the next roll without showing it to anyone', () => {
    const t = table('ck');
    while (t.room.game!.phase === 'setup') setupMove(t);
    expect(t.room.admin('s1', { type: 'nextRoll', red: 2, yellow: 3, event: 'science' })).toMatch(/2 \+ 3/);
    expect(viewFor(t.room.game!, 0)).not.toHaveProperty('nextRoll');
    expect(() => t.room.admin('s1', { type: 'nextRoll', red: 0, yellow: 3 })).toThrow(/both dice/);
    const seat = t.room.game!.turn.seat;
    t.room.act(t.socketOf(seat), { type: 'rollDice' });
    expect(t.room.game!.turn.dice).toEqual({ red: 2, yellow: 3, event: 'science' });
    expect(t.room.game!.nextRoll).toBeNull();
    t.room.close('done');
  });

  it('live stats are public: the report leaves hidden cards out until the game ends', () => {
    const t = table();
    while (t.room.game!.phase === 'setup') setupMove(t);
    const g = t.room.game!;
    t.room.game = { ...g, players: g.players.map((p, i) => (i === 0 ? { ...p, devCards: [{ type: 'victoryPoint', boughtOn: 0 }] } : p)) };
    const live = t.room.liveReport('s2');
    expect(live.live).toBe(true);
    expect(live.players[0].vp).toBe(2);
    expect(() => t.room.liveReport('nobody')).toThrow(/not in this room/);
    t.room.close('done');
  });

  it('keeps no undo history while no admin is at the table', () => {
    let admin = false;
    const io: RoomIO = { send: () => {}, detach: () => {}, isAdmin: () => admin };
    const room = new Room('ABCDEFGK', guest('a'), undefined, { io, persistence: noopPersistence, botDelayScale: 0 });
    room.join('s1', guest('a'), { profile: profile('red') });
    room.join('s2', guest('b'), { profile: profile('blue') });
    room.start('s1');
    const g = room.game!;
    const seat = g.setup!.order[0];
    const socket = room.seats[seat].identityKey === 'g:a' ? 's1' : 's2';
    room.act(socket, { type: 'buildSettlement', vertex: legalSettlementSpots(g, seat, true)[0] });
    admin = true;
    expect(() => room.admin('s1', { type: 'undo' })).toThrow(/Nothing to undo/);
    room.close('done');
  });

  it('pauses bots for a moment after a change, so the admin can keep undoing', () => {
    vi.useFakeTimers();
    try {
      const io: RoomIO = { send: () => {}, detach: () => {}, isAdmin: () => true };
      const room = new Room('ABCDEFGJ', guest('a'), undefined, { io, persistence: noopPersistence, botDelayScale: 1 });
      room.join('s1', guest('a'), { profile: profile('red') });
      room.addBot('s1');
      room.start('s1');
      // Whoever goes first, run until the bot has made a move, then undo it.
      for (let i = 0; i < 20 && !room.game!.buildings.some((b) => b && room.seats[b.owner].isBot); i++) {
        const g = room.game!;
        const seat = g.setup!.order[g.setup!.index];
        if (!room.seats[seat].isBot) {
          if (g.setup!.placing === 'settlement') room.act('s1', { type: 'buildSettlement', vertex: legalSettlementSpots(g, seat, true)[0] });
          else room.act('s1', { type: 'buildRoad', edge: legalSetupRoads(g)[0] });
        } else vi.advanceTimersByTime(1500);
      }
      const seq = room.game!.seq;
      room.admin('s1', { type: 'undo' });
      const undone = room.game!.seq;
      expect(undone).toBeGreaterThan(seq);
      // Within the pause, the bot hasn't moved again.
      vi.advanceTimersByTime(2500);
      expect(room.game!.seq).toBe(undone);
      room.close('done');
    } finally {
      vi.useRealTimers();
    }
  });
});
