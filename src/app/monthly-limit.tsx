import { useLocalSearchParams } from 'expo-router';
import { PocketScreen } from '../components/pocket-screen';
import { BackButton, ReadState } from '../components/bulsa-form';
import { MonthlyLimitForm } from '../components/monthly-limit-form';
import { useMonthlyLimit } from '../hooks/use-monthly-limit';
import { localDate } from '../lib/validation';
export default function MonthlyLimit() {
  const { month: param } = useLocalSearchParams<{ month?: string }>();
  const month = typeof param === 'string' && /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(param) && !param.startsWith('0000-') ? param : localDate().slice(0, 7);
  const limit = useMonthlyLimit(month);
  // Once loaded, keep the editor mounted during focus refresh so drafts survive.
  return limit.resolvedMonth === month ? <MonthlyLimitForm month={month} initial={limit.value} sourceError={limit.error} sourceLoading={limit.loading} retry={() => void limit.reload()} /> :
    <PocketScreen header={<BackButton />}><ReadState loading={limit.loading} error={limit.error} retry={() => void limit.reload()} /></PocketScreen>;
}
