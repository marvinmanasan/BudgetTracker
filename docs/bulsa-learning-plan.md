Bulsa: current seven-day learning plan
Updated 2026-11-02

Goal and boundaries
- Build a personal, manually entered budget tracker for portfolio practice.
- Keep Expo SDK 58, React Native, TypeScript, Expo Router and the existing npm workflow. Proposed local storage remains Expo SQLite, to be verified/installed by the learner when needed.
- Intended for iOS and Android using shared patterns. The required delivery is a working Android APK. State iOS support as intended until actually tested. Website work waits.
- Keep warm light as the main Bulsa design and dark as the alternative. Both themes retain the same features. See bulsa-design-review.md and figma-handoff.md for exact palette, fonts and screen IDs.
- The learner writes all app code, configuration and tests. The assistant explains, gives exact edit locations, reviews and supplies hints in words first. No full files/functions; tiny unrelated examples only when explicitly requested.
- Day 1 stays DONE. Preserve its working state/props/overspending foundation. SummaryCard is now present and connected in Overview; review and restyle it rather than recreate it.
- Each day is 90 minutes: two 30-minute learning/build tasks and 30 minutes for checks and checkpoint. Tasks can take extra sessions. Seven days is a core milestone, not a claim that the full designed scope fits nine remaining hours.
- No new features. Retained features that do not fit continue after Day 7. Export/biometric lock remain deferred by prior user decision. No bank sync, cloud login, money movement, charts beyond the design or store publication.
- n means next; c means check. Review at batch checkpoints or on request. Preserve the removal of the practice-budget UI disclaimer.

Rules used throughout
- Monthly remaining equals that month's manual limit minus expenses. Income stays separate.
- Named category limits plus automatic Everything else equal the monthly limit. Reject allocations above it and lowering it below named allocations. Actual overspending is allowed with a clear warning.
- Savings entries update the goal only. They do not automatically create expense/income or change monthly remaining.
- A new month copies the latest earlier month's limits once when settings are absent. History stays unchanged. Spending, income and unused money do not carry over.
- Store money in integer centavos. Reject blank, zero, negative, non-numeric, non-finite and more-than-two-decimal transaction amounts. Use local transaction dates for month grouping.
- Saved records are shared across screens; totals are calculated from them. Loading/read failure is different from an empty account. Save failure keeps typed inputs. Pending saves block duplicates.
- Use parameterized database statements so user text is treated as data, not SQL commands. Version the local schema. Do not claim encryption, sync or recovery after uninstall.

Day 1: DONE
Completed the practice Overview, spend/reset, overspending message, shared button/screen, three-tab foundation and preview APK profile. This remains valid learning work despite the old brand/colors. Real persistence and APK installation are separate checks.

Day 2: rebrand the existing foundation and prove APK setup

Task A: Bulsa branding, palette and SummaryCard review, 30 minutes
Build: update the existing UI toward the current Bulsa reference while preserving behavior.
Locations: src/app/index.tsx; src/constants/pocket.ts; src/components/summary-card.tsx; src/app/_layout.tsx; app.json. Existing filenames remain valid until the learner performs a deliberate rename batch.
Search first: React Native shared color constants; Expo SDK 58 font loading; Expo app display name versus application identifier.
Steps:
1. Read the existing SummaryCard props and explain how the two instances receive values.
2. Change the visible wordmark/welcome name in Overview to Bulsa and expo.name in app.json to Bulsa.
3. Preserve the Android package com.marvinmanasan.bulsa and EAS project identity. Do not blindly change slug/scheme/project ID.
4. Start mapping shared colors to the exact Bulsa light palette. Check button label colors and the monthly card separately. Keep logic unchanged.
5. Compare SummaryCard and Overview with Bulsa 1:1040. Record unfinished Manrope loading/theme work for the appearance continuation session instead of rushing it.
Test: spend/reset and the warning still work; both summaries update correctly; no Pocket text is visible on Overview; income/expense labels and signs remain clear; small/large values remain readable. A rebuilt APK, not Expo Go alone, verifies the launcher name.

Task B: early Android build, 30 minutes
Build: an installable preview from the existing EAS configuration.
Locations: app.json and eas.json; docs/day-2.md for evidence.
Search first: EAS preview APK; EAS project linking; Android install APK.
Steps:
1. Check current Expo sign-in. Inspect existing package/project settings before configuring anything again.
2. Follow the current APK guide and request a preview build using the existing preview profile.
3. Record source revision, build ID and status.
4. Install when ready and launch with Metro stopped. If blocked, record the exact error and resume it first next session.
Test: installed app shows Bulsa and opens without Expo Go/Metro. A queued build remains pending.
Understanding: Why can an app's visible name change while its technical application identifier stays the same?

Day 3: money records and persistence

