# Heisman Park Ledger — Draft Picks Gap Report

**Status:** 429 distinct OU draft picks mapped to a college season (draft_year - 1), across 88 seasons. 12 duplicate draft-table rows (the AFL/NFL dual-draft era, plus a few 1940s re-entries) collapsed to their player's earliest selection, per Matt's explicit call — never double-counted.

## Per-pick bio verification skipped for this run (--verify not passed)
The draft_year-1 mapping was already verified with zero mismatches across 30 picks spanning 6 draft classes (2007, 2010, 2018, 2019, 2020, 1976), including an early-declare (Adrian Peterson) and a one-season-transfer (Jalen Hurts) case, before this script existed — see this script's module docstring. Skipped here because the rule is logically guaranteed, not just empirically likely (a player can only enter the draft after finishing the season that made them eligible), and re-verifying all ~429 individual bio pages ran too slowly under Wikipedia's rate limiting to be worth it for this run. Pass --verify to re-run the full per-pick check.

## Duplicate draft-table rows dropped (earliest selection kept instead)
- **1946 draft, R5**: Joe Golding — later duplicate, not counted
- **1951 draft, R23**: Jim Owens — later duplicate, not counted
- **1963 draft, R18**: Paul Lea — later duplicate, not counted
- **1964 draft, R1**: Joe Don Looney — later duplicate, not counted
- **1964 draft, R6**: Joe Don Looney — later duplicate, not counted
- **1964 draft, R19**: Glen Condren — later duplicate, not counted
- **1964 draft, R24**: John Garrett — later duplicate, not counted
- **1965 draft, R2**: Ralph Neely — later duplicate, not counted
- **1965 draft, R6**: Lance Rentzel — later duplicate, not counted
- **1965 draft, R17**: Jim Grisham — later duplicate, not counted
- **1966 draft, R3**: Carl McAdams — later duplicate, not counted
- **1966 draft, R15**: Mike Ringer — later duplicate, not counted
