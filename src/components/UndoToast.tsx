import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { UndoToast as UndoToastModel } from '../inbox/useInbox';
import { colors } from '../theme/colors';

type Props = {
  toast: UndoToastModel | null;
  onUndo: () => void;
};

export default function UndoToast({ toast, onUndo }: Props): React.JSX.Element | null {
  const insets = useSafeAreaInsets();
  if (!toast) {
    return null;
  }
  const label = toast.action === 'archive' ? 'Archived' : 'Moved to Trash';
  return (
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 8 }]} pointerEvents="box-none">
      <View style={styles.toast}>
        <Text style={styles.label}>{label}</Text>
        <Pressable onPress={onUndo} hitSlop={8} accessibilityRole="button" accessibilityLabel="Undo">
          <Text style={styles.undo}>Undo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  toast: {
    backgroundColor: colors.toastBackground,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { color: colors.onFill, fontSize: 15 },
  undo: { color: colors.toastAction, fontSize: 15, fontWeight: '600' },
});
