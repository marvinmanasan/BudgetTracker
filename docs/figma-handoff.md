# Bulsa: current design handoff

Updated 2026-11-02. Current file: vhoEdT2Md0wGTqXppartYX. Use this over historical design records. The former design remains in pocket-figma-handoff-history.md for chronology only.

Current design: https://www.figma.com/design/vhoEdT2Md0wGTqXppartYX/Bulsa?node-id=0-1
Reference page: 0:1. Click-through page: 25:350.
Warm light is the primary reference; warm dark is the alternative, confirmed by the user. Keep both themes. Initial Light versus System preference remains an open decision.

## Reference screens: light / dark

- Overview: 1:1040 / 16:186.
- Expense: 1:1080 / 9:172.
- Budgets: 1:1120 / 9:223.
- Activity: 1:1165 / 9:298.
- Savings goal: 1:1206 / 13:171.
- Profile/settings: 1:1244 / 13:220.
- First use: 1:1270 / 13:312.
- Delete/Undo: 1:1293 / 13:365.
- Invalid amount: 15:172 / 15:210.
- Overspent: 15:253 / 15:308.
- Income: 22:174 / 22:467.
- Monthly limit: 22:207 / 22:498.
- Category limit: 22:232 / 22:523.
- Record savings: 22:260 / 22:551.
- Filters: 22:288 / 22:579.
- Appearance: 22:321 / 22:612.
- Edit/delete transaction: 22:349 / 22:640.
- Goal editor: 22:383 / 22:674.
- Search/no matches: 22:411 / 22:702.
- Local data/privacy: 22:433 / 22:724.

## Final state references: light / dark

Boards: 39:330 / 39:631.
- Loading: 39:333 / 39:634.
- Read failure: 39:352 / 39:653.
- Empty Activity: 39:371 / 39:672.
- Saving expense: 39:390 / 39:691.
- Save failure: 39:432 / 39:735.
- Category over-allocation: 39:473 / 39:778.
- Monthly limit below allocations: 39:498 / 39:803.
- New-month limits: 39:520 / 39:825.
- Goal reached: 39:543 / 39:848.
- Local name editor: 39:568 / 39:873.
- Expense saved: 39:593 / 39:898.
- No goal: 39:612 / 39:917.

Preview starts: Light 25:351; Dark 25:775. All 60 preview screens/states are retained. The preview uses sample records and navigation only. Real data entry, saving, filtering and recalculation are implementation work.

## Rules for implementation

Use bulsa-design-review.md for exact palette/fonts and bulsa-learning-plan.md for tasks. Keep the supplied layout and brand style. The learner writes all code and configuration; assistant hints/reviews must not become full functions or files.

Income stays separate from the manual spending limit. Remaining equals limit minus expenses. Named category limits plus automatic Everything else equal the monthly limit. Reject invalid allocation changes but allow actual overspending with words and actual figures. Savings contributions update the goal only. Copy prior limits once for a new month, preserving earlier settings and records. Never copy unused money or transactions.

Validate positive finite amounts with at most two decimal places and store integer centavos. Record local dates. Saving blocks duplicates. Failures retain inputs. Loading/read failure is not an empty account. Editing dates across months updates both monthly totals. Search/filter changes the list, not stored records or the whole-month spending summary.

Use platform-appropriate date pickers, safe areas, keyboard handling, text scaling and back navigation for intended iOS/Android support. APK testing on Android is the delivery gate; do not claim iOS tested without evidence. Date/category/payment selectors preserve values on cancel. Payment names are manual labels. Optional note editing is real editable text, not a screenshot.

Keep System/Light/Dark appearance choices and local-name editing. No online account is implied by the avatar. Export and biometric lock remain deferred. Device-only records can be lost after uninstalling/clearing data; do not promise cloud recovery.

## Comparison and visual evidence

The source files have matching reference-sized frame IDs, descendant ID/type/visibility fingerprints and action fingerprints. No screen, text action or state reference was missing in Bulsa. There are 66 reference-sized frames, 64 visible, and 60 preview frames in each file. Brand-normalized wording differs only in capitalization in first-use/appearance copy. See bulsa-design-review.md for details.

No old-brand text or node names were found on either checked Bulsa page. This does not mean runtime code is fully rebranded. Current source still has old visible branding and internal names, and app.json still has BudgetTracker as expo.name. These are learner tasks. Preserve the existing Android package com.marvinmanasan.bulsa and EAS project identity.

Rendered/reviewed Bulsa's four light core screens, light final-state board, warm dark Overview and light Undo. A leftover library-purple Undo style was corrected by removing its old text-paint bindings and applying #E9CDB1 to Undo and #F8F1E9 to the message, in both reference and preview. No layout, screen or feature was removed. The old file was not edited.

The pre-fix color audit checked 1,026 non-dimmed visible text runs on opaque solid backgrounds, minimum 4.77:1, with six dimmed runs counted separately. No checked text-parent overflow was found. These are limited design checks, not device verification or accessibility certification. Final read-back/render and preview-link results are reported in the review chat.

## Actual progress and next action

Day 1 stays DONE. SummaryCard now exists and is used twice in Overview. Preserve the learner's work, review it and restyle against Bulsa instead of recreating it. Android package/EAS project ID are present, but APK installation was not established by this design review.

Next batch: review SummaryCard inputs, update visible Bulsa branding and shared light colors, then check the existing EAS build path. The full scope still requires continuation sessions beyond the seven-day core milestone when unfinished. Obtain current screen-level design context before exact implementation styling.


Final follow-up evidence: the corrected #E9CDB1 Undo label measured 5.77:1 against the snackbar and was re-rendered. Preview retains 60 screens/states and 149 valid navigation actions with no old-brand text/node names. Application lint/typecheck both exited 0. No assistant application-code/configuration changes, APK build or device test occurred.
