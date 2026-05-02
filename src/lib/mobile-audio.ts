import { audioDebugLog, isAudioDebugEnabled } from "@/lib/audio-debug-log";

export const SILENT_MP3 = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq//OEAAOAAAAAIAAAAAQAAAADxIAAAeAAAAAAyIQUAAwEEAAAB1wQAAAAG5uP//xQo4BwwMAAECAR/f7//////9/4h7/8///Q2P//+T7f///+i//T//4iK5b4AAAAAAACAAH//OEAAiBQAIAAAQAAAABAAIAB4gAAB4AAAAB0QgUAAQIEAAEB1wQAAABW5+///xRgwBAAIAAACAR/f///////4h7/8///Q2P//+T7f///+i//T//4iK5b4AAAAAAAAIAA//OEAAyBwAIAAAQAAAABAAIAB4gAAB4AAAAB0QgUAAQIEAAEB1wQAAABW5+///xRgwBAAIAAACAR/f///////4h7/8///Q2P//+T7f///+i//T//4iK5b4AAAAAAAAIAA//OEAFAAQAIAAAQAAAABAAIAB4gAAB4AAAAB0QgUAAQIEAAEB1wQAAABW5+///xRgwBAAIAAACAR/f///////4h7/8///Q2P//+T7f///+i//T//4iK5b4AAAAAAAAIAA==";

export type ManagedAudioChannel = "quran" | "alarm" | "preview" | "ambient" | "sleep";

interface PlayOptions {
  forceLoad?: boolean;
  resetTime?: boolean;
  retryDelayMs?: number;
  volume?: number;
}

function normalizeSource(src: string): string {
  if (typeof window === "undefined") return src;
  try {
    return new URL(src, window.location.origin).toString();
  } catch (err) {
    audioDebugLog(
      "mobileAudioManager.normalizeSource:invalidUrl",
      { srcPreview: src.slice(0, 80) },
      err,
    );
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
    if (this.primedChannels.has(channel)) {
      audioDebugLog("mobileAudioManager.prime:short-circuit", {
        channel,
        reason: "already-primed",
      });
      return audio;
    }

    const previousSrc = audio.currentSrc || audio.src;
    const previousTime = audio.currentTime || 0;
    const previousMuted = audio.muted;
    const previousVolume = audio.volume;
    const wasPaused = audio.paused;

    audioDebugLog("mobileAudioManager.prime:start", () => ({
      channel,
      previousSrc: previousSrc ? previousSrc.slice(0, 60) : "",
      wasPaused,
    }));

    let primeError: unknown;
    try {
      audio.muted = true;
      audio.volume = 0;
      audio.src = SILENT_MP3;
      audio.load();
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      this.primedChannels.add(channel);
      audioDebugLog("mobileAudioManager.prime:success", { channel });
    } catch (err) {
      // Best effort only — some browsers still mark the document as interacted.
      primeError = err;
      audioDebugLog(
        "mobileAudioManager.prime:error",
        { channel },
        err,
      );
    } finally {
      audio.muted = previousMuted;
      audio.volume = previousVolume;

      if (previousSrc && previousSrc !== SILENT_MP3) {
        audio.src = previousSrc;
        audio.load();
        if (!wasPaused) {
          try {
            audio.currentTime = previousTime;
          } catch (err) {
            audioDebugLog(
              "mobileAudioManager.prime:finally:restoreTimeFailed",
              { channel },
              err,
            );
          }
        }
        audioDebugLog("mobileAudioManager.prime:finally:restoreSrc", () => ({
          channel,
          restoredSrc: previousSrc.slice(0, 60),
        }));
      } else {
        audio.removeAttribute("src");
        audio.load();
        audioDebugLog("mobileAudioManager.prime:finally:clearSrc", {
          channel,
          hadPrimeError: Boolean(primeError),
        });
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
    audioDebugLog("mobileAudioManager.play:enter", () => ({
      channel,
      hasSrc: Boolean(src),
      srcPreview: src ? src.slice(0, 60) : "",
      primed: this.primedChannels.has(channel),
    }));
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
    const { forceLoad = true, resetTime = false, retryDelayMs = 220, volume } = options;

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
        audioDebugLog("mobileAudioManager.play:srcAssigned", () => ({
          channel,
          isBlob,
          isSameOrigin,
          crossOrigin: desiredCrossOrigin,
        }));
        attachAudioFetchDiagnostics(audio, channel);
      } else {
        audioDebugLog("mobileAudioManager.play:srcUnchanged", { channel });
      }
    }

    if (resetTime) {
      try {
        audio.currentTime = 0;
      } catch (err) {
        audioDebugLog(
          "mobileAudioManager.play:resetTimeFailed",
          { channel },
          err,
        );
      }
    }

    try {
      await audio.play();
      audioDebugLog("mobileAudioManager.play:firstPlayResolved", { channel });
      return audio;
    } catch (error) {
      audioDebugLog(
        "mobileAudioManager.play:firstPlayRejected",
        { channel, hasSrc: Boolean(src), retryDelayMs },
        error,
      );
      if (src) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        audio.load();
        try {
          await audio.play();
          audioDebugLog("mobileAudioManager.play:retryResolved", { channel });
          return audio;
        } catch (retryError) {
          audioDebugLog(
            "mobileAudioManager.play:retryRejected",
            { channel },
            retryError,
          );
          throw retryError;
        }
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
        audioDebugLog(
          "mobileAudioManager.playWithFallback:sourceFailed",
          { channel, srcPreview: source.slice(0, 60) },
          error,
        );
        lastError = error;
      }
    }

    throw lastError ?? new Error("No playable audio source available.");
  }

  stop(channel: ManagedAudioChannel, resetSource = false) {
    const audio = this.channels.get(channel);
    if (!audio) {
      audioDebugLog("mobileAudioManager.stop:noAudio", { channel, resetSource });
      return;
    }

    audio.pause();
    try {
      audio.currentTime = 0;
    } catch (err) {
      audioDebugLog(
        "mobileAudioManager.stop:resetTimeFailed",
        { channel },
        err,
      );
    }

    if (resetSource) {
      audio.removeAttribute("src");
      audio.load();
      // Clearing src + load() deactivates the iOS user-activation on
      // this <audio> element. The next .play() call must therefore be
      // re-primed inside a fresh user gesture or iOS will reject it
      // with NotAllowedError. Drop the channel from primedChannels so
      // the next prime() call actually runs the silent-MP3 unlock
      // again instead of short-circuiting. This is what makes Sleep
      // Mode (and the main Quran reader) work across stop → play
      // cycles on iOS standalone PWAs.
      this.primedChannels.delete(channel);
      audioDebugLog("mobileAudioManager.stop:resetSource", { channel });
    } else {
      audioDebugLog("mobileAudioManager.stop:pauseOnly", { channel });
    }
  }

  stopAll(resetSource = false) {
    this.channels.forEach((_, channel) => this.stop(channel, resetSource));
  }
}

