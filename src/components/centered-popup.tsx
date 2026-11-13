import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import { useBulsaTheme } from '../hooks/use-bulsa-theme';
import { BackButton } from './bulsa-form';

export function CenteredPopup({ children, onClose, busy = false, stepKey = 'content', dismissOnBackdropPress = false }: PropsWithChildren<{ onClose: () => void; busy?: boolean; stepKey?: string; dismissOnBackdropPress?: boolean }>) {
  const { colors: C } = useBulsaTheme();
  const reducedMotion = useReducedMotion();
  const close = () => { if (!busy) onClose(); };
  return <Modal visible transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={close} presentationStyle="overFullScreen">
    <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.48)' }}>
      {dismissOnBackdropPress && <Pressable accessible={false} importantForAccessibility="no" disabled={busy} onPress={close} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />}
      <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 520, maxHeight: '90%', borderRadius: 24, backgroundColor: C.background, borderWidth: 1, borderColor: C.track, overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}><BackButton disabled={busy} onPress={close} /></View>
          <ScrollView key={stepKey} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 16 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
