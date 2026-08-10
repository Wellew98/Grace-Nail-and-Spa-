import 'server-only';
import { redactPersonalDetails } from './validation';
import {
  DEFAULT_TIMEOUT_MS,
  resolveTimeoutMs,
  type AIFailureResult,
  type AIMessage,
  type AIResult,
  type AITextResponse,
  type AIToolCall,
  type AIToolCallResponse,
  type AIToolDeclaration,
  type GenerateRequest,
  type ProviderName,
  type ToolCallRequest,
} from './types';
import type { AIProvider } from './provider';

/**
 * Google Gemini, over its REST API.
 *
 * ---------------------------------------------------------------------------
 * WHY REST AND NOT THE SDK
 *
 * The surface used here is one endpoint and one response shape. An SDK would
 * add a dependency to the serverless bundle for that, and this project has
 * already had a production outage caused by a package that did not survive
 * bundling (`pg`, and its optional native requires — see next.config.ts). Two
 * things also come out easier by hand and matter more than convenience: a
 * bounded timeout on every call, and error mapping precise enough that
 * "unauthorised" and "rate limited" are distinguishable by the caller.
 *
 * THE KEY GOES IN A HEADER, NEVER THE QUERY STRING. Gemini accepts `?key=`.
 * Anything in a URL ends up in proxy logs, error messages and stack traces —
 * spec v2 §9.5 is "no personal data in URLs or logs", and a credential deserves
 * the same treatment. `x-goog-api-key` keeps it out of every one of those.
 * ---------------------------------------------------------------------------
 */

export const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta';

export interface GeminiOptions {
  apiKey: string;
  /** From AI_MODEL. There is no default — see providerConfigProblem(). */
  model: string;
  timeoutMs?: number;
  /** Injectable so the failure modes can be tested without a network. */
  fetchImpl?: typeof fetch;
  endpoint?: string;
}

interface GeminiPart {
  text?: unknown;
  functionCall?: { name?: unknown; args?: unknown };
}

function failure(
  failureKind: AIFailureResult['failure'],
  detail: string,
  retryable = false,
): AIFailureResult {
  return { ok: false, failure: failureKind, detail, retryable };
}

/**
 * Turn whatever the provider said into an operational fact, with no customer
 * data and no credential in it.
 *
 * Same job as `safeError()` in lib/email.ts: an error object from someone
 * else's service is not ours, its shape is not guaranteed, and it can carry the
 * request — which here is the conversation — back with it. Only the status and
 * the provider's own status string are kept.
 */
function describeHttpFailure(status: number, body: unknown): AIFailureResult {
  const error = (body as { error?: { status?: unknown; message?: unknown } } | null)?.error;
  const providerStatus = typeof error?.status === 'string' ? error.status : '';
  const message = typeof error?.message === 'string' ? error.message : '';

  // A rejected key comes back as 400 INVALID_ARGUMENT / API_KEY_INVALID, not as
  // a 401. Reported as "unauthorised" regardless, because the fix is the same
  // and the caller should not be encouraged to retry it.
  if (/API_KEY_INVALID|API key not valid/i.test(`${providerStatus} ${message}`)) {
    return failure('unauthorised', 'the provider rejected GEMINI_API_KEY');
  }

  switch (true) {
    case status === 401 || status === 403:
      return failure(
        'unauthorised',
        `the provider refused the credential (HTTP ${status}${providerStatus ? ` ${providerStatus}` : ''})`,
      );
    case status === 404:
      return failure(
        'bad_request',
        'the provider has no such model — check AI_MODEL against the models the key can reach',
      );
    case status === 429:
      return failure('rate_limited', 'the provider is rate limiting this key', true);
    case status >= 500:
      return failure('unavailable', `the provider returned HTTP ${status}`, true);
    default:
      return failure(
        'bad_request',
        `the provider rejected the request (HTTP ${status}${providerStatus ? ` ${providerStatus}` : ''})`,
      );
  }
}

/**
 * A network-level failure. `fetch` rejects with a TypeError for DNS, TLS and
 * connection-refused alike, and the cause carries the code worth logging.
 */
function describeTransportFailure(error: unknown): AIFailureResult {
  const code = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  const detail = typeof code === 'string' ? `could not reach the provider (${code})` : 'could not reach the provider';
  return failure('unavailable', detail, true);
}

function toGeminiContents(messages: AIMessage[]) {
  return messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    // The last gate before anything leaves this process. See the note on
    // redactPersonalDetails() — the prompt and the client are both told to keep
    // personal details out of the conversation, and this is what makes it true
    // when one of them forgets.
    parts: [{ text: redactPersonalDetails(message.content) }],
  }));
}

function toFunctionDeclarations(tools: AIToolDeclaration[]) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

function collectText(parts: GeminiPart[]): string {
  return parts
    .map((part) => (typeof part.text === 'string' ? part.text : ''))
    .join('')
    .trim();
}

function collectToolCall(parts: GeminiPart[]): AIToolCall | null {
  for (const part of parts) {
    const call = part.functionCall;
    if (!call || typeof call.name !== 'string') continue;
    const args = call.args;
    // Validation proper happens in validation.ts. This only checks that there
    // is an object to validate.
    const safeArgs =
      args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
    return { name: call.name, args: safeArgs };
  }
  return null;
}

