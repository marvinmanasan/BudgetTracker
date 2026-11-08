import { StyleSheet, Text, View } from "react-native";
import { PocketScreen } from "@/components/pocket-screen";
import { PocketColors } from "@/constants/pocket";

export default function Budgets() {
  return (
    <PocketScreen>
      <Text style={styles.title}>Budgets</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Give your money a plan</Text>
        <Text style={styles.body}>Your category budgets will appear here once you set them up.</Text>
      </View>
    </PocketScreen>
  );
}

const styles = StyleSheet.create({
  title: { color: PocketColors.text, fontSize: 30, fontWeight: "600" },
  card: { backgroundColor: PocketColors.surface, padding: 24, borderRadius: 20, gap: 12 },
  heading: { color: PocketColors.text, fontSize: 20, fontWeight: "600" },
  body: { color: PocketColors.muted, fontSize: 16, lineHeight: 24 },
});
