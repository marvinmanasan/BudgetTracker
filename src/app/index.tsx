import { PocketButton } from "@/components/pocket-button";
import { PocketScreen } from "@/components/pocket-screen";
import { PocketColors } from "@/constants/pocket";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const MONTHLY_BUDGET = 1000;

export default function Index() {
  const [budget, setBudget] = useState(MONTHLY_BUDGET);

  function spendMoney() {
    setBudget((currentBudget) => currentBudget - 100);
  }

  return (
    <PocketScreen>
      <Text style={styles.brand}>pocket</Text>
      <Text style={styles.title}>Welcome to Pocket</Text>
      <Text style={styles.budgetLabel}>Let’s make room for what matters.</Text>

      <View style={styles.budgetCard}>
        <Text style={styles.budgetLabel}>Monthly budget</Text>

        <Text style={styles.budgetLabel}>Left to spend</Text>

        <Text style={styles.amount}>₱{budget.toLocaleString("en-PH")}</Text>

        <Text style={styles.budgetLabel}>
          Spent ₱{(MONTHLY_BUDGET - budget).toLocaleString("en-PH")} of ₱
          {MONTHLY_BUDGET.toLocaleString("en-PH")}
        </Text>

        {budget < 0 && (
          <Text style={styles.warning}>
            You’re ₱{Math.abs(budget).toLocaleString("en-PH")} over your monthly
            budget.
          </Text>
        )}
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
  title: { fontSize: 30, fontWeight: "600", color: PocketColors.text },

  budgetCard: {
    backgroundColor: PocketColors.surface,
    padding: 24,
    borderRadius: 20,
    gap: 12,
  },

  amount: {
    fontSize: 40,
    fontWeight: "700",
    color: PocketColors.text,
  },

  budgetLabel: {
    color: PocketColors.muted,
    fontSize: 18,
  },

  warning: {
    color: PocketColors.warning,
    fontSize: 16,
    fontWeight: "600",
  },
});
