import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { BACKUP_MAX_BYTES, parseBackup, serializeBackup, type FinancialBackup } from '../lib/backup';

export async function shareFinancialBackup(backup: FinancialBackup) {
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) throw new Error('Backup sharing is available in the Android app.');
  const json = serializeBackup(backup);
  const file = new File(Paths.cache, `Bulsa-Backup-${Date.now()}.json`);
  file.create();
  await file.write(json);
  if (file.size > BACKUP_MAX_BYTES) {
    file.delete();
    throw new Error('This backup exceeds the supported 10 MB size. Your records were not changed.');
  }
  // Android can return from its chooser before the receiving app finishes
  // reading. Keep the exported cache file available; the OS may clear it later.
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save Bulsa Backup', UTI: 'public.json' });
}

export async function pickFinancialBackup(): Promise<FinancialBackup | null> {
  if (Platform.OS === 'web') throw new Error('Restore is available in the Android app.');
  // The same FileSystem module owns the native picker and its scoped URI grant.
  // A separate DocumentPicker cache copy can land outside Expo Go's sandbox.
  const result = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', 'application/octet-stream'], multipleFiles: false });
  if (result.canceled) return null;
  const file = result.result;
  if (file.size > BACKUP_MAX_BYTES) throw new Error('Choose a backup smaller than 10 MB.');
  // On Android this is the user's original SAF document. Read only: do not
  // delete it after parsing or after an invalid-file error.
  return parseBackup(await file.text());
}
