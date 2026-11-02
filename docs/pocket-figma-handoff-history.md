# Pocket design handoff — 2026-11-02

Use the education-account file `Fm96uDswa4jQOjSaJI2IO3`.

## Screen references

Light core board: `1:1032`. Dark screen board: `9:171`.

| Screen | Light | Dark |
| --- | --- | --- |
| Overview | 1:1040 | 16:186 |
| Add expense | 1:1080 | 9:172 |
| Budgets | 1:1120 | 9:223 |
| Activity | 1:1165 | 9:298 |
| Savings goal | 1:1206 | 13:171 |
| Profile/settings | 1:1244 | 13:220 |
| First use | 1:1270 | 13:312 |
| Delete Undo | 1:1293 | 13:365 |
| Invalid amount | 15:172 | 15:210 |
| Overspent budgets | 15:253 | 15:308 |

The latest dark Overview is 16:186; earlier duplicate dark Overview frames remain historical references. Do not use those duplicates as the current target.

## Decisions and coding rules

- Income is separate; the user sets the monthly spending limit manually.
- Use real local records and derived totals instead of mock names, dates, and balances.
- Preserve the existing visual style and Manrope typography; existing icon/component text also uses Inter.
- Light cards in dark mode require dark teal text. Dark surfaces use pale readable text. Mint primary buttons require dark teal labels; teal buttons use white labels.
- Invalid zero/negative/empty/non-numeric amounts must prevent saving and show an inline message. Overspending remains recordable with a clear warning; progress bars cap visually at 100% while the percentage and over-budget amount retain their actual value.
- Header and profile row compression was repaired in both themes. Adapt content to scrolling, font scaling, native safe areas, keyboard, and Android back behavior during implementation.
- The dark screen references include copied/detached components. They are editable visual references, not a completed reusable theme/component library.

## Evidence and remaining work

The dark board and light/dark validation/overspending board were rendered and visually reviewed on 2026-11-02. The initial review exposed compressed headers/profile rows; those were repaired and the board rendered again. Text on light cards and mint buttons was corrected. Two lower-contrast teal-button labels were changed to white. There are no complete-screen raster assets in the dark board.

This is sufficient to start the guided Overview and SummaryCard implementation. The review below adds supporting forms and a static navigation preview. It is not proof of working inputs, app fidelity, or Android verification. Native pickers, keyboard interactions, full search/filter behavior, and biometric/export failure handling remain implementation acceptance checks. Do not mark these controls implemented from a static screen alone.

The learner writes ALL app code, including SummaryCard and supporting implementation. The assistant supplies hints, learning tasks and reviews. This 2026-11-02 coaching agreement supersedes earlier supporting-code statements. Obtain high-fidelity Figma design context per screen before implementation.

## UI/UX review and repairs — 2026-11-02

The user requested a clearer, simple, usable budgeting app in both themes while retaining the existing style. The overlap in the supplied screenshot came from the Portfolio components board intersecting the dark-screen board. Moved the component boards into separate space, hid historical dark Overview demonstrations, and repaired the expansion board's collapsed auto-layout rows. Current references live on page `0:1`, now named **01 · Design reference**.

- Repaired the shared savings-card header and separated the goal name from its percentage.
- Reduced Overview content height from 789 to 747 px, with visible content ending at 723 px before navigation at 756 px.
- Added a neutral background and numbered labels around the eight dark screens.
- Strengthened faint light-mode text, restored distinct selected navigation/category states, and improved progress visibility.
- Widened space for settings values and shortened supporting copy to prevent clipping.
- Changed the theme setting to **Appearance**, with System, Light and Dark choices. Local storage is informational, not an option to switch off persistence.
- Corrected the new-expense preview: a further ₱180 expense against ₱2,800 remaining leaves ₱2,620. Invalid amount states show disabled saving.
- First use leads to monthly budget setup. Keep the three main navigation destinations: Overview, Budgets and Activity.

### Manual tracking clarification

The user explicitly clarified that all data is entered by users: Pocket does not hold, move or transfer real money and does not connect to bank accounts. Income and payment-method names are manually recorded information.

