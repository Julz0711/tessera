# Tessera board themes: 3D and 2D inventory

What every board theme draws, in 3D and 2D, with the source of each piece. Written 2026-10-03 during a review pass; items marked **Fixed** in "Suspicious spots" were corrected in that pass (line numbers may have shifted slightly since).
Path shorthand (all under `src/`):

- `T3/` = `components/board3d/themes/`, `B3/` = `components/board3d/`
- `T2/` = `components/board2d/themes/`, `B2D` = `components/board2d/Board2D.tsx`
- `PAL` = `client/themes.ts`
- Line numbers are `file:line` of the component/function that draws the thing.

## How themes work

**Ids and palettes.** `BOARD_THEMES` (PAL:9-20) lists classic, night, sakura, nordic, frontier, nile, skyport, cyberpunk, orbital, origami. `PALETTES[id]` (PAL:~101-343) is shared by both boards: tile colours per terrain (`top`, `side`, `accent`), `fog`, `sea` (shallow/deep/shelf/sky/foam), `beach`, `token`, `light` (hemi/ambient/sun/`haze`/`sunPosition`), `sea2d` gradient + optional `sea2dPattern`, optional `pier` colours, optional `gloom2d` (Night, Cyberpunk), `swatch`. Gold is the same `GOLD` triple in every theme (PAL:~97). The 3D backdrop and fog colour is `palette.sea.sky` (B3/Board3D.tsx:265, 284); fog distance is scaled by `light.haze` (284); sun uses `light.sunPosition ?? [5,12,6]` (288).

**3D registry.** `KITS: Record<BoardThemeId, ThemeKit>` at T3/index.tsx:12 (`classic: {}`). Board3D provides `BoardThemeContext`; pieces call `useBoardKit()`. Every `ThemeKit` field (T3/types.ts:43-98) is optional and falls back to the classic model: `Settlement ?? ClassicSettlement` (B3/pieces.tsx:73), `City ?? ClassicCity` (88), `Robber ?? ClassicRobber` (190), `CityWall ?? ClassicCityWall` (149), `Knight ?? KnightFigure` (B3/knights.tsx:177), `BarbarianShip ?? Longship` (B3/barbarians.tsx:160), `Sea ?? Ocean` (B3/ocean.tsx:10), `props?.() ?? classicProps()` (B3/terrain.tsx:283; a theme `props()` returning `null` for a terrain also falls back). `Road`, `Harbor`, `Tile`, `Base` are pure add-ons (nothing when unset). `Tile` is skipped on fogged tiles, `Base` is drawn on fogged tiles too (terrain.tsx:421-428). **Not themable in 3D:** MetropolisTower (pieces.tsx:155), Merchant (169), fog clouds (terrain.tsx:288), number token (palette only). Voyagers pieces use a separate, complete registry `VOYAGE_KITS` (T3/voyage.tsx:370; wrapper B3/voyage.tsx).

**2D registries** (T2/index.ts): `THEME_GLYPHS` (tile art, lines 70-79; Night and Classic absent), `THEME_BARBARIAN_SHIPS` (82-92; Classic absent), `THEME_PIECES` (98-108: settlement/city/road/knight; Classic absent), plus the complete `VOYAGE_GLYPHS` (T2/voyage.tsx:~365). Fallback rule in Board2D: `THEME_GLYPHS[theme]?.(...) ?? <TerrainGlyphs/>` (B2D:1010; a glyph returning `null` falls back per terrain), `THEME_PIECES[theme]?.x || classicX` (B2D:373, 397, 425, 458), `THEME_BARBARIAN_SHIPS[theme] ?? classicShip` (B2D:688). **Not themable in 2D:** robber (B2D:513), city wall (344), metropolis marker (B2D:1248), merchant (1306), fog glyphs (238), harbor art (1075; only the pier line colour comes from the palette). Ghost roads in every theme fall back to the plain `RoadBase` line (T2/shared.tsx:154); in 3D every theme's `Road` decor returns null for ghosts.

**Documented footprints.** 3D: ModelProps y=0 is the tile top (T3/types.ts:11), roads' y=0 is 0.06 above tile (types.ts:54), barbarian ship ~0.75 long, 0.55 tall after the 1.7 wrapper scale, wall ~0.33 radius. 2D: house ~34x31, city ~52x43, knight emblem ~26x29, barbarian ship ~60 wide (T2/types.ts:15-46). Board size scale `k` is 0.8 / 1 / 1.25 (client/prefs.ts:48).

## Classic (reference; also the fallback for everything a theme does not override)

### Classic 3D

| Category | What it is | Source |
|---|---|---|
| settlement | Box house 0.24x0.18x0.24 in owner colour, 4-sided pyramid roof (cone r0.21 h0.16, rot 45deg) in dark tone | B3/models.tsx:7 `ClassicSettlement` (GEO in B3/materials.ts:34-35) |
| city | Wide base box 0.42x0.18x0.26 (offset +0.04), taller tower box 0.19x0.34x0.19 at x-0.1 with pyramid roof, small pyramid roof on the base at x+0.1 | B3/models.tsx:15 `ClassicCity` |
| road | Box 0.62x0.09x0.13 in owner colour, thickened by Board size; an end at a walled city is cut back to stop at the wall (`walled`) | B3/pieces.tsx:54 `Road` |
| metropolis | Tall box tower 0.13x0.46 + pyramid roof + pole + 0.12x0.07 flag (trade gold / politics blue / science green) behind and right of the city at (+0.17k, -0.29k), in the gap between road directions. Same in every theme | B3/pieces.tsx:155 `MetropolisTower` |
| city wall | Hexagonal sandstone ring (r0.32-0.35, h0.11), dark torus top and 6 crenel blocks, rotated 30deg | B3/pieces.tsx:121 `ClassicCityWall` |
| knight | Low-poly armoured figure ~0.6 tall (legs, torso, tabard/cape in owner colour, helmet with visor/face disc, plume, round shield, sword); base plinth + gold studs by level; 1-3 figures per level | B3/knights.tsx:100 `KnightFigure`, 142 `KnightModel`, formation 79 |
| barbarian ship / track | Viking longship: box hull + cone bow/stern, torus prow curl, mast, striped sail, 6 round shields; hex "sea-step" plates (landing step glows orange / red in danger), dark field, status sign | B3/barbarians.tsx:107 `Longship`, 48 `Step`, 68 `Field`, 89 `StatusSign` |
| player ships | Sailboat: block hull, keel, mast, one square sail | T3/voyage.tsx:65 `Sailboat`, kit 86 |
| robber | Dark cone body + icosahedron head | B3/models.tsx:36 `ClassicRobber` |
| pirate | Same sailboat in dark grey, dark sail | T3/voyage.tsx:88 |
| treasure (Veiled Isles) | Wooden chest with round lid and gold lock | T3/voyage.tsx:76 `Chest`, 89 |
| harbors / piers | Rate sign out from the coast edge (0.62; 0.34 over a board sea hex or pond, 0.22 when two harbors face one water hex: `harborAnchor`, board/harbor.ts). Plank bridges from both coast corners, pier deck box 0.46x0.05x0.22, 2 posts, sign pole + disc with rate texture; wood colours unless `palette.pier` | B3/pieces.tsx:215 `HarborPiece`, WOOD_PIER 212 |
| forest | Two rings of cone firs and round broadleaf trees + 3 stacked logs | B3/terrain.tsx:15 `classicProps`, case at 22 |
| hills (brick) | Beehive clay kiln (dome, mouth, flue), clay mounds, clay pit with small wooden crane + bucket, 3x2 brick stack, grass tufts | terrain.tsx:43 |
| pasture (wool) | Grass tufts, 3 sheep (blob body + box head), short post-and-rail fence, one round tree | terrain.tsx:79 |
| fields (grain) | Three ploughed plots with wheat rows, a conical haystack, round bales | terrain.tsx:101 |
| mountains (ore) | Up to 3 small snowy cone peaks in back corners + rocks | terrain.tsx:132 |
| gold | Heaps of metallic nuggets between dark rocks, plus twinkling sparkles (`GoldSparkles`, same in all themes) and emissive tile top | terrain.tsx:145; sparkles 311; emissive top 395 |
| desert | Dunes, one cactus with arm, stones | terrain.tsx:169 |
| sea / water | Faceted low-poly ocean, lighter shelf fading into deep, horizon ring to 600 | B3/ocean.tsx:41 `Ocean` |
| fog | Puffs of cloud (7 icosahedrons, palette `fog.cloud` + `#e3e7ec`) over a fog-coloured tile. Same in all themes | terrain.tsx:288 `FogClouds` |
| palette | Sunny: sea `#3e97ad`/`#1c5f73`, sky `#0b2530`, sun `#fff4e0` x1.9, hemi 0.9 | PAL:~103-112 |