export const mobileAudioManager = new MobileAudioManager();

// ─── Audio element fetch diagnostics ─────────────────────────────────────────
//
// One-shot listeners attached after every `audio.src = …` assignment so
// the in-app debug log captures the network/decoder lifecycle of the
// underlying media fetch. This is what disambiguates "the SW intercepted
// and corrupted the response" from "the CDN 404'd" from "iOS killed the
// element". `{ once: true }` keeps the GC profile flat — the next
// srcAssigned re-attaches a fresh set.
function attachAudioFetchDiagnostics(
  audio: HTMLAudioElement,
  channel: ManagedAudioChannel,
): void {
  if (!isAudioDebugEnabled()) return;
  if (typeof audio.addEventListener !== "function") return;
  const onError = () => {
    const mediaErr = audio.error;
    audioDebugLog("mobileAudioManager.audio:error", () => ({
      channel,
      networkState: audio.networkState,
      readyState: audio.readyState,
      currentSrc: audio.currentSrc ? audio.currentSrc.slice(0, 80) : "",
      code: mediaErr?.code,
      message: mediaErr?.message,
    }));
  };
  const onStalled = () => {
    audioDebugLog("mobileAudioManager.audio:stalled", () => ({
      channel,
      networkState: audio.networkState,
      readyState: audio.readyState,
    }));
  };
  const onCanPlay = () => {
    audioDebugLog("mobileAudioManager.audio:canplay", () => ({
      channel,
      networkState: audio.networkState,
      readyState: audio.readyState,
      duration: Number.isFinite(audio.duration) ? audio.duration : -1,
    }));
  };
  audio.addEventListener("error", onError, { once: true });
  audio.addEventListener("stalled", onStalled, { once: true });
  audio.addEventListener("canplay", onCanPlay, { once: true });
}

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
//
// IMPORTANT: do NOT cache a "already configured" flag. iOS resets the
// session category back to "auto" after audio interruptions (incoming
// call, Siri, system memory pressure). If we latched after the first
// success, subsequent Sleep Mode sessions would play under the wrong
// category and get muted by the silent switch. Re-applying on every
// play() is cheap and correct.
export function configurePlaybackAudioSession(): void {
  if (typeof navigator === "undefined") return;
  const session = (navigator as Navigator & {
    audioSession?: { type?: string };
  }).audioSession;
  if (!session) {
    audioDebugLog("configurePlaybackAudioSession:unsupported");
    return;
  }
  try {
    session.type = "playback";
    audioDebugLog("configurePlaybackAudioSession:set", { type: "playback" });
  } catch (err) {
    audioDebugLog("configurePlaybackAudioSession:error", undefined, err);
    /* ignore — setter not supported on this iOS version */
  }
}