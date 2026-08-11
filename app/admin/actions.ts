'use server';

import { revalidatePath } from 'next/cache';
import { requireOwner } from '@/lib/supabase/session';
import {
  cancelBooking,
  createBooking,
  markAppointmentStatus,
  rescheduleBooking,
  type ClashSummary,
} from '@/lib/booking';
import {
  addAvailabilityBlock,
  deactivateResource,
  deactivateService,
  deactivateStaff,
  setWorkingHours,
  updateService,
  type HoursWindow,
} from '@/lib/config-guards';
import { query, queryOne } from '@/lib/db';
import { getBusiness } from '@/lib/availability';
import { zonedToUtc } from '@/lib/time';
import type { AppointmentDetail } from '@/lib/booking';

/**
 * Admin mutations. Every one of these starts with requireOwner().
 *
 * Reads in the admin go through the owner's Supabase session so RLS scopes
 * them (§7). Writes go through the transactional path in lib/booking.ts, which
 * bypasses RLS by design — so each action re-checks that the row it is about
 * to touch belongs to the owner's business. That check is the one place
 * application code is load-bearing for tenancy, and it is why it is here at
 * the top of every action rather than left to the caller.
 */

export type ActionResult =
  | { ok: true; message?: string }
  | { ok: false; message: string; conflicts?: AppointmentDetail[]; clashesWith?: ClashSummary[] };

/**
 * Turn a wall-clock date + time typed by the owner into a real instant, using
 * the business timezone rather than whatever zone her device happens to be in.
 */
async function toBusinessInstant(businessId: string, date: string, time: string): Promise<Date> {
  const business = await getBusiness(businessId);
  if (!business) throw new Error('Unknown business.');
  return zonedToUtc(date, time, business.timezone);
}

/** Throws unless the appointment belongs to the signed-in owner's business. */
async function assertOwnAppointment(appointmentId: string, businessId: string): Promise<void> {
  const row = await queryOne<{ business_id: string }>(
    'select business_id from appointments where id = $1',
    [appointmentId],
  );
  if (!row || row.business_id !== businessId) {
    throw new Error('That booking does not belong to this business.');
  }
}

function refreshAdmin() {
  revalidatePath('/admin');
  revalidatePath('/admin/week');
  revalidatePath('/admin/blocks');
  revalidatePath('/admin/settings');
}

// ---------------------------------------------------------------- Today screen

/** One-tap completed / no_show from the Today screen (§7). */
export async function markStatusAction(
  appointmentId: string,
  status: 'completed' | 'no_show',
): Promise<ActionResult> {
  const { businessId } = await requireOwner();
  await assertOwnAppointment(appointmentId, businessId);

  await markAppointmentStatus({ appointmentId, status });
  refreshAdmin();
  return { ok: true, message: status === 'completed' ? 'Marked as done.' : 'Marked as a no-show.' };
}

export async function cancelAppointmentAction(appointmentId: string): Promise<ActionResult> {
  const { businessId } = await requireOwner();
  await assertOwnAppointment(appointmentId, businessId);

  const result = await cancelBooking({ appointmentId, actor: 'admin' });
  refreshAdmin();
  return result.ok ? { ok: true, message: 'Booking cancelled.' } : { ok: false, message: result.message };
}

// ------------------------------------------------------------------- walk-ins

/**
 * §7 screen 3. Without this the calendar diverges from reality within a week.
 * source = 'walkin' skips working hours and minimum notice (the customer is
 * standing at the counter) but NOT the double-booking checks.
 */
export async function createWalkInAction(input: {
  serviceId: string;
  staffId: string;
  /** Wall-clock date and time as typed in the studio, e.g. '2026-08-19' + '14:30'. */
  date: string;
  time: string;
  name: string;
  phone: string;
  notes?: string;
}): Promise<ActionResult> {
  const { businessId } = await requireOwner();

  // §12: the server computes all times. The form sends the wall clock the
  // owner typed; converting it here means a laptop left on the wrong timezone
  // cannot quietly book someone two hours out.
  const startsAt = await toBusinessInstant(businessId, input.date, input.time);

  const result = await createBooking({
    businessId,
    serviceId: input.serviceId,
    staffId: input.staffId,
    startsAt,
    name: input.name,
    phone: input.phone,
    notes: input.notes ?? null,
    source: 'walkin',
  });

  refreshAdmin();
  if (result.ok) return { ok: true, message: `Booked ${input.name} in.` };
  return {
    ok: false,
    message: result.message,
    clashesWith: result.error === 'slot_taken' ? result.clashesWith : undefined,
  };
}

/**
 * Owner-side move. §7.1: "The owner is not exempt from double-booking checks —
 * she is the most likely person to cause one." If the constraint rejects it,
 * hand back what it clashes with so the UI can name it.
 */
export async function moveAppointmentAction(input: {
  appointmentId: string;
  date: string;
  time: string;
  staffId?: string | null;
}): Promise<ActionResult> {
  const { businessId } = await requireOwner();
  await assertOwnAppointment(input.appointmentId, businessId);

  const result = await rescheduleBooking({
    appointmentId: input.appointmentId,
    startsAt: await toBusinessInstant(businessId, input.date, input.time),
    staffId: input.staffId ?? null,
    actor: 'admin',
  });

  refreshAdmin();
  if (result.ok) return { ok: true, message: 'Booking moved.' };
  return {
    ok: false,
    message: result.message,
    clashesWith: result.error === 'slot_taken' ? result.clashesWith : undefined,
  };
}

