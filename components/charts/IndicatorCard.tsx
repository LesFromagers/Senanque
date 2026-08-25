"use client";

import { useState } from "react";
import { TimeSeriesChart } from "./TimeSeriesChart";
import { DrillToggle } from "./DrillToggle";
import type { IndicatorViewModel } from "@/lib/indicators/bailey-bros";

interface IndicatorCardProps {
  indicator: IndicatorViewModel;
  color: string;
}

export function IndicatorCard({ indicator, color }: IndicatorCardProps) {
  const [drill, setDrill] = useState<"monthly" | "daily">("monthly");

  if (indicator.status === "unavailable") {
    return (
      <div className="min-w-0 rounded-sm border border-dashed border-stone/60 p-5">
        <h3 className="font-display text-lg font-light text-charcoal">{indicator.title}</h3>
        <p className="mt-2 text-sm text-stone">
          {indicator.unavailableMessage ?? "Live data unavailable."}
        </p>
      </div>
    );
  }

  const activeSeries =
    drill === "daily" && indicator.dailySeries ? indicator.dailySeries : indicator.chartSeries ?? [];

  return (
    <div
      className={`min-w-0 rounded-sm border p-5 ${indicator.warning ? "border-gold/60 bg-gold/5" : "border-stone/40"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-light text-charcoal">{indicator.title}</h3>
          {indicator.latestValue !== undefined && (
            <p className="mt-1 font-display text-2xl font-light text-charcoal">
              {indicator.latestValue.toFixed(2)}
              <span className="ml-1 text-sm text-stone">{indicator.unit}</span>
            </p>
          )}
        </div>
        {indicator.signalLabel && (
          <span
            className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs tracking-label uppercase ${
              indicator.warning ? "bg-gold/20 text-charcoal" : "bg-sage/20 text-charcoal"
            }`}
          >
            {indicator.signalLabel}
          </span>
        )}
      </div>

      {indicator.dailySeries && (
        <div className="mt-3">
          <DrillToggle value={drill} onChange={setDrill} />
        </div>
      )}

      <div className="mt-3">
        <TimeSeriesChart
          data={activeSeries}
          color={color}
          unit={indicator.unit === "%" || indicator.unit === "pp" ? indicator.unit : undefined}
          referenceLines={indicator.referenceLines}
        />
      </div>

      {indicator.action && (
        <dl className="mt-4 space-y-2 border-t border-stone/30 pt-3 text-sm">
          <div>
            <dt className="text-xs tracking-label uppercase text-stone">Bank lens</dt>
            <dd className="mt-0.5 text-charcoal">{indicator.action.bank}</dd>
          </div>
          <div>
            <dt className="text-xs tracking-label uppercase text-stone">VC lens</dt>
            <dd className="mt-0.5 text-charcoal">{indicator.action.vc}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
