'use client';

import { Box, Gamepad2, Grid2x2, LayoutGrid, Languages, Palette, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePrefs } from '@/client/prefs';
import { BOARD_THEMES } from '@/client/themes';
import { DEFAULT_HUD_LAYOUT, HUD_SCALE, useHud, type HudScale } from '@/client/hud';
import { useSettingsUI, type SettingsTab } from '@/client/settingsUI';
import { play, setVolume, setSfxVolumes, SFX_GROUPS } from '@/client/sound';
import { ThemeSwatch } from '@/components/ui/ThemeSwatch';

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

  return (
    <div className="grid h-full gap-4 sm:grid-cols-[9rem_1fr] sm:gap-6">
      <div className="scroll-thin flex gap-1.5 overflow-x-auto pb-1 sm:flex-col sm:overflow-visible sm:pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`btn shrink-0 justify-start gap-2 px-3 py-2 text-sm ${tab === t.id ? 'btn-primary' : ''}`}
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
                <button type="button" className={`btn px-4 py-2 ${prefs.view === '3d' ? 'btn-primary' : ''}`} onClick={() => prefs.set({ view: '3d' })}>
                  <Box size={16} /> 3D board
                </button>
                <button type="button" className={`btn px-4 py-2 ${prefs.view === '2d' ? 'btn-primary' : ''}`} onClick={() => prefs.set({ view: '2d' })}>
                  <Grid2x2 size={16} /> 2D board
                </button>
                {prefs.view === '3d' && (
                  <>
                    <span className="mx-1 hidden w-px self-stretch bg-ink/10 sm:block" />
                    {(['high', 'low'] as const).map((q) => (
                      <button key={q} type="button" className={`btn px-4 py-2 capitalize ${prefs.graphics === q ? 'btn-primary' : ''}`} onClick={() => prefs.set({ graphics: q })}>
                        {q} quality
                      </button>
                    ))}
                  </>
                )}
              </div>
            </Section>
            <Section title="Board theme" hint="How the island looks, on the 3D and the 2D board. Only your screen changes; you can switch any time during a game.">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {BOARD_THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`btn justify-start gap-3 px-3 py-2 text-left ${prefs.boardTheme === t.id ? 'btn-primary' : ''}`}
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
              <div className="flex flex-wrap gap-2">
                {([true, false] as const).map((on) => (
                  <button key={String(on)} type="button" className={`btn px-4 py-2 ${prefs.weather === on ? 'btn-primary' : ''}`} onClick={() => prefs.set({ weather: on })}>
                    {on ? 'On' : 'Off'}
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Board size" hint="Size of the pieces, number tokens and harbors on the board.">
              <div className="flex flex-wrap gap-2">
                {(['small', 'medium', 'large'] as const).map((s) => (
                  <button key={s} type="button" className={`btn px-4 py-2 capitalize ${prefs.boardScale === s ? 'btn-primary' : ''}`} onClick={() => prefs.set({ boardScale: s })}>
                    {s}
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}

        {tab === 'gameplay' && (
          <>
            <Section title="Build hints" hint="Hovering a spot you can afford to build on previews the piece; click it to build.">
              <div className="flex flex-wrap gap-2">
                {([true, false] as const).map((on) => (
                  <button key={String(on)} type="button" className={`btn px-4 py-2 ${prefs.buildHints === on ? 'btn-primary' : ''}`} onClick={() => prefs.set({ buildHints: on })}>
                    {on ? 'On' : 'Off'}
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Confirm placements" hint="Placing a piece or moving the robber asks first: pick it in the popup, or click the spot again.">
              <div className="flex flex-wrap gap-2">
                {([true, false] as const).map((on) => (
                  <button key={String(on)} type="button" className={`btn px-4 py-2 ${prefs.confirmBuilds === on ? 'btn-primary' : ''}`} onClick={() => prefs.set({ confirmBuilds: on })}>
                    {on ? 'On' : 'Off'}
                  </button>
                ))}
              </div>
            </Section>
            <Section title="Animations" hint="Cards flying to whoever gets them. System follows your device's reduce-motion setting; Reduced shows cards where they land instead.">
              <div className="flex flex-wrap gap-2">
                {(['system', 'full', 'reduced'] as const).map((m) => (
                  <button key={m} type="button" className={`btn px-4 py-2 capitalize ${prefs.motion === m ? 'btn-primary' : ''}`} onClick={() => prefs.set({ motion: m })}>
                    {m}
                  </button>
                ))}
              </div>
            </Section>
          </>
        )}

        {tab === 'interface' && (
          <>
            <Section title="HUD scale" hint="Size of the in-game panels, top bar and dock.">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(HUD_SCALE) as HudScale[]).map((s) => (
                  <button key={s} type="button" className={`btn px-4 py-2 ${prefs.hudScale === s ? 'btn-primary' : ''}`} onClick={() => prefs.set({ hudScale: s })}>
                    {s === 'small' ? 'S' : s === 'medium' ? 'M' : 'L'}
                  </button>
                ))}
              </div>
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
            className="flex-1 accent-ink"
            aria-label="Master volume"
          />
          <span className="w-10 text-right text-sm font-bold tabular">{Math.round(prefs.volume * 100)}%</span>
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
                    className="flex-1 accent-ink"
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
