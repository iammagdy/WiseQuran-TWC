import { useEffect, useState } from "react";
import { APP_VERSION } from "@/data/changelog";
import { useAuth } from "@/contexts/AuthContext";
import { checkStorageQuota } from "@/lib/db";
import { DK, formatBytes } from "./devkit-utils";

interface StatusData {
  swState: string;
  online: boolean;
  pwaMode: string;
  quota: { usage: number; quota: number; percentUsed: number };
  deviceId: string;
  buildTime: string;
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className={`flex items-start gap-4 py-2 border-b ${DK.border} last:border-0`}>
      <span className={`w-44 shrink-0 font-mono text-xs ${DK.muted}`}>{label}</span>
      <span className={`font-mono text-xs break-all ${accent ?? DK.text}`}>{value}</span>
    </div>
  );
}

export default function AppStatusPanel() {
  const { user, session } = useAuth();
  const [data, setData] = useState<StatusData | null>(null);

  const load = async () => {
    let swState = "not supported";
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length === 0) swState = "not registered";
      else swState = regs.map((r) => r.active?.state ?? "inactive").join(", ");
    }
    const isPwa = window.matchMedia("(display-mode: standalone)").matches;
    const quota = await checkStorageQuota();
    const deviceId = localStorage.getItem("wise-device-id") ?? "—";
    setData({
      swState,
      online: navigator.onLine,
      pwaMode: isPwa ? "standalone (installed)" : "browser tab",
      quota,
      deviceId,
      buildTime: import.meta.env.VITE_BUILD_TIME ?? "development",
    });
  };

  useEffect(() => {
    void load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <div className={`rounded-lg p-4 ${DK.card}`}>
        <h2 className={`text-xs font-mono uppercase tracking-widest ${DK.muted} mb-3`}>App</h2>
        <Row label="version" value={APP_VERSION} accent={DK.green} />
        <Row label="build" value={data?.buildTime ?? "—"} />
        <Row label="pwa mode" value={data?.pwaMode ?? "—"} />
      </div>

      <div className={`rounded-lg p-4 ${DK.card}`}>
        <h2 className={`text-xs font-mono uppercase tracking-widest ${DK.muted} mb-3`}>Runtime</h2>
        <Row
          label="network"
          value={data?.online ? "online" : "offline"}
          accent={data?.online ? DK.green : DK.red}
        />
        <Row label="service worker" value={data?.swState ?? "—"} />
        <Row
          label="storage used"
          value={
            data
              ? `${formatBytes(data.quota.usage)} / ${formatBytes(data.quota.quota)} (${data.quota.percentUsed.toFixed(1)}%)`
              : "—"
          }
        />
      </div>

      <div className={`rounded-lg p-4 ${DK.card}`}>
        <h2 className={`text-xs font-mono uppercase tracking-widest ${DK.muted} mb-3`}>Identity</h2>
        <Row label="device id" value={data?.deviceId ?? "—"} accent={DK.blue} />
        <Row label="auth user" value={user?.email ?? "not signed in"} />
        <Row label="auth uid" value={user?.id ?? "—"} accent={DK.blue} />
        <Row
          label="session expires"
          value={
            session?.expires_at
              ? new Date(session.expires_at * 1000).toLocaleString()
              : "—"
          }
        />
      </div>

      <button
        onClick={() => void load()}
        className={`${DK.btnBase} ${DK.btnGray}`}
      >
        ↻ Refresh
      </button>
    </div>
  );
}