Use **Record savings** / **Save savings entry**, not payment-like language. The design default is to keep savings entries separate from expenses and income, avoiding automatic double-counting. This calculation rule is the assistant's design choice, not an explicit user answer about accounting categories. The user confirmed manual tracking rather than real transfers. Record income separately; the monthly spending limit remains manually set as previously confirmed.

### Supporting screens

The new forms reuse the existing Button component and two local Field components with editable label/value properties. Light board: `22:167`; dark board: `22:460`.

| Flow | Light | Dark |
| --- | --- | --- |
| Income entry | 22:174 | 22:467 |
| Monthly budget | 22:207 | 22:498 |
| Category budget | 22:232 | 22:523 |
| Record savings | 22:260 | 22:551 |
| Activity filters | 22:288 | 22:579 |
| Appearance | 22:321 | 22:612 |
| Edit/delete transaction | 22:349 | 22:640 |
| Edit savings goal | 22:383 | 22:674 |
| Search with no matches | 22:411 | 22:702 |
| Data/privacy information | 22:433 | 22:724 |

### Navigation preview

Page `25:350`, **02 · Click-through preview**, contains 36 top-level screen copies so Figma navigation can target valid destinations. Start at light Overview `25:351` or dark Overview `25:775`. There are 116 authored navigation links covering core tabs, entry/edit screens, settings, deletion/Undo and theme previews. Read-back verified all 116 NAVIGATE destinations exist as top-level frames on that page; this is structural verification, not a manual click-through test of every link.

This is a static navigation demonstration: form fields do not accept actual data, saving does not recalculate sample balances, and filters do not execute. The design-reference page remains canonical; synchronize preview copies when changing the design. Biometrics, CSV export, date/category/payment pickers and complete savings history still require actual native behavior and relevant recovery states during implementation.

### Review evidence and practical limits

- Structural audit of all six current reference boards: no intersecting top-level boards and no visible descendant bounds extending outside their parents.
- Solid-background text contrast audit: no checked text below 4.5:1; board minimums were 4.66–5.31:1. This is a Figma color check, not a full accessibility certification or device test.
- Font families read back as Manrope, plus existing Inter icon/component text. All new supporting screens use Manrope. No image-filled nodes were found in the six reference boards; screens remain editable layers and components.
- Rendered and inspected the dark main board, light expansion board, and both supporting-flow boards. The full light-core-board screenshot timed out, then its core-journey frame `1:1037` rendered successfully and all four light core screens were visually reviewed. Subsequent first-use wording repairs were read back and checked for overflow.
- Implementation still needs 44–48 dp hit areas for text actions, scrolling with larger system fonts, keyboard-safe forms, native back behavior, and money/storage tests. Mock frames at 390 × 844 do not verify these.

No application code or APK changed in this design review. `npx expo lint` and `npx tsc --noEmit` both exited 0 on 2026-11-02. Continue with the reserved SummaryCard exercise and supporting Overview implementation, then the staged persistence/transaction/budget/settings batches in the roadmap.

## Current behavior specification: coaching update, 2026-11-02

This section supersedes earlier pending accounting choices and export/biometric requirements. The user delegated category/savings decisions, approved monthly limit copying, deferred export and biometric lock, and retained 90-minute learning sessions. These are updated design requirements, not a claim of canvas edits or working app behavior. Current supporting monthly-budget frame 22:207 was read through Figma metadata during this pass; it already contains Month, Spending limit, helper text and Save budget.

### Shared appearance and states

Keep existing layout, palette and fonts. No new color palette or font set was introduced. Manrope remains the main family; retain existing Inter component/icon text until reconciled with the design. Extract exact colors/weights/spacing from current Figma nodes before implementation. The prior audited references remain the visual source; do not substitute guessed hex values.

Use consistent card corners, spacing and button treatment across both themes. Pale cards need dark text; dark surfaces need light text. Primary mint buttons need dark labels and teal buttons need white labels. Give text actions 44-48 dp touch areas, visible selection and words alongside warning colors. Use native status bars rather than the mock status-bar text. Support safe areas, scrolling, large text, keyboard and Android Back.

