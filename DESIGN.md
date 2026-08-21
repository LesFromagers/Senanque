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
| Plum | #6B5A7E | Primary accent — headers, links, buttons |
| Gold | #B98A2E | Secondary accent — CTAs, dividers, hover states |
| Sage | #8A9A7B | Tertiary accent — tags, chart series |
| Stone | #A39F91 | Borders, muted text |

Note: Sage and Stone sit close in lightness. Fine for general UI use, but pair with a second visual cue (line style, marker shape) if they ever land as adjacent series on a dense chart.

Deliberately not the cream-plus-terracotta palette that's become an AI-generated-design default — oat paired with lavender, gold, and sage instead, grounded in an actual place rather than a template.

## Typography
- Display / headings: Fraunces (serif, genuine old-style character, used with restraint — not every heading needs the full display weight)
- Body / UI / data labels: Inter (clean, quiet sans)

## Open questions — bring these into the design thread
- Full homepage layout: hero, wing navigation, project card grid
- A single project-page template that works for both wings without a redesign per project
- How much of the crest/monastic imagery shows up visually versus staying in name and voice only — current lean is restraint: let color and type carry it, not literal iconography on the page
- The signature visual element — one deliberate, memorable design moment rather than scattered decoration throughout
- Icon and imagery style
- Dark mode — deferred for launch, single light theme for v1

## Roadmap context (for page-count planning)
1. **Macro-Econ Trends** (Analytics wing) — first to ship, FRED API
2. **OU Football Rankings History** (Analytics wing) — second, collegefootballdata.com API
3. **Coffee Consumption** — needs a full rebuild with real data before it's shown publicly; the earlier version used fabricated data
4. **Chess app** — secondary "can build things" demo, not a headline project
5. **Agentics wing** (theology comparator, film/music theme analyzers) — later, its own dedicated sprint
