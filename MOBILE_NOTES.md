# Mobile notes

## Platform and setup
- Platform used (iOS / Android) and simulator/emulator model + OS version: **iOS, iPhone 16e** on Xcode Simulator (Xcode 26.1; no iPhone SE runtime installed on this Mac — 16e is the compact stand-in).
- How to get the server running:  `npm install`, then `cd ios && bundle exec pod install`. Hermes tarball download needs network access the first time.

## Dependencies added
One line per package: `package` — what it is used for — why this one over the alternatives.

- `react-native-gesture-handler` — pan gestures on rows that negotiate with list scroll — UI-thread / native gesture system; JS `PanResponder` would hitch during page fetches.
- `react-native-reanimated` — `translateX` shared values so the drag tracks the finger off the JS thread — same reason; stayed on v3 for RN 0.83 compatibility (v4 needs newer RN / worklets).
- `@react-navigation/native` + `@react-navigation/native-stack` — Inbox ↔ Message navigation — native stack keeps the previous screen attached (`detachPreviousScreen: false`) so FlatList scroll offset is preserved; lighter than rolling a custom stack.
- `react-native-screens` — native screen containers for the stack — required peer of native-stack; enables `detachPreviousScreen`.
- `react-native-safe-area-context` — safe-area insets for the undo toast — required peer of React Navigation; avoid hard-coding home-indicator padding.

Rejected ready-made `Swipeable` from gesture-handler: it snaps to button width only. Mail needs a second threshold (~60% width) that commits Trash / Read, which is a different action from the Archive button next to Trash.

## Key decisions
- List component and how you keep scrolling smooth (item layout, memoisation, window/batch settings, …): React Native `FlatList` with fixed `ROW_HEIGHT` + `getItemLayout`, `keyExtractor` by id, `React.memo` on `EmailRow` with a custom equality fn, `windowSize={21}`, `removeClippedSubviews={false}`. Used a **standard** nav title (not `headerLargeTitle`) after the large title stayed mid-list and overlapped rows while scrolling on iOS 26. Row pans still use Gesture Handler on each cell.
- Gesture / swipe approach, including how the drag is kept off the JS thread and how "only one open row" is enforced: `Gesture.Pan()` + Reanimated `translateX`; `activeOffsetX` / `failOffsetY` so vertical scroll wins. Full-swipe at 60% of measured row width. One-open-row via a module-level `openRowRegistry` (ref-style closers) so opening another row does not set React state / re-render the list. Scroll begin and outside tap close the open row.
- State / caching approach for pages, read flags and optimistic actions with revert: `useInbox` holds the email array. Pages append; a fetch **epoch** drops stale responses after refresh. Pull-to-refresh only replaces the list after a **successful** page-1 fetch (failed refresh keeps existing rows). Archive/Trash/Read update optimistically and splice/insert on failure; brief non-blocking error banner.
- How the read state stays consistent between the inbox row and the message screen: shared `InboxProvider` is the single source of truth. Tapping a row marks it read **before** navigate (optimistic) and passes `{ ...email, isRead: true }`; MessageScreen also calls `markRead` on focus and renders from the live inbox copy (Unread badge + Mark as Read/Unread). FlatList `extraData={readRevision}` forces row refresh. Action errors overlay the whole stack so a failed `setRead` (~20%) is visible on the message screen, not hidden behind it.
- How you restore the scroll offset when returning from a message: native-stack Message uses `detachPreviousScreen: false` and `freezeOnBlur: false`, so Inbox (and its FlatList) stays mounted under the pushed screen — no remount, no offset jump.

## Platform-specific notes
- How your left-edge swipe coexists with the system back gesture (Android) or the navigation edge-swipe (iOS): Inbox is the root screen (no pop gesture). Message disables `fullScreenGestureEnabled` so only the standard edge-back remains, and that screen has no row swipe. Row pan requires ~12px horizontal movement before activating, so vertical flings are not stolen.
- Anything else that would differ on the other platform: Android would need care with the system back gesture vs swipe-right Read; long-press fallback uses `ActionSheetIOS` (iOS-only) — on Android we’d swap to a simple modal menu.

## Accessibility
- All colours live in `src/theme/colors.ts`; every text/fill pair meets WCAG AA 4.5:1 and is asserted in `__tests__/contrast.test.ts` (stock iOS `#8E8E93` grey and `#FF3B30` red with white text fall below it).
- The action-error toast is announced to VoiceOver and stays until dismissed while a screen reader is on, so Retry is reachable (WCAG 2.2.1).

## Trade-offs, assumptions and what I would do with more time
- Relative times use `INBOX_NOW` from the mock data generator (UTC) so timestamps stay stable and the newest row shows “9:41 AM”.
- The mock’s `email.preview` is generated independently of `email.body` (so snippets like “The numbers came in…” often never appear in the opened message). Rows display `previewFromBody(body)` instead; we do not change `src/api/`.
- Stretch: Undo toast (4s) after successful Archive/Trash via `restore(id)`. Skipped day section headers and multi-select (headers would break single fixed row height).
- With more time: reuse a single pan shared-value pattern for recycle-friendly rows, add Android ActionSheet equivalent, and tune rubber-banding past the action buttons like real Mail.

## AI usage
- Tools used: Cursor (Composer) for scaffolding, implementation, and notes.
- Roughly which parts were AI-generated: inbox helpers/hook, EmailRow swipe, screens, navigation wiring, and this notes file. Package version selection and gesture thresholds were reviewed/adjusted by hand.

- Things I changed or rejected, and why:
  1. **Changed when a message is marked read.** The AI marked it read every time the message screen re-rendered, so my Mark as Unread was undone a moment later. I made it mark read once, when the message opens.
  2. **Changed where the row preview comes from.** The AI used the mock's `preview` field, which is generated separately from `body`, so the row and the opened message didn't match. I made rows show the start of the real body and dropped the "Hi," greeting every mock body starts with.
  3. **Changed how a tap is told apart from a swipe.** The AI's gesture marked a row as "open" as soon as a finger touched it, so tapping a row closed the swipe actions instead of opening the message. I made a row count as open only after a real horizontal swipe.
  4. **Rejected the large "Inbox" title.** The AI used the iOS large title, which stayed on top of the rows while scrolling. I switched to a standard navigation title.
  5. **Rejected the top-of-screen error banner.** Failed read/archive/trash calls showed a red banner at the top, which looked like a page-load error. I moved it to a toast at the bottom and added a Retry button, and kept page-load errors in the list footer as the brief asks.
  6. **Rejected the stock iOS colours.** The grey, red and blue the AI used fall below WCAG's 4.5:1 contrast. I switched to a darker palette and added a test that checks every text/background pair.
