import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getLedger } from '../storage/wallets';
import { deriveBalances } from '../lib/ledger';
import type { Ledger } from '../types/wallet';

export function useLedger() {
  const [data, setData] = useState<Ledger | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const request = useRef(0);
  const reload = useCallback(async (quiet = false) => {
    const current = ++request.current;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const next = await getLedger();
      if (current === request.current) setData(next);
    } catch (cause) {
      if (current === request.current) setError(cause instanceof Error ? cause.message : 'Could not read your records.');
    } finally { if (current === request.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void reload(); return () => { request.current++; }; }, [reload]));
  const balances = useMemo(() => data ? deriveBalances(data) : null, [data]);
  return { data, balances, error, loading, reload };
}

export function useSaveAction() {
  const pending = useRef(false);
  const focusVersion = useRef(0);
  const focused = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    focused.current = true;
    focusVersion.current++;
    setBusy(pending.current);
    setError('');
    return () => { focused.current = false; focusVersion.current++; };
  }, []));
  async function run(work: () => Promise<void | boolean>) {
    if (pending.current || !focused.current) return false;
    const version = focusVersion.current;
    pending.current = true; setBusy(true); setError('');
    try { return await work() !== false && focused.current && version === focusVersion.current; }
    catch (cause) { if (focused.current && version === focusVersion.current) setError(cause instanceof Error ? cause.message : 'Could not save. Your fields are still here.'); return false; }
    finally { pending.current = false; if (focused.current) setBusy(false); }
  }
  return { busy, error, run };
}
