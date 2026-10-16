import type { Email } from '../src/types/email';
import {
  appendPage,
  formatRelativeTime,
  insertEmailAt,
  removeEmail,
  setEmailRead,
  shouldAcceptFetch,
} from '../src/inbox/inboxHelpers';
import { INBOX_NOW } from '../src/api/data';

function email(partial: Partial<Email> & { id: number }): Email {
  return {
    sender: 'Maya Thompson',
    senderEmail: 'maya@example.com',
    subject: 'Hello',
    preview: 'Preview text',
    body: 'Body',
    receivedAt: INBOX_NOW.toISOString(),
    isRead: false,
    hasAttachment: false,
    ...partial,
  };
}

test('appendPage concatenates without mutating prior items', () => {
  const a = email({ id: 1 });
  const b = email({ id: 2 });
  const c = email({ id: 3 });
  const existing = [a, b];
  const next = appendPage(existing, [c]);
  expect(next).toEqual([a, b, c]);
  expect(next[0]).toBe(a);
  expect(existing).toHaveLength(2);
});

test('appendPage skips duplicate ids already in the list', () => {
  const a = email({ id: 1 });
  const b = email({ id: 2 });
  const next = appendPage([a], [a, b]);
  expect(next.map(e => e.id)).toEqual([1, 2]);
  expect(next[0]).toBe(a);
});

test('shouldAcceptFetch drops stale epochs', () => {
  expect(shouldAcceptFetch(3, 3)).toBe(true);
  expect(shouldAcceptFetch(2, 3)).toBe(false);
});

test('removeEmail splices one id and returns the removed item plus index', () => {
  const items = [email({ id: 1 }), email({ id: 2 }), email({ id: 3 })];
  const result = removeEmail(items, 2);
  expect(result.emails.map(e => e.id)).toEqual([1, 3]);
  expect(result.removed?.id).toBe(2);
  expect(result.index).toBe(1);
  expect(items).toHaveLength(3);
});

test('removeEmail is a no-op for unknown ids', () => {
  const items = [email({ id: 1 })];
  const result = removeEmail(items, 99);
  expect(result.emails).toBe(items);
  expect(result.removed).toBeUndefined();
  expect(result.index).toBe(-1);
});

test('insertEmailAt restores a row at its previous index', () => {
  const a = email({ id: 1 });
  const b = email({ id: 2 });
  const c = email({ id: 3 });
  expect(insertEmailAt([a, c], b, 1).map(e => e.id)).toEqual([1, 2, 3]);
  expect(insertEmailAt([a, c], b, 99).map(e => e.id)).toEqual([1, 3, 2]);
});

test('setEmailRead updates only the matching row object', () => {
  const a = email({ id: 1, isRead: false });
  const b = email({ id: 2, isRead: false });
  const next = setEmailRead([a, b], 1, true);
  expect(next[0].isRead).toBe(true);
  expect(next[0]).not.toBe(a);
  expect(next[1]).toBe(b);
});

test('formatRelativeTime covers today, yesterday, weekday, and date', () => {
  const now = INBOX_NOW;
  expect(formatRelativeTime(now.toISOString(), now)).toBe('9:41 AM');

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  yesterday.setUTCHours(15, 0, 0, 0);
  expect(formatRelativeTime(yesterday.toISOString(), now)).toBe('Yesterday');

  const weekday = new Date(now);
  weekday.setUTCDate(weekday.getUTCDate() - 3);
  expect(formatRelativeTime(weekday.toISOString(), now)).toMatch(
    /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/,
  );

  const older = new Date(now);
  older.setUTCDate(older.getUTCDate() - 14);
  expect(formatRelativeTime(older.toISOString(), now)).toBe('9/21/26');
});
