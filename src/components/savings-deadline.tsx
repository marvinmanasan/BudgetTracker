import { Text } from 'react-native';
import { useUI } from './bulsa-form';
import { displayDate } from '../lib/display-date';
import { useCurrentDate } from '../hooks/use-current-date';

export function SavingsDeadline({ deadline, remaining }: { deadline?: string | null; remaining: number }) {
  const ui = useUI();
  const today = useCurrentDate();
  if (!deadline) return null;
  const status = remaining <= 0 ? 'Goal Reached' : deadline < today ? 'Target Date Passed' : deadline === today ? 'Target Date Today' : 'Target Date';
  return <Text style={ui.caption}>{status} · {displayDate(deadline)}</Text>;
}
