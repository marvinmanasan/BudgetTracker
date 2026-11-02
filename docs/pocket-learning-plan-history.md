# Pocket: beginner portfolio learning plan

Finalized for Day 2 on 2026-11-02. This is the current learning plan. The canonical roadmap points here. Older schedules are historical only. The existing Figma screens and preview now reflect the agreed accounting rules and deferred settings. See the final design baseline in `figma-handoff.md` for current state-board IDs and verification evidence. Finalized means the learning sequence and design baseline are ready; app implementation and device verification remain learner work.

## Agreement and decisions

- Day 1 is DONE. Day 2 is started, not completed. Preserve working Day 1 components.
- The learner writes ALL application code, configuration changes and tests. The assistant teaches, gives exact edit locations, reviews and offers hints. This replaces the earlier supporting-code agreement.
- First give a hint in words. If needed, give a more specific hint. Explain mistakes in pasted code without rewriting it. Only an explicit example request permits a few lines with unrelated names.
- `n` means next; `c` means check the current exercise. Review in meaningful batches, or when asked.
- Each session is 90 minutes: two 30-minute tasks, then 30 minutes for testing, understanding and saving progress. Repeat unfinished tasks before their dependants. Time allocations are practice time, not completion promises.
- Seven days is a milestone, not a guarantee of the full design. Continue required features in later sessions. Android APK comes first; website and iOS verification wait.
- Keep Expo SDK 58, React Native, TypeScript and Expo Router. No app code, dependencies or configuration changed in this planning pass.
- Manual records only. No bank connection or movement of money. Income is separate from the manually chosen spending limit.
- Monthly remaining = monthly limit minus that month's expenses. Derive totals from records, rather than saving an independent balance.
- Category limits together equal the monthly limit. Named limits consume part; Everything else is the calculated remainder and is not directly editable. Uncapped categories count there.
- Reject named allocations above the monthly limit. Reject lowering that limit below named allocations, explaining that allocations must be adjusted first. Actual overspending remains recordable with a warning. Zero unallocated remainder is valid.
- Savings records update the goal only. They do not change expenses, income or monthly remaining. Use Record savings wording. This follows the user's delegation of the accounting choice.
- Copy the latest earlier month's limits once when opening a new month with no settings. Preserve existing month settings/history. Do not copy records or unused funds. No earlier budget means show setup.
- Store money in integer centavos. Reject empty, non-numeric, non-finite, zero, negative and more-than-two-decimal transaction amounts. Use the transaction's local calendar date to assign its month.
- Export and biometric lock are deferred by user decision. Omit their interactive rows from this release. Do not add cloud accounts.
- Preserve the removed practice-budget UI disclaimer. Put limitations in documentation.

## Design and file map

See `figma-handoff.md` for the current screen IDs and updated screen specification. Keep the existing visual style and Manrope, with existing Inter component/icon text. No new palette or font set is proposed. Extract exact current Figma tokens before styling; old code colors are not proof of current Figma values.

Introduce these files only when their task needs them:

| Location | Purpose |
| --- | --- |
| `src/components/summary-card.tsx`, `src/app/index.tsx` | Reusable monthly summary and Overview |
| `src/constants/pocket.ts`, `src/hooks/use-theme.ts` | One Pocket token source and theme selection, replacing duplicate starter usage deliberately |
| `src/types/transaction.ts` | ID, expense/income type, centavos, category, local date, payment method and note |
| `src/lib/money.ts`, `src/lib/budget.ts` | Amount validation, formatting and derived monthly/category totals |
| `src/storage/` | Local database and schema version, with no screen layout |
| `src/providers/pocket-data.tsx` | Shared records/loading/errors used by all screens |
| `src/app/transaction.tsx`, `src/components/transaction-form.tsx` | Routed entry/edit and reusable form |
| `src/app/_layout.tsx`, `src/components/pocket-tabs.tsx` | Shared setup and three-tab navigation; forms belong outside that tab navigator |
| `src/app/activity.tsx`, `src/app/budgets.tsx` | Lists and budgets connected to shared data |

Proposed storage: local SQLite, checked against SDK 58 documentation before the learner installs it. Use parameterized queries, meaning user-entered text is supplied as values rather than assembled into SQL commands. No backend is required for this local app.

## Day 1: DONE

Practice Overview, spend/reset, overspending warning, reusable button/screen, three tabs and APK profile. See `day-1.md`. Real records, persistence and APK installation remain pending.

## Day 2: SummaryCard and APK proof

### A. Reusable summary card: 30 minutes