Loading means existing records are being read, not an empty account. Save-in-progress prevents duplicate submissions. Save failure keeps entered values and offers retry. Successful save returns to the relevant screen and refreshes derived values. Cancel never saves. Local database failure must not silently replace existing data with empty data.

### Overview

Keep the greeting, monthly card, primary Add expense action, two summary cards, savings card and three-tab navigation. Use Monthly spending limit consistently. Remaining is limit minus expenses; income is separate. Show selected month and actual records. First use offers Set monthly limit. Overspending shows actual amount and readable warning; cap the progress bar visually at 100%, not the actual calculation. Keep savings progress separate. Replace practice controls only when the saved-expense flow works.

### Expense and income entry

Keep the Expense/Income selector, prominent amount, categories, Date, Paid from, Note and Save. Make editable rows clear with field boundaries or chevrons. Date/category/payment controls open actual selectors; Note opens an editable field. Income uses its own categories and save label, without an expense-budget preview. Payment names are manual labels, not connected accounts.

Reject blank, zero, negative, non-numeric, non-finite and more-than-two-decimal amounts inline. Preserve typed values on failure. Overspending is allowed with a warning. Calculate the preview using the selected date/category. On edit, exclude the old record before previewing its replacement so it is not counted twice.

### Budgets and budget editors

Keep monthly limit first, then category cards and Add category budget. Named allocations plus Everything else equal the monthly limit. Everything else is derived and not directly editable. Explain that uncapped categories count there. Reject over-allocation and reducing the total below named allocations. Allow actual spending above limits; show words, actual percentage and over-budget amount.

Monthly editor retains Month, Spending limit, helper text and Save. Explain that income is separate and edits affect the selected month only. New months copy the latest earlier limits once, without copying money or transactions. Existing month snapshots are never overwritten automatically.

### Activity, details and filters

Keep search, Filter, monthly summary and dated transaction rows. Rows open details with obvious Edit and Delete actions. Editing preserves the record ID. Delete provides Undo and a clear result; restoration must happen once without duplicate records. Changing a date across months updates both totals.

Filters cover the existing month/type/category design. Show active-filter indication and Clear filters. Separate no records from no matching results. Keep Spent this month as the whole selected-month total, independent of search/type/category filtering, with clear wording. Search/filter never modifies records. Use a virtualized list for growing history.

### Savings goal and Record savings

Keep target, saved amount, progress and goal editor. Record savings opens amount/date/note entry as in the supplied reference. Contribution records update only this goal. No automatic expense or income is created; monthly remaining is unchanged. Show empty, invalid, saving, failure and goal-reached states. Allow a contribution to take the total above the target and display the actual amount while capping the bar.

### First use and profile/settings

First use leads to manual monthly-limit setup. A new month copies limits only if a prior budget exists; a first-ever user sees setup. The greeting uses a local name when provided, with a neutral fallback rather than the mock name Alex.

Keep Appearance with System, Light and Dark; persist the selection and coordinate navigation/status bars. Local storage information explains that records stay on this device, are not synced, and can be lost on uninstall or clearing data. Do not imply encrypted backup or cloud recovery. Omit export and biometric-lock interactive rows from the first release because the user deferred them. Existing canvas/preview rows may still need reconciliation during that design batch; no canvas nodes were changed by this update.

### Implementation order

Follow beginner-learning-plan.md. All these requirements are learner work, not completed functionality. Preserve the static-preview limitation: Figma navigation does not demonstrate actual saving, filtering, persistence or APK behavior.

## Final design baseline for Day 2: 2026-11-02

This section is the latest status. Earlier statements about pending canvas reconciliation, export/biometric implementation and absent state screens are historical. The agreed learning roadmap is finalized in beginner-learning-plan.md. The learner writes all app code. The assistant edited Figma and documentation only.

### Completed in the Figma file

