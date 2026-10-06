/**
 * What changed, newest first, for the patch notes page (/patch-notes). Written for players: say what
 * they will notice, not how it was built. Keep entries simple and only include what's actually
 * user-relevant — new maps, settings, features, game modes. Skip internal rule minutiae and
 * implementation detail. A new patch goes at the top; the home page marks the notes as new until a
 * player has opened this version.
 */
import type { MapId } from "@/engine/types";

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
  sections: { title: string; icon: PatchSectionIcon; items: string[]; maps?: MapId[] }[];
}

export const PATCH_NOTES: PatchNote[] = [
  {
    version: "1.9",
    date: "2026-10-06",
    summary: "A new look for the whole game, a bottom bar like the big Catan sites, \"?\" trade offers and a proper phone layout.",
    sections: [
      {
        title: "A new look",
        icon: "board",
        items: [
          "Every screen shares one style: clear dark outlines, white keys, amber for the next thing to do, pale blue for what you picked and red for ending or leaving.",
          "Pieces are a little bigger. Every theme has its own metropolis, and knights are now a simple shield in every theme, so they read at a glance.",
          "In 3D, pieces sit on the board instead of floating above it.",
          "Dice are white, and while it's your turn they gently pulse: click them (or press R) to roll. There is no Roll button any more.",
          "Where you can build, a gold halo marks the spot, and a city shows up as a preview when you point at a settlement.",
        ],
      },
      {
        title: "The bottom bar",
        icon: "hand",
        items: [
          "Your cards, your keys and your own player card now sit in one bar along the bottom. The other players' cards stack right above yours, in the order they play after you.",
          "Keys: Trade, Improve (Knights & Barbarians) or Progress (Classic), Build, End turn. Build opens a menu with a price on every piece, and a badge shows how many things you can afford.",
          "Keyboard shortcuts, shown on the keys: R road (and roll), S ship, A settlement, C city, Q knight, W wall, T trade, X improve, D build, E end turn, V progress card, Y emote.",
          "Your hand fits all eight card types, and the trade panel opens directly above your cards.",
          "Barbarians: the progress panel is see-through and sits at the left edge. Choose the tall track or a small panel under Settings › Barbarian track.",
        ],
      },
      {
        title: "Trading",
        icon: "trade",
        items: [
          "New \"?\" card: put it in the offer to ask what the others would give you. They answer with counter-offers.",
          "Trade is only available on your turn. When it isn't, answer incoming offers with Accept or Counter-offer.",
        ],
      },
      {
        title: "On a phone",
        icon: "players",
        items: [
          "Wide maps turn a quarter turn when you hold your phone upright, so the island fills the screen. Switch it off under Settings › Turn wide maps.",
          "Your hand sits on a white tray, Build and Improve open as big panels across the screen, and all players fit in the strip without scrolling.",
          "Settings tabs fit on the screen.",
        ],
      },
      {
        title: "Around the game",
        icon: "log",
        items: [
          "Reactions live in the top bar next to the room code, and your emoji briefly replaces your profile picture.",
          "Leaderboard and game history filters are quick toggles instead of drop-down lists.",
          "Zoom buttons are off by default; turn them on under Settings › Accessibility.",
        ],
      },
      {
        title: "Maps",
        icon: "map",
        items: [
          "Veiled Isles: the fog now hides a fixed mix, two sea, two gold, one desert and two of each resource.",
          "Vulcan: no 2s or 12s in the fog.",
        ],
        maps: ["veiledIsles", "vulcan"],
      },
      {
        title: "Misc",
        icon: "log",
        items: ["Various bug fixes."],
      },
    ],
  },
  {
    version: "1.8",
    date: "2026-10-03",
    summary: "Live stats, background music, the barbarians always in view, and fairer trading.",
    sections: [
      {
        title: "During the game",
        icon: "log",
        items: [
          "Live stats: open Menu › Live stats (or Full stats under the dice) for the whole match report while you play. It updates as the game goes on and shows only what everyone can see.",
          "Background music: calm music with a different mood for each board theme. It's off by default: turn it on under Settings › Audio, or from the in-game menu.",
          "Knights & Barbarians: the barbarian ship's progress now has its own panel under the game log, so it stays in view however far you zoom in. Move it like the other panels; on phones it leads the players strip.",
          "The game is in beta, and now says so: look for the tag next to the name.",
        ],
      },
      {
        title: "Trading",
        icon: "trade",
        items: [
          "Offers asking for cards you don't have no longer disappear on their own straight away.",
          "New setting, Auto-decline trades (Settings › Gameplay): such an offer declines itself after 5 seconds, with a bar counting down. Turn it off to answer every offer yourself.",
        ],
      },
      {
        title: "Rules",
        icon: "hand",
        items: [
          "City improvements show the full price of every level, and the Crane's discount right on the button.",
        ],
      },
    ],
  },
  {
    version: "1.7",
    date: "2026-10-03",
    summary: "A rulebook, building costs on every button, readable night themes and fairer abandoned games.",
    sections: [
      {
        title: "Rules and costs",
        icon: "hand",
        items: [
          "New rulebook: open Rules from the menu, in a game or on the home screen. It opens on the rules of the game you're playing, with every mode one tap away.",
          "Every build button now shows what it costs. Cards you already have light up, missing ones are greyed out, so you see at a glance what you still need.",
        ],
      },
      {
        title: "Fair play",
        icon: "players",
        items: [
          "Abandoning a game now counts as a forfeit: last place, plus a rating penalty. Everyone else still wins or loses rating as normal.",
          "The turn timer is on by default (120 seconds), and only runs when at least two people share the table, so solo games against bots never rush you.",
          "Server updates no longer end running games: your table is back where it was as soon as you reconnect.",
        ],
      },
      {
        title: "Board",
        icon: "board",
        items: [
          "Night, Cyberpunk and Orbital are much easier to read in 2D and 3D: every terrain and every player's pieces stand out.",
          "Sakura settlements are now tea houses, and the Nile barbarians sail a proper reed boat.",
          "The robber stands beside the number instead of hiding it.",
        ],
      },
    ],
  },
  {
    version: "1.6",
    date: "2026-10-01",
    summary: "Two new Special maps: Zealand and Ironbound.",
    sections: [
      {
        title: "New maps",
        icon: "map",
        items: [
          "Zealand: start together on a ring of sheep with twelve wool harbors, then trade, build ships and sail to six fogged isles with harbors on their far shores, and hunt 21 treasures on their shores, with a lone desert isle of its own. Gold in the fog is a lobby toggle.",
          "Ironbound: up to 6 players start on small isles ringing a great island. Gold sits in the middle, forests with lumber harbors on little ponds around it, then fog and desert, and a rim of ore. Each isle has up to three harbors facing away from the mainland.",
        ],
        maps: ["zealand", "citadel"],
      },
    ],
  },
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
    summary: "A new map and a clearer turn timer.",
    sections: [
      {
        title: "New map",
        icon: "map",
        items: [
          "Crossroads: start in one of four regions and race to claim the narrow routes between them.",
        ],
        maps: ["crossroads"],
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
        maps: ["farShores", "fourRealms", "veiledIsles"],
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
