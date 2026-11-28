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

export async function findRestoreSafetyCopy(beforeUri?: string) {
  const files = safetyFiles();
  const boundary = beforeUri ? files.findIndex(file => file.uri === beforeUri) : -1;
  if (beforeUri && boundary < 0) throw new Error('This recovery copy is no longer available. Reopen Backup and Restore.');
  const candidates = files.slice(boundary + 1);
  for (const file of candidates) {
    try {
      const backup = await readRestoreSafetyCopy(file.uri);
      return { uri: file.uri, createdAt: backup.createdAt };
    }
    catch { /* An interrupted older build may have left an incomplete final file. */ }
  }
  if (candidates.length) throw new Error('No readable recovery copy was found. Existing files have been kept.');
  return null;
}

export async function latestRestoreSafetyCopy(beforeUri?: string) {
  return (await findRestoreSafetyCopy(beforeUri))?.uri ?? null;
}

export async function saveRestoreSafetyCopy(backup: FinancialBackup) {
  const json = serializeBackup(backup);
  // Continue the persisted operation sequence even if the device clock moves
  // backward. The last restore must remain discoverable after app restart.
  const previous = safetyFiles()[0];
  const next = Math.max(Date.now(), previous ? sequence(previous) + 1 : 0);
  if (!Number.isSafeInteger(next)) throw new Error('Could not create a new safety copy. Your records were not replaced.');
  const name = `${prefix}${next}-${Math.random().toString(36).slice(2)}`;
  // Pending files are never offered for recovery, even after an interrupted write.
  const file = new File(Paths.document, `${name}.pending`);
  file.create();
  try {
    await file.write(json);
    const verified = await readRestoreSafetyCopy(file.uri);
    if (JSON.stringify(verified) !== json) throw new Error('Could not verify the safety copy. Your records were not replaced.');
    await file.move(new File(Paths.document, `${name}.json`));
    return file.uri;
  } catch (error) {
    try { if (file.exists) file.delete(); } catch { /* Keep the original write/verification error. */ }
    throw error;
  }
}
