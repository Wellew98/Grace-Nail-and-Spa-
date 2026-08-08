/**
 * Shown on every page while placeholder treatments or therapists are in the
 * database (see hasDemoData). Its job is to make sure nobody — the owner, a
 * customer who finds the URL early, or whoever is being shown the demo —
 * mistakes the sample menu for the real one.
 *
 * It disappears on its own when the demo rows are removed, because it is driven
 * by the data and not by a setting.
 */
export function DemoBanner() {
  return (
    <div
      role="status"
      className="border-b border-gilt-500/40 bg-gilt-200 px-5 py-2.5 text-center text-[0.78rem] leading-snug text-gilt-600"
    >
      <strong className="font-semibold">Sample menu.</strong> These treatments, prices and
      therapists are placeholders while the real ones are confirmed — please don&rsquo;t rely on
      them yet.
    </div>
  );
}
