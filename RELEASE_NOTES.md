# Bulsa Release Notes

## 1.2.2 — Android Build 7

Published November 28, 2026. Version **1.2.2**, Android build **7**.

- [Download Bulsa-1.2.2.apk](https://github.com/marvinmanasan/BudgetTracker/releases/download/v1.2.2/Bulsa-1.2.2.apk), 107,593,723 bytes; matching SHA-256 file is attached to the release.
- SHA-256: `220ded6ce274abbf6b30bae1b5cdd5c7f8415bcb71733e8c654032f84c005273`.
- Built source: `f3649b83e888afc1b5f01f04e3803786e9651d5d`. Subsequent release-documentation edits do not change app code.
- [Expo build 8b4de0af-8d40-481b-9edd-d35be6c95ce1](https://expo.dev/accounts/marvinmanasan/projects/BudgetTracker/builds/8b4de0af-8d40-481b-9edd-d35be6c95ce1). Supplied APK matches the finished Expo artifact byte for byte.
- ZIP integrity and Android signature verification passed. Signing certificate matches earlier Bulsa releases; install-as-update succeeded. Native smoke checks observed the polished Wallets screen and a standalone cold launch in airplane mode with Wi-Fi disabled. Network settings were restored, and financial/preference rows stayed unchanged during the read-only smoke test.

### Wallets

- Total Budget appears first, with a nearby Adjust action and on-demand balance explanation. Included hidden wallets and nonzero unassigned money remain visible in context.
- Add Wallet and Adjust reuse the same primary/secondary button styles as other tabs. Transfer has a coordinated warm surface; compact wallet cards use cash/wallet icons, readable balances and Included/Excluded badges.
- Inclusion switches live in wallet details, reducing accidental changes from the list. Tapping a wallet still opens its full management screen; an unset wallet also offers a separate Set Balance shortcut.
- Wallet accessibility labels include the balance/setup state, inclusion and hidden status. Long names and larger text can wrap.

### Savings

- Manage Goal, opposite Back, opens a compact action sheet with labeled Edit/Delete icon rows, a close control and outside-tap/Android Back dismissal.
- Delete Goal opens a separate confirmation naming the goal, saved amount, target and number of associated records. Cancel changes nothing. Empty goals use a clear goal-only confirmation.
- Confirmed deletion removes only that goal and its savings records. Wallet balances, income, spending, other goals and budgets stay unchanged. Changed or deleted records reject an outdated confirmation; failed writes roll back the entire deletion.
- Successful deletion returns to the empty Savings state so a fresh goal starts without old progress.

### Verification and Limits

- 54 automated scripts, Expo lint, TypeScript and Android production JavaScript bundling passed before publication. Independent source review found no remaining blocker.
- Expo Go walkthroughs covered goal creation/contribution/correction/deletion, management-sheet transitions, wallet setup/management paths, Light/Dark wallet layouts and 150% text. Fictional populated data covered long names, negative/excluded/hidden wallets and unassigned money; original databases/settings were restored and hash-verified.
- Removed the Wallets list's unused write handler/save hook and repeated switch/status rows. Goal deletion calculates the frozen confirmation total once per opening. No new dependency, database schema or backup-format change; no runtime-speed or APK-size improvement is claimed.
- This combines source/Expo Go verification with a bounded build-7 native smoke test. Full standalone regression, spoken TalkBack, physical-device/first-time-user acceptance and tablet layout remain open. A fresh pre-install data comparison was unavailable because the initial ADB backup was denied; no financial records were edited during the release smoke test.
- Existing Savings limitations remain: one active goal, future-dated contributions count immediately, and Back can discard an unsaved goal/contribution draft. Those follow-ups are not addressed by this patch.

## 1.2.1 — Android Build 6

Patch release prepared November 28, 2026, including the latest QA fixes and a separately versioned Android APK. The older 1.2.0 release remains available for reference.

- APK: `Bulsa-1.2.1.apk`, 107,581,727 bytes.
- SHA-256: `ade61b69aa439166f4f9785e1cd80c9cfe73aad84073a3faede6321d90f6c051`.
- Built source: `cd94c7fba5d7772a9b37d630ffbe1d80c369b0fc`; later release-documentation changes do not change app code.
- EAS build: [3933e61d-3749-4990-ab0a-3a98af9e837e](https://expo.dev/accounts/marvinmanasan/projects/BudgetTracker/builds/3933e61d-3749-4990-ab0a-3a98af9e837e).
- ZIP and Android signature verification passed. Signing certificate matches 1.2.0; in-place installation retained saved files. Build 6 native cold-entry balance correction saved once and returned to Wallets with the exact expected total.

- Recovery copies are verified before becoming available. Incomplete newer files no longer hide readable older copies; older/newest copies can be selected with their timestamps.
- Back from spending-plan review retains entered details. Leaving an edited plan asks before discarding changes, and saves/deletes guard against immediate repeated actions.
- New or renamed spending plans accept up to 80 characters. Existing longer names remain readable and can be shortened without silently truncating saved records.
- Expense/Income selection has a persistent check and border in both themes. Month, category and reset choices expose their selected state to accessibility services.
- Successful total-balance corrections close their review and return to Wallets when there is no previous screen. Failed saves retain the review for retry.
- Financial calculations, database schema and dependencies remain unchanged.

Validation: 50 automated scripts, lint, TypeScript and Android bundling passed during preparation. The preceding internal QA APK covered wallet transfers, income correction/Undo, savings, spending plans, monthly/category limits, backup/restore and recovery fallback; build 6 additionally passed the final no-history navigation retest. Spoken TalkBack, physical-phone/participant acceptance and the exhaustive device/failure matrix remain open.

## 1.2.0 — Android Build 5

Release date: November 27, 2026. This update brings the Budgets and mobile-clarity improvements together with the signed Android APK and matching SHA-256 file.

### Android Release

- EAS build: [5b523a17-1b3d-4d08-8364-b3a3b962546c](https://expo.dev/accounts/marvinmanasan/projects/BudgetTracker/builds/5b523a17-1b3d-4d08-8364-b3a3b962546c).
- Built app source: `166e78ef1cecc1d49a5bb7a98d0537436d753948`. Subsequent preparation changes affect documentation/ignore rules only.
- APK: `Bulsa-1.2.0.apk`, 107,575,835 bytes. ZIP integrity passed.
- SHA-256: `3481392ddc1c595a3f3f2afd1134aec09bb347a218d8f227f6a2e106c2c80059`. GitHub upload digest matches this file; a matching checksum file is attached.
- Bounded native observation: Dark Overview with the written-date segmented summary and retained total. Full accessibility/physical-device acceptance remains open below.

### Budgets and Savings

- Create a named spending plan with an inclusive start/end date and a limit, including zero. All recorded expenses in those dates count, across wallets and General.
- Review the dates, limit and existing spending before Save; edit saved plans and delete a custom plan after confirmation. Deleting a plan preserves expenses and wallet balances.
- Overlapping custom plans are rejected. Overview shows the active plan and returns to the monthly plan after it ends; saved upcoming/ended plans remain reachable through Switch Plan.
- Monthly setup, category actions, history and Savings links have simpler placement. Existing monthly limits/category allocations remain intact.
- Active, upcoming, ended, exact-limit and overspent plans explain their amounts in context. Correcting dates, cancelling calendars and returning from review retain drafts.
- Add an optional savings target date, with reached/today/passed status. Savings stays separate from wallet money.

### Everyday Use

- The existing Overview Income/Expenses pair now switches between Day, Week, Month and Year, starting with Today. Previous/next arrows navigate the dates; category details expand inline. Weeks run Monday–Sunday.
- The summary uses full written dates, such as November 1–30, 2026, with larger text. Typed dates remain MM-DD-YYYY.
- New expenses show a review popup with amount, wallet, category, date, payment method and note. Confirm Expense saves; Keep Editing retains the draft.
- Edit Total Budget supports Add Amount, Subtract Amount and Set Exact Balance. Corrections affect one selected included wallet and do not create income or spending.
- Transfer entry shows the selected wallets' balances alongside its existing before/after review.
- Android calendar actions accompany transaction, transfer, custom-plan and savings dates; manual entry remains available. Other platforms retain typed entry.
- Wallets removes repeated explanatory paragraphs. About Your Balances contains the explanation; a nonzero General balance appears as Unassigned Money. General remains included in accounting.
- Secondary buttons have warm fills and visible borders in Light/Dark. Selected and destructive styles retain readable text. Date navigation preserves measured loading height; full device confirmation of the reported flashing remains open.

### Data Protection and Performance

- Financial schema 7 adds custom plans and savings deadlines through preserving migrations.
- Financial backup v2 includes those additions and accepts legacy v1 imports. Importing an older file replaces financial data and removes custom plans/deadlines absent from that file; the restore preview explains this.
- Existing atomic writes, stale-preview checks, stable IDs and duplicate-save locks remain in place.
- Period totals aggregate income and expenses in one memoized pass. Hidden category results are not recalculated during loading. No dependencies were added; no phone-speed or APK-size improvement is claimed.

### Verification and Remaining Acceptance

- All 48 automated scripts, Expo lint, TypeScript and whitespace checks passed during preparation on November 27. A separate source review found no blocking defect. These results do not establish the pending APK/device checks.
- Earlier local automated checks covered actual SQLite upgrades, rollback/retry, inclusive dates, overlap conflicts, backups, safe money and reviewed UI flows. Earlier emulator observations covered bounded plan flows and Light Overview/Wallets, not complete release acceptance.
- Signed APK package/version verified as com.marvinmanasan.bulsa, 1.2.0/build 5. Its signature verifies and release certificate matches build 4.
- In-place build-4 upgrade preserved every one of 19 fictional financial rows plus saved preferences; schema 6 migrated to 7. Airplane-mode cold launch and Android reboot retained the expected ₱3,050.25 total and exact rows. The original emulator data/preferences were restored and compared afterward.
- Still pending: native backup-v2 picker restore and complete changed-form/calendar journeys on this APK.
- Also open: complete changed-form Light/Dark and large-text checks, spoken TalkBack, rapid native saves, physical-phone and first-time-user testing, and direct reproduction/recheck of the supplied month-flashing video.

## 1.1.0 — Published Android Build 4

Updated November 15, 2026. These notes cover all implemented changes since v1.0.0 across Batches 1–8 and the verification work in Batch 9. The Android download is version 1.1.0, build 4. Unfinished acceptance checks are listed explicitly below.

### Android Release

- APK: `Bulsa-1.1.0.apk`, package `com.marvinmanasan.bulsa`, version 1.1.0, version code 4.
- Built by EAS from source commit `3e52a2f0b4777b96b4010c52edbafff783fb7e2b`; subsequent release documentation does not change app code.
- Build: [984e4fec-c034-4d56-816a-3001bb0b5eb6](https://expo.dev/accounts/marvinmanasan/projects/BudgetTracker/builds/984e4fec-c034-4d56-816a-3001bb0b5eb6).
- SHA-256: `3525c1acef890e717cdea0a2d311ca9a03bb857fe33631198ae8780e5acd50ac`.
- APK signature verifies and matches the published v1.0.0 release key. ZIP integrity passed.
- Testing uses the Bulsa Android 16 emulator. Physical-device and spoken accessibility acceptance remain separate checks.

### Overview and First Use

- Add Expense and Add Income open their matching forms directly beneath Total Budget.
- Daily actions have equal touch targets and stack when space is limited.
- Settings has a labeled gear. The personal greeting and tagline remain on Overview.
- Start With Your Wallets appears while every named wallet is awaiting its starting balance. A saved zero starting balance counts as setup.
- First use begins with choosing where money is kept. Starting-balance examples appear beside the amount field.
- General uses the same name throughout the app, counts in Total Budget and supports negative balances.

### Wallets and Transfers

- Wallets has its own bottom tab, with Add Wallet and Transfer Money near the top.
- Cash stays first. Arrange Wallets supports dragging a handle to reorder the other visible wallets, with automatic saving and screen-reader move actions.
- Saved wallet order is reused by transaction pickers, transfers and financial reviews.
- Arrange Wallets provides Back and Done controls.
- Wallet sits directly below Amount in the transaction form.
- Set Up Cash accepts a zero opening and returns to the existing transaction draft with Cash selected.
- Duplicate wallet-name feedback appears beside Wallet Name and clears when the name is edited. Saving rechecks uniqueness.
- Transfer setup retains the draft while configuring wallets and allows zero-balance destinations.
- Review Transfer shows the amount, source and destination balances, and Total Budget. Included/excluded wallet transfers explain the change to Total Budget.
- Confirm Transfer and Keep Editing remain outside the scrolling review details.
- Wallet balance corrections and hidden-wallet management remain available from Wallets.

### Activity

- Search, Filters and Select lead into the dated record list.
- Saved order is preserved across record types, rapid saves and changes to the device clock.
- Saved entries receive a short wallet-specific confirmation. Old feedback clears when leaving or starting another action.
- No Matching Records and Clear Filters handle empty search/filter results.
- The large global spending summary was removed from Activity.
- Bulk reset is accessed through Settings → Your Records → Reset Selected Data, with its preview and typed confirmation.
- Touch and hold selects an expense or income. Select also provides an explicit way to choose records.
- Single-record deletion Undo survives navigation until it is used, dismissed or the app closes.
- Multiple-record deletion retains its balance review and separate confirmation.
- Filters support staged Apply/Clear actions, useful historical payment choices, month navigation and outside-tap dismissal.

### Forms, Navigation and Appearance

- Navigation uses the mounted screen's router after Android font-size changes. Transfer waits for readiness and blocks duplicate navigation from rapid presses.
- Tab labels wrap and switch to two rows when needed. Controls retain selected states, spoken names and minimum touch targets.
- Tab icons render with theme-aware colors in Light, Dark and System appearance.
- Invalid transaction amounts and dates show specific field messages and focus/scroll to the first error. Impossible calendar dates have a distinct explanation.
- Changed transaction drafts offer Keep Editing or Discard Entry on Back. Clean drafts leave immediately.
- Unavailable expense wallets retain their disabled accessibility state, readable balances and reasons, and omit the chevron.
- Shared centered review popups retain the previous screen as context.

### Budgets and Savings

- Budget status uses Left to Spend, Over Limit and At Your Limit.
- A missing monthly limit presents one setup action. Category limits become available after a monthly limit exists, including a zero limit.
- Save Category Limit replaces the staged allocation/list-save flow with one save action.
- Everything Else is recalculated from the remaining monthly allocation. Over-allocation is rejected, with the existing plan preserved.
- Category editing and removal remain available.
- Savings contributions can be edited or deleted individually with review and stale-data checks.
- Savings records track savings independently of wallet balances and Total Budget.

### Backup, Restore and Data Protection

- Save Backup to Device is the primary export action. Share Backup is secondary.
- Backup names use Bulsa-Backup-MM-DD-YYYY.json.
- Expo Go saves through Android's folder picker. A local Android adapter implements the one-step document picker for standalone builds.
- Success is shown after the write completes. Cancellation and write failure are handled separately.
- Backups retain version 1 format, size validation, financial records, activity ordering and custom expense/income choices.
- Restore retains its replacement preview, typed RESTORE confirmation and verified local safety copy.
- The latest restore safety copy remains discoverable after device clock changes.
- Financial edits, deletions, adjustments and resets retain stale-preview protection and atomic storage writes.
- Custom choices migrate into the financial database with rollback and retry protection.
- Upgrade checks cover existing records, wallet identifiers, custom choices, settings and derived balances.
- Stored integer-centavo calculations and wallet inclusion rules are preserved.

### Performance

- Activity reuses its sorted record list while search text and other filters change.
- Opening a single record skips building global ordering metadata.
- Transaction drafts reuse monthly spending totals until the month or ledger changes.
- Result-equivalence checks preserved wallet scope, filters, record ordering and unchanged source data.
- A paired Windows Node benchmark with 20,000 records measured seven search updates at a median 441.79 ms before and 65.01 ms after. Single-record detail logic measured 5.81 ms before and 0.39 ms after.
- The comparable production JavaScript export grew by 366 bytes, from 2,854,710 to 2,855,076 bytes. Phone frame rate, memory and APK-size measurements remain for native acceptance.

### Verification Recorded

- All 43 automated check scripts, Expo lint, TypeScript and Android JavaScript export passed.
- The complete fake-money sequence matched its expected results in disposable SQLite storage, including the unchanged ₱1,050.25 included-wallet transfer total, excluded-wallet adjustments and the final ₱375.75 Total Budget.
- Category checks saved Food at ₱60, edited it to ₱70 and rejected an extra ₱31 allocation against a ₱100 monthly limit.
- Checks cover editing, deletion/restore, persistence after reopening, clean-database backup restore, interrupted writes, stale approvals and older-schema upgrades.
- Android 16 Expo Go checks confirmed transfer/inclusion effects, the final ₱375.75 total and ₱50.25 Over Limit. Temporary test records were removed by restoring the saved original ledger.
- Six tab-layout captures at 320/411 layout units and 100%/150%/200% text showed readable labels and minimum touch targets.
- Icons were checked in Light, Dark and System with both system appearances.
- The optimized Activity search and Clear Filters passed an Expo Go smoke test without writing financial records.
- The navigation crash was reproduced on the original signed 1.1.0 build 3. A locally signed QA APK passed repeated 100%–200% changes, rapid presses, Back and cold-launch checks with all 58 fictional fixture rows preserved.

### Release APK Verification

- Release build 4 compiled successfully, including the standalone backup adapter. The published v1.0.0 APK upgraded in place without clearing data; every legacy financial row, wallet identifier, custom choice and preference matched, with the expected ₱941.67 Total Budget.
- In airplane mode, the signed APK saved a populated backup to Downloads through the one-step file picker, showed success after writing, and cancelled a second export without success feedback. The saved JSON matched every financial table, custom choice and activity position.
- Offline force-stop/relaunch and Android reboot retained the fixture's ₱941.67 Total Budget, income, spending and savings. These checks do not measure physical-phone performance.
- At 320 layout units, two running 100% → 200% → 100% font-change cycles opened Transfer Money and returned with Android Back, retaining the expected total without a fatal/router error. Six native tab captures cover 320/411 units and 100%/150%/200% text.
- The saved Downloads file restored through the picker and typed confirmation into a clean test app. All financial tables, custom choices and activity positions matched the file exactly.
- The emulator's original records, wallet identifiers and preferences were restored and compared after QA. The latest release APK remains installed on Bulsa Android 16.

### Remaining Android Release Checks

- Complete large-text transfer-review checks and the final native category-error check. Earlier automation was interrupted or could not establish the result.
- Listen to TalkBack errors, labels and selected-state announcements; finish large-text field focus and last-row scroll reachability.
- Complete the native Cash setup/double-save/duplicate-name trials and the Activity transfer → adjustment → delete → tab change → Undo journey.
- Finish physical-phone animation/touch checks, reduced-motion acceptance and a first-time usability test.

These checks remain open until their actual outcomes are recorded. Local plans, QA screenshots, financial fixtures and signing material are kept outside the public repository.
