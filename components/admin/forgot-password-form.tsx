'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/auth/confirm`,
    });

    setBusy(false);

    // Supabase answers the same whether or not the address has an account, so
    // this does not reveal which emails are real. The one error worth showing
    // is the rate limit — otherwise she waits for an email that is not coming.
    if (resetError && resetError.status === 429) {
      setError('Too many reset requests. Wait a few minutes and try again.');
      return;
    }
    if (resetError) {
      setError('Could not send the reset email just now. Try again in a moment.');
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="mt-8 space-y-4">
        <p role="status" className="rounded-xl bg-sage-500/15 px-4 py-3 text-sm text-sage-600">
          If that address has an account, a reset link is on its way. Check spam if it has not
          arrived in a few minutes.
        </p>
        <Link href="/admin/login" className="block text-center text-sm text-lacquer-500 underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm text-aubergine-900">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-blush-300 bg-white px-4 py-3 text-base focus:border-aubergine-900 focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-lacquer-500/10 px-4 py-3 text-sm text-lacquer-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-lacquer-500 px-6 py-3.5 text-base font-medium text-blush-50 hover:bg-lacquer-600 disabled:opacity-60"
      >
        {busy ? 'Sending…' : 'Send reset link'}
      </button>

      <Link href="/admin/login" className="block text-center text-sm text-mauve-500 underline underline-offset-4">
        Back to sign in
      </Link>
    </form>
  );
}
