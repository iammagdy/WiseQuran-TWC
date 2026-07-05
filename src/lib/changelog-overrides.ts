import { changelog as staticChangelog, APP_VERSION, type ChangelogEntry } from "@/data/changelog";

export const DEVKIT_CHANGELOG_KEY = "wise-devkit-changelog";
export const DEVKIT_CURRENT_VERSION_KEY = "wise-devkit-current-version";

export function getDevkitChangelog(): ChangelogEntry[] {
  try {
    const raw = localStorage.getItem(DEVKIT_CHANGELOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ChangelogEntry[]) : [];
  } catch {
    return [];
  }
}

export function setDevkitChangelog(entries: ChangelogEntry[]): void {
  localStorage.setItem(DEVKIT_CHANGELOG_KEY, JSON.stringify(entries));
  window.dispatchEvent(
    new CustomEvent("local-storage-sync", {
      detail: { key: DEVKIT_CHANGELOG_KEY },
    }),
  );
}

/**
 * Returns the version string the admin has designated as "current".
 * Falls back to APP_VERSION if no override is set.
 */
export function getEffectiveVersion(): string {
  return localStorage.getItem(DEVKIT_CURRENT_VERSION_KEY) ?? APP_VERSION;
}

/**
 * Mark a version as the app's effective current version (shown in headers and
 * used for post-update changelog detection).
 */
export function setEffectiveVersion(version: string): void {
  localStorage.setItem(DEVKIT_CURRENT_VERSION_KEY, version);
  window.dispatchEvent(
    new CustomEvent("local-storage-sync", {
      detail: { key: DEVKIT_CURRENT_VERSION_KEY },
    }),
  );
}

/** Clear the DevKit version override (reverts to static APP_VERSION). */
export function clearEffectiveVersionOverride(): void {
  localStorage.removeItem(DEVKIT_CURRENT_VERSION_KEY);
  window.dispatchEvent(
    new CustomEvent("local-storage-sync", {
      detail: { key: DEVKIT_CURRENT_VERSION_KEY },
    }),
  );
}

/**
 * DevKit-authored entries come first, then static entries that don't share a
 * version with any DevKit entry.
 */
export function getMergedChangelog(): ChangelogEntry[] {
  const devkit = getDevkitChangelog();
  const devkitVersions = new Set(devkit.map((e) => e.version));
  const filtered = staticChangelog.filter((e) => !devkitVersions.has(e.version));
  return [...devkit, ...filtered];
}
