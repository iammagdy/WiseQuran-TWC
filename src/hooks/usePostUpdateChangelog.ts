import { useState, useEffect } from "react";
import { type ChangelogEntry } from "@/data/changelog";
import { getMergedChangelog, getEffectiveVersion } from "@/lib/changelog-overrides";

const LAST_SEEN_VERSION_KEY = "wise-last-seen-version";
export const DEVKIT_FORCE_CHANGELOG_KEY = "wise-devkit-open-changelog";

export function usePostUpdateChangelog() {
  const [showChangelog, setShowChangelog] = useState(false);
  const [newEntries, setNewEntries] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    const merged = getMergedChangelog();
    const effectiveVersion = getEffectiveVersion();

    const forced = sessionStorage.getItem(DEVKIT_FORCE_CHANGELOG_KEY);
    if (forced === "1") {
      sessionStorage.removeItem(DEVKIT_FORCE_CHANGELOG_KEY);
      setNewEntries(merged.slice(0, 1));
      setShowChangelog(true);
      return;
    }

    const lastSeen = localStorage.getItem(LAST_SEEN_VERSION_KEY);

    if (lastSeen === null) {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, effectiveVersion);
      return;
    }

    if (lastSeen !== effectiveVersion) {
      const lastSeenIndex = merged.findIndex((e) => e.version === lastSeen);
      const entries =
        lastSeenIndex === -1 ? merged.slice(0, 1) : merged.slice(0, lastSeenIndex);

      setNewEntries(entries.length > 0 ? entries : merged.slice(0, 1));
      setShowChangelog(true);
    }
  }, []);

  const dismissTemporary = () => setShowChangelog(false);

  const dismissPermanent = () => {
    localStorage.setItem(LAST_SEEN_VERSION_KEY, getEffectiveVersion());
    setShowChangelog(false);
  };

  return { showChangelog, newEntries, dismissTemporary, dismissPermanent };
}
