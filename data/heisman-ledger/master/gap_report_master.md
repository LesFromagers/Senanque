# Heisman Park Ledger — Master Gap Report

Merge of the 27 hand-verified seasons + the Wikipedia bulk pull + the CFBD efficiency pull. Verified rows always win a conflict; this report only lists what's still missing after that merge.

- **1953**: missing final_record, points_for, points_against
- **1956**: missing points_for, points_against
- **1958**: missing final_record, points_for, points_against
- **1980**: missing points_for, points_against
- **2008**: expected CFBD efficiency data (Tier 1) but none was returned — check the pull, don't assume Tier 3.
- **2015**: expected CFBD efficiency data (Tier 1) but none was returned — check the pull, don't assume Tier 3.
- **2016**: expected CFBD efficiency data (Tier 1) but none was returned — check the pull, don't assume Tier 3.
- **2017**: expected CFBD efficiency data (Tier 1) but none was returned — check the pull, don't assume Tier 3.
- **2018**: expected CFBD efficiency data (Tier 1) but none was returned — check the pull, don't assume Tier 3.

## Known structural gap: no game-level data for the 27 verified seasons
The hand-verified batch is season-level only (no per-game opponent/score list was captured for those 27 seasons). The SRS/strength-of-schedule layer of the Power Index can't compute an opponent-adjusted margin for these seasons until that game log is added — same gap flagged in `gap_report_verified_batch.md`'s "Not started at all" section. The Power Index module falls back to the unadjusted point-differential z-score alone for any season with no game log, and flags it, rather than guessing an SOS adjustment.