/**
 * One-shot persistent storage opt-in.
 *
 * Calls `navigator.storage.persist()` exactly once per device after the
 * user takes an explicit action that implies they want their data to
 * stick around (the first Sleep-Mode offline download is a perfect
 * trigger). Persisted storage protects IndexedDB blobs from being
 * evicted when the OS reclaims space — critical on iOS Safari, which
 * otherwise wipes uncached PWA storage after ~7 days of inactivity.
 *
 * Idempotent and best-effort: silently no-ops on browsers without the
 * Storage API, when permission is denied, or on subsequent calls.
 *
 * Returns a structured result so the caller can surface a one-time
 * toast (especially valuable on iOS standalone PWAs, where "Add to
 * Home Screen" is what flips persist() from "best-effort" to a real
 * grant). The toast itself is gated by an independent flag so the
 * outcome is shown to the user even if persist() was called before
 * we wired the UI.
 */

const REQUESTED_FLAG = "wise-storage-persist-requested";
const TOAST_SHOWN_FLAG = "wise-storage-persist-toast-shown";

export interface PersistResult {
  /** True if we actually called `persist()` this invocation (vs. early-return). */
  called: boolean;
  /**
   * Final persisted state after our call (or before, if it was already on
   * or unsupported). `null` when the browser doesn't expose the API.
   */
  persisted: boolean | null;
  /** True iff we already wrote `persist()` once on a previous invocation. */
  alreadyHandled: boolean;
}

export async function requestPersistentStorageOnce(): Promise<PersistResult> {
  if (typeof navigator === "undefined") {
    return { called: false, persisted: null, alreadyHandled: false };
  }
  if (!navigator.storage || typeof navigator.storage.persist !== "function") {
    return { called: false, persisted: null, alreadyHandled: false };
  }
  const alreadyHandled =
    typeof localStorage !== "undefined" && localStorage.getItem(REQUESTED_FLAG) === "1";
  if (alreadyHandled) {
    let persisted: boolean | null = null;
    try {
      if (typeof navigator.storage.persisted === "function") {
        persisted = await navigator.storage.persisted();
      }
    } catch {
      /* ignore */
    }
    return { called: false, persisted, alreadyHandled: true };
  }

  try {
    if (typeof navigator.storage.persisted === "function") {
      const already = await navigator.storage.persisted();
      if (already) {
        localStorage.setItem(REQUESTED_FLAG, "1");
        return { called: false, persisted: true, alreadyHandled: false };
      }
    }
    const persisted = await navigator.storage.persist();
    localStorage.setItem(REQUESTED_FLAG, "1");
    return { called: true, persisted, alreadyHandled: false };
  } catch {
    return { called: false, persisted: null, alreadyHandled: false };
  }
}

function isIosLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Macintosh") && "ontouchend" in (globalThis as object));
}

/**
 * Like `requestPersistentStorageOnce`, but additionally surfaces a
 * one-time toast describing the outcome. Designed for iOS users where
 * the persistent-storage grant is what protects offline downloads from
 * the 7-day eviction window.
 *
 * The toast is shown at most once per device (independent flag from the
 * persist() call itself), and only the first time we get a real
 * grant/denial result. It is no-op on non-iOS browsers to avoid
 * spamming desktop users.
 */
export async function requestPersistentStorageWithToast(
  language: "ar" | "en" | string,
  toast: {
    success: (msg: string) => void;
    info: (msg: string) => void;
  },
): Promise<PersistResult> {
  const result = await requestPersistentStorageOnce();

  const alreadyToasted =
    typeof localStorage !== "undefined" &&
    localStorage.getItem(TOAST_SHOWN_FLAG) === "1";
  if (alreadyToasted) return result;

  // Only worth surfacing on iOS, where the 7-day eviction is the actual
  // problem this protects against.
  if (!isIosLike()) return result;

  // Need at least one of: we just called persist(), or we know the state.
  if (result.persisted === true) {
    toast.success(
      language === "ar"
        ? "تم تثبيت التخزين — لن تُحذف التحميلات تلقائياً"
        : "Storage pinned — your downloads won't be auto-deleted",
    );
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(TOAST_SHOWN_FLAG, "1");
    }
  } else if (result.called && result.persisted === false) {
    // We asked iOS and it said no — usually because the PWA isn't
    // installed to the Home Screen yet. Tell the user how to fix it.
    toast.info(
      language === "ar"
        ? "للحفاظ على التحميلات: ثبّت التطبيق على الشاشة الرئيسية"
        : "To keep downloads safe, add this app to your Home Screen",
    );
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(TOAST_SHOWN_FLAG, "1");
    }
  }
  return result;
}
