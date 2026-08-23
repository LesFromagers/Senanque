import "server-only";
import draftsJson from "@/data/heisman-ledger/iconic_moments_draft.json";

export interface IconicMomentDraft {
  year: number;
  title: string;
  body: string;
}

const drafts = draftsJson as IconicMomentDraft[];
const byYear = new Map(drafts.map((d) => [d.year, d]));

/**
 * Every one of these is explicitly DRAFT — Matt's own voice pass hasn't
 * happened yet (see data/heisman-ledger/iconic_moments_draft.md's header).
 * Never render this without the DRAFT label attached; that's the whole
 * point of keeping it as its own accessor instead of inlining the JSON
 * import in the page component.
 */
export function getIconicMomentDraft(year: number): IconicMomentDraft | null {
  return byYear.get(year) ?? null;
}
