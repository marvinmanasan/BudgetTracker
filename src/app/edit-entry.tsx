import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { EntryForm } from '../components/entry-form';
import { PocketScreen } from '../components/pocket-screen';
import { BackButton, ReadState, ui } from '../components/bulsa-form';
import { useLedger } from '../hooks/use-ledger';

export default function EditEntry() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const { data, loading, error, reload } = useLedger();
  if (!data) return <PocketScreen header={<BackButton />}><ReadState loading={loading} error={error} retry={() => void reload()} /></PocketScreen>;
  const record = typeof id === 'string' ? data.transactions.find(t => t.id === id) : undefined;
  if (!record) return <PocketScreen header={<BackButton />}><Text style={ui.body}>Transaction not found. Return to Activity.</Text></PocketScreen>;
  return <EntryForm key={record.id} original={record} />;
}
