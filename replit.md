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

- **Code splitting:**
  - Route-level: every top-level page is `React.lazy`-loaded (Home/Quran/Sleep/Stats/Settings/etc.) so the home critical path ships only the splash, AppShell, and tab bar.
  - **Domain-isolated vendor chunks** (vite.config.ts `manualChunks`) — each third-party concern lives in its own chunk so the home critical path only ships what the home shell actually imports. As of Task #13:
    - `react-vendor` (142 KB) — react / react-dom / scheduler. **Note**: react-router lives in `router-vendor`, NOT here. Pulling react-router in created a `vendor → react-vendor → vendor` bundling cycle via `@remix-run/router`; isolating react/react-dom/scheduler (none of which import outward) breaks it.
    - `router-vendor` (22 KB) — react-router-dom + @remix-run/router + history.
    - `motion-vendor` (128 KB) — framer-motion + motion-dom + motion-utils. The matcher must catch all three because framer-motion 12+ ships its core as separate `motion-*` packages; matching only `framer-motion` leaks ~50 KB into the generic vendor chunk.
    - `radix-vendor` (114 KB) — @radix-ui/* + @floating-ui/* + cmdk + vaul. Only loaded by Settings / dialogs / sheets.
    - `supabase-vendor` (175 KB) — @supabase/* + iceberg-js (transitive realtime dep). Sleep Mode + cloud bookmarks only; never on home.
    - `query-vendor` (44 KB) — @tanstack/react-query + react-virtual. Quran reader / Hifz only.
    - `icons-vendor` (36 KB) — lucide-react. The home tab bar uses a handful of icons, so this *is* on the entry path, but isolating it lets the SW precache it once and share across routes.
    - `form-vendor` — react-hook-form + @hookform/* + zod. Settings forms only.
    - `date-vendor` — date-fns. Hifz / streaks only.
    - `storage-vendor` — idb. Quran reader / offline only.
    - `datepicker-vendor` — react-day-picker. Settings calendar only.
    - `carousel-vendor` — embla-carousel-react. Onboarding / install guide only.
    - `workbox-vendor` — workbox-window registration shim.
    - `panels-vendor` — react-resizable-panels. DevKit only.
    - `charts-vendor` (292 KB) — recharts + d3-*. Stats only.
    - `vendor` (147 KB) — small leaf libs the home shell legitimately needs (sonner, clsx, tailwind-merge, web-vitals, next-themes, tslib, class-variance-authority, etc.).
  - Stable chunk names so the SW precache manifest stays deterministic across builds.
  - **Recharts is lazy-loaded inside StatsPage** (`src/components/stats/WeeklyChartLazy.tsx`) — `charts-vendor` only arrives when the user opens `/stats`.
- **SettingsPage chunk** is prefetched during idle time after app startup (alongside main tabs).
- **Audio byte tracking**: `db.ts` maintains `wise-audio-bytes-total` in localStorage (updated by `saveAudio`/`deleteAudio`/`clearAllAudio`). `getStorageStats()` reads this O(1) instead of loading all audio ArrayBuffers from IDB.
- **`getAllDownloadedAudio()`** uses key-only IDB scan (`getAllKeys`) to avoid loading ArrayBuffers.
- **AudioPlayerContext** is split into 3 separate contexts (state / time / ayah) to minimize re-renders; `timeupdate` is suppressed when the page is hidden. The 3 context objects + the four `useAudioPlayer*` hooks live in `src/hooks/useAudioPlayer.ts` so the `.tsx` provider file exports only React components — without that split Vite Fast Refresh would full-reload on every save during development and tank in-progress audio state.
- **Developer control panel** at `/devkit` (PIN: "devkit") — session-locked, standalone route outside AppShell.

## Diagnostics

The audio playback chain (Sleep Mode + Quran reader + Supabase fire-and-forget writes) is instrumented through `src/lib/audio-debug-log.ts`. The buffer is **always-on** in production, capped at 200 entries; the console-mirror + floating debug pill are gated behind dev / `?debug=audio` / `localStorage.audioDebug=1`. Settings → About has a “Diagnostics” disclosure that reads the buffer regardless of the gate, so a user reporting "tap Play, nothing happened" can copy the trace without flipping any flag first. Implementation: `src/components/settings/DiagnosticsSection.tsx`.

## Testing

- `pnpm test` — unit & integration tests via Vitest (jsdom).
- `pnpm test:e2e` — Playwright E2E suite (`./e2e/`). Specs cover the Sleep Mode play path and the Quran reader Surah-1 render. Runs against the local Vite dev server (port 5000) on Desktop Chromium + iPhone 14 Mobile Safari profiles. **Each spec installs an `HTMLMediaElement.prototype.play` spy via `page.addInitScript` BEFORE navigation and hard-asserts at least one `play()` invocation after the user clicks Play** — this is the behavioural assertion that catches "tap Play, nothing happens" regressions; smoke-only "page renders" assertions are insufficient for the audio-critical paths. Recitation CDN URLs are stubbed with an inline silent MP3 so specs don't depend on the public network.
- `pnpm test:ci` — runs `vitest run` followed by Playwright. This is the gate downstream CI environments should call to enforce both unit-test green and the audio-play behavioural assertion on every PR.

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

### v3.9.5 — Sleep Mode iOS in-app diagnostic logger (2026-05-02)

The previous v3.9.4 fixes did not resolve the user-reported "tap Play
does nothing visible" symptom on iPhone, which means the failure is in
a code path we cannot infer from the source alone. To debug it without
needing a Mac + cable + Safari Web Inspector, this release adds an
opt-in in-app diagnostic logger:

- **`src/lib/audio-debug-log.ts`** — 200-entry ring buffer plus a
  `console.info("[audio-debug] …")` mirror. Gated by
  `import.meta.env.DEV`, the URL param `?debug=audio`, or
  `localStorage.audioDebug = "1"`. When the gate is off, every
  `audioDebugLog()` call is a single boolean check (no allocations,
  no DOM, no console).
- **Instrumentation** added to every catch / early-return / async
  boundary in `mobile-audio.ts` (`prime`, `play`, `stop`,
  `configurePlaybackAudioSession`), `sleep-mode-player.ts`
  (`togglePlay`, `play`, `stopAll`, `resume`, `setSnapshot` for
  isPlaying/isLoading/hasError transitions), and
  `useGlobalAudioBootstrap.ts` (first-interaction prime).
- **`src/components/sleep/AudioDebugPanel.tsx`** — fixed-position pill
  rendered on `SleepModePage` whenever the gate is on. Tap to open a
  full-screen modal with the live timeline, environment summary
  (UA / standalone / online / SW state / bundle), Copy log,
  Clear, and Disable & close.
- **Regression tests** in `src/lib/__tests__/mobile-audio.test.ts`
  cover the gate behavior, the lazy-thunk OFF path (zero allocation
  when disabled), and confirm `mobileAudioManager.play()` now emits
  the expected diagnostic events.
- **Lazy thunk payloads.** `audioDebugLog(step, () => payload)` is
  supported so hot-path call sites that build computed payloads
  (string slicing, property reads) stay genuinely free when the gate
  is off.
- **Audio element fetch diagnostics.** `attachAudioFetchDiagnostics()`
  binds one-shot `error` / `stalled` / `canplay` listeners after
  every `audio.src = …` so the log captures `networkState`,
  `readyState`, `MediaError.code` etc. — the missing piece for
  disambiguating SW-interception vs CDN failure vs decoder error.
- **React subscribe-bridge instrumentation** in `useSleepModePlayer`:
  when the gate is on, the hook wraps `sleepModePlayer.subscribe` so
  every React subscribe / listener fire / unsubscribe is logged with
  the post-fire snapshot. This disambiguates "singleton silently
  failed to notify React" from "React got the notification but didn't
  re-render".
- **Invariant regression test.** `mobileAudioManager.play()` rejection
  is asserted to reach the caller AND emit `play:firstPlayRejected`
  + `play:retryRejected` in the trace — guards against a future
  refactor accidentally restoring the silent-swallow shape that the
  iPhone repro is suspected to be hitting today.

To use on iPhone: open the app at `/sleep?debug=audio` (or run
`localStorage.audioDebug = "1"` in Safari Web Inspector once), tap
Play, then tap the `audio · N` pill in the bottom-right and Copy.

### v3.9.4 — iOS Sleep Mode root causes (2026-05-02)

Three independent bugs in the audio stack were causing Sleep Mode to fail
on iOS Safari and the standalone PWA. Fixed in one coordinated pass so
partial fixes don't mask each other:

1. **`mobile-audio.ts` — `stop(channel, true)` now clears `primedChannels`.**
   `audio.removeAttribute("src") + audio.load()` deactivates the iOS
   user-activation on the audio element, but the channel was still marked
   primed, so the next `prime()` short-circuited and the next `.play()` ran
   outside the user gesture and got rejected by iOS with `NotAllowedError`.
   The fix unblocks every stop → play cycle on iOS standalone PWAs and also
   benefits the main Quran reader (`AudioPlayerContext`) and the reciter-
   preview channels which use the same pattern.

2. **`mobile-audio.ts` — `configurePlaybackAudioSession()` no longer latches.**
   iOS resets the session category to `"auto"` after audio interruptions
   (incoming calls, Siri, system memory pressure), so the previous
   "already configured" module-level flag turned the helper into a permanent
   no-op and subsequent Sleep Mode sessions played under the wrong category
   (then got muted by the silent switch). Re-applying `session.type =
   "playback"` on every play is cheap and correct.

3. **`sleep-mode-player.ts` — always pass `playbackRate: 1` to
   `setPositionState`.** Safari throws `TypeError` on `playbackRate: 0`,
   which silently broke the lock-screen progress bar and contributed to iOS
   suspending the media session. Pause is communicated via
   `mediaSession.playbackState = "paused"` instead.

Regression tests added: `src/lib/__tests__/mobile-audio.test.ts` covers the
prime-after-stop and per-call audio-session re-application.

A fourth potential fix (switching the `quran-audio.ts` download fetches to
`mode: "no-cors"`) was investigated and rejected — empirical testing
confirmed the existing `mode: "cors"` works for both download.quranicaudio.com
and mp3quran.net mirrors, and `no-cors` would silently break downloads
because opaque responses have `body: null` and `blob()` returns an empty
Blob per the Fetch spec. A `NOTE` was added to `fetchAudioFromUrl`
documenting why we keep `cors`.

### v3.9.3 — Live Sleep Mode status on the home tile (2026-04-28)

The home Sleep Mode tile now reflects an in-progress session in real time.
Architecture change:

- The Sleep Mode player has been lifted out of `useSleepModePlayer` (per-mount
  React hook) into a module-level singleton at `src/lib/sleep-mode-player.ts`.
  The singleton owns the audio element, countdown timer, fade interval,
  Media Session handlers, and the supabase session row — so audio + timer
  survive page navigation and re-entering `SleepModePage` picks back up the
  same active session instead of starting fresh.
- A new lightweight observable store at `src/lib/sleep-session-store.ts`
  publishes `{ status: "idle" | "playing" | "paused", remainingSeconds, ... }`.
  `useSleepSession()` is a `useSyncExternalStore` hook the home page consumes.
- `useSleepModePlayer` is now a thin React subscription that just re-exposes
  the singleton's snapshot + actions (and feeds it the auth user/deviceId via
  `setAuthContext` so the supabase insert keeps attributing correctly).
- `QuranPage.tsx` reads `useSleepSession()` and renders "playing · Nm left"
  / "paused · Nm left" on the Sleep tile, with an indigo accent and a
  pulsing ring around the icon while playing. Falls back to the existing
  "{timer}m · {reciter}" / "Tap to set up" labels when idle.

### v3.9.2 — iOS PWA reliability: Sleep Mode + first-run offline (2026-04-28)

Three closely-related iOS-PWA reports addressed in one pass:

1. **Sleep Mode now actually plays on iOS standalone PWAs.**
   - `src/lib/mobile-audio.ts` — stopped unconditionally setting
     `crossOrigin = "anonymous"` on the shared audio element. Many of
     our remote audio CDNs (mp3quran, quranicaudio) don't return CORS
     headers, so that attribute caused silent decode failures. Default
     is now no crossOrigin (correct for blob: + cross-origin), and we
     promote to `"anonymous"` only for same-origin sources.
   - `src/lib/mobile-audio.ts` — added `configurePlaybackAudioSession()`
     which sets `navigator.audioSession.type = "playback"` (iOS 17+)
     so the hardware silent switch no longer mutes Sleep Mode and the
     OS keeps the session alive in the background.
   - `src/hooks/useSleepModePlayer.ts` — populated
     `navigator.mediaSession.metadata` (surah, reciter, app-icon
     artwork) and registered play/pause/stop action handlers so the
     iOS lock-screen controls light up. Without these, iOS suspends
     web audio after a few seconds of screen-off in standalone mode.
     The handlers dispatch through a `playbackControlsRef` that's
     kept in sync via `useEffect`, breaking the otherwise circular
     reference between `play` / `pause` / `resume`.
   - `src/hooks/useSleepModePlayer.ts` — `startSession` and
     `saveSession` are now fire-and-forget so a slow Supabase round-
     trip can no longer gate playback. Added `audio.onerror` /
     `audio.onended` cleanup paths.

2. **Discoverability for downloads + Sleep Mode.**
   - `src/pages/QuranPage.tsx` — added a new dashboard section
     `"tools"` rendering a 2x2 of Sleep Mode + Offline Library tiles.
     Integrates with the existing reorder/hide UI via
     `DEFAULT_DASHBOARD_ORDER` and `sectionLabels`. The order
     normalizer was rewritten to **append** any newly-shipped section
     IDs missing from a user's persisted `wise-home-dashboard-order`,
     so existing installs see the new tiles without resetting their
     layout.

3. **PWA boots offline on first run after install.**
   - `vite.config.ts` — removed
     `**/assets/*Page-*.js` and `**/assets/charts-vendor-*.js` from
     `globIgnores`, raised `maximumFileSizeToCacheInBytes` to 5 MB.
     All lazy route chunks now precache during SW install.
   - `src/sw.ts` — added a `CacheFirst` runtime route for
     `/assets/*.js` and `/assets/*.css` as a safety net for any chunk
     that wasn't in the precache (CacheFirst is safe because Vite
     hashes the filenames — a new chunk version is a different URL).
   - `src/lib/lazy-with-retry.ts` (new) — `lazyWithRetry(factory, name)`
     wraps `React.lazy`, retries the import once after 400 ms, then
     does a one-shot `window.location.reload()` (gated on
     `navigator.onLine` and a per-chunk `sessionStorage` flag) to
     pick up a new SW manifest.
   - `src/components/ErrorBoundary.tsx` — detects `ChunkLoadError` via
     `isLazyChunkError`, attempts a single online-gated reload, and
     surfaces an offline-aware Arabic fallback ("هذا الجزء لم يُحفظ
     بعد") instead of a stack trace.
   - `src/App.tsx` — replaced `prefetchTopTabs` (5 routes) with
     `prefetchAllRoutes` (every lazy page) on `requestIdleCallback`
     after splash, so all chunks reach the precache during the very
     first online run.

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
