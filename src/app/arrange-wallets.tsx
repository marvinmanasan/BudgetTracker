import { type ComponentRef, useCallback, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BackButton, ReadState, useUI } from '../components/bulsa-form';
import { BulsaScreen } from '../components/bulsa-screen';
import type { BulsaColors } from '../constants/bulsa';
import { useBulsaStyles, useBulsaTheme } from '../hooks/use-bulsa-theme';
import { useLedger } from '../hooks/use-ledger';
import { useFocusEffect } from 'expo-router';
import { cashWalletId } from '../lib/wallet-order';

export default function ArrangeWallets() {
  const ui = useUI();
  const { balances, loading, error, reload } = useLedger();
  const { save, saving, error: saveError } = useBulsaTheme();
  const styles = useBulsaStyles(createStyles);
  const wallets = balances?.wallets ?? [];
  const visible = useMemo(() => balances?.wallets.filter(w => !w.hidden) ?? [], [balances]);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const viewport = useRef<ComponentRef<typeof View>>(null);
  const bounds = useRef(new Map<string, { y: number; height: number }>());
  const offset = useRef(0);
  const contentHeight = useRef(0);
  const frame = useRef<number | null>(null);
  type Drag = { id: string; start: number; pointer: number; scrollStart: number; top?: number; height?: number };
  const active = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<{ id: string; from: number; to: number; dy: number; height: number } | null>(null);
  const cancel = useCallback(() => {
    active.current = null;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setPreview(null);
  }, []);
  useFocusEffect(useCallback(() => cancel, [cancel]));
  async function move(from: number, to: number) {
    const wallet = visible[from];
    if (saving || from === to || !wallet || !visible[to] || wallet.id === cashWalletId || visible[to].id === cashWalletId) return;
    const reordered = visible.map(w => w.id);
    reordered.splice(from, 1);
    reordered.splice(to, 0, wallet.id);
    let next = 0;
    const order = wallets.map(w => w.hidden ? w.id : reordered[next++]);
    if (await save({ walletOrder: order })) {
      AccessibilityInfo.announceForAccessibility(`${wallet.name} is now ${to + 1} of ${visible.length}.`);
    }
  }
  function placement(drag: Drag) {
    const from = visible.findIndex(w => w.id === drag.id);
    const row = bounds.current.get(drag.id);
    if (!row || from < 0) return null;
    const dy = drag.pointer - drag.start + offset.current - drag.scrollStart;
    const center = row.y + row.height / 2 + dy;
    let to = 0;
    for (const w of visible) {
      const other = bounds.current.get(w.id);
      if (w.id !== drag.id && (w.id === cashWalletId || (other && center > other.y + other.height / 2))) to++;
    }
    return { id: drag.id, from, to, dy, height: row.height };
  }
  function startDrag(id: string, pageY: number) {
    if (saving || active.current) return;
    const drag: Drag = { id, start: pageY, pointer: pageY, scrollStart: offset.current };
    active.current = drag;
    setPreview(placement(drag));
    viewport.current?.measureInWindow((_x, y, _w, h) => { drag.top = y; drag.height = h; });
    function trackEdge() {
      if (active.current !== drag) return;
      if (drag.top !== undefined && drag.height) {
        const y = drag.pointer - drag.top;
        const delta = y < 40 ? -7 : y > drag.height - 40 ? 7 : 0;
        const limit = Math.max(0, contentHeight.current - drag.height);
        const next = Math.min(limit, Math.max(0, offset.current + delta));
        if (next !== offset.current) {
          offset.current = next;
          scroll.current?.scrollTo({ y: next, animated: false });
          setPreview(placement(drag));
        }
      }
      frame.current = requestAnimationFrame(trackEdge);
    }
    frame.current = requestAnimationFrame(trackEdge);
  }
  return <BulsaScreen scrollable={false} header={<View style={styles.header}>
    <Text accessibilityRole="header" style={[ui.heading, styles.title]}>Arrange Wallets</Text>
    <BackButton title="Done" disabled={saving} />
  </View>}>
    <Text style={ui.body}>Drag the handle beside a wallet up or down. Lift your finger to save its place.</Text>
    {loading || error ? <ReadState loading={loading} error={error} retry={() => void reload()} /> :
      <View ref={viewport} collapsable={false} style={{ flex: 1 }}>
      <ScrollView ref={scroll} scrollEnabled={!preview} scrollEventThrottle={16}
        onScroll={event => { if (!active.current) offset.current = event.nativeEvent.contentOffset.y; }}
        onContentSizeChange={(_width, height) => { contentHeight.current = height; }}>
      <View style={styles.list}>{visible.map((wallet, index) => {
        const dragging = preview?.id === wallet.id;
        let translateY = 0;
        if (preview) {
          if (dragging) translateY = preview.dy;
          else if (index > preview.from && index <= preview.to) translateY = -preview.height;
          else if (index < preview.from && index >= preview.to) translateY = preview.height;
        }
        return <View key={wallet.id} onLayout={({ nativeEvent: { layout } }) => bounds.current.set(wallet.id, layout)}
          style={[styles.row, index > 0 && styles.divider, { transform: [{ translateY }] }, dragging && styles.dragging]}>
        <View style={styles.identity}>
          <Text style={styles.position}>{index + 1}</Text>
          <View style={styles.name}>
            <Text style={styles.walletName}>{wallet.name}</Text>
            {wallet.id === cashWalletId && <Text style={ui.caption}>Always first</Text>}
          </View>
        </View>
        {wallet.id !== cashWalletId && <View accessible accessibilityRole="adjustable"
          accessibilityLabel={`Reorder ${wallet.name}`} accessibilityValue={{ text: `${index + 1} of ${visible.length}` }}
          accessibilityState={{ disabled: saving }}
          accessibilityActions={[
            ...(index > 0 && visible[index - 1].id !== cashWalletId ? [{ name: 'decrement', label: 'Move Up' }] : []),
            ...(index < visible.length - 1 ? [{ name: 'increment', label: 'Move Down' }] : []),
          ]}
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === 'increment') void move(index, index + 1);
            if (nativeEvent.actionName === 'decrement') void move(index, index - 1);
          }}
          onStartShouldSetResponder={() => !saving}
          onResponderGrant={event => startDrag(wallet.id, event.nativeEvent.pageY)}
          onResponderMove={event => {
            if (!active.current) return;
            active.current.pointer = event.nativeEvent.pageY;
            setPreview(placement(active.current));
          }}
          onResponderRelease={event => {
            const drag = active.current;
            if (drag) drag.pointer = event.nativeEvent.pageY;
            const drop = drag && placement(drag);
            cancel();
            if (drop) void move(drop.from, drop.to);
          }}
          onResponderTerminationRequest={() => false} onResponderTerminate={cancel} style={styles.handle}>
          <Text pointerEvents="none" accessible={false} style={styles.grip}>≡</Text>
        </View>}
      </View>;
      })}</View></ScrollView></View>}
    {!!saveError && <Text accessibilityLiveRegion="polite" style={ui.error}>{saveError}</Text>}
  </BulsaScreen>;
}

const createStyles = (c: BulsaColors) => StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 16 },
  title: { flexShrink: 1, paddingVertical: 6 },
  list: { borderRadius: 16, paddingHorizontal: 12, backgroundColor: c.surface },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', paddingVertical: 8, columnGap: 8, rowGap: 4, minHeight: 68 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.track },
  identity: { flexDirection: 'row', flexGrow: 1, flexBasis: 112, alignItems: 'center', gap: 10 },
  position: { color: c.muted, minWidth: 20, textAlign: 'center', fontVariant: ['tabular-nums'] },
  name: { flex: 1 },
  walletName: { color: c.text, fontSize: 17, fontWeight: '600' },
  dragging: { backgroundColor: c.soft, zIndex: 1, borderRadius: 12 },
  handle: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  grip: { color: c.accent, fontSize: 26, fontWeight: '600' },
});
