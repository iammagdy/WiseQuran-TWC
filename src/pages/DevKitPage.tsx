import { useState, useRef, useEffect } from "react";
import AppStatusPanel from "@/components/devkit/AppStatusPanel";
import VitalsPanel from "@/components/devkit/VitalsPanel";
import LocalStoragePanel from "@/components/devkit/LocalStoragePanel";
import IndexedDBPanel from "@/components/devkit/IndexedDBPanel";
import SyncQueuePanel from "@/components/devkit/SyncQueuePanel";
import AppControlsPanel from "@/components/devkit/AppControlsPanel";
import UserDataPanel from "@/components/devkit/UserDataPanel";
import AudioPanel from "@/components/devkit/AudioPanel";
import NotificationsPanel from "@/components/devkit/NotificationsPanel";
import ChangelogEditorPanel from "@/components/devkit/ChangelogEditorPanel";
import FeatureFlagsPanel from "@/components/devkit/FeatureFlagsPanel";
import BackupPanel from "@/components/devkit/BackupPanel";
import { DK } from "@/components/devkit/devkit-utils";
import { getSyncQueueCount } from "@/lib/db";
import { APP_VERSION } from "@/data/changelog";

const DEVKIT_PIN = "thewisedeveloper";
const SESSION_KEY = "wise-devkit-unlocked";
const ACTIVE_PANEL_KEY = "wise-devkit-active-panel";
const ADMIN_EMAIL = "Magdy.saber@outlook.com";

type PanelKey =
  | "status"
  | "vitals"
  | "localstorage"
  | "indexeddb"
  | "syncqueue"
  | "controls"
  | "userdata"
  | "audio"
  | "notifications"
  | "changelog"
  | "featureflags"
  | "backup";

interface NavItem {
  key: PanelKey;
  label: string;
  icon: string;
  desc: string;
}

const NAV: NavItem[] = [
  { key: "status",        label: "App Status",       icon: "◉",  desc: "Runtime environment, network & service worker state" },
  { key: "vitals",        label: "Web Vitals",       icon: "📊", desc: "Real-user LCP, CLS, INP and TTFB for the current session" },
  { key: "localstorage",  label: "LocalStorage",     icon: "🗄", desc: "Browse and live-edit wise-* keys" },
  { key: "indexeddb",     label: "IndexedDB",        icon: "💾", desc: "IDB stores, audio cache, byte usage" },
  { key: "syncqueue",     label: "Sync Queue",       icon: "⇅",  desc: "Pending server sync operations" },
  { key: "controls",      label: "App Controls",     icon: "⚙",  desc: "Theme, language, resets, backup & restore" },
  { key: "userdata",      label: "User Data",        icon: "👤", desc: "Auth session and user account records" },
  { key: "audio",         label: "Audio Player",     icon: "♫",  desc: "Player state, reciter and surah cache" },
  { key: "notifications", label: "Notifications",    icon: "🔔", desc: "Permission, prayer and azkar alerts" },
  { key: "changelog",     label: "Changelog Editor", icon: "📝", desc: "Add, edit and delete in-app changelog entries" },
  { key: "featureflags",  label: "Feature Flags",    icon: "🚩", desc: "Toggle app features without code changes" },
  { key: "backup",        label: "Backup & Restore",  icon: "💾", desc: "Export or import a combined DevKit config snapshot" },
];

const SECTIONS: { label: string; keys: PanelKey[] }[] = [
  { label: "Monitoring", keys: ["status", "vitals"] },
  { label: "Data",       keys: ["localstorage", "indexeddb", "syncqueue"] },
  { label: "Controls",   keys: ["controls", "userdata", "audio", "notifications"] },
  { label: "Content",    keys: ["changelog", "featureflags", "backup"] },
];

const navByKey = Object.fromEntries(NAV.map((n) => [n.key, n])) as Record<PanelKey, NavItem>;

