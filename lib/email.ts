import 'server-only';
import { Resend } from 'resend';
import { formatZar } from './money';
import { formatPhoneForDisplay } from './phone';
import { formatDateTimeLabel } from './time';
import type { AppointmentDetail } from './booking';

/**
 * Transactional email — spec §8 Phase 2: confirmation to the customer and a
 * notification to the owner.
 *
 * Sending is best-effort and deliberately never throws into the write path. A
 * booking that is safely in the database must not be reported as a failure
 * because an email provider had a bad minute; the customer would rebook and we
 * would have two appointments. Failures are logged for the owner to chase.
 */

function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

const FROM = process.env.BOOKING_FROM_EMAIL ?? 'bookings@example.com';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

function manageUrl(token: string): string {
  return `${SITE_URL}/b/${token}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  );
}

function layout(heading: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#fdf8f7;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#2a1626">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px">
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:600">${heading}</h1>
    ${body}
  </div></body></html>`;
}

function detailRows(appointment: AppointmentDetail): string {
  const when = formatDateTimeLabel(new Date(appointment.starts_at), appointment.business_timezone);
  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#7a5a72">Treatment</td><td style="padding:6px 0;text-align:right">${escapeHtml(appointment.service_name)}</td></tr>
      <tr><td style="padding:6px 0;color:#7a5a72">When</td><td style="padding:6px 0;text-align:right">${escapeHtml(when)}</td></tr>
      <tr><td style="padding:6px 0;color:#7a5a72">With</td><td style="padding:6px 0;text-align:right">${escapeHtml(appointment.staff_name)}</td></tr>
      <tr><td style="padding:6px 0;color:#7a5a72">Price</td><td style="padding:6px 0;text-align:right">${formatZar(appointment.price_cents_at_booking)}</td></tr>
    </table>`;
}

export async function sendCustomerConfirmation(appointment: AppointmentDetail): Promise<void> {
  const resend = client();
  if (!resend || !appointment.customer_email) return;

  const url = manageUrl(appointment.manage_token);
  try {
    await resend.emails.send({
      from: FROM,
      to: appointment.customer_email,
      subject: `Your booking at ${appointment.business_name}`,
      html: layout(
        `You're booked in, ${escapeHtml(appointment.customer_name.split(' ')[0])}`,
        `${detailRows(appointment)}
         <p style="margin:20px 0 0;font-size:14px;line-height:1.6">
           Need to move or cancel it?
           <a href="${url}" style="color:#c2185b">Manage your booking</a>.
         </p>
         <p style="margin:16px 0 0;font-size:12px;color:#9b7f94">
           ${escapeHtml(appointment.business_name)} · ${escapeHtml(formatPhoneForDisplay(appointment.business_phone))}
         </p>`,
      ),
    });
  } catch (error) {
    console.error('[email] customer confirmation failed', {
      appointmentId: appointment.id,
      error,
    });
  }
}

export async function sendOwnerNotification(appointment: AppointmentDetail): Promise<void> {
  const resend = client();
  const to = process.env.OWNER_NOTIFICATION_EMAIL;
  if (!resend || !to) return;

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `New booking — ${appointment.service_name}, ${appointment.staff_name}`,
      html: layout(
        'New booking',
        `${detailRows(appointment)}
         <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px">
           <tr><td style="padding:6px 0;color:#7a5a72">Customer</td><td style="padding:6px 0;text-align:right">${escapeHtml(appointment.customer_name)}</td></tr>
           <tr><td style="padding:6px 0;color:#7a5a72">Phone</td><td style="padding:6px 0;text-align:right">${escapeHtml(formatPhoneForDisplay(appointment.customer_phone))}</td></tr>
         </table>`,
      ),
    });
  } catch (error) {
    console.error('[email] owner notification failed', { appointmentId: appointment.id, error });
  }
}

export async function sendCancellationNotice(appointment: AppointmentDetail): Promise<void> {
  const resend = client();
  const to = process.env.OWNER_NOTIFICATION_EMAIL;
  if (!resend || !to) return;

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Cancelled — ${appointment.service_name}, ${appointment.staff_name}`,
      html: layout('Booking cancelled', detailRows(appointment)),
    });
  } catch (error) {
    console.error('[email] cancellation notice failed', { appointmentId: appointment.id, error });
  }
}
