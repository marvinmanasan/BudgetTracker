# Pocket — Day 2–7 portfolio roadmap

## Consolidated learning agreement — 2026-11-01

This is the canonical remaining-project roadmap. Keep the design contract and revised sequence below ahead of older timebox tables when they conflict. The expanded design scope may require more than seven sessions; do not mark placeholders or Expo Go previews as finished features or APKs.

- Explain simply, completely, and concisely. Give exact filenames and insertion/replacement locations for exercises.
- The user typing `n` means next. Work in meaningful batches rather than many tiny one-line edits.
- The user writes one small, meaningful component or logic exercise per session; the assistant implements supporting work and explains it. Leave the exercise for the user to attempt unless they ask the assistant to do it.
- Review at batch/day checkpoints, not after every `n`. Inspect sooner when the user requests a check or reports a problem.
- Reserve the end of each 90-minute session for verification and saving progress. Setup and troubleshooting count toward the timebox.
- Never add a practice-budget disclaimer to the app UI: the user explicitly requested its removal. Keep unfinished-feature notes in project documentation.
- Keep plan, progress, evidence, pending questions, and next action in the repository so VS Code and this chat can continue from the same source.
- Day 1 was pushed as `3cc98bf` (Completed Day 1 Tasks for Pocket). At Day 2 start, local tracked files are clean; this roadmap is untracked and must be included in the next checkpoint.

### Day 2 start: actual evidence

- Existing components: PocketButton, PocketScreen, PocketTabs; dark palette in src/constants/pocket.ts.
- Overview remains a practice balance with spend/reset and an overspending warning; there is no transaction persistence.
- Budgets and Activity remain placeholder screens.
- eas.json contains a preview APK profile; Expo project/account setup, cloud build and installed APK verification are not complete.
- The Figma get_design_context request for dark Overview `22:151` returned the Starter-plan MCP limit on 2026-11-01. No high-fidelity context or screenshot was retrieved in this session. Exact visual implementation is pending design access, not verified.
- Next independent learning task: understand PocketButton props and prepare the SummaryCard exercise. Do not implement the learner's exercise automatically.

---

Approved on 2026-10-31 after the Day 1 checkpoint. Revised on 2026-11-01 following the user's clarification: the priority is a working Android APK for a portfolio showcase. This supersedes the earlier requirement to verify both iOS and Android. This roadmap covers the remaining six work sessions; it is not an implementation specification.

## Finish line

Latest design review (2026-11-02): use [docs/figma-handoff.md](figma-handoff.md) as the current screen/state inventory and evidence record. The education copy now includes repaired light/dark core screens, ten supporting flows per theme, and a separate static navigation preview. Pocket tracks only manually entered records; it does not connect to banks or move money. The first coding batch can proceed with the revised Overview and the learner's SummaryCard exercise. Preserve later native-behavior, persistence and APK acceptance gates.

By Day 7, deliver a polished Android APK that installs on a physical Android phone, launches without a development server or Expo Go, works offline, and saves one user's real entries across app restarts. Include screenshots, a short walkthrough recording, and a project README so someone reviewing the portfolio can understand and try Pocket.

Android is the required delivery and testing platform. iOS is optional future work and cannot block any day or the final APK. No Apple Developer Program membership, Mac access, or friend's iPhone session is required. Retain normal shared React Native patterns, but only claim platform support actually tested.

Local data stays on the device; this version does not sync between phones. Restart persistence does not imply recovery after uninstalling or clearing app data.

Proposed product decisions still to confirm before implementing the relevant behavior: one monthly budget; monthly remaining equals the monthly limit minus that month's expenses; income is shown separately; no automatic carryover. The supplied design uses Philippine pesos; implement its currency presentation. The Figma reference is now supplied and governs visual implementation; see the design integration contract below.

## Design integration contract — user decision, 2026-11-01

Current screen IDs, theme decisions, review evidence, and remaining design work are recorded in [the Figma handoff](figma-handoff.md). Use that handoff over earlier work-in-progress IDs below. The guided Overview/SummaryCard coding batch can begin; remaining interaction designs are gates for their respective later batches.

### Education-account copy — current reference