### Classic 2D

| Category | What it is | Source |
|---|---|---|
| settlement | Single gabled-house path, 34 wide, y-17..y+14, owner fill + dark outline 3.5 | B2D:312 `classicSettlement` |
| city | Keep + stepped tower silhouette, 52 wide, y-27..y+17 | B2D:326 `classicCity` |
| road | Dark-bordered owner-colour line (ghost: single thinner line) | T2/shared.tsx:154 `RoadBase` |
| metropolis | Gold disc r9 at (+21,-26) from the city centre, all themes | B2D:1248 |
| city wall | Rampart block 80 wide (x-40..+40, y-3..y+25) with end merlons, drawn behind the city in owner colour. All themes | B2D:344 `CityWallBlock` |
| knight | Fixed disc r23 (gold when active) with a shield-crest emblem 26 wide, plus level pips | emblem B2D:434; disc 1280-1295 |
| barbarian ship | Longship: hull path, curled prow, striped sail, 3 shields, ~66 wide | B2D:652 `classicShip`; track B2D:731 `BarbarianTrack2D` |
| player ships / pirate / treasure | Sailboat with two sails (60 wide); pirate = dark sailboat + skull dot; chest | T2/voyage.tsx:43, 64-75 |
| robber | Dark bell-shaped body + head circle with ground shadow, below the token (hex y+46) | B2D:513 `RobberFigure`, placed 1340-1344 |
| harbors | Dashed pier lines from both corners + a small sailboat with rate sail ("3:1" / "2:1" + resource dot) | B2D:1075-1145 |
| tile art | 5 anchor spots (-40,-34) (40,-34) (-50,22) (50,22) (0,52) with firs, hill mounds, 2 sheep + grass, wheat strokes, grey peaks, nuggets, dune arcs + cactus | B2D:50 `TerrainGlyphs` |
| fog | 3 clouds + "?" | B2D:238 `FogGlyphs` |
| sea | CSS gradient `sea2d` + faint wave lines container-painted (`.sea-2d`); foam polygons 1.26x, beach 1.12x | B2D:~948-965 |

Classic palette: PAL:~100-113 (`sea2d ['#3e97ad','#2c7d93','#1c5f73']`).

---

## night

Palette (PAL:~115-130): dark blue sea `#173553`/`#081326`, sky `#03060d`, dim moonlight (hemi 0.34, ambient 0.05, sun `#d9deec` x0.7, haze 0.8), muted tile colours, fog `#5f6778`, `gloom2d` (shade `#040a1a` opacity 0.45, one warm lamp light).

### night 3D (T3/night.tsx; kit line 299 = `{ Settlement, City, Road, Tile, BarbarianShip, Knight, CityWall }`)

| Category | What it is | Source |
|---|---|---|
| settlement | Classic house + two glowing amber windows (front and side) + warm light pool decal (not on ghost) | night.tsx:174 `Settlement` |
| city | Classic city + 3 glowing windows + larger light pool | night.tsx:186 `City` |
| road | Small lantern on a post beside the road at (0.12, 0, 0.09), not on ghost | night.tsx:236 `Road` |
| metropolis | classic fallback | pieces.tsx:155 |
| city wall | Classic stone ring + crenels, glowing torch (post + flame) on alternate corners, owner-colour banner on the front crenel | night.tsx:210 `CityWall` |
| knight | Classic figure but the shield is replaced by a held glowing lantern (cage, roof, handle) | night.tsx:96 `Knight` |
| barbarian ship | Longship with dark hull `#3a2c1c`, dark-blue sail, glowing lanterns on posts at bow and stern | night.tsx:52 `BarbarianShip` |
| player ships | Sailboat with cream sail + glowing amber stern lantern block | T3/voyage.tsx:98 |
| robber | classic fallback | n/a |
| pirate | Dark sailboat with a red glowing stern lantern | voyage.tsx:105 |
| treasure | Chest with a glowing plaque on its front | voyage.tsx:111 |
| harbors | classic pier (wood) | n/a |
| forest, pasture, fields, hills, mountains, desert, gold | classic props (no `props` override); darkened palette only | n/a |
| per-tile light | Campfire (2 logs, flickering flame + ember, large pool) on forest/desert/mountains; lamp post with glowing lantern + cap on hills/pasture/fields; none on gold. Placed at a back corner r0.64 | night.tsx:275 `Tile`, spot 267 |
| sea | classic Ocean in dark colours | n/a |
| fog | classic clouds (grey-blue) | n/a |

### night 2D (T2/night.tsx; registered in THEME_PIECES and THEME_BARBARIAN_SHIPS only)

| Category | What it is | Source |
|---|---|---|
| settlement | Classic house path + small warm Glow at (x, y+5) | night.tsx:8 |
| city | Classic city path + two warm Glows | night.tsx:19 |
| road | classic fallback (RoadBase) | n/a |
| metropolis / city wall / robber / harbors / fog | classic (not themable) | n/a |
| knight | Classic crest + warm Glow at (x+13, y+2) | night.tsx:31 |
| barbarian ship | Classic longship shape, near-black hull, dark-blue sail, two glowing lanterns on the sail | night.tsx:44 `nightShip` |
| player ships / pirate / treasure | Sailboat with a lantern halo and glowing lantern (pirate: red) / chest with glow halo | T2/voyage.tsx:77 |
| tile art (all terrains) | classic `TerrainGlyphs` in night colours; no THEME_GLYPHS entry | n/a |
| overlay | Gloom: each hex dimmed by a dark polygon (gold and paying tiles stay bright), a lamp + radial glow at a far corner per non-fog tile, a glow under every building | B2D:542 `Gloom`, palette gloom2d |
| sea | `sea2d` dark blue gradient, default wave lines | PAL |

---

## sakura

Palette (PAL:~131-148): deep navy sea `#2e5b85`/`#1f3a5f`, sky `#1a2440`, forest top green but accent blossom pink `#ee9fb8`, desert pale `#e6dcc6`, cream beach `#ece2c8`, warm light `#ffe8dc` x1.85. Swatch uses blossom pink for forest.

### sakura 3D (T3/sakura.tsx; kit line 394 = `{ props, Settlement, City, Robber, Road, BarbarianShip, Knight, CityWall }`)

