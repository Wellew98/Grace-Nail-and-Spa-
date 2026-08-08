'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { NAV } from '@/lib/site';

export function SiteHeader({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gilt-200/60 bg-blush-50/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3.5">
        {/* Sized to keep "Grace Nails and Beauty Spa" on one line at 390px —
            wrapping it made the sticky header noticeably taller on a phone. */}
        <Link
          href="/"
          className="font-display text-[0.95rem] leading-tight font-semibold tracking-tight text-aubergine-900 sm:text-lg sm:leading-none"
          onClick={() => setOpen(false)}
        >
          {businessName}
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-7 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className={`text-sm transition-colors ${
                pathname === item.href
                  ? 'text-aubergine-900'
                  : 'text-mauve-500 hover:text-aubergine-900'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Book is always reachable, at every width. */}
        <Link
          href="/book"
          className="ml-auto rounded-full bg-lacquer-500 px-4 py-2 text-sm font-medium text-blush-50 transition-colors hover:bg-lacquer-600 sm:ml-0"
        >
          Book
        </Link>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="-mr-1 p-1.5 text-aubergine-900 sm:hidden"
        >
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            {open ? (
              <path d="M5 5l12 12M17 5L5 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M3 7h16M3 15h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-gilt-200/60 sm:hidden">
          <ul className="mx-auto max-w-5xl px-5 py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === item.href ? 'page' : undefined}
                  className="block border-b border-blush-200 py-3 text-[0.95rem] text-aubergine-900 last:border-0"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
