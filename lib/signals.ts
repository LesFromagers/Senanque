/**
 * Generic "reading → threshold → action" math. Pure, no I/O — every
 * analytics-wing project should be able to reuse these helpers against its
 * own series and its own lib/indicators/<slug>.ts config, rather than
 * re-deriving moving averages or drawdowns per project. See CLAUDE.md's
 * Bailey Bros. section, which asks this pattern to generalize.
 */

export interface Point {
  date: string; // ISO yyyy-mm-dd
  value: number;
}

/** Trailing simple moving average, aligned to the later date of each window. */
export function movingAverage(series: Point[], window: number): Point[] {
  if (window <= 0 || series.length < window) return [];
  const out: Point[] = [];
  let sum = 0;
  for (let i = 0; i < series.length; i++) {
    sum += series[i].value;
    if (i >= window) sum -= series[i - window].value;
    if (i >= window - 1) out.push({ date: series[i].date, value: sum / window });
  }
  return out;
}

/** Lowest value across the last `window` points. */
export function trailingLow(series: Point[], window: number): number | null {
  if (series.length === 0) return null;
  const slice = series.slice(-window);
  return Math.min(...slice.map((p) => p.value));
}

/** Highest value across the last `window` points. */
export function trailingHigh(series: Point[], window: number): number | null {
  if (series.length === 0) return null;
  const slice = series.slice(-window);
  return Math.max(...slice.map((p) => p.value));
}

export interface DrawdownPoint extends Point {
  drawdownPct: number;
}

/** % drawdown from the rolling trailing-`window` high, computed at every point. */
export function drawdownFromHigh(series: Point[], window: number): DrawdownPoint[] {
  const out: DrawdownPoint[] = [];
  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - window + 1);
    let max = -Infinity;
    for (let j = start; j <= i; j++) max = Math.max(max, series[j].value);
    out.push({
      date: series[i].date,
      value: series[i].value,
      drawdownPct: ((series[i].value - max) / max) * 100,
    });
  }
  return out;
}

export type TrendDirection = "rising" | "falling" | "flat";

/** Direction of the latest reading vs. `window` points prior, with a flat deadband. */
export function trendDirection(
  series: Point[],
  window: number,
  epsilonPct = 0.5,
): TrendDirection {
  if (series.length < window + 1) return "flat";
  const latest = series[series.length - 1].value;
  const prior = series[series.length - 1 - window].value;
  if (prior === 0) return "flat";
  const changePct = ((latest - prior) / Math.abs(prior)) * 100;
  if (changePct > epsilonPct) return "rising";
  if (changePct < -epsilonPct) return "falling";
  return "flat";
}

/**
 * Direction by absolute difference rather than % change — use this for
 * series that can sit near zero (e.g. the Fed funds rate), where a % change
 * is noisy or meaningless. `epsilonAbs` is in the series' own units (e.g.
 * percentage points for a rate).
 */
export function trendDirectionAbsolute(
  series: Point[],
  window: number,
  epsilonAbs = 0.05,
): TrendDirection {
  if (series.length < window + 1) return "flat";
  const latest = series[series.length - 1].value;
  const prior = series[series.length - 1 - window].value;
  const change = latest - prior;
  if (change > epsilonAbs) return "rising";
  if (change < -epsilonAbs) return "falling";
  return "flat";
}

export interface Band<T extends string> {
  label: T;
  /** Inclusive upper bound. Omit on the last (catch-all) band. */
  max?: number;
}

/** Classifies a value into the first band whose upper bound it clears. */
export function bandClassify<T extends string>(value: number, bands: Band<T>[]): T {
  for (const band of bands) {
    if (band.max === undefined || value <= band.max) return band.label;
  }
  return bands[bands.length - 1].label;
}

export interface SahmResult {
  triggered: boolean;
  current3moAvg: number | null;
  trailingLow3moAvg: number | null;
}

/**
 * Sahm Rule: flags a recession warning when the 3-month moving average of
 * the unemployment rate sits 0.5 points or more above its lowest point
 * over the trailing 12 months (of that same 3-month-MA series).
 */
export function sahmRule(unemployment: Point[]): SahmResult {
  const ma3 = movingAverage(unemployment, 3);
  if (ma3.length === 0) {
    return { triggered: false, current3moAvg: null, trailingLow3moAvg: null };
  }
  const current = ma3[ma3.length - 1].value;
  const low = trailingLow(ma3, 12);
  return {
    triggered: low !== null && current - low >= 0.5,
    current3moAvg: current,
    trailingLow3moAvg: low,
  };
}

export interface AlignedPoint {
  date: string;
  a: number;
  b: number;
}

/** Inner-joins two series by exact date match — e.g. DGS10 vs DGS2. */
export function alignSeries(a: Point[], b: Point[]): AlignedPoint[] {
  const bByDate = new Map(b.map((p) => [p.date, p.value]));
  const out: AlignedPoint[] = [];
  for (const pa of a) {
    const bv = bByDate.get(pa.date);
    if (bv !== undefined) out.push({ date: pa.date, a: pa.value, b: bv });
  }
  return out;
}

/** Collapses a series to one point per calendar month. */
export function monthlyAggregate(
  series: Point[],
  method: "last" | "average" = "last",
): Point[] {
  const byMonth = new Map<string, Point[]>();
  for (const p of series) {
    const month = p.date.slice(0, 7); // YYYY-MM
    const bucket = byMonth.get(month);
    if (bucket) bucket.push(p);
    else byMonth.set(month, [p]);
  }
  const out: Point[] = [];
  for (const [month, pts] of byMonth) {
    pts.sort((x, y) => x.date.localeCompare(y.date));
    const value =
      method === "last"
        ? pts[pts.length - 1].value
        : pts.reduce((sum, p) => sum + p.value, 0) / pts.length;
    out.push({ date: `${month}-01`, value });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

/** Year-over-year % change of a (typically monthly) series. */
export function yoyChange(series: Point[]): Point[] {
  const out: Point[] = [];
  for (let i = 12; i < series.length; i++) {
    const prior = series[i - 12].value;
    if (prior === 0) continue;
    out.push({
      date: series[i].date,
      value: ((series[i].value - prior) / prior) * 100,
    });
  }
  return out;
}

/** Trims a series to points on or after `start` (inclusive), by ISO date string compare. */
export function trimSince(series: Point[], start: string): Point[] {
  return series.filter((p) => p.date >= start);
}
