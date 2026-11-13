# Bulsa 1.1.0

Updates since version 1.0.0 include the following improvements.

- Export and restore your financial records and custom category and income source lists from Settings.
- Edit or delete individual savings contributions with a review before confirming.
- Add Wallet is now at the top of Wallets.
- Find wallet balance corrections together under Wallets.
- Clearer Wallet: General wording when recording income or expenses.
- Centered review popups keep the previous screen visible.
- Touch and hold an Activity record to select it, or select several records together.
- More accessible Activity filters and easier month navigation.
- A clearer All Wallets This Month spending summary.
- Payment filters appear when useful historical payment choices are available.
- Wallets has its own bottom tab, with an early Transfer Money action and clearer hidden-wallet navigation.
- Transfer setup supports choosing and configuring wallets while retaining the transfer draft, including destinations with a zero starting balance.
- Activity keeps records in saved order across record types, including rapid saves and changes to the device clock.
- Activity filters can be dismissed by tapping outside the popup.
- Edit, delete and balance-adjustment reviews reject stale financial previews and allow refreshed balances before confirmation.
- Restore creates a verified local safety copy before replacing records. The latest safety copy remains discoverable after a device clock change.
- Custom choices migrate into the financial database with rollback and retry protection.
- Upgrade checks cover preservation of version 1 records, wallet identifiers, custom choices, settings and balances.
- Navigation uses the mounted screen’s router after Android font-size changes. Transfer waits for screen readiness and prevents duplicate navigation from rapid taps.

## Verification

The navigation fix was tested at 320 Android layout units on Android 16 using a locally signed QA APK. Repeated 100%–200% text changes, rapid taps, Android Back, on-screen Back and a cold launch at 200% passed. All 58 fixture rows across three databases were preserved.

The 42 automated check scripts, Expo lint, TypeScript and Android JavaScript export passed. Verification of the navigation fix in a newly built APK signed with the release key remains pending.
