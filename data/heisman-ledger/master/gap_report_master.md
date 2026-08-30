# Heisman Park Ledger — Master Gap Report

Merge of the 27 hand-verified seasons + the Wikipedia bulk pull + the CFBD efficiency pull. Verified rows always win a conflict; this report only lists what's still missing after that merge.

- **1938**: missing conference

## Verified-season fields filled from the Wikipedia re-pull
Only fields the verified CSV left genuinely blank were filled below — every field the verified batch already had a value for was left untouched, no exceptions.
- **1953**: final_record, final_ap_rank, points_for, points_against
- **1956**: points_for, points_against, beat_osu
- **1958**: final_record, points_for, points_against, beat_texas, beat_osu
- **1978**: national_title_claim
- **1980**: points_for, points_against
- **2003**: national_title_claim

## Game-level data exists for 27 of the 27 verified seasons
The hand-verified batch was originally season-level only; a Wikipedia re-pull (--include-verified) fills in each verified season's own schedule/scores alongside it, used for schedule display and the beat_texas/beat_osu flags.