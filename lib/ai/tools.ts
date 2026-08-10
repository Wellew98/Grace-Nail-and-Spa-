import 'server-only';
import { getAvailableSlots, getBusiness, getService } from '../availability';
import { query } from '../db';
import { formatDuration, formatZar } from '../money';
import { formatPhoneForDisplay } from '../phone';
import { getActiveServices, getActiveStaff, getOpeningHours, hasDemoData } from '../public-data';
import { DAY_NAMES } from '../site';
import { formatSlotLabel, daysBetween, todayInZone, type IsoDate } from '../time';
import { validateToolCall, type CheckAvailabilityArgs } from './validation';
import type {
  AIToolDeclaration,
  AvailabilityInfo,
  BusinessInfo,
  OpeningHoursDay,
  SampleDataFlag,
  ServiceInfo,
  StaffInfo,
  ToolResult,
} from './types';

/**
 * The four read-only tools the assistant may call.
 *
 * ---------------------------------------------------------------------------
 * RULES THAT APPLY TO ALL FOUR
 *
 * THEY READ THE SAME ROWS THE SITE RENDERS. `lib/public-data.ts` and
 * `lib/availability.ts`, unchanged. There is no second catalogue and no cached
 * copy of the menu, so the assistant physically cannot contradict the site or
 * survive an owner's edit in Admin > Setup.
 *
 * `check_availability` CALLS THE AVAILABILITY ENGINE. It does not reimplement
 * any part of it. Everything §6 gets right — the fifteen-minute grid,
 * turnaround, minimum notice, blocks, resource contention, and the
 * empty-resource-set rule that once let one room be booked without limit —
 * is got right here for free, and stays right when that file changes.
 *
 * NOTHING PERSONAL IS READABLE. There is no tool for customers, appointments,
 * notes or admin data, and no tool takes an argument that could reach them.
 * `get_staff` returns a therapist's name and what she does; her phone, email
 * and everything in the auth tables are not exposed by any path here.
 *
 * IDS ARE GIVEN OUT ONLY WHERE THEY ARE NEEDED. Services carry an id because
 * `check_availability` needs one to name a treatment unambiguously. Therapists
 * do not: a name is enough, and the id is resolved server-side.
 * ---------------------------------------------------------------------------
 */

/**
 * Mirrors `components/demo-banner.tsx`. Attached to tool results rather than
 * written into the prompt so it is derived from the data on every call and
 * disappears by itself when the placeholder rows go (spec v2 §2).
 */
const SAMPLE_DATA_NOTICE =
  'Sample menu. These treatments, prices and therapists are placeholders while the real ones are confirmed.';

export interface ToolContext {
  businessId: string;
  /** Injectable for tests, exactly as `getAvailableSlots` takes it. */
  now?: Date;
}

export const TOOL_DECLARATIONS: AIToolDeclaration[] = [
  {
    name: 'get_business_info',
    description:
      "The studio's name, address, phone number, website and opening hours. Call this before answering anything about where the studio is, how to contact it, or when it is open.",
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_services',
    description:
      'Every treatment currently offered, with its length, price and id. Call this before naming or pricing any treatment. The id is what check_availability needs.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_staff',
    description:
      'The therapists currently working and which treatments each of them does. Call this before naming a therapist.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'check_availability',
    description:
      'The times that are actually free for one treatment on one date. This is the only source of bookable times; never suggest a time this has not returned.',
    parameters: {
      type: 'object',
      properties: {
        service_id: {
          type: 'string',
          description: 'The id of the treatment, exactly as returned by get_services.',
        },
        date: {
          type: 'string',
          description: 'The calendar date to check, as YYYY-MM-DD.',
        },
        staff_name: {
          type: 'string',
          description:
            'Optional. The name of a therapist, exactly as returned by get_staff. Leave it out unless the guest asked for someone in particular.',
        },
      },
      required: ['service_id', 'date'],
    },
  },
];

// ---------------------------------------------------------------------------
// get_business_info
// ---------------------------------------------------------------------------

/**
 * Opening hours as all seven days, with closed days stated rather than missing.
 *
 * `getOpeningHours` returns only the days somebody works, which is right for
 * rendering a list and wrong for a model: absence of a row would otherwise be
 * read as "no information" and answered as "yes, we're open".
 */
function everyDay(hours: { day: number; opens: string; closes: string }[]): OpeningHoursDay[] {
  return DAY_NAMES.map((day, index) => {
    const match = hours.find((entry) => entry.day === index);
    return match
      ? { day, closed: false, opens: match.opens, closes: match.closes }
      : { day, closed: true };
  });
}

