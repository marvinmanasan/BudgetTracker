import type { Ledger } from '../types/wallet';

export type AppearanceChoice = 'light' | 'dark' | 'system';
export type Preferences = { displayName: string; appearance: AppearanceChoice; onboardingComplete: boolean };
export const DEFAULT_PREFERENCES: Preferences = { displayName: '', appearance: 'light', onboardingComplete: false };

export function resolveAppearance(choice: AppearanceChoice, system: string | null | undefined): 'light' | 'dark' {
  return choice === 'system' ? (system === 'dark' ? 'dark' : 'light') : choice;
}

export function needsIntroduction(complete: boolean, data: Ledger): boolean {
  return !complete && data.transactions.length === 0 && data.changes.length === 0 && data.transfers.length === 0;
}

export function validatePreferences(value: Preferences): void {
  if (typeof value.displayName !== 'string' || value.displayName.length > 60) throw new Error('Use a display name of 60 characters or fewer.');
  if (!['light', 'dark', 'system'].includes(value.appearance)) throw new Error('Choose Light, Dark, or System.');
  if (typeof value.onboardingComplete !== 'boolean') throw new Error('Invalid introduction setting.');
}