The user supplied an education-account copy at [Pocket mobile draft](https://www.figma.com/design/Fm96uDswa4jQOjSaJI2IO3/Pocket-Mobile-Draft?node-id=0-1). Use this copy for current Figma work; the original file and node IDs below describe the earlier reference and must not be used as IDs in the copy. On 2026-11-01 the CPU account opened a Figma session and retrieved page metadata for this copy. Its core board is `1:1032`: Overview `1:1040`, Add expense `1:1080`, Budgets `1:1120`, Activity `1:1165`. These are structural references, not high-fidelity implementation evidence. Obtain screen-level design context, assets and screenshots before implementation, and inventory the remaining screens in the copy. Education team tier was reported as student; the connected seat was reported as View, so verify actual editing capability and limits before relying on it.

The user requested finishing the Figma design and integrating it into the project plan. The existing mockups contain core screens, but the exact unfinished design states and product decisions need to be identified and agreed before claiming the design complete. Continue the guided Day 2 session with the SummaryCard exercise reserved for the user.

On 2026-11-01 the user confirmed that the existing visual style should be preserved while completing the design, including dark mode. Inspection of the education copy identified light screens for Overview, Add Expense, Budgets, Activity, Savings Goal, Profile & Settings, First-use Overview, and Activity Undo; it contains a dark Overview reference. The user confirmed income is shown separately and the monthly spending limit is set manually. Other calculation details remain to be confirmed. Extend dark treatment to the remaining flows and specify entry validation, empty/overspent states, edit/delete/undo, budget editing, and savings contributions before considering the design complete. Three preliminary dark core screens were added under Figma frame `9:171` (expense `9:172`, budgets `9:223`, activity `9:298`). They are work in progress, with detached copied instances, and require visual review, contrast checks, component reconciliation, and iteration; no fidelity or completion claim is made.

The user requires this existing Figma design to be integrated faithfully into the current Expo/React Native project and delivered as a working app and installable Android APK. This is an implementation of the supplied design, not a redesign. This contract supersedes conflicting optional-feature or visual-simplification language elsewhere in this roadmap.

- Canonical design: [Pocket — Budget Tracker · Mobile Draft](https://www.figma.com/design/p8XgaCiwa54dbdJ4I4cKvP/Pocket-Mobile-Draft?node-id=0-1).
- File key: `p8XgaCiwa54dbdJ4I4cKvP`; page `0:1`, Pocket · Mobile draft.
- Core board `6:39`: Overview `6:182`, Add expense `6:240`, Budgets `6:285`, Activity `6:334`.
- Portfolio expansion board `10:285`: savings goal, profile/settings, first-use Overview, Activity Undo, and dark Overview concepts. Dark Overview frames include `10:484` and `22:151`; inspect the actual file to resolve the intended reference before implementation.
- Match typography, colors, spacing, card geometry, icons/assets, navigation, hierarchy, labels, and all designed states. Use real saved data in place of sample amounts, names, and dates. Do not bake example balances into the app or use screenshots as UI.
- Make visible controls work: expense/income entry, category selection, budget editing, Activity search/filter/edit/delete/Undo, savings-goal contributions, profile/settings, and the first-use flow. Inspect the expansion screens to enumerate each actual setting and its behavior; do not invent functionality from labels or claim visual mockups are working features.
- Include the designed light and dark appearances in the final design scope. Native Android status bars, safe areas, keyboards, back navigation, scrolling, and font scaling must remain usable; document necessary platform adaptations rather than silently changing the design.
- Preserve the current Expo Router architecture and reuse suitable Pocket components. Before API changes, read the installed Expo major and matching documentation as required by AGENTS.md.
- Figma workflow: retrieve high-fidelity design context, screenshots, exact assets, and tokens per screen before implementation; adapt to React Native. As of this revision, metadata and a browser canvas preview were retrieved, but the screenshot API timed out and subsequent Figma calls hit the Starter-plan limit. Detailed design extraction is pending, not complete.
- Superpowers guides the staged specification, implementation plan, and verification; gstack supplies design/engineering reviews and Android QA/release checks; Figma supplies the design evidence. These are complementary workflows, not three independently running agents.

### Revised sequence and completion gates

The six remaining 90-minute sessions remain learning/work checkpoints, not a guarantee that the expanded exact-design scope fits nine hours. Extend the schedule when required; do not silently drop designed screens, behavior, or fidelity to meet Day 7. No product code is changed by this planning revision.

1. Day 2: extract and document the design system and screen/state inventory, identify ambiguous behavior, align the Overview/navigation with the chosen reference, and prove the EAS preview APK path. Retrieve design evidence before styling.
2. Day 3: implement the designed transaction form, local persistence, currency validation, category/date/payment/note inputs, and live Overview totals. Verify saved entries survive restart.
3. Day 4: implement Activity, search/filter, income, edit/delete with Undo, and accurate recalculation. Verify keyboard/back handling and empty states.
4. Day 5: implement monthly/category budgets and connected savings-goal behavior; verify budget and contribution calculations. Continue until the core flows work before the release freeze.
5. Additional design-completion sessions as needed: implement profile/settings, first-use states, and both themes from the expansion board. Resolve actual settings and storage/privacy behavior before implementation. Do not add cloud accounts merely because the mockup has an avatar.
6. Quality gate: compare each screen and state against Figma at its 390 × 844 reference size, then on the target Android phone and smaller/larger-text layouts. Keep comparison screenshots and track mismatches. Run lint/typecheck and meaningful money/storage tests; exercise every visible control.
7. Final delivery gate: build an EAS preview APK, install fresh on a physical Android phone, test offline and with Metro stopped, verify restart persistence, and deliver APK link, source revision, device results, screenshots, walkthrough, and known limitations. A queued build or Expo Go session does not pass this gate.

The tables below preserve the earlier daily timeboxes as a starting scaffold. Where they conflict with the contract or revised sequence above, the revised sequence takes precedence.

## Daily outcomes

Each day has a strict 90-minute project session. Days 2–7 provide nine hours total. The schedule below is a target, not a guarantee that every optional feature fits. Protect a saved expense flow, accurate totals, a usable Activity list, a monthly budget, and the final APK/portfolio handoff. Income, transaction editing, and category budgets are the first candidates to defer if they compete with that core; agree and record any deferral at the daily checkpoint.

| Day | Outcome | Acceptance check |
| --- | --- | --- |
| 2 — Overview and APK proof | Follow the 90-minute breakdown below: agree on a narrow Overview target, improve its main budget card, and configure/submit an early Android preview build. | Overview is checked on Android; lint/typecheck pass. Install and launch the APK without Metro if it finishes in the session. Otherwise record the pending build ID/status and make installation the first check of Day 3. |
| 3 — First saved expense | Add an expense form and local storage; replace the practice spend action with a saved expense that updates Overview. | Add a valid expense, reject invalid amounts, fully close and reopen the APK, and see the same record and totals. Check decimal amounts and keyboard dismissal. Rebuild the APK when native dependencies change. |
| 4 — Activity | List saved entries by date; add income and basic edit/delete flows. | Add, edit, cancel, and delete entries; totals remain correct after restart. Form actions stay reachable with the keyboard open. |
| 5 — Budgets and feature freeze | Set monthly and category limits; calculate remaining amounts from saved expenses. Build a preview APK containing all core flows. | Expenses update the correct category and monthly totals. Overspending and empty states are clear. Records remain available offline. Freeze new features after this gate. |
| 6 — Quality and presentation | Test the Android APK on a physical phone. Check invalid input, month boundaries, larger text, smaller screens, safe areas, keyboard behavior, and Android back navigation. Finish Pocket name/icon/splash consistency and draft the portfolio README. | Core flows pass; required automated checks and dependency findings are resolved. Prepare a repeatable showcase using fictional entries and a short list of remaining limitations. |
| 7 — Final APK and portfolio package | Build the final preview APK and install it fresh. Test the full flow, restart persistence, and offline use. Capture final screenshots and a short walkthrough, and complete the README. | Final APK works without Metro or Expo Go, creates and retains entries, and shows correct totals. Provide the APK download location, source commit, device/test results, screenshots, recording, and known limitations. |

## Day 2 — 90-minute session

Goal: improve the Overview around one clear budget summary and establish the Android APK build path. Keep transaction entry and storage for Day 3.

| Minutes | Task | Checkable result |
| --- | --- | --- |
| 0–10 | Open the app on Android, check the Figma reference if available, and choose today's small visual target. If the reference is unavailable, use the existing Pocket palette and agree on a minimal refinement before coding. | A short agreed checklist: heading, monthly budget summary, remaining/spent values, and the current practice controls. |
| 10–25 | Check Expo sign-in, configure the Android package/EAS project, and submit an early preview build of the current baseline if setup succeeds. | Build ID/status recorded, or the exact setup blocker documented. Budget setup time to 15 minutes; continue the Overview work if it needs follow-up. |
| 25–60 | Refine Overview spacing, hierarchy, and its main budget card. Extract one focused budget-summary component if this keeps the screen clearer; avoid building an unused component library. Keep values connected to the current practice state. | Spend and reset still update the displayed remaining/spent values; the overspending message remains readable. |
| 60–75 | Check Android layout, scrolling, tab navigation, and the practice flow. If the cloud build is ready, install it and launch without Metro. | Record UI results and any APK install/launch result separately. An APK built before the Overview edits only verifies its recorded baseline revision. |
| 75–90 | Run lint/typecheck, fix critical issues, briefly review the state/props changes, and save a Day 2 checkpoint with a screenshot and next action. Commit when Git access permits. | Check results and build status saved; pending work is explicit. Stop new changes and preserve Day 3's saved-expense priority. |

Build queue time can run beyond the session. A queued build does not count as a successful installation. If setup or a defect consumes the buffer, reduce visual polish first. Do not extend the session to chase an optional task.

## Portfolio package

- A working Android APK and simple installation instructions; state the tested Android/device versions.
- Three to five screenshots showing Overview, transaction entry, Activity, and Budgets using fictional data.
- A short recording showing the complete flow: add an expense, observe totals update, find it in Activity, and reopen the app to demonstrate persistence.
- A project README covering the user problem, features, screenshots, tech stack, local setup, APK installation, architecture decisions, testing evidence, and limitations.
- Describe this milestone as an Android app. Only list iOS as supported after actual verification in future work.

## Working rhythm

- Spend 90 minutes per day, including setup, implementation, learning, verification, and checkpoint notes. Reserve the final 15 minutes for checks and handoff; do not fill the entire session with new code.
- Build one usable flow at a time. Complete Day 3's saved expense flow before expanding Activity and Budgets.
- Run `npx expo lint` and `npx tsc --noEmit` at the end of each day. Exercise the day's flow on Android, commit when Git access permits, and update the checkpoint with actual results.
- Use focused automated tests for money calculations, month filtering, and saved-record behavior. Store money as integer centavos; check fractional input, month boundaries, and edit/delete recalculation.
- Use Expo Go for quick iteration when compatible, but use installed APKs for the Day 2, Day 5, and final delivery gates. Check the actual final APK with the development server stopped and networking disabled.
- Keep sync, cloud accounts, charts not present in the supplied design, iOS verification/distribution, and store publication outside this milestone. Both designed themes are now in scope. Spend recovered iOS testing time on Android reliability and portfolio presentation.
- Prove the EAS build/install path on Day 2. After the Day 5 feature freeze, prioritize defects, usability, and delivery evidence.
- If time runs short, reduce decorative polish or optional features first. Protect installation, local persistence, accurate totals, and the complete expense flow.

## Verification record

Each checkpoint records the source revision, APK build ID/link when applicable, Android device and OS, scenario, result, and defects. Day 2 proves installation; Days 3–5 verify real behavior; Day 6 is the full quality pass; Day 7 verifies the final artifact. Scheduled or intended tests do not count as passes.

## Inputs needed before the relevant work

- Retrieve detailed Figma context/assets for the supplied file once tool access permits; identify all expansion settings and states.
- Confirm the budget calculation and how income relates to the budget limit before building calculations.
- Access to an Expo account and a physical Android phone for the APK gates.

## References

- [Day 1 checkpoint](day-1.md)
- [Expo APK build guide](https://docs.expo.dev/build-reference/apk/)
- [Expo SDK 58 SQLite documentation](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/)
