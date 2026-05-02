import { resolveAudioSource, cachePlayingAudio } from "@/lib/quran-audio";
import { supabase } from "@/lib/supabase";
import { mobileAudioManager, configurePlaybackAudioSession } from "@/lib/mobile-audio";
import { getReciterById } from "@/lib/reciters";
import { SURAH_META } from "@/data/surah-meta";
import {
  setSleepSessionState,
  resetSleepSessionState,
} from "@/lib/sleep-session-store";
import { audioDebugLog } from "@/lib/audio-debug-log";

export interface SleepModePrefs {
  reciterId: string;
  surahNumber: number;
  timerMinutes: number;
  quranVolume: number;
}

const PREFS_KEYS = {
  reciter: "wise-sleep-mode-reciter",
  timer: "wise-sleep-mode-timer",
  surah: "wise-sleep-mode-surah",
  quranVolume: "wise-sleep-mode-quran-volume",
} as const;

/**
 * Broadcast that the user's Sleep Mode preferences changed (reciter,
 * surah, timer, or volume). Listened to by the home Sleep Mode tile so
 * its label ("30m · Alafasy") refreshes without a reload after the
 * user adjusts settings on the Sleep page.
 */
export const SLEEP_PREFS_CHANGED_EVENT = "wise-sleep-prefs-changed";

/**
 * Compute the user's "adjusted total session length" in seconds based
 * on a single lock-screen seek event. Modeled as
 * "elapsed time before this seek" + "the remaining time the user just
 * chose", so the result reflects the user's intent at the moment they
 * scrubbed (e.g. picking 30m then immediately scrubbing to 8m left
 * yields 480s; letting 5m elapse first yields 900s).
 *
 * Exported as a pure function so the analytics math can be unit-tested
 * without standing up the whole player + audio stack.
 */
export function computeAdjustedTimerSeconds(
  totalSecs: number,
  previousRemainingSecs: number,
  newRemainingSecs: number,
): number {
  const clampedNewRemaining = Math.max(0, Math.min(newRemainingSecs, totalSecs));
  const clampedPreviousRemaining = Math.max(0, Math.min(previousRemainingSecs, totalSecs));
  const previousElapsed = totalSecs - clampedPreviousRemaining;
  return previousElapsed + clampedNewRemaining;
}

function readPrefs(): SleepModePrefs {
  return {
    reciterId: localStorage.getItem(PREFS_KEYS.reciter) ?? "alafasy",
    surahNumber: Number(localStorage.getItem(PREFS_KEYS.surah) ?? 36),
    timerMinutes: Number(localStorage.getItem(PREFS_KEYS.timer) ?? 30),
    quranVolume: Number(localStorage.getItem(PREFS_KEYS.quranVolume) ?? 80),
  };
}

/**
 * Public read accessor for the persisted Sleep Mode prefs. Safe to
 * call outside the hook (e.g. from the home tile) without instantiating
 * the player.
 */
export function loadSleepModePrefs(): SleepModePrefs {
  return readPrefs();
}

/**
 * True when the user has saved at least one Sleep Mode pref. Used by
 * the home tile to decide between the "tap to set up" empty state
 * and the "{timer}m · {reciter}" summary.
 */
export function hasConfiguredSleepMode(): boolean {
  return (
    localStorage.getItem(PREFS_KEYS.reciter) !== null ||
    localStorage.getItem(PREFS_KEYS.timer) !== null ||
    localStorage.getItem(PREFS_KEYS.surah) !== null ||
    localStorage.getItem(PREFS_KEYS.quranVolume) !== null
  );
}

function persistPrefs(prefs: SleepModePrefs) {
  localStorage.setItem(PREFS_KEYS.reciter, prefs.reciterId);
  localStorage.setItem(PREFS_KEYS.surah, String(prefs.surahNumber));
  localStorage.setItem(PREFS_KEYS.timer, String(prefs.timerMinutes));
  localStorage.setItem(PREFS_KEYS.quranVolume, String(prefs.quranVolume));
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(SLEEP_PREFS_CHANGED_EVENT, { detail: prefs }));
    } catch (err) {
      audioDebugLog("sleepModePlayer.persistPrefs:dispatchFailed", undefined, err);
    }
  }
}

const FADE_OUT_START_SECS = 180;
const SLEEP_CHANNEL = "sleep" as const;

export interface SleepPlayerSnapshot {
  prefs: SleepModePrefs;
  isPlaying: boolean;
  isLoading: boolean;
  hasError: boolean;
  isOfflineUncached: boolean;
  remainingSeconds: number;
  audioCurrentTime: number;
  audioDuration: number;
}

