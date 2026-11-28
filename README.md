# Bulsa

A little room for what matters.

Bulsa is a mobile budget tracker for recording money, managing wallets and planning spending. Entries are added manually and saved on the device.

## Main features

- Wallets with starting balances, inclusion in Total Budget, renaming and hiding/restoring.
- Expense and income records with categories, dates, wallet assignment and optional notes.
- Transaction editing, deletion and Undo.
- Activity search, filters and record details.
- Transfers between wallets and balance corrections.
- Monthly spending limits, category limits and Everything Else; custom-date spending plans with review, editing and deletion.
- One savings goal with optional deadline, editable savings records, progress and confirmed goal/history deletion.
- Daily, weekly, monthly and yearly Income/Expenses summaries, with an inline spending breakdown.
- Save financial backups to a chosen device location, share them, and restore with a replacement preview and safety copy.
- Cash-first wallet ordering with drag-to-reorder and a shared order across wallet pickers.
- Display name and Light, Dark or System appearance.

## Download

The latest source is **1.2.2**, prepared for Android build **7**, with refreshed Wallets and safe Savings goal deletion. **A 1.2.2 APK has not been built yet.** Read the [patch notes and verification limits](RELEASE_NOTES.md).

The latest downloadable APK remains **1.2.1, Android build 6** and does not include the new 1.2.2 interface changes.

[Download Bulsa 1.2.1 for Android](https://github.com/marvinmanasan/BudgetTracker/releases/download/v1.2.1/Bulsa-1.2.1.apk).

Open the APK on your Android phone and follow the installation prompts. If Bulsa is already installed, install it as an update to keep your saved entries.

## How to Use

1. Tap **Set Up Wallets**, or tap the **Wallets** tab. Set starting balances for the wallets you use. **Add Wallet** and **Transfer Money Between Wallets** are at the top of the wallet list.
2. Open a wallet's details to change **Include in Total Budget**. The list shows Included/Excluded badges. **Set Balance** opens focused starting-balance setup.
3. On **Overview**, tap **Add Expense** or **Add Income**. Enter the amount, wallet, category/source and date, then review and confirm the expense, or save the income.
4. Open **Activity** to search, filter or correct saved transactions.
5. Open **Budgets** to set spending limits. Use **Set Savings Goal** to start tracking savings separately. **Manage Goal** at the top right offers Edit and Delete. Deleting a goal also deletes its savings history after confirmation; wallet money is unchanged. **Savings History** supports individual record corrections/deletion.
6. Use **Wallets → Arrange** to drag wallets into your preferred order. Cash stays first. Balance corrections are also available under Wallets.
7. Open **Settings → Your Records → Backup and Restore** to save, share or restore financial records. Expo Go asks for a folder inside Downloads. Keep backup files private because they contain your financial records.

Manual dates use **MM-DD-YYYY**. Overview summaries use written month names, such as **November 1–30, 2026**.

**Total Budget** is General plus included wallet balances. The form shows **Wallet: General** when no specific wallet is selected. That entry affects General. A monthly spending limit is a plan and does not add money. Savings records track progress separately from wallet money.

Read the [full user guide](docs/user-guide.md) and [feature list](docs/features.md).

## Tech stack

- **Expo SDK 58:** tools for developing and building the app.
- **React Native and React:** the mobile interface.
- **TypeScript:** JavaScript with type checking.
- **Expo Router:** navigation between screens.
- **Expo SQLite:** local storage on the device.
- **npm:** installs the project dependencies.

## Run locally

You need Git, a supported Node.js LTS installation with npm, and an Android runtime compatible with Expo SDK 58. The project checks require Node.js 22.13 or newer.

1. Clone this repository and open its folder in a terminal.
2. Install the locked dependencies:

   ```sh
   npm ci
   ```

3. Start the development server:

   ```sh
   npx expo start
   ```

4. Open the project in your compatible Android development build. Follow the [Expo development-build guide](https://docs.expo.dev/develop/development-builds/introduction/) to set up your own build.

### Environment values

The app currently requires no application environment variables or API keys. `.env.example` is intentionally empty. No environment values need to be copied to run the local features.

For your own cloud build, use your own Expo account and link your own Expo project following the [Expo build setup guide](https://docs.expo.dev/build/setup/). Configure your own app identity and signing credentials through Expo's tooling.

## Version

Source version **1.2.2**, prepared Android build **7**. Latest published APK: **1.2.1 / build 6**. See the [release notes](RELEASE_NOTES.md).

## Build an Android APK

This project already has a `preview` profile in `eas.json` with `android.buildType: "apk"`. It builds an installable app with bundled JavaScript, so the resulting APK does not need Metro or Expo Go. See [Expo's APK guide](https://docs.expo.dev/build-reference/apk/).

1. Open a terminal in your project folder and get the published source:

   ```sh
   git switch main
   git pull --ff-only origin main
   npm ci
   ```

2. Check the app before building:

   ```sh
   npm test
   npm run lint
   npx tsc --noEmit
   ```

3. Check your Expo account:

   ```sh
   npx eas-cli@latest whoami
   ```

   If needed, sign in using `npx eas-cli@latest login`. For this existing Bulsa project, use its authorized Expo account and existing Android signing credentials so the APK can update installed copies. Fork owners should follow the [Expo setup guide](https://docs.expo.dev/build/setup/) for their own project identity and credentials.

4. Start the cloud build:

   ```sh
   npx eas-cli@latest build --platform android --profile preview
   ```

   `--platform android` selects Android; `--profile preview` selects the existing APK configuration. Use the existing keystore for Bulsa. Keep `com.marvinmanasan.bulsa` and its signing key unchanged when making an update for existing users.

5. Open the build URL printed in the terminal. Wait for **Finished**, download the APK and install it as an update. Test offline launch, saved records after restart, Wallets and Savings before publishing the download.

Version 1.2.2/build 7 is already prepared in `app.json`; package metadata matches. Before a later release, increase `android.versionCode` and update the user-facing version consistently. This project uses local version management (`eas.json`), so do not change that setting casually. See [Expo version management](https://docs.expo.dev/build-reference/app-versions/).

Bulsa is a beginner portfolio project developed through manual coding and AI-assisted development.
