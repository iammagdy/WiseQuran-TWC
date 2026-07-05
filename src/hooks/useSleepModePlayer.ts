import { useEffect, useRef, useSyncExternalStore } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceId } from "@/hooks/useDeviceId";
import { sleepModePlayer } from "@/lib/sleep-mode-player";
import { audioDebugLog, isAudioDebugEnabled } from "@/lib/audio-debug-log";

// Re-export the public API previously exposed by this hook so existing
// import sites (`@/hooks/useSleepModePlayer`) keep working unchanged.
export {
  loadSleepModePrefs,
  hasConfiguredSleepMode,
  SLEEP_PREFS_CHANGED_EVENT,
} from "@/lib/sleep-mode-player";
export type { SleepModePrefs } from "@/lib/sleep-mode-player";

/**
 * Thin React subscription over the module-level Sleep Mode player.
 * The actual audio orchestration, timer, and session lifecycle live in
 * `@/lib/sleep-mode-player` so they survive page navigation — that's
 * what lets the home Sleep Mode tile show "playing · Nm left" while
 * the user is on the home screen, and lets re-entering the Sleep page
 * pick up the same active session.
 */
export function useSleepModePlayer() {
  const { user } = useAuth();
  const deviceId = useDeviceId();

  // Keep the singleton's auth context in sync from React so the
  // supabase session insert can attribute correctly without the
  // singleton having to peek into React.
  useEffect(() => {
    sleepModePlayer.setAuthContext(user?.id ?? null, deviceId);
  }, [user?.id, deviceId]);

  // Diagnostic bridge: when audio-debug is on we wrap subscribe so the
  // log captures (a) every React subscribe/unsubscribe and (b) every
  // listener-fired notification. This is the missing evidence for "did
  // the singleton notify React, or did setSnapshot fire into the void?"
  // — the symptom of "tap Play, nothing visible" on iPhone could be
  // either side of this bridge, and we need the trace to tell us.
  const fireCountRef = useRef(0);
  const subscribeFn = isAudioDebugEnabled() ? instrumentedSubscribe(fireCountRef) : sleepModePlayer.subscribe;

  const snapshot = useSyncExternalStore(
    subscribeFn,
    sleepModePlayer.getSnapshot,
    sleepModePlayer.getSnapshot,
  );

  return {
    prefs: snapshot.prefs,
    setPrefs: sleepModePlayer.setPrefs,
    isPlaying: snapshot.isPlaying,
    isLoading: snapshot.isLoading,
    hasError: snapshot.hasError,
    isOfflineUncached: snapshot.isOfflineUncached,
    remainingSeconds: snapshot.remainingSeconds,
    audioCurrentTime: snapshot.audioCurrentTime,
    audioDuration: snapshot.audioDuration,
    togglePlay: sleepModePlayer.togglePlay,
    stop: sleepModePlayer.stop,
  };
}

// Wraps sleepModePlayer.subscribe so every React listener registration,
// notification, and unregistration is logged. Returns a function with
// the same `(listener) => unsubscribe` shape that useSyncExternalStore
// expects. NB: this only runs when the audio-debug gate is on, so it
// adds no production cost.
function instrumentedSubscribe(
  fireCountRef: React.MutableRefObject<number>,
): (listener: () => void) => () => void {
  return (listener: () => void) => {
    audioDebugLog("useSleepModePlayer:subscribe");
    const wrapped = () => {
      fireCountRef.current += 1;
      audioDebugLog("useSleepModePlayer:listener", () => ({
        fireCount: fireCountRef.current,
        snapshot: summarizeSnapshot(sleepModePlayer.getSnapshot()),
      }));
      listener();
    };
    const unsub = sleepModePlayer.subscribe(wrapped);
    return () => {
      audioDebugLog("useSleepModePlayer:unsubscribe", () => ({
        fireCount: fireCountRef.current,
      }));
      unsub();
    };
  };
}

function summarizeSnapshot(s: ReturnType<typeof sleepModePlayer.getSnapshot>) {
  return {
    isPlaying: s.isPlaying,
    isLoading: s.isLoading,
    hasError: s.hasError,
    isOfflineUncached: s.isOfflineUncached,
  };
}
