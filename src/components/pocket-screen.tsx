import type { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PocketColors } from "@/constants/pocket";

export function PocketScreen({ children, scrollable = true, header }: PropsWithChildren<{ scrollable?: boolean; header?: ReactNode }>) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "bottom", "left", "right"]}>
      {header && <View style={styles.header}>{header}</View>}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {scrollable ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, !!header && styles.withHeader]}>{children}</ScrollView> : <View style={[styles.content, !!header && styles.withHeader, { flex: 1 }]}>{children}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PocketColors.background },
  header: { paddingHorizontal: 24, paddingVertical: 4, width: '100%', maxWidth: 600, alignSelf: 'center' },
  withHeader: { paddingTop: 12 },
  content: { padding: 24, paddingBottom: 40, gap: 20, width: "100%", maxWidth: 600, alignSelf: "center" },
});
