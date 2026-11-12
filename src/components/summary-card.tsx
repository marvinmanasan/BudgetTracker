import type { BulsaColors } from '@/constants/pocket';
import { useBulsaStyles, useBulsaTheme } from '@/hooks/use-bulsa-theme';

import { StyleSheet, Text, View } from "react-native";
import { formatCentavos } from '../lib/money';

type SummaryCardProps = { label: string; tone?: 'income' | 'expense' } & (
  { amount: number; amountCentavos?: never } | { amountCentavos: number; amount?: never }
);

export function SummaryCard({ label, amount, amountCentavos, tone }: SummaryCardProps) {
  const styles = useBulsaStyles(createStyles);
  const { colors } = useBulsaTheme();
  const prefix = amountCentavos !== undefined && amountCentavos >= 0 ? tone === 'income' ? '+' : tone === 'expense' ? '-' : '' : '';
  const display = amountCentavos !== undefined ? prefix + formatCentavos(amountCentavos) : `₱${amount.toLocaleString('en-PH')}`;
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.amount, tone && { color: tone === 'income' ? colors.income : colors.warning }]}>{display}</Text>
    </View>
  );
}

const createStyles = (PocketColors: BulsaColors) => StyleSheet.create({
  card: { flex: 1, minWidth: 0, backgroundColor: PocketColors.surface, borderRadius: 20, padding: 16, gap: 8 },
  label: { color: PocketColors.muted, fontSize: 14 },
  amount: { color: PocketColors.text, fontSize: 22, fontWeight: "700", flexShrink: 1 },
});
