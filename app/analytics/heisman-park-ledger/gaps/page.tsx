import type { Metadata } from "next";
import Link from "next/link";
import { getManualReviewWorklist } from "@/lib/heisman-ledger/gaps";

export const metadata: Metadata = {
  title: "Manual-Review Worklist — The Heisman Park Ledger",
};

export default async function GapsPage() {
  const { flagged, notPulled, sosNotStarted } = await getManualReviewWorklist();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/analytics/heisman-park-ledger"
        className="text-xs tracking-label uppercase text-stone hover:text-plum"
      >
        ← The Ledger
      </Link>

      <h1 className="mt-4 font-display text-3xl font-light text-charcoal">
        Manual-review worklist
      </h1>
      <p className="mt-3 max-w-2xl text-charcoal/90">
        Every gap this pipeline found and refused to guess past. Nothing here was invented —
        each row is a real hole in what a Wikipedia pull returned, flagged instead of filled.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-xl font-light text-charcoal">
          Flagged for manual review ({flagged.length})
        </h2>
        <div className="mt-4 space-y-4">
          {flagged.map((item) => (
            <div key={item.year} className="rounded-sm border border-gold/50 bg-gold/5 p-4">
              <div className="flex items-center justify-between">
                <Link
                  href={`/analytics/heisman-park-ledger/${item.year}`}
                  className="font-mono text-lg font-medium text-charcoal hover:text-plum hover:underline"
                >
                  {item.year}
                </Link>
              </div>
              <p className="mt-1 text-sm text-charcoal/90">{item.issue}</p>
              <p className="mt-1 text-sm text-plum">
                <span className="text-xs tracking-label uppercase text-stone">Needed </span>
                {item.needed}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 border-t border-stone/30 pt-6">
        <h2 className="font-display text-xl font-light text-charcoal">
          Not yet pulled ({notPulled.length} seasons)
        </h2>
        <p className="mt-2 text-sm text-charcoal/90">
          scripts/heisman_ledger/pull_wikipedia.py finishes these once it&rsquo;s run somewhere
          with network access to en.wikipedia.org.
        </p>
        {notPulled.length > 0 && (
          <p className="mt-3 font-mono text-xs leading-relaxed text-stone">
            {notPulled.join(", ")}
          </p>
        )}
      </section>

      {sosNotStarted && (
        <section className="mt-10 border-t border-stone/30 pt-6">
          <h2 className="font-display text-xl font-light text-charcoal">
            Not started: strength-of-schedule opponent lists
          </h2>
          <p className="mt-2 text-sm text-charcoal/90">
            The SRS layer of the Power Index needs every OU opponent&rsquo;s own season game
            log, not just OU&rsquo;s — a second-order pull that hasn&rsquo;t been built yet.
            Every season&rsquo;s SOS-adjusted margin is currently null and flagged; see each
            season&rsquo;s gap list for the exact note.
          </p>
        </section>
      )}
    </div>
  );
}
