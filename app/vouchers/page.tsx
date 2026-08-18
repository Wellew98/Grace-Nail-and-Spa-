import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { BookButton } from '@/components/book-button';
import { Swatch } from '@/components/swatch';
import { getBusiness } from '@/lib/public-data';
import { DESTINATION_LACQUERS } from '@/lib/palette';
import { formatPhoneForDisplay, whatsappLink } from '@/lib/phone';
import { formatZar } from '@/lib/money';
import { formatDateLabel } from '@/lib/time';
import { getVoucherByCode, type VoucherWithLedger } from '@/lib/vouchers';
import { consumeVoucherCodeLookup, voucherLookupIp } from '@/lib/voucher-rate-limit';

export const metadata: Metadata = {
  title: 'Gift Vouchers',
  description:
    'Buy a gift voucher in studio, in any amount. Transferable, usable across more than one visit, and easy to check the balance on, no account needed.',
};

/**
 * The "check by code" box below reads request-specific state (the submitted
 * code, the caller's IP for rate limiting) on every load, so this page can
 * never be the revalidate=300 static render the rest of the marketing site
 * gets from app/layout.tsx — same reasoning as /book and /v/[token].
 */
export const dynamic = 'force-dynamic';

/**
 * The customer-facing half of spa-voucher-build-spec.md. Everything the
 * ADMIN side already does (issue, redeem, adjust, resend) had a screen —
 * `/v/[token]` even had a page. What had no door in from the site was the
 * question a customer actually shows up asking: "where do I check this."
 *
 * This page is that door: what a voucher is, how to buy one, and a
 * "check by code" box that answers the balance question on the spot.
 *
 * THE CODE BOX IS A DELIBERATE, NARROWER EXCEPTION TO §6.2. `lib/vouchers.ts`
 * is explicit that the short code must never resolve on a public route —
 * that rule protects `/v/[token]` (256 bits of entropy, meant to stay that
 * strong) and it still does; nothing here touches `getVoucherByLookupToken`
 * or that route. What changed is a second, separate, and much more tightly
 * rate-limited door, added because a business owner explicitly asked for the
 * standard gift-card "type your code, see your balance" convenience and
 * accepted the tradeoff: see `consumeVoucherCodeLookup` in
 * lib/voucher-rate-limit.ts for the limit and the reasoning behind it.
 */
