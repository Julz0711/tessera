/** The in-game rulebook (menu → Rules): how this game's engine plays, mode by mode. Keep in step with src/engine. */
export type RuleMode = 'classic' | 'ck' | 'voyagers' | 'special';

export interface RuleChapter {
  id: string;
  title: string;
  /** Which game types the chapter belongs to; 'all' = every game. */
  applies: 'all' | RuleMode[];
  sections: RuleSection[];
}

export interface RuleSection {
  title: string;
  /** Paragraphs (string) and bullet lists (string[]). Inline **bold** is allowed for key terms and numbers. */
  body: (string | string[])[];
}

export const RULEBOOK: RuleChapter[] = [
  // ── 1. Basics ───────────────────────────────────────────────────────────────
  {
    id: 'basics',
    title: 'The basics',
    applies: 'all',
    sections: [
      {
        title: 'Goal of the game',
        body: [
          'Be the first to reach the **points to win** during your own turn. The host can set the target from 3 to 20 in the lobby.',
          [
            'Classic: **10** points by default.',
            'Knights & Barbarians: **13** points by default.',
            'Some maps set their own target (see the Voyagers, Special and map chapters).',
          ],
          'You earn points from settlements (1 each) and cities (2 each). Longest Road is worth 2. The other sources depend on the game type, and each chapter lists them.',
          'The game checks your points after every move you make. As soon as you have enough on your own turn, the game ends and you win.',
        ],
      },
      {
        title: 'The board',
        body: [
          'The board is made of hexagonal tiles. Settlements and cities stand on the corners where tiles meet, and roads run along the edges between corners.',
          'The standard island has 19 tiles: 4 Forest, 4 Pasture, 4 Fields, 3 Hills, 3 Mountains and 1 Desert. Other maps have different shapes and sizes. See the Maps chapters.',
          'Harbors sit on the coast. A harbor gives you cheaper trades with the bank if you own a settlement or city on one of its two corners.',
        ],
      },
      {
        title: 'Resources',
        body: [
          'There are five resources. Each terrain produces one of them:',
          [
            '**Forest** gives Lumber.',
            '**Hills** give Brick.',
            '**Pasture** gives Wool.',
            '**Fields** give Grain.',
            '**Mountains** give Ore.',
            '**Desert** gives nothing.',
            '**Gold** lets you pick any resource (see Gold fields below).',
          ],
          'The bank holds 19 of each resource, or 24 on the bigger maps. If the bank runs out of a card, it cannot hand out more of it.',
        ],
      },
      {
        title: 'Number tokens and production',
        body: [
          'Every tile except the desert carries a number from 2 to 12 (never 7). At the start of your turn you roll two dice. Every tile whose number matches the total produces for everyone with a building on one of its corners.',
          [
            'A **settlement** on a producing tile gives you 1 card of that resource.',
            'A **city** gives you 2 cards (in Knights & Barbarians, see the cities rule in that chapter).',
          ],
          'The dots under a number show how likely it is to be rolled. 6 and 8 have 5 dots, 5 and 9 have 4, 4 and 10 have 3, 3 and 11 have 2, and 2 and 12 have 1 dot.',
          'The tile the robber stands on produces nothing. A tile that is still hidden under fog produces nothing either.',
          '**Bank shortage:** if the bank does not have enough of a card to pay everyone, then when two or more players are owed that card, nobody gets any. When only one player is owed it, they get whatever is left.',
        ],
      },
      {
        title: 'The desert',
        body: [
          'The desert produces nothing and has no number. The robber starts there. On maps without a desert, the map decides where the robber starts (Four Realms starts it on a 12).',
        ],
      },
      {
        title: 'Fog',
        body: [
          'Some maps hide tiles under fog. A fogged tile shows nothing until it is discovered, and it does not produce.',
          [
            'A tile is discovered when you build a settlement on one of its corners, or when you build a road (or ship) with one end on one of its corners. Roads placed during setup count too.',
            'When you discover resource tiles, you take **1 card of each discovered resource** from the bank (if the bank has it).',
            'When you discover a gold field, you get a free pick of any resource for each one.',
            'The robber cannot be moved onto a fogged tile.',
          ],
          'Starting settlements are never placed next to fog.',
        ],
      },
      {
        title: 'Gold fields',
        body: [
          'When a gold field\'s number is rolled, every settlement next to it lets you pick **1 resource** of your choice from the bank, and every city lets you pick **2**. If the bank cannot cover it, you pick fewer.',
          'Gold can be blocked by the robber like any other tile. Gold fields never produce Paper, Cloth or Coin.',
        ],
      },
    ],
  },

  // ── 2. Setup ────────────────────────────────────────────────────────────────
  {
    id: 'setup',
    title: 'Setting up',
    applies: 'all',
    sections: [
      {
        title: 'Placing your starting pieces',
        body: [
          'Everyone places two settlements, each with one road next to it. Turn order runs forward and then backward (a snake): with 4 players the order is 1, 2, 3, 4, 4, 3, 2, 1.',
          [
            'On your turn, place a settlement on any legal corner, then a road on an edge touching that settlement.',
            'Starting settlements follow the distance rule (no building on a corner next to another building) and are never placed next to fog.',
            'Some maps limit where you may start. Black Forest starts in the forest ring. Vulcan, Crossroads, Far Shores, Veiled Isles, Ironbound and Zealand have marked starting areas, and your starting settlements must touch them.',
          ],
        ],
      },
      {
        title: 'What the second settlement gives',
        body: [
          'When you place your **second** settlement, you immediately receive 1 card for every resource tile touching it. A gold field gives you a free pick of any resource.',
          'In Knights & Barbarians your second starting building is a **city** instead of a settlement. It pays out resources only (no commodities).',
          'When everyone has placed both pieces, the first player in turn order takes the first turn.',
        ],
      },
      {
        title: 'Roads and ships in setup',
        body: [
          'In Voyagers and the Special maps, a starting settlement on the coast may launch a **ship** instead of a road. Starting roads and ships can reveal fog, and they collect treasures on maps that have them.',
        ],
      },
    ],
  },

  // ── 3. A turn ───────────────────────────────────────────────────────────────
  {
    id: 'turn',
    title: 'Taking a turn',
    applies: 'all',
    sections: [
      {
        title: 'Step by step',
        body: [
          [
            '**Roll the dice.** In Knights & Barbarians a third die (the event die) rolls with them.',
            '**Production.** Every tile matching the total produces. On a 7, nothing is produced and the robber comes into play (see The robber).',
            '**Build and trade in any order.** Build roads, settlements and cities, trade with other players or the bank, and play cards.',
            '**End your turn.**',
          ],
          'Building and trading are only possible after you have rolled.',
        ],
      },
      {
        title: 'Before you roll',
        body: [
          'Before rolling you can set an embargo (see Trading).',
          [
            'Classic and Voyagers (classic rules): you may play a development card before rolling.',
            'Knights & Barbarians: the only progress card you can play before rolling is the **Alchemist**. All other progress cards need the roll first.',
          ],
        ],
      },
      {
        title: 'Keyboard shortcuts',
        body: [
          [
            '**R** rolls the dice on your turn.',
            '**E** ends your turn (after you have rolled).',
            '**Esc** closes the open popup or build mode. **Enter** takes a popup\'s only option.',
          ],
          'The shortcuts only work when it is your turn and nothing is waiting for your decision.',
        ],
      },
      {
        title: 'Prompts',
        body: [
          'Some events ask players for a decision: discarding on a 7, moving the robber, picking gold. The game waits until everyone who owes a decision has made it.',
        ],
      },
    ],
  },

  // ── 4. Building ─────────────────────────────────────────────────────────────
  {
    id: 'building',
    title: 'Building',
    applies: 'all',
    sections: [
      {
        title: 'Costs and piece limits',
        body: [
          [
            '**Road:** 1 Brick + 1 Lumber. You have 15 roads.',
            '**Settlement:** 1 Brick + 1 Lumber + 1 Wool + 1 Grain. You have 5 settlements.',
            '**City:** 2 Grain + 3 Ore. You have 4 cities. It replaces one of your settlements.',
            '**Development card:** 1 Wool + 1 Grain + 1 Ore (Classic rules only; see Development cards).',
          ],
          'Paid cards go back to the bank. When you upgrade a settlement to a city, the settlement returns to your supply, so you can build it again.',
          'Knights & Barbarians adds knights, city walls and city improvements. Voyagers adds ships. See their chapters.',
        ],
      },
      {
        title: 'Roads',
        body: [
          [
            'A road must start from one of your own buildings, or continue one of your own roads.',
            'A road cannot pass through a corner where an opponent has a settlement, city or knight. Their building breaks the chain.',
            'Only one piece fits on an edge.',
          ],
        ],
      },
      {
        title: 'Settlements',
        body: [
          [
            'A settlement must connect to one of your own roads (or ships).',
            '**Distance rule:** you cannot build on a corner that already has a building, or that is next to a corner with a building, no matter who owns it.',
            'You cannot build where a knight stands.',
          ],
        ],
      },
      {
        title: 'Cities',
        body: [
          'A city can only replace one of your own settlements. It is worth 2 points instead of 1 and produces double (see Production).',
        ],
      },
      {
        title: 'Longest Road',
        body: [
          'The player with the longest continuous road of at least **5 segments** holds the Longest Road and gets **2 points**.',
          [
            'If another player builds a longer road, they take it. A tie does not take it from the holder.',
            'If the holder\'s road is cut and several other players are tied for longest, nobody holds it.',
            'An opponent\'s building or knight on a corner ends your road there.',
          ],
        ],
      },
    ],
  },

  // ── 5. Trading ──────────────────────────────────────────────────────────────
  {
    id: 'trading',
    title: 'Trading',
    applies: 'all',
    sections: [
      {
        title: 'Trading with players',
        body: [
          [
            'Trading opens after the roll.',
            'On your turn you can offer a trade to everyone, or to the players you choose. A trade needs cards on both sides, and you cannot offer a card for the same card.',
            'Players who are not on turn **cannot trade with each other**. They can only send a **counter-offer** to the player whose turn it is.',
            'Players answer by accepting or declining. When a player accepts your offer, you confirm which accepting player you trade with.',
            'If the player on turn accepts a counter-offer, the trade happens right away.',
            'You can have up to 6 open offers at a time. Open offers disappear when your turn ends.',
            'A player who does not have the cards you ask for declines automatically.',
          ],
        ],
      },
      {
        title: 'Embargo',
        body: [
          'You can put an **embargo** on a player at any time. Offers from them are declined for you automatically until you lift it. It does not stop you from sending them offers.',
        ],
      },
      {
        title: 'Trading with the bank',
        body: [
          'After rolling, you can trade with the bank:',
          [
            '**4:1** by default. Give 4 of one resource, get 1 of any other.',
            '**3:1** if you have a settlement or city on a generic harbor (marked 3:1).',
            '**2:1** for one resource if you have a settlement or city on that resource\'s harbor.',
          ],
          'You can trade several resources in one go, as long as each kind you give is a multiple of its rate. The bank must have the cards you ask for.',
        ],
      },
    ],
  },

  // ── 6. Robber ───────────────────────────────────────────────────────────────
  {
    id: 'robber',
    title: 'The robber',
    applies: 'all',
    sections: [
      {
        title: 'Rolling a 7',
        body: [
          'When the dice total 7, nobody receives resources. Instead:',
          [
            '**Discard:** every player holding **more than 7 cards** discards **half** of them, rounded down. The player chooses which. (In Knights & Barbarians each city wall raises your limit by 2.)',
            '**Move the robber:** the player who rolled moves the robber to a different tile. Fogged tiles cannot be chosen.',
            '**Steal:** if any other player has a building next to the robber\'s new tile, the roller picks one of them who holds cards and takes one random card from that player.',
          ],
          'While the robber stands on a tile, that tile produces nothing.',
          'In Knights & Barbarians, a 7 only makes players discard until the first barbarian attack has happened. The robber is not moved before that.',
        ],
      },
      {
        title: 'Friendly robber',
        body: [
          'The host can switch on the **friendly robber** in the lobby. Then the robber cannot be moved to a land tile touching a player with **2 or fewer** points that others can see (hidden victory point cards do not count).',
          'If every possible tile touches such a player, the rule is dropped for that move.',
        ],
      },
      {
        title: 'Other ways to move the robber',
        body: [
          'In Classic rules, playing a Knight card moves the robber the same way. In Knights & Barbarians, knights and the Bishop do it. See those chapters.',
        ],
      },
    ],
  },

  // ── 7. Development cards ────────────────────────────────────────────────────
  {
    id: 'devcards',
    title: 'Development cards',
    // Classic rules on any map (the in-game menu passes the map's type and the rules mode).
    applies: ['classic'],
    sections: [
      {
        title: 'Buying and playing',
        body: [
          'Development cards are used in Classic rules, including Voyagers and Special maps when Knights & Barbarians rules are off. Knights & Barbarians games use progress cards instead.',
          [
            'A card costs **1 Wool + 1 Grain + 1 Ore**. You draw the top card of the deck, and only you see it.',
            'The deck has **25** cards (**34** on the bigger maps): 14 Knights (20), 5 Victory Points, 2 Road Building (3), 2 Year of Plenty (3) and 2 Monopoly (3). The bigger counts are in brackets.',
            'You cannot play a card on the turn you bought it.',
            'You can play only **one** development card per turn. You can play it before or after rolling.',
            'Victory Point cards are never played. They count as soon as you hold them, and stay hidden until you win.',
          ],
        ],
      },
      {
        title: 'The cards',
        body: [
          [
            '**Knight:** move the robber and steal a card, as with a 7 (with no discards). In Voyagers you can move the pirate instead. Each Knight you play counts toward the Largest Army.',
            '**Road Building:** place up to 2 roads for free (or ships, in Voyagers). Fewer if you have none left to place or nowhere to put them.',
            '**Year of Plenty:** take any 2 resources from the bank (the bank must have them).',
            '**Monopoly:** name a resource. Every other player gives you all of their cards of that resource.',
            '**Victory Point:** 1 point.',
          ],
        ],
      },
      {
        title: 'Largest Army',
        body: [
          'The first player to play **3 Knights** takes the Largest Army, worth **2 points**. Another player takes it by playing strictly more Knights than the holder.',
        ],
      },
    ],
  },

  // ── 8. Knights & Barbarians ─────────────────────────────────────────────────
  {
    id: 'ck',
    title: 'Knights & Barbarians',
    // Knights & Barbarians rules on any map, Voyagers and Special ones included.
    applies: ['ck'],
    sections: [
      {
        title: 'Overview',
        body: [
          'This chapter applies when the game uses Knights & Barbarians rules: the Knights & Barbarians mode, Voyagers maps with the Knights & Barbarians rules switched on, and the Special maps Veiled Isles and Ironbound (which always use them).',
          'It replaces development cards and Largest Army with commodities, city improvements, knights, barbarians and progress cards. The default target is **13** points.',
        ],
      },
      {
        title: 'Commodities',
        body: [
          'There are three commodities: **Paper**, **Cloth** and **Coin**. A city next to the right terrain gives you one resource and one commodity instead of two resources:',
          [
            'City on **Forest**: 1 Lumber + 1 Paper.',
            'City on **Pasture**: 1 Wool + 1 Cloth.',
            'City on **Mountains**: 1 Ore + 1 Coin.',
            'City on **Hills** or **Fields**: 2 Brick or 2 Grain, as normal.',
          ],
          'Settlements still produce 1 resource. The bank holds 12 of each commodity (16 on the bigger maps).',
          'Commodities count as cards for the hand limit. They can be traded with other players and with the bank (4:1, 3:1 with a generic harbor, 2:1 with the Trading House). Resource harbors do not help with commodities.',
        ],
      },
      {
        title: 'City improvements',
        body: [
          'You need at least one city to build improvements. There are three tracks, each paid with its own commodity:',
          [
            '**Trade** (Cloth)',
            '**Politics** (Coin)',
            '**Science** (Paper)',
          ],
          'Level 1 costs 1 commodity, level 2 costs 2, and so on up to level **5**, which costs 5. Improvements are built after rolling.',
          'Reaching **level 3** in a track gives you an ability:',
          [
            '**Trade: Trading House.** Trade commodities with the bank 2:1.',
            '**Politics: Fortress.** You can promote knights to mighty.',
            '**Science: Aqueduct.** Whenever a production roll gives you nothing, you may take 1 resource of your choice. It does not work on a 7.',
          ],
          'Improvement levels also decide how often you draw progress cards (see Progress cards).',
        ],
      },
      {
        title: 'Metropolises',
        body: [
          'The first player to reach **level 4** in a track gets that track\'s **metropolis**. It sits on one of your cities and is worth **2 extra points**.',
          [
            'A player who reaches **level 5** before the holder does takes the metropolis away from them. A level 5 metropolis is permanent.',
            'You cannot build a level that would win a metropolis if you have no city without one.',
            'A city with a metropolis cannot be destroyed by the barbarians.',
          ],
        ],
      },
      {
        title: 'Knights',
        body: [
          'Each player owns **2 basic, 2 strong and 2 mighty** knights. Knights stand on corners, not tiles.',
          [
            '**Recruit:** 1 Wool + 1 Ore. A new knight is a basic knight and is inactive. It must go on an empty corner touching one of your roads (or ships). Knights ignore the distance rule.',
            '**Activate:** 1 Grain. Only active knights count for defense, and only active knights can act.',
            '**Promote:** 1 Wool + 1 Ore moves a knight up one level (basic to strong to mighty), once per knight per turn, and only if you have a piece of the next level left. Promoting to mighty needs the Politics Fortress (level 3).',
            '**Move:** an active knight can travel along your own roads and ships to an empty corner. It can pass through your own pieces but not through opponents\' buildings or knights. Moving makes it inactive.',
            '**Displace:** an active knight can move onto a corner held by an opponent\'s **weaker** knight. The owner of the displaced knight must move it along their own roads to another empty corner connected to where it stood. If there is no such place, the knight is removed.',
            '**Chase the robber:** an active knight standing next to the robber can make the robber move. The knight becomes inactive and you move the robber and steal as with a 7.',
          ],
          'A knight you activated this turn cannot move, displace or chase the robber until your next turn. Using Warlord to activate counts the same way.',
          'Opponent knights block your roads and break your Longest Road, like settlements do. You cannot build a settlement where a knight stands.',
        ],
      },
      {
        title: 'City walls',
        body: [
          'A city wall costs **2 Brick** and goes around one of your cities. Each city can have one wall and each player can have up to **3**.',
          'Each wall raises your hand limit by **2** when a 7 is rolled (from 7 to 9 with one wall, and so on).',
          'If a city is destroyed, its wall is lost too.',
        ],
      },
      {
        title: 'The event die',
        body: [
          'In Knights & Barbarians a third die rolls with the usual two. Its six faces show:',
          [
            '**Barbarian ship** (3 faces out of 6): the ship moves one step closer.',
            '**Trade, Politics or Science city gate** (1 face each): progress cards may be drawn (see Progress cards).',
          ],
          'The event die resolves first. Then the two dice produce resources, or the robber and discards happen on a 7.',
        ],
      },
      {
        title: 'The barbarians',
        body: [
          'Each ship face on the event die moves the barbarian ship one step along a track of **7** steps. On the 7th step the barbarians attack, before production on that roll.',
          [
            '**Barbarian strength** = the number of cities on the board, of all players (metropolises count).',
            '**Defense** = the sum of the levels of all active knights, of all players. Basic is 1, strong is 2, mighty is 3.',
          ],
          '**If the defense is at least the strength**, the island holds:',
          [
            'The player with the single highest contribution becomes **Defender of the Island** and gets 1 point.',
            'If several players tie for the highest, each of them draws a progress card from a deck of their choice instead.',
            'If nobody contributed, nobody is rewarded.',
          ],
          '**If the defense is lower**, the barbarians win. Among the players who own a city (without a metropolis), those with the lowest contribution each lose a city of their choice. It turns back into a settlement, and its wall is lost.',
          'After every attack all knights become inactive and the ship goes back to the start.',
          'Until the first attack, the robber stays off the board: a 7 still makes players discard, but nobody moves the robber, and knights and the Bishop cannot chase or move it.',
        ],
      },
      {
        title: 'Progress cards: drawing and playing',
        body: [
          [
            'When the event die shows a city gate, each player with at least 1 improvement level in that track whose **red die is at most their level + 1** draws a progress card from that track\'s deck. Players draw in turn order, starting with the player who rolled.',
            'You can hold at most **4** progress cards. Victory point cards (Printer and Constitution) are shown at once, count as 1 point each and do not take up space.',
            'You can play progress cards on your turn after rolling, as many as you like. The Alchemist is played before rolling.',
            'If you hold more than 4 at the end of your turn, you must discard one before the turn can end.',
            'Played cards go to the bottom of their deck.',
          ],
        ],
      },
      {
        title: 'Science cards (Paper, green)',
        body: [
          [
            '**Alchemist (2):** before rolling, choose the red and yellow dice yourself. The event die still rolls. The roll happens right away.',
            '**Crane (2):** your next city improvement this turn costs 1 commodity less.',
            '**Engineer (1):** build a city wall for free.',
            '**Inventor (2):** swap two number tokens. Not the 2, 12, 6 or 8.',
            '**Irrigation (2):** take 2 Grain for every Fields tile next to your buildings.',
            '**Medicine (2):** upgrade a settlement to a city for 2 Ore + 1 Grain.',
            '**Mining (2):** take 2 Ore for every Mountains tile next to your buildings.',
            '**Printer (1):** 1 point, revealed at once.',
            '**Road Building (2):** build 2 roads for free.',
            '**Smith (2):** promote up to 2 knights for free.',
          ],
        ],
      },
      {
        title: 'Politics cards (Coin, blue)',
        body: [
          [
            '**Bishop (2):** move the robber (only after the first attack) and take 1 random card from every player with a building next to it.',
            '**Constitution (1):** 1 point, revealed at once.',
            '**Deserter (2):** choose an opponent with knights. They remove one of their knights, and you may place a knight of the same level from your supply (or the strongest weaker one you have left) on an empty corner next to your roads.',
            '**Diplomat (2):** remove an open road (a road with one end not connected to anything of its owner), or move one of your own open roads.',
            '**Intrigue (2):** displace an opponent\'s knight standing on a corner that touches your roads. You need no knight of your own. Its owner moves it, and cannot put it back on the same corner.',
            '**Saboteur (2):** every opponent with at least as many points as you discards half their hand, rounded down.',
            '**Spy (3):** look at an opponent\'s progress cards and take one.',
            '**Warlord (2):** activate all your knights for free.',
            '**Wedding (2):** every opponent with more points than you gives you 2 cards of their choice (or fewer if they hold fewer).',
          ],
        ],
      },
      {
        title: 'Trade cards (Cloth, yellow)',
        body: [
          [
            '**Commercial Harbor (2):** give each opponent you choose 1 resource. Each who holds a commodity gives you 1 commodity back, their choice.',
            '**Master Merchant (2):** look at the hand of a player with more points than you and take 2 cards.',
            '**Merchant (6):** place the merchant on a land tile next to one of your settlements or cities. You trade that tile\'s resource 2:1 and get **1 point** while you hold the merchant. If another player plays a Merchant, they take it over.',
            '**Merchant Fleet (2):** for the rest of this turn, trade one card type of your choice 2:1.',
            '**Resource Monopoly (4):** name a resource. Every opponent gives you up to 2 of it.',
            '**Trade Monopoly (2):** name a commodity. Every opponent holding it gives you 1.',
          ],
        ],
      },
      {
        title: 'Points in Knights & Barbarians',
        body: [
          [
            'Settlement 1, city 2, metropolis +2.',
            'Longest Road 2.',
            'Defender of the Island 1 each time you earn it.',
            'Printer and Constitution 1 each.',
            'Merchant 1 while you hold it.',
            'There is no Largest Army.',
          ],
        ],
      },
    ],
  },

  // ── 9. Voyagers ─────────────────────────────────────────────────────────────
  {
    id: 'voyagers',
    title: 'Voyagers',
    applies: ['voyagers', 'special'],
    sections: [
      {
        title: 'Ships',
        body: [
          'Voyagers maps have open sea. You sail **ships** across it, and ships are built and used like roads.',
          [
            '**Cost:** 1 Wool + 1 Lumber. You have 15 ships.',
            'A ship goes on a sea edge or a coast edge (land on one side, sea on the other). Land-only edges take roads only.',
            'A ship must start from one of your own settlements or cities, or continue one of your own ships. A road does not connect to a ship: your road and ship networks only meet at your own settlements and cities.',
            'A settlement can be built at the end of a ship, as with a road.',
            'In setup, a coastal starting settlement may launch a ship. Road Building (card or treasure) may place ships instead of roads.',
          ],
        ],
      },
      {
        title: 'Moving ships',
        body: [
          [
            'Once per turn, after rolling, you may move **one** of your ships.',
            'A ship you built or moved this turn cannot be moved.',
            'Only an **open** ship can sail: one with an end that touches none of your other roads, ships or buildings. Ships in a closed route, where both ends meet your own pieces, are fixed.',
            'The ship moves to any place where a new ship could be placed after it has left.',
          ],
        ],
      },
      {
        title: 'Longest Trade Route',
        body: [
          'Roads and ships count together for the Longest Road (**5** segments, 2 points). A route can switch between roads and ships only at one of your own settlements or cities.',
        ],
      },
      {
        title: 'The pirate',
        body: [
          'The pirate is the robber of the sea. When you move the robber (a 7, or a Knight card), you may pick any tile, land or sea. A sea tile moves the pirate instead.',
          [
            'The pirate steals a random card from a player who has a ship on an edge of its tile, as the robber does from buildings.',
            'No ship can be built next to the pirate, and ships next to it cannot sail away. Ships already there keep counting.',
            'The pirate does not block production. The friendly robber setting only limits the robber on land, not the pirate.',
            'In Knights & Barbarians, the Bishop moves only the robber.',
          ],
        ],
      },
      {
        title: 'Island points',
        body: [
          'The islands where you place your starting buildings are your **home islands**. Your first settlement on every **other** island earns a bonus. The amount depends on the map (listed below and in the Special chapter).',
          'Fog, gold and harbors work as described in The basics.',
        ],
      },
      {
        title: 'Far Shores',
        body: [
          'Start on the big 19-tile island and sail for the small isles and their gold. There are two gold fields among the small isles.',
          [
            'Points to win: **14** in Classic rules, **17** with Knights & Barbarians.',
            '**2 points** for your first settlement on each small isle.',
          ],
        ],
      },
      {
        title: 'Four Realms',
        body: [
          'Four islands of 5 or 6 tiles each, with no desert. The robber starts on a 12 and the pirate in the sea between the islands.',
          [
            'Points to win: **13** in Classic rules, **16** with Knights & Barbarians.',
            'You can start both settlements on one island or on different islands. Each island that is not a home island is worth **2 points** for your first settlement there.',
          ],
        ],
      },
      {
        title: 'Playing Voyagers with Knights & Barbarians',
        body: [
          'On Voyagers maps the host can switch on the Knights & Barbarians rules in the lobby. Then the Knights & Barbarians chapter applies, and knights can stand along your ships\' routes too.',
        ],
      },
    ],
  },

  // ── 10. Special ─────────────────────────────────────────────────────────────
  {
    id: 'special',
    title: 'Special maps',
    applies: ['special'],
    sections: [
      {
        title: 'Special maps in general',
        body: [
          'The Special maps use the Voyagers ship rules and add fog, gold and treasures. The Voyagers chapter covers ships and the pirate.',
        ],
      },
      {
        title: 'Treasures',
        body: [
          'Some Special maps have treasure chests on corners of the board. A ship that ends on a treasure\'s corner collects it. It can be a newly built ship, a ship you move there, or a starting ship. Every treasure is one of four kinds:',
          [
            '**A resource of your choice** from the bank.',
            '**Road Building:** place 2 free roads or ships.',
            '**Three resources:** 1 Brick + 1 Wool + 1 Grain.',
            '**A card.** In Classic rules, the top development card, which you cannot play this turn. With Knights & Barbarians rules, a progress card from the deck of your choice.',
          ],
        ],
      },
      {
        title: 'Veiled Isles',
        body: [
          'Knights & Barbarians rules only, up to 4 players, **16** points to win.',
          [
            'You start on the standard-sized island. It is surrounded by sea with 15 fogged tiles scattered around it.',
            'The fog hides 0 to 2 sea tiles, 0 or 1 gold fields, and otherwise resource tiles (never desert) with random numbers.',
            '15 treasures lie at fixed spots around the island: 5 resource, 4 Road Building, 3 three-resource and 3 card treasures, shuffled each game.',
            'Uncovering a hidden sea tile pays a bonus treasure of a random kind.',
            'Your first settlement on each island that is not a home island is worth **1 point**.',
          ],
        ],
      },
      {
        title: 'Ironbound',
        body: [
          'Knights & Barbarians rules only, up to 6 players, **16** points to win.',
          [
            'Six isles of five tiles each circle a great island. You start on the isles, which have no Ore, and three 3:1 harbors each.',
            'The great island has a gold field in the middle (a 6 or an 8), a ring of six forests, ponds with 2:1 Lumber harbors, fog and desert, and an outer rim of Ore.',
            'The robber starts on a desert and the pirate starts in the open sea.',
            'Your first settlement on each island that is not a home island is worth **1 point**.',
          ],
        ],
      },
      {
        title: 'Zealand',
        body: [
          'Classic or Knights & Barbarians rules, up to 4 players, **16** points to win either way.',
          [
            'Everyone starts on a ring of 18 Pasture tiles around a lake. Twelve 2:1 Wool harbors line its shore.',
            'Six isles of 10 fogged tiles each lie out at sea. Twelve more harbors line their coasts, a 3:1 and a 2:1 on every isle.',
            'The host can turn the **two gold fields** in the fog on or off. Each gold field is a 6 or an 8.',
            'The robber starts on a lone desert island far out at sea. Sailing there pays three treasures. Every isle has three treasures too, 21 in all, each of a random kind.',
            'Your first settlement on each island that is not a home island is worth **1 point**.',
          ],
        ],
      },
    ],
  },

  // ── 11. Maps ────────────────────────────────────────────────────────────────
  {
    id: 'maps',
    title: 'Base game maps',
    applies: 'all',
    sections: [
      {
        title: 'Maps',
        body: [
          'The maps below work with both Classic and Knights & Barbarians rules. The target is 10 points in Classic and 13 in Knights & Barbarians unless the host changes it.',
          [
            '**Standard (up to 4 players):** the 19-tile island.',
            '**Large (up to 6):** 30 tiles with two deserts, 28 numbers and 11 harbors. The bank is bigger (24 of each resource) and so is the development deck (34 cards).',
            '**Black Forest (up to 6):** you start inside a ring of forest around a desert island in a lake. 30 tiles further out lie under fog until you explore, including two gold fields on a 6 or an 8. The host can turn the gold off, and two other resources take its place.',
            '**Gold Rush (up to 6):** a ring island around seven tiles of fog, one of them a gold field on a 6 or 8. Build inward to find it. The fog only hides good numbers (4 to 10).',
            '**Vulcan (up to 4):** you start in the four far corners, which have every resource except Ore. Ore lies only around the volcano in the middle, a gold field, and 18 tiles of fog cover the area between. The fog never hides a desert.',
            '**Heartlake (up to 4):** a ring island of 18 tiles around a lake, with 17 numbers and no 12. Three 3:1 harbors line the lake shore, and six more harbors line the sea coast.',
            '**Long Isle (up to 4):** a long, thin island with more coast and more harbors within reach, and tighter races for the Longest Road.',
            '**Four Lakes (up to 6):** a big pinwheel island of 39 tiles with four lakes cut into it and harbors on their shores. One desert.',
            '**Crossroads (up to 4):** four home regions of seven tiles meet at a desert center. Each region links to the center through two weakly numbered tiles (2, 3, 11 or 12). Claim the narrow roads between them.',
          ],
          'Large, Black Forest, Gold Rush, Vulcan, Four Lakes, Crossroads, Ironbound and Zealand use the bigger bank and deck.',
        ],
      },
    ],
  },

  // ── 12. Table ───────────────────────────────────────────────────────────────
  {
    id: 'table',
    title: 'This table',
    applies: 'all',
    sections: [
      {
        title: 'Table options',
        body: [
          'The host sets these in the lobby before the game starts:',
          [
            '**Mode / map:** Classic, Knights & Barbarians, Voyagers or Special, and one of its maps.',
            '**Seats:** from 2 up to the map\'s maximum.',
            '**Points to win:** 3 to 20.',
            '**Friendly robber:** see The robber.',
            '**Gold fields in the fog:** on Black Forest and Zealand. Off unless the host switches it on.',
            '**Allow spectators:** on or off.',
          ],
        ],
      },
      {
        title: 'Balanced dice',
        body: [
          'With **Balanced** dice, rolls are drawn from a bag instead of thrown. The bag holds all 36 combinations of two dice, and each draw takes one out. So over a game, every total shows up close to its normal odds, and 6, 7 and 8 stay the most common.',
          [
            'The bag is refilled with all 36 while 12 are still left in it, so counting cards never tells you for sure what comes next.',
            'A draw that would repeat the previous total counts as 70% as likely.',
          ],
          'With **Random** dice, each roll is two fair dice thrown fresh.',
        ],
      },
      {
        title: 'Turn timer',
        body: [
          'The host can set a turn timer of 60, 90, 120 or 180 seconds, or turn it off. When time runs out, autopilot plays the move for you.',
          [
            'The clock only runs when **two or more people** sit at the table. Bots do not count as people.',
            'Decisions like a discard, the robber or a setup placement get a shorter window: at most 45 seconds.',
            'In the last 10 seconds (the red zone), if you make a move, you earn 5 extra seconds on that decision.',
          ],
        ],
      },
      {
        title: 'Autopilot',
        body: [
          'If you disconnect and have not come back within about 20 seconds, autopilot plays for you so the table does not wait. If you leave the game from the room, autopilot takes over right away.',
          'When you come back to the game, you take over again.',
        ],
      },
      {
        title: 'Leaving or abandoning',
        body: [
          [
            '**Leaving** a game in progress only hands your seat to autopilot. You can return to it.',
            '**Abandoning** a game from the main menu gives your seat to a bot for good. It counts as a **forfeit**: you finish in last place, and you lose an extra **15** rating points on top of that. You can never gain rating from a game you abandoned.',
          ],
        ],
      },
      {
        title: 'Rating',
        body: [
          [
            'Only **signed-in players** are rated, and only in games with **at least two** of them. Bots and guests are never rated.',
            'Each game type (Classic, Knights & Barbarians, Voyagers, Special) has its own rating. Everyone starts at 1000.',
            'Each pair of rated players is a duel decided by final standing: the winner beats everyone, and the others are ordered by points. Equal points are a draw.',
            'New players move faster while their rating settles.',
          ],
        ],
      },
    ],
  },
];
