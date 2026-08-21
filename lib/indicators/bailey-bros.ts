import {
  alignSeries,
  bandClassify,
  drawdownFromHigh,
  monthlyAggregate,
  sahmRule,
  trendDirection,
  trendDirectionAbsolute,
  trimSince,
  yoyChange,
  type Point,
  type TrendDirection,
} from "@/lib/signals";
import { fetchSeries, type FredResult } from "@/lib/fred";

/** Earliest date fetched — buffer before DISPLAY_START so trailing-window math (YoY, Sahm, 52-week high) has enough runway. */
export const FETCH_START = "2006-06-01";
/** Earliest date actually charted, per CLAUDE.md: "2008–present, to capture the financial crisis through today." */
export const DISPLAY_START = "2008-01-01";

export interface ActionCopy {
  bank: string;
  vc: string;
}

export interface IndicatorViewModel {
  id: string;
  title: string;
  unit: string;
  cadence: "monthly" | "daily";
  status: "ok" | "unavailable";
  unavailableMessage?: string;
  latestValue?: number;
  latestDate?: string;
  /** What's charted by default — monthly-aggregated for the two daily series. */
  chartSeries?: Point[];
  /** Only present for the two daily-cadence indicators, for the drill-to-daily toggle. */
  dailySeries?: Point[];
  referenceLines?: { value: number; label: string }[];
  signalLabel?: string;
  warning?: boolean;
  action?: ActionCopy;
}

function unavailable(id: string, title: string, unit: string, cadence: "monthly" | "daily", result: FredResult): IndicatorViewModel {
  return {
    id,
    title,
    unit,
    cadence,
    status: "unavailable",
    unavailableMessage: !result.ok ? result.message : "Live data unavailable.",
  };
}

function fmtPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

// ---------------------------------------------------------------------------
// 1. Fed funds rate — direction vs. the reading 3 months prior.
// ---------------------------------------------------------------------------
async function computeFedFunds(): Promise<IndicatorViewModel> {
  const id = "fed-funds";
  const title = "Fed funds rate";
  const unit = "%";
  const result = await fetchSeries("FEDFUNDS", { start: FETCH_START });
  if (!result.ok || result.observations.length === 0) return unavailable(id, title, unit, "monthly", result);

  const direction: TrendDirection = trendDirectionAbsolute(result.observations, 3, 0.05);
  const latest = result.observations[result.observations.length - 1];

  const action: Record<TrendDirection, ActionCopy> = {
    rising: {
      bank: "Rising for three months — deposit and loan repricing accelerates; watch net interest margin timing.",
      vc: "A rising policy rate lifts the discount rate on future cash flows — added pressure on growth-stage valuations.",
    },
    falling: {
      bank: "Falling for three months — loan demand headwinds ease, but asset yields compress; reprice deposits carefully.",
      vc: "A falling policy rate lowers the discount rate on future cash flows — a tailwind for growth and late-stage valuations.",
    },
    flat: {
      bank: "Little change over three months — funding costs and loan pricing hold steady.",
      vc: "Little change over three months — limited signal for the discount-rate outlook.",
    },
  };

  return {
    id,
    title,
    unit,
    cadence: "monthly",
    status: "ok",
    latestValue: latest.value,
    latestDate: latest.date,
    chartSeries: trimSince(result.observations, DISPLAY_START),
    signalLabel: direction[0].toUpperCase() + direction.slice(1),
    warning: false,
    action: action[direction],
  };
}

// ---------------------------------------------------------------------------
// 2. CPI, year-over-year — banded by level.
// ---------------------------------------------------------------------------
type CpiBand = "near target" | "elevated" | "high inflation";

