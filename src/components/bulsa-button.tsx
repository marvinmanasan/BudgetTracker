import { useBulsaStyles } from '@/hooks/use-bulsa-theme';
import type { BulsaColors } from '@/constants/bulsa';
import { Pressable, StyleSheet, Text } from "react-native";

type BulsaButtonProps = {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  selected?: boolean;
  destructive?: boolean;
};

export function BulsaButton({
  title,
  onPress,
  secondary = false,
  disabled = false,
  selected,
  destructive = false,
}: BulsaButtonProps) {
  const styles = useBulsaStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        selected && styles.selected,
        destructive && styles.destructive,
        pressed && styles.pressed,
        disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.label, secondary && styles.secondaryLabel, selected && styles.selectedLabel, destructive && styles.destructiveLabel]}>
        {title}
      </Text>
    </Pressable>
  );
}

const createStyles = (LightColors: BulsaColors) => StyleSheet.create({
  button: {
    minHeight: 48,
    padding: 16,
    borderRadius: 16,
    backgroundColor: LightColors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  secondary: { backgroundColor: LightColors.soft, borderWidth: 1, borderColor: LightColors.accent },
  selected: { borderWidth: 2, borderColor: LightColors.accent, backgroundColor: LightColors.selected },
  destructive: { backgroundColor: LightColors.soft, borderWidth: 1, borderColor: LightColors.warning },
  selectedLabel: { color: LightColors.text },
  destructiveLabel: { color: LightColors.warning },
  pressed: { opacity: 0.75 },
  label: { fontSize: 16, fontWeight: "600", textAlign: "center", color: LightColors.onAccent },
  secondaryLabel: { color: LightColors.accent },
});
