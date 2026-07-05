export const SILENT_MP3 = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq//OEAAOAAAAAIAAAAAQAAAADxIAAAeAAAAAAyIQUAAwEEAAAB1wQAAAAG5uP//xQo4BwwMAAECAR/f7//////9/4h7/8///Q2P//+T7f///+i//T//4iK5b4AAAAAAACAAH//OEAAiBQAIAAAQAAAABAAIAB4gAAB4AAAAB0QgUAAQIEAAEB1wQAAABW5+///xRgwBAAIAAACAR/f///////4h7/8///Q2P//+T7f///+i//T//4iK5b4AAAAAAAAIAA//OEAAyBwAIAAAQAAAABAAIAB4gAAB4AAAAB0QgUAAQIEAAEB1wQAAABW5+///xRgwBAAIAAACAR/f///////4h7/8///Q2P//+T7f///+i//T//4iK5b4AAAAAAAAIAA//OEAFAAQAIAAAQAAAABAAIAB4gAAB4AAAAB0QgUAAQIEAAEB1wQAAABW5+///xRgwBAAIAAACAR/f///////4h7/8///Q2P//+T7f///+i//T//4iK5b4AAAAAAAAIAA==";

export type ManagedAudioChannel = "quran" | "alarm" | "preview" | "ambient" | "sleep";

interface PlayOptions {
  forceLoad?: boolean;
  resetTime?: boolean;
  retryDelayMs?: number;
  volume?: number;
  // v3.9.8: opt out of the post-failure 220ms retry. The retry runs
  // OUTSIDE the originating user-gesture tick, which on iOS standalone
  // PWAs returns a play() promise that may never settle — the UI then
  // hangs on isLoading=true forever and the user perceives "tap Play,
  // nothing happens." Sleep Mode passes noRetry=true so the first
  // failure is surfaced to the caller, which sets hasError and breaks
  // the spinner.
  noRetry?: boolean;
}

function normalizeSource(src: string): string {
  if (typeof window === "undefined") return src;
  try {
    return new URL(src, window.location.origin).toString();
  } catch {
    return src;
  }
}

function clampVolume(volume: number | undefined) {
  if (typeof volume !== "number") return undefined;
  return Math.max(0, Math.min(1, volume));
}

class MobileAudioManager {
  private channels = new Map<ManagedAudioChannel, HTMLAudioElement>();
  private primedChannels = new Set<ManagedAudioChannel>();

  getAudio(channel: ManagedAudioChannel): HTMLAudioElement {
    const existing = this.channels.get(channel);
    if (existing) return existing;

    const audio = new Audio();
    audio.preload = "auto";
    // IMPORTANT: do NOT set crossOrigin by default. Many of the audio
    // CDNs we play from (mp3quran.net mirrors, download.quranicaudio.com,
    // some reciter buckets) do not return permissive CORS headers; with
    // `crossOrigin="anonymous"` set, the browser refuses to decode their
    // bytes and Sleep Mode silently fails on iOS standalone PWAs.
    // We only need CORS-tainted access when reading the decoded waveform
    // (we never do that here), so the default — same-origin / no CORS —
    // is the correct one. The play() path below promotes to "anonymous"
    // for sources that explicitly need it (the precached app-served
    // adhan files), and explicitly clears it back to null for blob:
    // URLs from IDB.
    audio.crossOrigin = null;
    audio.playsInline = true;
    audio.setAttribute("playsinline", "");
    audio.setAttribute("webkit-playsinline", "");
    this.channels.set(channel, audio);
    return audio;
  }

  async prime(channel: ManagedAudioChannel): Promise<HTMLAudioElement> {
    const audio = this.getAudio(channel);
    if (this.primedChannels.has(channel)) return audio;

    const previousSrc = audio.currentSrc || audio.src;
    const previousTime = audio.currentTime || 0;
    const previousMuted = audio.muted;
    const previousVolume = audio.volume;
    const wasPaused = audio.paused;

    try {
      audio.muted = true;
      audio.volume = 0;
      audio.src = SILENT_MP3;
      audio.load();
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      this.primedChannels.add(channel);
    } catch {
      // Best effort only — some browsers still mark the document as interacted.
    } finally {
      audio.muted = previousMuted;
      audio.volume = previousVolume;

      if (previousSrc && previousSrc !== SILENT_MP3) {
        audio.src = previousSrc;
        audio.load();
        if (!wasPaused) {
          try {
            audio.currentTime = previousTime;
          } catch {
            // Ignore restore failures.
          }
        }
      } else {
        audio.removeAttribute("src");
        audio.load();
      }
    }

    return audio;
  }

