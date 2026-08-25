import Link from "next/link";
import { PracticeArcade } from "./PracticeArcade";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between sm:gap-12">
        <div className="max-w-xl">
          <p className="text-xs tracking-label uppercase text-stone">
            Oklahoma City · BI &amp; Data Analysis
          </p>
          <h1 className="mt-4 font-display text-4xl font-light leading-tight text-charcoal sm:text-5xl">
            Analytics &amp; Agentics for the Contemplative
          </h1>
          <p className="mt-6 max-w-lg text-charcoal/90">
            Every dataset carries its own reason for being shaped the way it is. The work
            here is patient: pull the real source, age it properly, show what it actually
            says.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="#work"
              className="rounded-sm bg-lavender px-5 py-2.5 text-sm font-medium text-charcoal transition-opacity hover:opacity-90"
            >
              View the work
            </Link>
            <Link
              href="#approach"
              className="rounded-sm border border-gold px-5 py-2.5 text-sm font-medium text-charcoal transition-colors hover:bg-gold/10"
            >
              Read the approach
            </Link>
          </div>
        </div>
        <div className="flex shrink-0 flex-row gap-6 text-xs tracking-label uppercase text-stone sm:flex-col sm:gap-1.5 sm:text-right">
          <span>Abbaye de Sénanque</span>
          <span>1148</span>
        </div>
      </div>

      <div className="mt-12 sm:mt-16">
        <PracticeArcade />
      </div>
    </section>
  );
}
