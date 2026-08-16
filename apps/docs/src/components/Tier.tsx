import type {ReactNode} from 'react';

/**
 * The tiers that have the thing below: every tier from `level` up. An Enterprise-only feature
 * carries one badge, a Team-level one carries both — Enterprise includes what Team has, and the
 * question a reader is asking is "is this on my plan", which a lone lowest-tier label leaves them
 * to work out.
 *
 * Placed under the page title when the whole page is gated, or under the section heading when
 * only that part is. What exactly needs the tier goes in the prose beneath: gates sit on
 * configuration writes rather than on reading, and a Free scale cap is a number worth stating.
 */
export default function Tier({
  level,
}: {
  /** The lowest tier that has it. */
  level: 'team' | 'enterprise';
}): ReactNode {
  const tiers = level === 'team' ? ['Team', 'Enterprise'] : ['Enterprise'];
  return (
    <p className={`tier tier--${level}`}>
      {tiers.map((tier) => (
        <span key={tier} className="tier__badge">
          {tier}
        </span>
      ))}
    </p>
  );
}