export async function getBusinessInfo(context: ToolContext): Promise<BusinessInfo> {
  const business = await getBusiness(context.businessId);
  if (!business) throw new Error('no business row');

  const hours = await getOpeningHours(business.id);

  return {
    name: business.name,
    address: business.address,
    // Display form, the same one the footer and the contact page show, so a
    // number read out by the assistant matches the number on the site.
    phone: formatPhoneForDisplay(business.phone),
    website: process.env.NEXT_PUBLIC_SITE_URL ?? '',
    opening_hours: everyDay(hours),
    timezone: business.timezone,
  };
}

// ---------------------------------------------------------------------------
// get_services
// ---------------------------------------------------------------------------

/**
 * Which services require a room or a chair — asked as "are there any
 * `service_resources` rows", never "are any resources active".
 *
 * That distinction is the whole of the §6 correction: a service whose only room
 * has been deactivated still REQUIRES a room, and reporting otherwise is how
 * one room came to be bookable without limit. This answer is about the
 * requirement, not about whether it can currently be met — availability is what
 * answers that, and it makes the same distinction.
 */
async function resourceRequirements(businessId: string): Promise<Set<string>> {
  const rows = await query<{ service_id: string }>(
    `select distinct sr.service_id
       from service_resources sr
       join services s on s.id = sr.service_id
      where s.business_id = $1`,
    [businessId],
  );
  return new Set(rows.map((row) => row.service_id));
}

export async function getServices(
  context: ToolContext,
): Promise<SampleDataFlag & { services: ServiceInfo[] }> {
  const [services, requiresResource, sampleData] = await Promise.all([
    getActiveServices(context.businessId),
    resourceRequirements(context.businessId),
    hasDemoData(context.businessId),
  ]);

  return {
    ...sampleDataFlag(sampleData),
    services: services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      duration: formatDuration(service.duration_minutes),
      price_cents: service.price_cents,
      price: formatZar(service.price_cents),
      // `getActiveServices` filters on `active`, so this is always true. It is
      // stated anyway: a field that is present and true cannot be mistaken for
      // a field that was forgotten.
      active: true,
      requires_resource: requiresResource.has(service.id),
      // Turnaround is deliberately absent. It is calendar occupancy, not part
      // of the appointment, and the customer is shown the treatment length
      // (§4). Handing the model both invites it to quote the wrong one.
    })),
  };
}

// ---------------------------------------------------------------------------
// get_staff
// ---------------------------------------------------------------------------

export async function getStaff(
  context: ToolContext,
): Promise<SampleDataFlag & { staff: StaffInfo[] }> {
  // Columns are listed explicitly rather than `s.*`. `staff` also holds phone,
  // email and the Phase 3 Google refresh token; a `select *` here would put all
  // of them one careless spread away from the model's context.
  const rows = await query<{ name: string; service_name: string | null }>(
    `select s.name, sv.name as service_name
       from staff s
       left join staff_services ss on ss.staff_id = s.id
       left join services sv on sv.id = ss.service_id and sv.active
      where s.business_id = $1
        and s.active
      order by s.name, sv.sort_order, sv.name`,
    [context.businessId],
  );

  const byName = new Map<string, StaffInfo>();
  for (const row of rows) {
    const entry = byName.get(row.name) ?? { name: row.name, active: true as const, services: [] };
    if (row.service_name) entry.services.push(row.service_name);
    byName.set(row.name, entry);
  }

  return {
    ...sampleDataFlag(await hasDemoData(context.businessId)),
    staff: [...byName.values()],
  };
}

// ---------------------------------------------------------------------------
// check_availability
// ---------------------------------------------------------------------------

export type AvailabilityOutcome =
  | { ok: true; data: SampleDataFlag & AvailabilityInfo }
  | { ok: false; error: 'not_found' | 'out_of_range'; message: string };