| Category | What it is | Source |
|---|---|---|
| settlement | Tea house: stone base, room in owner colour with 3 paper sliding doors, wooden veranda on 2 posts, hip-and-gable (irimoya) roof in the dark owner tone (flared eave + hip + small gable, dark ridge) | sakura.tsx `Settlement` (`TEA`) |
| city | Five-part pagoda: 3 stacked box tiers (0.30, 0.22, 0.15) each under a wide cone roof (r0.34/0.27/0.20, bottom eave ~0.48 wide) + finial, 0.6 tall | sakura.tsx:262 `City` (geo 238-244) |
| road | Three wooden boardwalk slats, a tiny paper lantern on a stone post beside it (0.25, 0.17), two pink petals; not on ghost | sakura.tsx:372 `Road` |
| metropolis | classic fallback | n/a |
| city wall | Red-lacquered fence ring (r0.31-0.34, h0.10), dark coping torus, 6 dark roof-tile blocks, paper lantern glowing in owner colour at the front | sakura.tsx:286 `CityWall` |
| knight | Samurai: lamellar kusazuri skirt, kabuto helmet bowl with flared wings and gold crescent crest, sheathed katana at the hip | sakura.tsx:315 `Knight` |
| barbarian ship | Japanese junk: wide box hull, raised stern castle, red battened sail | sakura.tsx:59 `BarbarianShip` |
| player ships | Junk with ribbed fan sail (triangle + ribs) | voyage.tsx:121 `Junk`, 136 |
| robber | Bandit hiding under a wide straw hat (cloak cone, head, cone hat r0.21) | sakura.tsx:352 `Robber` |
| pirate | Junk, dark hull, dark-red sail | voyage.tsx:138 |
| treasure | Red lacquer chest with black lid band and gold disc clasp | voyage.tsx:139 |
| harbors | classic pier (wood) | n/a |
| forest | Cherry-blossom canopies in 4 pinks (every 4th tree a dark pine) + fallen petals | sakura.tsx:92 |
| pasture | Classic tufts and sheep + 1-2 glowing stone lanterns (toro) in place of the fence | sakura.tsx:154 |
| fields | Three flooded rice paddies (teal water slabs with rows of rice tufts) | sakura.tsx:174 |
| hills | Potter's yard: climbing kiln (3 chambers on a stepped earthen ramp, flue), glazed pots (3), clay mound, brick stack | sakura.tsx:113 |
| mountains | One big snow-capped volcano (scale 0.62, crater) at a back corner + loose rocks | sakura.tsx:191 |
| desert | Zen rock garden: 3 concentric raked-sand tori, a vermilion torii gate (scale 1.3) back-left of centre (clear of the robber), 3 dark stones | sakura.tsx:204 |
| gold | classic props | sakura.tsx:227 |
| sea | classic Ocean (blue palette) | n/a |
| fog | classic clouds | n/a |

### sakura 2D (T2/sakura.tsx)

| Category | What it is | Source |
|---|---|---|
| settlement | Tea house: stone base, dark timber front with 3 paper doors, hip-and-gable roof in owner colour with up-flicked eave tips (46 wide) | sakura.tsx `sakuraSettlement` |
| city | Two-tier pagoda, two overhanging roofs (half 24 and 16) + finial dot | sakura.tsx:26 |
| road | Classic road + three crossing plank ties; ghost = plain | sakura.tsx:40 |
| metropolis / city wall / robber / harbors / fog | classic (not themable) | n/a |
| knight | Kabuto helmet with crescent crest | sakura.tsx:57 |
| barbarian ship | Junk: wide hull, boxy stern castle, red battened rectangular sail | sakura.tsx:143 `sakuraShip` |
| player ships / pirate / treasure | Junk with fan sail / dark junk + skull / red lacquer box | voyage.tsx:103-133 |
| forest | Pink blossom puffs (3 circles) on short dark trunks at all 5 spots | sakura.tsx:82 |
| fields | Paddy bund squares with rice tufts at 5 spots | sakura.tsx:99 |
| mountains | One large snow-capped peak at spot 1 | sakura.tsx:114 |
| desert | Three raked-sand arcs + 3 dark stones | sakura.tsx:124 |
| hills, pasture, gold | classic glyphs (hills/pasture recoloured by palette) | falls through, return null at 201 |
| sea | `sea2d` blue gradient, default lines | PAL |

---

## nordic

Palette (PAL:~149-166): teal sea `#2c5553`/`#152e2d`, sky `#0d1b22`, spruce forest, purple heather pasture, white-ish desert (tundra) `#dde8ee`, cool light `#eaf1ff` x1.7, grey beach.

### nordic 3D (T3/nordic.tsx; kit line 466 = `{ props, Settlement, City, Robber, Harbor, Road, BarbarianShip, Knight, CityWall }`)

| Category | What it is | Source |
|---|---|---|
| settlement | Longhouse: plinth, body 0.19x0.14x0.34, steep gable roof 0.21x0.4 long, 0.2 high (peak 0.35) | nordic.tsx:292 `Settlement` (geo 30-34, `gableRoof` shared.tsx:17) |
| city | Stave church: plinth, classic city base box, taller tower 0.2x0.18 with two stacked pointed roofs (cone r0.15 + r0.08), small hip roof on the base | nordic.tsx:303 `City` (geo 36-41) |
| road | Five split-log corduroy cylinders across the road + a tiny runestone beside it (0.26, 0.04, 0.11); not on ghost | nordic.tsx:451 `Road` |
| metropolis | classic fallback | n/a |
| city wall | Palisade of 14 upright sharpened logs (r0.33, h0.2 + tip), owner-colour round shield with gold boss hung at the front | nordic.tsx:401 `CityWall` |
| knight | Viking: horned dome helmet with brow bars, mail torso, cape, round shield with plank cross, long-hafted axe | nordic.tsx:352 `Knight` |
| barbarian ship | Dark drakkar: lens-shaped extruded hull, dragon-head stem with glowing eyes, curled stern post, mast + striped dark sail, 8 shields, 6 oars | nordic.tsx:101 `BarbarianShip` |
| player ships | Longship: long block hull, raised stem/stern posts, row of shield discs, striped square sail in owner colour | voyage.tsx:150 `Longship`, 169 |
| robber | Lumbering mossy troll (icosahedron body + head + club) | nordic.tsx:324 `Robber` |
| pirate | Dark longship with a dragon cone on the prow | voyage.tsx:171 |
| treasure | Dark wooden chest with steel lock | voyage.tsx:172 |
| harbors | Pier + a mooring post flying a painted round shield (turns to camera) at local x 0.37, off one end of the pier's long axis | nordic.tsx:422 `Harbor` |
| forest | Dense dark 3-tier spruce (cone, cone, tip); every 5th a white birch; logs | nordic.tsx:161 |
| pasture | Purple heather tufts (scale 0.85), classic sheep, 3-block dry-stone wall | nordic.tsx:194 |
| fields | Barley plots with 2 low stone walls each, haystack, bales | nordic.tsx:213 |
| hills | Classic kiln props + extra green turf cap flattened on the kiln dome | nordic.tsx:184 (reuses `classicProps`) |
| mountains | Up to 3 grey peaks with bright snow + one blue glacier ice shard | nordic.tsx:246 |
| desert | Frozen tundra: white snow drifts (flat domes), 3 standing rune stones (tall boxes), pale stones | nordic.tsx:263 |
| gold | Classic heaps + a grassy burial mound | nordic.tsx:276 |
| sea | classic Ocean (dark teal) | n/a |
| fog | classic clouds | n/a |

### nordic 2D (T2/nordic.tsx)

| Category | What it is | Source |
|---|---|---|
| settlement | Longhouse gable end: walls, steep gable, crossed bargeboards over the ridge, door (36 wide) | nordic.tsx:25 (helper `Gable` 8) |
| city | Great hall + smaller hall behind, both with crossed bargeboards (55 wide) | nordic.tsx:35 |
| road | Classic road + 4 dark log-end dots | nordic.tsx:46 |
| metropolis / city wall / robber / harbors / fog | classic (not themable) | n/a |
| knight | Horned viking helmet; horns reach x+-19 (38 wide) | nordic.tsx:61 |
| barbarian ship | Dark drakkar with a dragon head on a curved neck, black/white halves sail | nordic.tsx:172 `nordicShip` |
| player ships / pirate / treasure | Longship with striped sail / dark with dragon head / chest with rune marks | voyage.tsx:135, 152 |
| forest | 3-tier narrow spruce at spots 0,2,4; white birch with light canopy at 1,3 | nordic.tsx:84 |
| pasture | Classic sheep + purple heather dot clusters | nordic.tsx:107 |
| mountains | Classic peaks with enlarged snow caps | nordic.tsx:134 |
| desert | Snow drifts (dune arcs recoloured white) + 3 rune stones | nordic.tsx:149 |
| hills, fields, gold | classic glyphs | default null 166 |
| sea | `sea2d` teal gradient | PAL |

