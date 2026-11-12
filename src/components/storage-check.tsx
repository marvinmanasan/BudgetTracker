import type { BulsaColors } from '../constants/pocket';
import { useBulsaStyles } from '../hooks/use-bulsa-theme';
import { useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { formatCentavos } from "../lib/money";
import { displayDate } from "../lib/display-date";
import { getTransactions, saveTransaction } from "../storage/transactions";
import type { Transaction } from "../types/transaction";
import { PocketButton } from "./pocket-button";

// Dedicated database: fictional checks cannot pollute future real transaction totals.
const CHECK_DATABASE = "bulsa-day3-check.db";
const EXAMPLE: Transaction = {
  id: "day3-storage-example", type: "expense", amountCentavos: 18050,
  category: "Food", date: "2026-11-03", paymentMethod: "Cash", note: "Day 3 fictional check",
};

export function StorageCheck() {
  const styles = useBulsaStyles(createStyles);
  const [records, setRecords] = useState<Transaction[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  async function run(save: boolean) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      let existing = await getTransactions(CHECK_DATABASE);
      if (save && !existing.some((record) => record.id === EXAMPLE.id)) {
        await saveTransaction(EXAMPLE, CHECK_DATABASE);
        existing = await getTransactions(CHECK_DATABASE);
      }
      setRecords(existing);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Storage check failed. Try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  if (!__DEV__ || Platform.OS === "web") return null;
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Day 3 · Storage Check</Text>
      <Text style={styles.body}>Fictional data in a separate check database. Your production entries are unchanged.</Text>
      <Text accessibilityLiveRegion="polite" style={styles.body}>
        {busy ? "Checking storage…" : records === null ? "Not checked yet." : `${records.length} saved check record(s).`}
      </Text>
      {records?.map((record) => <Text key={record.id} style={styles.body}>{record.id} · {formatCentavos(record.amountCentavos)} · {displayDate(record.date)}</Text>)}
      {error && <Text accessibilityLiveRegion="polite" style={styles.error}>Check failed: {error}. Previous results, if shown, may be stale. Use Read / Retry.</Text>}
      {!busy && <>
        <PocketButton title="Save Example Once" onPress={() => void run(true)} />
        <PocketButton title="Read / Retry" secondary onPress={() => void run(false)} />
      </>}
    </View>
  );
}

const createStyles = (PocketColors: BulsaColors) => StyleSheet.create({
  panel: { padding: 16, borderRadius: 16, backgroundColor: PocketColors.surface, gap: 12 },
  heading: { color: PocketColors.text, fontSize: 18, fontWeight: "600" },
  body: { color: PocketColors.muted, fontSize: 14, lineHeight: 21 },
  error: { color: PocketColors.warning, fontSize: 14, lineHeight: 21 },
});
