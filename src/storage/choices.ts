import { withDatabase } from './database';
import { validateChoice, type ChoiceKind, type CustomChoice } from '../lib/choices';

// Custom choices share the financial queue and backup transaction after schema5.
export function getChoices(kind: ChoiceKind, name = 'bulsa.db'): Promise<CustomChoice[]> {
  return withDatabase(name, db => db.getAllAsync<CustomChoice>('SELECT id,kind,name FROM custom_choices WHERE kind=? ORDER BY nameKey,id', kind));
}

function choiceError(error: unknown): never {
  if (error instanceof Error && /UNIQUE constraint/i.test(error.message)) throw new Error('That choice already exists.');
  throw error;
}

export async function addChoice(choice: CustomChoice, name = 'bulsa.db'): Promise<void> {
  choice = { ...choice };
  const key = validateChoice(choice.kind, choice.name);
  if (typeof choice.id !== 'string' || !choice.id.trim()) throw new Error('A choice ID is required.');
  try { await withDatabase(name, db => db.runAsync('INSERT INTO custom_choices(id,kind,name,nameKey) VALUES(?,?,?,?)', choice.id, choice.kind, choice.name, key), true); }
  catch (error) { choiceError(error); }
}

export async function renameChoice(id: string, kind: ChoiceKind, name: string, databaseName = 'bulsa.db'): Promise<void> {
  const key = validateChoice(kind, name);
  try { await withDatabase(databaseName, async db => {
    const result = await db.runAsync('UPDATE custom_choices SET name=?,nameKey=? WHERE id=? AND kind=?', name, key, id, kind);
    if (!result.changes) throw new Error('This choice no longer exists.');
  }, true); } catch (error) { choiceError(error); }
}

export async function removeChoice(id: string, kind: ChoiceKind, name = 'bulsa.db'): Promise<void> {
  await withDatabase(name, db => db.runAsync('DELETE FROM custom_choices WHERE id=? AND kind=?', id, kind), true);
}
