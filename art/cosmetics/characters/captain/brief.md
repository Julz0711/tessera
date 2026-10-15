# Captain

- Kind: character (Blender) · Unlock: free (starter) · Id: `captain`
- Export: `public/cosmetics/characters/captain-a.glb`, `public/cosmetics/characters/captain-b.glb` (variants a and b)
- Agent: main session (Opus). First character: it also builds the shared base body, rig, palette materials and preview scene, and it needs visual judgement with `look`.

## Goal

- The first character most players ever see, so it sets the bar for every later character.
- Reads instantly as "the captain who brought the settlers here": a friendly leader and explorer, not a pirate and not a navy officer.
- Works at 150 px full body in the lobby and as a 64 px head-and-shoulders portrait.
- Builds the neutral base bodies (a and b) that later characters reuse without changes.
- Comes in two variants the player picks between, so everyone can play a captain like them.

## Research

- **Low-poly style:** see `_shared/style.md`. For this item: silhouette carries it (tricorn triangle on top, coat flaring at the knees, spyglass sticking out sideways). The beard and hat carry the face at portrait size.
- **History:** the tricorn was everyday wear for gentlemen and ship's officers from about 1690 to 1775, then the bicorn replaced it (Royal Navy officers moved to the bicorn after 1775). Merchant captains had no uniform: they wore gentleman's clothing, a knee-length coat over a waistcoat and shirt, breeches and boots. Working sailors avoided the tricorn because the brim caught on rigging, so on a captain it marks rank. The brass spyglass is the classic captain prop (most period portraits show one, though they date mostly from the 1800s).
- **Catan:** Seafarers (1997) brings ships, harbours, gold fields and the pirate. Klaus Teuber's original idea already had settlers arriving by sea, so a captain is the natural first character. Our feats echo this ("First landfall": finish your first game).
- **Our interpretation:** the merchant-explorer captain of the settlers' ship. Weathered and kind, slightly heroic. Late 1600s to early 1700s look, made simple and blocky for low poly.
- **Reference:** "tomas" in `docs/feedback/image-7.png` (tricorn, dark coat, spyglass, rope coil), rebuilt in our flat low-poly style.

## Design choices

| | Choice | Why |
|---|---|---|
| Variant a | Older man, about 55, angular face, grey captain's beard with sideburns and moustache, grey hair tied in a queue with an oxblood ribbon, skin-2 | Beard and queue give a strong face and side shape at 64 px; the queue is period-correct |
| Variant b | Woman in her 40s, softer jaw, dark hair framing the face, braid down the back of the coat, brass earrings, skin-3 | Same outfit, different person; narrower shoulders and waist, slimmer sleeves |
| Silhouette | Tricorn on top, coat flaring to the knee with a jagged hem, spyglass held out forward and up | Three distinct shapes that read as an outline |
| Hat | Charcoal tricorn seated on the forehead, brass edge band, small `player` cockade | No feather: the feather belongs to the Corsair (level 90) |
| Coat | Navy, knee length, open front, oxblood lapels and turned-back cuffs, brass trim on the edges and hem, brass buttons, pocket flaps, stand-fall collar | Navy says "sea"; layered trims give the asset-store richness; no epaulettes or bicorn (Admiral, level 50) |
| Underneath | Buff waistcoat with brass buttons, ruffled linen cravat, charcoal breeches, knee boots with a turned-down light band | Buff breaks up the navy and is period-correct |
| Player colour | Waist sash over the coat with a bow and two tails on the left hip, plus the hat cockade | Big front area that tells players apart in the lobby |
| Prop | Brass spyglass (three tubes, leather grip) in the right hand | Main captain sign |
| Pose | Weight on one leg, chest and head turned slightly, left fist on the hip, spyglass held ready | Relaxed and confident, like the references |
| Not this | No eyepatch, skull, cutlass, parrot (Corsair), no wheel or bicorn (Admiral), no rope coil | Each character must own its signs |

## Specs

- Height 1.0 unit to the top of the head (origin at the feet). About 6 heads tall.
- Triangles: about 4,200 per variant (a 4,150, b 4,230). Files: `captain-a.glb` 131 KB, `captain-b.glb` 133 KB.
- One mesh per variant (`captain_a`, `captain_b`), 11 materials (palette names), rig as in `_shared/style.md`, `idle` loop.

## Build

`build.py` in this folder generates both variants on `_shared/charlib.py` (see "How characters are built" in `_shared/style.md`). Run it in Blender, then `review()`, then `py art/cosmetics/_shared/sheet.py art/cosmetics/characters/captain`. Export with `charlib.export()` (see the end of a session's log for the call).

## Acceptance

- [x] Reads as a captain, not a pirate or admiral.
- [x] At 150 px: hat, coat, sash and spyglass all readable; sash clearly visible from the front.
- [x] At 64 px portrait: face, beard or hair, hat and collar read.
- [x] No clipping from front, three-quarter, side and back (checked in Blender; not yet in three.js).
- [x] Both variants built from the same script.
- [ ] The idle loop plays cleanly in three.js (needs the loader, Phase 0 step 7).

## Notes

- v1 (2026-10-14, stacked primitives, 1,300 triangles) was rejected as "nutcrackers". v2 followed the user's Synty POLYGON references: continuous body, sculpted ring-profile head, layered clothing, relaxed pose.
- v2 review round 1: the user found clipping, a floating hat and the missing variant b. Fixed by generating everything from `build.py`: hidden body parts deleted, waistcoat only at the front, more coat clearance, hat fitted to the head, hand targets on the coat surface, neckline closed onto the neck.
- Review sheet: `review.png` (status `built`, waiting for the user's review).
- Sources: [Polycount low-poly critique](https://polycount.com/discussion/comment/1803890/), [Low poly style guide for small teams](https://bugnet.io/blog/low-poly-3d-a-style-guide-for-small-teams), [Catan: Seafarers (Wikipedia)](https://en.wikipedia.org/wiki/Catan:_Seafarers), [Pirate clothing in the Golden Age (World History Encyclopedia)](https://www.worldhistory.org/article/1839/pirate-clothing-in-the-golden-age-of-piracy/), [18th-century naval officer portrait](https://timothylangston.com/shop/pictures/portraits/18th-century-portrait-of-a-naval-officer).
