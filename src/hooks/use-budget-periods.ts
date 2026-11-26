import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getBudgetPeriods } from '../storage/budget-periods';
import type { BudgetPeriod } from '../lib/budget-periods';

export function useBudgetPeriods() {
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = useRef(0);
  const reload = useCallback(async () => {
    const version = ++request.current;
    setLoading(true);
    setError('');
    try {
      const rows = await getBudgetPeriods();
      if (version === request.current) { setPeriods(rows); setLoaded(true); }
    } catch (cause) {
      if (version === request.current) setError(cause instanceof Error ? cause.message : 'Could not read spending plans.');
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => {
    void reload();
    return () => { request.current++; };
  }, [reload]));
  return { periods, loaded, loading, error, reload };
}
