import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { getMonthlyLimits, type MonthlyLimit } from '../storage/budgets';
import { monthName } from '../lib/display-date';
import { formatCentavos } from '../lib/money';
import { PocketButton } from './pocket-button';
import { ReadState, useUI } from './bulsa-form';

export function MonthlyLimitHistory() {
  const ui = useUI();
  const [rows, setRows] = useState<MonthlyLimit[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const request = useRef(0);
  const reload = useCallback(async () => {
    const version = ++request.current; setLoading(true); setError('');
    try { const next = await getMonthlyLimits(); if (version === request.current) setRows(next); }
    catch (cause) { if (version === request.current) setError(cause instanceof Error ? cause.message : 'Could not read monthly limits.'); }
    finally { if (version === request.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void reload(); return () => { request.current++; }; }, [reload]));
  return <View style={{ gap: 12 }}>
    <Text style={ui.heading}>Monthly Limit History</Text>
    <PocketButton secondary title="Refresh History" onPress={() => void reload()} />
    <Text style={ui.caption}>Saved spending plans. These amounts are not wallet balances.</Text>
    {loading || error ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : !rows.length ? <Text style={ui.body}>No saved monthly limits yet.</Text> : rows.map(row => <View key={row.month} style={ui.card}><Text style={ui.body}>{monthName(row.month)} · {formatCentavos(row.limitCentavos)}</Text><PocketButton secondary title={`Edit ${monthName(row.month)}`} onPress={() => router.push({ pathname: '/monthly-limit', params: { month: row.month } })} /></View>)}
  </View>;
}
