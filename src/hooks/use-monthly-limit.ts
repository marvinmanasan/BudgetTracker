import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getMonthlyLimit, ensureMonthlyLimit } from '../storage/budgets';
import { localDate } from '../lib/validation';

export function useMonthlyLimit(month: string) {
  const [value, setValue] = useState<number | null>(null);
  const [resolvedMonth, setResolvedMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  const reload = useCallback(async () => {
    const version = ++request.current; setLoading(true); setError('');
    try { const next = await (month === localDate().slice(0, 7) ? ensureMonthlyLimit(month) : getMonthlyLimit(month)); if (version === request.current) { setValue(next); setResolvedMonth(month); } }
    catch (cause) { if (version === request.current) setError(cause instanceof Error ? cause.message : 'Could not read the limit.'); }
    finally { if (version === request.current) setLoading(false); }
  }, [month]);
  useFocusEffect(useCallback(() => { void reload(); return () => { request.current++; }; }, [reload]));
  return { value, loading: loading || (!error && resolvedMonth !== month), error, reload, resolvedMonth };
}
