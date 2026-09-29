import { describe, expect, it } from 'vitest';
import { autoSetup } from '@/engine/__tests__/kit';
import { legalShipSpots, sailableShips } from '@/engine/queries';
import { createGame } from '@/engine/state';
import { viewFor } from '@/engine/view';
import { computeTargets } from '../interaction';

describe('sailing from the board', () => {
  it('offers your sailable ships as click targets, with and without build hints', () => {
    const s = autoSetup(
      createGame({
        seed: 3,
        mode: 'classic',
        settings: { map: 'farShores' },
        players: ['red', 'blue', 'orange'].map((color, i) => ({ id: `p${i}`, name: `P${i}`, color: color as 'red', isBot: false })),
      }),
    );
    s.turn.seat = 0;
    s.turn.rolled = true;
    const edge = legalShipSpots(s, 0).find((e) => {
      s.ships[e] = 0;
      const ok = sailableShips(s, 0).includes(e);
      s.ships[e] = null;
      return ok;
    })!;
    expect(edge).toBeDefined();
    s.ships[edge] = 0;
    for (const hints of [false, true]) {
      const targets = computeTargets(viewFor(s, 0), null, hints);
      expect(targets.edges).toContain(edge);
      expect(targets.edgeKinds?.[edge]).toBe('shipAction');
    }
    // Not on someone else's turn.
    s.turn.seat = 1;
    expect(computeTargets(viewFor(s, 0), null, true).edges).not.toContain(edge);
  });
});
