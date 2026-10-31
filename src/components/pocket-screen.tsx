import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PocketColors } from "@/constants/pocket";

export function PocketScreen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PocketColors.background },
  content: { padding: 24, paddingBottom: 40, gap: 20, width: "100%", maxWidth: 600, alignSelf: "center" },
});