---

## frontier

Palette (PAL:~167-188): turquoise sea `#4b8aa0`/`#24566a`, sky `#2b1d18`, pale sandstone desert `#dfb48c`, warm fog `#e3d6c2`, golden-hour light (sun `#ffd49a` x1.95 at `[8,7,4]`), brown token.

### frontier 3D (T3/frontier.tsx; kit line 417 = `{ props, Settlement, City, Robber, Road, BarbarianShip, Knight, CityWall }`)

| Category | What it is | Source |
|---|---|---|
| settlement | Log cabin: box with dark log course bands, steep gable roof, stone chimney, door | frontier.tsx:203 `Settlement` (geo 194-200) |
| city | Saloon: hall + tall false front with step, sign, porch + posts, and a water tower on 4 legs beside it (x+0.2) | frontier.tsx:238 `City` |
| road | Railroad: 5 wooden ties + 2 steel rails; not on ghost | frontier.tsx:364 `Road` |
| metropolis | classic fallback | n/a |
| city wall | Fort stockade of 16 sharpened pickets (gate gap at the front with 2 posts + beam), owner-colour sign above the gate | frontier.tsx:274 `CityWall` |
| knight | Sheriff: duster coat cone, vest, tin star, bare head (face disc only if uploaded), wide-brim hat, slung rifle | frontier.tsx:330 `Knight` |
| barbarian ship | Outlaw paddle steamer: white box hull, red deck cabin, 2 smokestacks with smoke puffs, stern wheel | frontier.tsx:397 `BarbarianShip` |
| player ships | Paddle steamer: hull, cabin, smokestack, torus stern wheel | voyage.tsx:177 `Steamer`, 195 |
| robber | Outlaw: long coat cone, head, red bandana, wide brim hat | frontier.tsx:303 `Robber` |
| pirate | Dark steamer with a black flag | voyage.tsx:197 |
| treasure | Steel strongbox with dark band | voyage.tsx:198 |
| harbors | classic pier (wood) | n/a |
| forest | Tall narrow ponderosa pines (3 cones), stump, log pile | frontier.tsx:50 |
| pasture | Prairie tufts, classic sheep, split-rail fence (2 rails), windpump (tower, wheel, hub, tail vane) | frontier.tsx:90 |
| fields | Tall corn rows (x1.5 high), scarecrow in a back gap, bales | frontier.tsx:116 |
| hills | Adobe yard: beehive horno, rows of drying mud bricks, clay mound | frontier.tsx:69 |
| mountains | 2 granite peaks + timber-framed silver mine mouth with rails and ore cart | frontier.tsx:145 |
| desert | Red-rock mesa with cap, saguaro with upturned arms, cow skull with horns, sandstone drifts | frontier.tsx:166 |
| gold | classic props (default null, 187) | n/a |
| sea | classic Ocean | n/a |
| fog | classic clouds (warm cream) | n/a |

### frontier 2D (T2/frontier.tsx)

| Category | What it is | Source |
|---|---|---|
| settlement | Ranch house: box, gable roof, porch awning (40 wide) | frontier.tsx:5 |
| city | Saloon: stepped false front with sign and cornice, porch awning on posts, swinging doors (50 wide) | frontier.tsx:17 |
| road | Classic road + 4 dark ties + 2 thin rails | frontier.tsx:33 |
| metropolis / city wall / robber / harbors / fog | classic (not themable) | n/a |
| knight | Wide-brim cowboy hat (24 wide, ~14 tall) | frontier.tsx:55 |
| barbarian ship | Paddle steamer: hull, deck cabin, twin smokestacks with smoke, side-on stern wheel circle | frontier.tsx:231 `frontierShip` |
| player ships / pirate / treasure | Steamer / dark steamer + flag / strongbox | voyage.tsx:178, 192 |
| forest | Tall 3-tier pines at 4 spots + 3-log pile | frontier.tsx:90 |
| hills | Two adobe brick blocks, beehive oven, 2 clay dots | frontier.tsx:109 |
| pasture | 2 sheep, split-rail fence, windpump with spoked wheel and vane | frontier.tsx:127 |
| fields | Corn stalks with leaves at 4 spots + scarecrow | frontier.tsx:158 |
| mountains | 2 granite peaks + mine entrance with rail and ore cart | frontier.tsx:178 |
| desert | Red mesa, saguaro, cow skull | frontier.tsx:203 |
| gold | classic | default null 227 |
| sea | `sea2d` teal gradient | PAL |

---

## nile

Palette (PAL:~189-210): turquoise sea `#2aa0a8`/`#0f4a6e`, sky `#0e2a3a`, sand desert `#efdcaa`, field accent = canal blue `#3fa3b8`, cream fog, bright sun `#fff1d6` x2.0, blue token rim.

### nile 3D (T3/nile.tsx; kit line 389 = `{ props, Settlement, City, Robber, Road, BarbarianShip, Knight, CityWall }`)

| Category | What it is | Source |
|---|---|---|
| settlement | Flat-roofed mud-brick house, parapet, windcatcher tower with tilted cap + dark vent, door | nile.tsx:179 `Settlement` (geo 169-176) |
| city | Temple: two sloping 4-sided pylon towers with cornices, lintel, dark gate, and a separate obelisk with gold tip at x+0.21 | nile.tsx:202 `City` |
| road | Stone causeway: two sandstone kerbs along both sides (heights follow Board size); not on ghost | nile.tsx:335 `Road` |
| metropolis | classic fallback | n/a |
| city wall | Six solid mud-brick wall stretches on a hexagon (r0.335, h0.09) with rounded merlons on the corners, owner-colour linen banner on the front wall | nile.tsx `CityWall` |
| knight | Palace guard: striped nemes headdress with wings, gold collar and brow band, skin-tone body, kilt, hide shield, khopesh | nile.tsx:294 `Knight` |
| barbarian ship | Papyrus reed boat: flat bundled-reed hull (tube along a crescent keel line) rising into upturned ends, two rope lashings, square sail with blue painted bands between yard and boom, steering oar at the stern | nile.tsx `BarbarianShip` (`REED_LINE`) |
| player ships | Felucca: low hull with upturned ends, tall lateen triangle sail on slanted yard | voyage.tsx:209 `Felucca`, 224 |
| robber | Mummy: bandaged cylinder with rings, head with eyes, outstretched arms, loose bandage | nile.tsx:255 `Robber` |
| pirate | Dark felucca | voyage.tsx:226 |
| treasure | Gold box with blue stripes and a small pyramid lid | voyage.tsx:227 |
| harbors | classic pier (wood) | n/a |
| forest | Oasis of date palms (trunk, 5 fronds, dates) + tufts | nile.tsx:59 (`palm` 39) |
| pasture | Sheep + a goat (tan), shaduf lever (post, beam, bucket, counterweight rock) and a blue channel | nile.tsx:90 |
| fields | Wheat plots, each with a blue emissive irrigation canal along the outer edge | nile.tsx:111 |
| hills | Mud-brick rows at two corners, clay jars (3 with necks), mud mound | nile.tsx:66 |
| mountains | Granite quarry: 2 cliffs (5-sided cylinders), cut blocks, a fallen unfinished obelisk | nile.tsx:129 |
| desert | Great pyramid (0,-0.34) + small pyramid, sphinx, palm, dunes | nile.tsx:147 |
| gold | classic (default null 162) | n/a |
| sea | classic Ocean (teal) | n/a |
| fog | classic clouds (cream) | n/a |

### nile 2D (T2/nile.tsx)

