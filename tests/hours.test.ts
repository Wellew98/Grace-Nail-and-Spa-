import { describe, expect, it } from 'vitest';
import { formatClock, summariseOpeningHours } from '@/lib/hours';

/**
 * The one line of hours in the homepage hero.
 *
 * Pure functions over the same rows the footer renders — no database, so this
 * file runs without one. What is being protected is that the summary can never
 * say something the day-by-day table does not.
 */

describe('formatClock', () => {
  it('drops the minutes when there are none', () => {
    expect(formatClock('09:00')).toBe('9am');
    expect(formatClock('20:00')).toBe('8pm');
  });

  it('keeps them when there are', () => {
    expect(formatClock('16:30')).toBe('4:30pm');
  });

  it('renders both noon and midnight as 12', () => {
    expect(formatClock('12:00')).toBe('12pm');
    expect(formatClock('00:00')).toBe('12am');
  });
});

describe('summariseOpeningHours', () => {
  const day = (day: number, opens: string, closes: string) => ({ day, opens, closes });

  it('names the whole week in full when every day is the same', () => {
    const week = [0, 1, 2, 3, 4, 5, 6].map((d) => day(d, '09:00', '18:00'));
    expect(summariseOpeningHours(week)).toBe('Monday – Sunday 9am – 6pm');
  });

  it('splits a shorter Sunday off the back of the week', () => {
    // The Google Business Profile's hours: Mon–Sat late, Sunday short.
    const week = [
      ...[1, 2, 3, 4, 5, 6].map((d) => day(d, '09:00', '20:00')),
      day(0, '09:00', '16:00'),
    ];
    expect(summariseOpeningHours(week)).toBe('Mon – Sat 9am – 8pm · Sun 9am – 4pm');
  });

  it('treats a missing day as closed and does not span it', () => {
    // Spec §10's fixture week: closed Sunday and Monday.
    const week = [2, 3, 4, 5, 6].map((d) => day(d, '09:00', '17:00'));
    expect(summariseOpeningHours(week)).toBe('Tue – Sat 9am – 5pm');
  });

  it('starts the week on Monday however the rows arrive', () => {
    const week = [day(6, '09:00', '13:00'), day(1, '09:00', '17:00')];
    expect(summariseOpeningHours(week)).toBe('Mon 9am – 5pm · Sat 9am – 1pm');
  });

  it('is null when nobody is working, so the hero shows no line at all', () => {
    expect(summariseOpeningHours([])).toBeNull();
  });
});