export async function checkAvailability(
  context: ToolContext,
  args: CheckAvailabilityArgs,
): Promise<AvailabilityOutcome> {
  const now = context.now ?? new Date();

  const business = await getBusiness(context.businessId);
  if (!business) throw new Error('no business row');

  // A uuid that parses is not a uuid that exists. The model can carry an id
  // from an earlier conversation, or invent a well-formed one.
  const service = await getService(args.service_id);
  if (!service || !service.active || service.business_id !== context.businessId) {
    return {
      ok: false,
      error: 'not_found',
      message: 'No treatment with that id is currently offered. Call get_services and use an id from it.',
    };
  }

  // The engine returns [] for a date outside the booking window, which is
  // correct but tells the model nothing. Naming the window lets it say when the
  // diary opens instead of "nothing free".
  const rangeError = dateWindowError(args.date, business.timezone, business.max_advance_days, now);
  if (rangeError) return { ok: false, error: 'out_of_range', message: rangeError };

  const staff = await getActiveStaff(context.businessId);

  let staffId: string | null = null;
  if (args.staff_name) {
    const requested = args.staff_name.trim().toLowerCase();
    const matches = staff.filter((member) => member.name.trim().toLowerCase() === requested);
    if (matches.length !== 1) {
      return {
        ok: false,
        error: 'not_found',
        message:
          matches.length === 0
            ? 'No therapist is working under that name. Call get_staff and use a name from it, or leave staff_name out to check everyone.'
            : 'More than one therapist goes by that name. Leave staff_name out to check everyone.',
      };
    }
    staffId = matches[0].id;
  }

  // §6, unmodified. Everything the engine enforces is enforced here because it
  // IS the engine: turnaround, minimum notice, closed days, blocks, resource
  // contention, and zero slots for a service whose every room is inactive.
  const slots = await getAvailableSlots({
    businessId: context.businessId,
    serviceId: service.id,
    date: args.date,
    staffId,
    now,
  });

  const staffNames = new Map(staff.map((member) => [member.id, member.name]));

  return {
    ok: true,
    data: {
      ...sampleDataFlag(await hasDemoData(context.businessId)),
      date: args.date,
      service: service.name,
      timezone: business.timezone,
      slots: slots.map((slot) => ({
        // Labelled in the business timezone, never the server's and never a
        // browser's — spec §12, and the bug that shipped once in the walk-in
        // form. The resolved (staff_id, resource_id) pair stays server-side.
        time: formatSlotLabel(slot.startsAt, business.timezone),
        with: staffNames.get(slot.staffId) ?? '',
      })),
    },
  };
}

function dateWindowError(
  date: IsoDate,
  timezone: string,
  maxAdvanceDays: number,
  now: Date,
): string | null {
  const daysOut = daysBetween(todayInZone(timezone, now), date);
  if (daysOut < 0) return 'That date has already passed.';
  if (daysOut > maxAdvanceDays) {
    return `The diary only opens ${maxAdvanceDays} days ahead, so that date cannot be checked yet.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

function sampleDataFlag(present: boolean): SampleDataFlag {
  return present ? { sample_data: true, sample_data_notice: SAMPLE_DATA_NOTICE } : { sample_data: false };
}

/**
 * Run one tool call.
 *
 * Validation happens here, before any tool sees an argument, so no tool takes
 * `unknown` and none of them can read a raw value by accident.
 *
 * Nothing throws out of this function. A tool failing is a normal event — the
 * database can be slow, the model can invent an id — and the answer to all of
 * them is a result the model can read and recover from. An exception here would
 * become a 500 on a page whose booking flow is working perfectly well.
 */
export async function executeTool(
  name: unknown,
  rawArgs: unknown,
  context: ToolContext,
): Promise<ToolResult> {
  const toolName = typeof name === 'string' ? name : 'unknown';

  const validated = validateToolCall(name, rawArgs);
  if (!validated.ok) {
    return { ok: false, tool: toolName, error: validated.error, message: validated.message };
  }

  try {
    switch (validated.tool) {
      case 'get_business_info':
        return { ok: true, tool: validated.tool, data: await getBusinessInfo(context) };
      case 'get_services':
        return { ok: true, tool: validated.tool, data: await getServices(context) };
      case 'get_staff':
        return { ok: true, tool: validated.tool, data: await getStaff(context) };
      case 'check_availability': {
        const outcome = await checkAvailability(context, validated.args as CheckAvailabilityArgs);
        return outcome.ok
          ? { ok: true, tool: validated.tool, data: outcome.data }
          : { ok: false, tool: validated.tool, error: outcome.error, message: outcome.message };
      }
    }
  } catch (error) {
    // Operational facts only — spec v2 §9.5. The tool name and the error's own
    // message, never the arguments, the conversation or any row that was read.
    console.error('[ai] tool failed', {
      tool: validated.tool,
      message: error instanceof Error ? error.message : 'unknown error',
    });
    return {
      ok: false,
      tool: validated.tool,
      error: 'unavailable',
      message: 'That information could not be looked up just now.',
    };
  }
}
