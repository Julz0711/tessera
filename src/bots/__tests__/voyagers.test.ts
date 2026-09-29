import { describe, expect, it } from 'vitest';
import { foreignIslands, victoryPoints, type MapId, type Mode } from '@/engine';
import { simulateGame } from '../simulate';

function play(map: MapId, mode: Mode, games: number, base: number) {
  let ships = 0;
  let islands = 0;
  const turns: number[] = [];
  for (let i = 0; i < games; i++) {
    const players = 2 + (i % 3);
    const seed = base + i * 37;
    const result = simulateGame(seed, players, mode, 20000, map);
    if (result.error) throw new Error(`${map} seed ${seed} (${players}p ${mode}): ${result.error}`);
    const s = result.state;
    expect(s.phase).toBe('ended');
    expect(victoryPoints(s, s.winner!)).toBeGreaterThanOrEqual(s.settings.vpToWin);
    ships += s.ships.filter((o) => o !== null).length;
    islands += s.players.reduce((n, _, seat) => n + foreignIslands(s, seat).length, 0);
    turns.push(s.turn.n);
  }
  return { ships, islands, turns };
}

describe('Voyagers self-play', () => {
  for (const map of ['farShores', 'fourRealms'] as const) {
    for (const mode of ['classic', 'ck'] as const) {
      it(`${map} (${mode}) finishes with ships built and islands settled`, () => {
        const { ships, islands, turns } = play(map, mode, 6, map === 'farShores' ? 11000 : 12000);
        console.log(`${map} ${mode}: ${ships} ships, ${islands} islands, max ${Math.max(...turns)} turns`);
        expect(ships).toBeGreaterThan(0);
        expect(islands).toBeGreaterThan(0);
      });
    }
  }

  it('Veiled Isles finishes, uncovering fog and collecting treasures', () => {
    let revealed = 0;
    let treasures = 0;
    for (let i = 0; i < 6; i++) {
      const players = 2 + (i % 3);
      const seed = 13000 + i * 41;
      const result = simulateGame(seed, players, 'ck', 20000, 'veiledIsles');
      if (result.error) throw new Error(`seed ${seed} (${players}p): ${result.error}`);
      const s = result.state;
      expect(s.phase).toBe('ended');
      revealed += 15 - s.board.hexes.filter((h) => h.fog).length;
      treasures += s.board.treasures!.filter((t) => t.takenBy !== undefined).length;
    }
    console.log(`veiledIsles: ${revealed} fog hexes revealed, ${treasures} treasures`);
    expect(revealed).toBeGreaterThan(0);
    expect(treasures).toBeGreaterThan(0);
  });
});
