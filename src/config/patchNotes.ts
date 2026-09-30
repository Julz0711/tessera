/**
 * What changed, newest first, for the patch notes page (/patch-notes). Written for players: say what
 * they will notice, not how it was built. Keep entries simple and only include what's actually
 * user-relevant — new maps, settings, features, game modes. Skip internal rule minutiae and
 * implementation detail. A new patch goes at the top; the home page marks the notes as new until a
 * player has opened this version.
 */
export type PatchSectionIcon =
  | "players"
  | "turn"
  | "trade"
  | "log"
  | "hand"
  | "map"
  | "board";

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
    version: "1.5",
    date: "2026-10-01",
    summary: "A brand new match report: compare every player side by side.",
    sections: [
      {
        title: "Match report",
        icon: "log",
        items: [
          "Stats are now a head-to-head table: every player has a column, the best value in each row is crowned.",
          "Browse by category: Overview, Dice, Production, Trading, Robber & losses, Building, cards and Timeline.",
          "New awards like Luckiest dice, Top producer and Robber baron, plus a victory point race chart.",
          "See every player’s own dice rolls, their luck against the odds, and who traded with or robbed whom.",
        ],
      },
    ],
  },
  {
    version: "1.4",
    date: "2026-09-30",
    summary: "Two new maps and a clearer turn timer.",
    sections: [
      {
        title: "New maps",
        icon: "map",
        items: [
          "Crossroads: start in one of four regions and race to claim the narrow routes between them.",
          "The Citadel: sail from an outer island to an ore-rich center in a Knights & Barbarians game.",
        ],
      },
      {
        title: "Timed turns",
        icon: "turn",
        items: [
          "When a turn timer is on, the End Turn button shows the remaining seconds and warns you as time runs out.",
        ],
      },
    ],
  },
  {
    version: "1.3",
    date: "2026-09-29",
    summary:
      "Voyagers: open sea, ships and the pirate, plus three new maps. Weather effects and a few Knights & Barbarians fixes too.",
    sections: [
      {
        title: "Voyagers",
        icon: "board",
        items: [
          "Build ships to sail the open seas and settle new islands.",
          "Roads and ships now count together for Longest Road.",
          "A pirate can appear instead of the robber, blocking ships and stealing from players at sea.",
          "Every board theme has its own ship and pirate designs.",
        ],
      },
      {
        title: "New maps",
        icon: "map",
        items: [
          "Far Shores: sail from your home island to small, gold-rich isles.",
          "Four Realms: settle across four separate islands for bonus points.",
          "Veiled Isles: sail into the fog to uncover hidden islands and treasure.",
          "Pick Classic, Knights & Barbarians, Voyagers or Special as the mode, then choose a map.",
        ],
      },
      {
        title: "Knights & Barbarians",
        icon: "turn",
        items: ["Fixed a few card and knight-movement bugs."],
      },
      {
        title: "At the table",
        icon: "players",
        items: [
          "Key moments now show a banner across the board: the robber or pirate striking, barbarian attacks, a new metropolis, Longest Road, Largest Army and Defender of the Island.",
          "Your hand turns red when you're holding too many cards, so you know a 7 would hurt.",
        ],
      },
      {
        title: "Look & feel",
        icon: "board",
        items: [
          "Added weather to the 3D board — rain, snow, blossom and more, matching the theme. Turn it off in Settings under Board.",
          "General visual polish to the 3D sea and harbors.",
        ],
      },
    ],
  },
  {
    version: "1.2",
    date: "2026-09-28",
    summary: "Ten board themes, a more flexible HUD, and fairer map rules.",
    sections: [
      {
        title: "Ten board themes",
        icon: "board",
        items: [
          "Choose from ten board themes — Classic, Night, Sakura, Nordic, Frontier, Nile, Skyport, Cyberpunk, Orbital or Origami — in Settings.",
          "Themes restyle the whole board, including the barbarian fleet.",
          "Your theme is personal, can be changed mid-game, and never affects other players.",
        ],
      },
      {
        title: "Settings & HUD",
        icon: "players",
        items: [
          "Settings now open as an overlay from anywhere.",
          "On desktop, arrange the player list, game log and action panels to either side of the board.",
          "Choose a HUD size to make panels bigger or smaller.",
          "Separate volume controls for each kind of sound effect.",
          "Profiles now open with a quick win-and-game summary.",
        ],
      },
      {
        title: "Knights & Barbarians",
        icon: "turn",
        items: [
          "The barbarian track now sits on the board itself, in both 2D and 3D.",
          "Fixed knight-retreat rules so displaced knights always retreat legally.",
        ],
      },
      {
        title: "Maps & dice",
        icon: "map",
        items: [
          "Room hosts can choose Balanced dice to smooth out extreme luck streaks.",
          "Fairer, more consistent map rules for Gold Rush.",
        ],
      },
      {
        title: "Tessera",
        icon: "log",
        items: [
          "The game has a new name: Tessera.",
          "Added this in-game patch notes page, plus privacy and terms pages.",
        ],
      },
    ],
  },
  {
    version: "1.1",
    date: "2026-09-26",
    summary:
      "Clearer player cards, trade embargoes, dice stats and a fairer Vulcan map.",
    sections: [
      {
        title: "Player cards",
        icon: "players",
        items: [
          "Redesigned with your avatar, victory points and card counts up front.",
          "See at a glance who holds Longest Road, Largest Army and Defender of the Island.",
          "The current player's card stands out from the rest.",
        ],
      },
      {
        title: "Your turn",
        icon: "turn",
        items: ["The dice box blinks until you roll, and the dice are bigger."],
      },
      {
        title: "Trading",
        icon: "trade",
        items: [
          "Players who don't have the cards you ask for decline automatically, and only they see it. You just see no answer from them.",
          "New embargo option: block trade offers from a specific player.",
        ],
      },
      {
        title: "Game log & stats",
        icon: "log",
        items: [
          "New Dice tab next to Log and Chat: a live chart of every roll this game.",
        ],
      },
      {
        title: "Hand",
        icon: "hand",
        items: ["Your hand shows a red warning when a 7 would cost you cards."],
      },
      {
        title: "Vulcan",
        icon: "map",
        items: [
          "Fairer starting positions and fog placement on the Vulcan map.",
        ],
      },
      {
        title: "Board",
        icon: "board",
        items: [
          "The 2D board can now be dragged around even when fully zoomed out.",
        ],
      },
    ],
  },
];

export const LATEST_PATCH = PATCH_NOTES[0].version;

/** localStorage key holding the last patch version a player opened the notes for. */
export const PATCH_SEEN_KEY = "patchNotes.seen";
