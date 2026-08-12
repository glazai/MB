# Matched Betting Tracker — Scoping Document (v3)

Final scope after reviewing George Betting 2026.xlsx, Alex Betting 2026.xlsx, and a real OddsMonkey Profit Tracker export. This replaces v1 and v2.

## What this actually is

A single system replacing four separate spreadsheets (yours, Alex's, Noe's, Komnas's) that you currently keep in sync by hand. You do the betting work on all four accounts yourself — they've given you access, you place the bets, you log the results. "Person" in this system means whose account/identity the bet is under, not who did the work. The core job is: one clean data model instead of four files, one dashboard instead of manually copying month-end totals between them, and no more hardcoded spreadsheet formulas breaking every time a sheet grows a row.

## What's confirmed and settled

Multi-person from day one — George, Alex, Noe, Komnas, all sharing one schema, not bolted on later.

No calculators. OddsMonkey's Profit Tracker already does qualifying loss, free bet extraction, and dutching maths. Rebuilding that would be pure duplicated effort.

No commission, payout, or settlement tracking. You take 40% of Alex/Noe/Komnas's profit, they take 60%, it's real and consistent across all three, but you were clear it's irrelevant to this project. The system tracks bets and profit per account, not who owes who.

Manual entry is the mandatory core path, not the OddsMonkey import. Profit Tracker only ever sees your own bets (and only some of them, whatever gets placed through its calculator) — Alex, Noe, and Komnas have no automated source at all. Import is an optional convenience for your own account, not something the system depends on.

## The problems in the current setup, and how the new model fixes them

Every month sheet's total gets pulled into Reports via a hardcoded cell reference (`='January Betting'!L169`), which breaks the moment a sheet's row count changes — this exact bug exists in both your file and Alex's, so it's baked into the template, not a one-off mistake. The new system computes rollups from actual rows in a database, so there's no reference to maintain.

Alex/Noe/Komnas's monthly totals get hand-copied from their separate files into your Reports tab. The new system has one Bets table with a person field, so a total is just a filter, not a copy-paste.

Bookmaker names drift (BetMgM vs BetMGM, Mrq vs MrQ) and so does your own name across sheets (Jojo vs George). Same problem exists one level up with bet-type labels — Alex's file has a "Cash Back" category that never appears in yours. A canonical lookup table for bookmakers, and another for bet types, makes this structurally impossible instead of something to catch by eye.

Balance tracking is laid out differently between your file (snapshot amounts plus separate deposit/withdrawal blocks) and Alex's (a running ledger). Both feed the same underlying question — what's actually in each account — so the new system needs one transaction/balance model that both habits map onto, rather than copying either layout as-is.

## Data model

**People** — George, Alex, Noe, Komnas. Extensible if this ever grows.

**Bookmakers** — one canonical row per bookmaker (fixes the naming drift), flag for whether it's an exchange, commission rate where relevant.

**Accounts** — one per (person, bookmaker) pair. Status: active / restricted / gubbed / closed. Replaces the Sportsbooks checklist and the "definitely working / not working" list.

**Bet types** — a lookup table, not hardcoded: Qualifying Bet, Free Bet, Bet Boost, Risk Free, Cash Back, Acca Insurance, Casino Offer, Mug Bet, BOG, and anything else you add. Editable without a code change.

**Bets** — person, account, exchange (nullable — not every bet has one, e.g. mug bets and casino offers), event, date/time, bet type, bookmaker profit/loss, exchange profit/loss (nullable), status (settled / pending / void), source (manual or OddsMonkey import), import batch (nullable). Mug Bets and BOG entries live here too as bet-type variants rather than separate systems — flag if you'd rather keep those as distinct tables, this is a judgement call, not a hard requirement.

**Transactions** — deposits and withdrawals per account, plus an optional balance-snapshot entry type so you can true things up periodically the way you do today, rather than requiring the balance to be perfectly derivable from history alone.

**Import batches** — each OddsMonkey CSV you load: filename, timestamp, row count. Lets you re-import safely without duplicating rows, and gives a reconciliation check (sum of imported profit should match the file's own `overallRunningTotal`).

## OddsMonkey import — specifics from the real export

Column set: eventTime, date, bookmaker, details, profit, overallRunningTotal, monthlyRunningTotal, outcome, sport, event, betType, source, expectedProfit, actualProfit.

`profit` is the number to trust — net, already combines both legs. `expectedProfit`/`actualProfit` are only populated on ~5% of rows, ignore them. `source` (Odds / BOG / Racing) and `betType` (Normal / Free SNR) become the bet type on import, per your answer to use OddsMonkey's own categorisation rather than remapping it.

Two known data-quality issues in the export itself, not something to fix upstream: about 21% of rows have a raw numeric bookmaker ID instead of a name (import these as "Unknown Bookmaker #N", per your call to leave them unresolved for now), and about 8% of rows have malformed timestamps (seconds field goes above 59) — the importer needs to parse defensively rather than fail on these rows.

## Feature scope

**MVP:** manual entry form (person, account, bet type, event, date, bookmaker/exchange P&L, status) covering all four people. Dashboard with rollups by person, month, bookmaker, and bet type, computed live. Account status tracker per person per bookmaker.

**Phase 2:** OddsMonkey CSV importer for your own account, with a review screen before committing rows. Transaction/balance tracking with reconciliation.

**Not building unless you ask again later:** commission/payout tracking, calculators, live odds-matching, a public or paid multi-tenant version. All previously discussed, all deliberately out for now.

## Tech stack

Unchanged: Next.js (App Router) + TypeScript, Postgres via Supabase, Prisma, Tailwind + shadcn/ui, Recharts, hosted on Vercel/Supabase. Nothing about the last two rounds of findings changes this — if anything, dropping the calculators and the commission layer makes the build simpler than v1 assumed.

## Roadmap

Phase 1 — schema, manual entry form, dashboard. This alone replaces the job all four spreadsheets currently do and removes the hardcoded-formula fragility.

Phase 2 — account status tracker, OddsMonkey importer, transaction/balance reconciliation.

Phase 3 — only if you want to go beyond your own use: logins for Alex/Noe/Komnas to see their own numbers, or anything resembling a public/commercial version. Separate decision, not a default next step.

## Open items carried forward, not blocking

Whether Mug Bets and BOG stay as bet-type variants in one Bets table (as designed above) or need to be separate tables — worth revisiting once you're looking at the actual entry form, easier to judge with something in front of you than in the abstract. Whether you eventually want to stop retyping your own bets once the importer works — still undecided, manual entry works for you regardless so it's not urgent.
