import { useState, useEffect, useCallback } from "react";
import { showAppNotification } from "@/lib/notifications";
import { DK } from "./devkit-utils";

export default function NotificationsPanel() {
  const [msg, setMsg] = useState("");
  const [permission, setPermission] = useState(
    () => (typeof Notification !== "undefined" ? Notification.permission : "not-supported") as string
  );

  const refresh = useCallback(() => {
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "not-supported");
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 3000);
  };

  const request = async () => {
    if (!("Notification" in window)) {
      flash("Notifications not supported in this browser");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    flash(`Permission result: ${result}`);
  };

  const testPrayer = async () => {
    const ok = await showAppNotification("🕌 Prayer Time", {
      body: "[DevKit] This is a test prayer notification",
      tag: "devkit-prayer-test",
      silent: false,
    });
    flash(ok ? "Prayer notification sent" : "Failed — check permissions");
  };

  const testAzkar = async () => {
    const ok = await showAppNotification("📿 Azkar Reminder", {
      body: "[DevKit] This is a test morning azkar reminder",
      tag: "devkit-azkar-test",
      silent: false,
    });
    flash(ok ? "Azkar notification sent" : "Failed — check permissions");
  };

  const testGeneric = async () => {
    const ok = await showAppNotification("⚙ DevKit Test", {
      body: "Notification system is working correctly",
      tag: "devkit-generic",
    });
    flash(ok ? "Notification sent" : "Failed — check permissions");
  };

  const permColor =
    permission === "granted" ? DK.green : permission === "denied" ? DK.red : DK.yellow;

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`rounded p-3 bg-[#238636]/20 border border-[#238636] font-mono text-xs ${DK.green}`}>
          ✓ {msg}
        </div>
      )}

      <div className={`rounded-lg p-4 ${DK.card}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-mono text-xs uppercase tracking-widest ${DK.muted}`}>Status</h3>
          <button onClick={refresh} className={`${DK.btnBase} ${DK.btnGray}`}>↻</button>
        </div>
        <div className={`flex items-center gap-4 py-2 border-b ${DK.border}`}>
          <span className={`w-40 font-mono text-xs ${DK.muted}`}>permission</span>
          <span className={`font-mono text-xs font-semibold ${permColor}`}>{permission}</span>
        </div>
        <div className="flex items-center gap-4 py-2">
          <span className={`w-40 font-mono text-xs ${DK.muted}`}>sw available</span>
          <span className={`font-mono text-xs ${DK.text}`}>
            {"serviceWorker" in navigator ? "yes" : "no"}
          </span>
        </div>
      </div>

      <div className={`rounded-lg p-4 ${DK.card}`}>
        <h3 className={`font-mono text-xs uppercase tracking-widest ${DK.muted} mb-4`}>Actions</h3>
        <div className="space-y-3">
          {permission !== "granted" && (
            <div className="flex items-center justify-between">
              <span className={`font-mono text-xs ${DK.muted}`}>Request permission first</span>
              <button onClick={() => void request()} className={`${DK.btnBase} ${DK.btnGreen}`}>
                Request permission
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-mono text-xs ${DK.text}`}>Prayer time notification</p>
              <p className={`font-mono text-xs ${DK.muted}`}>Fires immediately via SW or page</p>
            </div>
            <button
              onClick={() => void testPrayer()}
              disabled={permission !== "granted"}
              className={`${DK.btnBase} ${DK.btnGray}`}
            >
              Send test
            </button>
          </div>
          <div className={`border-t ${DK.border} pt-3 flex items-center justify-between`}>
            <div>
              <p className={`font-mono text-xs ${DK.text}`}>Azkar reminder</p>
              <p className={`font-mono text-xs ${DK.muted}`}>Fires immediately via SW or page</p>
            </div>
            <button
              onClick={() => void testAzkar()}
              disabled={permission !== "granted"}
              className={`${DK.btnBase} ${DK.btnGray}`}
            >
              Send test
            </button>
          </div>
          <div className={`border-t ${DK.border} pt-3 flex items-center justify-between`}>
            <div>
              <p className={`font-mono text-xs ${DK.text}`}>Generic test</p>
              <p className={`font-mono text-xs ${DK.muted}`}>Basic connectivity check</p>
            </div>
            <button
              onClick={() => void testGeneric()}
              disabled={permission !== "granted"}
              className={`${DK.btnBase} ${DK.btnGray}`}
            >
              Send test
            </button>
          </div>
        </div>
      </div>

      {permission === "denied" && (
        <div className={`rounded-lg p-4 bg-[#6e1c1c]/20 border border-[#f85149]/30`}>
          <p className={`font-mono text-xs ${DK.red}`}>
            Notifications are blocked. To re-enable, open your browser settings and allow
            notifications for this domain, then reload.
          </p>
        </div>
      )}
    </div>
  );
}
