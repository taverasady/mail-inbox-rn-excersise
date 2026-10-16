type CloseFn = () => void;

let openCloser: CloseFn | null = null;
let openId: number | null = null;

/** Close any currently open swipe row. Safe to call from scroll handlers. */
export function closeOpenRow(): void {
  if (openCloser) {
    openCloser();
  }
  openCloser = null;
  openId = null;
}

/**
 * Register a row as the sole open swipe target. Closes the previous row first
 * unless it is the same id (re-registration while still open).
 */
export function registerOpenRow(id: number, close: CloseFn): void {
  if (openId !== null && openId !== id && openCloser) {
    openCloser();
  }
  openId = id;
  openCloser = close;
}

export function unregisterOpenRow(id: number): void {
  if (openId === id) {
    openCloser = null;
    openId = null;
  }
}

export function isRowOpen(id: number): boolean {
  return openId === id;
}
