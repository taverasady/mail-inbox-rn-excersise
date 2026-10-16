import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, LayoutAnimation, Platform, UIManager } from 'react-native';
import {
  archive as apiArchive,
  fetchInbox,
  restore as apiRestore,
  setRead as apiSetRead,
  trash as apiTrash,
} from '../api/api';
import type { Email } from '../types/email';
import {
  appendPage,
  insertEmailAt,
  removeEmail,
  setEmailRead,
  shouldAcceptFetch,
} from './inboxHelpers';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type UndoToast = {
  id: number;
  email: Email;
  index: number;
  action: 'archive' | 'trash';
};

export type ActionError = {
  message: string;
  /** Re-runs the action that failed. */
  retry: () => void;
};

const ACTION_ERROR_MS = 4000;

function animateListChange(): void {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export function useInbox() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(1);
  const [toast, setToast] = useState<UndoToast | null>(null);
  const [actionError, setActionError] = useState<ActionError | null>(null);
  /** Bumps whenever a row's isRead changes so FlatList refreshes memoized cells. */
  const [readRevision, setReadRevision] = useState(0);

  const epochRef = useRef(0);
  const nextPageRef = useRef<number | null>(1);
  const loadingMoreRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenReaderOnRef = useRef(false);
  const emailsRef = useRef(emails);
  emailsRef.current = emails;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then(enabled => {
        if (mounted) {
          screenReaderOnRef.current = enabled;
        }
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', enabled => {
      screenReaderOnRef.current = enabled;
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const clearToastTimer = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, []);

  const dismissActionError = useCallback(() => {
    if (actionErrorTimerRef.current) {
      clearTimeout(actionErrorTimerRef.current);
      actionErrorTimerRef.current = null;
    }
    setActionError(null);
  }, []);

  const showActionError = useCallback(
    (message: string, retry: () => void) => {
      dismissActionError();
      setActionError({
        message,
        retry: () => {
          dismissActionError();
          retry();
        },
      });
      // A timed toast can vanish before a VoiceOver user reaches Retry
      // (WCAG 2.2.1), so it stays until dismissed while a screen reader is on.
      if (screenReaderOnRef.current) {
        return;
      }
      actionErrorTimerRef.current = setTimeout(() => {
        actionErrorTimerRef.current = null;
        setActionError(null);
      }, ACTION_ERROR_MS);
    },
    [dismissActionError],
  );

  // Retry closures are created inside the actions themselves, so they go
  // through this ref rather than capturing the callbacks directly.
  const actionsRef = useRef<{
    markRead: (id: number, isRead: boolean) => Promise<void>;
    removeWithAction: (id: number, action: 'archive' | 'trash') => Promise<void>;
    restoreRemoved: (payload: UndoToast) => Promise<void>;
  } | null>(null);

  const loadPage = useCallback(
    async (page: number, mode: 'initial' | 'more' | 'refresh') => {
      const epoch = mode === 'refresh' ? ++epochRef.current : epochRef.current;

      if (mode === 'initial') {
        setLoadingInitial(true);
        setPageError(null);
      } else if (mode === 'more') {
        if (loadingMoreRef.current) {
          return;
        }
        loadingMoreRef.current = true;
        setLoadingMore(true);
        setPageError(null);
      } else {
        setRefreshing(true);
        setPageError(null);
      }

      try {
        const result = await fetchInbox(page);
        if (!shouldAcceptFetch(epoch, epochRef.current)) {
          return;
        }

        if (mode === 'refresh') {
          setEmails(result.items);
        } else {
          setEmails(prev => (mode === 'initial' ? result.items : appendPage(prev, result.items)));
        }
        setNextPage(result.nextPage);
        nextPageRef.current = result.nextPage;
        setPageError(null);

        // Prefetch the next page once after a fresh first page so we stay ahead
        // without relying on FlatList onEndReached (which also fires when a row
        // mark-as-read updates `data` — that was surfacing pagination errors on tap).
        if ((mode === 'initial' || mode === 'refresh') && result.nextPage != null) {
          const prefetchPage = result.nextPage;
          Promise.resolve()
            .then(() => loadPage(prefetchPage, 'more'))
            .catch(() => {
              /* pageError handled inside loadPage */
            });
        }
      } catch {
        if (!shouldAcceptFetch(epoch, epochRef.current)) {
          return;
        }
        // Keep already-loaded rows; InboxScreen shows this in the list footer
        // when emails.length > 0 (full-screen only for a failed first page).
        setPageError("Couldn't load messages.");
      } finally {
        if (mode === 'initial') {
          setLoadingInitial(false);
        } else if (mode === 'more') {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    loadPage(1, 'initial');
    return () => {
      clearToastTimer();
      dismissActionError();
    };
  }, [loadPage, clearToastTimer, dismissActionError]);

  const refresh = useCallback(() => {
    nextPageRef.current = 1;
    setNextPage(1);
    loadPage(1, 'refresh');
  }, [loadPage]);

  const loadMore = useCallback(() => {
    const page = nextPageRef.current;
    if (page == null || loadingMoreRef.current || pageError) {
      return;
    }
    loadPage(page, 'more');
  }, [loadPage, pageError]);

  const retryPage = useCallback(() => {
    const page = nextPageRef.current ?? 1;
    if (emailsRef.current.length === 0) {
      loadPage(1, 'initial');
    } else {
      loadPage(page, 'more');
    }
  }, [loadPage]);

  const markRead = useCallback(
    async (id: number, isRead: boolean) => {
      const previous = emailsRef.current.find(e => e.id === id);
      if (!previous || previous.isRead === isRead) {
        return;
      }
      setEmails(prev => setEmailRead(prev, id, isRead));
      setReadRevision(n => n + 1);
      // Keep the ref in sync immediately so a same-tick navigate sees the new flag.
      emailsRef.current = setEmailRead(emailsRef.current, id, isRead);
      try {
        await apiSetRead(id, isRead);
      } catch {
        setEmails(prev => setEmailRead(prev, id, previous.isRead));
        emailsRef.current = setEmailRead(emailsRef.current, id, previous.isRead);
        setReadRevision(n => n + 1);
        showActionError(
          isRead ? "Couldn't mark as read." : "Couldn't mark as unread.",
          () => {
            actionsRef.current?.markRead(id, isRead);
          },
        );
      }
    },
    [showActionError],
  );

  const scheduleUndo = useCallback(
    (payload: UndoToast) => {
      clearToastTimer();
      setToast(payload);
      toastTimerRef.current = setTimeout(() => {
        setToast(null);
        toastTimerRef.current = null;
      }, 4000);
    },
    [clearToastTimer],
  );

  const removeWithAction = useCallback(
    async (id: number, action: 'archive' | 'trash') => {
      const { emails: next, removed, index } = removeEmail(emailsRef.current, id);
      if (!removed) {
        return;
      }
      animateListChange();
      setEmails(next);

      try {
        if (action === 'archive') {
          await apiArchive(id);
        } else {
          await apiTrash(id);
        }
        scheduleUndo({ id, email: removed, index, action });
      } catch {
        animateListChange();
        setEmails(prev => insertEmailAt(prev, removed, index));
        showActionError(
          action === 'archive' ? "Couldn't archive message." : "Couldn't trash message.",
          () => {
            actionsRef.current?.removeWithAction(id, action);
          },
        );
      }
    },
    [scheduleUndo, showActionError],
  );

  const archive = useCallback((id: number) => removeWithAction(id, 'archive'), [removeWithAction]);
  const trash = useCallback((id: number) => removeWithAction(id, 'trash'), [removeWithAction]);

  const toggleRead = useCallback(
    (id: number) => {
      const current = emailsRef.current.find(e => e.id === id);
      if (!current) {
        return;
      }
      markRead(id, !current.isRead);
    },
    [markRead],
  );

  const restoreRemoved = useCallback(
    async (payload: UndoToast) => {
      try {
        await apiRestore(payload.id);
        animateListChange();
        setEmails(prev => {
          if (prev.some(e => e.id === payload.id)) {
            return prev;
          }
          return insertEmailAt(prev, payload.email, payload.index);
        });
      } catch {
        showActionError("Couldn't undo.", () => {
          actionsRef.current?.restoreRemoved(payload);
        });
      }
    },
    [showActionError],
  );

  actionsRef.current = { markRead, removeWithAction, restoreRemoved };

  const undo = useCallback(async () => {
    const current = toast;
    if (!current) {
      return;
    }
    clearToastTimer();
    setToast(null);
    await restoreRemoved(current);
  }, [toast, clearToastTimer, restoreRemoved]);

  const dismissToast = useCallback(() => {
    clearToastTimer();
    setToast(null);
  }, [clearToastTimer]);

  return {
    emails,
    loadingInitial,
    loadingMore,
    refreshing,
    pageError,
    nextPage,
    toast,
    actionError,
    readRevision,
    refresh,
    loadMore,
    retryPage,
    markRead,
    archive,
    trash,
    toggleRead,
    undo,
    dismissToast,
    dismissActionError,
  };
}
