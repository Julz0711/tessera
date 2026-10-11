'use client';

import { Accessibility, Box, Check, Gamepad2, Grid2x2, LayoutGrid, Languages, Music, Palette, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '@/client/prefs';
import { BOARD_THEMES } from '@/client/themes';
import { DEFAULT_HUD_LAYOUT, HUD_SCALE, useHud, type HudScale } from '@/client/hud';
import { useSettingsUI, type SettingsTab } from '@/client/settingsUI';
import { play, setVolume, setSfxVolumes, SFX_GROUPS } from '@/client/sound';
import { MUSIC_MOOD_NAMES } from '@/client/music';
import { Segmented } from '@/components/ui/Segmented';
import { ThemeSwatch } from '@/components/ui/ThemeSwatch';
import { InstallAppButton, useAppInstall } from '@/components/ui/AppExperience';

const TABS: { id: SettingsTab; label: string; icon: typeof Palette }[] = [
  { id: 'board', label: 'Board', icon: Palette },
  { id: 'gameplay', label: 'Gameplay', icon: Gamepad2 },
  { id: 'interface', label: 'Interface', icon: LayoutGrid },
  { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
  { id: 'audio', label: 'Audio', icon: Volume2 },
  { id: 'language', label: 'Language', icon: Languages },
];

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid gap-2 border-b border-ink/10 py-5 first:pt-0 last:border-0">
      <span className="label">{title}</span>
      {children}
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

/** True at or above the `lg` (1024px) breakpoint — the HUD editor is desktop-only. */
function useIsWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return wide;
}

/** The tabbed body of the settings overlay/page. Every change applies instantly via `usePrefs().set`. */
export function SettingsPanel() {
  const prefs = usePrefs();
  const tab = useSettingsUI((s) => s.tab);
  const setTab = useSettingsUI((s) => s.show);
  const pathname = usePathname();
  const inGame = pathname?.startsWith('/r/') ?? false;
  const wide = useIsWide();
  const { installed } = useAppInstall();
  // Phones: the categories are one row you swipe; keep the open one in view.
  const nav = useRef<HTMLDivElement>(null);
  // Which ends of that row hide more categories: that edge fades out, hinting the row scrolls.
  const [more, setMore] = useState({ left: false, right: false });
  const measureNav = () => {
    const row = nav.current;
    if (!row) return;
    setMore({ left: row.scrollLeft > 1, right: row.scrollLeft + row.clientWidth < row.scrollWidth - 1 });
  };
  useEffect(() => {
    const row = nav.current;
    if (!row) return;
    measureNav();
    const ro = new ResizeObserver(measureNav);
    ro.observe(row);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const row = nav.current;
    const el = row?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!row || !el || row.scrollWidth <= row.clientWidth) return;
    row.scrollTo({ left: el.offsetLeft - (row.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' });
  }, [tab]);

  return (
    <div className="settings-panel grid h-full min-h-0 min-w-0 gap-4 sm:grid-cols-[9rem_1fr] sm:gap-6">
      {/* The categories as one segmented track, like the settings' own choices: plain rows, the open one
          a key. Phones: a single row you swipe, so the settings start right below; wider: a column. */}
      <div
        ref={nav}
        role="tablist"
        aria-label="Settings categories"
        onScroll={measureNav}
        style={{
          maskImage:
            more.left || more.right
              ? `linear-gradient(to right, ${more.left ? 'transparent, #000 2.5rem' : '#000'}, ${more.right ? '#000 calc(100% - 2.5rem), transparent' : '#000'})`
              : undefined,
        }}
        className="seg relative flex w-full min-w-0 self-start overflow-x-auto [scrollbar-width:none] sm:flex-col sm:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className="seg-opt shrink-0 gap-1.5 px-3 py-1.5 sm:min-w-0 sm:justify-start sm:gap-2 sm:px-2.5"
            onClick={() => setTab(t.id)}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      <div className="scroll-thin min-h-0 min-w-0 overflow-y-auto pr-1">
        {tab === 'board' && (
          <>
            <Section title="Graphics" hint="The 2D board is lighter on older phones and laptops. You can switch any time during a game.">
              <div className="flex flex-wrap gap-2">
                <Segmented
                  label="Board view"
                  value={prefs.view}
                  onChange={(view) => prefs.set({ view })}
                  options={[
                    { value: '3d', label: <><Box size={16} /> 3D board</> },
                    { value: '2d', label: <><Grid2x2 size={16} /> 2D board</> },
                  ]}
                />
                {prefs.view === '3d' && (
                  <Segmented
                    label="Quality"
                    value={prefs.graphics}
                    onChange={(graphics) => prefs.set({ graphics })}
                    options={[
                      { value: 'high', label: 'High quality' },
                      { value: 'low', label: 'Low quality' },
                    ]}
                  />
                )}
              </div>
            </Section>
            <Section title="Board theme" hint="How the island looks, on the 3D and the 2D board. Only your screen changes; you can switch any time during a game.">
              {/* Two a row even on phones (name only there), so the ten themes fit in a screen. */}
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-3" role="radiogroup" aria-label="Board theme">
                {BOARD_THEMES.map((t) => {
                  const on = prefs.boardTheme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={`btn btn-choice min-w-0 justify-start gap-2 px-2 py-2 text-left sm:gap-3 sm:px-3 ${on ? 'btn-on' : ''}`}
                      onClick={() => prefs.set({ boardTheme: t.id })}
                      title={t.blurb}
                    >
                      <span className="shrink-0 [&>svg]:h-auto [&>svg]:w-9 sm:[&>svg]:w-11">
                        <ThemeSwatch theme={t.id} size={44} />
                      </span>
                      <span className="grid min-w-0 flex-1">
                        <span className="truncate font-bold">{t.name}</span>
                        <span className="hidden text-xs font-semibold opacity-75 sm:block">{t.blurb}</span>
                      </span>
                      {/* The theme in use carries a check, like the picked colour: the pale blue alone is
                          too close to the white keys on the paper panel. */}
                      {on && (
                        <span className="grid h-5 w-5 shrink-0 place-items-center self-center rounded-full bg-ink text-paper sm:h-6 sm:w-6" aria-hidden>
                          <Check size={13} strokeWidth={3.5} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Section>
            <Section title="Weather" hint="Rain, blossom, snow, fireflies and more over the 3D board, to suit the theme. Stays off while animations are reduced.">
              <Segmented
                value={prefs.weather}
                onChange={(weather) => prefs.set({ weather })}
                options={[
                  { value: true, label: 'On' },
                  { value: false, label: 'Off' },
                ]}
              />
            </Section>
            <Section title="Board size" hint="Size of the pieces, number tokens and harbors on the board.">
              <Segmented
                value={prefs.boardScale}
                onChange={(boardScale) => prefs.set({ boardScale })}
                options={[
                  { value: 'small', label: 'Small' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'large', label: 'Large' },
                ]}
              />
            </Section>
          </>
        )}

        {tab === 'gameplay' && (
          <>
            <Section title="Build hints" hint="Hovering a spot you can afford to build on previews the piece; click it to build.">
              <Segmented
                value={prefs.buildHints}
                onChange={(buildHints) => prefs.set({ buildHints })}
                options={[
                  { value: true, label: 'On' },
                  { value: false, label: 'Off' },
                ]}
              />
            </Section>
            <Section title="Confirm placements" hint="Placing a piece or moving the robber asks first: pick it in the popup, or click the spot again.">
              <Segmented
                value={prefs.confirmBuilds}
                onChange={(confirmBuilds) => prefs.set({ confirmBuilds })}
                options={[
                  { value: true, label: 'On' },
                  { value: false, label: 'Off' },
                ]}
              />
            </Section>
            <Section
              title="Auto-decline trades"
              hint="A trade offer asking for cards you don't have declines itself after 5 seconds (a bar on the offer counts down). Off: it waits until you answer."
            >
              <Segmented
                value={prefs.autoDeclineTrades}
                onChange={(autoDeclineTrades) => prefs.set({ autoDeclineTrades })}
                options={[
                  { value: true, label: 'After 5 seconds' },
                  { value: false, label: 'Off' },
                ]}
              />
            </Section>
          </>
        )}

        {tab === 'accessibility' && (
          <>
            <Section title="Animations" hint="Cards flying to whoever gets them. System follows your device's reduce-motion setting; Reduced shows cards where they land instead.">
              <Segmented
                value={prefs.motion}
                onChange={(motion) => prefs.set({ motion })}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'full', label: 'Full' },
                  { value: 'reduced', label: 'Reduced' },
                ]}
              />
            </Section>
            <Section title="Barbarian track" hint="On the 2D board in Knights & Barbarians: the tall track of the ship's voyage beside the board, or a small panel with the HUD. The 3D board shows its track on the sea.">
              <Segmented
                value={prefs.barbarianTrack}
                onChange={(barbarianTrack) => prefs.set({ barbarianTrack })}
                options={[
                  { value: 'large', label: 'Large' },
                  { value: 'small', label: 'Small' },
                ]}
              />
            </Section>
            <Section title="Turn wide maps" hint="On a phone held upright, the 2D board turns a wide map a quarter turn so the island runs down the screen and gets bigger.">
              <Segmented
                value={prefs.turnBoard}
                onChange={(turnBoard) => prefs.set({ turnBoard })}
                options={[
                  { value: true, label: 'On' },
                  { value: false, label: 'Off' },
                ]}
              />
            </Section>
            <Section title="Mouse pointers" hint="Show other players' pointers (and clicks) over the board: on by default. Share my pointer: lets them see yours, same as the pointer button next to the emoji button. Wide screens with a mouse only; never on touch screens.">
              <div className="mb-1 text-xs font-bold">Show other players' pointers</div>
              <Segmented
                value={prefs.seeCursors}
                onChange={(seeCursors) => prefs.set({ seeCursors })}
                options={[
                  { value: true, label: 'On' },
                  { value: false, label: 'Off' },
                ]}
              />
              <div className="mb-1 mt-3 text-xs font-bold">Share my pointer</div>
              <Segmented
                value={prefs.shareCursor}
                onChange={(shareCursor) => prefs.set({ shareCursor })}
                options={[
                  { value: true, label: 'On' },
                  { value: false, label: 'Off' },
                ]}
              />
            </Section>
            <Section title="Amber cursor (beta)" hint="Swap the system mouse pointer for the amber arrow. Mice only; touch screens have no pointer.">
              <Segmented
                value={prefs.customCursor}
                onChange={(customCursor) => prefs.set({ customCursor })}
                options={[
                  { value: true, label: 'On' },
                  { value: false, label: 'Off' },
                ]}
              />
            </Section>
            <Section title="Zoom buttons" hint="Zoom in, out and back on the 2D board with buttons. Without them, scroll, pinch or drag the board.">
              <Segmented
                value={prefs.zoomButtons}
                onChange={(zoomButtons) => prefs.set({ zoomButtons })}
                options={[
                  { value: true, label: 'On' },
                  { value: false, label: 'Off' },
                ]}
              />
            </Section>
          </>
        )}

        {tab === 'interface' && (
          <>
            <Section title="HUD scale" hint="Size of the in-game panels, top bar and dock on wide screens. Phones fit them to the screen.">
              <Segmented
                value={prefs.hudScale}
                onChange={(hudScale) => prefs.set({ hudScale })}
                options={(Object.keys(HUD_SCALE) as HudScale[]).map((s) => ({ value: s, label: s === 'small' ? 'S' : s === 'medium' ? 'M' : 'L' }))}
              />
            </Section>
            <Section title="Layout" hint="Try the new in-game layout: a build column above your cards, highlighted when you can build.">
              <Segmented
                value={prefs.uiVariant}
                onChange={(uiVariant) => prefs.set({ uiVariant })}
                options={[
                  { value: 'legacy', label: 'Legacy' },
                  { value: 'experimental', label: 'Experimental (beta)' },
                ]}
              />
            </Section>
            <Section
              title="HUD layout"
              hint={inGame ? 'Drag panels to a slot. Wide screens only (1024px and up).' : 'Start or join a game, on a screen 1024px or wider, to rearrange panels.'}
            >
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn px-4 py-2"
                  disabled={!inGame || !wide}
                  onClick={() => {
                    useSettingsUI.getState().hide();
                    useHud.getState().startEditing();
                  }}
                >
                  Edit HUD layout
                </button>
                <button type="button" className="btn px-4 py-2" onClick={() => prefs.set({ hudLayout: DEFAULT_HUD_LAYOUT })}>
                  <RotateCcw size={15} /> Reset layout
                </button>
              </div>
            </Section>
            {!installed && (
              <Section title="Home Screen" hint="A shortcut that opens the game full screen, without the browser bars. Nothing to download.">
                <div>
                  <InstallAppButton className="btn px-4 py-2" />
                </div>
              </Section>
            )}
          </>
        )}

        {tab === 'audio' && <AudioTab />}

        {tab === 'language' && (
          <Section title="Language" hint="More languages are planned.">
            <select className="input max-w-xs" value="en" disabled aria-label="Language">
              <option value="en">English</option>
            </select>
          </Section>
        )}
      </div>
    </div>
  );
}

function AudioTab() {
  const prefs = usePrefs();
  return (
    <>
      <Section title="Master volume">
        <div className="flex items-center gap-3">
          <button type="button" className="btn btn-ghost h-9 w-9 p-0" onClick={() => prefs.set({ volume: prefs.volume > 0 ? 0 : 0.6 })} aria-label="Toggle sound">
            {prefs.volume > 0 ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={prefs.volume}
            onChange={(e) => prefs.set({ volume: Number(e.target.value) })}
            className="range flex-1"
            aria-label="Master volume"
          />
          <span className="w-10 text-right text-sm font-bold tabular">{Math.round(prefs.volume * 100)}%</span>
        </div>
      </Section>
      <Section
        title="Music"
        hint={`Calm background music in games (off unless you turn it on), made up as it plays. Each board theme has its own; yours is ${MUSIC_MOOD_NAMES[prefs.boardTheme]}. It follows the master volume.`}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-ghost h-9 w-9 p-0"
            onClick={() => prefs.set({ musicVolume: prefs.musicVolume > 0 ? 0 : 0.5 })}
            aria-label={prefs.musicVolume > 0 ? 'Turn the music off' : 'Turn the music on'}
            aria-pressed={prefs.musicVolume > 0}
          >
            {prefs.musicVolume > 0 ? <Music size={17} /> : <VolumeX size={17} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={prefs.musicVolume}
            onChange={(e) => prefs.set({ musicVolume: Number(e.target.value) })}
            className="range flex-1"
            aria-label="Music volume"
          />
          <span className="w-10 text-right text-sm font-bold tabular">{prefs.musicVolume > 0 ? `${Math.round(prefs.musicVolume * 100)}%` : 'Off'}</span>
        </div>
      </Section>
      {SFX_GROUPS.map((group) => (
        <div key={group.id} className="paper-flat mt-4 grid gap-2 p-3">
          <div className="flex items-center justify-between">
            <span className="label">{group.label}</span>
            <button
              type="button"
              className="btn btn-ghost px-2 py-1 text-xs"
              onClick={() => {
                const next = { ...prefs.sfxVolume };
                for (const s of group.sounds) delete next[s.sfx];
                prefs.set({ sfxVolume: next });
              }}
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>
          <div className="grid gap-2">
            {group.sounds.map(({ sfx, label }) => {
              const v = prefs.sfxVolume[sfx] ?? 1;
              return (
                <div key={sfx} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-sm font-semibold">{label}</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={v}
                    onChange={(e) => prefs.set({ sfxVolume: { ...prefs.sfxVolume, [sfx]: Number(e.target.value) } })}
                    className="range flex-1"
                    aria-label={label}
                  />
                  <span className="w-10 text-right text-xs font-bold tabular">{Math.round(v * 100)}%</span>
                  <button
                    type="button"
                    className="btn btn-ghost h-7 w-7 shrink-0 p-0"
                    aria-label={`Play ${label}`}
                    onClick={() => {
                      setVolume(prefs.volume);
                      setSfxVolumes(prefs.sfxVolume);
                      play(sfx);
                    }}
                  >
                    <Play size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
