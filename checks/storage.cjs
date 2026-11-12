const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");
const { createLoader } = require("./load-typescript.cjs");

async function main() {
  fs.mkdirSync(".expo", { recursive: true });
  const folder = fs.mkdtempSync(path.resolve(".expo", "bulsa-storage-check-"));
  const filename = path.join(folder, "check.db");
  let native;
  let openCalls = 0;
  let failOpen = true;
  let failSetup = false;
  let failRead = false;
  const adapter = () => {
    const connection = native;
    return ({
    execAsync: async (sql) => {
      connection.exec(sql);
      if (failSetup && sql.includes("CREATE TABLE")) throw new Error("setup interrupted");
    },
    getFirstAsync: async (sql, ...params) => connection.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql, ...params) => {
      if (failRead) throw new Error("read failed");
      return connection.prepare(sql).all(...params);
    },
    runAsync: async (sql, ...params) => connection.prepare(sql).run(...params),
    closeAsync: async () => { connection.close(); if (native === connection) native = undefined; },
    withTransactionAsync: async (callback) => {
      connection.exec("BEGIN");
      try { await callback(); connection.exec("COMMIT"); }
      catch (error) { connection.exec("ROLLBACK"); throw error; }
    },
  });
  };
  const fresh = () => createLoader({ "expo-sqlite": {
    openDatabaseAsync: async (name) => {
      openCalls++;
      if (failOpen) throw new Error("open failed");
      native = new DatabaseSync(name === "bulsa.db" ? filename : path.join(folder, name));
      return adapter();
    },
  }});
  try {
    let load = fresh();
    let database = load("src/storage/database.ts");
    await assert.rejects(database.openDatabase(), /open failed/);
    failOpen = false;
    const [db, same] = await Promise.all([database.openDatabase(), database.openDatabase()]);
    assert.equal(db, same);
    assert.equal(openCalls, 2, "concurrent callers share retry initialization");
    const store = load("src/storage/transactions.ts");
    assert.equal(typeof store.saveTransaction, "function");
    const record = { id: "check-1", type: "expense", amountCentavos: 18050,
      category: "Food", date: "2026-11-03", paymentMethod: "Cash", note: "O'Brien'); DROP TABLE transactions; --" };
    await store.saveTransaction(record);
    assert.equal(JSON.stringify(await store.getTransactions()), JSON.stringify([record]));
    await assert.rejects(store.saveTransaction(record), /UNIQUE/);
    for (const fields of [
      { amountCentavos: 0 }, { amountCentavos: 1.5 }, { amountCentavos: Infinity },
      { amountCentavos: -1 }, { amountCentavos: Number.MAX_SAFE_INTEGER + 1 },
      { type: "savings" }, { date: "2026-02-30" }, { date: "2026-13-01" },
      { category: " " }, { paymentMethod: "" }, { id: "" },
    ]) await assert.rejects(store.saveTransaction({ ...record, ...fields }));
    failRead = true;
    await assert.rejects(store.getTransactions(), /read failed/);
    failRead = false;
    assert.equal((await store.getTransactions()).length, 1);
    await db.closeAsync();
    load = fresh();
    database = load("src/storage/database.ts");
    const reopened = await database.openDatabase();
    assert.equal(JSON.stringify(await load("src/storage/transactions.ts").getTransactions()), JSON.stringify([record]));
    const income = { ...record, id: "income-check", type: "income", date: "2024-02-29", note: undefined };
    await load("src/storage/transactions.ts").saveTransaction(income);
    const rows = await load("src/storage/transactions.ts").getTransactions();
    assert.equal(rows.length, 2);
    assert.equal(rows[1].id, "income-check");
    assert.equal(rows[1].note, undefined);
    const storeAgain = load("src/storage/transactions.ts");
    assert.equal((await storeAgain.getTransactions("isolated.db")).length, 0);
    await storeAgain.saveTransaction({ ...record, amountCentavos: 123 }, "isolated.db");
    assert.equal((await storeAgain.getTransactions())[0].amountCentavos, 18050);
    assert.equal((await storeAgain.getTransactions("isolated.db"))[0].amountCentavos, 123);
    await (await database.openDatabase("isolated.db")).closeAsync();
    const draft = { ...record, id: "snapshot-check", amountCentavos: 2500 };
    const saving = storeAgain.saveTransaction(draft);
    draft.amountCentavos = -1;
    draft.note = "changed while saving";
    await saving;
    const storedDraft = (await storeAgain.getTransactions()).find((row) => row.id === "snapshot-check");
    assert.equal(storedDraft.amountCentavos, 2500);
    assert.equal(storedDraft.note, record.note);
    await reopened.execAsync("PRAGMA user_version = 5");
    await reopened.closeAsync();
    await assert.rejects(fresh()("src/storage/database.ts").openDatabase(), /newer|version/i);
    if (native) { native.close(); native = undefined; }
    native = new DatabaseSync(filename);
    assert.equal(native.prepare("PRAGMA user_version").get().user_version, 5);
    native.exec("PRAGMA user_version = 0; DROP TABLE transfers; DROP TABLE balance_changes; DROP TABLE transactions; DROP TABLE wallets;");
    native.close(); native = undefined;
    failSetup = true;
    load = fresh(); database = load("src/storage/database.ts");
    await assert.rejects(database.openDatabase(), /setup interrupted/);
    if (native) { native.close(); native = undefined; }
    native = new DatabaseSync(filename);
    assert.equal(native.prepare("PRAGMA user_version").get().user_version, 0);
    assert.equal(native.prepare("SELECT name FROM sqlite_master WHERE name='transactions'").get(), undefined);
    native.close(); native = undefined;
    failSetup = false;
    const retried = await database.openDatabase();
    assert.equal((await retried.getFirstAsync("PRAGMA user_version")).user_version, 4);
    console.log("Storage checks passed: real SQLite persistence, parameter binding, validation, duplicate protection, read failure, initialization retry, concurrency, schema rollback/newer-version protection.");
  } finally {
    if (native) native.close();
    try { fs.rmSync(folder, { recursive: true, force: true }); }
    catch { console.warn(`Test database cleanup deferred: ${folder}`); }
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