export class GeminiProvider implements AIProvider {
  readonly name: ProviderName = 'gemini';
  readonly model: string;

  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;

  constructor(options: GeminiOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.timeoutMs = resolveTimeoutMs(options.timeoutMs, DEFAULT_TIMEOUT_MS);
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.endpoint = options.endpoint ?? GEMINI_ENDPOINT;
  }

  supportsToolCalling(): boolean {
    return true;
  }

  async generateResponse(request: GenerateRequest): Promise<AIResult<AITextResponse>> {
    const result = await this.call(request, undefined);
    if (!result.ok) return result;

    const text = collectText(result.value);
    if (!text) {
      return failure('malformed_response', 'the provider returned no text');
    }
    return { ok: true, value: { text } };
  }

  async generateToolCall(request: ToolCallRequest): Promise<AIResult<AIToolCallResponse>> {
    const result = await this.call(request, request.tools);
    if (!result.ok) return result;

    const parts = result.value;
    const toolCall = collectToolCall(parts);
    const text = collectText(parts);

    // Neither prose nor a call is not a usable turn — it usually means the
    // response was truncated. Reported rather than passed on as an empty reply.
    if (!toolCall && !text) {
      return failure('malformed_response', 'the provider returned neither text nor a tool call');
    }

    return { ok: true, value: { text: text || null, toolCall } };
  }

  /**
   * The single place a request is made. One attempt, one bounded timeout, no
   * retries — see the note in provider.ts.
   */
  private async call(
    request: GenerateRequest,
    tools: AIToolDeclaration[] | undefined,
  ): Promise<AIResult<GeminiPart[]>> {
    if (!this.apiKey) return failure('not_configured', 'GEMINI_API_KEY is not set');
    if (!this.model) return failure('not_configured', 'AI_MODEL is not set');
    if (typeof this.fetchImpl !== 'function') {
      return failure('not_configured', 'no fetch implementation available');
    }

    const timeoutMs = resolveTimeoutMs(request.timeoutMs, this.timeoutMs);
    const timer = new AbortController();
    const timeout = setTimeout(() => timer.abort(), timeoutMs);
    // The caller's own cancellation (a customer navigating away) must not be
    // reported as a provider timeout, so the two signals stay distinguishable.
    const signal = request.signal ? AbortSignal.any([timer.signal, request.signal]) : timer.signal;

    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: request.systemPrompt }] },
      contents: toGeminiContents(request.messages),
      generationConfig: {
        // A booking answer is a couple of sentences. Capping it bounds both the
        // cost and how long the customer waits.
        maxOutputTokens: request.maxOutputTokens ?? 800,
        temperature: 0.2,
      },
    };

    if (tools?.length) {
      body.tools = [{ functionDeclarations: toFunctionDeclarations(tools) }];
      body.toolConfig = { functionCallingConfig: { mode: 'AUTO' } };
    }

    let response: Response;
    try {
      response = await this.fetchImpl(
        `${this.endpoint}/models/${encodeURIComponent(this.model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': this.apiKey,
          },
          body: JSON.stringify(body),
          signal,
        },
      );
    } catch (error) {
      if (timer.signal.aborted) {
        return failure('timeout', `no answer within ${timeoutMs}ms`, true);
      }
      if ((error as { name?: string } | null)?.name === 'AbortError') {
        return failure('unavailable', 'the request was cancelled');
      }
      return describeTransportFailure(error);
    } finally {
      clearTimeout(timeout);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      // A non-JSON body is worth distinguishing from a JSON error body: it is
      // usually an HTML error page from something in front of the provider.
      return response.ok
        ? failure('malformed_response', 'the provider returned a body that was not JSON')
        : failure('unavailable', `the provider returned HTTP ${response.status} and no JSON`, response.status >= 500);
    }

    if (!response.ok) return describeHttpFailure(response.status, payload);

    return this.readCandidate(payload);
  }

  private readCandidate(payload: unknown): AIResult<GeminiPart[]> {
    const root = payload as {
      candidates?: unknown;
      promptFeedback?: { blockReason?: unknown };
    } | null;

    const blockReason = root?.promptFeedback?.blockReason;
    if (typeof blockReason === 'string') {
      return failure('blocked', `the provider's safety filter stopped the prompt (${blockReason})`);
    }

    const candidates = Array.isArray(root?.candidates) ? root.candidates : [];
    const candidate = candidates[0] as
      | { content?: { parts?: unknown }; finishReason?: unknown }
      | undefined;

    if (!candidate) {
      return failure('malformed_response', 'the provider returned no candidates');
    }

    const finishReason = candidate.finishReason;
    if (typeof finishReason === 'string' && ['SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT'].includes(finishReason)) {
      return failure('blocked', `the provider stopped the answer (${finishReason})`);
    }

    const parts = candidate.content?.parts;
    if (!Array.isArray(parts)) {
      return failure('malformed_response', 'the provider returned a candidate with no parts');
    }

    return { ok: true, value: parts as GeminiPart[] };
  }
}
