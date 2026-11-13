import type { SQLiteDatabase } from 'expo-sqlite';
import { validateCentavos, validateDate } from '../lib/validation';
import { withDatabase } from './database';

export type SavingsGoal = { id: string; title: string; targetCentavos: number };
export type SavingsContribution = { id: string; goalId: string; amountCentavos: number; date: string; note: string };
export type Savings = { goals: SavingsGoal[]; contributions: SavingsContribution[] };

async function readSavings(db: SQLiteDatabase): Promise<Savings> {
  const goals = await db.getAllAsync<SavingsGoal>('SELECT id,title,targetCentavos FROM savings_goals ORDER BY id');
  const contributions = await db.getAllAsync<SavingsContribution>('SELECT id,goalId,amountCentavos,date,note FROM savings_contributions ORDER BY date DESC,id DESC');
  // Read integers individually; SQL SUM can overflow before JavaScript validates it.
  let total = 0;
  for (const contribution of contributions) {
    validateCentavos(contribution.amountCentavos, true);
    total += contribution.amountCentavos;
    if (!Number.isSafeInteger(total)) throw new Error('Savings total exceeds safe integer centavos.');
  }
  return { goals, contributions };
}

export function getSavings(name = 'bulsa.db'): Promise<Savings> {
  return withDatabase(name, readSavings);
}

export async function saveSavingsGoal(goal: SavingsGoal, name = 'bulsa.db'): Promise<void> {
  goal = { ...goal };
  if (![goal.id, goal.title].every(value => typeof value === 'string' && value.trim())) throw new Error('A goal ID and title are required.');
  validateCentavos(goal.targetCentavos, true);
  await withDatabase(name, async db => {
    await db.runAsync('INSERT INTO savings_goals(id,title,targetCentavos) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,targetCentavos=excluded.targetCentavos', goal.id, goal.title, goal.targetCentavos);
    await readSavings(db);
  }, true);
}

export async function recordSavingsContribution(record: SavingsContribution, name = 'bulsa.db'): Promise<void> {
  record = { ...record };
  if (![record.id, record.goalId].every(value => typeof value === 'string' && value.trim())) throw new Error('A contribution ID and goal are required.');
  if (typeof record.note !== 'string') throw new Error('Note must be text.');
  validateCentavos(record.amountCentavos, true);
  validateDate(record.date);
  await withDatabase(name, async db => {
    const goal = await db.getFirstAsync<{ id: string }>('SELECT id FROM savings_goals WHERE id=?', record.goalId);
    if (!goal) throw new Error('Savings goal not found.');
    await db.runAsync('INSERT INTO savings_contributions(id,goalId,amountCentavos,date,note) VALUES(?,?,?,?,?)', record.id, record.goalId, record.amountCentavos, record.date, record.note);
    await readSavings(db);
  }, true);
}

function validateContribution(record: SavingsContribution) {
  if (![record.id, record.goalId].every(value => typeof value === 'string' && value.trim())) throw new Error('A contribution ID and goal are required.');
  if (typeof record.note !== 'string') throw new Error('Note must be text.');
  validateCentavos(record.amountCentavos, true);
  validateDate(record.date);
}

async function requireUnchangedContribution(db: SQLiteDatabase, expected: SavingsContribution) {
  const current = await db.getFirstAsync<SavingsContribution>('SELECT id,goalId,amountCentavos,date,note FROM savings_contributions WHERE id=?', expected.id);
  if (!current || current.goalId !== expected.goalId || current.amountCentavos !== expected.amountCentavos || current.date !== expected.date || current.note !== expected.note) {
    throw new Error('This savings record changed or was deleted. Close this correction and open the current record again.');
  }
}

export async function updateSavingsContribution(record: SavingsContribution, expected: SavingsContribution, name = 'bulsa.db'): Promise<void> {
  record = { ...record }; expected = { ...expected };
  validateContribution(record); validateContribution(expected);
  if (record.id !== expected.id || record.goalId !== expected.goalId) throw new Error('A correction must keep the same savings record and goal.');
  await withDatabase(name, async db => {
    await requireUnchangedContribution(db, expected);
    await db.runAsync('UPDATE savings_contributions SET amountCentavos=?,date=?,note=? WHERE id=?', record.amountCentavos, record.date, record.note, record.id);
    await readSavings(db);
  }, true);
}

export async function deleteSavingsContribution(expected: SavingsContribution, name = 'bulsa.db'): Promise<void> {
  expected = { ...expected };
  validateContribution(expected);
  await withDatabase(name, async db => {
    await requireUnchangedContribution(db, expected);
    await db.runAsync('DELETE FROM savings_contributions WHERE id=?', expected.id);
    await readSavings(db);
  }, true);
}
