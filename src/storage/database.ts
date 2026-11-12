import * as SQLite from "expo-sqlite";

const databasePromises = new Map<string, Promise<SQLite.SQLiteDatabase>>();

// Share initialization across simultaneous callers. A failed open can be retried.
export function openDatabase(
  name = "bulsa.db",
): Promise<SQLite.SQLiteDatabase> {
  let promise = databasePromises.get(name);
  if (!promise) {
    promise = initializeDatabase(name).catch((error) => {
      databasePromises.delete(name);
      throw error;
    });
    databasePromises.set(name, promise);
  }
  return promise;
}

async function initializeDatabase(name: string) {
  const db = await SQLite.openDatabaseAsync(name);
  try {
    const versionRow = await db.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version",
    );
    const version = versionRow?.user_version ?? 0;
    if (version > 4) {
      throw new Error(
        "This database uses a newer version. Update Bulsa before opening it.",
      );
    }
    await db.execAsync('PRAGMA foreign_keys = ON');
    if (version < 4) {
      await db.withTransactionAsync(async () => {
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
          PRAGMA user_version = 4;
        `);
      });
    }
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
