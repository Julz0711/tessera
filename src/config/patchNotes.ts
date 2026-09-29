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
    version: '1.3',
    date: '2026-09-29',
    summary: 'Voyagers: open sea, ships, the pirate and three new maps. Plus weather, event banners and Knights & Barbarians fixes.',
    sections: [
      {
        title: 'Voyagers',
        icon: 'board',
        items: [
          'Ships cost a wool and a lumber. Build them on sea or coast edges, from your coastal settlements or your other ships. Each player has 15.',
          'Roads and ships only connect through one of your settlements or cities, and a settlement can stand at the end of either.',
          'Once a turn you can sail the ship at the open end of a route (not one you built this turn). Use Sail in the build bar, or just click the ship.',
          'A starting settlement on the coast may launch a ship instead of its road, and Road Building places roads or ships.',
          'Longest Road becomes the longest trade route: roads and ships count together.',
          'With Knights & Barbarians, knights can be recruited beside your ships and move along them as well as roads. A ship with your knight at its open end stays put.',
          'The pirate: on a 7 or a knight you may move it instead of the robber. It robs a player with a ship beside it and blocks new ships on its hex and ships sailing away from it.',
          'Every board theme has its own ships, pirate and treasure: longships in Nordic, junks in Sakura, feluccas on the Nile, paddle steamers in Frontier, airships in Skyport, neon speedboats in Cyberpunk, shuttles in Orbital and paper boats in Origami.',
        ],
      },
      {
        title: 'New maps',
        icon: 'map',
        items: [
          'Far Shores: start on the big island and sail for the small isles and their gold. 2 points for your first settlement on each small isle. First to 14.',
          'Four Realms: four islands. Start on one or two; each other island you settle is worth 2 points. First to 13.',
          'Veiled Isles (Special, Knights & Barbarians): the home island sits in a wide sea with 15 fog hexes around it. Sail into the fog to uncover land and claim 15 hidden treasures. Hidden sea pays a bonus treasure, and each foreign isle you settle is worth a point. First to 16.',
          'On Veiled Isles the treasures and the 9 harbors are always in the same places; only which harbor is which changes.',
          'Pick Classic, Knights & Barbarians, Voyagers or Special as the mode, then one of its maps.',
        ],
      },
      {
        title: 'Knights & Barbarians',
        icon: 'turn',
        items: [
          'Alchemist: once you pick the dice, they roll straight away.',
          "Deserter: if you have no knight of the deserter's strength left, you place your strongest weaker one instead of nothing.",
          "Diplomat on one of your own roads moves it: pick the new spot, or keep it where it is. Opponents' roads are still removed.",
          'A 5th progress card on your own turn can still be played. You only discard down to 4 when you end the turn.',
        ],
      },
      {
        title: 'At the table',
        icon: 'players',
        items: [
          'Big moments get a banner across the board for a few seconds: the robber or pirate striking, barbarian attacks, a new metropolis, Longest Road, Largest Army and the Defender of the island.',
          "A player's hand card turns red when they hold more cards than they may keep, so you can see who a 7 would hurt.",
        ],
      },
      {
        title: 'Look & feel',
        icon: 'board',
        items: [
          'Weather on the 3D board, to suit the theme: soft clouds, rain on the megacity, blossom, snow, fireflies, dust, drifting sand, star dust and paper confetti. Turn it off in Settings under Board.',
          'A calmer sea in 3D: the shallows fade smoothly into deep water, with no edges showing when you zoom out.',
          "Harbors sit in the water beside the coast on every map, and in 3D they no longer have boats moored at them, so they can't be mistaken for players' ships.",
        ],
      },
    ],
  },
  {
    version: '1.2',
    date: '2026-09-28',
    summary: 'A completely themed island, a more flexible HUD, a board-side barbarian fleet and fairer map rules.',
    sections: [
      {
        title: 'Ten board themes',
        icon: 'board',
        items: [
          'Choose Classic, Night, Sakura, Nordic, Frontier, Nile, Skyport, Cyberpunk, Orbital or Origami in Settings.',
          'Themes now restyle the whole island in both 2D and 3D: terrain, sea, harbors, roads, settlements, cities, knights and city walls.',
          'The barbarian fleet has its own ship for every theme, from a Nordic drakkar to an Orbital raider warship.',
          'Your theme is personal, can be changed during a game and never changes the rules for anyone else.',
        ],
      },
      {
        title: 'Settings & HUD',
        icon: 'players',
        items: [
          'Settings now open as an overlay from anywhere, while profile editing has its own dedicated page.',
          'On desktop, drag the player list, game log and action panels between either side of the board, or reset them to the default layout.',
          'Choose a HUD size to make the in-game panels, top bar and action dock smaller or larger.',
          'The master volume now has individual controls for each kind of sound effect.',
          'Profiles open with a win-and-game summary and show recent games first, with the full history available on demand.',
        ],
      },
      {
        title: 'Knights & Barbarians',
        icon: 'turn',
        items: [
          'The barbarian track has moved onto the board in both 2D and 3D, with a compact sailing route and an at-a-glance status header.',
          'Displaced knights must now retreat along their own connected roads. If there is nowhere legal to go, the knight is removed.',
          'City walls are clearer on both boards and match the selected theme.',
        ],
      },
      {
        title: 'Maps & dice',
        icon: 'map',
        items: [
          'Room hosts can choose Random dice or Balanced dice, which keep the familiar odds while smoothing out extreme streaks.',
          'Gold Rush always hides its gold on a 6 or 8, keeps every fog number between 4 and 10, and gives every player the same possible starting corners.',
        ],
      },
      {
        title: 'Tessera',
        icon: 'log',
        items: [
          'The game has a new name: Tessera.',
          'Added an in-game patch-notes page, plus clear privacy and terms pages.',
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
