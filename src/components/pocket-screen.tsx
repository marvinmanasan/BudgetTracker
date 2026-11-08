import type { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PocketColors } from "@/constants/pocket";

export function PocketScreen({ children, scrollable = true }: PropsWithChildren<{ scrollable?: boolean }>) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {scrollable ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>{children}</ScrollView> : <View style={[styles.content, { flex: 1 }]}>{children}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PocketColors.background },
  content: { padding: 24, paddingBottom: 40, gap: 20, width: "100%", maxWidth: 600, alignSelf: "center" },
});