async function computeCpi(): Promise<IndicatorViewModel> {
  const id = "cpi-yoy";
  const title = "CPI, year-over-year";
  const unit = "%";
  const result = await fetchSeries("CPIAUCSL", { start: FETCH_START });
  if (!result.ok) return unavailable(id, title, unit, "monthly", result);

  const yoy = yoyChange(result.observations);
  if (yoy.length === 0) return unavailable(id, title, unit, "monthly", result);
  const latest = yoy[yoy.length - 1];

  const band = bandClassify<CpiBand>(latest.value, [
    { label: "near target", max: 2.5 },
    { label: "elevated", max: 4 },
    { label: "high inflation" },
  ]);

  const action: Record<CpiBand, ActionCopy> = {
    "near target": {
      bank: "Inflation is near target — limited pressure on loan pricing or deposit costs.",
      vc: "Inflation is near target — real returns on cash holdings are holding steady.",
    },
    elevated: {
      bank: "Elevated inflation squeezes net interest margin as funding costs climb faster than asset yields.",
      vc: "Elevated inflation erodes real returns on cash and slows the pace of expected exits.",
    },
    "high inflation": {
      bank: "High inflation drives sustained margin pressure — expect further deposit-cost repricing.",
      vc: "High inflation meaningfully erodes real returns — inflation-hedged allocations are worth a look.",
    },
  };

  return {
    id,
    title,
    unit,
    cadence: "monthly",
    status: "ok",
    latestValue: latest.value,
    latestDate: latest.date,
    chartSeries: trimSince(yoy, DISPLAY_START),
    referenceLines: [
      { value: 2.5, label: "2.5%" },
      { value: 4, label: "4%" },
    ],
    signalLabel: band[0].toUpperCase() + band.slice(1),
    warning: band !== "near target",
    action: action[band],
  };
}

// ---------------------------------------------------------------------------
// 3. Unemployment — Sahm Rule.
// ---------------------------------------------------------------------------
async function computeUnemployment(): Promise<{ vm: IndicatorViewModel; sahmTriggered: boolean }> {
  const id = "unemployment";
  const title = "Unemployment rate";
  const unit = "%";
  const result = await fetchSeries("UNRATE", { start: FETCH_START });
  if (!result.ok || result.observations.length === 0) {
    return { vm: unavailable(id, title, unit, "monthly", result), sahmTriggered: false };
  }

  const sahm = sahmRule(result.observations);
  const latest = result.observations[result.observations.length - 1];

  const action: Record<"triggered" | "clear", ActionCopy> = {
    triggered: {
      bank: "Sahm Rule triggered — a historically reliable recession signal; tighten underwriting standards.",
      vc: "Sahm Rule triggered — favor capital preservation over growth-chasing until the signal clears.",
    },
    clear: {
      bank: "No Sahm Rule signal — labor-market slack remains within its recent range.",
      vc: "No Sahm Rule signal — conditions don't yet justify a defensive posture.",
    },
  };

  return {
    vm: {
      id,
      title,
      unit,
      cadence: "monthly",
      status: "ok",
      latestValue: latest.value,
      latestDate: latest.date,
      chartSeries: trimSince(result.observations, DISPLAY_START),
      signalLabel: sahm.triggered ? "Sahm Rule triggered" : "No signal",
      warning: sahm.triggered,
      action: action[sahm.triggered ? "triggered" : "clear"],
    },
    sahmTriggered: sahm.triggered,
  };
}

// ---------------------------------------------------------------------------
// 4. S&P 500 — % drawdown from the trailing 52-week high.
// ---------------------------------------------------------------------------
type DrawdownBand = "none" | "correction" | "bear market";

