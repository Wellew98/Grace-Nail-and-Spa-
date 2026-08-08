import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Mono, Karla } from 'next/font/google';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { LocalBusinessJsonLd } from '@/components/local-business-jsonld';
import { getActiveServices, getBusiness, getOpeningHours } from '@/lib/public-data';
import { SITE } from '@/lib/site';
import './globals.css';

/* Fraunces for display — a soft, slightly wonky serif with an optical size
   axis, warm where a high-contrast Didone would be cold. Karla for body: a
   grotesque with enough character to sit beside it.

   Mono is reserved for CLOCK TIMES only, where a column of slots should line
   up and read as a schedule. Prices use Karla's tabular figures instead:
   DM Mono was the first choice here and its slashed zero turned R500 into
   "R5ØØ", which reads as code, not money. IBM Plex Mono has a plain zero. */
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['SOFT', 'WONK', 'opsz'],
  display: 'swap',
});

const karla = Karla({ subsets: ['latin'], variable: '--font-karla', display: 'swap' });

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export async function generateMetadata(): Promise<Metadata> {
  const business = await getBusiness();
  const name = business?.name ?? 'Grace Nails and Beauty Spa';

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${name} — ${SITE.tagline}`, template: `%s — ${name}` },
    description: SITE.heroSupport,
    openGraph: { title: name, description: SITE.heroSupport, type: 'website', locale: 'en_ZA' },
    robots: { index: true, follow: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const business = await getBusiness();

  // The site is a shell around one business row. Without it there is nothing
  // to render, and a blank page is a clearer signal than half a layout.
  if (!business) {
    return (
      <html lang="en-ZA">
        <body className="p-10 font-sans">
          <h1 className="text-lg font-semibold">No business configured</h1>
          <p className="mt-2 text-sm">
            Apply <code>supabase/migrations</code> and <code>supabase/seed.sql</code>, then set{' '}
            <code>SUPABASE_DB_URL</code>.
          </p>
        </body>
      </html>
    );
  }

  const [services, hours] = await Promise.all([
    getActiveServices(business.id),
    getOpeningHours(business.id),
  ]);

  return (
    <html lang="en-ZA" className={`${fraunces.variable} ${karla.variable} ${plexMono.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-aubergine-900 focus:px-4 focus:py-2 focus:text-blush-50"
        >
          Skip to content
        </a>
        <SiteHeader businessName={business.name} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter business={business} hours={hours} />
        <LocalBusinessJsonLd
          business={business}
          services={services}
          hours={hours}
          siteUrl={SITE_URL}
        />
      </body>
    </html>
  );
}
