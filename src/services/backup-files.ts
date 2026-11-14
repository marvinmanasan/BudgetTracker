import { File, Paths } from 'expo-file-system';
import { requireOptionalNativeModule } from 'expo';
import { StorageAccessFramework as SAF } from 'expo-file-system/legacy';
import { displayDate } from '../lib/display-date';
import { localDate } from '../lib/validation';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { BACKUP_MAX_BYTES, parseBackup, serializeBackup, type FinancialBackup } from '../lib/backup';

const documentPicker = Platform.OS === 'android'
  ? requireOptionalNativeModule<{ chooseFile(name: string): Promise<string | null> }>('BulsaBackupDocument')
  : null;
export const savesToFolder = Platform.OS === 'android' && !documentPicker;

export async function saveFinancialBackup(backup: FinancialBackup): Promise<boolean> {
  if (Platform.OS !== 'android') throw new Error('Saving to a device location is available on Android.');
  const json = serializeBackup(backup);
  const name = `Bulsa-Backup-${displayDate(localDate())}`;
  let uri: string | null;
  if (documentPicker) {
    uri = await documentPicker.chooseFile(name + '.json');
    if (!uri) return false;
  } else {
    // Expo Go cannot load local native modules. Its folder picker grants write access.
    const folder = await SAF.requestDirectoryPermissionsAsync(SAF.getUriForDirectoryInRoot('Download'));
    if (!folder.granted) return false;
    uri = await SAF.createFileAsync(folder.directoryUri, name, 'application/json');
  }
  await new File(uri).write(json);
  return true;
}

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
