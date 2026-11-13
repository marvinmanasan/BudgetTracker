import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { BulsaScreen } from '../components/bulsa-screen';
import { BackButton, ReadState, useUI } from '../components/bulsa-form';
import { BulsaButton } from '../components/bulsa-button';
import { CategoryLimitForm } from '../components/category-limit-form';
import { useCategoryPlan } from '../hooks/use-category-plan';
import { localDate } from '../lib/validation';

export default function CategoryLimits() {
  const ui = useUI();
  const { month: param } = useLocalSearchParams<{ month?: string }>();
  const month = param && /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(param) && !param.startsWith('0000-') ? param : localDate().slice(0, 7);
  const state = useCategoryPlan(month);
  if (state.resolved !== month || !state.plan) return <BulsaScreen header={<BackButton />}><ReadState loading={state.loading} error={state.error} retry={() => void state.reload()} /></BulsaScreen>;
  if (state.plan.limitCentavos === null) return <BulsaScreen header={<BackButton />}>
    <Text style={ui.title}>Category Limits</Text><Text style={ui.body}>Set a monthly spending limit before dividing it into categories.</Text>
    {(state.loading || !!state.error) && <ReadState loading={state.loading} error={state.error} retry={() => void state.reload()} />}
    <BulsaButton title="Set Monthly Limit" disabled={state.loading || !!state.error} onPress={() => router.push({ pathname: '/monthly-limit', params: { month } })} />
  </BulsaScreen>;
  return <CategoryLimitForm key={month} month={month} initial={state.plan} sourceError={state.error} sourceLoading={state.loading} retry={() => void state.reload()} />;
}
