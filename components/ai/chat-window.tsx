'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AvailabilityOptions } from './availability-options';
import { ChatInput } from './chat-input';
import { ChatMessage, ChatThinking, type ChatTurn } from './chat-message';
import { ServiceCards } from './service-cards';
import { SuggestionButtons } from './suggestion-buttons';
import type { ChatAttachment } from '@/lib/ai/types';

/**
 * The conversation panel.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE CONVERSATION LIVES
 *
 * Here, in component state, and nowhere else. Nothing is written to Postgres:
 * there is no business requirement for a transcript, and storing one would
 * create a personal-information store that the privacy notice does not cover
 * and the erasure path does not reach. Closing the tab is the retention policy.
 *
 * Only user and assistant TEXT is sent back on the next turn. Tool calls and
 * tool results stay server-side inside a single request, so a client cannot
 * replay a forged tool result — and the ids in `attachments` are used for
 * structured actions but never re-enter the model's context.
 * ---------------------------------------------------------------------------
 */

const GREETING =
  "Hi! I can help you find a treatment, check what's free, or answer anything about the studio. What are you after?";

interface ChatResponse {
  reply: string;
  attachments?: ChatAttachment[];
  degraded?: boolean;
  bookUrl?: string;
}

export function ChatWindow({
  businessName,
  maxMessageLength,
  onClose,
}: {
  businessName: string;
  maxMessageLength: number;
  onClose: () => void;
}) {
  const [turns, setTurns] = useState<ChatTurn[]>([{ role: 'assistant', content: GREETING }]);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [turns, attachments, busy]);

  // A conversation left open while the customer walks away should not keep a
  // request alive behind them.
  useEffect(() => () => inFlight.current?.abort(), []);

  const send = useCallback(
    async (text: string, action?: unknown) => {
      if (busy) return;

      // The greeting is ours, not the model's — sending it back would have the
      // assistant treating its own hello as something the customer said.
      const history = [...turns].slice(1);
      const next: ChatTurn[] = [...turns, { role: 'user', content: text }];

      setTurns(next);
      setBusy(true);
      setError(null);

      const controller = new AbortController();
      inFlight.current = controller;

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            messages: [...history, { role: 'user', content: text }].map((turn) => ({
              role: turn.role,
              content: turn.content,
            })),
            ...(action ? { action } : {}),
          }),
        });

        const data = (await response.json()) as ChatResponse;
        setTurns((current) => [
          ...current,
          { role: 'assistant', content: data.reply, degraded: data.degraded },
        ]);
        setAttachments(data.attachments ?? []);
      } catch (failure) {
        if ((failure as { name?: string })?.name === 'AbortError') return;
        // A silent failure reads as the assistant ignoring them.
        setError("That didn't send. Check your connection and try again.");
      } finally {
        setBusy(false);
        inFlight.current = null;
      }
    },
    [busy, turns],
  );

  const services = attachments.find((item) => item.kind === 'services');
  const availability = attachments.find((item) => item.kind === 'availability');
  const showSuggestions = turns.length === 1 && !busy;

  return (
    <div
      role="dialog"
      aria-label={`Chat with ${businessName}`}
      className="fixed inset-0 z-50 flex flex-col bg-blush-50 sm:inset-auto sm:right-5 sm:bottom-5 sm:h-[min(38rem,calc(100vh-3rem))] sm:w-[24rem] sm:rounded-2xl sm:border sm:border-blush-200 sm:shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-blush-200 px-4 py-3">
        <div>
          <p className="text-[0.65rem] tracking-[0.22em] text-gilt-600 uppercase">Assistant</p>
          <p className="font-display text-lg leading-tight font-semibold text-aubergine-900">
            {businessName}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-11 place-items-center rounded-full text-mauve-500 hover:bg-blush-100"
        >
          <span className="sr-only">Close chat</span>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* The conversation scrolls; the header and composer do not. */}
      <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
        {turns.map((turn, index) => (
          <ChatMessage key={index} turn={turn} bookUrl="/book" />
        ))}

        {!busy && services && (
          <ServiceCards
            attachment={services}
            disabled={busy}
            onChoose={(serviceId, name) =>
              void send(`I'm interested in the ${name}.`, { kind: 'service', serviceId })
            }
          />
        )}

        {!busy && availability && (
          <AvailabilityOptions
            attachment={availability}
            disabled={busy}
            onChoose={(option) =>
              void send(`${option.label} please.`, {
                kind: 'slot',
                serviceId: option.serviceId,
                startsAt: option.startsAt,
                staffId: option.staffId,
              })
            }
          />
        )}

        {showSuggestions && <SuggestionButtons disabled={busy} onPick={(text) => void send(text)} />}
        {busy && <ChatThinking />}
        {error && (
          <p role="alert" className="rounded-xl bg-lacquer-500/10 px-3 py-2 text-sm text-lacquer-600">
            {error}
          </p>
        )}

        <div ref={endRef} />
      </div>

      <ChatInput onSend={(text) => void send(text)} disabled={busy} maxLength={maxMessageLength} />
    </div>
  );
}
