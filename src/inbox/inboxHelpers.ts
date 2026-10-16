import type { Email } from '../types/email';

/** Append a fetched page, skipping ids already present. Preserves prior object identity. */
export function appendPage(existing: Email[], page: Email[]): Email[] {
  if (page.length === 0) {
    return existing;
  }
  const seen = new Set(existing.map(e => e.id));
  const additions = page.filter(e => !seen.has(e.id));
  if (additions.length === 0) {
    return existing;
  }
  return existing.concat(additions);
}

/** Drop responses that belong to an older refresh/load generation. */
export function shouldAcceptFetch(responseEpoch: number, currentEpoch: number): boolean {
  return responseEpoch === currentEpoch;
}

export function removeEmail(
  emails: Email[],
  id: number,
): { emails: Email[]; removed: Email | undefined; index: number } {
  const index = emails.findIndex(e => e.id === id);
  if (index < 0) {
    return { emails, removed: undefined, index: -1 };
  }
  const removed = emails[index];
  const next = emails.slice(0, index).concat(emails.slice(index + 1));
  return { emails: next, removed, index };
}

export function insertEmailAt(emails: Email[], email: Email, index: number): Email[] {
  const clamped = Math.max(0, Math.min(index, emails.length));
  return emails.slice(0, clamped).concat(email, emails.slice(clamped));
}

export function setEmailRead(emails: Email[], id: number, isRead: boolean): Email[] {
  const index = emails.findIndex(e => e.id === id);
  if (index < 0) {
    return emails;
  }
  const current = emails[index];
  if (current.isRead === isRead) {
    return emails;
  }
  const next = emails.slice();
  next[index] = { ...current, isRead };
  return next;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function startOfUtcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Relative inbox timestamps against the mock data's fixed clock (INBOX_NOW).
 * Uses UTC so the newest message reads "9:41 AM" regardless of the device zone.
 */
export function formatRelativeTime(iso: string, now: Date): string {
  const then = new Date(iso);
  const dayDiff = Math.round((startOfUtcDay(now) - startOfUtcDay(then)) / 86_400_000);

  if (dayDiff === 0) {
    let hours = then.getUTCHours();
    const minutes = then.getUTCMinutes();
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) {
      hours = 12;
    }
    const mm = minutes < 10 ? `0${minutes}` : String(minutes);
    return `${hours}:${mm} ${suffix}`;
  }

  if (dayDiff === 1) {
    return 'Yesterday';
  }

  if (dayDiff > 1 && dayDiff < 7) {
    return WEEKDAYS[then.getUTCDay()];
  }

  const month = then.getUTCMonth() + 1;
  const day = then.getUTCDate();
  const year = then.getUTCFullYear() % 100;
  return `${month}/${day}/${year}`;
}
