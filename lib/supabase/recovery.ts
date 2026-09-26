/**
 * Set by /admin/auth/confirm once a password-reset link has been verified.
 *
 * Its only job is to let /admin/update-password skip the "current password"
 * field for someone who arrived from the email: they have proved they own the
 * inbox, and the whole point is that they no longer know the old password.
 * Everyone else changing their password from Setup is asked for the current
 * one, so an unlocked phone left on the counter cannot be used to lock the
 * owner out.
 *
 * httpOnly so page script cannot set it, and short-lived so a reset link
 * does not leave a permanent "no questions asked" window behind.
 */
export const RECOVERY_COOKIE = 'admin_pw_recovery';
export const RECOVERY_COOKIE_MAX_AGE_SECONDS = 15 * 60;
