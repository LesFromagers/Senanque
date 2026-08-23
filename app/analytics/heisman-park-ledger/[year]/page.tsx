import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BeatMarks } from "@/components/heisman-ledger/BeatMarks";
import { DataTierBadge } from "@/components/heisman-ledger/DataTierBadge";
import { GapBadge } from "@/components/heisman-ledger/GapBadge";
import { HeismanTrophyIcon } from "@/components/heisman-ledger/HeismanTrophyIcon";
import { getSeasons } from "@/lib/heisman-ledger/data";
import { getIconicMomentDraft } from "@/lib/heisman-ledger/iconic-moments";
import { computePowerIndex } from "@/lib/heisman-ledger/power-index";

export async function generateStaticParams() {
  const seasons = await getSeasons();
  return seasons.map((s) => ({ year: String(s.year) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>;
}): Promise<Metadata> {
  const { year } = await params;
  return { title: `${year} Oklahoma Sooners — The Heisman Park Ledger` };
}

export default async function SeasonDetailPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);

  const seasons = await getSeasons();
  const season = seasons.find((s) => s.year === year);
  if (!season) notFound();

  const results = computePowerIndex(seasons);
  const result = results.find((r) => r.year === year)!;
  const draft = getIconicMomentDraft(year);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/analytics/heisman-park-ledger"
        className="text-xs tracking-label uppercase text-stone hover:text-plum"
      >
        ← The Ledger
      </Link>

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-4xl font-light text-charcoal">{season.year}</h1>
        <span className="font-mono text-2xl font-medium text-garnet">
          {result.powerIndex.toFixed(1)}
          <span className="ml-2 text-sm font-sans text-stone">Power Index · Rank #{result.rank}</span>
        </span>
      </div>

      <p className="mt-1 text-lg text-charcoal/80">
        {season.headCoach ?? "Coach unknown"} · {season.finalRecord ?? "record unknown"} ·{" "}
        {season.conference ?? "conference unknown"}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <DataTierBadge tier={season.dataTier} />
        <BeatMarks beatTexas={season.beatTexas} beatOsu={season.beatOsu} />
        {season.heismanWinner && (
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-gold/60 px-1.5 py-0.5 text-[10px] tracking-label uppercase text-gold">
            <HeismanTrophyIcon className="h-3.5 w-3.5" />
            Heisman: {season.heismanWinner}
          </span>
        )}
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-4 border-y border-stone/30 py-6 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs tracking-label uppercase text-stone">Performance</dt>
          <dd className="font-mono text-lg text-charcoal">{result.performanceLayer.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-label uppercase text-stone">Accomplishment</dt>
          <dd className="font-mono text-lg text-charcoal">{result.accomplishmentLayer.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-label uppercase text-stone">Talent</dt>
          <dd className="font-mono text-lg text-charcoal">{result.talentLayer.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-xs tracking-label uppercase text-stone">Pt Diff/Game</dt>
          <dd className="font-mono text-lg text-charcoal">
            {result.pointDifferentialPerGame !== null ? result.pointDifferentialPerGame.toFixed(1) : "—"}
          </dd>
        </div>
      </dl>

      {season.notableAllAmericans && (
        <p className="mt-6 text-sm text-charcoal/90">
          <span className="text-xs tracking-label uppercase text-stone">All-Americans </span>
          {season.notableAllAmericans}
        </p>
      )}

      {season.nationalTitleClaim && (
        <p className="mt-2 text-sm text-charcoal/90">
          <span className="text-xs tracking-label uppercase text-stone">National title claim </span>
          {season.nationalTitleClaim}
        </p>
      )}

      <div className="mt-8">
        <p className="text-xs tracking-label uppercase text-garnet">Iconic moment</p>
        {draft ? (
          <div className="mt-2">
            <span className="mb-2 inline-block rounded-sm border border-gold bg-gold/10 px-2 py-0.5 text-[10px] font-semibold tracking-label uppercase text-gold">
              Draft — needs Matt&rsquo;s voice pass
            </span>
            <h2 className="mt-2 font-display text-xl font-light text-charcoal">{draft.title}</h2>
            <p className="mt-2 text-charcoal/90">{draft.body}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-stone">
            No iconic-moment draft written for this season yet.
          </p>
        )}
      </div>

      {season.sourceNotes && (
        <p className="mt-8 border-t border-stone/30 pt-4 text-xs text-stone">{season.sourceNotes}</p>
      )}

      <div className="mt-8">
        <GapBadge gaps={result.gaps} expanded />
      </div>
    </div>
  );
}