async function computeSp500(): Promise<IndicatorViewModel> {
  const id = "sp500";
  const title = "S&P 500";
  const unit = "index";
  const result = await fetchSeries("SP500", { start: FETCH_START });
  if (!result.ok || result.observations.length === 0) return unavailable(id, title, unit, "daily", result);

  // ~52 weeks of trading days.
  const withDrawdown = drawdownFromHigh(result.observations, 252);
  const latest = withDrawdown[withDrawdown.length - 1];

  const band = bandClassify<DrawdownBand>(-latest.drawdownPct, [
    { label: "none", max: 10 },
    { label: "correction", max: 20 },
    { label: "bear market" },
  ]);

  const action: Record<DrawdownBand, ActionCopy> = {
    none: {
      bank: "Equity markets sit near highs — collateral values remain supportive.",
      vc: "Equity markets sit near highs — public comps remain a tailwind for markups.",
    },
    correction: {
      bank: "Market correction under way — revisit loan-to-value assumptions on equity-linked collateral.",
      vc: "Market correction under way — expect softer comps for near-term markups.",
    },
    "bear market": {
      bank: "Bear-market territory — stress-test collateral-backed exposure.",
      vc: "Bear-market territory — down-round risk rises; extend runway assumptions.",
    },
  };

  const daily = trimSince(result.observations, DISPLAY_START);
  const monthly = monthlyAggregate(daily, "last");

  return {
    id,
    title,
    unit,
    cadence: "daily",
    status: "ok",
    latestValue: latest.value,
    latestDate: latest.date,
    chartSeries: monthly,
    dailySeries: daily,
    signalLabel: `${fmtPct(latest.drawdownPct)} from 52-week high`,
    warning: band !== "none",
    action: action[band],
  };
}

// ---------------------------------------------------------------------------
// 5. Consumer sentiment — 3-month trend.
// ---------------------------------------------------------------------------
async function computeSentiment(): Promise<IndicatorViewModel> {
  const id = "sentiment";
  const title = "Consumer sentiment";
  const unit = "index";
  const result = await fetchSeries("UMCSENT", { start: FETCH_START });
  if (!result.ok || result.observations.length === 0) return unavailable(id, title, unit, "monthly", result);

  const direction = trendDirection(result.observations, 3);
  const latest = result.observations[result.observations.length - 1];

  const action: Record<TrendDirection, ActionCopy> = {
    rising: {
      bank: "Rising sentiment is a supportive backdrop for consumer loan demand.",
      vc: "Rising sentiment is a tailwind for consumer-facing revenue growth.",
    },
    falling: {
      bank: "Falling sentiment — watch for softening consumer credit demand.",
      vc: "Falling sentiment is a headwind for consumer-facing growth assumptions.",
    },
    flat: {
      bank: "Sentiment holding steady — no meaningful shift in loan-demand backdrop.",
      vc: "Sentiment holding steady — limited signal for consumer-facing growth assumptions.",
    },
  };

  return {
    id,
    title,
    unit,
    cadence: "monthly",
    status: "ok",
    latestValue: latest.value,
    latestDate: latest.date,
    chartSeries: trimSince(result.observations, DISPLAY_START),
    signalLabel: direction[0].toUpperCase() + direction.slice(1),
    warning: false,
    action: action[direction],
  };
}

