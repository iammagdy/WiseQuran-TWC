import { useState, useEffect } from "react";
import { getFeatureFlags, FEATURE_FLAGS_KEY, type FeatureFlags } from "@/lib/feature-flags";

export function useFeatureFlags(): FeatureFlags {
  const [flags, setFlags] = useState<FeatureFlags>(() => getFeatureFlags());

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ key?: string }>;
      if (!ce.detail?.key || ce.detail.key === FEATURE_FLAGS_KEY) {
        setFlags(getFeatureFlags());
      }
    };
    window.addEventListener("local-storage-sync", handler);
    return () => window.removeEventListener("local-storage-sync", handler);
  }, []);

  return flags;
}
