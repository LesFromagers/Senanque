# Senanque — Design Brief

Companion to CLAUDE.md, not a replacement. CLAUDE.md is the engineering brief Claude Code reads each session; this is the creative brief for iterating on the actual visual design. Once choices here are locked, fold the final version back into CLAUDE.md's Brand section so Code builds to spec.

## The story
- Abbey of Sénanque, Provence — Cistercian, founded 1148 — a place visited in person. The name and founding year are literal, not invented.
- Personal handle "Le Fromager" / "Les Fromagers" grew out of that visit, carried into a fantasy soccer crest (ASFC — motto "Jeunesse, Courage, Affinage," founding year 1148, lavender shield, gold/tan buildings and trim, cream ground, grey outlines).
- Theological anchor: a real interest in monastic theology, particularly Maximus the Confessor — especially the idea that every created thing carries its own *logos*, an indwelling reason echoing the Logos that made it. Contemplation, in that tradition, is learning to see the pattern hidden in the noise, which is a fair description of what a data analyst does all day.
- *Affinage* — the aging and refining of cheese, already sitting on the crest's own motto — is the closest single word to what this whole project is trying to say about patient, careful craft.

## Brand identity
- Name: Senanque
- Tagline: Senanque Intelligence — Analytics & Agentics for the Contemplative
- Domain: senanque.dev
- Structure: one shared site, two wings — Analytics (live now) and Agentics (deliberately later, its own learning sprint, not rushed to match the launch timeline)
- Audience: primarily hiring managers and recruiters for BI/Data Analyst roles in Oklahoma City; secondarily a professional network, more through referral than cold search
- Voice: honest, craftsmanlike, understated. Gaps get named directly, never hidden or over-apologized for. Personality lives in the name and the color/type system, not in heavy imagery stacked on every page — should stay legible to an eight-second recruiter skim.

## Color palette

| Name | Hex | Role |
|------|-----|------|
| Oat | #F2ECDD | Page background |
| Charcoal | #3A3833 | Primary text |
| Lavender | #C4BCCA | Light tint accent — chart-series lead-in, icon/badge fills, softer surfaces than Plum |
| Plum | #6B5A7E | Primary accent — headers, links, buttons |
| Gold | #B98A2E | Secondary accent — CTAs, dividers, hover states |
| Sage | #95A08C | Tertiary accent — tags, chart series |
| Stone | #A39F91 | Borders, muted text |

Locked chart-series order, in this priority: **Lavender → Plum → Sage → Gold** (`lib/chart-colors.ts`). Never reorder or skip a step per project — a new chart just draws from the front of the same sequence.

Note: Sage and Stone sit close in lightness. Fine for general UI use, but pair with a second visual cue (line style, marker shape) if they ever land as adjacent series on a dense chart.

Deliberately not the cream-plus-terracotta palette that's become an AI-generated-design default — oat paired with lavender, gold, and sage instead, grounded in an actual place rather than a template.

### Sub-project palette extensions

A spoke may add exactly **one** additional accent color scoped to itself, never a full second palette. The pattern, established by the Heisman Park Ledger's **Garnet** (`#6E2E34`):

- Value-matched into the existing row (sits at the same muted register as Plum and Sage, not a shouting brand color pulled in whole — Garnet is desaturated/darkened crimson chosen explicitly over official OU crimson `#841617`, which vibrated against Lavender and read as a logo dropped onto the page).
- Scoped to a short, named list of uses and nothing else (Garnet: the project's own wordmark, the rank-1 seal, the rank-1 index figure, beat-marks, the "Iconic moment" label).
- Never enters the shared chart-series order above — it's an accent, not a series color.
- Documented with its rejection rationale (what was considered and why it lost) in that spoke's own design note, the same way this section documents Garnet.

## Typography
- Display / headings: **Literata** (serif, genuine old-style character; shipped at a light weight — restraint over the full display weight on most headings)
- Body / UI / data labels: Inter (clean, quiet sans)
- Data / tabular figures: system monospace stack (`ui-monospace`, `SFMono-Regular`, `Menlo`, `Consolas`, …), tabular numerals, for numbers only — index scores, records, dates in dense tables. Never for running text or labels; Literata and Inter still carry everything else.

## Open questions — bring these into the design thread
- Full homepage layout: hero, wing navigation, project card grid
- A single project-page template that works for both wings without a redesign per project
- How much of the crest/monastic imagery shows up visually versus staying in name and voice only — current lean is restraint: let color and type carry it, not literal iconography on the page
- ~~The signature visual element~~ — partially answered per-project rather than sitewide: the Heisman Park Ledger's hero mark (below) is the first instance. Whether the hub itself still wants one distinct sitewide moment, separate from each spoke's own, is still open.
- ~~Icon and imagery style~~ — answered, at least as a reusable template: restrained architectural line art, 1.25px stroke, square caps, exactly one Lavender fill, no marks or lettering baked into the icon itself. First instance is the Ledger's south-facade elevation of the stadium. Reach for this spec before inventing a new icon style per project.
- Dark mode — deferred for launch, single light theme for v1

## Roadmap context (for page-count planning)
1. **Macro-Econ Trends** (Analytics wing) — first to ship, FRED API
2. **The Heisman Park Ledger** (Analytics wing, OU football rankings) — second, collegefootballdata.com + Wikipedia; tagline "Coronation at the Palace on the Prairie," per-project Garnet accent (see Color palette above)
3. **Coffee Consumption** — needs a full rebuild with real data before it's shown publicly; the earlier version used fabricated data
4. **Chess app** — secondary "can build things" demo, not a headline project
5. **Agentics wing** (theology comparator, film/music theme analyzers) — later, its own dedicated sprint