Task A: record and amount rules, 30 minutes
Build: descriptions of expense/income records and reusable money validation.
Locations: src/types/transaction.ts; src/lib/money.ts, created by the learner when needed.
Search first: TypeScript object types; integer centavos currency; decimal input validation.
Steps:
1. List ID, type, centavos, category, local date, payment method and note.
2. Define acceptable amount input and conversion to centavos.
3. Write focused checks before connecting a form.
4. Keep formatting separate from stored values.
Test: 180.50 becomes 18050; blank, 0, -1, letters and 1.234 fail; formatted values return the correct peso amount.

Task B: local save/read, 30 minutes
Build: a storage layer separate from screen layout.
Location: src/storage/.
Search first: Expo SDK 58 SQLite; primary key; schema version migration; parameterized SQL.
Steps:
1. Read matching docs and install the compatible module yourself.
2. Define the initial schema and version.
3. Save/read one fictional record.
4. Represent loading and read errors without replacing existing data with an empty array silently.
Test: identical ID/values survive closing/reopening; read failure offers retry; rebuild the APK if native dependency changes require it.
Understanding: Why is a transaction history more useful than storing only a remaining balance?

Day 4: one complete saved expense

Task A: expense form, 30 minutes
Build: the existing designed expense fields and validation.
Locations: src/app/transaction.tsx; src/components/transaction-form.tsx. Place the form outside the three-tab navigator.
Search first: controlled inputs React Native; keyboard-safe form; Expo Router stack and tabs.
Steps:
1. Add amount/category/date/payment/note fields using the Bulsa reference.
2. Make selectors and optional note editing clear.
3. Connect amount validation and inline messages.
4. Wire Cancel/Back without saving.
Test: invalid input cannot save; actions remain reachable with keyboard open; cancelled edits add nothing. Use native platform-appropriate date pickers rather than drawing a fake calendar.

Task B: save and shared Overview totals, 30 minutes
Build: one shared source of saved records.
Locations: src/providers/bulsa-data.tsx (new, to be written by the learner when needed), Overview, form and storage.
Search first: React Context shared state; async pending/error states; derived totals.
Steps:
1. Load records through the shared layer.
2. Save a valid expense once and refresh shared records.
3. Keep inputs on failure; prevent repeated pending saves.
4. Derive Overview totals and replace practice spend/reset when the real flow works.
Test: repeated taps create one record; failure retains fields; reopening retains successful entries; overspending is saved with a warning.
Understanding: Why should Overview and the form share the same saved records?

Day 5: Activity and income

Task A: real Activity, 30 minutes
Build: a dated list of stored records and a true empty state.
Location: src/app/activity.tsx.
Search first: React Native FlatList; stable keys; local date sorting.
Steps:
1. Read shared records and select the displayed month.
2. Sort/group by local transaction date.
3. Display clear labels/signs with green income and clay-red expenses.
4. Show Add transaction for an empty month.
5. Use a virtualized list instead of nesting an expanding list inside the shared ScrollView.
Test: ordering/month grouping/signs are correct; empty months contain no invented sample rows; meaning remains clear without color.

Task B: income mode, 30 minutes
Build: income entry using the same form structure.
Location: transaction form, shared records and Overview.
Search first: reusable forms conditional fields; array filtering and totals.
Steps:
1. Change the selected mode, labels and category choices.
2. Hide the expense-budget preview for income.
3. Save the income type and show it in Activity.
4. Derive monthly income separately.
Test: income persists and changes income totals, while expense totals and the manually set spending limit stay unchanged.
Understanding: Why does adding income not automatically raise the spending limit?

Day 6: budgets and monthly history

Task A: monthly setup/edit, 30 minutes
Build: month-specific budget records and first budget setup.
Locations: src/app/budgets.tsx; storage; shared budget calculations.
Search first: unique month key; historical snapshots; local calendar dates.
Steps:
1. Store the selected month's limit.
2. Show setup with no prior budget.
3. Copy prior limits once when a new month has no settings.
4. Preserve earlier month records/settings when editing.
5. Connect remaining/spent values across screens.
Test: December copies November limits once; editing December preserves November; no records or unused funds copy forward.

Task B: category allocations and warnings, 30 minutes
Build: named limits plus automatic Everything else.
Locations: src/lib/budget.ts and Budgets.
Search first: derived remainder; related-field validation; category aggregation.
Steps:
1. Sum named category limits and calculate the remainder.
2. Put uncapped categories under Everything else.
3. Reject invalid allocation changes.
4. Display actual overspending and cap only the visual progress bar.
Test: ₱15,000 minus ₱5,000 Food and ₱1,500 Transport leaves ₱8,500. Reject ₱16,000 allocation and a monthly limit below named allocations. Actual overspending remains recorded.
Understanding: Why must Everything else be calculated instead of independently edited?

Day 7: tested core milestone

