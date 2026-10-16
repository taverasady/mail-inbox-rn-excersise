# MailInbox

A React Native inbox that behaves like iOS Mail: paged list, swipe actions, optimistic updates, and a message screen that returns to the same scroll offset.

Built on the take-home starter. React Native stays at **0.83.10**. Platform for this solution: **iOS** (Xcode Simulator, iPhone 16e). Decisions, dependency choices, and the AI disclosure live in [`MOBILE_NOTES.md`](MOBILE_NOTES.md).

## What it does

- **Inbox** — 25 messages per page, pull-to-refresh, fetch the next page when you are about two screens from the end.
- **Rows** — unread dot, initials avatar, sender, relative time, subject, body preview (clipped from the real message, not the mock's unrelated `preview` field).
- **Swipe left** — Archive (grey) and Trash (red). Release before ~60% of the row width leaves the buttons open; past 60% commits Trash.
- **Swipe right** — Read / Unread (blue). Full swipe commits the toggle. Only one row open at a time.
- **Message** — sender, email, subject, date, full body. Opening a message marks it read; the inbox row updates to match. Mark as Unread sticks until you open the message again.
- **Failures** — a failed page load shows **Retry** in the list footer and keeps already-loaded rows. A failed archive / trash / read / undo shows a bottom toast with **Retry**.
- **Undo** — after a successful archive or trash, a 4-second toast restores the row via `restore(id)`.

Long-press a row (or use VoiceOver actions) for Archive / Trash / Read without a swipe.

## Run (iOS)

Needs Node 20+, Xcode, CocoaPods, and the iOS Simulator.

```bash
npm install
cd ios && bundle install && bundle exec pod install && cd ..

# Terminal 1 — leave Metro running
npx react-native start

# Terminal 2
npm run ios -- --simulator="iPhone 16e"
```

Use `MailInbox.xcworkspace`, not the `.xcodeproj`. After the first install, if the app is already on the simulator and Metro is running, **⌘R** reloads JS changes.

If you change Babel plugins (Reanimated) or the cache looks stale:

```bash
npx react-native start --reset-cache
```

Useful scripts: `npm run typecheck`, `npm test`, `npm run lint`.

## Layout

| Path | What it is |
|---|---|
| `src/screens/InboxScreen.tsx` | Paged `FlatList`, pull-to-refresh, footer Retry |
| `src/screens/MessageScreen.tsx` | Message detail; marks read once on open |
| `src/components/EmailRow.tsx` | Row layout + UI-thread swipe |
| `src/inbox/useInbox.ts` | Pages, optimistic archive/trash/read, undo, error retry |
| `src/inbox/InboxContext.tsx` | Shared inbox state above the navigator |
| `src/theme/colors.ts` | Palette; WCAG AA pairs asserted in `__tests__/contrast.test.ts` |
| `src/types/`, `src/api/` | Starter mock API — **not modified** |

## Mock API (unchanged)

Nothing hits the network. All data comes from `src/api/`.

- `fetchInbox(page)` — 25 messages, newest first, 400–900 ms, ~10% `NetworkError`
- `archive` / `trash` / `setRead` / `restore` — 300–600 ms, ~20% `NetworkError`
- Read flags and removed ids live in memory for the lifetime of the app. Nothing persists across restarts.

Failures are random on purpose. Keep scrolling or toggling read until one hits.

## Tests

Starter API sanity tests plus helpers, body preview, and colour contrast:

```bash
npm test
```
