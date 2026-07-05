export const FEATURE_FLAGS_KEY = "wise-feature-flags";

export interface FeatureFlags {
  ramadanTab: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  installPromptEnabled: boolean;
}

export const DEFAULT_FLAGS: FeatureFlags = {
  ramadanTab: false,
  maintenanceMode: false,
  maintenanceMessage:
    "The app is currently undergoing maintenance. Some features may be temporarily unavailable.",
  installPromptEnabled: true,
};

export function getFeatureFlags(): FeatureFlags {
  try {
    const raw = localStorage.getItem(FEATURE_FLAGS_KEY);
    if (!raw) return { ...DEFAULT_FLAGS };
    const parsed = JSON.parse(raw) as Partial<FeatureFlags>;
    return { ...DEFAULT_FLAGS, ...parsed };
  } catch {
    return { ...DEFAULT_FLAGS };
  }
}

export function setFeatureFlags(flags: Partial<FeatureFlags>): void {
  const next = { ...getFeatureFlags(), ...flags };
  localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(next));
  window.dispatchEvent(
    new CustomEvent("local-storage-sync", {
      detail: { key: FEATURE_FLAGS_KEY },
    }),
  );
}