  async primeAll(channels: ManagedAudioChannel[] = ["quran", "alarm", "preview", "ambient", "sleep"]) {
    for (const channel of channels) {
      await this.prime(channel);
    }
  }

  async play(channel: ManagedAudioChannel, src?: string, options: PlayOptions = {}) {
    // Centralized iOS audio-session bootstrap. Every play() call goes
    // through this method, so any non-preview channel (sleep, quran,
    // adhan, friday, …) gets the iOS 17+ "playback" category set —
    // which is what keeps audio alive through the silent switch and
    // the screen-off lock state in standalone PWAs. Idempotent and
    // a no-op everywhere else.
    if (channel !== "preview") {
      configurePlaybackAudioSession();
    }
    const audio = this.getAudio(channel);
    const { forceLoad = true, resetTime = false, retryDelayMs = 220, volume, noRetry = false } = options;

    const normalizedVolume = clampVolume(volume);
    if (normalizedVolume !== undefined) {
      audio.volume = normalizedVolume;
    }

    if (src) {
      const normalizedSrc = normalizeSource(src);
      const currentSrc = audio.currentSrc || audio.src;
      if (currentSrc !== normalizedSrc) {
        // Default to NO crossOrigin (covers blob: from IDB AND remote
        // CDNs that don't send CORS headers — the common case). We
        // never read the decoded waveform, so a "tainted" stream is
        // fine. Only flip on `anonymous` when the source is on our own
        // origin (where CORS is irrelevant but having it set is safe
        // and lets the SW share its cached response across tabs).
        const isBlob = normalizedSrc.startsWith("blob:");
        const isSameOrigin =
          typeof window !== "undefined" &&
          (normalizedSrc.startsWith(window.location.origin) || normalizedSrc.startsWith("/"));
        const desiredCrossOrigin: "anonymous" | null =
          isBlob || !isSameOrigin ? null : "anonymous";
        if (audio.crossOrigin !== desiredCrossOrigin) {
          audio.crossOrigin = desiredCrossOrigin;
        }
        audio.src = normalizedSrc;
        if (forceLoad) audio.load();
      }
    }

    if (resetTime) {
      try {
        audio.currentTime = 0;
      } catch {
        // Ignore currentTime reset failures.
      }
    }

    try {
      await audio.play();
      return audio;
    } catch (error) {
      // v3.9.8: callers in user-gesture-sensitive paths (Sleep Mode on
      // iOS standalone) opt out of the retry — see PlayOptions.noRetry.
      if (src && !noRetry) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        audio.load();
        await audio.play();
        return audio;
      }
      throw error;
    }
  }

  async playWithFallback(channel: ManagedAudioChannel, sources: string[], options: PlayOptions = {}) {
    const uniqueSources = Array.from(new Set(sources.filter(Boolean)));
    let lastError: unknown = null;

    for (const source of uniqueSources) {
      try {
        return await this.play(channel, source, options);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error("No playable audio source available.");
  }

  stop(channel: ManagedAudioChannel, resetSource = false) {
    const audio = this.channels.get(channel);
    if (!audio) return;

    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // Ignore reset failures.
    }

    if (resetSource) {
      audio.removeAttribute("src");
      audio.load();
    }
  }

  stopAll(resetSource = false) {
    this.channels.forEach((_, channel) => this.stop(channel, resetSource));
  }
}

export const mobileAudioManager = new MobileAudioManager();

// ─── iOS playback session bootstrap ──────────────────────────────────────────
//
// iOS 17+ exposes `navigator.audioSession.type`, which controls how the
// system mixes the page's audio with other apps and — critically —
// whether the silent-mode hardware switch silences playback.
//
// "playback" is the right category for "user explicitly chose to listen
// to recitation" (Quran reader, Sleep Mode, adhan): plays through the
// silent switch, ducks other audio, keeps playing when the app goes to
// the background.
//
// The setter throws on older iOS (and is undefined on every other
// browser), so we guard the access. Idempotent — safe to call multiple
// times.
let audioSessionConfigured = false;

export function configurePlaybackAudioSession(): void {
  if (audioSessionConfigured) return;
  if (typeof navigator === "undefined") return;
  const session = (navigator as Navigator & {
    audioSession?: { type?: string };
  }).audioSession;
  if (!session) return;
  try {
    session.type = "playback";
    audioSessionConfigured = true;
  } catch {
    /* ignore — setter not supported on this iOS version */
  }
}