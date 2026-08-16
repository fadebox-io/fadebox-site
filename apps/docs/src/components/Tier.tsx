import type {ReactNode} from 'react';

/**
 * Marks what a paid tier is needed for: a badge under the page title when the whole page is
 * gated, or under a section heading when only that part is — the common case, because gates sit
 * on configuration writes rather than on reading, or on using what is already configured. The
 * child text says which part, so a badge never overclaims; the prose keeps the link to
 * `guides/licensing.md`, which survives a version snapshot in a way an absolute URL would not.
 *
 * There are deliberately no `team` markers today. The tiers differ by **scale** (runtimes,
 * instances, users), not by features — every feature is on every tier and only the compliance
 * set is Enterprise — so nothing is Team-only to mark. The level exists for the day that changes.
 */
export default function Tier({
  level,
  children,
}: {
  /** The lowest tier the marked thing requires. */
  level: 'team' | 'enterprise';
  /** Exactly what needs the tier, when the whole page does not. */
  children?: ReactNode;
}): ReactNode {
  return (
    <p className={`tier tier--${level}`}>
      <span className="tier__badge">{level === 'team' ? 'Team' : 'Enterprise'}</span>
      {children && <span className="tier__scope">{children}</span>}
    </p>
  );
}
