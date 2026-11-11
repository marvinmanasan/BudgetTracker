import * as SQLite from 'expo-sqlite';
import { validateChoice, type ChoiceKind, type CustomChoice } from '../lib/choices';

// Independent file. This module never opens or migrates the financial database.
let database: Promise<SQLite.SQLiteDatabase> | undefined;
function openChoices(): Promise<SQLite.SQLiteDatabase> {
  if (!database) {
    database = (async () => {
      const db = await SQLite.openDatabaseAsync('bulsa-choices.db');
      try {
        await db.execAsync(`CREATE TABLE IF NOT EXISTS custom_choices (
          id TEXT PRIMARY KEY NOT NULL,
          kind TEXT NOT NULL CHECK(kind IN ('expense','income')),
          name TEXT NOT NULL,
          nameKey TEXT NOT NULL,
          UNIQUE(kind,nameKey)
        );`);
        return db;
      } catch (error) { await db.closeAsync().catch(() => {}); throw error; }
    })().catch(error => { database = undefined; throw error; });
  }
  return database;
}

export async function getChoices(kind: ChoiceKind): Promise<CustomChoice[]> {
  const db = await openChoices();
  return db.getAllAsync<CustomChoice>('SELECT id,kind,name FROM custom_choices WHERE kind=? ORDER BY nameKey,id', kind);
}

function choiceError(error: unknown): never {
  if (error instanceof Error && /UNIQUE constraint/i.test(error.message)) throw new Error('That choice already exists.');
  throw error;
}

export async function addChoice(choice: CustomChoice): Promise<void> {
  choice = { ...choice };
  const key = validateChoice(choice.kind, choice.name);
  if (typeof choice.id !== 'string' || !choice.id.trim()) throw new Error('A choice ID is required.');
  const db = await openChoices();
  try { await db.runAsync('INSERT INTO custom_choices(id,kind,name,nameKey) VALUES(?,?,?,?)', choice.id, choice.kind, choice.name, key); }
  catch (error) { choiceError(error); }
}

export async function renameChoice(id: string, kind: ChoiceKind, name: string): Promise<void> {
  const key = validateChoice(kind, name);
  const db = await openChoices();
  try {
    const result = await db.runAsync('UPDATE custom_choices SET name=?,nameKey=? WHERE id=? AND kind=?', name, key, id, kind);
    if (!result.changes) throw new Error('This choice no longer exists.');
  } catch (error) { choiceError(error); }
}

export async function removeChoice(id: string, kind: ChoiceKind): Promise<void> {
  const db = await openChoices();
  await db.runAsync('DELETE FROM custom_choices WHERE id=? AND kind=?', id, kind);
}