| Category | What it is | Source |
|---|---|---|
| settlement | Tapered mud-brick house with flat parapet and 3 crenel squares (28 wide) | nile.tsx:5 |
| city | Temple: two battered pylons flanking a dark doorway, obelisk (x+14..18, y-34..-28) on top of the right pylon (52 wide, 51 tall) | nile.tsx:17 |
| road | Classic road + 4 stone-seam lines | nile.tsx:31 |
| metropolis / city wall / robber / harbors / fog | classic (not themable) | n/a |
| knight | Nemes headdress with lappets | nile.tsx:47 |
| barbarian ship | Reed boat with curled ends and lateen sail | nile.tsx:190 `nileShip` |
| player ships / pirate / treasure | Felucca / dark / gold-blue chest | voyage.tsx:214, 225 |
| forest | Date palms at all 5 spots (`Palm` 60) | nile.tsx:82 |
| hills | 2 mud-brick blocks + 2 clay jars | nile.tsx:91 |
| pasture | Sheep + goat, shaduf, grass tufts | nile.tsx:113 |
| fields | Wheat strokes (side colour) at 4 spots | nile.tsx:139 |
| mountains | 2 flat-topped granite cliffs + stack of cut blocks | nile.tsx:151 |
| desert | Great pyramid + small pyramid + palm | nile.tsx:173 |
| gold | classic | default null 184 |
| sea | `sea2d` turquoise gradient | PAL |

---

## skyport

Palette (PAL:~211-233): cloud-white "sea" `#f8f0ec`/`#cfa6b8`, sunrise sky `#eec3a6`, cliff beach `#8b7866`, white fog, `sea2dPattern` cloud banks, brass-wood `pier`, light `#ffe4c4` x1.9.

### skyport 3D (T3/skyport.tsx; kit line 556 = `{ props, Settlement, City, Robber, Road, Base, Sea, BarbarianShip, Knight, CityWall }`)

| Category | What it is | Source |
|---|---|---|
| settlement | Workshop cottage: box, gable roof, copper chimney pipe with brass cap, glowing round porthole with brass rim | skyport.tsx:333 `Settlement` |
| city | Clocktower: tall box tower (0.15x0.42) with cone cap, clock face + rim + two hands, beside a workshop hall with gable roof | skyport.tsx:357 `City` |
| road | Copper steam pipe along the road with 3 brass flanges; not on ghost | skyport.tsx:497 `Road` |
| metropolis | classic fallback | n/a |
| city wall | Riveted brass hex ring (18 rivets), copper pipe + dark band, pressure gauge at the front with a needle in owner colour | skyport.tsx:385 `CityWall` |
| knight | Sky-marine: brass armour, leather flight cap with ear flaps, goggles on the brow, copper back tank, curved sabre | skyport.tsx:455 `Knight` |
| barbarian ship | Dark pirate airship: soot envelope (ellipsoid), gondola, tail fins, 2 propellers, floats 0.3 above its step | skyport.tsx:529 `BarbarianShip` |
| player ships | Airship in owner colour: ellipsoid envelope, tail fin, gondola, hovering 0.18 above the cloud | voyage.tsx:240 `Airship`, 252 |
| robber | Clockwork brute: brass drum body, rivet band, boxy head with glowing orange eyes, wind-up key on back | skyport.tsx:415 `Robber` |
| pirate | Black airship with red stripe | voyage.tsx:254 |
| treasure | Floating crate under a red balloon | voyage.tsx:255 |
| harbors | classic pier with brass-coloured `palette.pier`; no `Harbor` decor (a comment at skyport.tsx:555 and PAL says "airships at its harbors" but none are drawn) | PAL:~225; pieces.tsx:220 |
| forest | Firs + round oaks around a steam sawmill (boiler, stack, smoke puffs, saw blade, logs) | skyport.tsx:80 |
| pasture | Classic sheep + brass wind turbine (mast, 3 blades, hub) | skyport.tsx:123 |
| fields | Wheat plots + steam tractor (box, big and small wheel, stack, smoke) + bales | skyport.tsx:143 |
| hills | Brickworks: tall smoking chimney with band, brick stacks, mound | skyport.tsx:104 |
| mountains | 2 snowy peaks + mine headframe (brass A-frame, winding wheel) | skyport.tsx:173 |
| desert | Giant half-buried brass gears (extruded gear shapes, leaning) + dunes | skyport.tsx:189 |
| gold | classic (default null 202) | n/a |
| tile underside | Rocky inverted cone under every tile (depth 0.9-1.62) hanging into the clouds | skyport.tsx:209 `Base`, `rockBase` shared.tsx:122 |
| sea | Cloud floor (64x64 swelling plane at y -1.15), ~110 clusters of cloud puffs, 4 distant floating islets | skyport.tsx:224 `Sea`, islets 300-321 |
| fog | classic clouds (white) | n/a |

### skyport 2D (T2/skyport.tsx)

| Category | What it is | Source |
|---|---|---|
| settlement | Brass cottage: cabin + riveted dome roof with 3 brass rivets (32 wide) | skyport.tsx:8 |
| city | Steampunk tower: 42x40 riveted shaft with dome cap, brass gauge ring, side vent pipe out to x+32 | skyport.tsx:22 |
| road | Classic road + 4 brass rivet dots | skyport.tsx:35 |
| metropolis / city wall / robber / harbors / fog | classic (not themable) | n/a |
| knight | Flight cap + round goggles | skyport.tsx:50 |
| barbarian ship | Dark pirate airship (ellipse envelope, gondola, fins), drawn 14 higher | skyport.tsx:225 `skyportShip` |
| player ships / pirate / treasure | Airship (drawn 10 higher) / dark airship + skull / crate under red balloon | voyage.tsx:246, 258 |
| forest | Round oaks at 4 spots + sawmill with smoke | skyport.tsx:96 |
| hills | Tall chimney + smoke + 2 brick stacks | skyport.tsx:121 |
| pasture | Sheep + 3-blade brass turbine | skyport.tsx:146 |
| fields | Wheat + steam tractor | skyport.tsx:171 |
| mountains | 2 snowy peaks + headframe with winding wheel | skyport.tsx:189 |
| desert | 2 gear polygons + sand mound strip | skyport.tsx:208 |
| gold | classic | default null 422 |
| sea | cloud-white gradient + cloud-bank SVG pattern | PAL `CLOUD_BANKS` |

---

## cyberpunk

Palette (PAL:~234-262): near-black water `#141a33`/`#06070f`, smog sky `#07050f`, dark concrete beach `#2a2833`, purple smog fog, pink token rim `#ff3d9a`, dim light (hemi 0.4, sun `#c4ccff` x0.75, haze 0.8), `sea2dPattern` neon rain, dark `pier`, `gloom2d` with two lights (cyan, pink), `ownerGlow`.

### cyberpunk 3D (T3/cyberpunk.tsx; kit line 562 = `{ props, Settlement, City, Robber, Road, Harbor, Tile, Sea, BarbarianShip, Knight, CityWall }`)

