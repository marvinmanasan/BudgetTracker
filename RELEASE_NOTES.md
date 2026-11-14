# Bulsa 1.1.0 Update Notes

Updated November 15, 2026. These notes cover the source changes since v1.0.0. Version 1.1.0 is being prepared for Android release. The latest published APK remains v1.0.0.

## Overview and First Use

- Add Expense and Add Income open their matching forms directly beneath Total Budget.
- Daily actions have equal touch targets and stack when space is limited.
- Settings has a labeled gear. The personal greeting and tagline remain on Overview.
- Start With Your Wallets appears while every named wallet is awaiting its starting balance. A saved zero starting balance counts as setup.
- First use begins with choosing where money is kept. Starting-balance examples appear beside the amount field.
- General uses the same name throughout the app, counts in Total Budget and supports negative balances.

## Wallets and Transfers

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

## Activity

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

## Forms, Navigation and Appearance

- Navigation uses the mounted screen's router after Android font-size changes. Transfer waits for readiness and blocks duplicate navigation from rapid presses.
- Tab labels wrap and switch to two rows when needed. Controls retain selected states, spoken names and minimum touch targets.
- Tab icons render with theme-aware colors in Light, Dark and System appearance.
- Invalid transaction amounts and dates show specific field messages and focus/scroll to the first error. Impossible calendar dates have a distinct explanation.
- Changed transaction drafts offer Keep Editing or Discard Entry on Back. Clean drafts leave immediately.
- Unavailable expense wallets retain their disabled accessibility state, readable balances and reasons, and omit the chevron.
- Shared centered review popups retain the previous screen as context.

## Budgets and Savings

- Budget status uses Left to Spend, Over Limit and At Your Limit.
- A missing monthly limit presents one setup action. Category limits become available after a monthly limit exists, including a zero limit.
- Save Category Limit replaces the staged allocation/list-save flow with one save action.
- Everything Else is recalculated from the remaining monthly allocation. Over-allocation is rejected, with the existing plan preserved.
- Category editing and removal remain available.
- Savings contributions can be edited or deleted individually with review and stale-data checks.
- Savings records track savings independently of wallet balances and Total Budget.

## Backup, Restore and Data Protection

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

## Performance

- Activity reuses its sorted record list while search text and other filters change.
- Opening a single record skips building global ordering metadata.
- Transaction drafts reuse monthly spending totals until the month or ledger changes.
- Result-equivalence checks preserved wallet scope, filters, record ordering and unchanged source data.
- A paired Windows Node benchmark with 20,000 records measured seven search updates at a median 441.79 ms before and 65.01 ms after. Single-record detail logic measured 5.81 ms before and 0.39 ms after.
- The comparable production JavaScript export grew by 366 bytes, from 2,854,710 to 2,855,076 bytes. Phone frame rate, memory and APK-size measurements remain for native acceptance.

## Verification Recorded

- All 43 automated check scripts, Expo lint, TypeScript and Android JavaScript export passed.
- The complete fake-money sequence matched its expected results in disposable SQLite storage, including the unchanged ₱1,050.25 included-wallet transfer total, excluded-wallet adjustments and the final ₱375.75 Total Budget.
- Category checks saved Food at ₱60, edited it to ₱70 and rejected an extra ₱31 allocation against a ₱100 monthly limit.
- Checks cover editing, deletion/restore, persistence after reopening, clean-database backup restore, interrupted writes, stale approvals and older-schema upgrades.
- Android 16 Expo Go checks confirmed transfer/inclusion effects, the final ₱375.75 total and ₱50.25 Over Limit. Temporary test records were removed by restoring the saved original ledger.
- Six tab-layout captures at 320/411 layout units and 100%/150%/200% text showed readable labels and minimum touch targets.
- Icons were checked in Light, Dark and System with both system appearances.
- The optimized Activity search and Clear Filters passed an Expo Go smoke test without writing financial records.
- The navigation crash was reproduced on the original signed 1.1.0 build 3. A locally signed QA APK passed repeated 100%–200% changes, rapid presses, Back and cold-launch checks with all 58 fictional fixture rows preserved.

## Remaining Android Release Checks

- Build and identify the final release-signed APK, including compilation and operation of the standalone backup adapter.
- Verify in-place upgrade, offline force-stop/relaunch and Android reboot on that APK.
- Restore a populated saved file into a clean Android installation and compare all financial tables and balances.
- Complete large-text transfer-review checks and the final native category-error check. Earlier automation was interrupted or could not establish the result.
- Listen to TalkBack errors, labels and selected-state announcements; finish large-text field focus and last-row scroll reachability.
- Complete the native Cash setup/double-save/duplicate-name trials and the Activity transfer → adjustment → delete → tab change → Undo journey.
- Finish physical-phone animation/touch checks, reduced-motion acceptance and a first-time usability test.

These checks remain open until their actual outcomes are recorded. Local plans, QA screenshots, financial fixtures and signing material are kept outside the public repository.
