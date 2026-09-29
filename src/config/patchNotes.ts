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
    version: '1.2',
    date: '2026-09-29',
    summary: 'Voyagers: open sea, ships, the pirate and three new maps, including Veiled Isles.',
    sections: [
      {
        title: 'Voyagers',
        icon: 'board',
        items: [
          'Ships cost a wool and a lumber. Build them on sea or coast edges, from your coastal settlements or your other ships. Each player has 15.',
          'Roads and ships only connect through one of your settlements or cities, and a settlement can stand at the end of either.',
          'Once a turn you can sail the ship at the open end of a route (not one you built this turn). Use Sail in the build bar.',
          'A starting settlement on the coast may launch a ship instead of its road, and Road Building places roads or ships.',
          'Longest Road becomes the longest trade route: roads and ships count together.',
          'The pirate: on a 7 or a knight you may move it instead of the robber. It robs a player with a ship beside it and blocks new ships on its hex and ships sailing away from it.',
          'Every board theme has its own ships, pirate and treasure: longships in Nordic, junks in Sakura, feluccas on the Nile, paddle steamers in Frontier, airships in Skyport, hover-boats in Cyberpunk, shuttles in Orbital and paper boats in Origami.',
        ],
      },
      {
        title: 'New maps',
        icon: 'map',
        items: [
          'Far Shores: start on the big island and sail for the small isles and their gold. 2 points for your first settlement on each small isle. First to 14.',
          'Four Realms: four islands. Start on one or two; each other island you settle is worth 2 points. First to 13.',
          'Veiled Isles (Special, Knights & Barbarians): sail into the fog to uncover land and claim 15 hidden treasures. Hidden sea pays a bonus treasure, and each foreign isle you settle is worth a point. First to 14.',
          'The map picker is grouped into Base game, Voyagers and Special.',
        ],
      },
    ],
  },
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
