import Link from 'next/link';
import { formatPhoneForDisplay, whatsappLink } from '@/lib/phone';
import { DAY_SHORT, NAV } from '@/lib/site';
import type { Business } from '@/lib/types';

/**
 * The NAP block. Spec §8: name, address and phone render exactly as they
 * appear on the Google Business Profile — same words, same order, same
 * punctuation — because inconsistent NAP across the web is what stops a local
 * business ranking. All three come from the `businesses` row so there is only
 * ever one copy to keep true.
 */
export function SiteFooter({
  business,
  hours,
}: {
  business: Business;
  hours: { day: number; opens: string; closes: string }[];
}) {
  const byDay = new Map(hours.map((entry) => [entry.day, entry]));

  return (
    <footer className="mt-24 border-t border-gilt-200/60 bg-blush-100">
      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 sm:grid-cols-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight text-aubergine-900">
            {business.name}
          </h2>
          {business.address && (
            <address className="mt-3 text-sm leading-relaxed text-mauve-500 not-italic">
              {business.address}
            </address>
          )}
          {business.google_maps_url && (
            <a
              href={business.google_maps_url}
              className="mt-2 inline-block text-sm text-lacquer-500 underline underline-offset-4 hover:text-lacquer-600"
            >
              Get directions
            </a>
          )}
        </div>

        <div>
          <h3 className="text-xs tracking-[0.18em] text-gilt-600 uppercase">Opening hours</h3>
          <dl className="mt-3 space-y-1 text-sm text-mauve-500">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const entry = byDay.get(day);
              return (
                <div key={day} className="flex justify-between gap-4">
                  <dt>{DAY_SHORT[day]}</dt>
                  <dd className="tabular font-mono text-xs">
                    {entry ? `${entry.opens} – ${entry.closes}` : 'Closed'}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        <div>
          <h3 className="text-xs tracking-[0.18em] text-gilt-600 uppercase">Get in touch</h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={`tel:${business.phone}`} className="text-aubergine-900 hover:text-lacquer-500">
                {formatPhoneForDisplay(business.phone)}
              </a>
            </li>
            {business.whatsapp && (
              <li>
                <a
                  href={whatsappLink(business.whatsapp)}
                  className="text-aubergine-900 hover:text-lacquer-500"
                >
                  WhatsApp us
                </a>
              </li>
            )}
            {business.email && (
              <li>
                <a href={`mailto:${business.email}`} className="text-aubergine-900 hover:text-lacquer-500">
                  {business.email}
                </a>
              </li>
            )}
          </ul>

          <ul className="mt-6 space-y-2 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-mauve-500 hover:text-aubergine-900">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-gilt-200/60">
        <p className="mx-auto max-w-5xl px-5 py-5 text-xs text-mauve-400">
          © {new Date().getFullYear()} {business.name}
        </p>
      </div>
    </footer>
  );
}
