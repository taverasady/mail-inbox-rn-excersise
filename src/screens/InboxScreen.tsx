/**
 * Inbox list: pagination, pull-to-refresh, swipe rows, inline error footer.
 */
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import EmailRow, { ROW_HEIGHT } from '../components/EmailRow';
import { useInboxContext } from '../inbox/InboxContext';
import { closeOpenRow } from '../inbox/openRowRegistry';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import type { Email } from '../types/email';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Inbox'>;

export default function InboxScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>();
  const {
    emails,
    loadingInitial,
    loadingMore,
    refreshing,
    pageError,
    readRevision,
    refresh,
    loadMore,
    retryPage,
    archive,
    trash,
    toggleRead,
    markRead,
  } = useInboxContext();

  // FlatList fires onEndReached on data/layout changes (e.g. mark-as-read on
  // row tap). Ignore those; only paginate after the user actually scrolls.
  const allowEndReachedRef = useRef(false);

  const onPress = useCallback(
    (email: Email) => {
      // Mark read optimistically before push so the inbox row updates immediately
      // and the message screen receives the same isRead flag.
      if (!email.isRead) {
        markRead(email.id, true).catch(() => {
          /* error surfaced via action banner */
        });
      }
      navigation.navigate('Message', {
        email: email.isRead ? email : { ...email, isRead: true },
      });
    },
    [markRead, navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Email }) => (
      <EmailRow
        email={item}
        onPress={onPress}
        onArchive={archive}
        onTrash={trash}
        onToggleRead={toggleRead}
      />
    ),
    [archive, onPress, toggleRead, trash],
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<Email> | null | undefined, index: number) => ({
      length: ROW_HEIGHT,
      offset: ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const keyExtractor = useCallback((item: Email) => String(item.id), []);

  const onScrollBeginDrag = useCallback(() => {
    closeOpenRow();
    allowEndReachedRef.current = true;
  }, []);

  const onEndReached = useCallback(() => {
    if (!allowEndReachedRef.current) {
      return;
    }
    loadMore();
  }, [loadMore]);

  const retryBlock = pageError ? (
    <View style={styles.retry}>
      <Text style={styles.retryText}>{pageError}</Text>
      <Pressable
        onPress={retryPage}
        style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
        accessibilityRole="button"
        accessibilityLabel="Retry loading messages"
      >
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    </View>
  ) : null;

  // Only shown once rows exist; a failed first page has nothing to keep and
  // falls through to ListEmptyComponent.
  const listFooter =
    emails.length > 0 ? (
      <View style={styles.footer}>
        {loadingMore ? <ActivityIndicator style={styles.footerSpinner} /> : retryBlock}
      </View>
    ) : null;

  const listEmpty = loadingInitial ? (
    <View style={styles.centered}>
      <ActivityIndicator />
    </View>
  ) : pageError ? (
    <View style={styles.centered}>{retryBlock}</View>
  ) : (
    <View style={styles.centered}>
      <Text style={styles.empty}>No Messages</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={emails}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        extraData={readRevision}
        onEndReached={onEndReached}
        onEndReachedThreshold={2}
        onScrollBeginDrag={onScrollBeginDrag}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListFooterComponent={listFooter}
        ListEmptyComponent={listEmpty}
        contentInsetAdjustmentBehavior="automatic"
        windowSize={21}
        maxToRenderPerBatch={20}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={false}
        initialNumToRender={12}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { paddingTop: 80, alignItems: 'center', paddingHorizontal: 24 },
  empty: { fontSize: 17, color: colors.secondaryLabel },
  footer: { paddingVertical: 16, minHeight: 56, paddingHorizontal: 16 },
  footerSpinner: { marginVertical: 8 },
  retry: { alignItems: 'center', paddingVertical: 8 },
  retryText: { color: colors.secondaryLabel, fontSize: 15, textAlign: 'center' },
  retryButton: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  retryButtonPressed: { opacity: 0.7 },
  retryButtonText: { color: colors.onFill, fontSize: 15, fontWeight: '600' },
});
