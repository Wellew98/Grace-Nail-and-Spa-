/**
 * The opening hours as one line — "Mon – Sat 9am – 8pm · Sun 9am – 4pm".
 *
 * The studio's banner puts its hours on a single rose line under the message,
 * and the homepage hero does the same. The footer keeps the day-by-day table;
 * this is the summary, for the one place where a seven-row list would be in the
 * way of the booking button.
 *
 * It is COMPUTED FROM THE SAME DATA the footer and the JSON-LD read, never
 * written out as copy — and specifically never from the studio's printed
 * banner, which says 9am–6pm where the Google Business Profile says 9am–8pm.
 * The profile is the source of record for hours and for the phone number
 * (docs/source-material/README.md); a shopfront banner can be years old. What
 * is in `working_hours` is also what the availability engine will sell, so this
 * line cannot say one thing while the diary offers another.
 */

import { DAY_NAMES, DAY_SHORT } from './site';

export interface OpeningHours {
  /** 0 = Sunday, matching working_hours.day_of_week. */
  day: number;
  /** 'HH:MM', 24-hour. */
  opens: string;
  closes: string;
}

/** '09:00' -> '9am'. '16:30' -> '4:30pm'. Minutes only when there are any. */
export function formatClock(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const suffix = hours < 12 ? 'am' : 'pm';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0
    ? `${hour12}${suffix}`
    : `${hour12}:${String(minutes).padStart(2, '0')}${suffix}`;
}

/** The week as a customer reads it, and as the banner prints it: Monday first. */
const WEEK: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

interface Run {
  days: number[];
  opens: string;
  closes: string;
}

/**
 * Consecutive days that keep the same hours, collapsed into runs. A closed day
 * has no row at all, and breaks the run it interrupts — which is what makes
 * "Tue – Sat" come out of a week with Sunday and Monday missing.
 */
function runsOf(hours: OpeningHours[]): Run[] {
  const byDay = new Map(hours.map((entry) => [entry.day, entry]));
  const runs: Run[] = [];

  WEEK.forEach((day, index) => {
    const entry = byDay.get(day);
    if (!entry) return;

    const current = runs.at(-1);
    const followsOn = current !== undefined && WEEK.indexOf(current.days.at(-1)!) === index - 1;

    if (current && followsOn && current.opens === entry.opens && current.closes === entry.closes) {
      current.days.push(day);
    } else {
      runs.push({ days: [day], opens: entry.opens, closes: entry.closes });
    }
  });

  return runs;
}

function labelFor(days: number[]): string {
  if (days.length === 7) return `${DAY_NAMES[1]} – ${DAY_NAMES[0]}`; // Monday – Sunday
  if (days.length === 1) return DAY_SHORT[days[0]];
  return `${DAY_SHORT[days[0]]} – ${DAY_SHORT[days.at(-1)!]}`;
}

/**
 * One line, or null when nobody is working — in which case the hero shows
 * nothing rather than the word "Closed" across the top of the site.
 */
export function summariseOpeningHours(hours: OpeningHours[]): string | null {
  const runs = runsOf(hours);
  if (runs.length === 0) return null;

  return runs
    .map((run) => `${labelFor(run.days)} ${formatClock(run.opens)} – ${formatClock(run.closes)}`)
    .join(' · ');
}
