import { useBulsaStyles } from '@/hooks/use-bulsa-theme';
import type { BulsaColors } from '@/constants/bulsa';
import { Pressable, StyleSheet, Text } from "react-native";

type BulsaButtonProps = {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  selected?: boolean;
};

export function BulsaButton({
  title,
  onPress,
  secondary = false,
  disabled = false,
  selected,
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
        pressed && styles.pressed,
        disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.label, secondary && styles.secondaryLabel]}>
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
  secondary: { backgroundColor: LightColors.surface },
  pressed: { opacity: 0.75 },
  label: { fontSize: 16, fontWeight: "600", color: LightColors.onAccent },
  secondaryLabel: { color: LightColors.text },
});
