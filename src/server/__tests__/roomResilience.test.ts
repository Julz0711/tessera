import { describe, expect, it, vi } from 'vitest';
import type * as Bots from '@/bots';
import { viewFor } from '@/engine';
import { DEFAULT_KNIGHT } from '@/shared/knight';
import { noopPersistence } from '../persistence';
import { Room, type RoomIO } from '../room';

const real = await vi.importActual<typeof Bots>('@/bots');

// The bots crash on their ordinary turns, as an engine or bot bug would (setup and prompts still
// work: the autopilot asks the bots for those).
vi.mock('@/bots', async (importOriginal) => {
  const actual = await importOriginal<typeof Bots>();
  return {
    ...actual,
    botAction: (...args: Parameters<typeof actual.botAction>) => {
      const [view] = args;
      if (view.phase === 'play' && !view.pending.length) throw new Error('bot bug');
      return actual.botAction(...args);
    },
  };
});

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('room resilience', () => {
  it('plays a crashing bot on autopilot instead of letting the error escape its timer', async () => {
    const io: RoomIO = { send: () => {}, detach: () => {} };
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = { key: 'g:host', kind: 'guest' as const, id: 'host', displayName: 'Host', avatarUrl: null };
    const room = new Room('ABCDEFGH', host, undefined, { io, persistence: noopPersistence, botDelayScale: 0 });
    room.join('s1', host, { profile: { name: 'Host', color: 'red', knight: DEFAULT_KNIGHT } });
    room.addBot('s1');
    room.start('s1');
    const me = room.seats.findIndex((s) => !s.isBot);
    for (let i = 0; i < 400 && room.game!.turn.n < 8; i++) {
      const action = real.botAction(viewFor(room.game!, me), me, { tradeTimedOut: true });
      if (action) {
        try {
          room.act('s1', action);
        } catch {
          // not our move
        }
      }
      await tick();
    }
    expect(room.game!.turn.n).toBeGreaterThanOrEqual(8);
    expect(errors.mock.calls.some((c) => String(c[0]).includes('crashed'))).toBe(true);
    errors.mockRestore();
    room.close('done');
  });
});
