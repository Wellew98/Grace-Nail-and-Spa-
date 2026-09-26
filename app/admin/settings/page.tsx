import Link from 'next/link';
import { SettingsManager } from '@/components/admin/settings-manager';
import { getAllResources, getAllServices, getAllStaff, getBusiness } from '@/lib/public-data';
import { query } from '@/lib/db';
import { requireOwner } from '@/lib/supabase/session';

export const dynamic = 'force-dynamic';

/** §7 screen 5 — services, staff, resources and hours. Plain CRUD, guarded by §7.1. */
export default async function SettingsPage() {
  await requireOwner();

  const business = (await getBusiness())!;
  const [services, staff, resources] = await Promise.all([
    getAllServices(business.id),
    getAllStaff(business.id),
    getAllResources(business.id),
  ]);

  const hours = await query<{ staff_id: string; day_of_week: number; start_time: string; end_time: string }>(
    `select wh.staff_id, wh.day_of_week, wh.start_time::text, wh.end_time::text
       from working_hours wh
       join staff s on s.id = wh.staff_id
      where s.business_id = $1
      order by wh.day_of_week, wh.start_time`,
    [business.id],
  );

  return (
    <>
      <SettingsManager
        timezone={business.timezone}
        services={services.map((service) => ({
          id: service.id,
          name: service.name,
          durationMinutes: service.duration_minutes,
          turnaroundMinutes: service.turnaround_minutes,
          priceCents: service.price_cents,
          active: service.active,
        }))}
        staff={staff.map((member) => ({ id: member.id, name: member.name, active: member.active }))}
        resources={resources.map((resource) => ({
          id: resource.id,
          name: resource.name,
          active: resource.active,
        }))}
        hours={hours.map((row) => ({
          staffId: row.staff_id,
          dayOfWeek: row.day_of_week,
          startTime: row.start_time.slice(0, 5),
          endTime: row.end_time.slice(0, 5),
        }))}
      />

      <section className="mt-12">
        <h2 className="font-display text-lg font-semibold text-aubergine-900">Your password</h2>
        <p className="mt-1 text-sm text-mauve-500">
          Change the password you sign in with. You will need the current one.
        </p>
        <Link
          href="/admin/update-password"
          className="mt-3 inline-block rounded-full border border-aubergine-900 px-5 py-2.5 text-sm text-aubergine-900 hover:bg-blush-100"
        >
          Change password
        </Link>
      </section>
    </>
  );
}
