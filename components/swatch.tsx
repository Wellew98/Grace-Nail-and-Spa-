import type { CSSProperties } from 'react';
import { lacquerFor } from '@/lib/palette';

/**
 * The signature element: a lacquer swatch stick.
 *
 * Nothing else on the site carries a gradient or a gloss, so this shape is the
 * one thing a returning visitor recognises. Sizes are deliberately limited —
 * it appears as a tall stick in the hero, a short chip beside a treatment, and
 * nothing else.
 */
export function Swatch({
  serviceName,
  size = 'chip',
  className = '',
  style,
}: {
  serviceName: string;
  size?: 'stick' | 'chip' | 'dot';
  className?: string;
  style?: CSSProperties;
}) {
  const lacquer = lacquerFor(serviceName);
  const dimensions =
    size === 'stick' ? 'w-14 h-40 sm:w-16 sm:h-48' : size === 'chip' ? 'w-7 h-16' : 'w-4 h-9';

  return (
    <span
      aria-hidden="true"
      className={`swatch block shrink-0 ${dimensions} ${className}`}
      style={{ ['--swatch' as string]: lacquer.base, ['--swatch-tint' as string]: lacquer.tint, ...style }}
    />
  );
}
