/**
 * What changed, newest first, for the patch notes page (/patch-notes). Written for players: say what
 * they will notice, not how it was built. A new patch goes at the top; the home page marks the notes
 * as new until a player has opened this version.
 */
export type PatchSectionIcon = 'players' | 'turn' | 'trade' | 'log' | 'hand' | 'map' | 'board';

export interface PatchNote {
  version: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  /** One line on what the patch is about. */
  summary: string;
  sections: { title: string; icon: PatchSectionIcon; items: string[] }[];
}

export const PATCH_NOTES: PatchNote[] = [
  {
    version: '1.1',
    date: '2026-09-26',
    summary: 'Everything from the first play-test round: clearer player cards, embargoes, dice stats and a fairer Vulcan.',
    sections: [
      {
        title: 'Player cards',
        icon: 'players',
        items: [
          'Redesigned: name on top, your avatar with your victory points underneath, and card icons with counts.',
          'In Knights & Barbarians you can see how many progress cards of each colour (trade, politics, science) everyone holds. Handy for the Spy.',
          'Longest Road and Largest Army light up the road or knights number; Defender of the island shows as a blue shield with its bonus points.',
          "The card of whoever's turn it is sticks out to the left.",
          'Long names no longer stretch the side panel.',
        ],
      },
      {
        title: 'Your turn',
        icon: 'turn',
        items: [
          'The dice box and the "Your turn" banner blink until you roll, even if your system has animations turned down.',
          'Bigger dice.',
        ],
      },
      {
        title: 'Trading',
        icon: 'trade',
        items: [
          "Players who don't have the cards you ask for decline automatically, and an offer closes as soon as everyone has declined.",
          'Embargo: click a player\'s card to block all trade offers from them. Click again to lift it.',
          'Cards in the trade window show as stacks, like in your hand.',
        ],
      },
      {
        title: 'Game log & stats',
        icon: 'log',
        items: ['Dice rolls appear in the log with little dice faces.', 'New Dice tab next to Log and Chat: a live chart of every roll this game.'],
      },
      {
        title: 'Hand',
        icon: 'hand',
        items: ['Hold more cards than the discard limit and your cards get a red warning, so you know a 7 would cost you half.'],
      },
      {
        title: 'Vulcan',
        icon: 'map',
        items: [
          'Every starting corner gets exactly one red number, and the corners share two 6s and two 8s.',
          'The fog never hides a desert.',
          'The mountains around the volcano are always a 4, 5, 9 or 10.',
        ],
      },
      {
        title: 'Board',
        icon: 'board',
        items: ['The 2D board can be dragged around even when fully zoomed out.', 'Reaction bubbles no longer overlap the player cards.'],
      },
    ],
  },
];

export const LATEST_PATCH = PATCH_NOTES[0].version;

/** localStorage key holding the last patch version a player opened the notes for. */
export const PATCH_SEEN_KEY = 'patchNotes.seen';