export default async function VouchersPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const business = (await getBusiness())!;
  const tz = business.timezone ?? 'Africa/Johannesburg';

  const submittedCode = (await searchParams).code?.trim() || null;
  const lookup = submittedCode ? await lookupByCode(business.id, submittedCode) : null;

  const facts = [
    {
      title: 'Any amount',
      body: 'You choose the value when you buy it in studio. There is no fixed set of amounts to pick from.',
    },
    {
      title: 'Good for three years, at least',
      body: 'South African law sets three years from issue as the earliest a voucher may expire. We never set it shorter, and we can set it to never expire at all.',
    },
    {
      title: 'Spend it over more than one visit',
      body: 'A voucher is a running balance, not a one-time pass. Put half of it towards today’s treatment and keep the rest for next time.',
    },
    {
      title: 'Give it to anyone',
      body: 'It is not tied to whoever paid for it. Hand it on, and whoever is holding it can spend it.',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-5 pt-14 pb-4 sm:pt-20">
      <p className="text-xs tracking-[0.22em] text-gilt-600 uppercase">Gift vouchers</p>
      <h1 className="font-display mt-4 max-w-[16ch] text-[2.5rem] leading-[1] font-semibold text-aubergine-900 sm:text-6xl">
        Buy the visit. Let them pick the treatment.
      </h1>
      <p className="mt-5 max-w-lg text-[1.05rem] leading-relaxed text-mauve-500">
        A voucher from {business.name} works like cash in the studio: any amount, good for years,
        and yours to give to anyone. It is bought and redeemed in person, never online, and the
        balance is always a few seconds away, no account needed.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
        <a
          href={`tel:${business.phone}`}
          className="inline-flex items-center justify-center rounded-full bg-lacquer-500 px-7 py-3.5 text-base font-medium tracking-tight text-blush-50 transition-colors hover:bg-lacquer-600"
        >
          Call to arrange one
        </a>
        <a
          href="#balance"
          className="text-sm text-lacquer-500 underline underline-offset-4 hover:text-lacquer-600"
        >
          Already holding a voucher? Check your balance ↓
        </a>
      </div>

      {/* ---------------- what a voucher actually is ----------------
          Four facts, each one true by construction of lib/vouchers.ts rather
          than a marketing claim: see the numbers next to each in the file
          this page's comment points at. Laid out the way /services lists
          treatments — a swatch, a line, nothing overbuilt for four items. */}
      <section aria-labelledby="how-heading" className="mt-16">
        <h2 id="how-heading" className="text-xs tracking-[0.18em] text-gilt-600 uppercase">
          How it works
        </h2>
        <ul className="mt-5 grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {facts.map((fact, index) => (
            <li key={fact.title} className="flex gap-4">
              <Swatch
                serviceName={fact.title}
                size="chip"
                lacquer={Object.values(DESTINATION_LACQUERS)[index % 4]}
                className="mt-0.5"
              />
              <div>
                <p className="font-display text-lg font-semibold text-aubergine-900">
                  {fact.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-mauve-500">{fact.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------------- check your balance ----------------
          The section this whole page exists for. `scroll-mt-24` keeps the
          heading clear of the sticky header when the "↓" link above jumps
          here, and is also where a submitted form lands, via the plain
          `<form method="get" action="/vouchers#balance">` below — no client
          JavaScript, the same GET-and-rerender shape /book already uses for
          `?service=`.

          The card is the form. It used to be a decorative mock-up showing
          what to look for on the physical card (spa-voucher-build-spec.md
          §2 — code left, `4K2-P9X` shape, written by hand at issue); now the
          code line IS the input, styled the same way, so typing into it
          reads as "filling in the card" rather than a generic search box. */}
      <section id="balance" aria-labelledby="balance-heading" className="mt-20 scroll-mt-24">
        <h2 id="balance-heading" className="text-xs tracking-[0.18em] text-gilt-600 uppercase">
          Already holding a voucher?
        </h2>
        <p className="mt-4 max-w-lg text-[1.05rem] leading-relaxed text-mauve-500">
          Type the code from your card below and we will show you the balance right away. No
          account, no password, nothing to set up.
        </p>

        <div className="mt-8 flex flex-col items-start gap-8 sm:flex-row">
          <form
            action="/vouchers#balance"
            method="GET"
            className="flex w-full max-w-[15rem] shrink-0 flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gilt-200 bg-white px-6 py-7 text-center"
          >
            <Swatch serviceName="voucher" size="tile" lacquer={DESTINATION_LACQUERS.treatments} />
            <p className="text-[0.65rem] tracking-[0.2em] text-mauve-400 uppercase">
              {business.name}
            </p>
            <p className="font-display text-sm font-semibold text-aubergine-900">Gift voucher</p>
            <label htmlFor="voucher-code" className="sr-only">
              Voucher code
            </label>
            <input
              id="voucher-code"
              name="code"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={8}
              placeholder="4K2-P9X"
              defaultValue={submittedCode ?? ''}
              className="w-full rounded-lg border border-blush-300 bg-white px-2 py-2 text-center font-mono text-xl uppercase tracking-[0.15em] text-aubergine-900 placeholder:text-mauve-300 focus:border-aubergine-900 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-full bg-lacquer-500 px-4 py-2.5 text-sm font-medium text-blush-50 transition-colors hover:bg-lacquer-600"
            >
              Check balance
            </button>
            <p className="text-[0.7rem] leading-snug text-mauve-400">
              The six characters written on yours
            </p>
          </form>

          <div className="grid flex-1 gap-4">
            {lookup && <LookupResultCard result={lookup} tz={tz} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-blush-200 bg-blush-100 px-6 py-6">
                <h3 className="font-display text-lg font-semibold text-aubergine-900">
                  Emailed a link?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-mauve-600">
                  The voucher email has a &ldquo;Check the balance&rdquo; link too. Open it any time to see
                  the balance, the expiry date and everywhere it has been used, no login needed.
                </p>
              </div>

              <div className="rounded-2xl border border-blush-200 bg-blush-100 px-6 py-6">
                <h3 className="font-display text-lg font-semibold text-aubergine-900">
                  Rather ask a person?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-mauve-600">
                  Call or WhatsApp us with the code on it and we will read the balance back to
                  you, or send the link to your email while we are on the phone.
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <a
                    href={`tel:${business.phone}`}
                    className="text-lacquer-500 underline underline-offset-4 hover:text-lacquer-600"
                  >
                    {formatPhoneForDisplay(business.phone)}
                  </a>
                  {business.whatsapp && (
                    <a
                      href={whatsappLink(business.whatsapp, 'Hi, I’d like to check my voucher balance.')}
                      className="text-lacquer-500 underline underline-offset-4 hover:text-lacquer-600"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-16 flex flex-wrap items-center gap-x-7 gap-y-4 border-t border-gilt-200/70 pt-8 pb-8">
        <BookButton />
        <Link
          href="/contact"
          className="text-sm text-lacquer-500 underline underline-offset-4 hover:text-lacquer-600"
        >
          Find us
        </Link>
      </div>
    </div>
  );
}

type LookupResult = { found: true; voucher: VoucherWithLedger } | { found: false };

/**
 * Rate limit first, lookup second — same order as `/v/[token]`, and for the
 * same reason: a limited request must cost nothing extra and must not be
 * distinguishable from a wrong code. Both `not found` and `rate limited`
 * collapse to the same `{ found: false }`, rendered as one generic sentence
 * below, so there is no observable difference between "no such voucher" and
 * "you have asked too many times".
 */
async function lookupByCode(businessId: string, code: string): Promise<LookupResult> {
  const ip = voucherLookupIp(await headers());
  const allowed = await consumeVoucherCodeLookup(ip);
  if (!allowed) return { found: false };

  const voucher = await getVoucherByCode(businessId, code);
  return voucher ? { found: true, voucher } : { found: false };
}

/**
 * Deliberately leaner than `/v/[token]`'s balance page: balance, expiry, and
 * status, no purchaser fields (never shown publicly, see spec §6.2) and no
 * per-visit history. The full ledger and the voucher's `lookup_token` stay
 * behind the emailed link and nowhere else — see the file header on why the
 * code box is safe to add without widening what it can hand back.
 */
function LookupResultCard({ result, tz }: { result: LookupResult; tz: string }) {
  if (!result.found) {
    return (
      <div className="rounded-2xl border border-blush-200 bg-white px-6 py-6 text-center">
        <p className="text-sm text-mauve-600">
          No voucher found with that code. Double check it, or call or WhatsApp us using the
          details below and we will look it up.
        </p>
      </div>
    );
  }

  const { voucher } = result;

  if (voucher.status === 'void') {
    return (
      <div className="rounded-2xl border border-blush-200 bg-white px-6 py-6 text-center">
        <p className="text-sm text-mauve-600">This voucher has been voided.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blush-200 bg-white px-6 py-6 text-center">
      <p className="tabular font-display text-4xl font-semibold text-aubergine-900">
        {formatZar(voucher.balance_cents)}
      </p>
      <p className="mt-1 text-sm text-mauve-500">of {formatZar(voucher.initial_cents)} issued</p>
      {voucher.expired ? (
        <p className="mt-3 text-sm text-lacquer-600">
          This voucher expired on {formatDateLabel(dateOnly(voucher.expires_at!), tz)}.
        </p>
      ) : (
        <p className="mt-3 text-xs text-mauve-400">
          {voucher.expires_at ? `Expires ${formatDateLabel(dateOnly(voucher.expires_at), tz)}` : 'Never expires'}
        </p>
      )}
    </div>
  );
}

/** formatDateLabel wants a calendar date; these columns are timestamptz. */
function dateOnly(instant: Date): string {
  return new Date(instant).toISOString().slice(0, 10);
}
