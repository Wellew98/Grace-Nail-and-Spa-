import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  BUSY_MESSAGE,
  FALLBACK_MESSAGE,
  describeAction,
  limitsFrom,
  orchestrate,
  type ClientAction,
} from '@/lib/ai/orchestrator';
import { getProvider } from '@/lib/ai/provider';
import { clientIp, consume } from '@/lib/ai/rate-limit';
import { getBusiness } from '@/lib/public-data';
import type { AIMessage } from '@/lib/ai/types';

/**
 * POST /api/ai/chat — the assistant's only public surface.
 *
 * ---------------------------------------------------------------------------
 * THIS ROUTE CONTAINS NO BUSINESS LOGIC.
 *
 * It validates, rate limits, and hands off. Every fact comes from the tools,
 * every tool reads the same rows the site renders, and the booking engine is
 * not reachable from here at all — there is no create, cancel or reschedule
 * tool in this batch, so the worst a compromised conversation can do is read
 * the public catalogue.
 *
 * ORDER MATTERS. Rate limiting happens before the conversation is even parsed,
 * so a visitor sending a megabyte of nonsense is refused on the cheapest
 * possible path rather than after validating it.
 * ---------------------------------------------------------------------------
 */

export const dynamic = 'force-dynamic';

/**
 * A turn is up to `AI_MAX_TOOL_CALLS` provider round trips plus a Postgres
 * availability query, and the provider timeout alone is 20s by default.
 * Measured locally, an availability turn with a stubbed provider is ~90ms and
 * the real cost is entirely the model.
 *
 * Set above the worst realistic case with headroom rather than left at the
 * platform default, which would truncate a working request mid-answer and look
 * exactly like a bug in the assistant.
 */
export const maxDuration = 60;

const limits = limitsFrom();

const messageSchema = z.strictObject({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(limits.maxMessageLength),
});

/**
 * Structured actions are validated as strictly as anything the model produces,
 * and then checked against the database in `describeAction`. A payload from
 * the browser has no more authority than a payload from the model.
 */
const actionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('service'), serviceId: z.uuid() }),
  z.strictObject({
    kind: z.literal('slot'),
    serviceId: z.uuid(),
    startsAt: z.iso.datetime({ offset: true }),
    staffId: z.union([z.uuid(), z.null()]).optional(),
  }),
]);

const bodySchema = z.strictObject({
  messages: z.array(messageSchema).min(1).max(limits.maxMessages),
  action: actionSchema.optional(),
});

/** Never a stack, never a provider string, never an id. */
function reply(message: string, status = 200, degraded = true) {
  return NextResponse.json(
    { reply: message, attachments: [], degraded, bookUrl: '/book' },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  // 1. Rate limit first — before parsing, so abuse costs the least possible.
  const verdict = await consume(clientIp(request.headers));
  if (!verdict.allowed) {
    console.warn('[ai] rate limited', { reason: verdict.reason });
    // A friendly body, not a bare 429. The customer gets a way forward.
    return reply(verdict.reason === 'unavailable' ? FALLBACK_MESSAGE : BUSY_MESSAGE, 429);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return reply('I did not catch that. Try sending it again.', 400);
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    // The reason stays in the log. Handing a customer a validation trace tells
    // them the shape of the endpoint and tells a real customer nothing.
    console.warn('[ai] rejected request', { issue: parsed.error.issues[0]?.code });
    return reply('I did not catch that. Try sending it again.', 400);
  }

  const provider = getProvider();
  // No key, no model, or a key in a NEXT_PUBLIC_ variable. Normal before the
  // AI variables are set, and never an error the customer should see.
  if (!provider) return reply(FALLBACK_MESSAGE, 200);

  const business = await getBusiness();
  if (!business) return reply(FALLBACK_MESSAGE, 200);

  const messages: AIMessage[] = parsed.data.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  // A tapped button becomes a customer turn only after the database agrees it
  // was a real offer. A rejected action falls through to the conversation as
  // it stands rather than failing the request.
  if (parsed.data.action) {
    const described = await describeAction(parsed.data.action as ClientAction, {
      businessId: business.id,
    });
    if (!described) {
      console.warn('[ai] rejected action', { kind: parsed.data.action.kind });
      return reply('That option is no longer available. Ask me what else is free.', 200, false);
    }
    messages.push({ role: 'user', content: described });
  }

  try {
    const result = await orchestrate({ messages, businessId: business.id, provider, limits });
    return NextResponse.json(
      { ...result, bookUrl: '/book' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    // orchestrate() is built to return rather than throw. If it throws anyway,
    // the customer still gets a sentence and a working booking page.
    console.error('[ai] chat failed', {
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return reply(FALLBACK_MESSAGE, 200);
  }
}
