import { describe, expect, it } from 'vitest';
import { applyAction, createGame, viewFor, type PlayerColor } from '@/engine';
import { botAction } from '../index';
import { seatsToAsk } from '../simulate';
import { runTournament } from '../tournament';

describe('tournament', () => {
  it('plays rotated seats and reports a win share', () => {
    const r = runTournament(botAction, botAction, { games: 8, players: 3, seed: 3 });
    expect(r.errors).toEqual([]);
    expect(r.games).toBe(8);
    expect(r.winShare.value).toBeGreaterThanOrEqual(0);
    expect(r.winShare.low).toBeLessThanOrEqual(r.winShare.high);
  });
});

describe('bot swap offers', () => {
  it('offer one spare card for a missing one to the other bots, who answer before it closes', () => {
    const colors: PlayerColor[] = ['red', 'blue', 'orange', 'white'];
    let s = createGame({ seed: 100, mode: 'classic', settings: { map: 'standard' }, players: colors.map((color, i) => ({ id: `b${i}`, name: `B${i}`, color, isBot: true })) });
    let offers = 0;
    let swaps = 0;
    for (let n = 0; n < 4000 && s.phase !== 'ended'; n++) {
      let acted = false;
      for (const seat of seatsToAsk(s)) {
        const a = botAction(viewFor(s, seat), seat, { tradeTimedOut: true });
        if (!a) continue;
        if (a.type === 'offerTrade') offers++;
        const r = applyAction(s, seat, a);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        if (r.events.some((e) => e.type === 'trade')) swaps++;
        s = r.state;
        acted = true;
        break;
      }
      expect(acted).toBe(true);
    }
    expect(offers).toBeGreaterThan(0);
    expect(swaps).toBeGreaterThan(0);
  });
});
