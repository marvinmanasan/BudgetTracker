import { Pressable, StyleSheet, Text } from "react-native";
import { PocketColors } from "@/constants/pocket";

type PocketButtonProps = {
  title: string;
  onPress: () => void;
  secondary?: boolean;
};

export function PocketButton({ title, onPress, secondary = false }: PocketButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, secondary && styles.secondary, pressed && styles.pressed]}
    >
      <Text style={[styles.label, secondary && styles.secondaryLabel]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, padding: 16, borderRadius: 16, backgroundColor: PocketColors.accent, alignItems: "center", justifyContent: "center" },
  secondary: { backgroundColor: PocketColors.surface },
  pressed: { opacity: 0.75 },
  label: { fontSize: 16, fontWeight: "600", color: PocketColors.background },
  secondaryLabel: { color: PocketColors.text },
});
