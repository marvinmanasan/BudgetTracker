Bulsa design comparison and review
Reviewed 2026-11-02

Source designs
Old reference: Fm96uDswa4jQOjSaJI2IO3
Current Bulsa reference: vhoEdT2Md0wGTqXppartYX
Both contain Design reference page 0:1 and Click-through preview page 25:350.
This review uses the previously agreed feature scope, current roadmap and the two files. No separate new feature list was supplied.

Still there
- Overview, monthly remaining/spent/limit, income and expense summaries, Add expense, View budgets, savings preview and profile entry.
- Expense and income entry, amount/category/date/payment method/note, save/cancel and budget-after-saving preview for expenses.
- Budgets, monthly editor, category editor, automatic Everything else, near-limit and overspending states.
- Activity, date grouping, search, filters, reset/clear, transaction edit/delete and Undo.
- Savings goal, goal editing, separate savings records, contribution entry, empty goal and goal-reached state.
- First use and monthly budget setup; local display-name editing; appearance and local-storage/privacy information.
- Light and dark references, plus System/Light/Dark choices.
- Invalid amounts, storage loading/read failure, empty Activity, saving, save failure, allocation errors, copied-month state and save success.
- All 24 final state references and all 60 preview screens/states.
- No reference-screen IDs were missing. Both files contain 66 reference-sized frames, 64 visible, and 60 preview frames. The matching screens have the same descendant IDs/types/visibility and action fingerprints. Normalized text differs only in brand capitalization on first-use/appearance screens.

Missing in the new design
- No missing screens, text actions or state references were found relative to the old file.
- Both files use a static preview. Neither file proves real inputs, saving, filtering, calculations or persistence. This is a shared implementation limit, not a feature lost in the rebrand.

Changed, and whether it is okay
- Name: Bulsa replaces the old name in all checked text and node names on both new-file pages. Good. The lowercase bulsa wordmark and title-case Bulsa in sentences are intentional.
- Palette: warm ivory, cocoa, clay and sand replace teal/mint. Good. The hierarchy and layout remain familiar.
- Income/expense: green positive amounts and clay-red negative amounts are more distinct. Good. Preserve signs and labels so color is not the only signal.
- Tagline: the concept-board tagline is A little room for what matters. Good. The Overview sentence Let's make room for what matters is supporting copy, not a second formal tagline.
- Fonts: unchanged. Manrope remains the main typeface. Four checked visible avatar/component text runs still use Inter Regular. Do not claim a newly introduced font family.
- Theme: warm light is primary; warm dark is the alternative, confirmed by the user. Keep both and preserve existing appearance controls.
- Undo: two light-mode snackbar text colors retained inherited pale-purple library variables. This broke palette consistency. Corrected the two overrides in the Bulsa reference and preview, without changing layout or the old design.

Fixes and exact locations
- Activity Undo, light reference 1:1293 and preview 25:578: Expense deleted text now uses #F8F1E9; Undo uses #E9CDB1 against the cocoa snackbar. Removed inherited purple variable bindings. A first sand choice, #D8AD8D, measured only 4.29:1 here, so it was replaced with the existing lighter sand. The Undo control remains present.
- App Overview, src/app/index.tsx: learner changes the visible wordmark and welcome text to Bulsa. Preserve current calculations and the working SummaryCard exercise.
- Launcher identity, app.json: learner changes expo.name from BudgetTracker to Bulsa and reviews icon/splash colors. Keep the existing Android package com.marvinmanasan.bulsa and EAS project identity. Do not blindly rename slug, scheme or project ID because branding and technical identifiers serve different purposes.
- Shared UI: learner applies the Bulsa light/dark palette through the existing shared color/theme layer, then loads Manrope and matches intended weights. Do not recolor each screen independently.
- Reusable code names still include the old brand, such as PocketButton and PocketColors. Learner may rename them in one separate, checked batch, updating imports together. These identifiers do not appear in the installed UI. No code was rewritten by the assistant.
- Active docs now point to the Bulsa file. Old design/docs are kept as explicitly historical evidence, not current implementation instructions. AGENTS.md still has an old-brand heading; learner can rename that heading during the documentation cleanup, preserving its rules.

Exact current palette
Light background: #F8F5EF
Light cards: #FFFFFF
Soft panel/amount field: #F2E4D4
Primary text: #382D29
Secondary text: #685A53
Primary action: #8A533A with #FFFFFF labels
Monthly summary: #624435 with #FFFFFF amounts and #F8EDE4 supporting text
Selected light item: #E9CDB1 with #382D29 text
Light track/divider: #EADFD5
Income: #426B50
Expense/error: #984F40
Near-limit text: #85550F
Dark background: #211B18
Dark surface: #332A25
Dark raised surface: #49382E
Dark primary text: #F8F1E9
Dark secondary text: #D6C6B9
Dark primary action: #D8AD8D with #382D29 labels
Dark income: #A9D2AD
Dark expense/error: #F0B2A3
Dark warning: #F2CE8C

Typography
Main family: Manrope.
Weights found: Regular 400, Medium 500, SemiBold 600, Bold 700, ExtraBold 800.
Main screen title: 28. Body/supporting copy: usually 14-16. Main amounts: 32-42. Smaller labels/navigation: 12-13.
Existing Inter Regular avatar text is an exception to retain or deliberately reconcile, not a new font system. Sizes are reference values; support system text scaling in the app.

Double-check findings
- Bulsa Figma text and node names: no old-brand occurrences found on either page.
- Runtime source: still has old visible branding. Launcher name remains BudgetTracker. These are learner tasks, not completed rebranding.
- SummaryCard already exists and is connected twice in Overview. Preserve and review it rather than assigning it from scratch.
- Android package and EAS project ID are already configured in app.json. Build submission, installation and device behavior were not verified by this review.
- Checked 1,026 non-dimmed visible text runs against nearest opaque solid backgrounds before the small Undo fix: no ratio below 4.5:1; minimum 4.77:1. Six dimmed runs were counted separately. This is a limited color audit, not full accessibility certification.
- No text-parent overflow was found in that check. Actual larger-text/device/keyboard behavior still needs testing.
- Do not replace clear budget labels with cultural decoration or add decorative Filipino symbols. Keep the supplied name, peso formatting and warm palette without changing the layout.

Open decisions
- Initial appearance preference: always Light or follow System? Light is the primary design reference; this does not itself settle the default setting.
- Confirm the physical Android device and any current EAS build/install result during Day 2.
- Full scope exceeds nine remaining beginner practice hours. Keep the current seven-day core milestone and extend sessions for retained features, rather than silently cutting them.

Final verification
+- Final Undo action contrast: 5.77:1 after using #E9CDB1. Re-rendered and visually checked the corrected state.
+- Final preview audit: 60 screens/states, 149 navigation actions, zero invalid destinations, zero old-brand text/node names.
+- npx expo lint and npx tsc --noEmit both exited 0 in this review pass.
+- No application code or configuration was edited by the assistant. Existing learner changes and files were preserved. No APK build or device test was performed.
