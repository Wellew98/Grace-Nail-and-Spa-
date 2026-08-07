import type { Business, Service } from '@/lib/types';

/**
 * LocalBusiness JSON-LD — spec §8 Phase 1.
 *
 * Built from the same `businesses` row the footer renders, so the structured
 * data and the visible NAP can never disagree. `DaySpa` is a real schema.org
 * subtype of LocalBusiness and is more specific than the generic type, which
 * is what search engines want.
 */
export function LocalBusinessJsonLd({
  business,
  services,
  hours,
  siteUrl,
}: {
  business: Business;
  services: Service[];
  hours: { day: number; opens: string; closes: string }[];
  siteUrl: string;
}) {
  const schemaDays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ] as const;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'DaySpa',
    '@id': `${siteUrl}/#business`,
    name: business.name,
    url: siteUrl,
    telephone: business.phone,
    priceRange: 'RR',
    currenciesAccepted: 'ZAR',
  };

  if (business.email) data.email = business.email;
  if (business.google_maps_url) data.hasMap = business.google_maps_url;

  if (business.address) {
    data.address = {
      '@type': 'PostalAddress',
      streetAddress: business.address,
      addressCountry: 'ZA',
    };
  }

  if (hours.length > 0) {
    data.openingHoursSpecification = hours.map((entry) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${schemaDays[entry.day]}`,
      opens: entry.opens,
      closes: entry.closes,
    }));
  }

  if (services.length > 0) {
    data.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: 'Treatments',
      itemListElement: services.map((service) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: service.name,
          ...(service.description ? { description: service.description } : {}),
        },
        price: (service.price_cents / 100).toFixed(2),
        priceCurrency: 'ZAR',
      })),
    };
  }

  data.potentialAction = {
    '@type': 'ReserveAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${siteUrl}/book`,
      actionPlatform: [
        'https://schema.org/DesktopWebPlatform',
        'https://schema.org/MobileWebPlatform',
      ],
    },
    result: { '@type': 'Reservation', name: 'Treatment booking' },
  };

  return (
    <script
      type="application/ld+json"
      // Server-rendered from our own database row, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
