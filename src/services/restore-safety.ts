import { Directory, File, Paths } from 'expo-file-system';
import { parseBackup, serializeBackup, type FinancialBackup } from '../lib/backup';

const prefix = 'Bulsa-Before-Restore-';

function sequence(file: File) {
  const value = Number(file.name.slice(prefix.length).split('-')[0]);
  return Number.isSafeInteger(value) && value >= 0 ? value : -1;
}

function safetyFiles() {
  return new Directory(Paths.document).list()
    .filter((entry): entry is File => entry instanceof File && entry.name.startsWith(prefix) && entry.name.endsWith('.json') && sequence(entry) >= 0)
    .sort((a, b) => sequence(b) - sequence(a));
}

export async function readRestoreSafetyCopy(uri: string) {
  return parseBackup(await new File(uri).text());
}

export async function latestRestoreSafetyCopy() {
  return safetyFiles()[0]?.uri ?? null;
}

export async function saveRestoreSafetyCopy(backup: FinancialBackup) {
  const json = serializeBackup(backup);
  // Continue the persisted operation sequence even if the device clock moves
  // backward. The last restore must remain discoverable after app restart.
  const previous = safetyFiles()[0];
  const next = Math.max(Date.now(), previous ? sequence(previous) + 1 : 0);
  if (!Number.isSafeInteger(next)) throw new Error('Could not create a new safety copy. Your records were not replaced.');
  const file = new File(Paths.document, `${prefix}${next}-${Math.random().toString(36).slice(2)}.json`);
  file.create();
  try {
    await file.write(json);
    const verified = await readRestoreSafetyCopy(file.uri);
    if (JSON.stringify(verified) !== json) throw new Error('Could not verify the safety copy. Your records were not replaced.');
    return file.uri;
  } catch (error) {
    if (file.exists) file.delete();
    throw error;
  }
}