| Category | What it is | Source |
|---|---|---|
| settlement | Capsule apartment block: box 0.2x0.3x0.18 in owner colour, 3 window strips glowing in a lighter owner tone, cyan side sign, roof unit; light pool (not on ghost) | cyberpunk.tsx:345 `Settlement` (geo 337-342) |
| city | Megacorp tower: podium 0.34x0.16x0.26, tower 0.16x0.46 with 3 glowing bands, pink holo torus ring, mast, red beacon; pool | cyberpunk.tsx:370 `City` |
| road | Neon strip (lighter owner tone) along the top of the road; not on ghost | cyberpunk.tsx:500 `Road` |
| metropolis | classic fallback | n/a |
| city wall | Dark concrete barrier (r0.32-0.35, h0.13), cap disc, neon torus strip in owner tone, dark panel blocks at corners | cyberpunk.tsx:397 `CityWall` |
| knight | Street samurai: angular box helm with neon ring around the face, antenna with glowing tip, neon-striped black cape, glowing energy blade | cyberpunk.tsx:465 `Knight` |
| barbarian ship | Neon hover-speedboat: dark box hull + deck + cockpit + fin, cyan and pink glow strips (red in danger) | cyberpunk.tsx:544 `BarbarianShip` |
| player ships | Hover speedboat: extruded arrow hull in owner colour, glass canopy, neon side strips, twin engines, underglow, hovering 0.06 | voyage.tsx:280 `Hoverboat`, 303 |
| robber | Surveillance drone hovering at y 0.4 (body, 2 arms, 4 rotors, red glowing eye), red scan cone + ground pool (not on ghost) | cyberpunk.tsx:420 `Robber` |
| pirate | Black hover-boat with red neon | voyage.tsx:305 |
| treasure | Dark case with cyan glowing lid | voyage.tsx:306 |
| harbors | Dark metal `palette.pier` + container gantry crane (yellow legs, beams, boom, teal container) at local x 0.4 | cyberpunk.tsx:514 `Harbor` |
| forest | Dark gene-tuned pines, some tips glowing mint, 2 grow-lamp posts, chain-link fence | cyberpunk.tsx:72 |
| pasture | Robot sheep: sheep body + dark box head with cyan visor + antenna with pink tip, synthetic turf | cyberpunk.tsx:119 |
| fields | Hydroponic racks: posts, shelves, grain crop box, amber grow-light strips; 1 shelf in front, 3 behind | cyberpunk.tsx:135 |
| hills | Scrapyard: hydraulic press with glowing orange slit, scrap heap, brick stacks | cyberpunk.tsx:97 |
| mountains | Slate peaks with glowing cyan ore veins + excavator (tracks, cab, boom, bucket) | cyberpunk.tsx:155 |
| desert | Cracked asphalt lines, pink holo billboard on a post, crashed flying car with red glowing wreck | cyberpunk.tsx:174 |
| gold | classic (default null 187) | n/a |
| per-tile sign | Neon sign (post + glowing panel + pool), pink or cyan by seed parity; back corner r0.66 | cyberpunk.tsx:210 `Tile`, spot 203 |
| sea | Classic `Ocean` (black) + 60 additive neon streaks + 46 skyline towers with lit window bands | cyberpunk.tsx:230 `Sea`, 294 `Windows` |
| fog | classic clouds in smog purple | n/a |

### cyberpunk 2D (T2/cyberpunk.tsx)

| Category | What it is | Source |
|---|---|---|
| settlement | Neon-edged block 28x27, two dark windows, `Neon` outline | cyberpunk.tsx:11 |
| city | Skyscraper 28 wide x 45 tall with neon edge and 8 lit windows | cyberpunk.tsx:24 |
| road | Faint colour halo + RoadBase + thin white highlight | cyberpunk.tsx:40 |
| metropolis / city wall / robber / harbors / fog | classic (not themable) | n/a |
| knight | Helmet with cyan visor slit | cyberpunk.tsx:54 |
| barbarian ship | Dark hover-boat (cockpit, post, cyan and pink Neon strips) | cyberpunk.tsx:242 `cyberpunkShip` |
| player ships / pirate / treasure | Side-view hover-boat with underglow / black with red neon / dark case with neon | voyage.tsx:280, 295 |
| forest | Dark pines with glowing tips, grow lamp, chain-link fence | cyberpunk.tsx:78 |
| hills | Scrap heaps, press with neon slit, bricks | cyberpunk.tsx:103 |
| pasture | Robot sheep with visor/antenna glow | cyberpunk.tsx:133 |
| fields | Hydroponic rack boxes with Neon strips + grain sacks | cyberpunk.tsx:161 |
| mountains | Slate peaks with neon veins + excavator | cyberpunk.tsx:188 |
| desert | Crack lines, holo billboard (Neon), crashed car | cyberpunk.tsx:210 |
| gold | classic | default null 236 |
| overlay | Gloom with cyan/pink lamps per tile, towns glow in owner colour (`ownerGlow`), shade opacity 0.25 | B2D:542, PAL gloom2d |
| sea | Dark purple gradient + neon rain SVG pattern | PAL `NEON_RAIN` |

---

## orbital

Palette (PAL:~263-286): space `#1a1640`/`#07061a`, sky `#04030d`, dark asteroid rim `#3b3f52`, nebula fog `#6a5a8f`, hard white sun x1.7, haze 2 (clear), `sea2dPattern` star field, grey `pier`, pale lunar desert.

### orbital 3D (T3/orbital.tsx; kit line 507 = `{ props, Settlement, City, Robber, Road, Base, Sea, BarbarianShip, Knight, CityWall }`)

| Category | What it is | Source |
|---|---|---|
| settlement | Hab dome: dark ring base, half-sphere dome in owner colour (scaled 1.25 tall), cyan window band, antenna with red tip | orbital.tsx:241 `Settlement` (geo 232-238) |
| city | Arcology: tall tapered spire (0.46) with two ring decks and red beacon, plus a smaller dome pod at (0.13, 0.06) | orbital.tsx:262 `City` |
| road | Runway lights: 4x2 glowing spheres at +-0.05k in a lighter owner tone; not on ghost | orbital.tsx:381 `Road` |
| metropolis | classic fallback | n/a |
| city wall | Metal hex ring + band, 6 light posts with lamps in owner tone, and a faint cyan translucent shield dome r0.4 | orbital.tsx:286 `CityWall` |
| knight | Pressure-suited trooper: cloth body, chest panel with 2 lights, back pack, collar ring, glass bubble helmet, blaster | orbital.tsx:348 `Knight` |
| barbarian ship | Alien raider: extruded arrowhead hull, canopy, glowing trim, fins, twin nacelles with flickering exhaust, blinking nav lights, faint tractor beam | orbital.tsx:472 `BarbarianShip` |
| player ships | Shuttle: flattened ellipsoid hull, wing slab, cockpit blob, cyan engine glow, hovering 0.14 | voyage.tsx:319 |
| robber | Pirate saucer hovering at y 0.44 (disc, cyan dome, 6 rim lights) with a green tractor beam + pool (not on ghost) | orbital.tsx:313 `Robber` |
| pirate | Dark arrowhead cruiser with red engine glows | voyage.tsx:327 |
| treasure | Floating metal pod with cyan and gold lights | voyage.tsx:336 |
| harbors | Grey metal `palette.pier`; no `Harbor` decor (comment at orbital.tsx:506 says "shuttles at the harbors": not implemented) | n/a |
| forest | Slim alien pines, teal glowing bulb trees (every 3rd), 2 translucent glass biodomes with saplings | orbital.tsx:59 |
| pasture | Grow-lit meadow, sheep with translucent glass helmets, light mast with lamp | orbital.tsx:102 |
| fields | Wheat plots under translucent greenhouse tunnels (half-cylinders) | orbital.tsx:119 |
| hills | Red regolith: gantry printer (posts, beam, cyan nozzle) over brick stack, mounds, dark red rocks | orbital.tsx:85 |
| mountains | Dark ore peaks with emissive cyan crystals + drill rig (3 leaning legs) with red beacon | orbital.tsx:135 |
| desert | Impact crater (floor disc + torus rim) at the back, wrecked satellite (body, 2 panels, dish) | orbital.tsx:156 |
| gold | classic (default null 169) | n/a |
| tile underside | Larger rock cone under each tile (depth 1.2-2.3) | orbital.tsx:176 `Base` |
| sea | No water: 1400 stars on a sphere, 2 far nebula pools, ringed planet at (-25,-25,-17) | orbital.tsx:188 `Sea` |
| fog | classic clouds in nebula purple | n/a |

### orbital 2D (T2/orbital.tsx)

