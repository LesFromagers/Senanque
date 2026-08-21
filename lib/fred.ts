import "server-only";
import type { Point } from "@/lib/signals";

const FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations";

export type FredResult =
  | { ok: true; observations: Point[] }
  | { ok: false; reason: "missing-key" | "fetch-error" | "bad-response"; message: string };

interface FredObservation {
  date: string;
  value: string;
}

/**
 * Fetches one FRED series, server-side only — FRED_API_KEY never reaches
 * client code. Never throws: a missing key, a network failure, or a
 * malformed response all come back as a typed {ok:false}, so a page can
 * render a graceful "data unavailable" card per indicator instead of
 * failing the whole route (and so `next build` succeeds with no key set).
 */
export async function fetchSeries(
  seriesId: string,
  options: { start: string; end?: string } = { start: "2006-01-01" },
): Promise<FredResult> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      reason: "missing-key",
      message: "FRED_API_KEY is not configured.",
    };
  }

  const url = new URL(FRED_BASE_URL);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("observation_start", options.start);
  if (options.end) url.searchParams.set("observation_end", options.end);

  let response: Response;
  try {
    response = await fetch(url.toString(), { next: { revalidate: 3600 } });
  } catch (error) {
    return {
      ok: false,
      reason: "fetch-error",
      message: error instanceof Error ? error.message : "Network request failed.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: "bad-response",
      message: `FRED responded ${response.status} for series ${seriesId}.`,
    };
  }

  try {
    const data = (await response.json()) as { observations?: FredObservation[] };
    const observations: Point[] = (data.observations ?? [])
      .filter((o) => o.value !== ".")
      .map((o) => ({ date: o.date, value: Number(o.value) }))
      .filter((p) => Number.isFinite(p.value));
    return { ok: true, observations };
  } catch (error) {
    return {
      ok: false,
      reason: "bad-response",
      message: error instanceof Error ? error.message : "Could not parse FRED response.",
    };
  }
}
