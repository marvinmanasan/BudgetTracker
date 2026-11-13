import { Directory, File, Paths } from 'expo-file-system';
import { parseBackup, serializeBackup, type FinancialBackup } from '../lib/backup';

const prefix = 'Bulsa-Before-Restore-';

export async function readRestoreSafetyCopy(uri: string) {
  return parseBackup(await new File(uri).text());
}

export async function latestRestoreSafetyCopy() {
  const files = new Directory(Paths.document).list()
    .filter((entry): entry is File => entry instanceof File && entry.name.startsWith(prefix) && entry.name.endsWith('.json'))
    .sort((a, b) => b.name.localeCompare(a.name));
  return files[0]?.uri ?? null;
}

export async function saveRestoreSafetyCopy(backup: FinancialBackup) {
  const json = serializeBackup(backup);
  const file = new File(Paths.document, `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
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
