# Pocket — Day 2 checkpoint

## Authorized assistant design batch — 2026-11-02

The user explicitly requested assistant implementation of the design for Day 1–2 only, overriding the learner-only rule for this bounded batch. Later application lessons remain learner-led.

Applied the saved Bulsa light palette to shared components, visible Overview branding, cocoa monthly summary, equal-width white summary cards, primary/secondary buttons and navigation. Added capped spending progress while preserving actual negative balances and Spend/Reset behavior. Preserved technical identifiers and existing unrelated work. Light is used for this design batch; persistent System/Light/Dark selection remains later scope.

Source: docs/bulsa-design-review.md and existing learner components. Fresh Figma context/render was unavailable in this session; this is a saved-handoff styling pass, not verified pixel-exact integration. Manrope loading, exact icon/geometry reconciliation and device screenshot comparison remain pending. No savings/profile/form placeholder controls were added. No transaction storage or later-day features were implemented.

TypeScript and Expo lint both exited 0 after the changes. The previously installed APK predates this batch; reload Expo Go to review, and rebuild before claiming installed-APK design verification. No commit/push or new APK was created.

## Day 2 closing checkpoint — 2026-11-02

- Learner implemented SummaryCard with label/amount props, peso formatting, equal-width row layout and interim existing-palette text styles. Exact final Figma styling remains pending.
- Learner confirmed Spend updates Expenses and Reset returns it to zero on the phone.
- EAS preview build: https://expo.dev/accounts/marvinmanasan/projects/BudgetTracker/builds/8801915a-7a21-4912-a7ab-55bd49f515c3 . Terminal screenshot showed build finished.
- Learner confirmed the installed APK works offline and online. This is user-reported physical-device evidence, not an assistant-operated test. Device/OS and exhaustive scenario results were not supplied.
- Understanding reviewed: the two cards share a layout but receive different props; income remains a temporary zero and is separate from the spending limit.
- Persistence is not implemented; balance resetting after restart is expected at this stage. Full Figma completion is not claimed.
- Next: final checks and Git checkpoint, then Day 3 transaction type, centavo validation and local SQLite storage per beginner-learning-plan.md. Learner continues to write application code.


## Latest update — 2026-11-02 design review

Figma access now works through the education account. Reviewed and revised the current file `Fm96uDswa4jQOjSaJI2IO3`: fixed canvas overlap, internal spacing, light/dark text contrast, selected controls, and Overview/navigation collisions. Added ten supporting screens in each theme and a separate static click-through preview. See [the current design handoff](figma-handoff.md) for exact IDs, verification evidence and remaining native behavior.

User clarification: this is manual budget tracking only. No bank connection, money movement or payment functionality. The savings action is **Record savings**.

Checks for this design/documentation pass: `npx expo lint` and `npx tsc --noEmit` both exited 0. Figma layout/color audits and rendered reviews are recorded in the handoff; these do not verify an installed app.

Next coding batch: retrieve the revised Overview design context, leave `src/components/summary-card.tsx` for the learner's label/amount-props exercise, and implement the supporting Overview/navigation. Product code, persistence, device checks and APK delivery remain pending. Older access-limit notes below are historical.

Date: 2026-11-01. Status: started, not completed.

## Session target
Follow the canonical roadmap in day-2-to-day-7-plan.md: extract the Overview design, build the selected Overview/navigation, teach reusable component props, and establish the APK build path.

## Completed this session
- Inspected the current source and Git state.
- Preserved the pre-existing expanded Android-first roadmap and consolidated the user's learning preferences into it.
- Linked project continuity instructions from AGENTS.md.

## Pending
- Figma design context: connector reports Starter-plan call limit. Do not claim a fresh design comparison or exact fidelity.
- Day 2 product implementation has not begun.
- Learner exercise: SummaryCard with label and amount props; assistant handles surrounding Overview after design reference access is available.
- EAS account/project setup and APK build/install verification.
- Lint/typecheck, Android layout/device checks, screenshot and Git checkpoint at the end of implementation.

