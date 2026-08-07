import { beforeEach, describe, expect, it } from 'vitest';
import { getAvailableSlots } from '@/lib/availability';
import { createBooking } from '@/lib/booking';
import { query } from '@/lib/db';
import { IDS, TZ, at, labels, nextWorkingDate, resetDatabase } from './helpers/fixtures';

beforeEach(resetDatabase);

const customer = { name: 'Thandi Mahlangu', phone: '082 555 0101' };

describe('§9.2 Resource contention', () => {
  it('hides 10:00 for a massage once the only room is taken, even though therapists are free', async () => {
    // "Two therapists, one massage room" — seed ships two rooms, so retire one.
    await query('update resources set active = false where id = $1', [IDS.resource.massageRoom2]);

    const date = nextWorkingDate();

    const before = await getAvailableSlots({
      businessId: IDS.business,
      serviceId: IDS.service.fullBodyMassage,
      date,
    });
    expect(labels(before)).toContain('10:00');

    const booked = await createBooking({
      businessId: IDS.business,
      serviceId: IDS.service.fullBodyMassage,
      staffId: IDS.staff.sarah,
      startsAt: at(date, '10:00'),
      ...customer,
    });
    expect(booked.ok).toBe(true);

    const after = await getAvailableSlots({
      businessId: IDS.business,
      serviceId: IDS.service.fullBodyMassage,
      date,
    });

    // The room is the binding constraint, not the therapist.
    expect(labels(after)).not.toContain('10:00');

    // Prove the premise: a therapist genuinely is free at 10:00. She just has
    // nowhere to put the client.
    const manicureAt10 = await getAvailableSlots({
      businessId: IDS.business,
      serviceId: IDS.service.gelManicure, // requires no resource
      date,
      staffId: IDS.staff.nomsa,
    });
    expect(labels(manicureAt10)).toContain('10:00');
  });

  it('still offers 10:00 while a second room remains free', async () => {
    const date = nextWorkingDate();

    await createBooking({
      businessId: IDS.business,
      serviceId: IDS.service.fullBodyMassage,
      staffId: IDS.staff.sarah,
      startsAt: at(date, '10:00'),
      ...customer,
    });

    const after = await getAvailableSlots({
      businessId: IDS.business,
      serviceId: IDS.service.fullBodyMassage,
      date,
    });
    expect(labels(after)).toContain('10:00');

    // Exhaust the second room too, and now it must disappear.
    await createBooking({
      businessId: IDS.business,
      serviceId: IDS.service.fullBodyMassage,
      staffId: IDS.staff.nomsa,
      startsAt: at(date, '10:00'),
      ...customer,
      phone: '082 555 0102',
    });

    const exhausted = await getAvailableSlots({
      businessId: IDS.business,
      serviceId: IDS.service.fullBodyMassage,
      date,
    });
    expect(labels(exhausted)).not.toContain('10:00');
  });
});