| Category | What it is | Source |
|---|---|---|
| settlement | Dome habitat: glazed dome on a ring base with a cyan light, 30 wide x 22 tall | orbital.tsx:8 |
| city | Two overlapping domes on a ring base (48 wide), antenna mast with cyan light | orbital.tsx:20 |
| road | Classic road + 3 cyan Glow dots | orbital.tsx:36 |
| metropolis / city wall / robber / harbors / fog | classic (not themable) | n/a |
| knight | Round astronaut helmet with cyan visor arc | orbital.tsx:51 |
| barbarian ship | Arrowhead raider, canopy, wingtip fins, two engine Glows, tractor cone | orbital.tsx:211 `orbitalShip` |
| player ships / pirate / treasure | Shuttle with cyan engine glow / dark arrow cruiser with red glows / pod with lights | voyage.tsx:311-338 |
| forest | Alien pines with Glow tips (0,2,4) + glass biodomes (1,3) | orbital.tsx:75 |
| hills | Regolith mounds + gantry with cyan glow + bricks | orbital.tsx:100 |
| pasture | Sheep with glass helmet circles | orbital.tsx:130 |
| fields | Wheat under glass tunnels at 5 spots | orbital.tsx:150 |
| mountains | Ore peaks with crystals + drill rig + red beacon | orbital.tsx:165 |
| desert | Crater ellipses + wrecked satellite | orbital.tsx:185 |
| gold | classic | default null 459 |
| sea | Dark violet gradient + star-field SVG pattern | PAL `STAR_FIELD` |

---

## origami

Palette (PAL:~287-308): paper-blue sea `#8cc4e0`/`#5b9ac0`, craft-table sky `#d6e4ec`, ivory beach, tissue-paper fog, `sea2dPattern` paper pleats, ivory `pier`, soft lightbox light (hemi 1.05, ambient 0.28, sun x1.35).

### origami 3D (T3/origami.tsx; kit line 429 = `{ props, Settlement, City, Robber, Road, Sea, BarbarianShip, Knight, CityWall }`)

| Category | What it is | Source |
|---|---|---|
| settlement | Paper house: box with large gable roof (0.30x0.27), white door and window | origami.tsx:260 `Settlement` (geo 252-257) |
| city | Paper castle: gabled hall + a tall tower (0.12x0.3, cone roof, pole + white pennant) at x-0.14 + a small tower at (0.17,-0.05) | origami.tsx:287 `City` |
| road | Thin white translucent crease line along the road; not on ghost | origami.tsx:411 `Road` |
| metropolis | classic fallback | n/a |
| city wall | 12 paper panels pleated zigzag in a circle (r0.33, alternating tones), pole + owner-colour pennant at the gate | origami.tsx:310 `CityWall` |
| knight | Folded paper knight: cone torso, faceted octahedron head with pointed crest, triangular shield, flat paper blade | origami.tsx:379 `Knight` |
| barbarian ship | Folded black paper boat (symmetric, scale 2.2) with pole and red pennant | origami.tsx:418 `BarbarianShip` |
| player ships | Paper boat: 4-sided tapered hull + a pyramid sail | voyage.tsx:347 `PaperBoat`, 358 |
| robber | Black paper fox: cone body, cone head, ears, tail with white tip | origami.tsx:342 `Robber` |
| pirate | Black paper boat | voyage.tsx:360 |
| treasure | Yellow paper box with a folded pyramid lid | voyage.tsx:361 |
| harbors | Ivory `palette.pier`, no `Harbor` decor | n/a |
| forest | Pyramid trees (2 four-sided cone tiers) on paper-tube trunks | origami.tsx:114 |
| pasture | Spiky paper blades, octahedron sheep with tetra heads, rainbow pinwheel | origami.tsx:144 |
| fields | Three accordion folds of yellow paper (alternating sloped thin slabs) | origami.tsx:159 |
| hills | 2 folded terracotta ridges (triangular prisms), paper brick stack, pebbles | origami.tsx:127 |
| mountains | Up to 3 sharp 3-sided grey paper peaks with white caps + pebbles | origami.tsx:173 |
| desert | Big red paper crane (custom `paper()` triangles) at the back + folded 4-sided dunes | origami.tsx:186 |
| gold | classic (default null 192) | n/a |
| sea | Folded blue paper sheet: 60x60 plane with alternating ridge/valley rows at y -0.08 + 5 paper boats; no horizon ring or floor | origami.tsx:225 `Sea` |
| fog | classic clouds in tissue white | n/a |

### origami 2D (T2/origami.tsx)

| Category | What it is | Source |
|---|---|---|
| settlement | Box with a two-tone creased `Fold` roof (34 wide) | origami.tsx:17 |
| city | Wide paper keep (44) with two folds of different heights | origami.tsx:28 |
| road | Classic road + 4 alternating light/dark pleat lines | origami.tsx:41 |
| metropolis / city wall / robber / harbors / fog | classic (not themable) | n/a |
| knight | Folded triangle cap, two-tone faces | origami.tsx:58 |
| barbarian ship | Folded black paper boat with red flag (48 wide) | origami.tsx:226 `origamiShip` |
| player ships / pirate / treasure | Paper boat with fold lines / dark / folded box | voyage.tsx:340, 350 |
| all terrains (except gold) | Each tile first draws a half-sheet shading + centre crease (hard-coded 93 / 80.5 / 46.5 hex size) | origami.tsx:84-89 |
| forest | 2-tier folded pyramid trees on tubes | origami.tsx:91 |
| hills | Folded terracotta ridges + brick stack | origami.tsx:108 |
| pasture | Faceted paper sheep, pinwheel, paper grass | origami.tsx:131 |
| fields | Accordion pleat rectangles | origami.tsx:163 |
| mountains | Folded grey peaks with white tips | origami.tsx:180 |
| desert | Paper crane + folded dunes | origami.tsx:196 |
| gold | classic | default null 220 |
| sea | Light-blue gradient + pleat SVG pattern | PAL `PAPER_PLEATS` |

---

## Suspicious spots

Ordered roughly by how likely they are to show up on screen. "Verify" = reading the code suggests it, not tested in a browser.

1. **Fixed:** the tower now stands at (+0.17k, -0.29k), clear of roads and of the themed side buildings. Before: **Metropolis tower is unthemed and fixed at (+0.16k, -0.12k)** (B3/pieces.tsx:159) while some city models put geometry in that corner. Plan overlap of its 0.13 box (x 0.095..0.225, z -0.185..-0.055):
   - Frontier water tower at (0.2, -0.06) with legs (T3/frontier.tsx:250-256): clear overlap.
   - Origami small castle tower at (0.17, -0.05) scale 0.8 (origami.tsx:294-295): overlap.
   - Sakura pagoda: tier 2 reaches x 0.11 and the lowest eave is ~0.24 half-wide, so the tower pierces the roofs (sakura.tsx:265-270).
   - Nile pylon base reaches x 0.148, z -0.098 (nile.tsx:205-210): small overlap.
   - Cyberpunk podium (cyberpunk.tsx:371) overlaps it by ~0.055 in z, like the classic base does (models.tsx:19).
