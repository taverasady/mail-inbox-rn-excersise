import React, { useEffect } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ActionError } from '../inbox/useInbox';
import { colors } from '../theme/colors';

const UNDO_TOAST_CLEARANCE = 56;

type Props = {
  error: ActionError | null;
  onDismiss: () => void;
  /** True while the Undo toast is visible, so the two don't overlap. */
  aboveUndoToast: boolean;
};

/** Non-blocking error for failed row actions. Sits above the navigator so Message sees it too. */
export default function ActionErrorBanner({
  error,
  onDismiss,
  aboveUndoToast,
}: Props): React.JSX.Element | null {
  const insets = useSafeAreaInsets();

  // iOS does not announce accessibilityRole="alert" on its own.
  useEffect(() => {
    if (error) {
      AccessibilityInfo.announceForAccessibility(`${error.message} Retry available.`);
    }
  }, [error]);

  if (!error) {
    return null;
  }
  const bottom = Math.max(insets.bottom, 12) + 8 + (aboveUndoToast ? UNDO_TOAST_CLEARANCE : 0);
  return (
    <View style={[styles.banner, { bottom }]} accessibilityRole="alert">
      <Pressable
        style={styles.messageArea}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={error.message}
        accessibilityHint="Dismisses this message"
      >
        <Text style={styles.text} numberOfLines={2}>
          {error.message}
        </Text>
      </Pressable>
      <Pressable
        onPress={error.retry}
        hitSlop={8}
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
        accessibilityRole="button"
        accessibilityLabel="Retry"
      >
        <Text style={styles.retryText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 100,
    backgroundColor: colors.destructive,
    borderRadius: 10,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageArea: { flex: 1, paddingVertical: 4, marginRight: 8 },
  text: { color: colors.onFill, fontSize: 15 },
  retry: {
    backgroundColor: colors.onFill,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: 'center',
  },
  retryPressed: { opacity: 0.7 },
  retryText: { color: colors.destructive, fontSize: 15, fontWeight: '700' },
});
