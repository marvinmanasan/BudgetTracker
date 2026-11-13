import type { BulsaColors } from '@/constants/bulsa';
import { useBulsaStyles } from '@/hooks/use-bulsa-theme';
import type { PropsWithChildren, ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export function BulsaScreen({ children, scrollable = true, header }: PropsWithChildren<{ scrollable?: boolean; header?: ReactNode }>) {
  const styles = useBulsaStyles(createStyles);
  return (
    <SafeAreaView style={styles.screen} edges={header ? ["top", "bottom", "left", "right"] : ["top", "left", "right"]}>
      {header && <View style={styles.header}>{header}</View>}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {scrollable ? <ScrollView showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, !!header && styles.withHeader]}>{children}</ScrollView> : <View style={[styles.content, !!header && styles.withHeader, { flex: 1 }]}>{children}</View>}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (LightColors: BulsaColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: LightColors.background },
  header: { paddingHorizontal: 24, paddingVertical: 4, width: '100%', maxWidth: 600, alignSelf: 'center' },
  withHeader: { paddingTop: 12 },
  content: { padding: 24, paddingBottom: 32, gap: 16, width: "100%", maxWidth: 600, alignSelf: "center" },
});
