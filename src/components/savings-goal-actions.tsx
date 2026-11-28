import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { SymbolView } from 'expo-symbols';
import { useBulsaTheme } from '../hooks/use-bulsa-theme';
import type { SavingsGoal } from '../storage/savings';

export function SavingsGoalActions({ goal, onEdit, onDelete, onClose }: {
  goal: SavingsGoal;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const { colors: C } = useBulsaTheme();
  const reducedMotion = useReducedMotion();
  return <Modal visible transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onClose} presentationStyle="overFullScreen">
    <SafeAreaView style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)', padding: 16 }}>
      <Pressable accessible={false} importantForAccessibility="no" onPress={onClose} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 520, maxHeight: '85%', alignSelf: 'center', backgroundColor: C.surface, borderRadius: 24, overflow: 'hidden' }}>
        <ScrollView bounces={false} contentContainerStyle={{ padding: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingTop: 8, paddingBottom: 12, gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text accessibilityRole="header" style={{ color: C.text, fontSize: 20, fontWeight: '600' }}>Goal Options</Text>
              <Text style={{ color: C.muted, fontSize: 14, lineHeight: 21 }}>{goal.title}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close Goal Options" onPress={onClose} style={({ pressed }) => ({ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: pressed ? C.soft : C.background })}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={20} tintColor={C.muted} accessible={false} />
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Edit Savings Goal" onPress={onEdit} style={({ pressed }) => ({ minHeight: 64, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 16, backgroundColor: pressed ? C.soft : C.surface })}>
            <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={24} tintColor={C.text} accessible={false} />
            <Text style={{ color: C.text, fontSize: 17, fontWeight: '500', flex: 1 }}>Edit Goal</Text>
          </Pressable>
          <View style={{ height: 1, backgroundColor: C.track, marginHorizontal: 16 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Delete Savings Goal" accessibilityHint="Opens a confirmation before deleting" onPress={onDelete} style={({ pressed }) => ({ minHeight: 64, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 16, backgroundColor: pressed ? C.soft : C.surface })}>
            <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={24} tintColor={C.warning} accessible={false} />
            <Text style={{ color: C.warning, fontSize: 17, fontWeight: '500', flex: 1 }}>Delete Goal</Text>
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}
