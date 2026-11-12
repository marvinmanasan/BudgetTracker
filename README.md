# Bulsa

A little room for what matters.

Bulsa is a mobile budget tracker for recording money, managing wallets and planning spending. Entries are added manually and saved on the device.

## Main features

- Wallets with starting balances, inclusion in Total Budget, renaming and hiding/restoring.
- Expense and income records with categories, dates, wallet assignment and optional notes.
- Transaction editing, deletion and Undo.
- Activity search, filters and record details.
- Transfers between wallets and balance corrections.
- Monthly spending limits, category limits and Everything Else.
- One savings goal, savings records and progress.
- Display name and Light, Dark or System appearance.

## Download

[Download Bulsa 1.0.0 for Android](https://github.com/marvinmanasan/BudgetTracker/releases/download/v1.0.0/Bulsa-1.0.0.apk).

Open the APK on your Android phone and follow the installation prompts. If Bulsa is already installed, install it as an update to keep your saved entries.

## How to Use

1. Tap **Set Up Wallets**, or open **View Wallets ›** from **Overview**. Set starting balances for the wallets you use.
2. Choose which wallets have **Include in Total Budget** switched on.
3. On **Overview**, tap **+ Add Expense**. Enter the amount, category, wallet and date, then tap **Save Expense**. Choose **Income** in the same form to record income.
4. Open **Activity** to search, filter or correct saved transactions.
5. Open **Budgets** to set spending limits. Use **Set Savings Goal** to start tracking savings separately.

Dates use **MM-DD-YYYY**. Month fields use **MM-YYYY**.

**Total Budget** is General plus included wallet balances. A transaction saved with **Not Specified** affects General. A monthly spending limit is a plan and does not add money. Savings records track progress separately from wallet money.

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

Version **1.0.0**. See the [release notes](RELEASE_NOTES.md) for the feature summary.

Bulsa is a beginner portfolio project developed through manual coding and AI-assisted development.