- Build: label/amount card in `src/components/summary-card.tsx`, used twice in Overview.
- Learn/search: React props TypeScript; React Native Text View StyleSheet.
- Steps: read PocketButton props; identify the two card inputs; write your card; use two instances; compare typography/spacing with Figma.
- Test: different inputs produce different values; long labels/large amounts remain readable. Keep existing spend/reset working until saved entries replace it.

### B. Early preview APK: 30 minutes

- Build: baseline APK using existing `eas.json`, edited by the learner if setup requires it.
- Learn/search: EAS first Android build; Android application identifier; preview APK.
- Steps: check Expo sign-in/phone availability; follow EAS setup; choose identifier; request preview build; record source revision/build status.
- Test: install and launch with Metro stopped if ready. Queue/setup errors remain pending, with the exact blocker recorded. Installation is the next check when the build finishes.

Understanding: Why can two cards share a layout but display different information?

## Day 3: records and storage

### A. Money/record foundation: 30 minutes

- Build: record description and amount rules in `src/types/transaction.ts` and `src/lib/money.ts`.
- Learn/search: TypeScript object types; integer minor units currency; decimal input validation.
- Steps: list record fields; distinguish expense/income; define accepted input; convert valid values to centavos; write focused checks yourself.
- Test: 180.50 becomes 18050 centavos; blank, 0, -1, letters and 1.234 fail. Formatting restores the correct peso value.

### B. Save/read a record: 30 minutes

- Build: database opening and record save/read in `src/storage/`.
- Learn/search: Expo SDK 58 SQLite; primary key; schema version migration; parameterized SQL.
- Steps: read versioned docs; install compatible storage yourself; define initial schema/version; save/read a fictional record; represent loading and failures.
- Test: same ID/values return after reopening. Simulated read failure offers retry instead of pretending storage is empty. Rebuild APK when required by native changes.

Understanding: Why save transactions instead of saving only the remaining balance?

## Day 4: complete saved expense flow

### A. Expense form: 30 minutes

- Build: entry route and form in `src/app/transaction.tsx` and `src/components/transaction-form.tsx`.
- Learn/search: controlled inputs React Native; keyboard-safe forms; Expo Router stack and tabs.
- Steps: keep form outside three-tab navigation; add amount/category/date/payment/note; connect validator; show inline errors; wire Cancel/Back without saving.
- Test: invalid amounts cannot save; keyboard does not hide fields/actions; Cancel creates no record.

### B. Save and refresh Overview: 30 minutes

- Build: shared saved records in `src/providers/pocket-data.tsx`, connected to Overview and form.
- Learn/search: React Context shared state; async pending/error states; derived values.
- Steps: read records through shared layer; save valid form; block duplicate pending saves; refresh after success; derive totals and replace practice spend/reset controls.
- Test: repeated taps create one record; failure preserves typed fields; successful expense survives restart and changes totals once. Overspending remains allowed with a warning.

Understanding: Why should Overview and the form share one set of saved records?

## Day 5: Activity and income

### A. Real Activity list: 30 minutes

- Build: rows in `src/app/activity.tsx` from shared records.
- Learn/search: React Native FlatList; stable keys; local-date sorting.
- Steps: select month; sort/group by transaction date; display sign/category/payment; add empty state and entry action; use a virtualized list rather than nesting a growing list in PocketScreen's ScrollView.
- Test: dates sort correctly, signs match record type, empty months have no sample records.

### B. Income mode: 30 minutes

- Build: income mode of the existing form using its Figma reference.
- Learn/search: reusable forms conditional fields; array filtering and totals.
- Steps: change labels/category choices for income; hide expense preview; save income type; display in Activity; derive separate Overview income.
- Test: income survives restart and changes income totals, while monthly limit/expenses stay unchanged.

Understanding: Why does recording income leave the manual spending limit unchanged?

## Day 6: budgets and month history

### A. Monthly budget setup/edit: 30 minutes

- Build: per-month settings in storage, used by `src/app/budgets.tsx` and Overview.
- Learn/search: unique month database key; historical snapshots; local calendar dates.
- Steps: save settings per month; show setup if needed; copy latest prior limits once; edit only selected month; connect totals.
- Test: December copies November limits once; editing December preserves November. No transactions or unused funds copy.

### B. Category allocations: 30 minutes

- Build: named limits and calculated remainder in `src/lib/budget.ts` and Budgets.
- Learn/search: derived remainder; related-field validation; category aggregation.
- Steps: sum named limits; derive Everything else; reject over-allocation; group uncapped categories there; show text warnings and cap visual progress at 100%.
- Test: ₱15,000 minus ₱5,000 Food and ₱1,500 Transport leaves ₱8,500. Reject ₱16,000 of limits. Preserve actual overspending records. Reject reducing total below named allocations.

