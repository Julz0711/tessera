'use client';

import { Box, Gamepad2, Grid2x2, LayoutGrid, Languages, Music, Palette, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
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

  return (
    <div className="settings-panel grid h-full min-h-0 min-w-0 gap-4 sm:grid-cols-[9rem_1fr] sm:gap-6">
      <div className="scroll-thin flex min-w-0 gap-1.5 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0" aria-label="Settings categories">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn shrink-0 justify-start gap-2 px-3 py-2 text-sm ${tab === t.id ? 'btn-on' : ''}`}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
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
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {BOARD_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`btn justify-start gap-3 px-3 py-2 text-left ${prefs.boardTheme === t.id ? 'btn-on' : ''}`}
                    onClick={() => prefs.set({ boardTheme: t.id })}
                  >
                    <ThemeSwatch theme={t.id} size={44} />
                    <span className="grid min-w-0">
                      <span className="whitespace-nowrap font-extrabold">{t.name}</span>
                      <span className="text-xs font-semibold opacity-75">{t.blurb}</span>
                    </span>
                  </button>
                ))}
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
