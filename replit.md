# Wise Quran (القرآن الكريم)

A modern, feature-rich, offline-first Progressive Web App (PWA) for reading the Quran, listening to recitations, tracking spiritual habits, and managing Hifz (memorization) progress.

## Tech Stack

- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite
- **Package Manager:** pnpm
- **Styling:** Tailwind CSS + Radix UI (shadcn/ui pattern)
- **State:** TanStack Query + React Context + IndexedDB (offline-first)
- **Virtualization:** @tanstack/react-virtual (useWindowVirtualizer for Surah Reader ayah list)
- **Backend/Cloud Sync:** Supabase (optional, app works without it)
- **Database:** Replit PostgreSQL (all Supabase migrations have been applied)
- **PWA:** Vite PWA Plugin + Workbox

## Project Structure

- `src/` — Main source code
  - `components/` — Feature components (quran, prayer, ramadan, sleep, stats, ui, layout)
  - `contexts/` — React Context providers (Audio, Auth, Language)
  - `hooks/` — Custom hooks (useHifz, useAdhan, usePrayerNotifications, etc.)
  - `lib/` — Core logic, API clients, utilities, DB schemas
  - `pages/` — Route-level view components
  - `data/` — Static data (surah-meta, azkar-data)
- `public/` — Static assets, icons, audio files
- `supabase/` — Edge Functions and SQL migrations (applied to Replit PostgreSQL)
- `dist/` — Production build output

## Key Features

1. Quran reading with Uthmanic typography, multiple reciters, verse-by-verse highlighting
2. Prayer times, Adhan notifications, Qibla compass, Tasbeeh counter
3. Hifz (memorization) tracking with recitation testing
4. Friday Mode hub for Jumu'ah activities
5. Sleep Mode with gradual audio fade-out and nature sounds
6. Ramadan tracker, Azkar collections, stats dashboard
7. Backup & Restore — export/import all user progress (hifz, reading, azkar, wird) as a JSON file from Settings and the DevKit

## Performance Notes

- **SettingsPage chunk** is prefetched during idle time after app startup (alongside main tabs)
- **Audio byte tracking**: `db.ts` maintains `wise-audio-bytes-total` in localStorage (updated by `saveAudio`/`deleteAudio`/`clearAllAudio`). `getStorageStats()` reads this O(1) instead of loading all audio ArrayBuffers from IDB.
- **`getAllDownloadedAudio()`** uses key-only IDB scan (`getAllKeys`) to avoid loading ArrayBuffers.
- **AudioPlayerContext** is split into 3 separate contexts to minimize re-renders; `timeupdate` is suppressed when the page is hidden.
- **Developer control panel** at `/devkit` (PIN: "devkit") — session-locked, standalone route outside AppShell.

## Development

```bash
pnpm install
pnpm run dev   # starts on http://0.0.0.0:5000
```

## Deployment

Configured as a static site deployment:
- Build: `pnpm run build` → outputs to `dist/`
- Served as static files

### Pre-deploy gates

`.github/workflows/deploy.yml` runs three blocking checks before the SFTP step
so a broken build cannot reach production:

1. `pnpm run check:no-undef` — fails on any ESLint `no-undef` error under `src/`.
   Catches missing icon imports and other undeclared references that
   TypeScript/`vite build` let through but blow up at runtime.
2. `pnpm run check:build-env` — fails if any required `VITE_*` env var is
   missing or empty before the build runs (prevents Vite from inlining empty
   strings into the bundle).
3. `pnpm run check:smoke` — boots the freshly built `dist/` in headless
   Chromium and asserts that `#root` has at least one rendered child. Catches
   the blank-page failure mode.

Run all three locally with `pnpm run predeploy`.

## Environment Variables

- `VITE_SUPABASE_URL` — Supabase project URL (stored as Replit Secret). Required for sign-in and cloud sync.
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key (stored as Replit Secret). Required for sign-in and cloud sync.
- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — Replit PostgreSQL credentials (auto-managed). All Supabase schema migrations have been applied to this database.

## Replit Migration Notes