/* ─── Lock Screen ─────────────────────────────────────────────────────────── */

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const attempt = () => {
    if (value === DEVKIT_PIN) {
      sessionStorage.setItem(SESSION_KEY, "1");
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setValue("");
      setTimeout(() => {
        setError(false);
        setShake(false);
      }, 1500);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      dir="ltr"
      className={`min-h-screen ${DK.bg} ${DK.ltr} flex items-center justify-center p-4`}
    >
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#161b22] border border-[#30363d] shadow-xl shadow-black/60">
            <span className="text-3xl leading-none select-none">⚙</span>
          </div>
          <div>
            <h1 className={`font-mono text-xl font-bold ${DK.text} tracking-tight`}>DevKit</h1>
            <p className={`font-mono text-xs ${DK.muted} mt-0.5`}>wise-quran · v{APP_VERSION}</p>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#161b22] border ${DK.border}`}>
            <span className={`text-[10px] font-mono ${DK.muted}`}>Admin:</span>
            <span className={`text-[10px] font-mono ${DK.blue}`}>{ADMIN_EMAIL}</span>
          </div>
        </div>

        <div className={`rounded-xl p-6 ${DK.card} shadow-xl shadow-black/50 space-y-4`}>
          <div className="space-y-0.5">
            <p className={`font-mono text-sm font-semibold ${DK.text}`}>Enter PIN to continue</p>
            <p className={`font-mono text-[11px] ${DK.muted}`}>
              Session-locked — closes when the tab is closed
            </p>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); attempt(); }}
            className="space-y-3"
          >
            <div className={`transition-transform duration-100 ${shake ? "[transform:translateX(6px)]" : ""}`}>
              <input
                ref={inputRef}
                type="password"
                autoComplete="new-password"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="••••••••••••••••"
                className={`w-full font-mono text-sm px-4 py-3 rounded-lg bg-[#0d1117] ${DK.text} border ${
                  error ? "border-[#f85149]" : "border-[#30363d] focus:border-[#388bfd]"
                } outline-none transition-colors text-center tracking-[0.3em] placeholder:tracking-normal placeholder:text-[#6e7681]`}
              />
            </div>
            {error && (
              <p className={`font-mono text-xs ${DK.red} text-center`}>
                Incorrect PIN — please try again
              </p>
            )}
            <button
              type="submit"
              disabled={value.length === 0}
              className={`w-full ${DK.btnBase} ${DK.btnGreen} py-2.5 text-sm`}
            >
              Unlock Dashboard
            </button>
          </form>
        </div>

        <p className={`font-mono text-[10px] ${DK.subtle} text-center`}>
          Developer Control Panel · Internal use only
        </p>
      </div>
    </div>
  );
}

/* ─── Sidebar nav content (shared between desktop and mobile drawer) ───────── */

