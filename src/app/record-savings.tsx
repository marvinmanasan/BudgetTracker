import { PocketScreen } from '../components/pocket-screen';
import { BackButton, ReadState } from '../components/bulsa-form';
import { SavingsForm } from '../components/savings-form';
import { useSavings } from '../hooks/use-savings';

export default function RecordSavingsScreen() {
  const state = useSavings();
  if (!state.data) return <PocketScreen header={<BackButton />}><ReadState loading={state.loading} error={state.error} retry={() => void state.reload()} /></PocketScreen>;
  return <SavingsForm contribution initial={state.data.goals.find(g => g.id === 'main')} loading={state.loading} readError={state.error} retry={() => void state.reload()} />;
}