## Next action
Open the current app with Expo Go. Review src/components/pocket-button.tsx to understand title/onPress/secondary props while resolving design access. Obtain readable design reference/context before exact visual work; enumerate intended controls before wiring them.

## Education-account design access — 2026-11-01

- The CPU Figma account's team now reports the Student tier; its seat is reported as View. A session and read requests succeeded for the education-account copy, file `Fm96uDswa4jQOjSaJI2IO3`.
- Page `0:1`, core board `1:1032`, and Overview `1:1040` were identified. Overview design context and a screenshot were retrieved. The reference is 390 × 844 and uses Manrope, a light background, a dark teal monthly card, a primary expense action, income/expense cards, savings goal, and three navigation destinations. Example amounts and names are mock data.
- The user's original design file remains documented in the roadmap; this education copy has different node IDs. Further screens and their intended interactions still need inspection. Design edits, product implementation, device checks, persistence, and APK delivery are not complete.
- Next guided exercise: create `src/components/summary-card.tsx` with `label` and `amount` props for the two monthly totals. The user writes the exercise; connect and style it against the retrieved design in the next batch.

## Current coaching checkpoint: 2026-11-02

Read this section before older next-action notes. The learner now writes ALL application code. Assistant-written supporting implementation is no longer authorized. Use hints first, review pasted code without rewriting, and provide tiny unrelated examples only when explicitly requested.

Updated roadmap: day-2-to-day-7-plan.md points to beginner-learning-plan.md. Day 1 stays done; Day 2 is pending implementation. Begin with the learner's SummaryCard batch and early APK setup. Sessions remain 90 minutes and unfinished work carries forward.

Working rules: category allocations equal the monthly limit with derived Everything else; savings stay separate from expense/income; new months copy prior limits once while preserving history. Export/biometrics are deferred. See the handoff's latest behavior section for details.

This update changed documentation only. No application code, Figma nodes, installed dependencies or APKs were changed. Lint/typecheck results for this pass are reported in the chat; no device/persistence test was performed.

## Final handoff: ready to begin Day 2 coding, 2026-11-02

The learning plan and Figma design baseline are finalized. Current screen/state IDs and verified preview links are in the last section of figma-handoff.md. Export/biometrics were removed from both theme references and preview copies. New edge states and local profile-name editing are designed. Day 1 remains done; Day 2 coding remains not started by the assistant.

Next batch: the learner opens src/components/pocket-button.tsx, explains title/onPress/secondary, then creates src/components/summary-card.tsx with label and amount inputs. Guide in words and exact edit locations; do not supply a full function/file or supporting code. Inspect current Figma Overview context before styling. Keep existing Day 1 behavior until the learner's saved-expense flow replaces it.

The two 30-minute tasks are SummaryCard and early APK setup, followed by 30 minutes of verification/checkpoint work. Record setup blockers honestly. Additional app features follow the saved learning plan rather than being rushed into this first batch.

## Latest status: Bulsa migration review, 2026-11-02

This section supersedes older brand, design-file and not-started exercise notes above. Current app name is Bulsa. Use vhoEdT2Md0wGTqXppartYX and the current figma-handoff.md. Warm light is primary and dark is the alternative. Intended platforms are iOS and Android; tested Android APK remains the delivery target.

The learner has written src/components/summary-card.tsx and connected two instances in src/app/index.tsx. Preserve and review that progress. Android package com.marvinmanasan.bulsa and an EAS project ID are already in app.json. Build submission/installation are not verified by this review.

Visible app text still uses the old brand and expo.name is BudgetTracker. The assistant did not change application code/configuration. Day 2 now reviews/restyles the existing SummaryCard, updates visible Bulsa branding/shared colors and checks the early APK path. See bulsa-learning-plan.md for steps/topics/tests, bulsa-design-review.md for comparison and bulsa-project-summary.txt for copyable continuity.

The Figma comparison found no missing screens/states/actions relative to the old design. One inherited purple Undo text treatment was corrected in both the new reference and preview. Existing code edits and untracked files were preserved. Day 1 remains done. First-launch appearance default remains undecided; light is the primary visual target.
