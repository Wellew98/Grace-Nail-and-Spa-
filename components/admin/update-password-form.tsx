'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const MIN_LENGTH = 8;

export function UpdatePasswordForm({
  email,
  requireCurrent,
}: {
  email: string;
  requireCurrent: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`The new password needs at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two new passwords do not match.');
      return;
    }

    setBusy(true);
    const supabase = createClient();

    if (requireCurrent) {
      const { error: checkError } = await supabase.auth.signInWithPassword({ email, password: current });
      if (checkError) {
        setError('Your current password is not right. Forgotten it? Sign out and use "Forgot password?".');
        setBusy(false);
        return;
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      setError(
        updateError.code === 'same_password'
          ? 'That is the password you already have. Choose a different one.'
          : updateError.code === 'weak_password'
            ? 'That password is too weak. Try a longer one.'
            : 'Could not update the password. Try again, or request a new reset link.',
      );
      return;
    }

    setDone(true);
    setTimeout(() => {
      router.replace('/admin');
      router.refresh();
    }, 1500);
  }

  if (done) {
    return (
      <p role="status" className="mt-8 rounded-xl bg-sage-500/15 px-4 py-3 text-sm text-sage-600">
        Password updated. Taking you to the diary…
      </p>
    );
  }

  const inputClass =
    'mt-1.5 w-full rounded-xl border border-blush-300 bg-white px-4 py-3 text-base focus:border-aubergine-900 focus:outline-none';

  return (
    <form onSubmit={submit} className="mt-8 space-y-4">
      {/* Lets password managers attach the new password to the right account. */}
      <input type="email" autoComplete="username" value={email} readOnly hidden />

      {requireCurrent && (
        <div>
          <label htmlFor="current" className="block text-sm text-aubergine-900">
            Current password
          </label>
          <input
            id="current"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            className={inputClass}
          />
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm text-aubergine-900">
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_LENGTH}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm text-aubergine-900">
          New password again
        </label>
        <input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_LENGTH}
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={inputClass}
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
        {busy ? 'Saving…' : 'Save new password'}
      </button>
    </form>
  );
}