// ---------------------------------------------------------------------------
// 6. 10Y–2Y Treasury yield spread — binary inversion.
// ---------------------------------------------------------------------------
async function computeYieldSpread(): Promise<{ vm: IndicatorViewModel; inverted: boolean }> {
  const id = "yield-spread";
  const title = "10Y–2Y yield spread";
  const unit = "pp";
  const [dgs10, dgs2] = await Promise.all([
    fetchSeries("DGS10", { start: FETCH_START }),
    fetchSeries("DGS2", { start: FETCH_START }),
  ]);
  if (!dgs10.ok) return { vm: unavailable(id, title, unit, "daily", dgs10), inverted: false };
  if (!dgs2.ok) return { vm: unavailable(id, title, unit, "daily", dgs2), inverted: false };

  const aligned = alignSeries(dgs10.observations, dgs2.observations);
  const spread: Point[] = aligned.map((p) => ({ date: p.date, value: p.a - p.b }));
  if (spread.length === 0) {
    return {
      vm: { id, title, unit, cadence: "daily", status: "unavailable", unavailableMessage: "No overlapping DGS10/DGS2 observations." },
      inverted: false,
    };
  }

  const latest = spread[spread.length - 1];
  const inverted = latest.value < 0;

  const action: Record<"inverted" | "normal", ActionCopy> = {
    inverted: {
      bank: "Curve inverted — a historically reliable recession signal; tighten long-duration lending.",
      vc: "Curve inverted — has historically preceded tighter later-stage capital markets.",
    },
    normal: {
      bank: "Curve not inverted — no yield-curve recession signal at this time.",
      vc: "Curve not inverted — no yield-curve-driven caution warranted right now.",
    },
  };

  const daily = trimSince(spread, DISPLAY_START);
  const monthly = monthlyAggregate(daily, "average");

  return {
    vm: {
      id,
      title,
      unit,
      cadence: "daily",
      status: "ok",
      latestValue: latest.value,
      latestDate: latest.date,
      chartSeries: monthly,
      dailySeries: daily,
      referenceLines: [{ value: 0, label: "Inversion" }],
      signalLabel: inverted ? "Inverted" : "Normal",
      warning: inverted,
      action: action[inverted ? "inverted" : "normal"],
    },
    inverted,
  };
}

// ---------------------------------------------------------------------------
// 7. Oklahoma coincident economic index — 3-month trend.
// ---------------------------------------------------------------------------
async function computeOkphci(): Promise<IndicatorViewModel> {
  const id = "okphci";
  const title = "Oklahoma coincident index";
  const unit = "index";
  const result = await fetchSeries("OKPHCI", { start: FETCH_START });
  if (!result.ok || result.observations.length === 0) return unavailable(id, title, unit, "monthly", result);

  const direction = trendDirection(result.observations, 3);
  const latest = result.observations[result.observations.length - 1];

  const action: Record<TrendDirection, ActionCopy> = {
    rising: {
      bank: "Oklahoma's coincident index is rising — regional loan-demand backdrop improving.",
      vc: "Oklahoma's coincident index is rising — a supportive signal for regional portfolio companies.",
    },
    falling: {
      bank: "Oklahoma's coincident index is falling — watch regional credit quality closely.",
      vc: "Oklahoma's coincident index is falling — a headwind for regional portfolio companies.",
    },
    flat: {
      bank: "Oklahoma's coincident index is holding steady — no meaningful shift regionally.",
      vc: "Oklahoma's coincident index is holding steady — limited regional signal either way.",
    },
  };

  return {
    id,
    title,
    unit,
    cadence: "monthly",
    status: "ok",
    latestValue: latest.value,
    latestDate: latest.date,
    chartSeries: trimSince(result.observations, DISPLAY_START),
    signalLabel: direction[0].toUpperCase() + direction.slice(1),
    warning: false,
    action: action[direction],
  };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------
export interface CompoundSignal {
  status: "ok" | "unavailable";
  pottersville: boolean;
}

export interface BaileyBrosData {
  indicators: IndicatorViewModel[];
  compound: CompoundSignal;
}

export async function getBaileyBrosData(): Promise<BaileyBrosData> {
  const [fedFunds, cpi, unemployment, sp500, sentiment, yieldSpread, okphci] = await Promise.all([
    computeFedFunds(),
    computeCpi(),
    computeUnemployment(),
    computeSp500(),
    computeSentiment(),
    computeYieldSpread(),
    computeOkphci(),
  ]);

  const compound: CompoundSignal =
    unemployment.vm.status === "ok" && yieldSpread.vm.status === "ok"
      ? { status: "ok", pottersville: unemployment.sahmTriggered && yieldSpread.inverted }
      : { status: "unavailable", pottersville: false };

  return {
    indicators: [fedFunds, cpi, unemployment.vm, sp500, sentiment, yieldSpread.vm, okphci],
    compound,
  };
}