function createInitialSnapshot(): SleepPlayerSnapshot {
  const prefs = readPrefs();
  return {
    prefs,
    isPlaying: false,
    isLoading: false,
    hasError: false,
    isOfflineUncached: false,
    remainingSeconds: prefs.timerMinutes * 60,
    audioCurrentTime: 0,
    audioDuration: 0,
  };
}

/**
 * Module-level Sleep Mode player. Owns audio orchestration, the
 * countdown timer, and the public state snapshot. Lives outside React
 * so audio + the timer survive page navigation — the home Sleep Mode
 * tile can read live status while the user is on the home screen, and
 * re-entering the Sleep page picks back up the same active session
 * instead of starting fresh.
 */
function createSleepModePlayer() {
  let snapshot: SleepPlayerSnapshot = createInitialSnapshot();
  const listeners = new Set<() => void>();

  let audio: HTMLAudioElement | null = null;
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let fadeInterval: ReturnType<typeof setInterval> | null = null;
  let sessionId: string | null = null;
  let hasStarted = false;
  // Most recent user-adjusted total session length (seconds) coming from
  // the OS lock-screen scrubber. Null until the user actually scrubs —
  // analytics readers fall back to `timer_minutes * 60` in that case.
  let adjustedTimerSeconds: number | null = null;
  // Coalesced timer for persisting `adjustedTimerSeconds` to supabase.
  // The lock-screen scrubber can fire many times in rapid succession
  // (every drag tick), so we debounce the UPDATE to avoid hammering the
  // network — only the latest value matters.
  let adjustedTimerWriteTimer: ReturnType<typeof setTimeout> | null = null;
  const ADJUSTED_TIMER_WRITE_DEBOUNCE_MS = 500;
  // Monotonically increasing token. Each play() call captures a token; any
  // async continuation that finds the global token has moved on bails out.
  // This protects against rapid play -> stop -> play (or play -> play with
  // different prefs) where an older play()'s post-await continuation could
  // otherwise mutate state and start a stale playback after a newer action.
  let playToken = 0;
  // Holds the object URL when we're playing from a cached IDB blob, so we
  // can revoke it on stop / track change. Network URLs are stored as null
  // (nothing to revoke).
  let blobUrl: string | null = null;

  // Auth context (user id + device id) used to attribute the supabase
  // session insert. The hook keeps this in sync from React via
  // setAuthContext() so the singleton never has to peek into React.
  let authContext: { userId: string | null; deviceId: string | null } = {
    userId: null,
    deviceId: null,
  };

  function setSnapshot(updates: Partial<SleepPlayerSnapshot>) {
    // Only log meaningful state transitions (not every audioCurrentTime
    // tick, which would flood the buffer at 4Hz). isPlaying / isLoading
    // / hasError / isOfflineUncached / remainingSeconds-on-reset cover
    // the diagnostically-relevant transitions for the "tap Play does
    // nothing" report.
    const interestingKeys = [
      "isPlaying",
      "isLoading",
      "hasError",
      "isOfflineUncached",
    ] as const;
    const interesting: Record<string, unknown> = {};
    for (const key of interestingKeys) {
      if (key in updates && updates[key] !== snapshot[key]) {
        interesting[key] = updates[key];
      }
    }
    snapshot = { ...snapshot, ...updates };
    if (Object.keys(interesting).length > 0) {
      audioDebugLog("sleepModePlayer.setSnapshot", () => ({
        changed: interesting,
        listenerCount: listeners.size,
      }));
    }
    for (const listener of listeners) listener();
  }

  function setPrefsInternal(updater: (prev: SleepModePrefs) => SleepModePrefs) {
    const next = updater(snapshot.prefs);
    persistPrefs(next);
    setSnapshot({ prefs: next });
  }

  function detachAudioListeners(target: HTMLAudioElement | null) {
    if (!target) return;
    target.ontimeupdate = null;
    target.onloadedmetadata = null;
    target.onplaying = null;
    target.onwaiting = null;
    target.onerror = null;
    target.onended = null;
  }

  // Wire (or unwire) the OS Media Session controls. iOS standalone
  // PWAs aggressively suspend background playback unless they see a
  // populated MediaMetadata + at least one valid action handler — once
  // we set those, the lock-screen controls light up and audio keeps
  // playing through screen-off and the silent switch.
  function updateMediaSession(currentPrefs: SleepModePrefs, playing: boolean) {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    const reciter = getReciterById(currentPrefs.reciterId);
    const surah = SURAH_META.find((s) => s.number === currentPrefs.surahNumber);
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: surah ? surah.name : `Surah ${currentPrefs.surahNumber}`,
        artist: reciter.name,
        album: "Wise Quran — Sleep Mode",
        artwork: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      });
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    } catch (err) {
      audioDebugLog("sleepModePlayer.updateMediaSession:failed", { playing }, err);
    }
  }

  function clearMediaSession() {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("stop", null);
      navigator.mediaSession.setActionHandler("seekto", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
    } catch (err) {
      audioDebugLog("sleepModePlayer.clearMediaSession:failed", undefined, err);
    }
    clearMediaPositionState();
  }

  // Push the live countdown into the OS media controls. iOS Control
  // Center / lock screen and Android Chrome notification render this
  // as a progress bar that ticks down in real time, giving the user a
  // visible "N minutes left" without needing to open the PWA.
  //
  // We model the Sleep timer as a track of length `totalSecs` and pass
  // `elapsedSecs` as the current position — this maps cleanly onto the
  // existing media UI metaphor (elapsed on the left, remaining on the
  // right). We always report playbackRate: 1 — Safari throws TypeError
  // on playbackRate: 0, which silently breaks the lock-screen progress
  // bar. Pause is communicated via navigator.mediaSession.playbackState
  // ("paused" / "playing") and via NOT calling this function during the
  // paused interval; the OS stops extrapolating once playbackState is
  // "paused" regardless of the most recent playbackRate.
  function updateMediaPositionState(
    totalSecs: number,
    elapsedSecs: number,
    _playing: boolean,
  ) {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (typeof navigator.mediaSession.setPositionState !== "function") return;
    if (!Number.isFinite(totalSecs) || totalSecs <= 0) return;
    const clampedElapsed = Math.max(0, Math.min(elapsedSecs, totalSecs));
    try {
      // playbackRate must be > 0. Safari throws TypeError on 0, which
      // (a) silently breaks the lock-screen progress bar and
      // (b) contributes to iOS deciding the media session is malformed
      // and suspending it. Play/pause state is communicated separately
      // via navigator.mediaSession.playbackState — keep playbackRate at 1.
      navigator.mediaSession.setPositionState({
        duration: totalSecs,
        position: clampedElapsed,
        playbackRate: 1,
      });
    } catch (err) {
      audioDebugLog(
        "sleepModePlayer.updateMediaPositionState:failed",
        { totalSecs, elapsedSecs },
        err,
      );
    }
  }

  function clearMediaPositionState() {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (typeof navigator.mediaSession.setPositionState !== "function") return;
    try {
      navigator.mediaSession.setPositionState();
    } catch (err) {
      audioDebugLog("sleepModePlayer.clearMediaPositionState:failed", undefined, err);
    }
  }

  function cleanupBlobUrl() {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      blobUrl = null;
    }
  }

  function stopAll() {
    audioDebugLog("sleepModePlayer.stopAll:enter", {
      hasStarted,
      hasAudio: Boolean(audio),
      isPlaying: snapshot.isPlaying,
      isLoading: snapshot.isLoading,
      playToken,
    });
    // Invalidate any in-flight play() continuation so it cannot mutate state
    // or start playback after we stop.
    playToken += 1;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (fadeInterval) {
      clearInterval(fadeInterval);
      fadeInterval = null;
    }
    if (adjustedTimerWriteTimer) {
      clearTimeout(adjustedTimerWriteTimer);
      adjustedTimerWriteTimer = null;
    }
    adjustedTimerSeconds = null;
    detachAudioListeners(audio);
    if (hasStarted) {
      // Only touch the shared audio element if Sleep Mode actually used it.
      mobileAudioManager.stop(SLEEP_CHANNEL, true);
    }
    cleanupBlobUrl();
    clearMediaSession();
    audio = null;
    hasStarted = false;
    setSnapshot({
      isPlaying: false,
      isLoading: false,
      audioCurrentTime: 0,
      audioDuration: 0,
    });
    // Drop the global session entry — the home tile falls back to the
    // saved-prefs label.
    resetSleepSessionState();
  }

  function saveSession(completed: boolean) {
    if (!sessionId) return;
    const id = sessionId;
    sessionId = null;
    // The completion update naturally subsumes any pending debounced
    // adjustment write — fold the latest adjusted value into this same
    // UPDATE and cancel the deferred one so we don't issue two writes
    // for the same row.
    if (adjustedTimerWriteTimer) {
      clearTimeout(adjustedTimerWriteTimer);
      adjustedTimerWriteTimer = null;
    }
    const update: {
      completed: boolean;
      ended_at: string;
      adjusted_timer_seconds?: number;
    } = { completed, ended_at: new Date().toISOString() };
    if (adjustedTimerSeconds !== null) {
      update.adjusted_timer_seconds = adjustedTimerSeconds;
    }
    // Fire-and-forget. We never want a Supabase write to block the
    // playback teardown — and Sleep Mode is mostly used while signed
    // out, so the row may not exist anyway.
    void supabase
      .from("sleep_mode_sessions")
      .update(update)
      .eq("id", id)
      .then(
        () => {},
        (err) => audioDebugLog("sleepModePlayer.saveSession:error", { id, completed }, err),
      );
  }

  // Persist the latest user-adjusted total session length to supabase.
  // Coalesced via debounce so a fast-moving lock-screen scrub only
  // results in one UPDATE per quiet period. Reads `sessionId` and
  // `adjustedTimerSeconds` at fire time so a session-row id that
  // resolves *after* the first scrub can still be written, and so a
  // stopAll() that ran in between (which nulls both) cleanly aborts.
  function scheduleAdjustedTimerWrite() {
    if (adjustedTimerWriteTimer) {
      clearTimeout(adjustedTimerWriteTimer);
      adjustedTimerWriteTimer = null;
    }
    adjustedTimerWriteTimer = setTimeout(() => {
      adjustedTimerWriteTimer = null;
      const id = sessionId;
      const value = adjustedTimerSeconds;
      if (!id || value === null) return;
      void supabase
        .from("sleep_mode_sessions")
        .update({ adjusted_timer_seconds: value })
        .eq("id", id)
        .then(
          () => {},
          (err) => audioDebugLog("sleepModePlayer.scheduleAdjustedTimerWrite:error", { id, value }, err),
        );
    }, ADJUSTED_TIMER_WRITE_DEBOUNCE_MS);
  }

  function startSession(currentPrefs: SleepModePrefs) {
    // Fire-and-forget so the playback critical path is NOT gated on a
    // Supabase round-trip (which on iOS standalone PWAs frequently
    // stalls under network handoff between Wi-Fi and cellular). The
    // session row is purely analytical — playback must start whether
    // or not the insert ever succeeds.
    void supabase
      .from("sleep_mode_sessions")
      .insert({
        user_id: authContext.userId ?? null,
        device_id: authContext.userId ? null : authContext.deviceId,
        reciter_id: currentPrefs.reciterId,
        surah_number: currentPrefs.surahNumber,
        timer_minutes: currentPrefs.timerMinutes,
        nature_sound: null,
        completed: false,
      })
      .select("id")
      .maybeSingle()
      .then(
        ({ data }) => {
          if (data?.id) sessionId = data.id;
        },
        (err) => audioDebugLog(
          "sleepModePlayer.startSession:error",
          () => ({
            reciterId: currentPrefs.reciterId,
            surahNumber: currentPrefs.surahNumber,
          }),
          err,
        ),
      );
  }

  function startFadeOut(currentQuranVol: number, fadeDurationSecs: number = FADE_OUT_START_SECS) {
    let qVol = currentQuranVol / 100;
    // Scale the step count to the time we actually have left so a
    // user who scrubbed into the middle of the fade window still
    // ends at silence right when the timer hits zero.
    const steps = Math.max(1, Math.floor(fadeDurationSecs / 2));
    const qDecrement = qVol / steps;

    fadeInterval = setInterval(() => {
      qVol = Math.max(0, qVol - qDecrement);
      if (audio) audio.volume = qVol;
      if (qVol <= 0) {
        if (fadeInterval) clearInterval(fadeInterval);
      }
    }, 2000);
  }

  // Apply a new "remaining seconds" value coming from the OS lock-screen
  // scrubber (seekto / seekforward / seekbackward). Keeps the on-screen
  // countdown, the global session store, and the OS progress bar all in
  // sync, restarts the per-second tick from the new offset, and re-arms
  // (or tears down) the volume fade-out depending on whether we landed
  // inside the final fade window.
  function adjustTimer(newRemainingSecs: number) {
    // Only meaningful while a session is active. Without an audio
    // element there's nothing to seek against.
    if (!audio) return;

    const totalSecs = snapshot.prefs.timerMinutes * 60;
    const clampedRemaining = Math.max(0, Math.min(newRemainingSecs, totalSecs));
    const newElapsed = totalSecs - clampedRemaining;
    const wasPlaying = snapshot.isPlaying;

    // Capture the remaining time *before* this seek lands so we can
    // model the user's adjusted intent below. After setSnapshot() runs,
    // `snapshot.remainingSeconds` reflects the new (post-seek) value
    // and the math would always collapse back to `totalSecs`.
    const previousRemaining = snapshot.remainingSeconds;

    setSnapshot({ remainingSeconds: clampedRemaining });
    setSleepSessionState({ remainingSeconds: clampedRemaining });
    updateMediaPositionState(totalSecs, newElapsed, wasPlaying);

    // Record the user-adjusted total session length for analytics —
    // see computeAdjustedTimerSeconds() for the model. Persisted via
    // a debounced write so a fast scrub only produces one UPDATE.
    adjustedTimerSeconds = computeAdjustedTimerSeconds(
      totalSecs,
      previousRemaining,
      clampedRemaining,
    );
    scheduleAdjustedTimerWrite();

    // Tear down any in-flight fade — it was scheduled against the old
    // remaining time, so its decrement curve no longer matches reality.
    // We restore the user's chosen volume so subsequent tick logic can
    // re-arm a fresh fade against the adjusted remaining time.
    if (fadeInterval) {
      clearInterval(fadeInterval);
      fadeInterval = null;
    }
    if (audio) {
      audio.volume = snapshot.prefs.quranVolume / 100;
    }

    // User dragged the scrubber to the end — finish the session as if
    // the timer had naturally elapsed.
    if (clampedRemaining <= 0) {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      saveSession(true);
      stopAll();
      return;
    }

    // Restart the per-second tick from the new elapsed offset so future
    // ticks stay aligned with the adjusted countdown. While paused there
    // is no running interval to reset (pause() already cleared it).
    if (wasPlaying) {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      startTimerInterval(totalSecs, newElapsed, snapshot.prefs);
      // If we landed inside the fade window, re-arm the fade scaled to
      // the time we actually have left. startTimerInterval only triggers
      // a fade when remaining ticks down through exactly
      // FADE_OUT_START_SECS, which won't happen if the user seeks past
      // that boundary in one jump.
      if (clampedRemaining <= FADE_OUT_START_SECS) {
        startFadeOut(snapshot.prefs.quranVolume, clampedRemaining);
      }
    }
  }

  function startTimerInterval(totalSecs: number, initialElapsed: number, currentPrefs: SleepModePrefs) {
    let elapsed = initialElapsed;
    timerInterval = setInterval(() => {
      elapsed += 1;
      const remaining = totalSecs - elapsed;
      setSnapshot({ remainingSeconds: remaining });
      setSleepSessionState({ remainingSeconds: Math.max(0, remaining) });
      // Cap at totalSecs so the OS progress bar doesn't overshoot in the
      // tick where we're about to call stopAll().
      updateMediaPositionState(totalSecs, Math.min(elapsed, totalSecs), true);

      if (remaining === FADE_OUT_START_SECS) {
        startFadeOut(currentPrefs.quranVolume);
      }

      if (remaining <= 0) {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        saveSession(true);
        stopAll();
      }
    }, 1000);
  }

  async function play(overridePrefs?: SleepModePrefs) {
    audioDebugLog("sleepModePlayer.play:enter", () => ({
      reciterId: (overridePrefs ?? snapshot.prefs).reciterId,
      surahNumber: (overridePrefs ?? snapshot.prefs).surahNumber,
      timerMinutes: (overridePrefs ?? snapshot.prefs).timerMinutes,
      online: typeof navigator !== "undefined" ? navigator.onLine : "unknown",
      visibility:
        typeof document !== "undefined" ? document.visibilityState : "unknown",
    }));
    // stopAll() bumps playToken. Capture the new token AFTER, so this
    // play() invocation has its own identity for staleness checks below.
    stopAll();
    const myToken = ++playToken;
    const isStale = () => playToken !== myToken;

    setSnapshot({ hasError: false, isOfflineUncached: false, isLoading: true });

    // iOS 17+: declare this as a "playback" audio session so the
    // hardware silent switch does not mute Sleep Mode and the OS
    // keeps the audio alive in the background. Must run inside the
    // user-gesture tick that originated this play(), which it does
    // because togglePlay() calls play() directly from the click
    // handler.
    configurePlaybackAudioSession();

    const currentPrefs = overridePrefs ?? snapshot.prefs;

    // === iOS-safe audio bring-up ===
    // Grab the shared, properly-configured audio element for the "sleep" channel
    // (playsInline, webkit-playsinline, crossOrigin="anonymous", preload="auto"
    // are all set on it by mobileAudioManager.getAudio). Then call prime()
    // SYNCHRONOUSLY inside this user-gesture-initiated call so the underlying
    // .play() of the silent unlock MP3 happens within the activation tick —
    // this is what registers the element as "user-activated" on iOS Safari /
    // standalone PWA mode. The promise can resolve later, but the gesture has
    // been "spent" on this element, not lost.
    const localAudio = mobileAudioManager.getAudio(SLEEP_CHANNEL);
    audio = localAudio;
    hasStarted = true;

    const primePromise = mobileAudioManager.prime(SLEEP_CHANNEL);

    try {
      // These can run after the gesture; the element is already activated.
      await primePromise;
      if (isStale()) {
        audioDebugLog("sleepModePlayer.play:stale", { stage: "afterPrime", myToken, current: playToken });
        return;
      }

      // Resolve the audio source: if the surah is downloaded for this
      // reciter, this returns a blob: URL backed by IndexedDB and Sleep
      // Mode plays fully offline. Otherwise it returns the network URL
      // (when online) or null (when offline AND uncached).
      audioDebugLog("sleepModePlayer.play:resolveAudioSource:start");
      const source = await resolveAudioSource(currentPrefs.reciterId, currentPrefs.surahNumber);
      audioDebugLog("sleepModePlayer.play:resolveAudioSource:result", () => ({
        hasSource: Boolean(source),
        cached: source?.cached,
        srcPreview: source ? source.url.slice(0, 60) : "",
      }));
      if (isStale()) {
        audioDebugLog("sleepModePlayer.play:stale", { stage: "afterResolve", myToken, current: playToken });
        // We were superseded while resolving; revoke any blob URL we
        // were about to use so it doesn't leak.
        if (source?.cached) URL.revokeObjectURL(source.url);
        return;
      }
      if (!source) {
        audioDebugLog("sleepModePlayer.play:offlineUncached");
        // Offline and not cached. Surface a structured empty-state to
        // the page rather than a generic playback failure.
        setSnapshot({ isOfflineUncached: true });
        stopAll();
        return;
      }
      if (source.cached) {
        // Track for revocation on stop / next track.
        blobUrl = source.url;
      }

      // Re-attach fresh listeners after prime (prime restores src, but we want
      // to drive the timer/loader UI off the real reciter audio element).
      detachAudioListeners(localAudio);
      localAudio.ontimeupdate = () => setSnapshot({ audioCurrentTime: localAudio.currentTime });
      localAudio.onloadedmetadata = () => setSnapshot({ audioDuration: localAudio.duration });
      localAudio.onplaying = () => setSnapshot({ isLoading: false });
      localAudio.onwaiting = () => setSnapshot({ isLoading: true });
      localAudio.onerror = () => {
        if (isStale()) return;
        setSnapshot({ hasError: true, isLoading: false });
        stopAll();
      };
      localAudio.onended = () => {
        // Surah ended naturally before the timer ran out — stop and
        // let the user pick another. (Looping is intentionally not
        // forced; the timer-driven fade-out is the user-visible
        // "the session is done" signal.)
        if (isStale()) return;
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
        saveSession(true);
        stopAll();
      };

      const totalSecs = currentPrefs.timerMinutes * 60;
      setSnapshot({ remainingSeconds: totalSecs });

      // mobileAudioManager.play sets the src, runs audio.load(), and calls
      // .play() — with a single retry-after-load fallback if the first call
      // is rejected (which iOS occasionally does on cold start). Works
      // identically for blob: and https: URLs on iOS Safari / standalone.
      audioDebugLog("sleepModePlayer.play:invokeMobilePlay");
      await mobileAudioManager.play(SLEEP_CHANNEL, source.url, {
        forceLoad: true,
        volume: currentPrefs.quranVolume / 100,
      });
      audioDebugLog("sleepModePlayer.play:mobilePlayResolved");
      if (isStale()) {
        audioDebugLog("sleepModePlayer.play:stale", { stage: "afterMobilePlay", myToken, current: playToken });
        // A newer action superseded us. The "sleep" channel is shared, so
        // we MUST NOT call mobileAudioManager.stop() here — the newer
        // play() already called stopAll() before incrementing the token,
        // and any subsequent .play() it issues owns the channel from this
        // point on. Stopping here would race-kill the newer playback.
        //
        // We must also NOT touch the module-level blobUrl via cleanupBlobUrl():
        // by the time this stale branch runs, the newer play()'s own
        // stopAll() has already wiped our reference, and that newer
        // play() may have since reassigned blobUrl to ITS new URL.
        // Instead, revoke the local `source.url` directly (the URL we
        // ourselves created via createObjectURL), so we leak nothing
        // and we don't risk revoking the in-use newer URL.
        if (source.cached) {
          URL.revokeObjectURL(source.url);
        }
        return;
      }

      setSnapshot({ isPlaying: true });
      // Publish the live session to the global store so the home Sleep
      // Mode tile can show "playing · Nm left" without re-instantiating
      // this player.
      setSleepSessionState({
        status: "playing",
        remainingSeconds: totalSecs,
        totalSeconds: totalSecs,
        reciterId: currentPrefs.reciterId,
        surahNumber: currentPrefs.surahNumber,
      });

      // OS lock-screen / Control Center: title, artist, artwork +
      // play/pause/stop handlers. Without these, iOS silently
      // suspends the audio after a few seconds of screen-off in a
      // standalone PWA — this is the single biggest cause of "Sleep
      // Mode plays for 5 seconds then stops" reports.
      updateMediaSession(currentPrefs, true);
      // Seed the lock-screen progress bar at 0 so it appears
      // immediately, before the first 1-second timer tick fires.
      updateMediaPositionState(totalSecs, 0, true);
      if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
        try {
          navigator.mediaSession.setActionHandler("play", () => {
            void resume();
          });
          navigator.mediaSession.setActionHandler("pause", () => {
            pause();
          });
          navigator.mediaSession.setActionHandler("stop", () => {
            saveSession(false);
            stopAll();
          });
          // Lock-screen / Control Center scrubber. iOS and Android
          // both expose this once we publish a positionState; without
          // a handler the bar is read-only and the user can see "20m
          // left" but not change it.
          //
          // We treat the published track as Sleep timer length, so the
          // scrubber's "position" maps to elapsed seconds and the new
          // remaining time is (total - seekTime).
          navigator.mediaSession.setActionHandler("seekto", (details) => {
            if (details.seekTime === undefined || details.seekTime === null) return;
            const totalSecsNow = snapshot.prefs.timerMinutes * 60;
            const newElapsed = Math.max(0, Math.min(details.seekTime, totalSecsNow));
            adjustTimer(totalSecsNow - newElapsed);
          });
          // OS "skip forward" buttons (Android Chrome notification, some
          // iOS car/headphone integrations). seekOffset is the OS's
          // suggested jump; we fall back to 15s so the buttons still do
          // something useful when it isn't provided. "Forward" advances
          // playback position, which means LESS time left on the timer.
          navigator.mediaSession.setActionHandler("seekforward", (details) => {
            const offset = details.seekOffset ?? 15;
            adjustTimer(snapshot.remainingSeconds - offset);
          });
          navigator.mediaSession.setActionHandler("seekbackward", (details) => {
            const offset = details.seekOffset ?? 15;
            adjustTimer(snapshot.remainingSeconds + offset);
          });
        } catch (err) {
          audioDebugLog("sleepModePlayer.setActionHandlers:failed", undefined, err);
        }
      }

      // Background-cache the surah after a successful network play, so the
      // next Sleep session for this reciter+surah will work offline. No-op
      // if it's already cached (we'd be on the blob: URL branch above).
      if (!source.cached && navigator.onLine) {
        cachePlayingAudio(currentPrefs.reciterId, currentPrefs.surahNumber, source.url).catch(
          (err) =>
            audioDebugLog(
              "sleepModePlayer.cachePlayingAudio:error",
              {
                reciterId: currentPrefs.reciterId,
                surahNumber: currentPrefs.surahNumber,
              },
              err,
            ),
        );
      }

      // Fire-and-forget — see startSession() for why we don't await.
      startSession(currentPrefs);

      startTimerInterval(totalSecs, 0, currentPrefs);
      audioDebugLog("sleepModePlayer.play:success");
    } catch (err) {
      if (isStale()) {
        audioDebugLog(
          "sleepModePlayer.play:catch:stale",
          { myToken, current: playToken },
          err,
        );
        return;
      }
      audioDebugLog("sleepModePlayer.play:catch:error", undefined, err);
      setSnapshot({ hasError: true, isLoading: false });
      stopAll();
    }
  }

  function pause() {
    audio?.pause();
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (fadeInterval) {
      clearInterval(fadeInterval);
      fadeInterval = null;
    }
    setSnapshot({ isPlaying: false });
    setSleepSessionState({ status: "paused" });
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.playbackState = "paused";
      } catch (err) {
        audioDebugLog("sleepModePlayer.pause:playbackStateFailed", undefined, err);
      }
    }
    // Freeze the lock-screen progress bar at the paused position
    // (playbackRate: 0) so it stops ticking until the user resumes.
    const totalSecsAtPause = snapshot.prefs.timerMinutes * 60;
    const elapsedAtPause = totalSecsAtPause - snapshot.remainingSeconds;
    updateMediaPositionState(totalSecsAtPause, elapsedAtPause, false);
  }

  async function resume() {
    if (!audio) {
      audioDebugLog("sleepModePlayer.resume:short-circuit", { reason: "noAudio" });
      return;
    }
    audioDebugLog("sleepModePlayer.resume:enter");
    // Resume on the same activated element — no src swap, so iOS allows it.
    await mobileAudioManager.play(SLEEP_CHANNEL).catch((err) => {
      audioDebugLog("sleepModePlayer.resume:mobilePlayError", undefined, err);
    });
    setSnapshot({ isPlaying: true });
    setSleepSessionState({ status: "playing" });
    if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
      try {
        navigator.mediaSession.playbackState = "playing";
      } catch (err) {
        audioDebugLog("sleepModePlayer.resume:playbackStateFailed", undefined, err);
      }
    }

    const currentPrefs = snapshot.prefs;
    const totalSecs = currentPrefs.timerMinutes * 60;
    const elapsed = totalSecs - snapshot.remainingSeconds;
    // Refresh positionState with playbackRate: 1 so the OS resumes
    // extrapolating the bar before the next timer tick lands.
    updateMediaPositionState(totalSecs, elapsed, true);
    startTimerInterval(totalSecs, elapsed, currentPrefs);
    // If the user scrubbed into the fade window while paused, we
    // didn't arm the fade in adjustTimer() (gated on `wasPlaying`).
    // startTimerInterval() also won't kick fade in because it only
    // triggers at the exact moment remaining ticks down through
    // FADE_OUT_START_SECS — which won't happen if we resume already
    // inside the window. Catch that case here so the audio still
    // fades to silence by the time the timer hits zero.
    if (snapshot.remainingSeconds > 0 && snapshot.remainingSeconds <= FADE_OUT_START_SECS) {
      if (fadeInterval) {
        clearInterval(fadeInterval);
        fadeInterval = null;
      }
      startFadeOut(currentPrefs.quranVolume, snapshot.remainingSeconds);
    }
  }

  async function togglePlay() {
    audioDebugLog("sleepModePlayer.togglePlay:enter", () => ({
      isLoading: snapshot.isLoading,
      isPlaying: snapshot.isPlaying,
      hasAudio: Boolean(audio),
      prefs: {
        reciterId: snapshot.prefs.reciterId,
        surahNumber: snapshot.prefs.surahNumber,
        timerMinutes: snapshot.prefs.timerMinutes,
      },
    }));
    if (snapshot.isLoading) {
      audioDebugLog("sleepModePlayer.togglePlay:short-circuit", {
        reason: "isLoading",
      });
      return;
    }
    if (!snapshot.isPlaying && !audio) {
      audioDebugLog("sleepModePlayer.togglePlay:branch", { branch: "play" });
      await play(snapshot.prefs);
    } else if (snapshot.isPlaying) {
      audioDebugLog("sleepModePlayer.togglePlay:branch", { branch: "pause" });
      pause();
    } else {
      audioDebugLog("sleepModePlayer.togglePlay:branch", { branch: "resume" });
      await resume();
    }
  }

  function stop() {
    saveSession(false);
    stopAll();
    setSnapshot({ remainingSeconds: snapshot.prefs.timerMinutes * 60 });
  }

  function setPrefs(updates: Partial<SleepModePrefs>) {
    setPrefsInternal((prev) => ({ ...prev, ...updates }));

    // Reset the on-screen countdown when the user picks a different
    // duration while idle.
    if (updates.timerMinutes !== undefined && !snapshot.isPlaying && !audio) {
      setSnapshot({ remainingSeconds: snapshot.prefs.timerMinutes * 60 });
    }

    // Live volume change while playing.
    if (updates.quranVolume !== undefined && audio) {
      audio.volume = snapshot.prefs.quranVolume / 100;
    }

    // Restart the active session if the surah or reciter changed mid-play
    // — preserves the previous behavior where switching tracks while
    // playing immediately switches to the new track.
    if (
      (updates.reciterId !== undefined || updates.surahNumber !== undefined) &&
      snapshot.isPlaying &&
      audio
    ) {
      void play(snapshot.prefs);
    }
  }

  function setAuthContext(userId: string | null, deviceId: string | null) {
    authContext = { userId, deviceId };
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function getSnapshot() {
    return snapshot;
  }

  return {
    subscribe,
    getSnapshot,
    play,
    pause,
    resume,
    togglePlay,
    stop,
    setPrefs,
    setAuthContext,
  };
}

export const sleepModePlayer = createSleepModePlayer();
