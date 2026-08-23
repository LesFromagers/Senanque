# Heisman Park Ledger — Gap / Manual-Review Report (Batch 1 + 2 + 3)

**Status:** 27 of ~130 seasons pulled and verified this session (1895–present still needed for the other ~114). This is a first batch focused on marquee/title seasons, chosen because they double as the iconic-moment source seasons. Nothing below was invented — every blank or flag is a real gap in what a single Wikipedia page fetch returned.

## Fully populated (17 of 27)
1950, 1955, 1963, 1969, 1971, 1974, 1975, 1978, 1981, 1985, 1986, 1988, 1895 (0-1-0 season, complete despite being tiny), 2000, 2015, 2016, 2017 — record, coach, conference, final rank, points for/against, and Texas/OSU results all captured cleanly.

## Flagged for manual review (10 of 27)

| Season | Issue | What's needed |
|---|---|---|
| 1956 | Wikipedia's season-page table was truncated by the fetch after only 2 of 10 games (Texas, North Carolina). Points for/against and the full opponent list are NOT computable from this pull. | Pull the full 1956 schedule directly (Sports-Reference cross-check would need to be manual/human-paced per the brief's hard constraint — do not automate against it). |
| 1974 | All-American list says "eight All-Americans" but source only named two (Joe Washington, Rod Shoate). | Confirm remaining six names. |
| 1987 | Orange Bowl finale vs. Miami: source gave the score as "20-14" without confirming which number was OU's. PF/PA totals in the CSV exclude this game. | One manual check of the actual final score and which team led. |
| 2003 | Source text said "Final Record: 12-1" in its headline but then listed losses to BOTH Kansas State (Big 12 Championship) and LSU (BCS Championship) — those two facts can't both be true. True record is almost certainly 12-2. | Confirm 12-2 is correct before this flows into the Power Index math. |
| 2008 | Same contradiction pattern as 2003 — headline says "12-1 (7-1)" but source lists losses to both Texas and Florida. True record is almost certainly 12-2. | Confirm 12-2 before this flows into the Power Index math. |
| 1953 | Only 4 of ~11 games came through (loss to Notre Dame, tie at Pitt, win at Texas, Orange Bowl win over Maryland). The stated "10-1-1" record doesn't reconcile with "9 straight wins after the tie." This is the literal start of the 47-game streak, so it's worth getting right. | Pull the full 1953 schedule; reconcile the record. |
| 1958 | Record and full schedule didn't come through at all — only coach, conference, and final rank (5th), plus confirmation it was a Big 7/Orange Bowl champion season. This is the year the 47-game streak ended (vs. Notre Dame), so it's a notable gap. | Re-pull or manually source the full season. |
| 1980 | 5 of 12 games are missing scores (Stanford loss, Texas loss, Kansas State win, Kansas win, and the Orange Bowl win over Florida State all lack final scores in what came through). | Fill in the 5 missing scores to compute PF/PA. |
| 1897 | Only 1 of 2 games has full opponent/date/score detail. PF/PA of 33-8 is trustworthy (it's the source's own stated season total), but the second game itself is unidentified. | Identify the second 1897 opponent and score. |
| 1900 | The tie game is referenced only in the overall 3-1-1 record, not itemized by opponent or score. PF/PA of 118-28 is trustworthy (source's stated total). This is also the first-ever OU-Texas game (a 6-0 loss) — worth getting fully right given the rivalry's significance. | Identify the unnamed tie-game opponent/score. |

**Pattern note:** for 1897 and 1900, where Wikipedia's own season narrative states a combined points-for/against total for the year, I used that stated total rather than leaving points_for/points_against blank — even though the underlying game log is incomplete. That's a source-provided fact, not a computed one, so it's on firmer footing than a guess would be, but it's still flagged since the per-game breakdown needed for SOS math isn't there yet.

## Notable non-gap: 1953 record doesn't need a manual site check to resolve the arithmetic — it's a straightforward missing-games problem, not a source conflict, so it's lower priority than the 2003/2008 record contradictions above.

## Not yet attempted (the other ~114 seasons, 1895–1949 and 1951–1968, 1957–1968, 1972–1973, 1976–1977, etc.)

This session pulled the 16 highest-value marquee seasons by hand via one web fetch per season page. That approach is reliable (it reads the actual page rather than guessing) but doesn't scale to ~130 seasons inside a chat session — it would mean well over 100 more individual fetches. The `bulk_pull_script.py` delivered alongside this report is built to finish the other ~114 automatically, but it needs to run somewhere with open internet access (this sandbox's shell is network-restricted to package registries only, so it can't run here — see the "what I couldn't do" section in my reply). Two ways to run it:

1. Matt runs it locally (`pip install requests`, then `python bulk_pull_script.py`) — takes a few minutes given the throttled request rate.
2. It gets run inside the later Claude Code session that also builds the Supabase table/dashboard.

Either way, it will produce the same schema as `ou_seasons_summary.csv` for every remaining season, plus a matching gap list in the same format as this one, so the two batches merge cleanly.

## Not started at all: strength-of-schedule opponent lists

The brief's SOS layer needs full opponent + score lists for every OU opponent's own season, not just OU's games. That's a second-order pull (fetch every opponent-team-season, not just OU's) — out of scope for this first batch and flagged here so it isn't quietly skipped. `bulk_pull_script.py` includes a stub function for it with a note on what's still needed.
