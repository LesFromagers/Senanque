import Link from "next/link";
import { Arcade } from "@/components/brand/Arcade";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs tracking-label uppercase text-stone">
            Oklahoma City · BI &amp; Data Analysis
          </p>
          <h1 className="mt-4 font-display text-5xl font-light text-charcoal">
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
        <Arcade bays={5} size="hero" caption={{ title: "Abbaye de Sénanque", year: "1148" }} />
      </div>
    </section>
  );
}
