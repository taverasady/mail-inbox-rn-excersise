# MailInbox — React Native take-home starter

This is the starter project for the **Mail-Style Inbox with Swipe Actions** exercise.
Read the exercise PDF first; this README only covers the code.

## What is already here

| Path | Status | Notes |
|---|---|---|
| `src/types/email.ts` | Done | `Email` and `InboxPage` types. Do not change. |
| `src/api/data.ts` | Done | Deterministic generator for 10,000 messages. Do not change. |
| `src/api/api.ts` | Done | Mock API: `fetchInbox`, `fetchEmail`, `archive`, `trash`, `setRead`, `restore`. Simulated latency and failures. Do not change. |
| `src/screens/InboxScreen.tsx` | Stub | Your main work. |
| `src/screens/MessageScreen.tsx` | Stub | Message detail. Redefine its props to suit your navigation. |
| `src/components/EmailRow.tsx` | Stub | Row layout + swipe actions. |
| `App.tsx` | Minimal | Renders `InboxScreen`. No navigation yet. |
| `__tests__/` | Done | Sanity tests for the mock API. Keep them green. |

The project has **no third-party runtime dependencies**. Choosing and justifying them is part of the exercise.

## Rules

- **Do not change the React Native version.** It is pinned in `package.json` (0.83.10). Add dependencies against that version; do not upgrade or downgrade the project.
- **Do not modify** `src/types/`, `src/api/`, or the existing tests. Everything else is yours.
- For **every package you add**, write one line in `MOBILE_NOTES.md`: the package, what you use it for, and why that package over the alternatives.
- Pick **one platform** (iOS or Android). You do not need to run both.

## Getting started

```bash
npm install

# iOS (macOS only)
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios

# Android
npm run android
```

Useful scripts: `npm run typecheck`, `npm test`, `npm run lint`.

### Run notes (beyond the commands above)

- Target platform for this solution: **iOS**. Preferred compact simulator: `iPhone 16e` (or `iPhone SE (3rd generation)` if that runtime is installed).
  ```bash
  npm run ios -- --simulator="iPhone 16e"
  ```
- First iOS build needs CocoaPods (`bundle exec pod install` under `ios/`). Use `MailInbox.xcworkspace`, not the `.xcodeproj`.
- If Metro is already running on another port, stop it or pass `--port` / restart with `npx react-native start --reset-cache` after changing Babel plugins (Reanimated).

## Mock API behaviour

- `fetchInbox(page)` → 25 messages per page, newest first, 400–900 ms latency, ~10% of calls reject with `NetworkError`. `nextPage` is `null` after the last page.
- `archive(id)`, `trash(id)`, `setRead(id, isRead)`, `restore(id)` → 300–600 ms latency, ~20% of calls reject with `NetworkError`.
- Server-side state (read flags, removed ids) lives in memory for the lifetime of the app; refetching a page reflects earlier actions. Nothing persists across restarts.

Failures are random and frequent on purpose. Your UI must handle them.

## What to send back

1. A **public GitHub repository URL** with your changes. Do not commit `node_modules`.
2. `MOBILE_NOTES.md` filled in (template provided) and committed.
3. Screenshots and a short screen recording as described in the exercise PDF — attach them to your reply or commit them under `submission/`.
