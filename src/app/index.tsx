import { PocketButton } from "@/components/pocket-button";
import { PocketScreen } from "@/components/pocket-screen";
import { SummaryCard } from "@/components/summary-card";
import { PocketColors } from "@/constants/pocket";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const MONTHLY_BUDGET = 1000;

export default function Index() {
  const [budget, setBudget] = useState(MONTHLY_BUDGET);
  const spent = MONTHLY_BUDGET - budget;
  const spentPercent = Math.min(100, Math.max(0, (spent / MONTHLY_BUDGET) * 100));

  function spendMoney() {
    setBudget((currentBudget) => currentBudget - 100);
  }

  return (
    <PocketScreen>
      <Text style={styles.brand}>bulsa</Text>
      <Text style={styles.title}>Welcome to Bulsa</Text>
      <Text style={styles.subtitle}>Let’s make room for what matters.</Text>

      <View style={styles.budgetCard}>
        <Text style={styles.budgetLabel}>Monthly spending limit</Text>

        <Text style={styles.budgetLabel}>Left to spend</Text>

        <Text style={styles.amount}>₱{budget.toLocaleString("en-PH")}</Text>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Monthly spending limit used"
          accessibilityValue={{ min: 0, max: 100, now: spentPercent, text: `${spent.toLocaleString("en-PH")} pesos spent` }}
          style={styles.track}
        >
          <View style={[styles.progress, { width: `${spentPercent}%` }]} />
        </View>

        <Text style={styles.budgetLabel}>
          Spent ₱{(MONTHLY_BUDGET - budget).toLocaleString("en-PH")} of ₱
          {MONTHLY_BUDGET.toLocaleString("en-PH")}
        </Text>

        {budget < 0 && (
          <Text accessibilityLiveRegion="polite" style={styles.warning}>
            You’re ₱{Math.abs(budget).toLocaleString("en-PH")} over your monthly
            budget.
          </Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>This month</Text>
      <View style={styles.summaryRow}>
        <SummaryCard label="Income" amount={0} />
        <SummaryCard label="Expenses" amount={MONTHLY_BUDGET - budget} />
      </View>

      <PocketButton title="Spend ₱100" onPress={spendMoney} />

      <PocketButton
        title="Reset budget"
        secondary
        onPress={() => setBudget(MONTHLY_BUDGET)}
      />
    </PocketScreen>
  );
}

const styles = StyleSheet.create({
  brand: { fontSize: 20, fontWeight: "600", color: PocketColors.accent },
  title: { fontSize: 28, fontWeight: "700", color: PocketColors.text },
  subtitle: { fontSize: 16, lineHeight: 24, color: PocketColors.muted },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: PocketColors.text },
  track: { height: 8, borderRadius: 4, backgroundColor: PocketColors.track, overflow: "hidden" },
  progress: { height: "100%", borderRadius: 4, backgroundColor: PocketColors.selected },

  budgetCard: {
    backgroundColor: PocketColors.summary,
    padding: 24,
    borderRadius: 20,
    gap: 12,
  },

  amount: {
    fontSize: 40,
    fontWeight: "700",
    color: PocketColors.onSummary,
  },

  budgetLabel: {
    color: PocketColors.summaryMuted,
    fontSize: 14,
  },

  warning: {
    color: "#F0B2A3",
    fontSize: 16,
    fontWeight: "600",
  },

  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
});
