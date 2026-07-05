import { lazy, type ComponentType } from "react";

const RETRY_KEY_PREFIX = "wise-lazy-retry-";

function isChunkLoadError(err: unknown): boolean {
  if (!err) return false;
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : "";
  return (
    name === "ChunkLoadError" ||
    /Loading (CSS )?chunk [^\s]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message)
  );
}

/**
 * React.lazy wrapper that survives stale-chunk errors after a deploy
 * (or after an iOS PWA cold-boot loaded the app shell from one SW
 * generation and the lazy chunk from another).
 *
 * Strategy:
 *   1. First failure: wait 400 ms and try the import once more in
 *      case the SW just installed and the new chunks are now in cache.
 *   2. If that retry also throws a chunk-load error AND we have not
 *      already done a one-shot reload for this session, set a flag
 *      and reload the page so the SW serves the latest manifest.
 *   3. If we've already reloaded once this session, give up and
 *      rethrow so ErrorBoundary can render the offline-friendly
 *      fallback instead of looping.
 */
// React.lazy's own type uses ComponentType<any>; we mirror that to stay assignment-compatible.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches React.lazy's generic constraint
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  chunkName: string,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (firstErr) {
      if (!isChunkLoadError(firstErr)) throw firstErr;

      try {
        await new Promise((r) => setTimeout(r, 400));
        return await factory();
      } catch (secondErr) {
        if (!isChunkLoadError(secondErr)) throw secondErr;

        const reloadKey = `${RETRY_KEY_PREFIX}${chunkName}`;
        const alreadyReloaded =
          typeof sessionStorage !== "undefined" &&
          sessionStorage.getItem(reloadKey) === "1";

        // Only reload when we have any hope of fetching the new
        // manifest. Offline reloads just drop the user back into the
        // exact same broken state — let ErrorBoundary surface its
        // offline-aware fallback instead.
        const isOnline =
          typeof navigator === "undefined" || navigator.onLine !== false;

        if (!alreadyReloaded && isOnline && typeof window !== "undefined") {
          try {
            sessionStorage.setItem(reloadKey, "1");
          } catch {
            /* private mode etc. */
          }
          window.location.reload();
          // Return a never-resolving promise so React keeps the
          // suspense fallback up while the page reloads.
          return new Promise<{ default: T }>(() => {});
        }
        throw secondErr;
      }
    }
  });
}

export function isLazyChunkError(err: unknown): boolean {
  return isChunkLoadError(err);
}
