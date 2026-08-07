import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminNav } from '@/components/admin/admin-nav';
import { getOwnerSession } from '@/lib/supabase/session';
import { supabaseConfigured } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Admin shell.
 *
 * Reads below this point resolve `businessId` from `requireOwner()`, which
 * looks up `business_members` through the owner's own Supabase session — so
 * RLS is what decides which business she belongs to (§7). Subsequent queries
 * use the transactional connection scoped to that id, because the admin needs
 * joins and transactions the PostgREST client cannot express. The id itself is
 * never taken from the request.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigured()) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20">
        <h1 className="font-display text-2xl font-semibold text-aubergine-900">Admin not configured</h1>
        <p className="mt-3 text-sm leading-relaxed text-mauve-500">
          The admin uses Supabase Auth. Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code>, then create the
          owner in Supabase and link her with a <code>business_members</code> row — see the bottom
          of <code>supabase/seed.sql</code>.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-lacquer-500 underline underline-offset-4">
          Back to the site
        </Link>
      </div>
    );
  }

  const session = await getOwnerSession();

  // The login page renders inside this layout, so it must not be gated.
  if (!session) return <>{children}</>;

  return (
    <div className="min-h-screen bg-blush-50">
      <AdminNav email={session.email} />
      <div className="mx-auto max-w-3xl px-4 pb-24">{children}</div>
    </div>
  );
}
