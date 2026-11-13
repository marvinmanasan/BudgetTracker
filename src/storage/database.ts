import * as SQLite from "expo-sqlite";
import { legacyActivityOrder } from '../lib/activity';

const activityOrderTriggers = `
          CREATE TRIGGER IF NOT EXISTS activity_transactions_added AFTER INSERT ON transactions BEGIN
            INSERT INTO activity_order(recordType,recordId) SELECT 'transaction',NEW.id WHERE NOT EXISTS(SELECT 1 FROM activity_order WHERE recordType='transaction' AND recordId=NEW.id);
          END;
          CREATE TRIGGER IF NOT EXISTS activity_transfers_added AFTER INSERT ON transfers BEGIN
            INSERT INTO activity_order(recordType,recordId) SELECT 'transfer',NEW.id WHERE NOT EXISTS(SELECT 1 FROM activity_order WHERE recordType='transfer' AND recordId=NEW.id);
          END;
          CREATE TRIGGER IF NOT EXISTS activity_changes_added AFTER INSERT ON balance_changes BEGIN
            INSERT INTO activity_order(recordType,recordId) SELECT 'change',NEW.id WHERE NOT EXISTS(SELECT 1 FROM activity_order WHERE recordType='change' AND recordId=NEW.id);
          END;
          CREATE TRIGGER IF NOT EXISTS activity_transfers_removed AFTER DELETE ON transfers BEGIN
            DELETE FROM activity_order WHERE recordType='transfer' AND recordId=OLD.id;
          END;
          CREATE TRIGGER IF NOT EXISTS activity_changes_removed AFTER DELETE ON balance_changes BEGIN
            DELETE FROM activity_order WHERE recordType='change' AND recordId=OLD.id;
          END;
`;

const databasePromises = new Map<string, Promise<SQLite.SQLiteDatabase>>();

// Share initialization across simultaneous callers. A failed open can be retried.
export function openDatabase(
  name = "bulsa.db",
  legacyChoicesName = name === "bulsa.db" ? "bulsa-choices.db" : undefined,
): Promise<SQLite.SQLiteDatabase> {
  let promise = databasePromises.get(name);
  if (!promise) {
    promise = initializeDatabase(name, legacyChoicesName).catch((error) => {
      databasePromises.delete(name);
      throw error;
    });
    databasePromises.set(name, promise);
  }
  return promise;
}

type LegacyChoice = { id: string; kind: string; name: string; nameKey: string };

async function readLegacyChoices(name: string): Promise<LegacyChoice[]> {
  const legacy = await SQLite.openDatabaseAsync(name);
  try {
    const table = await legacy.getFirstAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='custom_choices'");
    return table ? await legacy.getAllAsync<LegacyChoice>('SELECT id,kind,name,nameKey FROM custom_choices ORDER BY rowid') : [];
  } finally { await legacy.closeAsync(); }
}