describe('§9.3 Turnaround', () => {
  it('blocks 11:00 and frees 11:15 after a 60-minute service with 15 minutes turnaround at 10:00', async () => {
    const date = nextWorkingDate();

    await createBooking({
      businessId: IDS.business,
      serviceId: IDS.service.fullBodyMassage, // 60 min + 15 turnaround
      staffId: IDS.staff.sarah,
      startsAt: at(date, '10:00'),
      ...customer,
    });

    const sarah = await getAvailableSlots({
      businessId: IDS.business,
      serviceId: IDS.service.fullBodyMassage,
      date,
      staffId: IDS.staff.sarah,
    });
    const times = labels(sarah);

    // The customer was shown 60 minutes; the calendar blocked 75.
    expect(times).not.toContain('11:00');
    expect(times).toContain('11:15');

    // Everything inside the occupied range is gone too.
    for (const blocked of ['09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00']) {
      expect(times).not.toContain(blocked);
    }
  });

  it('stores customer-facing end and calendar occupancy as different instants', async () => {
    const date = nextWorkingDate();
    const result = await createBooking({
      businessId: IDS.business,
      serviceId: IDS.service.fullBodyMassage,
      staffId: IDS.staff.sarah,
      startsAt: at(date, '10:00'),
      ...customer,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { starts_at, ends_at, blocks_until } = result.appointment;
    expect(new Date(ends_at).getTime() - new Date(starts_at).getTime()).toBe(60 * 60_000);
    expect(new Date(blocks_until).getTime() - new Date(ends_at).getTime()).toBe(15 * 60_000);
  });
});

describe('§9.4 Blocks', () => {
  it('removes every facial slot overlapping a block on the only facial therapist', async () => {
    const date = nextWorkingDate();

    // Sarah is the sole facial therapist in the seed.
    await query(
      `insert into availability_blocks (staff_id, starts_at, ends_at, reason)
            values ($1, $2, $3, 'Dentist')`,
      [IDS.staff.sarah, at(date, '14:00').toISOString(), at(date, '15:00').toISOString()],
    );

    const slots = await getAvailableSlots({
      businessId: IDS.business,
      serviceId: IDS.service.facial, // 45 min + 10 turnaround = 55 min occupancy
      date,
    });

    const blockStart = at(date, '14:00').getTime();
    const blockEnd = at(date, '15:00').getTime();

    for (const slot of slots) {
      const start = slot.startsAt.getTime();
      const end = start + 55 * 60_000;
      const overlapsBlock = start < blockEnd && end > blockStart;
      expect(
        overlapsBlock,
        `slot ${new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour12: false, hour: '2-digit', minute: '2-digit' }).format(slot.startsAt)} overlaps the block`,
      ).toBe(false);
    }

    // Sanity: facials are still bookable outside the blocked window.
    expect(labels(slots)).toContain('09:00');
  });

  it('leaves other therapists untouched by a block on one of them', async () => {
    const date = nextWorkingDate();
    await query(
      `insert into availability_blocks (staff_id, starts_at, ends_at, reason)
            values ($1, $2, $3, 'Leave')`,
      [IDS.staff.sarah, at(date, '14:00').toISOString(), at(date, '15:00').toISOString()],
    );

    // Manicures are performed by all three, so 14:00 survives via Nomsa.
    const slots = await getAvailableSlots({
      businessId: IDS.business,
      serviceId: IDS.service.gelManicure,
      date,
    });
    expect(labels(slots)).toContain('14:00');
  });

  it('honours a block on a resource rather than a person', async () => {
    const date = nextWorkingDate();
    // Both rooms out of service for the morning.
    for (const room of [IDS.resource.massageRoom1, IDS.resource.massageRoom2]) {
      await query(
        `insert into availability_blocks (resource_id, starts_at, ends_at, reason)
              values ($1, $2, $3, 'Deep clean')`,
        [room, at(date, '09:00').toISOString(), at(date, '12:00').toISOString()],
      );
    }

    const slots = await getAvailableSlots({
      businessId: IDS.business,
      serviceId: IDS.service.fullBodyMassage,
      date,
    });
    for (const early of ['09:00', '10:00', '10:45']) {
      expect(labels(slots)).not.toContain(early);
    }
    // Afternoon is unaffected.
    expect(labels(slots)).toContain('12:00');
  });
});

describe('§9.5 Minimum notice', () => {
  it('offers nothing inside the 120-minute notice window', async () => {
    const date = nextWorkingDate();
    const now = at(date, '09:00'); // same day, spa already open

    const slots = await getAvailableSlots({
      businessId: IDS.business,
      serviceId: IDS.service.gelManicure,
      date,
      now,
    });

    const earliest = Math.min(...slots.map((s) => s.startsAt.getTime()));
    expect(earliest).toBeGreaterThanOrEqual(now.getTime() + 120 * 60_000);
    expect(labels(slots)).not.toContain('09:00');
    expect(labels(slots)).not.toContain('10:45');
    expect(labels(slots)).toContain('11:00');
  });

  it('refuses to accept a booking inside the notice window', async () => {
    const date = nextWorkingDate();
    const now = at(date, '09:00');

    const result = await createBooking({
      businessId: IDS.business,
      serviceId: IDS.service.gelManicure,
      staffId: IDS.staff.sarah,
      startsAt: at(date, '10:00'), // only one hour away
      ...customer,
      now,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('slot_taken');
  });

  it('respects max_advance_days', async () => {
    const business = await query<{ max_advance_days: number }>(
      'select max_advance_days from businesses where id = $1',
      [IDS.business],
    );
    const maxAdvance = business[0].max_advance_days;

    const tooFar = new Date();
    tooFar.setUTCDate(tooFar.getUTCDate() + maxAdvance + 5);

    const slots = await getAvailableSlots({
      businessId: IDS.business,
      serviceId: IDS.service.gelManicure,
      date: tooFar.toISOString().slice(0, 10),
    });
    expect(slots).toHaveLength(0);
  });
});

describe('§4 grid behaviour', () => {
  it('steps in 15-minute increments, not in service-duration increments', async () => {
    const date = nextWorkingDate();
    const slots = await getAvailableSlots({
      businessId: IDS.business,
      serviceId: IDS.service.fullBodyMassage, // 75 min occupancy
      date,
    });
    const times = labels(slots);
    // A duration-stepped grid would give 09:00, 10:15, 11:30… and hide 09:15.
    expect(times).toContain('09:00');
    expect(times).toContain('09:15');
    expect(times).toContain('09:30');
  });

  it('deduplicates by time rather than by staff', async () => {
    const date = nextWorkingDate();
    const slots = await getAvailableSlots({
      businessId: IDS.business,
      serviceId: IDS.service.gelManicure, // all three therapists, no resource
      date,
    });
    const times = labels(slots);
    expect(new Set(times).size).toBe(times.length);
  });

  it('never offers a slot that would run past the end of the working window', async () => {
    const date = nextWorkingDate();
    const slots = await getAvailableSlots({
      businessId: IDS.business,
      serviceId: IDS.service.fullBodyMassage, // 75 min occupancy, day ends 17:00
      date,
    });
    // Last start that fits 75 minutes before 17:00 is 15:45.
    expect(labels(slots)).toContain('15:45');
    expect(labels(slots)).not.toContain('16:00');
  });

  it('returns nothing on a day the spa is closed', async () => {
    // Find the next Sunday — the seed has no working_hours rows for it.
    const sunday = new Date();
    sunday.setUTCDate(sunday.getUTCDate() + 7);
    while (sunday.getUTCDay() !== 0) sunday.setUTCDate(sunday.getUTCDate() + 1);

    const slots = await getAvailableSlots({
      businessId: IDS.business,
      serviceId: IDS.service.gelManicure,
      date: sunday.toISOString().slice(0, 10),
    });
    expect(slots).toHaveLength(0);
  });
});
