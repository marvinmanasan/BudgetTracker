# Pocket — Day 1 checkpoint

## What works
- Overview practice budget: spend ₱100, reset, format pesos, show overspending.
- Overview, Budgets and Activity tabs share the Pocket dark palette.
- Reusable buttons and a scrolling screen wrapper that respects the top safe area.
- Preview APK build profile in eas.json. No cloud build has been started.

## What is still practice
- Budget lives in component state; restarting the app resets it.
- Spending does not create transaction records yet.
- Budgets and Activity are placeholders. Light mode, category budgets, forms and storage are upcoming.
- Existing Expo icon assets and starter Explore files are retained; Explore is hidden from the tabs.

## Where to learn
- src/app/index.tsx: state, functions, calculated values and conditional rendering.
- src/components/pocket-button.tsx: props let one button component serve multiple actions.
- src/components/pocket-screen.tsx: shared scrolling and safe-area layout.
- src/components/pocket-tabs.tsx: Expo Router connects filenames to tabs.
- src/constants/pocket.ts: shared color values.

## Before an APK build
Sign in to Expo, configure this project with EAS, choose a unique Android package identifier, and then build the preview profile. The profile alone is not an APK. Test the installed preview on a physical Android device.

## Next session
Build the full Figma-inspired Overview and reusable summary cards. Keep transaction entry for Day 3.
