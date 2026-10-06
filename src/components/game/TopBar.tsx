"use client";

import {
  BookOpen,
  Box,
  ChartColumn,
  Copy,
  Grid2x2,
  ArrowLeft,
  Menu,
  Music,
  Settings,
  Trophy,
  ShieldCheck,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { statusLine } from "@/client/describe";
import { usePrefs } from "@/client/prefs";
import { useSettingsUI } from "@/client/settingsUI";
import { setVolume, setSfxVolumes } from "@/client/sound";
import { api, toast, useGame } from "@/client/store";
import { useWide } from "@/client/hud";
import { useGameDialog } from "@/client/ui";
import type { PlayerView } from "@/engine/view";
import type { RoomDTO } from "@/shared/protocol";
import { formatCode } from "@/components/room/Lobby";
import { WithKeys } from "@/components/ui/Kbd";
import { BANNER_ICONS, useCurrentBanner } from "./EventBanner";
import { LeaveDialog } from "./LeaveDialog";
import { MobileSide } from "./MobileSide";
import { ReactionPicker } from "./Reactions";
import { RulebookDialog } from "@/components/rules/RulebookDialog";
import { gameTypeOf } from "@/engine/maps";
import type { RuleMode } from "@/config/rulebook";

/** `status: false` leaves the turn pill out (wide screens show it above the dock, see TurnBar). */
export function TopBar({
  view,
  room,
  status: showStatus = true,
  onResults,
}: {
  view: PlayerView;
  room: RoomDTO;
  status?: boolean;
  /** The game is over and its results are closed: a key in the top-right corner opens them again. */
  onResults?: () => void;
}) {
  const router = useRouter();
  const conn = useGame((s) => s.conn);
  const prefs = usePrefs();
  const [menu, setMenu] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [rules, setRules] = useState(false);
  // The rulebook opens on this game: its type (a Voyagers or Special map) and its rules mode.
  const ruleModes = [
    ...new Set<RuleMode>([
      gameTypeOf(view.settings.map ?? "standard", view.mode),
      view.mode,
    ]),
  ];
  // Phones show the status line down above the hand, beside the dice (see Dock); the top bar keeps it
  // on wider screens.
  const phone = !useWide(1024);

  useEffect(() => setVolume(prefs.volume), [prefs.volume]);
  useEffect(() => setSfxVolumes(prefs.sfxVolume), [prefs.sfxVolume]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/r/${room.code}`,
      );
      toast("Invite link copied", "good");
    } catch {
      toast(`${window.location.origin}/r/${room.code}`);
    }
  };
  const leave = async () => {
    await api.leaveRoom();
    router.push("/");
  };
  // Walking away from a running game asks first; watching, or a finished game, just leaves.
  const askLeave = () => {
    setMenu(false);
    if (view.phase !== "ended" && room.you.seat !== null) setConfirmLeave(true);
    else void leave();
  };

  return (
    <div className="game-toolbar pointer-events-none flex items-start justify-between gap-2 p-2 sm:p-3">
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            className="btn btn-dark h-10 w-10 p-0"
            onClick={() => setMenu((m) => !m)}
            aria-label="Menu"
            aria-expanded={menu}
          >
            <Menu size={18} />
          </button>
          {menu && (
            <div className="paper animate-pop absolute left-0 top-12 z-40 grid w-56 gap-1.5 p-3">
              <button
                type="button"
                className="btn py-1.5 text-sm lg:hidden"
                onClick={() => {
                  setMenu(false);
                  useSettingsUI.getState().show();
                }}
              >
                <Settings size={15} /> Settings
              </button>
              <button
                type="button"
                className="btn py-1.5 text-sm"
                onClick={() => {
                  setMenu(false);
                  prefs.set({ view: prefs.view === "3d" ? "2d" : "3d" });
                }}
              >
                {prefs.view === "3d" ? (
                  <Grid2x2 size={15} />
                ) : (
                  <Box size={15} />
                )}{" "}
                {prefs.view === "3d" ? "2D board" : "3D board"}
              </button>
              <button
                type="button"
                className="btn py-1.5 text-sm"
                onClick={() =>
                  prefs.set({ volume: prefs.volume > 0 ? 0 : 0.6 })
                }
              >
                {prefs.volume > 0 ? (
                  <Volume2 size={15} />
                ) : (
                  <VolumeX size={15} />
                )}{" "}
                {prefs.volume > 0 ? "Mute" : "Unmute"}
              </button>
              <button
                type="button"
                className="btn py-1.5 text-sm"
                onClick={() =>
                  prefs.set({ musicVolume: prefs.musicVolume > 0 ? 0 : 0.5 })
                }
                aria-pressed={prefs.musicVolume > 0}
              >
                <Music size={15} />{" "}
                {prefs.musicVolume > 0 ? "Music off" : "Music on"}
              </button>
              <button
                type="button"
                className="btn py-1.5 text-sm"
                onClick={() => {
                  setMenu(false);
                  setRules(true);
                }}
              >
                <BookOpen size={15} /> Rules
              </button>
              <button
                type="button"
                className="btn py-1.5 text-sm"
                onClick={() => {
                  setMenu(false);
                  useGameDialog.getState().show("stats");
                }}
              >
                <ChartColumn size={15} /> Live stats
              </button>
              {room.you.isAdmin && view.phase !== "ended" && (
                <button
                  type="button"
                  className="btn py-1.5 text-sm"
                  onClick={() => {
                    setMenu(false);
                    useGameDialog.getState().show("admin");
                  }}
                >
                  <ShieldCheck size={15} /> Admin tools
                </button>
              )}
              <button
                type="button"
                className="btn py-1.5 text-sm"
                onClick={copy}
              >
                <Copy size={15} /> Copy invite link
              </button>
              <button
                type="button"
                className="btn btn-danger py-1.5 text-sm"
                onClick={askLeave}
              >
                <ArrowLeft size={15} /> Leave game
              </button>
            </div>
          )}
          <RulebookDialog
            open={rules}
            onClose={() => setRules(false)}
            modes={ruleModes}
          />
          {confirmLeave && (
            <LeaveDialog
              view={view}
              room={room}
              onStay={() => setConfirmLeave(false)}
              onLeave={leave}
            />
          )}
        </div>
        <button
          type="button"
          className="btn btn-dark h-10 w-10 p-0 max-lg:hidden"
          onClick={() => useSettingsUI.getState().show()}
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={18} />
        </button>
        <button
          type="button"
          onClick={copy}
          className="game-code btn btn-dark hidden h-10 px-3 lg:inline-flex"
          title="Copy invite link"
        >
          <span className="text-sm font-black tabular tracking-label">
            {formatCode(room.code)}
          </span>
        </button>
        {room.you.seat !== null && <ReactionPicker />}
                {/* Only shown while the connection is lost: a working connection needs no badge. */}
        {conn !== "online" && (
          <span
            className="game-connection glass flex h-10 items-center px-2.5 text-terracotta"
            title={conn}
            role="status"
            aria-label="Reconnecting to your table"
          >
            <WifiOff size={16} className="animate-pulse" />
          </span>
        )}
        <div className="flex items-center gap-1.5 lg:hidden">
          {room.you.seat !== null && <MobileSide view={view} />}
        </div>
      </div>

      {!phone && showStatus && <StatusLane view={view} />}

      {/* The right-hand end of the bar: it balances the buttons on the left so the status pill stays
          centred, and holds the Results key once the game is over. (The phones' dice sit above the hand.) */}
      <div className="pointer-events-auto flex justify-end">
        {onResults && (
          <button type="button" className="btn btn-primary h-10 gap-1.5 px-3 text-sm" onClick={onResults}>
            <Trophy size={16} /> Results
          </button>
        )}
      </div>

    </div>
  );
}

/**
 * The status line: whose move it is and what to do. On phones it is also the one message lane (see
 * `lane`): an event banner first (robber, barbarians…) as one line, then the latest toast, otherwise
 * the status, so nothing stacks over the island. Phones show it above the hand, beside the dice.
 */
export function StatusLane({ view, lane: asLane = false }: { view: PlayerView; lane?: boolean }) {
  const status = statusLine(view);
  const banner = useCurrentBanner();
  const lastToast = useGame((s) => s.toasts[s.toasts.length - 1] ?? null);
  const lane = !asLane ? null : banner ? "banner" : lastToast ? "toast" : null;
  const BannerIcon = banner ? BANNER_ICONS[banner.icon] : null;

  if (lane === "banner" && banner) {
    // A big event (robber, barbarians…) for its few seconds, as one line.
    return (
      <div
        className="game-status pointer-events-auto flex items-center gap-2.5 rounded-lg border-2 border-l-8 border-ink bg-paper px-2.5 py-1.5 text-left text-ink"
        style={{ borderLeftColor: banner.color }}
        role="status"
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-ink text-paper" style={{ background: banner.color }}>
          {BannerIcon && <BannerIcon size={15} strokeWidth={2.5} />}
        </span>
        <span className="min-w-0">
          <b className="font-black">{banner.title}</b>
          <span className="font-semibold text-ink-soft"> · {banner.text}</span>
        </span>
      </div>
    );
  }
  if (lane === "toast" && lastToast) {
    // A toast takes the lane next, rather than floating over the screen.
    return (
      <div
        className={`game-status pointer-events-auto rounded-lg border-2 border-ink px-3 py-2 text-center font-bold ${
          lastToast.tone === "error" ? "bg-terracotta text-white" : lastToast.tone === "good" ? "bg-moss text-white" : "bg-paper text-ink"
        }`}
        role="status"
      >
        {lastToast.text}
      </div>
    );
  }
  return (
    <div
      className={`game-status pointer-events-auto max-w-[min(560px,55vw)] rounded-lg border-2 border-ink px-3 py-2 text-center text-sm font-bold sm:px-4 sm:text-base ${
        status.mine ? "attention bg-amber text-ink" : "bg-sea-800 text-paper"
      }`}
      aria-live="polite"
    >
      <WithKeys text={status.text} />
    </div>
  );
}
