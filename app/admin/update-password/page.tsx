import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UpdatePasswordForm } from '@/components/admin/update-password-form';
import { createClient } from '@/lib/supabase/server';
import { RECOVERY_COOKIE } from '@/lib/supabase/recovery';

export const dynamic = 'force-dynamic';

/**
 * Two ways in, one screen:
 *
 *   - From a reset email, via /admin/auth/confirm — no current password asked.
 *   - From Setup while signed in — the current password is asked for.
 *
 * Either way she must already hold a session. Only the signed-in user is
 * required here, not a business membership, so a reset still works for an
 * account whose membership row has not been added yet.
 */
export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/admin/login');

  const recovering = (await cookies()).get(RECOVERY_COOKIE)?.value === '1';

  return (
    <div className="mx-auto flex max-w-sm flex-col justify-center px-1 py-12">
      <h1 className="font-display text-3xl font-semibold text-aubergine-900">
        {recovering ? 'Choose a new password' : 'Change password'}
      </h1>
      <p className="mt-2 text-sm text-mauve-500">
        For <span className="text-aubergine-900">{user.email}</span>. At least 8 characters.
      </p>
      <UpdatePasswordForm email={user.email ?? ''} requireCurrent={!recovering} />
    </div>
  );
}
