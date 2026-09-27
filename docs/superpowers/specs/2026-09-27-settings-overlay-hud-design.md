# Settings overlay, HUD layout, per-sound volume (+ 3D theme fixes)

Date: 2026-09-27 · Branch: `feat/settings-overlay`

## Goals

1. One global **settings overlay** reachable from the landing page and in-game, near full screen, replacing the
   cramped in-game menu (fixes "Cyberpunk" overflowing its theme button).
2. **Profile vs. settings split**: profile editing holds identity only; game settings live in the overlay.
3. **HUD scale** S/M/L and a **snap-to-slot HUD layout editor** (desktop) so each player can arrange their HUD.
4. **Per-sound volume** for every sound effect.
5. Small fixes: commodity order **cloth, coin, paper**; Skyport airship connected to its pier; custom 3D roads for
   **Sakura** and **Nordic**; Origami robber no longer floating.

## 1. Settings overlay

- `src/client/settingsUI.ts`: zustand store `{ open: boolean; tab: SettingsTab; show(tab?), hide() }`,
  `SettingsTab = 'board' | 'gameplay' | 'interface' | 'audio' | 'language'`.
- `src/components/settings/SettingsOverlay.tsx`, mounted once in `src/app/layout.tsx`. Fixed, `z-[60]`, dimmed
  backdrop, panel ~`min(1100px,94vw)` × `90dvh`, tab rail on the left (horizontal scroll row on phones), Esc / ✕ /
  backdrop click closes.
- Tab bodies live in `src/components/settings/SettingsPanel.tsx` (reused by the `/settings` page, which renders the
  panel full-page without the backdrop).
- Changes apply **instantly** through `usePrefs().set` — no Save button.
- Signed-in sync: `view`, `graphics`, `volume` still go to `PATCH /api/profile` (`preferences`), debounced ~800 ms,
  only when `session.persistence`. New settings (HUD scale/layout, per-sound volume) are browser-local.
- Tabs:
  - **Board** — 3D/2D, 3D quality, theme grid (swatch + name + blurb, 2–3 columns), board size.
  - **Gameplay** — build hints, confirm placements, animations.
  - **Interface** — HUD scale S/M/L; "Edit HUD layout" (only enabled while in a game: closes the overlay and starts
    edit mode via `useHud().startEditing()`); "Reset layout".
  - **Audio** — see §4.
  - **Language** — disabled English select (as today).
- Entry points: ⚙ button in the landing header next to the profile button; "Settings" in the in-game ☰ menu.
- The in-game ☰ dropdown shrinks to: Settings, mute toggle, Copy invite link, Leave game. The 3D/2D quick toggle in
  the top bar stays.

## 2. Profile split

- `/profile` unchanged (stats, friends, history); its "Edit profile" button links to `/profile/edit`.
- New `/profile/edit` (`src/components/profile/ProfileEditPage.tsx`): display name, avatar toggle, color, knight,
  frame & title, with the existing Save button + `PATCH /api/profile` (identity fields + `useProviderAvatar`).
- `/settings` renders the settings panel as a page (back link to Home).

## 3. HUD scale and layout (`src/client/hud.ts`, `GameScreen.tsx`)

- `prefs.hudScale: 'small' | 'medium' | 'large'` → `HUD_SCALE = { small: 0.85, medium: 1, large: 1.15 }`, applied as
  CSS `zoom` on the top bar, the dock row and every HUD slot (all screen sizes).
- Movable panels (`HudPanel`): `side` (log/chat/dice stats), `players`, `bank` (+ barbarian track in C&K), `dice`,
  `offers`. Top bar and dock stay fixed.
- Slots (`HudSlot`): `leftTop`, `leftBottom`, `rightTop`, `rightBottom`, `cornerLeft`, `cornerRight`. Each side is one
  scrolling column (top group, spacer, bottom group) so slots on a side never overlap; corners sit beside the dock and
  accept only `dice`. Panels sharing a slot stack in `order`.
- `prefs.hudLayout: Record<HudPanel, { slot: HudSlot; order: number }>`, sanitized on load (unknown/invalid → default).
  Default = today's screen: `offers` leftTop, `side`/`bank`/`players` rightTop, `dice` cornerRight.
- Edit mode (`useHud` store: `editing`, `startEditing()`, `stopEditing()`): slot outlines with labels appear; every
  panel gets a drag handle bar; dropping on a slot (pointer events) moves it there (appended at the end); a floating
  bar offers **Done** and **Reset**. Esc = Done.
- Desktop (`lg`+) only; below `lg` the current fixed phone layout stays (HUD scale still applies).
- The dock keeps clear of whichever corner holds the dice.

## 4. Per-sound volume (`src/client/sound.ts`)

- `prefs.sfxVolume: Partial<Record<Sfx, number>>` (0..1, missing = 1), sanitized on load.
- `sound.ts` exports `SFX_GROUPS: { id, label, sounds: { sfx, label }[] }[]` (UI / Game / Alerts / Rewards, all 31
  sounds) and `setSfxVolumes(map)`. `play(sfx)` reads the sound's gain; 0 → no sound; otherwise every voice's gain in
  that call is multiplied by it (master volume still applies on the bus).
- Audio tab: master slider + mute, then each group with a row per sound (label, slider, % value, ▶ test) and a
  per-group reset.

## 5. Small fixes

- `COMMODITIES` order → `['cloth', 'coin', 'paper']` (display order everywhere; engine logic is order-independent).
- Skyport harbor: the mooring mast stands on a short brass catwalk extending the pier's end, starts at deck level,
  and the airship is tied to the mast top (nose touches / short rope), clear of the rate sign.
- Sakura road decor: e.g. lacquered wooden boardwalk slats / stepping stones with tiny lanterns — theme-fitting, cheap
  geometry, hidden for ghosts.
- Nordic road decor: e.g. split-log corduroy planks with a runestone — same constraints.
- Origami robber: the fox's head/ears sit on the body (no gap), whole figure grounded at y = 0.

## Testing

- Vitest: prefs sanitizing (`hudScale`, `hudLayout`, `sfxVolume`), hud layout helpers (`movePanel`, `slotPanels`,
  default layout, dice-only corners).
- `npm run typecheck`, `npm test`.
- Screenshots on the isolated test server (port 3210+, see memory): overlay from landing and in-game, each tab, HUD
  edit mode with a moved panel, HUD scales, phone width, the four 3D fixes.

## Work split

- Main session: `prefs.ts`, `hud.ts`, `GameScreen.tsx` HUD slots/editor, commodity order.
- Subagent A (3D): `board3d/themes/{skyport,origami,sakura,nordic}.tsx`.
- Subagent B (settings): `settingsUI.ts`, `components/settings/*`, `sound.ts`, `TopBar.tsx`, `Landing.tsx`,
  `app/layout.tsx`, `app/settings`, `app/profile/edit`, `components/profile/{SettingsPage,ProfileEditPage,ProfilePage}.tsx`.
