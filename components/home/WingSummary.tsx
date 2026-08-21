import Link from "next/link";

export function WingSummary() {
  return (
    <section id="approach" className="border-y border-stone/40 bg-oat">
      <div className="mx-auto grid max-w-6xl divide-y divide-stone/40 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="px-6 py-10 sm:pr-10">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl font-light text-charcoal">Analytics</h2>
            <span className="rounded-full bg-sage/25 px-2.5 py-0.5 text-xs tracking-label uppercase text-charcoal">
              Live
            </span>
          </div>
          <p className="mt-3 max-w-md text-sm text-charcoal/90">
            Dashboards and studies built on public APIs — FRED, collegefootballdata.
            Method notes and source links on every page.
          </p>
          <Link href="#work" className="mt-4 inline-block text-sm font-medium text-plum hover:text-gold">
            See the work →
          </Link>
        </div>
        <div className="px-6 py-10 sm:pl-10">
          <div className="flex items-center gap-3">
            <h2 id="agentics" className="font-display text-2xl font-light text-charcoal">
              Agentics
            </h2>
            <span className="rounded-full border border-stone px-2.5 py-0.5 text-xs tracking-label uppercase text-stone">
              Later
            </span>
          </div>
          <p className="mt-3 max-w-md text-sm text-charcoal/90">
            Agent-assisted reading tools — a theology comparator, film and music theme
            analysis. Deliberately unhurried; it gets its own sprint rather than a rushed
            launch.
          </p>
          <p className="mt-4 text-sm text-stone">Not yet published</p>
        </div>
      </div>
    </section>
  );
}
