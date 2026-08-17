/**
 * Registry of the legal documents published under `/legal/`.
 *
 * The registry — not the document body — owns version, date and status, so the
 * hub page, the document header and the footer link list can never drift from
 * each other. A document's prose lives in `src/pages/legal/<slug>.md` and
 * points back here with `docId` in its frontmatter.
 *
 * IMPORTANT — the EULA is not authored here. `fadebox/LICENSE` in the product
 * repo is the canonical text: it ships inside the binary and is what a customer
 * actually agrees to. The page and the plain-text copy under `public/legal/`
 * are mirrors, and must be re-copied whenever that file changes. Verify with a
 * plain diff of the two files; they are intended to be byte-identical.
 */

/**
 * `draft` keeps a document out of the footer and out of search engines while
 * still building and deploying, so counsel can be sent a real URL. Flipping it
 * to `in-force` is the single switch that publishes: the draft banner and the
 * `noindex` tag come off and the footer link appears.
 */
export type LegalStatus = "draft" | "in-force";

export interface LegalDoc {
  /** Matches `docId` in the markdown frontmatter and the file's own slug. */
  id: string;
  /** Full document name, as it reads in the header and the hub list. */
  title: string;
  /** Compact label for the footer, where the full name is too long. */
  shortTitle: string;
  /** Displayed next to the date, JetBrains-style: "Version 15". */
  version: string;
  /**
   * Effective date, ISO. Null while a document is a draft — an unreviewed
   * agreement has no effective date, and inventing one would be the single
   * most misleading thing this page could do.
   */
  effective: string | null;
  status: LegalStatus;
  /** One line for the hub list — what the document governs. */
  blurb: string;
  /** Path under `public/` of the plain-text copy offered for download. */
  plainText?: string;
  /** Where the canonical text lives, shown in the document footer. */
  canonicalNote?: string;
}

export const legalDocs: LegalDoc[] = [
  {
    id: "license",
    title: "Fadebox End User License Agreement",
    shortTitle: "License agreement",
    version: "Version 0.2",
    effective: null,
    status: "draft",
    blurb:
      "Governs installing and using the Fadebox software, on the Free tier and under a paid license key.",
    plainText: "legal/fadebox-eula-draft-v0.2.txt",
    canonicalNote:
      "The same text ships as the LICENSE file inside every Fadebox release.",
  },
];

export function legalDoc(id: string): LegalDoc {
  const doc = legalDocs.find((d) => d.id === id);
  // A typo'd docId would otherwise render a header with blank version and date,
  // which is exactly the kind of quiet wrongness a legal page cannot afford.
  if (!doc) throw new Error(`Unknown legal document id: ${id}`);
  return doc;
}

/** Documents that are actually in force — the only ones the footer links. */
export const publishedLegalDocs = legalDocs.filter((d) => d.status === "in-force");

/** Long-form date for document headers: "22 July 2024". */
export function formatEffective(iso: string | null): string {
  if (!iso) return "Not yet in force";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
