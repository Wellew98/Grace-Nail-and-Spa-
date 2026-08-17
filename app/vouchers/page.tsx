import type { Metadata } from 'next';
import Link from 'next/link';
import { BookButton } from '@/components/book-button';
import { Swatch } from '@/components/swatch';
import { getBusiness } from '@/lib/public-data';
import { DESTINATION_LACQUERS } from '@/lib/palette';
import { formatPhoneForDisplay, whatsappLink } from '@/lib/phone';

export const metadata: Metadata = {
  title: 'Gift Vouchers',
  description:
    'Buy a gift voucher in studio, in any amount. Transferable, usable across more than one visit, and easy to check the balance on, no account needed.',
};

/**
 * The customer-facing half of spa-voucher-build-spec.md. Everything the
 * ADMIN side already does (issue, redeem, adjust, resend) had a screen —
 * `/v/[token]` even had a page. What had no door in from the site was the
 * question a customer actually shows up asking: "where do I check this."
 *
 * This page is that door, plus enough about the offering that landing here
 * cold still makes sense. It deliberately does NOT add a "type your code"
 * lookup form: `lib/vouchers.ts` §2.1/§6.2 draws a hard line between the
 * short code (spoken at the counter, business-scoped lookup only) and the
 * long `lookup_token` (the one thing that is safe to resolve on a public
 * route). A public form that accepted the six-character code would be
 * exactly the fallback that comment forbids — it would make the code
 * brute-forceable. The two real paths in, the emailed link and a call to the
 * studio, are both already safe, so this page points at those instead.
 */
export default async function VouchersPage() {
  const business = (await getBusiness())!;

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
        balance is always one call or one link away.
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
          here.

          The mock card is decorative, not another lookup path: it shows a
          customer what to look for on the physical card she is already
          holding (spa-voucher-build-spec.md §2 — code left, `4K2-P9X` shape,
          written by hand at issue) so the two real routes below read as
          "here is the code" / "here is what to do with it" rather than
          arriving with no context. */}
      <section id="balance" aria-labelledby="balance-heading" className="mt-20 scroll-mt-24">
        <h2 id="balance-heading" className="text-xs tracking-[0.18em] text-gilt-600 uppercase">
          Already holding a voucher?
        </h2>
        <p className="mt-4 max-w-lg text-[1.05rem] leading-relaxed text-mauve-500">
          There is no account, no password and nothing to set up. Whichever of these you have is
          enough on its own.
        </p>

        <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row sm:items-stretch">
          <div
            aria-hidden="true"
            className="flex w-full max-w-[15rem] shrink-0 flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-gilt-200 bg-white px-6 py-7 text-center"
          >
            <Swatch serviceName="voucher" size="tile" lacquer={DESTINATION_LACQUERS.treatments} />
            <p className="text-[0.65rem] tracking-[0.2em] text-mauve-400 uppercase">
              {business.name}
            </p>
            <p className="font-display text-sm font-semibold text-aubergine-900">Gift voucher</p>
            <p className="font-mono text-xl tracking-[0.15em] text-mauve-400">4K2-P9X</p>
            <p className="text-[0.7rem] leading-snug text-mauve-400">
              The six characters written on yours
            </p>
          </div>

          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-blush-200 bg-blush-100 px-6 py-6">
              <h3 className="font-display text-lg font-semibold text-aubergine-900">
                Emailed a link?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-mauve-600">
                The voucher email has a &ldquo;Check the balance&rdquo; link. Open it any time to see the
                balance, the expiry date and everywhere it has been used, no login needed.
              </p>
            </div>

            <div className="rounded-2xl border border-blush-200 bg-blush-100 px-6 py-6">
              <h3 className="font-display text-lg font-semibold text-aubergine-900">
                Only have the card?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-mauve-600">
                Call or WhatsApp us with the code on it and we will read the balance back to you,
                or send the link to your email while we are on the phone.
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
