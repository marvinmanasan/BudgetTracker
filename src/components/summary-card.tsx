import { PocketColors } from "@/constants/pocket";
import { StyleSheet, Text, View } from "react-native";

type SummaryCardProps = {
  label: string;
  amount: number;
};

export function SummaryCard({ label, amount }: SummaryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.amount}>₱{amount.toLocaleString("en-PH")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 0, backgroundColor: PocketColors.surface, borderRadius: 20, padding: 16, gap: 8 },
  label: { color: PocketColors.muted, fontSize: 14 },
  amount: { color: PocketColors.text, fontSize: 22, fontWeight: "700", flexShrink: 1 },
});
