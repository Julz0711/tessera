import { describe, expect, it } from 'vitest';
import { topo, viewFor, type GameState, type ProgressCard, type ProgressCardType } from '@/engine';
import { autoSetup, clearBoard, newGame, setHand } from '@/engine/__tests__/kit';
import { progressBlocker } from '../ck/ProgressCardDialog';

/** A C&K game after setup with an empty board; player 0 to act, already rolled, a city on a fields tile. */
function ck(): GameState {
  const s = autoSetup(newGame(3, 11, 'ck'));
  clearBoard(s);
  s.players.forEach((_, i) => setHand(s, i, {}));
  s.turn.rolled = true;
  s.turn.dice = { red: 2, yellow: 3, event: 'ship' };
  const fields = s.board.hexes.find((h) => h.terrain === 'fields')!;
  s.buildings[topo(s).hexes[fields.id].vertices[0]] = { owner: 0, city: true, wall: false, metropolis: null };
  return s;
}

const card = (type: ProgressCardType): ProgressCard => ({ id: 1, type, track: 'science' });

describe('progress cards are only offered when they would do something', () => {
  it('Wedding needs someone ahead of you with cards', () => {
    const s = ck();
    expect(progressBlocker(viewFor(s, 0), card('wedding'))).toMatch(/Nobody with more points/);
    s.buildings[topo(s).hexes[5].vertices[3]] = { owner: 1, city: true, wall: false, metropolis: null };
    s.buildings[topo(s).hexes[9].vertices[3]] = { owner: 1, city: true, wall: false, metropolis: null };
    setHand(s, 1, { ore: 1 });
    expect(progressBlocker(viewFor(s, 0), card('wedding'))).toBeNull();
  });

  it('Crane needs an improvement you could then afford', () => {
    const s = ck();
    // Level 1 costs 1; with the Crane it's free, so a city alone makes it worth playing.
    expect(progressBlocker(viewFor(s, 0), card('crane'))).toBeNull();
    // Every track at level 2: level 3 costs 3, 2 with the Crane, and there's no commodity in hand.
    s.players[0].improvements = { trade: 2, politics: 2, science: 2 };
    expect(progressBlocker(viewFor(s, 0), card('crane'))).toMatch(/can’t afford/);
    setHand(s, 0, { paper: 2 });
    expect(progressBlocker(viewFor(s, 0), card('crane'))).toBeNull();
  });

  it('Irrigation needs a building on a fields tile', () => {
    const s = ck();
    expect(progressBlocker(viewFor(s, 0), card('irrigation'))).toBeNull();
    clearBoard(s);
    expect(progressBlocker(viewFor(s, 0), card('irrigation'))).toMatch(/fields/);
  });
});
