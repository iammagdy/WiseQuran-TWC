import { useState } from "react";
import { X } from "lucide-react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

export default function MaintenanceBanner() {
  const { maintenanceMode, maintenanceMessage } = useFeatureFlags();
  const [dismissed, setDismissed] = useState(false);

  if (!maintenanceMode || dismissed) return null;

  const message =
    maintenanceMessage?.trim() ||
    "The app is currently undergoing maintenance. Some features may be temporarily unavailable.";

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[200] bg-amber-500 text-amber-950 px-4 py-2.5 flex items-center gap-3 text-sm font-medium shadow-lg"
    >
      <span className="text-base shrink-0" aria-hidden="true">
        ⚠️
      </span>
      <span className="flex-1 text-center leading-snug">{message}</span>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-full hover:bg-amber-600/30 transition-colors"
        aria-label="Dismiss maintenance banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
