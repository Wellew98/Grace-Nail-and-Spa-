import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { RECOVERY_COOKIE, RECOVERY_COOKIE_MAX_AGE_SECONDS } from '@/lib/supabase/recovery';

/**
 * Where the password-reset email lands.
 *
 * Handles both shapes Supabase can send:
 *
 *   - `?code=…`  — the default (PKCE). Only works in the browser that asked
 *     for the reset, because the verifier lives in that browser's cookies.
 *   - `?token_hash=…&type=recovery` — if the email template is changed to
 *     link here with `{{ .TokenHash }}`. Works on any device. See README.
 *
 * Either way the result is a signed-in session, and she is sent on to set a
 * new password.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  const supabase = await createClient();

  let ok = false;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  if (!ok) {
    return NextResponse.redirect(new URL('/admin/forgot-password?error=link', origin));
  }

  const response = NextResponse.redirect(new URL('/admin/update-password', origin));
  response.cookies.set(RECOVERY_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: RECOVERY_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