function SidebarNav({
  active,
  onSelect,
  collapsed,
  onToggleCollapse,
  syncQueueCount,
  isMobile,
}: {
  active: PanelKey;
  onSelect: (k: PanelKey) => void;
  collapsed: boolean;
  onToggleCollapse?: () => void;
  syncQueueCount: number;
  isMobile?: boolean;
}) {
  const showLabel = !collapsed || isMobile;

  return (
    <>
      {/* Header */}
      <div className={`px-3 py-3.5 border-b ${DK.border} flex items-center gap-2.5 min-h-[52px]`}>
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#0d1117] border border-[#30363d] shrink-0">
          <span className="text-sm leading-none select-none">⚙</span>
        </div>
        {showLabel && (
          <div className="flex-1 min-w-0">
            <p className={`font-mono text-sm font-bold ${DK.text} leading-tight`}>DevKit</p>
            <p className={`font-mono text-[10px] ${DK.muted} leading-tight truncate`}>wise-quran</p>
          </div>
        )}
        {!collapsed && !isMobile && (
          <button
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            className={`shrink-0 ${DK.btnBase} ${DK.btnGray} px-1.5 py-1 text-[11px]`}
          >
            «
          </button>
        )}
      </div>

      {/* Sectioned navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto">
        {SECTIONS.map((section) => (
          <div key={section.label} className="mb-1">
            {showLabel && (
              <p className={`font-mono text-[9px] uppercase tracking-widest ${DK.subtle} px-2.5 pt-3 pb-1 select-none`}>
                {section.label}
              </p>
            )}
            {!showLabel && (
              <div className={`my-1 mx-1 h-px bg-[#30363d]`} />
            )}
            <div className="space-y-0.5">
              {section.keys.map((key) => {
                const item = navByKey[key];
                const badge = key === "syncqueue" && syncQueueCount > 0 ? syncQueueCount : 0;
                const isActive = active === key;
                return (
                  <button
                    key={key}
                    onClick={() => onSelect(key)}
                    title={!showLabel ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-start transition-colors font-mono text-xs ${
                      isActive ? DK.activeNav : `${DK.muted} ${DK.hoverNav}`
                    } ${!showLabel ? "justify-center" : ""}`}
                  >
                    <span className="text-sm shrink-0 relative">
                      {item.icon}
                      {badge > 0 && !showLabel && (
                        <span className="absolute -top-1.5 -end-1.5 bg-[#f85149] text-white font-mono text-[8px] leading-none rounded-full px-1 py-0.5 min-w-[14px] text-center">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </span>
                    {showLabel && (
                      <>
                        <span className="flex-1 truncate">{item.label}</span>
                        {badge > 0 && (
                          <span className="shrink-0 bg-[#f85149] text-white font-mono text-[10px] leading-none rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                            {badge > 99 ? "99+" : badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`px-2 py-3 border-t ${DK.border} space-y-1.5`}>
        {collapsed && !isMobile && (
          <button
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className={`w-full ${DK.btnBase} ${DK.btnGray} px-2 py-1.5 text-[11px]`}
          >
            »
          </button>
        )}
        <button
          onClick={() => { sessionStorage.removeItem(SESSION_KEY); window.location.reload(); }}
          title="Lock DevKit"
          className={`w-full ${DK.btnBase} ${DK.btnGray} flex items-center justify-center gap-1.5 py-1.5`}
        >
          <span>🔒</span>
          {showLabel && <span>Lock</span>}
        </button>
      </div>
    </>
  );
}

/* ─── Desktop Sidebar ─────────────────────────────────────────────────────── */

function Sidebar({
  active,
  onSelect,
  collapsed,
  onToggleCollapse,
  syncQueueCount,
}: {
  active: PanelKey;
  onSelect: (k: PanelKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  syncQueueCount: number;
}) {
  return (
    <aside
      className={`${collapsed ? "w-14" : "w-56"} shrink-0 h-screen sticky top-0 hidden sm:flex flex-col ${DK.sidebar} border-r ${DK.border} overflow-y-auto transition-all duration-200`}
    >
      <SidebarNav
        active={active}
        onSelect={onSelect}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        syncQueueCount={syncQueueCount}
      />
    </aside>
  );
}

/* ─── Mobile Drawer ───────────────────────────────────────────────────────── */

function MobileDrawer({
  open,
  onClose,
  active,
  onSelect,
  syncQueueCount,
}: {
  open: boolean;
  onClose: () => void;
  active: PanelKey;
  onSelect: (k: PanelKey) => void;
  syncQueueCount: number;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSelect = (k: PanelKey) => { onSelect(k); onClose(); };

  return (
    <>
      <div
        onClick={onClose}
        className={`sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />
      <div
        className={`sm:hidden fixed top-0 start-0 z-50 h-full w-64 flex flex-col ${DK.sidebar} border-r ${DK.border} overflow-y-auto transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="DevKit navigation"
      >
        <div className="flex justify-end px-3 pt-2">
          <button
            onClick={onClose}
            aria-label="Close menu"
            className={`${DK.btnBase} ${DK.btnGray} px-2 py-1 text-xs`}
          >
            ✕
          </button>
        </div>
        <SidebarNav
          active={active}
          onSelect={handleSelect}
          collapsed={false}
          syncQueueCount={syncQueueCount}
          isMobile
        />
      </div>
    </>
  );
}

/* ─── Panel router ────────────────────────────────────────────────────────── */

function Panel({ id }: { id: PanelKey }) {
  switch (id) {
    case "status":        return <AppStatusPanel />;
    case "vitals":        return <VitalsPanel />;
    case "localstorage":  return <LocalStoragePanel />;
    case "indexeddb":     return <IndexedDBPanel />;
    case "syncqueue":     return <SyncQueuePanel />;
    case "controls":      return <AppControlsPanel />;
    case "userdata":      return <UserDataPanel />;
    case "audio":         return <AudioPanel />;
    case "notifications": return <NotificationsPanel />;
    case "changelog":     return <ChangelogEditorPanel />;
    case "featureflags":  return <FeatureFlagsPanel />;
    case "backup":        return <BackupPanel />;
  }
}

/* ─── Main page ───────────────────────────────────────────────────────────── */

export default function DevKitPage() {
  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === "1"
  );
  const [active, setActive] = useState<PanelKey>(() => {
    const saved = sessionStorage.getItem(ACTIVE_PANEL_KEY) as PanelKey | null;
    return saved && NAV.some((n) => n.key === saved) ? saved : "status";
  });

  const selectPanel = (key: PanelKey) => {
    sessionStorage.setItem(ACTIVE_PANEL_KEY, key);
    setActive(key);
  };

  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [syncQueueCount, setSyncQueueCount] = useState(0);

  useEffect(() => {
    const poll = async () => {
      try {
        const count = await getSyncQueueCount();
        setSyncQueueCount(count);
      } catch { /* ignore */ }
    };
    if (unlocked) {
      void poll();
      const id = setInterval(poll, 5000);
      return () => clearInterval(id);
    }
  }, [unlocked]);

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }

  const nav = navByKey[active];

  return (
    <div dir="ltr" className={`min-h-screen ${DK.bg} ${DK.ltr} flex`}>
      {/* Desktop sidebar */}
      <Sidebar
        active={active}
        onSelect={selectPanel}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        syncQueueCount={syncQueueCount}
      />

      {/* Mobile slide-out drawer */}
      <MobileDrawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        active={active}
        onSelect={selectPanel}
        syncQueueCount={syncQueueCount}
      />

      <main className="flex-1 min-w-0 overflow-auto flex flex-col">
        {/* Top header bar */}
        <div
          className={`sticky top-0 z-10 flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 border-b ${DK.border} bg-[#161b22]/95 backdrop-blur min-h-[52px]`}
        >
          <button
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open navigation menu"
            className={`sm:hidden shrink-0 ${DK.btnBase} ${DK.btnGray} px-2 py-1.5 text-base leading-none`}
          >
            ☰
          </button>

          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#0d1117] border border-[#30363d] shrink-0">
            <span className="text-sm leading-none select-none">{nav.icon}</span>
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className={`font-mono text-sm font-semibold ${DK.text} truncate leading-tight`}>
              {nav.label}
            </h2>
            <p className={`hidden sm:block font-mono text-[10px] ${DK.subtle} leading-tight truncate`}>
              {nav.desc}
            </p>
          </div>
          {active === "syncqueue" && syncQueueCount > 0 && (
            <span className="shrink-0 bg-[#f85149] text-white font-mono text-[11px] rounded-full px-2 py-0.5 font-semibold leading-none">
              {syncQueueCount} pending
            </span>
          )}
          <div className="ms-auto flex items-center gap-1.5 sm:gap-2.5">
            <span className={`hidden sm:inline font-mono text-[10px] ${DK.subtle}`}>
              auto-refresh 5s
            </span>
            <span className={`font-mono text-[10px] ${DK.muted} px-2 py-0.5 rounded bg-[#21262d] border ${DK.border}`}>
              v{APP_VERSION}
            </span>
          </div>
        </div>

        {/* Panel content */}
        <div className="flex-1 p-3 sm:p-6">
          <div className="max-w-4xl">
            <Panel id={active} />
          </div>
        </div>

        {/* Footer bar */}
        <div className={`border-t ${DK.border} px-3 sm:px-6 py-2 flex items-center gap-4`}>
          <span className={`font-mono text-[10px] ${DK.subtle}`}>DevKit · Internal use only</span>
          <span className={`hidden sm:inline font-mono text-[10px] ${DK.subtle}`}>
            Admin: <span className={DK.muted}>{ADMIN_EMAIL}</span>
          </span>
        </div>
      </main>
    </div>
  );
}
