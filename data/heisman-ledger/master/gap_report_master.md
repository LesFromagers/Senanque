# Heisman Park Ledger — Master Gap Report

Merge of the 27 hand-verified seasons + the Wikipedia bulk pull + the CFBD efficiency pull. Verified rows always win a conflict; this report only lists what's still missing after that merge.

- **1938**: missing conference

## Verified-season fields filled from the Wikipedia re-pull
Only fields the verified CSV left genuinely blank were filled below — every field the verified batch already had a value for was left untouched, no exceptions.
- **1895**: conference_champion
- **1897**: conference_champion
- **1900**: conference_champion
- **1950**: conference_champion, bowl_name, bowl_result
- **1953**: final_record, final_ap_rank, conference_champion, bowl_name, points_for, points_against
- **1955**: conference_champion, bowl_name
- **1956**: conference_champion, points_for, points_against, beat_osu
- **1958**: final_record, conference_champion, bowl_name, points_for, points_against, beat_texas, beat_osu
- **1963**: conference_champion
- **1971**: conference_champion, bowl_name, bowl_result
- **1974**: conference_champion
- **1975**: conference_champion, bowl_name, bowl_result
- **1978**: national_title_claim, conference_champion, bowl_name, bowl_result
- **1980**: conference_champion, bowl_name, bowl_result, points_for, points_against
- **1981**: conference_champion, bowl_name, bowl_result
- **1985**: conference_champion, bowl_name, bowl_result
- **1986**: conference_champion, bowl_name, bowl_result
- **1987**: conference_champion, bowl_name, bowl_result
- **1988**: conference_champion, bowl_name, bowl_result
- **2000**: conference_champion, bowl_name, bowl_result
- **2003**: national_title_claim, conference_champion, bowl_name, bowl_result
- **2008**: conference_champion, bowl_name, bowl_result
- **2015**: conference_champion, bowl_name, bowl_result
- **2016**: bowl_name, bowl_result
- **2017**: conference_champion, bowl_name
- **2018**: conference_champion, bowl_name, bowl_result

## Game-level data exists for 27 of the 27 verified seasons
The hand-verified batch was originally season-level only; a Wikipedia re-pull (--include-verified) fills in each verified season's own schedule/scores alongside it, used for schedule display and the beat_texas/beat_osu flags.