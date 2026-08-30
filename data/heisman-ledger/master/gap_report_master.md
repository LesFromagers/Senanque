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

## Game-level data now exists for 27 of the 27 verified seasons
A prior version of this report claimed no per-game opponent/score list existed for any of the 27 verified seasons — true before a Wikipedia re-pull (--include-verified) was run against them, not true anymore. This only gives OU's own schedule and scores, though, not each opponent's own season game log — the SRS/strength-of-schedule layer of the Power Index still can't compute an opponent-adjusted margin without that second-order pull (see `gap_report_verified_batch.md`'s "Not started at all" section and power-index.ts's header comment). The Power Index module falls back to the unadjusted point-differential z-score alone for every season, verified or not, until that's built, and flags it rather than guessing an SOS adjustment.