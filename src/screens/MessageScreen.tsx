/**
 * Single message view. Marks read once when opened; Mark as Unread must stick
 * until the user leaves and opens the message again.
 */
import { useRoute, type RouteProp } from '@react-navigation/native';
import React, { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { INBOX_NOW } from '../api/data';
import { useInboxContext } from '../inbox/InboxContext';
import { formatRelativeTime } from '../inbox/inboxHelpers';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { displayBody } from '../utils/preview';

type MessageRoute = RouteProp<RootStackParamList, 'Message'>;

export default function MessageScreen(): React.JSX.Element {
  const route = useRoute<MessageRoute>();
  const { email } = route.params;
  const { markRead, toggleRead, emails } = useInboxContext();
  const didMarkOnOpenRef = useRef(false);

  // Single source of truth: the inbox list copy (falls back to route params).
  const live = emails.find(e => e.id === email.id) ?? email;

  // Mark read once per open — do NOT re-run on every focus/state change, or
  // "Mark as Unread" immediately gets overwritten by another markRead(true).
  useEffect(() => {
    if (didMarkOnOpenRef.current) {
      return;
    }
    didMarkOnOpenRef.current = true;
    markRead(email.id, true).catch(() => {
      /* error surfaced via action banner */
    });
  }, [email.id, markRead]);

  const dateLabel = formatRelativeTime(live.receivedAt, INBOX_NOW);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Text style={styles.subject}>{live.subject}</Text>
        {!live.isRead ? (
          <View style={styles.unreadBadge} accessibilityLabel="Unread">
            <Text style={styles.unreadBadgeText}>Unread</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaText}>
          <Text style={styles.sender}>{live.sender}</Text>
          <Text style={styles.email}>{live.senderEmail}</Text>
        </View>
        <Text style={styles.date}>{dateLabel}</Text>
      </View>
      <Pressable
        onPress={() => toggleRead(live.id)}
        style={styles.toggleRead}
        accessibilityRole="button"
        accessibilityLabel={live.isRead ? 'Mark as Unread' : 'Mark as Read'}
      >
        <Text style={styles.toggleReadText}>
          {live.isRead ? 'Mark as Unread' : 'Mark as Read'}
        </Text>
      </Pressable>
      <Text style={styles.body}>{displayBody(live.body)}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  subject: { flex: 1, fontSize: 22, fontWeight: '700' },
  unreadBadge: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  unreadBadgeText: { color: colors.onFill, fontSize: 11, fontWeight: '600' },
  metaRow: { flexDirection: 'row', marginBottom: 12 },
  metaText: { flex: 1, marginRight: 12 },
  sender: { fontSize: 16, fontWeight: '600' },
  email: { fontSize: 13, color: colors.secondaryLabel, marginTop: 2 },
  date: { fontSize: 13, color: colors.secondaryLabel },
  toggleRead: { alignSelf: 'flex-start', marginBottom: 16, paddingVertical: 4 },
  toggleReadText: { color: colors.accent, fontSize: 15, fontWeight: '500' },
  body: { fontSize: 16, lineHeight: 24 },
});
