import { Text } from 'react-native';
import { PocketColors as C } from '../constants/pocket';
import type { ActivityRow } from '../lib/activity';
import { formatCentavos } from '../lib/money';
import { ui } from './bulsa-form';

export function ActivityAmount({ item }: { item: ActivityRow }) {
  const positive = item.amount > 0 && item.type !== 'transfer';
  return <Text style={[ui.heading, { color: item.type === 'income' ? C.income : item.type === 'expense' ? C.warning : C.text }]}>
    {positive ? '+' : ''}{formatCentavos(item.amount)}
  </Text>;
}
