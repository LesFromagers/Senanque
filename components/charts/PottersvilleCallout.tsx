import type { CompoundSignal } from "@/lib/indicators/bailey-bros";

/**
 * The standout compound signal: yield-curve inversion AND a Sahm Rule
 * trigger, firing together, get one prominent callout above the individual
 * cards — not just two cards that happen to both be flagged. Labeled after
 * It's a Wonderful Life: a calm reading is "Bedford Falls," the compound
 * warning is "Welcome to Pottersville."
 */
export function PottersvilleCallout({ compound }: { compound: CompoundSignal }) {
  if (compound.status !== "ok") return null;

  if (compound.pottersville) {
    return (
      <div className="mb-8 rounded-sm border border-gold bg-gold/10 p-6">
        <p className="text-xs tracking-label uppercase text-gold">Compound signal</p>
        <h2 className="mt-2 font-display text-2xl font-light text-charcoal">
          Welcome to Pottersville
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-charcoal">
          The yield curve is inverted and the Sahm Rule has triggered at the same time —
          historically, this combination has preceded downturns more reliably than either
          signal alone.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-sm border border-sage/50 bg-sage/10 p-6">
      <p className="text-xs tracking-label uppercase text-sage">Compound signal</p>
      <h2 className="mt-2 font-display text-2xl font-light text-charcoal">Bedford Falls</h2>
      <p className="mt-2 max-w-2xl text-sm text-charcoal">
        The yield curve and the Sahm Rule aren&rsquo;t flashing together right now — a calm
        reading, at least on this combined signal.
      </p>
    </div>
  );
}