Understanding: Why is Everything else calculated rather than directly edited?

## Day 7: tested milestone and portfolio evidence

### A. Installed APK quality check: 30 minutes

- Build: defect list and learner-written money/storage checks; fix the highest-impact issue if time allows.
- Learn/search: boundary-value tests; Android font scaling; regression testing.
- Steps: build/install latest source; test expense/income/budgets/restart; disable networking and stop Metro; check keyboard/Back/small screen/large text; record failures and source/build/device evidence.
- Test: fractional money and month-boundary cases are correct; saved data survives offline restart. Unchecked scenarios remain pending.

### B. Milestone portfolio handoff: 30 minutes

- Build: factual README, screenshots and walkthrough with fictional data.
- Learn/search: portfolio case study; APK installation instructions.
- Steps: explain problem/stack; list implemented features; capture installed app; record expense/Activity/restart; link tested APK/revision and limitations.
- Test: another person can follow instructions; media matches delivered revision. Call it work in progress if core flows fail.

Understanding: What evidence distinguishes a working offline APK from a development preview?

## Final 30 minutes every day

1. Spend 15 minutes testing the task and its failure case.
2. Run `npx expo lint` and `npx tsc --noEmit`. Fix critical failures or record blockers. Failed work is not done.
3. Answer the day's understanding question in your own words.
4. Save checkpoint: completed work, revision, checks/results, APK/device evidence when available, defects and next action. Commit when Git access permits.

If this needs more time, continue next session. Setup, troubleshooting and build waits count toward the timebox.

## Required continuation after Day 7

Keep these designed features in scope. Each row is another repeatable 90-minute session with two 30-minute tasks and the same 30-minute checkpoint. Repeat/split as needed.

| Session | A: build and steps; learn/search | B: build and steps; learn/search | Test; understanding |
| --- | --- | --- | --- |
| Edit/delete/Undo | Open by ID, prefill, validate, save edits. Learn stable record IDs. | Delete selected record, retain full data, restore once through Undo. Learn reversible actions. | Edit across months updates both totals; Undo restores once without duplicate IDs. Why preserve the ID? |
| Search/filter | Match text, show no matches, keep month summary clearly labeled. Learn derived lists. | Add month/type/category filters, selected indicator and Clear. Learn combining predicates. | Combined filters clear correctly and never change stored records. Why should search not change the monthly total? |
| Savings | Build goal editor and contribution records from references. Learn related IDs. | Record savings, derive progress, show invalid/completed states. Learn aggregate totals. | Restart retains goal/entries; reaching/exceeding target leaves expense/income unchanged. Why avoid automatically making an expense? |
| Themes | Extract exact Figma tokens, consolidate duplicate theme sources. Learn semantic color tokens and font loading. | Connect System/Light/Dark, persist choice, coordinate navigation/status bar. Learn appearance preferences. | Readable cards/buttons in both themes, preference survives restart. Why use different text colors on different surfaces? |
| First use/settings | Connect budget setup and existing profile/name flow. Learn conditional navigation. | Wire appearance/local data information, omit export/biometrics. Learn accurate privacy wording. | Fresh install enters setup; existing data stays; every visible action works. Why does an avatar not imply a cloud account? |
| Design/Android QA | Compare all screens/states at Figma's 390 x 844 size, log mismatches. Learn visual comparison. | Fix important issues, test larger text/scrolling/keyboard/Back. Learn accessible touch targets. | No clipped text, hidden save actions or color-only errors. Why test beyond the mockup size? |
| Final delivery | Build/fresh-install final APK; test offline, restart and every flow. Learn reproducible release checks. | Update screenshots/video/README/revision/limitations. Learn release evidence. | Delivered artifact matches docs and passes money/storage checks. When should a release be withheld? |

Do not claim full design completion until these required flows are implemented and checked. No new features are added by this schedule.

## Applied and deferred

All review feedback is applied as decisions, updated Figma references, design requirements or scheduled learner work. Application implementation is deliberately reserved for the learner. Export and biometrics are deferred by the user and removed from release-screen references and preview copies; website and iOS verification remain later scope. Full app fidelity, accessibility and APK success require actual checks, not this document.

References: [design handoff](figma-handoff.md), [Day 1](day-1.md), [Day 2](day-2.md), [SDK 58](https://docs.expo.dev/versions/v58.0.0/), [Expo index](https://docs.expo.dev/llms.txt), [SQLite](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/), [APK guide](https://docs.expo.dev/build-reference/apk/).