Task A: Android APK checks and repairs, 30 minutes
Build: a defect list and focused learner-written money/storage checks.
Locations: affected files, checks and daily checkpoint.
Search first: boundary-value tests; Android font scaling; regression testing.
Steps:
1. Build/install the latest app.
2. Test fractional money, month boundaries, income/expense/budgets and restart.
3. Stop Metro and disable networking.
4. Check small screens, larger text, keyboard and Android Back.
5. Log exact build/source/device results and fix the highest-impact defect if time allows.
Test: data persists offline and totals remain correct. Failures or untested scenarios remain pending.

Task B: portfolio evidence, 30 minutes
Build: Bulsa README, screenshots and short walkthrough using fictional entries.
Locations: README.md and project media/documents.
Search first: portfolio case study; APK installation instructions; tested versus intended platform support.
Steps:
1. Explain problem, decisions and unchanged stack.
2. List implemented features accurately.
3. Capture the installed Bulsa build and record expense/Activity/restart.
4. Link APK, revision and installation steps.
5. State Android test evidence and intended iOS support separately.
Test: another person can follow the instructions; screenshots match the delivered revision; unfinished features are explicit.
Understanding: What evidence proves the installed APK works without the development server?

Final 30 minutes every day
1. Spend about 15 minutes testing the day's task and one failure case.
2. Run npx expo lint and npx tsc --noEmit. Fix critical failures or record the exact blocker.
3. Answer the understanding question in your own words.
4. Save revision, completed work, check results, APK/device evidence, defects and next action. Commit when Git access permits.
Setup/troubleshooting counts toward the timebox. Continue unfinished prerequisites before later tasks.

Seven-day fit and retained continuation work
The full feature list does not fit reliably into the nine remaining beginner hours. Keep the agreed seven-day sequence as the core milestone. Do not remove features to pretend it fits. Repeat sessions as needed. The following remain scheduled, with each pair normally receiving another 90-minute session including checks:

1. Edit/delete/Undo: open by stable ID, prefill and save changes; delete, retain full record for Undo, restore once. Search stable IDs and reversible actions. Test edits across months, cancellation, deletion and duplicate-free restoration.
2. Search/filter: derive a searched list; combine month/type/category/payment filters with active state and Clear. Search array filtering and predicates. Test combined/cleared filters, no matches and unchanged whole-month summary.
3. Savings: create/edit a goal and contribution records; show empty/completed/invalid states. Search related records and aggregate totals. Test persistence, goal exceeded and unchanged expense/income totals.
4. Appearance/branding completion: consolidate theme sources, load Manrope and match the supplied weights; implement saved System/Light/Dark and coordinated status/navigation bars. Search semantic tokens, font loading and platform color scheme. Test both themes, font scaling and restart. Finish icon/splash and internal identifier cleanup without changing EAS identity blindly.
5. First use/settings: connect setup and local display-name editing; wire appearance and truthful local-data information. Search conditional navigation and local preferences. Test fresh install, existing records, blank-name fallback and every visible control.
6. Final design/mobile QA: compare every screen/state with Bulsa at 390 x 844; then test larger text, smaller screens, keyboard, safe areas, accessible touch areas and native Back. Search mobile accessibility and visual regression. Test on Android and, when available, iOS; do not imply untested support.
7. Final delivery: build/fresh-install the completed APK, test offline/restart/all flows; refresh media, README, revision and known limitations. Search reproducible release checks. Release only when the installed artifact matches the evidence.

Feature-to-design-to-plan coverage
- Overview and summaries: 1:1040 / 16:186; Day 2, Day 4 and appearance completion.
- Expense/income and validation: 1:1080 / 9:172, 22:174 / 22:467, 15:172 / 15:210; Days 3-5.
- Budgets/month history/overspending: 1:1120 / 9:223, 22:207 / 22:498, 22:232 / 22:523, 15:253 / 15:308, 39:520 / 39:825; Day 6.
- Activity: 1:1165 / 9:298; Day 5. Search/filter and edit/delete/Undo use 22:288 / 22:579, 22:411 / 22:702, 22:349 / 22:640, 1:1293 / 13:365; continuation 1-2.
- Savings and contributions: 1:1206 / 13:171, 22:260 / 22:551, 22:383 / 22:674, 39:543 / 39:848, 39:612 / 39:917; continuation 3.
- First use/profile/appearance/privacy: 1:1270 / 13:312, 1:1244 / 13:220, 39:568 / 39:873, 22:321 / 22:612, 22:433 / 22:724; continuation 4-5.
- Loading/read/save/empty/success failures: state boards 39:330 / 39:631; owning tasks throughout and Day 7/continuation QA.
- Offline persistence and APK: no screen alone proves these. Loading/error/privacy references support the UX; Days 2-4 and Day 7/final release provide actual verification tasks.

References
Current Figma: https://www.figma.com/design/vhoEdT2Md0wGTqXppartYX/Bulsa?node-id=0-1
Versioned SDK docs: https://docs.expo.dev/versions/v58.0.0/
Docs index: https://docs.expo.dev/llms.txt
SQLite: https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/
APK guide: https://docs.expo.dev/build-reference/apk/
