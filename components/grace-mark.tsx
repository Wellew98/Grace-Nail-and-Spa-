/**
 * The studio's own mark, as it appears on the shopfront banner outside
 * 11 Amanda Avenue: a cream disc inside a double ring, the word GRACE in
 * letterspaced serif caps with a script "Grace" written across it, and
 * NAILS & BEAUTY SPA on a rule beneath.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS DRAWN AND NOT AN IMAGE FILE
 *
 * No vector original exists for this project — the only copy of the logo we
 * have is a photograph of a printed banner, at an angle, part-obscured. Cutting
 * a bitmap out of that would put a blurry, off-white-cornered rectangle in the
 * header at every screen density.
 *
 * Drawn instead, it stays crisp at 28px in the header and at 160px in the hero,
 * carries no weight over the wire, and takes its colours from the page, so the
 * same component works on blush and on aubergine. It is set in the site's own
 * faces (Fraunces for GRACE, Karla for the strip) so the mark and the pages
 * around it are demonstrably one identity.
 *
 * It is a faithful reconstruction, not a tracing. When the owner sends the
 * original artwork, replace this file's innards with the SVG she supplies —
 * everything on the site imports the mark from here.
 *
 * THE FAVICON IS THE ONE COPY THAT IS NOT IMPORTED FROM HERE. `app/icon.png`,
 * `app/apple-icon.png` and `app/favicon.ico` are pixels, because a standalone
 * icon file has no page around it and so no webfont — the script would fall
 * back to whatever cursive the reader's device has. They are generated from
 * this same artwork by `scripts/make-icons.mjs`, which renders it inside the
 * running site where the real fonts are loaded. Change the mark and run that
 * script, or the tab will keep the old logo.
 * ---------------------------------------------------------------------------
 */

export function GraceMark({
  className,
  /**
   * 'full' is the banner lockup. 'compact' keeps only the ring and the script,
   * because below about 60px the serif GRACE and the NAILS & BEAUTY SPA strip
   * stop being letters and become grey smudges — a logo that is illegible at
   * the size it is actually used is worse than a smaller logo.
   */
  variant = 'full',
  /** Decorative next to the business name in text; labelled when it stands alone. */
  title,
}: {
  className?: string;
  variant?: 'full' | 'compact';
  title?: string;
}) {
  const compact = variant === 'compact';

  return (
    <svg
      viewBox="0 0 220 220"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}

      {/* The disc. Set by the caller through --mark-disc so the mark can sit on
          the blush ground or reverse out on aubergine. */}
      <circle cx="110" cy="110" r="107" fill="var(--mark-disc, #fdf8f7)" />

      {/* Double ring, as printed: a firm outer line and a hairline inside it. */}
      <circle cx="110" cy="110" r="103.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle
        cx="110"
        cy="110"
        r="96"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.55"
      />

      {/* The script. On the banner it is written across the serif caps rather
          than above them, so the two overlap here too. */}
      <text
        x="110"
        y={compact ? 134 : 98}
        textAnchor="middle"
        fill={compact ? 'currentColor' : 'var(--mark-script, #b08a4a)'}
        opacity={compact ? 1 : 0.85}
        /* Pinned to a width rather than left to the font's own metrics: the
           script is a webfont, and until it arrives this is set in whatever
           cursive the device has. Without this the fallback can push the word
           through the ring on the first paint. */
        textLength={compact ? 150 : 118}
        lengthAdjust="spacingAndGlyphs"
        style={{ fontFamily: 'var(--font-script)', fontSize: compact ? '82px' : '54px' }}
      >
        Grace
      </text>

      {!compact && (
        <>
          {/* The +5 on x compensates for the trailing letter-space that SVG
              counts into the width of a centred string. */}
          <text
            x="115"
            y="126"
            textAnchor="middle"
            fill="currentColor"
            letterSpacing="10"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '40px',
              fontWeight: 600,
              fontVariationSettings: "'SOFT' 0, 'WONK' 0, 'opsz' 144",
            }}
          >
            GRACE
          </text>

          <line
            x1="66"
            y1="140"
            x2="154"
            y2="140"
            stroke="currentColor"
            strokeWidth="0.9"
            opacity="0.5"
          />

          {/* Held to 132 units wide. The ring narrows to about 170 across at
              this height, and the strip has to clear it at every font the
              browser might reach for before Karla loads. */}
          <text
            x="110"
            y="158"
            textAnchor="middle"
            fill="currentColor"
            textLength="132"
            lengthAdjust="spacingAndGlyphs"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 500 }}
          >
            NAILS &amp; BEAUTY SPA
          </text>
        </>
      )}
    </svg>
  );
}