- Migrated from Replit Agent to Replit environment.
- `esbuild` added as an explicit dependency (required by Vite in this environment).
- All Supabase SQL migrations applied to Replit PostgreSQL (`DATABASE_URL`).
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` stored as Replit Secrets so Supabase auth/sync works.
- Workflow: `Start application` runs `pnpm run dev` on port 5000.

## Recent fixes

### v3.9.1 — Sign-in / sign-up removed (2026-04-27)

The app used to support optional Supabase email/password sign-in for cross-
device cloud sync. That whole entry path is gone:

- Deleted `src/pages/SignInPage.tsx`, `src/pages/AuthCallbackPage.tsx`,
  `src/components/AuthModal.tsx`, `src/components/BookmarkClaimDialog.tsx`,
  and `src/lib/auth-callback.ts`.
- Removed the `/signin` and `/auth/callback` routes from `src/App.tsx`.
- Removed the entire **Account** section from `SettingsPage` (avatar, email,
  pending-sync indicator, Sign In / Sign Out buttons) and dropped its
  `useSyncQueueContext` consumption.
- Replaced `src/contexts/AuthContext.tsx` with a tiny stub that always
  returns `{ user: null, session: null, loading: false }` and exports no
  `signIn`/`signUp`/`signOut` methods. Existing consumers
  (`PrayerPage`, `PrayerHistorySheet`, `useSleepModePlayer`,
  `AppStatusPanel`) keep compiling and naturally take their no-user code
  paths so all local-first features continue to work.
- Updated the privacy line in Settings to drop the "in your personal
  account if you choose to sign in" clause.
- `AuthProvider` is still mounted in `App.tsx` so `useAuth()` keeps
  returning a stable value to the tree.

The Supabase client (`src/lib/supabase.ts`) and the SyncQueue infrastructure
remain in place — they simply have no auth source any more, so any code that
checks `if (user) syncToCloud(...)` short-circuits.

### v3.9.0 — Fully-offline Sleep Mode (2026-04-27)

Sleep Mode previously always streamed audio over the network. With the PWA
installed to the Home Screen on iOS, an unstable connection (Wi-Fi handoff,
airplane mode at bedtime, etc.) would silently break playback.

`useSleepModePlayer.play()` now goes through `resolveAudioSource(reciterId,
surahNumber)` (in `src/lib/quran-audio.ts`), exactly like Listening mode does:
- Cached IDB blob → `URL.createObjectURL` → fully offline playback. The blob
  URL is tracked in `blobUrlRef` and revoked on stop or track change to avoid
  leaks.
- Network URL when online but uncached. After a successful play we fire
  `cachePlayingAudio(...)` in the background so the next session is offline.
- `null` (offline AND uncached) → the hook surfaces a new `isOfflineUncached`
  flag instead of throwing; `SleepModePage` renders a friendly empty-state
  ("This surah isn't downloaded yet") rather than a generic audio error.

`SurahSelectorForSleep` now takes `reciterId`, `downloadedSurahs: Set<number>`,
and `onAfterDownload`. Each surah pill shows a trailing badge — ✓ when cached,
download icon when not, spinner during fetch (tap-to-cancel via
`AbortController`). `SleepModePage` adds a per-reciter "n/114" counter and a
bulk "Download whole Quran for this reciter" button with progress and cancel,
backed by a serial loop over `downloadSurahAudio(...)`.

`src/lib/storage-persist.ts` exposes `requestPersistentStorageOnce()`, called
on the first per-surah or bulk download from Sleep Mode. It calls
`navigator.storage.persist()` exactly once per device (gated by a localStorage
flag) so iOS won't evict the IDB recitations after 7 days of inactivity.

### v3.8.1 — iOS Sleep Mode (2026-04-27)

Sleep Mode silently failed on iPhone (especially when the PWA was installed to
the Home Screen) while regular Listening mode worked everywhere. Two iOS-only
issues in `src/hooks/useSleepModePlayer.ts`:

1. The hook created a raw `new Audio()` that lacked iOS-required attributes
   (`playsInline`, `webkit-playsinline`, `crossOrigin="anonymous"`,
   `preload="auto"`).
2. It awaited `getReciterAudioUrl(...)` *between* the user gesture and the real
   `.play()` call, dropping iOS's user-activation flag for that audio element.

Fix: route Sleep Mode through `mobileAudioManager` on a dedicated `"sleep"`
channel (added to `ManagedAudioChannel` and `primeAll` in
`src/lib/mobile-audio.ts`). `play()` now grabs the shared, properly-configured
audio element via `mobileAudioManager.getAudio("sleep")` and calls
`mobileAudioManager.prime("sleep")` synchronously inside the user-gesture tick
so the silent-unlock `.play()` registers the element as user-activated. Async
work (URL fetch, real `play(url)`) then runs safely on the activated element.
A monotonic `playTokenRef` guards against rapid play/stop/play races so stale
async continuations cannot mutate state after a newer action. The sleep channel
is fully isolated from Listening mode's `"quran"` channel so the two cannot
interfere.
