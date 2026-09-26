import { ForgotPasswordForm } from '@/components/admin/forgot-password-form';
import { getBusiness } from '@/lib/public-data';

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const business = await getBusiness();

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-16">
      <p className="text-xs tracking-[0.22em] text-gilt-600 uppercase">{business?.name ?? 'Admin'}</p>
      <h1 className="font-display mt-3 text-3xl font-semibold text-aubergine-900">Reset password</h1>
      <p className="mt-2 text-sm text-mauve-500">
        Enter the email you sign in with and we will send you a link to choose a new password.
      </p>
      {error === 'link' && (
        <p role="alert" className="mt-6 rounded-xl bg-lacquer-500/10 px-4 py-3 text-sm text-lacquer-600">
          That reset link has expired or was already used. Request a new one below, and open it on
          the same phone or computer you request it from.
        </p>
      )}
      <ForgotPasswordForm />
    </div>
  );
}
