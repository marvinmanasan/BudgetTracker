import * as SQLite from 'expo-sqlite';
import { DEFAULT_PREFERENCES, validatePreferences, type Preferences } from '../lib/preferences';

// Preferences stay separate from money, migrations and financial resets.
const databases = new Map<string, Promise<SQLite.SQLiteDatabase>>();
const operations = new Map<string, Promise<unknown>>();
function open(name: string) {
  let pending = databases.get(name);
  if (!pending) {
    pending = (async () => {
      const db = await SQLite.openDatabaseAsync(name);
      try {
        const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
        if ((version?.user_version ?? 0) > 1) throw new Error('Update Bulsa before reading these settings.');
        await db.withTransactionAsync(async () => {
          await db.execAsync('CREATE TABLE IF NOT EXISTS preferences(id INTEGER PRIMARY KEY CHECK(id=1),value TEXT NOT NULL); PRAGMA user_version=1;');
        });
        return db;
      } catch (cause) { await db.closeAsync().catch(() => {}); throw cause; }
    })().catch(cause => { databases.delete(name); throw cause; });
    databases.set(name, pending);
  }
  return pending;
}
function queued<T>(name: string, work: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
  const next = (operations.get(name) ?? Promise.resolve()).catch(() => {}).then(async () => work(await open(name)));
  operations.set(name, next);
  void next.finally(() => { if (operations.get(name) === next) operations.delete(name); }).catch(() => {});
  return next;
}
async function read(db: SQLite.SQLiteDatabase): Promise<Preferences> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM preferences WHERE id=1');
  if (!row) return { ...DEFAULT_PREFERENCES };
  const value = JSON.parse(row.value) as Preferences;
  if (!value || typeof value !== 'object') throw new Error('Could not read saved settings.');
  validatePreferences(value);
  return value;
}
export function getPreferences(name = 'bulsa-settings.db') { return queued(name, read); }

export async function updatePreferences(patch: Partial<Preferences>, name = 'bulsa-settings.db'): Promise<Preferences> {
  if (!patch || typeof patch !== 'object' || Object.keys(patch).some(key => key !== 'walletOrder' && !Object.hasOwn(DEFAULT_PREFERENCES, key))) throw new Error('Invalid settings update.');
  patch = { ...patch };
  return queued(name, async db => {
    let next!: Preferences;
    await db.withTransactionAsync(async () => {
      next = { ...await read(db), ...patch };
      validatePreferences(next);
      await db.runAsync('INSERT INTO preferences(id,value) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value', JSON.stringify(next));
    });
    return next;
  });
}