2. **Stale "robber stands in front of the centre" comments.** The robber is placed at hex centre + ROBBER_OFFSET (+0.5, +0.08) in 3D (B3/pieces.tsx:183, Board3D.tsx:210) and at hex y+46 in 2D (B2D:1343). Comments that assume otherwise: sakura.tsx:205, frontier.tsx:167, nile.tsx:148, orbital.tsx:157, origami.tsx:187 (3D); frontier 2D :203, nile 2D :173, skyport 2D :208, cyberpunk 2D :211, orbital 2D :185, origami 2D :196. Desert art placed "behind the centre" (nile pyramid z -0.34, orbital crater z -0.36, origami crane z -0.36, 2D pyramid up to cy-64) is therefore not actually protecting any robber position; the desert's centre/front is just empty.
3. **Fixed:** the robber now stands east of the centre (+0.5), the merchant stays west; and the pirate moves away from harbors facing its hex (`pirateSpot`, board/harbor.ts). Before: **Merchant and robber share the hex's west side.** Merchant at (x-0.45, z-0.15) (pieces.tsx:173), robber at (x-0.5, z+0.08) (pieces.tsx:183): 0.24 apart. Robbers wider than that are Sakura (straw hat r0.21, sakura.tsx:357), Frontier (brim r0.15, frontier.tsx:309), Nordic (club at x+0.15, nordic.tsx:329). 2D: merchant (x-44, y-8) vs robber (cx, y+46), no clash (B2D:1306-1340). Pirate uses the exact hex centre with no offset (B3/voyage.tsx:253-259, Board3D.tsx:193), unlike the robber.
4. **Fixed:** the lantern now steps aside and scales with `k`. Before: **Night road lantern ignores Board size.** `[0.12, 0, 0.09]` (night.tsx:239) is not scaled by `k`; at "large" (k 1.25, client/prefs.ts:48) the road half-width is 0.081 and the lantern box edge sits at 0.0725, so it overlaps the road. Sakura and Nordic scale z by k (sakura.tsx:377, nordic.tsx:456), Orbital uses 0.05k (orbital.tsx:392). Lantern-beside-road offsets also differ a lot per theme: Night (0.12, 0.09), Sakura (0.25, 0.17), Nordic runestone (0.26, 0.11).
5. **Fixed:** the wheel's axle now runs across the hull. Before: **Frontier barbarian-ship wheel is turned the wrong way.** `SHIP.wheel` cylinder rotated `[PI/2,0,0]` (frontier.tsx:411) makes its axis lie along z (the ship's length), so the wheel is a drum facing fore/aft. The Voyagers steamer uses a torus with the axis across the hull (voyage.tsx:182) and the 2D glyph draws a side-on circle (T2/frontier.tsx:~238). The wheel also sticks out to z -0.33 against a hull ending at -0.22 (frontier.tsx:385, 411), making the model ~0.55 long vs the documented ~0.44.
6. **Fixed:** the reed boat was rebuilt (flat crescent hull, square banded sail, ~0.35 tall before the 1.7 wrapper). Before: **Nile barbarian ship is taller than documented.** Sail apex at y = 0.07 + 0.34 x 1.1 = 0.444 (nile.tsx:383) vs the ~0.32 pre-scale target (0.55 / 1.7, types.ts:~66); every other model tops out near 0.37-0.40 (classic: barbarians.tsx:123-125). After the 1.7 wrapper it is ~0.75 tall.
7. **Origami and Skyport seas are finite sheets.** Origami: `PlaneGeometry(60,60)` at y -0.08, no horizon ring or floor (origami.tsx:228-242). Skyport cloud floor `PlaneGeometry(64,64)` (skyport.tsx:226-228). The classic ocean adds a ring out to 600 and a floor (ocean.tsx:14-16, 79-88). Fog is fully opaque only at ~44 x scale (Board3D.tsx:284) so a sheet edge at 30/32 can show against the sky colour on big/zoomed-out boards (verify).
8. **Hover-based robbers don't start at the tile surface.** Cyberpunk drone floats at y 0.4 (cyberpunk.tsx:437 `Hover height={0.4}`), Orbital saucer at 0.44 (orbital.tsx:322), while classic stands on y=0 (models.tsx:36). Their ground decals (`Pool`, beam cone) are drawn at y 0.006/0.2 relative to the robber group, which the hop animation lifts (pieces.tsx:197), so the pool rises with the robber while hopping.
9. **City-wall footprint breaks.** Orbital's shield dome has radius 0.4 (orbital.tsx:281) vs "~0.33" (types.ts:93) and is a translucent hemisphere; Sakura wall ring is 0.31-0.34 (sakura.tsx:278) fine; Nordic/Frontier/Origami circles are not rotated 30deg like the hex rings (nordic.tsx:403, frontier.tsx:276, origami.tsx:312), harmless but their gate/banner sits at local +z, i.e. toward the camera, only by convention. Sakura pagoda's lowest roof (r0.34, ~0.48 wide, sakura.tsx:239) sits right on the 0.335 ring corners.
10. **Sakura pieces float 0.01 above the tile.** House body centred at 0.08 with height 0.14 (sakura.tsx:255) and pagoda base at 0.08 with height 0.14 (265) put the bottom at y 0.01; the classic starts at 0 (models.tsx:9). Sakura settlement roof is 0.42 wide over a 0.24 body (sakura.tsx:237, 256).
11. **Knight face discs with no head behind them.** Origami: face disc at z 0.0755, y headY-0.05 (origami.tsx:392) in front of an octahedron r0.072 rotated 45deg (389) whose surface there is at z ~0.016: floats ~0.06 clear. Skyport: cap sphere ends ~0.009 below headY (skyport.tsx:~470, `SphereGeometry(...,PI/1.85)`) while the face is at headY-0.05. Nile: no head mesh at all, only a face disc plus nemes parts (nile.tsx:307-316). Orbital: face inside a bubble with no head (orbital.tsx:~366). Classic has a helmet cylinder (knights.tsx:112). Unclear if intended.
12. **2D glyph sizes vs documented footprints** (house ~34x31, city ~52x43, emblem ~26x29, ship ~60 wide):
    - Sakura settlement 54 wide (T2/sakura.tsx:15-22, roof half 22 + flares) and city ~58 wide x ~49 tall (26-35).
    - Cyberpunk city only 28 wide (T2/cyberpunk.tsx:24-29), 45 tall.
    - Orbital settlement only 22 tall (T2/orbital.tsx:8-14).
    - Nile city 51 tall, and its obelisk (x+14..18, y-34..-28) sits on the right pylon, not "beside" it (T2/nile.tsx:17-27).
    - Nordic knight emblem 38 wide (T2/nordic.tsx:61-68); Frontier hat ~24x14 (frontier.tsx:55-62).
    - Barbarian ships: Nordic ~71 wide with dragon head (nordic.tsx:172), Nile ~66, Origami 48.
13. **2D metropolis marker is a fixed gold disc at (+21, -26)** (B2D:1248) regardless of theme: collides with the Nile obelisk, touches the Skyport vent pipe (T2/skyport.tsx:22-33) and the Orbital antenna head (T2/orbital.tsx:20-33), and sits mostly outside the 28-wide Cyberpunk tower.
14. **2D robber/pirate/ships are always centred drawings with ground shadows**: pirate draws a black ground-shadow ellipse for every theme (B2D:~497), including floating airships/spacecraft; player ships are always scaled 0.85k and centred on the edge midpoint (B2D:~480).
15. **Origami 2D hard-codes hex geometry** (`93`, `80.5`, `46.5`, T2/origami.tsx:86) which matches `TILE_SIZE 0.93 * S 100` (B2D:34-36) only while the topology hex circumradius is 1.0 (TG.base r=1.0, terrainKit.ts:14).
16. **Stale/misleading comments about harbors.** Skyport and Orbital kit comments (skyport.tsx:555, orbital.tsx:506) and the PAL swatch notes mention airships/shuttles "at harbors", but neither kit defines `Harbor`; only Nordic (nordic.tsx:422) and Cyberpunk (cyberpunk.tsx:514) decorate harbors. Both decor groups sit at local +x (0.37 / 0.4) = beyond one end of the pier's long axis (the long axis is perpendicular to the outward direction: pieces.tsx:240-242 uses `atan2(ox, oz)`), so they are one-sided relative to the pier.
17. **Circular imports.** `skyport.tsx:9` and `origami.tsx:9` import `useBoardPalette` from './index', which imports them (index.tsx:5-12); `cyberpunk.tsx:6` imports `../ocean`, which imports './themes'. Works because the imports are only used inside components, but importing a theme file first would hit a TDZ on `KITS`.
18. **Ghost handling.** Models spread `o` correctly everywhere I checked; but all theme `Road` decors (and the whole wall, metropolis, knights) simply vanish for ghosts, so a placement preview of a road is the plain classic box in every theme (pieces.tsx:62 vs the null returns, e.g. night.tsx:237, sakura.tsx:374).
19. **Sakura 2D desert has no torii** though the 3D desert is built around it (sakura.tsx:204-226 vs T2/sakura.tsx:124-137). More generally the 2D board has no themed robber, wall, metropolis or harbor, so Sakura's bandit, Nile's mummy, Cyberpunk's drone etc. exist only in 3D.
