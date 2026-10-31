import { StyleSheet, Text, View } from "react-native";
import { PocketScreen } from "@/components/pocket-screen";
import { PocketColors } from "@/constants/pocket";

export default function Activity() {
  return (
    <PocketScreen>
      <Text style={styles.title}>Activity</Text>
      <View style={styles.card}>
        <Text style={styles.heading}>Your spending story starts here</Text>
        <Text style={styles.body}>Once transaction tracking is ready, your income and expenses will appear here.</Text>
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
