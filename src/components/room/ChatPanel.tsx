'use client';

import { Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, clearUnread, useGame } from '@/client/store';
import { PLAYER_COLORS } from '@/shared/colors';
import { CHAT_MAX } from '@/shared/text';

export function ChatPanel({ className = '', dark = false, autoFocus = false }: { className?: string; dark?: boolean; autoFocus?: boolean }) {
  const chat = useGame((s) => s.chat);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    clearUnread();
  }, [chat.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    const r = await api.chat(t);
    setSending(false);
    if (r.ok) setText('');
  };

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div ref={listRef} className="scroll-thin min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1" aria-live="polite">
        {chat.length === 0 && <p className={`text-sm ${dark ? 'text-foam/40' : 'text-ink-faint'}`}>Say hi to the table 👋</p>}
        {chat.map((m) =>
          m.system ? (
            <p key={m.id} className={`text-xs italic ${dark ? 'text-foam/50' : 'text-ink-faint'}`}>
              {m.text}
            </p>
          ) : (
            <p key={m.id} className={`break-words text-sm leading-snug ${dark ? 'text-paper' : 'text-ink'}`}>
              <span
                className="mr-1.5 rounded px-1.5 py-px text-xs font-extrabold"
                style={m.color ? { background: PLAYER_COLORS[m.color].hex, color: PLAYER_COLORS[m.color].ink } : undefined}
              >
                {m.name}
              </span>
              {m.text}
            </p>
          ),
        )}
      </div>
      <form onSubmit={send} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={CHAT_MAX}
          placeholder="Message the table…"
          aria-label="Chat message"
          autoFocus={autoFocus}
          className={
            dark
              ? 'min-w-0 flex-1 rounded-lg border border-white/15 bg-black/25 px-3 py-2 text-sm text-paper outline-none placeholder:text-foam/35 focus:border-amber'
              : 'input min-w-0 flex-1 py-2 text-sm'
          }
        />
        <button type="submit" className={`btn ${dark ? 'btn-primary' : 'btn-dark'} px-3`} disabled={!text.trim() || sending} aria-label="Send">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
