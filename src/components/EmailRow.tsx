/**
 * One inbox row: Mail-style layout + UI-thread swipe actions.
 *
 * Swipe left  -> Archive (grey) + Trash (red); full swipe (≥60%) commits Trash.
 * Swipe right -> Read/Unread (blue); full swipe commits the toggle.
 * Only one row open at a time (see openRowRegistry).
 *
 * Tap vs swipe: pan only activates after a clear horizontal move; taps use a
 * composed Tap gesture so Pressable is not blocked by the pan detector.
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  AccessibilityActionEvent,
  ActionSheetIOS,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { INBOX_NOW } from '../api/data';
import {
  closeOpenRow,
  isRowOpen,
  registerOpenRow,
  unregisterOpenRow,
} from '../inbox/openRowRegistry';
import { formatRelativeTime } from '../inbox/inboxHelpers';
import { colors } from '../theme/colors';
import type { Email } from '../types/email';
import { colorFromName, initialsFromName } from '../utils/avatar';
import { previewFromBody } from '../utils/preview';

export const ROW_HEIGHT = 92;
const ACTION_WIDTH = 80;
const LEFT_ACTIONS_WIDTH = ACTION_WIDTH * 2;
const RIGHT_ACTION_WIDTH = ACTION_WIDTH;
const FULL_SWIPE_RATIO = 0.6;

type Props = {
  email: Email;
  onPress: (email: Email) => void;
  onArchive: (id: number) => void;
  onTrash: (id: number) => void;
  onToggleRead: (id: number) => void;
};

function EmailRow({ email, onPress, onArchive, onTrash, onToggleRead }: Props): React.JSX.Element {
  const translateX = useSharedValue(0);
  const rowWidth = useSharedValue(0);
  const startX = useSharedValue(0);

  const timeLabel = useMemo(
    () => formatRelativeTime(email.receivedAt, INBOX_NOW),
    [email.receivedAt],
  );
  const initials = useMemo(() => initialsFromName(email.sender), [email.sender]);
  const avatarColor = useMemo(() => colorFromName(email.sender), [email.sender]);
  // Use body-derived preview — mock `email.preview` is unrelated to `email.body`.
  const preview = useMemo(() => previewFromBody(email.body), [email.body]);

  const close = useCallback(() => {
    translateX.value = withTiming(0, { duration: 180 });
    unregisterOpenRow(email.id);
  }, [email.id, translateX]);

  useEffect(() => {
    return () => {
      if (isRowOpen(email.id)) {
        unregisterOpenRow(email.id);
      }
    };
  }, [email.id]);

  const snapOpenLeft = useCallback(() => {
    registerOpenRow(email.id, close);
    translateX.value = withTiming(-LEFT_ACTIONS_WIDTH, { duration: 180 });
  }, [close, email.id, translateX]);

  const snapOpenRight = useCallback(() => {
    registerOpenRow(email.id, close);
    translateX.value = withTiming(RIGHT_ACTION_WIDTH, { duration: 180 });
  }, [close, email.id, translateX]);

  const commitTrash = useCallback(() => {
    unregisterOpenRow(email.id);
    translateX.value = withTiming(-(rowWidth.value || 400), { duration: 160 }, finished => {
      if (finished) {
        runOnJS(onTrash)(email.id);
      }
    });
  }, [email.id, onTrash, rowWidth, translateX]);

  const commitToggle = useCallback(() => {
    unregisterOpenRow(email.id);
    translateX.value = withTiming(0, { duration: 160 });
    onToggleRead(email.id);
  }, [email.id, onToggleRead, translateX]);

  const commitArchive = useCallback(() => {
    unregisterOpenRow(email.id);
    translateX.value = withTiming(-(rowWidth.value || 400), { duration: 160 }, finished => {
      if (finished) {
        runOnJS(onArchive)(email.id);
      }
    });
  }, [email.id, onArchive, rowWidth, translateX]);

  const handlePress = useCallback(() => {
    // If this row (or another) is open, a tap closes actions instead of navigating.
    if (isRowOpen(email.id) || Math.abs(translateX.value) > 1) {
      close();
      return;
    }
    closeOpenRow();
    onPress(email);
  }, [close, email, onPress, translateX]);

  const showActionSheet = useCallback(() => {
    closeOpenRow();
    const readLabel = email.isRead ? 'Mark as Unread' : 'Mark as Read';
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', readLabel, 'Archive', 'Trash'],
          destructiveButtonIndex: 3,
          cancelButtonIndex: 0,
        },
        buttonIndex => {
          if (buttonIndex === 1) {
            onToggleRead(email.id);
          } else if (buttonIndex === 2) {
            onArchive(email.id);
          } else if (buttonIndex === 3) {
            onTrash(email.id);
          }
        },
      );
    }
  }, [email.id, email.isRead, onArchive, onToggleRead, onTrash]);

  const onAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      const name = event.nativeEvent.actionName;
      if (name === 'toggleRead') {
        onToggleRead(email.id);
      } else if (name === 'archive') {
        onArchive(email.id);
      } else if (name === 'trash') {
        onTrash(email.id);
      }
    },
    [email.id, onArchive, onToggleRead, onTrash],
  );

  const tap = Gesture.Tap().onEnd(() => {
    runOnJS(handlePress)();
  });

  const longPress = Gesture.LongPress()
    .minDuration(350)
    .onStart(() => {
      runOnJS(showActionSheet)();
    });

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onBegin(() => {
      // Capture start offset only — do NOT register as open yet, or a plain
      // tap would look "open" and refuse to navigate.
      startX.value = translateX.value;
    })
    .onStart(() => {
      // Pan has activated (clear horizontal move). Claim exclusive open state.
      runOnJS(registerOpenRow)(email.id, close);
    })
    .onUpdate(e => {
      const next = startX.value + e.translationX;
      const width = rowWidth.value || 375;
      translateX.value = Math.max(-width, Math.min(width, next));
    })
    .onEnd(() => {
      const x = translateX.value;
      const width = rowWidth.value || 375;
      const threshold = width * FULL_SWIPE_RATIO;

      if (x <= -threshold) {
        runOnJS(commitTrash)();
        return;
      }
      if (x >= threshold) {
        runOnJS(commitToggle)();
        return;
      }
      if (x < -ACTION_WIDTH / 2) {
        runOnJS(snapOpenLeft)();
        return;
      }
      if (x > ACTION_WIDTH / 2) {
        runOnJS(snapOpenRight)();
        return;
      }
      runOnJS(close)();
    });

  // Pan wins when it activates; otherwise long-press / tap can fire.
  const gesture = Gesture.Exclusive(pan, Gesture.Exclusive(longPress, tap));

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const leftActionsStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, Math.max(0, -translateX.value / LEFT_ACTIONS_WIDTH));
    return { opacity: progress > 0 ? 1 : 0 };
  });

  const rightActionsStyle = useAnimatedStyle(() => {
    const progress = Math.min(1, Math.max(0, translateX.value / RIGHT_ACTION_WIDTH));
    return { opacity: progress > 0 ? 1 : 0 };
  });

  return (
    <View
      style={styles.container}
      onLayout={e => {
        rowWidth.value = e.nativeEvent.layout.width;
      }}
    >
      <Animated.View style={[styles.actionsBehind, styles.leftActions, leftActionsStyle]}>
        <View style={styles.leftActionRow}>
          <Pressable
            style={[styles.action, styles.archive]}
            onPress={() => {
              closeOpenRow();
              commitArchive();
            }}
            accessibilityRole="button"
            accessibilityLabel="Archive"
          >
            <Text style={styles.actionLabel}>Archive</Text>
          </Pressable>
          <Pressable
            style={[styles.action, styles.trash]}
            onPress={() => {
              closeOpenRow();
              commitTrash();
            }}
            accessibilityRole="button"
            accessibilityLabel="Trash"
          >
            <Text style={styles.actionLabel}>Trash</Text>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View style={[styles.actionsBehind, styles.rightActions, rightActionsStyle]}>
        <Pressable
          style={[styles.action, styles.readToggle]}
          onPress={() => {
            close();
            onToggleRead(email.id);
          }}
          accessibilityRole="button"
          accessibilityLabel={email.isRead ? 'Mark as Unread' : 'Mark as Read'}
        >
          <Text style={styles.actionLabel}>{email.isRead ? 'Unread' : 'Read'}</Text>
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[styles.front, frontStyle]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${email.isRead ? '' : 'Unread. '}From ${email.sender}. ${email.subject}. ${timeLabel}`}
          accessibilityActions={[
            { name: 'toggleRead', label: email.isRead ? 'Mark as Unread' : 'Mark as Read' },
            { name: 'archive', label: 'Archive' },
            { name: 'trash', label: 'Trash' },
          ]}
          onAccessibilityAction={onAccessibilityAction}
        >
          <View style={styles.row}>
            <View style={styles.dotSlot}>
              {!email.isRead ? <View style={styles.unreadDot} /> : null}
            </View>
            <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.text}>
              <View style={styles.line1}>
                <Text
                  style={[styles.sender, !email.isRead && styles.unread]}
                  numberOfLines={1}
                >
                  {email.sender}
                </Text>
                <Text style={styles.time}>{timeLabel}</Text>
              </View>
              <Text style={[styles.subject, !email.isRead && styles.unread]} numberOfLines={1}>
                {email.subject}
              </Text>
              <Text style={styles.preview} numberOfLines={2}>
                {preview}
              </Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function propsAreEqual(prev: Props, next: Props): boolean {
  return (
    prev.email.id === next.email.id &&
    prev.email.isRead === next.email.isRead &&
    prev.email.sender === next.email.sender &&
    prev.email.subject === next.email.subject &&
    prev.email.body === next.email.body &&
    prev.email.receivedAt === next.email.receivedAt &&
    prev.onPress === next.onPress &&
    prev.onArchive === next.onArchive &&
    prev.onTrash === next.onTrash &&
    prev.onToggleRead === next.onToggleRead
  );
}

export default React.memo(EmailRow, propsAreEqual);

const styles = StyleSheet.create({
  container: {
    height: ROW_HEIGHT,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  actionsBehind: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  leftActions: {
    justifyContent: 'flex-end',
  },
  leftActionRow: {
    flexDirection: 'row',
    height: '100%',
  },
  rightActions: {
    justifyContent: 'flex-start',
  },
  action: {
    width: ACTION_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  archive: { backgroundColor: colors.archive },
  trash: { backgroundColor: colors.destructive },
  readToggle: { backgroundColor: colors.accent },
  actionLabel: { color: colors.onFill, fontWeight: '600', fontSize: 13 },
  front: {
    height: ROW_HEIGHT,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  row: {
    height: ROW_HEIGHT,
    paddingRight: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dotSlot: {
    width: 14,
    alignItems: 'center',
    paddingTop: 16,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  avatarText: { color: colors.onFill, fontWeight: '700', fontSize: 14 },
  text: { flex: 1, minWidth: 0 },
  line1: { flexDirection: 'row', alignItems: 'center' },
  sender: { flex: 1, fontSize: 16, marginRight: 8 },
  unread: { fontWeight: '700' },
  time: { fontSize: 13, color: colors.secondaryLabel },
  subject: { fontSize: 15, marginTop: 1 },
  preview: { fontSize: 14, color: colors.secondaryLabel, marginTop: 1, lineHeight: 18 },
});