async function initializeDatabase(name: string, legacyChoicesName?: string) {
  const db = await SQLite.openDatabaseAsync(name);
  try {
    const versionRow = await db.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version",
    );
    const version = versionRow?.user_version ?? 0;
    if (version > 6) {
      throw new Error(
        "This database uses a newer version. Update Bulsa before opening it.",
      );
    }
    await db.execAsync('PRAGMA foreign_keys = ON');
    if (version < 6) {
      // Read the old independent file without changing or deleting it. Only the
      // main database is written, so table/copy/version changes commit together.
      const choices = version < 5 && legacyChoicesName ? await readLegacyChoices(legacyChoicesName) : [];
      await db.withTransactionAsync(async () => {
        if (version < 5) {
        if (version < 4) {
          if (version < 2) {
            if (version === 0) {
              await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions(
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
      amountCentavos INTEGER NOT NULL CHECK (amountCentavos > 0),
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      paymentMethod TEXT NOT NULL,
      note TEXT);
      `);
            }
            await db.execAsync(`
            CREATE TABLE IF NOT EXISTS wallets (
              id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL,
              nameKey TEXT NOT NULL UNIQUE,
              included INTEGER NOT NULL CHECK(included IN (0,1)),
              hidden INTEGER NOT NULL CHECK(hidden IN (0,1)),
              createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            ALTER TABLE transactions ADD COLUMN walletId TEXT REFERENCES wallets(id) ON DELETE RESTRICT;
            CREATE TABLE IF NOT EXISTS balance_changes (
              id TEXT PRIMARY KEY NOT NULL, walletId TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
              kind TEXT NOT NULL CHECK(kind IN ('opening','adjustment')),
              deltaCentavos INTEGER NOT NULL, date TEXT NOT NULL,
              reason TEXT NOT NULL, targetCentavos INTEGER,
              createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE UNIQUE INDEX IF NOT EXISTS one_opening_per_wallet ON balance_changes(walletId) WHERE kind='opening';
            CREATE TABLE IF NOT EXISTS transfers (
              id TEXT PRIMARY KEY NOT NULL,
              fromWalletId TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
              toWalletId TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
              amountCentavos INTEGER NOT NULL CHECK(amountCentavos > 0),
              date TEXT NOT NULL, note TEXT NOT NULL,
              createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CHECK(fromWalletId <> toWalletId)
            );
            CREATE INDEX IF NOT EXISTS transaction_wallet ON transactions(walletId);
            CREATE INDEX IF NOT EXISTS balance_wallet ON balance_changes(walletId);
            CREATE INDEX IF NOT EXISTS transfer_source ON transfers(fromWalletId);
            CREATE INDEX IF NOT EXISTS transfer_destination ON transfers(toWalletId);
          `);
            for (const [id, name] of [['gcash','GCash'],['gotyme','GoTyme'],['maribank','MariBank'],['maya','Maya'],['cash','Cash']]) {
              await db.runAsync('INSERT INTO wallets(id,name,nameKey,included,hidden) VALUES(?,?,?,1,0)', 'wallet-' + id, name, name.toLowerCase());
            }
          }
          await db.execAsync(`
            CREATE TABLE IF NOT EXISTS monthly_limits (
              month TEXT PRIMARY KEY NOT NULL,
              limitCentavos INTEGER NOT NULL CHECK (
                typeof(limitCentavos) = 'integer' AND
                limitCentavos >= 0 AND limitCentavos <= 9007199254740991
              )
            );
            CREATE TABLE IF NOT EXISTS category_allocations (
              month TEXT NOT NULL REFERENCES monthly_limits(month) ON DELETE RESTRICT,
              category TEXT NOT NULL CHECK(length(trim(category)) > 0),
              limitCentavos INTEGER NOT NULL CHECK(typeof(limitCentavos) = 'integer' AND limitCentavos >= 0 AND limitCentavos <= 9007199254740991),
              PRIMARY KEY(month, category)
            );
            CREATE TABLE IF NOT EXISTS savings_goals (
              id TEXT PRIMARY KEY NOT NULL,
              title TEXT NOT NULL CHECK(length(trim(title)) > 0),
              targetCentavos INTEGER NOT NULL CHECK(typeof(targetCentavos) = 'integer' AND targetCentavos > 0 AND targetCentavos <= 9007199254740991)
            );
            CREATE TABLE IF NOT EXISTS savings_contributions (
              id TEXT PRIMARY KEY NOT NULL,
              goalId TEXT NOT NULL REFERENCES savings_goals(id) ON DELETE RESTRICT,
              amountCentavos INTEGER NOT NULL CHECK(typeof(amountCentavos) = 'integer' AND amountCentavos > 0 AND amountCentavos <= 9007199254740991),
              date TEXT NOT NULL,
              note TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS savings_goal_history ON savings_contributions(goalId,date);
          `);
        }
        await db.execAsync(`CREATE TABLE IF NOT EXISTS custom_choices (
          id TEXT PRIMARY KEY NOT NULL,
          kind TEXT NOT NULL CHECK(kind IN ('expense','income')),
          name TEXT NOT NULL,
          nameKey TEXT NOT NULL,
          UNIQUE(kind,nameKey)
        );`);
        for (const choice of choices) {
          await db.runAsync('INSERT INTO custom_choices(id,kind,name,nameKey) VALUES(?,?,?,?)', choice.id, choice.kind, choice.name, choice.nameKey);
        }
        // Schema version is the one-time migration marker. Restoring an empty
        // list later cannot accidentally import the retained legacy file again.
        await db.execAsync('PRAGMA user_version = 5');
        }
        await db.execAsync(`CREATE TABLE activity_order (
          sequence INTEGER PRIMARY KEY AUTOINCREMENT CHECK(sequence > 0 AND sequence <= 9007199254740991),
          recordType TEXT NOT NULL CHECK(recordType IN ('transaction','transfer','change')),
          recordId TEXT NOT NULL,
          UNIQUE(recordType,recordId)
        );`);
        const historical = legacyActivityOrder({
          transactions: await db.getAllAsync<{ id: string }>('SELECT id FROM transactions ORDER BY rowid'),
          transfers: await db.getAllAsync<{ id: string; createdAt: string }>('SELECT id,createdAt FROM transfers ORDER BY rowid'),
          changes: await db.getAllAsync<{ id: string; createdAt: string }>('SELECT id,createdAt FROM balance_changes ORDER BY rowid'),
        });
        for (const row of historical) await db.runAsync('INSERT INTO activity_order(sequence,recordType,recordId) VALUES(?,?,?)', row.sequence, row.recordType, row.recordId);
        // Transaction identities keep a deleted record's position for Undo.
        // Non-Undo types drop identities when removed, so a fresh starting
        // balance after reset gets a new position. Edits and clocks do not move rows.
        await db.execAsync(activityOrderTriggers);
        await db.execAsync('PRAGMA user_version = 6');
      });
    }
    // Some local unreleased schema6 builds predate the non-Undo delete triggers.
    // Idempotent trigger installation repairs that draft without rewriting rows.
    if (version === 6) await db.withTransactionAsync(() => db.execAsync(activityOrderTriggers));
    return db;
  } catch (error) {
    await db.closeAsync().catch(() => {});
    throw error;
  }
}

// Every storage operation uses this queue. No unrelated query can enter a write transaction.
const operations = new Map<string, Promise<unknown>>();
export function withDatabase<T>(name: string, work: (db: SQLite.SQLiteDatabase) => Promise<T>, write = false): Promise<T> {
  const previous = operations.get(name) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    const db = await openDatabase(name);
    if (!write) return work(db);
    let result!: T;
    await db.withTransactionAsync(async () => { result = await work(db); });
    return result;
  });
  operations.set(name, next);
  void next.finally(() => { if (operations.get(name) === next) operations.delete(name); }).catch(() => {});
  return next;
}
