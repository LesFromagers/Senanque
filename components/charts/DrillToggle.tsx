"use client";

type Cadence = "monthly" | "daily";

interface DrillToggleProps {
  value: Cadence;
  onChange: (value: Cadence) => void;
}

/** Monthly/daily switch for the two daily-cadence indicators (S&P 500, yield spread). */
export function DrillToggle({ value, onChange }: DrillToggleProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={value === "monthly" ? "font-medium text-plum" : "text-stone transition-colors hover:text-charcoal"}
      >
        Monthly
      </button>
      <span className="text-stone">·</span>
      <button
        type="button"
        onClick={() => onChange("daily")}
        className={value === "daily" ? "font-medium text-plum" : "text-stone transition-colors hover:text-charcoal"}
      >
        Daily
      </button>
    </div>
  );
}
