/**
 * Shared types and constants for the booking assistant.
 *
 * Deliberately free of imports so that anything may depend on it — the prompt
 * builder, which must stay testable without a database, and `gemini.ts`, which
 * has to be able to read the timeout policy without importing `provider.ts` and
 * closing a module cycle.
 *
 * ---------------------------------------------------------------------------
 * TWO PROPERTIES THIS FILE EXISTS TO ENFORCE
 *
 * 1. FAILURE IS A VALUE, NOT AN EXCEPTION. Every provider call returns
 *    `AIResult`, so a caller cannot forget to handle a timeout or a rate limit
 *    the way it can forget a try/catch. The assistant is a convenience on top
 *    of a booking system that already works; it must degrade to "I can't reach
 *    that right now" and never to a 500.
 *
 * 2. NOTHING PERSONAL CROSSES THIS BOUNDARY. There is no field anywhere in
 *    these types for a customer's name, phone, email or booking history. The
 *    assistant may ask for those details; the client captures them and posts
 *    them to the booking route directly. They never enter the model's context.
 * ---------------------------------------------------------------------------
 */

export type EnvLike = Record<string, string | undefined>;

/** The only provider implemented. The application never names it directly. */
export type ProviderName = 'gemini';

/**
 * How long any single provider call may take.
 *
 * Bounded because these run inside a request. `lib/mail.ts` learned this the
 * expensive way: nodemailer's two-minute default, combined with `after()`
 * keeping the function alive, held a serverless function open for two minutes
 * to deliver a message that was never going to arrive. A generation that has
 * not answered in twenty seconds is not going to feel like a chat anyway.
 */
export const DEFAULT_TIMEOUT_MS = 20_000;

/** An upper bound on the bound, so a mistyped env var cannot remove it. */
export const MAX_TIMEOUT_MS = 60_000;

export function resolveTimeoutMs(requested: number | undefined, configured?: number): number {
  const value = requested ?? configured ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(value, MAX_TIMEOUT_MS);
}

/**
 * Everything that can go wrong with a provider call, as a closed set.
 *
 * Closed rather than a free-text code so the caller can switch on it
 * exhaustively: each of these has a different right answer for the customer
 * ("try again in a moment" vs "the assistant is off right now").
 */
export type AIFailure =
  /** No key, no model, or no provider selected. Normal before the env is set. */
  | 'not_configured'
  /** The provider rejected the credential. A person has to fix this. */
  | 'unauthorised'
  /** The provider asked us to slow down. */
  | 'rate_limited'
  /** We gave up waiting. Bounded by design — see provider.ts. */
  | 'timeout'
  /** The provider is down, unreachable, or answered 5xx. */
  | 'unavailable'
  /** A 200 whose body was not the shape the API documents. */
  | 'malformed_response'
  /** The provider's own safety filter stopped the answer. */
  | 'blocked'
  /** We sent something the provider would not accept. Our bug, not theirs. */
  | 'bad_request';

export interface AIFailureResult {
  ok: false;
  failure: AIFailure;
  /**
   * Operational detail, safe to log: what failed and roughly why.
   *
   * Never a prompt, a conversation, an API key or a provider request body —
   * same rule as `safeError()` in lib/email.ts, and for the same reason. A log
   * drain is outside anything a customer can ask us to erase.
   */
  detail: string;
  /**
   * Whether trying again later could plausibly succeed.
   *
   * This is information for the caller, NOT an instruction to retry — nothing
   * in lib/ai retries anything. See the note in provider.ts.
   */
  retryable: boolean;
}

export type AIResult<T> = { ok: true; value: T } | AIFailureResult;

export type AIRole = 'user' | 'assistant';

/** One turn of conversation. Text only; no attachments, no metadata. */
export interface AIMessage {
  role: AIRole;
  content: string;
}

// ---------------------------------------------------------------------------
// Tool calling, described in provider-neutral terms
// ---------------------------------------------------------------------------

export interface AIToolParameter {
  type: 'string';
  description: string;
}

export interface AIToolDeclaration {
  name: ToolName;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, AIToolParameter>;
    required: string[];
  };
}

/** What the model asked for. Untrusted: every field is validated before use. */
export interface AIToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface AITextResponse {
  text: string;
}

export interface AIToolCallResponse {
  /** Prose the model produced alongside (or instead of) the call. */
  text: string | null;
  toolCall: AIToolCall | null;
}

export interface GenerateRequest {
  systemPrompt: string;
  messages: AIMessage[];
  /** Overrides the provider's own bound. Still bounded. */
  timeoutMs?: number;
  maxOutputTokens?: number;
  /** Caller-side cancellation, e.g. the customer navigating away. */
  signal?: AbortSignal;
}

export interface ToolCallRequest extends GenerateRequest {
  tools: AIToolDeclaration[];
}

// ---------------------------------------------------------------------------
// The four read-only tools
// ---------------------------------------------------------------------------

export const TOOL_NAMES = [
  'get_business_info',
  'get_services',
  'get_staff',
  'check_availability',
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

export type ToolFailure =
  /** The model named a tool that does not exist. */
  | 'unknown_tool'
  /** The model's arguments did not validate. */
  | 'invalid_arguments'
  /** A validated argument did not resolve to a real row. */
  | 'not_found'
  /** The request was well formed but outside what the business allows. */
  | 'out_of_range'
  /** The data layer failed. */
  | 'unavailable';

export type ToolResult =
  | { ok: true; tool: string; data: unknown }
  | { ok: false; tool: string; error: ToolFailure; message: string };

/**
 * One day of opening hours, as the site itself derives them: the union of every
 * active therapist's working hours. Absent days are `closed`, stated rather
 * than implied, so the model cannot read silence as "open".
 */
export interface OpeningHoursDay {
  day: string;
  closed: boolean;
  opens?: string;
  closes?: string;
}

export interface BusinessInfo {
  name: string;
  address: string | null;
  phone: string;
  website: string;
  opening_hours: OpeningHoursDay[];
  timezone: string;
}

/**
 * A treatment as the assistant may describe it.
 *
 * `id` is here because `check_availability` needs it. No other tool result
 * carries an internal id — see the note on StaffInfo.
 */
export interface ServiceInfo {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  duration: string;
  price_cents: number;
  price: string;
  active: true;
  /** Whether a room or chair has to be free as well as the therapist (§6). */
  requires_resource: boolean;
}

/**
 * A therapist, as the model is allowed to know her.
 *
 * Name, whether she is working, and what she does. No id (a name is enough to
 * ask about her availability, and `check_availability` resolves it server-side),
 * and never her phone, email, notes or anything from the auth tables.
 */
export interface StaffInfo {
  name: string;
  active: true;
  services: string[];
}

export interface AvailabilitySlot {
  /** 'HH:MM' in the business timezone. Never a browser-local time. */
  time: string;
  /** Who it would be with. A name, not an id. */
  with: string;
}

export interface AvailabilityInfo {
  date: string;
  service: string;
  timezone: string;
  slots: AvailabilitySlot[];
}

/**
 * Attached to every tool result that carries treatment or therapist data while
 * the placeholder menu is still in the database.
 *
 * Derived from the data on each call (`hasDemoData()`), never from a flag —
 * spec v2 §2. A flag has to be remembered and fails in the wrong direction:
 * forget it and the assistant quotes invented prices with nothing saying so.
 */
export interface SampleDataFlag {
  sample_data: boolean;
  sample_data_notice?: string;
}