- Removed export/biometric rows from light/dark profile settings, data/privacy screens and their preview copies. Privacy wording now describes device-only storage and data loss on uninstall/clearing data, without promising unavailable backups.
- Clarified that named category allocations plus automatic Everything else equal the monthly limit. Over-allocation and lowering a total below allocations are blocked; actual overspending remains allowed.
- Added editable state references for storage loading/failure, empty Activity, saving/save failure, category/monthly validation, copied month limits, completed/empty savings, local name editing and save success, in both themes.
- Copied those 24 states into the preview, wired recovery actions and profile-name editing, and removed invalid inherited library/demo links. Reference screens intentionally have no prototype actions; use page 25:350 for navigation.
- Fixed button-label wrapping, settings-row wrapping, the new-month sample date and sample amounts so error states demonstrate genuinely invalid values.
- Preserved Manrope, existing component/icon text, teal/mint styling, editable layers and existing core/expansion/supporting screen IDs.

### Final state references

Boards on page 0:1: Light 39:330; Dark 39:631.

| State | Light reference | Dark reference | Light preview | Dark preview |
| --- | --- | --- | --- | --- |
| Loading records | 39:333 | 39:634 | 40:745 | 40:1027 |
| Storage read failure | 39:352 | 39:653 | 40:757 | 40:1039 |
| Empty Activity | 39:371 | 39:672 | 40:774 | 40:1056 |
| Saving expense | 39:390 | 39:691 | 40:791 | 40:1073 |
| Expense save failure | 39:432 | 39:735 | 40:832 | 40:1116 |
| Category over-allocation | 39:473 | 39:778 | 40:874 | 40:1159 |
| Monthly limit below allocations | 39:498 | 39:803 | 40:899 | 40:1184 |
| New month with copied limits | 39:520 | 39:825 | 40:921 | 40:1206 |
| Savings goal reached | 39:543 | 39:848 | 40:945 | 40:1230 |
| Edit local display name | 39:568 | 39:873 | 40:972 | 40:1257 |
| Expense saved | 39:593 | 39:898 | 40:993 | 40:1278 |
| No savings goal | 39:612 | 39:917 | 40:1010 | 40:1295 |

### Native interaction contract

The following use native app behavior, rather than custom calendar/keyboard mockups: Date opens an Android date picker and returns the selected local calendar date; cancel preserves the old date. Category and payment-method rows open selectable lists, show the current selection and preserve it on cancel. Payment choices are manual labels, with no bank connection. More opens the category list. Note is optional editable text. Money entry uses a decimal keyboard plus the shared validator, because a keyboard alone does not enforce valid input.

Loading/saving variants are shared patterns for other forms. The invalid-amount pattern applies to income and savings as well as expenses. All saved-entry failures retain user input. Initial load failure offers retry and must not erase or replace existing records. Theme follows System unless the user selects Light or Dark. Text size always follows the device; the settings row is informational, not an app-only scaling toggle.

The reference page contains the normal/edge-state layouts. The preview copies demonstrate navigation only. Review error/loading variants directly on the Final states boards; the normal journey does not deliberately cause failures. Retry and Save links demonstrate destinations, not database operations. Actual OS picker appearance, keyboard avoidance, cancel/back behavior, filtering and recalculation must be verified in the app during the assigned learning tasks.

### Final verification evidence

- Rendered and visually inspected both new state boards and both settings screens. Re-rendered after correcting wrapped button labels and settings text.
- Final structural read: 64 visible reference screens/states and 60 preview screens/states; no checked visible descendant extends outside its parent by more than 1 px.
- Preview: 149 NODE navigation actions checked; all destinations exist as top-level frames on page 25:350. No invalid targets remained. This is a structural link audit, not a manual click-through of all paths.
- No export, CSV or biometric wording remains in checked release screens or preview screens. Historical component definitions are not the release surface.
- The new state screens reuse existing editable screens, fields and button instances, rather than raster images. Existing contrast-audit evidence remains recorded above; no new full accessibility certification or Android test is claimed.
- Application lint/typecheck are run for the handoff and reported in chat. No app code, installed dependency, APK or device data was changed by this design finalization.

Day 2 may start with the SummaryCard label/amount-props exercise and early APK setup. Obtain current Overview design context before the learner starts exact styling. No product/design question blocks that first batch.
