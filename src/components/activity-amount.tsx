import { useBulsaTheme } from '../hooks/use-bulsa-theme';
import { Text } from 'react-native';

import type { ActivityRow } from '../lib/activity';
import { formatCentavos } from '../lib/money';
import { useUI } from './bulsa-form';

export function ActivityAmount({ item }: { item: ActivityRow }) {
  const ui = useUI();
  const { colors: C } = useBulsaTheme();
  const positive = item.amount > 0 && item.type !== 'transfer';
  return <Text style={[ui.heading, { color: item.type === 'income' ? C.income : item.type === 'expense' ? C.warning : C.text }]}>
    {positive ? '+' : ''}{formatCentavos(item.amount)}
  </Text>;
}
