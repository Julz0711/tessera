import { describe, expect, it } from 'vitest';
import { canHoldShip } from '../board/sea';
import { getTopology } from '../board/topology';
import { intrigueTargets, knightMoveTargets, relocationSpots } from '../ck/queries';
import { createGame } from '../state';
import type { GameState, PlayerColor } from '../types';
import { viewFor } from '../view';
import { act, autoSetup, clearBoard, reject } from './kit';

const COLORS: PlayerColor[] = ['red', 'blue', 'orange'];

/** C&K on a sea map, board cleared, with a straight 4-ship chain v0-v1-v2-v3-v4 free of any piece. */
function seaChain() {
  const s: GameState = autoSetup(
    createGame({ seed: 1, mode: 'ck', settings: { map: 'veiledIsles' }, players: COLORS.map((color, i) => ({ id: `p${i}`, name: `P${i}`, color, isBot: false })) }),
  );
  clearBoard(s);
  s.ships = s.ships.map(() => null);
  s.turn.rolled = true;
  const t = getTopology(s.board.hexes);
  const ok = (e: number) => canHoldShip(s.board, t, e);
  const other = (e: number, v: number) => (t.edges[e].a === v ? t.edges[e].b : t.edges[e].a);
  for (const first of t.edges.filter((e) => ok(e.id))) {
    const vs = [first.a, first.b];
    const es = [first.id];
    while (es.length < 4) {
      const last = vs[vs.length - 1];
      const e = t.vertices[last].edges.find((x) => ok(x) && !es.includes(x) && !vs.includes(other(x, last)));
      if (e === undefined) break;
      es.push(e);
      vs.push(other(e, last));
    }
    if (es.length === 4) return { s, vs, es };
  }
  throw new Error('no ship chain');
}

const knight = (owner: number, level: 1 | 2 | 3, active = true) => ({ id: 100 + owner * 10 + level, owner, level, active, activatedOn: 0, promotedOn: -1 });

describe('Knights displacing along ship routes', () => {
  it('displaces a knight on a ship-only vertex, and it relocates along its own ships', () => {
    let { s, vs, es } = seaChain();
    s.ships[es[0]] = 0;
    s.ships[es[1]] = 0;
    s.ships[es[2]] = 1;
    s.ships[es[3]] = 1;
    s.knights[vs[1]] = knight(0, 2);
    s.knights[vs[2]] = knight(1, 1);
    expect(knightMoveTargets(s, 0, vs[1]).displaces).toContain(vs[2]);
    s = act(s, 0, { type: 'moveKnight', from: vs[1], to: vs[2] });
    expect(s.knights[vs[2]]).toMatchObject({ owner: 0, level: 2 });
    expect(s.pending[0]).toMatchObject({ kind: 'relocateKnight', seat: 1, from: vs[2] });
    expect(relocationSpots(s, 1, vs[2]).sort()).toEqual([vs[3], vs[4]].sort());
    expect(reject(s, 1, { type: 'relocateKnight', vertex: vs[0] })).toMatch(/along your/);
    s = act(s, 1, { type: 'relocateKnight', vertex: vs[4] });
    expect(s.knights[vs[4]]).toMatchObject({ owner: 1, level: 1 });
  });

  it('Intrigue works on a knight touching only your ships', () => {
    const { s, vs, es } = seaChain();
    s.ships[es[0]] = 0;
    s.ships[es[1]] = 0;
    s.knights[vs[2]] = knight(1, 3);
    expect(intrigueTargets(s, 0)).toContain(vs[2]);
  });
});

describe('Knight displacement on a redacted view', () => {
  it('offers the same displacement targets to the client', () => {
    const { s, vs, es } = seaChain();
    s.ships[es[0]] = 0;
    s.ships[es[1]] = 0;
    s.knights[vs[1]] = knight(0, 2);
    s.knights[vs[2]] = knight(1, 1);
    const v = viewFor(s, 0);
    expect(knightMoveTargets(v, 0, vs[1]).displaces).toContain(vs[2]);
  });
});