// --------------------------------------------------------------------- blocks

export async function createBlockAction(input: {
  staffId?: string | null;
  resourceId?: string | null;
  /** Wall-clock in the studio's timezone; converted server-side (§12). */
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
  confirm?: boolean;
}): Promise<ActionResult> {
  const { businessId } = await requireOwner();

  const result = await addAvailabilityBlock({
    staffId: input.staffId ?? null,
    resourceId: input.resourceId ?? null,
    startsAt: await toBusinessInstant(businessId, input.date, input.startTime),
    endsAt: await toBusinessInstant(businessId, input.date, input.endTime),
    reason: input.reason ?? null,
    confirm: input.confirm ?? false,
  });

  refreshAdmin();
  if (result.ok) {
    return {
      ok: true,
      message:
        result.warnings.length > 0
          ? `Time blocked. ${result.warnings.length} existing booking${result.warnings.length === 1 ? '' : 's'} left in place.`
          : 'Time blocked.',
    };
  }
  return { ok: false, message: result.message, conflicts: result.conflicts };
}

export async function deleteBlockAction(blockId: string): Promise<ActionResult> {
  const { businessId } = await requireOwner();

  // Scope the delete to this business through the block's staff or resource.
  const deleted = await query<{ id: string }>(
    `delete from availability_blocks b
      using (select 1) as _
      where b.id = $1
        and (exists (select 1 from staff s where s.id = b.staff_id and s.business_id = $2)
             or exists (select 1 from resources r where r.id = b.resource_id and r.business_id = $2))
      returning b.id`,
    [blockId, businessId],
  );

  refreshAdmin();
  return deleted.length > 0
    ? { ok: true, message: 'Block removed.' }
    : { ok: false, message: 'That block could not be found.' };
}

// --------------------------------------------------------------- config (§7.1)

export async function updateServiceAction(
  serviceId: string,
  patch: {
    name?: string;
    description?: string | null;
    duration_minutes?: number;
    turnaround_minutes?: number;
    price_cents?: number;
  },
): Promise<ActionResult> {
  const { businessId } = await requireOwner();

  const service = await queryOne<{ business_id: string }>(
    'select business_id from services where id = $1',
    [serviceId],
  );
  if (!service || service.business_id !== businessId) {
    return { ok: false, message: 'That treatment does not belong to this business.' };
  }

  // §7.1: duration, price and turnaround changes save silently. Existing
  // bookings keep their stored times and price_cents_at_booking.
  await updateService(serviceId, patch);
  refreshAdmin();
  return { ok: true, message: 'Saved. Bookings already on the diary are unchanged.' };
}

export async function deactivateServiceAction(serviceId: string): Promise<ActionResult> {
  await requireOwner();
  const result = await deactivateService(serviceId);
  refreshAdmin();

  if (!result.ok) return { ok: false, message: result.message };
  const count = result.warnings.length;
  return {
    ok: true,
    message:
      count > 0
        ? `Hidden from the booking page. ${count} upcoming booking${count === 1 ? '' : 's'} use this. They will go ahead.`
        : 'Hidden from the booking page.',
  };
}

/** §7.1: blocked, not warned. Orphaned bookings are the dangerous case. */
export async function deactivateStaffAction(staffId: string): Promise<ActionResult> {
  await requireOwner();
  const result = await deactivateStaff(staffId);
  refreshAdmin();
  return result.ok
    ? { ok: true, message: 'Therapist made inactive.' }
    : { ok: false, message: result.message, conflicts: result.conflicts };
}

export async function deactivateResourceAction(resourceId: string): Promise<ActionResult> {
  await requireOwner();
  const result = await deactivateResource(resourceId);
  refreshAdmin();
  return result.ok
    ? { ok: true, message: 'Taken out of service.' }
    : { ok: false, message: result.message, conflicts: result.conflicts };
}

export async function reactivateAction(
  table: 'services' | 'staff' | 'resources',
  id: string,
): Promise<ActionResult> {
  const { businessId } = await requireOwner();
  // Table name is from a closed union, never from the request body.
  await query(`update ${table} set active = true where id = $1 and business_id = $2`, [id, businessId]);
  refreshAdmin();
  return { ok: true, message: 'Back in service.' };
}

export async function setWorkingHoursAction(input: {
  staffId: string;
  dayOfWeek: number;
  windows: HoursWindow[];
  confirm?: boolean;
}): Promise<ActionResult> {
  const { businessId } = await requireOwner();

  const result = await setWorkingHours({
    businessId,
    staffId: input.staffId,
    dayOfWeek: input.dayOfWeek,
    windows: input.windows,
    confirm: input.confirm ?? false,
  });

  refreshAdmin();
  if (result.ok) {
    return {
      ok: true,
      message:
        result.warnings.length > 0
          ? `Hours saved. ${result.warnings.length} booking${result.warnings.length === 1 ? '' : 's'} outside the new hours left in place.`
          : 'Hours saved.',
    };
  }
  return { ok: false, message: result.message, conflicts: result.conflicts };
}
